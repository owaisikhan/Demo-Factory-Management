#!/usr/bin/env bash
# Builds a new-client setup.sql for every industry template with
# scripts/new-client.mjs, applies it to a throwaway local Postgres, links a
# first admin and prints what a new client would start with. Needs a local
# Postgres you can reach as the postgres user. Never point it at Supabase.
set -euo pipefail
cd "$(dirname "$0")/../.."
WORK=$(mktemp -d)
chmod 755 "$WORK"
trap 'rm -rf "$WORK"' EXIT
export CLIENTS_DIR="$WORK"

for path in supabase/templates/[a-z]*.sql; do
  t=$(basename "$path" .sql)
  slug="test-$t"
  DB="am_tpl_${t//-/_}"
  echo "=== template $t"
  node scripts/new-client.mjs "$slug" --init > /dev/null
  node -e '
    const fs = require("fs"); const p = process.argv[1]; const c = JSON.parse(fs.readFileSync(p, "utf8"));
    c.template = process.argv[2];
    c.company.company_name = "Test O'"'"'Brien Industries (Pvt) Ltd";
    c.company.short_name = "Test Co";
    c.firstAdmin = { full_name: "Owner Test", email: "owner@test.pk" };
    fs.writeFileSync(p, JSON.stringify(c, null, 2));
  ' "$WORK/$slug/client.json" "$t"
  node scripts/new-client.mjs "$slug" > /dev/null
  su postgres -c "dropdb --if-exists $DB; createdb $DB"
  su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB" < supabase/tests/00_supabase_stub.sql
  su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB" < "$WORK/$slug/setup.sql"
  su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -c \"insert into auth.users (email) values ('Owner@Test.pk')\""
  su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB" < "$WORK/$slug/first-admin.sql"
  su postgres -c "psql -q -d $DB -c \"select count(*) as activity_entries from activity_log\""
  su postgres -c "psql -q -d $DB -c \"select string_agg(label, ', ' order by width_mm, length_yd) as sizes from sizes\""
  su postgres -c "psql -q -d $DB -c \"select string_agg(name, ', ') as raw_categories from item_categories where kind = 'raw'\""
  echo "--- the template again on the same database (expect: refused when it has starter items)"
  cat supabase/templates/_reset.sql "$path" | su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB" 2>&1 | grep -E "ERROR|^DELETE" | head -2 || true
  su postgres -c "dropdb $DB"
done
