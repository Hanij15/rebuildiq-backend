import { Router } from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router({ mergeParams: true });
router.use(authMiddleware as any);
router.get('/', (req: any, res) => { const items = db.prepare('SELECT * FROM repair_items WHERE vehicle_id = ?').all(req.params.id); res.json(items); });
router.put('/:repairId', (req: any, res) => { const allowed = ['estimated_cost', 'quantity', 'override_price', 'selected', 'purchased', 'repairable']; const sets: string[] = []; const vals: any[] = []; for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(req.body[k]); } if (sets.length === 0) { res.status(400).json({ error: 'No fields' }); return; } vals.push(req.params.repairId, req.params.id); db.prepare(`UPDATE repair_items SET ${sets.join(', ')} WHERE id = ? AND vehicle_id = ?`).run(...vals); res.json({ success: true }); });
router.delete('/:repairId', (req: any, res) => { db.prepare('DELETE FROM repair_items WHERE id = ? AND vehicle_id = ?').run(req.params.repairId, req.params.id); res.json({ success: true }); });
export default router;
