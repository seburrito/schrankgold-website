// Full-screen story viewer (like Instagram): progress bars, tap left/right,
// press and hold to pause, swipe down to close, keyboard control. Uses the
// Web Animations API, so it needs no animation library.

import { qs, qsa, el, reducedMotion } from '../../lib/dom.js';
import { startScroll, stopScroll } from '../../lib/scroll.js';
import { PROFILE_URL, isVideo, seenStories } from './data.js';

const IMAGE_MS = 5000;
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const SOUND = {
  off: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"></path><path d="M22 9l-6 6M16 9l6 6"></path></svg>',
  on: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"></path></svg>'
};

const animate = (node, keyframes, options) => (reducedMotion ? null : node.animate(keyframes, options));

export function createViewer(slides) {
  const root = qs('[data-viewer]');
  const frame = qs('[data-viewer-frame]', root);
  const backdrop = qs('.viewer__backdrop', root);
  const media = qs('[data-viewer-media]', root);
  const soundBtn = qs('[data-viewer-sound]', root);
  const seen = seenStories.read();

  let index = 0;
  let opener = null;
  let video = null;
  let progress = null; // running animation of the current bar
  let raf = 0;
  let muted = true;

  const bars = qs('[data-viewer-bars]', root);
  bars.textContent = '';
  const fills = slides.map(() => {
    const fill = el('i');
    const bar = el('span', 'viewer__bar');
    bar.append(fill);
    bars.append(bar);
    return fill;
  });
  const setBar = (fill, value) => { fill.style.transform = `scaleX(${value})`; };

  function stopProgress() {
    progress?.cancel();
    progress = null;
    cancelAnimationFrame(raf);
    video?.pause();
  }

  function updateSound() {
    soundBtn.setAttribute('aria-label', muted ? 'Ton einschalten' : 'Ton ausschalten');
    soundBtn.innerHTML = muted ? SOUND.off : SOUND.on;
  }

  function show(i) {
    stopProgress();
    index = i;
    const slide = slides[i];
    fills.forEach((fill, n) => setBar(fill, n < i ? 1 : 0));
    qs('[data-viewer-time]', root).textContent = slide.time || '';
    qs('[data-viewer-caption]', root).textContent = slide.label || '';
    qs('[data-viewer-link]', root).href = slide.link || PROFILE_URL;
    media.textContent = '';
    video = null;
    soundBtn.hidden = true;
    seen.add(slide.id);
    seenStories.write(seen);
    qsa('.story-card')[i]?.classList.add('is-seen');

    if (isVideo(slide.type) && slide.src) {
      video = el('video', '', { playsinline: '', autoplay: '' });
      video.muted = muted;
      video.src = slide.src;
      if (slide.image) video.poster = slide.image;
      video.addEventListener('ended', next);
      media.append(video);
      soundBtn.hidden = false;
      updateSound();
      video.play().catch(() => {});
      const tick = () => {
        if (video?.duration) setBar(fills[i], video.currentTime / video.duration);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else {
      if (slide.type === 'PLACEHOLDER') media.append(el('span', 'ph'));
      else media.append(el('img', '', { src: slide.image || slide.src, alt: slide.label || 'Instagram-Story', decoding: 'async' }));
      progress = fills[i].animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: IMAGE_MS, easing: 'linear', fill: 'forwards' });
      progress.onfinish = next;
    }
    animate(media, [{ opacity: 0.4, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'ease-out' });
  }

  const next = () => (index < slides.length - 1 ? show(index + 1) : close());
  const prev = () => show(Math.max(index - 1, 0));
  const pause = () => { progress?.pause(); video?.pause(); };
  const resume = () => { progress?.play(); video?.play().catch(() => {}); };

  function open(i, from) {
    opener = from || document.activeElement;
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    stopScroll();
    show(i);
    qs('.viewer__icon-btn[data-viewer-close]', root)?.focus({ preventScroll: true });
    animate(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
    if (from) {
      // the story grows out of its card
      const a = from.getBoundingClientRect();
      const b = frame.getBoundingClientRect();
      animate(frame, [
        { transform: `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${a.width / b.width})` },
        { transform: 'none' }
      ], { duration: 700, easing: EASE_OUT });
    }
    document.addEventListener('keydown', onKey);
  }

  function close() {
    stopProgress();
    document.removeEventListener('keydown', onKey);
    const finish = () => {
      frame.style.transform = '';
      root.hidden = true;
      media.textContent = '';
      video = null;
      document.documentElement.style.overflow = '';
      startScroll();
      opener?.focus?.({ preventScroll: true });
    };
    const out = animate(frame, [{ transform: frame.style.transform || 'none', opacity: 1 }, { transform: 'scale(0.9)', opacity: 0 }], { duration: 300, easing: 'ease-in' });
    animate(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
    if (out) out.onfinish = finish; else finish();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Tab') {
      // keep keyboard focus inside the viewer
      const focusable = qsa('button:not([hidden]), a[href]', root).filter(node => node.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  // Tap left/right to navigate, press and hold to pause
  qsa('[data-viewer-prev], [data-viewer-next]', root).forEach(btn => {
    const go = btn.hasAttribute('data-viewer-next') ? next : prev;
    let pressedAt = 0;
    btn.addEventListener('pointerdown', () => { pressedAt = performance.now(); pause(); });
    btn.addEventListener('pointerup', () => { if (performance.now() - pressedAt < 250) go(); else resume(); });
    btn.addEventListener('pointerleave', () => { if (pressedAt) { pressedAt = 0; resume(); } });
    btn.addEventListener('click', e => { if (e.detail === 0) go(); }); // keyboard
  });
  qsa('[data-viewer-close]', root).forEach(btn => btn.addEventListener('click', close));
  soundBtn.addEventListener('click', () => {
    muted = !muted;
    if (video) video.muted = muted;
    updateSound();
  });

  // Swipe down to close (touch)
  let startY = null;
  frame.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  frame.addEventListener('touchmove', e => {
    if (startY == null) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0 && !reducedMotion) frame.style.transform = `translateY(${dy * 0.6}px) scale(${1 - dy / 2000})`;
  }, { passive: true });
  frame.addEventListener('touchend', e => {
    if (startY == null) return;
    const dy = e.changedTouches[0].clientY - startY;
    startY = null;
    if (dy > 110) return close();
    animate(frame, [{ transform: frame.style.transform || 'none' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
    frame.style.transform = '';
  });

  return { open };
}
