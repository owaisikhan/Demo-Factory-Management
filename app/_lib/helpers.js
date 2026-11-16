import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEMO_COOKIE, demoSignedIn } from "./demo-auth";
import { createClient } from "./supabase-server";
import { isDemoMode, ROLES } from "./config";
import { demoProfiles } from "./demo-data";
import { LOCAL_USER } from "./local-db/engine";
import { can } from "./permissions";

export { ROLES, can };

/**
 * The signed-in user's profile ({ id, full_name, role, permissions, email }), or null.
 * Cached per request so the layout and the page share one lookup.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();

  // Local mode: the demo account, from the visitor's own database.
  // DEMO_ROLE=worker shows it as the first worker sees it (sample data has
  // workers); DEMO_ROLE=demo-w2 picks that sample worker (fewer permissions).
  if (isDemoMode) {
    if (!(await demoSignedIn((await cookies()).get(DEMO_COOKIE)?.value))) return null;
    const pick = process.env.DEMO_ROLE;
    let query = supabase.from("profiles").select("id, full_name, role, active, permissions").eq("active", true);
    if (pick === "worker") query = query.eq("role", "worker");
    else if (pick && pick !== "admin") query = query.eq("full_name", demoProfiles.find((p) => p.id === pick)?.full_name ?? "");
    else query = query.eq("id", LOCAL_USER.id);
    const { data } = await query.order("created_at").limit(1);
    const own = data?.[0] ?? (await supabase.from("profiles").select("id, full_name, role, active, permissions").eq("id", LOCAL_USER.id).maybeSingle()).data;
    return own ? { ...own, email: own.id === LOCAL_USER.id ? LOCAL_USER.email : "" } : null;
  }

  const { data: claimsData, error } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (error || !claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, active, permissions")
    .eq("id", claims.sub)
    .maybeSingle();

  if (!profile || !profile.active) return null;
  return { ...profile, email: claims.email ?? "" };
});

/** For pages: send signed-out people to the login page, workers away from admin pages. */
export async function requirePageRole(role) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role === ROLES.ADMIN && user.role !== ROLES.ADMIN) redirect("/admin?denied=1");
  return user;
}

/** For Server Actions: throws a readable error instead of redirecting. */
export async function requireRole(role) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Your session has ended. Sign in again.");
  if (role === ROLES.ADMIN && user.role !== ROLES.ADMIN) {
    throw new Error("Only an admin can do this. Ask an admin to do it for you.");
  }
  return user;
}

/** For pages a worker may or may not have been given: redirect if not. */
export async function requirePagePermission(key) {
  const user = await requirePageRole();
  if (!can(user, key)) redirect("/admin?denied=1");
  return user;
}

/** For Server Actions: throws a readable error when the permission is missing. */
export async function requirePermission(key, what) {
  const user = await requireRole();
  if (!can(user, key)) {
    throw new Error(`You do not have permission to ${what}. Ask an admin to give you this permission in Users.`);
  }
  return user;
}
