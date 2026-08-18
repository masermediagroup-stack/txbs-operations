-- Keep Operator access site-membership based while giving Tech accounts only the
-- read models required by My Work: sites, locations, project/material inventory,
-- and outbound context. Tech accounts receive no receiving, movement, issue,
-- photo, verification, activity, audit, storage-object, or command access.

create or replace function private.has_site_access(
  target_site_id uuid,
  allowed_roles public.app_role[] default array['Operator', 'Manager', 'Administrator']::public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (
      private.is_administrator()
      or exists (
        select 1
        from public.site_memberships membership
        join public.profiles profile on profile.id = membership.user_id
        where membership.user_id = (select auth.uid())
          and membership.site_id = target_site_id
          and membership.active
          and profile.active
          and membership.role = any(allowed_roles)
      )
    );
$$;

create or replace function private.has_tech_read_access(target_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.profiles profile
      join public.sites site on site.id = target_site_id
      where profile.id = (select auth.uid())
        and profile.active
        and profile.system_role = 'Tech'::public.app_role
        and site.active
    );
$$;

revoke all on function private.has_tech_read_access(uuid) from public, anon, authenticated;
grant execute on function private.has_tech_read_access(uuid) to authenticated;

create policy sites_tech_select on public.sites for select to authenticated
using (private.has_tech_read_access(id));

create policy locations_tech_select on public.storage_locations for select to authenticated
using (private.has_tech_read_access(site_id));

create policy projects_tech_select on public.projects for select to authenticated
using (private.has_tech_read_access(site_id));

create policy groups_tech_select on public.material_groups for select to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = material_groups.project_id
      and private.has_tech_read_access(project.site_id)
  )
);

create policy lots_tech_select on public.material_lots for select to authenticated
using (private.has_tech_read_access(site_id));

create policy outbound_batches_tech_select on public.outbound_batches for select to authenticated
using (private.has_tech_read_access(site_id));

create policy outbound_lines_tech_select on public.outbound_lines for select to authenticated
using (
  exists (
    select 1
    from public.outbound_batches batch
    where batch.id = outbound_lines.batch_id
      and private.has_tech_read_access(batch.site_id)
  )
);
