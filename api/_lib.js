// Funzioni condivise dalle API (i file che iniziano con _ non diventano endpoint su Vercel)

export function checkAuth(req, res) {
  const pwd = process.env.APP_PASSWORD;
  if (!pwd) {
    res.status(500).json({ error: 'APP_PASSWORD non configurata su Vercel (Settings → Environment Variables).' });
    return false;
  }
  const got = req.headers['x-app-key'] || '';
  if (got !== pwd) {
    res.status(401).json({ error: 'Password errata' });
    return false;
  }
  return true;
}

export function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

export const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export async function callClaude({ system, messages, maxTokens = 2500, tools, model }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY non configurata su Vercel.');
  const body = { model: model || MODEL(), max_tokens: maxTokens, system, messages };
  if (tools) body.tools = tools;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) {
    const msg = data?.error?.message || JSON.stringify(data).slice(0, 300);
    throw new Error(`Errore API Anthropic (${r.status}): ${msg}`);
  }
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  return { text, usage: data.usage, stop: data.stop_reason };
}

export function extractJson(text) {
  const tag = text.match(/<json>([\s\S]*?)<\/json>/);
  const raw = tag ? tag[1] : (text.match(/```json\s*([\s\S]*?)```/) || [])[1] || text;
  const start = raw.search(/[\[{]/);
  if (start < 0) throw new Error('Nessun JSON nella risposta');
  const open = raw[start];
  const close = open === '[' ? ']' : '}';
  const end = raw.lastIndexOf(close);
  return JSON.parse(raw.slice(start, end + 1));
}

export const TODAY = () => new Date().toISOString().slice(0, 10);

export const BASE_SYSTEM = () => `Sei il coach personale di Andrea Bertelli, docente di Scienze motorie (Liceo Galilei di Verona), psicologo e biologo-nutrizionista, che si prepara al concorso ordinario per DIRIGENTE SCOLASTICO (regolamento D.M. 194/2022: preselettiva a risposta multipla, prova scritta con 5 quesiti aperti di cui 2 in inglese in 180 minuti, prova orale con caso concreto, TIC e inglese B2).
Data di oggi: ${TODAY()}.

Regole:
- Scrivi in italiano chiaro, preciso, da commissario esperto. Usa il markdown (titoletti ###, elenchi, tabelle quando servono). Niente preamboli.
- Riferimenti normativi esatti (fonte, articolo, comma). Se non sei sicuro di un numero, di una data o della vigenza di una norma, dillo esplicitamente con "⚠️ da verificare su Normattiva" invece di inventare.
- Segnala quando un'informazione dei materiali è superata (es. D.I. 44/2001 → D.I. 129/2018; D.lgs. 50/2016 → D.lgs. 36/2023; abuso d'ufficio abrogato dalla L. 114/2024; alternanza → PCTO).
- Ancora sempre la teoria al ruolo del dirigente (art. 25 D.lgs. 165/2001) e alle azioni concrete.
- Andrea è psicologo: puoi usare con naturalezza modelli di psicologia delle organizzazioni e dell'apprendimento, ma senza dilungarti su ciò che sa già.`;
