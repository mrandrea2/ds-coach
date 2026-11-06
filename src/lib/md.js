import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: false });
const LABEL = { attenzione: 'Attenzione', memoria: 'Da ricordare', metodo: 'Metodo', aggiornamento: 'Aggiornamento 2026', analisi: 'Analisi', punto: 'Il punto', orale: "Uso all'orale", nota: 'Nota' };

export function renderMd(src = '') {
  const pre = src.replace(/:::(\w+)\n([\s\S]*?)\n:::/g, (_, k, body) =>
    `<div class="callout ${k}"><b>${LABEL[k] || k}</b><div>${marked.parseInline(body)}</div></div>`);
  return DOMPurify.sanitize(marked.parse(pre));
}
