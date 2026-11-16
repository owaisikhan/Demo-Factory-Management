import "server-only";
import { databaseFor, LOCAL_USER } from "./engine";
import { appendOp, checkRoom, claimLog, readLog } from "./oplog";

// A stand-in for the Supabase client in local mode: the same calls
// data-service.js and actions.js already make (from/select/eq/order/range,
// insert/update/delete, rpc, and the Users page's auth.admin calls), run
// against the visitor's own PGlite database. Results come back in the shape
// PostgREST gives: { data, error, count }, numbers as numbers, dates and
// times as strings, embedded rows as objects or arrays.
//
// Every change that succeeds is stored in the visitor's browser (oplog.js),
// so their database can be rebuilt on any server.

const WRITE_RPCS = new Set([
  "adjust_stock", "save_recipe",
  "post_purchase", "void_purchase", "record_supplier_payment", "void_supplier_payment",
  "post_production", "void_production",
  "post_sale", "void_sale", "record_customer_payment", "void_customer_payment",
]);
const SKIP_RPCS = new Set(["log_event"]); // sign-in and sign-out entries: not in local mode

const IDENT = /^[a-z_][a-z0-9_]*$/;
function ident(name) {
  if (!IDENT.test(name)) throw new Error(`Unsupported name "${name}" in a local query.`);
  return `"${name}"`;
}

// Postgres type ids, for PostgREST-like values
const NUMERIC = 1700, INT8 = 20, DATE = 1082, TIMESTAMPTZ = 1184, TIMESTAMP = 1114;
const isoTime = (v) => {
  let s = v.replace(" ", "T");
  if (/[+-]\d\d$/.test(s)) s += ":00";
  return s;
};
export const PARSERS = {
  [NUMERIC]: (v) => Number(v),
  [INT8]: (v) => Number(v),
  [DATE]: (v) => v,
  [TIMESTAMPTZ]: (v) => isoTime(v),
  [TIMESTAMP]: (v) => isoTime(v),
};
const Q = (db, sql, params) => db.query(sql, params, { parsers: PARSERS });

// ---- foreign keys, for embedded selects like items(name, units(short_name)) ----
const fkCache = new WeakMap();
async function foreignKeys(db) {
  if (fkCache.has(db)) return fkCache.get(db);
  const { rows } = await Q(db, `
    select src.relname as src, a.attname as src_col, dst.relname as dst, b.attname as dst_col
    from pg_constraint c
    join pg_class src on src.oid = c.conrelid
    join pg_class dst on dst.oid = c.confrelid
    join pg_namespace n on n.oid = src.relnamespace and n.nspname = 'public'
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_attribute b on b.attrelid = c.confrelid and b.attnum = c.confkey[1]
    where c.contype = 'f' and array_length(c.conkey, 1) = 1`);
  fkCache.set(db, rows);
  return rows;
}

// "id, name, items(name, units(short_name))" -> [{ col }, { embed, cols }]
function parseSelect(str) {
  const out = [];
  let depth = 0, cur = "";
  const push = () => {
    const t = cur.trim();
    cur = "";
    if (!t) return;
    const m = t.match(/^([a-z_][a-z0-9_]*)\((.*)\)$/s);
    if (m) out.push({ embed: m[1], cols: parseSelect(m[2]) });
    else out.push({ col: t });
  };
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) push();
    else cur += ch;
  }
  push();
  return out;
}

let aliasN = 0;
async function selectList(db, table, alias, cols, asJson) {
  const fks = await foreignKeys(db);
  const parts = [];
  for (const c of cols) {
    if (c.col) {
      if (c.col === "*") parts.push(asJson ? { star: true } : { sql: `${alias}.*` });
      else parts.push({ key: c.col, sql: `${alias}.${ident(c.col)}` });
      continue;
    }
    const child = `e${++aliasN}`;
    const inner = await selectList(db, c.embed, child, c.cols, true);
    const one = fks.find((f) => f.src === table && f.dst === c.embed);
    const many = fks.find((f) => f.src === c.embed && f.dst === table);
    let sql;
    if (one) {
      sql = `(select ${inner} from public.${ident(c.embed)} ${child} where ${child}.${ident(one.dst_col)} = ${alias}.${ident(one.src_col)})`;
    } else if (many) {
      sql = `coalesce((select jsonb_agg(${inner}) from public.${ident(c.embed)} ${child} where ${child}.${ident(many.src_col)} = ${alias}.${ident(many.dst_col)}), '[]'::jsonb)`;
    } else {
      throw new Error(`No link between ${table} and ${c.embed}.`);
    }
    parts.push({ key: c.embed, sql });
  }
  if (!asJson) return parts.map((p) => (p.key ? `${p.sql} as ${ident(p.key)}` : p.sql)).join(", ");
  const obj = parts.filter((p) => p.key).map((p) => `'${p.key}', ${p.sql}`).join(", ");
  const star = parts.some((p) => p.star) ? `to_jsonb(${alias})` : null;
  if (star && obj) return `(${star} || jsonb_build_object(${obj}))`;
  return star ?? `jsonb_build_object(${obj})`;
}

const OPS = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike" };

function whereSql(filters, params, alias) {
  const one = (f) => {
    const col = `${alias}.${ident(f.col)}`;
    if (f.op === "in") {
      params.push(f.value);
      return `${col} = any($${params.length})`;
    }
    if (f.op === "is") return `${col} is ${f.value === null ? "null" : f.value ? "true" : "false"}`;
    if (!OPS[f.op]) throw new Error(`Unsupported filter "${f.op}" in a local query.`);
    params.push(f.value);
    return `${col} ${OPS[f.op]} $${params.length}`;
  };
  const parts = filters.map((f) => (f.or ? `(${f.or.map(one).join(" or ")})` : one(f)));
  return parts.length ? ` where ${parts.join(" and ")}` : "";
}

// "name.ilike.%x%,code.ilike.%x%" -> [{ col, op, value }]
function parseOr(str) {
  return str.split(",").map((part) => {
    const [col, op, ...rest] = part.split(".");
    return { col, op, value: rest.join(".") };
  });
}

/** Runs one stored query plan: a select, insert, update or delete. */
async function runPlan(db, plan) {
  const params = [];
  const t = `public.${ident(plan.table)}`;
  if (plan.action === "select") {
    const where = whereSql(plan.filters, params, "t");
    let count = null;
    if (plan.count) {
      const r = await Q(db, `select count(*)::int as n from ${t} t${where}`, params);
      count = r.rows[0].n;
      if (plan.head) return { data: null, count };
    }
    const cols = await selectList(db, plan.table, "t", parseSelect(plan.columns || "*"), false);
    const order = plan.order.length
      ? ` order by ${plan.order.map((o) => `t.${ident(o.col)} ${o.asc ? "asc" : "desc"} ${o.nullsFirst ? "nulls first" : o.asc ? "nulls last" : "nulls first"}`).join(", ")}`
      : "";
    const lim = plan.range ? ` limit ${plan.range[1] - plan.range[0] + 1} offset ${plan.range[0]}` : plan.limit ? ` limit ${plan.limit}` : "";
    const r = await Q(db, `select ${cols} from ${t} t${where}${order}${lim}`, params);
    return { data: r.rows, count };
  }
  // Writes use the same alias "t" as reads: insert/update/delete ... as t
  const returning = plan.returning !== undefined ? await selectList(db, plan.table, "t", parseSelect(plan.returning || "*"), false) : null;
  const ret = returning ? ` returning ${returning}` : "";
  if (plan.action === "insert") {
    const rows = Array.isArray(plan.values) ? plan.values : [plan.values];
    const keys = Object.keys(rows[0]);
    const tuples = rows.map((row) => `(${keys.map((k) => { params.push(row[k]); return `$${params.length}`; }).join(", ")})`);
    const r = await Q(db, `insert into ${t} as t (${keys.map(ident).join(", ")}) values ${tuples.join(", ")}${ret}`, params);
    return { data: returning ? r.rows : null, count: null };
  }
  if (plan.action === "update") {
    const sets = Object.entries(plan.values).map(([k, v]) => { params.push(v); return `${ident(k)} = $${params.length}`; });
    const where = whereSql(plan.filters, params, "t");
    const r = await Q(db, `update ${t} as t set ${sets.join(", ")}${where}${ret}`, params);
    return { data: returning ? r.rows : null, count: null };
  }
  if (plan.action === "delete") {
    const where = whereSql(plan.filters, params, "t");
    const r = await Q(db, `delete from ${t} as t${where}${ret}`, params);
    return { data: returning ? r.rows : null, count: null };
  }
  throw new Error(`Unknown local action ${plan.action}.`);
}

const fnCache = new WeakMap();
async function callRpc(db, name, args = {}) {
  ident(name);
  let fns = fnCache.get(db);
  if (!fns) fnCache.set(db, (fns = new Map()));
  if (!fns.has(name)) {
    const r = await Q(db, `select p.proretset as set, t.typtype as kind from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public' join pg_type t on t.oid = p.prorettype where p.proname = $1 limit 1`, [name]);
    if (!r.rows.length) throw Object.assign(new Error(`Could not find the function public.${name}.`), { code: "PGRST202" });
    fns.set(name, r.rows[0]);
  }
  const { set, kind } = fns.get(name);
  const params = [];
  const named = Object.entries(args).map(([k, v]) => {
    params.push(v !== null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : Array.isArray(v) && typeof v[0] === "object" ? JSON.stringify(v) : v);
    return `${ident(k)} => $${params.length}`;
  });
  const call = `public.${ident(name)}(${named.join(", ")})`;
  if (set || kind === "c") {
    const r = await Q(db, `select * from ${call}`, params);
    return set ? r.rows : r.rows[0] ?? null;
  }
  const r = await Q(db, `select ${call} as v`, params);
  return r.rows[0]?.v ?? null;
}

// ---- replaying a stored entry ------------------------------------------
async function atMoment(db, at, fn) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('local.now', $1, true)", [at || ""]);
    return fn(tx);
  });
}

export async function replay(db, op) {
  try {
    if (op.k === "plan") await atMoment(db, op.at, (tx) => runPlan(tx, op.plan));
    else if (op.k === "rpc") await atMoment(db, op.at, (tx) => callRpc(tx, op.n, op.a));
    else if (op.k === "auth") await authOp(db, op);
  } catch {
    // An entry that no longer applies (it was refused on the way in, or
    // the starting data changed) is skipped, so the rest still loads.
  }
}

async function authOp(db, op) {
  await db.exec("reset role;");
  try {
    if (op.kind === "create") {
      const r = await Q(db, "insert into auth.users (id, email) values (public.local_uuid(), $1) returning id", [op.email]);
      return r.rows[0];
    }
    if (op.kind === "delete") await Q(db, "delete from auth.users where id = $1", [op.id]);
    return null;
  } finally {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${LOCAL_USER.id}', false);`);
  }
}

// ---- the client -------------------------------------------------------
// Visitors who have saved nothing share one read-only copy per starting
// point; their first change gives them their own id and their own copy.
async function visitorDb(forWrite = false) {
  let log = await readLog();
  if (forWrite && !log.id) log = await claimLog();
  const key = log.id ?? `shared:${log.base}`;
  const entry = await databaseFor({ ...log, id: key }, replay);
  return { entry, log };
}

async function runWrite(op, run) {
  try {
    await checkRoom(op);
  } catch (e) {
    return { __error: e };
  }
  const { entry } = await visitorDb(true);
  try {
    const result = await atMoment(entry.db, op.at, run);
    await appendOp(op); // only entries that succeeded are kept
    entry.applied.push(JSON.stringify(op));
    return result;
  } catch (e) {
    return { __error: e };
  }
}

const asError = (e) => ({ message: e.message, code: e.code ?? null, details: e.detail ?? null });

class Query {
  constructor(table) {
    this.plan = { table, action: "select", columns: "*", filters: [], order: [], range: null, limit: null, count: false, head: false };
  }
  select(columns = "*", opts = {}) {
    if (this.plan.action === "select") {
      this.plan.columns = columns;
      if (opts.count) this.plan.count = true;
      if (opts.head) this.plan.head = true;
    } else this.plan.returning = columns;
    return this;
  }
  insert(values) { Object.assign(this.plan, { action: "insert", values }); return this; }
  update(values) { Object.assign(this.plan, { action: "update", values }); return this; }
  delete() { this.plan.action = "delete"; return this; }
  filter(col, op, value) { this.plan.filters.push({ col, op, value }); return this; }
  eq(c, v) { return this.filter(c, "eq", v); }
  neq(c, v) { return this.filter(c, "neq", v); }
  gt(c, v) { return this.filter(c, "gt", v); }
  gte(c, v) { return this.filter(c, "gte", v); }
  lt(c, v) { return this.filter(c, "lt", v); }
  lte(c, v) { return this.filter(c, "lte", v); }
  like(c, v) { return this.filter(c, "like", v); }
  ilike(c, v) { return this.filter(c, "ilike", v); }
  in(c, v) { return this.filter(c, "in", v); }
  is(c, v) { return this.filter(c, "is", v); }
  or(str) { this.plan.filters.push({ or: parseOr(str) }); return this; }
  order(col, { ascending = true, nullsFirst } = {}) { this.plan.order.push({ col, asc: ascending, nullsFirst: nullsFirst ?? !ascending }); return this; }
  range(a, b) { this.plan.range = [a, b]; return this; }
  limit(n) { this.plan.limit = n; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }

  async run() {
    let res;
    if (this.plan.action === "select") {
      try {
        const { entry } = await visitorDb();
        res = await runPlan(entry.db, this.plan);
      } catch (e) {
        return { data: null, error: asError(e), count: null };
      }
    } else {
      const op = { k: "plan", plan: this.plan, at: new Date().toISOString() };
      res = await runWrite(op, (tx) => runPlan(tx, this.plan));
      if (res.__error) return { data: null, error: asError(res.__error), count: null };
    }
    let data = res.data;
    if (this.one && Array.isArray(data)) {
      if (data.length > 1) return { data: null, error: { message: "More than one row returned.", code: "PGRST116" }, count: res.count };
      if (!data.length && this.one === "single") return { data: null, error: { message: "No row returned.", code: "PGRST116" }, count: res.count };
      data = data[0] ?? null;
    }
    return { data, error: null, count: res.count };
  }
  then(resolve, reject) { return this.run().then(resolve, reject); }
}

export function createLocalClient() {
  return {
    from: (table) => new Query(table),
    async rpc(name, args = {}) {
      if (SKIP_RPCS.has(name)) return { data: null, error: null };
      if (WRITE_RPCS.has(name)) {
        const op = { k: "rpc", n: name, a: args, at: new Date().toISOString() };
        const r = await runWrite(op, (tx) => callRpc(tx, name, args));
        return r && r.__error ? { data: null, error: asError(r.__error) } : { data: r, error: null };
      }
      try {
        const { entry } = await visitorDb();
        return { data: await callRpc(entry.db, name, args), error: null };
      } catch (e) {
        return { data: null, error: asError(e) };
      }
    },
  };
}

/** Stand-in for the service-role client: sign-in accounts on the Users page. */
export function createLocalAdminClient() {
  // Accounts live in auth.users, which only the database owner may change,
  // so these run outside the visitor's role (authOp) and are stored like any entry.
  const apply = async (op) => {
    try {
      await checkRoom(op);
    } catch (e) {
      return { user: null, error: asError(e) };
    }
    const { entry } = await visitorDb(true);
    try {
      const user = await authOp(entry.db, op);
      await appendOp(op);
      entry.applied.push(JSON.stringify(op));
      return { user, error: null };
    } catch (e) {
      return { user: null, error: asError(e) };
    }
  };
  return {
    auth: {
      admin: {
        async createUser({ email }) {
          const op = { k: "auth", kind: "create", email: String(email).toLowerCase(), at: new Date().toISOString() };
          const { entry } = await visitorDb();
          const exists = await Q(entry.db, "select 1 from auth.users where lower(email) = $1", [op.email]);
          if (exists.rows.length) return { data: null, error: { message: "A user with this email address has already been registered" } };
          const { user, error } = await apply(op);
          return error ? { data: null, error } : { data: { user }, error: null };
        },
        async updateUserById() {
          return { data: {}, error: null }; // passwords do not apply in the browser demo
        },
        async deleteUser(id) {
          const { error } = await apply({ k: "auth", kind: "delete", id, at: new Date().toISOString() });
          return { data: error ? null : {}, error };
        },
      },
    },
  };
}
