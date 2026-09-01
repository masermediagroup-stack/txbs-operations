do $$
declare
  function_definition text;
  corrected_definition text;
begin
  select pg_get_functiondef(procedure.oid)
  into function_definition
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'execute_inventory_command_v1'
    and pg_get_function_identity_arguments(procedure.oid) =
      'p_command_id uuid, p_command_type text, p_site_id uuid, p_payload jsonb';

  if function_definition is null then
    raise exception 'Inventory command wrapper was not found.';
  end if;

  corrected_definition := replace(
    function_definition,
    'and type = ''Document''',
    'and photo_type = ''Document'''
  );

  if corrected_definition = function_definition then
    raise exception 'The stale receiving photo column reference was not found.';
  end if;

  execute corrected_definition;
end;
$$;
