const {
  PLAY_NOTES_LIMIT,
  changelogToPlayNotes,
  cleanBullet,
  latestSection,
  parseSections,
  render,
} = require('../play-notes');

/** A realistic release-please changelog: two releases, Markdown links, trailing commit refs. */
const CHANGELOG = `# Changelog

## [1.1.0](https://github.com/emon5122/LinkVault/compare/v1.0.0...v1.1.0) (2026-07-23)

### Features

* offline reader with sentence highlights ([#12](https://github.com/emon5122/LinkVault/issues/12)) ([abc1234](https://github.com/emon5122/LinkVault/commit/abc1234))
* **search:** full-text search inside saved articles ([def5678](https://github.com/emon5122/LinkVault/commit/def5678))

### Bug Fixes

* tab bar overlapping the Android navigation bar ([9f8e7d6](https://github.com/emon5122/LinkVault/commit/9f8e7d6))

## [1.0.0](https://github.com/emon5122/LinkVault/compare/v0.9.0...v1.0.0) (2026-07-01)

### Features

* initial release ([1111111](https://github.com/emon5122/LinkVault/commit/1111111))
`;

describe('latestSection', () => {
  it('returns only the newest release body', () => {
    const section = latestSection(CHANGELOG);
    expect(section).toContain('offline reader');
    expect(section).not.toContain('initial release');
  });

  it('is empty when there are no releases yet', () => {
    expect(latestSection('# Changelog\n')).toBe('');
    expect(latestSection('')).toBe('');
  });
});

describe('cleanBullet', () => {
  it('drops the trailing commit and issue refs', () => {
    expect(cleanBullet('does a thing ([abc1234](https://x/commit/abc1234))')).toBe('does a thing');
    expect(cleanBullet('does a thing ([#12](https://x/issues/12))')).toBe('does a thing');
  });

  it('keeps the text of an inline link', () => {
    expect(cleanBullet('see [the docs](https://x) for more')).toBe('see the docs for more');
  });

  it('strips emphasis and code formatting', () => {
    expect(cleanBullet('**search:** faster `LIKE` queries')).toBe('search: faster LIKE queries');
  });
});

describe('parseSections', () => {
  const groups = parseSections(latestSection(CHANGELOG));

  it('renames sections to store-friendly labels', () => {
    expect(groups.map((g: { label: string }) => g.label)).toEqual(['New', 'Fixes']);
  });

  it('collects the entries under each section', () => {
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].items[0]).toBe('Offline reader with sentence highlights');
    expect(groups[1].items[0]).toBe('Tab bar overlapping the Android navigation bar');
  });

  it('drops sections with no entries', () => {
    expect(parseSections('### Features\n\n### Bug Fixes\n')).toEqual([]);
  });

  it('keeps bullets that appear before any heading', () => {
    const groups2 = parseSections('* a loose entry here\n');
    expect(groups2[0].items).toEqual(['A loose entry here']);
  });
});

describe('render', () => {
  it('produces plain text with bullets, no Markdown', () => {
    const out = changelogToPlayNotes(CHANGELOG);
    expect(out).toContain('New\n• Offline reader with sentence highlights');
    expect(out).toContain('Fixes\n• Tab bar overlapping the Android navigation bar');
    expect(out).not.toMatch(/[[\]()*`]/);
  });

  it('stays within the Play limit and cuts whole bullets', () => {
    const many = {
      label: 'New',
      items: Array.from({ length: 40 }, (_, i) => `A reasonably wordy feature entry number ${i}`),
    };
    const out = render([many]);
    expect(out.length).toBeLessThanOrEqual(PLAY_NOTES_LIMIT);
    // Whatever survived must be complete lines, not a bullet sliced in half.
    for (const line of out.split('\n').filter((l: string) => l.startsWith('• '))) {
      expect(line).toMatch(/number \d+$/);
    }
  });

  it('word-cuts a single entry that alone exceeds the budget', () => {
    const out = render([{ label: '', items: ['word '.repeat(300).trim()] }]);
    expect(out.length).toBeLessThanOrEqual(PLAY_NOTES_LIMIT);
    expect(out.endsWith('…')).toBe(true);
  });

  it('returns empty string when there is nothing to report', () => {
    expect(changelogToPlayNotes('# Changelog\n')).toBe('');
    expect(changelogToPlayNotes('')).toBe('');
  });

  it('real-world changelog fits comfortably', () => {
    expect(changelogToPlayNotes(CHANGELOG).length).toBeLessThanOrEqual(PLAY_NOTES_LIMIT);
  });
});
