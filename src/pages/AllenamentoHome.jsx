import React from 'react';
import { useContent } from '../App.jsx';
import { useStore } from '../lib/store.js';
import { reviewQueue, areaStats } from '../lib/planner.js';
import { pct } from '../lib/util.js';

export default function Allenamento() {
  const content = useContent();
  const s = useStore();
  const { due, news } = reviewQueue(content, s);
  const st = areaStats(content, s);
  const errs = Object.values(s.items).filter(r => r.h[r.h.length - 1] === 0 || r.lapses >= 2).length;
  return (
    <div>
      <h1>Allenati</h1>
      <div className="grid">
        <a className="card task" href="#/ripasso"><b>Ripasso misto</b><span className="muted small">{due.length} dovuti · {news.length} nuovi</span><span className="go">→</span></a>
        <a className="card task" href="#/flashcard"><b>Flashcard</b><span className="muted small">{content.cards.length} carte su numeri, date e organi</span><span className="go">→</span></a>
        <a className="card task" href="#/errori"><b>I miei errori</b><span className="muted small">{errs} quesiti da riparare</span><span className="go">→</span></a>
        <a className="card task" href="#/sim"><b>Simulazione preselettiva</b><span className="muted small">a tempo, tutte le aree</span><span className="go">→</span></a>
        <a className="card task" href="#/scritto"><b>Prova scritta</b><span className="muted small">{content.scritto.length} quesiti svolti + nuove tracce · correzione /20</span><span className="go">→</span></a>
        <a className="card task" href="#/orale"><b>Prova orale</b><span className="muted small">{content.casi.length} casi risolti + {content.tracce.length} tracce · valutazione /10</span><span className="go">→</span></a>
      </div>
      <h2>Quiz per area</h2>
      <div className="grid small-grid">
        {Object.entries(content.areas).map(([a, name]) => (
          <a key={a} className="card area" href={`#/quiz/${a}`}>
            <b>{a}. {name}</b>
            <span className="small muted">{st[a].seen}/{st[a].total} visti · {st[a].n ? pct(st[a].ok, st[a].n) + '% corretti' : '—'}</span>
          </a>
        ))}
      </div>
      <p className="small muted">I quiz della banca sono {content.quiz.length}, più quelli che generi con il coach dentro ogni lezione ({s.genQuiz.length} finora).</p>
    </div>
  );
}
