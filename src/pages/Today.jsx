import React from 'react';
import { useContent } from '../App.jsx';
import { useStore } from '../lib/store.js';
import { todayPlan } from '../lib/planner.js';
import { itDate, today, pct } from '../lib/util.js';
import { Bar } from '../components.jsx';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { t: 'Buongiorno, Andrea', tip: 'Mattina: il momento migliore per la teoria nuova. Parti dalla lezione, poi il ripasso.' };
  if (h < 18) return { t: 'Buon pomeriggio, Andrea', tip: 'Pomeriggio: ottimo per allenamento attivo (quiz, scritto, caso orale).' };
  return { t: 'Buonasera, Andrea', tip: 'Sera: meglio 10-15 minuti di richiamo (flashcard, ripasso misto) che teoria nuova. Il sonno consoliderà il resto.' };
}

export default function Today() {
  const content = useContent();
  const s = useStore();
  const plan = todayPlan(content, s);
  const L = id => content.lessons.find(l => l.id === id);
  const mod = id => content.modules.find(m => m.id === id);
  const g = greeting();
  const nov = (content.aggiornamenti?.items || []).filter(n => !s.novitaSeen[n.id]);
  const doneToday = s.days[today()] || {};
  const reviewCount = plan.due.length + plan.news.length;

  return (
    <div className="today">
      <section className="hero">
        <h1>{g.t}</h1>
        <p className="muted">{plan.pace.daysToExam > 0 ? <>Mancano <b>{plan.pace.daysToExam}</b> giorni alla data obiettivo ({itDate(s.settings.examDate)}).</> : 'Imposta la data obiettivo nelle impostazioni.'} Piano di oggi: circa <b>{plan.minutes}</b> minuti.</p>
        <div className="pace">
          <div><b>{plan.pace.read}</b>/{plan.pace.total} lezioni studiate</div>
          <Bar v={pct(plan.pace.read, plan.pace.total)} />
          <div className="small muted">Ritmo: {plan.pace.perDay} {plan.pace.perDay === 1 ? 'lezione nuova' : 'lezioni nuove'} al giorno per finire il primo giro entro il {itDate(plan.pace.target)} e lasciare 6 settimane a ripasso e simulazioni.</div>
        </div>
        <p className="tip">💡 {g.tip}</p>
      </section>

      {nov.length > 0 && (
        <a className="card alert" href="#/novita">
          <b>⚖ {nov.length} {nov.length === 1 ? 'novità normativa' : 'novità normative'} da leggere</b>
          <span className="muted small"> · {nov[0].titolo}</span>
        </a>
      )}

      <h2>1 · Ripasso misto <span className="muted small">richiamo attivo + ripetizione distanziata</span></h2>
      {reviewCount > 0 ? (
        <a className="card task" href="#/ripasso">
          <div><b>{plan.due.length}</b> da ripassare oggi · <b>{plan.news.length}</b> nuovi quesiti dai moduli già iniziati</div>
          <div className="muted small">Circa {Math.round(reviewCount * 0.6)} minuti. Le aree sono mescolate apposta: allena a riconoscere quale regola applicare.</div>
          <span className="go">Inizia →</span>
        </a>
      ) : (
        <div className="card task done">
          {s.items && Object.keys(s.items).length ? '✓ Nessun ripasso dovuto oggi. Ottimo.' : 'Il ripasso si attiva dopo la prima lezione: i quiz di un modulo entrano in rotazione quando inizi a studiarlo.'}
          {doneToday.ans ? <span className="muted small"> · Oggi: {doneToday.ok}/{doneToday.ans} risposte corrette</span> : null}
        </div>
      )}

      {plan.lessonReviews.length > 0 && <>
        <h2>2 · Lezioni da richiamare <span className="muted small">a 1-3-7-16-35 giorni</span></h2>
        {plan.lessonReviews.slice(0, 4).map(l => (
          <a key={l.id} className="card task" href={`#/lezione/${l.id}?ripasso`}>
            <div className="tag" style={{ color: mod(l.mod)?.color }}>{mod(l.mod)?.short}</div>
            <div><b>{l.title}</b></div>
            <div className="muted small">Prima scrivi a memoria cosa ricordi, poi confronti con i punti chiave.</div>
            <span className="go">Richiama →</span>
          </a>
        ))}
        {plan.lessonReviews.length > 4 && <p className="muted small">+ altre {plan.lessonReviews.length - 4} lezioni in coda (le trovi domani in cima).</p>}
      </>}

      <h2>{plan.lessonReviews.length ? '3' : '2'} · Teoria nuova</h2>
      {plan.nextNew.length ? plan.nextNew.map(id => {
        const l = L(id); const m = mod(l.mod);
        return (
          <a key={id} className="card task" href={`#/lezione/${id}`}>
            <div className="tag" style={{ color: m?.color }}>{m?.title}</div>
            <div><b>{l.title}</b></div>
            <div className="muted small">{Math.max(5, Math.round(l.words / 180))} min di lettura · poi richiamo libero e quiz</div>
            <span className="go">Studia →</span>
          </a>
        );
      }) : <div className="card task done">✓ Teoria di oggi completata. Se hai energia: apri una lezione già studiata e chiedi al coach l'approfondimento.</div>}

      {plan.weekly.length > 0 && <>
        <h2>Allenamento di prova</h2>
        {plan.weekly.map(w => (
          <a key={w.kind} className="card task" href={w.kind === 'sim' ? '#/sim' : `#/${w.kind}`}>
            <div><b>{w.label}</b></div>
            <div className="muted small">{w.why}</div>
            <span className="go">Vai →</span>
          </a>
        ))}
      </>}

      <div className="card soft">
        <b>Come usare questa pagina</b>
        <p className="small">Segui l'ordine: prima il ripasso (scalda la memoria e consolida), poi la teoria nuova. Lavora a blocchi di 25-50 minuti con pause brevi e telefono in modalità silenziosa. Dopo una lezione nuova concediti 5 minuti senza schermo: aiutano a stabilizzare il ricordo.</p>
      </div>
    </div>
  );
}
