// SchrankGold homepage. The first file is small on purpose: everything that is
// visible straight away (menu, bars, hero, opening hours, colour blend) lives
// here. The heavier parts load afterwards, in this order:
//   Instagram content  →  scroll animations (GSAP, only without "reduce motion")
// and the map when it comes near the screen.

import { qs, reducedMotion, safe } from './lib/dom.js';
import { normalizeHash, restoreHash } from './lib/deeplink.js';
import { initMenu } from './features/menu.js';
import { initChrome } from './features/chrome.js';
import { initThemeMorph } from './features/theme-morph.js';
import { initWardrobe } from './features/wardrobe.js';
import { initHours } from './features/hours.js';
import { initDirections } from './features/directions.js';
import { initMap } from './features/map.js';

const year = qs('[data-year]');
if (year) year.textContent = new Date().getFullYear();

safe(normalizeHash);
safe(initMenu);
safe(initChrome);
safe(initWardrobe);
safe(initHours);
safe(initDirections);
safe(initMap);
if (!reducedMotion) safe(initThemeMorph);

async function loadRest() {
  const motion = reducedMotion ? null : import('./motion.js').catch(err => { console.warn('[motion]', err); return null; });
  try {
    const { initInstagram } = await import('./features/instagram/index.js');
    await initInstagram(); // cards and posts must exist before they are animated
  } catch (err) {
    console.error('[schrankgold] instagram', err);
  }
  const loaded = await motion;
  if (loaded) await loaded.initMotion();
  else restoreHash();
}

// after the page has loaded, so the first screen is never held up
const start = () => (window.requestIdleCallback ? requestIdleCallback(loadRest, { timeout: 1500 }) : setTimeout(loadRest, 200));
if (document.readyState === 'complete') start();
else window.addEventListener('load', start, { once: true });
