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
  administrator public.profiles%rowtype;
  target public.profiles%rowtype;
begin
  select * into administrator from public.profiles where id = auth.uid();
  if administrator.id is null or not administrator.active or administrator.system_role <> 'Administrator' then
    raise exception 'Administrator permission is required.' using errcode = '42501';
  end if;

  select * into target from public.profiles where id = p_user_id for update;
  if target.id is null then raise exception 'User profile not found.' using errcode = 'P0002'; end if;
  if btrim(p_display_name) = '' then raise exception 'Display name is required.' using errcode = '23514'; end if;
  if p_user_id = auth.uid() and not p_active then raise exception 'You cannot deactivate your own administrator account.' using errcode = '23514'; end if;

  if p_role = 'Administrator' then
    update public.profiles set display_name = btrim(p_display_name), active = p_active,
      system_role = 'Administrator', updated_at = now() where id = p_user_id;
    delete from public.site_memberships where user_id = p_user_id;
  else
    if p_site_id is null or not exists (select 1 from public.sites where id = p_site_id and active) then
      raise exception 'An active site is required for Operator and Manager accounts.' using errcode = '23514';
    end if;
    update public.profiles set display_name = btrim(p_display_name), active = p_active,
      system_role = 'Operator', updated_at = now() where id = p_user_id;
    insert into public.site_memberships (site_id, user_id, role, active)
    values (p_site_id, p_user_id, p_role, p_active)
    on conflict (site_id, user_id) do update set role = excluded.role,
      active = excluded.active, updated_at = now();
    update public.site_memberships set active = false, updated_at = now()
    where user_id = p_user_id and site_id <> p_site_id;
  end if;

  insert into public.audit_records (
    site_id, actor_user_id, actor_name, action, entity_type, entity_id,
    before_state, after_state
  ) values (
    p_site_id, auth.uid(), administrator.display_name, 'profile.configure', 'Profile', p_user_id,
    jsonb_build_object('displayName', target.display_name, 'active', target.active, 'role', target.system_role),
    jsonb_build_object('displayName', btrim(p_display_name), 'active', p_active, 'role', p_role, 'siteId', p_site_id)
  );

  return jsonb_build_object('userId', p_user_id, 'active', p_active, 'role', p_role, 'siteId', p_site_id);
end;
$$;

revoke all on function public.admin_configure_profile_v1(uuid, text, boolean, public.app_role, uuid) from public, anon;
grant execute on function public.admin_configure_profile_v1(uuid, text, boolean, public.app_role, uuid) to authenticated;
