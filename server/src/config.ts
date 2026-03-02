import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

export const PORT = parseInt(process.env.PORT || '3001', 10);
export const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
export const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
