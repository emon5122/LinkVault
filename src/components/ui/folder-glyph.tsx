import { createElement } from 'react';

import { getFolderIcon } from '@/constants/icons';

export interface FolderGlyphProps {
  name: string;
  size?: number;
  color: string;
}

/**
 * Renders a folder's icon by name. Using `createElement` with the registry lookup (rather than
 * `const Icon = getFolderIcon(); <Icon/>`) keeps the stable component reference out of JSX, which
 * the `react-hooks/static-components` lint would otherwise flag as a component created in render.
 */
export function FolderGlyph({ name, size = 22, color }: FolderGlyphProps) {
  return createElement(getFolderIcon(name), { size, color });
}
