// Agenda del CRM para Google Calendar / Calendario del celular (suscripción .ics con link secreto por usuario).
// Trae: tareas, seguimientos de prospectos, visitas de la semana y entregas programadas.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
const SRV = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const esc = (t: string) => String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
const hoyAR = () => new Date(Date.now() - 3 * 3600e3);
const plegar = (l: string) => { const o: string[] = []; let s = l; while (s.length > 74) { o.push(s.slice(0, 74)); s = ' ' + s.slice(74); } o.push(s); return o.join('\r\n'); };

Deno.serve(async (req) => {
  const t = new URL(req.url).searchParams.get('t') || '';
  if (!/^[a-f0-9]{24,64}$/.test(t)) return new Response('Link inválido', { status: 404 });
  const { data: u } = await SRV.from('perfiles').select('id,nombre,rol,activo').eq('agenda_token', t).maybeSingle();
  if (!u || !u.activo) return new Response('Link inválido', { status: 404 });
  const yo = u.id, vend = u.rol == 'vendedor', h = hoyAR(), d0 = new Date(h.getTime() - 7 * 864e5).toISOString().slice(0, 10), d60 = new Date(h.getTime() + 60 * 864e5).toISOString().slice(0, 10);
  const ev: string[] = [], stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const add = (uid: string, fecha: string, titulo: string, desc = '', aviso = true) => {
    const f = fecha.replace(/-/g, ''), sig = ymd(new Date(new Date(fecha + 'T12:00:00Z').getTime() + 864e5));
    ev.push(['BEGIN:VEVENT', `UID:${uid}@crm-sabores`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${f}`, `DTEND;VALUE=DATE:${sig}`, plegar('SUMMARY:' + esc(titulo)), desc ? plegar('DESCRIPTION:' + esc(desc)) : '',
      aviso ? 'BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:' + esc(titulo) + '\r\nTRIGGER:PT9H\r\nEND:VALARM' : '', 'END:VEVENT'].filter(Boolean).join('\r\n'));
  };
  // Tareas
  const { data: T } = await SRV.from('tareas').select('id,titulo,fecha,cliente_id,clientes(razon_social)').eq('asignado_a', yo).eq('hecha', false).gte('fecha', d0).lte('fecha', d60).limit(500);
  for (const x of T || []) add('t' + x.id, x.fecha, '✔ ' + x.titulo, (x as any).clientes?.razon_social || '');
  // Seguimientos de prospectos
  let qp = SRV.from('prospectos').select('id,nombre,proximo_seguimiento,proximo_paso,telefono').not('proximo_seguimiento', 'is', null).gte('proximo_seguimiento', d0).lte('proximo_seguimiento', d60).not('estado', 'in', '(cliente,no_interesado)').limit(500);
  qp = vend ? qp.eq('vendedor_id', yo) : qp.or(`vendedor_id.is.null,vendedor_id.eq.${yo}`);
  const { data: PR } = await qp;
  for (const x of PR || []) add('p' + x.id + '-' + x.proximo_seguimiento, x.proximo_seguimiento, '🎯 ' + (x.proximo_paso || 'Seguimiento') + ': ' + x.nombre, x.telefono ? 'Tel: ' + x.telefono : '');
  // Visitas de los próximos 14 días (días de visita de cada cliente)
  let qc = SRV.from('clientes').select('id,razon_social,domicilio,dias_visita').eq('activo', true).not('dias_visita', 'is', null).limit(2000);
  qc = vend ? qc.eq('vendedor_id', yo) : qc.or(`vendedor_id.is.null,vendedor_id.eq.${yo}`);
  const { data: CL } = await qc;
  for (let k = 0; k < 14; k++) {
    const d = new Date(h.getTime() + k * 864e5), dow = d.getUTCDay() || 7, f = d.toISOString().slice(0, 10);
    const V = (CL || []).filter((c: any) => (c.dias_visita || []).includes(dow));
    if (V.length) add('v' + f + yo, f, `🚶 Visitas (${V.length}): ` + V.slice(0, 4).map((c: any) => c.razon_social).join(', ') + (V.length > 4 ? '…' : ''), V.map((c: any) => '• ' + c.razon_social + (c.domicilio ? ' — ' + c.domicilio : '')).join('\n'), false);
  }
  // Entregas programadas
  let qe = SRV.from('pedidos').select('id,numero,fecha_entrega,total,clientes(razon_social,domicilio)').not('fecha_entrega', 'is', null).gte('fecha_entrega', h.toISOString().slice(0, 10)).lte('fecha_entrega', d60).not('estado', 'in', '(cancelado,entregado)').limit(500);
  if (vend) qe = qe.eq('vendedor_id', yo);
  const { data: E } = await qe;
  for (const x of E || []) add('e' + x.id, x.fecha_entrega, `🚚 Entrega pedido N° ${x.numero} · ${(x as any).clientes?.razon_social || ''}`, (x as any).clientes?.domicilio || '', false);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sabores de mi Pais//CRM//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:CRM Sabores', 'X-WR-TIMEZONE:America/Argentina/Buenos_Aires', 'REFRESH-INTERVAL;VALUE=DURATION:PT2H', 'X-PUBLISHED-TTL:PT2H', ...ev, 'END:VCALENDAR'].join('\r\n');
  return new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'max-age=900', 'Access-Control-Allow-Origin': '*' } });
});
