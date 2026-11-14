// Instagram content for the page. Written at build time by scripts/instagram-fetch.js:
//   instagram-stories.json  live stories (last 24 h)
//   instagram-feed.json     latest posts
// The story strip shows live stories, otherwise the latest posts, otherwise
// branded placeholders that link to the profile.

export const PROFILE_URL = 'https://www.instagram.com/_schrankgold';
export const HANDLE = '_schrankgold';

const PLACEHOLDER_STORIES = 6;
const PLACEHOLDER_POST_TYPES = ['REEL', 'IMAGE', 'CAROUSEL_ALBUM', 'IMAGE', 'REEL', 'IMAGE', 'IMAGE', 'CAROUSEL_ALBUM', 'REEL'];

export const isVideo = type => type === 'VIDEO' || type === 'REEL';

async function loadItems(url) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return [];
    const { items } = await res.json();
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function firstLine(text, max = 70) {
  const line = (text || '').split('\n').map(s => s.trim()).find(Boolean) || '';
  return line.length > max ? line.slice(0, max - 1).trimEnd() + '…' : line;
}

export function ago(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 60) return `vor ${Math.max(minutes, 1)} Min.`;
  if (minutes < 24 * 60) return `vor ${Math.round(minutes / 60)} Std.`;
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export async function loadInstagram() {
  const [stories, feed] = await Promise.all([loadItems('instagram-stories.json'), loadItems('instagram-feed.json')]);

  let slides;
  if (stories.length) {
    slides = stories.map(s => ({
      id: s.id, type: s.type, src: s.videoUrl || s.image, image: s.image, thumb: s.thumb || s.image,
      label: '', time: ago(s.timestamp), link: s.permalink || PROFILE_URL
    }));
  } else if (feed.length) {
    slides = feed.slice(0, 8).map(p => ({
      id: p.id, type: p.type, src: p.image, image: p.image, thumb: p.image,
      label: firstLine(p.caption), time: ago(p.timestamp), link: p.permalink || PROFILE_URL
    }));
  } else {
    slides = Array.from({ length: PLACEHOLDER_STORIES }, (_, i) => ({ id: 'ph-' + i, type: 'PLACEHOLDER', label: '', time: '', link: PROFILE_URL }));
  }

  const posts = feed.length
    ? feed.slice(0, 12)
    : PLACEHOLDER_POST_TYPES.map((type, i) => ({ id: 'ph' + i, type, caption: '', placeholder: true }));

  return { slides, posts };
}

// Which stories were opened already (ring turns grey) – kept in this browser only
export const seenStories = {
  read() {
    try { return new Set(JSON.parse(localStorage.getItem('sg-seen-stories') || '[]')); } catch { return new Set(); }
  },
  write(set) {
    try { localStorage.setItem('sg-seen-stories', JSON.stringify([...set].slice(-60))); } catch { /* storage unavailable */ }
  }
};
