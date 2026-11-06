import React from 'react';
import { useContent } from '../App.jsx';
import { useStore } from '../lib/store.js';
import { areaStats, lessonPace } from '../lib/planner.js';
import { pct, addDays, today, itDate } from '../lib/util.js';
import { Bar } from '../components.jsx';

export default function Progressi() {
  const content = useContent();
  const s = useStore();
  const st = areaStats(content, s);
  const p = lessonPace(content, s);
  const days = Array.from({ length: 28 }, (_, i) => addDays(today(), i - 27));
  const maxAns = Math.max(10, ...days.map(d => s.days[d]?.ans || 0));
  let streak = 0; for (let i = 0; ; i++) { const d = addDays(today(), -i); const x = s.days[d]; if (x && (x.ans || x.lessons || x.reviews)) streak++; else if (i > 0) break; else continue; if (i > 400) break; }
  const items = Object.values(s.items);
  const mastered = items.filter(r => r.iv >= 21).length;
  const weak = Object.entries(st).filter(([, v]) => v.n >= 5).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).slice(0, 3);
  return (
    <div>
      <h1>Progressi</h1>
      <div className="grid stats">
        <div className="card stat"><b>{p.read}/{p.total}</b><span>lezioni studiate</span></div>
        <div className="card stat"><b>{streak}</b><span>giorni di fila</span></div>
        <div className="card stat"><b>{items.length}</b><span>quesiti e carte in rotazione</span></div>
        <div className="card stat"><b>{mastered}</b><span>consolidati (intervallo ≥ 21 gg)</span></div>
      </div>
      <h2>Ultime 4 settimane</h2>
      <div className="card spark">
        {days.map(d => { const x = s.days[d] || {}; return <div key={d} title={`${itDate(d)}: ${x.ans || 0} risposte, ${x.lessons || 0} lezioni`}><i style={{ height: ((x.ans || 0) / maxAns) * 60 + (x.lessons ? 6 : 0) + 'px', background: x.lessons ? 'var(--coral)' : 'var(--navy)' }} /></div>; })}
      </div>
      <p className="small muted">Barre: risposte date al giorno; in corallo i giorni con teoria nuova.</p>
      <h2>Per area (preselettiva)</h2>
      <div className="card">
        {Object.entries(content.areas).map(([a, n]) => (
          <div key={a} className="arow">
            <a href={`#/quiz/${a}`}>{a}. {n}</a>
            <Bar v={st[a].n ? pct(st[a].ok, st[a].n) : 0} color={st[a].n && pct(st[a].ok, st[a].n) < 60 ? 'var(--coral)' : undefined} />
            <span className="small">{st[a].n ? pct(st[a].ok, st[a].n) + '%' : '—'} · {st[a].seen}/{st[a].total}</span>
          </div>
        ))}
      </div>
      {weak.length > 0 && <div className="card alert"><b>Aree più fragili:</b> {weak.map(([a]) => content.areas[a]).join(', ')}. Chiedi al coach un piano mirato o fai il quiz per area.</div>}
      <h2>Prove</h2>
      <div className="grid stats">
        <div className="card stat"><b>{s.scritto.length}</b><span>quesiti scritti · media {s.scritto.filter(x => x.score != null).length ? (s.scritto.filter(x => x.score != null).reduce((a, b) => a + b.score, 0) / s.scritto.filter(x => x.score != null).length).toFixed(1) : '—'}/20</span></div>
        <div className="card stat"><b>{s.orale.length}</b><span>casi orali · media {s.orale.filter(x => x.score != null).length ? (s.orale.filter(x => x.score != null).reduce((a, b) => a + b.score, 0) / s.orale.filter(x => x.score != null).length).toFixed(1) : '—'}/10</span></div>
        <div className="card stat"><b>{s.sims.length}</b><span>simulazioni · ultima {s.sims.length ? pct(s.sims.at(-1).ok, s.sims.at(-1).n) + '%' : '—'}</span></div>
      </div>
    </div>
  );
}
