import type { Request, Response, NextFunction } from 'express';
export function errorHandler(err: Error, _r: Request, res: Response, _n: NextFunction) {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Server error' });
}
