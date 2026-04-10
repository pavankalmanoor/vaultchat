/**
 * In-memory vector store. Pure JS, no external dependency.
 * All vectors live in a plain JavaScript array — nothing is persisted.
 */

/**
 * Cosine similarity between two unit-normalised vectors.
 * Because Transformers.js normalises embeddings, this equals the dot product.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}  Value in [-1, 1]; higher = more similar.
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * @typedef {{ text: string, embedding: number[], index: number }} VectorEntry
 */

/**
 * Build a vector store from parallel arrays of chunks and embeddings.
 *
 * @param {string[]}   chunks      Raw text chunks.
 * @param {number[][]} embeddings  One embedding per chunk.
 * @returns {VectorEntry[]}
 */
export function buildVectorStore(chunks, embeddings) {
  return chunks.map((text, index) => ({
    text,
    embedding: embeddings[index],
    index,
  }));
}

/**
 * Return the top-K most similar chunks to the query embedding.
 *
 * @param {VectorEntry[]} store
 * @param {number[]}      queryEmbedding
 * @param {number}        topK
 * @returns {Array<VectorEntry & { score: number }>}
 */
export function search(store, queryEmbedding, topK = 5) {
  return store
    .map((entry) => ({ ...entry, score: cosineSimilarity(entry.embedding, queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
