/**
 * Registry mapping folder icon *names* (persisted as strings in SQLite) to Lucide components.
 * Keeping this centralized means the database only ever stores a stable string key.
 */
import {
  Archive,
  Bookmark,
  Briefcase,
  Clapperboard,
  Code,
  Coffee,
  Compass,
  CookingPot,
  Dumbbell,
  Film,
  Folder,
  GraduationCap,
  Heart,
  Home,
  Image,
  Lightbulb,
  ListTodo,
  Music,
  Newspaper,
  Palette,
  Plane,
  Rocket,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';

export const FolderIcons = {
  folder: Folder,
  bookmark: Bookmark,
  star: Star,
  heart: Heart,
  briefcase: Briefcase,
  code: Code,
  palette: Palette,
  music: Music,
  film: Film,
  clapperboard: Clapperboard,
  image: Image,
  newspaper: Newspaper,
  'graduation-cap': GraduationCap,
  lightbulb: Lightbulb,
  rocket: Rocket,
  compass: Compass,
  plane: Plane,
  home: Home,
  coffee: Coffee,
  'cooking-pot': CookingPot,
  dumbbell: Dumbbell,
  'shopping-bag': ShoppingBag,
  wrench: Wrench,
  'list-todo': ListTodo,
  sparkles: Sparkles,
  archive: Archive,
  tag: Tag,
} satisfies Record<string, LucideIcon>;

export type FolderIconName = keyof typeof FolderIcons;

export const FolderIconNames = Object.keys(FolderIcons) as FolderIconName[];

export function getFolderIcon(name: string | null | undefined): LucideIcon {
  if (name && name in FolderIcons) {
    return FolderIcons[name as FolderIconName];
  }
  return Folder;
}
