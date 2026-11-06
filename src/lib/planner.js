import { today, daysBetween, addDays } from './util.js';
import { isDue } from './srs.js';

// Coppie di moduli studiati in parallelo (alternanza), poi ripasso misto di tutto (interleaving).
const PAIRS = [['M1', 'M3'], ['M2', 'M4'], ['M5', 'M6'], ['M7']];
const START = ['M0-00', 'M0-01', 'M0-03'];
const EXTRA = ['M0-02', 'M0-04', 'M0-05', 'M8-01', 'M8-02', 'M9-01', 'M9-02', 'M0-06', 'M8-04', 'M9-04'];

export function curriculum(content) {
  const byMod = {};
  content.lessons.forEach(l => { (byMod[l.mod] = byMod[l.mod] || []).push(l.id); });
  const order = [...START];
  let extraI = 0, count = 0;
  for (const pair of PAIRS) {
    const qs = pair.map(m => [...(byMod[m] || [])]);
    while (qs.some(q => q.length)) {
      for (const q of qs) {
        if (q.length) { order.push(q.shift()); count++; }
        if (count % 6 === 0 && extraI < EXTRA.length) order.push(EXTRA[extraI++]);
      }
    }
  }
  while (extraI < EXTRA.length) order.push(EXTRA[extraI++]);
  const all = new Set(order);
  content.lessons.forEach(l => { if (!all.has(l.id)) order.push(l.id); });
  return order.filter((id, i) => order.indexOf(id) === i && content.lessons.some(l => l.id === id));
}

export function unlockedModules(content, s) {
  const set = new Set();
  content.lessons.forEach(l => { if (s.lessons[l.id]?.readAt) set.add(l.mod); });
  return set;
}

export function allItems(content, s) {
  const quiz = [...content.quiz, ...(s.genQuiz || [])].map(q => ({ ...q, type: 'quiz' }));
  const cards = content.cards.map(c => ({ ...c, type: 'card' }));
  const nov = (content.aggiornamenti?.items || []).concat(s.novitaLocal || [])
    .filter(n => n.flashcard?.f).map(n => ({ id: 'NV-' + (n.id || n.titolo), f: n.flashcard.f, b: n.flashcard.b, type: 'card', novita: true }));
  return [...quiz, ...cards, ...nov];
}

// Coda del ripasso misto di oggi: dovuti + nuovi dai moduli sbloccati (interleaving)
export function reviewQueue(content, s, { limitNew } = {}) {
  const d = today();
  const unlocked = unlockedModules(content, s);
  const items = allItems(content, s);
  const due = items.filter(it => isDue(s.items[it.id], d));
  const introducedToday = s.days[d]?.newIntro || 0;
  const maxNew = Math.max(0, (limitNew ?? s.settings.quizNewPerDay) - introducedToday);
  const fresh = items.filter(it => !s.items[it.id] && (it.type === 'card' || unlocked.has(it.mod)))
    .filter(it => it.type !== 'card' || unlocked.size > 0)
    .slice(0, 400);
  // mescola i nuovi per modulo per avere interleaving
  const byMod = {};
  fresh.forEach(it => { const k = it.mod || 'card'; (byMod[k] = byMod[k] || []).push(it); });
  const mods = Object.keys(byMod);
  const news = [];
  let i = 0;
  while (news.length < maxNew && mods.some(m => byMod[m].length)) {
    const m = mods[i++ % mods.length];
    if (byMod[m].length) news.push(byMod[m].splice(Math.floor(Math.random() * byMod[m].length), 1)[0]);
  }
  return { due, news };
}

export function lessonPace(content, s) {
  const read = content.lessons.filter(l => s.lessons[l.id]?.readAt).length;
  const remaining = content.lessons.length - read;
  const exam = s.settings.examDate;
  const target = addDays(exam, -45); // ultime 6 settimane: solo ripasso e simulazioni
  const daysLeft = Math.max(1, daysBetween(today(), target));
  const studyDaysPerWeek = (s.settings.studyDays || []).length || 6;
  const studyDaysLeft = Math.max(1, Math.round(daysLeft * studyDaysPerWeek / 7));
  const auto = Math.max(1, Math.ceil(remaining / studyDaysLeft));
  const perDay = s.settings.newPerDay > 0 ? s.settings.newPerDay : auto;
  return { read, remaining, total: content.lessons.length, perDay, auto, daysToExam: daysBetween(today(), exam), target };
}

export function todayPlan(content, s) {
  const d = today();
  const order = curriculum(content);
  const pace = lessonPace(content, s);
  const doneToday = content.lessons.filter(l => s.lessons[l.id]?.readAt === d).length;
  const nextNew = order.filter(id => !s.lessons[id]?.readAt).slice(0, Math.max(0, pace.perDay - doneToday));
  const lessonReviews = content.lessons.filter(l => s.lessons[l.id]?.next && s.lessons[l.id].next <= d && s.lessons[l.id].readAt !== d);
  const { due, news } = reviewQueue(content, s);
  const unlocked = unlockedModules(content, s);
  const lastScritto = s.scritto.length ? s.scritto[s.scritto.length - 1].date : null;
  const lastOrale = s.orale.length ? s.orale[s.orale.length - 1].date : null;
  const lastSim = s.sims.length ? s.sims[s.sims.length - 1].date : null;
  const studyDay = (s.settings.studyDays || []).includes(new Date().getDay() === 0 ? 7 : new Date().getDay());
  const weekly = [];
  const coreUnlocked = [...unlocked].filter(m => /^M[1-7]$/.test(m)).length;
  if (coreUnlocked >= 1 && (!lastOrale || daysBetween(lastOrale, d) >= 4)) weekly.push({ kind: 'orale', label: 'Un caso concreto per l\'orale', why: 'Due volte a settimana: allena il trasferimento della norma all\'azione (5 passi).' });
  if (coreUnlocked >= 2 && (!lastScritto || daysBetween(lastScritto, d) >= 7)) weekly.push({ kind: 'scritto', label: 'Un quesito della prova scritta (35 minuti)', why: 'Una volta a settimana: scrittura a tempo con le quattro mosse.' });
  if (coreUnlocked >= 3 && (!lastSim || daysBetween(lastSim, d) >= 14)) weekly.push({ kind: 'sim', label: 'Simulazione a tempo', why: 'Ogni due settimane: misura i progressi e abitua alla pressione del tempo.' });
  const minutes = Math.round((due.length + news.length) * 0.6 + nextNew.length * 25 + lessonReviews.length * 8);
  return { pace, nextNew, lessonReviews, due, news, weekly, minutes, studyDay, order };
}

export function areaStats(content, s) {
  const out = {};
  for (const a of Object.keys(content.areas)) out[a] = { n: 0, ok: 0, seen: 0, mastered: 0, total: 0 };
  [...content.quiz, ...(s.genQuiz || [])].forEach(q => {
    const st = out[q.area]; if (!st) return;
    st.total++;
    const r = s.items[q.id];
    if (r) { st.seen++; st.n += r.h.length; st.ok += r.h.reduce((a, b) => a + b, 0); if (r.iv >= 21) st.mastered++; }
  });
  return out;
}
