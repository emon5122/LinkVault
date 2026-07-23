/**
 * Sentence segmentation for the offline reader.
 *
 * React Native's `<Text selectable>` gives the user a native selection but reports nothing back to
 * JS — there is no `onSelectionChange` for arbitrary text, so range-based highlighting the way a
 * WebView would do it is simply not available. Instead the reader pre-splits each block into
 * sentences and makes each one tappable, which is fine-grained enough to be useful and completely
 * reliable without a WebView.
 *
 * Offsets are indices into the block's own text, so a highlight can be re-anchored on every render.
 * All functions here are pure and unit-tested.
 */

export interface Sentence {
  text: string;
  /** Inclusive start index into the source block. */
  start: number;
  /** Exclusive end index into the source block. */
  end: number;
}

/**
 * Tokens ending in `.` that virtually never end a sentence. Without this list, "Dr. Smith wrote…"
 * splits after "Dr." and every highlight in the paragraph lands on the wrong span.
 */
const ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'st',
  'mt',
  'vs',
  'etc',
  'eg',
  'ie',
  'al',
  'fig',
  'no',
  'vol',
  'pp',
  'inc',
  'ltd',
  'co',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'sept',
  'oct',
  'nov',
  'dec',
]);

/** A sentence longer than this is split at a clause boundary so highlights stay tappable. */
const MAX_SENTENCE_CHARS = 400;

function isAbbreviation(text: string, terminatorIndex: number): boolean {
  // Walk back over the word immediately preceding the '.'.
  let start = terminatorIndex;
  while (start > 0 && /[\p{L}\p{N}]/u.test(text[start - 1])) start -= 1;
  const word = text.slice(start, terminatorIndex).toLowerCase();
  if (!word) return false;
  if (ABBREVIATIONS.has(word)) return true;
  // Single letters are initials ("J. R. R. Tolkien") or acronym parts ("U.S.").
  return word.length === 1;
}

/** Split a block of text into sentences with their offsets. Never returns empty spans. */
export function splitSentences(text: string): Sentence[] {
  const trimmed = text ?? '';
  if (!trimmed.trim()) return [];

  const sentences: Sentence[] = [];
  let start = 0;

  const push = (end: number) => {
    const raw = trimmed.slice(start, end);
    const leading = raw.length - raw.trimStart().length;
    const content = raw.trim();
    if (content) {
      sentences.push({
        text: content,
        start: start + leading,
        end: start + leading + content.length,
      });
    }
    start = end;
  };

  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (char !== '.' && char !== '!' && char !== '?' && char !== '…') continue;

    // Consume a run of terminators and any closing quote/bracket that belongs with them.
    let end = i + 1;
    while (end < trimmed.length && /[.!?…"'”’)\]]/.test(trimmed[end])) end += 1;

    // A terminator only ends a sentence when whitespace (or the end of the block) follows.
    if (end < trimmed.length && !/\s/.test(trimmed[end])) continue;
    if (char === '.' && isAbbreviation(trimmed, i)) continue;

    push(end);
    i = end - 1;
  }

  if (start < trimmed.length) push(trimmed.length);

  return sentences.flatMap(splitLongSentence);
}

/**
 * Break a very long sentence at clause boundaries.
 *
 * Some pages have a single 900-character "sentence" (lists written as prose, missing punctuation).
 * Leaving it whole would make the entire paragraph one tap target.
 */
function splitLongSentence(sentence: Sentence): Sentence[] {
  if (sentence.text.length <= MAX_SENTENCE_CHARS) return [sentence];

  const parts: Sentence[] = [];
  let cursor = 0;

  while (cursor < sentence.text.length) {
    const remaining = sentence.text.length - cursor;
    if (remaining <= MAX_SENTENCE_CHARS) {
      parts.push({
        text: sentence.text.slice(cursor),
        start: sentence.start + cursor,
        end: sentence.end,
      });
      break;
    }

    const window = sentence.text.slice(cursor, cursor + MAX_SENTENCE_CHARS);
    // Prefer a clause break, then any space, then a hard cut.
    const clause = Math.max(window.lastIndexOf('; '), window.lastIndexOf(', '));
    const space = window.lastIndexOf(' ');
    const cut = clause > MAX_SENTENCE_CHARS * 0.5 ? clause + 1 : space > 0 ? space : window.length;

    parts.push({
      text: sentence.text.slice(cursor, cursor + cut).trim(),
      start: sentence.start + cursor,
      end: sentence.start + cursor + cut,
    });
    cursor += cut;
    while (sentence.text[cursor] === ' ') cursor += 1;
  }

  return parts.filter((p) => p.text.length > 0);
}

/** Percentage (0-100) of `total` blocks scrolled past, clamped for display. */
export function readingProgress(visibleIndex: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((visibleIndex + 1) / total) * 100)));
}
