-- Public account model: Operator (administrative control) and Tech (field access only).
-- Legacy enum labels remain solely for PostgreSQL compatibility with earlier migrations.
alter type public.app_role add value if not exists 'Tech';

update public.profiles
set system_role = 'Operator', updated_at = now()
where system_role::text in ('Manager', 'Administrator');

-- Operators receive all-site operational privileges. The legacy membership value is
-- an internal compatibility detail required by the v1 command function's approval checks.
insert into public.site_memberships (site_id, user_id, role, active)
select site.id, profile.id, 'Manager'::public.app_role, profile.active
from public.sites site
cross join public.profiles profile
where site.active and profile.system_role::text = 'Operator'
on conflict (site_id, user_id) do update
set role = 'Manager'::public.app_role,
    active = excluded.active,
    updated_at = now();

delete from public.site_memberships membership
using public.profiles profile
where membership.user_id = profile.id
  and profile.system_role::text = 'Tech';

create or replace function private.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select profile.active and profile.system_role::text = 'Operator'
     from public.profiles profile
     where profile.id = (select auth.uid())),
    false
  );
$$;

create or replace function public.admin_configure_profile_v1(
  p_user_id uuid,
  p_display_name text,
  p_active boolean,
  p_role public.app_role,
  p_site_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_operator public.profiles%rowtype;
  target public.profiles%rowtype;
begin
  select * into acting_operator from public.profiles where id = auth.uid();
  if acting_operator.id is null or not acting_operator.active or acting_operator.system_role::text <> 'Operator' then
    raise exception 'Operator permission is required.' using errcode = '42501';
  end if;
  if p_role::text not in ('Operator', 'Tech') then
    raise exception 'Account type must be Operator or Tech.' using errcode = '23514';
  end if;

  select * into target from public.profiles where id = p_user_id for update;
  if target.id is null then raise exception 'User profile not found.' using errcode = 'P0002'; end if;
  if btrim(p_display_name) = '' then raise exception 'Display name is required.' using errcode = '23514'; end if;
  if p_user_id = auth.uid() and (not p_active or p_role::text <> 'Operator') then
    raise exception 'You cannot remove your own Operator access.' using errcode = '23514';
  end if;

  update public.profiles
  set display_name = btrim(p_display_name), active = p_active,
      system_role = p_role, updated_at = now()
  where id = p_user_id;

  delete from public.site_memberships where user_id = p_user_id;
  if p_role::text = 'Operator' then
    insert into public.site_memberships (site_id, user_id, role, active)
    select site.id, p_user_id, 'Manager'::public.app_role, p_active
    from public.sites site where site.active;
  end if;

  insert into public.audit_records (
    site_id, actor_user_id, actor_name, action, entity_type, entity_id,
    before_state, after_state
  ) values (
    null, auth.uid(), acting_operator.display_name, 'profile.configure', 'Profile', p_user_id,
    jsonb_build_object('displayName', target.display_name, 'active', target.active, 'role', target.system_role),
    jsonb_build_object('displayName', btrim(p_display_name), 'active', p_active, 'role', p_role)
  );

  return jsonb_build_object('userId', p_user_id, 'active', p_active, 'role', p_role);
end;
$$;

revoke all on function public.admin_configure_profile_v1(uuid, text, boolean, public.app_role, uuid) from public, anon;
grant execute on function public.admin_configure_profile_v1(uuid, text, boolean, public.app_role, uuid) to authenticated;

