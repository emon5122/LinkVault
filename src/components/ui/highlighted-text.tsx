import { Text as RNText, type TextProps } from 'react-native';

import { cn } from '@/utils/cn';
import { highlightMatches } from '@/utils/highlight';

export interface HighlightedTextProps extends TextProps {
  text: string;
  query: string;
  className?: string;
}

/** Renders `text`, wrapping the parts matching `query` in an accent highlight. */
export function HighlightedText({ text, query, className, ...props }: HighlightedTextProps) {
  const segments = highlightMatches(text, query);
  return (
    <RNText className={cn('text-[15px] text-foreground', className)} {...props}>
      {segments.map((segment, index) =>
        segment.match ? (
          <RNText key={index} className="rounded bg-accent font-semibold text-accent-foreground">
            {segment.text}
          </RNText>
        ) : (
          segment.text
        ),
      )}
    </RNText>
  );
}
