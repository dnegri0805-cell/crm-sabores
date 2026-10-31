// Copia de seguridad automática: todas las tablas en un archivo .json.gz guardado en el depósito privado "copias".
// La dispara el programador de la base (todos los domingos de madrugada) o el dueño desde el CRM ("Hacer una copia ahora").
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
const SRV = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-copia', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const resp = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const FUERA = new Set(['arca_cfg', 'columnas_privadas']); // secretos y técnicas: no van a la copia
const GUARDAR_DIAS = 120;

Deno.serve(async (req) => {
  if (req.method == 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    // ¿Quién la pide? El programador (clave secreta) o el dueño (sesión)
    const { data: clave } = await SRV.rpc('copia_clave');
    let origen = 'automática';
    if (!(clave && req.headers.get('x-copia') === clave)) {
      const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const { data: u } = await SRV.auth.getUser(jwt);
      if (!u?.user) return resp({ error: 'Sin permiso.' }, 401);
      const { data: pf } = await SRV.from('perfiles').select('rol,activo').eq('id', u.user.id).maybeSingle();
      if (!pf?.activo || pf.rol != 'dueno') return resp({ error: 'Sólo el dueño.' }, 403);
      origen = 'manual';
    }
    const { data: T, error: te } = await SRV.rpc('copia_tablas');
    if (te) throw te;
    const datos: Record<string, unknown[]> = {}; let filas = 0;
    for (const t of (T as string[]).filter(x => !FUERA.has(x))) {
      const out: unknown[] = [];
      for (let i = 0; ; i += 1000) {
        const { data, error } = await SRV.from(t).select('*').range(i, i + 999);
        if (error) { datos['_error_' + t] = [error.message]; break; }
        out.push(...data); if (data.length < 1000) break;
      }
      datos[t] = out; filas += out.length;
    }
    const ahora = new Date(), ar = new Date(ahora.getTime() - 3 * 3600e3).toISOString();
    const json = JSON.stringify({ crm: 'Sabores de mi País', creada: ahora.toISOString(), origen, tablas: datos });
    const gz = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    const nombre = `copia-${ar.slice(0, 10)}-${ar.slice(11, 16).replace(':', '')}.json.gz`;
    const { error: ue } = await SRV.storage.from('copias').upload(nombre, new Uint8Array(gz), { contentType: 'application/gzip', upsert: true });
    if (ue) throw ue;
    // Borra las de más de 4 meses (deja siempre las últimas 8)
    const { data: L } = await SRV.storage.from('copias').list('', { limit: 500, sortBy: { column: 'name', order: 'desc' } });
    const viejas = (L || []).filter(f => f.name.startsWith('copia-')).slice(8).filter(f => new Date(f.created_at).getTime() < Date.now() - GUARDAR_DIAS * 864e5).map(f => f.name);
    if (viejas.length) await SRV.storage.from('copias').remove(viejas);
    return resp({ ok: true, archivo: nombre, tablas: Object.keys(datos).length, filas, kb: Math.round(gz.byteLength / 1024) });
  } catch (e) {
    return resp({ error: (e as Error)?.message || String(e) }, 200);
  }
});
