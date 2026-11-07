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
  // indice delle lezioni estese disponibili: id -> numero di parole
  const ext = {};
  try {
    for (const f of fs.readdirSync(path.join(dir, 'estese'))) {
      if (!f.endsWith('.md')) continue;
      const t = fs.readFileSync(path.join(dir, 'estese', f), 'utf8');
      ext[f.slice(0, -3)] = (t.match(/\S+/g) || []).length;
    }
    const alias = JSON.parse(fs.readFileSync(path.join(dir, 'estese', '_alias.json'), 'utf8'));
    for (const [a, t] of Object.entries(alias)) if (ext[t]) ext[a] = ext[t];
  } catch {}
  cache = { ...content, aggiornamenti: agg, ext };
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
