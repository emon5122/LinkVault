/** Barrel for the service layer. Namespaced to keep call sites explicit and collision-free. */
export * as metadataService from './metadata';
export * as importExportService from './import-export';
export * as backupService from './backup';
export * as notificationService from './notifications';
export * as browserService from './browser';
export * as clipboardService from './clipboard';
export * as linkingService from './linking';
export * as fileService from './files';
export * as readabilityService from './readability';
export * as extractionService from './extraction';
export * as healthService from './health';
export * as shareFolderService from './share-folder';

export { storage, zustandStorage, getJSON, setJSON } from './storage';
export type { LinkMetadata } from './metadata';
export type { ImportFormat, ExportFormat, ImportResult, ParsedLink } from './import-export';
export type { BackupFile } from './backup';
export type { Article, ArticleBlock, ArticleBlockKind } from './readability';
export type { CheckResult, SweepResult } from './health';
export type { FolderBundle, QrPayloadResult } from './share-folder';
