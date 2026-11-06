import fs from 'node:fs';
import path from 'node:path';
import { checkAuth } from './_lib.js';

let cache = null;
function load() {
  if (cache) return cache;
  const dir = path.join(process.cwd(), 'content');
  const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
  let agg = { updated: null, items: [] };
  try { agg = JSON.parse(fs.readFileSync(path.join(dir, 'aggiornamenti.json'), 'utf8')); } catch {}
  cache = { ...content, aggiornamenti: agg };
  return cache;
}

export default function handler(req, res) {
  if (!checkAuth(req, res)) return;
  try {
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json(load());
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
