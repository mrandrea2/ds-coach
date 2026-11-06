# DS Coach 2027

Web app personale per preparare il concorso da **dirigente scolastico** (D.M. 194/2022).

- **Contenuti**: 113 lezioni divise in 10 moduli. Partono da fascicoli F1-F9 e dal Manuale DS 2027 e c'è una lezione in più sulla contabilità tratta dal Compendio DSGA. In più: 273 quiz, 50 flashcard, 24 lezioni flash, 10 quesiti scritti con svolgimento modello, 12 casi orali risolti e 150 tracce orali.
- **Metodo**: ogni giorno l'app propone prima il ripasso misto (richiamo attivo, ripetizione distanziata, aree mescolate), poi la teoria nuova. Le lezioni tornano in ripasso dopo 1, 3, 7, 16 e 35 giorni. Una volta a settimana c'è un quesito scritto, due volte un caso orale e ogni due settimane una simulazione.
- **Coach IA** (Claude). Dentro ogni lezione può:
  - scrivere un approfondimento con più contenuti da studiare;
  - spiegare un passaggio;
  - generare quiz nuovi;
  - interrogarti;
  - verificare con una ricerca sul web se una norma è ancora in vigore.

  Corregge anche lo scritto (voto su 20, griglia delle quattro mosse) e l'orale (voto su 10, griglia dei cinque passi).
- **Novità normative**: ogni lunedì una GitHub Action cerca le novità sulle fonti ufficiali e aggiorna l'app. C'è anche un pulsante "Controlla ora".
- **Nessun database**: i progressi restano nel browser. Per passarli su un altro dispositivo si usa backup e ripristino da Impostazioni.

## Struttura

```
api/            funzioni Vercel: content (contenuti protetti), coach (Claude), novita (ricerca live)
content/        content.json (tutti i contenuti) + aggiornamenti.json (novità settimanali)
scripts/        aggiorna-normativa.mjs (usato dalla GitHub Action) + prompt condiviso
src/            app React (Vite)
tools/          build_content.py per rigenerare content.json, devserver locale
.github/        workflow settimanale degli aggiornamenti
```

I contenuti NON sono pubblici: `content/content.json` viene servito solo da `/api/content` a chi conosce la password. Tieni comunque il repository **privato**: contiene materiali di studio protetti da diritto d'autore.

## Messa online (una volta sola)

1. **GitHub**: crea un repository **privato** chiamato `ds-coach` e carica tutti i file di questa cartella. Puoi trascinarli da "Add file → Upload files" oppure chiedere a Claude di farlo.
2. **Vercel**: vai su *Add New → Project*, importa `ds-coach` e premi Deploy. Il framework (Vite) viene riconosciuto da solo.
3. **Variabili d'ambiente**: in Vercel apri *Settings → Environment Variables* e aggiungi:
   - `APP_PASSWORD`: la password con cui entri nell'app (protegge i contenuti e la tua chiave);
   - `ANTHROPIC_API_KEY`: la tua chiave da console.anthropic.com;
   - `ANTHROPIC_MODEL` (facoltativa): per cambiare modello. Il predefinito è `claude-sonnet-5-5`.

   Poi fai *Redeploy*.
4. **Aggiornamenti automatici**: in GitHub apri *Settings → Secrets and variables → Actions → New repository secret* e crea `ANTHROPIC_API_KEY`. Per provarli subito: tab *Actions*, poi "Aggiornamenti normativi", poi *Run workflow*.
5. **Costi**: nella Console Anthropic imposta un limite di spesa mensile. Ogni richiesta al coach costa pochi centesimi. Le ricerche web (verifica e novità) costano un po' di più.

## Aggiungere materiali (PDF, slide)

Non serve caricare i PDF nell'app. Il flusso è questo:

1. Carica i PDF nella chat di Claude (progetto SCUOLA) o nella cartella Drive del concorso.
2. Scrivi: *"Aggiungi questi materiali a DS Coach: crea le lezioni, i quiz e le flashcard e fai il push"*.
3. Claude aggiorna `content/content.json` (lezioni nuove o arricchite, quiz, carte) e fa il commit. Vercel ripubblica l'app da solo.

Dentro l'app, il pulsante **Approfondisci** di ogni lezione genera altro materiale di studio partendo dalla lezione stessa.

## Lavorare in locale

```
npm install
npm run build
APP_PASSWORD=prova ANTHROPIC_API_KEY=sk-... node tools/devserver.mjs   # http://localhost:3000
```

Per rigenerare `content.json` dai testi sorgente: `python3 tools/build_content.py tools/data/raw tools/data <giannelli.txt> tools/extra content/content.json` (il testo del volume Giannelli non è nel repository: le 150 tracce sono già dentro content.json).
