import React, { useEffect, useRef, useState } from 'react';
import { useContent } from '../App.jsx';
import { useStore, update } from '../lib/store.js';
import { areaStats, lessonPace } from '../lib/planner.js';
import { pct } from '../lib/util.js';
import { Md, useCoach, Spinner } from '../components.jsx';

const SUGGEST = {
  chat: ['Cosa dovrei studiare questa settimana, visti i miei dati?', 'Spiegami la differenza tra revoca e annullamento d\'ufficio con un esempio scolastico', 'Fammi uno schema degli organi collegiali con le competenze esclusive', 'Come rispondo se all\'orale mi chiedono la mia idea di leadership?'],
  interroga: ['Inizia pure'],
  verifica: ['Il D.I. 129/2018 è ancora il regolamento di contabilità vigente per le scuole?', 'Qual è oggi la disciplina del colloquio dell\'esame di maturità?', 'Ci sono novità sul bando del prossimo concorso per dirigenti scolastici?'],
};

export default function Coach({ query }) {
  const content = useContent();
  const s = useStore();
  const params = new URLSearchParams(query);
  const lesson = content.lessons.find(l => l.id === params.get('lesson'));
  const topicParam = params.get('topic');
  const [mode, setMode] = useState(lesson || topicParam ? 'interroga' : 'chat');
  const [msgs, setMsgs] = useState(mode === 'chat' ? s.chat : []);
  const [input, setInput] = useState('');
  const { busy, err, run } = useCoach();
  const endRef = useRef();
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  const progress = () => {
    const st = areaStats(content, s); const p = lessonPace(content, s);
    const lines = Object.entries(content.areas).map(([a, n]) => `${n}: quiz visti ${st[a].seen}/${st[a].total}, corretti ${st[a].n ? pct(st[a].ok, st[a].n) : '–'}%`);
    const sc = s.scritto.slice(-3).map(x => `scritto ${x.date}: ${x.score ?? '?'}/20`);
    const or = s.orale.slice(-3).map(x => `orale ${x.date}: ${x.score ?? '?'}/10`);
    return [`Lezioni studiate ${p.read}/${p.total}; giorni alla data obiettivo ${p.daysToExam}`, ...lines, ...sc, ...or].join('\n');
  };

  const send = async (text) => {
    const t = (text ?? input).trim(); if (!t) return;
    const next = [...msgs, { role: 'user', content: t }];
    setMsgs(next); setInput('');
    const context = mode === 'interroga'
      ? (lesson ? { lessonTitle: lesson.title, lessonText: lesson.md, module: content.modules.find(m => m.id === lesson.mod)?.title } : { topic: topicParam === 'orale' ? 'Colloquio orale completo del concorso DS: domande sulle aree del programma, un caso concreto, una domanda in inglese.' : (topicParam || 'tutte le aree del programma del concorso DS') })
      : { progress: progress() };
    const r = await run(mode, { messages: next, context });
    if (r) {
      const all = [...next, { role: 'assistant', content: r.text }];
      setMsgs(all);
      if (mode === 'chat') update(x => { x.chat = all.slice(-40); });
    }
  };

  const switchMode = m => { setMode(m); setMsgs(m === 'chat' ? s.chat : []); };

  return (
    <div className="coach">
      <h1>Coach</h1>
      <div className="seg">
        <button className={mode === 'chat' ? 'on' : ''} onClick={() => switchMode('chat')}>Coach di studio</button>
        <button className={mode === 'interroga' ? 'on' : ''} onClick={() => switchMode('interroga')}>Interrogazione</button>
        <button className={mode === 'verifica' ? 'on' : ''} onClick={() => switchMode('verifica')}>Verifica norma (web)</button>
      </div>
      {mode === 'interroga' && <p className="small muted">Tema: <b>{lesson ? lesson.title : (topicParam === 'orale' ? 'colloquio orale completo' : topicParam || 'tutte le aree')}</b>. Una domanda alla volta, con voto e domanda di rinforzo.</p>}
      {mode === 'verifica' && <p className="small muted">Il coach cerca sulle fonti ufficiali (Normattiva, Gazzetta, MIM…) e ti dice se un'informazione è ancora valida. Può richiedere 1-2 minuti.</p>}
      <div className="chat">
        {msgs.length === 0 && (
          <div className="sugg">
            {SUGGEST[mode].map(x => <button key={x} className="chip" onClick={() => send(x)}>{x}</button>)}
          </div>
        )}
        {msgs.map((m, i) => <div key={i} className={'msg ' + m.role}>{m.role === 'assistant' ? <Md src={m.content} /> : <p>{m.content}</p>}</div>)}
        {busy && <Spinner />}
        {err && <p className="err">{err}</p>}
        <div ref={endRef} />
      </div>
      <div className="composer">
        <textarea rows={2} value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'interroga' ? 'Rispondi come all\'esame…' : 'Scrivi al coach…'} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }} />
        <button className="btn primary" disabled={busy || !input.trim()} onClick={() => send()}>Invia</button>
      </div>
      {mode === 'chat' && msgs.length > 0 && <button className="btn link small" onClick={() => { setMsgs([]); update(x => { x.chat = []; }); }}>Nuova conversazione</button>}
    </div>
  );
}
