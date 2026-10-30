# The channel product playbook

How a product for an AI-presenter channel should look, learned from a pitmaster channel that sells its own
illustrated lesson book in every video. `offer.py` builds all of this; this file is the bar it is held to, and
what Claude Code follows when someone asks for "a product for my channel".

## 1. The product: a book of lessons, not a pile of tips

The viewer already gets tips for free. What they pay for is **the same knowledge, finished**: in order, complete,
with the numbers, and findable on the day something goes wrong.

- **A numbered lesson book.** 40–60 lessons a volume, 6 sections of 7–10. Lesson numbers are permanent — the
  videos refer to them ("that's lesson 41 in my book"), so never renumber a published book.
- **Every lesson has the same five parts**, so a reader learns where to look:
  1. *What you need* — plain equipment, nothing to buy first.
  2. *How it goes* — steps with the real numbers: temperatures, times, weights, amounts, distances.
  3. *Why it works* — the mechanism, so they can fix it without the book.
  4. *How people ruin it* — the common mistakes, named, each with its fix.
  5. *Where it doesn't hold* — when the method stops working, and when a modern tool beats the old way.
- **A drawing for every lesson.** One illustration per lesson, in one consistent style (old almanac engraving
  for craft channels), with the labels typeset on top — never letters drawn by the image model.
- **Built for the bad day.** A problem index at the back ("dry brisket → 14, 17") and a one-page cheat sheet with
  every number that matters. These two pages are what people print.
- **Honest limits.** A book that says where its own advice stops is believed everywhere else.
- **Checked.** Anything that touches safety, health or money is checked against official guidance (USDA/FDA for
  food, the regulator for money, NHS/CDC for health) before it ships, and the book says so.

Value test before shipping: open five random lessons. Each one must teach something a viewer could not get from
the first page of search results — a number, a test, a reason, a failure mode. A lesson that is only
encouragement or only a definition is rewritten.

## 2. The landing page: one long, calm page

Structure, top to bottom (`offer/site/index.html` follows it):

1. **Ticker bar** — the whole offer in one line: lesson count, prices, the guarantee.
2. **Nav** — Inside · Volume Two · About · FAQ · YouTube, and one "Get the book" button.
3. **Hero** — covers on the left; on the right: "Digital books from the X channel", the title, a one-line
   subtitle, the persona's quote, one paragraph of what's inside, three proof chips, and **the buy box**
   (bundle card first, single volumes under it, guarantee, bonus, "pay once · no subscription", payment methods,
   terms line).
4. **Stats band** — lessons, volumes/parts, the persona's years, problems in the index, guarantee days.
5. **"Not a recipe collection"** — what the book is FOR (the moment it goes wrong) and the five parts of a lesson.
6. **What makes it different** — look up the failure · the why every time · honest limits · plain equipment.
7. **The arithmetic** — only when the niche has a real one (brisket at home vs the restaurant). Real typical
   figures, with a footnote saying they are typical and vary.
8. **What you'll be able to do** — five concrete outcomes, each a skill not a feeling.
9. **The sections** of each volume with a one-line blurb.
10. **From inside the book** — six real lesson cards.
11. **Why this got written down** — the persona's origin story, short, in their voice, signed.
12. **Who's talking** — the persona bio, and the **AI disclosure** in plain words.
13. **All the lessons** — every lesson title, by section.
14. **From the comments** — word-for-word YouTube comments from THIS channel, linked to the video, and a line that
    they are about the channel, not the book. Never invented, never "edited for clarity". No comments → no section.
15. **Who this is for / not for** — the "not for" list is what makes the "for" list believable.
16. **FAQ** — what do I get, which volume first, delivery, refund, is the persona real, is it safe, how do I pay.
17. **Final CTA** — one line of what they keep, the buy box again.
18. **Footer** — Terms · Privacy · Refund · Contact · YouTube, the AI line, the seller's legal name and country,
    the educational/safety disclaimer.

Look: warm paper background, dark ink text, one accent colour (rust red for craft), a slab serif for headings and
a book serif for body text, generous line height, max ~680 px text column, covers with a soft shadow. No stock
photos, no gradients, no emoji, no countdown timers.

## 3. The video side: the book lives inside the videos

- **First line of every description:** `📖 <Book> — <N> illustrated lessons, <price>: <domain>/<NNN>` where NNN is
  the video's number. The short link redirects to the page with `utm_campaign=NNN`, so Stripe shows which video
  sold each copy.
- **One mid-video mention**, 35–55 % in, tied to the point being made: "that's lesson 41 in my book" → "y'all ask
  me the same questions, so I put the answers in one place — 60 lessons and a drawing for every one" → "the code's
  on the screen". Then straight back to the video. Under 45 spoken words.
- **On screen during the mention:** the presenter holding the book (taped photo) · the lesson number burned into a
  plank · the lesson pages landing on the table while a counter runs up · the product card over the presenter's
  shoulder with the cover, what it is, the price, a QR code and "SCAN OR TYPE domain/NNN".
- **One closing line** before the subscribe line: "the book's linked first thing in the description".
- The lesson numbers the presenter quotes are REAL — the writer gets the book's lesson list.

### Two ways a video talks about the product (offer.json "plug", set by the kind)

- **numbered** (a lesson book — the pitmaster's way): one mention halfway (or two), "that's lesson 41 in my book",
  the photo of the host holding it, the pages landing, the card with the QR code.
- **page** (a family cookbook — the grandmother's way): a quick aside right after the host introduces herself — why
  the book exists, what it is (every recipe, every measure, N pages), the address said aloud, "links below", "back to
  the stove"; then the book speaks through the video: "my book says the chile fries with the onion…", "migas, page
  276 of my book" — 2 to 4 times, real pages only (read back from the PDF). When the dish of the day is NOT in the
  book she says so — that honesty is why viewers believe the rest. On screen: the card with the QR on the address,
  a page tag ("PAGE 276 · MIGAS") on every page said.

### Kinds of product (offer.py KINDS)

- **lesson-book** — numbered lessons in five parts (need · how it goes · why · how people ruin it · where it
  doesn't hold), a drawing each, problem index, cheat sheet.
- **cookbook** — recipes by chapter (yield · time · ingredients with measures · method with cues · why it works ·
  how it goes wrong · swaps · keeping it · a family note), a drawing each, printable recipe cards at the back.

## 4. Payment and delivery

- **Stripe Checkout** through two small Vercel functions (`api/checkout.js`, `api/download.js`). The price lives in
  the site's config, so no Stripe product setup is needed: one secret key in Vercel's environment and it sells.
- After payment Stripe returns the buyer to `/thanks`, which checks the payment with Stripe and shows the
  download links. The PDFs sit under an unguessable folder name that only the server knows.
- Any other checkout (Lemon Squeezy, Gumroad, Whop, lava.top) works too: set `checkout.mode` to `links` and paste
  the product links — that platform then delivers the file.

## 5. Rules that are never bent

- **The persona is disclosed as AI-generated** on the page, in the book and in the FAQ. Methods are real.
- **No invented testimonials, reviews, sales numbers, ratings, "as seen on" logos or fake scarcity.** The live
  checkout counter, if shown, comes from Stripe's own numbers. Pages that run a countdown that resets every visit,
  or "227 verified reviews, 5.0" nobody can check, sell this week and get the Stripe account closed next month. A
  sale is fine when it really ends on its date (the checkout charges the full price after it); reviews are fine
  when they come from paid orders.
- **The seller is a real legal name and country** in the footer and the terms. Refund policy is honoured.
- **Safety-sensitive numbers are checked** and the book carries a short educational/safety notice.
- **Never copy another channel's text, book, persona, place names or artwork.** Learn the structure; write your own.
