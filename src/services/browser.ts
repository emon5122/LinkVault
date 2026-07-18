/** Opening, sharing, and copying links. */
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Share } from 'react-native';

import { Palette } from '@/constants/theme';
import type { ThemeName } from '@/constants/theme';

/** Open a URL in the in-app browser or hand off to the system default browser. */
export async function openLink(
  url: string,
  options?: { inApp?: boolean; theme?: ThemeName },
): Promise<void> {
  const inApp = options?.inApp ?? true;
  if (inApp) {
    const colors = Palette[options?.theme ?? 'light'];
    await WebBrowser.openBrowserAsync(url, {
      controlsColor: colors.primary,
      toolbarColor: colors.background,
      enableBarCollapsing: true,
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
    });
  } else {
    await Linking.openURL(url);
  }
}

/** Share a link's URL (and title) through the OS share sheet as text. */
export async function shareUrl(url: string, title?: string): Promise<void> {
  await Share.share({ message: title ? `${title}\n${url}` : url, url, title });
}

export async function copyToClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
