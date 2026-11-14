// Top bar and mobile quick bar: both appear once the visitor is past the hero.
// The top bar hides while scrolling down and comes back when scrolling up.

import { qs } from '../lib/dom.js';

export function initChrome() {
  const topbar = qs('[data-topbar]');
  const quickbar = qs('[data-quickbar]');
  const landing = qs('#landing');
  if (!topbar || !landing) return;
  let lastY = window.scrollY;
  let queued = false;

  const update = () => {
    queued = false;
    const y = window.scrollY;
    const pastHero = landing.getBoundingClientRect().bottom < window.innerHeight * 0.5;
    if (!pastHero) topbar.classList.remove('is-visible');
    else if (y < lastY - 2) topbar.classList.add('is-visible');
    else if (y > lastY + 2) topbar.classList.remove('is-visible');
    quickbar?.classList.toggle('is-visible', pastHero);
    lastY = y;
  };
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}
