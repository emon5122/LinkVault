import { useRouter } from 'expo-router';
import { SearchX, TextSearch } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ClipboardBanner, LinkList, useLinkActions } from '@/components/links';
import { EmptyState, Header, Screen, SearchBar, Text } from '@/components/ui';
import { SEARCH_DEBOUNCE_MS } from '@/constants/config';
import { useDebounce, useSearchLinks, useSetLinkFlag } from '@/hooks';
import type { Link } from '@/types';
import { pluralize } from '@/utils/format';

export default function SearchScreen() {
  const router = useRouter();
  const actions = useLinkActions();
  const setFlag = useSetLinkFlag();

  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const results = useSearchLinks(debounced);

  const links = useMemo<Link[]>(() => (results.data ?? []).map((r) => r.link), [results.data]);
  const trimmed = debounced.trim();

  const openLink = (link: Link) =>
    router.push({ pathname: '/link/[id]', params: { id: String(link.id) } });

  return (
    <Screen>
      <Header title="Search" large />
      <View className="px-4 pb-2">
        <SearchBar value={query} onChangeText={setQuery} placeholder="Title, URL, notes, tag…" />
        {trimmed.length > 0 && results.data ? (
          <Text variant="caption" className="mt-2 px-1">
            {pluralize(links.length, 'result')}
          </Text>
        ) : null}
      </View>

      {trimmed.length === 0 ? (
        <EmptyState
          icon={TextSearch}
          title="Search your vault"
          message="Find links by title, URL, description, notes, folder, tag, or site."
        />
      ) : (
        <LinkList
          links={links}
          query={trimmed}
          isLoading={results.isFetching && links.length === 0}
          onPressLink={openLink}
          onLongPressLink={actions.present}
          onToggleFavorite={(link) =>
            setFlag.mutate({ id: link.id, flag: 'favorite', value: !link.favorite })
          }
          ListEmptyComponent={
            !results.isFetching ? (
              <EmptyState
                icon={SearchX}
                title="No results"
                message={`Nothing matched “${trimmed}”.`}
              />
            ) : null
          }
        />
      )}

      <ClipboardBanner bottomOffset={16} />
      {actions.element}
    </Screen>
  );
}
