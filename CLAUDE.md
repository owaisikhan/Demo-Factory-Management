@AGENTS.md

# Factory Manager: working in this repo

The **master copy** of a factory management product (stock, production,
purchases, sales, credit) sold to small Pakistani factories. GitHub repo
`owaisikhan/Demo-Factory-Management` (renamed from AM-Packaging on
2026-11-12). Every client runs this same code on their own Supabase and
Vercel project; nothing is forked per client. What is built and what is
next is in `docs/PROGRESS.md`; the product, its limits and the per-client
runbooks are in `docs/product/`; each client's record is in `clients/`.

The first client is **AM Packaging** (Ahmed Munir Packaging Industry, a tape
factory in Faisalabad). Their original plan and voice-note requirements are
in `clients/am-packaging/PLAN.md`.

## Product rules

- **No client's name, address or data in the code.** A client's details
  live in their settings row (Settings > Company & Invoice), reached through
  `getBranding()` / `getSettings()` in `data-service.js`. Fallbacks and the
  product's own name are in `app/_lib/siteConfig.js`.
- **No industry words in the code either.** Item details (size, thickness,
  colour/type, pack count), their names and units come from Settings > Item
  fields via `app/_lib/item-fields.js` (`itemFields`, `itemDetails`,
  `formatThickness`, `formatPack`). Database columns keep their first names
  (`width_mm`, `length_yd`, `microns`, `rolls_per_carton`); only the words
  on screen change. Copy and placeholders stay neutral.
- **A client need is a setting or a template, not a fork.** Industry lists
  are in `supabase/templates/` (`docs/product/TEMPLATES.md`); new clients are
  built with `scripts/new-client.mjs` (`docs/product/NEW_CLIENT_SETUP.md`).
- **A push to `main` deploys every client.** A change needing a migration
  reaches `main` only after the migration is live on every client
  (`docs/product/UPDATING_CLIENTS.md`), and migrations must work with the
  code already deployed: add with defaults, never rename or drop in the same
  release.

Built with the kodexa-builder skill (v1.5.0). Load it for any new feature or
design work, and log preferences, corrections and reversals to
`.claude/kodexa-learnings.md` as they happen.

## Who uses it

Per client, a handful of people: admins (owner side) and workers (factory
floor; AM Packaging has 2 and 3). Mixed ages,
English UI, phones and a desktop. Design for the less screen-confident
reader: full-word labels beside icons, 16px form text, 44px tap targets,
money and quantities never wrap, colour never the only signal.

Palette exceptions: Inter as the only typeface (one exception: Noto Nastaliq Urdu for the Urdu Guide, loaded on that page only), green #22B573 primary and the
green gradient dashboard banner. All come from the reference design the user
chose (invenza-html.vercel.app); do not "fix" them. Text in green or red uses
`text-primary-ink` / `text-danger-ink` (the fills are too faint as text).

## Ground rules

- **No em dashes or en dashes anywhere** (UI copy, errors, seed data,
  comments, docs). Use a comma, colon, full stop, brackets or a plain hyphen.
  Check: `LC_ALL=C.UTF-8 grep -rnP '\x{2014}|\x{2013}' app/ supabase/ docs/ CLAUDE.md README.md`
  (exit code 1 with no output means clean; AGENTS.md is written by Next and is exempt).
- **Every read in `app/_lib/data-service.js`, every write in `app/_lib/actions.js`.**
  Actions return `{ ok, message, ...extras }`, rendered by `<FormMessage>`.
- **Rules that protect stock and money live in Postgres** (`supabase/migrations/`):
  the stock guard, posting functions (`post_purchase`, `post_sale`,
  `post_production`), voiding, gapless document numbers, RLS, and the
  activity log triggers. App checks are a courtesy.
- **Database error messages are sentences for the owner**, naming the item
  and figures and saying what to do next.
- **Migrations are append-only.** Never edit one that any client has
  applied; add a new numbered file. Which client is on which migration is
  in `clients/README.md` and each `clients/<slug>/client.json`. AM Packaging
  (ref cbdpijrrzjvkmyyhyubz, Mumbai) is on 0010 (applied 2026-11-12). Their old Singapore project (fqvmljwlwfjensumiqws) is
  retired: do not apply anything to it. The next new migration is 0011.
- **A live database is identified by its ref**, matched against the
  client's `client.json`, never by its name or by being the only one open.
- **Nothing is deleted from the ledger.** Purchases, sales and production
  runs are voided (admin, with a reason), which writes reversing stock entries.
- **Per-worker permissions** (0008): an admin ticks what each worker may do
  under Users (add and Edit). Keys and labels live in `app/_lib/permissions.js`
  (`PERMISSIONS`, `can(user, key)`); the database checks the same keys with
  `has_perm` / `require_perm`. Floor keys (stock_view, purchases, production,
  sales, sales_cash, customers, suppliers) are on by default; money keys
  (balances, payments, reports, void) are off until ticked. Settings, items,
  recipes, stock adjustments, users and activity stay admin-only. Voids and
  payments go through security-definer functions, so table updates stay
  admin-only. Opening balances and editing customers or suppliers are admin.
- **Workers vs admins:** RLS and the `require_perm` checks are the real fence,
  `requirePagePermission` / `requirePermission` (and `requirePageRole` /
  `requireRole` for admin-only things) the second, hidden nav links cosmetic.
  `DEMO_ROLE=demo-w2` shows a worker with only stock and production.
- **Demo mode:** with no Supabase env vars the app runs on
  `app/_lib/demo-data.js` and saving is off. Keep demo rows shaped exactly like
  the real query rows (including the item-field columns on `demoSettings`).
  `DEMO_ROLE=worker` shows it as a worker. The demo is a fictional tape
  factory ("Demo Factory Management Software"), signed in with test@gmail.com / 12341234
  (`app/_lib/demo-auth.js`; `DEMO_LOGIN=off` turns the sign-in off), and doubles as
  the sales demo.
- Design language follows the reference site exactly: tokens and component
  classes in `app/_styles/globals.css`. Do not add features from the
  reference that the client did not ask for.

## Shared pieces to reach for first

- Layout: `PageHeader`, `Sidebar` (collapse state in `sidebarState.js`), `Header`, `NavigationProgress` (PMC loading bar).
- UI: `StatCard`, `Badge`, `FilterBar` (filters as query strings), `Pagination`, `EmptyState`, `FormMessage`, `SubmitButton`, `MoneyRow`, `ReasonDialog` (void with a reason; pass icons as elements, not components).
- Product: `getBranding()` (client name, works before sign-in via `app_branding()`), `getItemFields()` / `itemFields(settings)`, `ItemFieldsForm` (Settings > Item fields).
- Admin: `ItemsTable` / `ItemsListPage` (Stock, Raw Materials, Products), `StockStatus`, `MovementType`, `ActivityTable`, `LookupManager` (Settings lists), `PurchasesTable`, `PurchaseForm`, `PaymentStatus`, `PaymentForm` and `PaymentsTable` (both take `kind="supplier" | "customer"`), `ProductionForm`, `RunStatus`, `SaleForm`, `SalesTable` (with `OverduePill`), `CustomerForm`, `SupplierForm`.
- Print: `PrintButton` and the `.invoice-sheet` / `no-print` classes.
- Charts (`app/_components/charts/`): `ChartFrame` (card with Chart / Table toggle), `ColumnChart`, `TrendChart`, `DonutChart`, `RankBars`, `StackBar`; shape rows with `periodView` in `app/_lib/chart-data.js`. Load the `dataviz` skill before adding a chart. Never sum quantities across units.
- Guide: `/admin/guide` reads its words from `app/_lib/guide-content.js`. When a button or field label changes on screen, change it there too, and in the Urdu copy `guide-content-ur.js` (same section ids; the on-screen names stay English inside the Urdu).
- Reports: `app/_lib/reports.js` builds each tab for both the page and the CSV; `demo-reports.js` mirrors `0007_reports.sql` for demo mode.
- Formatting: `format-helpers.js` (money as "Rs 1,250", `amountInWords` in lakh/crore, `withoutDashes` for server messages), `date-helpers.js` (Asia/Karachi).
- Waiting and touch: `ui/PageSkeletons.js` for `loading.js` files (list pages keep theirs in a `(list)` route group), `tap-inline` for small text links, `pointer-coarse:min-h-[44px]` for compact controls.

## Verifying a change

1. `npx eslint .` (includes `no-undef`) and `npm run build`.
2. Database: `bash supabase/tests/run.sh` applies every migration to a local
   throwaway Postgres and runs the rule tests as an admin and a worker. Each
   "expect" line in `supabase/tests/rules_test.sql` says what should happen.
   Never run it against a client's project. `bash supabase/tests/templates.sh`
   builds a new client's setup on every industry template and applies it
   to throwaway local databases.
3. Screens: `npm run build && npm start` with no env (demo mode), then
   `npm run check` (about two minutes, all must pass). Add a check to
   `scripts/checks/` for every bug that passed the build, and a new page to
   `scripts/checks/pages.mjs`. Then look at the changed screens at 1440, 1024,
   390 and 360 wide: tables switch to cards below 1280px.
