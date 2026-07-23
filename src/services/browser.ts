/** Opening, sharing, and copying links. */
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, Platform, Share } from 'react-native';

import { browserDisplayName } from '@/constants/browsers';
import { Palette } from '@/constants/theme';
import type { ThemeName } from '@/constants/theme';
import { useSettingsStore } from '@/store/settings';
import { ensureProtocol, tryParseUrl } from '@/utils/url';

export interface BrowserChoice {
  packageName: string;
  label: string;
  /** True for the browser Android would have used anyway. */
  isSystemDefault: boolean;
}

/**
 * Browsers on this device that can render a Custom Tab.
 *
 * Android only — iOS routes every in-app browser through SFSafariViewController and offers no way
 * to substitute another engine, so the picker has nothing to show there.
 */
export async function listBrowsers(): Promise<BrowserChoice[]> {
  if (Platform.OS !== 'android') return [];
  try {
    const result = await WebBrowser.getCustomTabsSupportingBrowsersAsync();
    return (result.browserPackages ?? [])
      .map((packageName) => ({
        packageName,
        label: browserDisplayName(packageName),
        isSystemDefault: packageName === result.defaultBrowserPackage,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    // Package detection is documented as unreliable on some devices; an empty list just means the
    // picker offers "System default" only, which is the pre-existing behavior.
    return [];
  }
}

/**
 * Build an Android intent URI targeting a specific package.
 *
 * `Linking.openURL` cannot name an app, but Android resolves an `intent://` URI to the package
 * named in its Intent block. Returns null when the URL can't be parsed or carries a fragment —
 * the fragment position in an intent URI is taken by the Intent block itself, so a link with an
 * anchor would silently lose it. Losing the anchor is worse than falling back to the default
 * browser, which at least lands the user on the right part of the page.
 */
export function buildIntentUri(url: string, packageName: string): string | null {
  const parsed = tryParseUrl(url);
  if (!parsed) return null;
  if (parsed.hash) return null;

  const scheme = parsed.protocol.replace(':', '');
  const withoutScheme = `${parsed.host}${parsed.pathname}${parsed.search}`;
  return `intent://${withoutScheme}#Intent;scheme=${scheme};package=${packageName};end`;
}

/** The browser the user picked, or null to let Android decide. */
function preferredBrowserPackage(): string | null {
  return Platform.OS === 'android' ? useSettingsStore.getState().browserPackage : null;
}

/**
 * Open a URL in the in-app browser or hand off to a full browser app.
 *
 * The chosen browser is read from settings rather than passed in: `openLink` has many call sites,
 * and threading a preference through each one is exactly the kind of thing that gets forgotten at
 * the ninth. Pass `browserPackage` explicitly only to override.
 */
export async function openLink(
  url: string,
  options?: { inApp?: boolean; theme?: ThemeName; browserPackage?: string | null },
): Promise<void> {
  // Users frequently save bare hosts like "google.com" or "www.google.com". Both WebBrowser and
  // Linking require an explicit scheme, so upgrade to https:// before handing the URL off — this
  // also repairs links already stored without a scheme.
  const target = ensureProtocol(url);
  const inApp = options?.inApp ?? true;
  const browserPackage =
    options?.browserPackage !== undefined ? options.browserPackage : preferredBrowserPackage();

  try {
    if (inApp) {
      const colors = Palette[options?.theme ?? 'light'];
      await WebBrowser.openBrowserAsync(target, {
        controlsColor: colors.primary,
        toolbarColor: colors.background,
        enableBarCollapsing: true,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
        // Ignored on iOS, where the engine is always Safari.
        ...(browserPackage ? { browserPackage } : {}),
      });
      return;
    }

    // Opening externally: aim the intent at the chosen browser when we can, and fall through to
    // the system default if that browser can't take it (uninstalled since, intent rejected).
    if (browserPackage) {
      const intentUri = buildIntentUri(target, browserPackage);
      if (intentUri) {
        try {
          await Linking.openURL(intentUri);
          return;
        } catch {
          /* fall through to the default handler below */
        }
      }
    }
    await Linking.openURL(target);
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
