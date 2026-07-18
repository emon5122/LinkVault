/** Barrel for the database layer. */
export { getDatabase, initDatabase, resetDatabaseContents } from './client';
export { LATEST_SCHEMA_VERSION, runMigrations } from './migrations';
export { linksRepository } from './repositories/links';
export { foldersRepository } from './repositories/folders';
export { tagsRepository } from './repositories/tags';
export { statsRepository, type LibraryStats } from './repositories/stats';
export {
  relationsRepository,
  type LinkTagRow,
  type FolderLinkRow,
} from './repositories/relations';
export {
  buildLinkListQuery,
  buildLinkCountQuery,
  escapeLike,
  searchTerms,
  type BuiltQuery,
  type SqlArg,
} from './queries';
