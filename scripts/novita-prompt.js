// Prompt condiviso tra l'endpoint /api/novita e la GitHub Action settimanale.
export const AREE = {
  1: 'Ordinamenti e riforme', 2: 'Organizzazioni complesse', 3: 'Autonomia e PTOF', 4: 'Ambienti e inclusione',
  5: 'Personale', 6: 'Valutazione', 7: 'Diritto', 8: 'Contabilità', 9: 'Sistemi UE',
};

export function buildNovitaPrompt({ since, known = [] }) {
  const today = new Date().toISOString().slice(0, 10);
  const from = since || new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const system = `Sei un osservatorio normativo per un candidato al concorso per DIRIGENTE SCOLASTICO in Italia. Oggi è ${today}.
Cerca con la ricerca web le NOVITÀ pubblicate dal ${from} a oggi che possono cambiare le risposte d'esame o il lavoro del dirigente scolastico.
Fonti da privilegiare: gazzettaufficiale.it, normattiva.it, mim.gov.it (note, decreti, circolari), aranagenzia.it (CCNL), anticorruzione.it (ANAC), garanteprivacy.it, invalsi.it, indire.it, eur-lex.europa.eu, eurydice; per notizie di contesto orizzontescuola.it, tecnicadellascuola.it, scuolainforma.it, ma cita sempre l'atto ufficiale.
Ambiti: leggi e decreti sulla scuola; bando/regolamento del concorso DS; CCNL istruzione e ricerca e area dirigenza; valutazione, esami di Stato, INVALSI; inclusione; contabilità (D.I. 129/2018), contratti pubblici (D.lgs. 36/2023); privacy, trasparenza, anticorruzione; sicurezza; PNRR; politiche educative UE.
Escludi notizie senza un atto normativo o amministrativo, scadenze operative minori, opinioni.`;
  const user = `Restituisci al massimo 12 novità, le più rilevanti per il concorso, SOLO in JSON tra <json></json> con questo schema:
[{"data":"AAAA-MM-GG","titolo":"…","atto":"es. D.L. 45/2025, art. 3 / Nota MIM prot. …","fonte":"URL ufficiale","sintesi":"3-4 frasi su cosa cambia","impatto":"cosa cambia per lo studio del concorso (quale risposta d'esame va aggiornata)","aree":[numeri da 1 a 9],"priorita":"alta|media|bassa","flashcard":{"f":"domanda breve","b":"risposta breve"}}]
Aree: ${Object.entries(AREE).map(([k, v]) => `${k}=${v}`).join(', ')}.
Novità già note (non ripeterle): ${known.slice(0, 60).join(' | ') || 'nessuna'}.
Se non trovi novità rilevanti restituisci <json>[]</json>.`;
  return { system, user };
}
