import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, Eye, Pencil, Plus, RefreshCw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { LinkThumbnail } from '@/components/links';
import {
  Button,
  Chip,
  Header,
  Input,
  ListGroup,
  ListRow,
  Markdown,
  Screen,
  Switch,
  Text,
  TextArea,
} from '@/components/ui';
import { getFolderIcon } from '@/constants/icons';
import {
  useCreateLink,
  useCreateTag,
  useDuplicateCheck,
  useFolders,
  useLinkDetail,
  useMetadata,
  useTags,
  useUpdateLink,
} from '@/hooks';
import { useTheme } from '@/providers/theme-provider';
import type { LinkMetadata } from '@/services';
import { haptics } from '@/utils/haptics';
import { isValidUrl } from '@/utils/url';
import { linkFormSchema, type LinkFormValues } from '@/utils/validation';

export default function AddLinkScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string; url?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const isEdit = editId != null;

  const detail = useLinkDetail(editId);
  const folders = useFolders();
  const tags = useTags();
  const createLink = useCreateLink();
  const updateLink = useUpdateLink();
  const createTag = useCreateTag();

  const { control, handleSubmit, watch, setValue, reset, getValues } = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: {
      url: params.url ?? '',
      title: '',
      description: '',
      notes: '',
      favorite: false,
      readLater: false,
      archived: false,
      pinned: false,
      folderIds: [],
      tagIds: [],
    },
  });

  // Metadata that has no dedicated form field but is persisted with the link.
  const [meta, setMeta] = useState<Pick<LinkMetadata, 'image' | 'favicon' | 'siteName'>>({
    image: null,
    favicon: null,
    siteName: null,
  });
  const [newTag, setNewTag] = useState('');
  const [notesPreview, setNotesPreview] = useState(false);
  const appliedUrlRef = useRef<string | null>(null);

  const url = watch('url');
  const folderIds = watch('folderIds');
  const tagIds = watch('tagIds');
  const urlValid = isValidUrl(url);

  // Populate when editing.
  useEffect(() => {
    if (isEdit && detail.data) {
      const link = detail.data;
      reset({
        url: link.url,
        title: link.title,
        description: link.description ?? '',
        notes: link.notes ?? '',
        favorite: link.favorite,
        readLater: link.readLater,
        archived: link.archived,
        pinned: link.pinned,
        folderIds: link.folders.map((f) => f.id),
        tagIds: link.tags.map((t) => t.id),
      });
      setMeta({ image: link.image, favicon: link.favicon, siteName: link.siteName });
      appliedUrlRef.current = link.url;
    }
  }, [isEdit, detail.data, reset]);

  // Auto-fetch metadata for a new/changed URL.
  const shouldFetch = urlValid && (!isEdit || url !== detail.data?.url);
  const metadata = useMetadata(urlValid ? url : null, shouldFetch);

  useEffect(() => {
    if (!metadata.data || !urlValid) return;
    if (appliedUrlRef.current === url) return;
    appliedUrlRef.current = url;

    const data = metadata.data;
    setMeta({ image: data.image, favicon: data.favicon, siteName: data.siteName });
    if (!getValues('title') && data.title) setValue('title', data.title);
    if (!getValues('description') && data.description) setValue('description', data.description);
  }, [metadata.data, url, urlValid, getValues, setValue]);

  // Duplicate detection (skip the link currently being edited).
  const duplicate = useDuplicateCheck(url, urlValid && !isEdit);
  const isDuplicate = !!duplicate.data && (!isEdit || duplicate.data.id !== editId);

  const refetchMeta = () => {
    appliedUrlRef.current = null;
    metadata.refetch();
    haptics.light();
  };

  const toggleId = (field: 'folderIds' | 'tagIds', id: number) => {
    haptics.selection();
    const current = getValues(field);
    setValue(
      field,
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );
  };

  const addTag = () => {
    const value = newTag.trim();
    if (!value) return;
    createTag.mutate(value, {
      onSuccess: (tag) => {
        const current = getValues('tagIds');
        if (!current.includes(tag.id)) setValue('tagIds', [...current, tag.id]);
      },
    });
    setNewTag('');
  };

  const onSubmit = (values: LinkFormValues) => {
    const input = {
      url: values.url,
      title: values.title || undefined,
      description: values.description || null,
      notes: values.notes || null,
      image: meta.image,
      favicon: meta.favicon,
      siteName: meta.siteName,
      favorite: values.favorite,
      readLater: values.readLater,
      archived: values.archived,
      pinned: values.pinned,
      folderIds: values.folderIds,
      tagIds: values.tagIds,
    };
    haptics.success();
    if (isEdit && editId != null) {
      updateLink.mutate({ id: editId, input }, { onSuccess: () => router.back() });
    } else {
      createLink.mutate(input, { onSuccess: () => router.back() });
    }
  };

  const notes = watch('notes') ?? '';

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title={isEdit ? 'Edit Link' : 'Add Link'}
        showBack
        right={
          <Button
            title="Save"
            size="sm"
            disabled={!urlValid}
            loading={createLink.isPending || updateLink.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 48 }}
        >
          {/* URL */}
          <Controller
            control={control}
            name="url"
            render={({ field, fieldState }) => (
              <Input
                label="URL"
                placeholder="https://example.com"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                autoFocus={!isEdit && !params.url}
              />
            )}
          />

          {/* Duplicate warning */}
          {isDuplicate && duplicate.data ? (
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: '/link/[id]',
                  params: { id: String(duplicate.data!.id) },
                })
              }
              className="flex-row items-center gap-2 rounded-2xl border border-warning p-3"
              style={{ backgroundColor: `${colors.warning}1a` }}
            >
              <AlertTriangle size={18} color={colors.warning} />
              <Text variant="caption" className="flex-1 text-warning">
                You already saved this link. Tap to open it.
              </Text>
            </Pressable>
          ) : null}

          {/* Metadata preview */}
          {urlValid && (meta.image || meta.favicon || metadata.isFetching) ? (
            <View className="gap-2 rounded-2xl border border-border bg-card p-3">
              <View className="flex-row items-center justify-between">
                <Text variant="label">Preview</Text>
                <Pressable
                  onPress={refetchMeta}
                  hitSlop={8}
                  className="flex-row items-center gap-1"
                  accessibilityRole="button"
                  accessibilityLabel="Refresh preview"
                >
                  <RefreshCw size={14} color={colors.primary} />
                  <Text className="text-xs font-medium text-primary">Refresh</Text>
                </Pressable>
              </View>
              <LinkThumbnail variant="cover" image={meta.image} favicon={meta.favicon} />
              {meta.siteName ? <Text variant="caption">{meta.siteName}</Text> : null}
            </View>
          ) : null}

          {/* Title & description */}
          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <Input
                label="Title"
                placeholder="Link title"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                maxLength={300}
              />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Input
                label="Description"
                placeholder="Short description"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                multiline
              />
            )}
          />

          {/* Folders */}
          {folders.data && folders.data.length > 0 ? (
            <View className="gap-2">
              <Text variant="label">Folders</Text>
              <View className="flex-row flex-wrap gap-2">
                {folders.data.map((folder) => (
                  <Chip
                    key={folder.id}
                    label={folder.name}
                    icon={getFolderIcon(folder.icon)}
                    dotColor={folder.color}
                    selected={folderIds.includes(folder.id)}
                    onPress={() => toggleId('folderIds', folder.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Tags */}
          <View className="gap-2">
            <Text variant="label">Tags</Text>
            {tags.data && tags.data.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {tags.data.map((tag) => (
                  <Chip
                    key={tag.id}
                    label={`#${tag.name}`}
                    selected={tagIds.includes(tag.id)}
                    onPress={() => toggleId('tagIds', tag.id)}
                  />
                ))}
              </View>
            ) : null}
            <View className="flex-row items-center gap-2">
              <Input
                containerClassName="flex-1"
                placeholder="Add a tag"
                value={newTag}
                onChangeText={setNewTag}
                autoCapitalize="none"
                onSubmitEditing={addTag}
                returnKeyType="done"
                maxLength={40}
              />
              <Button icon={Plus} variant="secondary" onPress={addTag} accessibilityLabel="Add tag" />
            </View>
          </View>

          {/* Notes with markdown preview */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="label">Notes (Markdown)</Text>
              {notes.length > 0 ? (
                <Pressable
                  onPress={() => setNotesPreview((p) => !p)}
                  hitSlop={8}
                  className="flex-row items-center gap-1"
                  accessibilityRole="button"
                  accessibilityLabel={notesPreview ? 'Edit notes' : 'Preview notes'}
                >
                  {notesPreview ? (
                    <Pencil size={14} color={colors.primary} />
                  ) : (
                    <Eye size={14} color={colors.primary} />
                  )}
                  <Text className="text-xs font-medium text-primary">
                    {notesPreview ? 'Edit' : 'Preview'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {notesPreview ? (
              <View className="min-h-[120px] rounded-2xl border border-border bg-card p-3">
                <Markdown content={notes} />
              </View>
            ) : (
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <TextArea
                    placeholder="Write notes… **bold**, *italic*, - lists, [links](url)"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            )}
          </View>

          {/* Flags */}
          <ListGroup>
            <FlagRow label="Favorite" value={watch('favorite')} onChange={(v) => setValue('favorite', v)} />
            <FlagRow label="Read Later" value={watch('readLater')} onChange={(v) => setValue('readLater', v)} />
            <FlagRow label="Pin to top" value={watch('pinned')} onChange={(v) => setValue('pinned', v)} />
            {isEdit ? (
              <FlagRow label="Archived" value={watch('archived')} onChange={(v) => setValue('archived', v)} />
            ) : null}
          </ListGroup>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function FlagRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <ListRow
      title={label}
      showChevron={false}
      right={<Switch value={value} onValueChange={onChange} />}
    />
  );
}
