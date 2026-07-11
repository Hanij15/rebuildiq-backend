import { Router } from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { PARTS_CATALOG } from '../services/partsCatalog.js';
import { searchParts } from '../services/parts.js';
const router = Router();
router.get('/parts-catalog', (_req, res) => { res.json(Object.entries(PARTS_CATALOG).map(([id, p]) => ({ id, ...p }))); });
router.get('/vehicles/:id/parts-search', (req: any, res) => { const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id) as any; if (!vehicle) { res.status(404).json({ error: 'Not found' }); return; } const repairs = db.prepare('SELECT * FROM repair_items WHERE vehicle_id = ? AND selected = 1').all(req.params.id) as any[]; const results = repairs.map(r => ({ partName: r.name, ...searchParts(r.name, vehicle.year, vehicle.make, vehicle.model) })); res.json(results); });
export default router;
