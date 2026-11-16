// Local mode, also called demo mode: the browser-saved demo. The app runs on
// the visitor's own database (app/_lib/local-db/), started empty or filled
// with sample data from the bar at the top, and every entry is saved in that
// visitor's browser. All the usual rules apply. It is on when:
//   - no Supabase project is configured, or
//   - LOCAL_MODE=1 is set, or
//   - this deployment's address is listed below. A listed deployment keeps
//     its Supabase settings and data untouched; take it off the list to
//     reconnect it.
const LOCAL_DEPLOYMENTS = [
  "am-packaging-iota.vercel.app", // asked for on 2026-11-16: a demo with entries saved per browser
];

const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isDemoMode =
  !hasSupabase ||
  process.env.LOCAL_MODE === "1" ||
  LOCAL_DEPLOYMENTS.includes(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "");

export const ROLES = { ADMIN: "admin", WORKER: "worker" };
