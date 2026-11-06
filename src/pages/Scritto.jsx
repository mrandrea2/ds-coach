import React, { useState } from 'react';
import { useContent, go } from '../App.jsx';
import { useStore, update, logDay } from '../lib/store.js';
import { itDate, today } from '../lib/util.js';
import { Md, Timer, useCoach, Spinner } from '../components.jsx';

export function ScrittoList() {
  const content = useContent();
  const s = useStore();
  const [area, setArea] = useState('1');
  const [eng, setEng] = useState(false);
  const { busy, err, run } = useCoach();
  const gen = async () => {
    const r = await run('traccia', { context: { topic: `Quesito per la PROVA SCRITTA del concorso DS, area ${area}: ${content.areas[area]}.${eng ? ' Il quesito deve essere formulato IN INGLESE (livello B2), come i due quesiti in lingua della prova.' : ''}` } });
    if (r?.data?.traccia) {
      const id = 'G' + Date.now().toString(36);
      update(x => { x.genTracce = [...(x.genTracce || []), { id, area: +area, eng, traccia: r.data.traccia, scaletta: r.data.scaletta || [], date: today() }]; });
      go('/scritto/' + id);
    }
  };
  const all = [...content.scritto.map(q => ({ ...q, src: 'modello' })), ...(s.genTracce || []).map(q => ({ ...q, src: 'coach' }))];
  return (
    <div>
      <h1>Prova scritta</h1>
      <p className="muted">Cinque quesiti aperti in 180 minuti, di cui due in inglese: circa 35 minuti a quesito. Allenati a tempo con il metodo delle <a href="#/lezione/M8-02">quattro mosse</a>, poi fatti correggere dal coach (punteggio /20) e confronta con il modello.</p>
      <div className="card row">
        <b>Nuova traccia dal coach</b>
        <select value={area} onChange={e => setArea(e.target.value)}>{Object.entries(content.areas).map(([a, n]) => <option key={a} value={a}>{a}. {n}</option>)}</select>
        <label className="small"><input type="checkbox" checked={eng} onChange={e => setEng(e.target.checked)} /> in inglese</label>
        <button className="btn primary" disabled={busy} onClick={gen}>Genera</button>
        {busy && <Spinner label="Preparo la traccia…" />}
        {err && <p className="err">{err}</p>}
      </div>
      <h2>Tracce</h2>
      {all.map(q => {
        const tries = s.scritto.filter(x => x.tracciaId === q.id);
        const best = tries.reduce((m, x) => Math.max(m, x.score || 0), 0);
        return (
          <a key={q.id} className="card task" href={`#/scritto/${q.id}`}>
            <div className="tag">{q.src === 'modello' ? `Con svolgimento modello · ${q.area}` : `Dal coach · ${content.areas[q.area]}${q.eng ? ' · EN' : ''}`}</div>
            <div className="small">{q.traccia.slice(0, 220)}{q.traccia.length > 220 ? '…' : ''}</div>
            <span className="muted small">{tries.length ? `${tries.length} tentativi · migliore ${best}/20` : 'mai svolta'}</span>
          </a>
        );
      })}
    </div>
  );
}

export function ScrittoDo({ id }) {
  const content = useContent();
  const s = useStore();
  const q = content.scritto.find(x => x.id === id) || (s.genTracce || []).find(x => x.id === id);
  const [text, setText] = useState('');
  const [running, setRunning] = useState(false);
  const [fb, setFb] = useState(null);
  const [showModel, setShowModel] = useState(false);
  const [t0, setT0] = useState(null);
  const { busy, err, run } = useCoach();
  if (!q) return <p>Traccia non trovata. <a href="#/scritto">Indietro</a></p>;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const tries = s.scritto.filter(x => x.tracciaId === id);

  const correct = async () => {
    const r = await run('scritto', { context: { traccia: q.traccia, modello: q.modello }, messages: [{ role: 'user', content: `RISPOSTA DI ANDREA (${words} parole${t0 ? `, scritta in ${Math.round((Date.now() - t0) / 60000)} minuti` : ''}):\n\n${text}` }] });
    if (r) {
      const m = r.text.match(/Punteggio:\s*(\d+(?:[.,]\d+)?)\s*\/\s*20/i);
      const score = m ? parseFloat(m[1].replace(',', '.')) : null;
      setFb(r.text); setRunning(false);
      update(x => { x.scritto.push({ id: Date.now().toString(36), tracciaId: id, traccia: q.traccia, text, date: today(), score, feedback: r.text }); });
      if (t0) logDay(d => { d.sec += Math.round((Date.now() - t0) / 1000); });
    }
  };

  return (
    <div>
      <a className="back" href="#/scritto">← Prova scritta</a>
      <div className="card traccia"><div className="tag">Traccia</div><p>{q.traccia}</p></div>
      <div className="row">
        {!running && !fb && <button className="btn primary" onClick={() => { setRunning(true); setT0(Date.now()); }}>Avvia 35 minuti</button>}
        {running && <Timer seconds={35 * 60} running={running} onEnd={() => setRunning(false)} />}
        <span className="muted small">{words} parole (obiettivo realistico: 450-600)</span>
      </div>
      <p className="small muted">Prima di scrivere: 3 minuti di scaletta a margine (inquadramento · ruolo del DS · azioni · monitoraggio).</p>
      <textarea className="essay" rows={18} value={text} onChange={e => setText(e.target.value)} placeholder="Scrivi qui il tuo svolgimento…" />
      <div className="row">
        <button className="btn primary" disabled={busy || words < 60} onClick={correct}>Correggi con il coach</button>
        {(q.modello || q.scaletta?.length) && <button className="btn" onClick={() => setShowModel(v => !v)}>{showModel ? 'Nascondi' : 'Mostra'} {q.modello ? 'svolgimento modello' : 'scaletta attesa'}</button>}
      </div>
      {busy && <Spinner label="Correzione in corso (30-60 s)…" />}
      {err && <p className="err">{err}</p>}
      {fb && <div className="card"><Md src={fb} /></div>}
      {showModel && (
        <div className="card model">
          {q.scaletta?.length > 0 && <><h3>Scaletta</h3><ul>{q.scaletta.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          {q.modello && <><h3>Svolgimento modello</h3><Md src={q.modello} /></>}
          {q.analisi && <div className="callout analisi"><b>Perché funziona</b><div>{q.analisi}</div></div>}
        </div>
      )}
      {tries.length > 0 && <>
        <h2>Tentativi precedenti</h2>
        {[...tries].reverse().map(t => (
          <details key={t.id} className="card"><summary>{itDate(t.date)} · {t.score != null ? `${t.score}/20` : 'senza punteggio'}</summary><Md src={t.feedback} /><h4>Il tuo testo</h4><p className="pre">{t.text}</p></details>
        ))}
      </>}
    </div>
  );
}
