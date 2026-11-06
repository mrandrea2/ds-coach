import React, { useEffect, useMemo, useState } from 'react';
import { useContent } from '../App.jsx';
import { useStore, update, logDay, getState } from '../lib/store.js';
import { schedule } from '../lib/srs.js';
import { reviewQueue, allItems } from '../lib/planner.js';
import { shuffle, today } from '../lib/util.js';
import { QuizCard, FlashCard, Empty, Bar } from '../components.jsx';

function record(it, grade) {
  const wasNew = !getState().items[it.id];
  update(x => { x.items[it.id] = schedule(x.items[it.id], grade); });
  logDay(d => { d.ans++; if (grade >= 3) d.ok++; if (wasNew) d.newIntro = (d.newIntro || 0) + 1; });
}

function Session({ items, title, subtitle, back = '#/allenamento' }) {
  const content = useContent();
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(0);
  const [wrong, setWrong] = useState([]);
  const [t0] = useState(Date.now());
  const finished = items.length > 0 && i >= items.length;
  useEffect(() => { if (finished) logDay(d => { d.sec += Math.round((Date.now() - t0) / 1000); }); }, [finished]);
  if (!items.length) return <><a className="back" href={back}>←</a><h1>{title}</h1><Empty>Niente da fare qui adesso. Torna domani o studia una nuova lezione per sbloccare altri quesiti.</Empty></>;
  if (i >= items.length) {
    return (
      <div>
        <h1>{title}: fatto</h1>
        <div className="card">
          <p><b>{ok}/{items.length}</b> corretti.</p>
          <Bar v={(ok / items.length) * 100} />
          {wrong.length > 0 && <>
            <h3>Da rivedere</h3>
            <ul className="small">{wrong.map(w => <li key={w.id}>{w.q || w.f}<br /><span className="muted">{w.type === 'quiz' ? w.o[w.c] : w.b}</span></li>)}</ul>
            <p className="small muted">Torneranno domani: è il ritmo giusto per riparare un ricordo fragile.</p>
          </>}
          <a className="btn primary" href="#/">Torna a Oggi</a>
        </div>
      </div>
    );
  }
  const it = items[i];
  const done = good => { if (good) setOk(o => o + 1); else setWrong(w => [...w, it]); setI(i + 1); };
  return (
    <div>
      <a className="back" href={back}>← esci</a>
      <h1>{title} <span className="muted small">{i + 1}/{items.length}</span></h1>
      {subtitle && <p className="muted small">{subtitle}</p>}
      <Bar v={(i / items.length) * 100} />
      {it.type === 'quiz'
        ? <QuizCard key={it.id} q={it} showArea areas={content.areas} onAnswer={good => { record(it, good ? 4 : 1); done(good); }} />
        : <FlashCard key={it.id} c={it} onGrade={g => { record(it, g); done(g >= 3); }} />}
    </div>
  );
}

export function Ripasso() {
  const content = useContent();
  const s = useStore();
  const items = useMemo(() => { const { due, news } = reviewQueue(content, s); return shuffle([...due, ...news]).slice(0, 80); }, []);
  return <Session items={items} title="Ripasso misto" subtitle="Aree mescolate: prima di rispondere chiediti quale norma si applica." back="#/" />;
}

export function Flashcards() {
  const content = useContent();
  const s = useStore();
  const items = useMemo(() => {
    const cards = allItems(content, s).filter(x => x.type === 'card');
    const due = cards.filter(c => s.items[c.id]?.due <= today());
    const fresh = cards.filter(c => !s.items[c.id]);
    return shuffle([...due, ...fresh.slice(0, 15)]);
  }, []);
  return <Session items={items} title="Flashcard" subtitle="Numeri, date, organi: ideale la sera, 10 minuti prima di dormire." />;
}

export function QuizArea({ area }) {
  const content = useContent();
  const s = useStore();
  const items = useMemo(() => {
    const pool = allItems(content, s).filter(q => q.type === 'quiz' && String(q.area) === String(area));
    // priorità a mai visti e sbagliati
    const score = q => { const r = s.items[q.id]; if (!r) return 1; const last = r.h[r.h.length - 1]; return last === 0 ? 2 : r.due <= today() ? 1.5 : 0; };
    return shuffle(pool).sort((a, b) => score(b) - score(a)).slice(0, 15);
  }, [area]);
  return <Session items={items} title={`Quiz · ${content.areas[area]}`} subtitle="15 quesiti: prima quelli sbagliati e mai visti." />;
}

export function Errori() {
  const content = useContent();
  const s = useStore();
  const items = useMemo(() => shuffle(allItems(content, s).filter(it => { const r = s.items[it.id]; return r && (r.h[r.h.length - 1] === 0 || r.lapses >= 2); })).slice(0, 30), []);
  return <Session items={items} title="I miei errori" subtitle="Quesiti sbagliati di recente o più volte." />;
}
