// One place that knows whether smooth scrolling (Lenis) is active.
// Features call these instead of talking to Lenis directly, so they work the
// same before the motion code has loaded, with reduced motion, and on the
// legal pages that never load it.

import { reducedMotion } from './dom.js';

let lenis = null;

export function useLenis(instance) {
  lenis = instance;
}

export const stopScroll = () => lenis?.stop();
export const startScroll = () => lenis?.start();

// target: element or y position
export function scrollTo(target, { immediate = false } = {}) {
  if (lenis) {
    lenis.resize();
    lenis.scrollTo(target, { immediate, force: true });
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'instant' });
  } else {
    target.scrollIntoView({ behavior: immediate || reducedMotion ? 'instant' : 'smooth' });
  }
}
