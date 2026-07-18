/** Split text into segments marking which parts match a search query, for highlighted results. */

export interface HighlightSegment {
  text: string;
  match: boolean;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Break `text` into alternating matched / unmatched segments for the given query.
 * Case-insensitive; whitespace-separated query terms are matched independently.
 */
export function highlightMatches(text: string, query: string): HighlightSegment[] {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map(escapeRegExp);

  if (terms.length === 0 || !text) {
    return [{ text, match: false }];
  }

  const regex = new RegExp(`(${terms.join('|')})`, 'ig');
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;

  for (const m of text.matchAll(regex)) {
    const index = m.index ?? 0;
    if (index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, index), match: false });
    }
    segments.push({ text: m[0], match: true });
    lastIndex = index + m[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), match: false });
  }

  return segments;
}
