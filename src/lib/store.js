import { useSyncExternalStore } from 'react';
import { today } from './util.js';

const KEY = 'dscoach.v1';
const DEFAULT = {
  settings: { examDate: '2027-10-01', minutes: 90, studyDays: [1, 2, 3, 4, 5, 6], newPerDay: 0, quizNewPerDay: 15 },
  lessons: {},      // id -> {readAt, step, next, reviews:[{d,r}], recall}
  items: {},        // quiz/card id -> {ef, iv, reps, due, lapses, last, h:[0/1]}
  days: {},         // 'YYYY-MM-DD' -> {sec, ans, ok, lessons, reviews}
  deep: {},         // lessonId -> markdown approfondimento IA
  genQuiz: [],      // quiz generati dal coach
  scritto: [],      // {id, tracciaId, traccia, text, date, score, feedback}
  orale: [],        // {id, casoId, text, date, score, feedback}
  sims: [],         // {date, n, ok, sec, byArea}
  checks: {},       // checklist id:index -> true
  novitaLocal: [],  // novità trovate con "controlla ora"
  novitaSeen: {},
  chat: [],
};

let state = load();
const subs = new Set();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!s) return structuredClone(DEFAULT);
    return { ...structuredClone(DEFAULT), ...s, settings: { ...DEFAULT.settings, ...(s.settings || {}) } };
  } catch { return structuredClone(DEFAULT); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('salvataggio non riuscito', e); }
}
export function getState() { return state; }
export function update(fn) {
  const next = structuredClone(state);
  fn(next);
  state = next;
  save();
  subs.forEach(f => f());
}
export function useStore(sel = s => s) {
  return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, () => sel(state));
}
export function logDay(fn) {
  update(s => { const d = today(); s.days[d] = s.days[d] || { sec: 0, ans: 0, ok: 0, lessons: 0, reviews: 0 }; fn(s.days[d]); });
}
export function exportData() { return JSON.stringify(state, null, 1); }
export function importData(txt) { const s = JSON.parse(txt); state = { ...structuredClone(DEFAULT), ...s }; save(); subs.forEach(f => f()); }
export function resetAll() { state = structuredClone(DEFAULT); save(); subs.forEach(f => f()); }

// password per le API
export const getKey = () => localStorage.getItem('dscoach.key') || '';
export const setKey = k => localStorage.setItem('dscoach.key', k);
