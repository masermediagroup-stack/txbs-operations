-- Fresh validation targets only. The caller must bind this to the approved new
-- project. This does not identify a project and must never target the held one.
-- Keep these checks and the schema restore in the same migration transaction.
do $$
begin
  if current_user <> 'postgres'
     or current_setting('server_version_num')::integer not between 170005 and 179999 then
    raise exception 'Expected the reviewed PostgreSQL 17 validation target and postgres role.';
  end if;
  if to_regnamespace('private') is not null
     or exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                where n.nspname='public' and c.relkind in ('r','v','m','S'))
     or exists (select 1 from pg_proc where pronamespace='public'::regnamespace)
     or exists (select 1 from pg_type where typnamespace='public'::regnamespace and typtype='e') then
    raise exception 'Validation bootstrap requires an empty application catalog.';
  end if;
  if exists(select 1 from auth.users) or exists(select 1 from auth.identities)
     or exists(select 1 from auth.sessions) or exists(select 1 from storage.objects)
     or exists(select 1 from storage.buckets) then
    raise exception 'Validation bootstrap requires empty Auth and Storage records.';
  end if;
  if not (select relrowsecurity from pg_class where oid='storage.objects'::regclass)
     or exists(select 1 from pg_policy where polrelid='storage.objects'::regclass)
     or exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass
               and not tgisinternal and tgname='on_auth_user_created') then
    raise exception 'Unexpected platform RLS, policies or application signup trigger.';
  end if;
end;
$$;

-- Supabase may grant broad defaults to these roles. Remove only postgres-owned
-- public-schema defaults; the dump restores explicit application grants below.
-- Managed schemas and their owners/default privileges remain untouched.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
