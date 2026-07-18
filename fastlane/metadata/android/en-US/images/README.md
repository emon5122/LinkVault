# Play Store graphics

`fastlane supply` uploads any images placed here. Google Play **requires** the icon, feature
graphic, and at least two phone screenshots before a listing can be published.

Add the following files (PNG or JPG, no transparency for feature graphic/screenshots):

| File                          | Size (px)      | Required | Notes                                  |
| ----------------------------- | -------------- | -------- | -------------------------------------- |
| `icon.png`                    | 512 × 512      | ✅        | App icon (also set the adaptive icon in `assets/`) |
| `featureGraphic.png`          | 1024 × 500     | ✅        | Banner shown at the top of the listing |
| `phoneScreenshots/1.png` …    | 1080 × 1920+   | ✅ (≥2)   | Portrait phone screenshots             |
| `sevenInchScreenshots/*.png`  | tablet         | optional | 7" tablet                              |
| `tenInchScreenshots/*.png`    | tablet         | optional | 10" tablet                             |

Fastest way to produce screenshots: run the app (`npx expo run:android`), open Home, Search, Add,
and a link detail, and capture with the emulator/device. Drop the PNGs into `phoneScreenshots/`.

Missing images are skipped by `supply` (not an error), so text metadata still uploads without them —
but the listing cannot go live until the required graphics are present.
