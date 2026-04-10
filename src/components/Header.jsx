import StatusBadge from './StatusBadge.jsx';
import DestroySession from './DestroySession.jsx';

export default function Header({ hasSession, onDestroy }) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
      {/* Logo + wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-vault-600 flex items-center justify-center">
          {/* Shield icon (inline SVG — no icon library dep) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 text-white"
          >
            <path
              fillRule="evenodd"
              d="M11.484 2.17a.75.75 0 0 1 1.032 0 11.209 11.209 0 0 0 7.877 3.08.75.75 0 0 1 .722.515 12.74 12.74 0 0 1 .635 3.985c0 5.942-4.064 10.933-9.563 12.348a.749.749 0 0 1-.374 0C6.314 20.683 2.25 15.692 2.25 9.75c0-1.39.186-2.737.635-3.985a.75.75 0 0 1 .722-.516l.143.001c2.996 0 5.718-1.17 7.734-3.08ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75ZM12 15a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <span className="text-white font-semibold tracking-tight">VaultChat</span>
        <StatusBadge location="browser-memory" />
      </div>

      {/* Right side actions */}
      {hasSession && <DestroySession onDestroy={onDestroy} />}
    </header>
  );
}
