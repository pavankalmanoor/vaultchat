import { useRef, useState } from 'react';

export default function PDFUploader({ processingStage, processingProgress, onFileSelected }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const stageLabels = {
    parsing:  'Parsing PDF pages…',
    chunking: 'Chunking text…',
    indexing: 'Building search index…',
  };

  function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }
    onFileSelected(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  if (processingStage) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="w-12 h-12 rounded-full border-4 border-vault-600 border-t-transparent animate-spin" />
        <div className="text-center">
          <p className="text-slate-200 font-medium">{stageLabels[processingStage]}</p>
          {processingStage === 'indexing' && (
            <div className="mt-3 w-64 bg-slate-800 rounded-full h-2">
              <div
                className="bg-vault-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500 text-center max-w-xs">
          All processing happens in your browser. No data is uploaded to any server.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg">
      {/* Hero text */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Chat with your document
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Your PDF is parsed, chunked, and embedded entirely in this browser tab.
          <br />
          Nothing is uploaded. Nothing is stored. Everything disappears when you close the tab.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4
          cursor-pointer transition-colors
          ${dragging
            ? 'border-vault-500 bg-vault-900/20'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
          }
        `}
      >
        {/* Document icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          className={`w-12 h-12 transition-colors ${dragging ? 'text-vault-400' : 'text-slate-600'}`}>
          <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
          <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
        </svg>

        <div className="text-center">
          <p className="text-slate-300 font-medium">Drop a PDF here</p>
          <p className="text-slate-500 text-sm mt-1">or click to browse</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {/* Privacy promise */}
      <div className="grid grid-cols-3 gap-3 w-full text-center text-xs text-slate-500">
        {[
          ['🔒', 'No uploads', 'Parsed in-browser'],
          ['🧠', 'No storage', 'Memory only'],
          ['🗑️', 'Auto-wipe', 'On tab close'],
        ].map(([icon, title, sub]) => (
          <div key={title} className="card p-3">
            <div className="text-lg">{icon}</div>
            <div className="text-slate-300 font-medium mt-1">{title}</div>
            <div className="mt-0.5">{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
