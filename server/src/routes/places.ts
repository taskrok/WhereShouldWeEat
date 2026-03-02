import { Router } from 'express';
import { getPhotoUrl, getPlaceDetails } from '../services/googlePlaces.js';

const router = Router();

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

  const response = await getPhotoUrl(name, maxWidth);
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
