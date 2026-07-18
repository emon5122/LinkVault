import { Fragment } from 'react';
import { Text as RNText, View } from 'react-native';

import { cn } from '@/utils/cn';
import { parseMarkdown, type InlineNode, type MarkdownBlock } from '@/utils/markdown';

import { Divider } from './divider';

export interface MarkdownProps {
  content: string;
  onLinkPress?: (href: string) => void;
  className?: string;
}

function renderInline(nodes: InlineNode[], onLinkPress?: (href: string) => void): React.ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return <Fragment key={index}>{node.value}</Fragment>;
      case 'bold':
        return (
          <RNText key={index} className="font-bold text-foreground">
            {renderInline(node.children, onLinkPress)}
          </RNText>
        );
      case 'italic':
        return (
          <RNText key={index} className="italic">
            {renderInline(node.children, onLinkPress)}
          </RNText>
        );
      case 'strike':
        return (
          <RNText key={index} className="line-through">
            {renderInline(node.children, onLinkPress)}
          </RNText>
        );
      case 'code':
        return (
          <RNText key={index} className="rounded bg-muted font-mono text-[13px] text-foreground">
            {` ${node.value} `}
          </RNText>
        );
      case 'link':
        return (
          <RNText
            key={index}
            className="text-primary underline"
            onPress={() => onLinkPress?.(node.href)}
          >
            {node.label}
          </RNText>
        );
    }
  });
}

function Block({ block, onLinkPress }: { block: MarkdownBlock; onLinkPress?: (href: string) => void }) {
  switch (block.type) {
    case 'heading': {
      const size = block.level === 1 ? 'text-2xl' : block.level === 2 ? 'text-xl' : 'text-lg';
      return (
        <RNText className={cn('mb-1 mt-3 font-bold text-foreground', size)}>
          {renderInline(block.children, onLinkPress)}
        </RNText>
      );
    }
    case 'paragraph':
      return (
        <RNText className="mb-2 text-[15px] leading-6 text-foreground">
          {renderInline(block.children, onLinkPress)}
        </RNText>
      );
    case 'code':
      return (
        <View className="mb-2 rounded-xl bg-muted p-3">
          <RNText className="font-mono text-[13px] leading-5 text-foreground">{block.value}</RNText>
        </View>
      );
    case 'quote':
      return (
        <View className="mb-2 border-l-2 border-primary pl-3">
          <RNText className="text-[15px] italic leading-6 text-muted-foreground">
            {renderInline(block.children, onLinkPress)}
          </RNText>
        </View>
      );
    case 'list':
      return (
        <View className="mb-2 gap-1">
          {block.items.map((item, index) => (
            <View key={index} className="flex-row gap-2">
              <RNText className="text-[15px] leading-6 text-muted-foreground">
                {block.ordered ? `${index + 1}.` : '•'}
              </RNText>
              <RNText className="flex-1 text-[15px] leading-6 text-foreground">
                {renderInline(item, onLinkPress)}
              </RNText>
            </View>
          ))}
        </View>
      );
    case 'hr':
      return <Divider className="my-3" />;
  }
}

/** Renders a Markdown string using React Native primitives (no HTML, safe by construction). */
export function Markdown({ content, onLinkPress, className }: MarkdownProps) {
  const blocks = parseMarkdown(content);
  return (
    <View className={className}>
      {blocks.map((block, index) => (
        <Block key={index} block={block} onLinkPress={onLinkPress} />
      ))}
    </View>
  );
}
