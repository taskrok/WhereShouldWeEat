import { Router } from 'express';
import { getPhotoUrl } from '../services/googlePlaces.js';

const router = Router();

router.get('/photo', async (req, res) => {
  const ref = req.query.ref as string;
  const maxWidth = parseInt(req.query.maxWidth as string || '400', 10);

  if (!ref) {
    res.status(400).json({ error: 'Missing photo ref parameter' });
    return;
  }

  const response = await getPhotoUrl(ref, maxWidth);
  if (!response || !response.ok) {
    res.status(404).json({ error: 'Photo not found' });
    return;
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const buffer = await response.arrayBuffer();
  res.send(Buffer.from(buffer));
});

export default router;
