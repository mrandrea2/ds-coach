import React from 'react';
import { useContent } from '../App.jsx';
import { useStore } from '../lib/store.js';
import { Bar } from '../components.jsx';
import { itDate, pct, today } from '../lib/util.js';

const KIND = { mappa: 'Mappa', teoria: 'Teoria', dossier: 'Dossier', approfondimento: 'Approfondimento', checklist: 'Checklist', metodo: 'Metodo' };

export default function Percorso({ mod }) {
  const content = useContent();
  const s = useStore();
  if (mod) {
    const m = content.modules.find(x => x.id === mod);
    const ls = content.lessons.filter(l => l.mod === mod);
    const read = ls.filter(l => s.lessons[l.id]?.readAt).length;
    return (
      <div>
        <a href="#/percorso" className="back">← Percorso</a>
        <h1 style={{ color: m.color }}>{m.title}</h1>
        <p className="muted">{m.desc}</p>
        <Bar v={pct(read, ls.length)} color={m.color} />
        <p className="small muted">{read}/{ls.length} lezioni studiate</p>
        <div className="row">
          {m.areas.map(a => <a key={a} className="btn" href={`#/quiz/${a}`}>Quiz: {content.areas[a]}</a>)}
          {mod === 'M8' && <a className="btn" href="#/scritto">Esercitati sullo scritto</a>}
          {mod === 'M9' && <a className="btn" href="#/orale">Esercitati sui casi</a>}
        </div>
        <ol className="lessons">
          {ls.map(l => {
            const st = s.lessons[l.id];
            const due = st?.next && st.next <= today();
            return (
              <li key={l.id}>
                <a href={`#/lezione/${l.id}`} className={'lrow' + (st?.readAt ? ' done' : '')}>
                  <span className="kind">{KIND[l.kind] || l.kind}</span>
                  <span className="lt">{l.title}</span>
                  <span className="ls small">
                    {st?.readAt ? (due ? <b className="due">da richiamare</b> : <>✓ ripasso {itDate(st.next)}</>) : `${Math.max(3, Math.round((content.ext?.[l.id] || l.words) / 180))} min`}
                    {content.ext?.[l.id] ? ' · completa' : ''}{s.deep[l.id] ? ' · ✦' : ''}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }
  return (
    <div>
      <h1>Percorso</h1>
      <p className="muted">Dieci moduli costruiti sulle nove aree del programma (art. 10 D.M. 194/2022) e sulle due prove. Ogni modulo parte da una <b>mappa d'area</b>: leggila prima, ti dà la struttura su cui agganciare i dettagli.</p>
      <div className="grid">
        {content.modules.map(m => {
          const ls = content.lessons.filter(l => l.mod === m.id);
          const read = ls.filter(l => s.lessons[l.id]?.readAt).length;
          return (
            <a key={m.id} href={`#/percorso/${m.id}`} className="card mod" style={{ borderTopColor: m.color }}>
              <div className="tag">Modulo {m.n}</div>
              <b>{m.title}</b>
              <p className="small muted">{m.desc}</p>
              <Bar v={pct(read, ls.length)} color={m.color} />
              <span className="small muted">{read}/{ls.length} lezioni</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
