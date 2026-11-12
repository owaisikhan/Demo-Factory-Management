# Updating clients

Every client's Vercel project deploys from `main` of this repo. **A push
to `main` reaches every client within minutes.** Their databases do not
update themselves: each migration is applied to each client's Supabase
project by hand. Updating safely comes down to doing those two in the
right order.

## The rule

**Database first, then code.** A change that needs a new migration reaches
`main` only after that migration is live on every client's database.

And so that the order is safe, **every migration must work with the code
that is already deployed**: add columns with defaults, add functions and
tables; do not rename or drop anything the current code still reads. To
remove something, do it in two releases: stop using it in the code first,
drop it in a later migration.

## Code-only changes (no new migration)

Merge to `main`. All clients redeploy. Look at one client's site afterwards.
If something is wrong: Vercel > the project > Deployments > the previous
one > **Instant Rollback**, for each client, while you fix it.

## Changes with a migration

1. **Write it** as the next numbered file in `supabase/migrations/`
   (append only: never edit a migration any client has applied). Its
   defaults should keep every existing client's screens exactly as they
   were.
2. **Test it locally:**
   ```bash
   bash supabase/tests/run.sh         # all migrations + rule tests, admin and worker
   bash supabase/tests/templates.sh   # a fresh client on every template
   ```
   Add "expect" lines to `supabase/tests/rules_test.sql` for the new rules.
3. **Apply it to each client**, one at a time, from `clients/README.md`:
   1. Open the client's Supabase project and check the ref in the address
      bar against `clients/<slug>/client.json`. Never by name.
   2. Note one figure the migration must not change (for example the total
      of the Stock page, or the latest invoice number).
   3. SQL Editor > New query > paste the migration file > Run. Or
      `psql "<connection string>" -v ON_ERROR_STOP=1 -f supabase/migrations/NNNN_name.sql`.
   4. Check the figure again; open their site and look at a page or two.
   5. Update `migrationsApplied` in their `client.json` and the table in
      `clients/README.md`.
4. **Merge the code to `main`** once every client's row shows the new number.
5. **New clients** need nothing extra: `scripts/new-client.mjs` always
   includes every migration in the folder.

Commit the `client.json` and README changes, so the record matches the databases.

## A client who must not update yet

Rare, but it happens (they are mid-audit, or are on a lower plan). In
their Vercel project, Settings > Git > Production Branch: set it to a
branch named after them (`client/khan-cartons`) that you move forward
when they are ready. Note it in their `CLIENT.md` under "Differences from
the master copy". Do not keep a client behind for long: every migration
then needs a second plan.

## Never

- Apply anything to a database you identified by its name or because it
  was the only one open.
- Apply anything to AM Packaging's retired Singapore project
  (`fqvmljwlwfjensumiqws`).
- Run `setup.sql` on a client that is already live. The script refuses to
  build it for a client whose `migrationsApplied` is set, and the SQL
  refuses to run on a database with items.
- Fix a client's figures by editing rows. Corrections go through the app
  (a void with a reason, a stock adjustment with a reason), so the activity
  log and the ledger stay true. Write the steps for the owner.
- Run `supabase/tests/*.sh` against a client. They drop and recreate their
  own local database.

## Done so far

| Migration | Applied to | Date |
|---|---|---|
| 0010_product | am-packaging | 2026-11-12 |
