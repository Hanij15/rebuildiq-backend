import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'rebuildiq-dev-secret';
export interface AuthRequest extends Request { userId?: string; }
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) { res.status(401).json({ error: 'No token' }); return; }
  try { const t = h.slice(7); const d = jwt.verify(t, JWT_SECRET) as { userId: string }; req.userId = d.userId; next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}
