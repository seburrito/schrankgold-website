// Instagram on the page: story strip, feed grid with filter. The full-screen
// story viewer is a separate file that is loaded on the first tap.

import { qs, qsa, el, reducedMotion } from '../../lib/dom.js';
import { HANDLE, PROFILE_URL, firstLine, isVideo, loadInstagram, seenStories } from './data.js';

const CROWN = new URL('../../assets/img/crown.svg', import.meta.url).href;
const FEED_LAYOUT = ['is-big', '', '', '', 'is-tall', '', '', 'is-wide', '', '', '', ''];
const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';
const BADGES = {
  reel: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path class="solid" d="M8 5v14l11-7z"></path></svg>',
  album: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="13" height="13" rx="2"></rect><path d="M4 16V6a2 2 0 0 1 2-2h10"></path></svg>',
  photo: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle></svg>'
};

const image = (src, extra = {}) => el('img', '', { src, alt: '', loading: 'lazy', decoding: 'async', ...extra });

function placeholder(bg) {
  const box = el('span', 'ph');
  if (bg) box.style.setProperty('--ph-bg', bg);
  box.append(el('img', '', { src: CROWN, alt: '' }));
  return box;
}

/* ---------------------------- Story strip ---------------------------- */

function renderStories(track, slides, openViewer) {
  const seen = seenStories.read();
  track.textContent = '';
  slides.forEach((story, i) => {
    const card = el('button', 'story-card', { type: 'button', 'aria-label': story.label ? `Story ansehen: ${story.label}` : 'Story ansehen' });
    card.classList.toggle('is-seen', seen.has(story.id));

    const media = el('span', 'story-card__media');
    if (story.type === 'PLACEHOLDER') media.append(placeholder());
    else if (story.thumb) media.append(image(story.thumb));
    else {
      // video story without a cover image: show its first frame
      const video = el('video', '', { playsinline: '', preload: 'metadata', src: story.src + '#t=0.1' });
      video.muted = true;
      media.append(video);
    }

    const meta = el('span', 'story-card__meta');
    const time = el('span', 'story-card__time');
    time.textContent = story.time;
    const label = el('span', 'story-card__label');
    label.textContent = story.label || HANDLE;
    meta.append(time, label);

    card.append(el('span', 'story-card__ring'), media, meta);
    if (isVideo(story.type)) {
      const play = el('span', 'story-card__play');
      play.innerHTML = PLAY_ICON;
      card.append(play);
    }
    card.addEventListener('click', () => openViewer(i, card));
    track.append(card);
  });
}

// Arrow buttons, plus dragging with the mouse (touch scrolls natively)
function initStripNav(track) {
  const step = () => (track.querySelector('.story-card')?.offsetWidth || 240) * 2 + 36;
  const behavior = reducedMotion ? 'auto' : 'smooth';
  qs('[data-strip-prev]')?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior }));
  qs('[data-strip-next]')?.addEventListener('click', () => track.scrollBy({ left: step(), behavior }));

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startLeft = 0;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startLeft = track.scrollLeft;
  });
  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) {
      moved = true;
      track.style.scrollSnapType = 'none';
    }
    track.scrollLeft = startLeft - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    track.style.scrollSnapType = '';
  });
  // a drag must not count as a click on a story
  track.addEventListener('click', e => {
    if (!moved) return;
    e.stopPropagation();
    e.preventDefault();
    moved = false;
  }, true);
}

/* ---------------------------- Feed grid ---------------------------- */

function renderFeed(grid, posts) {
  grid.textContent = '';
  posts.forEach((item, i) => {
    const reel = isVideo(item.type);
    const post = el('a', 'post', { href: item.permalink || PROFILE_URL, target: '_blank', rel: 'noopener', 'data-kind': reel ? 'reel' : 'photo' });
    if (FEED_LAYOUT[i]) post.classList.add(FEED_LAYOUT[i]);

    const media = el('div', 'post__media');
    media.append(item.placeholder ? placeholder(i % 2 ? '#34111F' : null) : image(item.image));

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
}

function initFeedFilter(grid) {
  const tabs = qsa('[data-filter]');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => {
      const active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-pressed', String(active));
    });
    const apply = () => {
      for (const post of qsa('.post', grid)) {
        post.style.clipPath = ''; // show posts fully, even those still waiting for their scroll reveal
        post.hidden = !(tab.dataset.filter === 'all' || post.dataset.kind === tab.dataset.filter);
      }
    };
    // the browser cross-fades the change where it supports that
    if (document.startViewTransition && !reducedMotion) document.startViewTransition(apply).finished.finally(relayout);
    else { apply(); relayout(); }
  }));
}

// pinned sections further down depend on the page height
const relayout = () => window.dispatchEvent(new Event('sg:relayout'));

/* ---------------------------- Entry ---------------------------- */

export async function initInstagram() {
  const { slides, posts } = await loadInstagram();
  const track = qs('[data-stories]');
  const grid = qs('[data-feed]');
  if (!track || !grid) return;

  let viewer = null;
  const loadViewer = () => (viewer ??= import('./viewer.js').then(m => m.createViewer(slides)));
  renderStories(track, slides, (i, from) => loadViewer().then(v => v.open(i, from)));
  initStripNav(track);
  renderFeed(grid, posts);
  initFeedFilter(grid);

  // have the viewer ready before the first tap
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 2500));
  idle(loadViewer);
}
