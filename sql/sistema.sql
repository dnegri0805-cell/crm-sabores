-- =========================================================
-- ESTADO DEL SISTEMA Y RESTAURAR COPIAS — CRM Sabores de mi País
-- 1) estado_sistema(): cuánto espacio de Supabase usás (base de datos y archivos).
-- 2) restaurar_tabla(): vuelve a cargar filas desde una copia de seguridad,
--    SOLO agrega lo que falta (nunca pisa ni borra lo que ya está). Solo el dueño.
-- Se puede correr más de una vez.
-- =========================================================

create or replace function estado_sistema()
returns jsonb language plpgsql stable security definer set search_path = public, storage as $$
declare v_db bigint; v_st bigint := 0; v_n bigint := 0;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede ver el estado del sistema.'; end if;
  v_db := pg_database_size(current_database());
  begin
    select coalesce(sum((metadata->>'size')::bigint), 0), count(*) into v_st, v_n from storage.objects;
  exception when others then v_st := null; end;
  return jsonb_build_object('db_bytes', v_db, 'archivos_bytes', v_st, 'archivos', v_n,
    'clientes', (select count(*) from clientes), 'pedidos', (select count(*) from pedidos));
end $$;
revoke execute on function estado_sistema() from public;
grant execute on function estado_sistema() to authenticated;

create or replace function restaurar_tabla(p_tabla text, p_filas jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer; v_seq text;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede restaurar copias.'; end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = p_tabla and c.relkind = 'r') then
    return -1;   -- no es una tabla (por ejemplo una vista): se saltea
  end if;
  execute format('insert into public.%I overriding system value select * from jsonb_populate_recordset(null::public.%I, $1) on conflict do nothing', p_tabla, p_tabla)
    using p_filas;
  get diagnostics v_n = row_count;
  -- que los números nuevos sigan después de los restaurados
  begin
    v_seq := pg_get_serial_sequence('public.' || quote_ident(p_tabla), 'id');
    if v_seq is not null then
      execute format('select setval(%L, greatest((select coalesce(max(id), 0) from public.%I), 1))', v_seq, p_tabla);
    end if;
  exception when others then null; end;
  return v_n;
end $$;
revoke execute on function restaurar_tabla(text, jsonb) from public;
grant execute on function restaurar_tabla(text, jsonb) to authenticated;

select 'estado del sistema y restaurar copias listos' as resultado;
