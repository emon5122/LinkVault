import { Search, X } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/utils/cn';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  className?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  autoFocus,
  onSubmitEditing,
  className,
}: SearchBarProps) {
  const { colors } = useTheme();
  return (
    <View
      className={cn(
        'h-12 flex-row items-center gap-2 rounded-2xl border border-border bg-secondary px-3.5',
        className,
      )}
    >
      <Search size={19} color={colors.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.primary}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        className="flex-1 text-[15px] text-foreground"
        accessibilityLabel="Search"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <X size={18} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}
