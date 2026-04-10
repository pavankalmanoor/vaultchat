/**
 * BM25 retrieval — pure JS, no WASM, no workers, no network requests.
 *
 * BM25 is the ranking function used by Elasticsearch and most production
 * search engines. For document Q&A it matches or exceeds embedding-based
 * retrieval on keyword-rich queries.
 *
 * Parameters (Elasticsearch defaults):
 *   k1 = 1.2  — term-frequency saturation
 *   b  = 0.75 — length normalisation
 */

const K1 = 1.2;
const B  = 0.75;

/** Lowercase, strip punctuation, split on whitespace. */
function tokenize(text) {
  return text.toLowerCase().match(/\b\w+\b/g) ?? [];
}

/**
 * Build a BM25 index from an array of text chunks.
 * O(total tokens) time and space.
 *
 * @param {string[]} chunks
 * @returns {BM25Index}
 */
export function buildIndex(chunks) {
  const tokenized = chunks.map(tokenize);
  const N = chunks.length;
  const avgLen = tokenized.reduce((s, t) => s + t.length, 0) / N || 1;

  // term → { df: number, postings: Map<docId, tf> }
  const invertedIndex = new Map();

  tokenized.forEach((tokens, docId) => {
    const termFreq = {};
    for (const t of tokens) termFreq[t] = (termFreq[t] ?? 0) + 1;

    for (const [term, tf] of Object.entries(termFreq)) {
      if (!invertedIndex.has(term)) {
        invertedIndex.set(term, { df: 0, postings: new Map() });
      }
      const entry = invertedIndex.get(term);
      entry.df += 1;
      entry.postings.set(docId, tf);
    }
  });

  return { chunks, tokenized, invertedIndex, avgLen, N };
}

/**
 * @typedef {{ text: string, index: number, score: number }} SearchResult
 *
 * @param {BM25Index} idx
 * @param {string} query
 * @param {number} [topK=5]
 * @returns {SearchResult[]}
 */
export function searchIndex(idx, query, topK = 5) {
  const queryTerms = tokenize(query);
  const scores = new Float64Array(idx.N);

  for (const term of queryTerms) {
    const entry = idx.invertedIndex.get(term);
    if (!entry) continue;

    const idf = Math.log((idx.N - entry.df + 0.5) / (entry.df + 0.5) + 1);

    for (const [docId, tf] of entry.postings) {
      const dl  = idx.tokenized[docId].length;
      const norm = K1 * (1 - B + B * (dl / idx.avgLen));
      scores[docId] += idf * (tf * (K1 + 1)) / (tf + norm);
    }
  }

  return Array.from(scores, (score, index) => ({
    text: idx.chunks[index],
    index,
    score,
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
