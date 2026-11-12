# Clients

Every factory running the product has a folder here. The code is the same
for all of them; what differs is their database (one Supabase project
each), their Vercel project and the details in their folder.

| Client | Template | Status | Supabase ref | Migrations applied | Folder |
|---|---|---|---|---|---|
| AM Packaging, Faisalabad | packaging-tape | live | `cbdpijrrzjvkmyyhyubz` | 0009 (0010 next) | [am-packaging](am-packaging/CLIENT.md) |

Keep this table and each `client.json` "migrationsApplied" up to date: they
are how you know which clients still need a new migration
(`docs/product/UPDATING_CLIENTS.md`).

## A folder holds

- `client.json`: the facts the setup script reads (template, company and
  invoice details, first admin) and where the client runs. No keys.
- `CLIENT.md`: the human record (contacts, users, agreement, log).
- `setup.sql`, `first-admin.sql`: built by `node scripts/new-client.mjs <slug>`
  for a new client's empty database. Not committed (see `.gitignore`);
  rebuild them whenever you need them.

## Starting a new one

```bash
node scripts/new-client.mjs khan-cartons --init
```

Then follow `docs/product/NEW_CLIENT_SETUP.md`. `_template/` is the
starting point; change it when every future client should start differently.

## Never in this folder

Supabase keys, the database password, Vercel tokens, the owner's personal
passwords. They stay in the Supabase dashboard and the Vercel project.
