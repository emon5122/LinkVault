# LinkVault

**Save everything. Find anything.**

LinkVault is a production-quality, offline-first bookmark manager for Android (iOS-compatible) built
with Expo SDK 57, React Native, and TypeScript. Save links from anywhere, enrich them with Open Graph
metadata, organize them into folders and tags, add Markdown notes, and find them instantly — all
stored locally on your device with no account required.

---

## Features

- **Home dashboard** — quick-access tiles (Favorites, Read Later, Archive), pinned links, folders,
  recent, and recently-opened carousels.
- **Add / edit** — paste or share a URL, auto-fetch title/description/preview image/favicon/site name
  from Open Graph metadata, choose folders & tags, toggle favorite/read-later/pin/archive, and write
  Markdown notes with a live preview.
- **Duplicate detection** — warns (with a tap-to-open link) when you save a URL you already have,
  using a canonical key that ignores tracking params, `www`, fragments, and trailing slashes.
- **Clipboard detection** — a "Save copied link?" prompt appears when an unsaved URL is on the
  clipboard (toggleable in Settings).
- **Instant search** — debounced, highlighted search across title, URL, description, notes, folder,
  tag, and site.
- **Folders** — create/rename/delete/reorder with custom icons and colors.
- **Tags** — create, rename inline, delete, and assign multiple per link.
- **Collections** — dedicated Favorites, Read Later, Pinned, Archive, and All Links screens with
  list/grid toggle, sort options, swipe actions, and infinite scroll.
- **Read Later & Archive** — mark read, archive/restore, empty archive.
- **Import** — CSV, JSON, and Netscape HTML browser bookmarks.
- **Export** — CSV, JSON, and Markdown (shared via the OS share sheet).
- **Backup & restore** — full local JSON snapshot that preserves ids and relations.
- **Reminders** — optional daily and weekly local notifications.
- **Open links** — in-app browser (expo-web-browser) or the system default, configurable.
- **Theming** — light / dark / system, minimal Notion/Linear-inspired design with rounded corners,
  soft shadows, and Material-You-friendly spacing.
- **Polish** — Reanimated animations, gesture-driven swipe actions, bottom-sheet action menus,
  skeleton loaders, empty/error states, haptics, and accessibility labels throughout.

---

## Tech stack

| Concern            | Library                                              |
| ------------------ | ---------------------------------------------------- |
| Framework          | Expo SDK 57, React Native 0.86, React 19             |
| Language           | TypeScript (strict)                                  |
| Navigation         | Expo Router (typed routes, file-based)               |
| Server state       | TanStack Query (React Query)                         |
| Client state       | Zustand (persisted with MMKV)                        |
| Forms & validation | React Hook Form + Zod                                |
| Database           | Expo SQLite (async API, migrations, indexes)         |
| Preferences        | react-native-mmkv                                    |
| Lists              | @shopify/flash-list                                  |
| Styling            | NativeWind (Tailwind CSS)                            |
| Icons              | lucide-react-native                                  |
| Bottom sheets      | @gorhom/bottom-sheet                                 |
| Animation/gesture  | react-native-reanimated, react-native-gesture-handler |
| Native APIs        | Clipboard, Sharing, FileSystem, Notifications, Haptics, WebBrowser, Linking, SecureStore, DocumentPicker |

No Redux. No class components. No inline styles. No JavaScript — TypeScript only.

---

## Architecture

Feature-based, layered, and modular. Data flows **UI → hooks (React Query) → repositories → SQLite**.
Services encapsulate device/platform concerns; stores hold app-wide client state.

```
src/
├── app/                 # Expo Router routes (screens + navigation)
│   ├── (tabs)/          # Home, Search, Library, Settings
│   ├── link/[id].tsx    # Link detail
│   ├── folder/[id].tsx  # Folder contents      tag/[id].tsx  # Tag contents
│   ├── add.tsx          # Add/Edit link (modal) folder-edit.tsx
│   ├── favorites / read-later / pinned / archive / all / tags
│   └── _layout.tsx      # Providers + Stack + deep-link handling
├── components/          # Reusable UI
│   ├── ui/              # Primitives: Button, Card, Chip, Input, Sheet, Fab, Markdown, …
│   ├── links/           # LinkCard, LinkList, actions sheet, swipe row, clipboard banner
│   ├── folders/         # FolderTile
│   └── home/            # QuickTile, HorizontalLinks
├── features/            # Feature screens composed from components (LinkCollectionScreen)
├── hooks/               # React Query hooks + useDebounce, useClipboardUrl, useTheme
├── services/            # metadata, import/export, backup, notifications, clipboard, browser, files, storage, linking
├── store/               # Zustand stores (settings, clipboard)
├── database/            # schema, migrations, client, mappers, queries, repositories, seed
├── providers/           # AppProviders, ThemeProvider, DatabaseGate
├── lib/                 # queryClient
├── types/               # Domain models + row types
├── utils/               # url, format, csv, markdown, highlight, validation, haptics, cn
└── constants/           # theme tokens, config, folder icon registry
```

### Database schema

Epoch-millisecond timestamps, `0/1` integer booleans, foreign keys with `ON DELETE CASCADE`, WAL
mode, and indexes on every filtered/sorted column. Migrations are versioned via `PRAGMA
user_version` (see `src/database/migrations.ts`).

- **links** — id, title, url, normalizedUrl, host, description, image, favicon, siteName, notes,
  favorite, archived, readLater, pinned, readAt, lastOpenedAt, visitCount, createdAt, updatedAt
- **folders** — id, name, icon, color, position, createdAt, updatedAt
- **tags** — id, name (unique), createdAt
- **link_tags** — (linkId, tagId) · **folder_links** — (folderId, linkId)

---

## Getting started

### Prerequisites

- Node 20+ and **pnpm** (`corepack enable`)
- Android Studio (emulator) or a physical Android device
- **A development build is required** — LinkVault uses native modules that are not available in Expo
  Go (react-native-mmkv, and others). See below.

### Install

```bash
pnpm install
```

### Run (development build)

Because MMKV (and the full native stack) aren't in Expo Go, build and run a dev client:

```bash
# One-time: generate native projects
pnpm prebuild

# Build & launch on a connected Android device/emulator
npx expo run:android

# Then start the dev server (if not already running)
pnpm start
```

> If you only want to explore the UI quickly, you can temporarily swap the MMKV-backed store adapter
> for an in-memory one — but the intended target is a development/production build.

### Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm start`        | Start the Metro dev server               |
| `pnpm android`      | Start with Android                       |
| `pnpm prebuild`     | Generate native `android/` project       |
| `pnpm typecheck`    | `tsc --noEmit` (strict)                  |
| `pnpm lint`         | ESLint (eslint-config-expo)              |
| `pnpm test`         | Jest unit tests                          |
| `pnpm test:ci`      | Jest with coverage                       |
| `pnpm format`       | Prettier                                 |

---

## Building for release (EAS)

`eas.json` defines `development`, `preview`, and `production` profiles. Production builds an Android
App Bundle for Google Play.

```bash
npm i -g eas-cli
eas login
eas build --profile production --platform android
eas submit --profile production --platform android
```

App identifiers: `com.emon5122.linkvault` (Android package & iOS bundle id). New Architecture is enabled.

---

## Testing

Unit tests cover the pure, high-value logic — URL normalization/validation, formatting, CSV,
Markdown, search highlighting, Zod validation, the SQL query builder, the Open Graph parser, and the
import/export parsers.

```bash
pnpm test          # 65 tests across 9 suites
```

Native-module-dependent code (repositories, screens) is exercised through the app; the query-building
logic is factored into pure functions (`src/database/queries.ts`) precisely so it can be tested
without a live database.

---

## Import / export formats

- **CSV import** — header row required; only `url` is mandatory. Recognized columns: `url`/`href`,
  `title`/`name`, `description`, `notes`, `tags` (`;`/`,` separated), `folder(s)`, `favorite`,
  `readlater`, `archived`, `pinned`.
- **JSON import** — a bare array or `{ "links": [...] }`; also restores LinkVault's own JSON export.
- **HTML import** — the Netscape bookmark format exported by Chrome/Firefox/Safari/Edge.
- **Exports** — CSV, JSON, and Markdown, delivered through the OS share sheet.
- **Backup** — a full JSON snapshot (all tables + join rows, ids preserved) that a restore reproduces
  exactly.

---

## Platform notes & limitations

- **Share extension (Android ACTION_SEND):** LinkVault registers as a share target via an
  `intentFilter` in `app.json`, and fully supports deep links + app links
  (`linkvault://add?url=…`, `https://linkvault.app/add?url=…`, `linkvault://link/42`). However, Expo
  core does **not** expose the ACTION_SEND intent's extra text through `expo-linking`, so receiving
  arbitrary shared text requires the `expo-share-intent` config plugin (a dev-build native module).
  The integration point is documented in `src/services/linking.ts` (`extractFirstUrl`). The
  fully-working "save from anywhere" paths today are **clipboard detection** and **deep links**.
  The code is structured so an iOS Share Extension / `expo-share-intent` can be added without changes
  to the storage layer.
- **Expo Go:** not supported (MMKV is a Nitro native module). Use a development build.
- **App icon:** the repository currently ships the default Expo-generated icon/splash assets in
  `assets/images/` (the splash + notification color are set to the brand blue `#2563EB`/`#208AEF`).
  Replace `assets/images/icon.png` and the `android-icon-*` adaptive assets with a minimalist
  chain-link/bookmark mark in blue & white, then run `pnpm prebuild`. Sizes and the adaptive-icon
  contract are defined in `app.json`.

---

## Sample data

On first launch (empty database), LinkVault seeds a small set of realistic folders, tags, and links
so the app isn't an empty shell (`src/database/seed.ts`). It never overwrites existing data and runs
only once.

---

## Privacy

Everything is stored locally on the device. There are no accounts, servers, sync, or analytics.
Metadata is fetched directly from the sites you save. The architecture is intentionally
"future-ready for sync" but ships fully offline.

---

## License

MIT — see [LICENSE](LICENSE).
