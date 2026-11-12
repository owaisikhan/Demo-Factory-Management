# Setting up a new client

From signed agreement to the owner signing in: about two hours of your
time, plus the onboarding visit. Every client runs the **same code** from
this repo (`owaisikhan/Demo-Factory-Management`, branch `main`) on their own
Supabase project and their own Vercel project. Nothing is copied or forked.

```
master repo (main) ──deploys──> Vercel project "khan-cartons" ──> Supabase project "khan-cartons"
                   └─deploys──> Vercel project "am-packaging" ──> Supabase project "am-packaging"
```

You need: a Supabase account (the Kodexa organisation), a Vercel account
connected to the GitHub repo, Node 20 or newer, and this repo checked out.

## 1. Before you start: the intake

Fill in `docs/product/CLIENT_INTAKE.md` with the owner (on the visit or a
call). It tells you which industry template to use, what their items are
called, who the users are and what they are replacing. Get a photo or copy
of their current register or Excel sheet.

## 2. Start the client's folder

Pick a short folder name (the slug): lowercase, hyphens, for example
`khan-cartons`. It is also the Supabase and Vercel project name.

```bash
node scripts/new-client.mjs khan-cartons --init
```

Then edit `clients/khan-cartons/client.json`:

- `template`: one of `packaging-tape`, `corrugated-carton`, `plastic-bags`,
  `general` (what each sets: `docs/product/TEMPLATES.md`).
- `company`: exactly as it should print on invoices. `short_name` is what
  the menu, the sign-in page and the browser tab show.
- `firstAdmin`: the owner's name and the email they will sign in with.

Fill in what you know of `CLIENT.md` (contacts, users, agreement).

## 3. Create the Supabase project

1. supabase.com > the Kodexa organisation > **New project**.
2. Name: the slug. Region: **South Asia (Mumbai)**, which matches the app's
   server region (`bom1` in `vercel.json`). Other regions make every page slower.
3. Database password: generate one and save it in the password manager
   under the client's name. Never in the repo.
4. Plan: a paying client goes on a paid plan. Free projects pause after a
   week without use, which looks to the client like the app is down.
5. When it is ready, copy the **project ref** (Project Settings > General,
   the part of the URL after `/project/`) into `client.json` > `supabase.projectRef`
   and into `CLIENT.md`.

## 4. Build and run the database setup

```bash
node scripts/new-client.mjs khan-cartons
```

This writes `clients/khan-cartons/setup.sql` (every migration, the
template, the company details, a clean activity log, all in one
transaction) and `first-admin.sql`. Both are rebuilt on demand and not
committed.

**Check you are in the right project** before running anything: the ref in
the browser's address bar must match `client.json`. Never go by the project
name or by it being the only one open. A migration once went to the wrong
project that way.

Run it, either way:

- **SQL Editor:** Supabase > SQL Editor > New query, paste the whole of
  `setup.sql`, Run. The last result shows the company name, the template
  and the counts of categories, units and starter items.
- **psql:** with the connection string from Project Settings > Database
  (the "Session" pooler string, with the password filled in):
  ```bash
  psql "postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" -v ON_ERROR_STOP=1 -f clients/khan-cartons/setup.sql
  ```

If it stops with an error, nothing was kept (it is one transaction). Fix
the cause and run it again. If it says the database already has items or
documents, you are in the wrong project: stop and check the ref.

Set `client.json` > `migrationsApplied` to the last migration number (the
first line of `setup.sql` says which).

## 5. Sign-in settings and the first admin

In the client's Supabase project:

1. **Authentication > Sign In / Providers**: switch **off** "Allow new
   users to sign up". Accounts are made only by an admin on the Users page.
   Leave Email on.
2. **Authentication > Users > Add user > Create new user**: the owner's
   email from `client.json`, a starting password, tick **Auto Confirm User**.
3. SQL Editor: paste and run `first-admin.sql`. Expect one row with role
   `admin`. No row means the email does not match the account in step 2.

## 6. Create the Vercel project

1. vercel.com > **Add New > Project** > import `owaisikhan/Demo-Factory-Management`.
   Project name: the slug. Framework: Next.js (detected). Root: the repo root.
2. **Environment Variables** (Production, Preview and Development), from
   Supabase > Project Settings > API:
   - `NEXT_PUBLIC_SUPABASE_URL`: the project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the anon / publishable key
   - `SUPABASE_SERVICE_ROLE_KEY`: the service role / secret key (needed to
     add users and change passwords)
3. Deploy. The server region comes from `vercel.json` (`bom1`, Mumbai).
4. Domain: the default `<slug>.vercel.app` works. For the client's own
   address (`app.khancartons.pk`), add it under Settings > Domains and give
   the client the DNS record to add.
5. Copy the project name and address into `client.json` > `vercel` and `CLIENT.md`.
6. Back in Supabase > **Authentication > URL Configuration**: set Site URL
   to that address.

Missing variables do not break the site: it opens in **demo mode** with
sample data and a demo banner. If you see the banner on a client's address,
the variables are missing or misspelt; fix them and redeploy.

## 7. Check it

On the client's address, in a private window:

- [ ] The sign-in page shows the client's short name and company name.
- [ ] The owner's account signs in and lands on the Dashboard; no demo banner.
- [ ] Settings > Company & Invoice shows their details.
- [ ] Settings > Item fields shows the template's words; Raw Materials lists
      the starter items (except the `general` template, which has none).
- [ ] Users: add one test worker, sign in as them in another browser, sign
      out, then switch the test worker off.

**Do not record test purchases, invoices or production on a client's
database.** Nothing can be deleted from the ledger, only voided; a test
invoice would stay in their books and take invoice number 1. Try those
screens on your demo build instead (`npm run build && npm start` with no
`.env.local`).

## 8. Onboarding with the owner

Usually one visit. Do it in this order (it is also the admin part of the
in-app Guide, Settings > Guide):

1. Settings > Company & Invoice: NTN, STRN, GST on or off, terms, logo.
2. Settings > Item fields: adjust the template's words to theirs.
3. Settings lists: categories, units, brands, sizes and the rest.
4. Raw Materials and Products, with a low-stock level for each.
5. Settings > Recipes: materials per unit for each product.
6. Stock > Opening stock / Adjust: today's count of every item.
7. Customers and Suppliers with their opening balances.
8. Users: the other admins and the workers, ticking what each may do.

Show the workers the Guide (it has an Urdu version, button at the top
right). Write what was set up, and the date, in `CLIENT.md`.

## 9. Record it

- `client.json`: `status` to `live`, `migrationsApplied`, `vercel`, `plan`.
- `clients/README.md`: add the row to the client table.
- Commit the folder (`client.json`, `CLIENT.md`; the generated SQL is ignored).

From now on this client gets every product update. Read
`docs/product/UPDATING_CLIENTS.md` before the next migration.
