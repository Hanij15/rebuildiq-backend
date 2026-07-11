import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { MarketDataEngine } from '../services/marketData/engine.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware as any);

const engine = new MarketDataEngine();

// Get provider configuration status
router.get('/providers', (_req: any, res) => {
  res.json(engine.getProviderStatuses());
});

// Get manual comparables
router.get('/comparables', (req: any, res) => {
  const comps = db.prepare('SELECT * FROM comparables WHERE vehicle_id = ?').all(req.params.id);
  res.json(comps);
});

// Add manual comparable
router.post('/comparables', (req: any, res) => {
  const { source, year, make, model, trim, mileage, price, titleStatus, location, url, listedDate } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO comparables (id, vehicle_id, source, year, make, model, trim, mileage, price, title_status, location, url, listed_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.id, source || '', year || 0, make || '', model || '', trim || '', mileage || 0, price || 0, titleStatus || 'clean', location || '', url || '', listedDate || '');
  res.status(201).json({ id, success: true });
});

// Delete comparable
router.delete('/comparables/:compId', (req: any, res) => {
  db.prepare('DELETE FROM comparables WHERE id = ? AND vehicle_id = ?').run(req.params.compId, req.params.id);
  res.json({ success: true });
});

// Get valuation — multi-source with confidence
router.get('/valuation', async (req: any, res) => {
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!v) { res.status(404).json({ error: 'Not found' }); return; }

  try {
    const manualComps = db.prepare('SELECT * FROM comparables WHERE vehicle_id = ?').all(req.params.id) as any[];

    const autoValuation = await engine.getValuation({
      vin: v.vin,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      mileage: v.mileage,
      titleStatus: v.title_status,
    });

    const manualComparableList = manualComps.map(c => ({
      id: c.id,
      source: c.source || 'Manual',
      title: `${c.year} ${c.make} ${c.model} ${c.trim || ''}`.trim(),
      year: c.year,
      make: c.make,
      model: c.model,
      trim: c.trim,
      mileage: c.mileage,
      price: c.price,
      condition: c.title_status,
      url: c.url,
      location: c.location,
      listingDate: c.listed_date,
      sellerType: 'unknown' as const,
    }));

    const allComparables = [...autoValuation.comparables, ...manualComparableList];

    res.json({
      ...autoValuation,
      comparables: allComparables,
      comparablesUsed: allComparables.length,
      manualComparablesAdded: manualComps.length,
      sourcesBreakdown: [
        ...autoValuation.sourcesBreakdown,
        ...(manualComps.length > 0 ? [{
          source: 'Manual Entry',
          count: manualComps.length,
          avgPrice: Math.round(manualComps.reduce((s: number, c: any) => s + (c.price || 0), 0) / manualComps.length) || 0,
          minPrice: Math.min(...manualComps.map((c: any) => c.price || 0)) || 0,
          maxPrice: Math.max(...manualComps.map((c: any) => c.price || 0)) || 0,
        }] : []),
      ],
    });
  } catch (err: any) {
    console.error('Valuation error:', err);
    res.status(500).json({ error: 'Valuation failed', detail: err.message });
  }
});

export default router;
