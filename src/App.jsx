import { useState, useEffect, useCallback, useRef } from 'react';

import { parsePDF }           from './lib/pdfParser.js';
import { chunkText }          from './lib/chunker.js';
import { buildIndex, searchIndex } from './lib/retrieval.js';
import { sendChatMessage }    from './lib/chatClient.js';
import { createEmptySession, addAuditEntry, destroySession } from './lib/session.js';
// Note: embeddings.js / vectorStore.js kept on disk but not used.
// Retrieval uses BM25 (retrieval.js) — pure JS, no WASM required.

import Header               from './components/Header.jsx';
import PDFUploader          from './components/PDFUploader.jsx';
import APIKeyInput          from './components/APIKeyInput.jsx';
import ChatInterface        from './components/ChatInterface.jsx';
import TransparencyDashboard from './components/TransparencyDashboard.jsx';

// Number of context chunks to retrieve per query
const TOP_K = 5;

export default function App() {
  const [session, setSession] = useState(createEmptySession);
  const [isGenerating, setIsGenerating] = useState(false);
  // Streaming assistant message (appended token-by-token while generating)
  const streamingMessageRef = useRef('');

  // -------------------------------------------------------------------------
  // Auto-destroy on tab close
  // -------------------------------------------------------------------------
  useEffect(() => {
    function handleBeforeUnload() {
      destroySession(setSession);
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // -------------------------------------------------------------------------
  // Step 1 — PDF upload & processing pipeline
  // -------------------------------------------------------------------------
  const handleFileSelected = useCallback(async (file) => {
    setSession((s) => ({ ...s, processingStage: 'parsing', processingProgress: 0 }));

    try {
      // 1a. Parse PDF in-browser
      const { text, pageCount } = await parsePDF(file, ({ page, total }) => {
        setSession((s) => ({ ...s, processingProgress: Math.round((page / total) * 100) }));
      });

      // 1b. Chunk
      setSession((s) => ({ ...s, processingStage: 'chunking', processingProgress: 0 }));
      const chunks = chunkText(text);

      // 1c. Build BM25 index (pure JS, runs synchronously in microseconds)
      setSession((s) => ({ ...s, processingStage: 'indexing', processingProgress: 50 }));
      const index = buildIndex(chunks);

      setSession((s) => {
        const updated = {
          ...s,
          document: { name: file.name, pageCount, text, chunks, index },
          processingStage: null,
          processingProgress: 0,
        };
        return addAuditEntry(updated, 'document_loaded',
          `"${file.name}" loaded — ${pageCount} pages, ${chunks.length} chunks indexed`);
      });
    } catch (err) {
      console.error('Processing error:', err);
      setSession((s) => ({ ...s, processingStage: null, processingProgress: 0 }));
      alert(`Error processing PDF: ${err.message}`);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Step 2 — API key
  // -------------------------------------------------------------------------
  const handleKeySet = useCallback(({ provider, key }) => {
    setSession((s) => {
      const updated = { ...s, apiKey: { provider, key } };
      return addAuditEntry(updated, 'key_set',
        `${provider} API key set (${maskKey(key)})`);
    });
  }, []);

  // -------------------------------------------------------------------------
  // Step 3 — Chat
  // -------------------------------------------------------------------------
  const handleSendMessage = useCallback(async (text) => {
    if (isGenerating || !session.document || !session.apiKey) return;

    // Add user message
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    // Retrieve context chunks via BM25
    const contextChunks = searchIndex(session.document.index, text, TOP_K);

    const systemPrompt = buildSystemPrompt(session.document.name, contextChunks);

    // Build conversation history (exclude context details from API payload)
    const history = session.messages.map(({ role, content }) => ({ role, content }));

    // Placeholder assistant message for streaming
    const assistantId = crypto.randomUUID();
    streamingMessageRef.current = '';

    setSession((s) => ({
      ...s,
      messages: [
        ...s.messages,
        userMessage,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString(), contextChunks },
      ],
    }));
    setIsGenerating(true);

    try {
      await sendChatMessage({
        provider: session.apiKey.provider,
        apiKey: session.apiKey.key,
        systemPrompt,
        messages: [...history, { role: 'user', content: text }],
        onChunk: (token) => {
          streamingMessageRef.current += token;
          const current = streamingMessageRef.current;
          setSession((s) => ({
            ...s,
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, content: current } : m
            ),
          }));
        },
        onAudit: (detail) => {
          setSession((s) =>
            addAuditEntry(s, 'api_call',
              `${detail.provider} API call — ${detail.model}`, detail)
          );
        },
      });
    } catch (err) {
      setSession((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${err.message}` }
            : m
        ),
      }));
    } finally {
      setIsGenerating(false);
    }
  }, [session, isGenerating]);

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------
  const handleDestroy = useCallback(() => {
    destroySession(setSession);
  }, []);

  // -------------------------------------------------------------------------
  // Derive current "step" for conditional rendering
  // -------------------------------------------------------------------------
  const hasDocument = Boolean(session.document && !session.processingStage);
  const hasKey = Boolean(session.apiKey);
  const hasSession = hasDocument || hasKey || session.messages.length > 0;

  // Determine which "setup" view to show in the center pane
  function renderCenter() {
    if (!hasDocument) {
      return (
        <PDFUploader
          processingStage={session.processingStage}
          processingProgress={session.processingProgress}
          onFileSelected={handleFileSelected}
        />
      );
    }
    if (!hasKey) {
      return <APIKeyInput onKeySet={handleKeySet} />;
    }
    return (
      <ChatInterface
        document={session.document}
        messages={session.messages}
        isGenerating={isGenerating}
        onSendMessage={handleSendMessage}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header hasSession={hasSession} onDestroy={handleDestroy} />

      <div className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <main className={`flex-1 overflow-hidden flex flex-col ${!hasDocument || !hasKey ? 'items-center justify-center p-8' : ''}`}>
          {renderCenter()}
        </main>

        {/* Transparency sidebar — always visible once a document or key exists */}
        {hasSession && (
          <TransparencyDashboard session={session} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSystemPrompt(docName, contextChunks) {
  const context = contextChunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
  return `You are a helpful assistant answering questions about the document "${docName}".

Use ONLY the following context excerpts to answer. If the answer is not in the context, say so.

CONTEXT:
${context}`;
}

function maskKey(key) {
  if (!key || key.length < 8) return '***';
  return key.slice(0, 7) + '…' + key.slice(-4);
}
