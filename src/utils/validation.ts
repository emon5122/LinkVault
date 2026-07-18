/**
 * Zod schemas and input sanitizers shared by React Hook Form and the import pipeline.
 * URL validity is delegated to `utils/url` so there is a single source of truth.
 */
import { z } from 'zod';

import { isValidUrl } from './url';

/** Remove control characters and collapse excessive whitespace while preserving newlines. */
export function sanitizeText(input: string): string {
  return (
    input
      // Strip C0/C1 control characters except tab (\x09) and newline (\x0A).
      .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/** Single-line variant for titles/names — also strips newlines. */
export function sanitizeLine(input: string): string {
  return sanitizeText(input)
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

export const urlSchema = z
  .string()
  .trim()
  .min(1, 'Enter a URL')
  .refine(isValidUrl, 'Enter a valid http(s) URL');

export const linkFormSchema = z.object({
  url: urlSchema,
  title: z.string().trim().max(300, 'Title is too long').optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  notes: z.string().max(20000).optional().or(z.literal('')),
  // Booleans/arrays are required in the form model; `useForm` supplies their defaults. Avoiding
  // `.default()` keeps the schema's input and output types identical, which React Hook Form needs.
  favorite: z.boolean(),
  readLater: z.boolean(),
  archived: z.boolean(),
  pinned: z.boolean(),
  folderIds: z.array(z.number().int().positive()),
  tagIds: z.array(z.number().int().positive()),
});

export type LinkFormValues = z.infer<typeof linkFormSchema>;

export const folderFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter a folder name').max(60, 'Folder name is too long'),
  icon: z.string().min(1),
  color: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Pick a color'),
});

export type FolderFormValues = z.infer<typeof folderFormSchema>;

export const tagNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a tag name')
  .max(40, 'Tag name is too long')
  // Normalize tag names to a lower-cased, single-spaced form so `React` and `react` don't diverge.
  .transform((v) => v.toLowerCase().replace(/\s+/g, ' '));

export type TagName = z.infer<typeof tagNameSchema>;
