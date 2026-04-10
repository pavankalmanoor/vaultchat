/**
 * Web Worker that runs Transformers.js embedding pipeline off the main thread.
 * Model weights are downloaded from HuggingFace on first use and cached by
 * the browser's Cache API — they never touch any server you control.
 */
import { pipeline, env } from '@xenova/transformers';

// Disable local model loading; always fetch from HuggingFace CDN.
env.allowLocalModels = false;

let extractor = null;

async function getExtractor(onProgress) {
  if (!extractor) {
    extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      {
        progress_callback: onProgress,
      }
    );
  }
  return extractor;
}

self.addEventListener('message', async (event) => {
  const { id, type, texts } = event.data;

  if (type === 'embed') {
    try {
      const model = await getExtractor((progress) => {
        // Forward model-load progress to the main thread.
        self.postMessage({ id, type: 'progress', progress });
      });

      // Run embedding; pooling='mean' + normalize=true gives unit vectors
      // suitable for cosine similarity search.
      const output = await model(texts, { pooling: 'mean', normalize: true });

      // output.data is a Float32Array; convert to plain array for structured clone.
      self.postMessage({
        id,
        type: 'result',
        embeddings: Array.from(output.data),
        // dims: [numTexts, embeddingDim]
        dims: output.dims,
      });
    } catch (err) {
      self.postMessage({ id, type: 'error', error: err.message });
    }
  }
});
