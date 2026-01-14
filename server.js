import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// Expect env vars: IG_USER_ID, IG_ACCESS_TOKEN (long-lived), optional MEDIA_LIMIT
const IG_USER_ID = process.env.IG_USER_ID;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const MEDIA_LIMIT = process.env.MEDIA_LIMIT || 5;

if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
  console.warn('[instagram] Missing IG_USER_ID or IG_ACCESS_TOKEN environment variables. /api/instagram will return 503.');
}

app.get('/api/instagram', async (req, res) => {
  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    return res.status(503).json({ error: 'Instagram not configured' });
  }
  const fields = 'id,media_type,media_url,permalink,caption,thumbnail_url,timestamp';
  const url = `https://graph.facebook.com/v19.0/${IG_USER_ID}/media?fields=${fields}&limit=${MEDIA_LIMIT}&access_token=${IG_ACCESS_TOKEN}`;
  try {
    const r = await fetch(url, { timeout: 8000 });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: 'Upstream error', detail: txt });
    }
    const data = await r.json();
    const items = (data.data || []).filter(m => ['IMAGE','CAROUSEL_ALBUM','VIDEO','REEL'].includes(m.media_type)).map(m => ({
      id: m.id,
      type: m.media_type,
      image: m.media_type === 'VIDEO' || m.media_type === 'REEL' ? (m.thumbnail_url || m.media_url) : m.media_url,
      permalink: m.permalink,
      caption: m.caption || '',
      timestamp: m.timestamp
    }));
    res.set('Cache-Control', 'public, max-age=300'); // 5 min
    res.json({ items });
  } catch (e) {
    console.error('[instagram] fetch failed', e);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.use(express.static('.'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
