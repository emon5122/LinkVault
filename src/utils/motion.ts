/**
 * Shared entrance-animation presets so lists and sections come alive with one consistent rhythm.
 *
 * `riseIn`/`fadeIn` take a stagger index — pass the position of an item in a list and each one
 * enters a beat after the last (fade + a small upward drift). Timings are tuned to feel quick and
 * intentional, never floaty. Built on Reanimated layout animations.
 *
 * Note: use these on items inside a ScrollView/plain View, not on FlashList cells — recycled rows
 * re-fire entrances on scroll. FlashList content should stay static.
 */
import { FadeIn, FadeInDown } from 'react-native-reanimated';

/** Base delay before the first item enters (ms) and gap between staggered items (ms). */
const BASE_DELAY = 40;
const STAGGER = 55;

/** Fade + gentle rise. The workhorse for tiles, cards, and sections. */
export function riseIn(index = 0) {
  return FadeInDown.delay(BASE_DELAY + index * STAGGER)
    .springify()
    .damping(22)
    .stiffness(180)
    .withInitialValues({ transform: [{ translateY: 14 }] });
}

/** Plain fade, no movement — for elements where translation would look off (e.g. full-width banners). */
export function fadeIn(index = 0) {
  return FadeIn.delay(BASE_DELAY + index * STAGGER).duration(360);
}
