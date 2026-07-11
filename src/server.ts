import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import vinRoutes from './routes/vin.js';
import damageRoutes from './routes/damage.js';
import repairRoutes from './routes/repairs.js';
import estimateRoutes from './routes/estimate.js';
import marketRoutes from './routes/market.js';
import partsRoutes from './routes/parts.js';
import profitRoutes from './routes/profit.js';
import reportRoutes from './routes/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create data directory for SQLite
mkdirSync(join(__dirname, '..', 'data'), { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);

// Vehicle sub-routes MUST come before /api/vehicles
app.use('/api/vehicles/:id/decode-vin', vinRoutes);
app.use('/api/vehicles/:id/damage', damageRoutes);
app.use('/api/vehicles/:id/repairs', repairRoutes);
app.use('/api/vehicles/:id/estimate', estimateRoutes);
app.use('/api/vehicles/:id/market', marketRoutes);
app.use('/api/vehicles/:id/profit', profitRoutes);
app.use('/api/vehicles/:id/report', reportRoutes);

// Main vehicle routes (catch-all for /api/vehicles)
app.use('/api/vehicles', vehicleRoutes);

// Parts catalog (global)
app.use('/api', partsRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`RebuildIQ API running on port ${PORT}`);
});
