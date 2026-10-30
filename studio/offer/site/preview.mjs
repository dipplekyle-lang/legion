// Preview the shop on your own computer before it goes online:   node preview.mjs   ->  http://localhost:3000
// It serves the page the way Vercel does (clean URLs, the /007 short links) and runs the api/ functions.
// Without STRIPE_SECRET_KEY it PRETENDS to be Stripe: the buy button opens a fake checkout page, "paying" takes
// you to /thanks and the download links work — so you can click through the whole purchase for free.
// With STRIPE_SECRET_KEY=sk_test_... set in the terminal it talks to Stripe's test mode for real.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;
const pretend = !process.env.STRIPE_SECRET_KEY;
const sessions = {};
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.txt': 'text/plain' };

if (pretend) {
  process.env.STRIPE_SECRET_KEY = 'sk_test_preview';
  const realFetch = globalThis.fetch;
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (!u.startsWith('https://api.stripe.com/')) return realFetch(url, opts);
    if (u.endsWith('/v1/checkout/sessions') && (opts.method || 'GET') === 'POST') {
      const f = new URLSearchParams(String(opts.body));
      const id = 'cs_test_preview' + Date.now();
      sessions[id] = { id, payment_status: 'unpaid', created: Math.floor(Date.now() / 1000),
        metadata: { offer: f.get('metadata[offer]'), item: f.get('metadata[item]'), campaign: f.get('metadata[campaign]') },
        customer_details: { email: 'you@example.com', name: 'Preview Buyer' } };
      const q = new URLSearchParams({ session: id, success: f.get('success_url').replace('{CHECKOUT_SESSION_ID}', id),
        cancel: f.get('cancel_url'), amount: f.get('line_items[0][price_data][unit_amount]') || '',
        currency: f.get('line_items[0][price_data][currency]') || '', name: f.get('line_items[0][price_data][product_data][name]') || '' });
      return reply({ id, url: `http://localhost:${port}/__checkout?${q}` });
    }
    const m = u.match(/\/v1\/checkout\/sessions\/(cs_[A-Za-z0-9_]+)/);
    if (m) return sessions[m[1]] ? reply(sessions[m[1]]) : reply({ error: { message: 'No such checkout session' } }, 404);
    if (u.includes('/v1/checkout/sessions')) return reply({ data: Object.values(sessions).reverse(), has_more: false });
    return reply({ error: { message: 'not pretended: ' + u } }, 400);
  };
}

function fakeCheckout(q) {
  const amt = (Number(q.get('amount')) / 100).toFixed(2);
  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
  <title>Preview checkout</title><body style="font:17px/1.5 system-ui;max-width:460px;margin:60px auto;padding:0 20px">
  <p style="background:#fff3cd;padding:10px 14px;border-radius:6px">PREVIEW — no Stripe key is set, so this page stands in
  for Stripe's checkout. Nothing is charged.</p><h2>${q.get('name')}</h2><p style="font-size:28px;margin:0">${amt}
  ${String(q.get('currency')).toUpperCase()}</p><p><a href="/__pay?session=${q.get('session')}&next=${encodeURIComponent(q.get('success'))}"
  style="display:inline-block;background:#635bff;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none">
  Pay (pretend)</a> &nbsp; <a href="${q.get('cancel')}">Cancel</a></p></body>`;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${port}`);
  let p = decodeURIComponent(u.pathname);
  try {
    if (pretend && p === '/__checkout') { res.setHeader('Content-Type', TYPES['.html']); return res.end(fakeCheckout(u.searchParams)); }
    if (pretend && p === '/__pay') {
      const s = sessions[u.searchParams.get('session')]; if (s) s.payment_status = 'paid';
      res.statusCode = 303; res.setHeader('Location', u.searchParams.get('next') || '/'); return res.end();
    }
    const short = p.match(/^\/(\d{1,4})$/);                    // the same rule as vercel.json
    if (short) { res.statusCode = 307; res.setHeader('Location', `/?utm_source=youtube&utm_medium=video&utm_campaign=${short[1]}`); return res.end(); }
    if (p.startsWith('/api/') && !p.includes('/_')) {
      const file = path.join(root, p.replace(/\/$/, '') + '.js');
      if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('no such function'); }
      req.headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || 'http';   // Vercel says https; here it is http
      const mod = await import(pathToFileURL(file).href + '?t=' + Date.now());
      return await mod.default(req, res);
    }
    if (p.endsWith('/')) p += 'index.html';
    let file = path.join(root, p);
    if (!file.startsWith(root)) { res.statusCode = 403; return res.end(); }
    if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404; res.setHeader('Content-Type', TYPES['.html']);
      return res.end(fs.existsSync(path.join(root, '404.html')) ? fs.readFileSync(path.join(root, '404.html')) : 'Not found');
    }
    res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.statusCode = 500; res.end('preview error: ' + e.message);
  }
});
server.listen(port, () => console.log(`Shop preview: http://localhost:${port}   ${pretend ? '(pretend Stripe — nothing is charged)' : '(Stripe test mode)'}`));
