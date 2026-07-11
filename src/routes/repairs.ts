import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router({ mergeParams: true });
router.use(authMiddleware as any);
router.get('/', (req: any, res) => { const items = db.prepare('SELECT * FROM repair_items WHERE vehicle_id = ?').all(req.params.id); res.json(items); });
router.put('/:repairId', (req: any, res) => { const allowed = ['estimated_cost', 'quantity', 'override_price', 'selected', 'purchased', 'repairable']; const sets: string[] = []; const vals: any[] = []; for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(req.body[k]); } if (sets.length === 0) { res.status(400).json({ error: 'No fields' }); return; } vals.push(req.params.repairId, req.params.id); db.prepare(`UPDATE repair_items SET ${sets.join(', ')} WHERE id = ? AND vehicle_id = ?`).run(...vals); res.json({ success: true }); });
router.delete('/:repairId', (req: any, res) => { db.prepare('DELETE FROM repair_items WHERE id = ? AND vehicle_id = ?').run(req.params.repairId, req.params.id); res.json({ success: true }); });
router.post('/', (req: any, res) => {
  const id = uuidv4();
  db.prepare(`INSERT INTO repair_items (id, vehicle_id, part_id, name, category, description, estimated_cost, quantity, override_price, selected, purchased, repairable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, ?)`).run(
    id, req.params.id, req.body.part_id || '', req.body.name, req.body.category || 'Other', req.body.description || '', req.body.estimated_cost || 0, req.body.quantity || 1, req.body.selected !== false ? 1 : 0, req.body.repairable ? 1 : 0
  );
  const item = db.prepare('SELECT * FROM repair_items WHERE id = ?').get(id);
  res.status(201).json(item);
});
router.post('/generate', (req: any, res) => {
  const vid = req.params.id;
  const existing = db.prepare('SELECT * FROM repair_items WHERE vehicle_id = ?').all(vid) as any[];
  if (existing.length > 0) {
    res.json(existing);
    return;
  }
  const damage = db.prepare('SELECT * FROM damage_items WHERE vehicle_id = ?').all(vid) as any[];
  const items: any[] = [];
  for (const d of damage) {
    const pid = 'generated-' + d.zone.toLowerCase().replace(/\s+/g, '-');
    const id = uuidv4();
    db.prepare(`INSERT INTO repair_items (id, vehicle_id, part_id, name, category, description, estimated_cost, quantity, override_price, selected, purchased, repairable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 0, ?)`).run(
      id, vid, pid, d.zone, d.category || 'Body', d.description || `Repair ${d.zone}`, d.estimated_cost || 0, 1, d.zone.includes('Bumper') || d.zone.includes('Door') ? 1 : 0
    );
    items.push(db.prepare('SELECT * FROM repair_items WHERE id = ?').get(id));
  }
  res.json(items);
});
router.put('/bulk', (req: any, res) => {
  const repairs = req.body.repairs || [];
  for (const r of repairs) {
    if (!r.id) continue;
    const allowed = ['estimated_cost', 'quantity', 'override_price', 'selected', 'purchased', 'repairable'];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const k of allowed) {
      if (r[k] !== undefined) {
        sets.push(`${k} = ?`);
        vals.push(r[k]);
      }
    }
    if (sets.length > 0) {
      vals.push(r.id, req.params.id);
      db.prepare(`UPDATE repair_items SET ${sets.join(', ')} WHERE id = ? AND vehicle_id = ?`).run(...vals);
    }
  }
  const items = db.prepare('SELECT * FROM repair_items WHERE vehicle_id = ?').all(req.params.id);
  res.json(items);
});
export default router;
