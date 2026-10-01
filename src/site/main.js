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
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: { offset: -64 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
}

/* ------------------------------ Inline SVGs ------------------------------ */
function inlineSvgs() {
  return Promise.all(qsa('[data-inline-svg]').map(node =>
    fetch(node.dataset.inlineSvg).then(r => r.text()).then(svg => { node.innerHTML = svg; }).catch(() => {})
  ));
}

/* ------------------------------ Menu ------------------------------ */
function initMenu() {
  const btn = qs('[data-menu-btn]');
  const menu = qs('[data-menu]');
  if (!btn || !menu) return;
  let isOpen = false;
  let tl = null;

  const open = () => {
    isOpen = true;
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Menü schließen');
    lenis?.stop();
    if (motion) {
      tl?.kill();
      tl = gsap.timeline()
        .fromTo(menu, { clipPath: 'circle(0% at calc(100% - 50px) 38px)' }, { clipPath: 'circle(150% at calc(100% - 50px) 38px)', duration: 0.9, ease: 'expo.inOut' })
        .fromTo(qsa('[data-menu-link]', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 0.8, ease: 'expo.out' }, '-=0.45');
    } else {
      menu.style.clipPath = 'none';
    }
    qs('a', menu)?.focus({ preventScroll: true });
  };
  const close = (after) => {
    isOpen = false;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Menü öffnen');
    const done = () => { menu.hidden = true; lenis?.start(); if (after) after(); };
    if (motion) {
      tl?.kill();
      tl = gsap.timeline({ onComplete: done })
        .to(menu, { clipPath: 'circle(0% at calc(100% - 50px) 38px)', duration: 0.6, ease: 'expo.inOut' });
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
        if (lenis) lenis.scrollTo(target, { offset: -64 });
        else target.scrollIntoView({ behavior: 'smooth' });
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

/* ------------------------------ Calculator ------------------------------ */
function initCalculator() {
  const input = qs('[data-calc-input]');
  const priceOut = qs('[data-calc-price]');
  const payoutOut = qs('[data-calc-payout]');
  if (!input || !priceOut || !payoutOut) return;
  const eur = v => v.toLocaleString('de-DE', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
  const state = { payout: Number(input.value) * 0.4 };
  const render = () => {
    priceOut.textContent = eur(Number(input.value));
    if (motion) {
      gsap.to(state, {
        payout: Number(input.value) * 0.4,
        duration: 0.6,
        ease: 'power3.out',
        overwrite: true,
        onUpdate: () => { payoutOut.textContent = eur(Math.round(state.payout * 100) / 100); }
      });
    } else {
      payoutOut.textContent = eur(Number(input.value) * 0.4);
    }
  };
  input.addEventListener('input', render);
  render();
}

/* ------------------------------ Motion ------------------------------ */
function initThemeMorph() {
  // The section crossing the 55% line of the viewport decides the page colour.
  const meta = qs('meta[name="theme-color"]');
  const sections = qsa('[data-theme]');
  let current = null;
  const pick = () => {
    const line = window.innerHeight * 0.55;
    const active = sections.find(s => {
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
      autoSplit: true,
      onSplit: self => gsap.fromTo(self.words, { opacity: 0.16 }, {
        opacity: 1,
        stagger: 0.1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
      })
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
    yPercent: 40,
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

function initSellMotion() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const pin = qs('[data-sell-pin]');
    const track = qs('[data-sell-track]');
    if (!pin || !track) return;
    const distance = () => Math.max(track.scrollWidth - window.innerWidth, 0);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => '+=' + Math.max(distance(), window.innerHeight * 0.6),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true
      }
    });
    gsap.fromTo('[data-sell-progress]', { scaleX: 0 }, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + Math.max(distance(), window.innerHeight * 0.6), scrub: true, invalidateOnRefresh: true }
    });
    qsa('.step', track).forEach(step => {
      gsap.fromTo(step, { opacity: 0.35, scale: 0.9, rotate: 3 }, {
        opacity: 1,
        scale: 1,
        rotate: 0,
        ease: 'none',
        scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left 95%', end: 'left 55%', scrub: true }
      });
    });
  });
  mm.add('(max-width: 760px)', () => {
    gsap.utils.toArray('.step').forEach(step => {
      gsap.from(step, { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: step, start: 'top 90%', once: true } });
    });
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

  const story = qs('[data-story]');
  story?.addEventListener('toggle', () => {
    if (story.open) {
      gsap.from(qsa('.story__body p', story), { y: 24, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 });
    }
    ScrollTrigger.refresh();
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
  initCalculator();
  initDirections();
  initMap();

  const hint = qs('.scroll-hint');
  const wardrobeReady = loadWardrobe({
    reducedMotion: !motion,
    onProgress: p => { if (hint) hint.style.opacity = String(Math.max(0, 1 - p * 14)); }
  });
  const svgsReady = inlineSvgs();

  if (motion) {
    await wardrobeReady;
    initHeroIntro();
  }

  await initInstagram({ lenis, reducedMotion: !motion });
  await svgsReady;

  if (!motion) return;
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  initThemeMorph();
  initTextReveals();
  initParallax();
  initStoriesMotion();
  initMarquee();
  initFeedMotion();
  initSellMotion();
  initGabiMotion();
  initVisitMotion();
  initMagnetic();
  ScrollTrigger.refresh();
}

boot();
