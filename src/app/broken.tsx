import { Unlink } from 'lucide-react-native';

import { LinkCollectionScreen } from '@/features/links/collection-screen';

export default function BrokenLinksScreen() {
  return (
    // Titled "Needs attention" rather than "Broken": this scope also holds links the checker could
    // not verify (blocked request, offline). Calling those broken would contradict the deliberate
    // caution in the classifier, which keeps them out of `broken` precisely to avoid false alarms.
    <LinkCollectionScreen
      scope={{ type: 'broken' }}
      title="Needs attention"
      subtitle="Broken or unverified at the last check"
      emptyIcon={Unlink}
      emptyTitle="Everything checks out"
      emptyMessage="Every link checked so far still resolves. Run a check from Settings to scan more."
    />
  );
}
