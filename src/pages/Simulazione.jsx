import React, { useState } from 'react';
import { useContent } from '../App.jsx';
import { useStore, update, logDay } from '../lib/store.js';
import { schedule } from '../lib/srs.js';
import { shuffle, today, itDate, pct } from '../lib/util.js';
import { QuizCard, Timer, Bar } from '../components.jsx';

export default function Simulazione() {
  const content = useContent();
  const s = useStore();
  const [cfg, setCfg] = useState({ n: 50, min: 75 });
  const [run, setRun] = useState(null); // {items, answers, t0}
  const [i, setI] = useState(0);
  const [end, setEnd] = useState(false);

  const start = () => {
    const pool = shuffle([...content.quiz, ...s.genQuiz]);
    // distribuzione uniforme sulle 9 aree
    const by = {}; pool.forEach(q => (by[q.area] = by[q.area] || []).push(q));
    const items = []; let k = 0; const areas = Object.keys(by);
    while (items.length < Math.min(cfg.n, pool.length)) { const a = areas[k++ % areas.length]; if (by[a].length) items.push(by[a].pop()); }
    setRun({ items: shuffle(items), answers: {}, t0: Date.now() }); setI(0); setEnd(false);
  };
  const finish = (r = run) => {
    const byArea = {}; let ok = 0;
    r.items.forEach(q => {
      const good = r.answers[q.id] === q.c;
      if (good) ok++;
      byArea[q.area] = byArea[q.area] || { n: 0, ok: 0 }; byArea[q.area].n++; if (good) byArea[q.area].ok++;
    });
    update(x => {
      r.items.forEach(q => { if (q.id in r.answers) x.items[q.id] = schedule(x.items[q.id], r.answers[q.id] === q.c ? 4 : 1); });
      x.sims.push({ date: today(), n: r.items.length, ok, sec: Math.round((Date.now() - r.t0) / 1000), byArea });
    });
    logDay(d => { d.sec += Math.round((Date.now() - r.t0) / 1000); d.ans += Object.keys(r.answers).length; d.ok += ok; });
    setEnd(true);
  };

  if (!run) return (
    <div>
      <h1>Simulazione preselettiva</h1>
      <p className="muted">Quesiti di tutte le aree, distribuiti in modo uniforme, senza feedback fino alla fine e con il tempo che scorre. Il formato reale (numero di quesiti, tempo, punteggi) va verificato sul bando: nel 2023 erano 50 quesiti in 75 minuti.</p>
      <div className="card row">
        <label>Quesiti <select value={cfg.n} onChange={e => setCfg({ ...cfg, n: +e.target.value })}>{[25, 50, 100].map(n => <option key={n}>{n}</option>)}</select></label>
        <label>Minuti <input type="number" value={cfg.min} onChange={e => setCfg({ ...cfg, min: +e.target.value })} style={{ width: 70 }} /></label>
        <button className="btn primary" onClick={start}>Inizia</button>
      </div>
      {s.sims.length > 0 && <>
        <h2>Storico</h2>
        <table className="tbl"><thead><tr><th>Data</th><th>Esito</th><th>Tempo</th></tr></thead><tbody>
          {[...s.sims].reverse().map((x, k) => <tr key={k}><td>{itDate(x.date)}</td><td>{x.ok}/{x.n} ({pct(x.ok, x.n)}%)</td><td>{Math.round(x.sec / 60)} min</td></tr>)}
        </tbody></table>
      </>}
    </div>
  );

  if (end) {
    const last = s.sims[s.sims.length - 1];
    const wrong = run.items.filter(q => run.answers[q.id] !== q.c);
    return (
      <div>
        <h1>Risultato: {last.ok}/{last.n} ({pct(last.ok, last.n)}%)</h1>
        <div className="card">
          {Object.entries(last.byArea).sort((a, b) => a[0] - b[0]).map(([a, v]) => (
            <div key={a} className="arow"><span>{content.areas[a]}</span><Bar v={pct(v.ok, v.n)} /><span className="small">{v.ok}/{v.n}</span></div>
          ))}
        </div>
        <h2>Errori ({wrong.length})</h2>
        {wrong.map(q => (
          <div key={q.id} className="card small">
            <b>{q.q}</b>
            <p>✗ {run.answers[q.id] != null ? q.o[run.answers[q.id]] : 'non risposto'}<br />✓ <b>{q.o[q.c]}</b></p>
            <p className="muted">{q.e}</p>
          </div>
        ))}
        <button className="btn primary" onClick={() => setRun(null)}>Chiudi</button>
      </div>
    );
  }

  const q = run.items[i];
  return (
    <div>
      <div className="simhead">
        <b>{i + 1}/{run.items.length}</b>
        <Timer seconds={cfg.min * 60} running onEnd={() => finish(run)} />
        <button className="btn" onClick={() => finish(run)}>Consegna</button>
      </div>
      <QuizCard key={q.id} q={q} examMode onAnswer={(good, pick) => {
        const r = { ...run, answers: { ...run.answers, [q.id]: pick } };
        setRun(r);
        setTimeout(() => { if (i + 1 < r.items.length) setI(i + 1); else finish(r); }, 250);
      }} />
      <div className="row">
        <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>← indietro</button>
        <button className="btn" onClick={() => i + 1 < run.items.length && setI(i + 1)}>salta →</button>
      </div>
    </div>
  );
}
