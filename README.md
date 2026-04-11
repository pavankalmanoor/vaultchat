# VaultChat

Chat with PDF documents entirely in the browser — no server uploads, no data persistence, no tracking.

## Overview

VaultChat is a client-side document Q&A application. Every stage of the pipeline — PDF parsing, text extraction, chunking, indexing, and retrieval — runs inside the browser tab. The only outbound network request is the chat completion call to whichever LLM API the user provides a key for. When the tab is closed, all data is gone.

This architecture makes it suitable for documents that cannot be uploaded to third-party servers: legal contracts, medical records, internal reports, or any content subject to confidentiality requirements.

## Features

- **No server uploads** — PDFs are parsed client-side using pdf.js. The binary never leaves the browser.
- **BM25 retrieval** — Documents are chunked and indexed in memory using BM25 (the ranking algorithm used by Elasticsearch). Relevant chunks are retrieved per query without any external embedding API.
- **BYOK** — Users supply their own OpenAI, Anthropic, or Gemini API key. Keys are held in the JavaScript heap and never written to any storage mechanism.
- **Transparency dashboard** — A persistent sidebar shows exactly what is in memory, what was sent to the LLM API (endpoint, model, message count, system prompt length), and a timestamped audit log of every event in the session.
- **Session destruction** — A "Destroy Session" button wipes all state and terminates any running workers. The `beforeunload` event fires the same cleanup automatically on tab close.
- **No persistence** — `localStorage`, `sessionStorage`, `IndexedDB`, and cookies are never written to.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18, Tailwind CSS 3 |
| Build | Vite 5 |
| PDF parsing | pdf.js (pdfjs-dist v3, client-side) |
| Retrieval | BM25 — pure JS, no WASM, no network |
| LLM APIs | OpenAI, Anthropic, Google Gemini (via fetch + SSE streaming) |

## How It Works

```
PDF file (user's disk)
  └─ pdf.js          parse pages → raw text          [browser, no upload]
  └─ chunker.js      split into ~150-word chunks      [browser]
  └─ retrieval.js    build BM25 inverted index        [browser, in-memory]

User query
  └─ retrieval.js    score chunks → top-5 results     [browser]
  └─ chatClient.js   system prompt + context + query  [→ LLM API only]
                     stream response tokens back       [← LLM API only]
```

Only the query, the retrieved context chunks, and the conversation history are sent to the LLM provider. The full document text stays in the browser. Nothing is logged, cached, or stored between sessions.

## Supported Providers

| Provider | Model | Notes |
|---|---|---|
| OpenAI | gpt-4o-mini | Requires paid API key |
| Anthropic | claude-haiku-4-5 | Requires paid API key |
| Google Gemini | gemini-2.0-flash | Free tier available at aistudio.google.com |

Ollama (local models) is planned.

## Local Development

```bash
git clone https://github.com/pavankalmanoor/vaultchat.git
cd vaultchat
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

**Requirements:** Node.js 18 or later.

## Deployment

The project is configured for GitHub Pages with base path `/vaultchat/`.

```bash
npm run build
npx gh-pages -d dist
```

Then configure the repository: **Settings → Pages → Source → gh-pages branch**.

To deploy to a different host or root path, update `base` in `vite.config.js`:

```js
// vite.config.js
export default defineConfig({
  base: '/',   // or your sub-path
  ...
})
```

Live deployment: **https://pavankalmanoor.github.io/vaultchat/**

## Privacy Guarantees

The following browser storage APIs are **never used**:

- `localStorage`
- `sessionStorage`
- `IndexedDB`
- Cookies
- Cache API (for application data — the browser may cache static assets normally)

The following data **never leaves the browser**:

- The PDF binary or its extracted text
- Document chunks or the BM25 index
- The API key (passed only as a request header/parameter on each LLM call)

Session data is destroyed on:

- Clicking "Destroy Session" (two-step confirmation)
- Closing or refreshing the tab (`beforeunload` handler)

No analytics, telemetry, or error reporting is included.

## License

MIT
