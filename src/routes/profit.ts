import { Router } from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateValue } from '../services/valuation.js';
const router = Router({ mergeParams: true });
router.use(authMiddleware as any);
router.get('/', (req: any, res) => {
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!v) { res.status(404).json({ error: 'Not found' }); return; }
  const est = db.prepare('SELECT * FROM repair_estimates WHERE vehicle_id = ?').get(req.params.id) as any;
  const repairs = db.prepare('SELECT * FROM repair_items WHERE vehicle_id = ? AND selected = 1').all(req.params.id) as any[];
  const vals = calculateValue(v.make, v.year, v.mileage, v.trim);
  const partsCost = repairs.reduce((s, r) => s + (r.override_price || r.estimated_cost) * r.quantity, 0);
  let laborCost = 0;
  if (est) { if (est.use_total_override && est.total_override > 0) laborCost = est.total_override; else laborCost = (est.body_labor_hours * est.body_labor_rate) + (est.paint_labor_hours * est.paint_labor_rate) + (est.mech_labor_hours * est.mech_labor_rate) + (est.frame_labor_hours * est.frame_labor_rate) + est.paint_materials + est.shop_supplies + est.alignment_cost + est.adas_calibration + est.misc_cost + est.transport_cost + est.other_cost; }
  const totalRepairCost = partsCost + laborCost;
  const subtotal = partsCost + laborCost;
  const cp = v.contingency_percent || 10;
  const contingencyAmount = Math.round(subtotal * (cp / 100));
  const totalInvestment = subtotal + contingencyAmount;
  const salePrice = Math.round(vals.clean * 0.82);
  const expectedProfit = salePrice - totalInvestment;
  const roi = totalInvestment > 0 ? Math.round((expectedProfit / totalInvestment) * 1000) / 10 : 0;
  const margin = salePrice > 0 ? Math.round((expectedProfit / salePrice) * 1000) / 10 : 0;
  const pgt = v.profit_goal_type || 'fixed'; const pgv = v.profit_goal_value || 5000;
  const rac = totalRepairCost; const cm = 1 + cp / 100; const bmb = (salePrice - rac) / cm;
  let tp = pgv; if (pgt === 'roi') tp = Math.round(rac * cm * (pgv / 100));
  const maxBid = Math.max(0, Math.round(bmb - tp));
  const br = expectedProfit < 0 ? 'Do Not Buy' : roi >= 50 && margin >= 30 ? 'Excellent Buy' : roi >= 25 && margin >= 18 ? 'Good Buy' : roi >= 10 && margin >= 8 ? 'Marginal' : roi >= 0 && margin >= 0 ? 'High Risk' : 'Do Not Buy';
  let conf = 'medium'; if (roi > 40 && margin > 25) conf = 'high'; else if (roi < 10 || margin < 10 || expectedProfit < 0) conf = 'low';
  res.json({ cleanTitleValue: vals.clean, rebuiltTitleValue: vals.rebuilt, estimatedSalePrice: salePrice, totalPartsCost: partsCost, totalLabor: laborCost, totalRepairCost, transportation: 0, auctionFees: 0, totalInvestment, contingencyAmount, expectedProfit, roi, profitMargin: margin, maxBidRecommendation: maxBid, confidence: conf, buyRecommendation: br, profitGoalType: pgt, profitGoalValue: pgv, contingencyPercent: cp });
});
export default router;
