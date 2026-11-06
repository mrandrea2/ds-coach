import React, { useMemo, useState } from 'react';
import { useContent, go } from '../App.jsx';
import { useStore, update, logDay } from '../lib/store.js';
import { scheduleLesson, schedule } from '../lib/srs.js';
import { today, shuffle, itDate } from '../lib/util.js';
import { Md, useCoach, Spinner, QuizCard } from '../components.jsx';

function keyPointsMd(l) {
  if (l.kp?.length) return l.kp.map(k => `- ${k.t}`).join('\n');
  const heads = (l.md.match(/^### .+$/gm) || []).map(h => '- ' + h.slice(4));
  return heads.length ? heads.join('\n') : '- Rileggi i titoletti e le tabelle della lezione.';
}

export default function Lezione({ id, flag }) {
  const content = useContent();
  const s = useStore();
  const l = content.lessons.find(x => x.id === id);
  const m = l && content.modules.find(x => x.id === l.mod);
  const st = s.lessons[id];
  const reviewMode = flag === 'ripasso';
  const [phase, setPhase] = useState(reviewMode ? 'recall' : 'read');
  const [recall, setRecall] = useState('');
  const [showLesson, setShowLesson] = useState(!reviewMode);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const { busy, err, run } = useCoach();
  const [busyWhat, setBusyWhat] = useState('');

  const idx = content.lessons.findIndex(x => x.id === id);
  const next = content.lessons[idx + 1];
  const quizPool = useMemo(() => {
    if (!m) return [];
    const pool = [...content.quiz, ...(s.genQuiz || [])].filter(q => q.lesson === id || m.areas.includes(q.area));
    const own = pool.filter(q => q.lesson === id);
    return [...own, ...shuffle(pool.filter(q => q.lesson !== id))].slice(0, 5);
  }, [id]);

  if (!l) return <p>Lezione non trovata. <a href="#/percorso">Torna al percorso</a></p>;

  const ctx = { lessonTitle: l.title, module: m?.title, lessonText: l.md };

  const deepen = async () => {
    setBusyWhat('deep');
    const r = await run('approfondisci', { context: ctx });
    if (r) update(x => { x.deep[id] = r.text; });
  };
  const ask = async () => {
    if (!question.trim()) return;
    setBusyWhat('ask');
    const r = await run('spiega', { context: ctx, messages: [{ role: 'user', content: question }] });
    if (r) setAnswer(r.text);
  };
  const genQuiz = async () => {
    setBusyWhat('quiz');
    const r = await run('quiz', { context: { ...ctx, n: 6 } });
    if (r?.data?.length) {
      const area = m.areas[0] || 1;
      update(x => {
        r.data.forEach((q, i) => {
          if (!q.q || !Array.isArray(q.o) || q.o.length < 2) return;
          x.genQuiz.push({ id: `G${Date.now().toString(36)}${i}`, area, mod: l.mod, lesson: id, q: q.q, o: q.o, c: +q.c || 0, e: q.e || '', t: q.t || '', gen: true });
        });
      });
      setAnswer(`✓ Aggiunti ${r.data.length} nuovi quesiti su questa lezione: entrano nel ripasso misto e nel quiz di fine lezione.`);
    }
  };
  const verify = async () => {
    setBusyWhat('ver');
    const r = await run('verifica', { context: ctx, messages: [{ role: 'user', content: `Verifica la vigenza dei riferimenti normativi principali di questa lezione («${l.title}»), in particolare date, numeri e soglie.` }] });
    if (r) setAnswer(r.text);
  };

  const finishRead = () => { setPhase('recall'); setShowLesson(false); window.scrollTo(0, 0); };
  const rate = rating => {
    update(x => {
      const prev = x.lessons[id] || {};
      const nx = scheduleLesson(prev, rating);
      if (!prev.readAt) nx.readAt = today();
      nx.recall = recall.slice(0, 2000);
      x.lessons[id] = nx;
    });
    logDay(d => { if (reviewMode) d.reviews++; else if (!st?.readAt) d.lessons++; });
    if (!reviewMode && quizPool.length && l.kind !== 'checklist') { setPhase('quiz'); window.scrollTo(0, 0); }
    else setPhase('end');
  };
  const answerQ = ok => {
    const q = quizPool[qIdx];
    update(x => { x.items[q.id] = schedule(x.items[q.id], ok ? 4 : 1); });
    logDay(d => { d.ans++; if (ok) d.ok++; if (!s.items[q.id]) d.newIntro = (d.newIntro || 0) + 1; });
    if (ok) setScore(v => v + 1);
    if (qIdx + 1 < quizPool.length) setQIdx(qIdx + 1); else setPhase('end');
  };

  return (
    <article className="lesson">
      <a href={`#/percorso/${l.mod}`} className="back">← {m?.title}</a>
      <div className="tag" style={{ color: m?.color }}>{m?.short} · {l.kind}</div>
      <h1>{l.title}</h1>
      {st?.readAt && <p className="small muted">Studiata il {itDate(st.readAt)} · prossimo richiamo {itDate(st.next)} · ripassi fatti: {(st.reviews || []).length}</p>}

      {phase === 'recall' && (
        <div className="card recall">
          <h3>{reviewMode ? 'Richiamo: cosa ricordi di questa lezione?' : 'Richiamo libero, senza guardare'}</h3>
          <p className="small muted">Scrivi (o di' a voce) i concetti chiave, le norme e i numeri che ricordi. Lo sforzo di recupero è ciò che fissa il ricordo: non importa se è incompleto.</p>
          <textarea rows={6} value={recall} onChange={e => setRecall(e.target.value)} placeholder="Es.: PTOF → elabora il Collegio, approva il CdI, indirizzi del DS (c. 14 L. 107/2015)…" />
          <details className="kp" onToggle={e => e.target.open && setShowLesson(false)}>
            <summary>Confronta con i punti chiave</summary>
            <Md src={keyPointsMd(l)} />
            <p className="small">Quanto ricordavi?</p>
            <div className="grades">
              <button className="btn g1" onClick={() => rate('poco')}>Poco</button>
              <button className="btn g3" onClick={() => rate('parte')}>In parte</button>
              <button className="btn g5" onClick={() => rate('tutto')}>Quasi tutto</button>
            </div>
          </details>
          {<button className="btn link" onClick={() => setShowLesson(v => !v)}>{showLesson ? 'Nascondi' : 'Rileggi'} la lezione</button>}
        </div>
      )}

      {phase === 'quiz' && quizPool[qIdx] && (
        <div>
          <h3>Verifica immediata · {qIdx + 1}/{quizPool.length}</h3>
          <QuizCard key={quizPool[qIdx].id} q={quizPool[qIdx]} onAnswer={answerQ} />
        </div>
      )}

      {phase === 'end' && (
        <div className="card done-box">
          <h3>✓ Fatto</h3>
          {quizPool.length > 0 && !reviewMode && <p>Quiz: {score}/{quizPool.length}. Gli errori torneranno domani nel ripasso misto.</p>}
          <p className="small muted">Prossimo richiamo di questa lezione: {itDate(s.lessons[id]?.next)}. Concediti 5 minuti di pausa senza schermo.</p>
          <div className="row">
            <button className="btn primary" onClick={() => go('/')}>Torna a Oggi</button>
            {next && next.mod === l.mod && <a className="btn" href={`#/lezione/${next.id}`}>Lezione successiva →</a>}
          </div>
        </div>
      )}

      {showLesson && phase !== 'quiz' && (
        <>
          <Md src={l.md} />
          {l.checks?.length > 0 && (
            <div className="card">
              <h3>Autoverifica: spunta solo dopo averlo detto ad alta voce</h3>
              {l.checks.map((c, i) => (
                <label key={i} className="check">
                  <input type="checkbox" checked={!!s.checks[id + ':' + i]} onChange={e => update(x => { x.checks[id + ':' + i] = e.target.checked; })} /> {c}
                </label>
              ))}
            </div>
          )}

          {s.deep[id] && (
            <section className="deep">
              <div className="tag">✦ Approfondimento del coach</div>
              <Md src={s.deep[id]} />
              <p className="small muted">Generato dall'IA: verifica numeri e date sulle fonti ufficiali prima di memorizzarli.</p>
            </section>
          )}

          <section className="card coachbar">
            <h3>Coach su questa lezione</h3>
            <div className="row">
              <button className="btn" disabled={busy} onClick={deepen}>{s.deep[id] ? 'Rigenera approfondimento' : '✦ Approfondisci (più contenuti)'}</button>
              <button className="btn" disabled={busy} onClick={genQuiz}>Genera 6 quiz</button>
              <a className="btn" href={`#/coach?lesson=${id}`}>Interrogami</a>
              <button className="btn" disabled={busy} onClick={verify}>Verifica vigenza (web)</button>
            </div>
            <div className="ask">
              <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Chiedi il perché di un passaggio, un esempio, un collegamento…" onKeyDown={e => e.key === 'Enter' && ask()} />
              <button className="btn primary" disabled={busy || !question.trim()} onClick={ask}>Chiedi</button>
            </div>
            {busy && <Spinner label={busyWhat === 'deep' ? 'Scrivo l\'approfondimento (30-60 s)…' : busyWhat === 'ver' ? 'Cerco sulle fonti ufficiali (fino a 1-2 min)…' : 'Il coach sta scrivendo…'} />}
            {err && <p className="err">{err}</p>}
            {answer && <Md src={answer} className="answerbox" />}
          </section>

          {phase === 'read' && (
            <div className="sticky-end">
              <button className="btn primary big" onClick={finishRead}>{st?.readAt ? 'Richiamo e ripasso' : 'Ho letto: passo al richiamo →'}</button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
