# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install all dependencies
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # ESLint (zero warnings enforced)
```

## Architecture

VaultChat is a fully client-side, privacy-first document chat app. No backend exists. No data ever leaves the browser except for the BYOK API call.

### Data flow

```
PDF file (File object)
  → pdfParser.js      — pdf.js extracts text page-by-page (Worker inside pdf.js)
  → chunker.js        — splits text into ~150-word overlapping chunks
  → embeddings.js     — sends chunks to embeddings.worker.js via postMessage
      ↳ embeddings.worker.js  — runs Xenova/all-MiniLM-L6-v2 via Transformers.js
  → vectorStore.js    — holds [{text, embedding, index}] array in JS heap
  → App.jsx state     — session object (see below)

Query (user message)
  → embedTexts([query])       — same worker, same model
  → vectorStore.search()      — cosine similarity, returns top-5 chunks
  → chatClient.js             — builds prompt, calls OpenAI or Anthropic via fetch() with streaming
  → onChunk callback          — token-by-token update to React state for live rendering
```

### Session state (App.jsx)

All mutable state lives in a single `session` object in React's `useState`. Shape is defined in `src/lib/session.js`:

- `document` — `{ name, pageCount, text, chunks, vectorStore }`
- `apiKey` — `{ provider: 'openai'|'anthropic', key: string }`
- `messages` — conversation history; each entry has `contextChunks` for transparency
- `auditLog` — append-only log of every event (document load, API calls, key set)
- `processingStage` / `processingProgress` — transient loading state

Session is destroyed (reset to `createEmptySession()`) on Destroy button press and on `beforeunload`.

### Key files

| Path | Purpose |
|---|---|
| `src/App.jsx` | Top-level state machine; orchestrates the full pipeline |
| `src/lib/session.js` | Session shape, `addAuditEntry`, `destroySession` |
| `src/lib/pdfParser.js` | pdf.js wrapper; uses `pdfjs-dist/build/pdf.worker.min.mjs?url` |
| `src/lib/chunker.js` | Word-based overlapping chunker (no deps) |
| `src/lib/embeddings.js` | Singleton worker manager; Promise API over postMessage |
| `src/workers/embeddings.worker.js` | Transformers.js pipeline in a Web Worker |
| `src/lib/vectorStore.js` | In-memory cosine similarity search |
| `src/lib/chatClient.js` | OpenAI + Anthropic fetch-based streaming clients |
| `src/components/TransparencyDashboard.jsx` | Right sidebar showing memory contents and audit log |

### Vite configuration notes

- `optimizeDeps.exclude: ['@xenova/transformers']` — prevents pre-bundling; Transformers.js self-manages its WASM downloads at runtime.
- `worker.format: 'es'` — required so the embeddings worker can use ESM `import` for Transformers.js.
- The pdf.js worker is loaded via `pdfjs-dist/build/pdf.worker.min.mjs?url` (Vite `?url` import = hashed asset URL).

### Privacy guarantees

- No `localStorage`, `sessionStorage`, `IndexedDB`, or cookie writes anywhere.
- The API key is passed only as a request header on each chat call and lives only in `session.apiKey`.
- The `beforeunload` handler and "Destroy Session" button both call `destroySession()` which resets state and terminates the Transformers.js Worker.

### Embedding model

`Xenova/all-MiniLM-L6-v2` (~25 MB). Downloaded from HuggingFace CDN on first use and cached by the browser's Cache API. Subsequent loads are instant. To change the model, edit `src/workers/embeddings.worker.js`.
