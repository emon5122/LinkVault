import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, FolderGlyph, Header, Input, Screen, Text } from '@/components/ui';
import { FolderIconNames } from '@/constants/icons';
import { DEFAULT_FOLDER_COLOR, DEFAULT_FOLDER_ICON } from '@/constants/config';
import { FolderColors } from '@/constants/theme';
import { useCreateFolder, useFolder, useUpdateFolder } from '@/hooks';
import { useTheme } from '@/providers/theme-provider';
import { folderFormSchema, type FolderFormValues } from '@/utils/validation';
import { haptics } from '@/utils/haptics';

export default function FolderEditScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const folderId = id ? Number(id) : null;
  const isEdit = folderId != null;

  const existing = useFolder(folderId);
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();

  const { control, handleSubmit, setValue, watch, reset, formState } = useForm<FolderFormValues>({
    resolver: zodResolver(folderFormSchema),
    defaultValues: { name: '', icon: DEFAULT_FOLDER_ICON, color: DEFAULT_FOLDER_COLOR },
  });

  const icon = watch('icon');
  const color = watch('color');
  const name = watch('name');

  // Populate the form when editing an existing folder.
  useEffect(() => {
    if (isEdit && existing.data) {
      reset({ name: existing.data.name, icon: existing.data.icon, color: existing.data.color });
    }
  }, [isEdit, existing.data, reset]);

  const onSubmit = (values: FolderFormValues) => {
    haptics.success();
    if (isEdit && folderId != null) {
      updateFolder.mutate({ id: folderId, input: values }, { onSuccess: () => router.back() });
    } else {
      createFolder.mutate(values, { onSuccess: () => router.back() });
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title={isEdit ? 'Edit Folder' : 'New Folder'}
        showBack
        right={
          <Button
            title="Save"
            size="sm"
            loading={createFolder.isPending || updateFolder.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 20 }}>
        {/* Preview */}
        <View className="items-center gap-2 py-2">
          <View
            className="h-20 w-20 items-center justify-center rounded-3xl"
            style={{ backgroundColor: `${color}22` }}
          >
            <FolderGlyph name={icon} size={36} color={color} />
          </View>
          <Text variant="subtitle">{name || 'Folder name'}</Text>
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              label="Name"
              placeholder="e.g. Reading List"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoFocus={!isEdit}
              maxLength={60}
            />
          )}
        />

        {/* Color picker */}
        <View className="gap-2">
          <Text variant="label">Color</Text>
          <View className="flex-row flex-wrap gap-3">
            {FolderColors.map((swatch) => (
              <Pressable
                key={swatch}
                onPress={() => {
                  haptics.selection();
                  setValue('color', swatch, { shouldValidate: true });
                }}
                accessibilityRole="button"
                accessibilityLabel={`Color ${swatch}`}
                accessibilityState={{ selected: color === swatch }}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: swatch }}
              >
                {color === swatch ? <Check size={18} color="#ffffff" /> : null}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Icon picker */}
        <View className="gap-2">
          <Text variant="label">Icon</Text>
          <View className="flex-row flex-wrap gap-3">
            {FolderIconNames.map((iconName) => {
              const selected = icon === iconName;
              return (
                <Pressable
                  key={iconName}
                  onPress={() => {
                    haptics.selection();
                    setValue('icon', iconName, { shouldValidate: true });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Icon ${iconName}`}
                  accessibilityState={{ selected }}
                  className="h-12 w-12 items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: selected ? color : colors.border,
                    backgroundColor: selected ? `${color}22` : colors.card,
                  }}
                >
                  <FolderGlyph
                    name={iconName}
                    size={22}
                    color={selected ? color : colors.mutedForeground}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {formState.errors.color ? (
          <Text className="text-xs text-destructive">{formState.errors.color.message}</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
