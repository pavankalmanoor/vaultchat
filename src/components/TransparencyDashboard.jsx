import { useState } from 'react';
import StatusBadge from './StatusBadge.jsx';

export default function TransparencyDashboard({ session }) {
  const [open, setOpen] = useState(true);

  const { document, apiKey, messages, auditLog } = session;

  return (
    <aside className="w-72 shrink-0 flex flex-col border-l border-slate-800 bg-slate-900 overflow-hidden">
      {/* Panel header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors w-full text-left"
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
            className="w-4 h-4 text-vault-400">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-semibold text-slate-200">Transparency</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">

          {/* Data location */}
          <Section title="Data Location">
            <Row label="Storage" value={<StatusBadge location="browser-memory" />} />
            <Row label="Persistence" value={<span className="text-emerald-400">None (heap only)</span>} />
            <Row label="localStorage" value={<span className="text-emerald-400">Not used</span>} />
            <Row label="Cookies" value={<span className="text-emerald-400">Not used</span>} />
            <Row label="IndexedDB" value={<span className="text-emerald-400">Not used</span>} />
          </Section>

          {/* What's in memory */}
          <Section title="In Memory">
            <Row label="Document" value={document ? document.name : '—'} />
            <Row label="Pages" value={document ? document.pageCount : '—'} />
            <Row label="Chunks" value={document ? document.chunks.length : '—'} />
            <Row label="Index terms" value={document?.index ? document.index.invertedIndex.size : '—'} />
            <Row label="Messages" value={messages.length || '—'} />
            <Row
              label="API Key"
              value={
                apiKey
                  ? <span className="font-mono text-xs">{maskKey(apiKey.key)} ({apiKey.provider})</span>
                  : '—'
              }
            />
          </Section>

          {/* API call log */}
          <Section title={`API Calls (${auditLog.filter(e => e.type === 'api_call').length})`}>
            {auditLog.filter((e) => e.type === 'api_call').length === 0 && (
              <p className="text-slate-500 text-xs">No API calls yet.</p>
            )}
            {auditLog
              .filter((e) => e.type === 'api_call')
              .slice()
              .reverse()
              .map((entry) => (
                <AuditEntry key={entry.id} entry={entry} />
              ))}
          </Section>

          {/* Event log */}
          <Section title="Event Log">
            {auditLog.length === 0 && (
              <p className="text-slate-500 text-xs">No events yet.</p>
            )}
            {auditLog
              .slice()
              .reverse()
              .map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 py-1 border-b border-slate-800 last:border-0">
                  <EventDot type={entry.type} />
                  <div className="min-w-0">
                    <p className="text-slate-300 text-xs leading-snug">{entry.description}</p>
                    <p className="text-slate-600 text-xs">{formatTime(entry.timestamp)}</p>
                  </div>
                </div>
              ))}
          </Section>
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-slate-500 text-xs shrink-0">{label}</span>
      <span className="text-slate-300 text-xs text-right truncate max-w-[160px]">{value}</span>
    </div>
  );
}

function AuditEntry({ entry }) {
  const { detail } = entry;
  return (
    <div className="bg-slate-800 rounded-lg p-2.5 text-xs space-y-1 font-mono">
      <div className="flex items-center justify-between">
        <span className="text-vault-400 font-semibold uppercase">{detail?.provider}</span>
        <span className="text-slate-500">{formatTime(entry.timestamp)}</span>
      </div>
      <div className="text-slate-400">Model: {detail?.model}</div>
      <div className="text-slate-400">Endpoint: <span className="text-slate-300 break-all">{detail?.endpoint}</span></div>
      <div className="text-slate-400">
        Msgs: {detail?.messageCount} · System: {detail?.systemPromptLength} chars
      </div>
    </div>
  );
}

function EventDot({ type }) {
  const colours = {
    document_loaded: 'bg-blue-400',
    api_call:        'bg-amber-400',
    key_set:         'bg-vault-400',
    session_destroyed: 'bg-red-400',
  };
  return (
    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${colours[type] ?? 'bg-slate-500'}`} />
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskKey(key) {
  if (!key || key.length < 8) return '***';
  return key.slice(0, 7) + '…' + key.slice(-4);
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
