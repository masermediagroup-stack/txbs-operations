import { PGlite } from "@electric-sql/pglite"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"
import { readFileSync, readdirSync } from "node:fs"

/** Actual PostgreSQL engine; platform-owned auth/storage catalog is minimal test scaffolding. */
export async function createTestDatabase(engine = { PGlite, pgcrypto }) {
  const db = new engine.PGlite({ extensions: { pgcrypto: engine.pgcrypto } })
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id text, metadata jsonb, unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    grant all on storage.objects to authenticated;
  `)
  for (const name of readdirSync('supabase/migrations').filter((name) => name.endsWith('.sql')).sort()) {
    if (name === "20260818140000_replace_richardson_test_project_inventory.sql") {
      // Historical demo-data migration depends on two projects imported separately.
      // Keep this prerequisite explicit; it is not a schema-only fresh-install baseline.
      await db.exec(`insert into public.projects(id,site_id,slug,name,status,created_at,updated_at) values
        ('00000000-0000-4000-8000-000000001015','00000000-0000-4000-8000-000000000001','fixture-ramer','Fixture Ramer','Stored',now(),now()),
        ('00000000-0000-4000-8000-000000001017','00000000-0000-4000-8000-000000000001','fixture-plano','Fixture Plano','Stored',now(),now()) on conflict do nothing`)
    }
    try { await db.exec(readFileSync('supabase/migrations/' + name, 'utf8')) }
    catch (error) { await db.close(); throw new Error('Migration failed: ' + name, { cause: error }) }
  }
  return db
}
