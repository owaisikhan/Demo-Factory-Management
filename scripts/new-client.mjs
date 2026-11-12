#!/usr/bin/env node
// Builds the database setup files for one client from clients/<slug>/client.json.
//
//   node scripts/new-client.mjs <slug>           write clients/<slug>/setup.sql and first-admin.sql
//   node scripts/new-client.mjs <slug> --init    copy clients/_template to clients/<slug> first
//
// setup.sql is one transaction for a brand-new, empty Supabase project:
// every migration in order, the industry template, the company details,
// and a clean activity log. It refuses to run on a database that already
// has items or documents. first-admin.sql links the first sign-in account
// (created in the Supabase dashboard) to an admin profile.
//
// Nothing here connects to any database. Paste the files into the new
// project's SQL Editor, or run them with psql (docs/product/NEW_CLIENT_SETUP.md).

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [slug, ...flags] = process.argv.slice(2);

function die(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (!slug || slug.startsWith("-")) {
  die("Give the client's folder name, for example:\n  node scripts/new-client.mjs khan-cartons --init");
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug === "_template") {
  die(`"${slug}" is not a usable folder name. Use lowercase letters, numbers and hyphens, for example khan-cartons.`);
}

// CLIENTS_DIR lets the template tests write to a scratch folder.
const clientsDir = process.env.CLIENTS_DIR || join(root, "clients");
const dir = join(clientsDir, slug);
const configPath = join(dir, "client.json");

if (flags.includes("--init")) {
  if (existsSync(dir)) die(`clients/${slug} already exists. Edit its client.json, then run without --init.`);
  mkdirSync(dir, { recursive: true });
  cpSync(join(root, "clients", "_template"), dir, { recursive: true });
  const cfg = JSON.parse(readFileSync(configPath, "utf8"));
  cfg.slug = slug;
  writeFileSync(configPath, JSON.stringify(cfg, null, 2) + "\n");
  console.log(`Created clients/${slug}. Fill in client.json and CLIENT.md, then run:\n  node scripts/new-client.mjs ${slug}`);
  process.exit(0);
}

if (!existsSync(configPath)) die(`No clients/${slug}/client.json. Start the folder with:\n  node scripts/new-client.mjs ${slug} --init`);

const cfg = JSON.parse(readFileSync(configPath, "utf8"));
if (cfg.migrationsApplied && cfg.migrationsApplied !== "none" && !flags.includes("--force")) {
  die(`clients/${slug} is already set up (migrationsApplied: ${cfg.migrationsApplied}). setup.sql is only for a new, empty database.\nTo bring this client up to date, follow docs/product/UPDATING_CLIENTS.md instead.`);
}
const templates = readdirSync(join(root, "supabase", "templates"))
  .filter((f) => f.endsWith(".sql") && !f.startsWith("_"))
  .map((f) => f.replace(/\.sql$/, ""));

if (!templates.includes(cfg.template)) {
  die(`client.json "template" is "${cfg.template ?? ""}". Pick one of: ${templates.join(", ")}.`);
}
const co = cfg.company ?? {};
if (!co.company_name || co.company_name.startsWith("<")) die('Fill in company.company_name in client.json.');
const admin = cfg.firstAdmin ?? {};
if (!admin.email || !admin.full_name || admin.email.startsWith("<")) die("Fill in firstAdmin.full_name and firstAdmin.email in client.json.");

const q = (v) => `'${String(v ?? "").replace(/'/g, "''")}'`;
const textFields = [
  "company_name", "short_name", "tagline", "address", "phone", "email", "ntn", "strn", "logo_url",
  "invoice_prefix", "purchase_prefix", "production_prefix", "invoice_terms", "invoice_footer",
];
const sets = [];
for (const f of textFields) {
  if (co[f] !== undefined && co[f] !== null && !(f === "short_name" && co[f] === "")) sets.push(`  ${f} = ${q(co[f])}`);
}
if (co.short_name === undefined || co.short_name === "") sets.push(`  short_name = ${q(co.company_name)}`);
if (typeof co.gst_enabled === "boolean") sets.push(`  gst_enabled = ${co.gst_enabled}`);
if (co.gst_rate !== undefined) {
  const r = Number(co.gst_rate);
  if (!Number.isFinite(r) || r < 0 || r > 100) die("company.gst_rate must be a number from 0 to 100.");
  sets.push(`  gst_rate = ${r}`);
}

const migrationsDir = join(root, "supabase", "migrations");
const migrations = readdirSync(migrationsDir).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
const latest = migrations.at(-1).slice(0, 4);
const read = (...p) => readFileSync(join(root, ...p), "utf8").trimEnd();

const parts = [
  `-- Setup for ${co.company_name} (clients/${slug}), built ${new Date().toISOString().slice(0, 10)}`,
  `-- by scripts/new-client.mjs. Template: ${cfg.template}. Migrations 0001 to ${latest}.`,
  "-- Run ONCE on the client's new, empty Supabase project (SQL Editor or psql).",
  "-- It is one transaction: if any step fails, nothing is kept.",
  "",
  "begin;",
  "",
  ...migrations.flatMap((m) => [`-- ===== migration ${m} =====`, read("supabase", "migrations", m), ""]),
  "-- ===== industry template =====",
  read("supabase", "templates", "_reset.sql"),
  "",
  read("supabase", "templates", `${cfg.template}.sql`),
  "",
  "-- ===== company and invoice details =====",
  `update public.settings set\n${sets.join(",\n")},\n  updated_at = now()\nwhere id = 1;`,
  "",
  "-- The setup steps above are not the client's history; start the log clean.",
  "truncate public.activity_log;",
  "",
  "commit;",
  "",
  "-- Check: expect the company name, the template and the item counts.",
  "select s.company_name, s.short_name, s.industry_template,",
  "  (select count(*) from public.item_categories) as categories,",
  "  (select count(*) from public.units) as units,",
  "  (select count(*) from public.items) as starter_items",
  "from public.settings s;",
  "",
];
writeFileSync(join(dir, "setup.sql"), parts.join("\n"));

const firstAdmin = `-- First admin for ${co.company_name}. Run AFTER creating the sign-in account
-- in Supabase: Authentication > Users > Add user > Create new user, with the
-- email ${admin.email} and a password, and "Auto confirm user" ticked.

insert into public.profiles (id, full_name, role)
select id, ${q(admin.full_name)}, 'admin'
from auth.users
where lower(email) = lower(${q(admin.email)})
on conflict (id) do update set role = 'admin', active = true;

-- Check: expect one row, role admin. No row means the email above does not
-- match the account created in Authentication.
select p.full_name, p.role, p.active, u.email
from public.profiles p join auth.users u on u.id = p.id
where lower(u.email) = lower(${q(admin.email)});
`;
writeFileSync(join(dir, "first-admin.sql"), firstAdmin);

console.log(`Wrote clients/${slug}/setup.sql (migrations 0001 to ${latest}, template ${cfg.template})`);
console.log(`Wrote clients/${slug}/first-admin.sql (${admin.email})`);
console.log("Next: docs/product/NEW_CLIENT_SETUP.md, step 4.");
