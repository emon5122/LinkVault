# Changelog

## [1.2.0](https://github.com/emon5122/LinkVault/compare/v1.1.0...v1.2.0) (2026-07-23)


### Features

* **ci:** add a manual workflow for pushing Play release notes ([ed8d2c3](https://github.com/emon5122/LinkVault/commit/ed8d2c33e533290672d3d7de20bc315f9cfe6012))
* **ci:** publish a self-hosted F-Droid repository ([af449ad](https://github.com/emon5122/LinkVault/commit/af449ad9262efe9d65b3391c59a2a0b9d07cb3b2))


### Bug Fixes

* **ci:** give supply the version code when pushing release notes ([e3266c3](https://github.com/emon5122/LinkVault/commit/e3266c354fb68d253a90bf6630cec1791cedd730))
* **ci:** stop overwriting curated Play release notes on every release ([217c71c](https://github.com/emon5122/LinkVault/commit/217c71c19ecfe97254f5fd02ffb0161262e31adc))
* **deps:** take the Expo-sanctioned dependency versions ([99bcc87](https://github.com/emon5122/LinkVault/commit/99bcc87d30116b90c45de5c8d51da2a55ae29525))

## [1.1.0](https://github.com/emon5122/LinkVault/compare/v1.0.0...v1.1.0) (2026-07-23)


### Features

* add babel-preset-expo dependency and pnpm workspace configuration ([1478e88](https://github.com/emon5122/LinkVault/commit/1478e8879e9bbbdf0cd4ddd2b2f257b1d3d4a771))
* add script to generate store assets from SVG to PNG ([6d4433d](https://github.com/emon5122/LinkVault/commit/6d4433d4da043b930f14db18d5bbc16dd914f3a0))
* implement animated entrance effects and update UI components for improved interactivity ([b57a6f5](https://github.com/emon5122/LinkVault/commit/b57a6f5a76422bb578742fb94f41ddae2137aa96))
* implement article extraction and link health checking services ([c52a51b](https://github.com/emon5122/LinkVault/commit/c52a51beac358eb2d2c317ae7f89d904122585d3))
* implement release automation with release-please and Play release notes synchronization ([97fa5af](https://github.com/emon5122/LinkVault/commit/97fa5afb851ebcc36bc7ba1e172cf70d931d254f))
* integrate expo-share-intent for enhanced sharing capabilities and improve deep link handling ([e7e1ddf](https://github.com/emon5122/LinkVault/commit/e7e1ddf49397311859b6675bb55756df04ef0f67))


### Bug Fixes

* **build:** pin pnpm 10 so EAS install doesn't fail on ignored builds ([331f3a1](https://github.com/emon5122/LinkVault/commit/331f3a132d1511797629035172b8f9d24faf3b53))
* **ci:** resolve `*.css` types in CI typecheck ([4cf7344](https://github.com/emon5122/LinkVault/commit/4cf734424f954f8ea298071dd1965abf80342e74))
* ensure URLs have a protocol before opening or sharing ([8ecc3c7](https://github.com/emon5122/LinkVault/commit/8ecc3c7798abe18f6b0d9d1d5523dda9d8d1f954))
* **store:** point supply at the internal track (has a release) ([5d30ef5](https://github.com/emon5122/LinkVault/commit/5d30ef56a7a88fd72752529bab76e3d2c23da8f6))
* **store:** skip changelogs in the listing-only supply lane ([bc65cbe](https://github.com/emon5122/LinkVault/commit/bc65cbe8200afe8664e9cdca2ad834701ecd546c))
* unblock release pnpm setup + silence false-positive lint error ([5da896d](https://github.com/emon5122/LinkVault/commit/5da896d567e65a2a69515e765ff5389b9d4edbcd))
* update app identifiers to use the correct package name for deployment ([40621aa](https://github.com/emon5122/LinkVault/commit/40621aae86e61c3248a96e3d4bfd8e71663837a0))
* update contact email in privacy policy ([4d2c2e9](https://github.com/emon5122/LinkVault/commit/4d2c2e921027ac70c0ff38ea37f3f0ccff260f0b))
* update Screen component to accept edges prop for safe-area insets ([c23cda8](https://github.com/emon5122/LinkVault/commit/c23cda8dcaa9605dfd7deb87f2c03688d8a20431))
