// The page colour follows the scroll position: it belongs to the section at
// 55% of the viewport and blends gradually into the next section's colour as
// that one approaches, so there are no hard jumps between dark and light.
// Sections only turn see-through once this runs (class "has-morph"); without
// it every section keeps its own background.

import { qs, qsa } from '../lib/dom.js';

// Same values as the --bg of each [data-theme] in base.css
const THEME_BG = { red: '#990036', ink: '#1C0810', bone: '#F3EADF', deep: '#4D001B', blush: '#F2DCDD' };
const BLEND_LINE = 0.55; // viewport fraction that decides the active section
const BLEND_ZONE = 0.6; // viewport fraction before the next section where the blend starts

const toRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

export function initThemeMorph() {
  const meta = qs('meta[name="theme-color"]');
  const sections = qsa('[data-theme]');
  if (!sections.length) return;
  const colors = sections.map(section => toRgb(THEME_BG[section.dataset.theme]));
  let last = '';
  let queued = false;

  const pick = () => {
    queued = false;
    const vh = window.innerHeight;
    const line = vh * BLEND_LINE;
    const zone = vh * BLEND_ZONE;
    const atEnd = vh + window.scrollY >= document.documentElement.scrollHeight - 2;
    const i = Math.max(0, sections.findIndex(section => {
      const r = section.getBoundingClientRect();
      return r.top <= line && r.bottom > line;
    }));
    let color = colors[i];
    if (atEnd) {
      color = colors[colors.length - 1];
    } else if (i < sections.length - 1) {
      const distance = sections[i + 1].getBoundingClientRect().top - line;
      if (distance < zone) {
        const t = 1 - Math.max(distance, 0) / zone;
        const eased = t * t * (3 - 2 * t); // smoothstep
        color = color.map((v, k) => Math.round(v + (colors[i + 1][k] - v) * eased));
      }
    }
    const css = `rgb(${color.join(', ')})`;
    if (css === last) return;
    last = css;
    document.body.style.backgroundColor = css;
    meta?.setAttribute('content', css);
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
