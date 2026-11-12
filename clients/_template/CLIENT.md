# <Client short name>

One page per client: who they are, what they bought, where their copy
runs, and everything that is different about them. Copied from
`clients/_template` by `node scripts/new-client.mjs <slug> --init`.

## The business

- **Company (as on invoices):**
- **What they make:**
- **City and address:**
- **Owner / decision maker:**
- **Day-to-day contact (name, WhatsApp):**
- **Replacing:** (paper register, Excel, another program; get a copy)

## Users

| Name | Role | What they may do (permissions) |
|---|---|---|
| | Admin | everything |
| | Worker | |

## Where it runs

| | |
|---|---|
| Supabase project ref | (also in `client.json`) |
| Supabase region | ap-south-1 (Mumbai) |
| Vercel project | |
| Address (URL) | |
| Industry template | |
| Migrations applied | (keep `client.json` "migrationsApplied" in step) |

Keys (anon, service role, database password) are **never** written here or
anywhere in the repo. They live in the Supabase dashboard and in the
client's Vercel project settings.

## Agreement

- **Setup fee:**
- **Monthly / yearly:**
- **Billing day:**
- **Started on:**
- **What is included:** (training visits, data entry of opening stock, support hours)

## Their setup (fill in during onboarding)

- Item fields chosen (size, thickness, colour/type, pack count and their names):
- Categories added beyond the template:
- Recipes entered:
- Opening stock entered on:
- Opening balances entered on:

## Differences from the master copy

Keep this empty if you can. The product is one codebase for every client;
anything a client needs should be a setting, not a fork. If something here
is not a setting yet, it is a product task, not a client patch.

## Log

- YYYY-MM-DD: started setup.
