// SchrankGold – homepage bootstrap + motion system.
// Libraries are loaded as classic scripts in index.html (window.gsap, ScrollTrigger,
// SplitText, Flip, Lenis). Everything degrades gracefully: without JS or with
// "reduce motion" all content is shown in its final state.

import { loadWardrobe } from './wardrobe.js';
import { initHours } from './hours.js';
import { initInstagram } from './instagram.js';
import { initMap, initDirections } from './map.js';

const { gsap, ScrollTrigger, SplitText, Flip, Lenis } = window;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const motion = !reducedMotion && !!(gsap && ScrollTrigger);
const finePointer = window.matchMedia('(pointer: fine)').matches;

const qs = (s, root = document) => root.querySelector(s);
const qsa = (s, root = document) => [...root.querySelectorAll(s)];

const THEME_BG = { red: '#990036', ink: '#1C0810', bone: '#F3EADF', deep: '#4D001B' };

/* ------------------------------ Smooth scroll ------------------------------ */
let lenis = null;
if (motion) {
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
  document.documentElement.classList.add('has-motion');
  if (Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
}

/* ------------------------------ Deep links ------------------------------ */
const LEGACY_HASH = { welcome: 'willkommen', 'so-funktionierts': 'abgeben', instagram: 'neuigkeiten', location: 'besuch', 'opening-hours': 'besuch', story: 'geschichte', contact: 'kontakt' };
{
  const h = decodeURIComponent(location.hash.slice(1));
  if (LEGACY_HASH[h]) history.replaceState(null, '', '#' + LEGACY_HASH[h]);
}
const hashTarget = () => {
  const id = decodeURIComponent(location.hash.slice(1));
  return id ? document.getElementById(id) : null;
};
// Move keyboard focus to a section after jumping to it
function focusSection(target) {
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

/* ------------------------------ Inline SVGs ------------------------------ */
function inlineSvgs() {
  return Promise.all(qsa('[data-inline-svg]').map(node =>
    fetch(node.dataset.inlineSvg).then(r => r.text()).then(svg => { node.innerHTML = svg; }).catch(() => {})
  ));
}

/* ------------------------------ Menu ------------------------------ */
// The menu button is a clothes hanger; open, its arms fold into an X.
const HANGER = {
  closed: { l: [22, 16, 5, 30], r: [22, 16, 39, 30], b: [5, 30, 39, 30], hook: 1 },
  open: { l: [33, 11, 11, 33], r: [11, 11, 33, 33], b: [22, 22, 22, 22], hook: 0 }
};

function setHanger(btn, state) {
  const shape = HANGER[state];
  const attrs = ([x1, y1, x2, y2]) => ({ x1, y1, x2, y2 });
  const parts = { l: qs('.hanger__l', btn), r: qs('.hanger__r', btn), b: qs('.hanger__b', btn) };
  const hook = qs('.hanger__hook', btn);
  if (motion) {
    for (const k of ['l', 'r', 'b']) gsap.to(parts[k], { attr: attrs(shape[k]), duration: 0.55, ease: 'expo.inOut', overwrite: true });
    gsap.to(hook, { opacity: shape.hook, duration: 0.3, overwrite: true });
  } else {
    for (const k of ['l', 'r', 'b']) Object.entries(attrs(shape[k])).forEach(([n, v]) => parts[k]?.setAttribute(n, v));
    if (hook) hook.style.opacity = shape.hook;
  }
}

function initMenu() {
  const btn = qs('[data-menu-btn]');
  const menu = qs('[data-menu]');
  if (!btn || !menu) return;
  const background = qsa('main, footer, [data-topbar], [data-quickbar], .skip-link');
  let isOpen = false;
  let tl = null;
  const origin = () => {
    const r = btn.getBoundingClientRect();
    return `${Math.round(r.left + r.width / 2)}px ${Math.round(r.top + r.height / 2)}px`;
  };

  const open = () => {
    isOpen = true;
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Menü schließen');
    background.forEach(n => { n.inert = true; });
    lenis?.stop();
    setHanger(btn, 'open');
    if (motion) {
      tl?.kill();
      const at = origin();
      tl = gsap.timeline()
        .fromTo(menu, { clipPath: `circle(0% at ${at})` }, { clipPath: `circle(150% at ${at})`, duration: 0.9, ease: 'expo.inOut' })
        .fromTo(qsa('[data-menu-link]', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.05, duration: 0.8, ease: 'expo.out' }, '-=0.45')
        .fromTo(qs('[data-menu-art]', menu), { opacity: 0, scale: 0.7, rotation: -8, y: 0, yPercent: -40 }, { opacity: 1, scale: 1, rotation: 0, y: 0, yPercent: -50, duration: 1.4, ease: 'elastic.out(1, 0.5)' }, '-=0.9');
    } else {
      menu.style.clipPath = 'none';
    }
    qs('a', menu)?.focus({ preventScroll: true });
  };
  const close = (after) => {
    isOpen = false;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Menü öffnen');
    background.forEach(n => { n.inert = false; });
    setHanger(btn, 'closed');
    const done = () => { menu.hidden = true; lenis?.start(); if (after) after(); };
    if (motion) {
      tl?.kill();
      tl = gsap.timeline({ onComplete: done })
        .to(menu, { clipPath: `circle(0% at ${origin()})`, duration: 0.6, ease: 'expo.inOut' });
    } else {
      done();
    }
  };

  btn.addEventListener('click', () => (isOpen ? close() : open()));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) { close(); btn.focus(); } });
  qsa('a[href^="#"]', menu).forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = qs(a.getAttribute('href'));
      close(() => {
        if (!target) return;
        if (lenis) lenis.scrollTo(target);
        else target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
        focusSection(target);
      });
    });
  });
}

/* ------------------------------ Chrome (top bar, quick bar) ------------------------------ */
function initChrome() {
  const topbar = qs('[data-topbar]');
  const quickbar = qs('[data-quickbar]');
  const menuBtn = qs('[data-menu-btn]');
  const landing = qs('#landing');
  let lastY = window.scrollY;

  const update = () => {
    const y = window.scrollY;
    const pastHero = landing ? landing.getBoundingClientRect().bottom < window.innerHeight * 0.5 : y > 200;
    const goingUp = y < lastY - 2;
    const goingDown = y > lastY + 2;
    if (!pastHero) topbar.classList.remove('is-visible');
    else if (goingUp) topbar.classList.add('is-visible');
    else if (goingDown) topbar.classList.remove('is-visible');
    quickbar?.classList.toggle('is-visible', pastHero);
    menuBtn?.classList.toggle('is-solid', pastHero);
    lastY = y;
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ------------------------------ Motion ------------------------------ */
function initThemeMorph() {
  // The section crossing the 55% line of the viewport decides the page colour.
  const meta = qs('meta[name="theme-color"]');
  const sections = qsa('[data-theme]');
  let current = null;
  const pick = () => {
    const line = window.innerHeight * 0.55;
    const atEnd = window.scrollY >= ScrollTrigger.maxScroll(window) - 2;
    const active = atEnd ? sections[sections.length - 1] : sections.find(s => {
      const r = s.getBoundingClientRect();
      return r.top <= line && r.bottom > line;
    });
    const theme = active ? active.dataset.theme : 'red';
    if (theme === current) return;
    current = theme;
    const color = THEME_BG[theme];
    gsap.to(document.body, { backgroundColor: color, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
    meta?.setAttribute('content', color);
  };
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: pick, onRefresh: pick });
  pick();
}

function initHeroIntro() {
  const root = document.documentElement;
  root.classList.add('is-intro');
  setTimeout(() => root.classList.remove('is-intro'), 2400);
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from('.wardrobe', { y: 60, opacity: 0, duration: 1.4 })
    .fromTo('.schrankgold-title', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.25)
    .from('.scroll-hint', { opacity: 0, y: 20, duration: 1 }, 1);
}

function initTextReveals() {
  qsa('[data-split]').forEach(el => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'line',
      aria: 'none',
      autoSplit: true,
      onSplit: self => gsap.from(self.lines, {
        yPercent: 110,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      })
    });
  });

  qsa('[data-scrub-words]').forEach(el => {
    SplitText.create(el, {
      type: 'words',
      aria: 'none',
      autoSplit: true,
      onSplit: self => gsap.fromTo(self.words, { opacity: 0.16 }, {
        opacity: 1,
        stagger: 0.1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
      })
    });
  });

  qsa('.underline').forEach(u => {
    gsap.fromTo(u, { clipPath: 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 1.2,
      delay: 0.3,
      ease: 'expo.inOut',
      scrollTrigger: { trigger: u, start: 'top 90%', once: true }
    });
  });

  const reveals = qsa('[data-reveal]');
  gsap.set(reveals, { opacity: 0, y: 34 });
  ScrollTrigger.batch(reveals, {
    start: 'top 90%',
    once: true,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 })
  });

  const word = qs('[data-footer-word]');
  if (word) {
    SplitText.create(word, {
      type: 'chars',
      mask: 'chars',
      charsClass: 'char',
      autoSplit: true,
      onSplit: self => gsap.from(self.chars, {
        yPercent: 105,
        duration: 1.3,
        ease: 'expo.out',
        stagger: 0.035,
        scrollTrigger: { trigger: word, start: 'top 92%', once: true }
      })
    });
  }
}

function initParallax() {
  qsa('[data-parallax]').forEach(el => {
    gsap.fromTo(el, { yPercent: 0 }, {
      yPercent: Number(el.dataset.parallax),
      ease: 'none',
      scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });
  gsap.from('.tower', {
    y: 160,
    opacity: 0,
    duration: 1.6,
    ease: 'expo.out',
    stagger: 0.15,
    scrollTrigger: { trigger: '.manifest', start: 'top 70%', once: true }
  });
}

function initStoriesMotion() {
  const cards = qsa('.story-card');
  if (!cards.length) return;
  gsap.from(cards, {
    x: 180,
    rotateY: -28,
    opacity: 0,
    duration: 1.3,
    ease: 'expo.out',
    stagger: 0.07,
    scrollTrigger: { trigger: '[data-stories]', start: 'top 88%', once: true }
  });
  if (!finePointer) return;
  cards.forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, { rotateY: x * 16, rotateX: -y * 16, y: -6, duration: 0.5, ease: 'power3.out', transformPerspective: 900 });
    });
    card.addEventListener('pointerleave', () => {
      gsap.to(card, { rotateY: 0, rotateX: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
    });
  });
}

function initMarquee() {
  const track = qs('.marquee__track');
  if (!track) return;
  const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 30, repeat: -1 });
  loop.totalTime(loop.duration() * 1000); // far from 0, so scrolling up (reverse) never completes it
  let direction = 1;
  ScrollTrigger.create({
    onUpdate: self => {
      direction = self.direction;
      const boost = Math.min(Math.abs(self.getVelocity()) / 350, 5);
      gsap.to(loop, {
        timeScale: direction * (1 + boost),
        duration: 0.2,
        overwrite: true,
        onComplete: () => gsap.to(loop, { timeScale: direction, duration: 1.2, ease: 'power2.out' })
      });
      gsap.to(track, { skewX: gsap.utils.clamp(-10, 10, self.getVelocity() / -260), duration: 0.3, overwrite: 'auto', onComplete: () => gsap.to(track, { skewX: 0, duration: 0.8 }) });
    }
  });
}

function initFeedMotion() {
  const posts = qsa('.post');
  if (!posts.length) return;
  gsap.set(posts, { clipPath: 'inset(100% 0% 0% 0% round 18px)' });
  ScrollTrigger.batch(posts, {
    start: 'top 92%',
    once: true,
    onEnter: batch => {
      gsap.to(batch, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.3, ease: 'expo.out', stagger: 0.09, clearProps: 'clipPath' });
      gsap.from(batch.map(p => p.querySelector('.post__media')), { scale: 1.35, duration: 1.6, ease: 'expo.out', stagger: 0.09 });
    }
  });
}

// Draw a line icon (stroke) from nothing.
function drawIcon(svg, delay = 0) {
  const shapes = qsa('path, rect, circle, ellipse, line', svg);
  shapes.forEach(sh => {
    const len = sh.getTotalLength ? sh.getTotalLength() : 100;
    gsap.fromTo(sh, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.2, delay, ease: 'power2.inOut' });
  });
}

// The tag swings onto the rail like a price tag that was just hung up.
function hangTag(swing, from) {
  const tag = qs('.tag', swing);
  const num = qs('.tag__num', swing);
  const icon = qs('.tag__icon', swing);
  gsap.fromTo(swing, { rotation: from, y: -24, opacity: 0 }, { rotation: 0, y: 0, opacity: 1, duration: 2.2, ease: 'elastic.out(1, 0.32)' });
  if (num) gsap.fromTo(num, { scale: 0.3, rotate: -25, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.9, delay: 0.25, ease: 'back.out(2)' });
  if (icon) drawIcon(icon, 0.35);
  if (tag) gsap.fromTo(qsa('.tag__title, p, .btn', tag), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.3, stagger: 0.08, ease: 'expo.out' });
}

function initSellMotion() {
  const pin = qs('[data-sell-pin]');
  const stage = qs('[data-rail-stage]');
  const fill = qs('[data-rail-fill]');
  const swings = qsa('.hang__swing');
  if (!pin || !stage || !swings.length) return;

  // Inertia: the tags sway when the rail moves, then settle with a little bounce.
  // Uses the CSS "rotate" property (via --sway) so it adds to the hang-in rotation.
  const sway = (amount) => {
    gsap.to(swings, {
      '--sway': i => amount * (i % 2 ? 0.8 : 1),
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto', // only replaces earlier --sway tweens, never the hang-in animation
      onComplete: () => gsap.to(swings, { '--sway': 0, duration: 1.8, ease: 'elastic.out(1, 0.28)', overwrite: 'auto' })
    });
  };

  // Pointer: nudge a tag like touching it
  if (finePointer) {
    swings.forEach(swing => {
      const tag = qs('.tag', swing);
      tag?.addEventListener('pointermove', e => {
        const r = tag.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        gsap.to(swing, { rotation: x * -9, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
      });
      tag?.addEventListener('pointerleave', () => gsap.to(swing, { rotation: 0, duration: 1.8, ease: 'elastic.out(1, 0.3)', overwrite: 'auto' }));
    });
  }

  const mm = gsap.matchMedia();
  const hung = new Set();
  const hang = (swing, i, from) => {
    if (hung.has(swing)) return;
    hung.add(swing);
    hangTag(swing, from ?? (i % 2 ? 30 : -34));
  };

  mm.add('(min-width: 761px)', () => {
    gsap.set(swings, { opacity: 0 });
    hung.clear();
    const distance = () => Math.max(stage.scrollWidth - window.innerWidth, 0);
    // Scroll a bit longer than the travel so every tag gets its moment
    const length = () => '+=' + Math.max(distance() * 1.6, window.innerHeight);
    const tween = gsap.to(stage, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: length,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: self => sway(gsap.utils.clamp(-16, 16, self.getVelocity() / -140))
      }
    });
    if (fill) {
      gsap.fromTo(fill, { scaleX: 0 }, {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: length, scrub: true, invalidateOnRefresh: true }
      });
    }
    swings.forEach((swing, i) => {
      ScrollTrigger.create({
        trigger: swing,
        containerAnimation: tween,
        start: 'left 92%',
        once: true,
        onEnter: () => hang(swing, i)
      });
    });
    // Keyboard: focusing something in an off-screen tag scrolls the rail to it
    const onFocus = e => {
      const st = tween.scrollTrigger;
      const d = distance();
      if (!st || !d) return;
      const item = e.target.closest('.hang');
      if (!item) return;
      const x = item.offsetLeft + item.offsetWidth + parseFloat(getComputedStyle(stage).paddingLeft) - window.innerWidth;
      const y = st.start + gsap.utils.clamp(0, 1, x / d) * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
      hang(item.querySelector('.hang__swing'), 0);
    };
    stage.addEventListener('focusin', onFocus);
    // Tags that are already on screen when the section arrives
    ScrollTrigger.create({
      trigger: stage,
      start: 'top 78%',
      once: true,
      onEnter: () => swings.forEach((swing, i) => {
        if (swing.getBoundingClientRect().left < window.innerWidth * 0.92 && !hung.has(swing)) {
          gsap.delayedCall(i * 0.14, () => hang(swing, i));
        }
      })
    });
    return () => stage.removeEventListener('focusin', onFocus);
  });

  // gsap.matchMedia() resets the scroll position while it rebuilds the rail across
  // the 760/761px breakpoint (e.g. turning a phone); put the visitor back.
  let savedY = window.scrollY;
  window.addEventListener('scroll', () => { savedY = window.scrollY; }, { passive: true });
  window.matchMedia('(max-width: 760px)').addEventListener('change', () => {
    const y = savedY;
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
      lenis?.scrollTo(y, { immediate: true, force: true });
      ScrollTrigger.update();
    });
  });

  mm.add('(max-width: 760px)', () => {
    gsap.set(swings, { opacity: 0 });
    hung.clear();
    swings.forEach((swing, i) => {
      ScrollTrigger.create({ trigger: swing, start: 'top 88%', once: true, onEnter: () => hang(swing, i, i % 2 ? 26 : -26) });
    });
    ScrollTrigger.create({
      trigger: stage,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: self => sway(gsap.utils.clamp(-10, 10, self.getVelocity() / 260))
    });
  });
}

function initHistoryMotion() {
  const paras = qsa('.history__copy p');
  if (!paras.length) return;
  gsap.set(paras, { opacity: 0, y: 34 });
  ScrollTrigger.batch(paras, {
    start: 'top 92%',
    once: true,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1 })
  });
}

function initGabiMotion() {
  const arch = qs('.gabi__arch');
  if (!arch) return;
  gsap.fromTo(arch,
    { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 28px 28px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 28px 28px)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: arch, start: 'top 80%', once: true } });
  gsap.fromTo('.gabi__img', { yPercent: 14, scale: 1.1 }, {
    yPercent: -2,
    scale: 1,
    ease: 'none',
    scrollTrigger: { trigger: arch, start: 'top bottom', end: 'bottom top', scrub: true }
  });
  gsap.from('.gabi__badge', {
    scale: 0.5,
    rotate: -10,
    opacity: 0,
    duration: 1.1,
    ease: 'back.out(1.8)',
    scrollTrigger: { trigger: arch, start: 'top 45%', once: true }
  });
}

function initVisitMotion() {
  gsap.from('.hours__row', {
    x: -40,
    opacity: 0,
    duration: 1,
    ease: 'expo.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '[data-hours]', start: 'top 85%', once: true }
  });
  gsap.fromTo('[data-map-reveal]',
    { clipPath: 'inset(12% 12% 12% 12% round 28px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '[data-map-reveal]', start: 'top 80%', once: true } });
}

function initMagnetic() {
  if (!finePointer) return;
  qsa('[data-magnetic]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }));
  });
}

/* ------------------------------ Boot ------------------------------ */
async function boot() {
  const yearEl = qs('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initMenu();
  initChrome();
  initHours();
  initDirections();
  initMap();

  const hint = qs('.scroll-hint');
  const wardrobeReady = loadWardrobe({
    reducedMotion,
    onProgress: p => { if (hint) hint.style.opacity = String(Math.max(0, 1 - p * 14)); }
  });
  const svgsReady = inlineSvgs();

  if (motion) {
    await wardrobeReady;
    initHeroIntro();
  }

  await initInstagram({ lenis, reducedMotion: !motion });
  await svgsReady;

  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  if (!motion) {
    hashTarget()?.scrollIntoView({ behavior: 'instant' });
    return;
  }

  initSellMotion(); // pins first, so every trigger below accounts for the pin spacing
  initThemeMorph();
  initTextReveals();
  initParallax();
  initStoriesMotion();
  initMarquee();
  initFeedMotion();
  initGabiMotion();
  initHistoryMotion();
  initVisitMotion();
  initMagnetic();
  ScrollTrigger.refresh();

  // The browser jumped to #section before content and pin spacing existed
  const target = hashTarget();
  if (target) {
    lenis?.resize();
    if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
    else target.scrollIntoView();
  }
}

boot();
