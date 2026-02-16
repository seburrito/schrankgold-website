import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const MEDIA_LIMIT = process.env.MEDIA_LIMIT || 20;

async function prebuildInstagram() {
  if (!IG_ACCESS_TOKEN) {
    console.warn('[prebuild] No IG_ACCESS_TOKEN - creating empty feed');
    fs.writeFileSync('instagram-feed.json', JSON.stringify({ items: [], error: 'Not configured' }));
    return;
  }

  const fields = 'id,media_type,media_url,permalink,caption,thumbnail_url,timestamp';
  const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=${MEDIA_LIMIT}&access_token=${IG_ACCESS_TOKEN}`;
  
  try {
    console.log('[prebuild] Fetching Instagram feed...');
    const r = await fetch(url);
    
    if (!r.ok) {
      const txt = await r.text();
      console.error('[prebuild] Instagram API error:', r.status, txt);
      fs.writeFileSync('instagram-feed.json', JSON.stringify({ items: [], error: `API error: ${r.status}` }));
      return;
    }
    
    const data = await r.json();
    const items = (data.data || [])
      .filter(m => ['IMAGE', 'CAROUSEL_ALBUM', 'VIDEO', 'REEL'].includes(m.media_type))
      .map(m => ({
        id: m.id,
        type: m.media_type,
        image: m.media_type === 'VIDEO' || m.media_type === 'REEL' ? (m.thumbnail_url || m.media_url) : m.media_url,
        videoUrl: (m.media_type === 'VIDEO' || m.media_type === 'REEL') ? m.media_url : null,
        permalink: m.permalink,
        caption: m.caption || '',
        timestamp: m.timestamp
      }));
    
    fs.writeFileSync('instagram-feed.json', JSON.stringify({ items, generatedAt: new Date().toISOString() }));
    console.log(`[prebuild] Saved ${items.length} Instagram posts to instagram-feed.json`);
  } catch (e) {
    console.error('[prebuild] Fetch failed:', e.message);
    fs.writeFileSync('instagram-feed.json', JSON.stringify({ items: [], error: e.message }));
  }
}

prebuildInstagram();
