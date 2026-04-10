/**
 * Main-thread interface to the Transformers.js embeddings Web Worker.
 * Keeps a singleton worker instance and exposes a Promise-based API.
 */

// Vite's `?worker` suffix compiles this into a proper Worker module.
import EmbeddingsWorker from '../workers/embeddings.worker.js?worker';

let worker = null;
let pendingRequests = new Map();
let requestCounter = 0;

function getWorker() {
  if (!worker) {
    worker = new EmbeddingsWorker();
    worker.addEventListener('message', (event) => {
      const { id, type, embeddings, dims, progress, error } = event.data;
      const pending = pendingRequests.get(id);
      if (!pending) return;

      if (type === 'progress') {
        pending.onProgress?.(progress);
      } else if (type === 'result') {
        pendingRequests.delete(id);
        pending.resolve({ embeddings, dims });
      } else if (type === 'error') {
        pendingRequests.delete(id);
        pending.reject(new Error(error));
      }
    });
    worker.addEventListener('error', (err) => {
      // Reject all pending on catastrophic worker failure.
      for (const [id, pending] of pendingRequests) {
        pending.reject(err);
        pendingRequests.delete(id);
      }
    });
  }
  return worker;
}

/**
 * Embed an array of text strings.
 * Returns a 2-D array of shape [texts.length, embeddingDim].
 *
 * @param {string[]} texts
 * @param {(progress: object) => void} [onProgress]
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(texts, onProgress) {
  const id = ++requestCounter;
  const w = getWorker();

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: ({ embeddings, dims }) => {
        const [numTexts, dim] = dims;
        // Reshape flat Float32Array into [[...], [...], ...]
        const result = [];
        for (let i = 0; i < numTexts; i++) {
          result.push(Array.from(embeddings.slice(i * dim, (i + 1) * dim)));
        }
        resolve(result);
      },
      reject,
      onProgress,
    });
    w.postMessage({ id, type: 'embed', texts });
  });
}

/** Terminate the worker and clear all state. Called on session destroy. */
export function terminateEmbeddingsWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    pendingRequests.clear();
    requestCounter = 0;
  }
}
