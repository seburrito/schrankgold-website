// Fetches the Instagram feed and live stories and stores them with the site.
//
// Images are downloaded and shrunk to the sizes the page needs (WebP), so
// visitors' browsers never contact Instagram/Meta, the expiring Instagram CDN
// links don't matter and mobile visitors don't download full-size photos.
//
// Output (picked up by "vite build" from public/):
//   public/instagram-feed.json     latest posts    { items, generatedAt }
//   public/instagram-stories.json  live stories    { items, generatedAt }
//   public/ig-media/<id>.webp      post / story images (+ -t thumbnails, .mp4 story videos)
//
// Env: IG_ACCESS_TOKEN (required), MEDIA_LIMIT (default 12),
//      IG_API_BASE (default https://graph.instagram.com, overridable for tests)

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

try { process.loadEnvFile?.(); } catch { /* no .env file */ }

const TOKEN = process.env.IG_ACCESS_TOKEN;
const API = (process.env.IG_API_BASE || 'https://graph.instagram.com').replace(/\/$/, '');
const MEDIA_LIMIT = Number(process.env.MEDIA_LIMIT || 12);
const OUT = 'public';
const MEDIA_DIR = path.join(OUT, 'ig-media');
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const SIZES = { post: 1000, story: 1080, thumb: 440 };
const isVideo = type => type === 'VIDEO' || type === 'REEL';
const write = (file, data) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(data));
const failed = error => ({ items: [], error: String(error).slice(0, 200) });

async function api(endpoint, fields, extra = '') {
  const res = await fetch(`${API}/${endpoint}?fields=${fields}${extra}&access_token=${encodeURIComponent(TOKEN)}`);
  if (!res.ok) throw new Error(`API ${endpoint} ${res.status}: ${await res.text()}`);
  return (await res.json()).data || [];
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Saves ig-media/<name>.webp at the given width; returns the path the website uses
async function saveImage(buffer, name, width) {
  const file = `ig-media/${name}.webp`;
  await sharp(buffer).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(OUT, file));
  return file;
}

async function buildFeed() {
  const media = await api('me/media', 'id,media_type,media_url,permalink,caption,thumbnail_url,timestamp', `&limit=${MEDIA_LIMIT}`);
  const items = [];
  for (const m of media) {
    if (!['IMAGE', 'CAROUSEL_ALBUM', 'VIDEO', 'REEL'].includes(m.media_type)) continue;
    try {
      // reels show their cover image and open on Instagram
      const source = isVideo(m.media_type) ? m.thumbnail_url : m.media_url;
      if (!source) continue;
      const image = await saveImage(await download(source), m.id, SIZES.post);
      items.push({ id: m.id, type: m.media_type, image, permalink: m.permalink, caption: m.caption || '', timestamp: m.timestamp });
    } catch (e) {
      console.warn(`[instagram] post ${m.id} skipped: ${e.message}`);
    }
  }
  return items;
}

async function buildStories() {
  const media = await api('me/stories', 'id,media_type,media_url,permalink,thumbnail_url,timestamp');
  const items = [];
  for (const m of media) {
    try {
      const video = m.media_type === 'VIDEO';
      const cover = await download(video ? m.thumbnail_url || m.media_url : m.media_url).catch(() => null);
      let videoUrl = null;
      if (video) {
        const bytes = await download(m.media_url);
        if (bytes.length <= MAX_VIDEO_BYTES) {
          videoUrl = `ig-media/${m.id}.mp4`;
          fs.writeFileSync(path.join(OUT, videoUrl), bytes);
        }
      }
      if (!cover && !videoUrl) continue;
      items.push({
        id: m.id,
        type: videoUrl ? 'VIDEO' : 'IMAGE',
        image: cover ? await saveImage(cover, m.id, SIZES.story) : null,
        thumb: cover ? await saveImage(cover, `${m.id}-t`, SIZES.thumb) : null,
        videoUrl,
        permalink: m.permalink,
        timestamp: m.timestamp
      });
    } catch (e) {
      console.warn(`[instagram] story ${m.id} skipped: ${e.message}`);
    }
  }
  return items;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!TOKEN) {
    console.warn('[instagram] No IG_ACCESS_TOKEN – the website shows placeholders');
    write('instagram-feed.json', failed('Not configured'));
    write('instagram-stories.json', failed('Not configured'));
    return;
  }
  fs.rmSync(MEDIA_DIR, { recursive: true, force: true });
  fs.mkdirSync(MEDIA_DIR, { recursive: true });

  for (const [label, file, build] of [['posts', 'instagram-feed.json', buildFeed], ['stories', 'instagram-stories.json', buildStories]]) {
    try {
      const items = await build();
      write(file, { items, generatedAt: new Date().toISOString() });
      console.log(`[instagram] ${items.length} ${label} saved`);
    } catch (e) {
      // e.g. expired token, or stories on an account that is not a professional account
      console.error(`[instagram] ${label} failed: ${e.message}`);
      write(file, failed(e.message));
    }
  }
}

main();
