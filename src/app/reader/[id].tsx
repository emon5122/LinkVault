/**
 * Offline reader.
 *
 * Renders the article body extracted at save time using React Native primitives — no WebView. That
 * is what makes highlighting possible: `<Text selectable>` never reports a selection range back to
 * JS, so instead each block is pre-split into sentences (see `utils/text`) and every sentence is its
 * own tappable span. Tapping one in highlight mode stores a highlight anchored by block index and
 * character offsets, which survives re-rendering because extraction is deterministic.
 */
import { useLocalSearchParams } from 'expo-router';
import {
  BookOpenText,
  Highlighter,
  Minus,
  Plus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text as RNText, View } from 'react-native';

import { Button, EmptyState, Header, IconButton, Screen, Text } from '@/components/ui';
import { useCreateHighlight, useDeleteHighlight, useHighlights, useLinkDetail } from '@/hooks';
import { useExtractArticle } from '@/hooks/use-health';
import { useTheme } from '@/providers/theme-provider';
import { browserService, readabilityService } from '@/services';
import { READER_FONT_SCALES, useSettingsStore, type ReaderFontScale } from '@/store';
import type { Highlight } from '@/types';
import { splitSentences } from '@/utils/text';
import { haptics } from '@/utils/haptics';
import { cn } from '@/utils/cn';

/** Translucent backgrounds so highlighted text stays legible in both themes. */
const HIGHLIGHT_TINTS: Record<string, string> = {
  yellow: 'rgba(250, 204, 21, 0.38)',
  green: 'rgba(34, 197, 94, 0.30)',
  blue: 'rgba(59, 130, 246, 0.30)',
  pink: 'rgba(236, 72, 153, 0.30)',
};

function tintFor(color: string): string {
  return HIGHLIGHT_TINTS[color] ?? HIGHLIGHT_TINTS.yellow;
}

interface BlockProps {
  index: number;
  kind: readabilityService.ArticleBlockKind;
  text: string;
  scale: number;
  highlights: Highlight[];
  highlightMode: boolean;
  onToggle: (blockIndex: number, start: number, end: number, text: string) => void;
}

function ArticleBlockView({
  index,
  kind,
  text,
  scale,
  highlights,
  highlightMode,
  onToggle,
}: BlockProps) {
  const sentences = useMemo(() => splitSentences(text), [text]);

  const body = Math.round(17 * scale);
  const lineHeight = Math.round(body * 1.65);

  const spans = sentences.map((sentence, i) => {
    const active = highlights.find(
      (h) => h.startOffset === sentence.start && h.endOffset === sentence.end,
    );
    return (
      <RNText
        key={i}
        onPress={
          highlightMode
            ? () => onToggle(index, sentence.start, sentence.end, sentence.text)
            : undefined
        }
        onLongPress={() => onToggle(index, sentence.start, sentence.end, sentence.text)}
        style={active ? { backgroundColor: tintFor(active.color) } : undefined}
      >
        {i > 0 ? ' ' : ''}
        {sentence.text}
      </RNText>
    );
  });

  switch (kind) {
    case 'heading':
      return (
        <RNText
          className="mb-2 mt-5 font-bold text-foreground"
          style={{ fontSize: Math.round(body * 1.5), lineHeight: Math.round(body * 1.9) }}
        >
          {spans}
        </RNText>
      );
    case 'subheading':
      return (
        <RNText
          className="mb-1.5 mt-4 font-semibold text-foreground"
          style={{ fontSize: Math.round(body * 1.2), lineHeight: Math.round(body * 1.6) }}
        >
          {spans}
        </RNText>
      );
    case 'listItem':
      return (
        <View className="mb-1.5 flex-row gap-2 pl-1">
          <RNText className="text-muted-foreground" style={{ fontSize: body, lineHeight }}>
            •
          </RNText>
          <RNText className="flex-1 text-foreground" style={{ fontSize: body, lineHeight }}>
            {spans}
          </RNText>
        </View>
      );
    case 'quote':
      return (
        <View className="mb-3 border-l-2 border-primary pl-3">
          <RNText
            className="italic text-muted-foreground"
            style={{ fontSize: body, lineHeight }}
          >
            {spans}
          </RNText>
        </View>
      );
    case 'code':
      return (
        <View className="mb-1 rounded-lg bg-muted px-3 py-2">
          <RNText
            className="font-mono text-foreground"
            style={{ fontSize: Math.round(body * 0.82) }}
          >
            {text}
          </RNText>
        </View>
      );
    case 'paragraph':
    default:
      return (
        <RNText className="mb-3 text-foreground" style={{ fontSize: body, lineHeight }}>
          {spans}
        </RNText>
      );
  }
}

export default function ReaderScreen() {
  const { colors, name } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const linkId = Number(id);

  const detail = useLinkDetail(linkId);
  const highlightsQuery = useHighlights(linkId);
  const createHighlight = useCreateHighlight();
  const deleteHighlight = useDeleteHighlight();
  const extract = useExtractArticle();

  const fontScale = useSettingsStore((s) => s.readerFontScale);
  const setFontScale = useSettingsStore((s) => s.setReaderFontScale);
  const highlightColor = useSettingsStore((s) => s.highlightColor);
  const openInApp = useSettingsStore((s) => s.openInApp);

  const [highlightMode, setHighlightMode] = useState(false);

  const link = detail.data;
  const blocks = useMemo(() => readabilityService.parseArticle(link?.content), [link?.content]);

  const highlights = useMemo(() => highlightsQuery.data ?? [], [highlightsQuery.data]);

  const highlightsByBlock = useMemo(() => {
    const map = new Map<number, Highlight[]>();
    for (const h of highlights) {
      const list = map.get(h.blockIndex) ?? [];
      list.push(h);
      map.set(h.blockIndex, list);
    }
    return map;
  }, [highlights]);

  const toggleHighlight = (
    blockIndex: number,
    startOffset: number,
    endOffset: number,
    text: string,
  ) => {
    const existing = highlightsByBlock
      .get(blockIndex)
      ?.find((h) => h.startOffset === startOffset && h.endOffset === endOffset);

    haptics.light();
    if (existing) {
      deleteHighlight.mutate(existing.id);
    } else {
      createHighlight.mutate({
        linkId,
        text,
        blockIndex,
        startOffset,
        endOffset,
        color: highlightColor,
      });
    }
  };

  const stepFont = (direction: 1 | -1) => {
    const current = READER_FONT_SCALES.indexOf(fontScale);
    const next = Math.min(READER_FONT_SCALES.length - 1, Math.max(0, current + direction));
    setFontScale(READER_FONT_SCALES[next] as ReaderFontScale);
  };

  if (detail.isLoading) {
    return (
      <Screen>
        <Header showBack title="Reader" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.mutedForeground} />
        </View>
      </Screen>
    );
  }

  if (!link) {
    return (
      <Screen>
        <Header showBack title="Reader" />
        <EmptyState icon={BookOpenText} title="Link not found" message="It may have been deleted." />
      </Screen>
    );
  }

  // Nothing extracted yet — offer to fetch it rather than showing a dead end.
  if (blocks.length === 0) {
    return (
      <Screen>
        <Header showBack title="Reader" subtitle={link.title} />
        <View className="flex-1 justify-center gap-4 p-6">
          <EmptyState
            icon={BookOpenText}
            title={link.extractedAt ? 'No readable text' : 'Not saved for offline reading'}
            message={
              link.extractedAt
                ? "This page didn't yield an article — it may be a video, an app, or behind a login."
                : 'Fetch the article text so you can read it offline and search inside it.'
            }
          />
          <View className="gap-2">
            <Button
              title={extract.isPending ? 'Fetching…' : 'Fetch article text'}
              icon={RefreshCw}
              loading={extract.isPending}
              onPress={() => extract.mutate(linkId)}
            />
            <Button
              title="Open original"
              variant="ghost"
              icon={ExternalLink}
              onPress={() => browserService.openLink(link.url, { inApp: openInApp, theme: name })}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const minutes = readabilityService.readingMinutes(link.wordCount);

  return (
    <Screen>
      <Header
        showBack
        title={link.siteName || link.host || 'Reader'}
        subtitle={
          [minutes ? `${minutes} min read` : null, highlights.length ? `${highlights.length} highlighted` : null]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        right={
          <>
            <IconButton
              icon={Minus}
              accessibilityLabel="Smaller text"
              onPress={() => stepFont(-1)}
            />
            <IconButton icon={Plus} accessibilityLabel="Larger text" onPress={() => stepFont(1)} />
            <IconButton
              icon={Highlighter}
              accessibilityLabel={highlightMode ? 'Exit highlight mode' : 'Highlight mode'}
              onPress={() => {
                haptics.light();
                setHighlightMode((v) => !v);
              }}
              className={cn(highlightMode && 'bg-primary/15')}
            />
          </>
        }
      />

      {highlightMode ? (
        <View className="bg-primary/10 px-4 py-1.5">
          <Text variant="caption" className="text-center text-primary">
            Tap a sentence to highlight it
          </Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 56 }}
      >
        <Text variant="title" className="mb-1 text-2xl">
          {link.title}
        </Text>
        {link.byline ? (
          <Text variant="caption" className="mb-4">
            {link.byline}
          </Text>
        ) : (
          <View className="mb-4" />
        )}

        {blocks.map((block, index) => (
          <ArticleBlockView
            key={index}
            index={index}
            kind={block.kind}
            text={block.text}
            scale={fontScale}
            highlights={highlightsByBlock.get(index) ?? []}
            highlightMode={highlightMode}
            onToggle={toggleHighlight}
          />
        ))}

        <View className="mt-6 gap-2">
          <Button
            title="Open original"
            variant="secondary"
            icon={ExternalLink}
            onPress={() => browserService.openLink(link.url, { inApp: openInApp, theme: name })}
          />
          <Button
            title="Re-fetch article"
            variant="ghost"
            icon={RefreshCw}
            loading={extract.isPending}
            onPress={() => extract.mutate(linkId)}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
