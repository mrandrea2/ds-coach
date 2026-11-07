// Genera la "lezione estesa" (2.500-3.500 parole) per ogni lezione di teoria, usando come fonti:
// 1) la lezione del fascicolo (aggiornata a luglio 2026), 2) le slide del corso (2023) più pertinenti.
// Salva un file Markdown per lezione in content/estese/<id>.md. Riprende da dove si era fermato.
// Uso: node scripts/genera-estese.mjs [--max 30] [--only M3] [--id M3-05] [--force] [--conc 3]
import fs from 'node:fs';
import path from 'node:path';
import { callClaude, BASE_SYSTEM } from '../api/_lib.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] ?? true) : d; };
const MAX = +arg('max', 200), ONLY = arg('only', ''), ID = arg('id', ''), FORCE = process.argv.includes('--force');
const CONC = +arg('conc', 3);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/content.json'), 'utf8'));
const OUT = path.join(ROOT, 'content/estese');
fs.mkdirSync(OUT, { recursive: true });

// ---------------- fonti: slide del corso, divise in blocchi
const SLIDE_DIR = path.join(ROOT, 'sources/slides');
const MOD_SLIDES = {
  M1: ['ORDINAMENTI', 'CICLI', 'RUOLO DEL DIRIGENTE', 'SISTEMI-SCOLASTICI'],
  M2: ['SISTEMA NAZIONALE', 'CICLI', 'ORGANI', 'RUOLO DEL DIRIGENTE'],
  M3: ['TEORIA ORGANIZZAZIONI', 'ORGANIZZAZIONE AMBIENTI', 'MODELLI INCLUSIVI', 'RUOLO DEL DIRIGENTE', 'RAPPORTI CON LE FAMIGLIE'],
  M4: ['GESTIONE PERSONALE', 'RELAZIONI SINDACALI', 'PROCEDIMENTI DISCIPLINARI', 'SICUREZZA', 'PRIVACY', 'RAPPORTO CON DSGA', 'ORGANI'],
  M5: ['DIRITTO', 'FONTI DEL DIRITTO', 'CONTENZIOSO', 'RESPONSABILITA', 'TRASPARENZA', 'PRIVACY', 'RAPPORTI CON LE FAMIGLIE'],
  M6: ['PROGRAMMA ANNUALE', 'ATTIVITA NEGOZIALE', 'NUOVO CODICE', 'AZIENDE AGRARIE', 'RAPPORTO CON DSGA'],
  M7: ['SISTEMI-SCOLASTICI'],
};
const STOP = new Set('della delle dello degli dei del per con nel nella nelle sono come anche alla alle allo agli una uno che non più tra fra sul sulla dal dalla dai essere viene quale quali questo questa ogni loro sua suo suoi sue art comma legge decreto scuola scuole scolastico scolastica'.split(' '));
const words = t => (t.toLowerCase().match(/[a-zà-ù0-9]{4,}/g) || []).filter(w => !STOP.has(w));
const chunks = [];
for (const f of fs.existsSync(SLIDE_DIR) ? fs.readdirSync(SLIDE_DIR) : []) {
  const txt = fs.readFileSync(path.join(SLIDE_DIR, f), 'utf8').replace(/\n{3,}/g, '\n\n');
  for (let i = 0; i < txt.length; i += 2400) {
    const body = txt.slice(i, i + 2800);
    chunks.push({ src: f.replace('.txt', ''), body, w: new Set(words(body)) });
  }
}
const df = {};
chunks.forEach(c => c.w.forEach(w => { df[w] = (df[w] || 0) + 1; }));

function pickSources(lesson, budget = 20000) {
  const q = {};
  words(lesson.title + ' ' + lesson.title + ' ' + (lesson.md.match(/^### .+$/gm) || []).join(' ') + ' ' + lesson.md.slice(0, 4000))
    .forEach(w => { q[w] = (q[w] || 0) + 1; });
  const pref = MOD_SLIDES[lesson.mod] || [];
  const scored = chunks.map(c => {
    let s = 0;
    for (const [w, n] of Object.entries(q)) if (c.w.has(w)) s += Math.min(n, 3) * Math.log(1 + chunks.length / (df[w] || 1));
    if (pref.some(p => c.src.toUpperCase().includes(p))) s *= 1.6;
    return { c, s };
  }).sort((a, b) => b.s - a.s);
  const out = []; let len = 0;
  for (const { c, s } of scored) {
    if (s <= 0 || len + c.body.length > budget) continue;
    out.push(c); len += c.body.length;
    if (len > budget * 0.95) break;
  }
  return out.map(c => `[Slide del corso: ${c.src}]\n${c.body}`).join('\n\n---\n\n');
}

const TASK = `COMPITO: scrivi la LEZIONE ESTESA da studiare sul tema indicato, come il capitolo di un ottimo manuale per il concorso a dirigente scolastico. Andrea deve poterla studiare SOLO da qui: spiega tutto, non fare un riassunto.

Requisiti:
- Lunghezza: 2.500-3.500 parole. Prosa chiara e argomentata (non solo elenchi), con titoletti "### " e, dove servono, tabelle di confronto.
- Copri TUTTO il contenuto della lezione base e ampliala: genesi e ratio delle norme, articoli e commi precisi, definizioni testuali che i quiz riprendono, procedure passo per passo (chi fa cosa, entro quando), giurisprudenza e prassi rilevanti, collegamenti con le altre aree del programma, esempi concreti di vita scolastica e il ruolo del dirigente (art. 25 D.lgs. 165/2001).
- Usa le slide del corso come fonte aggiuntiva, ma sono del 2023: dove la normativa è cambiata (lo dice la lezione base, aggiornata a luglio 2026) segui la lezione base e segnala il cambiamento.
- Riquadri, con questa sintassi esatta su righe proprie:
:::attenzione
trappola tipica da quiz o confusione frequente
:::
:::memoria
numeri, date, organi da sapere a memoria
:::
:::aggiornamento
cosa è cambiato rispetto ai materiali datati
:::
  Usane 4-8 in tutto, distribuiti nel testo.
- Se lezione base e slide indicano numeri di articolo o date diversi, scegli quello coerente con il testo della norma che conosci e segnala il dubbio con ⚠️.
- Se non sei certo di un numero, di una data o della vigenza, scrivi "⚠️ da verificare" invece di inventare.
- Chiudi con:
### Schema di ripasso
(elenco di 10-15 righe essenziali)
### Domande d'esame
(4 domande a risposta multipla con la soluzione tra parentesi, 2 quesiti aperti per lo scritto, 1 spunto di caso per l'orale)
- Non scrivere introduzioni sul compito, non salutare: inizia direttamente con il primo titoletto.`;

const ALIAS = (() => { try { return JSON.parse(fs.readFileSync(path.join(OUT, '_alias.json'), 'utf8')); } catch { return {}; } })();
const lessons = content.lessons.filter(l => !ALIAS[l.id] && l.id !== 'M6-90' &&
  /^M[1-7]$/.test(l.mod) && !['checklist', 'mappa'].includes(l.kind) &&
  (!ONLY || l.mod === ONLY) && (!ID || l.id === ID) &&
  (FORCE || !fs.existsSync(path.join(OUT, l.id + '.md'))));
const todo = lessons.slice(0, MAX);
console.log(`Da generare: ${todo.length} (su ${lessons.length} mancanti)`);
if (process.argv.includes('--dry')) {
  for (const l of todo.slice(0, 5)) { const src = pickSources(l); console.log(l.id, l.title, '→', src.length, 'caratteri da', [...new Set(src.match(/\[Slide del corso: [^\]]+\]/g) || [])].join(', ')); }
  process.exit(0);
}

let done = 0, failed = 0;
async function one(l) {
  const mod = content.modules.find(m => m.id === l.mod);
  const sources = pickSources(l);
  const system = `${BASE_SYSTEM()}\n\n${TASK}`;
  const user = `MODULO: ${mod.title}\nLEZIONE: «${l.title}»\n\nLEZIONE BASE (fascicolo di Andrea, aggiornato a luglio 2026):\n${l.md}\n\n=====\nFONTI AGGIUNTIVE (slide del corso 2023):\n${sources || '(nessuna)'}`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await callClaude({ system, messages: [{ role: 'user', content: user }], maxTokens: 9000 });
      const n = (r.text.match(/\S+/g) || []).length;
      if (n < 1200) throw new Error(`troppo breve (${n} parole)`);
      fs.writeFileSync(path.join(OUT, l.id + '.md'), r.text.trim() + '\n');
      done++;
      console.log(`✓ ${l.id} ${l.title.slice(0, 60)} — ${n} parole`);
      return;
    } catch (e) {
      console.error(`✗ ${l.id} tentativo ${attempt}: ${e.message}`);
      if (attempt === 2) failed++;
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}
const queue = [...todo];
await Promise.all(Array.from({ length: CONC }, async () => { while (queue.length) await one(queue.shift()); }));
console.log(`Fatto: ${done} generate, ${failed} non riuscite.`);
