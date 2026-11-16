/** @type {import('next').NextConfig} */
const nextConfig = {
  // Local (demo) mode runs Postgres as WebAssembly on the server (app/_lib/local-db).
  // PGlite loads its .wasm and data files from its own folder, and the engine
  // reads the migrations at start-up, so both ship with the server code.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/**": ["./supabase/migrations/*.sql", "./supabase/tests/00_supabase_stub.sql", "./node_modules/@electric-sql/pglite/dist/**"],
  },
};

export default nextConfig;
