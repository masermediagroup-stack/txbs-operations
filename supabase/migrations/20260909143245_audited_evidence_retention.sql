-- Retention is a privileged maintenance operation, separate from Operator business access.
create table private.evidence_retention_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  object_path text not null,
  approved_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (length(trim(reason)) >= 20),
  outcome text not null check (outcome in ('Requested', 'Deleted', 'Failed')),
  evidence jsonb not null,
  error_detail text,
  created_at timestamptz not null default now(),
  unique (request_id, outcome)
);
create unique index evidence_retention_final_event on private.evidence_retention_events(request_id) where outcome <> 'Requested';
alter table private.evidence_retention_events enable row level security;
revoke all on private.evidence_retention_events from public, anon, authenticated, service_role;

create function public.begin_evidence_retention(p_object_path text, p_approved_by uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_request_id uuid := gen_random_uuid(); v_evidence jsonb;
begin
  if length(trim(p_reason)) < 20 or not exists (select 1 from public.profiles where id=p_approved_by and active and system_role='Operator') then
    raise exception 'An active Operator approval and a specific retention reason are required.' using errcode='23514';
  end if;
  select jsonb_build_object('objectId',o.id,'metadata',o.metadata,
    'photoIds',(select coalesce(jsonb_agg(p.id),'[]'::jsonb) from public.photos p where p.object_path=o.name),
    'uploads',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'checksum',u.checksum_sha256,'size',u.size_bytes,'consumedAt',u.consumed_at)),'[]'::jsonb) from public.staged_uploads u where u.object_path=o.name))
  into v_evidence from storage.objects o where o.bucket_id='operational-media' and o.name=p_object_path;
  if v_evidence is null then raise exception 'Operational evidence object not found.' using errcode='23514'; end if;
  insert into private.evidence_retention_events(request_id,object_path,approved_by,reason,outcome,evidence)
  values(v_request_id,p_object_path,p_approved_by,trim(p_reason),'Requested',v_evidence);
  return v_request_id;
end;
$$;
revoke all on function public.begin_evidence_retention(text,uuid,text) from public,anon,authenticated;
grant execute on function public.begin_evidence_retention(text,uuid,text) to service_role;

create function public.finish_evidence_retention(p_request_id uuid,p_outcome text,p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_request private.evidence_retention_events;
begin
  if p_outcome not in ('Deleted','Failed') then raise exception 'Invalid retention outcome.' using errcode='23514'; end if;
  select * into v_request from private.evidence_retention_events where request_id=p_request_id and outcome='Requested' for update;
  if not found then raise exception 'Retention request not found.' using errcode='23514'; end if;
  if p_outcome='Deleted' and exists (select 1 from storage.objects where bucket_id='operational-media' and name=v_request.object_path) then
    raise exception 'Storage still contains this object; deletion cannot be recorded.' using errcode='23514';
  end if;
  insert into private.evidence_retention_events(request_id,object_path,approved_by,reason,outcome,evidence,error_detail)
  values(p_request_id,v_request.object_path,v_request.approved_by,v_request.reason,p_outcome,v_request.evidence,left(p_error,2000));
end;
$$;
revoke all on function public.finish_evidence_retention(uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_evidence_retention(uuid,text,text) to service_role;
