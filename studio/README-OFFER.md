# OFFER — a product for your channel

Your presenter channel already teaches people something. `offer.py` turns that into something they can buy:

- **The book** — a numbered, illustrated lesson book (PDF), 60 lessons a volume. Every lesson has the same five
  parts (what you need · how it goes, with the real numbers · why it works · how people ruin it · where it
  doesn't hold), a drawing, a line in the host's voice and its numbers. At the back: every number by section, a
  "look up the failure" index and an About page with the AI disclosure and how the book was checked. Plus a
  one-page cheat sheet to print.
- **Checked** — an editor pass on every section, then every safety claim checked on the web against official
  guidance (USDA/FDA for food, the regulator for money, CDC/NHS for health). The log is in `check/CHECK-LOG.md`.
- **The page** — a long, calm landing page in the shape that sells these books (see `offer/PLAYBOOK.md`):
  covers, the buy box, what's inside, every lesson title, sample drawings and pages, the host's story, the AI
  disclosure, real comments from your own channel, who it's for and not for, FAQ. Terms, Privacy and Refund pages.
- **The checkout** — Stripe Checkout through two tiny Vercel functions. No Stripe products to set up: the price
  is in the site. After paying, the buyer lands on a download page that checks the payment with Stripe.
- **The videos** — attach the book to your channel's style and every new video sells it: one mention halfway
  through tied to a real lesson number, the book on screen (the host holding it, the pages landing, a card with
  the price and a QR code), and the first line of the description with the video's own short link (`/001`,
  `/002`…). Stripe records the video number on each payment, so you see which video sold.
- **The launch guide** — `LAUNCH-GUIDE.pdf`: Stripe, Vercel, your domain, the test purchase, going live, the
  videos, support and refunds, step by step.

Everything lands in `<output folder>/offers/<name>/`.

## In the app

- **AI AVATAR → Your product**: pick a product from the library for this video, and whether it is mentioned once or
  twice. Products that are not finished cannot be picked yet.
- **Open the offer generator** (under Your product): a few lines about your channel → 3 products (compared with what
  140+ AI-avatar channels sell), 5 channel names, .com domains nobody owns yet with a **Buy on Vercel** link ($11.25 a
  year — a domain is bought, not free), the description line, pinned comment and host lines. Pick one → **Build**
  (~1 hour: every piece written and fact-checked, a drawing for each, the PDF and a ready landing page).
  **Your offers** reopens earlier ones.
- **The landing page**: **Landing page** shows the ready-made page right in Legion. **Copy landing page prompt** →
  paste into Claude Code in a new folder: it builds your page from the product, shows it, and puts it on Vercel with
  Stripe — you keep editing it there. Also saved as `LANDING-PAGE-PROMPT.md` in the product's folder.
- A finished product without a domain shows a box under the cards: type the domain you bought and **Save domain** —
  from then on videos can mention it (QR codes and short links point there).

## Kinds of product

| Kind | Pieces | How the videos mention it |
|---|---|---|
| `lesson-book` | numbered lessons: what you need · how it goes · why · how people ruin it · where it doesn't hold | mid-video "lesson 41 in my book" + the QR card (once or twice) |
| `cookbook` | recipes: yield, time, ingredients, method, why it works, how it goes wrong, swaps, keeping it, recipe cards | early aside with the address said aloud + "page 259 of my book" tags |

`python offer.py new my-cookbook --kind cookbook --presenter rosa --niche "…"` — the page numbers the videos quote
are read back from the finished PDF (needs `pypdf`, in requirements.txt).

## Quick start

```bash
python offer.py new my-book --channel https://www.youtube.com/@yourchannel --style pitmaster --presenter marcus
python offer.py all my-book
python offer.py status my-book
```

Or open Claude Code in this folder and say: **"build a product for my channel"** — it knows the whole process
(CLAUDE.md → "When they ask for a product for their channel").

## The steps

| Step | What it does | Cost |
|---|---|---|
| `research` | your videos' transcripts + comments (and `--learn-from` channels: questions only) | free |
| `plan` | title, host, volumes, sections, every lesson; an editor then replaces overlaps and fills gaps | 2 Claude calls |
| `write` | every lesson, 6 per call, 3 calls at a time | ~10 calls per 60 lessons |
| `check` | editor per section + web check of safety claims | ~8 calls |
| `copy` | the sales page and the book's front matter, from the real lessons | 1 call |
| `draw` | cover portrait, covers (typeset), one drawing per lesson, host holding the book | ~62 pictures ≈ $0.30 |
| `book` | lesson cards, the PDF(s), the cheat sheet, sample pages, share image | 1 call |
| `site` | the Vercel project in `site/` | free |
| `guide` | `LAUNCH-GUIDE.pdf` | free |

Change anything by editing `offer.json` (the plan, prices, theme, seller), `copy.json` (the page text) or
`lessons/NNN.json` (one lesson) — or ask Claude Code — then run `book` / `site` again.

## Settings you will want

```bash
python offer.py set my-book seller.name="Your legal name" seller.country="United States"
python offer.py set my-book site.support_email=support@yourdomain.com site.domain=yourdomain.com
python offer.py set my-book pricing.single=2900 pricing.guarantee_days=30      # cents
python offer.py set my-book checkout.mode=links checkout.links.book=https://your.lemonsqueezy.com/buy/...   # not Stripe
python offer.py attach my-book --style pitmaster                                # every video sells it
python offer.py link my-book --title "Why Your Brisket Is Dry"                  # a video's short link + QR by hand
```

## The PITMASTER style

`styles/pitmaster.json` is a barbecue presenter channel built around the book: the WORKSHOP look (aged paper, ink
drawings, burned planks, numbered parts), a pitmaster's script voice, and `look.offer` — the mention, the CTA
overlays and the description line — switched on as soon as a book is attached. Pick the same presenter the book's
cover shows (the demo uses `marcus`).

## Rules

The page says the host is AI-generated. Testimonials are real comments from your own channel, word for word, or
none. No invented reviews, sales numbers or countdowns — the "went to checkout" counter comes from Stripe and
hides itself until it is worth showing. The seller's real name and country are on the page. Refunds are honoured.
These are not decoration: they are what keeps Stripe, YouTube and your buyers on your side.
