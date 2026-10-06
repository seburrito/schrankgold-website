// Fetches the Instagram feed and live stories at build time and stores the
// media on our own server (ig-media/), so visitors' browsers never contact
// Instagram/Meta and the expiring Instagram CDN links don't matter.
//
// Output (deployed with the site):
//   instagram-feed.json     latest posts   { items: [...], generatedAt }
//   instagram-stories.json  live stories   { items: [...], generatedAt }
//   ig-media/<id>.jpg|.mp4  downloaded images / story videos
//
// Env: IG_ACCESS_TOKEN (required), MEDIA_LIMIT (default 12),
//      IG_API_BASE (default https://graph.instagram.com, overridable for tests)

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.IG_ACCESS_TOKEN;
const API = (process.env.IG_API_BASE || 'https://graph.instagram.com').replace(/\/$/, '');
const MEDIA_LIMIT = Number(process.env.MEDIA_LIMIT || 12);
const MEDIA_DIR = 'ig-media';
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data));
const empty = error => ({ items: [], error });

async function api(endpoint, fields, extra = '') {
  const url = `${API}/${endpoint}?fields=${fields}${extra}&access_token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${endpoint} ${res.status}: ${await res.text()}`);
  return (await res.json()).data || [];
}

// Download one media file; returns the local path or null
async function download(url, id, ext, maxBytes = Infinity) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const len = Number(res.headers.get('content-length') || 0);
    if (len > maxBytes) throw new Error(`too large (${len} bytes)`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes) throw new Error(`too large (${buf.length} bytes)`);
    const file = path.posix.join(MEDIA_DIR, `${id}.${ext}`);
    fs.writeFileSync(file, buf);
    return file;
  } catch (e) {
    console.warn(`[prebuild] media ${id}.${ext} skipped: ${e.message}`);
    return null;
  }
}

const isVideo = type => type === 'VIDEO' || type === 'REEL';

async function buildFeed() {
  const media = await api('me/media', 'id,media_type,media_url,permalink,caption,thumbnail_url,timestamp', `&limit=${MEDIA_LIMIT}`);
  const items = [];
  for (const m of media) {
    if (!['IMAGE', 'CAROUSEL_ALBUM', 'VIDEO', 'REEL'].includes(m.media_type)) continue;
    // Feed: images only (reels show their cover and open on Instagram)
    const image = await download(isVideo(m.media_type) ? (m.thumbnail_url || null) : m.media_url, m.id, 'jpg');
    if (!image) continue;
    items.push({ id: m.id, type: m.media_type, image, videoUrl: null, permalink: m.permalink, caption: m.caption || '', timestamp: m.timestamp });
  }
  return items;
}

async function buildStories() {
  const media = await api('me/stories', 'id,media_type,media_url,permalink,thumbnail_url,timestamp');
  const items = [];
  for (const m of media) {
    const video = m.media_type === 'VIDEO';
    const videoUrl = video ? await download(m.media_url, m.id, 'mp4', MAX_VIDEO_BYTES) : null;
    const image = await download(video ? m.thumbnail_url : m.media_url, m.id, 'jpg');
    if (!image && !videoUrl) continue;
    items.push({ id: m.id, type: videoUrl ? 'VIDEO' : 'IMAGE', image, videoUrl, permalink: m.permalink, timestamp: m.timestamp });
  }
  return items;
}

async function main() {
  if (!TOKEN) {
    console.warn('[prebuild] No IG_ACCESS_TOKEN - creating empty feed');
    write('instagram-feed.json', empty('Not configured'));
    write('instagram-stories.json', empty('Not configured'));
    return;
  }
  fs.rmSync(MEDIA_DIR, { recursive: true, force: true });
  fs.mkdirSync(MEDIA_DIR, { recursive: true });

  try {
    console.log('[prebuild] Fetching Instagram feed...');
    const items = await buildFeed();
    write('instagram-feed.json', { items, generatedAt: new Date().toISOString() });
    console.log(`[prebuild] Saved ${items.length} posts to instagram-feed.json`);
  } catch (e) {
    console.error('[prebuild] Feed failed:', e.message);
    write('instagram-feed.json', empty(e.message.slice(0, 200)));
  }

  try {
    // Live stories (last 24 h); needs an Instagram professional account.
    // Without stories the site shows the latest posts in the story strip.
    console.log('[prebuild] Fetching Instagram stories...');
    const items = await buildStories();
    write('instagram-stories.json', { items, generatedAt: new Date().toISOString() });
    console.log(`[prebuild] Saved ${items.length} stories to instagram-stories.json`);
  } catch (e) {
    console.error('[prebuild] Stories failed:', e.message);
    write('instagram-stories.json', empty(e.message.slice(0, 200)));
  }
}

main();
