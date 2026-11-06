// Ripetizione distanziata: variante SM-2 con intervalli in giorni.
import { today, addDays } from './util.js';

export const LESSON_STEPS = [1, 3, 7, 16, 35, 90];

// grade: 1 = sbagliato/di nuovo, 3 = difficile, 4 = bene, 5 = facile
export function schedule(rec, grade) {
  const r = rec ? { ...rec } : { ef: 2.5, iv: 0, reps: 0, lapses: 0, h: [] };
  r.h = [...(r.h || []), grade >= 3 ? 1 : 0].slice(-12);
  r.last = today();
  if (grade < 3) {
    r.reps = 0; r.lapses = (r.lapses || 0) + 1; r.iv = 1;
    r.ef = Math.max(1.3, r.ef - 0.2);
  } else {
    r.reps += 1;
    if (r.reps === 1) r.iv = grade === 5 ? 3 : 1;
    else if (r.reps === 2) r.iv = grade === 3 ? 3 : 6;
    else r.iv = Math.round(r.iv * (grade === 3 ? 1.2 : r.ef) * (grade === 5 ? 1.3 : 1));
    r.ef = Math.max(1.3, r.ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  }
  r.iv = Math.min(r.iv, 180);
  r.due = addDays(today(), r.iv);
  return r;
}

export const isDue = (rec, d = today()) => rec && rec.due && rec.due <= d;
export const mastered = rec => rec && rec.iv >= 21;

export function scheduleLesson(rec, rating) {
  // rating: 'poco' | 'parte' | 'tutto'
  const r = { ...(rec || {}) };
  let step = r.step ?? -1;
  if (rating === 'poco') step = 0;
  else if (rating === 'parte') step = Math.max(0, step);
  else step = Math.min(step + 1, LESSON_STEPS.length - 1);
  r.step = step;
  r.next = addDays(today(), LESSON_STEPS[step]);
  r.reviews = [...(r.reviews || []), { d: today(), r: rating }];
  return r;
}
