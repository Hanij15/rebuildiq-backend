import { Router } from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { decodeVin } from '../services/nhtsa.js';
const router = Router({ mergeParams: true });
router.use(authMiddleware as any);
router.post('/', async (req: any, res) => { const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any; if (!vehicle) { res.status(404).json({ error: 'Vehicle not found' }); return; } try { const data = await decodeVin(vehicle.vin); const year = parseInt(data.year) || 0; const updates: Record<string, any> = { year, make: data.make, model: data.model, trim: data.trim || 'Base' }; if (data.cylinders && data.displacement) updates.engine = `${data.displacement}L V${data.cylinders}`; if (data.transmission) updates.transmission = data.transmission; if (data.drivetrain) updates.drivetrain = data.drivetrain; if (data.bodyClass) updates.body_class = data.bodyClass; if (data.fuelType) updates.fuel_type = data.fuelType; const sets = Object.keys(updates).map(k => `${k} = ?`).join(', '); db.prepare(`UPDATE vehicles SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...Object.values(updates), req.params.id); const updated = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id); res.json({ ...updated, decoded: data }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
export default router;
