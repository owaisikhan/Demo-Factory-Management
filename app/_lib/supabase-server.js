import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isDemoMode } from "./config";
import { createLocalClient } from "./local-db/client";

// Server client bound to the request's session, so RLS sees the real user.
// In local mode (config.js) the visitor's own database answers instead.
export async function createClient() {
  if (isDemoMode) return createLocalClient();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, which cannot write cookies.
            // proxy.js refreshes the session instead; this is the documented pattern.
          }
        },
      },
    },
  );
}
