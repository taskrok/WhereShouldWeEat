import { Router } from 'express';
import { getPhotoUrl, getPlaceDetails } from '../services/googlePlaces.js';

const router = Router();

// In-memory photo cache to avoid duplicate Google API calls
const photoCache = new Map<string, { buffer: Buffer; contentType: string; expires: number }>();
const PHOTO_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const PHOTO_CACHE_MAX = 200; // max cached photos (~200 * ~50KB ≈ 10MB)

function cleanPhotoCache() {
  const now = Date.now();
  for (const [key, entry] of photoCache) {
    if (entry.expires < now) photoCache.delete(key);
  }
  // If still over max, drop oldest entries
  if (photoCache.size > PHOTO_CACHE_MAX) {
    const excess = photoCache.size - PHOTO_CACHE_MAX;
    const keys = photoCache.keys();
    for (let i = 0; i < excess; i++) {
      const next = keys.next();
      if (!next.done) photoCache.delete(next.value);
    }
  }
}

router.get('/details', async (req, res) => {
  const placeId = req.query.placeId as string;

  if (!placeId) {
    res.status(400).json({ error: 'Missing placeId parameter' });
    return;
  }

  const details = await getPlaceDetails(placeId);
  if (!details) {
    res.status(404).json({ error: 'Place not found' });
    return;
  }

  res.json(details);
});

router.get('/photo', async (req, res) => {
  const name = req.query.name as string;
  const maxWidth = parseInt(req.query.maxWidth as string || '400', 10);

  if (!name) {
    res.status(400).json({ error: 'Missing photo name parameter' });
    return;
  }

  const cacheKey = `${name}:${maxWidth}`;
  const cached = photoCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(cached.buffer);
    return;
  }

  const response = await getPhotoUrl(name, maxWidth);
  if (!response || !response.ok) {
    res.status(404).json({ error: 'Photo not found' });
    return;
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());

  // Cache the photo
  cleanPhotoCache();
  photoCache.set(cacheKey, { buffer, contentType, expires: Date.now() + PHOTO_CACHE_TTL });

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(buffer);
});

export default router;
