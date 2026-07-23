/**
 * Dynamic Expo config.
 *
 * Expo reads app.json first and hands the normalized result to this file, which then gets the final
 * say. The only thing it overrides is the version.
 *
 * The version has to come from package.json because release-please bumps that file inside the
 * release PR — so by the time the tag exists, package.json is already correct. app.json used to
 * carry its own copy, synced by a workflow step that ran *after* the tag was created, which meant
 * every tagged tree was built with the previous version. The F-Droid index caught it: an APK named
 * v1.2.0 publishing `<version>1.1.0</version>`.
 *
 * One source of truth removes the ordering problem instead of trying to sequence around it.
 */
const { version } = require('./package.json');

module.exports = ({ config }) => ({
  ...config,
  version,
});
