# Foundry

A template marketplace that carries CMS themes and hardcoded templates in the
same catalogue. WordPress themes, static HTML kits, Shopify storefronts, Framer
and Webflow projects all live in one product table — everything that differs
between them is a column on `platforms`, not a branch in application code.

Built for solo selling first, with multi-vendor tables already in place so you
can open it up without a migration that rewrites the catalogue.

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 15, App Router, TypeScript | Server components mean the catalogue renders straight from SQL, and the licence API lives in the same deploy |
| Database | Postgres + Drizzle ORM | Typed schema, real migrations, and the schema file is the single source of truth |
| Files | Cloudflare R2 | S3-compatible with no egress charges — matters when the product is a 40 MB zip re-downloaded on every update |
| Payments | Razorpay for India, Lemon Squeezy for the rest | An MoR handles EU VAT and US sales tax so you don't |

## Getting it running

```bash
npm install
cp .env.example .env          # set DATABASE_URL at minimum
npm run db:push               # create the tables
npm run db:seed               # sample catalogue + one test licence key
npm run dev
```

Neon or Supabase both work for `DATABASE_URL` with no local Postgres install.
The seed prints a working licence key you can test the API against:

```bash
curl -X POST localhost:3000/api/license/activate \
  -H 'content-type: application/json' \
  -d '{"key":"FNDR-XXXX-XXXX-XXXX-XXXX","site_url":"https://client.example.com"}'

curl 'localhost:3000/api/update-check?key=FNDR-...&slug=meridian-wp&installed=2.0.0'
```

## How one catalogue holds both kinds of product

`platforms` carries four behaviour flags. Everything downstream reads them
instead of checking "is this WordPress?":

| Platform | delivery | licensing | auto-update |
|---|---|---|---|
| HTML / Tailwind | file | no | no |
| WordPress | file | yes | yes |
| Shopify | file | no | no |
| Webflow / Framer / Figma | link | no | no |

`delivery_type = link` means the buyer receives a clone or remix URL instead of
a zip — the purchase page reveals `products.delivery_payload` rather than
issuing a download token. Adding a new platform is one row plus one entry in
`src/lib/platforms.ts`.

`product_families` is the piece worth understanding early: it groups the same
design shipped for several platforms, so "Meridian" can exist as both a WP theme
and an HTML kit under one buyer-facing page, and you can sell the pair as a
bundle. It costs nothing now and is painful to retrofit.

## Licensing

Only WordPress can really enforce a licence, and that's where the recurring
revenue is. Three pieces:

1. `POST /api/license/activate` — records a site against the licence. Idempotent
   per site, so moving staging → production doesn't burn a slot.
2. `GET /api/update-check` — returns the newest release plus a 15-minute
   download token, if the support window is still open.
3. `wordpress-client/class-foundry-updater.php` — drop into each theme you sell.
   Adds the Licence settings screen and hooks WordPress's own update check, so
   new versions appear under Dashboard → Updates like any other theme.

Ownership is perpetual by design: `licenses.supported_until` gates *updates*,
never the files the buyer already has. That distinction is what makes annual
renewals defensible rather than hostile.

## Money

All amounts are integer minor units (paise / cents) — never floats.
`order_items.seller_earnings` freezes the split at purchase time, so changing a
seller's revenue share later never rewrites history.

## Auth

Auth.js v5 with **JWT sessions, not the Drizzle adapter**. The adapter wants
text UUID user ids and its own `accounts`/`sessions` tables; this schema is
integer-keyed and already owns `users`. Rather than bend one to the other we
upsert on sign-in and carry the integer id in the token.

Trade-off worth knowing: no server-side session revocation — sessions expire
rather than being killable. If that becomes a requirement, add a
`sessionVersion` integer to `users`, put it in the token, and compare it in the
`jwt` callback.

Auth.js types `user.id` as a string, so `lib/session.ts` is the single place
that converts to our integer key. Declaring it as a number in the module
augmentation intersects to `never` and silently breaks every consumer.

Set `AUTH_TRUST_HOST=true` when self-hosting — without it every request is
rejected with `UntrustedHost`.

`FOUNDRY_DEV_LOGIN=true` enables a password-less sign-in form that accepts any
email address, for exercising the purchase flow without OAuth credentials. It is
gated on that explicit flag rather than `NODE_ENV` because `next start` sets
`NODE_ENV=production` even on a laptop, which makes a NODE_ENV gate untestable
locally. **Never set it on a deployed environment.**

## Checkout and fulfilment

Prices are read from the database at checkout, never from the request body.

`POST /api/webhooks/razorpay` is the only path that marks an order paid — the
browser's return page is never trusted, because a buyer can close the tab and a
tab can be forged. The signature is verified over the raw bytes before the body
is parsed, using a constant-time compare.

Fulfilment is idempotent, which matters because Razorpay retries and a buyer
refreshing the return page can race the webhook:

- an order already `paid` returns its existing licences and stops
- the `pending -> paid` transition is a conditional UPDATE, so only one caller wins
- only the winner mints licences

Verified by sending the same signed webhook three times: one licence row, order
`paid`, second and third deliveries return `alreadyFulfilled: true`.

## What's built vs. what's next

Built and verified end to end against a real Postgres and a real browser:

- Full schema, 15 tables, migration generated and applied
- Browse page with WebGL hero, platform filter, product page with releases
- Licence activation, update feed, tokenised downloads with signed R2 URLs
- WordPress updater client
- Auth (Google + local dev sign-in), gated routes
- Razorpay order creation, signature-verified idempotent webhook
- Buyer account: purchases, licence keys, on-demand download links

Next, in the order I'd do them:

1. **Payment sheet on the product page** — the `Buy now` button is still inert;
   it needs the Razorpay checkout script wired to `POST /api/checkout`.
2. **Receipt email** — licence key delivery on `payment.captured`. Resend or SES.
3. **Seller upload** — presigned R2 upload, version form with per-platform
   required fields from `platforms.requiredFields`.
4. **Demos** — static templates deploy to `demo-<slug>` subdomains on Vercel;
   WordPress demos run as one multisite install with a nightly content reset.
5. **Reviews and search** — Postgres full-text is enough until roughly 5k products.

Deliberately not built yet: the seller review queue and payouts. Both are only
worth it once other people are selling here, and they're additive to this schema.

## UI and motion

The 3D is concentrated in the hero on purpose. A marketplace lives on how fast
people can scan the grid, so animating the catalogue itself would work against
the product.

- **Hero** — six template panes in WebGL (`react-three-fiber`), drifting,
  leaning toward the pointer, fanning apart on scroll. Generated geometry only:
  no textures, no shadows, no postprocessing.
- **Cards** — pointer-tracked 3D tilt with a specular sweep. Written straight to
  CSS custom properties inside `requestAnimationFrame`, so no React state and no
  rerenders; a grid of forty cards stays smooth.
- **Platform rail** — a pinned section whose active row is driven by scroll
  position.

First Load JS is **107 kB**. Three.js is dynamically imported, so it never
enters the initial bundle — it loads 120ms after first paint, desktop only, and
never when `prefers-reduced-motion` is set. Mobile gets the static gradient hero.

## Known constraints

- Version strings must be numeric semver (`2.3.1`). The "latest release" query
  sorts by `string_to_array(version, '.')::int[]`, so `2.3.1-beta` would break it.
  Add a `prerelease` column if you need it.
- One currency per order. Multi-currency pricing needs a `product_prices` table.
- `platforms.install_guide` is plain text rendered as-is. Swap in a markdown
  renderer when guides get longer.
