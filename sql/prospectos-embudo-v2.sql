-- Embudo v2: próximo paso, motivo de descarte y días en la etapa
alter table public.prospectos add column if not exists proximo_paso text, add column if not exists motivo_descarte text, add column if not exists etapa_desde timestamptz, add column if not exists etapa_previa text;
create or replace function public.prospecto_etapa() returns trigger language plpgsql as $$
begin
  if tg_op='INSERT' then new.etapa_desde:=coalesce(new.etapa_desde,now()); return new; end if;
  if new.estado is distinct from old.estado then
    new.etapa_desde:=now();
    if new.estado='no_interesado' then new.etapa_previa:=coalesce(old.estado,'nuevo'); end if;
  end if;
  return new;
end $$;
create trigger prospecto_etapa before insert or update on public.prospectos for each row execute function public.prospecto_etapa();
