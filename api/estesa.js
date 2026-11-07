import fs from 'node:fs';
import path from 'node:path';
import { checkAuth } from './_lib.js';

// Restituisce la lezione estesa (content/estese/<id>.md)
export default function handler(req, res) {
  if (!checkAuth(req, res)) return;
  const id = String((req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id') || '');
  if (!/^M\d-\d{2,3}$/.test(id)) return res.status(400).json({ error: 'id non valido' });
  const dir = path.join(process.cwd(), 'content', 'estese');
  let target = id;
  try { target = JSON.parse(fs.readFileSync(path.join(dir, '_alias.json'), 'utf8'))[id] || id; } catch {}
  const f = path.join(dir, target + '.md');
  if (!fs.existsSync(f)) return res.status(404).json({ error: 'non ancora generata' });
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.status(200).json({ id, md: fs.readFileSync(f, 'utf8') });
}
