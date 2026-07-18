# Deployment & CI/CD — LinkVault → Google Play

This project ships a fully automated release pipeline. After a **one-time human setup** (things
Google legally requires a verified person to do), every release is a single `git tag` with **zero
manual work**.

- **App ID:** `com.linkvault.app`
- **Build/submit:** EAS Build + EAS Submit (Expo cloud) via GitHub Actions
- **Signing:** Play App Signing + an EAS-managed upload keystore (no keys in the repo)
- **Store listing:** managed as code (`fastlane/metadata/…`) and pushed via `fastlane supply`
- **Privacy Policy:** generated (`pages/privacy.html`) and hosted on GitHub Pages

---

## Part A — One-time setup (only a human can do these)

These are identity, payment, and legal-attestation gates. No automation or bot can complete them.

### 1. Google Play Developer account
1. Register at <https://play.google.com/console> and pay the **$25 one-time** fee.
2. Complete **identity verification** (government ID; a **D-U-N-S number** if registering as an
   **Organization**) and accept the **Developer Distribution Agreement**.
3. **Choose "Organization" if possible.** Personal accounts registered recently must run a **closed
   test with ≥12 testers for 14 continuous days** before the Production track unlocks. Organization
   accounts are exempt.

### 2. Create the app (once)
In Play Console → **Create app**: name `LinkVault`, default language English, App, Free. Accept the
declarations. (The Play API cannot create apps — only manage releases of an existing one.)

### 3. Service account (this is the key that lets CI publish forever)
1. Play Console → **Setup → API access** → create/link a Google Cloud project.
2. In Google Cloud → **IAM & Admin → Service Accounts** → create one → **Keys → Add key → JSON** →
   download it.
3. Back in Play Console → **API access** → grant the service account access with permission to
   **manage releases** (and store listing).

### 4. Expo access token
Create a free account at <https://expo.dev>, then **Account → Access Tokens → Create**. Copy it.

### 5. Provision the Android upload keystore (once)
So CI can run non-interactively, let EAS generate & store the keystore once:
```bash
pnpm install
npx eas login
npx eas build --platform android --profile production   # accept "generate a new keystore"
```
You can cancel the build after credentials are created; CI reuses them. (Alternatively run
`eas credentials` and configure the Android keystore there.)

### 6. Add GitHub repository secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name                  | Value                                                        |
| ---------------------------- | ----------------------------------------------------------- |
| `EXPO_TOKEN`                 | the token from step 4                                       |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | the **entire contents** of the JSON file from step 3        |

### 7. Enable GitHub Pages (for the privacy policy URL)
Repo → **Settings → Pages → Source = "GitHub Actions"**. After the `pages` workflow runs, your
Privacy Policy URL is:
```
https://<your-username>.github.io/<repo-name>/privacy.html
```
Paste that URL into Play Console → **App content → Privacy policy**.
(Edit the contact email in `pages/privacy.html` first.)

### 8. First-time store setup in Play Console (legal attestations — you click submit)
Before any production release can go live, complete **App content**:
- **Privacy policy** URL (from step 7)
- **Data safety** form (LinkVault collects no data — declare accordingly)
- **Content rating** (IARC questionnaire)
- **Target audience**, **Ads** (none), **Government/News/Financial/Health** declarations
- **Store listing** graphics: 512×512 icon, 1024×500 feature graphic, ≥2 phone screenshots
  (add them under `fastlane/metadata/android/en-US/images/` — see that folder's README)

---

## Part B — Fully automated (no touch after Part A)

### Continuous integration — `.github/workflows/ci.yml`
Runs on every push/PR: `typecheck`, `lint`, `test`.

### Release — `.github/workflows/release.yml`
Builds a production AAB on EAS and submits it to Google Play.

```bash
# Cut a release: bump the app version in app.json if needed, then tag.
git tag v1.0.0
git push origin v1.0.0
```
The workflow builds and **auto-submits to the Production track**. Version codes auto-increment
(`autoIncrement` + `appVersionSource: remote` in `eas.json`).

To push to **Internal testing** instead (recommended for the very first upload, and required if you
must run the 12-tester closed test): Actions tab → **Release** → *Run workflow* → profile = `preview`.

### Store listing — `.github/workflows/store-metadata.yml`
Pushes `fastlane/metadata/android/en-US/*` (title, descriptions, release notes, and any graphics) to
Play. Runs automatically when those files change, or manually from the Actions tab.

### Privacy policy — `.github/workflows/pages.yml`
Publishes `pages/` to GitHub Pages whenever it changes.

---

## Recommended first-run order

1. Part A steps 1–8.
2. Push to `main` → CI goes green; Pages publishes the policy.
3. Actions → **Release** → *Run workflow* with profile `preview` → lands in **Internal testing**.
4. Test the internal build; complete any required closed testing (personal accounts).
5. Run **Store listing** workflow (or it runs on metadata changes) to fill the listing text.
6. Tag `v1.0.0` → production build + submit → Google review (1–7 days) → **live**.

After that, shipping an update is just: `git tag vX.Y.Z && git push --tags`.

---

## What is genuinely NOT automatable (and why)

| Step | Why it can't be delegated |
| ---- | ------------------------- |
| Account creation, $25 payment, ID verification | Google KYC + payment tied to a real legal identity |
| Accepting legal agreements | Legally binding consent by the account holder |
| Creating the app entry (first time) | The Play Publishing API cannot create apps |
| Content rating / data safety / target-audience attestations | Legal declarations the developer must certify |
| Personal-account closed test (12 testers / 14 days) | Google policy gate before production unlocks |
| Google's review of the first release | Human + automated review on Google's side |

Everything else — build, sign, upload, promote, roll out, listing text, release notes, privacy
hosting — is automated in this repo.

## iOS (future)

The same architecture supports iOS via EAS. It requires an **Apple Developer Program** membership
($99/year) and App Store review. Add an `ios` submit profile to `eas.json` and an iOS job to
`release.yml` when you're ready.
