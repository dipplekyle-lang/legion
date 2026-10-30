// GET /api/live  ->  {"n": how many people opened checkout for this book in the last 24 hours}.
// A real number from Stripe, never a made-up one. The page shows it only when it is worth showing
// (OFFER.liveMin or more). Set LIVE_COUNTER=0 in Vercel to switch it off.
import { OFFER } from './_offer.js';

export default async function handler(req, res) {
  const key = process.env.STRIPE_SECRET_KEY;
  let n = 0;
  if (key && process.env.LIVE_COUNTER !== '0') {
    const since = Math.floor(Date.now() / 1000) - 86400;
    let after = '';
    for (let page = 0; page < 5; page++) {
      const u = new URL('https://api.stripe.com/v1/checkout/sessions');
      u.searchParams.set('limit', '100');
      if (after) u.searchParams.set('starting_after', after);
      const r = await fetch(u, { headers: { Authorization: `Bearer ${key}` } });
      if (!r.ok) break;
      const d = await r.json();
      let older = false;
      for (const s of d.data || []) {
        if (s.created < since) { older = true; break; }          // newest first: everything after is older
        if ((s.metadata || {}).offer === OFFER.slug) n++;
      }
      if (older || !d.has_more || !(d.data || []).length) break;
      after = d.data[d.data.length - 1].id;
    }
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.end(JSON.stringify({ n }));
}
