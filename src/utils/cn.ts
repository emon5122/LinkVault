import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine conditional class names and de-duplicate conflicting Tailwind utilities.
 * NativeWind reads the resulting `className` string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
