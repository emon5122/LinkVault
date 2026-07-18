/**
 * A small, dependency-free Markdown parser tailored to link notes.
 *
 * It intentionally supports a safe, common subset (headings, emphasis, inline code, code fences,
 * lists, block quotes, links, horizontal rules) and produces a structured document that
 * `components/ui/markdown.tsx` renders with React Native primitives — no `dangerouslySetInnerHTML`
 * and no HTML passthrough, so user content cannot inject markup.
 */

export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'strike'; children: InlineNode[] }
  | { type: 'code'; value: string }
  | { type: 'link'; label: string; href: string };

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; children: InlineNode[] }
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'code'; value: string }
  | { type: 'quote'; children: InlineNode[] }
  | { type: 'list'; ordered: boolean; items: InlineNode[][] }
  | { type: 'hr' };

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const UNORDERED_RE = /^[-*+]\s+(.*)$/;
const ORDERED_RE = /^\d+[.)]\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const HR_RE = /^(-{3,}|\*{3,}|_{3,})$/;

/** Parse inline emphasis, code, and links within a single line of text. */
export function parseInline(input: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let i = 0;
  let buffer = '';

  const flush = () => {
    if (buffer) {
      nodes.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  while (i < input.length) {
    const rest = input.slice(i);

    // Inline code: `code`
    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      flush();
      nodes.push({ type: 'code', value: code[1] });
      i += code[0].length;
      continue;
    }

    // Link: [label](href)
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    if (link) {
      flush();
      nodes.push({ type: 'link', label: link[1], href: link[2] });
      i += link[0].length;
      continue;
    }

    // Bold: **text** or __text__
    const bold = /^(\*\*|__)([^*_]+?)\1/.exec(rest);
    if (bold) {
      flush();
      nodes.push({ type: 'bold', children: parseInline(bold[2]) });
      i += bold[0].length;
      continue;
    }

    // Strikethrough: ~~text~~
    const strike = /^~~([^~]+?)~~/.exec(rest);
    if (strike) {
      flush();
      nodes.push({ type: 'strike', children: parseInline(strike[1]) });
      i += strike[0].length;
      continue;
    }

    // Italic: *text* or _text_
    const italic = /^(\*|_)([^*_]+?)\1/.exec(rest);
    if (italic) {
      flush();
      nodes.push({ type: 'italic', children: parseInline(italic[2]) });
      i += italic[0].length;
      continue;
    }

    buffer += input[i];
    i += 1;
  }

  flush();
  return nodes;
}

/** Parse a markdown document into a flat list of block nodes. */
export function parseMarkdown(input: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];

    // Skip blank lines between blocks.
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Fenced code block.
    if (/^```/.test(line)) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // consume closing fence
      blocks.push({ type: 'code', value: codeLines.join('\n') });
      continue;
    }

    if (HR_RE.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      const level = Math.min(3, heading[1].length) as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, children: parseInline(heading[2]) });
      i += 1;
      continue;
    }

    // Lists (consume consecutive matching items).
    if (UNORDERED_RE.test(line) || ORDERED_RE.test(line)) {
      const ordered = ORDERED_RE.test(line);
      const items: InlineNode[][] = [];
      while (i < lines.length) {
        const m = ordered ? ORDERED_RE.exec(lines[i]) : UNORDERED_RE.exec(lines[i]);
        if (!m) break;
        items.push(parseInline(m[1]));
        i += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Block quote (single or multi-line).
    if (QUOTE_RE.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        quoteLines.push(QUOTE_RE.exec(lines[i])![1]);
        i += 1;
      }
      blocks.push({ type: 'quote', children: parseInline(quoteLines.join(' ')) });
      continue;
    }

    // Paragraph: gather until a blank line or a new block starts.
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      const l = lines[i];
      if (HEADING_RE.test(l) || UNORDERED_RE.test(l) || ORDERED_RE.test(l) || /^```/.test(l)) {
        break;
      }
      paraLines.push(l);
      i += 1;
    }
    line = paraLines.join(' ');
    blocks.push({ type: 'paragraph', children: parseInline(line) });
  }

  return blocks;
}

/** Escape markdown control characters so user text is rendered literally (used on export). */
export function escapeMarkdown(input: string): string {
  return input.replace(/([\\`*_{}[\]()#+\-.!>~|])/g, '\\$1');
}

/** Strip markdown to plain text for previews and search snippets. */
export function markdownToPlainText(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
