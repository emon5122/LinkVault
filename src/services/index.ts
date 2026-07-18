/** Barrel for the service layer. Namespaced to keep call sites explicit and collision-free. */
export * as metadataService from './metadata';
export * as importExportService from './import-export';
export * as backupService from './backup';
export * as notificationService from './notifications';
export * as browserService from './browser';
export * as clipboardService from './clipboard';
export * as linkingService from './linking';
export * as fileService from './files';

export { storage, zustandStorage, getJSON, setJSON } from './storage';
export type { LinkMetadata } from './metadata';
export type { ImportFormat, ExportFormat, ImportResult, ParsedLink } from './import-export';
export type { BackupFile } from './backup';
