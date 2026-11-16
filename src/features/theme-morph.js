// The page colour follows the scroll position and blends from one section's
// colour into the next, so there are no hard jumps between dark and light.
// Sections only turn see-through once this runs (class "has-morph"); without
// it every section keeps its own background.
//
// Where a blend happens depends on the two sections, so text is never left on
// a half-blended background for long:
//   same tone (dark → dark)   a slow blend while the next section moves in
//   dark → light              in the gap between the two sections: after the dark section's
//                             content, finished before the light section's text is on screen
//   light → dark              starts only when the light section's text has (almost) left
// For the short moment in between, a section whose own tone doesn't fit the
// page colour switches to matching text colours (data-on="dark|light", see base.css).

import { qs, qsa } from '../lib/dom.js';

// Same values as the --bg of each [data-theme] in base.css
const THEME_BG = { red: '#990036', ink: '#1C0810', bone: '#F3EADF', deep: '#4D001B', blush: '#F2DCDD' };
const LIGHT_THEMES = new Set(['bone', 'blush']);

// [from, to]: the blend runs while the next section's top edge moves between
// these positions (fractions of the viewport height, 1 = bottom edge of the screen)
const BLEND = {
  sameTone: [1.15, 0.55],
  toLight: [0.75, 0.35],
  toDark: [0.5, 0.12]
};
// Background luminance at which dark and light text are equally readable
const TONE_THRESHOLD = 0.19;

const toRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const toneOf = section => (LIGHT_THEMES.has(section.dataset.theme) ? 'light' : 'dark');
const luminance = rgb => {
  const [r, g, b] = rgb.map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function initThemeMorph() {
  const meta = qs('meta[name="theme-color"]');
  const sections = qsa('[data-theme]');
  if (!sections.length) return;
  const colors = sections.map(section => toRgb(THEME_BG[section.dataset.theme]));
  const tones = sections.map(toneOf);
  // blend window for entering section k (k ≥ 1)
  const windows = sections.map((_, k) => {
    if (k === 0 || tones[k] === tones[k - 1]) return BLEND.sameTone;
    return tones[k] === 'light' ? BLEND.toLight : BLEND.toDark;
  });
  let lastCss = '';
  let lastTone = '';
  let queued = false;

  const setTone = tone => {
    if (tone === lastTone) return;
    lastTone = tone;
    sections.forEach((section, k) => {
      if (tones[k] === tone) section.removeAttribute('data-on');
      else section.dataset.on = tone;
    });
  };

  const pick = () => {
    queued = false;
    const vh = window.innerHeight;
    const atEnd = vh + window.scrollY >= document.documentElement.scrollHeight - 2;
    let color = colors[0];
    if (atEnd) {
      color = colors[colors.length - 1];
    } else {
      for (let k = 1; k < sections.length; k++) {
        const [from, to] = windows[k];
        const top = sections[k].getBoundingClientRect().top / vh;
        if (top >= from) break; // this section and all below it are still too far away
        const t = Math.min((from - top) / (from - to), 1);
        const eased = t * t * (3 - 2 * t); // smoothstep
        color = color.map((v, i) => Math.round(v + (colors[k][i] - v) * eased));
      }
    }
    const css = `rgb(${color.join(', ')})`;
    if (css === lastCss) return;
    lastCss = css;
    document.body.style.backgroundColor = css;
    meta?.setAttribute('content', css);
    setTone(luminance(color) > TONE_THRESHOLD ? 'light' : 'dark');
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(pick);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  pick();
  document.documentElement.classList.add('has-morph');
}
