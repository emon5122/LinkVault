import { useRouter } from 'expo-router';
import { Compass } from 'lucide-react-native';

import { Button, EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen className="items-center justify-center">
      <EmptyState
        icon={Compass}
        title="Page not found"
        message="This screen doesn’t exist."
        actionLabel="Go home"
        onAction={() => router.replace('/')}
      />
      <Button title="Go back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
