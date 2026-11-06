import { getKey } from './store.js';

async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-app-key': getKey() },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await r.json(); } catch { data = { error: `Errore ${r.status}` }; }
  if (!r.ok) throw new Error(data.error || `Errore ${r.status}`);
  return data;
}

export async function fetchContent(key) {
  const r = await fetch('/api/content', { headers: { 'x-app-key': key ?? getKey() } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Errore ${r.status}`);
  return data;
}
export const coach = (mode, payload) => post('/api/coach', { mode, ...payload });
export const novita = payload => post('/api/novita', payload);
