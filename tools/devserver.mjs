// Server locale minimale: serve dist/ e le funzioni /api come su Vercel.
// Uso: npm run build && APP_PASSWORD=... ANTHROPIC_API_KEY=... node tools/devserver.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT || 3000;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z]/g, '');
    const mod = await import(path.resolve('api', name + '.js'));
    let body = '';
    for await (const c of req) body += c;
    req.body = body ? JSON.parse(body) : {};
    res.status = c => { res.statusCode = c; return res; };
    res.json = o => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
    return mod.default(req, res);
  }
  let f = path.join('dist', url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(f)) f = path.join('dist', 'index.html');
  res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('http://localhost:' + PORT));
