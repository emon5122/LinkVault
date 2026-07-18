/** Aggregate counts shown on the Settings/About screen and used to gate empty states. */
import { getDatabase } from '../client';

export interface LibraryStats {
  totalLinks: number;
  favorites: number;
  readLater: number;
  archived: number;
  pinned: number;
  folders: number;
  tags: number;
}

async function getOverview(): Promise<LibraryStats> {
  const db = getDatabase();
  const row = await db.getFirstAsync<LibraryStats>(
    `SELECT
       (SELECT COUNT(*) FROM links WHERE archived = 0) AS totalLinks,
       (SELECT COUNT(*) FROM links WHERE favorite = 1 AND archived = 0) AS favorites,
       (SELECT COUNT(*) FROM links WHERE readLater = 1 AND archived = 0) AS readLater,
       (SELECT COUNT(*) FROM links WHERE archived = 1) AS archived,
       (SELECT COUNT(*) FROM links WHERE pinned = 1 AND archived = 0) AS pinned,
       (SELECT COUNT(*) FROM folders) AS folders,
       (SELECT COUNT(*) FROM tags) AS tags`,
  );
  return (
    row ?? {
      totalLinks: 0,
      favorites: 0,
      readLater: 0,
      archived: 0,
      pinned: 0,
      folders: 0,
      tags: 0,
    }
  );
}

export const statsRepository = { getOverview };
