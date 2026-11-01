// WhatsApp Business (API oficial de Meta): manda mensajes con plantillas aprobadas, sin tocar el celular.
// Lo usa el CRM (probar / enviar) y el programador de la base (avisos automáticos de cada día).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
const SRV = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-copia', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const resp = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const $ = (n: number) => '$ ' + Math.round(+n || 0).toLocaleString('es-AR');
function telWA(t: string) { let d = String(t || '').replace(/\D/g, ''); if (!d) return ''; if (d.startsWith('54')) d = d.slice(2); if (d.startsWith('9')) d = d.slice(1); if (d.startsWith('0')) d = d.slice(1);
  if (d.length == 12) d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2'); return d.length >= 10 ? '549' + d : ''; }
const hoyAR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

async function cfg() { const { data } = await SRV.from('config_app').select('valor').eq('clave', 'wa_api').maybeSingle(); try { return JSON.parse(data?.valor || '{}'); } catch (_) { return {}; } }
async function enviar(C: any, tok: string, tel: string, plantilla: string, params: string[], log: Record<string, unknown>) {
  const to = telWA(tel); if (!to) { await SRV.from('wa_envios').insert({ ...log, telefono: tel, plantilla, ok: false, detalle: 'Teléfono inválido' }); return { ok: false, error: 'Teléfono inválido' }; }
  const body = { messaging_product: 'whatsapp', to, type: 'template', template: { name: plantilla, language: { code: C.idioma || 'es_AR' }, ...(params.length ? { components: [{ type: 'body', parameters: params.map((t) => ({ type: 'text', text: String(t).slice(0, 900) })) }] } : {}) } };
  const r = await fetch(`https://graph.facebook.com/v21.0/${C.phone_id}/messages`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j: any = await r.json().catch(() => ({}));
  const ok = r.ok && !j.error, det = ok ? (j.messages?.[0]?.id || 'enviado') : (j.error?.error_user_msg || j.error?.message || 'Error ' + r.status);
  await SRV.from('wa_envios').insert({ ...log, telefono: to, plantilla, ok, detalle: det });
  return ok ? { ok: true, id: det } : { ok: false, error: det };
}

Deno.serve(async (req) => {
  if (req.method == 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const C = await cfg(); const { data: tok } = await SRV.rpc('wa_clave');
    const b: any = await req.json().catch(() => ({}));
    const { data: clave } = await SRV.rpc('copia_clave');
    const auto = !!(clave && req.headers.get('x-copia') === clave);
    let rol = '';
    if (!auto) {
      const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const { data: u } = await SRV.auth.getUser(jwt); if (!u?.user) return resp({ error: 'Sin permiso.' }, 401);
      const { data: pf } = await SRV.from('perfiles').select('rol,activo').eq('id', u.user.id).maybeSingle(); if (!pf?.activo) return resp({ error: 'Usuario inactivo.' }, 403); rol = pf.rol;
    }
    if (!tok || !C.phone_id) return resp({ error: 'Falta conectar la cuenta de WhatsApp Business (token y número).' });
    if (!auto && b.accion == 'probar') {
      if (rol != 'dueno') return resp({ error: 'Sólo el dueño.' }, 403);
      return resp(await enviar({ ...C, idioma: b.idioma || ((b.plantilla || 'hello_world') == 'hello_world' ? 'en_US' : C.idioma) }, tok, b.tel, b.plantilla || 'hello_world', b.params || [], { tipo: 'prueba' }));
    }
    if (!auto && b.accion == 'enviar') {
      const { data: c } = await SRV.from('clientes').select('id,razon_social,telefono').eq('id', b.cliente_id).maybeSingle(); if (!c) return resp({ error: 'No encuentro el cliente.' });
      return resp(await enviar(C, tok, c.telefono, b.plantilla, b.params || [], { cliente_id: c.id, tipo: 'manual' }));
    }
    if (auto) {
      const hoy = hoyAR(), man = new Date(Date.now() - 3 * 3600e3 + 864e5).toISOString().slice(0, 10), R: Record<string, number> = {};
      // Recordatorio de cobro: facturas que vencen mañana
      if (C.auto?.cobro?.on && C.auto.cobro.plantilla) {
        const { data: F } = await SRV.from('facturas_estado').select('cliente_id,pendiente,numero,vencimiento').gt('pendiente', 0.005).eq('vencimiento', man);
        const G: Record<string, number> = {}; for (const f of F || []) G[f.cliente_id] = (G[f.cliente_id] || 0) + (+f.pendiente || 0);
        for (const [cid, v] of Object.entries(G)) {
          const { data: ya } = await SRV.from('wa_envios').select('id').eq('tipo', 'cobro').eq('ref', cid + man).limit(1); if (ya?.length) continue;
          const { data: c } = await SRV.from('clientes').select('id,razon_social,nombre_fantasia,telefono').eq('id', cid).maybeSingle(); if (!c?.telefono) continue;
          const x = await enviar(C, tok, c.telefono, C.auto.cobro.plantilla, [c.nombre_fantasia || c.razon_social, $(v), man.slice(8, 10) + '/' + man.slice(5, 7)], { cliente_id: cid, tipo: 'cobro', ref: cid + man }); if (x.ok) R.cobro = (R.cobro || 0) + 1;
        }
      }
      // Pedido que sale hoy (en reparto o con entrega programada para hoy)
      if (C.auto?.sale?.on && C.auto.sale.plantilla) {
        const { data: P } = await SRV.from('pedidos').select('id,numero,cliente_id,total,estado,fecha_entrega').or(`estado.eq.en_reparto,fecha_entrega.eq.${hoy}`).not('estado', 'in', '(cancelado,entregado,pendiente)').limit(300);
        for (const p of P || []) {
          const { data: ya } = await SRV.from('wa_envios').select('id').eq('tipo', 'sale').eq('ref', String(p.id)).limit(1); if (ya?.length) continue;
          const { data: c } = await SRV.from('clientes').select('razon_social,nombre_fantasia,telefono').eq('id', p.cliente_id).maybeSingle(); if (!c?.telefono) continue;
          const x = await enviar(C, tok, c.telefono, C.auto.sale.plantilla, [c.nombre_fantasia || c.razon_social, String(p.numero), $(p.total)], { cliente_id: p.cliente_id, tipo: 'sale', ref: String(p.id) }); if (x.ok) R.sale = (R.sale || 0) + 1;
        }
      }
      return resp({ ok: true, ...R });
    }
    return resp({ error: 'Acción desconocida.' }, 400);
  } catch (e) { return resp({ error: (e as Error)?.message || String(e) }); }
});
