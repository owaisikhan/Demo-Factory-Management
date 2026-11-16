// Sign-in for the public demo (demo mode only: no database, sample data).
// One shared account, so a demo link can be handed out without opening the
// app to anyone who finds the address. Defaults: test@gmail.com / 12341234;
// a deployment can change them with DEMO_LOGIN_EMAIL and DEMO_LOGIN_PASSWORD,
// or switch the sign-in off with DEMO_LOGIN=off.
//
// After a correct sign-in the browser keeps a cookie for 30 days, so the
// visitor stays signed in. Changing the email or password signs everyone out.
// This guards a demo of sample data, not real records: client sites use
// Supabase sign-in and never reach this file's checks.

import { isDemoMode } from "./config";

export const DEMO_COOKIE = "factory_demo_session";
export const DEMO_COOKIE_DAYS = 30;

export function demoLogin() {
  if (!isDemoMode || process.env.DEMO_LOGIN === "off") return null;
  return {
    email: (process.env.DEMO_LOGIN_EMAIL || "test@gmail.com").trim().toLowerCase(),
    password: process.env.DEMO_LOGIN_PASSWORD || "12341234",
  };
}

// Web Crypto, so it runs in the proxy and in server code alike
export async function demoToken(login) {
  const bytes = new TextEncoder().encode(`${login.email}:${login.password}:factory-demo`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** True when the demo needs no sign-in, or the cookie matches the account. */
export async function demoSignedIn(cookieValue) {
  const login = demoLogin();
  if (!login) return true;
  return Boolean(cookieValue) && cookieValue === (await demoToken(login));
}
