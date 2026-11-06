// Eseguito dalla GitHub Action settimanale: cerca novità normative e le aggiunge a content/aggiornamenti.json.
// Il commit sul repository fa ripartire automaticamente il deploy su Vercel.
import fs from 'node:fs';
import { buildNovitaPrompt } from './novita-prompt.js';
import { callClaude, extractJson } from '../api/_lib.js';

const FILE = new URL('../content/aggiornamenti.json', import.meta.url);
const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const known = db.items.map(i => `${i.titolo} (${i.atto || ''})`);
const since = db.updated ? db.updated.slice(0, 10) : new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
const { system, user } = buildNovitaPrompt({ since, known });

const out = await callClaude({
  system, messages: [{ role: 'user', content: user }], maxTokens: 6000,
  tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 12 }],
});
let items = [];
try { items = extractJson(out.text); } catch (e) { console.error('JSON non valido', out.text.slice(0, 400)); }
const seen = new Set(db.items.map(i => (i.fonte || i.titolo).toLowerCase()));
let added = 0;
for (const it of Array.isArray(items) ? items : []) {
  const k = (it.fonte || it.titolo || '').toLowerCase();
  if (!k || seen.has(k)) continue;
  seen.add(k);
  db.items.unshift({ id: 'N' + Date.now().toString(36) + added, aggiunto: new Date().toISOString().slice(0, 10), ...it });
  added++;
}
db.updated = new Date().toISOString();
fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
console.log(`Novità aggiunte: ${added}. Totale: ${db.items.length}`);
