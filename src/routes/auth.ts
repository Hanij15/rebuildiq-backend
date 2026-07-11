import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rebuildiq-dev-secret';
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) { res.status(400).json({ error: 'Missing fields' }); return; }
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
  if (exists) { res.status(409).json({ error: 'Email already registered' }); return; }
  const hash = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(id, email, hash, name);
  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id, email, name } });
});
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: 'Missing fields' }); return; }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) { res.status(401).json({ error: 'Invalid credentials' }); return; }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});
router.get('/me', (req: any, res) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) { res.status(401).json({ error: 'No token' }); return; }
  try { const d = jwt.verify(h.slice(7), JWT_SECRET) as { userId: string }; const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(d.userId) as any; if (!user) { res.status(404).json({ error: 'User not found' }); return; } res.json(user); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
});
export default router;
