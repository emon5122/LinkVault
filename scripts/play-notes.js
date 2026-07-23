/**
 * Turn the newest CHANGELOG.md section into Google Play "What's new" text.
 *
 * release-please writes developer-facing Markdown — headings, Markdown links, and a trailing commit
 * SHA on every bullet. Play shows plain text, renders no Markdown, and hard-caps release notes at
 * 500 characters, so the two can't share a file. This converts one into the other.
 *
 * The pure functions are unit-tested (`scripts/__tests__/play-notes.test.ts`); running the file
 * directly writes the result to the fastlane changelog:
 *
 *   node scripts/play-notes.js            # write fastlane/metadata/.../changelogs/default.txt
 *   node scripts/play-notes.js --check    # print, don't write (useful in CI logs)
 */
const fs = require('fs');
const path = require('path');

/** Google Play's hard limit on release notes. Longer submissions are rejected. */
const PLAY_NOTES_LIMIT = 500;

/** release-please section headings mapped to something a store visitor would want to read. */
const SECTION_LABELS = {
  Features: 'New',
  'Bug Fixes': 'Fixes',
  'Performance Improvements': 'Improvements',
  Reverts: 'Reverted',
};

const CHANGELOG_PATH = 'CHANGELOG.md';
const PLAY_NOTES_PATH = path.join(
  'fastlane',
  'metadata',
  'android',
  'en-US',
  'changelogs',
  'default.txt',
);

/**
 * Extract the body of the most recent release section.
 *
 * Sections start at a `## ` heading; the newest is first because release-please prepends. Returns
 * an empty string when the changelog has no releases yet.
 */
function latestSection(markdown) {
  if (!markdown) return '';
  const lines = markdown.split(/\r?\n/);

  const start = lines.findIndex((line) => /^##\s+/.test(line));
  if (start === -1) return '';

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##\s+/.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/** Strip the Markdown a store listing can't render, plus release-please's trailing commit links. */
function cleanBullet(text) {
  return (
    text
      // Trailing "([abc1234](url))" / "([#12](url))" refs release-please appends to every entry.
      .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)\s*$/g, '')
      .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)\s*/g, ' ')
      // Inline links -> their text.
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Emphasis and code fences.
      .replace(/\*\*([^*]*)\*\*/g, '$1')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\s+/g, ' ')
      .replace(/[\s,;]+$/, '')
      .trim()
  );
}

/** Uppercase the first letter so bullets read as sentences, leaving deliberate casing alone. */
function sentenceCase(text) {
  if (!text) return text;
  // "iOS crash" / "eas build" — only touch a plainly lowercase first word.
  if (/^[a-z]/.test(text) && !/^[a-z]+[A-Z]/.test(text)) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
}

/** Parse a release section into `{ label, items }` groups, dropping empty ones. */
function parseSections(sectionBody) {
  const groups = [];
  let current = null;

  for (const rawLine of sectionBody.split(/\r?\n/)) {
    const line = rawLine.trim();

    const heading = /^#{3,}\s+(.*)$/.exec(line);
    if (heading) {
      const name = cleanBullet(heading[1]);
      current = { label: SECTION_LABELS[name] ?? name, items: [] };
      groups.push(current);
      continue;
    }

    const bullet = /^[*-]\s+(.*)$/.exec(line);
    if (bullet) {
      // Entries before any heading still belong in the notes.
      if (!current) {
        current = { label: '', items: [] };
        groups.push(current);
      }
      const text = sentenceCase(cleanBullet(bullet[1]));
      if (text) current.items.push(text);
    }
  }

  return groups.filter((group) => group.items.length > 0);
}

/**
 * Render groups to plain text within Play's character budget.
 *
 * Truncation happens at a bullet boundary rather than mid-word: a release note cut off halfway
 * through a sentence looks broken, whereas a shorter list just looks edited.
 */
function render(groups, limit = PLAY_NOTES_LIMIT) {
  const blocks = groups.map((group) => {
    const lines = group.items.map((item) => `• ${item}`);
    return group.label ? [group.label, ...lines].join('\n') : lines.join('\n');
  });

  let output = blocks.join('\n\n');
  if (output.length <= limit) return output;

  // Drop trailing bullets until it fits, keeping whole groups coherent.
  const trimmed = groups.map((group) => ({ ...group, items: [...group.items] }));
  while (output.length > limit) {
    const last = [...trimmed].reverse().find((group) => group.items.length > 0);
    if (!last) break;
    last.items.pop();

    const remaining = trimmed.filter((group) => group.items.length > 0);
    if (remaining.length === 0) break;

    output = remaining
      .map((group) => {
        const lines = group.items.map((item) => `• ${item}`);
        return group.label ? [group.label, ...lines].join('\n') : lines.join('\n');
      })
      .join('\n\n');
  }

  // A single bullet longer than the budget still has to be cut; do it at a word boundary.
  if (output.length > limit) {
    const clipped = output.slice(0, limit - 1);
    const lastSpace = clipped.lastIndexOf(' ');
    output = `${(lastSpace > limit * 0.5 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
  }

  return output;
}

/** Full conversion: CHANGELOG.md contents -> Play release notes. Empty string when nothing to say. */
function changelogToPlayNotes(markdown, limit = PLAY_NOTES_LIMIT) {
  return render(parseSections(latestSection(markdown)), limit);
}

function main() {
  const check = process.argv.includes('--check');

  if (!fs.existsSync(CHANGELOG_PATH)) {
    console.error(`No ${CHANGELOG_PATH} yet — release-please writes it on the first release.`);
    process.exit(0);
  }

  const notes = changelogToPlayNotes(fs.readFileSync(CHANGELOG_PATH, 'utf8'));
  if (!notes) {
    console.error('Latest changelog section had no entries; leaving release notes unchanged.');
    process.exit(0);
  }

  if (check) {
    console.log(notes);
    console.log(`\n[${notes.length}/${PLAY_NOTES_LIMIT} characters]`);
    return;
  }

  fs.mkdirSync(path.dirname(PLAY_NOTES_PATH), { recursive: true });
  fs.writeFileSync(PLAY_NOTES_PATH, `${notes}\n`, 'utf8');
  console.log(`Wrote ${notes.length}/${PLAY_NOTES_LIMIT} characters to ${PLAY_NOTES_PATH}`);
}

if (require.main === module) main();

module.exports = {
  PLAY_NOTES_LIMIT,
  PLAY_NOTES_PATH,
  CHANGELOG_PATH,
  latestSection,
  cleanBullet,
  parseSections,
  render,
  changelogToPlayNotes,
};
