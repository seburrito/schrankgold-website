// Store map (MapLibre + MapTiler style). The library and its stylesheet are
// part of our own build but sit in a separate file that is only downloaded
// shortly before the map scrolls into view. If anything fails, the branded
// fallback card behind the map stays visible.

import overlays from '../data/overlays.json';
import { getPreferredMaps } from './directions.js';

export function initMap() {
  const mapEl = document.getElementById('store-map');
  if (!mapEl) return;
  const start = () => {
    import('./map-view.js').then(m => m.buildMap(mapEl, overlays, getPreferredMaps())).catch(err => console.warn('[map]', err));
  };
  if (!('IntersectionObserver' in window)) return start();
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      observer.disconnect();
      start();
    }
  }, { rootMargin: '600px 0px' });
  observer.observe(mapEl);
}
