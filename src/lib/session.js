/**
 * Session factory and destruction helpers.
 *
 * The session object is held in React state (App.jsx) — it exists only in
 * the JS heap. Nothing is written to localStorage, sessionStorage, IndexedDB,
 * or cookies. Destroying the session nulls every reference and triggers GC.
 */

/**
 * Returns a fresh, empty session object.
 * Shape is the single source of truth consumed by all components.
 */
export function createEmptySession() {
  return {
    // Document state
    document: null,      // { name, pageCount, text, chunks, index }

    // Auth
    apiKey: null,        // { provider: 'openai'|'anthropic', key: string }

    // Conversation
    messages: [],        // [{ id, role, content, timestamp, contextChunks? }]

    // Transparency audit log
    auditLog: [],        // [{ id, type, description, timestamp, detail }]

    // Processing state (transient UI, reset on destroy)
    processingStage: null, // 'parsing'|'chunking'|'indexing'|null
    processingProgress: 0, // 0-100
  };
}

/**
 * Append an audit log entry to a session (immutably).
 *
 * @param {object} session
 * @param {'document_loaded'|'api_call'|'session_destroyed'|'key_set'} type
 * @param {string} description  Human-readable summary.
 * @param {object} [detail]     Additional structured data.
 * @returns {object}  Updated session.
 */
export function addAuditEntry(session, type, description, detail = {}) {
  const entry = {
    id: crypto.randomUUID(),
    type,
    description,
    detail,
    timestamp: new Date().toISOString(),
  };
  return { ...session, auditLog: [...session.auditLog, entry] };
}

/**
 * Wipe all session data.
 * Call this on "Destroy Session" button press and on beforeunload.
 */
export function destroySession(setSession) {
  setSession(createEmptySession());
}
