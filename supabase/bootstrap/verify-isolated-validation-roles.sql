-- Disposable, freshly bootstrapped validation target only. Bind the caller to
-- the approved new project. No passwords, email delivery or Storage bytes.
-- All generated identities and fixtures are rolled back, even on test failure.
begin;
set local statement_timeout = '20s';
do $$
declare
  operator_id uuid := gen_random_uuid();
  tech_id uuid := gen_random_uuid();
  other_tech_id uuid := gen_random_uuid();
  inactive_id uuid := gen_random_uuid();
  site_id uuid := gen_random_uuid();
  project_id uuid := gen_random_uuid();
  assignment_id uuid := gen_random_uuid();
  checks jsonb := '[]'::jsonb;
  calls text[];
  caller text;
  call_index integer;
  signature text;
  role_name text;
  table_name text;
  snapshot jsonb;
  record_count integer;
begin
  if current_user <> 'postgres' or exists(select 1 from auth.users) then
    raise exception 'Role proof requires postgres and an empty disposable Auth catalog.';
  end if;
  for table_name in select format('%I.%I',n.nspname,c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','private') and c.relkind='r' loop
    execute 'select count(*) from '||table_name into record_count;
    if record_count <> 0 then raise exception 'Role proof requires empty app tables: %',table_name; end if;
  end loop;
  insert into auth.users(id,email) values
    (operator_id,operator_id::text||'@test.invalid'),(tech_id,tech_id::text||'@test.invalid'),
    (other_tech_id,other_tech_id::text||'@test.invalid'),(inactive_id,inactive_id::text||'@test.invalid');
  if (select count(*) from public.profiles where not active) <> 4 then
    raise exception 'Signup trigger must create inactive profiles.';
  end if;
  checks := checks || jsonb_build_array('Signup trigger creates inactive profiles');
  update public.profiles set active=(id<>inactive_id),
    system_role=case when id=operator_id then 'Operator'::public.app_role else 'Tech'::public.app_role end;
  insert into public.sites(id,slug,name) values(site_id,'synthetic-validation','Synthetic validation');
  insert into public.site_memberships(site_id,user_id,role) values(site_id,operator_id,'Operator');
  insert into public.projects(id,site_id,slug,name,status,created_at,updated_at)
    values(project_id,site_id,'synthetic-project','Synthetic project','Stored',now(),now());
  insert into public.field_assignments(id,site_id,project_id,assigned_tech_id,assigned_tech_name,assigned_by_user_id,assigned_by_name)
    values(assignment_id,site_id,project_id,tech_id,'Synthetic Tech',operator_id,'Synthetic Operator'),
      (gen_random_uuid(),site_id,project_id,other_tech_id,'Other synthetic Tech',operator_id,'Synthetic Operator');
  calls := array[
    format('select public.admin_configure_profile_v1(%L,''Synthetic'',true,''Tech'',%L)',tech_id,site_id),
    'select public.admin_list_receiving_notifications_v1()',
    'select public.admin_upsert_receiving_notification_recipient_v1(null,''Synthetic'',''synthetic@test.invalid'',true)',
    format('select public.execute_inventory_command_v1(%L,''fixture'',%L,''{}''::jsonb)',gen_random_uuid(),site_id),
    format('select public.execute_field_work_command_v1(%L,''fixture'',%L,''{}''::jsonb)',gen_random_uuid(),site_id),
    'select public.get_field_work_snapshot_v1()'
  ];
  foreach caller in array array['anonymous','inactive','tech'] loop
    for call_index in 1..case when caller='tech' then 4 else 6 end loop
      begin
        perform set_config('role',case when caller='anonymous' then 'anon' else 'authenticated' end,true);
        perform set_config('request.jwt.claim.sub',case when caller='anonymous' then '' when caller='inactive' then inactive_id::text else tech_id::text end,true);
        perform set_config('request.jwt.claims',jsonb_build_object('sub',case when caller='anonymous' then null when caller='inactive' then inactive_id else tech_id end,'role',case when caller='anonymous' then 'anon' else 'authenticated' end)::text,true);
        execute calls[call_index];
        raise exception 'Expected denied call for % / %',caller,call_index;
      exception when insufficient_privilege then
        checks := checks || jsonb_build_array(caller||' denied API '||call_index);
      end;
      perform set_config('role','postgres',true);
    end loop;
  end loop;
  foreach signature in array array['public.claim_receipt_notifications_v1(uuid)','public.finish_receipt_notification_v1(uuid,text,text,text)'] loop
    foreach role_name in array array['anon','authenticated','service_role'] loop
      if has_function_privilege(role_name,signature,'EXECUTE') <> (role_name='service_role') then
        raise exception 'Unexpected worker privilege: % / %',role_name,signature;
      end if;
      checks := checks || jsonb_build_array(role_name||' worker privilege '||signature);
    end loop;
  end loop;
  foreach table_name in array array['private.verified_uploads','private.evidence_retention_events'] loop
    foreach role_name in array array['anon','authenticated'] loop
      if has_table_privilege(role_name,table_name,'SELECT,INSERT,UPDATE,DELETE') then
        raise exception 'Unexpected direct private-table access: % / %',role_name,table_name;
      end if;
      checks := checks || jsonb_build_array(role_name||' denied direct access '||table_name);
    end loop;
  end loop;
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if has_function_privilege(role_name,'public.verify_staged_upload(uuid,uuid,text,bigint)','EXECUTE') <> (role_name='service_role') then
      raise exception 'Unexpected evidence-attestation privilege: %',role_name;
    end if;
    checks := checks || jsonb_build_array(role_name||' evidence attestation privilege');
  end loop;
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claim.sub',operator_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',operator_id,'role','authenticated')::text,true);
  snapshot := public.get_field_work_snapshot_v1();
  if jsonb_array_length(snapshot->'assignments')<>2 then raise exception 'Operator assignment scope mismatch.'; end if;
  checks := checks || jsonb_build_array('Operator snapshot includes permitted assignments');
  perform set_config('request.jwt.claim.sub',tech_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',tech_id,'role','authenticated')::text,true);
  snapshot := public.get_field_work_snapshot_v1();
  if jsonb_array_length(snapshot->'assignments')<>1 or snapshot#>>'{assignments,0,id}'<>assignment_id::text
     or snapshot->'techs'<>'[]'::jsonb then raise exception 'Tech snapshot leaked assignment or directory.'; end if;
  checks := checks || jsonb_build_array('Tech snapshot excludes unrelated assignment and directory');
  perform set_config('role','postgres',true);
  perform set_config('tbs.validation_role_proof',jsonb_build_object('passed',jsonb_array_length(checks),'checks',checks,'fixture_retention','ROLLBACK_REQUIRED')::text,true);
end;
$$;
select current_setting('tbs.validation_role_proof')::jsonb as role_proof;
rollback;
