/**
 * BYOK chat client. Calls OpenAI or Anthropic directly from the browser
 * using the user-supplied API key. The key is passed as a header on each
 * request; it is never stored anywhere except the in-memory session.
 *
 * Both providers are called via fetch() with streaming responses so that
 * tokens appear incrementally in the UI.
 */

const OPENAI_MODEL    = 'gpt-4o-mini';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const GEMINI_MODEL    = 'gemini-2.0-flash';
const MAX_TOKENS = 1024;

/**
 * @param {object}   opts
 * @param {'openai'|'anthropic'} opts.provider
 * @param {string}   opts.apiKey
 * @param {string}   opts.systemPrompt   Context injected as system message.
 * @param {Array<{role:string, content:string}>} opts.messages  Conversation history.
 * @param {(chunk: string) => void} opts.onChunk  Called for each streamed token.
 * @param {(auditEntry: object) => void} opts.onAudit  Called with what was sent.
 * @returns {Promise<string>}  Full assistant reply.
 */
export async function sendChatMessage({ provider, apiKey, systemPrompt, messages, onChunk, onAudit }) {
  if (provider === 'openai')    return sendOpenAI({ apiKey, systemPrompt, messages, onChunk, onAudit });
  if (provider === 'anthropic') return sendAnthropic({ apiKey, systemPrompt, messages, onChunk, onAudit });
  if (provider === 'gemini')    return sendGemini({ apiKey, systemPrompt, messages, onChunk, onAudit });
  throw new Error(`Unknown provider: ${provider}`);
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

async function sendOpenAI({ apiKey, systemPrompt, messages, onChunk, onAudit }) {
  const body = {
    model: OPENAI_MODEL,
    max_tokens: MAX_TOKENS,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  };

  onAudit?.({
    provider: 'openai',
    model: OPENAI_MODEL,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    messageCount: messages.length + 1,
    systemPromptLength: systemPrompt.length,
    timestamp: new Date().toISOString(),
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(err?.error?.message ?? `OpenAI error ${response.status}`);
  }

  return readSSEStream(response.body, (data) => {
    if (data === '[DONE]') return null;
    const parsed = JSON.parse(data);
    return parsed.choices?.[0]?.delta?.content ?? null;
  }, onChunk);
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

async function sendAnthropic({ apiKey, systemPrompt, messages, onChunk, onAudit }) {
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    stream: true,
    system: systemPrompt,
    messages,
  };

  onAudit?.({
    provider: 'anthropic',
    model: ANTHROPIC_MODEL,
    endpoint: 'https://api.anthropic.com/v1/messages',
    messageCount: messages.length,
    systemPromptLength: systemPrompt.length,
    timestamp: new Date().toISOString(),
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(err?.error?.message ?? `Anthropic error ${response.status}`);
  }

  return readSSEStream(response.body, (data) => {
    const parsed = JSON.parse(data);
    if (parsed.type === 'content_block_delta') {
      return parsed.delta?.text ?? null;
    }
    return null;
  }, onChunk);
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

async function sendGemini({ apiKey, systemPrompt, messages, onChunk, onAudit }) {
  // Gemini uses ?key= query param for auth (no Authorization header support
  // for the REST API from browsers). The key appears in the request URL.
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}` +
    `:streamGenerateContent?key=${apiKey}&alt=sse`;

  // Gemini role names: 'user' stays 'user', 'assistant' becomes 'model'.
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { maxOutputTokens: MAX_TOKENS },
  };

  onAudit?.({
    provider: 'gemini',
    model: GEMINI_MODEL,
    endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`,
    messageCount: messages.length,
    systemPromptLength: systemPrompt.length,
    timestamp: new Date().toISOString(),
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(err?.error?.message ?? `Gemini error ${response.status}`);
  }

  return readSSEStream(response.body, (data) => {
    const parsed = JSON.parse(data);
    return parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }, onChunk);
}

// ---------------------------------------------------------------------------
// Shared SSE reader
// ---------------------------------------------------------------------------

/**
 * Reads a server-sent-events stream from a ReadableStream, calling
 * `extractToken(data)` on each data line and forwarding non-null results
 * to `onChunk`.
 *
 * @returns {Promise<string>}  The full concatenated response text.
 */
async function readSSEStream(readableStream, extractToken, onChunk) {
  const reader = readableStream.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data) continue;

      try {
        const token = extractToken(data);
        if (token) {
          fullText += token;
          onChunk?.(token);
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  return fullText;
}
