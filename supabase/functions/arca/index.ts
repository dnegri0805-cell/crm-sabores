// Factura electrónica ARCA (ex AFIP) para el CRM Sabores de mi País.
// WSAA (login con certificado) + WSFEv1 (Factura C y Nota de crédito C, monotributo).
// La clave privada y el certificado viven sólo en la tabla arca_cfg (nadie de la app la puede leer).
import forgeMod from 'npm:node-forge@1.3.1';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
const forge: any = (forgeMod as any).default ?? forgeMod;

const URL_SB = Deno.env.get('SUPABASE_URL')!;
const SRV = createClient(URL_SB, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const WSAA = 'https://wsaa.afip.gov.ar/ws/services/LoginCms';
const WSFE = 'https://servicios1.afip.gov.ar/wsfev1/service.asmx';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const resp = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
class Aviso extends Error {}

const xun = (s: string) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const tag = (x: string, t: string) => { const m = x.match(new RegExp('<(?:\\w+:)?' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?' + t + '>')); return m ? m[1] : null; };
const tags = (x: string, t: string) => [...x.matchAll(new RegExp('<(?:\\w+:)?' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?' + t + '>', 'g'))].map(m => m[1]);
const hoyAR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const isoAR = (d: Date) => new Date(d.getTime() - 3 * 3600e3).toISOString().slice(0, 19) + '-03:00';
const f8 = (d: string) => d.replace(/-/g, '');
const d8 = (s: string | null) => s && s.length == 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null;

async function cfg() { const { data } = await SRV.from('arca_cfg').select('*').eq('id', 1).maybeSingle(); return data || { id: 1 }; }
async function guardarCfg(o: Record<string, unknown>) { const { error } = await SRV.from('arca_cfg').upsert({ id: 1, ...o, actualizado: new Date().toISOString() }); if (error) throw error; }

// ---------- Certificado ----------
async function nuevaClaveYCSR(cuit: string, rs: string) {
  const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const pk8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey));
  let bin = ''; for (const b of pk8) bin += String.fromCharCode(b);
  const keyPem = '-----BEGIN PRIVATE KEY-----\n' + btoa(bin).match(/.{1,64}/g)!.join('\n') + '\n-----END PRIVATE KEY-----\n';
  const key = forge.pki.privateKeyFromPem(keyPem);
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = forge.pki.setRsaPublicKey(key.n, key.e);
  csr.setSubject([{ shortName: 'C', value: 'AR' }, { shortName: 'O', value: rs.slice(0, 60) || 'Sabores de mi Pais' }, { shortName: 'CN', value: 'crmsabores' }, { type: '2.5.4.5', value: 'CUIT ' + cuit }]);
  csr.sign(key, forge.md.sha256.create());
  return { keyPem, csrPem: forge.pki.certificationRequestToPem(csr) };
}

// ---------- WSAA ----------
async function ticket(c: any, svc = 'wsfe') {
  const px = svc == 'wsfe' ? 'ta_' : 'ta13_';
  if (c[px + 'token'] && c[px + 'sign'] && c[px + 'vence'] && new Date(c[px + 'vence']).getTime() > Date.now() + 10 * 60e3) return { token: c[px + 'token'], sign: c[px + 'sign'] };
  if (!c.cert_pem || !c.key_pem) throw new Aviso('Falta cargar el certificado de ARCA.');
  const ahora = new Date();
  const tra = `<?xml version="1.0" encoding="UTF-8"?><loginTicketRequest version="1.0"><header><uniqueId>${Math.floor(ahora.getTime() / 1000)}</uniqueId><generationTime>${isoAR(new Date(ahora.getTime() - 10 * 60e3))}</generationTime><expirationTime>${isoAR(new Date(ahora.getTime() + 10 * 60e3))}</expirationTime></header><service>${svc}</service></loginTicketRequest>`;
  const cert = forge.pki.certificateFromPem(c.cert_pem), key = forge.pki.privateKeyFromPem(c.key_pem);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({ key, certificate: cert, digestAlgorithm: forge.pki.oids.sha256, authenticatedAttributes: [{ type: forge.pki.oids.contentType, value: forge.pki.oids.data }, { type: forge.pki.oids.messageDigest }, { type: forge.pki.oids.signingTime, value: ahora }] });
  p7.sign();
  const cms = forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());
  const body = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"><soapenv:Header/><soapenv:Body><wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms></soapenv:Body></soapenv:Envelope>`;
  const r = await fetch(WSAA, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' }, body });
  const x = await r.text();
  if (!r.ok || /faultstring/.test(x)) {
    const f = xun(tag(x, 'faultstring') || x.slice(0, 300));
    if (/ya posee un TA valido/i.test(f)) throw new Aviso('ARCA dice que ya hay un acceso abierto de hace un rato. Probá de nuevo en unos minutos.');
    if (/cms.cert.untrusted|certificado/i.test(f)) throw new Aviso('ARCA no reconoce el certificado: ' + f);
    if (/not authorized|no autorizado|notAuthorized/i.test(f)) throw new Aviso(svc == 'wsfe' ? 'El certificado todavía no tiene permiso para Facturación Electrónica (falta la relación "wsfe" en ARCA). Detalle: ' + f : 'Falta habilitar en ARCA el servicio "Consulta a Padrón A13" (ws_sr_padron_a13) para tu certificado. Detalle: ' + f);
    throw new Aviso('ARCA (login): ' + f);
  }
  const ret = xun(tag(x, 'loginCmsReturn') || '');
  const token = tag(ret, 'token'), sign = tag(ret, 'sign'), vence = tag(ret, 'expirationTime');
  if (!token || !sign) throw new Aviso('ARCA no devolvió el acceso. Respuesta: ' + ret.slice(0, 200));
  await guardarCfg({ [px + 'token']: token, [px + 'sign']: sign, [px + 'vence']: vence });
  c[px + 'token'] = token; c[px + 'sign'] = sign; c[px + 'vence'] = vence;
  return { token, sign };
}

// ---------- Padrón A13 (datos de un CUIT) ----------
async function padron(c: any, cuitBuscar: string) {
  const t = await ticket(c, 'ws_sr_padron_a13');
  const body = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:a13="http://a13.soap.ws.server.puc.sr/"><soapenv:Header/><soapenv:Body><a13:getPersona><token>${t.token}</token><sign>${t.sign}</sign><cuitRepresentada>${c.cuit}</cuitRepresentada><idPersona>${cuitBuscar}</idPersona></a13:getPersona></soapenv:Body></soapenv:Envelope>`;
  const r = await fetch('https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA13', { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' }, body });
  const x = await r.text();
  if (/faultstring/.test(x)) { const f = xun(tag(x, 'faultstring') || ''); if (/no existe|inexistente/i.test(f)) throw new Aviso('Ese CUIT no existe en el padrón de ARCA.'); throw new Aviso('ARCA (padrón): ' + f); }
  const p = tag(x, 'persona'); if (!p) throw new Aviso('ARCA no devolvió datos para ese CUIT.');
  const nom = xun(tag(p, 'razonSocial') || [tag(p, 'apellido'), tag(p, 'nombre')].filter(Boolean).join(' ') || '');
  const doms = tags(p, 'domicilio'), d = doms.find((z) => /FISCAL/i.test(tag(z, 'tipoDomicilio') || '')) || doms[0] || '';
  const imp = tags(p, 'idImpuesto').map(Number), mono = /monotribut/i.test(p) || imp.includes(20);
  const civa = imp.includes(30) ? 'responsable_inscripto' : mono ? 'monotributista' : imp.includes(32) ? 'exento' : 'consumidor_final';
  return { cuit: cuitBuscar, razon_social: nom.trim(), domicilio: xun(tag(d, 'direccion') || ''), ciudad: xun(tag(d, 'localidad') || tag(d, 'descripcionProvincia') || ''), provincia: xun(tag(d, 'descripcionProvincia') || ''), codigo_postal: xun(tag(d, 'codigoPostal') || ''), condicion_iva: civa, estado: xun(tag(p, 'estadoClave') || ''), tipo: xun(tag(p, 'tipoPersona') || '') };
}

// ---------- WSFEv1 ----------
async function fe(op: string, inner: string, c: any) {
  const t = await ticket(c);
  const auth = `<ar:Auth><ar:Token>${t.token}</ar:Token><ar:Sign>${t.sign}</ar:Sign><ar:Cuit>${c.cuit}</ar:Cuit></ar:Auth>`;
  const body = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/"><soap:Body><ar:${op}>${auth}${inner}</ar:${op}></soap:Body></soap:Envelope>`;
  const r = await fetch(WSFE, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'http://ar.gov.afip.dif.FEV1/' + op }, body });
  const x = await r.text();
  if (/faultstring/.test(x)) throw new Aviso('ARCA: ' + xun(tag(x, 'faultstring') || ''));
  return x;
}
const errores = (x: string) => tags(tag(x, 'Errors') || '', 'Err').map(e => `${tag(e, 'Code')}: ${xun(tag(e, 'Msg') || '')}`);
async function ultimo(c: any, tipo: number) {
  const x = await fe('FECompUltimoAutorizado', `<ar:PtoVta>${c.punto_venta}</ar:PtoVta><ar:CbteTipo>${tipo}</ar:CbteTipo>`, c);
  const er = errores(x); if (er.length) throw new Aviso('ARCA: ' + er.join(' · '));
  return +(tag(x, 'CbteNro') || 0);
}

const COND: Record<string, number> = { responsable_inscripto: 1, exento: 4, consumidor_final: 5, monotributo: 6, monotributista: 6, no_categorizado: 7 };
function receptor(cl: any) {
  const cuit = String(cl?.cuit || '').replace(/\D/g, '');
  const cond = COND[String(cl?.condicion_iva || '').toLowerCase()] || 5;
  if (cuit.length == 11) return { docTipo: 80, docNro: cuit, cond };
  if (cuit.length >= 7 && cuit.length <= 8) return { docTipo: 96, docNro: cuit, cond };
  return { docTipo: 99, docNro: '0', cond: 5 };
}

async function autorizar(c: any, tipo: number, total: number, rec: { docTipo: number; docNro: string; cond: number }, asoc?: { tipo: number; pv: number; nro: number; fecha: string }) {
  const imp = total.toFixed(2);
  for (let intento = 0; intento < 2; intento++) {
    const n = (await ultimo(c, tipo)) + 1, fch = f8(hoyAR());
    const det = `<ar:FECAEDetRequest><ar:Concepto>1</ar:Concepto><ar:DocTipo>${rec.docTipo}</ar:DocTipo><ar:DocNro>${rec.docNro}</ar:DocNro><ar:CbteDesde>${n}</ar:CbteDesde><ar:CbteHasta>${n}</ar:CbteHasta><ar:CbteFch>${fch}</ar:CbteFch><ar:ImpTotal>${imp}</ar:ImpTotal><ar:ImpTotConc>0</ar:ImpTotConc><ar:ImpNeto>${imp}</ar:ImpNeto><ar:ImpOpEx>0</ar:ImpOpEx><ar:ImpTrib>0</ar:ImpTrib><ar:ImpIVA>0</ar:ImpIVA><ar:MonId>PES</ar:MonId><ar:MonCotiz>1</ar:MonCotiz><ar:CondicionIVAReceptorId>${rec.cond}</ar:CondicionIVAReceptorId>${asoc ? `<ar:CbtesAsoc><ar:CbteAsoc><ar:Tipo>${asoc.tipo}</ar:Tipo><ar:PtoVta>${asoc.pv}</ar:PtoVta><ar:Nro>${asoc.nro}</ar:Nro><ar:Cuit>${c.cuit}</ar:Cuit><ar:CbteFch>${f8(asoc.fecha)}</ar:CbteFch></ar:CbteAsoc></ar:CbtesAsoc>` : ''}</ar:FECAEDetRequest>`;
    const x = await fe('FECAESolicitar', `<ar:FeCAEReq><ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${c.punto_venta}</ar:PtoVta><ar:CbteTipo>${tipo}</ar:CbteTipo></ar:FeCabReq><ar:FeDetReq>${det}</ar:FeDetReq></ar:FeCAEReq>`, c);
    const er = errores(x);
    const d = tag(x, 'FECAEDetResponse') || '';
    const obs = tags(tag(d, 'Observaciones') || '', 'Obs').map(o => `${tag(o, 'Code')}: ${xun(tag(o, 'Msg') || '')}`);
    const cae = tag(d, 'CAE'), res = tag(d, 'Resultado');
    if (res == 'A' && cae) return { numero: n, cae, cae_vto: d8(tag(d, 'CAEFchVto')), fecha: hoyAR(), obs: obs.join(' · ') || null };
    if (er.some(e => /^10016/.test(e)) && intento == 0) continue;
    throw new Aviso('ARCA rechazó el comprobante: ' + [...er, ...obs].join(' · '));
  }
  throw new Aviso('ARCA no aceptó el número de comprobante. Probá de nuevo.');
}

Deno.serve(async (req) => {
  if (req.method == 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u } = await SRV.auth.getUser(jwt);
    if (!u?.user) return resp({ error: 'Tu sesión venció. Volvé a entrar.' }, 401);
    const { data: pf } = await SRV.from('perfiles').select('rol,activo').eq('id', u.user.id).maybeSingle();
    if (!pf?.activo) return resp({ error: 'Usuario inactivo.' }, 403);
    const dueno = pf.rol == 'dueno', admin = dueno || pf.rol == 'administracion';
    const b = await req.json().catch(() => ({}));
    const c = await cfg();
    const em = (await SRV.from('config_app').select('valor').eq('clave', 'datos_emisor').maybeSingle()).data?.valor;
    const E = typeof em == 'string' ? JSON.parse(em || '{}') : (em || {});

    switch (b.accion) {
      case 'padron': {
        const q = String(b.cuit || '').replace(/\D/g, '');
        if (q.length != 11) throw new Aviso('El CUIT tiene que tener 11 números.');
        if (!c.cert_pem) throw new Aviso('La búsqueda por CUIT se activa cuando termines de vincular ARCA.');
        return resp({ ok: true, ...(await padron(c, q)) });
      }
      case 'csr': {
        if (!dueno) return resp({ error: 'Sólo el dueño.' }, 403);
        const cuit = String(E.cuit || '').replace(/\D/g, '');
        if (cuit.length != 11) throw new Aviso('Primero cargá tu CUIT en "Datos para los comprobantes".');
        if (c.csr_pem && !c.cert_pem && !b.nuevo) return resp({ csr: c.csr_pem });
        const { keyPem, csrPem } = await nuevaClaveYCSR(cuit, String(E.rs || 'Sabores de mi Pais'));
        await guardarCfg({ cuit, key_pem: keyPem, csr_pem: csrPem, cert_pem: null, cert_desde: null, cert_vence: null, ta_token: null, ta_sign: null, ta_vence: null, activo: false });
        return resp({ csr: csrPem });
      }
      case 'cert': {
        if (!dueno) return resp({ error: 'Sólo el dueño.' }, 403);
        if (!c.key_pem) throw new Aviso('Primero generá el pedido de certificado (paso 1).');
        const pem = String(b.cert || '').trim();
        if (!/BEGIN CERTIFICATE/.test(pem)) throw new Aviso('Ese archivo no es un certificado. Subí el .crt que bajaste de ARCA.');
        const cert = forge.pki.certificateFromPem(pem), key = forge.pki.privateKeyFromPem(c.key_pem);
        if (cert.publicKey.n.compareTo(key.n) != 0) throw new Aviso('Ese certificado es de otro pedido. Subí el que ARCA generó con el último archivo .csr que bajaste del CRM.');
        await guardarCfg({ cert_pem: pem, cert_desde: cert.validity.notBefore.toISOString(), cert_vence: cert.validity.notAfter.toISOString(), ta_token: null, ta_sign: null, ta_vence: null, ...(b.punto_venta ? { punto_venta: +b.punto_venta } : {}) });
        return resp({ ok: true, vence: cert.validity.notAfter });
      }
      case 'config': {
        if (!dueno) return resp({ error: 'Sólo el dueño.' }, 403);
        const o: Record<string, unknown> = {};
        if (b.punto_venta != null) o.punto_venta = +b.punto_venta || null;
        if (b.activo != null) { if (b.activo && (!c.cert_pem || !c.punto_venta && !o.punto_venta)) throw new Aviso('Falta el certificado o el punto de venta.'); o.activo = !!b.activo; }
        await guardarCfg(o); return resp({ ok: true });
      }
      case 'probar': {
        if (!admin) return resp({ error: 'Sin permiso.' }, 403);
        if (!c.punto_venta) throw new Aviso('Falta el número de punto de venta.');
        const x = await fe('FEParamGetPtosVenta', '', c);
        const pvs = tags(x, 'PtoVenta').map(p => ({ nro: +(tag(p, 'Nro') || 0), tipo: tag(p, 'EmisionTipo'), baja: tag(p, 'Bloqueado') == 'S' || (tag(p, 'FchBaja') || 'NULL') != 'NULL' }));
        let ultC: number | null = null, err: string | null = null;
        try { ultC = await ultimo(c, 11); } catch (e) { err = (e as Error).message; }
        const pvOk = pvs.some(p => p.nro == c.punto_venta && !p.baja);
        return resp({ ok: !err && (pvOk || !pvs.length), puntos: pvs, punto_venta: c.punto_venta, ultimo_c: ultC, error: err || (pvOk || !pvs.length ? null : `El punto de venta ${c.punto_venta} no figura habilitado para web services en ARCA. Los que tenés: ${pvs.map(p => p.nro).join(', ') || 'ninguno'}.`) });
      }
      case 'facturar': {
        if (!admin) return resp({ error: 'Sólo el dueño o administración pueden facturar.' }, 403);
        if (!c.activo) throw new Aviso('La factura electrónica no está activada.');
        const { data: o } = await SRV.from('pedidos').select('id,cliente_id,total,numero').eq('id', b.pedido_id).maybeSingle();
        if (!o) throw new Aviso('No encuentro el pedido.');
        if (!(+o.total > 0)) throw new Aviso('El pedido no tiene importe.');
        const { data: ya } = await SRV.from('facturas_venta').select('tipo,numero,punto_venta').eq('pedido_id', o.id).eq('anulada', false).limit(1);
        if (ya?.length) throw new Aviso(`Este pedido ya tiene la factura ${ya[0].tipo} ${String(ya[0].punto_venta).padStart(5, '0')}-${String(ya[0].numero).padStart(8, '0')}.`);
        const { data: cl } = await SRV.from('clientes').select('id,cuit,condicion_iva,condicion_pago_dias').eq('id', o.cliente_id).maybeSingle();
        const rec = receptor(cl);
        const a = await autorizar(c, 11, +o.total, rec);
        const v = new Date(Date.now() - 3 * 3600e3); v.setDate(v.getDate() + (+cl?.condicion_pago_dias || 0));
        const { data: f, error } = await SRV.from('facturas_venta').insert({ tipo: 'C', punto_venta: c.punto_venta, numero: a.numero, cliente_id: o.cliente_id, pedido_id: o.id, fecha: a.fecha, vencimiento: v.toISOString().slice(0, 10), total: o.total, cae: a.cae, cae_vto: a.cae_vto, cbte_tipo: 11, arca_obs: a.obs, doc_tipo: rec.docTipo, doc_nro: rec.docNro, creado_por: u.user.id }).select().single();
        if (error) throw new Aviso(`ARCA autorizó la factura C ${c.punto_venta}-${a.numero} (CAE ${a.cae}) pero no se pudo guardar en el CRM: ${error.message}. Anotá estos datos.`);
        return resp({ factura: f });
      }
      case 'nota_credito': {
        if (!admin) return resp({ error: 'Sin permiso.' }, 403);
        if (!c.activo) throw new Aviso('La factura electrónica no está activada.');
        let nota: any = null, fac: any = null, total = 0;
        if (b.nota_numero) {
          ({ data: nota } = await SRV.from('notas_credito').select('*').eq('numero', b.nota_numero).maybeSingle());
          if (!nota) throw new Aviso('No encuentro la nota de crédito.');
          if (nota.cae) return resp({ nota });
          ({ data: fac } = await SRV.from('facturas_venta').select('*').eq('pedido_id', nota.pedido_id).eq('anulada', false).not('cae', 'is', null).limit(1).maybeSingle());
          total = +nota.total;
        } else {
          ({ data: fac } = await SRV.from('facturas_venta').select('*').eq('id', b.factura_id).maybeSingle());
          total = +(b.importe || fac?.total || 0);
        }
        if (!fac?.cae) throw new Aviso('La factura asociada no es electrónica (no tiene CAE).');
        if (!(total > 0)) throw new Aviso('La nota de crédito no tiene importe.');
        const { data: cl } = await SRV.from('clientes').select('id,cuit,condicion_iva').eq('id', fac.cliente_id).maybeSingle();
        const rec = fac.doc_tipo ? { docTipo: fac.doc_tipo, docNro: fac.doc_nro || '0', cond: receptor(cl).cond } : receptor(cl);
        const a = await autorizar(c, 13, total, rec, { tipo: fac.cbte_tipo || 11, pv: fac.punto_venta, nro: +fac.numero, fecha: String(fac.fecha) });
        const datos = { cae: a.cae, cae_vto: a.cae_vto, punto_venta: c.punto_venta, numero_arca: a.numero, factura_id: fac.id, arca_obs: a.obs };
        if (nota) {
          const { data: n2, error } = await SRV.from('notas_credito').update(datos).eq('id', nota.id).select().single();
          if (error) throw new Aviso(`ARCA autorizó la nota de crédito C ${c.punto_venta}-${a.numero} (CAE ${a.cae}) pero no se guardó: ${error.message}`);
          return resp({ nota: n2 });
        }
        const { data: mx } = await SRV.from('notas_credito').select('numero').order('numero', { ascending: false }).limit(1);
        const { data: n2, error } = await SRV.from('notas_credito').insert({ numero: (mx?.[0]?.numero || 0) + 1, cliente_id: fac.cliente_id, pedido_id: fac.pedido_id, total, motivo: b.motivo || `Anulación de la factura C ${String(fac.punto_venta).padStart(5, '0')}-${String(fac.numero).padStart(8, '0')}`, items: [], usuario_id: u.user.id, ...datos }).select().single();
        if (error) throw new Aviso(`ARCA autorizó la nota de crédito C ${c.punto_venta}-${a.numero} (CAE ${a.cae}) pero no se guardó: ${error.message}`);
        if (total >= +fac.total - 0.005) await SRV.from('facturas_venta').update({ anulada: true }).eq('id', fac.id);
        return resp({ nota: n2 });
      }
      default: return resp({ error: 'Acción desconocida.' }, 400);
    }
  } catch (e) {
    const m = e instanceof Aviso ? e.message : 'Error con ARCA: ' + ((e as Error)?.message || String(e));
    return resp({ error: m }, 200);
  }
});
