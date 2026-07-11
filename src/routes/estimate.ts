import { Router } from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router({ mergeParams: true });
router.use(authMiddleware as any);
router.get('/', (req: any, res) => { const est = db.prepare('SELECT * FROM repair_estimates WHERE vehicle_id = ?').get(req.params.id); if (!est) { res.status(404).json({ error: 'No estimate' }); return; } res.json(est); });
router.put('/', (req: any, res) => { const fields = ['use_detailed','use_total_override','total_override','body_labor_hours','body_labor_rate','paint_labor_hours','paint_labor_rate','mech_labor_hours','mech_labor_rate','frame_labor_hours','frame_labor_rate','paint_materials','shop_supplies','alignment_cost','adas_calibration','misc_cost','transport_cost','other_cost']; const sets: string[] = []; const vals: any[] = []; for (const f of fields) if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); } if (sets.length === 0) { res.status(400).json({ error: 'No fields' }); return; } vals.push(req.params.id); db.prepare(`UPDATE repair_estimates SET ${sets.join(', ')} WHERE vehicle_id = ?`).run(...vals); res.json({ success: true }); });
export default router;
