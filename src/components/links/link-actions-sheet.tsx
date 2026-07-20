import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import {
  Archive,
  ArchiveRestore,
  CheckCheck,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Pencil,
  Pin,
  PinOff,
  Share2,
  Star,
  Trash2,
} from 'lucide-react-native';
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { ActionSheet, type ActionSheetItem } from '@/components/ui/action-sheet';
import { useDeleteLink, useMarkRead, useRecordOpen, useSetLinkFlag } from '@/hooks';
import { useTheme } from '@/providers/theme-provider';
import { browserService } from '@/services';
import { useSettingsStore } from '@/store';
import type { Link } from '@/types';
import { haptics } from '@/utils/haptics';

export interface LinkActionsSheetProps {
  link: Link | null;
}

/** Bottom-sheet action menu for a single link. Present it via the `useLinkActions` controller. */
export const LinkActionsSheet = forwardRef<BottomSheetModal, LinkActionsSheetProps>(
  function LinkActionsSheet({ link }, ref) {
    const router = useRouter();
    const { name } = useTheme();
    const openInApp = useSettingsStore((s) => s.openInApp);
    const confirmBeforeDelete = useSettingsStore((s) => s.confirmBeforeDelete);
    const setFlag = useSetLinkFlag();
    const recordOpen = useRecordOpen();
    const deleteLink = useDeleteLink();
    const markRead = useMarkRead();

    const confirmDelete = useCallback(
      (target: Link) => {
        if (!confirmBeforeDelete) {
          deleteLink.mutate(target.id);
          haptics.success();
          return;
        }
        Alert.alert('Delete link', `Remove “${target.title}”? This can’t be undone.`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteLink.mutate(target.id);
              haptics.success();
            },
          },
        ]);
      },
      [confirmBeforeDelete, deleteLink],
    );

    const items = useMemo<ActionSheetItem[]>(() => {
      if (!link) return [];
      const list: ActionSheetItem[] = [
        {
          key: 'open',
          label: openInApp ? 'Open' : 'Open in browser',
          icon: openInApp ? Globe : ExternalLink,
          onPress: () => {
            recordOpen.mutate(link.id);
            browserService.openLink(link.url, { inApp: openInApp, theme: name });
          },
        },
      ];
      if (openInApp) {
        list.push({
          key: 'openExternal',
          label: 'Open in browser',
          icon: ExternalLink,
          onPress: () => {
            recordOpen.mutate(link.id);
            browserService.openLink(link.url, { inApp: false });
          },
        });
      }
      list.push(
        {
          key: 'copy',
          label: 'Copy link',
          icon: Copy,
          onPress: () => {
            browserService.copyToClipboard(link.url);
            haptics.success();
          },
        },
        {
          key: 'share',
          label: 'Share',
          icon: Share2,
          onPress: () => browserService.shareUrl(link.url, link.title),
        },
        {
          key: 'favorite',
          label: link.favorite ? 'Remove favorite' : 'Add to favorites',
          icon: Star,
          onPress: () => setFlag.mutate({ id: link.id, flag: 'favorite', value: !link.favorite }),
        },
        {
          key: 'readLater',
          label: link.readLater ? 'Remove from Read Later' : 'Add to Read Later',
          icon: Clock,
          onPress: () => setFlag.mutate({ id: link.id, flag: 'readLater', value: !link.readLater }),
        },
        // "Mark as read" clears the Read Later flag and stamps readAt — only meaningful for queued items.
        ...(link.readLater
          ? [
              {
                key: 'markRead',
                label: 'Mark as read',
                icon: CheckCheck,
                onPress: () => {
                  markRead.mutate({ id: link.id });
                  haptics.success();
                },
              } satisfies ActionSheetItem,
            ]
          : []),
        {
          key: 'pin',
          label: link.pinned ? 'Unpin' : 'Pin to top',
          icon: link.pinned ? PinOff : Pin,
          onPress: () => setFlag.mutate({ id: link.id, flag: 'pinned', value: !link.pinned }),
        },
        {
          key: 'archive',
          label: link.archived ? 'Restore from archive' : 'Archive',
          icon: link.archived ? ArchiveRestore : Archive,
          onPress: () => setFlag.mutate({ id: link.id, flag: 'archived', value: !link.archived }),
        },
        {
          key: 'edit',
          label: 'Edit',
          icon: Pencil,
          onPress: () => router.push({ pathname: '/add', params: { id: String(link.id) } }),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: Trash2,
          destructive: true,
          onPress: () => confirmDelete(link),
        },
      );
      return list;
    }, [link, openInApp, name, recordOpen, setFlag, markRead, router, confirmDelete]);

    return <ActionSheet ref={ref} title={link?.title} items={items} />;
  },
);

/** Controller for the link actions sheet. Render `element` once and call `present(link)`. */
export function useLinkActions() {
  const ref = useRef<BottomSheetModal>(null);
  const [link, setLink] = useState<Link | null>(null);

  const present = useCallback((target: Link) => {
    setLink(target);
    requestAnimationFrame(() => ref.current?.present());
  }, []);

  const element = <LinkActionsSheet ref={ref} link={link} />;
  return { present, element };
}
