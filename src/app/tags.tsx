import { useRouter } from 'expo-router';
import { Check, Pencil, Plus, Tag as TagIcon, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import {
  Button,
  EmptyState,
  Header,
  IconButton,
  Input,
  ListGroup,
  ListRow,
  Screen,
} from '@/components/ui';
import { useCreateTag, useDeleteTag, useRenameTag, useTagsWithCounts } from '@/hooks';
import { haptics } from '@/utils/haptics';
import { pluralize } from '@/utils/format';

export default function TagsScreen() {
  const router = useRouter();
  const tags = useTagsWithCounts();
  const createTag = useCreateTag();
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();

  const [newTag, setNewTag] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleCreate = () => {
    const value = newTag.trim();
    if (!value) return;
    createTag.mutate(value);
    setNewTag('');
    haptics.success();
  };

  const startEdit = (id: number, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const commitEdit = () => {
    if (editingId != null && editValue.trim()) {
      renameTag.mutate({ id: editingId, name: editValue.trim() });
      haptics.success();
    }
    setEditingId(null);
  };

  const confirmDelete = (id: number, name: string) => {
    Alert.alert('Delete tag', `Delete “#${name}”? The links are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTag.mutate(id);
          haptics.success();
        },
      },
    ]);
  };

  const list = tags.data ?? [];

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Tags" showBack />

      <View className="flex-row items-end gap-2 px-4 pb-3">
        <Input
          containerClassName="flex-1"
          placeholder="New tag"
          value={newTag}
          onChangeText={setNewTag}
          autoCapitalize="none"
          onSubmitEditing={handleCreate}
          returnKeyType="done"
          maxLength={40}
        />
        <Button icon={Plus} title="Add" onPress={handleCreate} />
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon={TagIcon}
          title="No tags yet"
          message="Create a tag above, or add tags when saving a link."
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
          <ListGroup>
            {list.map((tag) =>
              editingId === tag.id ? (
                <View key={tag.id} className="flex-row items-center gap-2 p-2 pl-4">
                  <Input
                    containerClassName="flex-1"
                    value={editValue}
                    onChangeText={setEditValue}
                    autoFocus
                    autoCapitalize="none"
                    onSubmitEditing={commitEdit}
                    maxLength={40}
                  />
                  <IconButton icon={Check} accessibilityLabel="Save" onPress={commitEdit} />
                  <IconButton
                    icon={X}
                    accessibilityLabel="Cancel"
                    onPress={() => setEditingId(null)}
                  />
                </View>
              ) : (
                <ListRow
                  key={tag.id}
                  icon={TagIcon}
                  title={`#${tag.name}`}
                  subtitle={pluralize(tag.linkCount, 'link')}
                  showChevron={false}
                  onPress={() =>
                    router.push({ pathname: '/tag/[id]', params: { id: String(tag.id) } })
                  }
                  right={
                    <View className="flex-row">
                      <IconButton
                        icon={Pencil}
                        size={18}
                        accessibilityLabel={`Rename ${tag.name}`}
                        onPress={() => startEdit(tag.id, tag.name)}
                      />
                      <IconButton
                        icon={Trash2}
                        size={18}
                        accessibilityLabel={`Delete ${tag.name}`}
                        onPress={() => confirmDelete(tag.id, tag.name)}
                      />
                    </View>
                  }
                />
              ),
            )}
          </ListGroup>
        </ScrollView>
      )}
    </Screen>
  );
}
