#!/usr/bin/env python3
"""Costruisce content.json dell'app a partire da:
- fascicoli F1-F9 e Manuale DS 2027 (testi di Andrea, da Drive)
- quiz/card/lezioni flash della vecchia app PreparazioneDS2027.jsx
- elenco dei 150 casi orali (solo titoli) dal volume Giannelli
- contenuti aggiuntivi scritti per l'app (extra_*.json)
"""
import json, re, os, sys

RAW = sys.argv[1]          # cartella con i .txt dei fascicoli
OLD = sys.argv[2]          # cartella con old_q.json ecc.
GIAN = sys.argv[3]         # testo Giannelli
EXTRA = sys.argv[4]        # cartella con extra_*.json
OUT = sys.argv[5]

def clean(t):
    t = t.replace('\\.', '.').replace('\\#', '#').replace('\\<', '<').replace('\\>', '>')
    t = t.replace('\\~', '~').replace('\\[', '[').replace('\\]', ']').replace('\\-', '-')
    t = t.replace('\\*', '*').replace('\\_', '_').replace('\\(', '(').replace('\\)', ')')
    t = t.replace(' ', ' ')
    return t

CALLOUT = re.compile(r'\|\s*\|\s*\n\|\s*:-:\s*\|\s*\n\|\s*(.+?)\s*\|\s*(?=\n|$)')
LABELS = ['AGGIORNAMENTO 2026 AGGIORNAMENTO 2026 ·', 'AGGIORNAMENTO 2026', 'ATTENZIONE', 'MEMORIA', 'METODO',
          'ANALISI', 'IL PUNTO', 'USO ALL\'ORALE']

def callouts_to_md(t):
    def rep(m):
        body = m.group(1).strip()
        kind = 'nota'
        for lab in LABELS:
            if body.startswith(lab):
                kind = lab.split(' ')[0].lower().replace("'", '')
                if lab.startswith('AGGIORNAMENTO'): kind = 'aggiornamento'
                if lab == 'IL PUNTO': kind = 'punto'
                if lab.startswith('USO'): kind = 'orale'
                body = body[len(lab):].strip(' ·:')
                break
        return f'\n:::{kind}\n{body}\n:::\n'
    return CALLOUT.sub(rep, t)

def tables_center_fix(t):
    # le tabelle hanno righe separatrici | :-: | ... ok per markdown; nulla da fare
    return t

def to_md_paragraphs(lines):
    out = []
    for ln in lines:
        s = ln.strip()
        if not s:
            out.append('')
            continue
        out.append(s)
    md = '\n'.join(out)
    md = re.sub(r'\n{3,}', '\n\n', md)
    return md.strip()

def keypoints(md):
    pts = []
    for m in re.finditer(r':::(\w+)\n(.+?)\n:::', md, re.S):
        if m.group(1) in ('attenzione', 'memoria', 'metodo', 'punto', 'aggiornamento', 'orale'):
            pts.append({'k': m.group(1), 't': m.group(2).strip()})
    return pts

TOP = re.compile(r'^(\d{1,2})\.\s+(.+)$')
SUB = re.compile(r'^(\d{1,2}\.\d{1,2})\s+(.+)$')

def split_fascicolo(text, mod_id):
    text = callouts_to_md(clean(text))
    lines = text.split('\n')
    # salta intestazione fino a "Indice" + riga vuota successiva
    start = 0
    for i, ln in enumerate(lines):
        if TOP.match(ln.strip()) or ln.strip().startswith('DOSSIER') or ln.strip().startswith('Approfondimento dal corso'):
            start = i
            break
    lessons = []
    cur = None
    for ln in lines[start:]:
        s = ln.strip()
        if re.match(r'^Fascicolo \d', s):
            continue
        m = TOP.match(s)
        is_top = bool(m) and len(s) < 140 and not SUB.match(s)
        dossier = s.startswith('DOSSIER —') or s.startswith('DOSSIER -')
        appr = s.startswith('Approfondimento dal corso')
        if is_top or dossier or appr:
            if cur: lessons.append(cur)
            if is_top:
                title = m.group(2).strip()
                kind = 'checklist' if title.lower().startswith('checklist') else 'teoria'
            elif dossier:
                title = s.split('—', 1)[1].strip() if '—' in s else s
                kind = 'dossier'
            else:
                title = 'Dal corso: ' + (s.split('—', 1)[1].strip() if '—' in s else s)
                kind = 'approfondimento'
            cur = {'title': title, 'kind': kind, 'lines': []}
            continue
        if cur is None:
            continue
        ms = SUB.match(s)
        if ms and len(s) < 140:
            cur['lines'].append('')
            cur['lines'].append('### ' + ms.group(2).strip())
            cur['lines'].append('')
        else:
            cur['lines'].append(ln)
    if cur: lessons.append(cur)
    out = []
    for i, l in enumerate(lessons):
        md = to_md_paragraphs(l['lines'])
        if len(md) < 40:
            continue
        lid = f'{mod_id}-{len(out)+1:02d}'
        item = {'id': lid, 'mod': mod_id, 'title': l['title'], 'kind': l['kind'], 'md': md,
                'kp': keypoints(md), 'words': len(re.findall(r'\w+', md))}
        if l['kind'] == 'checklist':
            item['checks'] = [x.strip() for x in md.split('\n') if x.strip().startswith('So ')]
        out.append(item)
    return out

def split_manual_area(manual, n):
    manual = callouts_to_md(clean(manual))
    m = re.search(r'\nAREA %d — ([^\n]+)\n(.*?)(?=\nAREA %d — |\nPARTE III)' % (n, n + 1), manual, re.S)
    if not m:
        return None
    body = m.group(2)
    body = re.sub(r'^(\d\.\d) (.+)$', r'### \2', body, flags=re.M)
    return m.group(1).strip(), to_md_paragraphs(body.split('\n'))

def manual_sections(manual, heads):
    manual = callouts_to_md(clean(manual))
    res = []
    for title, rx_start, rx_end in heads:
        m = re.search(rx_start + r'(.*?)' + rx_end, manual, re.S)
        if m:
            body = re.sub(r'^(\d\.\d) (.+)$', r'### \2', m.group(1), flags=re.M)
            res.append((title, to_md_paragraphs(body.split('\n'))))
    return res

# ---------------------------------------------------------------- moduli
MODULES = [
    {'id': 'M0', 'n': 0, 'title': 'Il concorso e il metodo', 'short': 'Concorso', 'areas': [], 'color': '#7a5c2e',
     'desc': 'Regolamento D.M. 194/2022, prove, aree, banca dati, strategia, numeri da sapere, glossario, metodo di studio.'},
    {'id': 'M1', 'n': 1, 'title': 'Ordinamenti e riforme', 'short': 'Ordinamenti', 'areas': [1], 'color': '#1f3a5f', 'src': 'F1_Ordinamenti_e_riforme', 'man': [1],
     'desc': 'Costituzione, architettura del sistema, L. 107/2015, esami di Stato, riforme PNRR, governance.'},
    {'id': 'M2', 'n': 2, 'title': 'Autonomia, PTOF e valutazione', 'short': 'Autonomia e SNV', 'areas': [3, 6], 'color': '#2e6b4f', 'src': 'F2_Autonomia_PTOF_Valutazione', 'man': [3, 6],
     'desc': 'DPR 275/1999, PTOF, DPR 80/2013, RAV-PdM-rendicontazione, valutazione apprendimenti e dirigenti.'},
    {'id': 'M3', 'n': 3, 'title': 'Organizzazioni e ambienti di apprendimento', 'short': 'Organizzazione e inclusione', 'areas': [2, 4], 'color': '#6b3e8a', 'src': 'F3_Organizzazioni_Ambienti', 'man': [2, 4],
     'desc': 'Teorie organizzative, leadership, motivazione, gruppi, inclusione, bullismo, innovazione digitale e didattica.'},
    {'id': 'M4', 'n': 4, 'title': 'Gestione del personale', 'short': 'Personale', 'areas': [5], 'color': '#9a4a1f', 'src': 'F4_Personale', 'man': [5],
     'desc': 'Fonti, stato giuridico, reclutamento, organi collegiali, ATA e DSGA, disciplina, sindacati, sicurezza, privacy.'},
    {'id': 'M5', 'n': 5, 'title': 'Diritto civile, amministrativo e penale', 'short': 'Diritto', 'areas': [7], 'color': '#8a1f3a', 'src': 'F5_Diritto', 'man': [7],
     'desc': 'Obbligazioni, responsabilità civile e vigilanza, L. 241/1990, accesso, anticorruzione, giurisdizioni, reati.'},
    {'id': 'M6', 'n': 6, 'title': 'Contabilità e gestione finanziaria', 'short': 'Contabilità', 'areas': [8], 'color': '#3d5a1f', 'src': 'F6_Contabilita', 'man': [8],
     'desc': 'Contabilità di Stato, D.I. 129/2018, attività negoziale, D.lgs. 36/2023, fondi UE e PNRR.'},
    {'id': 'M7', 'n': 7, 'title': 'Sistemi educativi europei', 'short': 'Europa', 'areas': [9], 'color': '#1f5a6b', 'src': 'F7_Sistemi_UE', 'man': [9],
     'desc': 'TFUE, benchmark 2030, competenze chiave, EQF, Bologna, Erasmus+, sistemi comparati, Eurydice.'},
    {'id': 'M8', 'n': 8, 'title': 'La prova scritta', 'short': 'Scritto', 'areas': [], 'color': '#444', 'src': 'F8_Prova_Scritta',
     'desc': 'Metodo delle quattro mosse, gestione dei 180 minuti, dieci quesiti svolti.'},
    {'id': 'M9', 'n': 9, 'title': 'Il caso concreto all\'orale', 'short': 'Orale', 'areas': [], 'color': '#444', 'src': 'F9_Casi_Orale',
     'desc': 'Griglia dei cinque passi, errori da evitare, dodici casi risolti.'},
]

manual = open(os.path.join(RAW, 'Manuale_Concorso_DS_2027.txt')).read()
lessons = []

# M0 dal manuale + metodo
m0 = manual_sections(manual, [
    ('Il concorso: quadro normativo, requisiti, prove e aree', r'\n1\\?\. Il concorso per dirigenti scolastici[^\n]*\n', r'(?=\n2\\?\. La banca dati)'),
    ('La banca dati 2017: struttura e uso corretto', r'\n2\\?\. La banca dati 2017[^\n]*\n', r'(?=\n3\\?\. Strategia)'),
    ('Strategia di preparazione', r'\n3\\?\. Strategia di preparazione[^\n]*\n', r'(?=\nPARTE II)'),
    ('Tavola di conversione: banca dati 2017 → concorso 2027', r'\n10\\?\. Tavola di conversione[^\n]*\n', r'(?=\n11\\?\. I numeri)'),
    ('I numeri da sapere a memoria', r'\n11\\?\. I numeri da sapere[^\n]*\n', r'(?=\n12\\?\. Glossario)'),
    ('Glossario delle sigle', r'\n12\\?\. Glossario delle sigle[^\n]*\n', r'(?=\n13\\?\. Piano di studio)'),
])
extra_lessons = json.load(open(os.path.join(EXTRA, 'extra_lessons.json')))
for el in extra_lessons:
    if el['mod'] == 'M0' and el.get('pos') == 'first':
        lessons.append(el)
for i, (t, md) in enumerate(m0):
    lessons.append({'id': f'M0-{i+1:02d}', 'mod': 'M0', 'title': t, 'kind': 'teoria', 'md': md, 'kp': keypoints(md),
                    'words': len(re.findall(r'\w+', md))})

for mod in MODULES[1:]:
    # mappa d'area dal manuale (advance organizer)
    for a in mod.get('man', []):
        r = split_manual_area(manual, a)
        if r:
            t, md = r
            lessons.append({'id': f"{mod['id']}-00{a}", 'mod': mod['id'], 'title': 'Mappa d\'area — ' + t, 'kind': 'mappa',
                            'md': md, 'kp': keypoints(md), 'words': len(re.findall(r'\w+', md))})
    txt = open(os.path.join(RAW, mod['src'] + '.txt')).read()
    ls = [x for x in split_fascicolo(txt, mod['id']) if not x['title'].startswith(('Quesiti svolti','Casi svolti'))]
    lessons.extend(ls)
    for el in extra_lessons:
        if el['mod'] == mod['id'] and el.get('pos') != 'first':
            lessons.append(el)

# ------------------------------------------------- scritto (F8) e orale (F9)
def parse_quesiti(text):
    t = callouts_to_md(clean(text))
    items = []
    for m in re.finditer(r'\nQuesito (\d+) — ([^\n]+)\n(.*?)(?=\nQuesito \d+ — |\n4\. Come allenarti)', t, re.S):
        body = m.group(3)
        tr = re.search(r'«(.+?)»', body, re.S)
        sc = re.search(r'Scaletta[^\n]*\n(.*?)\nSvolgimento\n', body, re.S)
        sv = re.search(r'\nSvolgimento\n(.*?)(?=\n:::analisi|\Z)', body, re.S)
        an = re.search(r':::analisi\n(.*?)\n:::', body, re.S)
        items.append({'id': f'S{int(m.group(1)):02d}', 'area': m.group(2).replace('Area ', '').strip(),
                      'traccia': tr.group(1).strip() if tr else '',
                      'scaletta': [x.strip() for x in (sc.group(1) if sc else '').split('\n') if x.strip()],
                      'modello': to_md_paragraphs(sv.group(1).split('\n')) if sv else '',
                      'analisi': an.group(1).strip() if an else ''})
    return items

def parse_casi(text):
    t = callouts_to_md(clean(text))
    items = []
    for m in re.finditer(r'\nCaso (\d+) — ([^\n]+)\n(.*?)(?=\nCaso \d+ — |\n4\. Come allenarti)', t, re.S):
        body = m.group(3)
        parts = body.split('\nSoluzione\n')
        scen = parts[0].strip()
        sol = parts[1] if len(parts) > 1 else ''
        pt = re.search(r':::punto\n(.*?)\n:::', sol, re.S)
        sol = re.sub(r':::punto\n.*?\n:::', '', sol, flags=re.S)
        sol = re.sub(r'^(Inquadramento|Competenze|Azioni del dirigente|Tutela e garanzie|Monitoraggio ed esiti)\.', r'**\1.**', sol.strip(), flags=re.M)
        items.append({'id': f'C{int(m.group(1)):02d}', 'title': m.group(2).strip(), 'scenario': scen,
                      'soluzione': to_md_paragraphs(sol.split('\n')), 'punto': pt.group(1).strip() if pt else '',
                      'src': 'fascicolo'})
    return items

scritto = parse_quesiti(open(os.path.join(RAW, 'F8_Prova_Scritta.txt')).read())
casi = parse_casi(open(os.path.join(RAW, 'F9_Casi_Orale.txt')).read())

# 150 tracce orali (solo titolo + area): la soluzione la costruisce lo studente con il coach
g = open(GIAN).read()
idx_end = g.find('Autori\n')
gi = g[:idx_end]
cur_area = None
tracce = []
for ln in re.sub(r'\n  (?=[a-zàèéìòù])', ' ', gi).split('\n'):
    s = ln.strip()
    ma = re.match(r'AREA TEMATICA (\d)', s)
    if ma:
        cur_area = int(ma.group(1)); continue
    mc = re.match(r'^(\d{1,3})\. (.+?)\s*\[(\d)\.\d?\.?\]\s*$', s)
    if mc and cur_area:
        tracce.append({'id': f'T{int(mc.group(1)):03d}', 'area': cur_area, 'title': mc.group(2).strip()})
# unisci righe spezzate
fixed = []
lines = gi.split('\n')
buf = ''
cur_area = None
for ln in lines:
    s = ln.strip()
    ma = re.match(r'AREA TEMATICA (\d)', s)
    if ma:
        cur_area = int(ma.group(1)); buf = ''; continue
    if re.match(r'^\d{1,3}\. ', s):
        buf = s
    elif buf:
        buf += ' ' + s
    else:
        continue
    mc = re.match(r'^(\d{1,3})\. (.+?)\s*\[(\d)\.\d?\.?\]\s*$', buf)
    if mc and cur_area:
        fixed.append({'id': f'T{int(mc.group(1)):03d}', 'area': cur_area, 'title': mc.group(2).strip()})
        buf = ''
tracce = fixed

# ------------------------------------------------- quiz e flashcard
AREA_TO_MOD = {1: 'M1', 2: 'M3', 3: 'M2', 4: 'M3', 5: 'M4', 6: 'M2', 7: 'M5', 8: 'M6', 9: 'M7'}
oldq = json.load(open(os.path.join(OLD, 'old_q.json')))
quiz = []
for q in oldq:
    quiz.append({'id': f"Q{q['id']}", 'area': q['a'], 'mod': AREA_TO_MOD[q['a']], 'q': q['q'], 'o': q['o'], 'c': q['c'],
                 'e': q.get('e', ''), 't': q.get('t', '')})
for q in json.load(open(os.path.join(EXTRA, 'extra_quiz.json'))):
    q['mod'] = AREA_TO_MOD[q['area']]
    quiz.append(q)

cards = []
for c in json.load(open(os.path.join(OLD, 'old_cards.json'))):
    cards.append({'id': f"K{c['id']:03d}", 'f': c['f'], 'b': c['b']})
for c in json.load(open(os.path.join(EXTRA, 'extra_cards.json'))):
    cards.append(c)

flash = json.load(open(os.path.join(OLD, 'old_lessons.json')))

AREAS = {1: 'Ordinamenti e riforme', 2: 'Organizzazioni complesse', 3: 'Autonomia e PTOF', 4: 'Ambienti e inclusione',
         5: 'Personale', 6: 'Valutazione', 7: 'Diritto', 8: 'Contabilità', 9: 'Sistemi UE'}

content = {'version': 1, 'built': os.environ.get('BUILD_DATE', ''), 'areas': AREAS, 'modules': MODULES,
           'lessons': lessons, 'quiz': quiz, 'cards': cards, 'flash': flash, 'scritto': scritto, 'casi': casi,
           'tracce': tracce}
json.dump(content, open(OUT, 'w'), ensure_ascii=False)
tw = sum(l['words'] for l in lessons)
print('lezioni', len(lessons), 'parole', tw, 'quiz', len(quiz), 'card', len(cards), 'flash', len(flash),
      'scritto', len(scritto), 'casi', len(casi), 'tracce', len(tracce))
from collections import Counter
print(Counter(l['mod'] for l in lessons))
