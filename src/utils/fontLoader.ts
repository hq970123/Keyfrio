import { findGoogleFont, parsePrimaryFamily } from '../constants/googleFonts';
import type { Track } from '../types/editor';

// On-demand loading for the Google Fonts offered in the text font picker.
// The app shell only preloads Inter / Noto Sans SC / JetBrains Mono (see
// index.html); the display faces (ZCOOL, Ma Shan Zheng, Montserrat, …)
// are fetched per family the first time a text clip actually uses them:
// a css2 stylesheet link is injected once, then document.fonts.load()
// awaits the concrete weights so canvas rendering picks the real font
// instead of a fallback.

const injectedFamilies = new Set<string>();
const loadedFamilies = new Set<string>();

function injectStylesheet(family: string, weights: number[]): void {
  if (injectedFamilies.has(family) || typeof document === 'undefined') return;
  injectedFamilies.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weights.join(';')}&display=swap`;
  link.dataset.googleFont = family;
  document.head.appendChild(link);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(undefined as T), ms)),
  ]);
}

/** Load a catalog font family (all its catalog weights). No-op for unknown/system families. */
export async function ensureGoogleFontLoaded(family: string): Promise<void> {
  const option = findGoogleFont(family);
  if (!option || loadedFamilies.has(family) || typeof document === 'undefined') return;
  injectStylesheet(option.family, option.weights);
  try {
    await withTimeout(
      Promise.all(
        option.weights.map((w) => document.fonts.load(`${w} 32px "${option.family}"`))
      ),
      5000
    );
    loadedFamilies.add(family);
  } catch {
    // Network/CDN unavailable: text keeps rendering with fallback fonts.
  }
}

/** Fire-and-forget: start loading the primary family of a font stack if it is a catalog font. */
export function primeFontForStack(fontFamilyValue: string): void {
  const family = parsePrimaryFamily(fontFamilyValue);
  if (family && findGoogleFont(family)) {
    void ensureGoogleFontLoaded(family);
  }
}

/** Await every catalog font used by text clips in the given tracks (used before export). */
export async function ensureFontsForTracks(tracks: Track[]): Promise<void> {
  const families = new Set<string>();
  for (const track of tracks) {
    for (const clip of track.clips) {
      const stack = clip.text?.fontFamily;
      if (!stack) continue;
      const family = parsePrimaryFamily(stack);
      if (family && findGoogleFont(family)) families.add(family);
    }
  }
  await Promise.all([...families].map((f) => ensureGoogleFontLoaded(f)));
}
