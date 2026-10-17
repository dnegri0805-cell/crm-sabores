-- Costo de envío: si el pedido no llega a "envio_gratis_desde", se suma "costo_envio" al total.
-- Se puede bonificar el envío de un pedido puntual (envio_bonificado = true).

alter table pedidos add column if not exists costo_envio numeric not null default 0;
alter table pedidos add column if not exists envio_bonificado boolean not null default false;

-- Los pedidos anteriores a esta regla no cambian.
update pedidos set envio_bonificado = true where costo_envio = 0 and not envio_bonificado;

create or replace function envio_de(p_base numeric, p_bonif boolean)
returns numeric language plpgsql stable security definer set search_path to 'public' as $$
declare u numeric; c numeric;
begin
  if coalesce(p_bonif, false) or coalesce(p_base, 0) <= 0 then return 0; end if;
  begin u := nullif(trim((select valor from config_app where clave = 'envio_gratis_desde')), '')::numeric; exception when others then u := null; end;
  begin c := nullif(trim((select valor from config_app where clave = 'costo_envio')), '')::numeric; exception when others then c := null; end;
  if coalesce(u, 0) <= 0 or coalesce(c, 0) <= 0 or p_base >= u then return 0; end if;
  return c;
end $$;

create or replace function recalcular_total_pedido()
returns trigger language plpgsql as $$
declare v_id uuid := coalesce(new.pedido_id, old.pedido_id); b numeric; p pedidos%rowtype; e numeric;
begin
  select * into p from pedidos where id = v_id;
  if not found then return null; end if;
  b := round(coalesce((select sum(subtotal) from pedido_items where pedido_id = v_id), 0) * (1 - coalesce(p.descuento_pct, 0) / 100), 2);
  e := envio_de(b, p.envio_bonificado);
  update pedidos set total = b + e, costo_envio = e where id = v_id;
  return null;
end $$;

-- Al bonificar o volver a cobrar el envío, el total se ajusta solo.
create or replace function pedidos_envio_cambia()
returns trigger language plpgsql as $$
begin
  if new.envio_bonificado is distinct from old.envio_bonificado then
    new.costo_envio := envio_de(coalesce(new.total, 0) - coalesce(old.costo_envio, 0), new.envio_bonificado);
    new.total := coalesce(new.total, 0) - coalesce(old.costo_envio, 0) + new.costo_envio;
  end if;
  return new;
end $$;
drop trigger if exists pedidos_envio on pedidos;
create trigger pedidos_envio before update of envio_bonificado on pedidos for each row execute function pedidos_envio_cambia();

-- El catálogo recibe el costo del envío.
create or replace function extras_catalogo(p_lista text)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'combos', coalesce((select jsonb_agg(jsonb_build_object('id', 'combo:' || c.id, 'n', c.nombre, 'desc', c.descripcion, 'pct', c.descuento_pct, 'items', c.items) order by c.id)
                          from combos c where c.activo and current_date >= c.desde and (c.hasta is null or current_date <= c.hasta)), '[]'::jsonb),
    'escalas', coalesce((select valor from config_app where clave = 'escalas_descuento')::jsonb, '[]'::jsonb),
    'minimo',  nullif((select valor from config_app where clave = 'pedido_minimo'), '')::numeric,
    'envio',   nullif((select valor from config_app where clave = 'envio_gratis_desde'), '')::numeric,
    'costo_envio', nullif((select valor from config_app where clave = 'costo_envio'), '')::numeric)
$$;

insert into config_app (clave, valor) values ('envio_gratis_desde', '150000'), ('costo_envio', '15000')
  on conflict (clave) do update set valor = excluded.valor;

create or replace function faq_info()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare z jsonb; f jsonb; k text; zs jsonb := '[]'::jsonb; cf jsonb; g jsonb; fe jsonb;
begin
  begin z := nullif((select valor from config_app where clave = 'zonas_reparto'), '')::jsonb; exception when others then z := null; end;
  begin f := nullif((select valor from config_app where clave = 'feriados'), '')::jsonb; exception when others then f := null; end;
  begin cf := nullif((select valor from config_app where clave = 'faq'), '')::jsonb; exception when others then cf := null; end;
  begin g := nullif((select valor from config_app where clave = 'garantia'), '')::jsonb; exception when others then g := null; end;
  begin fe := nullif((select valor from config_app where clave = 'entregas'), '')::jsonb; exception when others then fe := null; end;
  if jsonb_typeof(z) = 'object' then
    for k in select jsonb_object_keys(z) order by 1 loop
      if jsonb_typeof(z -> k -> 'dias') = 'array' and jsonb_array_length(z -> k -> 'dias') > 0 and k <> 'Sin zona' then
        zs := zs || jsonb_build_array(jsonb_build_object('z', k, 'dias', z -> k -> 'dias', 'minimo', coalesce((z -> k ->> 'minimo')::numeric, 0)));
      end if;
    end loop;
  end if;
  return jsonb_build_object(
    'faq', coalesce(cf, '{}'::jsonb),
    'zonas', zs,
    'entrega', fe,
    'minimo', (select nullif(valor, '')::numeric from config_app where clave = 'pedido_minimo' and valor ~ '^\s*[0-9.]+\s*$'),
    'envio', (select nullif(valor, '')::numeric from config_app where clave = 'envio_gratis_desde' and valor ~ '^\s*[0-9.]+\s*$'),
    'costo_envio', (select nullif(valor, '')::numeric from config_app where clave = 'costo_envio' and valor ~ '^\s*[0-9.]+\s*$'),
    'pago', coalesce((select length(trim(valor)) > 0 from config_app where clave = 'datos_pago'), false),
    'mp', coalesce((select length(trim(valor)) > 0 from config_app where clave = 'link_mp'), false),
    'tel', (select valor from config_app where clave = 'telefono_empresa'),
    'garantia', case when coalesce((g ->> 'activa')::boolean, false) then g end,
    'feriados', coalesce((select jsonb_agg(x ->> 'f' order by x ->> 'f') from jsonb_array_elements(case when jsonb_typeof(f) = 'array' then f when jsonb_typeof(f -> 'l') = 'array' then f -> 'l' else '[]'::jsonb end) x
                          where (x ->> 'f')::date between current_date and current_date + 45), '[]'::jsonb));
end $function$;
