// Scroll animations (GSAP + Lenis). Loaded after the page is usable and only
// when the visitor has not asked for reduced motion. Everything is optional:
// without this file the page shows all content in its final state.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { qs, qsa, safe, finePointer } from './lib/dom.js';
import { scrollTo, useLenis } from './lib/scroll.js';
import { restoreHash } from './lib/deeplink.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

/* ------------------------------ Smooth scroll ------------------------------ */
function initSmoothScroll() {
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true });
  useLenis(lenis);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ------------------------------ Text ------------------------------ */
function initTextReveals() {
  // headings rise line by line
  qsa('[data-split]').forEach(el => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'line',
      aria: 'none',
      autoSplit: true,
      onSplit: self => gsap.from(self.lines, {
        yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      })
    });
  });

  // paragraphs light up word by word while scrolling
  qsa('[data-scrub-words]').forEach(el => {
    SplitText.create(el, {
      type: 'words',
      aria: 'none',
      autoSplit: true,
      onSplit: self => gsap.fromTo(self.words, { opacity: 0.16 }, {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: el, start: el.dataset.scrubStart || 'top 80%', end: el.dataset.scrubEnd || 'bottom 45%', scrub: true }
      })
    });
  });

  // gold brush strokes under headings
  qsa('.underline').forEach(u => {
    gsap.fromTo(u, { clipPath: 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, delay: 0.3, ease: 'expo.inOut',
      scrollTrigger: { trigger: u, start: 'top 90%', once: true }
    });
  });

  // everything marked data-reveal fades up
  const reveals = qsa('[data-reveal]');
  gsap.set(reveals, { opacity: 0, y: 34 });
  ScrollTrigger.batch(reveals, {
    start: 'top 90%',
    once: true,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 })
  });

  // the big wordmark in the footer
  const word = qs('[data-footer-word]');
  if (word) {
    SplitText.create(word, {
      type: 'chars',
      mask: 'chars',
      charsClass: 'char',
      autoSplit: true,
      onSplit: self => gsap.from(self.chars, {
        yPercent: 105, duration: 1.3, ease: 'expo.out', stagger: 0.035,
        scrollTrigger: { trigger: word, start: 'top 92%', once: true }
      })
    });
  }
}

// Draw a line icon (stroke) from nothing
function drawIcon(svg, delay = 0) {
  qsa('path, rect, circle, ellipse, line', svg).forEach(shape => {
    const length = shape.getTotalLength ? shape.getTotalLength() : 100;
    gsap.fromTo(shape, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.2, delay, ease: 'power2.inOut' });
  });
}

/* ------------------------------ Sections ------------------------------ */
function initParallax() {
  qsa('[data-parallax]').forEach(el => {
    gsap.fromTo(el, { yPercent: 0 }, {
      yPercent: Number(el.dataset.parallax), ease: 'none',
      scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });
  gsap.from('.tower', {
    y: 160, opacity: 0, duration: 1.6, ease: 'expo.out', stagger: 0.15,
    scrollTrigger: { trigger: '.manifest', start: 'top 70%', once: true }
  });
}

function initPillars() {
  const items = qsa('.pillar');
  if (!items.length) return;
  gsap.set(items, { opacity: 0, y: 24 });
  ScrollTrigger.create({
    trigger: '.pillars', start: 'top 88%', once: true,
    onEnter: () => {
      gsap.to(items, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.12 });
      items.forEach((item, i) => drawIcon(qs('.pillar__icon', item), 0.15 + i * 0.12));
    }
  });
}

function initStories() {
  const cards = qsa('.story-card');
  if (!cards.length) return;
  gsap.from(cards, {
    x: 180, rotateY: -28, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07,
    scrollTrigger: { trigger: '[data-stories]', start: 'top 88%', once: true }
  });
  if (!finePointer) return;
  cards.forEach(card => { // cards tilt towards the mouse
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      gsap.to(card, {
        rotateY: ((e.clientX - r.left) / r.width - 0.5) * 16,
        rotateX: -((e.clientY - r.top) / r.height - 0.5) * 16,
        y: -6, duration: 0.5, ease: 'power3.out', transformPerspective: 900
      });
    });
    card.addEventListener('pointerleave', () => gsap.to(card, { rotateY: 0, rotateX: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' }));
  });
}

function initFeed() {
  const posts = qsa('.post');
  if (!posts.length) return;
  gsap.set(posts, { clipPath: 'inset(100% 0% 0% 0% round 18px)' });
  ScrollTrigger.batch(posts, {
    start: 'top 92%',
    once: true,
    onEnter: batch => {
      gsap.to(batch, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.3, ease: 'expo.out', stagger: 0.09, clearProps: 'clipPath' });
      gsap.from(batch.map(post => qs('.post__media', post)), { scale: 1.35, duration: 1.6, ease: 'expo.out', stagger: 0.09 });
    }
  });
}

// The steps hang like price tags on a clothes rail
function hangTag(swing, from) {
  const tag = qs('.tag', swing);
  const num = qs('.tag__num', swing);
  const icon = qs('.tag__icon', swing);
  gsap.fromTo(swing, { rotation: from, y: -24, opacity: 0 }, { rotation: 0, y: 0, opacity: 1, duration: 2.2, ease: 'elastic.out(1, 0.32)' });
  if (num) gsap.fromTo(num, { scale: 0.3, rotate: -25, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.9, delay: 0.25, ease: 'back.out(2)' });
  if (icon) drawIcon(icon, 0.35);
  if (tag) gsap.fromTo(qsa('.tag__title, p, .btn', tag), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.3, stagger: 0.08, ease: 'expo.out' });
}

function initSell() {
  const pin = qs('[data-sell-pin]');
  const stage = qs('[data-rail-stage]');
  const fill = qs('[data-rail-fill]');
  const swings = qsa('.hang__swing');
  if (!pin || !stage || !swings.length) return;

  // Tags sway when the rail moves and settle with a little bounce.
  // The CSS "rotate" property (via --sway) adds to the hang-in rotation.
  const sway = amount => gsap.to(swings, {
    '--sway': i => amount * (i % 2 ? 0.8 : 1),
    duration: 0.35,
    ease: 'power2.out',
    overwrite: 'auto',
    onComplete: () => gsap.to(swings, { '--sway': 0, duration: 1.8, ease: 'elastic.out(1, 0.28)', overwrite: 'auto' })
  });

  if (finePointer) { // nudge a tag like touching it
    swings.forEach(swing => {
      const tag = qs('.tag', swing);
      tag?.addEventListener('pointermove', e => {
        const r = tag.getBoundingClientRect();
        gsap.to(swing, { rotation: ((e.clientX - r.left) / r.width - 0.5) * -9, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
      });
      tag?.addEventListener('pointerleave', () => gsap.to(swing, { rotation: 0, duration: 1.8, ease: 'elastic.out(1, 0.3)', overwrite: 'auto' }));
    });
  }

  const hung = new Set();
  const hang = (swing, i, from) => {
    if (hung.has(swing)) return;
    hung.add(swing);
    hangTag(swing, from ?? (i % 2 ? 30 : -34));
  };

  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    document.documentElement.classList.add('has-rail');
    gsap.set(swings, { opacity: 0 });
    hung.clear();
    const distance = () => Math.max(stage.scrollWidth - window.innerWidth, 0);
    const length = () => '+=' + Math.max(distance() * 1.6, window.innerHeight); // a bit longer than the travel, so every tag gets its moment
    const tween = gsap.to(stage, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin, start: 'top top', end: length, pin: true, scrub: 1, invalidateOnRefresh: true,
        refreshPriority: 1, // pin first, so triggers further down account for its spacing
        onUpdate: self => sway(gsap.utils.clamp(-16, 16, self.getVelocity() / -140))
      }
    });
    if (fill) {
      gsap.fromTo(fill, { scaleX: 0 }, {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: length, scrub: true, invalidateOnRefresh: true }
      });
    }
    swings.forEach((swing, i) => ScrollTrigger.create({
      trigger: swing, containerAnimation: tween, start: 'left 92%', once: true, onEnter: () => hang(swing, i)
    }));
    // keyboard: focusing something in an off-screen tag scrolls the rail to it
    const onFocus = e => {
      const st = tween.scrollTrigger;
      const item = e.target.closest('.hang');
      const d = distance();
      if (!st || !item || !d) return;
      const x = item.offsetLeft + item.offsetWidth + parseFloat(getComputedStyle(stage).paddingLeft) - window.innerWidth;
      scrollTo(st.start + gsap.utils.clamp(0, 1, x / d) * (st.end - st.start), { immediate: true });
      hang(item.querySelector('.hang__swing'), 0);
    };
    stage.addEventListener('focusin', onFocus);
    // tags that are already on screen when the section arrives
    ScrollTrigger.create({
      trigger: stage, start: 'top 78%', once: true,
      onEnter: () => swings.forEach((swing, i) => {
        if (swing.getBoundingClientRect().left < window.innerWidth * 0.92 && !hung.has(swing)) gsap.delayedCall(i * 0.14, () => hang(swing, i));
      })
    });
    return () => {
      stage.removeEventListener('focusin', onFocus);
      document.documentElement.classList.remove('has-rail');
    };
  });

  // gsap.matchMedia() resets the scroll position while it rebuilds the rail across
  // the 760/761px breakpoint (e.g. turning a phone); put the visitor back.
  let savedY = window.scrollY;
  window.addEventListener('scroll', () => { savedY = window.scrollY; }, { passive: true });
  window.matchMedia('(max-width: 760px)').addEventListener('change', () => {
    const y = savedY;
    requestAnimationFrame(() => {
      scrollTo(y, { immediate: true });
      ScrollTrigger.update();
    });
  });

  mm.add('(max-width: 760px)', () => {
    gsap.set(swings, { opacity: 0 });
    hung.clear();
    swings.forEach((swing, i) => ScrollTrigger.create({
      trigger: swing, start: 'top 88%', once: true, onEnter: () => hang(swing, i, i % 2 ? 26 : -26)
    }));
    ScrollTrigger.create({
      trigger: stage, start: 'top bottom', end: 'bottom top',
      onUpdate: self => sway(gsap.utils.clamp(-10, 10, self.getVelocity() / 260))
    });
  });
}

function initGabi() {
  const arch = qs('.gabi__arch');
  if (!arch) return;
  const round = 'round 999px 999px 28px 28px';
  gsap.fromTo(arch, { clipPath: `inset(100% 0% 0% 0% ${round})` }, {
    clipPath: `inset(0% 0% 0% 0% ${round})`, duration: 1.6, ease: 'expo.inOut',
    scrollTrigger: { trigger: arch, start: 'top 80%', once: true }
  });
  gsap.fromTo('.gabi__img', { yPercent: 14, scale: 1.1 }, {
    yPercent: -2, scale: 1, ease: 'none',
    scrollTrigger: { trigger: arch, start: 'top bottom', end: 'bottom top', scrub: true }
  });
  gsap.from('.gabi__badge', {
    scale: 0.5, rotate: -10, opacity: 0, duration: 1.1, ease: 'back.out(1.8)',
    scrollTrigger: { trigger: arch, start: 'top 45%', once: true }
  });
}

function initHistory() {
  const paragraphs = qsa('.history__copy p');
  if (!paragraphs.length) return;
  gsap.set(paragraphs, { opacity: 0, y: 34 });
  ScrollTrigger.batch(paragraphs, {
    start: 'top 92%',
    once: true,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1 })
  });
}

function initVisit() {
  gsap.from('.hours__row', {
    x: -40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08,
    scrollTrigger: { trigger: '[data-hours]', start: 'top 85%', once: true }
  });
  gsap.fromTo('[data-map-reveal]', { clipPath: 'inset(12% 12% 12% 12% round 28px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.6, ease: 'expo.inOut',
    scrollTrigger: { trigger: '[data-map-reveal]', start: 'top 80%', once: true }
  });
}

// Buttons are drawn towards the mouse
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

/* ------------------------------ Entry ------------------------------ */
export async function initMotion() {
  if (document.fonts?.ready) await document.fonts.ready; // line breaks must be final before text is split
  document.documentElement.classList.add('has-motion');

  safe(initSmoothScroll);
  safe(initSell); // pins first, so every trigger below accounts for the pin spacing
  safe(initTextReveals);
  safe(initParallax);
  safe(initStories);
  safe(initPillars);
  safe(initFeed);
  safe(initGabi);
  safe(initHistory);
  safe(initVisit);
  safe(initMagnetic);

  ScrollTrigger.refresh();
  // layout can settle late (images, a hidden tab, filtering the feed)
  window.addEventListener('load', () => ScrollTrigger.refresh());
  window.addEventListener('sg:relayout', () => ScrollTrigger.refresh());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ScrollTrigger.refresh(); });
  restoreHash(); // the browser jumped to #section before the pinned sections existed
}
