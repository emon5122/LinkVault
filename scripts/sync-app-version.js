/**
 * Copy package.json's version into app.json (`expo.version`).
 *
 * release-please owns package.json, but Expo has a second version: `expo.version` is the
 * user-facing versionName that Google Play displays. EAS only manages `versionCode` remotely
 * (`appVersionSource: remote`) — the semver string stays ours, so without this the store would keep
 * advertising whatever app.json last said while package.json moved on.
 *
 * Kept out of release-please's `extra-files` on purpose: that requires manifest mode, and manifest
 * mode with a single package mismatches its own branch component and silently never tags a release.
 *
 *   node scripts/sync-app-version.js            # write app.json
 *   node scripts/sync-app-version.js --check    # report drift, exit 1 if out of sync
 */
const fs = require('fs');

const PACKAGE_JSON = 'package.json';
const APP_JSON = 'app.json';

/**
 * Replace `expo.version` textually rather than via JSON.parse/stringify.
 *
 * app.json is hand-maintained and reviewed in diffs; a full re-serialize would reformat the whole
 * file and bury the one-line version change in noise. Returns the original string when the version
 * already matches, so callers can detect a no-op.
 */
function setExpoVersion(appJsonText, version) {
  const pattern = /("expo"\s*:\s*\{[\s\S]*?"version"\s*:\s*")([^"]*)(")/;
  const match = pattern.exec(appJsonText);
  if (!match) {
    throw new Error(`Could not find expo.version in ${APP_JSON}`);
  }
  if (match[2] === version) return appJsonText;
  return appJsonText.replace(pattern, `$1${version}$3`);
}

/** Read `expo.version` out of app.json text. */
function readExpoVersion(appJsonText) {
  return JSON.parse(appJsonText)?.expo?.version ?? null;
}

function main() {
  const check = process.argv.includes('--check');

  const version = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')).version;
  if (!version) throw new Error(`No version field in ${PACKAGE_JSON}`);

  const original = fs.readFileSync(APP_JSON, 'utf8');
  const current = readExpoVersion(original);

  if (current === version) {
    console.log(`app.json already at ${version}.`);
    return;
  }

  if (check) {
    console.error(`Version drift: package.json is ${version}, app.json is ${current}.`);
    process.exit(1);
  }

  const updated = setExpoVersion(original, version);
  // Sanity-check the edit before writing: a broken app.json fails the build much later and much
  // more confusingly than an error here.
  if (readExpoVersion(updated) !== version) {
    throw new Error(`Failed to set expo.version to ${version}`);
  }

  fs.writeFileSync(APP_JSON, updated, 'utf8');
  console.log(`app.json ${current} -> ${version}`);
}

if (require.main === module) main();

module.exports = { setExpoVersion, readExpoVersion, PACKAGE_JSON, APP_JSON };
