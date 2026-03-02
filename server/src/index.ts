import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PORT, CLIENT_URL } from './config.js';
import placesRouter from './routes/places.js';
import { setupSocketHandlers } from './socket/handler.js';
import { geocodeZip } from './services/geocode.js';

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
    res.json({ error: 'lat and lng required' });
    return;
  }
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { 'User-Agent': 'WhereShouldWeEat/1.0' } }
    );
    const data = await response.json() as any;
    const addr = data.address || {};
    const name = addr.city || addr.town || addr.suburb || addr.village || addr.county || '';
    const state = addr.state || '';
    const STATE_ABBR: Record<string, string> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
      'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
      'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
      'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
      'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
      'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
      'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
      'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
      'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
      'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
      'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
    };
    const stateAbbr = STATE_ABBR[state] || state;
    if (name && stateAbbr) {
      res.json({ label: `${name}, ${stateAbbr}` });
    } else if (name) {
      res.json({ label: name });
    } else {
      res.json({ label: null });
    }
  } catch {
    res.json({ label: null });
  }
});

app.use('/api/places', placesRouter);

setupSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
