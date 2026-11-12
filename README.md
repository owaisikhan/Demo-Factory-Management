# Factory Manager

Stock, production, purchases, sales and credit for small factories in
Pakistan: one app for the owner and the floor staff, on phones and a
laptop. This repo (`owaisikhan/Dem-factory-management`) is the **master
copy**: every client runs this same code on their own database.

The first client is AM Packaging, a tape factory in Faisalabad
(`clients/am-packaging/`). Product docs are in `docs/product/`; each
client's record is in `clients/`.

## What it does

- **Raw materials** and **products** live in one items list. Their extra
  details (size, thickness or grade, colour or type, pack count) and what
  each is called are set per client in **Settings > Item fields**, from an
  industry template at setup: a tape maker sees Size in mm x yd, Micron and
  Rolls per carton; a carton maker sees Box size in inches L x W x H, Paper
  weight in gsm, Ply and Pieces per bundle.
- **Stock** is never typed in directly. It is the sum of a ledger:
  opening stock, purchases, production (finished goods in, raw materials
  out), sales and admin adjustments with a reason. Stock cannot go below zero.
- **Production** pre-fills the materials used from each product's recipe;
  the worker corrects them before saving.
- **Purchases and sales** save the bill or invoice, its lines, the stock
  movement and any payment together, with supplier and customer ledgers. An
  invoice prints (or saves as PDF) on its own, with the amount in words.
- **Dashboard and Reports** chart sales, purchases, production, raw material
  use against the recipe, stock value, money owed (with ageing) and gross
  profit. Every chart has a table view, and each report downloads as CSV.
- **Activity** records every create, update, delete, void, payment, stock
  entry and sign-in, by Postgres triggers, filterable by who did it.
- **Settings** hold the company and invoice details, the item fields and
  every list the client maintains: categories, brands, sizes, thickness
  values, colours or types, units and recipes.
- **Guide** for workers and admins, in English and Urdu.

## How clients are set up

| | Shared by every client | Per client |
|---|---|---|
| Code | this repo, branch `main` | nothing |
| Database | the migrations in `supabase/migrations/` | its own Supabase project (Mumbai) |
| Hosting | `vercel.json` (`bom1`, Mumbai) | its own Vercel project with 3 env vars |
| Name, address, invoice details, item fields, lists | | its settings row, set up from `clients/<slug>/client.json` and an industry template |

- New client: `node scripts/new-client.mjs <slug> --init`, then
  `docs/product/NEW_CLIENT_SETUP.md`.
- New migration or release: `docs/product/UPDATING_CLIENTS.md` (database
  first, then code, because a push to `main` deploys every client).
- Templates: `docs/product/TEMPLATES.md`. Intake questions:
  `docs/product/CLIENT_INTAKE.md`. Product overview: `docs/product/PRODUCT.md`.

## Roles

| | Admin | Worker (by default) |
|---|---|---|
| See stock and items | Yes | Yes |
| Record production, purchases and sales | Yes | Yes |
| Take cash from a customer on a new invoice | Yes | Yes |
| Add customers and suppliers | Yes | Yes |
| Balances, ledgers, other payments (customers and suppliers) | Yes | No |
| Add or edit items, recipes, settings, users | Yes | No |
| Opening stock and adjustments | Yes | No |
| Void a purchase, invoice, run or payment | Yes | No |
| Reports, activity log, rates and profit | Yes | No |

An admin ticks, per worker, which of the money permissions they also get
(balances, payments, reports, voids) on the Users page.

## Stack

Next.js 16 (App Router, plain JavaScript), Tailwind v4, Supabase (Postgres,
RLS, password sign-in), Vercel. Each client's Supabase project is in Mumbai
(`ap-south-1`), so the Vercel function region is `bom1` (`vercel.json`).

## Running it

```bash
npm install
npm run dev          # with no .env.local: demo mode on sample data (a tape factory)
DEMO_ROLE=worker npm run dev   # the demo as a worker sees it
```

The demo is also the sales demo: deploy it with no env vars and it opens on
sample data with saving switched off.

To run against a client's database locally, copy `.env.example` to
`.env.local` with that client's URL, anon key and service-role key. Prefer a
scratch project of your own for development; never test-post documents on a
client's database (nothing can be deleted from the ledger).

## Checking a change

```bash
npx eslint .                      # includes no-undef: a lost name fails here, not at runtime
npm run build
bash supabase/tests/run.sh        # database rules, local throwaway Postgres only
bash supabase/tests/templates.sh  # a new client's setup on every template, local only
npm run build && npm start        # demo mode (no .env.local), then in another terminal:
npm run check                     # the regression checks in scripts/checks
npm run check -- --base http://localhost:3100 --only contrast,taps
```

`npm run check` drives the app in Playwright: every page renders with a
clean console, nothing runs past a phone screen (320 to 414px), no figure is
clipped or spills from its card, no table scrolls sideways at 1024 to
1440px, text meets AA contrast in light and dark, dark-mode dropdowns are
readable, charts draw, touch targets are 44px, search filters as you type,
an invoice prints on its own, and no link opens a new tab. Each check exists
because that bug happened once. Run it against a demo build only: demo mode
cannot save anything.
