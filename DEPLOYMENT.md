# Deployment & CI/CD — LinkVault → Google Play

This project ships a fully automated release pipeline. After a **one-time human setup** (things
Google legally requires a verified person to do), every release is a single `git tag` with **zero
manual work**.

- **App ID:** `com.emon5122.linkvault`
- **Build/submit:** EAS Build + EAS Submit (Expo cloud) via GitHub Actions
- **Signing:** Play App Signing + an EAS-managed upload keystore (no keys in the repo)
- **Store listing:** managed as code (`fastlane/metadata/…`) and pushed via `fastlane supply`
- **Privacy Policy:** generated (`pages/privacy.html`) and hosted on GitHub Pages

---

## Part A — One-time setup (only a human can do these)

These are identity, payment, and legal-attestation gates. No automation or bot can complete them.

### 1. Google Play Developer account  (you already have a **personal** account)
1. Make sure the account is fully **identity-verified** (government photo ID, address, phone) and that
   the **Developer Distribution Agreement** is accepted. Play Console will block publishing until so.
2. **Check your account creation date — it decides whether you face the closed-testing gate:**
   - Created **before Nov 13, 2023** → exempt. You can publish straight to **production**.
   - Created **on/after Nov 13, 2023** → you must complete the **closed-testing requirement** below
     before the Production track unlocks.

### 1b. The closed-testing gate (personal accounts created after Nov 13, 2023)
Google requires, before you can "Apply for production access":
- **At least 12 testers** who have **opted in** to a **Closed testing** track (Internal testing does
  **not** count), and
- the test running **≥ 14 continuous days**.

> The Play Console shows the exact current number required (it has been as high as 20; 12 at the time
> of writing). Whatever it shows is authoritative.

**Lining up 12 real testers (legitimately):**
- Create a **Google Group** (e.g. `linkvault-testers@googlegroups.com`) and add it as the tester list
  on the Closed testing track — then anyone you invite just joins the group.
- Recruit 12+ people with Google accounts: friends, family, colleagues, a Discord/community. They must
  each accept the opt-in link and install the app from the Play closed-testing link.
- Keep them opted in for the full 14 days, then **Apply for production access** in the console.
- Do **not** use fake/bot testers — Google checks for genuine opted-in testers and can reject the
  application.

This 14-day window is the one unavoidable calendar delay for a new personal account. Everything else
below is automated.

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
Builds a production AAB on EAS and submits it to a Google Play **track**. Three tracks are wired in
`eas.json` (`submit.*`):

| Track profile | Play track       | Use it for |
| ------------- | ---------------- | ---------- |
| `closed`      | Closed testing (`alpha`) | The mandatory 12-tester / 14-day gate (personal accounts) |
| `internal`    | Internal testing | Quick smoke test (up to 100 testers, no review) |
| `production`  | Production       | Public release |

**During the closed-testing gate** (personal account bootstrap):
Actions tab → **Release** → *Run workflow* → track = **`closed`**. Testers on your closed track get
each build automatically. Repeat as needed during the 14 days.

**After the gate is cleared** (or if your account is pre-Nov-2023 exempt):
```bash
# Cut a release: bump the version in app.json if needed, then tag.
git tag v1.0.0
git push origin v1.0.0        # → builds + auto-submits to PRODUCTION
```
Version codes auto-increment (`autoIncrement` + `appVersionSource: remote`).

> One-time in Play Console: create the **Closed testing** track (the default is named *Alpha*, which
> maps to `track: "alpha"` in `eas.json`) and attach your tester Google Group.

### Store listing — `.github/workflows/store-metadata.yml`
Pushes `fastlane/metadata/android/en-US/*` (title, descriptions, release notes, and any graphics) to
Play. Runs automatically when those files change, or manually from the Actions tab.

### Privacy policy — `.github/workflows/pages.yml`
Publishes `pages/` to GitHub Pages whenever it changes.

---

## Recommended first-run order (personal account)

1. Part A steps 1–8, including creating the **Closed testing** track + a tester **Google Group**.
2. Push to `main` → CI goes green; Pages publishes the privacy policy.
3. Actions → **Release** → *Run workflow* → track **`closed`**. → build lands in Closed testing.
4. Invite **≥12 testers** to the Google Group; have them opt in and install. **Wait 14 days.**
5. Meanwhile, run the **Store listing** workflow (fills title/descriptions) and add the required
   graphics under `fastlane/metadata/android/en-US/images/`; complete the App content attestations.
6. After 14 days with 12+ testers → Play Console → **Apply for production access**.
7. Once granted, tag `v1.0.0` → production build + submit → Google review (1–7 days) → **live**.

After that, shipping an update is just: `git tag vX.Y.Z && git push --tags`.

> If your account is **pre-Nov-2023 exempt**, skip steps 3–6 and go straight to step 7.

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
