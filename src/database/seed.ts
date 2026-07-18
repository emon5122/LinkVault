/**
 * One-time sample data so a fresh install isn't an empty shell. Guarded by an MMKV flag and a
 * safety check that the library is actually empty, so it never overwrites real user data.
 */
import { getBoolean, setBoolean } from '@/services/storage';
import { extractHost, faviconUrlForHost } from '@/utils/url';

import { foldersRepository } from './repositories/folders';
import { linksRepository } from './repositories/links';
import { statsRepository } from './repositories/stats';
import { tagsRepository } from './repositories/tags';

const SEED_FLAG = 'linkvault.seeded';

interface SeedLink {
  url: string;
  title: string;
  description: string;
  siteName: string;
  folder?: string;
  tags?: string[];
  favorite?: boolean;
  readLater?: boolean;
  pinned?: boolean;
}

const SEED_FOLDERS: { name: string; icon: string; color: string }[] = [
  { name: 'Reading List', icon: 'bookmark', color: '#2563eb' },
  { name: 'Development', icon: 'code', color: '#16a34a' },
  { name: 'Design', icon: 'palette', color: '#db2777' },
  { name: 'Inspiration', icon: 'sparkles', color: '#7c3aed' },
];

const SEED_LINKS: SeedLink[] = [
  {
    url: 'https://docs.expo.dev/',
    title: 'Expo Documentation',
    description: 'Guides and API references for building universal React Native apps with Expo.',
    siteName: 'Expo',
    folder: 'Development',
    tags: ['expo', 'react-native', 'docs'],
    pinned: true,
    favorite: true,
  },
  {
    url: 'https://react.dev/learn',
    title: 'Learn React',
    description: 'The official React documentation — components, hooks, and modern patterns.',
    siteName: 'React',
    folder: 'Development',
    tags: ['react', 'docs'],
    favorite: true,
  },
  {
    url: 'https://www.nativewind.dev/',
    title: 'NativeWind',
    description: 'Use Tailwind CSS to style your React Native applications.',
    siteName: 'NativeWind',
    folder: 'Development',
    tags: ['react-native', 'styling'],
  },
  {
    url: 'https://tanstack.com/query/latest',
    title: 'TanStack Query',
    description: 'Powerful asynchronous state management for TS/JS and React.',
    siteName: 'TanStack',
    folder: 'Development',
    tags: ['react', 'data'],
    readLater: true,
  },
  {
    url: 'https://www.smashingmagazine.com/',
    title: 'Smashing Magazine',
    description: 'For web designers and developers — UX, design systems, and front-end.',
    siteName: 'Smashing Magazine',
    folder: 'Design',
    tags: ['design', 'ux'],
    readLater: true,
  },
  {
    url: 'https://dribbble.com/shots',
    title: 'Dribbble — Discover Designs',
    description: 'Explore work from the design community for inspiration.',
    siteName: 'Dribbble',
    folder: 'Inspiration',
    tags: ['design', 'inspiration'],
    pinned: true,
  },
  {
    url: 'https://linear.app/method',
    title: 'The Linear Method',
    description: 'Practices for building high-quality software and a focused product.',
    siteName: 'Linear',
    folder: 'Reading List',
    tags: ['product', 'process'],
    favorite: true,
  },
  {
    url: 'https://waitbutwhy.com/2015/12/the-tail-end.html',
    title: 'The Tail End',
    description: 'A striking visualization of how much time we really have left.',
    siteName: 'Wait But Why',
    folder: 'Reading List',
    tags: ['life', 'longread'],
    readLater: true,
  },
];

/** Seed sample data if this is a fresh, empty install. Safe to call on every launch. */
export async function seedSampleDataIfNeeded(): Promise<void> {
  if (getBoolean(SEED_FLAG)) return;

  const stats = await statsRepository.getOverview();
  if (stats.totalLinks > 0 || stats.folders > 0) {
    // The user already has data — mark as seeded and leave it alone.
    setBoolean(SEED_FLAG, true);
    return;
  }

  const folderIdByName = new Map<string, number>();
  for (const folder of SEED_FOLDERS) {
    const created = await foldersRepository.create(folder);
    folderIdByName.set(folder.name, created.id);
  }

  for (const link of SEED_LINKS) {
    const tags = await tagsRepository.getOrCreateMany(link.tags ?? []);
    const host = extractHost(link.url);
    await linksRepository.create({
      url: link.url,
      title: link.title,
      description: link.description,
      siteName: link.siteName,
      favicon: host ? faviconUrlForHost(host) : null,
      favorite: link.favorite,
      readLater: link.readLater,
      pinned: link.pinned,
      folderIds: link.folder && folderIdByName.has(link.folder) ? [folderIdByName.get(link.folder)!] : [],
      tagIds: tags.map((t) => t.id),
    });
  }

  setBoolean(SEED_FLAG, true);
}
