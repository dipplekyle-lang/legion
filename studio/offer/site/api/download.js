// GET /api/download?session_id=cs_...  ->  the download links for what that payment bought.
// The thanks page calls it. Stripe is asked every time, so only a paid checkout ever gets the links.
import { OFFER } from './_offer.js';

export default async function handler(req, res) {
  const id = new URL(req.url, 'http://localhost').searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(id)) return json(res, 400, { error: 'This link has no payment reference in it.' });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(res, 500, { error: 'The shop is not connected to Stripe yet.' });
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(id), {
    headers: { Authorization: `Bearer ${key}` },
  });
  const s = await r.json().catch(() => ({}));
  if (!r.ok) return json(res, 404, { error: `We could not find this payment. If you paid, write to ${OFFER.support} and we'll send the book.` });
  const meta = s.metadata || {};
  if (meta.offer && meta.offer !== OFFER.slug) return json(res, 404, { error: 'This payment was for something else.' });
  if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') {
    return json(res, 402, { error: 'This payment is not complete yet. If you just paid, refresh this page in a minute.' });
  }
  const item = OFFER.items[meta.item] || OFFER.items[OFFER.defaultItem];
  const files = (item.files || []).map((k) => OFFER.files[k]).filter(Boolean);
  const who = (s.customer_details || {});
  return json(res, 200, { item: item.name, email: who.email || '', name: (who.name || '').split(' ')[0], files });
}

function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
