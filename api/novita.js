import { checkAuth, readBody, callClaude, extractJson } from './_lib.js';
import { buildNovitaPrompt } from '../scripts/novita-prompt.js';

// Ricerca "live" delle novità normative (non salva nulla sul server: l'app le conserva sul dispositivo).
// Gli aggiornamenti permanenti li fa la GitHub Action settimanale (scripts/aggiorna-normativa.mjs).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST' });
  if (!checkAuth(req, res)) return;
  const { since, known = [] } = readBody(req);
  const { system, user } = buildNovitaPrompt({ since, known });
  try {
    const out = await callClaude({
      system, messages: [{ role: 'user', content: user }], maxTokens: 6000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }],
    });
    let items = [];
    try { items = extractJson(out.text); } catch { items = []; }
    res.status(200).json({ items: Array.isArray(items) ? items : [], checked: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
