/**
 * Client-side PDF text extraction using pdf.js.
 * The PDF binary never leaves the browser — parsing happens entirely
 * in the main thread with a pdf.js worker for heavy lifting.
 */
// pdfjs-dist v3 is CJS-only. Vite's ESM transform of the worker file breaks
// the UMD bootstrap, causing "Cannot read properties of undefined
// (reading 'registerBackend')". Serving the worker from public/ bypasses
// Vite's pipeline entirely — the file is delivered raw to the browser Worker.
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.js';

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

/**
 * @param {File} file  A PDF File object from an <input> or drag-and-drop.
 * @param {(progress: {page: number, total: number}) => void} onProgress
 * @returns {Promise<{text: string, pageCount: number}>}
 */
export async function parsePDF(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const pageTexts = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Join items with a space; insert double newline between pages.
    const pageText = content.items.map((item) => item.str).join(' ');
    pageTexts.push(pageText);
    onProgress?.({ page: i, total: pageCount });
  }

  return {
    text: pageTexts.join('\n\n'),
    pageCount,
  };
}
