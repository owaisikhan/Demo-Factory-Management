import "server-only";
import { cookies } from "next/headers";
import { deflateRawSync, inflateRawSync } from "node:zlib";

// The visitor's entries, kept in their own browser: a small JSON log
// { v, id, base, ops } compressed into a few cookies. "base" is where their
// database starts ("empty" or "sample", the Fill with sample data button);
// "ops" are the changes they made since, replayed in order (client.js).
//
// Cookies, not localStorage, because the pages are built on the server and
// cookies are the part of the browser's storage that comes with each
// request. Room is capped at about 30 KB (several hundred entries); when it
// is full the app says so and Clear all starts again.

const PREFIX = "fdb_";
const CHUNK = 3800;
const MAX_CHUNKS = 8;
const DAYS = 180;
export const LOG_FULL_MESSAGE = "This browser's demo storage is full. Use Clear all at the top to start again.";

const perRequest = new WeakMap(); // cookie store -> { log }

function decode(store) {
  const n = Number(store.get(`${PREFIX}n`)?.value || 0);
  if (!n) return null;
  try {
    let s = "";
    for (let i = 0; i < n; i++) s += store.get(`${PREFIX}${i}`)?.value ?? "";
    const log = JSON.parse(inflateRawSync(Buffer.from(s, "base64url")).toString("utf8"));
    if (log?.v === 1 && Array.isArray(log.ops) && log.id) return log;
  } catch {
    // A damaged log starts over rather than breaking every page.
  }
  return null;
}

function encode(log) {
  return deflateRawSync(Buffer.from(JSON.stringify(log), "utf8"), { level: 9 }).toString("base64url");
}

async function state() {
  const store = await cookies();
  let s = perRequest.get(store);
  if (!s) {
    const saved = decode(store);
    s = { store, saved: Boolean(saved), log: saved ?? { v: 1, id: null, base: "empty", ops: [] } };
    perRequest.set(store, s);
  }
  return s;
}

/** The visitor's log. A visitor who has saved nothing yet has id null. */
export async function readLog() {
  return (await state()).log;
}

function write(s, log) {
  const data = encode(log);
  const chunks = Math.ceil(data.length / CHUNK);
  if (chunks > MAX_CHUNKS) throw Object.assign(new Error(LOG_FULL_MESSAGE), { code: "LOCAL_FULL" });
  const opts = { httpOnly: true, sameSite: "lax", path: "/", maxAge: DAYS * 86400, secure: process.env.VERCEL === "1" };
  const old = Number(s.store.get(`${PREFIX}n`)?.value || 0);
  for (let i = 0; i < chunks; i++) s.store.set(`${PREFIX}${i}`, data.slice(i * CHUNK, (i + 1) * CHUNK), opts);
  for (let i = chunks; i < Math.max(old, MAX_CHUNKS); i++) if (s.store.get(`${PREFIX}${i}`)) s.store.delete(`${PREFIX}${i}`);
  s.store.set(`${PREFIX}n`, String(chunks), opts);
  s.log = log;
  s.saved = true;
}

/** Gives a visitor their own id before their first change is stored. */
export async function claimLog() {
  const s = await state();
  if (!s.log.id) s.log = { ...s.log, id: crypto.randomUUID() };
  return s.log;
}

/** Throws LOG_FULL_MESSAGE when one more entry would not fit. */
export async function checkRoom(op) {
  const s = await state();
  const next = { ...s.log, ops: [...s.log.ops, op] };
  if (Math.ceil(encode(next).length / CHUNK) > MAX_CHUNKS) {
    throw Object.assign(new Error(LOG_FULL_MESSAGE), { code: "LOCAL_FULL" });
  }
}

export async function appendOp(op) {
  const s = await state();
  write(s, { ...s.log, id: s.log.id ?? crypto.randomUUID(), ops: [...s.log.ops, op] });
}

/** Fill with sample data / Clear all: a new starting point, no entries. */
export async function resetLog(base) {
  const s = await state();
  const old = s.log.id;
  write(s, { v: 1, id: crypto.randomUUID(), base, ops: [] });
  return old;
}
