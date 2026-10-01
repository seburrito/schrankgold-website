// Instagram: stories strip, story viewer and the "Neu im Schrank" feed.
// Data comes from the JSON files written by prebuild-instagram.js:
//   instagram-stories.json  -> live stories (last 24 h)
//   instagram-feed.json     -> latest posts / reels
// If there are no live stories, the strip falls back to the latest posts.
// If there is no data at all, branded placeholders link to the profile.

const PROFILE_URL = 'https://www.instagram.com/_schrankgold';
const CROWN = 'assets/sidebar-crown-icon.svg';
const FEED_LAYOUT = ['is-big', '', '', '', 'is-tall', '', '', 'is-wide', '', '', '', ''];

// Placeholders carry no invented copy – only the account handle.
const PLACEHOLDER_STORY_COUNT = 6;
const PLACEHOLDER_POST_TYPES = ['REEL', 'IMAGE', 'CAROUSEL_ALBUM', 'IMAGE', 'REEL', 'IMAGE', 'IMAGE', 'CAROUSEL_ALBUM', 'REEL'];
const HANDLE = '_schrankgold';

async function loadJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    return [];
  }
}

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) node.setAttribute(k, v);
  }
  return node;
}

function isVideo(type) { return type === 'VIDEO' || type === 'REEL'; }

function firstLine(text, max = 70) {
  const line = (text || '').split('\n').map(s => s.trim()).find(Boolean) || '';
  return line.length > max ? line.slice(0, max - 1).trimEnd() + '…' : line;
}

function ago(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `vor ${Math.max(mins, 1)} Min.`;
  if (mins < 24 * 60) return `vor ${Math.round(mins / 60)} Std.`;
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function placeholder(label, bg) {
  const ph = el('span', 'ph');
  if (bg) ph.style.setProperty('--ph-bg', bg);
  ph.append(el('img', '', { src: CROWN, alt: '' }));
  if (label) {
    const txt = el('span');
    txt.textContent = label;
    ph.append(txt);
  }
  return ph;
}

function readSeen() {
  try { return new Set(JSON.parse(localStorage.getItem('sg-seen-stories') || '[]')); } catch (e) { return new Set(); }
}
function writeSeen(set) {
  try { localStorage.setItem('sg-seen-stories', JSON.stringify([...set].slice(-60))); } catch (e) { /* storage unavailable */ }
}

/* ------------------------------------------------------------------ */

export async function initInstagram({ lenis, reducedMotion }) {
  const [stories, feed] = await Promise.all([loadJson('instagram-stories.json'), loadJson('instagram-feed.json')]);

  // ---- Story list (live -> latest posts -> placeholders)
  let mode = 'live';
  let slides = stories.map(s => ({
    id: s.id,
    type: s.type,
    src: isVideo(s.type) ? s.videoUrl : s.image,
    poster: s.image,
    label: '',
    time: ago(s.timestamp),
    link: s.permalink || PROFILE_URL
  }));
  if (!slides.length && feed.length) {
    mode = 'latest';
    slides = feed.slice(0, 8).map(p => ({
      id: p.id,
      type: p.type,
      src: isVideo(p.type) && p.videoUrl ? p.videoUrl : p.image,
      poster: p.image,
      label: firstLine(p.caption),
      time: ago(p.timestamp),
      link: p.permalink || PROFILE_URL
    }));
  }
  if (!slides.length) {
    mode = 'placeholder';
    slides = Array.from({ length: PLACEHOLDER_STORY_COUNT }, (_, i) => ({ id: 'ph-' + i, type: 'PLACEHOLDER', label: '', time: '', link: PROFILE_URL }));
  }

  const viewer = createViewer({ slides, lenis, reducedMotion });
  renderStories(slides, viewer);
  renderFeed(feed, reducedMotion);
  initStripNav();
  return { mode };
}

/* ---------------------------- Stories strip ---------------------------- */

function renderStories(slides, viewer) {
  const track = document.querySelector('[data-stories]');
  if (!track) return;
  const seen = readSeen();
  track.textContent = '';
  slides.forEach((s, i) => {
    const card = el('button', 'story-card', { type: 'button', 'aria-label': s.label ? `Story ansehen: ${s.label}` : 'Story ansehen' });
    if (seen.has(s.id)) card.classList.add('is-seen');
    const media = el('span', 'story-card__media');
    if (s.type === 'PLACEHOLDER') {
      media.append(placeholder(''));
    } else {
      media.append(el('img', '', { src: s.poster || s.src, alt: '', loading: 'lazy' }));
    }
    const meta = el('span', 'story-card__meta');
    const time = el('span', 'story-card__time');
    time.textContent = s.time;
    const label = el('span', 'story-card__label');
    label.textContent = s.label || HANDLE;
    meta.append(time, label);
    card.append(el('span', 'story-card__ring'), media, meta);
    if (isVideo(s.type)) {
      const play = el('span', 'story-card__play');
      play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';
      card.append(play);
    }
    card.addEventListener('click', () => viewer.open(i, card));
    track.append(card);
  });
}

function initStripNav() {
  const track = document.querySelector('[data-stories]');
  const prev = document.querySelector('[data-strip-prev]');
  const next = document.querySelector('[data-strip-next]');
  if (!track) return;
  const step = () => (track.querySelector('.story-card')?.offsetWidth || 240) * 2 + 36;
  prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

  // Drag to scroll with the mouse (touch scrolls natively)
  let down = false; let startX = 0; let startLeft = 0; let moved = false;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
  });
  window.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) { moved = true; track.style.scrollSnapType = 'none'; }
    track.scrollLeft = startLeft - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    track.style.scrollSnapType = '';
  });
  track.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
}

/* ------------------------------- Feed ------------------------------- */

const BADGES = {
  reel: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path class="solid" d="M8 5v14l11-7z"></path></svg>',
  album: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="13" height="13" rx="2"></rect><path d="M4 16V6a2 2 0 0 1 2-2h10"></path></svg>',
  photo: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle></svg>'
};

function renderFeed(feed, reducedMotion) {
  const grid = document.querySelector('[data-feed]');
  if (!grid) return;
  grid.textContent = '';
  const items = feed.length
    ? feed.slice(0, 12)
    : PLACEHOLDER_POST_TYPES.map((type, i) => ({ id: 'ph' + i, type, caption: '', placeholder: true }));

  items.forEach((item, i) => {
    const reel = isVideo(item.type);
    const post = el('a', 'post', {
      href: item.permalink || PROFILE_URL,
      target: '_blank',
      rel: 'noopener',
      'data-kind': reel ? 'reel' : 'photo'
    });
    if (FEED_LAYOUT[i]) post.classList.add(FEED_LAYOUT[i]);
    const media = el('div', 'post__media');
    if (item.placeholder) {
      media.append(placeholder('', i % 2 ? '#34111F' : null));
    } else if (reel && item.videoUrl && !reducedMotion) {
      const video = el('video', '', { muted: '', loop: '', playsinline: '', preload: 'none', poster: item.image });
      video.muted = true;
      video.src = item.videoUrl;
      media.append(video);
    } else {
      media.append(el('img', '', { src: item.image, alt: '', loading: 'lazy' }));
    }
    const badge = el('span', 'post__badge');
    badge.innerHTML = reel ? BADGES.reel : item.type === 'CAROUSEL_ALBUM' ? BADGES.album : BADGES.photo;
    const text = firstLine(item.caption, 110);
    post.setAttribute('aria-label', (reel ? 'Instagram-Reel' : 'Instagram-Beitrag') + (text ? ': ' + text : ''));
    post.append(media, badge);
    if (text) {
      const caption = el('p', 'post__caption');
      caption.textContent = text;
      post.append(caption);
    }
    grid.append(post);
  });

  // Play reels only while they are on screen
  const videos = grid.querySelectorAll('video');
  if (videos.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.play().catch(() => {});
        else e.target.pause();
      });
    }, { threshold: 0.4 });
    videos.forEach(v => io.observe(v));
  }

  initFeedFilter(grid);
}

function initFeedFilter(grid) {
  const tabs = document.querySelectorAll('[data-filter]');
  const gsap = window.gsap;
  const Flip = window.Flip;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;
      tabs.forEach(t => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      const posts = [...grid.querySelectorAll('.post')];
      const state = Flip && gsap ? Flip.getState(posts) : null;
      posts.forEach(p => { p.hidden = !(filter === 'all' || p.dataset.kind === filter); });
      if (state) {
        Flip.from(state, {
          duration: 0.7,
          ease: 'power3.inOut',
          stagger: 0.03,
          absolute: true,
          onEnter: els => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }),
          onLeave: els => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.4 })
        });
      }
    });
  });
}

/* ---------------------------- Story viewer ---------------------------- */

function createViewer({ slides, lenis, reducedMotion }) {
  const root = document.querySelector('[data-viewer]');
  const frame = root.querySelector('[data-viewer-frame]');
  const bars = root.querySelector('[data-viewer-bars]');
  const media = root.querySelector('[data-viewer-media]');
  const timeEl = root.querySelector('[data-viewer-time]');
  const captionEl = root.querySelector('[data-viewer-caption]');
  const linkEl = root.querySelector('[data-viewer-link]');
  const soundBtn = root.querySelector('[data-viewer-sound]');
  const gsap = window.gsap;
  const IMAGE_SECONDS = 5;

  let index = 0;
  let opener = null;
  let tween = null;
  let video = null;
  let raf = 0;
  let muted = true;
  const seen = readSeen();

  bars.textContent = '';
  const barFills = slides.map(() => {
    const bar = el('span', 'viewer__bar');
    const fill = el('i');
    bar.append(fill);
    bars.append(bar);
    return fill;
  });

  function setBar(fill, v) { fill.style.transform = `scaleX(${v})`; }

  function stopProgress() {
    if (tween) { tween.kill(); tween = null; }
    cancelAnimationFrame(raf);
    if (video) { video.pause(); }
  }

  function show(i) {
    stopProgress();
    index = i;
    const s = slides[i];
    barFills.forEach((f, n) => setBar(f, n < i ? 1 : 0));
    timeEl.textContent = s.time || '';
    captionEl.textContent = s.label || '';
    linkEl.href = s.link || PROFILE_URL;
    media.textContent = '';
    video = null;
    soundBtn.hidden = true;
    seen.add(s.id);
    writeSeen(seen);
    document.querySelectorAll('.story-card')[i]?.classList.add('is-seen');

    if (isVideo(s.type) && s.src) {
      video = el('video', '', { playsinline: '', autoplay: '', poster: s.poster });
      video.muted = muted;
      video.src = s.src;
      media.append(video);
      soundBtn.hidden = false;
      updateSound();
      video.addEventListener('ended', next);
      video.play().catch(() => {});
      const tick = () => {
        if (video && video.duration) setBar(barFills[i], video.currentTime / video.duration);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else {
      if (s.type === 'PLACEHOLDER') {
        media.append(placeholder(''));
      } else {
        media.append(el('img', '', { src: s.src, alt: s.label || 'Instagram-Story' }));
      }
      const fill = barFills[i];
      if (gsap) {
        tween = gsap.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: IMAGE_SECONDS, ease: 'none', onComplete: next });
      } else {
        setBar(fill, 1);
      }
    }
    if (gsap && !reducedMotion) {
      gsap.fromTo(media, { opacity: 0.4, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' });
    }
  }

  function pause() { if (tween) tween.pause(); if (video) video.pause(); }
  function resume() { if (tween) tween.resume(); if (video) video.play().catch(() => {}); }
  function next() { index < slides.length - 1 ? show(index + 1) : close(); }
  function prev() { index > 0 ? show(index - 1) : show(0); }

  function updateSound() {
    soundBtn.setAttribute('aria-label', muted ? 'Ton einschalten' : 'Ton ausschalten');
    soundBtn.innerHTML = muted
      ? '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"></path><path d="M22 9l-6 6M16 9l6 6"></path></svg>'
      : '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"></path></svg>';
  }
  soundBtn.addEventListener('click', () => {
    muted = !muted;
    if (video) video.muted = muted;
    updateSound();
  });

  function open(i, from) {
    opener = from || document.activeElement;
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    lenis?.stop();
    show(i);
    root.querySelector('.viewer__icon-btn[data-viewer-close]')?.focus({ preventScroll: true });
    if (gsap && !reducedMotion) {
      gsap.fromTo(root.querySelector('.viewer__backdrop'), { opacity: 0 }, { opacity: 1, duration: 0.4 });
      if (from) {
        const a = from.getBoundingClientRect();
        const b = frame.getBoundingClientRect();
        gsap.fromTo(frame,
          { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), scale: a.width / b.width, borderRadius: 22 },
          { x: 0, y: 0, scale: 1, duration: 0.7, ease: 'expo.out', clearProps: 'transform' });
      }
    }
    document.addEventListener('keydown', onKey);
  }

  function close() {
    stopProgress();
    document.removeEventListener('keydown', onKey);
    const finish = () => {
      root.hidden = true;
      media.textContent = '';
      video = null;
      document.documentElement.style.overflow = '';
      lenis?.start();
      opener?.focus?.({ preventScroll: true });
    };
    if (gsap && !reducedMotion) {
      gsap.to(frame, { scale: 0.9, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => { gsap.set(frame, { clearProps: 'all' }); finish(); } });
      gsap.to(root.querySelector('.viewer__backdrop'), { opacity: 0, duration: 0.3 });
    } else {
      finish();
    }
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Tab') {
      const focusables = [...root.querySelectorAll('button:not([hidden]), a[href]')].filter(n => n.offsetParent !== null);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  // Tap left/right to navigate, press and hold to pause (like Instagram)
  root.querySelectorAll('[data-viewer-prev], [data-viewer-next]').forEach(btn => {
    const go = btn.hasAttribute('data-viewer-next') ? next : prev;
    let t0 = 0;
    btn.addEventListener('pointerdown', () => { t0 = performance.now(); pause(); });
    btn.addEventListener('pointerup', () => {
      if (performance.now() - t0 < 250) go(); else resume();
    });
    btn.addEventListener('pointerleave', () => { if (t0) { t0 = 0; resume(); } });
    btn.addEventListener('click', e => { if (e.detail === 0) go(); }); // keyboard
  });
  root.querySelectorAll('[data-viewer-close]').forEach(b => b.addEventListener('click', close));

  // Swipe down to close (touch)
  let startY = null;
  frame.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  frame.addEventListener('touchmove', e => {
    if (startY == null) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0 && gsap) gsap.set(frame, { y: dy * 0.6, scale: 1 - dy / 2000 });
  }, { passive: true });
  frame.addEventListener('touchend', e => {
    if (startY == null) return;
    const dy = e.changedTouches[0].clientY - startY;
    startY = null;
    if (dy > 110) close();
    else if (gsap) gsap.to(frame, { y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
  });

  return { open, close };
}
