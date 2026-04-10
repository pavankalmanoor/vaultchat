import { useState, useRef, useEffect } from 'react';

export default function ChatInterface({
  document,
  messages,
  isGenerating,
  onSendMessage,
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isGenerating) return;
    setInput('');
    onSendMessage(text);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Document pill */}
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2 shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          className="w-4 h-4 text-vault-400">
          <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
          <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
        </svg>
        <span className="text-sm text-slate-300 font-medium truncate max-w-xs">{document.name}</span>
        <span className="text-xs text-slate-500">{document.pageCount} pages · {document.chunks.length} chunks</span>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-vault-900 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                className="w-6 h-6 text-vault-400">
                <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">Ask anything about your document</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isGenerating && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-vault-700 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-white">V</span>
            </div>
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="inline-block w-1.5 h-4 bg-vault-400 cursor-blink" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 py-3 border-t border-slate-800 bg-slate-900">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-grow, capped at ~6 lines
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 144) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your document… (Enter to send, Shift+Enter for newline)"
            disabled={isGenerating}
            rows={1}
            className="input-field resize-none overflow-hidden leading-6 flex-1"
            style={{ minHeight: '40px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="btn-primary py-2.5 px-3 shrink-0"
            title="Send (Enter)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold
        ${isUser ? 'bg-slate-700 text-slate-300' : 'bg-vault-700 text-white'}
      `}>
        {isUser ? 'U' : 'V'}
      </div>

      {/* Bubble */}
      <div className={`
        max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
        ${isUser
          ? 'bg-vault-700 text-white rounded-tr-sm'
          : 'bg-slate-800 text-slate-100 rounded-tl-sm'
        }
      `}>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>

        {/* Show retrieved context chunks (transparency) */}
        {message.contextChunks && message.contextChunks.length > 0 && (
          <details className="mt-2 border-t border-white/10 pt-2">
            <summary className="text-xs opacity-60 cursor-pointer select-none">
              {message.contextChunks.length} context chunk{message.contextChunks.length !== 1 ? 's' : ''} used
            </summary>
            <div className="mt-2 space-y-1">
              {message.contextChunks.map((chunk, i) => (
                <p key={i} className="text-xs opacity-50 font-mono leading-snug line-clamp-2">
                  [{i + 1}] {chunk.text.slice(0, 120)}…
                </p>
              ))}
            </div>
          </details>
        )}

        <p className="text-xs opacity-30 mt-1.5">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
