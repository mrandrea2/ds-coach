import React, { useState } from 'react';
import { useStore, update, exportData, importData, resetAll, setKey } from '../lib/store.js';
import { useContent } from '../App.jsx';
import { lessonPace } from '../lib/planner.js';

const GG = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export default function Impostazioni() {
  const s = useStore();
  const content = useContent();
  const p = lessonPace(content, s);
  const [msg, setMsg] = useState('');
  const set = (k, v) => update(x => { x.settings[k] = v; });
  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ds-coach-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };
  const upload = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { try { importData(t); setMsg('Backup ripristinato.'); } catch { setMsg('File non valido.'); } });
  };
  return (
    <div>
      <h1>Impostazioni</h1>
      <div className="card form">
        <label>Data obiettivo della prova (stima, finché non esce il bando)
          <input type="date" value={s.settings.examDate} onChange={e => set('examDate', e.target.value)} />
        </label>
        <label>Lezioni nuove al giorno (0 = automatico: ora {p.auto})
          <input type="number" min="0" max="6" value={s.settings.newPerDay} onChange={e => set('newPerDay', +e.target.value)} />
        </label>
        <label>Nuovi quesiti al giorno nel ripasso misto
          <input type="number" min="0" max="60" value={s.settings.quizNewPerDay} onChange={e => set('quizNewPerDay', +e.target.value)} />
        </label>
        <div>Giorni di studio
          <div className="row">{[1, 2, 3, 4, 5, 6, 7].map(d => (
            <label key={d} className="chip"><input type="checkbox" checked={s.settings.studyDays.includes(d)} onChange={e => set('studyDays', e.target.checked ? [...s.settings.studyDays, d] : s.settings.studyDays.filter(x => x !== d))} /> {GG[d]}</label>
          ))}</div>
        </div>
      </div>
      <h2>Dati</h2>
      <p className="small muted">I progressi sono salvati in questo browser. Per usarli su un altro dispositivo, scarica il backup e caricalo lì. Fallo ogni tanto anche come sicurezza.</p>
      <div className="row">
        <button className="btn" onClick={download}>Scarica backup</button>
        <label className="btn">Carica backup<input type="file" accept="application/json" onChange={upload} hidden /></label>
        <button className="btn" onClick={() => { setKey(''); location.reload(); }}>Esci (cambia password)</button>
        <button className="btn danger" onClick={() => { if (confirm('Cancellare tutti i progressi su questo dispositivo?')) resetAll(); }}>Azzera progressi</button>
      </div>
      {msg && <p>{msg}</p>}
      <p className="small muted">Contenuti: {content.lessons.length} lezioni · {content.quiz.length} quiz · {content.cards.length} flashcard · versione del {content.built}.</p>
    </div>
  );
}
