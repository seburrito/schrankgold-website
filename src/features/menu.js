// Full-screen menu. The open/close animation is pure CSS (see chrome.css):
// this only toggles state, moves focus and makes the page behind it inert.

import { qs, qsa, reducedMotion } from '../lib/dom.js';
import { scrollTo, startScroll, stopScroll } from '../lib/scroll.js';

export function initMenu() {
  const btn = qs('[data-menu-btn]');
  const menu = qs('[data-menu]');
  if (!btn || !menu) return;
  const background = qsa('main, footer, [data-topbar], [data-quickbar], .skip-link');
  qsa('[data-menu-link]', menu).forEach((link, i) => link.style.setProperty('--i', i));
  let isOpen = false;

  // The menu grows out of the button
  const setOrigin = () => {
    const r = btn.getBoundingClientRect();
    menu.style.setProperty('--menu-x', `${Math.round(r.left + r.width / 2)}px`);
    menu.style.setProperty('--menu-y', `${Math.round(r.top + r.height / 2)}px`);
  };

  const setState = open => {
    isOpen = open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    background.forEach(node => { node.inert = open; });
  };

  const open = () => {
    setOrigin();
    menu.hidden = false;
    void menu.offsetWidth; // start the CSS transition from the closed state
    menu.classList.add('is-open');
    setState(true);
    stopScroll();
    qs('a', menu)?.focus({ preventScroll: true });
  };

  const close = after => {
    setOrigin();
    menu.classList.remove('is-open');
    setState(false);
    let finished = false;
    const done = () => {
      if (finished || isOpen) return;
      finished = true;
      menu.hidden = true;
      startScroll();
      after?.();
    };
    if (reducedMotion) return done();
    menu.addEventListener('transitionend', e => { if (e.target === menu) done(); }, { once: true });
    setTimeout(done, 700); // in case the transition never runs
  };

  btn.addEventListener('click', () => (isOpen ? close() : open()));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) {
      close();
      btn.focus();
    }
  });

  // Links to a section of this page: close, scroll there and move focus
  qsa('a[href^="#"]', menu).forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = qs(link.getAttribute('href'));
      close(() => {
        if (!target) return;
        scrollTo(target);
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  });
}
