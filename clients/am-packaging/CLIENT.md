# AM Packaging (client 1)

The first client, and the factory the product was built with. The original
plan and the owner's voice-note requirements are in `PLAN.md` beside this
file; `starting-lists.sql` is the one-off list seed already run on their
database.

## The business

- **Company (as on invoices):** Ahmed Munir Packaging Industry
- **What they make:** BOPP packaging tape (clear, brown, coloured, printed,
  kraft) slit from jumbo rolls, plus stretch film and plastic strip
- **City and address:** 265-D, Small Industrial Estate, Sargodha Road, Faisalabad
- **Tagline:** Your Trusted Packaging Partner
- **Users:** 5 (2 admins, 3 workers), mixed ages, English screens, Urdu guide

## Where it runs

| | |
|---|---|
| Supabase project ref | `cbdpijrrzjvkmyyhyubz` (Mumbai, ap-south-1), live since 2026-10-05 |
| Retired project | `fqvmljwlwfjensumiqws` (Singapore). Never apply anything to it; pause it once the live site is confirmed |
| Vercel project | fill in |
| Industry template | packaging-tape (their lists were seeded by hand before templates existed) |
| Migrations applied | 0001 to 0010 |

## Agreement

They did not buy the software; it is Kodexa's product and AM Packaging is
the first site running it. Record what was agreed with them here (fee,
support, being the reference client).

## Open items

- [ ] Add the real admins and workers in Users, then switch off the test
      admin (admin@gmail.com).
- [ ] Ask about importing existing records (a register or Excel file with
      opening stock and customer/supplier balances). Deferred by the owner
      on 2026-10-03: "Leave it for now, remind me in the future".
- [ ] Open questions, all in Settings, none blocking: the remaining tape
      sizes (6 of about 10 to 12 seeded), recipes per product, units and
      raw materials for stretch film and plastic strip, NTN/STRN, GST on or
      off, invoice terms.

## Differences from the master copy

None. Their company name, tagline and address are in their settings row,
not in the code.

## Log

- 2026-10-03: phases 1 to 6 built and reviewed in demo mode.
- 2026-10-05: moved to the Mumbai project, migrations 0001 to 0009 applied,
  starting lists seeded.
- 2026-11-12: the codebase became the product master copy; this client
  record created. Migration 0010 applied (items, stock total, movements,
  activity count and size names checked identical before and after), then
  the product code went to `main`.
