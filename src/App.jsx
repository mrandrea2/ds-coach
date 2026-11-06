import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchContent } from './lib/api.js';
import { getKey, setKey, useStore } from './lib/store.js';
import Today from './pages/Today.jsx';
import Percorso from './pages/Percorso.jsx';
import Lezione from './pages/Lezione.jsx';
import { Ripasso, Flashcards, QuizArea, Errori } from './pages/Allenamento.jsx';
import Allenamento from './pages/AllenamentoHome.jsx';
import Simulazione from './pages/Simulazione.jsx';
import { ScrittoList, ScrittoDo } from './pages/Scritto.jsx';
import { OraleList, OraleDo } from './pages/Orale.jsx';
import Coach from './pages/Coach.jsx';
import Novita from './pages/Novita.jsx';
import Progressi from './pages/Progressi.jsx';
import Impostazioni from './pages/Impostazioni.jsx';

const Ctx = createContext(null);
export const useContent = () => useContext(Ctx);

export function useRoute() {
  const [h, setH] = useState(window.location.hash.slice(1) || '/');
  useEffect(() => {
    const f = () => { setH(window.location.hash.slice(1) || '/'); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return h;
}
export const go = path => { window.location.hash = path; };

function Login({ onOk, error }) {
  const [k, setK] = useState('');
  const [err, setErr] = useState(error || '');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const c = await fetchContent(k); setKey(k); onOk(c); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <div className="login">
      <form onSubmit={submit} className="card">
        <div className="brand big">DS<span>·</span>Coach</div>
        <p className="muted">Preparazione al concorso per dirigente scolastico</p>
        <input type="password" placeholder="Password dell'app" value={k} onChange={e => setK(e.target.value)} autoFocus />
        <button className="btn primary" disabled={busy || !k}>{busy ? 'Verifico…' : 'Entra'}</button>
        {err && <p className="err">{err}</p>}
      </form>
    </div>
  );
}

const NAV = [
  ['/', 'Oggi', '☀'], ['/percorso', 'Percorso', '☰'], ['/allenamento', 'Allenati', '✎'],
  ['/coach', 'Coach', '✦'], ['/progressi', 'Progressi', '▲'],
];

export default function App() {
  const [content, setContent] = useState(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const route = useRoute();

  useEffect(() => {
    if (!getKey()) { setNeedLogin(true); return; }
    fetchContent().then(setContent).catch(e => { setLoadErr(e.message); setNeedLogin(true); });
  }, []);

  if (needLogin && !content) return <Login onOk={c => { setContent(c); setNeedLogin(false); }} error={loadErr} />;
  if (!content) return <div className="loading">Carico i contenuti…</div>;

  const [path, query = ''] = route.split('?');
  const [, p1, p2] = path.split('/');
  let page;
  switch (p1) {
    case '': case undefined: page = <Today />; break;
    case 'percorso': page = <Percorso mod={p2} />; break;
    case 'lezione': page = <Lezione key={p2 + query} id={p2} flag={query} />; break;
    case 'allenamento': page = <Allenamento />; break;
    case 'ripasso': page = <Ripasso />; break;
    case 'flashcard': page = <Flashcards />; break;
    case 'quiz': page = <QuizArea key={p2} area={p2} />; break;
    case 'errori': page = <Errori />; break;
    case 'sim': page = <Simulazione />; break;
    case 'scritto': page = p2 ? <ScrittoDo key={p2} id={p2} /> : <ScrittoList />; break;
    case 'orale': page = p2 ? <OraleDo key={p2} id={p2} /> : <OraleList />; break;
    case 'coach': page = <Coach key={query} query={query} />; break;
    case 'novita': page = <Novita />; break;
    case 'progressi': page = <Progressi />; break;
    case 'impostazioni': page = <Impostazioni />; break;
    default: page = <Today />;
  }
  const active = '/' + (p1 || '');
  return (
    <Ctx.Provider value={content}>
      <header className="top">
        <a href="#/" className="brand">DS<span>·</span>Coach</a>
        <nav className="topnav">
          {NAV.map(([p, l]) => <a key={p} href={'#' + p} className={active === p ? 'on' : ''}>{l}</a>)}
          <a href="#/novita" className={active === '/novita' ? 'on' : ''}>Novità</a>
          <a href="#/impostazioni" className={active === '/impostazioni' ? 'on' : ''}>⚙</a>
        </nav>
        <a href="#/impostazioni" className="gear">⚙</a>
      </header>
      <main className="wrap">{page}</main>
      <nav className="bottomnav">
        {NAV.map(([p, l, i]) => <a key={p} href={'#' + p} className={active === p ? 'on' : ''}><span>{i}</span>{l}</a>)}
      </nav>
    </Ctx.Provider>
  );
}
