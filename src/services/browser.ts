/** Opening, sharing, and copying links. */
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, Share } from 'react-native';

import { Palette } from '@/constants/theme';
import type { ThemeName } from '@/constants/theme';
import { ensureProtocol } from '@/utils/url';

/** Open a URL in the in-app browser or hand off to the system default browser. */
export async function openLink(
  url: string,
  options?: { inApp?: boolean; theme?: ThemeName },
): Promise<void> {
  // Users frequently save bare hosts like "google.com" or "www.google.com". Both WebBrowser and
  // Linking require an explicit scheme, so upgrade to https:// before handing the URL off — this
  // also repairs links already stored without a scheme.
  const target = ensureProtocol(url);
  const inApp = options?.inApp ?? true;
  try {
    if (inApp) {
      const colors = Palette[options?.theme ?? 'light'];
      await WebBrowser.openBrowserAsync(target, {
        controlsColor: colors.primary,
        toolbarColor: colors.background,
        enableBarCollapsing: true,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
      });
    } else {
      await Linking.openURL(target);
    }
  } catch {
    // No call site catches this; surface the failure instead of letting the tap appear inert.
    Alert.alert("Couldn't open link", `This link can't be opened:\n${target}`);
  }
}

/** Share a link's URL (and title) through the OS share sheet as text. */
export async function shareUrl(url: string, title?: string): Promise<void> {
  await Share.share({ message: title ? `${title}\n${url}` : url, url, title });
}

export async function copyToClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
