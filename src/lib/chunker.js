/**
 * Splits a large text into overlapping word-based chunks suitable for
 * embedding and retrieval. No external dependency needed.
 *
 * @param {string} text        Full document text.
 * @param {number} chunkWords  Target chunk size in words (default 150).
 * @param {number} overlapWords Words of overlap between consecutive chunks (default 20).
 * @returns {string[]}  Array of chunk strings.
 */
export function chunkText(text, chunkWords = 150, overlapWords = 20) {
  // Normalise whitespace so splitting is clean.
  const normalised = text.replace(/\s+/g, ' ').trim();
  const words = normalised.split(' ');

  if (words.length === 0) return [];

  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkWords, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start += chunkWords - overlapWords;
  }

  return chunks;
}
