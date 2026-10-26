-- La función 'usuarios' (alta de usuarios desde el CRM) necesita poder escribir los perfiles
grant select, insert, update on public.perfiles to service_role;
