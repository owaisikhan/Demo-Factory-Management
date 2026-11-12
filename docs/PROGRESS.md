# Progress

## Done

- [x] Phase 1: database (all phases' tables and posting functions), app shell,
      auth, Stock, Raw Materials, Products, Activity, Users, Settings, demo mode.
- [x] Phase 2: Purchases (list, new, detail, void) and Suppliers (list, add,
      edit, ledger with running balance, payments, void payment). Supplier
      money is admin-only.
- [x] Phase 3: Production (list, record run pre-filled from the recipe,
      run page with recipe vs actual, void). Search boxes filter as you type.
- [x] Phase 4: Sales and Customers (invoice list, new invoice, printable
      invoice with amount in words, customer list, add, edit, ledger,
      payments received, void). Workers can enter cash taken at the counter
      on a new invoice; other customer money is admin-only.
- [x] Phase 5: Dashboard charts (sales vs purchases daily/weekly/monthly,
      production output per category, stock health, top products, stock
      alerts with meters) and Reports (sales, purchases, production, raw
      material use vs recipe, stock value and flow, receivables and
      payables with ageing, gross profit), each with a table view and CSV.
- [x] Phase 6: polish pass. Regression checks (`npm run check`), loading,
      error and not-found screens, 44px touch targets, phone layouts for
      Users and Settings, app icon, `no-undef` lint, docs.
- [x] Guide page for workers and admins (`/admin/guide`), in English and Urdu.
- [x] Per-worker permissions chosen by the admin (migration 0008).
- [x] Live Supabase project connected: migrations 0001-0007 applied,
      first admin added (a test account for now).

- [x] Product: the app became a generic factory management product
      (2026-11-12). Migration 0010 (item fields, size units and height,
      sign-in branding, neutral defaults), Settings > Item fields, four
      industry templates, `scripts/new-client.mjs`, `clients/` records and
      the runbooks in `docs/product/`.

## Next

- [ ] Pick the product's name (working name "Factory Manager" in
      `app/_lib/siteConfig.js`).
- [ ] First new client through `docs/product/NEW_CLIENT_SETUP.md`; fix the
      runbook wherever it was wrong.
- [ ] Product backlog, in order: Excel import of opening stock and
      balances, post-dated cheques, invoice to WhatsApp, a demo per
      template (`docs/product/PRODUCT.md`, Known limits).

AM Packaging's own open items (real users, the test admin, importing their
records, their open questions) are in `clients/am-packaging/CLIENT.md`.
