import "server-only";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { buildSampleData } from "./seed";

// The browser-saved demo ("local mode", see config.js). Instead of Supabase,
// every page talks to PGlite: real Postgres compiled to WebAssembly, running
// inside the app's own server. It runs the same migrations, so every rule
// that protects stock and money (posting functions, the stock guard, voids,
// gapless numbers, RLS, the activity log) behaves exactly as on a client's
// database.
//
// Nothing is kept on the server. Each visitor's entries live in their own
// browser (oplog.js) and are replayed onto a fresh copy of a starting point:
// "empty" (just the company and the demo account) or "sample" (a month of
// sample data). Copies are cached per visitor while the server is warm, so
// replaying only happens after a cold start.

const ROOT = process.cwd();
const sqlFile = (...p) => fs.readFileSync(path.join(ROOT, "supabase", ...p), "utf8");

export const LOCAL_USER = {
  id: "00000000-0000-4000-8000-0000000000a1",
  email: "test@gmail.com",
  full_name: "Imran Saeed",
};

// Postgres functions and defaults that make a replay land on the same rows:
// ids come from a counter instead of random, and "now" can be pinned to the
// moment the visitor made the entry.
const DETERMINISM = `
create sequence public.local_uuid_seq;
create function public.local_uuid() returns uuid language sql volatile as $$
  select ('d0000000' || lpad(to_hex(nextval('public.local_uuid_seq')), 24, '0'))::uuid
$$;
create function public.local_now() returns timestamptz language sql stable as $$
  select coalesce(nullif(current_setting('local.now', true), '')::timestamptz, now())
$$;
create function public.local_today() returns date language sql stable as $$
  select (public.local_now() at time zone 'Asia/Karachi')::date
$$;
grant execute on function public.local_uuid(), public.local_now(), public.local_today() to public;
grant usage on sequence public.local_uuid_seq to public;
do $$
declare r record;
begin
  for r in
    select c.relname as tbl, a.attname as col, pg_get_expr(d.adbin, d.adrelid) as expr
    from pg_attrdef d
    join pg_class c on c.oid = d.adrelid
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
  loop
    if r.expr = 'gen_random_uuid()' then
      execute format('alter table public.%I alter column %I set default public.local_uuid()', r.tbl, r.col);
    elsif r.expr = 'now()' then
      execute format('alter table public.%I alter column %I set default public.local_now()', r.tbl, r.col);
    elsif r.expr = 'CURRENT_DATE' then
      execute format('alter table public.%I alter column %I set default public.local_today()', r.tbl, r.col);
    end if;
  end loop;
end $$;
`;

const COMPANY = `
update public.settings set
  company_name = 'Demo Factory Management Software', short_name = 'Demo Factory',
  tagline = 'Saved in this browser', address = 'Plot 12, Industrial Estate, Faisalabad',
  phone = '+92 300 0000000'
where id = 1;
insert into auth.users (id, email) values ('${LOCAL_USER.id}', '${LOCAL_USER.email}');
insert into public.profiles (id, full_name, role) values ('${LOCAL_USER.id}', '${LOCAL_USER.full_name}', 'admin');
`;

const SIGN_IN = `set role authenticated; select set_config('request.jwt.claim.sub', '${LOCAL_USER.id}', false);`;

let starting = null; // Promise<{ empty: Blob, sample: Blob }>

async function buildStartingPoints() {
  const db = await PGlite.create();
  await db.exec(sqlFile("tests", "00_supabase_stub.sql"));
  const dir = path.join(ROOT, "supabase", "migrations");
  for (const f of fs.readdirSync(dir).filter((x) => /^\d{4}_.*\.sql$/.test(x)).sort()) {
    await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  }
  await db.exec(DETERMINISM);
  await db.exec(COMPANY);
  await db.exec("truncate public.activity_log;");
  const empty = await db.dumpDataDir("none");
  await db.exec(SIGN_IN);
  await buildSampleData(db);
  await db.exec("reset role;");
  const sample = await db.dumpDataDir("none");
  await db.close();
  return { empty, sample };
}

export function startingPoints() {
  if (!starting) {
    starting = buildStartingPoints().catch((e) => {
      starting = null;
      throw e;
    });
  }
  return starting;
}

// ---- per-visitor copies ----------------------------------------------
const MAX_COPIES = 6;
const copies = new Map(); // visitor id -> { db, base, applied: string[], busy: Promise }

async function freshCopy(base) {
  const points = await startingPoints();
  const db = await PGlite.create({ loadDataDir: points[base] ?? points.empty });
  await db.exec(SIGN_IN);
  return db;
}

/**
 * The visitor's database with every one of their entries applied.
 * `replay(db, op)` re-runs one stored entry (client.js).
 */
export async function databaseFor(log, replay) {
  const key = log.id;
  let entry = copies.get(key);
  const sameStart = entry && entry.base === log.base && entry.applied.length <= log.ops.length &&
    entry.applied.every((s, i) => s === JSON.stringify(log.ops[i]));
  if (!sameStart) {
    if (entry) await entry.db.close().catch(() => {});
    entry = { db: await freshCopy(log.base), base: log.base, applied: [] };
  }
  copies.delete(key);
  copies.set(key, entry); // most recently used last
  while (copies.size > MAX_COPIES) {
    const [oldKey, old] = copies.entries().next().value;
    copies.delete(oldKey);
    old.db.close().catch(() => {});
  }
  for (let i = entry.applied.length; i < log.ops.length; i++) {
    await replay(entry.db, log.ops[i]);
    entry.applied.push(JSON.stringify(log.ops[i]));
  }
  return entry;
}

export function forgetCopy(id) {
  const entry = copies.get(id);
  if (entry) {
    copies.delete(id);
    entry.db.close().catch(() => {});
  }
}
