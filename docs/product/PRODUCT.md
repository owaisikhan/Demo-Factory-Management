# The product

**Factory Manager** (working name, set in `app/_lib/siteConfig.js`;
each client's own name is what their screens show): stock, production, purchases, sales and credit for small
Pakistani factories, 5 to 50 staff, run from phones and a laptop.

## Who it is for

Factories that turn raw material into products and sell on credit, keeping
records today in a register or Excel. First: packaging (tape, cartons,
poly bags, film, labels). Then any small manufacturer (soap, paint,
chemicals, food, moulding, garment accessories) through the `general`
template.

What sells it, in the owner's words:

- **No material goes missing.** Production takes raw material out of stock
  by recipe, and the report shows actual use against the recipe.
- **Every rupee owed is visible.** Customer and supplier ledgers, ageing,
  printable invoices with the amount in words.
- **Nothing can be quietly changed.** Entries are voided with a reason,
  never deleted; every change is in the activity log; the owner decides
  what each worker may do.
- **Workers can use it.** Big text and buttons, phone layouts, a guide in Urdu.

## How it is built

One codebase, one database per client (details in the repo README).

- **Same for every client:** screens, rules, reports, the Guide, the
  migrations. A client never gets a code fork.
- **Per client, as data:** company and invoice details, item fields and
  their names, every list (categories, units, brands, sizes...), recipes,
  users and permissions. Set from an industry template at setup, then by
  the owner in Settings.
- **Rules that protect stock and money are in Postgres**, so they hold
  whatever the screens do: the stock guard, posting functions, voids,
  gapless document numbers, row level security and the activity log.

## Files that make it a product

| Path | What |
|---|---|
| `supabase/migrations/` | the database, shared by every client (append only) |
| `supabase/templates/` | starting lists and item fields per industry |
| `scripts/new-client.mjs` | builds a new client's `setup.sql` and `first-admin.sql` |
| `clients/` | one folder per client: `client.json`, `CLIENT.md` |
| `clients/_template/` | what a new client folder starts as |
| `app/_lib/item-fields.js` | the item field names, read from the client's settings |
| `app/_lib/siteConfig.js` | the product's own name; the client's name comes from their database |
| `docs/product/` | setup, updates, templates, intake |

## Known limits (product backlog)

Ordered by how often a new client will ask:

1. **Excel import** of opening stock and customer/supplier balances.
   Today they are typed in on Stock > Opening stock and on each customer
   and supplier.
2. **Post-dated cheques**: a payment by cheque is recorded on the day it
   is entered; there is no "cheque in hand, clears on" register.
3. **Invoice on WhatsApp**: today the invoice prints or saves as PDF to
   send by hand.
4. **FBR digital invoicing** for sales-tax-registered clients: check the
   current FBR rules before promising it.
5. **One site per client**: there is no multi-warehouse or multi-branch stock.
6. **Screens in English only**; the Guide is in English and Urdu.
7. **One database per client** means a Supabase project per client (a
   monthly cost per client). Moving every client into one shared database
   would need a company column on every table and new security rules: a
   large change, worth it only at many clients.
8. The demo data is a tape factory. A demo per template would help sales
   to other industries.
