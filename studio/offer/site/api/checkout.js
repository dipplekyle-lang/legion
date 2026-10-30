// POST/GET /api/checkout?item=<key>&c=<video number>  ->  303 to a Stripe Checkout page.
// Needs one environment variable in Vercel: STRIPE_SECRET_KEY (sk_test_... while testing, sk_live_... to sell).
// Optional: STRIPE_PRICE_<ITEM> to use a Price you made in Stripe instead of the amount in _offer.js,
//           STRIPE_TAX=1 to let Stripe Tax add VAT / sales tax (turn Stripe Tax on in the Stripe dashboard first).
import { OFFER } from './_offer.js';

export default async function handler(req, res) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return text(res, 500, 'The shop is not connected to Stripe yet. Add STRIPE_SECRET_KEY in Vercel → ' +
    'Project → Settings → Environment Variables, then redeploy.');
  const url = new URL(req.url, 'http://localhost');
  const itemKey = (url.searchParams.get('item') || OFFER.defaultItem || '').toLowerCase();
  const item = OFFER.items[itemKey];
  if (!item) return text(res, 400, 'Unknown item.');
  const campaign = (url.searchParams.get('c') || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const origin = `${proto}://${host}`;

  const f = new URLSearchParams();
  f.set('mode', 'payment');
  f.set('line_items[0][quantity]', '1');
  const priceId = process.env['STRIPE_PRICE_' + itemKey.toUpperCase()];
  if (priceId) {
    f.set('line_items[0][price]', priceId);
  } else {
    f.set('line_items[0][price_data][currency]', OFFER.currency);
    f.set('line_items[0][price_data][unit_amount]', String(item.amount));
    f.set('line_items[0][price_data][product_data][name]', item.name);
    if (item.description) f.set('line_items[0][price_data][product_data][description]', item.description);
    if (process.env.STRIPE_TAX === '1') f.set('line_items[0][price_data][tax_behavior]', 'exclusive');
  }
  f.set('success_url', `${origin}/thanks?session_id={CHECKOUT_SESSION_ID}`);
  f.set('cancel_url', `${origin}/${campaign ? '?utm_campaign=' + campaign : ''}#buy`);
  f.set('allow_promotion_codes', 'true');
  f.set('billing_address_collection', process.env.STRIPE_TAX === '1' ? 'required' : 'auto');
  if (process.env.STRIPE_TAX === '1') f.set('automatic_tax[enabled]', 'true');
  for (const [k, v] of Object.entries({ offer: OFFER.slug, item: itemKey, campaign })) {
    f.set(`metadata[${k}]`, v);
    f.set(`payment_intent_data[metadata][${k}]`, v);   // so the video number shows on the payment itself
  }
  f.set('payment_intent_data[description]', `${item.name}${campaign ? ' · video ' + campaign : ''}`);

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: f,
  });
  const s = await r.json().catch(() => ({}));
  if (!r.ok || !s.url) return text(res, 502, 'Stripe said: ' + ((s.error && s.error.message) || r.status));
  res.statusCode = 303;
  res.setHeader('Location', s.url);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

function text(res, code, msg) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(msg);
}
