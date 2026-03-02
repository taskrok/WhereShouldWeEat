import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PORT, CLIENT_URL } from './config.js';
import placesRouter from './routes/places.js';
import { setupSocketHandlers } from './socket/handler.js';
import { geocodeZip } from './services/geocode.js';
import { reverseGeocodeLabel } from './services/reverseGeocode.js';

const app = express();
const server = createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  ...(CLIENT_URL ? [CLIENT_URL] : []),
];

console.log('CLIENT_URL:', CLIENT_URL);
console.log('Allowed origins:', allowedOrigins);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    // Allow any vercel.app subdomain
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow custom domain
    if (origin.endsWith('wswe.today')) return callback(null, true);
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
  },
  methods: ['GET', 'POST'],
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', origins: allowedOrigins });
});

app.get('/api/geocode', async (req, res) => {
  const zip = (req.query.zip as string || '').trim();
  if (!zip || !/^\d{5}$/.test(zip)) {
    res.json({ error: 'Please enter a valid 5-digit zip code' });
    return;
  }
  const result = await geocodeZip(zip);
  res.json(result);
});

app.get('/api/reverse-geocode', async (req, res) => {
  const lat = req.query.lat as string;
  const lng = req.query.lng as string;
  if (!lat || !lng) {
    res.json({ label: null });
    return;
  }
  const label = await reverseGeocodeLabel(parseFloat(lat), parseFloat(lng));
  res.json({ label });
});

app.use('/api/places', placesRouter);

setupSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
