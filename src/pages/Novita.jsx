import React, { useState } from 'react';
import { useContent } from '../App.jsx';
import { useStore, update } from '../lib/store.js';
import { novita } from '../lib/api.js';
import { itDate } from '../lib/util.js';
import { Spinner } from '../components.jsx';

function Item({ n, areas, seen }) {
  return (
    <div className={'card nov ' + (n.priorita || '')}>
      <div className="tag">{itDate(n.data)} · priorità {n.priorita || '—'} · {(n.aree || []).map(a => areas[a]).filter(Boolean).join(', ')}</div>
      <b>{n.titolo}</b>
      {n.atto && <div className="small muted">{n.atto}</div>}
      <p>{n.sintesi}</p>
      {n.impatto && <p className="small"><b>Per il concorso:</b> {n.impatto}</p>}
      {n.flashcard?.f && <p className="small muted">Flashcard aggiunta al ripasso: «{n.flashcard.f}»</p>}
      <div className="row">
        {n.fonte && <a className="btn" href={n.fonte} target="_blank" rel="noreferrer">Fonte ufficiale ↗</a>}
        {!seen && n.id && <button className="btn" onClick={() => update(x => { x.novitaSeen[n.id] = true; })}>Segna come letta</button>}
      </div>
    </div>
  );
}

export default function Novita() {
  const content = useContent();
  const s = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const agg = content.aggiornamenti || { items: [] };
  const known = [...agg.items, ...s.novitaLocal].map(n => `${n.titolo} (${n.atto || ''})`);

  const check = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const last = s.novitaLocal[0]?.checked || agg.updated;
      const r = await novita({ since: last ? last.slice(0, 10) : undefined, known });
      const items = (r.items || []).map((n, i) => ({ ...n, id: 'L' + Date.now().toString(36) + i, checked: r.checked }));
      update(x => { x.novitaLocal = [...items, ...x.novitaLocal].slice(0, 100); });
      setMsg(items.length ? `Trovate ${items.length} novità.` : 'Nessuna novità rilevante dall\'ultimo controllo.');
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div>
      <h1>Novità normative</h1>
      <p className="muted">Due canali. <b>Automatico</b>: ogni lunedì una routine su GitHub cerca le novità sulle fonti ufficiali e aggiorna l'app per tutti i tuoi dispositivi. <b>Su richiesta</b>: il pulsante qui sotto fa la stessa ricerca adesso (resta salvata su questo dispositivo). Ogni novità diventa anche una flashcard nel ripasso.</p>
      <div className="card row">
        <button className="btn primary" disabled={busy} onClick={check}>Controlla ora</button>
        <span className="small muted">Ultimo aggiornamento automatico: {agg.updated ? itDate(agg.updated.slice(0, 10)) : 'mai (attiva la GitHub Action)'}</span>
        {busy && <Spinner label="Cerco su Gazzetta, MIM, Normattiva… (1-3 minuti)" />}
        {msg && <span className="small">{msg}</span>}
        {err && <p className="err">{err}</p>}
      </div>
      {s.novitaLocal.length > 0 && <><h2>Trovate su questo dispositivo</h2>{s.novitaLocal.map(n => <Item key={n.id} n={n} areas={content.areas} seen={s.novitaSeen[n.id]} />)}</>}
      <h2>Archivio aggiornamenti</h2>
      {agg.items.length ? agg.items.map(n => <Item key={n.id} n={n} areas={content.areas} seen={s.novitaSeen[n.id]} />) : <p className="muted">Ancora vuoto: si riempie con la prima esecuzione della routine settimanale.</p>}
      <div className="card soft small">
        <b>Come si organizza il discorso aggiornamenti</b>
        <ol>
          <li><b>Base stabile</b>: le lezioni restano quelle dei tuoi fascicoli (normativa a luglio 2026).</li>
          <li><b>Strato di novità</b>: ogni settimana arrivano schede con atto, fonte ufficiale, sintesi e "cosa cambia per il concorso"; diventano flashcard nel ripasso.</li>
          <li><b>Verifica puntuale</b>: dentro ogni lezione il pulsante "Verifica vigenza (web)" controlla numeri e date su Normattiva e Gazzetta.</li>
          <li><b>Consolidamento</b>: quando una novità cambia una lezione, chiedimelo in chat e aggiorno il testo della lezione nel repository.</li>
        </ol>
      </div>
    </div>
  );
}
