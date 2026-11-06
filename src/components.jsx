import React, { useEffect, useRef, useState } from 'react';
import { renderMd } from './lib/md.js';
import { coach } from './lib/api.js';

export const Md = ({ src, className = '' }) => <div className={'md ' + className} dangerouslySetInnerHTML={{ __html: renderMd(src) }} />;

export const Bar = ({ v, color }) => <div className="bar"><div style={{ width: Math.min(100, v) + '%', background: color }} /></div>;

export function useCoach() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (mode, payload) => {
    setBusy(true); setErr('');
    try { return await coach(mode, payload); } catch (e) { setErr(e.message); return null; } finally { setBusy(false); }
  };
  return { busy, err, run };
}

export const Spinner = ({ label = 'Il coach sta scrivendo…' }) => <div className="spinner"><i /> {label}</div>;

export function Timer({ seconds, running, onEnd }) {
  const [left, setLeft] = useState(seconds);
  const ref = useRef();
  useEffect(() => { setLeft(seconds); }, [seconds]);
  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => setLeft(l => {
      if (l <= 1) { clearInterval(ref.current); onEnd && onEnd(); return 0; }
      return l - 1;
    }), 1000);
    return () => clearInterval(ref.current);
  }, [running]);
  const m = Math.floor(left / 60), s = left % 60;
  return <span className={'timer' + (left < 300 ? ' low' : '')}>{m}:{String(s).padStart(2, '0')}</span>;
}

// Un quesito a scelta multipla con feedback immediato
export function QuizCard({ q, onAnswer, showArea, areas, examMode }) {
  const [order] = useState(() => [0, 1, 2, 3].slice(0, q.o.length).sort(() => Math.random() - 0.5));
  const [pick, setPick] = useState(null);
  const answered = pick !== null;
  const choose = i => {
    if (answered) return;
    setPick(i);
    if (examMode) onAnswer(i === q.c, i);
  };
  return (
    <div className="card quiz">
      {showArea && <div className="tag">{areas?.[q.area] || ''}{q.gen ? ' · generato dal coach' : ''}</div>}
      <p className="qtext">{q.q}</p>
      <div className="opts">
        {order.map(i => {
          let cls = 'opt';
          if (answered && !examMode) { if (i === q.c) cls += ' right'; else if (i === pick) cls += ' wrong'; }
          if (answered && examMode && i === pick) cls += ' picked';
          return <button key={i} className={cls} onClick={() => choose(i)}>{q.o[i]}</button>;
        })}
      </div>
      {answered && !examMode && (
        <div className={'fb ' + (pick === q.c ? 'ok' : 'ko')}>
          <b>{pick === q.c ? 'Esatto.' : 'Non è così.'}</b> {q.e}
          {q.t && <div className="trap"><b>Trappola:</b> {q.t}</div>}
          <button className="btn primary" onClick={() => onAnswer(pick === q.c, pick)}>Avanti →</button>
        </div>
      )}
    </div>
  );
}

export function FlashCard({ c, onGrade }) {
  const [flip, setFlip] = useState(false);
  return (
    <div className="card flash">
      {c.novita && <div className="tag">Novità normativa</div>}
      <p className="qtext">{c.f}</p>
      {!flip ? (
        <>
          <p className="muted small">Prova a dire la risposta a voce prima di girare la carta.</p>
          <button className="btn primary" onClick={() => setFlip(true)}>Mostra risposta</button>
        </>
      ) : (
        <>
          <div className="answer">{c.b}</div>
          <div className="grades">
            <button className="btn g1" onClick={() => onGrade(1)}>Non sapevo</button>
            <button className="btn g3" onClick={() => onGrade(3)}>A fatica</button>
            <button className="btn g4" onClick={() => onGrade(4)}>Sapevo</button>
            <button className="btn g5" onClick={() => onGrade(5)}>Facile</button>
          </div>
        </>
      )}
    </div>
  );
}

export const Empty = ({ children }) => <div className="card empty">{children}</div>;
