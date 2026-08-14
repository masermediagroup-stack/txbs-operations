create or replace function public.execute_inventory_command_v1(
  p_command_id uuid,
  p_command_type text,
  p_site_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  base_payload jsonb := p_payload;
  transformed_lines jsonb;
  item jsonb;
  upload_item jsonb;
  upload_count integer;
  line_id uuid;
  entity_id uuid;
  operator_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_command_type = 'receipt.save-draft' then
    upload_count := jsonb_array_length(coalesce(p_payload -> 'documentUploads', '[]'::jsonb));
    if upload_count > 3 or (
      select count(*)
      from public.photos
      where receipt_id = nullif(p_payload ->> 'receiptId', '')::uuid
        and receipt_line_id is null
        and type = 'Document'
    ) + upload_count > 3 then
      raise exception 'A receipt can have no more than 3 packing slip or document photos.' using errcode = '23514';
    end if;
    if upload_count > 0 then
      base_payload := jsonb_set(base_payload, '{documentUpload}', p_payload -> 'documentUploads' -> 0, true);
    end if;

    for item in select * from jsonb_array_elements(coalesce(p_payload -> 'lines', '[]'::jsonb)) loop
      upload_count := jsonb_array_length(coalesce(item -> 'photoUploads', '[]'::jsonb));
      if upload_count > 3 then
        raise exception 'Each receipt line can have no more than 3 material photos.' using errcode = '23514';
      end if;
      line_id := nullif(item ->> 'id', '')::uuid;
      if line_id is not null and
        (select count(*) from public.photos where receipt_line_id = line_id) + upload_count > 3 then
        raise exception 'Each receipt line can have no more than 3 material photos.' using errcode = '23514';
      end if;
    end loop;

    select coalesce(jsonb_agg(
      case
        when jsonb_array_length(coalesce(line -> 'photoUploads', '[]'::jsonb)) > 0
          then jsonb_set(line, '{photoUpload}', line -> 'photoUploads' -> 0, true)
        else line
      end
    ), '[]'::jsonb)
    into transformed_lines
    from jsonb_array_elements(coalesce(p_payload -> 'lines', '[]'::jsonb)) line;
    base_payload := jsonb_set(base_payload, '{lines}', transformed_lines, true);

  elsif p_command_type = 'movement.create' then
    upload_count := jsonb_array_length(coalesce(p_payload -> 'photoUploads', '[]'::jsonb));
    if upload_count > 3 then
      raise exception 'A movement can have no more than 3 photos.' using errcode = '23514';
    end if;
    if upload_count > 0 then
      base_payload := jsonb_set(base_payload, '{photoUpload}', p_payload -> 'photoUploads' -> 0, true);
    end if;
  end if;

  result := private.execute_inventory_command_v1(p_command_id, p_command_type, p_site_id, base_payload);
  if coalesce((result ->> 'duplicate')::boolean, false) then
    return result;
  end if;

  select profile.display_name into operator_name
  from public.profiles profile
  where profile.id = auth.uid() and profile.active;

  if p_command_type = 'receipt.save-draft' then
    entity_id := (result ->> 'receiptId')::uuid;

    for upload_item in
      select upload.value
      from jsonb_array_elements(coalesce(p_payload -> 'documentUploads', '[]'::jsonb)) with ordinality upload(value, position)
      where upload.position > 1
    loop
      perform private.consume_staged_photo(
        (upload_item ->> 'id')::uuid,
        p_command_id,
        p_site_id,
        operator_name,
        upload_item ->> 'fileName',
        'Document',
        coalesce(upload_item ->> 'caption', 'Receiving document'),
        nullif(p_payload ->> 'projectId', '')::uuid,
        null,
        entity_id,
        null,
        null,
        null,
        null,
        null,
        nullif(p_payload ->> 'stagingLocationId', '')::uuid
      );
    end loop;

    for item in select * from jsonb_array_elements(coalesce(p_payload -> 'lines', '[]'::jsonb)) loop
      line_id := (item ->> 'id')::uuid;
      for upload_item in
        select upload.value
        from jsonb_array_elements(coalesce(item -> 'photoUploads', '[]'::jsonb)) with ordinality upload(value, position)
        where upload.position > 1
      loop
        perform private.consume_staged_photo(
          (upload_item ->> 'id')::uuid,
          p_command_id,
          p_site_id,
          operator_name,
          upload_item ->> 'fileName',
          'Material',
          coalesce(upload_item ->> 'caption', item ->> 'materialName'),
          nullif(p_payload ->> 'projectId', '')::uuid,
          null,
          entity_id,
          line_id,
          null,
          null,
          null,
          null,
          coalesce(
            nullif(item ->> 'targetLocationId', '')::uuid,
            nullif(p_payload ->> 'stagingLocationId', '')::uuid
          )
        );
      end loop;
    end loop;

  elsif p_command_type = 'movement.create' then
    entity_id := (result ->> 'movementId')::uuid;
    for upload_item in
      select upload.value
      from jsonb_array_elements(coalesce(p_payload -> 'photoUploads', '[]'::jsonb)) with ordinality upload(value, position)
      where upload.position > 1
    loop
      perform private.consume_staged_photo(
        (upload_item ->> 'id')::uuid,
        p_command_id,
        p_site_id,
        operator_name,
        upload_item ->> 'fileName',
        'Location',
        coalesce(upload_item ->> 'caption', p_payload ->> 'note', ''),
        null,
        null,
        null,
        null,
        entity_id,
        null,
        null,
        null,
        nullif(p_payload ->> 'locationId', '')::uuid
      );
    end loop;
  end if;

  return result;
end;
$$;

revoke all on function public.execute_inventory_command_v1(uuid, text, uuid, jsonb)
  from public, anon;
grant execute on function public.execute_inventory_command_v1(uuid, text, uuid, jsonb)
  to authenticated;
