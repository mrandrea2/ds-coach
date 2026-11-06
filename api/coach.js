import { checkAuth, readBody, callClaude, extractJson, BASE_SYSTEM } from './_lib.js';

const clip = (s, n) => (s || '').length > n ? s.slice(0, n) + '\n[…testo troncato…]' : (s || '');

const MODES = {
  // spiegazione mirata di un passaggio o di una domanda sulla lezione
  spiega: { max: 1800, sys: `Spiega in modo approfondito ma diretto. Collega la norma alla sua ratio, fai un esempio scolastico concreto, indica la trappola tipica da quiz e chiudi con "Da ricordare:" in 2-3 righe.` },
  // estende una lezione con contenuti nuovi da studiare
  approfondisci: { max: 4000, sys: `Scrivi un APPROFONDIMENTO di studio (900-1300 parole) sulla lezione indicata, da leggere dopo la lezione base. Non ripetere ciò che la lezione già dice: aggiungi contenuti che servono davvero per vincere il concorso — articoli e commi da conoscere, giurisprudenza rilevante, collegamenti con altre aree, applicazione concreta per il DS, possibili domande d'esame (preselettiva, scritto, orale). Struttura: ### titoletti; chiudi con "### Domande che potrebbero farti" (5 domande) e "### Da sapere a memoria" (elenco di numeri/date/organi).` },
  // interrogazione stile commissione (chat)
  interroga: { max: 1200, sys: `Sei un commissario d'esame che interroga Andrea. Fai UNA domanda alla volta, di difficoltà crescente, sul tema indicato. Quando Andrea risponde: valuta in 2-4 righe (cosa è corretto, cosa manca, eventuali errori di competenza o norme superate, voto indicativo /10), poi fai la domanda successiva. Se la risposta è debole, fai una domanda di rinforzo sullo stesso punto.` },
  // genera quiz a scelta multipla
  quiz: { max: 3500, sys: `Genera quesiti a risposta multipla nello stile della preselettiva del concorso DS: enunciato breve e letterale ("Ai sensi dell'art. X…"), 4 opzioni plausibili con distrattori costruiti su numeri vicini, organi simili o norme superate, una sola corretta. Solo su norme vigenti. Restituisci SOLO JSON tra <json></json>: [{"q":"…","o":["…","…","…","…"],"c":0,"e":"spiegazione con fonte","t":"trappola (opzionale)"}]. Varia la posizione della risposta corretta (c da 0 a 3).` },
  // corregge un quesito della prova scritta
  scritto: { max: 2500, sys: `Correggi la risposta di Andrea a un quesito della prova scritta del concorso DS. Valuta con la griglia delle quattro mosse: 1) inquadramento normativo (0-4), 2) ruolo del DS e competenze degli organi (0-5), 3) azioni concrete (0-7), 4) monitoraggio ed esiti (0-4) = totale /20. Formato: "### Punteggio: X/20" poi tabella dei 4 criteri con punteggio e commento; "### Errori da correggere" (norme errate o superate, competenze scambiate); "### Cosa avrebbe alzato il voto"; "### Versione migliorata dell'incipit" (max 120 parole). Sii esigente come una commissione vera. Se la risposta è in inglese, valuta anche lingua (livello B2) e correttezza terminologica.` },
  // valuta la soluzione di un caso orale
  caso: { max: 2500, sys: `Valuta la soluzione di Andrea a un caso concreto della prova orale del concorso DS con la griglia dei cinque passi: inquadramento, competenze (chi decide), azioni del DS (ordine e proporzionalità), tutela e garanzie, monitoraggio ed esiti. Formato: "### Valutazione: X/10", poi per ciascun passo cosa va bene e cosa manca; "### Errori gravi" (se presenti: competenze invase, obblighi di legge omessi, norme superate); "### Cosa direbbe un candidato da 10" (soluzione modello sintetica, 200-300 parole, aggiornata alla normativa vigente); "### Domanda di approfondimento della commissione" (1 domanda).` },
  // crea un nuovo quesito scritto o una nuova traccia di caso
  traccia: { max: 900, sys: `Crea una nuova traccia d'esame realistica sul tema indicato. Restituisci SOLO JSON tra <json></json>: {"traccia":"testo della traccia (stile: 'Il candidato illustri…' per lo scritto, oppure scenario di 4-6 righe per un caso orale)","scaletta":["4 punti chiave attesi"]}.` },
  // coach libero
  chat: { max: 2000, sys: `Rispondi come coach di studio e come esperto della materia. Se Andrea chiede cosa studiare o come organizzarsi, usa i principi dell'apprendimento efficace (richiamo attivo, ripetizione distanziata, interleaving, sonno) e i dati di progresso che ti vengono forniti.` },
  // verifica vigenza con ricerca web
  verifica: { max: 2500, web: true, sys: `Verifica con la ricerca web, privilegiando fonti ufficiali (normattiva.it, gazzettaufficiale.it, mim.gov.it, aran, anac, garanteprivacy), se le affermazioni indicate sono ancora corrette e vigenti alla data di oggi. Per ogni affermazione: ✅ confermata / ⚠️ modificata / ❌ superata, con la norma aggiornata e il link alla fonte. Chiudi con "### Cosa cambia per lo studio".` },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST' });
  if (!checkAuth(req, res)) return;
  const { mode = 'chat', messages = [], context = {} } = readBody(req);
  const m = MODES[mode];
  if (!m) return res.status(400).json({ error: 'modalità sconosciuta' });

  let ctx = '';
  if (context.lessonTitle) ctx += `\n\nLEZIONE DI RIFERIMENTO: «${context.lessonTitle}» (modulo: ${context.module || ''})\n${clip(context.lessonText, 14000)}`;
  if (context.topic) ctx += `\n\nTEMA: ${context.topic}`;
  if (context.traccia) ctx += `\n\nTRACCIA: ${context.traccia}`;
  if (context.modello) ctx += `\n\nSOLUZIONE MODELLO DI RIFERIMENTO (dai materiali di Andrea; potrebbe contenere riferimenti da aggiornare):\n${clip(context.modello, 6000)}`;
  if (context.progress) ctx += `\n\nDATI DI PROGRESSO DI ANDREA:\n${clip(context.progress, 3000)}`;
  if (context.n) ctx += `\n\nNumero di quesiti richiesti: ${Math.min(+context.n || 5, 15)}`;

  const system = `${BASE_SYSTEM()}\n\nCOMPITO: ${m.sys}${ctx}`;
  const msgs = (messages.length ? messages : [{ role: 'user', content: 'Procedi.' }])
    .slice(-16)
    .map(x => ({ role: x.role === 'assistant' ? 'assistant' : 'user', content: String(x.content).slice(0, 12000) }));

  try {
    const tools = m.web ? [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }] : undefined;
    const out = await callClaude({ system, messages: msgs, maxTokens: m.max, tools });
    let data = null;
    if (mode === 'quiz' || mode === 'traccia') {
      try { data = extractJson(out.text); } catch (e) { return res.status(502).json({ error: 'Risposta non valida, riprova', raw: out.text.slice(0, 500) }); }
    }
    res.status(200).json({ text: out.text, data, usage: out.usage });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
