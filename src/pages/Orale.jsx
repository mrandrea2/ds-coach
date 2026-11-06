import React, { useEffect, useState } from 'react';
import { useContent, go } from '../App.jsx';
import { useStore, update, logDay } from '../lib/store.js';
import { itDate, today, shuffle } from '../lib/util.js';
import { Md, useCoach, Spinner } from '../components.jsx';

export function OraleList() {
  const content = useContent();
  const s = useStore();
  const [area, setArea] = useState('all');
  const tried = id => s.orale.filter(x => x.casoId === id);
  const tr = content.tracce.filter(t => area === 'all' || String(t.area) === area);
  const random = () => { const pool = content.tracce.filter(t => !tried(t.id).length); const t = shuffle(pool.length ? pool : content.tracce)[0]; go('/orale/' + t.id); };
  return (
    <div>
      <h1>Prova orale: il caso concreto</h1>
      <p className="muted">Usa la griglia dei <a href="#/lezione/M9-02">cinque passi</a>: inquadramento, competenze, azioni del DS, tutela e garanzie, monitoraggio. Puoi scrivere o dettare la risposta con il microfono della tastiera: il coach la valuta /10 e ti fa la domanda di approfondimento della commissione.</p>
      <div className="row"><button className="btn primary" onClick={random}>Caso a sorpresa</button><a className="btn" href="#/coach?topic=orale">Simula il colloquio con il coach</a></div>
      <h2>12 casi con soluzione</h2>
      {content.casi.map(c => (
        <a key={c.id} className="card task" href={`#/orale/${c.id}`}>
          <b>{c.title}</b>
          <span className="muted small">{tried(c.id).length ? `${tried(c.id).length} tentativi · ultimo ${tried(c.id).slice(-1)[0].score ?? '?'}/10` : 'da fare'}</span>
        </a>
      ))}
      <h2>150 tracce per area</h2>
      <p className="small muted">Titoli dei casi del volume di Giannelli (2019). Lo scenario lo prepara il coach; la valutazione segue la normativa vigente, non quella dell'epoca.</p>
      <select value={area} onChange={e => setArea(e.target.value)}>
        <option value="all">Tutte le aree</option>
        {Object.entries(content.areas).map(([a, n]) => <option key={a} value={a}>{a}. {n}</option>)}
      </select>
      <ul className="tracce">
        {tr.map(t => <li key={t.id}><a href={`#/orale/${t.id}`}>{t.title}</a> {tried(t.id).length ? <span className="small muted">✓ {tried(t.id).slice(-1)[0].score ?? ''}/10</span> : null}</li>)}
      </ul>
    </div>
  );
}

export function OraleDo({ id }) {
  const content = useContent();
  const s = useStore();
  const caso = content.casi.find(c => c.id === id);
  const traccia = content.tracce.find(t => t.id === id);
  const cached = (s.scenari || {})[id];
  const [scen, setScen] = useState(caso?.scenario || cached || '');
  const [text, setText] = useState('');
  const [fb, setFb] = useState('');
  const [sol, setSol] = useState(false);
  const { busy, err, run } = useCoach();
  const title = caso?.title || traccia?.title;

  useEffect(() => {
    if (!scen && traccia) {
      run('traccia', { context: { topic: `Caso concreto per la PROVA ORALE del concorso DS (area ${traccia.area}: ${content.areas[traccia.area]}). Titolo del caso: «${traccia.title}». Scrivi uno scenario realistico di 4-6 righe ambientato in una scuola italiana di oggi, che termina con la domanda "Come agisce il dirigente scolastico?".` } })
        .then(r => { if (r?.data?.traccia) { setScen(r.data.traccia); update(x => { x.scenari = { ...(x.scenari || {}), [id]: r.data.traccia }; }); } });
    }
  }, [id]);

  if (!title) return <p>Caso non trovato. <a href="#/orale">Indietro</a></p>;
  const tries = s.orale.filter(x => x.casoId === id);

  const evaluate = async () => {
    const r = await run('caso', { context: { traccia: `${title}\n\n${scen}`, modello: caso?.soluzione }, messages: [{ role: 'user', content: `SOLUZIONE DI ANDREA:\n\n${text}` }] });
    if (r) {
      const m = r.text.match(/Valutazione:\s*(\d+(?:[.,]\d+)?)\s*\/\s*10/i);
      const score = m ? parseFloat(m[1].replace(',', '.')) : null;
      setFb(r.text);
      update(x => { x.orale.push({ id: Date.now().toString(36), casoId: id, text, date: today(), score, feedback: r.text }); });
      logDay(d => { d.reviews++; });
    }
  };

  return (
    <div>
      <a className="back" href="#/orale">← Prova orale</a>
      <h1>{title}</h1>
      <div className="card traccia">{scen ? <p>{scen}</p> : busy ? <Spinner label="Il coach prepara lo scenario…" /> : <p className="muted">Scenario non disponibile.</p>}</div>
      <p className="small muted">Ragiona 2-3 minuti sulla griglia, poi rispondi come all'orale (5-7 minuti). Su telefono puoi dettare con il microfono della tastiera.</p>
      <textarea className="essay" rows={12} value={text} onChange={e => setText(e.target.value)} placeholder="La situazione chiama in causa, sul piano normativo, … ; sul piano delle competenze … ; il dirigente, nel rispetto delle competenze altrui, agisce come segue: …" />
      <div className="row">
        <button className="btn primary" disabled={busy || text.trim().length < 80 || !scen} onClick={evaluate}>Valuta la mia soluzione</button>
        {caso && <button className="btn" onClick={() => setSol(v => !v)}>{sol ? 'Nascondi' : 'Mostra'} soluzione</button>}
        <a className="btn" href={`#/coach?topic=${encodeURIComponent('Caso orale: ' + title)}`}>Fatti interrogare su questo tema</a>
      </div>
      {busy && scen && <Spinner label="Valutazione in corso…" />}
      {err && <p className="err">{err}</p>}
      {fb && <div className="card"><Md src={fb} /></div>}
      {sol && caso && <div className="card model"><Md src={caso.soluzione} />{caso.punto && <div className="callout punto"><b>Il punto</b><div>{caso.punto}</div></div>}</div>}
      {tries.length > 0 && <>
        <h2>Tentativi precedenti</h2>
        {[...tries].reverse().map(t => <details key={t.id} className="card"><summary>{itDate(t.date)} · {t.score ?? '?'}/10</summary><Md src={t.feedback} /></details>)}
      </>}
    </div>
  );
}
