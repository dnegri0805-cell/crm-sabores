// Resumen semanal por mail: ventas, cobros, clientes que dejaron de comprar, vencidos y pronóstico.
// Lo dispara el programador de la base los lunes a las 8 o el dueño desde el CRM.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
const SRV = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-copia', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const resp = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const $ = (n: number) => '$ ' + Math.round(+n || 0).toLocaleString('es-AR');
const fd = (d: string) => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '';
const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);
const delta = (a: number, b: number) => { if (!(b > 0)) return a > 0 ? '<span style="color:#1d7a46">nuevo</span>' : ''; const p = Math.round((a - b) / b * 100); return `<span style="color:${p >= 0 ? '#1d7a46' : '#d92d20'};font-weight:700">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)} %</span>`; };

function armar(R: any, nombre: string, url: string) {
  const kpi = (t: string, v: string, d: string) => `<td style="padding:12px;border:1px solid #eee;border-radius:10px;width:33%;vertical-align:top"><div style="color:#667;font-size:12px">${t}</div><div style="font-size:22px;font-weight:800;color:#17213a;margin:2px 0">${v}</div><div style="font-size:12px">${d}</div></td>`;
  const lista = (tit: string, L: any[], f: (x: any) => string, vacio: string) => `<h3 style="font-size:15px;margin:22px 0 6px;color:#17213a">${tit}</h3>${L.length ? `<table width="100%" style="border-collapse:collapse;font-size:14px">${L.map((x) => `<tr>${f(x)}</tr>`).join('')}</table>` : `<p style="color:#667;font-size:13px;margin:0">${vacio}</p>`}`;
  const td = 'style="padding:6px 0;border-bottom:1px solid #f0f0f0"', tdn = 'style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap"';
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1c2333">
  <div style="background:#7b2d3e;color:#fff;padding:18px 20px;border-radius:14px 14px 0 0"><div style="font-size:13px;opacity:.85">Sabores de mi País · resumen semanal</div><div style="font-size:21px;font-weight:800;margin-top:2px">Hola ${esc(nombre)}: así fue tu semana</div><div style="font-size:13px;opacity:.85;margin-top:2px">Del ${fd(R.desde)} al ${fd(R.hasta)}</div></div>
  <div style="border:1px solid #eee;border-top:0;border-radius:0 0 14px 14px;padding:16px 20px">
  <table width="100%" cellspacing="6" style="border-collapse:separate"><tr>${kpi('Vendido', $(R.ventas), delta(R.ventas, R.ventas_ant) + ' vs. semana anterior')}${kpi('Cobrado', $(R.cobros), delta(R.cobros, R.cobros_ant) + ' vs. semana anterior')}${kpi('Pedidos', String(R.pedidos), delta(R.pedidos, R.pedidos_ant) + (R.nuevos ? ` · ${R.nuevos} clientes nuevos` : ''))}</tr></table>
  <div style="background:#fff7e0;border-radius:10px;padding:12px 14px;margin-top:12px;font-size:14px">🔮 <b>Esta semana</b> deberían pedirte <b>${R.pron_n} clientes</b> por unos <b>${$(R.pron_v)}</b>.${R.tareas ? ` Tenés <b>${R.tareas} tareas</b> pendientes.` : ''}</div>
  ${lista('🏆 Mejores clientes de la semana', R.top || [], (x) => `<td ${td}>${esc(x.n)}</td><td ${tdn}>${$(x.v)}</td>`, 'No hubo ventas aprobadas esta semana.')}
  ${lista('📞 Dejaron de comprar (llamalos)', R.dejaron || [], (x) => `<td ${td}>${esc(x.n)}<br><small style="color:#667">compró ${$(x.t)} en 6 meses</small></td><td ${tdn}>hace ${x.dias} días</td>`, 'Ningún cliente importante dejó de comprar. ¡Bien!')}
  ${lista(`💳 Te deben vencido: ${$(R.vencido)}`, R.vencidos || [], (x) => `<td ${td}>${esc(x.n)}<br><small style="color:#667">${x.dias} días de atraso</small></td><td ${tdn}>${$(x.v)}</td>`, 'Nadie te debe plata vencida.')}
  ${lista('📅 Les toca pedir', R.pron || [], (x) => `<td ${td}>${esc(x.n)}</td><td ${tdn}>${fd(x.f)} · ${$(x.v)}</td>`, 'Todavía no hay suficiente historia para pronosticar.')}
  <p style="text-align:center;margin:24px 0 6px"><a href="${url}" style="background:#7b2d3e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;display:inline-block">Abrir el CRM</a></p>
  <p style="color:#99a;font-size:11px;text-align:center;margin:10px 0 0">Te llega solo todos los lunes a las 8. Se apaga desde Más → Automatizaciones.</p></div></div>`;
}

Deno.serve(async (req) => {
  if (req.method == 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { data: clave } = await SRV.rpc('copia_clave');
    let auto = true;
    if (!(clave && req.headers.get('x-copia') === clave)) {
      const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const { data: u } = await SRV.auth.getUser(jwt);
      if (!u?.user) return resp({ error: 'Sin permiso.' }, 401);
      const { data: pf } = await SRV.from('perfiles').select('rol,activo').eq('id', u.user.id).maybeSingle();
      if (!pf?.activo || pf.rol != 'dueno') return resp({ error: 'Sólo el dueño.' }, 403);
      auto = false;
    }
    let body: { ver?: boolean } = {}; try { body = await req.json(); } catch (_) { /* sin cuerpo */ }
    if (auto) { const { data: c } = await SRV.from('config_app').select('valor').eq('clave', 'automatizaciones').maybeSingle(); try { if (JSON.parse(c?.valor || '{}')?.resumen?.on === false) return resp({ ok: true, apagado: true }); } catch (_) { /* */ } }
    const { data: R, error } = await SRV.rpc('resumen_semanal'); if (error) throw error;
    const { data: du } = await SRV.from('perfiles').select('id,nombre').eq('rol', 'dueno').eq('activo', true).order('creado_en').limit(1).maybeSingle();
    const { data: au } = du ? await SRV.auth.admin.getUserById(du.id) : { data: null };
    const para = au?.user?.email, nombre = String(du?.nombre || '').trim().split(/\s+/)[0] || 'Diego';
    const html = armar(R, nombre, 'https://dnegri0805-cell.github.io/crm-sabores/');
    if (body.ver) return resp({ ok: true, html, a: para });
    const { data: rk } = await SRV.rpc('copia_mail_clave');
    if (!rk) return resp({ error: 'Falta activar la copia al mail (clave de Resend).' });
    if (!para) return resp({ error: 'No encontramos el mail del dueño.' });
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + rk, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'CRM Sabores <onboarding@resend.dev>', to: [para], subject: `Tu semana: ${$(R.ventas)} vendidos · ${$(R.cobros)} cobrados`, html }) });
    const j = await r.json().catch(() => ({}));
    await SRV.from('copias_registro').insert({ tipo: 'resumen', ok: r.ok, detalle: r.ok ? para : ((j as { message?: string })?.message || 'Error ' + r.status), usuario_id: null });
    return resp(r.ok ? { ok: true, a: para } : { error: (j as { message?: string })?.message || ('Error ' + r.status) });
  } catch (e) { return resp({ error: (e as Error)?.message || String(e) }); }
});
