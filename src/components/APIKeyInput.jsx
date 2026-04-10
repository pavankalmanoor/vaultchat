import { useState } from 'react';

export default function APIKeyInput({ onKeySet }) {
  const [provider, setProvider] = useState('openai');
  const [key, setKey] = useState('');
  const [revealed, setRevealed] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    onKeySet({ provider, key: trimmed });
  }

  const placeholders = {
    openai:    'sk-...',
    anthropic: 'sk-ant-...',
    gemini:    'AIza...',
  };

  const labels = {
    openai:    'OpenAI',
    anthropic: 'Anthropic',
    gemini:    'Gemini',
  };

  const freeTier = {
    gemini: 'Free tier available',
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Connect your AI key</h2>
        <p className="text-slate-400 text-sm">
          Your key is held in JavaScript memory only — never stored, never logged.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 w-full flex flex-col gap-5">
        {/* Provider picker */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Provider</label>
          <div className="grid grid-cols-3 gap-2">
            {['openai', 'anthropic', 'gemini'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p)}
                className={`
                  relative py-2 px-3 rounded-lg text-sm font-medium border transition-colors
                  ${provider === p
                    ? 'bg-vault-700 border-vault-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }
                `}
              >
                {labels[p]}
                {freeTier[p] && (
                  <span className="absolute -top-2 -right-1 text-[9px] font-semibold bg-emerald-700 text-emerald-100 px-1 rounded-full leading-4">
                    free
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Key input */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">API Key</label>
          <div className="relative">
            <input
              type={revealed ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={placeholders[provider]}
              className="input-field pr-10 font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              tabIndex={-1}
            >
              {revealed ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577A11.217 11.217 0 0 1 12 3.75c4.5 0 8.336 2.51 10.406 6.22a1.513 1.513 0 0 1 .27 2.583ZM15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12Z" />
                  <path d="M10.5 18.75a6.75 6.75 0 0 1-3.423-.948L4.688 15.42a11.25 11.25 0 0 1-2.362-3.867 1.513 1.513 0 0 1 0-1.106A11.21 11.21 0 0 1 5.49 6.046l.94.94A9.65 9.65 0 0 0 3.75 12c0 3.273 1.645 6.16 4.17 7.955A6.75 6.75 0 0 1 10.5 18.75Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Privacy notice */}
        <div className="flex items-start gap-2 bg-emerald-950/50 border border-emerald-800 rounded-lg p-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
            className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-emerald-300 leading-relaxed">
            Key stored in JS heap only. Never written to localStorage, cookies, or any server.
            Wiped when you destroy the session or close this tab.
          </p>
        </div>

        {/* Gemini-specific URL param warning */}
        {provider === 'gemini' && (
          <div className="flex items-start gap-2 bg-amber-950/50 border border-amber-800 rounded-lg p-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              className="w-4 h-4 text-amber-400 shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-amber-300 leading-relaxed">
              Gemini's REST API passes the key as a URL query parameter — this is Google's
              required browser auth method. The key is not sent to any server you control and
              is still wiped from memory on session destroy.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!key.trim()}
          className="btn-primary w-full justify-center"
        >
          Start Chatting
        </button>
      </form>
    </div>
  );
}
