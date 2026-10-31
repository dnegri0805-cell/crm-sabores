/* Sabores de mi País · CRM — pantallas de uso ocasional. Se cargan solas cuando hacen falta (ver EXTRAS en app.js). */
async function vManual(){const v=$('#v');v.innerHTML='<p>Cargando manual…</p>';
  if(!S.manual){try{const r=await fetch('manual.md?v='+VERSION,{cache:'no-store'});if(!r.ok)throw 0;S.manual=await r.text()}catch(e){v.innerHTML='<p>No se pudo cargar el manual. Probá de nuevo en un rato.</p>';return}}
  const partes=S.manual.split(/^## /m),cab=partes.shift().replace(/^# .*\n/,'');
  const secs=partes.map(x=>{const i=x.indexOf('\n');return{t:x.slice(0,i).trim(),b:x.slice(i+1)}});
  v.innerHTML=`<style>.man{max-width:860px;margin:0 auto}.man details{background:#fff;border-radius:14px;box-shadow:0 1px 4px #0001;margin:8px 0;padding:4px 14px}.man summary{font-weight:700;font-size:16px;padding:10px 0;cursor:pointer}.man li{margin:4px 0;line-height:1.45}.man p{line-height:1.5}.man code{background:#f3eee6;padding:1px 5px;border-radius:6px}.man .mt{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}.man .mt input{flex:1;min-width:200px}.man mark{background:#ffe58a}@media print{header,.man .mt{display:none}.man details{box-shadow:none;break-inside:avoid}}</style>
    <div class="man"><h2>📖 Manual de uso</h2>${mdHTML(cab)}
    <div class="mt"><input id="mb" type="search" placeholder="Buscar en el manual (ej. cupón, morosos, preventa)…"><button class="sec" id="mx">Abrir todo</button><button class="sec" id="mp">🖨️ Imprimir</button></div>
    <div id="ms">${secs.map((x,i)=>`<details data-i="${i}"${i==0?' open':''}><summary>${esc(x.t)}</summary><div class="mc">${mdHTML(x.b)}</div></details>`).join('')}</div><p id="mn" hidden>No encontré nada con esa palabra.</p></div>`;
  const D=[...v.querySelectorAll('#ms details')],base=D.map(d=>d.querySelector('.mc').innerHTML);
  $('#mx').onclick=()=>{const ab=D.some(d=>!d.open);D.forEach(d=>d.open=ab);$('#mx').textContent=ab?'Cerrar todo':'Abrir todo'};
  $('#mp').onclick=()=>{D.forEach(d=>d.open=true);setTimeout(()=>print(),100)};
  $('#mb').oninput=e=>{const q=norm(e.target.value.trim());let n=0;
    D.forEach((d,i)=>{const c=d.querySelector('.mc');c.innerHTML=base[i];if(!q){d.hidden=false;return}
      const items=[...c.querySelectorAll('li,p')];let hit=norm(secs[i].t).includes(q);
      items.forEach(el=>{const ok=norm(el.textContent).includes(q);el.style.display=ok||norm(secs[i].t).includes(q)?'':'none';if(ok){hit=true;el.innerHTML='<mark>'+el.innerHTML+'</mark>'}});
      d.hidden=!hit;d.open=hit;if(hit)n++});
    $('#mn').hidden=!q||n>0}}
async function editarBanner(){
  const{data}=await sb.from('config_app').select('valor').eq('clave','banner_portada').maybeSingle();
  let b={...BAN_DEF};try{if(data?.valor)b={...BAN_DEF,...JSON.parse(data.valor)}}catch(e){}
  const fotosProd=[...new Set(Object.values(S.min||{}).map(x=>x.foto).filter(Boolean))].slice(0,40);
  const m=document.createElement('div');m.className='modal';document.body.appendChild(m);
  m.innerHTML=`<div class="mc"><div class="bh"><h3>Banner del catálogo</h3><button class="alt" id="bn_x">Cerrar</button></div>
  <p><small>Es lo primero que ven tus clientes al abrir el link del catálogo. Cambialo cuando quieras: una promo, un producto nuevo, un aviso.</small></p>
  <div id="bn_pv" style="margin:8px 0 14px"></div>
  <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="bn_on" style="width:auto;margin:0" ${b.on!==false?'checked':''}> Mostrar el banner</label>
  <div class="g" style="margin-top:8px">
    <label><small>Etiqueta (ej.: Nuevo, Promo, Oferta)</small><input id="bn_tag" maxlength="18" value="${esc(b.tag||'')}"></label>
    <label><small>Título</small><input id="bn_t" maxlength="40" value="${esc(b.t||'')}"></label>
    <label><small>Texto chico</small><input id="bn_s" maxlength="80" value="${esc(b.s||'')}"></label>
    <label><small>El botón busca… (ej.: crocante, manteca). Vacío = sin botón</small><input id="bn_q" maxlength="40" value="${esc(b.q||'')}"></label>
    <label><small>Texto del botón</small><input id="bn_btn" maxlength="22" value="${esc(b.btn||'Ver productos')}"></label></div>
  <label style="margin-top:10px;display:block"><small>Color de fondo</small></label>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 10px">${BAN_COL.map(([n,c])=>`<button class="alt" data-bc="${c}" style="background:${c};color:#fff;border:0;min-width:70px">${n}</button>`).join('')}<input type="color" id="bn_bg" value="${esc(b.bg)}" style="width:52px;height:40px;padding:2px"></div>
  <label><small>Foto (tocá una)</small></label>
  <div id="bn_fs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;max-height:230px;overflow:auto;margin:4px 0 10px">${[...BAN_FOTOS,...fotosProd].map(u=>`<img src="${esc(u)}" data-bf="${esc(u)}" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:contain;background:#fff;border-radius:8px;cursor:pointer;border:3px solid ${u==b.img?'var(--m,#7b2d3e)':'transparent'}">`).join('')}</div>
  <div class="fc-acc"><button id="bn_sub" class="alt">Subir otra foto</button><a class="lnk" id="bn_sf">Sin foto</a><input type="file" id="bn_f" accept="image/*" hidden></div>
  <div class="fc-acc" style="margin-top:12px"><button id="bn_g">Guardar banner</button><a class="lnk" id="bn_r">Volver al de crocantes JL</a></div></div>`;
  const leer=()=>{b.on=$('#bn_on').checked;for(const k of['tag','t','s','q','btn'])b[k]=$('#bn_'+k).value.trim();b.bg=$('#bn_bg').value};
  const pv=()=>{leer();const bg=b.bg;$('#bn_pv').innerHTML=b.on?`<div style="position:relative;overflow:hidden;border-radius:18px;background:${bg};color:#fff;min-height:150px;padding:16px;display:flex;align-items:center">
      <div style="position:relative;z-index:1;width:58%">${b.tag?`<span style="background:#ffc93c;color:#4a3000;font-weight:800;font-size:10px;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:99px">${esc(b.tag)}</span>`:''}<div style="font-weight:800;font-size:26px;line-height:1;margin:6px 0 4px">${esc(b.t)}</div><div style="font-size:13px;opacity:.95">${esc(b.s)}</div>${b.q?`<span style="display:inline-block;margin-top:8px;background:#fff;color:${bg};font-weight:800;border-radius:99px;padding:6px 12px;font-size:13px">${esc(b.btn||'Ver productos')} →</span>`:''}</div>
      ${b.img?`<img src="${esc(String(b.img).replace(/^fotos\/jl\/(?!sf\/)/,'fotos/jl/sf/'))}" alt="" style="position:absolute;right:-6%;top:50%;width:45%;max-height:115%;object-fit:contain;transform:translateY(-50%) rotate(6deg);filter:drop-shadow(0 10px 12px rgba(0,0,0,.35))">`:''}</div>`:'<p><small>El banner está apagado: el catálogo arranca directo con las ofertas.</small></p>';
    $$('#bn_fs [data-bf]').forEach(i=>i.style.borderColor=i.dataset.bf==b.img?'var(--m,#7b2d3e)':'transparent')};
  pv();m.querySelectorAll('input').forEach(i=>i.addEventListener('input',pv));$('#bn_on').onchange=pv;
  $$('[data-bc]').forEach(x=>x.onclick=()=>{$('#bn_bg').value=x.dataset.bc;pv()});
  $$('#bn_fs [data-bf]').forEach(i=>i.onclick=()=>{b.img=i.dataset.bf;pv()});
  $('#bn_sf').onclick=()=>{b.img='';pv()};$('#bn_x').onclick=()=>m.remove();
  $('#bn_r').onclick=()=>{b={...BAN_DEF};for(const k of['tag','t','s','q','btn'])$('#bn_'+k).value=b[k];$('#bn_bg').value=b.bg;$('#bn_on').checked=true;pv()};
  $('#bn_sub').onclick=()=>$('#bn_f').click();
  $('#bn_f').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{toast('Subiendo foto…');const blob=await achicarFoto(f,1000);const path='banner/'+Date.now()+'.webp';
    const up=await sb.storage.from('productos').upload(path,blob,{contentType:'image/webp',upsert:true});if(up.error)throw up.error;b.img=sb.storage.from('productos').getPublicUrl(path).data.publicUrl;pv();toast('Foto lista.')}catch(er){toast('No se pudo subir: '+er.message,1)}};
  $('#bn_g').onclick=async()=>{leer();$('#bn_g').disabled=true;const{error}=await sb.from('config_app').upsert({clave:'banner_portada',valor:JSON.stringify(b)});$('#bn_g').disabled=false;
    if(error)return toast('No se pudo guardar: '+error.message,1);m.remove();toast('Banner guardado. Si tus clientes no lo ven, falta correr banner.sql en Supabase.')}}
/* ---------- Catálogo con fotos (estilo supermercado, por familias) ---------- */
function catalogoPDF(l,L,c,nomLista){const w=window.open('','_blank');if(!w)return toast('Permití las ventanas emergentes para generar el catálogo.',1);
  const PALC=['#7b2d3e','#1f5fa8','#2e7d4f','#c4571a','#6b3fa0','#0f766e','#b45309','#be185d','#334155','#4d7c0f'];
  const col=t=>{let h=0;for(const ch of String(t||''))h=(h*31+ch.charCodeAt(0))>>>0;return PALC[h%PALC.length]};
  const cap=t=>{t=String(t||'').toLowerCase();return t.charAt(0).toUpperCase()+t.slice(1)};
  const hoy=new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'});
  const $e=n=>'$\u00a0'+Math.round(+n||0).toLocaleString('es-AR');/* mayorista: sin centavos */
  const card=x=>{const b=bul(x.id),r=promoCerca(x.id,l);return`<div class="cd">${r?`<span class="rb">−${nf(r.descuento_pct)} %</span>`:''}
    ${x.f?`<div class="ph"><img src="${esc(x.f)}" alt=""></div>`:`<div class="ph in" style="background:${col(x.m)}1a;color:${col(x.m)}">${esc((x.d||'?')[0])}</div>`}
    ${x.c?`<div class="cc">Cód. ${esc(x.c)}</div>`:''}<div class="nm">${esc(x.d)}</div><div class="mk">${esc(x.m=='Otros'?'':x.m)}${b?(x.m=='Otros'?'':' · ')+esc(b.t)+' × '+b.n:''}</div>
    <div class="pr">${$e(x.p)}${esKg(x.id)?'<span class="u"> x kg</span>':ppz(x.id)?'<span class="u"> la pieza</span>':''}</div>${ppz(x.id)&&!esKg(x.id)?`<div class="bu">Pieza ≈ ${nf(ppz(x.id))} kg · ${$e(x.p/ppz(x.id))} x kg</div>`:''}${b?`<div class="bu">${esc(b.t)}: ${$e(x.p*b.n)}</div>`:''}${r?`<div class="pc">${esc(condPromo(r)||r.nombre)}</div>`:''}</div>`};
  const G={};for(const x of L)(G[x.fa]=G[x.fa]||[]).push(x);
  const F=Object.keys(G).sort(famCmp);const fNom=f=>FAM_ORDEN[String(f).toUpperCase()]!=null?f:cap(f);const nCod=v=>{const n=parseInt(String(v||'').replace(/\D/g,''),10);return isNaN(n)?Infinity:n};
  const O=L.filter(x=>promoCerca(x.id,l));
  const conFoto=L.filter(x=>x.f).length;
  w.document.write(`<html><head><meta charset="utf-8"><title>Catálogo ${esc(nomLista)}${c?' - '+esc(c.razon_social):''} ${new Date().toLocaleDateString('es-AR')}</title><style>
    @page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:system-ui,Segoe UI,Arial,sans-serif;color:#1c2333}
    .tapa{height:238mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;page-break-after:always;border:3px solid ${MARCA.c};border-radius:6mm;padding:20mm}
    .tapa img{max-width:120mm;max-height:90mm;object-fit:contain}.tapa h1{font-size:40px;margin:14mm 0 4mm;color:${MARCA.c}}.tapa .s{font-size:18px;color:#444;line-height:1.6}
    .tapa .f{margin-top:12mm;display:flex;gap:6mm;flex-wrap:wrap;justify-content:center}.tapa .f span{background:#f3f4f7;border-radius:20px;padding:6px 14px;font-size:14px}.tapa .inf{margin-top:12mm;display:grid;gap:4mm;width:100%;max-width:130mm;text-align:left}.tapa .inf div{display:grid;grid-template-columns:12mm 1fr;align-items:center;column-gap:3mm;border:1.5px solid ${MARCA.c}33;background:${MARCA.c}0d;border-radius:4mm;padding:3.5mm 5mm}.tapa .inf span{grid-row:1/3;font-size:26px;text-align:center}.tapa .inf b{font-size:16px;color:${MARCA.c}}.tapa .inf small{font-size:12.5px;color:#4a5163}
    .sec{margin:0 0 4mm;page-break-inside:auto}.sh{background:${MARCA.c};color:#fff;padding:3mm 5mm;border-radius:3mm;display:flex;justify-content:space-between;align-items:baseline;page-break-after:avoid;margin-bottom:3mm}
    .sh h2{margin:0;font-size:22px;letter-spacing:.02em}.sh small{opacity:.85}.sh.of{background:#b3261e}
    .g{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
    .cd{position:relative;border:1px solid #dcdfe5;border-radius:3mm;padding:3mm;page-break-inside:avoid;break-inside:avoid;display:flex;flex-direction:column;gap:1.2mm}
    .ph{aspect-ratio:1;border-radius:2mm;display:grid;place-items:center;overflow:hidden;background:#fff}.ph img{width:100%;height:100%;object-fit:contain}.ph.in{font-size:46px;font-weight:800}
    .rb{position:absolute;top:3.5mm;left:3.5mm;background:#b3261e;color:#fff;font-weight:800;font-size:11px;padding:1mm 2mm;border-radius:2mm}
    .nm{font-size:13px;font-weight:600;line-height:1.25;max-height:3.75em;overflow:hidden}.mk{font-size:10px;font-weight:600;color:#454c5e;text-transform:uppercase;letter-spacing:.03em}
    .pr{font-size:22px;font-weight:800;margin-top:auto}.pr small{font-size:12px}.pr .u{font-size:12.5px;font-weight:700;color:#6a7184}.bu{font-size:11px;color:#444}.pc{font-size:10.5px;color:#1d7a46;font-weight:700}
    .pie{margin-top:6mm;font-size:10px;color:#6a7184;text-align:center}.cc{font-size:10.5px;font-weight:700;color:${MARCA.c}}.gr{font-size:26px;font-weight:800;color:${MARCA.c};border-bottom:2px solid ${MARCA.c};margin:6mm 0 3mm;padding-bottom:1mm;page-break-after:avoid}
    .ayuda{font:14px system-ui;background:#f6e9ec;padding:10px;border-radius:6px;margin:10px}@media print{.ayuda{display:none}}</style><style>${docCss()}</style></head><body>
    <p class="ayuda">Para guardarlo en PDF elegí <b>Guardar como PDF</b>. En "Más opciones" activá <b>Gráficos de fondo</b> para que salgan los colores.${conFoto<L.length?' '+(L.length-conFoto)+' productos todavía no tienen foto: salen con su inicial.':''}</p>
    <div class="tapa">${MARCA.logo?`<img src="${MARCA.logo}" alt="">`:''}<h1>Catálogo de productos</h1>
      <div class="s">${c?'<b>'+esc(c.razon_social)+'</b><br>':''}Lista ${esc(nomLista)} · Vigente al ${hoy}<br>Precios con IVA incluido</div>
      <div class="f"><span>${L.length} productos</span><span>${F.length} ${F.length==1?'categoría':'categorías'}</span>${O.length?`<span>🔥 ${O.length} en oferta</span>`:''}${S.telEmp?`<span>WhatsApp ${esc(S.telEmp)}</span>`:''}</div>
      <div class="inf">${S.vcfg?.envio?`<div><span>🚚</span><b>Envío gratis desde ${$e(S.vcfg.envio)}</b><small>${S.vcfg.costoEnvio?'Si es menor, el envío cuesta '+$e(S.vcfg.costoEnvio):'Te lo llevamos al local'}</small></div>`:''}<div><span>📅</span><b>Entregas de lunes a sábado</b><small>Te lo llevamos al local</small></div><div><span>⏰</span><b>Pedí hasta las 20 h</b><small>Y te llega al día siguiente</small></div></div>
      ${c?.token_pedidos?`<div class="s" style="margin-top:8mm;font-size:13px">Hacé tu pedido online:<br>${esc(linkPedidos(c))}</div>`:''}</div>
    ${O.length?`<div class="sec"><div class="sh of"><h2>🔥 Ofertas</h2><small>${O.length} productos</small></div><div class="g">${O.map(card).join('')}</div></div>`:''}
    ${F.map((f,i)=>{const g=famGrupo(f),gp=i?famGrupo(F[i-1]):null;return (g&&g!==gp?`<div class="gr">${esc(g)}</div>`:'')+`<div class="sec"><div class="sh"><h2>${esc(fNom(f))}</h2><small>${G[f].length} ${G[f].length==1?'producto':'productos'}</small></div><div class="g">${G[f].sort((a,b)=>nCod(a.c)-nCod(b.c)||a.d.localeCompare(b.d)).map(card).join('')}</div></div>`}).join('')}
    <p class="pie">Sabores de mi País · Precios sujetos a modificación sin previo aviso.${conFoto?' Algunas fotos: Open Food Facts (CC BY-SA).':''}</p>
    <script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close()}
async function vReportes(){
  S.rp=(typeof S.rp=='string'&&PERIODOS.some(x=>x[0]==S.rp))?S.rp:'mes';
  $('#v').innerHTML=`<div class="bh"><h2 style="margin:0">Reportes de ventas</h2><button class="alt" onclick="descargarBackup()">💾 Descargar Excel</button><button class="alt" onclick="informeMes(prompt('¿De qué mes? (AAAA-MM)',mesHoy())||mesHoy())">📄 Informe del mes</button></div>
  <div class="sub" id="rp_p">${PERIODOS.map(([k,t])=>`<button class="${S.rp==k?'':'alt'}" data-rp="${k}">${t}</button>`).join('')}</div>
  <p><small>Cuenta los pedidos aprobados en adelante (no incluye los que esperan aprobación ni los cancelados).</small></p>
  <div class="kp">
    <div class="box" id="r1"><span class="lab">Ventas</span><span class="num">…</span><span class="det"></span></div>
    <div class="box" id="r2"><span class="lab">Pedidos</span><span class="num">…</span><span class="det"></span></div>
    <div class="box" id="r3"><span class="lab">Ticket promedio</span><span class="num">…</span><span class="det"></span></div>
    <div class="box" id="r4"><span class="lab">Margen bruto</span><span class="num">…</span><span class="det"></span></div>
  </div>
  <div class="box"><h3>Ventas por mes · últimos 12 meses</h3><div id="rp_g" class="graf"><span class="skl" role="status" aria-label="Cargando"></span></div></div>
  <div class="dos fc2">
    <div class="box"><div class="bh"><h3>Mejores clientes</h3><button class="alt" id="cp_c">Copiar para Excel</button></div><div id="rp_c"></div></div>
    <div class="box"><div class="bh"><h3>Productos más vendidos</h3><button class="alt" id="cp_p">Copiar para Excel</button></div><div id="rp_pr"></div></div>
  </div>
  <div class="box"><div class="bh"><h3>Ventas y ganancia por familia</h3><button class="alt" id="cp_f">Copiar para Excel</button></div><div id="rp_fa"></div></div>`;
  if(!verCostos()){$('#r4').hidden=true;$('#rp_fa').closest('.box').hidden=true;$('#v .bh').querySelectorAll('button').forEach(b=>b.hidden=true)}
  $$('[data-rp]').forEach(b=>b.onclick=()=>{S.rp=b.dataset.rp;$$('[data-rp]').forEach(x=>x.className=x.dataset.rp==S.rp?'':'alt');pintar()});
  const[pe,co]=await Promise.all([
    todo(()=>sb.from('pedidos').select('id,numero,total,estado,cliente_id,creado_en,clientes(razon_social),pedido_items(producto_id,cantidad,precio_unitario)').not('estado','in','(pendiente,cancelado)').order('numero',{ascending:false})),
    todo(()=>sb.from('productos').select('id,costo').order('id'))]);
  let P=pe.data;
  if(pe.error){const r2=await todo(()=>sb.from('pedidos').select('*,clientes(razon_social),pedido_items(producto_id,cantidad,precio_unitario)').not('estado','in','(pendiente,cancelado)').order('numero',{ascending:false}));
    if(r2.error){$('#rp_g').innerHTML='<p class="err">No se pudieron leer los pedidos: '+esc(r2.error.message)+'</p>';return}P=r2.data}
  const costo={};for(const r of co.data||[])costo[r.id]=Number(r.costo)||0;
  for(const o of P)o._d=fechaDe(o)?diaLocal(fechaDe(o)):'';
  const nombre=id=>S.productos.find(p=>p.producto_id==id)?.descripcion||'Producto';
  let TC=[],TP=[],TF=[];
  const pintar=()=>{
    const[a,b]=rango(S.rp),L=P.filter(o=>o._d>=a&&o._d<b);
    const v=L.reduce((x,o)=>x+Number(o.total||0),0);
    let vi=0,ci=0,sinC=0;
    const pc={},cc={};
    for(const o of L){const k=o.cliente_id;cc[k]=cc[k]||{n:o.clientes?.razon_social||'Cliente',p:0,v:0};cc[k].p++;cc[k].v+=Number(o.total||0);
      for(const it of o.pedido_items||[]){const q=Number(it.cantidad)||0,pu=Number(it.precio_unitario)||0,cu=costo[it.producto_id]||0;
        vi+=q*pu;if(cu>0)ci+=q*cu;else sinC+=q*pu;
        const x=pc[it.producto_id]=pc[it.producto_id]||{q:0,v:0,c:0,sc:false};x.q+=q;x.v+=q*pu;if(cu>0)x.c+=q*cu;else x.sc=true}}
    const conC=vi-sinC,mg=conC>0?(conC-ci)/conC:null;
    $('#r1 .num').textContent=$m0(v);$('#r1 .det').textContent=PERIODOS.find(x=>x[0]==S.rp)[1];
    $('#r2 .num').textContent=String(L.length);$('#r2 .det').textContent=Object.keys(cc).length+(Object.keys(cc).length==1?' cliente':' clientes');
    $('#r3 .num').textContent=L.length?$m(v/L.length):'—';$('#r3 .det').textContent='por pedido';
    $('#r4 .num').textContent=mg==null?'—':(mg*100).toLocaleString('es-AR',{maximumFractionDigits:1})+' %';
    $('#r4 .det').textContent=mg==null?'Faltan costos cargados':('Ganancia '+$m(conC-ci)+(sinC>0?' · hay productos sin costo':''));
    // clientes
    TC=Object.values(cc).sort((x,y)=>y.v-x.v);
    $('#rp_c').innerHTML=TC.length?'<table><tr><th>Cliente</th><th class="n">Pedidos</th><th class="n">Ventas</th><th class="n">% del total</th></tr>'+TC.slice(0,10).map(x=>`<tr><td>${esc(x.n)}</td><td class="n">${x.p}</td><td class="n">${$m(x.v)}</td><td class="n">${v?Math.round(x.v/v*100):0} %</td></tr>`).join('')+'</table>'+(TC.length>10?`<small>Y ${TC.length-10} clientes más (se copian todos).</small>`:''):'<p><small>No hay ventas en este período.</small></p>';
    // productos
    TP=Object.entries(pc).map(([id,x])=>({n:nombre(id),...x})).sort((x,y)=>y.v-x.v);
    $('#rp_pr').innerHTML=TP.length?'<table><tr><th>Producto</th><th class="n">Unid.</th><th class="n">Ventas</th><th class="n">Margen</th></tr>'+TP.slice(0,10).map(x=>`<tr><td>${esc(x.n)}</td><td class="n">${nf(x.q)}</td><td class="n">${$m(x.v)}</td><td class="n">${x.sc||!x.v?'—':Math.round((x.v-x.c)/x.v*100)+' %'}</td></tr>`).join('')+'</table>'+(TP.length>10?`<small>Y ${TP.length-10} productos más (se copian todos).</small>`:''):'<p><small>No hay ventas en este período.</small></p>';
    // familias
    const famDeId=id=>{const p=S.productos.find(x=>x.producto_id==id);return(p?.familia||'').trim()||'Sin familia'};
    const FA={};for(const[id,x]of Object.entries(pc)){const f=famDeId(id),k=FA[f]=FA[f]||{f,g:famGrupo(f)||'Otras',v:0,c:0,vc:0,sc:0};k.v+=x.v;if(x.sc)k.sc+=x.v;else{k.vc+=x.v;k.c+=x.c}}
    TF=Object.values(FA).sort((x,y)=>famCmp(x.f,y.f));const GRS=[...new Set(TF.map(x=>x.g))];const mgMin=(S.margenMin??15)/100;
    const fila=(n,x,b)=>{const m=x.vc>0?(x.vc-x.c)/x.vc:null;return `<tr${b?' style="font-weight:700;background:#f6f7f9"':''}><td>${b?'':'&nbsp;&nbsp;'}${esc(n)}</td><td class="n">${$m(x.v)}</td><td class="n">${vi?Math.round(x.v/vi*100):0} %</td><td class="n ${m!=null&&m<mgMin?'mora':''}">${m==null?'—':Math.round(m*100)+' %'}</td><td class="n">${m==null?'—':$m(x.vc-x.c)}</td></tr>`};
    const sum=L=>L.reduce((a,x)=>({v:a.v+x.v,c:a.c+x.c,vc:a.vc+x.vc}),{v:0,c:0,vc:0});
    const bajos=TF.filter(x=>x.vc>0&&(x.vc-x.c)/x.vc<mgMin);
    $('#rp_fa').innerHTML=TF.length?(bajos.length?`<p class="aviso">⚠️ ${bajos.length==1?'Esta familia te deja':'Estas familias te dejan'} menos del ${Math.round(mgMin*100)} % de ganancia: <b>${bajos.map(x=>esc(x.f)).join(', ')}</b>. Revisá costos y márgenes.</p>`:'')+
      '<div style="overflow-x:auto"><table><tr><th>Familia</th><th class="n">Ventas</th><th class="n">% del total</th><th class="n">Margen</th><th class="n">Ganancia</th></tr>'+
      GRS.map(g=>{const X=TF.filter(x=>x.g==g);return fila(g,sum(X),true)+X.map(x=>fila(x.f,x,false)).join('')}).join('')+'</table></div>'+
      (TF.some(x=>x.f=='Sin familia')?'<p><small>Para ver todo ordenado, usá <b>Precios → 🗂️ Ordenar por familias</b>.</small></p>':''):'<p><small>No hay ventas en este período.</small></p>';
    grafico(a,b);vendedoresReporte()};
  const grafico=(a,b)=>{const h=new Date(),M=[];
    for(let i=11;i>=0;i--){const d=new Date(h.getFullYear(),h.getMonth()-i,1),k=diaLocal(d).slice(0,7);M.push({k,l:MESES[d.getMonth()]+(d.getMonth()==0||i==11?' '+String(d.getFullYear()).slice(2):''),v:0})}
    for(const o of P){const m=M.find(x=>x.k==o._d.slice(0,7));if(m)m.v+=Number(o.total||0)}
    const max=Math.max(...M.map(x=>x.v)),W=Math.max(340,Math.min(720,$('#rp_g').clientWidth||720)),H=W<500?200:230,pl=W<500?60:64,pb=28,pt=12,cw=(W-pl-8)/12,bw=Math.min(36,cw*0.6);
    if(cw<40)M.forEach(m=>m.l=m.l.split(' ')[0]);
    const paso=(()=>{if(!max)return 1;const r=max/4,p=Math.pow(10,Math.floor(Math.log10(r)));return [1,2,2.5,5,10].map(x=>x*p).find(x=>x>=r)})();
    const top=max?Math.ceil(max/paso)*paso:4,y=v=>pt+(H-pt-pb)*(1-v/top);
    const corto=v=>v>=1e6?(v/1e6).toLocaleString('es-AR',{maximumFractionDigits:1})+' M':v>=1e3?Math.round(v/1e3)+' mil':String(Math.round(v));
    let g='';for(let t=0;t<=top+1e-9;t+=paso)g+=`<line x1="${pl}" x2="${W-8}" y1="${y(t)}" y2="${y(t)}" class="gl"/><text x="${pl-8}" y="${y(t)+4}" class="ax" text-anchor="end">$ ${corto(t)}</text>`;
    const enP=k=>k+'-01'>=a.slice(0,7)+'-01'&&k+'-01'<b;
    const bars=M.map((m,i)=>{const cx=pl+cw*i+cw/2,yy=y(m.v),hh=Math.max(0,H-pb-yy),r=Math.min(4,hh/2);
      const path=hh>0?`M${cx-bw/2},${H-pb}V${yy+r}Q${cx-bw/2},${yy} ${cx-bw/2+r},${yy}H${cx+bw/2-r}Q${cx+bw/2},${yy} ${cx+bw/2},${yy+r}V${H-pb}Z`:'';
      return `<g class="bar${enP(m.k)?' on':''}" data-i="${i}"><rect x="${pl+cw*i}" y="${pt}" width="${cw}" height="${H-pt-pb}" class="hit"/>${path?`<path d="${path}"/>`:''}<text x="${cx}" y="${H-8}" class="ax" text-anchor="middle">${m.l}</text></g>`}).join('');
    $('#rp_g').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventas por mes de los últimos 12 meses">${g}<line x1="${pl}" x2="${W-8}" y1="${H-pb}" y2="${H-pb}" class="base"/>${bars}</svg><div class="tip" hidden></div>
      <details><summary><small>Ver como tabla</small></summary><table>${M.map(m=>`<tr><td>${m.l}</td><td class="n">${$m(m.v)}</td></tr>`).join('')}</table></details>`;
    const tip=$('#rp_g .tip');
    $$('#rp_g .bar').forEach(el=>{el.onmouseenter=el.onclick=()=>{const m=M[el.dataset.i];tip.hidden=false;tip.innerHTML=`<b>${m.l}</b><br>${$m(m.v)}`;
      const r=el.getBoundingClientRect(),pr=$('#rp_g').getBoundingClientRect();tip.style.left=(r.left-pr.left+r.width/2)+'px';tip.style.top=Math.max(0,(el.querySelector('path')?.getBoundingClientRect().top||r.top)-pr.top-46)+'px'};
      el.onmouseleave=()=>tip.hidden=true})};
  $('#cp_c').onclick=()=>copiarTabla(['Cliente','Pedidos','Ventas','% del total'],TC.map(x=>{const t=TC.reduce((a,y)=>a+y.v,0);return[x.n,x.p,x.v.toFixed(2).replace('.',','),(t?x.v/t*100:0).toFixed(1).replace('.',',')]}));
  $('#v').insertAdjacentHTML('beforeend','<div class="box" id="rp_v"></div><div class="box" id="rp_h"></div>');historialBox();
  $('#cp_f').onclick=()=>copiarTabla(['Sección','Familia','Ventas','Margen %','Ganancia'],TF.map(x=>[x.g,x.f,x.v.toFixed(2).replace('.',','),x.vc>0?((x.vc-x.c)/x.vc*100).toFixed(1).replace('.',','):'',x.vc>0?(x.vc-x.c).toFixed(2).replace('.',','):'']));
  $('#cp_p').onclick=()=>copiarTabla(['Producto','Unidades','Ventas','Margen %'],TP.map(x=>[x.n,x.q,x.v.toFixed(2).replace('.',','),x.sc||!x.v?'':((x.v-x.c)/x.v*100).toFixed(1).replace('.',',')]));
  pintar();
}
/* Pantalla de la PC del depósito: imprime sola lo que llega a la cola */
async function vImpresora(){
  try{localStorage.setItem('estacion_imp','1')}catch(e){}
  let cfg=await cfgJ('impresora_deposito',{w:80,activa:false});S.dep=cfg;
  const v=$('#v');v.innerHTML=`<div class="bh"><h2 style="margin:0">🖨️ Impresora del depósito</h2><button class="alt" id="im_salir">Dejar de usar este equipo como impresora</button></div>
    <div class="box"><p id="im_est" style="font-size:20px;margin:0">Conectando…</p><p><small>Dejá esta pantalla abierta (podés minimizarla). Lo que mandes a imprimir desde el celular sale acá solo.</small></p>
      <div class="g"><label class="f">Ancho del rollo<select id="im_w"><option value="58">58 mm</option><option value="80">80 mm</option></select></label></div>
      <div class="fc-acc"><button class="alt" id="im_test">Imprimir una prueba</button></div></div>
    <div class="box"><h3>Para que imprima sin preguntar (una sola vez)</h3><ol style="line-height:1.6;margin:0;padding-left:20px">
      <li>En Windows, poné la impresora térmica como <b>predeterminada</b> (Configuración → Impresoras).</li>
      <li>Hacé clic derecho en el escritorio → <b>Nuevo → Acceso directo</b>, y pegá esto:<br><code id="im_cmd" style="user-select:all;word-break:break-all">"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing "${location.origin+location.pathname}"</code> <button class="alt" id="im_cp">Copiar</button></li>
      <li>Llamalo <b>Impresora Sabores</b>, cerrá Chrome del todo y abrilo desde ese acceso directo. Entrá con tu usuario y volvé a esta pantalla (<b>Aa → Usar este equipo como impresora</b>).</li>
      <li>Para que arranque solo al prender la PC: tocá Windows + R, escribí <b>shell:startup</b> y copiá ahí el acceso directo.</li></ol>
      <p><small>Sin este acceso directo también funciona, pero en cada ticket vas a tener que tocar "Imprimir".</small></p></div>
    <div class="box"><h3>Últimos trabajos</h3><div id="im_l"><span class="skl" role="status" aria-label="Cargando"></span></div></div>`;
  $('#im_w').value=String(cfg.w||80);
  const guardar=async o=>{cfg={...cfg,...o};S.dep=cfg;await guardaCfgJ('impresora_deposito',cfg)};
  await guardar({activa:true,visto:new Date().toISOString()});
  $('#im_w').onchange=()=>guardar({w:+$('#im_w').value});
  $('#im_cp').onclick=()=>{navigator.clipboard.writeText($('#im_cmd').textContent).then(()=>toast('Copiado.'),()=>toast('Seleccioná el texto y copialo con Ctrl + C.',1))};
  $('#im_salir').onclick=async()=>{try{localStorage.removeItem('estacion_imp')}catch(e){}clearInterval(S.impT);clearInterval(S.impH);await guardar({activa:false});toast('Este equipo ya no es la impresora del depósito.');irA('inicio')};
  const est=t=>{const e=$('#im_est');if(e)e.innerHTML=t};
  const imprimir=(tit,cuerpo)=>new Promise(res=>{const f=document.createElement('iframe');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.appendChild(f);
    f.onload=()=>{setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){}setTimeout(()=>{f.remove();res()},1500)},400)};f.srcdoc=ticketDoc(tit,cuerpo,cfg.w||80,false)});
  $('#im_test').onclick=()=>imprimir('Prueba',`<div class="c h">SABORES DE MI PAÍS</div><div class="sep"></div><div class="c">Prueba de impresión</div><div class="c sm">${new Date().toLocaleString('es-AR')}</div><div class="sep"></div><div class="r g"><span>TOTAL</span><span>${$m(12345.6)}</span></div>`);
  let ocupado=false;
  const lista=async()=>{const{data}=await sb.from('cola_impresion').select('id,titulo,estado,creado_en,impreso_en').order('id',{ascending:false}).limit(15);const b=$('#im_l');if(!b)return;
    b.innerHTML=(data||[]).length?'<table>'+data.map(x=>`<tr><td>${esc(x.titulo||x.id)}</td><td><small>${new Date(x.creado_en).toLocaleString('es-AR',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})}</small></td><td>${x.estado=='impreso'?'✅ Impreso':x.estado=='error'?'⚠️ Error':'⏳ En cola'}</td></tr>`).join('')+'</table>':'<p><small>Todavía no mandaste nada.</small></p>'};
  const revisar=async()=>{if(ocupado||S.tab!='impresora')return;ocupado=true;
    try{const{data,error}=await sb.from('cola_impresion').select('*').eq('estado','pendiente').order('id').limit(5);
      if(error){est(/cola_impresion/.test(error.message)?'⚠️ Falta correr <b>impresion.sql</b> en Supabase.':'⚠️ '+esc(error.message));return}
      est(`🟢 Lista para imprimir · ${(data||[]).length?'imprimiendo '+data.length+'…':'esperando trabajos'} <small style="font-size:13px">(${cfg.w||80} mm)</small>`);
      for(const j of data||[]){await imprimir(j.titulo,j.cuerpo);await sb.from('cola_impresion').update({estado:'impreso',impreso_en:new Date().toISOString()}).eq('id',j.id)}
      if((data||[]).length)lista()}catch(e){est('⚠️ Sin conexión, reintentando…')}finally{ocupado=false}};
  clearInterval(S.impT);clearInterval(S.impH);
  S.impT=setInterval(revisar,5000);S.impH=setInterval(()=>{if(S.tab=='impresora')guardar({visto:new Date().toISOString()})},60000);
  revisar();lista();
}
/* ======================= IMPORTAR LISTA DEL PROVEEDOR ======================= */
async function leerArchivoLista(file){const n=file.name.toLowerCase();
  if(n.endsWith('.pdf')){await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,rows=[];
    for(let i=1;i<=pdf.numPages;i++){const tc=await(await pdf.getPage(i)).getTextContent();
      const it=tc.items.filter(x=>x.str.trim()).map(x=>({s:x.str.trim(),x:x.transform[4],y:x.transform[5],w:x.width}));
      const L=[];for(const t of it.sort((a,b)=>b.y-a.y||a.x-b.x)){let l=L.find(l=>Math.abs(l.y-t.y)<3);if(!l){l={y:t.y,t:[]};L.push(l)}l.t.push(t)}
      for(const l of L.sort((a,b)=>b.y-a.y)){const T=l.t.sort((a,b)=>a.x-b.x),cells=[];let prev=null;
        for(const t of T){if(prev&&t.x-(prev.x+prev.w)<6)cells[cells.length-1]+=' '+t.s;else cells.push(t.s);prev=t}rows.push(cells)}}
    return rows}
  if(/\.(xlsx|xls|ods)$/.test(n)){if(!window.XLSX)await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb=XLSX.read(await file.arrayBuffer());let rows=[];for(const sn of wb.SheetNames)rows=rows.concat(XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:false,defval:''}));return rows.map(r=>r.map(c=>String(c??'').trim()))}
  return partirTexto(await file.text())}
function partirTexto(t){return t.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>l.includes('\t')?l.split('\t'):l.includes(';')?l.split(';'):l.split(/\s{2,}/)).map(r=>r.map(c=>c.trim()))}
function importadorLista(){const box=$('#pr_imp');if(!box)return;
  box.innerHTML=`<summary><b>Importar la lista de precios del proveedor (Excel, PDF o pegado)</b></summary>
  <p><small>Subí el archivo que te manda el proveedor o pegá las filas. El CRM encuentra cada producto por código o por nombre, te muestra qué subió y vos confirmás.</small></p>
  <div class="g"><label class="f">Proveedor (ayuda a encontrar por nombre)<select id="il_pv"><option value="">Cualquiera</option></select></label>
    <label class="f">Archivo (Excel, PDF o CSV)<input type="file" id="il_f" accept=".xlsx,.xls,.ods,.csv,.txt,.pdf"></label></div>
  <textarea id="il_t" rows="5" placeholder="…o pegá acá las filas copiadas de la planilla"></textarea><button class="alt" id="il_leer">Leer lista</button><div id="il_r"></div>`;
  sb.from('proveedores').select('id,razon_social').eq('activo',true).order('razon_social').then(({data})=>{$('#il_pv').innerHTML+=(data||[]).map(p=>`<option value="${p.id}">${esc(p.razon_social)}</option>`).join('')});
  let rows=[];
  $('#il_leer').onclick=async()=>{const f=$('#il_f').files[0],t=$('#il_t').value.trim();if(!f&&!t)return toast('Elegí un archivo o pegá las filas.',1);
    $('#il_r').innerHTML='<p>Leyendo la lista…</p>';try{rows=f?await leerArchivoLista(f):partirTexto(t)}catch(e){$('#il_r').innerHTML='<p class="err">No se pudo leer el archivo: '+esc(e.message||e)+'</p>';return}
    rows=rows.filter(r=>r.some(c=>c));if(!rows.length){$('#il_r').innerHTML='<p class="err">No encontré filas en la lista.</p>';return}
    mapear()};
  const mapear=()=>{const nc=Math.max(...rows.map(r=>r.length));const col=i=>rows.map(r=>r[i]||'');
    const fr={};for(const r of rows)if(r.length>=3&&numAR(r[r.length-1])>0)fr[r.length]=(fr[r.length]||0)+1;const lm=+(Object.entries(fr).sort((a,b)=>b[1]-a[1])[0]?.[0]||nc);
    const muestra=rows.find(r=>r.length==lm&&numAR(r[r.length-1])>0)||rows[0];
    const esPrecio=v=>{const n=numAR(v);return n>0&&/\d[.,]\d{1,2}$|^\$|\d{3,}/.test(String(v).trim())&&!/^\d{8,14}$/.test(String(v).trim())};
    const sc=[...Array(nc).keys()].map(i=>{const C=col(i).filter(Boolean);const cod=new Set(S.productos.flatMap(p=>[kCod(p.codigo),kCod(p.ean),kCod(S.min[p.producto_id]?.cf)]).filter(Boolean));
      return{i,precio:C.filter(esPrecio).length/(C.length||1),cod:C.filter(v=>cod.has(kCod(v))).length+C.filter(v=>/^[A-Z0-9-]{3,14}$/i.test(v)).length*.1,txt:C.reduce((a,v)=>a+(/[a-záéíóúñ]{3,}/i.test(v)?v.length:0),0)}});
    const gP=sc.filter(x=>x.precio>.3).sort((a,b)=>b.i-a.i)[0]?.i??nc-1,gC=sc.slice().sort((a,b)=>b.cod-a.cod)[0],gD=sc.filter(x=>x.i!=gP).sort((a,b)=>b.txt-a.txt)[0]?.i??0;
    const opt=(id,g,vacio)=>`<select id="${id}">${vacio?'<option value="-1">— No tiene —</option>':''}${[...Array(nc).keys()].map(i=>`<option value="${i}" ${i==g?'selected':''}>Columna ${i+1}: ${esc(muestra[i]||'').slice(0,30)}</option>`).join('')}</select>`;
    $('#il_r').innerHTML=`<p>Leí <b>${rows.length}</b> filas. Decime qué es cada columna:</p>
      <div class="g"><label class="f">Código del producto (o EAN)${opt('il_cc',gC&&gC.cod>=1?gC.i:-1,true)}</label><label class="f">Precio${opt('il_cp',gP)}</label></div><p><small>Lo demás de cada fila (nombre, presentación, peso) se usa para encontrar por nombre los que no tienen código.</small></p>
      <div class="g"><label class="chk"><input type="checkbox" id="il_iva"> El precio es <b>sin IVA</b> (sumarle el IVA)</label><label class="chk"><input type="checkbox" id="il_bu"> El precio es <b>por caja/bulto</b> (dividir por unidades)</label>
        <label class="f">Descuento del proveedor %<input type="number" id="il_ds" step="0.1" value="0"></label></div>
      <details><summary><small>Ver las primeras filas leídas</small></summary><div class="tw"><table>${rows.slice(0,8).map(r=>'<tr>'+r.map(c=>'<td><small>'+esc(c)+'</small></td>').join('')+'</tr>').join('')}</table></div></details>
      <button id="il_bus">Buscar productos</button><div id="il_p"></div>`;
    $('#il_bus').onclick=buscar};
  const buscar=()=>{const ic=+$('#il_cc').value,ip=+$('#il_cp').value,iva=$('#il_iva').checked,bu=$('#il_bu').checked,ds=+$('#il_ds').value||0,pv=$('#il_pv').value;
    const idx={};for(const p of S.productos)for(const k of[p.codigo,p.ean,S.min[p.producto_id]?.cf].map(kCod).filter(x=>x&&x.length>=3))idx[k]=p;
    const costo=(p,pr)=>{let c=pr*(1-ds/100);if(iva)c*=1+alic(p.producto_id)/100;if(bu)c/=S.min[p.producto_id]?.b||1;return Math.round(c*100)/100};
    const usados=new Set(),M=[],resto=[];
    for(const r of rows){const pr=numAR(r[ip]);if(!(pr>0))continue;const cod=ic>=0?String(r[ic]||'').trim():'',txt=r.filter((c,k)=>k!=ip&&k!=ic&&c&&!(numAR(c)>0&&!/[a-z]/i.test(c))).join(' · ');
      if(!cod&&!txt)continue;const p=cod?idx[kCod(cod)]:null;
      if(p&&!usados.has(p.producto_id)){usados.add(p.producto_id);M.push({p,c:costo(p,pr),como:'código',sc:1,ok:true,txt:[cod,txt].filter(Boolean).join(' · '),pr})}
      else resto.push({cod,txt,pr,T:new Set(toks(r.filter((c,k)=>k!=ip&&k!=ic).join(' ')))})}
    const cand=S.productos.filter(p=>!usados.has(p.producto_id)&&(!pv||S.min[p.producto_id]?.pv==pv)).map(p=>({p,T:new Set(toks(p.descripcion))}));
    const pares=[];for(let a=0;a<resto.length;a++)for(const q of cand){const sc=parecidoT(q.T,resto[a].T);if(sc>=.6)pares.push({a,q,sc})}
    pares.sort((x,y)=>y.sc-x.sc);const fu=new Set();
    for(const x of pares){if(fu.has(x.a)||usados.has(x.q.p.producto_id))continue;fu.add(x.a);usados.add(x.q.p.producto_id);const r=resto[x.a];
      M.push({p:x.q.p,c:costo(x.q.p,r.pr),como:'nombre',sc:x.sc,ok:x.sc>=.85,txt:[r.cod,r.txt].filter(Boolean).join(' · '),pr:r.pr})}
    const NO=resto.filter((r,a)=>!fu.has(a)).map(r=>[r.cod,r.txt,r.pr].filter(Boolean).join(' · '));
    for(const x of M)x.v=+x.p.costo>0?x.c/x.p.costo-1:null;
    for(const x of M){const ap=S.min[x.p.producto_id]?.pv;x.otro=!!(pv&&ap&&ap!=pv);x.bar=x.otro&&x.c<(+x.p.costo||0)-0.005}
    if(pv)guardarCostosProv(pv,M.filter(x=>x.ok).map(x=>({id:x.p.producto_id,costo:x.c/(ppz(x.p.producto_id)||1)})),'lista importada');
    const CH=M.filter(x=>Math.abs(x.c-(+x.p.costo||0))>0.005).sort((a,b)=>Math.abs(b.v??9)-Math.abs(a.v??9));
    const igual=M.length-CH.length,sube=CH.filter(x=>x.v>0),prom=sube.length?sube.reduce((a,x)=>a+x.v,0)/sube.length:0;
    $('#il_p').innerHTML=`<div class="kp" style="margin-top:12px"><div class="box ok"><span class="lab">Encontrados</span><span class="num">${M.length}</span><span class="det">${M.filter(x=>x.como=='código').length} por código · ${M.filter(x=>x.como=='nombre').length} por nombre</span></div>
      <div class="box"><span class="lab">Cambian de costo</span><span class="num">${CH.length}</span><span class="det">${sube.length} suben (prom. +${pctf(prom*100)}) · ${igual} sin cambio</span></div>
      <div class="box ${NO.length?'alerta':''}"><span class="lab">No encontrados</span><span class="num">${NO.length}</span><span class="det">productos que no están en tu CRM</span></div></div>
      ${CH.length?`<div class="tw"><table><tr><th><input type="checkbox" id="il_all" checked style="width:auto;margin:0"></th><th>En la lista del proveedor</th><th>Tu producto</th><th class="n">Costo actual</th><th class="n">Nuevo</th><th class="n">Cambio</th></tr>
      ${CH.map((x,i)=>`<tr class="${x.ok?'':'cambio'}"><td><input type="checkbox" data-il="${i}" ${x.ok&&!x.otro?'checked':''} style="width:auto;margin:0"></td><td><small>${esc(x.txt)}</small></td><td>${esc(x.p.descripcion)}${x.otro?`<br><small class="badge">${x.bar?'💡 más barato que tu proveedor actual · ':''}otro proveedor: queda para comparar</small>`:''}<br><small>${x.como=='código'?'por código':x.ok?'por nombre':'por nombre ('+Math.round(x.sc*100)+' % parecido) — revisá'}</small></td>
        <td class="n">${x.p.costo?$m(x.p.costo):'—'}</td><td class="n"><b>${$m(x.c)}</b></td><td class="n ${x.v!=null&&Math.abs(x.v)>.5?'mora':''}">${x.v==null?'nuevo':(x.v>=0?'+':'')+pctf(x.v*100)}</td></tr>`).join('')}</table></div>
      <button id="il_ok">Actualizar los costos marcados</button>`:'<p>Todos los costos encontrados ya están al día.</p>'}
      ${NO.length?`<details><summary><small>Ver los ${NO.length} no encontrados</small></summary><ul>${NO.slice(0,60).map(x=>'<li><small>'+esc(x)+'</small></li>').join('')}</ul><button class="alt" id="il_cno">Copiar para Excel</button></details>`:''}`;
    $('#il_all')&&($('#il_all').onchange=e=>$$('[data-il]').forEach(c=>c.checked=e.target.checked));
    $('#il_cno')&&($('#il_cno').onclick=()=>copiarTabla(['No encontrado'],NO.map(x=>[x])));
    $('#il_ok')&&($('#il_ok').onclick=async()=>{const it=[...$$('[data-il]:checked')].map(c=>CH[+c.dataset.il]).map(x=>({id:x.p.producto_id,costo:x.c}));if(!it.length)return toast('No marcaste ningún producto.',1);
      if(!confirm('¿Actualizar el costo de '+it.length+' productos? Los precios de venta cambian solos.'))return;$('#il_ok').disabled=true;
      const{data,error}=await sb.rpc('fijar_costos',{p_items:it});if(error){$('#il_ok').disabled=false;return toast(error.message,1)}
      await recargarProductos();vPrecios();toast((data??it.length)+' costos actualizados desde la lista del proveedor.')})};
}
/* ======================= CONTEO DE INVENTARIO POR PARTES ======================= */
function conteoPartes(){
  S.cnK=S.cnK||'marca';const grp=p=>S.cnK=='peso'?(esPeso(p.producto_id)?'Quesos y fiambres':null):p[S.cnK]||(S.cnK=='marca'?'Sin marca':'Sin familia');
  const cnVal=(id,v)=>{v=String(v).trim();if(!esPeso(id))return Math.max(0,Math.round(+v));const kg=sumaKg(v),n=v.replace(/,/g,'.').split(/[+\s;]+/).filter(x=>+x>0).length;
    if(esKg(id))return Math.round(kg*1000)/1000;if(/[+;]|[.,]\d/.test(v)){aprenderPeso(id,kg,n,.3).catch(()=>{});return n}return Math.max(0,Math.round(+v))};
  const grupos=()=>{const g={};for(const p of S.productos){if(S.min[p.producto_id]?.a===false)continue;const k=grp(p);if(k==null)continue;const r=g[k]=g[k]||{k,n:0,uc:null,nunca:0};r.n++;const u=S.min[p.producto_id]?.uc;if(!u)r.nunca++;else if(!r.uc||u<r.uc)r.uc=u}
    return Object.values(g).sort((a,b)=>(b.nunca>0)-(a.nunca>0)||String(a.uc||'').localeCompare(String(b.uc||''))||b.n-a.n)};
  const hace=d=>{if(!d)return 'nunca';const n=Math.floor((Date.now()-new Date(d+'T12:00'))/864e5);return n<=0?'hoy':n==1?'ayer':'hace '+n+' días'};
  const m=document.createElement('div');m.className='modal';document.body.appendChild(m);
  const elegir=()=>{const G=grupos();m.innerHTML=`<div class="mc"><div class="bh"><h3>Conteo de inventario por partes</h3><button class="alt" id="cn_x">Cerrar</button></div>
    <p><small>Contá una marca o familia por vez, con el celular en el depósito. No hace falta parar la venta. Arriba aparecen las que hace más tiempo no contás.</small></p>
    <div class="sub">${[['marca','Por marca'],['familia','Por familia'],['peso','⚖️ Quesos y fiambres']].map(([k,t])=>`<button class="${S.cnK==k?'':'alt'}" data-cnk="${k}">${t}</button>`).join('')}</div>
    <div class="tw"><table>${G.map(g=>{let pend=0;try{pend=Object.keys(JSON.parse(localStorage.getItem('conteo_'+S.cnK+'_'+g.k)||'{}')).length}catch(e){}
      return`<tr class="clic" data-cng="${esc(g.k)}"><td><b>${esc(g.k)}</b><br><small>${g.n} productos${pend?' · <b>conteo empezado ('+pend+')</b>':''}</small></td><td><small>${g.nunca==g.n?'Nunca contada':g.nunca?g.nunca+' sin contar nunca':'Último conteo '+hace(g.uc)}</small></td></tr>`}).join('')}</table></div></div>`;
    $('#cn_x').onclick=()=>m.remove();$$('[data-cnk]').forEach(b=>b.onclick=()=>{S.cnK=b.dataset.cnk;elegir()});$$('[data-cng]').forEach(r=>r.onclick=()=>contar(r.dataset.cng))};
  const contar=g=>{const key='conteo_'+S.cnK+'_'+g;let C={};try{C=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
    const P=S.productos.filter(p=>S.min[p.producto_id]?.a!==false&&grp(p)==g).sort((a,b)=>a.descripcion.localeCompare(b.descripcion));
    const sv=()=>{try{localStorage.setItem(key,JSON.stringify(C))}catch(e){}};
    const draw=()=>{const n=Object.keys(C).length;m.innerHTML=`<div class="mc"><div class="bh"><h3>Contando: ${esc(g)}</h3><button class="alt" id="cn_v">← Volver</button></div>
      <p><small>Escribí lo que hay de cada producto, o escaneá el código: cada lectura suma 1. Lo que vas contando queda guardado aunque cierres.</small></p>
      <div class="fc-acc"><button class="alt" id="cn_sc">📷 Escanear</button><label class="chk"><input type="checkbox" id="cn_vs" ${S.cnVer?'checked':''}> Ver lo que dice el sistema</label></div>
      <div class="tw"><table>${P.map(p=>{const id=p.producto_id,b=bul(id);return`<tr id="cr_${id}"><td>${esc(p.descripcion)}<br><small>${esc(p.codigo)}${S.cnVer?' · sistema: '+nf(stk(id).f):''}${b?' · '+esc(b.t)+' × '+b.n:''}</small></td>
        <td class="n" style="white-space:nowrap">${esPeso(id)?`<input type="text" inputmode="decimal" data-cn="${id}" value="${C[id]??''}" placeholder="${esKg(id)?'kg: 3,5 + 3,6':'piezas o 3,5 + 3,6'}" style="width:130px;margin:0">${esKg(id)?' kg':' pz.'}`:`<input type="number" min="0" step="1" data-cn="${id}" value="${C[id]??''}" style="width:80px;margin:0" inputmode="numeric">`}${b?`<button class="alt" data-cb="${id}" style="padding:4px 8px;margin-left:4px">+${b.n}</button>`:''}</td></tr>`}).join('')}</table></div>
      <p><b>${n}</b> de ${P.length} contados.</p>
      <div class="fc-acc"><button id="cn_rev" ${n?'':'disabled'}>Revisar diferencias</button><button class="alt" id="cn_0">Poner 0 en los que faltan</button><a class="lnk" id="cn_bo">Borrar este conteo</a></div></div>`;
      $('#cn_v').onclick=elegir;$('#cn_vs').onchange=e=>{S.cnVer=e.target.checked;draw()};
      $$('[data-cn]').forEach(i=>i.onchange=()=>{const v=i.value;if(v==='')delete C[i.dataset.cn];else C[i.dataset.cn]=cnVal(i.dataset.cn,v);sv();setTimeout(draw)});
      $$('[data-cb]').forEach(b=>b.onclick=()=>{const id=b.dataset.cb;C[id]=(C[id]||0)+bul(id).n;sv();draw()});
      $('#cn_0').onclick=()=>{const f=P.filter(p=>C[p.producto_id]==null);if(!f.length)return;if(!confirm('¿Poner 0 en los '+f.length+' productos que no contaste? Solo si de verdad no hay.'))return;for(const p of f)C[p.producto_id]=0;sv();draw()};
      $('#cn_bo').onclick=()=>{if(!confirm('¿Borrar lo que llevás contado de '+g+'?'))return;C={};sv();draw()};
      $('#cn_sc').onclick=()=>escanear('Contando '+g,p=>{if(!P.some(x=>x.producto_id==p.producto_id))return '✘ '+p.descripcion+' no es de '+g;if(esKg(p.producto_id)){const w=sumaKg(prompt('Peso de la pieza de '+p.descripcion+' (kg, el de la etiqueta)','')||'');if(!(w>0))return '✘ Sin peso: no se sumó';C[p.producto_id]=Math.round(((+C[p.producto_id]||0)+w)*1000)/1000}else C[p.producto_id]=(+C[p.producto_id]||0)+1;sv();draw();return '✔ '+p.descripcion+': '+C[p.producto_id]+(esKg(p.producto_id)?' kg':'')});
      $('#cn_rev').onclick=revisar};
    const revisar=()=>{const D=P.filter(p=>C[p.producto_id]!=null).map(p=>{const s=stk(p.producto_id).f,c=C[p.producto_id];return{p,s,c,d:c-s,v:(c-s)*Number(p.costo||0)}});
      const dif=D.filter(x=>x.d!=0),vt=dif.reduce((a,x)=>a+x.v,0);
      m.innerHTML=`<div class="mc"><div class="bh"><h3>Diferencias · ${esc(g)}</h3><button class="alt" id="cn_b">← Seguir contando</button></div>
        <p>Contaste <b>${D.length}</b> productos: <b>${D.length-dif.length}</b> coinciden y <b>${dif.length}</b> tienen diferencia${dif.length?' (en plata: <b class="'+(vt<0?'mora':'')+'">'+$s(vt)+'</b> a costo)':''}.</p>
        ${dif.length?`<div class="tw"><table><tr><th>Producto</th><th class="n">Sistema</th><th class="n">Contado</th><th class="n">Diferencia</th></tr>${dif.sort((a,b)=>Math.abs(b.v)-Math.abs(a.v)).map(x=>`<tr><td>${esc(x.p.descripcion)}</td><td class="n">${nf(x.s)}</td><td class="n">${nf(x.c)}</td><td class="n ${x.d<0?'mora':''}"><b>${x.d>0?'+':''}${nf(x.d)}</b></td></tr>`).join('')}</table></div>`:''}
        <button id="cn_ok">Confirmar y ajustar el stock</button></div>`;
      $('#cn_b').onclick=draw;
      $('#cn_ok').onclick=async()=>{$('#cn_ok').disabled=true;const{data,error}=await sb.rpc('contar_stock',{p_items:D.map(x=>({id:x.p.producto_id,contado:x.c})),p_motivo:'Conteo '+g});
        if(error){$('#cn_ok').disabled=false;return toast(/contar_stock/.test(error.message)?'Falta correr mejoras-clientes.sql en Supabase.':error.message,1)}
        try{localStorage.removeItem(key)}catch(e){}await cargarStock();m.remove();toast('Listo: '+(data??D.length)+' productos de '+g+' contados'+(dif.length?' y '+dif.length+' ajustados.':', todo coincidía.'));if(S.tab=='stock')vStock()}};
    draw()};
  elegir();
}
async function vRecorridos(){const box=$('#cs');if(!box)return;S.rcD=S.rcD||diaLocal(new Date());
  const pf=await sb.from('perfiles').select('id,nombre,rol,activo');const U=(pf.data||[]).filter(u=>u.activo!==false&&['vendedor','dueno'].includes(u.rol));if(!S.rcU)S.rcU=(U.find(u=>u.rol=='vendedor')||U.find(u=>u.id==S.perfil.id)||U[0])?.id;
  const d0=new Date(S.rcD+'T00:00'),d1=new Date(d0.getTime()+864e5);
  const[vi,pe]=await Promise.all([sb.from('contactos_clientes').select('cliente_id,fecha,tipo,detalle,lat,lng,dist_m,usuario_id').eq('usuario_id',S.rcU).gte('fecha',d0.toISOString()).lt('fecha',d1.toISOString()).order('fecha'),
    sb.from('pedidos').select('numero,total,cliente_id,creado_en,estado').eq('vendedor_id',S.rcU).neq('estado','cancelado').gte('creado_en',d0.toISOString()).lt('creado_en',d1.toISOString()).order('creado_en')]);
  if(vi.error&&/lat|dist_m/.test(vi.error.message)){box.innerHTML='<div class="aviso">Falta actualizar la base para guardar la ubicación de las visitas.</div>';return}
  const V=(vi.data||[]).filter(x=>['visita','seguimiento','llamada'].includes(x.tipo)),P=pe.data||[];
  const T=[...V.map(x=>({f:x.fecha,c:x.cliente_id,t:x.tipo=='visita'?(x.detalle||'Visita'):x.tipo=='llamada'?'Llamada':(x.detalle||'Seguimiento'),g:x.lat!=null?[+x.lat,+x.lng]:null,d:x.dist_m,k:'vis'})),...P.map(o=>({f:o.creado_en,c:o.cliente_id,t:'Pedido N° '+o.numero+' · '+$m0(o.total),k:'ped',v:+o.total||0}))].sort((a,b)=>String(a.f).localeCompare(String(b.f)));
  const tot=P.reduce((s,o)=>s+(+o.total||0),0),cl=new Set(T.map(x=>x.c)).size,lejos=V.filter(x=>x.dist_m>300).length,hh=f=>new Date(f).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  box.innerHTML=`<div class="rc-f"><select id="rc_u">${U.map(u=>`<option value="${u.id}" ${u.id==S.rcU?'selected':''}>${esc(String(u.nombre||'Sin nombre').trim())}${u.rol=='dueno'?' (socio)':''}</option>`).join('')}</select><input type="date" id="rc_d" value="${S.rcD}"></div>
    <div class="rc-k"><div><b>${V.filter(x=>x.tipo=='visita').length}</b><small>visitas</small></div><div><b>${cl}</b><small>clientes</small></div><div><b>${P.length}</b><small>pedidos</small></div><div><b>${$k(tot)}</b><small>vendido</small></div></div>
    ${lejos?`<div class="aviso">${IC('alert',16)} ${lejos==1?'1 visita quedó registrada':lejos+' visitas quedaron registradas'} lejos del negocio (más de 300 m).</div>`:''}
    <div id="rc_map" class="rc-map"></div>
    <div class="box"><h3>Recorrido del día</h3>${T.length?`<div class="tl">${T.map((x,i)=>`<div class="tl-i tl-${x.k=='ped'?'ped':'vis'}"><span class="tl-ic">${x.k=='ped'?IC('cart',16):'<b class="rc-n">'+(T.filter((y,j)=>j<=i&&y.k=='vis').length)+'</b>'}</span><div class="tl-c"><div class="tl-h"><b>${esc(nomCli(x.c)||'Cliente')}</b> · ${esc(x.t)}</div>${x.k=='vis'?`<div class="tl-x"><small>${x.g?(x.d!=null?(x.d>300?`<span class="mal">${IC('alert',13)} a ${kmTxt(x.d)} del negocio</span>`:`<span class="ok">${IC('check',13)} en el negocio (${kmTxt(x.d)})</span>`):'con ubicación'):'sin ubicación'}</small></div>`:''}</div><small class="tl-f">${hh(x.f)}</small></div>`).join('')}</div>`:vacioHTML('Ese día no hay visitas ni pedidos registrados.','map',null,1)}</div>`;
  $('#rc_u').onchange=e=>{S.rcU=e.target.value;vRecorridos()};$('#rc_d').onchange=e=>{S.rcD=e.target.value||diaLocal(new Date());vRecorridos()};
  const pts=T.filter(x=>x.g);const cg=c=>{const x=S.clientes.find(y=>y.id==c);return x&&x.lat!=null?[+x.lat,+x.lng]:null};
  const MP=[...pts.map(x=>({g:x.g,x})),...T.filter(x=>x.k=='ped'&&cg(x.c)).map(x=>({g:cg(x.c),x}))];
  if(!MP.length){$('#rc_map').remove();return}
  try{if(!window.L){const l=document.createElement('link');l.rel='stylesheet';l.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(l);await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js')}}catch(e){$('#rc_map').remove();return}
  if(!$('#rc_map'))return;const map=L.map('rc_map');L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  const ruta=pts.map(x=>x.g);if(ruta.length>1)L.polyline(ruta,{color:'#7b2d3e',weight:4,opacity:.7,dashArray:'6 8'}).addTo(map);
  let n=0;MP.forEach(({g,x})=>{const vis=x.k=='vis';if(vis)n++;L.marker(g,{icon:L.divIcon({className:'rc-pin '+(vis?(x.d>300?'lejos':''):'ped'),html:vis?String(n):'$',iconSize:[28,28]})}).addTo(map).bindPopup(`<b>${esc(nomCli(x.c)||'Cliente')}</b><br>${hh(x.f)} · ${esc(x.t)}`)});
  map.fitBounds(L.latLngBounds(MP.map(m=>m.g)).pad(.2),{maxZoom:16})}
/* ======================= VENDEDORES Y COMISIONES (Reportes) ======================= */
async function vendedoresReporte(){const box=$('#rp_v');if(!box)return;
  const[a,b]=rango(S.rp||'mes');
  const[ve,pe]=await Promise.all([sb.rpc('vendedores'),todo(()=>sb.from('pedidos').select('id,vendedor_id,total,estado,creado_en,origen').not('estado','in','(pendiente,cancelado)').gte('creado_en',tsAR(a)).lt('creado_en',tsAR(b)).order('numero'))]);
  let V=ve.data;if(ve.error){const r=await sb.from('perfiles').select('id,nombre,rol');V=(r.data||[]).map(x=>({...x,comision_pct:0}))}
  const g={};for(const o of pe.data||[]){const k=o.vendedor_id||'—';const r=g[k]=g[k]||{n:0,v:0,on:0};r.n++;r.v+=Number(o.total||0);if(o.origen=='online'||o.origen=='fijo')r.on++}
  const L=Object.entries(g).map(([id,r])=>{const p=V.find(x=>x.id==id);return{id,nom:p?.nombre||'Sin vendedor',pct:Number(p?.comision_pct||0),...r,neto:r.v/1.21}}).sort((x,y)=>y.v-x.v);
  const tot=L.reduce((s,x)=>s+x.v,0),dueno=S.perfil.rol=='dueno';
  box.innerHTML=`<div class="bh"><h3>Vendedores${dueno?' y comisiones':''}</h3>${dueno&&L.length?'<button class="alt" id="cp_v">Copiar para Excel</button>':''}</div>
    ${L.length?`<table><tr><th>#</th><th>Vendedor</th><th class="n">Pedidos</th><th class="n">Ventas</th><th class="n">% del total</th>${dueno?'<th class="n">Comisión %</th><th class="n">Comisión $</th>':''}</tr>
    ${L.map((x,i)=>`<tr><td>${i==0?'🥇':i==1?'🥈':i==2?'🥉':i+1}</td><td>${esc(x.nom)}${x.on?`<br><small>${x.on} online o fijos</small>`:''}</td><td class="n">${x.n}</td><td class="n">${$m(x.v)}</td><td class="n">${tot?Math.round(x.v/tot*100):0} %</td>
      ${dueno?`<td class="n">${x.id!='—'?`<input type="number" min="0" max="50" step="0.5" value="${x.pct}" data-cm="${x.id}" style="width:70px;margin:0;text-align:right">`:'—'}</td><td class="n"><b>${$m(x.neto*x.pct/100)}</b></td>`:''}</tr>`).join('')}</table>
    ${dueno?'<p><small>La comisión se calcula sobre las ventas sin IVA de los pedidos aprobados en adelante del período.</small></p>':''}`:'<p><small>No hay ventas en este período.</small></p>'}`;
  $$('#rp_v [data-cm]').forEach(i=>i.onchange=async()=>{const{error}=await sb.rpc('fijar_comision',{p_perfil:i.dataset.cm,p_pct:+i.value||0});if(error)return toast(/fijar_comision/.test(error.message)?'Falta correr control.sql en Supabase.':error.message,1);toast('Comisión guardada.');vendedoresReporte()});
  $('#cp_v')&&($('#cp_v').onclick=()=>copiarTabla(['Vendedor','Pedidos','Ventas','Ventas sin IVA','Comisión %','Comisión $'],L.map(x=>[x.nom,x.n,xl(x.v),xl(x.neto),String(x.pct).replace('.',','),xl(x.neto*x.pct/100)])));
}
async function historialBox(){const box=$('#rp_h');if(!box||S.perfil.rol!='dueno')return;
  S.hT=S.hT||'';S.hD=S.hD||7;
  let q=sb.from('historial_cambios').select('*').gte('fecha',new Date(Date.now()-S.hD*864e5).toISOString()).order('fecha',{ascending:false}).limit(300);if(S.hT)q=q.eq('tabla',S.hT);
  const[{data,error},ve]=await Promise.all([q,sb.rpc('vendedores')]);
  if(error){box.innerHTML='<h3>Historial de cambios</h3><p><small>Para ver quién cambió qué, corré control.sql en Supabase.</small></p>';return}
  const quien=id=>id?((ve.data||[]).find(p=>p.id==id)?.nombre||'Usuario'):'Sistema';
  const val=v=>v==null?'vacío':typeof v=='number'?(Math.abs(v)>=100?$m(v):nf(v)):Array.isArray(v)?v.join(', '):typeof v=='boolean'?(v?'sí':'no'):/^\d{4}-\d\d-\d\d/.test(v)?fd(String(v).slice(0,10)):String(v).slice(0,60);
  const quien2=h=>{const c=h.cambios||{},g=k=>Array.isArray(c[k])?c[k][1]:c[k];
    if(h.tabla=='productos')return esc(S.productos.find(p=>p.producto_id==h.registro_id)?.descripcion||g('descripcion')||'Producto');
    if(h.tabla=='clientes')return esc(S.clientes.find(x=>x.id==h.registro_id)?.razon_social||g('razon_social')||'Cliente');
    if(h.tabla=='pedido_items')return esc(nomProd(g('producto_id'))||'');
    return g('numero')?'N° '+g('numero'):g('nombre')?esc(g('nombre')):g('lista')?esc(g('lista')):''};
  const det=h=>{if(h.accion!='cambio')return h.accion=='alta'?'<i>creado</i>':'<i>borrado</i>';
    return Object.entries(h.cambios||{}).filter(([k])=>!['id','pedido_id','cliente_id','producto_id','usuario_id','vendedor_id','creado_por','entregado_en','ultimo_conteo','ultimo_generado'].includes(k)).slice(0,4)
      .map(([k,[a,b]])=>`${CAMPO_H[k]||k.replace(/_/g,' ')}: ${esc(k=='estado'?(EST_TXT[a]||a):val(a))} → <b>${esc(k=='estado'?(EST_TXT[b]||b):val(b))}</b>`).join('<br>')||'<i>sin cambios visibles</i>'};
  const V=(data||[]).filter(h=>h.accion!='cambio'||det(h)!='<i>sin cambios visibles</i>');
  box.innerHTML=`<div class="bh"><h3>Historial de cambios</h3><div class="fc-acc"><select id="h_t" style="width:auto;margin:0"><option value="">Todo</option>${Object.entries(TAB_H).map(([k,t])=>`<option value="${k}" ${S.hT==k?'selected':''}>${t}</option>`).join('')}</select>
    <select id="h_d" style="width:auto;margin:0">${[[1,'Hoy'],[7,'7 días'],[30,'30 días']].map(([n,t])=>`<option value="${n}" ${S.hD==n?'selected':''}>${t}</option>`).join('')}</select></div></div>
    ${V.length?`<div class="tw"><table><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Cambio</th></tr>${V.slice(0,150).map(h=>`<tr><td><small>${new Date(h.fecha).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></td><td><small>${esc(quien(h.usuario_id))}</small></td><td>${TAB_H[h.tabla]||h.tabla} <small>${quien2(h)}</small></td><td><small>${det(h)}</small></td></tr>`).join('')}</table></div>`:'<p><small>No hay cambios en este período.</small></p>'}`;
  $('#h_t').onchange=e=>{S.hT=e.target.value;historialBox()};$('#h_d').onchange=e=>{S.hD=+e.target.value;historialBox()};
}
/* ======================= ORDENAR POR FAMILIAS (las del catálogo) ======================= */
async function ordenarFamilias(){
  const m=document.createElement('div');m.className='modal';document.body.appendChild(m);
  m.innerHTML=`<div class="mc fa"><div class="bh"><h3>Ordenar por familias</h3><button class="alt" id="of_x">Cerrar</button></div><p id="of_t">Analizando tus productos…</p><div id="of_r"></div><p id="of_e"></p></div>`;
  $('#of_x').onclick=()=>m.remove();const est=t=>$('#of_e').innerHTML=t;
  await catalogoFotos();
  const bk=await sb.from('config_app').select('valor').eq('clave','familias_backup').maybeSingle();
  const hayBk=!!(bk.data&&bk.data.valor);
  const R=[],sin=[];
  for(const p of S.productos){const cat=catPorCodigo(p.codigo,p.descripcion)||catPorCodigo(S.min[p.producto_id]?.cf,p.descripcion);
    const nueva=cat?.fa||famPorDescripcion(p.descripcion),act=(p.familia||'').trim();
    if(!cat&&famGrupo(act)=='Heladería y panadería')continue; /* los del rubro heladería ya vienen con su familia */
    if(!nueva){sin.push(p);continue}
    if(nueva.toUpperCase()==act.toUpperCase())continue;
    R.push({p,act,nueva,por:cat?'código':'nombre',ok:true})}
  const{data:PR}=await sb.from('promociones').select('id,nombre,alcance_valor,activa').eq('alcance','familia');
  const promos=(PR||[]).filter(x=>x.activa);
  const pintar=()=>{
    const G={};for(const r of R)(G[r.nueva]=G[r.nueva]||[]).push(r);
    const nm=R.filter(r=>r.ok).length;
    $('#of_t').innerHTML=`Te propongo ordenar tus productos en las familias del catálogo (Jamón cocido, Quesos duros, Yerba mate…). Las busqué por <b>código</b> y, si no estaba en el catálogo, por el <b>nombre</b> del producto. Revisá y destildá lo que no quieras cambiar.<br><small>${S.productos.length} productos · <b>${R.length}</b> cambian de familia · ${S.productos.length-R.length-sin.length} ya estaban bien · ${sin.length} no los pude ubicar (quedan como están).</small>`;
    $('#of_r').innerHTML=(promos.length?`<p class="aviso">Tenés ${promos.length} ${promos.length==1?'promoción activa':'promociones activas'} por familia (${promos.map(x=>esc(x.nombre)).join(', ')}). Si todos sus productos pasan a una misma familia nueva, la actualizo sola; si no, te aviso para que la revises.</p>`:'')+
      (R.length?Object.keys(G).sort(famCmp).map(f=>`<h4 style="margin:14px 0 6px">${esc(f)} <small>(${G[f].length})</small></h4>`+G[f].map(r=>{const i=R.indexOf(r);return `<label class="chk" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" data-of="${i}" ${r.ok?'checked':''}><span>${esc(r.p.codigo||'')} · ${esc(r.p.descripcion)}<br><small>${r.act?'Antes: '+esc(r.act):'Sin familia'} · por ${r.por}</small></span></label>`}).join('')).join(''):'<p>Todos tus productos ya están en su familia.</p>')+
      (sin.length?`<details style="margin-top:12px"><summary>${sin.length} ${sin.length==1?"producto que no pude ubicar":"productos que no pude ubicar"}</summary><small>${sin.slice(0,200).map(p=>esc(p.descripcion)).join(' · ')}</small></details>`:'')+
      `<div class="fc-acc" style="margin-top:12px">${R.length?`<button id="of_ok">Cambiar ${nm} ${nm==1?'producto':'productos'}</button><a class="lnk" id="of_all">Marcar todos</a> · <a class="lnk" id="of_none">Desmarcar todos</a>`:''}${hayBk?` <button class="alt" id="of_undo">Volver a las familias anteriores</button>`:''}</div>`;
    m.querySelectorAll('[data-of]').forEach(c=>c.onchange=()=>{R[c.dataset.of].ok=c.checked;const n=R.filter(r=>r.ok).length;$('#of_ok').textContent=`Cambiar ${n} ${n==1?'producto':'productos'}`});
    $('#of_all')&&($('#of_all').onclick=()=>{R.forEach(r=>r.ok=true);pintar()});$('#of_none')&&($('#of_none').onclick=()=>{R.forEach(r=>r.ok=false);pintar()});
    $('#of_ok')&&($('#of_ok').onclick=guardar);$('#of_undo')&&($('#of_undo').onclick=deshacer)};
  const aplicar=async(M)=>{const P={};for(const[id,f]of Object.entries(M))(P[f]=P[f]||[]).push(id);
    for(const[f,ids]of Object.entries(P))for(let k=0;k<ids.length;k+=100){const{error}=await sb.from('productos').update({familia:f||null}).in('id',ids.slice(k,k+100));if(error)throw error}
    for(const p of S.productos)if(p.producto_id in M)p.familia=M[p.producto_id]||null;guardarCache()};
  async function guardar(){const A=R.filter(r=>r.ok);if(!A.length)return toast('No marcaste ningún producto.',1);
    $('#of_ok').disabled=true;est('Guardando…');
    try{
      const old={};for(const r of A)old[r.p.producto_id]=r.act;
      const{error:e1}=await sb.from('config_app').upsert({clave:'familias_backup',valor:JSON.stringify({fecha:new Date().toISOString(),f:old})});if(e1)throw e1;
      // promociones por familia: si todos sus productos van a una misma familia nueva, la actualizo
      const avisos=[];
      for(const pr of promos){const v=String(pr.alcance_valor||'').toUpperCase();const deEsa=S.productos.filter(p=>String(p.familia||'').toUpperCase()==v);
        const dest=new Set(deEsa.map(p=>{const r=A.find(x=>x.p.producto_id==p.producto_id);return r?r.nueva:p.familia}));
        if(dest.size==1){const nv=[...dest][0];if(String(nv).toUpperCase()!=v){const{error}=await sb.from('promociones').update({alcance_valor:nv}).eq('id',pr.id);if(!error)avisos.push(`«${pr.nombre}» ahora aplica a ${nv}.`)}}
        else if(deEsa.some(p=>A.find(x=>x.p.producto_id==p.producto_id)))avisos.push(`Revisá la promoción «${pr.nombre}»: sus productos quedaron en varias familias.`)}
      const M={};for(const r of A)M[r.p.producto_id]=r.nueva;await aplicar(M);
      for(const r of A){r.act=r.nueva;r.hecho=true}R.splice(0,R.length,...R.filter(r=>!r.hecho));
      if(typeof cargarPromos=='function')cargarPromos();
      pintar();est(`Listo: ${A.length} productos ordenados por familia.${avisos.length?'<br>'+avisos.map(esc).join('<br>'):''}`);toast(A.length+' productos ordenados por familia.');
      if(typeof vPrecios=='function'&&$('#pr_q'))vPrecios()}
    catch(e){est('No se pudo guardar: '+esc(e.message));$('#of_ok')&&($('#of_ok').disabled=false)}}
  async function deshacer(){const{data}=await sb.from('config_app').select('valor').eq('clave','familias_backup').maybeSingle();
    let B;try{B=JSON.parse(data?.valor||'')}catch(e){B=null}if(!B||!B.f)return toast('No hay un cambio anterior para deshacer.',1);
    try{await aplicar(B.f);await sb.from('config_app').delete().eq('clave','familias_backup');toast('Volví a las familias anteriores.');m.remove();if(typeof vPrecios=='function'&&$('#pr_q'))vPrecios()}
    catch(e){est('No se pudo deshacer: '+esc(e.message))}}
  pintar();
}
/* Mensaje predeterminado para mandar el folleto por WhatsApp (sale solo al compartir) */
function flMsg(f){const ic=f.icono||'',env=S.vcfg?.envio,ce=S.vcfg?.costoEnvio,mes=flMes();
  const que=f.lista||('productos para '+String(f.rubro||'').toLowerCase()+'s');
  let B=f.msg;if(!B||!B.length){B=[];const hay=xs=>(xs||[]).some(x=>{try{return!!flItem(x)}catch(e){return true}});for(const pg of f.paginas||[]){const T=pg.tipo=='lista'?(pg.secciones||[]).filter(s=>hay(s.items)).map(s=>s.t):hay(pg.items)?[pg.titulo]:[];for(let t of T){t=String(t||'').split(' · ')[0].trim();if(t&&!B.includes(t))B.push(t)}}B=B.map(t=>'• '+t)}
  const L=[ic+' *'+[f.t1,f.t2].filter(Boolean).join(' ')+'* '+ic,'¡Hola! Te comparto nuestra lista de *'+que+'* con precios mayoristas con IVA ('+mes+').','',f.intro||'Tenemos:',...B,''];
  if(env)L.push('🚚 *Envío GRATIS desde '+flPes(env)+'*'+(ce?' (si el pedido es menor, el envío cuesta '+flPes(ce)+')':''),'');
  L.push('📲 Hacé tu pedido por acá'+(S.telEmp?' o al *'+S.telEmp+'*':''),'','*Sabores de mi País* · Precios sujetos a cambio');
  return L.join('\n')}
/* datos vivos de un producto del folleto: precio mayorista con IVA, foto, cómo se vende */
function flItem(x){const p=S.productos.find(q=>q.producto_id==x.id),m=S.min[x.id];if(!p||!m||m.a===false)return null;const pr=+p.precio_mayorista;if(!(pr>0))return null;
  let suf='c/u',det='',dets=null,v=pr;const b=bul(x.id);
  if(esPeso(x.id)){const pz=ppz(x.id);if(pz){v=pr/pz;suf='/kg';det='Pieza ≈ '+nf(Math.round(pz*10)/10)+' kg · peso real'}else{suf='/kg';det=b?b.t+' '+b.n+' kg: '+flPes(pr*b.n):'Se cobra el peso real'}}
  else if(b){const D=[];if(m.ud>1&&m.ud<b.n)D.push('Display x '+m.ud+': '+flPes(pr*m.ud));D.push(b.t+' x '+b.n+': '+flPes(pr*b.n));
    if(m.bp>0)D.push('Pallet x '+m.bp+' '+String(b.t||'caja').toLowerCase()+(m.bp==1?'':'s')+': '+flPes(Math.round(pr*b.n*m.bp)));det=D.join(' · ');dets=D}
  return{n:x.n||p.descripcion,cod:String(p.codigo||'').trim(),p:v,suf,det,dets,foto:m.foto||''}}
function flLineas(c,t,maxW,maxL){const w=String(t).split(/\s+/),L=[];let cur='';for(const x of w){const tt=cur?cur+' '+x:x;if(c.measureText(tt).width<=maxW)cur=tt;else{if(cur)L.push(cur);cur=x}}if(cur)L.push(cur);return L.slice(0,maxL)}
async function flPagina(f,n,total,cuerpo,logo){const{W,H,CAB,PIE,FONT}=FL,cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
  c.fillStyle=FL.CREMA;c.fillRect(0,0,W,H);
  const g=c.createLinearGradient(0,0,0,CAB);g.addColorStop(0,MARCA.n);g.addColorStop(1,MARCA.c);c.fillStyle=g;c.fillRect(0,0,W,CAB);
  let tx=44;if(logo){const lh=230,lw=logo.width*lh/logo.height,ly=(CAB-lh)/2-4;c.save();c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=22;c.shadowOffsetY=6;c.drawImage(logo,30,ly,lw,lh);c.restore();tx=30+lw+24}
  c.textBaseline='top';c.fillStyle='#fff';c.font=`800 64px ${FONT}`;c.fillText(f.t1||'',tx,52);
  let fs=64;c.font=`800 ${fs}px ${FONT}`;while(c.measureText(f.t2||'').width>W-tx-235&&fs>40){fs-=2;c.font=`800 ${fs}px ${FONT}`}c.fillText(f.t2||'',tx,122+(64-fs)/2);
  c.fillStyle=FL.AMA;c.font=`800 30px ${FONT}`;c.fillText(f.lema||'',tx,204);
  c.fillStyle='rgba(225,228,238,1)';c.font=`400 23px ${FONT}`;c.fillText('Precios mayoristas con IVA · '+flMes(),tx,250);
  c.font=`150px ${FONT}`;c.textAlign='center';c.fillText(f.icono||'',W-115,70);c.textAlign='right';c.font=`600 22px ${FONT}`;c.fillStyle='rgba(225,228,238,1)';c.fillText(n+'/'+total,W-44,CAB-50);c.textAlign='left';
  await cuerpo(c);
  // pie: envío + WhatsApp
  const yb=H-PIE,env=S.vcfg?.envio,ce=S.vcfg?.costoEnvio;
  if(env){c.fillStyle=FL.AMA;c.fillRect(0,yb,W,86);c.fillStyle=MARCA.n;c.textBaseline='middle';const msg='ENVÍO GRATIS desde '+flPes(env);c.font=`800 36px ${FONT}`;const mw=c.measureText(msg).width,bx=(W-(mw+100))/2;
    c.font=`48px ${FONT}`;c.fillText('🚚',bx,yb+43);c.font=`800 36px ${FONT}`;c.fillText(msg,bx+100,yb+28);if(ce){c.font=`400 21px ${FONT}`;c.fillText('si el pedido es menor, el envío cuesta '+flPes(ce),bx+100,yb+62)}}
  c.fillStyle=MARCA.c;c.fillRect(0,yb+(env?86:0),W,H);c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';
  c.font=`800 44px ${FONT}`;{const tt=S.telEmp?'Pedí por WhatsApp  '+S.telEmp:'Sabores de mi País';if(S.telEmp){const tw=c.measureText(tt).width,R0=30,cx=W/2-(tw+R0*2+18)/2+R0,cy=yb+140;c.fillText(tt,cx+R0+18+tw/2,yb+140);
    c.save();c.fillStyle='#25D366';c.beginPath();c.arc(cx,cy,R0,0,7);c.fill();c.translate(cx-16.8,cy-17.5);c.scale(1.4,1.4);c.strokeStyle='#fff';c.lineWidth=2;c.lineJoin='round';c.stroke(new Path2D('M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.3A8.5 8.5 0 1 1 21 11.5z'));
    c.translate(7.4,6.6);c.scale(.42,.42);c.fillStyle='#fff';c.fill(new Path2D('M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z'));c.restore()}else c.fillText(tt,W/2,yb+140)}
  c.font=`400 23px ${FONT}`;c.fillStyle='rgba(240,225,229,1)';c.fillText('Sabores de mi País · Distribuidora de alimentos · Precios sujetos a cambio',W/2,yb+196);c.textAlign='left';
  return cv}
async function flArmar(f,prog){
  const logo=await flImg(MARCA.logo||LOGO_DEF),{W,H,CAB,PIE,FONT}=FL,BOT=H-PIE-24,TOP=CAB+28,P=[];
  for(const pg of f.paginas||[]){
    if(pg.tipo=='fotos'){const L=(pg.items||[]).map(flItem).filter(Boolean);if(L.length)P.push({t:'f',pg,L})}
    else if(pg.tipo=='lista'){const SEC=70,ROW=80;let cur=[],y=TOP,last=null;
      for(const s of pg.secciones||[])for(const x of s.items){const it=flItem(x);if(!it)continue;let need=ROW+(s.t!==last?SEC:0);
        if(y+need>BOT){P.push({t:'l',rows:cur});cur=[];y=TOP;last=null;need=ROW+SEC}
        if(s.t!==last){cur.push({sec:s.t});y+=SEC;last=s.t}cur.push(it);y+=ROW}
      if(cur.length)P.push({t:'l',rows:cur})}}
  const clave=f.id+'|'+(f.v||'')+'|'+S.telEmp+'|'+(S.vcfg?.envio||'')+'|'+(S.vcfg?.costoEnvio||'')+'|'+JSON.stringify(P);
  if(FL_OUT.has(clave))return FL_OUT.get(clave);
  P.forEach(Q=>Q.t=='f'&&Q.L.forEach(x=>flImg(x.foto,1)));
  const out=[];
  for(let k=0;k<P.length;k++){prog&&prog(k+1,P.length);const Q=P[k];
    const cv=await flPagina(f,k+1,P.length,async c=>{
      if(Q.t=='f'){let y=TOP;c.fillStyle=MARCA.c;rrect(c,40,y,W-80,96,18);c.fill();c.fillStyle='#fff';c.textBaseline='middle';c.font=`800 38px ${FONT}`;c.fillText(Q.pg.titulo.toUpperCase(),68,y+32);c.font=`400 24px ${FONT}`;c.fillStyle='rgba(240,225,229,1)';c.fillText(Q.pg.sub||'',68,y+72);y+=118;
        const gap=22,cw=(W-80-gap)/2,NR=Math.max(2,Math.min(3,Math.ceil(Q.L.length/2))),ch=(BOT-y-(NR-1)*gap)/NR,imgs=await Promise.all(Q.L.map(x=>flImg(x.foto,1))),EX=Math.max(0,...Q.L.map(x=>(x.dets?x.dets.length:1)-1+(x.cod?1:0)));
        const ND=Math.max(0,...Q.L.map(x=>(x.dets||(x.det?[x.det]:[])).length)),HC=Q.L.some(x=>x.cod),BH=46+ND*36+(HC?28:0)+4;
        Q.L.forEach((x,i)=>{const X=40+(i%2)*(cw+gap),Y=y+Math.floor(i/2)*(ch+gap),pb=Y+ch-18-BH+46,nt=pb-44-62,ph=nt-8-(Y+14),pw=cw-40;
          c.fillStyle='#fff';rrect(c,X,Y,cw,ch,24);c.fill();c.strokeStyle=FL.LIN;c.lineWidth=2;c.stroke();
          c.font=`600 26px ${FONT}`;const NL=flLineas(c,x.n,cw-48,2),ph1=ph+(NL.length==1?24:0);
          const im=imgs[i];if(im&&ph1>20){const k=Math.min(pw/im.width,ph1/im.height);c.drawImage(im,X+20+(pw-im.width*k)/2,Y+14+(ph1-im.height*k)/2,im.width*k,im.height*k)}
          c.textBaseline='top';c.fillStyle=FL.TXT;const ty=nt+(NL.length==1?31:0);NL.forEach((l,j)=>c.fillText(l,X+24,ty+j*31));
          c.textBaseline='alphabetic';c.fillStyle=MARCA.c;c.font=`800 44px ${FONT}`;const pt=flPes(x.p);c.fillText(pt,X+24,pb);const pw2=c.measureText(pt).width;
          c.fillStyle=FL.GRI;c.font=`600 24px ${FONT}`;c.fillText(x.suf,X+24+pw2+8,pb);
          const D=x.dets||(x.det?[x.det]:[]);let ly=pb+14;D.forEach((t,j)=>{const caja=j==D.length-1;c.font=`${caja?800:500} ${caja?23:21}px ${FONT}`;let tt=t;while(c.measureText(tt).width>cw-48-24&&tt.length>8)tt=tt.slice(0,-2);if(tt!==t)tt=tt.trim()+'…';
            const tw=c.measureText(tt).width;if(caja){c.fillStyle=/^#[0-9a-f]{6}$/i.test(MARCA.c)?MARCA.c+'1f':'rgba(123,45,62,.12)';rrect(c,X+20,ly,tw+24,32,10);c.fill();c.fillStyle=MARCA.c}else c.fillStyle=FL.GRI;
            c.textBaseline='middle';c.fillText(tt,X+32,ly+17);c.textBaseline='alphabetic';ly+=36});
          if(x.cod){c.fillStyle='#9aa0ad';c.font=`500 20px ${FONT}`;c.fillText('Cód. '+x.cod,X+24,pb+14+ND*36+22)}})}
      else{let y=TOP;for(const r of Q.rows){
        if(r.sec){c.fillStyle=MARCA.c;rrect(c,40,y+14,W-80,70-22,14);c.fill();c.fillStyle='#fff';c.textBaseline='middle';c.font=`800 28px ${FONT}`;c.fillText(r.sec.toUpperCase(),64,y+14+24);y+=70;continue}
        c.fillStyle='#fff';rrect(c,40,y+4,W-80,80-8,14);c.fill();const pt=flPes(r.p);c.font=`800 38px ${FONT}`;const pw=c.measureText(pt).width;c.font=`600 22px ${FONT}`;const sw=c.measureText(r.suf).width;
        let fs=30;c.font=`600 ${fs}px ${FONT}`;while(c.measureText(r.n).width>W-40-28-pw-sw-38-64&&fs>20){fs--;c.font=`600 ${fs}px ${FONT}`}
        const d2=!!(r.det||r.cod);c.fillStyle=FL.TXT;c.textBaseline='middle';c.fillText(r.n,64,d2?y+30:y+40);if(d2){let dx=64;if(r.cod){const ct='Cód. '+r.cod;c.font=`500 21px ${FONT}`;c.fillStyle='#9aa0ad';c.fillText(ct,dx,y+59);dx+=c.measureText(ct).width}if(r.det){c.font=`400 23px ${FONT}`;c.fillStyle=FL.GRI;c.fillText((r.cod?'  ·  ':'')+r.det,dx,y+59)}}
        c.textAlign='right';c.font=`600 22px ${FONT}`;c.fillStyle=FL.GRI;c.fillText(r.suf,W-64,y+42);c.font=`800 38px ${FONT}`;c.fillStyle=MARCA.c;c.fillText(pt,W-64-sw-8,y+40);c.textAlign='left';y+=80}}},logo);
    out.push(await new Promise(r=>cv.toBlob(r,'image/jpeg',.88)))}
  for(const k of [...FL_OUT.keys()])if(k.startsWith(f.id+'|'))FL_OUT.delete(k);FL_OUT.set(clave,out);
  return out}
/* Junta las imágenes JPG del folleto en un solo PDF (una imagen por hoja), sin librerías */
async function pdfDeJpgs(B,W,H){const enc=new TextEncoder(),parts=[],off=[];let len=0;const add=x=>{const u=typeof x=='string'?enc.encode(x):x;parts.push(u);len+=u.length};
  const pw=W/2,ph=H/2,n=B.length,N=2+3*n;add('%PDF-1.4\n');
  const obj=(id,body)=>{off[id]=len;add(id+' 0 obj\n'+body+'\nendobj\n')};
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Count '+n+' /Kids ['+B.map((_,k)=>(3+3*k)+' 0 R').join(' ')+'] >>');
  for(let k=0;k<n;k++){const pg=3+3*k,ct=pg+1,im=pg+2,c='q '+pw+' 0 0 '+ph+' 0 0 cm /Im0 Do Q';
    obj(pg,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pw+' '+ph+'] /Resources << /XObject << /Im0 '+im+' 0 R >> >> /Contents '+ct+' 0 R >>');
    obj(ct,'<< /Length '+c.length+' >>\nstream\n'+c+'\nendstream');
    const b=new Uint8Array(await B[k].arrayBuffer());off[im]=len;
    add(im+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+W+' /Height '+H+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+b.length+' >>\nstream\n');add(b);add('\nendstream\nendobj\n')}
  const x=len;let t='xref\n0 '+(N+1)+'\n0000000000 65535 f \n';for(let i=1;i<=N;i++)t+=String(off[i]).padStart(10,'0')+' 00000 n \n';
  add(t+'trailer\n<< /Size '+(N+1)+' /Root 1 0 R >>\nstartxref\n'+x+'\n%%EOF\n');return new Blob(parts,{type:'application/pdf'})}
async function folletosListos(){
  const m=document.createElement('div');m.className='modal';document.body.appendChild(m);
  m.innerHTML=`<div class="mc fl-mc"><div class="bh"><h3 style="margin:0">Folletos</h3><button class="alt" id="fl_x">Cerrar</button></div><div id="fl_b"><span class="skl" role="status" aria-label="Cargando"></span></div></div>`;
  const cerrar=()=>m.remove();m.querySelector('#fl_x').onclick=cerrar;m.onclick=e=>{if(e.target===m)cerrar()};
  let L=[];try{const r=await fetch('folletos/folletos.json?v='+Date.now());L=await r.json()}catch(e){m.querySelector('#fl_b').innerHTML='<p class="err">No se pudieron cargar los folletos.</p>';return}
  if(!S.vcfg?.escalas)await cargarVentasCfg().catch(()=>{});
  const cache={},est=t=>{const e=m.querySelector('#fl_est');if(e)e.innerHTML=t};
  const tapa=f=>`folletos/${f.id}/1.jpg${f.v?'?v='+f.v:''}`;
  const nom=(f,i)=>`${f.titulo.replace(/\s+/g,'-')}-${i}.jpg`;
  const armar=async f=>{if(cache[f.id])return cache[f.id];const B=await flArmar(f,(k,n)=>est(`⏳ Armando con los precios de hoy… ${k} de ${n}`));cache[f.id]={B,U:B.map(b=>URL.createObjectURL(b))};est('');return cache[f.id]};
  const sels={},selDe=f=>sels[f.id]||null,txt=f=>flMsg(f);
  const copiar=f=>{try{navigator.clipboard&&navigator.clipboard.writeText(flMsg(f)).catch(()=>{})}catch(e){}};
  const elegidas=async(f,lst)=>{const{B}=await armar(f);const I=(lst&&lst.length?lst:B.map((_,k)=>k+1)).filter(i=>i>=1&&i<=B.length);return{B,I}};
  const bajar=async(f,lst)=>{const{B,I}=await elegidas(f,lst);toast('Descargando '+I.length+' imágenes…');I.forEach(i=>{const a=document.createElement('a');a.href=URL.createObjectURL(B[i-1]);a.download=nom(f,i);document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)})};
  const compartir=async(f,lst)=>{copiar(f);try{const{B,I}=await elegidas(f,lst),files=I.map(i=>new File([B[i-1]],nom(f,i),{type:'image/jpeg'}));
    if(navigator.canShare&&navigator.canShare({files}))await navigator.share({files,text:txt(f)});else bajar(f,lst)}catch(e){}};
  const pdf=async(f,soloBajar,lst)=>{if(!soloBajar)copiar(f);try{const{B,I}=await elegidas(f,lst);est('⏳ Armando el PDF…');const parcial=I.length<B.length,blob=await pdfDeJpgs(I.map(i=>B[i-1]),FL.W,FL.H),nm=f.titulo.replace(/\s+/g,'-')+(parcial?'-hojas-'+I.join('-'):'')+'.pdf',file=new File([blob],nm,{type:'application/pdf'});est('');
    if(!soloBajar&&navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],text:txt(f)});
    else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nm;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);toast('PDF descargado: '+nm)}}catch(e){est('');if(e&&e.name!='AbortError')toast('No se pudo armar el PDF: '+(e.message||e),1)}};
  const lista=()=>{m.querySelector('#fl_b').innerHTML=`<p class="fl-int"><small>Salen con los <b>precios de hoy</b>: si cambiás un precio, el folleto ya sale actualizado.</small></p><p id="fl_est" class="sube"></p>
    <div class="fl-grid">${L.map((f,k)=>`<div class="fl-card" data-k="${k}"><img src="${tapa(f)}" alt="${esc(f.titulo)}" loading="lazy"><div class="fl-tx"><b>${esc(f.titulo)}</b><small>${esc(f.sub||'')}</small><small class="fl-n">Precios al día · ${esc(flMes())}</small>
      <div class="fl-bt"><button class="wa fl-wa" data-pdf="${k}">${IC('chat',18)} Mandar PDF</button><button class="alt" data-ver="${k}">Elegir hojas</button></div>
      <details class="fl-mas"><summary>Más opciones ${IC('down',14)}</summary><div class="fc-acc">${navigator.canShare?`<button class="alt" data-sh="${k}">Compartir fotos</button>`:''}<button class="alt" data-dl="${k}">Descargar</button><button class="alt" data-msg="${k}">Ver mensaje</button></div></details></div></div>`).join('')}</div>`;
    m.querySelectorAll('[data-sh]').forEach(b=>b.onclick=e=>{e.stopPropagation();compartir(L[b.dataset.sh])});
    m.querySelectorAll('[data-dl]').forEach(b=>b.onclick=e=>{e.stopPropagation();bajar(L[b.dataset.dl])});
    m.querySelectorAll('[data-msg]').forEach(b=>b.onclick=e=>{e.stopPropagation();verMsg(L[b.dataset.msg])});
    m.querySelectorAll('[data-pdf]').forEach(b=>b.onclick=e=>{e.stopPropagation();pdf(L[b.dataset.pdf])});
    m.querySelectorAll('.fl-mas').forEach(d=>d.onclick=e=>e.stopPropagation());
    m.querySelectorAll('.fl-card').forEach(c=>c.onclick=()=>ver(L[c.dataset.k]))};
  const ver=async f=>{m.querySelector('#fl_b').innerHTML=`<p id="fl_est" class="sube">⏳ Armando con los precios de hoy…</p>`;let R;try{R=await armar(f)}catch(e){m.querySelector('#fl_b').innerHTML='<p class="err">No se pudo armar el folleto: '+esc(e.message||e)+'</p>';return}
    const n=R.U.length;let sel=new Set((selDe(f)||R.U.map((_,k)=>k+1)).filter(i=>i<=n));const lst=()=>[...sel].sort((a,b)=>a-b);
    m.querySelector('#fl_b').innerHTML=`<div class="bh"><div><b>${esc(f.titulo)}</b><br><small>${n} hojas · precios de hoy · tocá una para verla grande</small></div><a class="lnk" id="fl_v">← Volver</a></div>
    <p id="fl_est" class="sube"></p>
    <div class="fl-sel"><b id="fl_cnt"></b> <a class="lnk" id="fl_all">Marcar todas</a> · <a class="lnk" id="fl_none">Desmarcar todas</a><br><small>Destildá las hojas que no quieras mandar. Los botones mandan solo las hojas marcadas.</small></div>
    <div class="fc-acc"><button class="wa" style="background:#1d7a46;color:#fff;border-color:#1d7a46" id="fl_pdf">📄 Mandar en PDF por WhatsApp</button><button class="alt" id="fl_pdfd">Descargar PDF</button>${navigator.canShare?'<button class="alt" id="fl_sa">Compartir fotos</button>':''}<button class="alt" id="fl_da">Descargar fotos</button><button class="alt" id="fl_msg">💬 Mensaje</button><button class="alt" id="fl_pr">✏️ Cambiar precios</button></div>
    <div class="fl-th">${R.U.map((u,k)=>`<a data-i="${k+1}"><img src="${u}" alt="${k+1}"><span>${k+1}</span><label class="fl-ck" title="Incluir esta hoja"><input type="checkbox" data-ck="${k+1}" ${sel.has(k+1)?'checked':''}></label></a>`).join('')}</div>`;
    const pinta=()=>{sels[f.id]=lst();m.querySelector('#fl_cnt').textContent=sel.size==n?`Todas las hojas (${n})`:`${sel.size} de ${n} hojas marcadas`;m.querySelectorAll('[data-ck]').forEach(c=>{c.checked=sel.has(+c.dataset.ck);c.closest('a').classList.toggle('off',!c.checked)})};
    const hay=()=>{if(!sel.size){toast('Marcá al menos una hoja.',1);return false}return true};
    m.querySelectorAll('[data-ck]').forEach(c=>{c.onclick=e=>e.stopPropagation();c.closest('label').onclick=e=>e.stopPropagation();c.onchange=()=>{c.checked?sel.add(+c.dataset.ck):sel.delete(+c.dataset.ck);pinta()}});
    m.querySelector('#fl_all').onclick=()=>{sel=new Set(R.U.map((_,k)=>k+1));pinta()};m.querySelector('#fl_none').onclick=()=>{sel.clear();pinta()};
    m.querySelector('#fl_v').onclick=lista;m.querySelector('#fl_da').onclick=()=>hay()&&bajar(f,lst());m.querySelector('#fl_pdf').onclick=()=>hay()&&pdf(f,false,lst());m.querySelector('#fl_pdfd').onclick=()=>hay()&&pdf(f,true,lst());
    const sa=m.querySelector('#fl_sa');if(sa)sa.onclick=()=>hay()&&compartir(f,lst());m.querySelector('#fl_pr').onclick=()=>precios(f);m.querySelector('#fl_msg').onclick=()=>verMsg(f);
    m.querySelectorAll('.fl-th a').forEach(a=>a.onclick=()=>grande(f,+a.dataset.i));pinta()};
  /* Cambiar precios puntuales de los productos del folleto: queda como precio fijo del producto (folleto, catálogo y pedidos) */
  const precios=f=>{const G=[];const suma=(t,xs)=>{const L2=xs.map(x=>{const p=S.productos.find(q=>q.producto_id==x.id),mm=S.min[x.id];if(!p||!mm||mm.a===false)return null;
        const pr=+p.precio_mayorista,pz=esPeso(x.id)?ppz(x.id):0,fac=pz||1,suf=esKg(x.id)?'/kg':pz?'/kg':'c/u';return{id:x.id,n:x.n||p.descripcion,v:pr>0?pr/fac:null,fac,suf,fijo:+p.precio_fijo>0}}).filter(Boolean);if(L2.length)G.push({t,L:L2})};
      for(const pg of f.paginas||[]){if(pg.tipo=='fotos')suma(pg.titulo,pg.items||[]);else for(const s of pg.secciones||[])suma(s.t,s.items||[])}
      const g=document.createElement('div');g.className='modal';document.body.appendChild(g);
      g.innerHTML=`<div class="mc"><div class="bh"><h3 style="margin:0">✏️ Cambiar precios · ${esc(f.titulo)}</h3><button class="alt" id="pc_x">Cerrar</button></div>
        <p><small>Escribí el precio <b>mayorista final (con IVA)</b> tal como querés que salga en el folleto. Queda fijo para ese producto: sale igual en folletos, catálogo y pedidos (gastronomía usa el mismo y minorista sube en la misma proporción). Dejalo vacío para no tocarlo. Con <b>«Automático»</b> vuelve al precio calculado con el costo.</small></p>
        <input id="pc_q" placeholder="Buscar producto…">
        <div id="pc_l">${G.map(gr=>`<div class="pc-g" data-g><h4 style="margin:12px 0 4px">${esc(gr.t)}</h4>${gr.L.map(x=>`<div class="pc-r" data-n="${esc(x.n.toLowerCase())}"><div><b>${esc(x.n)}</b><br><small>Ahora: ${x.v!=null?$m(x.v)+' '+x.suf:'—'}${x.fijo?' · <span class="badge">precio fijo</span>':''}</small></div>
          <div class="pc-in"><input type="text" inputmode="decimal" data-pid="${x.id}" data-fac="${x.fac}" placeholder="${x.v!=null?nf(Math.round(x.v)):''}">${x.fijo?`<button class="alt" data-auto="${x.id}">Automático</button>`:''}</div></div>`).join('')}</div>`).join('')}</div>
        <div class="fc-acc"><button id="pc_ok">Guardar precios</button><button class="alt" id="pc_c">Cancelar</button></div></div>`;
      const cerrar=()=>g.remove();g.querySelector('#pc_x').onclick=cerrar;g.querySelector('#pc_c').onclick=cerrar;g.onclick=e=>{if(e.target===g)cerrar()};
      g.querySelector('#pc_q').oninput=e=>{const q=e.target.value.trim().toLowerCase();g.querySelectorAll('.pc-r').forEach(r=>r.style.display=!q||r.dataset.n.includes(q)?'':'none');g.querySelectorAll('[data-g]').forEach(d=>d.style.display=[...d.querySelectorAll('.pc-r')].some(r=>r.style.display!='none')?'':'none')};
      const listo=async k=>{toast(k);await recargarProductos();if(cache[f.id]){cache[f.id].U.forEach(u=>URL.revokeObjectURL(u));delete cache[f.id]}cerrar();ver(f)};
      g.querySelectorAll('[data-auto]').forEach(b=>b.onclick=async()=>{b.disabled=true;const{error}=await sb.rpc('fijar_precio',{p_producto:b.dataset.auto,p_precio:null});if(error){b.disabled=false;return toast(error.message,1)}listo('Volvió al precio automático.')});
      g.querySelector('#pc_ok').onclick=async()=>{const it=[...g.querySelectorAll('[data-pid]')].map(i=>({id:i.dataset.pid,v:numAR(i.value),fac:+i.dataset.fac||1})).filter(x=>x.v!=null);
        if(it.some(x=>!(x.v>0)))return toast('Hay un precio que no es válido.',1);if(!it.length)return toast('No escribiste ningún precio.',1);
        const b=g.querySelector('#pc_ok');b.disabled=true;b.textContent='Guardando…';
        for(const x of it){const{error}=await sb.rpc('fijar_precio',{p_producto:x.id,p_precio:Math.round(x.v*x.fac*100)/100});if(error){b.disabled=false;b.textContent='Guardar precios';return toast(/fijar_precio/.test(error.message)?'Falta actualizar la base de datos.':error.message,1)}}
        listo(it.length==1?'Precio guardado.':it.length+' precios guardados.')}};
  const verMsg=f=>{const t=flMsg(f),g=document.createElement('div');g.className='modal';document.body.appendChild(g);
    g.innerHTML=`<div class="mc"><div class="bh"><h3 style="margin:0">💬 Mensaje para WhatsApp</h3><button class="alt" id="mg_x">Cerrar</button></div>
      <p><small>Este mensaje sale <b>solo</b> al compartir el folleto (y queda copiado por si WhatsApp no lo pega: mantené apretado el cuadro de texto y tocá <b>Pegar</b>). Los asteriscos se ven en negrita.</small></p>
      <textarea id="mg_t" rows="16" style="width:100%;font:15px system-ui">${esc(t)}</textarea>
      <div class="fc-acc"><button id="mg_c">📋 Copiar</button><a class="lnk" target="_blank" href="https://wa.me/?text=${encodeURIComponent(t)}">Abrir WhatsApp solo con el texto</a></div></div>`;
    const cerrar=()=>g.remove();g.querySelector('#mg_x').onclick=cerrar;g.onclick=e=>{if(e.target===g)cerrar()};
    g.querySelector('#mg_c').onclick=async()=>{try{await navigator.clipboard.writeText(g.querySelector('#mg_t').value);toast('Mensaje copiado.')}catch(e){g.querySelector('#mg_t').select();toast('Seleccioná el texto y copialo.',1)}}};
  const grande=(f,i)=>{const U=cache[f.id].U,g=document.createElement('div');g.className='modal fl-big';document.body.appendChild(g);
    g.innerHTML=`<div class="mc"><div class="bh"><b>${esc(f.titulo)} · ${i}/${U.length}</b><button class="alt" id="g_x">Cerrar</button></div><img src="${U[i-1]}" alt="" style="width:100%;border-radius:10px">
      <div class="fc-acc">${i>1?'<button class="alt" id="g_p">← Anterior</button>':''}${i<U.length?'<button class="alt" id="g_n">Siguiente →</button>':''}${navigator.canShare?'<button id="g_s">Compartir esta</button>':''}<a class="lnk" download="${nom(f,i)}" href="${U[i-1]}">Descargar</a></div></div>`;
    g.onclick=e=>{if(e.target===g)g.remove()};g.querySelector('#g_x').onclick=()=>g.remove();
    const p=g.querySelector('#g_p'),n=g.querySelector('#g_n'),sh=g.querySelector('#g_s');if(p)p.onclick=()=>{g.remove();grande(f,i-1)};if(n)n.onclick=()=>{g.remove();grande(f,i+1)};if(sh)sh.onclick=()=>compartir(f,[i])};
  lista()}
async function cajaVender(){const box=$('#pr_vd');if(!box)return;
  const{data}=await sb.from('config_app').select('valor').eq('clave','catalogo_publico').maybeSingle();const v=data?.valor||'';
  box.innerHTML=`<div class="bh"><h3>📣 Para salir a vender</h3><span class="fc-acc" style="margin:0"><button id="pv_fl">📂 Folletos listos</button><button class="alt" id="pv_fo">Armar folleto de ofertas</button><button class="alt" id="pv_fb">Folleto bilingüe 中文</button></span></div>
    <p><small>Folletos con fotos y precios de oferta por familia, listos para WhatsApp, estados o Instagram. Un folleto bilingüe español–chino para supermercados, con tus precios. Y un catálogo público para que cualquiera vea tus productos y te pida por WhatsApp.</small></p>
    <div class="g"><label class="f">Catálogo público (para clientes nuevos)<select id="pv_cl"><option value="">Desactivado</option>${['minorista','mayorista','especial'].map(l=>`<option value="${l}" ${v==l?'selected':''}>Activado con precios ${nomL(l)}</option>`).join('')}</select></label></div>
    ${v?`<input readonly value="${linkPublico()}" id="pv_lk"><div class="fc-acc"><button class="alt" id="pv_cp">Copiar link</button><button class="alt wa" id="pv_wa">Compartir por WhatsApp</button><a class="lnk" href="${linkPublico()}" target="_blank" rel="noopener">Ver cómo se ve</a></div>
      ${S.telEmp?'':'<p class="err"><small>Cargá tu WhatsApp en Cobranza (Tu WhatsApp) para que te lleguen los pedidos del catálogo.</small></p>'}`:''}`;
  $('#pv_fl').onclick=()=>folletosListos();$('#pv_fo').onclick=()=>folletoOfertas();$('#pv_fb').onclick=()=>folletoBilingue();
  $('#pv_cl').onchange=async e=>{const{error}=await sb.from('config_app').upsert({clave:'catalogo_publico',valor:e.target.value});if(error)return toast(error.message,1);toast(e.target.value?'Catálogo público activado.':'Catálogo público desactivado.');cajaVender()};
  $('#pv_cp')&&($('#pv_cp').onclick=async()=>{try{await navigator.clipboard.writeText(linkPublico())}catch(e){$('#pv_lk').select();document.execCommand('copy')}toast('Link copiado.')});
  $('#pv_wa')&&($('#pv_wa').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent('¡Hola! 👋 Te comparto el catálogo de *Sabores de mi País*: mirá los productos, las ofertas y hacé tu pedido por WhatsApp 👇\n'+linkPublico()),'_blank'));
}
function rrect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function lineas(c,t,maxW,maxL){const w=String(t).split(/\s+/),L=[];let cur='';for(const x of w){const tt=cur?cur+' '+x:x;if(c.measureText(tt).width<=maxW)cur=tt;else{if(cur)L.push(cur);cur=x}}if(cur)L.push(cur);
  if(L.length>maxL){L.length=maxL;let u=L[maxL-1];while(c.measureText(u+'…').width>maxW&&u.length)u=u.slice(0,-1);L[maxL-1]=u+'…'}return L}
async function dibujarFolleto(items,o){const F=FMT[o.fmt],cv=document.createElement('canvas');cv.width=F.w;cv.height=F.h;const c=cv.getContext('2d');
  const FONT='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif',m=48,cab=o.fmt=='historia'?380:300,ev=S.vcfg?.envio?62:0,pie=150+ev;
  c.fillStyle='#f6f2ec';c.fillRect(0,0,F.w,F.h);
  // cabecera
  const g=c.createLinearGradient(0,0,F.w,cab);g.addColorStop(0,MARCA.n);g.addColorStop(1,MARCA.c);c.fillStyle=g;c.fillRect(0,0,F.w,cab);
  const logo=await cargarImg(MARCA.logo);let tx=m;
  if(logo){const k=Math.min((cab-80)/logo.height,F.w*.36/logo.width),lw=logo.width*k,lh=logo.height*k;c.drawImage(logo,m,(cab-lh)/2,lw,lh);tx=m+lw+36}
  c.fillStyle='#fff';c.textBaseline='alphabetic';c.font=`900 ${o.fmt=='historia'?120:104}px ${FONT}`;
  const tit=o.titulo||'OFERTAS';let fs=o.fmt=='historia'?120:104;while(c.measureText(tit).width>F.w-tx-m&&fs>50){fs-=4;c.font=`900 ${fs}px ${FONT}`}
  c.fillText(tit,tx,cab/2+fs*.15);
  c.fillStyle='#ffd54a';c.font=`800 ${Math.round(fs*.48)}px ${FONT}`;c.fillText(lineas(c,o.sub||'',F.w-tx-m,1)[0]||'',tx,cab/2+fs*.15+fs*.62);
  if(o.vig){c.fillStyle='rgba(255,255,255,.85)';let vf=30;c.font=`500 ${vf}px ${FONT}`;while(c.measureText(o.vig).width>F.w-tx-m&&vf>18){vf--;c.font=`500 ${vf}px ${FONT}`}c.fillText(lineas(c,o.vig,F.w-tx-m,1)[0],tx,cab-34)}
  // filas: foto a la izquierda y precios a la derecha (para productos con precio por display/bulto/pallet)
  if(o.filas){const n=items.length,gap=24,top0=cab+30,bot0=F.h-pie-26,cw=F.w-2*m,ch=Math.min((bot0-top0-(n-1)*gap)/n,420),top=top0+((bot0-top0)-(n*ch+(n-1)*gap))/2;
    const imgs=await Promise.all(items.map(x=>cargarImg(x.img)));
    items.forEach((x,i)=>{const X=m,Y=top+i*(ch+gap),pad=20,is=ch-pad*2,tx=X+pad+is+28,tw=cw-(tx-X)-pad;
      c.save();c.shadowColor='rgba(0,0,0,.12)';c.shadowBlur=18;c.shadowOffsetY=6;c.fillStyle='#fff';rrect(c,X,Y,cw,ch,28);c.fill();c.restore();
      const im=imgs[i];if(im){const k=Math.min(is/im.width,is/im.height);c.drawImage(im,X+pad+(is-im.width*k)/2,Y+pad+(is-im.height*k)/2,im.width*k,im.height*k)}
      else{c.fillStyle=MARCA.c+'1f';rrect(c,X+pad,Y+pad,is,is,20);c.fill();c.fillStyle=MARCA.c;c.font=`900 ${Math.round(is*.5)}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText((x.d||'?')[0],X+pad+is/2,Y+pad+is/2);c.textAlign='left';c.textBaseline='alphabetic'}
      if(x.pct){const r=52;c.fillStyle='#d62828';c.beginPath();c.arc(X+cw-r-14,Y+r+14,r,0,7);c.fill();c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.font=`900 34px ${FONT}`;c.fillText('-'+nf(x.pct)+'%',X+cw-r-14,Y+r+14);c.textAlign='left';c.textBaseline='alphabetic'}
      const E=(x.esc||(x.bulto?[x.bulto]:[])).slice(),C=x.cond?[x.cond]:[];
      // tamaños que entran en el alto de la tarjeta
      let fN=36,fP=72,fE=30;const alto=()=>fN*1.2*NL.length+(x.ant?fE+6:0)+fP*1.05+(C.length+E.length)*fE*1.3;let NL;
      for(;;){c.font=`700 ${fN}px ${FONT}`;NL=lineas(c,x.d,tw-(x.pct?110:0),2);if(alto()<=ch-pad*2||fN<=22)break;fN-=2;fP-=4;fE=Math.max(20,fE-1)}
      c.font=`700 ${fE}px ${FONT}`;let ef=fE;while([...E,...C].some(t=>c.measureText(t).width>tw)&&ef>16){ef--;c.font=`700 ${ef}px ${FONT}`}
      let y=Y+(ch-alto())/2;c.fillStyle='#1c2333';c.font=`700 ${fN}px ${FONT}`;for(const l of NL){y+=fN*1.05;c.fillText(l,tx,y);y+=fN*.15}
      if(x.ant){c.fillStyle='#8a90a0';c.font=`500 ${fE}px ${FONT}`;const t=$m(x.ant);y+=fE+6;c.fillText(t,tx,y);const w=c.measureText(t).width;c.strokeStyle='#8a90a0';c.lineWidth=3;c.beginPath();c.moveTo(tx-2,y-fE*.35);c.lineTo(tx+w+2,y-fE*.35);c.stroke()}
      c.fillStyle=x.pct?'#d62828':MARCA.c;c.font=`900 ${fP}px ${FONT}`;y+=fP*1.02;c.fillText($m(x.p),tx,y);if(x.cu){const w=c.measureText($m(x.p)).width;c.font=`700 ${Math.round(fP*.42)}px ${FONT}`;c.fillText(' c/u',tx+w,y)}
      c.font=`700 ${ef}px ${FONT}`;for(const t of C){y+=fE*1.3;c.fillStyle='#1d7a46';c.fillText(t,tx,y)}
      E.forEach((t,k)=>{y+=fE*1.3;c.fillStyle=/^Pallet/.test(t)?MARCA.c:'#4a5163';c.font=`${/^Pallet/.test(t)?800:600} ${ef}px ${FONT}`;c.fillText(t,tx,y)})});
  }else{
  // grilla (las tarjetas se adaptan a la cantidad de productos)
  const n=items.length,cols=n==1?1:F.col,rows=Math.ceil(n/cols),gap=28,top0=cab+36,bot0=F.h-pie-30,cw=(F.w-2*m-(cols-1)*gap)/cols;
  const ch=Math.min((bot0-top0-(rows-1)*gap)/rows,cols==1?900:720),top=top0+((bot0-top0)-(rows*ch+(rows-1)*gap))/2;
  const imgs=await Promise.all(items.map(x=>cargarImg(x.img)));
  items.forEach((x,i)=>{const col=i%cols,row=Math.floor(i/cols),X=m+col*(cw+gap),Y=top+row*(ch+gap),pad=24,big=cw>600;
    c.save();c.shadowColor='rgba(0,0,0,.12)';c.shadowBlur=18;c.shadowOffsetY=6;c.fillStyle='#fff';rrect(c,X,Y,cw,ch,28);c.fill();c.restore();
    const fN=big?44:30,lhN=fN*1.2,fP=big?96:62,nE=x.esc?x.esc.length:0,txt=lhN*2+(x.ant?40:0)+fP+((x.cond||x.bulto)&&!nE?36:0)+(x.cond&&nE?36:0)+nE*(big?38:31)+30;
    const ih=Math.max(80,ch-txt-pad*2),iw=cw-pad*2,im=imgs[i];
    if(im){const k=Math.min(iw/im.width,ih/im.height);c.drawImage(im,X+pad+(iw-im.width*k)/2,Y+pad+(ih-im.height*k)/2,im.width*k,im.height*k)}
    else{c.fillStyle=MARCA.c+'1f';rrect(c,X+pad,Y+pad,iw,ih,20);c.fill();c.fillStyle=MARCA.c;c.font=`900 ${Math.round(Math.min(ih,iw)*.55)}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText((x.d||'?')[0],X+cw/2,Y+pad+ih/2);c.textAlign='left';c.textBaseline='alphabetic'}
    if(x.pct){const r=big?80:60;c.fillStyle='#d62828';c.beginPath();c.arc(X+cw-r+8,Y+r-8,r,0,7);c.fill();c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.font=`900 ${big?52:38}px ${FONT}`;c.fillText('-'+nf(x.pct)+'%',X+cw-r+8,Y+r-8);c.textAlign='left';c.textBaseline='alphabetic'}
    let y=Y+pad+ih+fN+8;c.fillStyle='#1c2333';c.font=`700 ${fN}px ${FONT}`;const NL=lineas(c,x.d,iw,2);for(const l of NL){c.fillText(l,X+pad,y);y+=lhN}if(NL.length<2)y+=lhN;
    if(x.ant){c.fillStyle='#8a90a0';c.font=`500 ${big?34:28}px ${FONT}`;const t=$m(x.ant);y+=6;c.fillText(t,X+pad,y);const tw=c.measureText(t).width;c.strokeStyle='#8a90a0';c.lineWidth=3;c.beginPath();c.moveTo(X+pad-2,y-10);c.lineTo(X+pad+tw+2,y-10);c.stroke();y+=8}
    c.fillStyle=x.pct?'#d62828':MARCA.c;let pf=fP;c.font=`900 ${pf}px ${FONT}`;const pt=$m(x.p);while(c.measureText(pt+(x.cu?' c/':'')).width>iw&&pf>36){pf-=3;c.font=`900 ${pf}px ${FONT}`}y+=pf*.95;c.fillText(pt,X+pad,y);if(x.cu){const w=c.measureText(pt).width;c.font=`700 ${Math.round(pf*.42)}px ${FONT}`;c.fillText(' c/u',X+pad+w,y)}
    if(x.cond||(x.bulto&&!nE)){c.fillStyle=x.cond?'#1d7a46':'#6a7184';c.font=`700 ${big?30:24}px ${FONT}`;y+=big?40:32;c.fillText(lineas(c,x.cond||x.bulto,iw,1)[0],X+pad,y)}
    if(nE){let ef=big?30:24;c.font=`700 ${ef}px ${FONT}`;while(x.esc.some(t=>c.measureText(t).width>iw)&&ef>15){ef--;c.font=`700 ${ef}px ${FONT}`}
      x.esc.forEach((t,k)=>{y+=k?(big?38:31):(big?40:32);c.fillStyle=k==x.esc.length-1&&/^Pallet/.test(t)?MARCA.c:'#6a7184';c.fillText(t,X+pad,y)})}});
  }
  // pie
  c.fillStyle=MARCA.c;c.fillRect(0,F.h-pie,F.w,pie);c.textAlign='center';
  if(ev){c.fillStyle='#ffd54a';c.fillRect(0,F.h-pie,F.w,ev);c.fillStyle='#1c2333';let ef=34;const et='🚚 Envío GRATIS desde '+$m(S.vcfg.envio).replace(',00','')+(S.vcfg.costoEnvio?' · menor: '+$m(S.vcfg.costoEnvio).replace(',00',''):'');
    c.font=`800 ${ef}px ${FONT}`;while(c.measureText(et).width>F.w-2*m&&ef>20){ef--;c.font=`800 ${ef}px ${FONT}`}c.textBaseline='middle';c.fillText(et,F.w/2,F.h-pie+ev/2);c.textBaseline='alphabetic'}
  c.fillStyle='#fff';c.font=`800 46px ${FONT}`;c.fillText(S.telEmp?'Pedí por WhatsApp  '+S.telEmp:'Sabores de mi País',F.w/2,F.h-pie+ev+66);
  c.font=`500 26px ${FONT}`;c.fillStyle='rgba(255,255,255,.9)';c.fillText('Precios con IVA · lista '+o.lista+(o.pie?' · '+o.pie:''),F.w/2,F.h-pie+ev+112);c.textAlign='left';
  try{const{data:cp}=await sb.from('config_app').select('valor').eq('clave','catalogo_publico').maybeSingle();
    if(['mayorista','minorista','especial'].includes(cp?.valor)){const q=await qrURL(urlBase('ver=catalogo'),240);if(q){const im=new Image();await new Promise(r=>{im.onload=r;im.onerror=r;im.src=q});
      const z=pie-ev-28;c.fillStyle='#fff';c.fillRect(F.w-m-z-8,F.h-pie+ev+10,z+16,z+8);c.drawImage(im,F.w-m-z,F.h-pie+ev+14,z,z)}}}catch(e){}
  return cv}
function fbPrecio(p,l){const id=p.producto_id,v=+p['precio_'+l]||0;
  if(esKg(id))return{p:v,u:'x kg',uz:'每公斤'};
  if(ppz(id))return{p:v,u:'la pieza',uz:'每块',kg:'≈ '+nf(ppz(id))+' kg · '+$m(v/ppz(id))+' x kg'};
  return{p:v,u:'c/u',uz:'每件'}}
async function folletoBilingue(){
  const m=document.createElement('div');m.className='modal';document.body.appendChild(m);
  const l0=['mayorista','minorista','especial'].includes(S.fbL)?S.fbL:'mayorista';
  const cands=l=>S.productos.filter(p=>+p['precio_'+l]>0);
  let sel=[];/* [{id,zh}] */
  const elegirDef=l=>{const C=cands(l).filter(p=>['Fiambres','Quesos'].includes(famGrupo(p.familia))||esPeso(p.producto_id));const out=[];
    for(const re of FB_DEF){const p=C.filter(p=>re.test(norm(p.descripcion))&&!out.some(x=>x.id==p.producto_id)).sort((a,b)=>esPeso(b.producto_id)-esPeso(a.producto_id))[0];if(p)out.push({id:p.producto_id,zh:zhProd(p.descripcion)})}
    return out};
  sel=(S.fbSel||[]).filter(x=>S.productos.some(p=>p.producto_id==x.id));if(!sel.length)sel=elegirDef(l0);
  m.innerHTML=`<div class="mc fo"><div class="bh"><h3>Folleto bilingüe para supermercados</h3><button class="alt" id="fb_x">Cerrar</button></div>
    <p><small>Español y chino simplificado (中文), con tus precios reales. Elegí hasta 8 productos: lo ideal son 4 a 6 donde estés fuerte en precio. El nombre en chino sale solo; si alguno queda vacío o lo querés cambiar, escribilo vos.</small></p>
    <div class="g"><label class="f">Precios de la lista<select id="fb_l">${['mayorista','minorista','especial'].map(l=>`<option value="${l}" ${l==l0?'selected':''}>${nomL(l)}</option>`).join('')}</select></label>
      <label class="f">Pago al recibir<input id="fb_pg" maxlength="40" value="${esc(S.fbPg??'Efectivo o transferencia')}" placeholder="Ej.: Efectivo o transferencia"></label></div>
    <label class="chk"><input type="checkbox" id="fb_mu" ${S.fbMu===false?'':'checked'}> Ofrecer muestra sin cargo (免费试吃样品)</label>
    ${S.telEmp?'':'<p class="err"><small>Cargá tu WhatsApp en Cobranza (Tu WhatsApp) para que salga en el folleto.</small></p>'}
    <div class="conscan"><input id="fb_q" placeholder="Agregar producto (nombre o código)" autocomplete="off"></div><div id="fb_r"></div>
    <div id="fb_lst"></div>
    <div class="fc-acc"><button id="fb_a4">📄 Folleto A4 para imprimir</button><button class="alt" id="fb_wa">🖼️ Imagen para WhatsApp</button><a class="lnk" id="fb_def">Volver a los sugeridos</a></div>
    <div id="fb_out"></div></div>`;
  const L=()=>$('#fb_l').value,guardar=()=>{S.fbSel=sel;S.fbL=L();S.fbPg=$('#fb_pg').value.trim();S.fbMu=$('#fb_mu').checked};
  const pintar=()=>{const l=L();
    $('#fb_lst').innerHTML=sel.length?`<div class="tw"><table><tr><th>Producto</th><th>中文</th><th class="n">Precio</th><th></th></tr>${sel.map((x,i)=>{const p=S.productos.find(p=>p.producto_id==x.id),pr=fbPrecio(p,l);
      return `<tr><td>${esc(p.descripcion)}</td><td><input data-fz="${i}" value="${esc(x.zh)}" maxlength="12" placeholder="nombre en chino" style="max-width:150px;margin:0"></td><td class="n">${pr.p>0?$m(pr.p)+' <small>'+pr.u+'</small>':'<span class="err">sin precio</span>'}</td><td><a class="lnk" data-fq="${i}" aria-label="Quitar">✕</a></td></tr>`}).join('')}</table></div><p><small>${sel.length} de 8 productos.</small></p>`
      :'<p><small>Todavía no elegiste productos. Buscalos arriba.</small></p>';
    $$('#fb_lst [data-fz]').forEach(i=>i.oninput=()=>{sel[+i.dataset.fz].zh=i.value.trim();guardar()});
    $$('#fb_lst [data-fq]').forEach(a=>a.onclick=()=>{sel.splice(+a.dataset.fq,1);guardar();pintar()})};
  $('#fb_x').onclick=()=>m.remove();
  $('#fb_l').onchange=()=>{guardar();pintar()};$('#fb_pg').oninput=guardar;$('#fb_mu').onchange=guardar;
  $('#fb_def').onclick=()=>{sel=elegirDef(L());guardar();pintar()};
  buscador('#fb_q','#fb_r',p=>{if(sel.some(x=>x.id==p.producto_id))return toast('Ya está en el folleto.',1);if(sel.length>=8)return toast('Máximo 8 productos: quitá alguno primero.',1);
    sel.push({id:p.producto_id,zh:zhProd(p.descripcion)});guardar();pintar()});
  pintar();
  const items=()=>{const l=L();return sel.map(x=>{const p=S.productos.find(p=>p.producto_id==x.id);return{d:p.descripcion,zh:x.zh,...fbPrecio(p,l)}}).filter(x=>x.p>0)};
  const benef=()=>[['Te lo llevamos al local','送货到店','Lunes a sábado · 周一至周六'],['Pedí hasta las 20 h','晚上8点前下单','Llega al día siguiente · 次日送达'],['Pagás al recibir','货到付款',$('#fb_pg').value.trim()],['Precio mayorista','批发价','Con IVA incluido · 含税']];
  $('#fb_a4').onclick=()=>{const I=items();if(!I.length)return toast('Elegí al menos un producto con precio.',1);guardar();
    const w=window.open('','_blank');if(!w)return toast('Permití las ventanas emergentes para generar el folleto.',1);
    const C=MARCA.c,hoy=new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'});
    w.document.write(`<html lang="es"><head><meta charset="utf-8"><title>Folleto supermercados ${new Date().toLocaleDateString('es-AR')}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500;700;900&display=swap">
    <style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:${FB_FONT};color:#26191d;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .pg{width:210mm;height:296mm;display:flex;flex-direction:column;background:#fbf8f6;overflow:hidden}
    .cab{background:${C};color:#fff;padding:6mm 10mm;display:flex;align-items:center;gap:5mm}.cab img{width:20mm;height:20mm;object-fit:contain;background:#fff;border-radius:3mm;padding:1mm}
    .cab .n{font-size:26px;font-weight:900;line-height:1.1}.cab .z{font-size:18px;font-weight:700;letter-spacing:.08em}.cab .d{margin-left:auto;text-align:right;font-size:14px;font-weight:600}
    .hero{padding:8mm 10mm 5mm}.hero h1{margin:0;font-size:50px;line-height:1.02;color:${C};font-weight:900}.hero .z{font-size:36px;font-weight:900;margin-top:1mm}.hero p{margin:2mm 0 0;font-size:17px;font-weight:600;color:#5c4b50}
    .ben{padding:0 10mm;display:grid;grid-template-columns:1fr 1fr;gap:3mm}.b{background:#fff;border:2px solid #eadfdc;border-radius:4mm;padding:3mm 4mm;display:flex;gap:3.5mm;align-items:center}
    .b .k{width:12mm;height:12mm;flex:none;border-radius:50%;background:#f5c542;display:grid;place-items:center;font-weight:900;font-size:20px}.b .t{font-weight:800;font-size:18px;line-height:1.15}.b .zt{font-weight:700;font-size:17px;color:${C}}.b .s{font-size:12.5px;color:#5c4b50}
    .pr{padding:6mm 10mm 0}.ph{display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid ${C};padding-bottom:1.5mm;font-size:22px;font-weight:900;color:${C}}.ph small{font-size:12px;color:#5c4b50;font-weight:600}
    .gr{display:grid;grid-template-columns:1fr 1fr;column-gap:7mm}.it{display:flex;justify-content:space-between;align-items:flex-end;gap:3mm;padding:${I.length>6?3:4.2}mm 0;border-bottom:1px dashed #d9ccc8}
    .it .e{font-weight:800;font-size:${I.length>6?16.5:18.5}px;line-height:1.15}.it .zz{font-size:15px;color:#5c4b50;font-weight:500}.it .v{text-align:right;white-space:nowrap}.it .v b{font-size:${I.length>6?21:24}px;color:${C};font-weight:900}.it .v span{display:block;font-size:11.5px;color:#5c4b50}
    .mu{margin:5mm 10mm 0;background:#f5c542;border-radius:4mm;padding:4mm 6mm;display:flex;justify-content:space-between;font-size:22px;font-weight:900}
    .pie{margin-top:auto;background:${C};color:#fff;padding:5mm 10mm;display:flex;align-items:center;gap:5mm}.pie .a{font-size:17px;font-weight:600}.pie .t{font-size:36px;font-weight:900;letter-spacing:.02em}.pie .v{margin-left:auto;font-size:11px;text-align:right;opacity:.9}
    .ayuda{font:14px system-ui;background:#f6e9ec;padding:10px;margin:10px}@media print{.ayuda{display:none}}</style><style>${docCss()}</style></head><body>
    <p class="ayuda">Para guardarlo en PDF elegí <b>Guardar como PDF</b>. En "Más opciones" activá <b>Gráficos de fondo</b> para que salgan los colores.</p>
    <div class="pg"><div class="cab">${MARCA.logo?`<img src="${MARCA.logo}" alt="">`:''}<div><div class="n">Sabores de mi País</div><div class="z">食品批发配送</div></div><div class="d">Distribuidora<br>de alimentos</div></div>
    <div class="hero"><h1>Fiambres y quesos<br>por pieza</h1><div class="z">整块冷切肉和奶酪</div><p>Para tu fiambrería, a precio mayorista · 为您的熟食柜台提供批发价</p></div>
    <div class="ben">${benef().map((b,i)=>`<div class="b"><div class="k">${i+1}</div><div><div class="t">${esc(b[0])}</div><div class="zt">${b[1]}</div>${b[2]?`<div class="s">${esc(b[2])}</div>`:''}</div></div>`).join('')}</div>
    <div class="pr"><div class="ph"><span>Precios · 价格</span><small>Con IVA · 含税 · al ${hoy}</small></div>
      <div class="gr">${I.map(x=>`<div class="it"><div><div class="e">${esc(x.d)}</div>${x.zh?`<div class="zz">${esc(x.zh)}</div>`:''}</div><div class="v"><b>${$m(x.p)}</b><span>${x.u} · ${x.uz}${x.kg?'<br>'+esc(x.kg):''}</span></div></div>`).join('')}</div></div>
    ${$('#fb_mu').checked?'<div class="mu"><span>Pedí una muestra sin cargo</span><span>免费试吃样品</span></div>':''}
    <div class="pie"><div><div class="a">Pedí por WhatsApp · 通过WhatsApp订货</div><div class="t">${esc(S.telEmp||'Sabores de mi País')}</div></div><div class="v">Precios sujetos a<br>modificación sin aviso</div></div></div>
    <script>document.fonts&&document.fonts.ready.then(()=>setTimeout(()=>window.print(),400))<\/script></body></html>`);w.document.close()};
  $('#fb_wa').onclick=async()=>{const I=items();if(!I.length)return toast('Elegí al menos un producto con precio.',1);guardar();
    $('#fb_wa').disabled=true;$('#fb_out').innerHTML='<p>Armando la imagen…</p>';
    try{await cargarFuenteSC()}catch(e){}
    const W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d'),M=60,F=FB_FONT;
    c.fillStyle=MARCA.c;c.fillRect(0,0,W,H);
    const logo=await cargarImg(MARCA.logo);let tx=M;if(logo){c.fillStyle='#fff';rrect(c,M,M,120,120,20);c.fill();const k=Math.min(108/logo.width,108/logo.height);c.drawImage(logo,M+60-logo.width*k/2,M+60-logo.height*k/2,logo.width*k,logo.height*k);tx=M+148}
    c.fillStyle='#fff';c.textBaseline='alphabetic';c.font=`900 46px ${F}`;c.fillText('Sabores de mi País',tx,M+58);c.font=`700 32px ${F}`;c.fillText('食品批发配送',tx,M+104);
    let y=M+230;c.font=`900 84px ${F}`;c.fillText('Fiambres y quesos',M,y);y+=86;c.fillText('por pieza',M,y);y+=78;c.fillStyle='#f5c542';c.font=`900 62px ${F}`;c.fillText('整块冷切肉和奶酪',M,y);
    // tarjeta de precios
    const fy=H-M-150;y+=40;const n=I.length,rh=Math.min(96,Math.floor((fy-y-150)/Math.max(n,1))),cardH=rh*n+40;c.fillStyle='#fff';rrect(c,M,y,W-2*M,cardH,26);c.fill();
    I.forEach((x,i)=>{const Y=y+20+i*rh;if(i){c.strokeStyle='#e4dcd9';c.lineWidth=2;c.beginPath();c.moveTo(M+30,Y);c.lineTo(W-M-30,Y);c.stroke()}
      c.font=`900 ${Math.round(rh*.42)}px ${F}`;const pw=c.measureText($m(x.p)).width;c.fillStyle='#26191d';c.font=`800 ${Math.round(rh*.36)}px ${F}`;c.fillText(lineas(c,x.d,W-2*M-90-pw,1)[0],M+30,Y+rh*.45);
      if(x.zh){c.fillStyle='#5c4b50';c.font=`700 ${Math.round(rh*.3)}px ${F}`;c.fillText(x.zh,M+30,Y+rh*.84)}
      c.textAlign='right';c.fillStyle=MARCA.c;c.font=`900 ${Math.round(rh*.42)}px ${F}`;c.fillText($m(x.p),W-M-30,Y+rh*.5);c.fillStyle='#5c4b50';c.font=`600 ${Math.round(rh*.24)}px ${F}`;c.fillText(x.u+' · '+x.uz,W-M-30,Y+rh*.84);c.textAlign='left'});
    y=cardH+y+(fy-cardH-y-96)/2+34;
    c.fillStyle='#fff';c.font=`700 34px ${F}`;c.fillText('✔ Te lo llevamos al local · 送货到店',M,y);c.fillText('✔ Pagás al recibir · 货到付款',M,y+48);
    c.fillStyle='#f5c542';rrect(c,M,fy,W-2*M,150,26);c.fill();c.fillStyle='#26191d';
    c.font=`700 30px ${F}`;c.fillText($('#fb_mu').checked?'Pedí una muestra sin cargo · 免费试吃样品':'Pedí por WhatsApp · 通过WhatsApp订货',M+30,fy+50);
    let ts=58;const tt='WhatsApp '+(S.telEmp||'');c.font=`900 ${ts}px ${F}`;while(c.measureText(tt).width>W-2*M-60&&ts>30){ts-=2;c.font=`900 ${ts}px ${F}`}c.fillText(S.telEmp?tt:'Sabores de mi País',M+30,fy+118);
    const b=await new Promise(ok=>cv.toBlob(ok,'image/jpeg',.92)),u=URL.createObjectURL(b),nom='Folleto supermercados.jpg';
    $('#fb_wa').disabled=false;
    $('#fb_out').innerHTML=`<div class="fo-out"><div><img src="${u}" alt="Folleto bilingüe"></div></div><div class="fc-acc">${navigator.canShare?'<button id="fb_sh">Compartir por WhatsApp</button>':''}<a class="lnk" download="${nom}" href="${u}">Descargar</a></div>`;
    $('#fb_sh')&&($('#fb_sh').onclick=async()=>{const f=new File([b],nom,{type:'image/jpeg'});try{if(navigator.canShare({files:[f]}))await navigator.share({files:[f],text:'¡Hola! Soy de *Sabores de mi País* 👋 您好!我们是食品批发商。Fiambres y quesos por pieza a precio mayorista · 整块冷切肉和奶酪,批发价。'})}catch(e){}})};
}
/* La fuente china para la imagen: Android suele traerla; si no, la bajo de Google Fonts antes de dibujar */
async function cargarFuenteSC(){if(document.fonts&&document.fonts.check('900 40px "Noto Sans SC"','中'))return;
  if(!document.getElementById('f_sc')){const k=document.createElement('link');k.id='f_sc';k.rel='stylesheet';k.href='https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500;700;900&display=swap';document.head.appendChild(k)}
  await Promise.race([Promise.all(['500','700','900'].map(w=>document.fonts.load(w+' 40px "Noto Sans SC"','中文'))),new Promise(r=>setTimeout(r,4000))])}
async function folletoOfertas(opt){
  const fams=[...new Set(S.productos.map(p=>(p.familia||'').trim()).filter(Boolean))].sort(famCmp);
  const m=document.createElement('div');m.className='modal';document.body.appendChild(m);let sel=[],man=new Set(),quit=new Set();
  const hoy=new Date(),fin=new Date(hoy.getTime()+7*864e5);
  m.innerHTML=`<div class="mc fo"><div class="bh"><h3>📣 Folleto de ofertas</h3><button class="alt" id="fo_x">Cerrar</button></div>
    <div class="g"><div class="fo-fam">Familias (podés marcar varias)<details id="fo_fd"><summary id="fo_fs">Todas las ofertas</summary><div class="fo-l"><label><input type="checkbox" id="fo_fall" checked> <b>Todas las ofertas</b></label>${fams.map(f=>`<label><input type="checkbox" data-ff="${esc(f)}"> ${esc(f)}</label>`).join('')}</div></details></div>
      <label class="f">Precios de la lista<select id="fo_l"><option>minorista</option><option>mayorista</option><option value="especial">gastronomía</option></select></label>
      <label class="f">Formato<select id="fo_t">${Object.entries(FMT).map(([k,f])=>`<option value="${k}">${f.t} · ${f.n} productos</option>`).join('')}</select></label>
      <label class="f">Título<input id="fo_ti" value="OFERTAS" maxlength="22"></label>
      <label class="f">Vigencia<input id="fo_vg" value="Válido hasta el ${fin.toLocaleDateString('es-AR',{day:'numeric',month:'long'})} o hasta agotar stock" maxlength="70"></label></div>
    <div class="conscan"><input id="fo_q" placeholder="Agregar otro producto (nombre o código)" autocomplete="off">${btnScan('fo_sc')}</div><div id="fo_r"></div>
    ${S.combos.length?'<label class="chk"><input type="checkbox" id="fo_cb" checked> Incluir los combos ('+S.combos.length+')</label>':''}
    <div id="fo_lst"></div><button id="fo_g">Armar folleto</button><div id="fo_out"></div></div>`;
  $('#fo_x').onclick=()=>m.remove();
  const famSet=()=>new Set([...$$('#fo_fd [data-ff]')].filter(i=>i.checked).map(i=>i.dataset.ff));
  const famTxt=()=>{const F=[...famSet()];$('#fo_fs').textContent=!F.length?'Todas las ofertas':F.length==1?F[0]:F.length+' familias: '+F.join(', ')};
  let solo=!!(opt&&opt.soloProds&&(opt.prods||[]).length);
  const cand=()=>{const l=$('#fo_l').value,F=famSet();if(solo&&!F.size)return [...man].map(id=>S.productos.find(p=>p.producto_id==id)).filter(p=>p&&+p['precio_'+l]>0);const base=S.productos.filter(p=>+p['precio_'+l]>0&&S.min[p.producto_id]?.a!==false&&(!F.size||F.has((p.familia||'').trim())));
    let A=base.filter(p=>promoCerca(p.producto_id,l));if(!A.length)A=base.filter(p=>S.min[p.producto_id]?.foto).slice(0,24);
    const ids=new Set(A.map(p=>p.producto_id));for(const id of man)ids.add(id);
    return [...ids].map(id=>S.productos.find(p=>p.producto_id==id)).filter(p=>p&&+p['precio_'+l]>0).sort((a,b)=>(!!S.min[b.producto_id]?.foto)-(!!S.min[a.producto_id]?.foto)||a.descripcion.localeCompare(b.descripcion))};
  const lst=()=>{const C=cand(),l=$('#fo_l').value;sel=C.filter(p=>!quit.has(p.producto_id));
    $('#fo_lst').innerHTML=C.length?`<p><small>${C.some(p=>promoCerca(p.producto_id,l))?'Productos en oferta':'No hay promociones activas en lo que elegiste: muestro productos destacados con foto (sin descuento). Creá una promoción en Precios para mostrar precio tachado.'} · ${sel.length} elegidos → ${Math.ceil(sel.length/(sel.some(p=>{const x=S.min[p.producto_id];return x&&x.b>1&&(x.ud>1||x.bp>0)})?($('#fo_t').value=='historia'?4:3):FMT[$('#fo_t').value].n))||0} ${Math.ceil(sel.length/(sel.some(p=>{const x=S.min[p.producto_id];return x&&x.b>1&&(x.ud>1||x.bp>0)})?($('#fo_t').value=='historia'?4:3):FMT[$('#fo_t').value].n))==1?'imagen':'imágenes'}</small></p>
      <div class="fo-l">${C.map(p=>{const r=promoCerca(p.producto_id,l);return`<label><input type="checkbox" data-fo="${p.producto_id}" ${quit.has(p.producto_id)?'':'checked'}> ${S.min[p.producto_id]?.foto?'📷':'<span class="sinf">sin foto</span>'} ${esc(p.descripcion)} ${r?`<b class="promo">−${nf(r.descuento_pct)} %</b>`:''}</label>`}).join('')}</div>`
      :'<p><small>No hay productos para mostrar con ese filtro.</small></p>';
    $$('#fo_lst [data-fo]').forEach(i=>i.onchange=()=>{i.checked?quit.delete(i.dataset.fo):quit.add(i.dataset.fo);lst()})};
  ['#fo_l','#fo_t'].forEach(k=>$(k).onchange=()=>{quit.clear();lst()});
  $$('#fo_fd [data-ff]').forEach(i=>i.onchange=()=>{solo=false;$('#fo_fall').checked=!famSet().size;famTxt();quit.clear();lst()});
  $('#fo_fall').onchange=()=>{if($('#fo_fall').checked){$$('#fo_fd [data-ff]').forEach(i=>i.checked=false)}else if(!famSet().size){$('#fo_fall').checked=true;return}famTxt();quit.clear();lst()};
  if(opt){if(opt.lista&&$('#fo_l').querySelector(`option[value="${opt.lista}"]`))$('#fo_l').value=opt.lista;if(opt.fmt&&FMT[opt.fmt])$('#fo_t').value=opt.fmt;
    if(opt.titulo)$('#fo_ti').value=opt.titulo.slice(0,22);
    $$('#fo_fd [data-ff]').forEach(i=>i.checked=(opt.fams||[]).includes(i.dataset.ff));$('#fo_fall').checked=!famSet().size;famTxt();
    for(const id of opt.prods||[])man.add(id);if(opt.soloProds&&(opt.prods||[]).length)$$('#fo_fd [data-ff]').forEach(i=>i.checked=false)}
  lst();
  buscador('#fo_q','#fo_r',p=>{man.add(p.producto_id);quit.delete(p.producto_id);lst()});$('#fo_sc').onclick=()=>escanear('Agregar al folleto',p=>{man.add(p.producto_id);lst();return '✔ '+p.descripcion});
  $('#fo_g').onclick=async()=>{if(!sel.length)return toast('Elegí al menos un producto.',1);const l=$('#fo_l').value,fmt=$('#fo_t').value,F=FMT[fmt],fs=[...famSet()],f=fs.length==1?fs[0]:'';
    $('#fo_g').disabled=true;$('#fo_out').innerHTML='<p>Armando…</p>';
    const items=sel.map(p=>{const r=promoCerca(p.producto_id,l),base=+p['precio_'+l],b=bul(p.producto_id);const pr=r?Math.round(base*(1-r.descuento_pct/100)*100)/100:base;
      return{d:p.descripcion,img:S.min[p.producto_id]?.foto||'',p:pr,ant:r?base:null,pct:r?+r.descuento_pct:0,cond:r&&condPromo(r)?condPromo(r):'',bulto:b?bulL(b)+': '+$m(pr*b.n):'',esc:escFolleto(p.producto_id,pr),cu:!!b&&!esPeso(p.producto_id)}});
    if($('#fo_cb')?.checked)items.unshift(...S.combos.map(c=>{const v=comboPrecio(c,l);return{d:'🎁 '+c.nombre,img:S.min[(c.items||[]).find(x=>S.min[x.id]?.foto)?.id]?.foto||'',p:v.p,ant:v.s,pct:+c.descuento_pct,cond:comboTxt(c)}}));
    const filas=items.some(x=>x.esc),porPag=filas?(fmt=='historia'?4:3):F.n;
    const pags=[];for(let i=0;i<items.length;i+=porPag)pags.push(items.slice(i,i+porPag));
    const cvs=[];for(const [k,pg] of pags.entries())cvs.push(await dibujarFolleto(pg,{filas,fmt,lista:l,titulo:$('#fo_ti').value.trim().toUpperCase(),sub:f?cap1(f):'de la semana',vig:$('#fo_vg').value.trim(),pie:pags.length>1?(k+1)+'/'+pags.length:''}));
    const blobs=await Promise.all(cvs.map(cv=>new Promise(ok=>cv.toBlob(ok,'image/jpeg',.9))));
    const nom=k=>'Ofertas '+(f||'Sabores')+(pags.length>1?' '+(k+1):'')+'.jpg';
    $('#fo_out').innerHTML=`<p><b>${cvs.length} ${cvs.length==1?'imagen lista':'imágenes listas'}.</b> ${navigator.canShare?'Tocá Compartir para mandarlas por WhatsApp o subirlas a tu estado.':'Descargalas y mandalas por WhatsApp o subilas a Instagram.'}</p>
      <div class="fo-out">${blobs.map((b,k)=>`<div><img src="${URL.createObjectURL(b)}" alt="Folleto ${k+1}"><div class="fc-acc"><a class="lnk" download="${esc(nom(k))}" href="${URL.createObjectURL(b)}">Descargar</a></div></div>`).join('')}</div>
      <div class="fc-acc">${navigator.canShare?'<button id="fo_sh">Compartir</button>':''}<button class="alt" id="fo_dl">Descargar ${cvs.length>1?'todas':''}</button></div>`;
    $('#fo_g').disabled=false;
    $('#fo_dl').onclick=()=>blobs.forEach((b,k)=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=nom(k);document.body.appendChild(a);a.click();a.remove()});
    $('#fo_sh')&&($('#fo_sh').onclick=async()=>{const files=blobs.map((b,k)=>new File([b],nom(k),{type:'image/jpeg'}));
      try{if(navigator.canShare({files}))await navigator.share({files,text:'Ofertas de Sabores de mi País'+(S.telEmp?' · Pedí por WhatsApp '+S.telEmp:'')});else $('#fo_dl').click()}catch(e){}})};
}
function vVentas(){
  S.vs=S.vs||'rapido';const due=S.perfil.rol=='dueno';
  let GR=[['🚀 Rápido',[['rapido','🚀 Difundir y vender']]],['⚡ Hoy',[['cola','⚡ Cola del día'],['plansem','🗓️ Plan de ataque'],['plan','📋 Plan del día'],['auto','⚙️ Automatizaciones']]],
    ['🤝 Clientes',[['toca','📞 Les toca comprar'],['miraron','👀 Miraron el catálogo'],['carritos','🛒 Carritos sin enviar'],['menos','📉 Comprando menos'],['presupuestos','📝 Presupuestos'],['esperan','🔔 Esperan productos'],['clave','👑 Cuentas clave'],['ataque','⚔️ Ataque a la competencia'],['nuevos90','🌱 Primeros 90 días'],['bienvenida','👋 Bienvenida y aniversarios'],['encuestas','⭐ Encuestas'],['reclamos','🆘 Reclamos'],['faq','💬 Preguntas del catálogo'],['votacion','🗳️ Votación de productos'],['muestras','🧪 Muestras'],['comodatos','🧊 Exhibidores']]],
    ['🧲 Prospectos',[['embudo','🧲 Embudo de prospectos'],['ruta','🚶 Ruta de prospección'],['llamadas','📞 Modo llamadas'],['buscarneg','🗺️ Buscar negocios'],['cobertura','🧭 Zonas sin cubrir']]],
    ['🏷️ Ofertas y difusión',[['invitar','🚀 Invitar a pedir online'],['campanias','📣 Campañas'],['novsem','📋 Novedades semanal'],['estados','📱 Estados de WhatsApp'],['tarjeta','🖼️ Tarjeta de producto'],['difusion','🖼️ Folletos y catálogo'],['fiambres','🧀 Fiambres por kilo'],['fechas','📅 Fechas'],['rubros','🏪 Por rubro'],['qr','🔳 QR por campaña'],['contactos','📇 Contactos para WhatsApp'],['puntos','🏆 Puntos y desafío'],['liga','🏆 Liga de clientes'],['sorteo','🎟️ Sorteo del mes'],['cambios','📢 Cambios de precio'],['relampago','⚡ Relámpago'],['cupo','🔥 Oferta por cupo'],['personal','🎯 Ofertas personales'],['combos','🎁 Combos'],['cantidad','🏷️ Precio por cantidad'],['cupones','🎟️ Cupones'],['liquidar','📦 Liquidar stock'],['preventa','🔜 Preventa'],['novedades','✨ Novedades'],['acuerdos','📜 Acuerdos comerciales'],['micombo','🧺 Combo de siempre'],['checkout','🛒 Oferta de último momento'],['empujar','🚀 Productos para empujar'],['online','📲 Premio por pedir online'],['quincenal','📦 Pedido quincenal'],['niveles','🥇 Niveles'],['pvp','💰 Precio sugerido'],['bultos','📦 Venta por bulto'],['redondeo','🏷️ Precios redondeados'],['aumento','📈 Aviso de aumento'],['reglas','💲 Descuentos y mínimo']]],
    ['📸 Instagram',[['ig','📸 Contenido'],['igcal','🗓️ Calendario y reels'],['igbio','🔗 Página para la bio'],['igsorteo','🎁 Sorteo'],['igpros','📥 Prospectos de Instagram'],['igshop','🛍️ Catálogo para Shopping']]],
    ['📊 Analizar',[['semana','📊 Resumen semanal'],['anual','📆 Año contra año'],['rentkg','🧀 Rentabilidad quesos y fiambres'],['zonasrep','🗺️ Reparto por zona'],['captacion','🧲 Captación'],['pronostico','🔮 Pronóstico del mes'],['tablero','📺 Tablero en vivo'],['rentcli','💼 Rentabilidad por cliente'],['simulador','🧪 Simulador de aumento'],['abc','🅰️ ABC'],['potencial','📊 Potencial'],['competencia','🏁 Competencia'],['nocompra','🚶 Por qué no compran'],['perdidas','💸 Ventas perdidas'],['buscan','🔎 Qué buscan y piden'],['marcas','🏭 Por marca'],['zonas','🗺️ Por zona'],['horarios','🕐 Cuándo piden'],['proveedores','🏭 Metas y reintegros']]]];
  /* El vendedor ve sólo las herramientas para vender (las de precios, márgenes y configuración son del dueño) */
  if(S.perfil.rol=='vendedor'){const OK=['rapido','cola','plansem','plan','toca','miraron','carritos','menos','presupuestos','esperan','clave','nuevos90','bienvenida','reclamos','embudo','ruta','llamadas','buscarneg','cobertura','invitar','estados','tarjeta','difusion','fiambres','fechas','rubros','contactos','nocompra','buscan','potencial'];
    GR=GR.map(([g,L])=>[g,L.filter(([k])=>OK.includes(k))]).filter(([,L])=>L.length);if(!OK.includes(S.vs))S.vs='rapido'}
  GR=menuAplicar(GR);
  const gAct=(GR.find(([g,L])=>g==S.vg&&L.some(([k])=>k==S.vs))||GR.find(([g,L])=>L.some(([k])=>k==S.vs))||GR[0])[0],act=GR.find(([g])=>g==gAct)[1];
  $('#v').innerHTML=`<div class="vhd"><h2>Ventas</h2><button class="alt vcfg" onclick="menuVentasCfg()" title="Ocultar pantallas y elegir favoritas" aria-label="Ajustes de Ventas">${IC('gear',20)}</button><input id="vbus" type="search" placeholder="Buscar herramienta…" autocomplete="off"></div>
    <div class="vtab">${GR.map(([g])=>`<button class="${g==gAct?'on':''}" data-vg="${esc(g)}">${g}</button>`).join('')}</div>
    <div class="sub ctsub vsubs" id="vsubs">${act.map(([k,t])=>`<button class="${S.vs==k?'':'alt'}" data-vs="${k}">${t}</button>`).join('')}</div><div id="vs"><span class="skl" role="status" aria-label="Cargando"></span></div>`;
  $$('[data-vg]').forEach(b=>b.onclick=()=>{const L=GR.find(([g])=>g==b.dataset.vg)[1];S.vg=b.dataset.vg;S.vs=L[0][0];vVentas()});
  $('#vbus').oninput=e=>{const q=norm(e.target.value.trim());const T=q?GR.flatMap(([g,L])=>L.map(x=>[...x,g])).filter(([k,t,g])=>norm(t+' '+g).includes(q)):null;
    $('#vsubs').innerHTML=(T||act).map(([k,t,g])=>`<button class="${S.vs==k?'':'alt'}" data-vs="${k}">${t}${T?` <small style="opacity:.6">· ${esc(g.replace(/^\S+\s/,''))}</small>`:''}</button>`).join('')||'<small>No encontré esa pantalla.</small>';
    $$('#vsubs [data-vs]').forEach(b=>b.onclick=()=>{S.vs=b.dataset.vs;S.vg=null;vVentas()})};
  $$('[data-vs]').forEach(b=>b.onclick=()=>{S.vs=b.dataset.vs;vVentas()});
  ({rapido:vRapido,invitar:vInvitar,faq:vFaq,votacion:vVotacion,anual:vAnual,zonasrep:()=>{$('#vs').innerHTML='<div class="box"><p>Se abrió la pantalla de zonas de reparto. También está en Reparto → 🗺️ Zonas y camioneta.</p><button onclick="zonasReparto()">Abrir de nuevo</button></div>';zonasReparto()},rentkg:vRentKg,fiambres:vFiambresKg,micombo:vMiCombo,checkout:vCheckout,empujar:vEmpujar,online:vOnline,pronostico:vPronostico,tablero:vTableroInfo,ig:vIG,igcal:vIGCal,igbio:vIGBio,igsorteo:vIGSorteo,igpros:vIGPros,igshop:vIGShop,plansem:vPlanSem,clave:vClave,ataque:vAtaque,cupo:vCupo,acuerdos:vAcuerdos,quincenal:vQuincenal,liga:vLiga,rentcli:vRentCli,simulador:vSimulador,llamadas:vLlamadas,contactos:vContactos,cobertura:vCobertura,cola:vCola,auto:vAuto,nuevos90:vNuevos90,ruta:vRuta,qr:vQR,captacion:vCaptacion,buscarneg:vBuscarNegocios,comodatos:vComodatos,proveedores:vProveedores,horarios:vHorarios,plan:vPlan,semana:vSemana,embudo:vEmbudo,preventa:vPreventa,bultos:vBultos,redondeo:vRedondeo,reclamos:vReclamos,niveles:vNiveles,estados:vEstados,tarjeta:vTarjeta,perdidas:vPerdidas,potencial:vPotencial,zonas:vZonas,miraron:vMiraron,bienvenida:vBienvenida,personal:vPersonal,pvp:vPVP,sorteo:vSorteo,cambios:vCambiosPrecio,muestras:vMuestras,aumento:vAumento,novsem:vNovSemana,marcas:vMarcas,competencia:vCompetencia,nocompra:vNoCompra,carritos:vCarritos,esperan:vEsperan,liquidar:vLiquidar,relampago:vRelampago,buscan:vBuscan,abc:vABC,rubros:vRubros,fechas:vFechas,toca:vToca,menos:vMenos,encuestas:vEncuestas,presupuestos:vPresupuestos,cantidad:vCantidad,cupones:vCupones,puntos:vPuntos,campanias:vCampanias,combos:vCombos,novedades:vNovedades,reglas:vReglas,difusion:()=>{$('#vs').innerHTML='<div class="box" id="pr_vd"></div>';cajaVender()}})[S.vs]();
}
async function vRapido(cargar=true){if(cargar&&!(S._rpT>Date.now()-60000&&S.promos)){await Promise.all([cargarPromos(),typeof cargarStock=='function'?cargarStock():0]);S._rpT=Date.now()}if(S.vs!='rapido'||!$('#vs'))return;
  const R=S.rp=Object.assign({que:'oferta',fams:[],prods:[],aud:'todos',lista:'mayorista'},S.rp||{});const due=S.perfil.rol=='dueno',hoy=diaLocal(new Date());
  const fams=[...new Set(S.productos.map(p=>(p.familia||'').trim()).filter(Boolean))].sort(famCmp);R.fams=R.fams.filter(f=>fams.includes(f));
  const conPrecio=p=>+p['precio_'+R.lista]>0;
  const elegidos=()=>R.que=='oferta'?S.productos.filter(p=>conPrecio(p)&&promoCerca(p.producto_id,R.lista))
    :R.que=='fam'?S.productos.filter(p=>conPrecio(p)&&R.fams.includes((p.familia||'').trim()))
    :R.prods.map(id=>S.productos.find(p=>p.producto_id==id)).filter(Boolean);
  const act=S.promos.filter(r=>r.activa&&hoy>=r.desde&&(!r.hasta||hoy<=r.hasta));
  const nomPromo=r=>r.alcance=='producto'?nomProd(r.alcance_valor):r.alcance=='familia'?'Familia '+r.alcance_valor:r.alcance=='marca'?'Marca '+r.alcance_valor:'Todos los productos';
  const famTxt=()=>!R.fams.length?'Elegí una o varias familias':R.fams.length==1?R.fams[0]:R.fams.length+' familias: '+R.fams.join(', ');
  $('#vs').innerHTML=`<div class="box rp"><h3>📣 Difundir una oferta</h3>
    <div class="rp-p"><span>1</span>¿Qué ofrecés?</div>
    <div class="rp-ch">${[['oferta','🏷️ Lo que ya está en oferta'],['fam','🗂️ Familias'],['prod','🔎 Productos sueltos']].map(([k,t])=>`<button class="${R.que==k?'':'alt'}" data-rq="${k}">${t}</button>`).join('')}</div>
    ${R.que=='fam'?`<div class="fo-fam"><details id="rp_fd" ${R.fams.length?'':'open'}><summary>${esc(famTxt())}</summary><div class="fo-l">${fams.map(f=>`<label><input type="checkbox" data-rf="${esc(f)}" ${R.fams.includes(f)?'checked':''}> ${esc(f)}</label>`).join('')}</div></details></div>`:''}
    ${R.que=='prod'?`<div class="conscan"><input id="rp_q" placeholder="Agregá productos (nombre o código)" autocomplete="off">${btnScan('rp_sc')}</div><div id="rp_r"></div>
      <div>${R.prods.map((id,i)=>`<span class="chip">${esc(nomProd(id))} <a class="lnk" data-rx="${i}">✕</a></span>`).join(' ')}</div>`:''}
    <p class="rp-res" id="rp_res"></p>
    ${due&&R.que!='oferta'?`<details class="plg rp-dd"><summary>🏷️ Ponerle descuento ahora (opcional)</summary>
      <div class="g"><label class="f">Descuento %<input id="rp_pct" type="number" min="1" max="80" value="10"></label>
      <label class="f">¿Por cuánto tiempo?<select id="rp_dur">${RP_DUR.map(([v,t])=>`<option value="${v}" ${v=='7'?'selected':''}>${t}</option>`).join('')}</select></label></div>
      <button id="rp_cr">Crear la oferta</button><p><small>Queda en el catálogo de tus clientes con el precio tachado. "Solo hoy" sale arriba con cuenta regresiva.</small></p></details>`:''}
    <div class="rp-p"><span>2</span>¿Para quién?</div>
    <div class="rp-ch">${Object.entries(RP_AUD).filter(([k])=>k!='publico'||R.aud=='publico').map(([k,[i,t]])=>`<button class="${R.aud==k?'':'alt'}" data-ra="${k}"><span class="ici">${IC(i,17)}</span>${t}</button>`).join('')}</div>
    <label class="f rp-l">Precios de la lista<select id="rp_l">${['mayorista','minorista','especial'].map(l=>`<option value="${l}" ${R.lista==l?'selected':''}>${nomL(l)}</option>`).join('')}</select></label>
    <div class="rp-p"><span>3</span>¿Cómo lo mandás?</div>
    <div class="ppal rp-como"><button data-rc="folleto"><span>🖼️</span>${R.aud=='chino'?'Folleto bilingüe':'Folleto'}<small>WhatsApp e Instagram</small></button>
      <button class="alt" data-rc="estado"><span>📱</span>Estado<small>de WhatsApp</small></button>
      <button class="alt" data-rc="mensaje"><span>💬</span>Mensaje<small>a tus clientes</small></button>
      <button class="alt" data-rc="catalogo"><span>🔗</span>Catálogo<small>link para compartir</small></button></div></div>
  <div class="box"><h3>Todos los días</h3><div class="ppal rp-dia">${[['⚡','Cola del día','cola'],['📞','Les toca comprar','toca'],['🛒','Carritos sin enviar','carritos'],['📝','Presupuestos','presupuestos']].map(([i,t,k])=>`<button class="alt" data-rv="${k}"><span>${i}</span>${t}</button>`).join('')}</div></div>
  <div class="box"><div class="bh"><h3>🏷️ Ofertas activas <small>(${act.length})</small></h3><button class="alt" data-rv="relampago">⚡ Relámpago</button></div>
    ${act.length?`<table>${act.slice(0,12).map(r=>`<tr><td>${esc(nomPromo(r))}<br><small>${esc(r.nombre)}${r.hasta?' · hasta el '+fd(r.hasta):''}</small></td><td class="n"><span class="promo">−${nf(r.descuento_pct)} %</span></td><td>${due?`<a class="lnk" data-rt="${r.id}">Terminar</a>`:''}</td></tr>`).join('')}</table>${act.length>12?`<p><small>y ${act.length-12} más (Precios → Promociones).</small></p>`:''}`
      :'<p><small>No hay ofertas activas. Elegí productos o familias arriba y ponéles un descuento.</small></p>'}</div>`;
  const res=()=>{const E=elegidos(),cf=E.filter(p=>promoCerca(p.producto_id,R.lista)).length;
    $('#rp_res').innerHTML=E.length?`<b>${E.length}</b> ${E.length==1?'producto':'productos'}${R.que!='oferta'?` · ${cf} con oferta`:''}`:'<small>'+(R.que=='oferta'?'No tenés productos en oferta todavía. Elegí <a class="lnk" onclick="S.rp.que=\'fam\';vRapido(false)">Familias</a> o <a class="lnk" onclick="S.rp.que=\'prod\';vRapido(false)">Productos sueltos</a>.':R.que=='fam'?'Elegí al menos una familia.':'Agregá productos con el buscador.')+'</small>'};res();
  $$('#vs [data-rq]').forEach(b=>b.onclick=()=>{R.que=b.dataset.rq;vRapido(0)});
  $$('#vs [data-ra]').forEach(b=>b.onclick=()=>{R.aud=b.dataset.ra;R.lista=RP_AUD[R.aud][2];vRapido(0)});
  $('#rp_l').onchange=e=>{R.lista=e.target.value;res()};
  $$('#vs [data-rf]').forEach(i=>i.onchange=()=>{R.fams=[...$$('#vs [data-rf]')].filter(x=>x.checked).map(x=>x.dataset.rf);$('#rp_fd summary').textContent=famTxt();res()});
  if($('#rp_q')){buscador('#rp_q','#rp_r',p=>{if(!R.prods.includes(p.producto_id))R.prods.push(p.producto_id);vRapido(0);setTimeout(()=>$('#rp_q')&&$('#rp_q').focus(),50)});
    $('#rp_sc').onclick=()=>escanear('Agregar a la oferta',p=>{if(!R.prods.includes(p.producto_id))R.prods.push(p.producto_id);vRapido(0);return '✔ '+p.descripcion})}
  $$('#vs [data-rx]').forEach(a=>a.onclick=()=>{R.prods.splice(+a.dataset.rx,1);vRapido(0)});
  $$('#vs [data-rv]').forEach(b=>b.onclick=()=>{S.vs=b.dataset.rv;vVentas()});
  $$('#vs [data-rt]').forEach(a=>a.onclick=async()=>{if(!confirm('¿Terminar esta oferta? Deja de verse en el catálogo.'))return;const{error}=await sb.from('promociones').update({activa:false}).eq('id',a.dataset.rt);if(error)return toast(error.message,1);toast('Oferta terminada.');S._rpT=0;vRapido()});
  $('#rp_cr')&&($('#rp_cr').onclick=async()=>{const pct=+$('#rp_pct').value,d=$('#rp_dur').value;if(!(pct>0&&pct<90))return toast('Poné un % válido.',1);
    const E=elegidos();if(!E.length)return toast(R.que=='fam'?'Elegí al menos una familia.':'Agregá al menos un producto.',1);
    const mb=E.filter(p=>{const m=typeof margenP=='function'?margenP(p):null;return m!=null&&m-pct<(S.margenMin??15)});
    if(mb.length&&!confirm(`Con −${nf(pct)} % ${mb.length==1?'1 producto queda':mb.length+' productos quedan'} con margen debajo de tu mínimo (${S.margenMin??15} %). ¿Seguir igual?`))return;
    const hasta=d===''?null:diaLocal(new Date(Date.now()+(+d)*864e5)),nombre=d==='0'?REL:d==='7'?'Oferta de la semana':'Oferta';
    const base={nombre,descuento_pct:pct,minimo_tipo:'ninguno',minimo_unidades:0,listas:null,desde:hoy,hasta,activa:true};
    const rows=R.que=='fam'?R.fams.map(f=>({...base,alcance:'familia',alcance_valor:f})):E.map(p=>({...base,alcance:'producto',alcance_valor:p.producto_id}));
    $('#rp_cr').disabled=true;const{error}=await sb.from('promociones').insert(rows);$('#rp_cr').disabled=false;if(error)return toast(error.message,1);
    S._rpT=0;toast(`¡Listo! −${nf(pct)} % en ${R.que=='fam'?(R.fams.length==1?R.fams[0]:R.fams.length+' familias'):E.length+' productos'}. Ahora elegí cómo mandarlo.`);vRapido()});
  $$('#vs [data-rc]').forEach(b=>b.onclick=()=>{const c=b.dataset.rc,E=elegidos();
    if(c=='catalogo'){S.vs='difusion';return vVentas()}
    if(!E.length&&R.que!='oferta')return toast(R.que=='fam'?'Elegí al menos una familia.':'Agregá al menos un producto.',1);
    if(c=='mensaje'){const gr=R.aud=='gastro'?{s:'lista',x:'especial'}:R.aud=='publico'?{s:'lista',x:'minorista'}:R.aud=='helado'||R.aud=='chino'?{s:'rubro',x:[...new Set(S.clientes.map(c=>(c.rubro||'').trim()))].find(r=>R.aud=='chino'?/chin|super/i.test(r):/helad|panad/i.test(r))}
        :R.que=='fam'&&R.fams.length==1?{s:'familia',x:R.fams[0]}:{s:'todos'};
      S.cpPre={...gr,m:PRESETS.ofertas};S.vs='campanias';return vVentas()}
    if(R.aud=='chino'){S.fbL=R.lista;const L=(E.length?E:S.productos.filter(p=>conPrecio(p)&&promoCerca(p.producto_id,R.lista))).slice(0,8);if(L.length)S.fbSel=L.map(p=>({id:p.producto_id,zh:zhProd(p.descripcion)}));if(E.length>8)toast('El folleto bilingüe lleva hasta 8 productos: tomé los primeros 8.');return folletoBilingue()}
    folletoOfertas({lista:R.lista,fmt:c=='estado'?'historia':'post',fams:R.que=='fam'?R.fams:[],prods:R.que=='prod'?R.prods:[],soloProds:R.que=='prod',titulo:R.que=='oferta'?'OFERTAS':''})});
}
async function vToca(){
  const L=await datosRecompra(),pend=L.filter(x=>!x.cont);
  $('#vs').innerHTML=`<div class="kp"><div class="box ${pend.length?'alerta':'ok'}"><span class="lab">Para contactar hoy</span><span class="num">${pend.length}</span><span class="det">clientes que ya deberían haber pedido</span></div>
    <div class="box"><span class="lab">Venta posible</span><span class="num">${$m0(pend.reduce((a,x)=>a+x.tk,0))}</span><span class="det">sumando su pedido promedio</span></div>
    <div class="box ok"><span class="lab">Ya contactados</span><span class="num">${L.length-pend.length}</span><span class="det">en los últimos 3 días</span></div></div>
  <div class="box"><p><small>El CRM mira cada cuántos días compra cada cliente (con al menos 3 pedidos) y te muestra los que ya están en fecha. Más arriba, los que más te compran.</small></p>
    ${pend.length?'<p><button class="wa" id="tc_sug">🛒 Mandarles a todos su pedido sugerido</button> <small>Les llega su pedido de siempre armado: lo confirman con un toque.</small></p>':''}
    ${L.length?`<div class="ag">${L.map(x=>`<div class="vi ${x.cont?'hecho-vi':''}"><span class="badge ${x.atraso>3?'b-mora30':'b-pendiente'}">${x.atraso>0?x.atraso+' d tarde':'hoy'}</span>
      <div><a class="lnk" data-fc="${x.c.id}"><b>${esc(x.c.razon_social)}</b></a><br><small>Compra cada ~${x.ciclo} días · último pedido hace ${x.dias} días · promedio ${$m(x.tk)}</small><br><small>Suele llevar: ${x.top.map(id=>esc(nomProd(id))).join(', ')}</small>${x.cont?`<br><small class="sube">✓ Contactado ${fd(diaLocal(x.cont))}</small>`:''}</div>
      <div class="acc">${x.c.telefono?`<button class="alt wa" data-tw="${x.c.id}">WhatsApp</button><a class="alt btnl" href="tel:${esc(String(x.c.telefono).replace(/[^\d+]/g,''))}" data-tl="${x.c.id}">📞 Llamar</a>`:'<small>sin teléfono</small>'}<button class="alt" data-tg="${x.c.id}" title="Guion de llamada">📋 Guion</button><button data-tp="${x.c.id}">Cargar pedido</button>${x.c.telefono&&x.c.token_pedidos?`<button class="alt" data-ts="${x.c.id}" title="Mandarle el pedido sugerido">🛒 Sugerido</button>`:''}${x.cont?'':`<button class="alt" data-tk="${x.c.id}" title="Marcar como contactado">✓</button>`}</div></div>`).join('')}</div>`
    :'<p><small>Hoy no hay clientes en fecha de compra. Para que esto funcione, cada cliente necesita al menos 3 pedidos cargados.</small></p>'}</div>`;
  const cli=id=>S.clientes.find(c=>c.id==id),marca=async(id,tipo)=>{await sb.from('contactos_clientes').insert({cliente_id:id,tipo,detalle:'Recordatorio de compra'})};
  $$('#vs [data-fc]').forEach(a=>a.onclick=()=>{S.tab='clientes';shell();fichaCliente(cli(a.dataset.fc))});
  $$('#vs [data-tw]').forEach(b=>b.onclick=async()=>{const c=cli(b.dataset.tw),x=L.find(y=>y.c.id==c.id);
    const t=`¡Hola ${nomCorto(c)}! ¿Cómo andás? Te escribo de *Sabores de mi País* 👋 ¿Te preparo el pedido de siempre (${x.top.slice(0,2).map(nomProd).join(', ')})?`+(c.token_pedidos?'\n\nTambién lo podés armar vos acá:\n'+linkPedidos(c):'');
    window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(t),'_blank');await marca(c.id,'whatsapp');setTimeout(vToca,800)});
  $$('#vs [data-tl]').forEach(a=>a.addEventListener('click',()=>marca(a.dataset.tl,'llamada')));
  $$('#vs [data-tk]').forEach(b=>b.onclick=async()=>{await marca(b.dataset.tk,'manual');vToca()});
  $$('#vs [data-tp]').forEach(b=>b.onclick=()=>{S.preCli=cli(b.dataset.tp);S.tab='pedidos';shell()});
  $$('#vs [data-tg]').forEach(b=>b.onclick=()=>guionLlamada(cli(b.dataset.tg)));
  $$('#vs [data-ts]').forEach(b=>b.onclick=async()=>{if(await mandarSugerido(cli(b.dataset.ts)))setTimeout(()=>S.vs=='toca'&&$('#vs')&&vToca(),800)});
  $('#tc_sug')&&($('#tc_sug').onclick=()=>colaSugeridos(pend.map(x=>x.c).filter(c=>c.telefono&&c.token_pedidos)));
}
async function vCampanias(pre){
  const fams=[...new Set(S.productos.map(p=>(p.familia||'').trim()).filter(Boolean))].sort(),mks=[...new Set(S.productos.map(p=>p.marca).filter(Boolean))].sort();
  $('#vs').innerHTML=`<div class="box"><h3>1. ¿A quién le escribimos?</h3><div class="g">
    <label class="f">Clientes<select id="cp_s"><option value="todos">Todos los clientes</option><option value="familia">Los que compran una familia…</option><option value="marca">Los que compran una marca…</option><option value="dormidos">Dormidos (no compran hace un tiempo)</option><option value="toca">Les toca comprar</option><option value="dia">Los que visito un día…</option><option value="lista">Por lista de precios…</option><option value="rubro">Por rubro…</option><option value="nunca">Clientes que nunca compraron</option></select></label>
    <label class="f" id="cp_xl" hidden>Cuál<select id="cp_x"></select></label>
    <label class="f">No repetir a los contactados en los últimos<select id="cp_r"><option value="0">— mandar a todos —</option><option value="3" selected>3 días</option><option value="7">7 días</option></select></label></div><p id="cp_n"></p></div>
  <div class="box"><h3>2. El mensaje</h3><div class="fc-acc">${Object.keys(PRESETS).map(k=>`<button class="alt" data-pre="${k}">${{ofertas:'Ofertas',novedades:'Novedades',combo:'Combos',vuelta:'Volvé a comprar'}[k]}</button>`).join('')}</div>
    <textarea id="cp_m" rows="6" style="width:100%;margin-top:8px;font:inherit;padding:10px;border:1px solid #b9bfcc;border-radius:8px">${esc(PRESETS[pre]||PRESETS.ofertas)}</textarea>
    <p><small>Se reemplaza solo: <b>{nombre}</b> = nombre del cliente · <b>{link}</b> = su link de pedidos con sus precios · <b>{novedades}</b> y <b>{combos}</b> = la lista actual.</small></p>
    <p><small>💡 Para mandar también la <b>imagen del folleto</b>: armala en "Folletos y catálogo", guardala en el celu y adjuntala en cada chat (o mandala a una <b>lista de difusión</b> de WhatsApp Business).</small></p>
    <div class="ej" id="cp_ej"></div><button id="cp_go">Armar la fila de envíos</button>
    <div class="cupw" style="margin-top:10px"><small>o programala:</small><input type="date" id="cp_f" style="width:auto;margin:0" min="${diaLocal(new Date(Date.now()+864e5))}"><button class="alt" id="cp_pg">📅 Programar</button></div></div><div id="cp_q"></div><div id="cp_prog"></div>`;
  let D=null;const dat=async()=>{if(D)return D;const desde=new Date(Date.now()-365*864e5).toISOString();
    const[pe,co]=await Promise.all([todo(()=>sb.from('pedidos').select('cliente_id,creado_en,pedido_items(producto_id)').neq('estado','cancelado').gte('creado_en',desde).order('numero')),sb.from('contactos_clientes').select('cliente_id,fecha').gte('fecha',new Date(Date.now()-7*864e5).toISOString())]);
    const ult={},pr={};for(const o of pe.data||[]){if(!ult[o.cliente_id]||o.creado_en>ult[o.cliente_id])ult[o.cliente_id]=o.creado_en;const s=pr[o.cliente_id]=pr[o.cliente_id]||new Set();for(const i of o.pedido_items||[])s.add(i.producto_id)}
    const cont={};for(const x of co.data||[])if(!cont[x.cliente_id]||x.fecha>cont[x.cliente_id])cont[x.cliente_id]=x.fecha;
    return D={ult,pr,cont,toca:new Set((await datosRecompra()).map(x=>x.c.id))}};
  const opts=()=>{const s=$('#cp_s').value,X={familia:fams,marca:mks,dormidos:[['30','Más de 30 días'],['45','Más de 45 días'],['60','Más de 60 días'],['90','Más de 90 días']],dia:DIAS.slice(0,6).map(([n,t])=>[String(n),t]),lista:['mayorista','minorista','especial'],rubro:[...new Set(S.clientes.map(c=>(c.rubro||'').trim()).filter(Boolean))].sort()}[s];
    $('#cp_xl').hidden=!X;if(X)$('#cp_x').innerHTML=X.map(x=>Array.isArray(x)?`<option value="${x[0]}">${x[1]}</option>`:`<option>${esc(x)}</option>`).join('');cuenta()};
  const lista=async()=>{const d=await dat(),s=$('#cp_s').value,x=$('#cp_x').value,r=+$('#cp_r').value,lim=Date.now()-r*864e5;
    const fam=id=>(S.productos.find(p=>p.producto_id==id)?.familia||'').trim(),mk=id=>S.productos.find(p=>p.producto_id==id)?.marca;
    return S.clientes.filter(c=>c.telefono&&telWA(c.telefono)).filter(c=>{const P=d.pr[c.id]||new Set(),u=d.ult[c.id];
      if(s=='familia')return [...P].some(id=>fam(id)==x);if(s=='marca')return [...P].some(id=>mk(id)==x);
      if(s=='dormidos')return u&&(Date.now()-new Date(u))/864e5>=+x;if(s=='toca')return d.toca.has(c.id);if(s=='dia')return (c.dias_visita||[]).includes(+x);
      if(s=='lista')return c.lista==x;if(s=='rubro')return (c.rubro||'').trim()==x;if(s=='nunca')return !u;return true}).filter(c=>!r||!d.cont[c.id]||new Date(d.cont[c.id])<lim)};
  const armar=(c,m)=>{const nov=S.productos.filter(p=>S.min[p.producto_id]?.nv).slice(0,8).map(p=>'• '+p.descripcion).join('\n')||'(sin novedades cargadas)';
    const cb=S.combos.map(k=>{const v=comboPrecio(k,c.lista);return '• '+k.nombre+': '+$m(v.p)+' ('+comboTxt(k)+')'}).join('\n')||'(sin combos activos)';
    return m.replace(/\{nombre\}/g,nomCorto(c)).replace(/\{link\}/g,c.token_pedidos?linkPedidos(c):'').replace(/\{novedades\}/g,nov).replace(/\{combos\}/g,cb)};
  const cuenta=async()=>{const L=await lista();$('#cp_n').innerHTML=`<b>${L.length}</b> ${L.length==1?'cliente':'clientes'} con WhatsApp en este grupo.`;
    $('#cp_ej').innerHTML=L[0]?`<small>Así le llega a ${esc(L[0].razon_social)}:</small><pre class="wa-prev">${esc(armar(L[0],$('#cp_m').value))}</pre>`:''};
  $('#cp_s').onchange=opts;$('#cp_x').onchange=cuenta;$('#cp_r').onchange=cuenta;$('#cp_m').oninput=()=>{clearTimeout(S._cpt);S._cpt=setTimeout(cuenta,300)};
  $$('[data-pre]').forEach(b=>b.onclick=()=>{$('#cp_m').value=PRESETS[b.dataset.pre];if(b.dataset.pre=='vuelta'){$('#cp_s').value='dormidos';opts()}else cuenta()});
  opts();
  if(S.cpPre){const P=S.cpPre;S.cpPre=null;if(P.s&&[...$('#cp_s').options].some(o=>o.value==P.s)){$('#cp_s').value=P.s;opts();if(P.x!=null&&[...$('#cp_x').options].some(o=>o.value==P.x))$('#cp_x').value=P.x}
    if(P.m)$('#cp_m').value=P.m;cuenta()}
  progBox().catch(()=>{});
  $('#cp_pg').onclick=async()=>{const f=$('#cp_f').value;if(!f)return toast('Elegí el día.',1);const L=await lista();if(!L.length)return toast('No hay clientes con WhatsApp en ese grupo.',1);
    const nom=$('#cp_s').selectedOptions[0].text+($('#cp_xl').hidden?'':' · '+$('#cp_x').selectedOptions[0].text),P2=await campProg();
    P2.push({id:String(Date.now()),nombre:nom,fecha:f,msg:$('#cp_m').value,ids:L.map(c=>c.id)});if(await guardaCampProg(P2.filter(x=>dDesde(x.fecha)<=7))){toast('Campaña programada para el '+fd(f)+': ese día aparece en la Cola del día.');progBox()}};
  $('#cp_go').onclick=async()=>{const L=await lista();if(!L.length)return toast('No hay clientes con WhatsApp en ese grupo.',1);const msg=$('#cp_m').value,nom=$('#cp_s').selectedOptions[0].text+($('#cp_xl').hidden?'':' · '+$('#cp_x').selectedOptions[0].text);
    const hechos=new Set();
    const draw=()=>{$('#cp_q').innerHTML=`<div class="box"><div class="bh"><h3>3. Enviar (${hechos.size} de ${L.length})</h3><div class="barra" style="width:160px"><i style="width:${hechos.size/L.length*100}%"></i></div></div>
      <p><small>Tocá <b>Enviar</b> en cada uno: se abre WhatsApp con el mensaje listo, lo mandás y volvés acá para el siguiente.</small></p>
      ${L.map(c=>`<div class="bh cpf ${hechos.has(c.id)?'ok':''}"><span>${esc(c.razon_social)} <small>${esc(c.telefono)}</small></span><button class="${hechos.has(c.id)?'alt hecho':'wa'}" data-cs="${c.id}">${hechos.has(c.id)?'✓ Enviado':'Enviar'}</button></div>`).join('')}</div>`;
      $$('#cp_q [data-cs]').forEach(b=>b.onclick=async()=>{const c=L.find(x=>x.id==b.dataset.cs);window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(armar(c,msg)),'_blank');
        if(!hechos.has(c.id)){hechos.add(c.id);sb.from('contactos_clientes').insert({cliente_id:c.id,tipo:'campaña',detalle:nom}).then(()=>{})}draw()})};
    draw();$('#cp_q').scrollIntoView({behavior:'smooth'})};
}
/* ---------- Combos ---------- */
async function vCombos(){await cargarVentasCfg();const due=S.perfil.rol=='dueno';
  if(!S.combosOk){$('#vs').innerHTML='<div class="aviso">Falta correr <b>ventas.sql</b> en Supabase.</div>';return}
  const hoy=diaLocal(new Date());
  $('#vs').innerHTML=`<div class="box"><div class="bh"><h3>Combos</h3>${due?'<button id="cb_n">+ Nuevo combo</button>':''}</div>
    <p><small>Varios productos juntos con un descuento. Aparecen en el catálogo online, en el catálogo público, en los folletos y al cargar pedidos.</small></p>
    ${S.combosTodos.length?`<div class="tw"><table><tr><th>Combo</th><th>Incluye</th><th class="n">Mayorista</th><th class="n">Minorista</th><th>Estado</th><th></th></tr>${S.combosTodos.map(c=>{const a=comboPrecio(c,'mayorista'),b=comboPrecio(c,'minorista'),vig=c.activo&&c.desde<=hoy&&(!c.hasta||c.hasta>=hoy);
      return`<tr><td><b>${esc(c.nombre)}</b> <span class="promo">−${nf(c.descuento_pct)} %</span>${c.solo_nuevos?' <span class="badge b-aprobado">🎁 Primer pedido</span>':''}${c.descripcion?'<br><small>'+esc(c.descripcion)+'</small>':''}</td><td><small>${esc(comboTxt(c))}</small></td><td class="n"><s><small>${$m(a.s)}</small></s><br><b>${$m(a.p)}</b></td><td class="n"><s><small>${$m(b.s)}</small></s><br><b>${$m(b.p)}</b></td>
        <td><span class="badge ${vig?'b-entregado':'b-cancelado'}">${vig?'Activo':c.activo?'Fuera de fecha':'Pausado'}</span>${c.hasta?'<br><small>hasta '+fd(c.hasta)+'</small>':''}</td><td>${due?`<button class="alt" data-cbe="${c.id}">Editar</button>`:''}</td></tr>`}).join('')}</table></div>`:'<p><small>Todavía no armaste combos. Ejemplo: "Combo Kiosco": 1 caja de maní 500 g + 1 pack de crocantes + 1 manteca, con 8 % de descuento.</small></p>'}</div>`;
  $('#vs').insertAdjacentHTML('beforeend','<div class="box" id="cb_sug"></div>');combosSugeridos().catch(()=>{});
  $('#cb_n')&&($('#cb_n').onclick=()=>editarCombo(null));$$('#vs [data-cbe]').forEach(b=>b.onclick=()=>editarCombo(S.combosTodos.find(c=>c.id==b.dataset.cbe)));
}
function editarCombo(c0){const c=c0?{...c0,items:[...(c0.items||[])]}:{nombre:'',descripcion:'',items:[],descuento_pct:8,activo:true,hasta:null};
  const m=document.createElement('div');m.className='modal';document.body.appendChild(m);
  m.innerHTML=`<div class="mc"><div class="bh"><h3>${c0?.id?'Editar combo':'Nuevo combo'}</h3><button class="alt" id="ce_x">Cerrar</button></div>
    <div class="g"><label class="f">Nombre<input id="ce_n" value="${esc(c.nombre)}" placeholder="Ej.: Combo Kiosco"></label><label class="f">Descuento %<input id="ce_p" type="number" min="0" max="89" step="0.5" value="${c.descuento_pct}"></label>
      <label class="f">Válido hasta (opcional)<input id="ce_h" type="date" value="${c.hasta||''}"></label><label class="f">Descripción (opcional)<input id="ce_d" value="${esc(c.descripcion||'')}" placeholder="Ej.: Ideal para reponer el kiosco"></label></div>
    <div class="conscan"><input id="ce_q" placeholder="Agregar producto (nombre o código)" autocomplete="off">${btnScan('ce_sc')}</div><div id="ce_r"></div><div id="ce_l"></div>
    <label class="chk"><input type="checkbox" id="ce_a" ${c.activo?'checked':''}> Activo</label>
    <label class="chk"><input type="checkbox" id="ce_nv" ${c.solo_nuevos?'checked':''}> 🎁 Kit de primer pedido (solo lo ven y pueden pedir los clientes nuevos)</label>
    <div class="fc-acc"><button id="ce_g">Guardar combo</button>${c0?.id?'<button class="alt" id="ce_b">Borrar</button>':''}</div></div>`;
  const draw=()=>{const a=comboPrecio({...c,descuento_pct:+$('#ce_p').value||0},'mayorista'),b=comboPrecio({...c,descuento_pct:+$('#ce_p').value||0},'minorista');
    $('#ce_l').innerHTML=(c.items.length?c.items.map((x,i)=>`<div class="pf-it"><span>${esc(nomProd(x.id))}${enBultos(x.id,x.q)?' <small class="eq">'+enBultos(x.id,x.q)+'</small>':''}</span><input type="number" min="1" step="1" value="${x.q}" data-cq="${i}"><a class="lnk" data-cx="${i}">Quitar</a></div>`).join(''):'<p><small>Agregá los productos del combo.</small></p>')+
      (c.items.length?`<p>Mayorista: <s>${$m(a.s)}</s> → <b>${$m(a.p)}</b> · Minorista: <s>${$m(b.s)}</s> → <b>${$m(b.p)}</b></p>`:'');
    $$('#ce_l [data-cq]').forEach(e=>e.onchange=()=>{c.items[e.dataset.cq].q=Math.max(1,Math.round(+e.value||1));setTimeout(draw)});
    $$('#ce_l [data-cx]').forEach(a=>a.onclick=()=>{c.items.splice(+a.dataset.cx,1);draw()})};
  const add=p=>{const x=c.items.find(y=>y.id==p.producto_id),b=bul(p.producto_id)?.n||1;x?x.q+=b:c.items.push({id:p.producto_id,q:b});draw()};
  buscador('#ce_q','#ce_r',add);$('#ce_sc').onclick=()=>escanear('Agregar al combo',p=>{add(p);return '✔ '+p.descripcion});$('#ce_p').oninput=draw;
  $('#ce_x').onclick=()=>m.remove();draw();
  $('#ce_g').onclick=async()=>{const n=$('#ce_n').value.trim();if(!n)return toast('Ponele un nombre al combo.',1);if(c.items.length<2)return toast('Un combo necesita al menos 2 productos.',1);
    const row={nombre:n,descripcion:$('#ce_d').value.trim()||null,items:c.items,descuento_pct:+$('#ce_p').value||0,activo:$('#ce_a').checked,hasta:$('#ce_h').value||null};
    if($('#ce_nv').checked||c.solo_nuevos)row.solo_nuevos=$('#ce_nv').checked;
    const{error}=c0?.id?await sb.from('combos').update(row).eq('id',c0.id):await sb.from('combos').insert(row);if(error)return toast(error.message,1);m.remove();toast('Combo guardado.');vCombos()};
  $('#ce_b')&&($('#ce_b').onclick=async()=>{if(!confirm('¿Borrar el combo «'+c0.nombre+'»?'))return;const{error}=await sb.from('combos').delete().eq('id',c0.id);if(error)return toast(error.message,1);m.remove();vCombos()});
}
/* ---------- Novedades ---------- */
async function vNovedades(){await cargarStock();const due=S.perfil.rol=='dueno';const N=S.productos.filter(p=>S.min[p.producto_id]?.nv);
  $('#vs').innerHTML=`<div class="box"><div class="bh"><h3>✨ Novedades</h3>${N.length?'<button id="nv_av">Avisar a los clientes</button>':''}</div>
    <p><small>Los productos marcados como nuevos salen con la etiqueta <b>NUEVO</b> y en una sección propia arriba del catálogo, durante los días que elijas.</small></p>
    ${due?`<div class="g"><div class="conscan"><input id="nv_q" placeholder="Agregar producto nuevo (nombre o código)" autocomplete="off">${btnScan('nv_sc')}</div><label class="f">Mostrar como nuevo durante<select id="nv_d"><option value="15">15 días</option><option value="30" selected>30 días</option><option value="60">60 días</option></select></label></div><div id="nv_r"></div>`:''}
    ${N.length?`<table>${N.map(p=>`<tr><td>${S.min[p.producto_id]?.foto?`<img src="${esc(S.min[p.producto_id].foto)}" style="width:40px;height:40px;object-fit:contain">`:''}</td><td>${esc(p.descripcion)}<br><small>hasta ${fd(S.min[p.producto_id].nvh)}</small></td><td>${due?`<a class="lnk" data-nvx="${p.producto_id}">Quitar</a>`:''}</td></tr>`).join('')}</table>`:'<p><small>No hay productos marcados como nuevos.</small></p>'}</div>`;
  const fijar=async(ids,d)=>{const{error}=await sb.rpc('fijar_nuevo',{p_ids:ids,p_dias:d});if(error)return toast(/fijar_nuevo/.test(error.message)?'Falta correr ventas.sql en Supabase.':error.message,1);vNovedades()};
  if(due){buscador('#nv_q','#nv_r',p=>fijar([p.producto_id],+$('#nv_d').value));$('#nv_sc').onclick=()=>escanear('Producto nuevo',p=>{fijar([p.producto_id],+$('#nv_d').value);return '✔ '+p.descripcion})}
  $$('#vs [data-nvx]').forEach(a=>a.onclick=()=>fijar([a.dataset.nvx],0));
  $('#nv_av')&&($('#nv_av').onclick=()=>{S.vs='campanias';vVentas();setTimeout(()=>{$('#cp_m').value=PRESETS.novedades;$('#cp_m').oninput()},400)});
}
/* ---------- Descuentos por monto, pedido mínimo, envío gratis ---------- */
async function vReglas(){await cargarVentasCfg();const due=S.perfil.rol=='dueno';let E=S.vcfg.escalas.map(e=>({...e}));
  const draw=()=>{$('#vs').innerHTML=`<div class="box"><h3>💲 Más comprás, más ahorrás</h3><p><small>Descuento automático según el total del pedido. En el catálogo el cliente ve cuánto le falta para el siguiente escalón, y se aplica solo.</small></p>
    <table>${E.map((e,i)=>`<tr><td>Desde $</td><td><input type="number" min="0" step="1000" value="${e.desde}" data-ed="${i}" style="width:140px;margin:0" ${due?'':'disabled'}></td><td><input type="number" min="0" max="50" step="0.5" value="${e.pct}" data-ep="${i}" style="width:80px;margin:0" ${due?'':'disabled'}> %</td><td>${due?`<a class="lnk" data-ex="${i}">Quitar</a>`:''}</td></tr>`).join('')||'<tr><td><small>Sin escalones de descuento.</small></td></tr>'}</table>
    ${due?'<button class="alt" id="es_a">+ Agregar escalón</button>':''}
    <h3 style="margin-top:18px">Pedido mínimo y envío gratis</h3><div class="g">
      <label class="f">Pedido mínimo online $ (vacío = sin mínimo)<input id="es_m" type="number" min="0" step="1000" value="${S.vcfg.minimo||''}" ${due?'':'disabled'}></label>
      <label class="f">Envío gratis desde $ (vacío = no mostrar)<input id="es_e" type="number" min="0" step="1000" value="${S.vcfg.envio||''}" ${due?'':'disabled'}></label>
      <label class="f">🚚 Costo del envío si no llega $ (vacío = gratis igual)<input id="es_ce" type="number" min="0" step="500" value="${S.vcfg.costoEnvio||''}" ${due?'':'disabled'}></label></div>
    ${due?'<button id="es_g">Guardar</button>':''}
    <p><small>Ejemplo de lo que ve el cliente: "Te faltan $ 18.000 para el 5 % de descuento" y "Te faltan $ 40.000 para el envío gratis". El pedido mínimo no deja mandar pedidos online más chicos. Si el pedido no llega al envío gratis, el CRM le suma solo el costo del envío (al pedido, la factura y la cuenta corriente); en cada pedido podés bonificarlo. Los pedidos que cargás vos en el CRM también llevan el descuento por monto.</small></p></div><div class="box" id="rg_pp"></div><div class="box" id="rg_en"></div><div class="box" id="rg_fm"></div>`;prontoBox();entregasBox();frenoBox();
    $$('[data-ed]').forEach(i=>i.onchange=()=>E[i.dataset.ed].desde=+i.value||0);$$('[data-ep]').forEach(i=>i.onchange=()=>E[i.dataset.ep].pct=+i.value||0);
    $$('[data-ex]').forEach(a=>a.onclick=()=>{E.splice(+a.dataset.ex,1);draw()});$('#es_a')&&($('#es_a').onclick=()=>{const u=E[E.length-1];E.push({desde:u?u.desde*2:150000,pct:u?u.pct+2:3});draw()});
    $('#es_g')&&($('#es_g').onclick=async()=>{const es=E.filter(e=>e.desde>0&&e.pct>0).sort((a,b)=>a.desde-b.desde);
      const{error}=await sb.from('config_app').upsert([{clave:'escalas_descuento',valor:JSON.stringify(es)},{clave:'pedido_minimo',valor:$('#es_m').value||''},{clave:'envio_gratis_desde',valor:$('#es_e').value||''},{clave:'costo_envio',valor:$('#es_ce').value||''}]);
      if(error)return toast(error.message,1);await cargarVentasCfg();toast('Guardado.');vReglas()})};draw()}
async function vMenos(){
  const L=await datosMenos(),baja=L.filter(x=>x.caida>=.3);
  $('#vs').innerHTML=`<div class="kp"><div class="box ${baja.length?'alerta':'ok'}"><span class="lab">Compran menos</span><span class="num">${baja.length}</span><span class="det">bajaron 30 % o más este mes</span></div>
    <div class="box"><span class="lab">Venta que se está yendo</span><span class="num">${$m0(L.reduce((a,x)=>a+x.pierde,0))}</span><span class="det">por mes, comparado con antes</span></div>
    <div class="box"><span class="lab">Dejaron de llevar algo</span><span class="num">${L.filter(x=>x.dejo.length).length}</span><span class="det">productos que llevaban siempre</span></div></div>
  <div class="box"><p><small>Te aviso <b>antes</b> de que el cliente se duerma: compara lo que compró en los últimos 30 días contra su promedio mensual de antes, y te dice qué productos dejó de llevar (puede que se los esté comprando a otro).</small></p>
  ${L.length?`<div class="ag">${L.map(x=>`<div class="vi"><span class="badge ${x.caida>=.5?'b-mora30':x.caida>=.3?'b-pendiente':'b-aprobado'}">${x.caida>=.3?'−'+Math.round(x.caida*100)+' %':'ojo'}</span>
    <div><a class="lnk" data-fc="${x.c.id}"><b>${esc(x.c.razon_social)}</b></a><br><small>Antes ~${$m(x.prom)} por mes · últimos 30 días ${$m(x.hoy)} · último pedido hace ${x.ult} días</small>
    ${x.dejo.length?`<br><small>⚠️ Dejó de llevar: <b>${x.dejo.map(id=>esc(nomProd(id))).join(', ')}</b></small>`:''}</div>
    <div class="acc">${x.c.telefono?`<button class="alt wa" data-mw="${x.c.id}">WhatsApp</button><a class="alt btnl" href="tel:${esc(String(x.c.telefono).replace(/[^\d+]/g,''))}">📞 Llamar</a>`:'<small>sin teléfono</small>'}<button data-mp="${x.c.id}">Cargar pedido</button></div></div>`).join('')}</div>`
    :'<p><small>¡Bien! Ningún cliente está comprando menos que antes. (Hacen falta al menos 2 pedidos de más de un mes atrás para comparar.)</small></p>'}</div>`;
  $$('#vs [data-fc]').forEach(a=>a.onclick=()=>abrirFicha(a.dataset.fc));
  $$('#vs [data-mp]').forEach(b=>b.onclick=()=>{const x=L.find(y=>y.c.id==b.dataset.mp);S.preCli=x.c;S.preItems=x.dejo.length?x.dejo:null;S.tab='pedidos';shell()});
  $$('#vs [data-mw]').forEach(b=>b.onclick=()=>{const x=L.find(y=>y.c.id==b.dataset.mw),c=x.c;
    const t=`¡Hola ${nomCorto(c)}! ¿Cómo andás? Te escribo de *Sabores de mi País* 👋 `+(x.dejo.length?`Vi que hace unos pedidos no llevás ${x.dejo.slice(0,3).map(nomProd).join(', ')}. ¿Está todo bien con esos productos? Si querés te los preparo, o contame si encontraste algo mejor así lo mejoramos 🙏`:'Hace unos días que no hablamos. ¿Necesitás reponer algo? Contame si hay algo que podamos mejorar 🙏')+(c.token_pedidos?'\n\nTu catálogo con tus precios:\n'+linkPedidos(c):'');
    window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(t),'_blank');sb.from('contactos_clientes').insert({cliente_id:c.id,tipo:'whatsapp',detalle:'Compra menos'}).then(()=>{})});
}
/* ---------- Encuestas ---------- */
async function vEncuestas(){
  const{data,error}=await sb.from('encuestas').select('*').order('creado_en',{ascending:false}).limit(400);
  if(error){$('#vs').innerHTML=SQL_FID;return}
  const R=data.filter(e=>e.puntaje),mal=R.filter(e=>e.puntaje<=3&&!e.atendida),prom=R.length?R.reduce((a,e)=>a+e.puntaje,0)/R.length:0;
  const pid=[...new Set(data.map(e=>e.pedido_id).filter(Boolean))];let num={};
  if(pid.length){const{data:p}=await sb.from('pedidos').select('id,numero').in('id',pid.slice(0,300));for(const o of p||[])num[o.id]=o.numero}
  const nc=id=>S.clientes.find(c=>c.id==id)?.razon_social||'Cliente';
  const fila=e=>`<div class="vi ${e.atendida?'hecho-vi':''}"><span class="badge ${e.puntaje>=4?'b-entregado':e.puntaje?'b-mora30':'b-pendiente'}">${e.puntaje?e.puntaje+' ★':'sin resp.'}</span>
    <div><a class="lnk" data-fc="${e.cliente_id}"><b>${esc(nc(e.cliente_id))}</b></a> <small>· Pedido N° ${num[e.pedido_id]||'—'} · ${fd(diaLocal(e.respondida_en||e.creado_en))}</small><br><span class="estr">${estrellas(e.puntaje)}</span>${e.comentario?`<br><i>“${esc(e.comentario)}”</i>`:''}</div>
    <div class="acc">${e.puntaje&&e.puntaje<=3&&!e.atendida?`<button class="alt wa" data-ew="${e.id}">Escribirle</button><button data-ea="${e.id}">✓ Atendida</button>`:''}${e.puntaje>=4&&e.comentario&&'publicar' in e?`<button class="${e.publicar?'':'alt'}" data-epu="${e.id}" title="Se muestra en el catálogo público como opinión real">${e.publicar?'✓ En el catálogo':'🌐 Mostrar en el catálogo'}</button>`:''}</div></div>`;
  $('#vs').innerHTML=`<div class="kp"><div class="box ${prom>=4?'ok':prom?'alerta':''}"><span class="lab">Promedio</span><span class="num">${prom?nf(Math.round(prom*10)/10)+' ★':'—'}</span><span class="det">${R.length} respuestas</span></div>
    <div class="box"><span class="lab">Respondieron</span><span class="num">${data.length?Math.round(R.length/data.length*100):0} %</span><span class="det">de ${data.length} encuestas enviadas</span></div>
    <div class="box ${mal.length?'alerta':'ok'}"><span class="lab">Para atender</span><span class="num">${mal.length}</span><span class="det">calificaron con 3 estrellas o menos</span></div></div>
    <div class="box"><p><small>Cuando avisás una entrega por WhatsApp (botón <b>Avisar</b> en Reparto o Pedidos), el mensaje lleva un link para que el cliente califique de 1 a 5 estrellas. Si pone 3 o menos, te aparece acá y en Inicio para que lo llames antes de perderlo.</small></p>
    ${mal.length?'<h3>⚠️ Para atender</h3><div class="ag">'+mal.map(fila).join('')+'</div>':''}
    ${data.length&&!('publicar' in data[0])?'<p><small>💡 Para mostrar opiniones reales en el catálogo público, corré ventas-auto3.sql.</small></p>':'<p><small>🌐 Las opiniones de 4 y 5 ⭐ con comentario se pueden mostrar en el catálogo público ("Lo que dicen nuestros clientes"): tocá <b>Mostrar en el catálogo</b>.</small></p>'}
    <h3>Últimas respuestas</h3>${R.length?'<div class="ag">'+R.filter(e=>!mal.includes(e)).slice(0,40).map(fila).join('')+'</div>':'<p><small>Todavía no hay respuestas.</small></p>'}</div>`;
  $$('#vs [data-fc]').forEach(a=>a.onclick=()=>abrirFicha(a.dataset.fc));
  $$('#vs [data-ea]').forEach(b=>b.onclick=async()=>{const{error}=await sb.from('encuestas').update({atendida:true}).eq('id',b.dataset.ea);if(error)return toast(error.message,1);vEncuestas()});
  $$('#vs [data-epu]').forEach(b=>b.onclick=async()=>{const e=data.find(x=>x.id==b.dataset.epu);if(!e.publicar&&!confirm('¿Mostrar esta opinión en el catálogo público, con el nombre del negocio? Asegurate de que el cliente esté de acuerdo.'))return;const{error}=await sb.from('encuestas').update({publicar:!e.publicar}).eq('id',e.id);if(error)return toast(error.message,1);toast(e.publicar?'Quitada del catálogo.':'Publicada en el catálogo público.');vEncuestas()});
  $$('#vs [data-ew]').forEach(b=>b.onclick=()=>{const e=data.find(x=>x.id==b.dataset.ew),c=S.clientes.find(x=>x.id==e.cliente_id)||{};
    window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(c)}! Te escribo de *Sabores de mi País*. Vi tu calificación del pedido N° ${num[e.pedido_id]||''} y quería saber qué pasó, así lo solucionamos. ¡Gracias por avisarnos! 🙏`),'_blank')});
}
async function vCantidad(){const due=S.perfil.rol=='dueno';await cargarPromos();await cargarStock();
  const T=S.promos.filter(r=>r.nombre.startsWith(PXC)&&r.alcance=='producto'),por={};for(const r of T)(por[r.alcance_valor]=por[r.alcance_valor]||[]).push(r);
  $('#vs').innerHTML=`<div class="box"><h3>🏷️ Precio por cantidad</h3><p><small>Para que lleven más: el precio baja según la cantidad. Ej.: Maní 500 g → 1 caja $ 30.000 · desde 3 cajas $ 28.500 · desde 5 cajas $ 27.000. Se aplica solo en el catálogo online y al cargar pedidos, y el cliente ve “llevando 3 cajas”.</small></p>
    ${due?`<div class="conscan"><input id="xc_q" placeholder="Elegí un producto (nombre o código)" autocomplete="off">${btnScan('xc_sc')}</div><div id="xc_r"></div><div id="xc_f"></div>`:''}</div>
    <div class="box" id="xc_bn"></div>
    <div class="box"><h3>Productos con precio por cantidad</h3>${Object.keys(por).length?`<div class="tw"><table><tr><th>Producto</th><th>Escalones (lista mayorista)</th><th></th></tr>${Object.entries(por).map(([id,R])=>`<tr><td>${esc(nomProd(id))}</td><td>${R.sort((a,b)=>a.minimo_unidades-b.minimo_unidades).map(r=>`<span class="promo">${esc(cantTxt(id,r.minimo_unidades))}: ${$m(precioLista(id,'mayorista')*(1-r.descuento_pct/100))} (−${nf(r.descuento_pct)} %)</span>`).join(' ')}</td><td>${due?`<button class="alt" data-xe="${id}">Editar</button>`:''}</td></tr>`).join('')}</table></div>`:'<p><small>Todavía no hay productos con precio por cantidad.</small></p>'}</div>`;
  const editar=p=>{const id=p.producto_id,b=bul(id),u=b?.n>1?b.n:1,pm=precioLista(id,'mayorista');
    let E=(por[id]||[]).map(r=>({n:r.minimo_unidades/u,pct:+r.descuento_pct,id:r.id})).sort((a,b)=>a.n-b.n);if(!E.length)E=[{n:3,pct:3},{n:5,pct:6}];
    const draw=()=>{$('#xc_f').innerHTML=`<div class="pmf"><h3>${esc(p.descripcion)}</h3><p><small>Precio normal mayorista: <b>${$m(pm)}</b> por unidad${u>1?' · '+esc(b.t)+' de '+u+' = <b>'+$m(pm*u)+'</b>':''}</small></p>
      <table><tr><th>Desde</th><th>Precio por unidad (mayorista)</th><th>Descuento</th><th></th></tr>${E.map((e,i)=>`<tr><td><input type="number" min="1" step="1" value="${e.n}" data-xn="${i}" style="width:80px;margin:0"> ${u>1?esc(plural(b.t,2)):'unidades'}</td>
        <td>$ <input type="number" min="0" step="0.01" value="${Math.round(pm*(1-e.pct/100)*100)/100}" data-xp="${i}" style="width:120px;margin:0"></td><td>−${nf(Math.round(e.pct*100)/100)} %</td><td><a class="lnk" data-xx="${i}">Quitar</a></td></tr>`).join('')}</table>
      <button class="alt" id="xc_a">+ Otro escalón</button><p><small>El mismo descuento se aplica a las listas minorista y gastronomía.</small></p><div class="fc-acc"><button id="xc_g">Guardar</button><button class="alt" id="xc_x">Cancelar</button></div></div>`;
      $$('[data-xn]').forEach(i=>i.onchange=()=>{E[i.dataset.xn].n=Math.max(1,Math.round(+i.value||1));setTimeout(draw)});
      $$('[data-xp]').forEach(i=>i.onchange=()=>{const v=+i.value;E[i.dataset.xp].pct=pm>0&&v>0&&v<pm?Math.round((1-v/pm)*10000)/100:0;setTimeout(draw)});
      $$('[data-xx]').forEach(a=>a.onclick=()=>{E.splice(+a.dataset.xx,1);draw()});
      $('#xc_a').onclick=()=>{const l=E[E.length-1];E.push({n:l?l.n*2:3,pct:l?Math.min(l.pct+3,50):3});draw()};$('#xc_x').onclick=()=>vCantidad();
      $('#xc_g').onclick=async()=>{const ok=E.filter(e=>e.n>=1&&e.pct>0&&e.pct<90);
        if((por[id]||[]).length){const{error}=await sb.from('promociones').delete().in('id',por[id].map(r=>r.id));if(error)return toast(error.message,1)}
        if(ok.length){const{error}=await sb.from('promociones').insert(ok.map(e=>({nombre:PXC+' '+cantTxt(id,e.n*u),descuento_pct:e.pct,alcance:'producto',alcance_valor:id,minimo_tipo:'unidades',minimo_unidades:e.n*u,listas:null,desde:diaLocal(new Date()),hasta:null,activa:true})));if(error)return toast(error.message,1)}
        await cargarPromos();toast('Precio por cantidad guardado.');vCantidad()}};
    draw();$('#xc_f').scrollIntoView({behavior:'smooth'})};
  if(due){buscador('#xc_q','#xc_r',p=>{$('#xc_q').value='';$('#xc_r').innerHTML='';editar(p)});$('#xc_sc').onclick=()=>escanear('Precio por cantidad',p=>{editar(p);return '✔ '+p.descripcion})}
  bonifBox();
  $$('#vs [data-xe]').forEach(b=>b.onclick=()=>editar(S.productos.find(p=>p.producto_id==b.dataset.xe)||{producto_id:b.dataset.xe,descripcion:nomProd(b.dataset.xe)}));
}
/* ---------- Cupones ---------- */
async function vCupones(){const due=S.perfil.rol=='dueno';
  const[cu,us]=await Promise.all([sb.from('cupones').select('*').order('creado_en',{ascending:false}),todo(()=>sb.from('cupones_usos').select('codigo'))]);
  if(cu.error){$('#vs').innerHTML=SQL_FID;return}
  const n={};for(const u of us.data||[])n[u.codigo]=(n[u.codigo]||0)+1;const hoy=diaLocal(new Date());
  const est=c=>!c.activo?['Pausado','b-cancelado']:c.hasta&&c.hasta<hoy?['Vencido','b-cancelado']:c.usos_max&&(n[c.codigo]||0)>=c.usos_max?['Agotado','b-cancelado']:['Activo','b-entregado'];
  $('#vs').innerHTML=`<div class="box"><div class="bh"><h3>🎟️ Cupones de descuento</h3>${due?'<button id="cu_n">+ Nuevo cupón</button>':''}</div>
    <p><small>Un código que el cliente escribe en el carrito del catálogo (o que cargás vos en el pedido) y le da un % de descuento. Podés limitar cuántas veces se usa, hasta cuándo, un monto mínimo y que sea solo para la primera compra. Cada cliente lo puede usar una vez.</small></p>
    <div id="cu_f"></div>
    ${cu.data.length?`<div class="tw"><table><tr><th>Código</th><th>Descuento</th><th>Condiciones</th><th class="n">Usos</th><th>Estado</th><th></th></tr>${cu.data.map(c=>{const[e,k]=est(c);return`<tr><td><b class="cod">${esc(c.codigo)}</b></td><td><span class="promo">−${nf(c.descuento_pct)} %</span></td>
      <td><small>${[c.hasta?'hasta '+fd(c.hasta):'',c.minimo?'desde '+$m(c.minimo):'',c.solo_nuevos?'solo primera compra':''].filter(Boolean).join(' · ')||'—'}</small></td><td class="n">${n[c.codigo]||0}${c.usos_max?' de '+c.usos_max:''}</td>
      <td><span class="badge ${k}">${e}</span></td><td style="white-space:nowrap"><button class="alt wa" data-cuw="${esc(c.codigo)}">Difundir</button>${due?` <button class="alt" data-cut="${esc(c.codigo)}">${c.activo?'Pausar':'Activar'}</button> <a class="lnk" data-cub="${esc(c.codigo)}">Borrar</a>`:''}</td></tr>`}).join('')}</table></div>`:'<p><small>Todavía no hay cupones. Ejemplo: <b>BIENVENIDO10</b>: 10 % en la primera compra.</small></p>'}</div>`;
  $('#cu_n')&&($('#cu_n').onclick=()=>{$('#cu_n').hidden=true;$('#cu_f').innerHTML=`<div class="pmf"><div class="g">
      <label class="f">Código (lo que escribe el cliente)<input id="cu_c" placeholder="Ej.: VERANO10" style="text-transform:uppercase"></label>
      <label class="f">Descuento %<input id="cu_p" type="number" min="1" max="50" step="0.5" value="10"></label>
      <label class="f">Cuántas veces se puede usar en total (vacío = sin límite)<input id="cu_u" type="number" min="1" step="1"></label>
      <label class="f">Válido hasta (vacío = sin fin)<input id="cu_h" type="date"></label>
      <label class="f">Compra mínima $ (vacío = sin mínimo)<input id="cu_m" type="number" min="0" step="1000"></label></div>
      <label class="chk"><input type="checkbox" id="cu_s"> Solo para la primera compra (clientes nuevos)</label>
      <div class="fc-acc"><button id="cu_g">Guardar cupón</button><button class="alt" id="cu_x">Cancelar</button></div></div>`;
    $('#cu_x').onclick=()=>vCupones();
    $('#cu_g').onclick=async()=>{const c=$('#cu_c').value.trim().toUpperCase().replace(/\s+/g,'');if(!/^[A-Z0-9_-]{3,20}$/.test(c))return toast('El código tiene que tener de 3 a 20 letras o números, sin espacios.',1);
      const p=+$('#cu_p').value;if(!(p>0&&p<90))return toast('Poné un descuento válido.',1);
      const{error}=await sb.from('cupones').insert({codigo:c,descuento_pct:p,usos_max:+$('#cu_u').value||null,hasta:$('#cu_h').value||null,minimo:+$('#cu_m').value||null,solo_nuevos:$('#cu_s').checked});
      if(error)return toast(/duplicate|unique/i.test(error.message)?'Ya existe un cupón con ese código.':error.message,1);toast('Cupón '+c+' creado.');vCupones()}});
  $$('#vs [data-cut]').forEach(b=>b.onclick=async()=>{const c=cu.data.find(x=>x.codigo==b.dataset.cut);const{error}=await sb.from('cupones').update({activo:!c.activo}).eq('codigo',c.codigo);if(error)return toast(error.message,1);vCupones()});
  $$('#vs [data-cub]').forEach(a=>a.onclick=async()=>{if(!confirm('¿Borrar el cupón '+a.dataset.cub+'?'))return;const{error}=await sb.from('cupones').delete().eq('codigo',a.dataset.cub);if(error)return toast(error.message,1);vCupones()});
  $$('#vs [data-cuw]').forEach(b=>b.onclick=()=>{const c=cu.data.find(x=>x.codigo==b.dataset.cuw);
    const msg=`¡Hola {nombre}! 🎟️ Te regalamos un cupón de *${nf(c.descuento_pct)} % de descuento* en *Sabores de mi País*${c.minimo?' en compras desde '+$m(c.minimo):''}${c.hasta?' (válido hasta el '+fd(c.hasta)+')':''}.\nEscribí *${c.codigo}* en el carrito al hacer tu pedido acá:\n{link}`;
    S.vs='campanias';vVentas();setTimeout(()=>{$('#cp_m').value=msg;$('#cp_m').oninput()},400)});
}
async function vPuntos(){const due=S.perfil.rol=='dueno';
  const[cf,mv]=await Promise.all([sb.from('config_app').select('clave,valor').in('clave',[...PCFG.map(x=>x[0]),'catalogo_publico']),todo(()=>sb.from('puntos_mov').select('cliente_id,puntos'))]);
  if(mv.error){$('#vs').innerHTML=SQL_FID;return}
  const g=k=>(cf.data||[]).find(x=>x.clave==k)?.valor??PCFG.find(x=>x[0]==k)?.[1],sal={};for(const m of mv.data||[])sal[m.cliente_id]=(sal[m.cliente_id]||0)+m.puntos;
  const ref={};for(const c of S.clientes)if(c.referido_por)ref[c.referido_por]=(ref[c.referido_por]||0)+1;
  const vp=+g('valor_punto')||10,pc=+g('puntos_cada')||1000,pub=['mayorista','minorista','especial'].includes(g('catalogo_publico'));
  const R=S.clientes.filter(c=>sal[c.id]||ref[c.id]).sort((a,b)=>(sal[b.id]||0)-(sal[a.id]||0));
  $('#vs').innerHTML=`<div class="box"><h3>🏆 Puntos por compras</h3><p><small>Cada pedido <b>entregado</b> suma puntos solo. El cliente los ve en "Mi cuenta" y los usa como descuento en su próximo pedido online (tildando "Usar mis puntos").</small></p>
    <div class="g"><label class="f">Programa de puntos<select id="pt_a" ${due?'':'disabled'}><option value="si" ${g('puntos_activo')=='si'?'selected':''}>Activado</option><option value="no" ${g('puntos_activo')!='si'?'selected':''}>Apagado</option></select></label>
      <label class="f">1 punto cada $<input id="pt_c" type="number" min="1" step="100" value="${pc}" ${due?'':'disabled'}></label>
      <label class="f">Cada punto vale $<input id="pt_v" type="number" min="0.1" step="0.5" value="${vp}" ${due?'':'disabled'}></label>
      <label class="f">Máximo a pagar con puntos (% del pedido)<input id="pt_m" type="number" min="1" max="100" step="1" value="${g('canje_max_pct')}" ${due?'':'disabled'}></label>
      <label class="f">Premio por recomendar (puntos para cada uno)<input id="pt_r" type="number" min="0" step="50" value="${g('referido_puntos')}" ${due?'':'disabled'}></label></div>
    <p class="ej"><small>Así queda: un pedido de ${$m(100000)} da <b>${nf(Math.floor(100000/pc))} puntos</b> = ${$m(Math.floor(100000/pc)*vp)} de descuento en la próxima compra (${nf(Math.round(vp/pc*10000)/100)} % de devolución).</small></p>
    ${due?'<button id="pt_g">Guardar</button>':''}</div>
  <div class="box"><h3>🤝 Recomendá y ganá</h3><p><small>Cada cliente tiene su link para invitar a otros negocios (lo ve en "Mi cuenta"). El invitado ve el catálogo y te escribe por WhatsApp diciendo quién lo recomendó. Lo das de alta, y en su ficha ponés <b>"Lo recomendó"</b>. Cuando le entregás su primer pedido, <b>los dos</b> reciben ${nf(+g('referido_puntos')||0)} puntos (${$m((+g('referido_puntos')||0)*vp)}).</small></p>
    ${pub?'':'<p class="aviso">Para que funcione el link de recomendación, activá el <b>catálogo público</b> en Ventas → Folletos y catálogo.</p>'}</div>
  <div class="box" id="pt_ds"></div>
  <div class="box"><h3>Puntos de cada cliente</h3>${R.length?`<div class="tw"><table><tr><th>Cliente</th><th class="n">Puntos</th><th class="n">Equivalen</th><th class="n">Recomendó</th><th></th></tr>${R.map(c=>`<tr><td><a class="lnk" data-fc="${c.id}">${esc(c.razon_social)}</a></td><td class="n"><b>${nf(sal[c.id]||0)}</b></td><td class="n">${$m((sal[c.id]||0)*vp)}</td><td class="n">${ref[c.id]||''}</td><td>${due?`<button class="alt" data-pj="${c.id}">Ajustar</button>`:''}</td></tr>`).join('')}</table></div>`:'<p><small>Todavía nadie tiene puntos. Se suman cuando marcás pedidos como entregados.</small></p>'}
    ${due?'<button class="alt" id="pt_aj">Regalar / ajustar puntos a un cliente</button>':''}</div>`;
  $$('#vs [data-fc]').forEach(a=>a.onclick=()=>abrirFicha(a.dataset.fc));desafioBox();
  $('#pt_g')&&($('#pt_g').onclick=async()=>{const{error}=await sb.from('config_app').upsert([{clave:'puntos_activo',valor:$('#pt_a').value},{clave:'puntos_cada',valor:String(+$('#pt_c').value||1000)},{clave:'valor_punto',valor:String(+$('#pt_v').value||10)},{clave:'canje_max_pct',valor:String(Math.min(100,+$('#pt_m').value||20))},{clave:'referido_puntos',valor:String(+$('#pt_r').value||0)}]);
    if(error)return toast(error.message,1);toast('Guardado.');vPuntos()});
  const ajustar=c=>{const p=prompt('Puntos para '+c.razon_social+' (positivo suma, negativo resta). Tiene '+nf(sal[c.id]||0)+':','100');if(p===null)return;const n=Math.round(+String(p).replace(',','.'));if(!n)return;
    const mot=prompt('Motivo:',n>0?'Regalo':'Ajuste');sb.from('puntos_mov').insert({cliente_id:c.id,puntos:n,motivo:(mot||'Ajuste').slice(0,80)}).then(({error})=>{if(error)return toast(error.message,1);toast('Puntos actualizados.');vPuntos()})};
  $$('#vs [data-pj]').forEach(b=>b.onclick=()=>ajustar(S.clientes.find(c=>c.id==b.dataset.pj)));
  $('#pt_aj')&&($('#pt_aj').onclick=()=>{const q=prompt('¿A qué cliente? (escribí parte del nombre)');if(!q)return;const r=S.clientes.filter(c=>coincide(c.razon_social,q.toLowerCase()));
    if(!r.length)return toast('No encontré ese cliente.',1);if(r.length>1&&!confirm('Encontré '+r.length+'. ¿Es «'+r[0].razon_social+'»?'))return;ajustar(r[0])});
}
/* ---------- Presupuestos ---------- */
async function vPresupuestos(){
  const{data,error}=await sb.from('presupuestos').select('*').order('numero',{ascending:false}).limit(200);
  if(error){$('#vs').innerHTML=SQL_FID;return}
  const hoy=diaLocal(new Date()),E={enviado:['Esperando respuesta','b-pendiente'],aceptado:['Aceptado','b-entregado'],rechazado:['Rechazado','b-cancelado'],vencido:['Vencido','b-cancelado']};
  const st=p=>p.estado=='enviado'&&p.vence&&p.vence<hoy?'vencido':p.estado,nom=p=>S.clientes.find(c=>c.id==p.cliente_id)?.razon_social||p.nombre||'Sin nombre';
  const env=data.filter(p=>st(p)=='enviado'),ac=data.filter(p=>p.estado=='aceptado'),tasa=data.length?Math.round(ac.length/data.filter(p=>st(p)!='enviado').length*100)||0:0;
  $('#vs').innerHTML=`<div class="kp"><div class="box"><span class="lab">Esperando respuesta</span><span class="num">${env.length}</span><span class="det">${$m(env.reduce((a,p)=>a+ +p.total,0))}</span></div>
    <div class="box ok"><span class="lab">Aceptados</span><span class="num">${ac.length}</span><span class="det">${$m(ac.reduce((a,p)=>a+ +p.total,0))}</span></div>
    <div class="box"><span class="lab">Se cierran</span><span class="num">${tasa} %</span><span class="det">de los que tuvieron respuesta</span></div></div>
  <div class="box"><div class="bh"><h3>📝 Presupuestos</h3><button id="pp_n">+ Nuevo presupuesto</button></div>
    <p><small>Armás el presupuesto, se lo mandás por WhatsApp con un link, y el cliente lo ve con fotos y toca <b>Aceptar</b>: si ya es cliente se convierte solo en pedido <b>Por aprobar</b>. Si es alguien nuevo, te avisa y lo pasás a pedido desde acá.</small></p>
    ${data.length?`<div class="tw"><table><tr><th>N°</th><th>Para</th><th>Fecha</th><th class="n">Total</th><th>Estado</th><th></th></tr>${data.map(p=>{const s=st(p);return`<tr><td>${p.numero}</td><td>${p.origen=='catalogo'?'<span class="badge b-aprobado">🌐 Catálogo</span> ':''}${esc(nom(p))}${p.cliente_id?'':' <small>(nuevo)</small>'}${p.origen=='catalogo'&&p.telefono?'<br><small>'+esc(p.telefono)+'</small>':''}${p.origen=='catalogo'&&p.nota?'<br><small>'+esc(p.nota)+'</small>':''}${p.respuesta?`<br><small><i>“${esc(p.respuesta)}”</i></small>`:''}</td><td><small>${fd(diaLocal(p.creado_en))}${p.vence?'<br>vence '+fd(p.vence):''}</small></td><td class="n">${$m(p.total)}</td>
      <td><span class="badge ${E[s][1]}">${E[s][0]}</span>${p.pedido_id?'<br><small>✓ pasó a pedido</small>':''}</td><td style="white-space:nowrap"><button class="alt wa" data-pw="${p.id}">WhatsApp</button> <a class="lnk" data-pf="${p.id}">PDF</a> · <a class="lnk" data-pc="${p.id}">Copiar link</a>
      ${s=='aceptado'&&!p.pedido_id?` · <button data-pv="${p.id}">Pasar a pedido</button>`:''}${s=='enviado'?` · <a class="lnk" data-pr="${p.id}">Rechazado</a>`:''}${!p.pedido_id?` · <a class="lnk" data-pb="${p.id}">Borrar</a>`:''}</td></tr>`}).join('')}</table></div>`:'<p><small>Todavía no hiciste presupuestos.</small></p>'}</div>`;
  const P=id=>data.find(p=>p.id==id);
  $('#pp_n').onclick=()=>editarPresupuesto();
  $$('#vs [data-pw]').forEach(b=>b.onclick=()=>enviarPresupuesto(P(b.dataset.pw)));
  $$('#vs [data-pf]').forEach(a=>a.onclick=()=>presupuestoPDF(P(a.dataset.pf)));
  $$('#vs [data-pc]').forEach(a=>a.onclick=async()=>{try{await navigator.clipboard.writeText(linkPre(P(a.dataset.pc).token));toast('Link copiado.')}catch(e){prompt('Copiá el link:',linkPre(P(a.dataset.pc).token))}});
  $$('#vs [data-pr]').forEach(a=>a.onclick=async()=>{await sb.from('presupuestos').update({estado:'rechazado'}).eq('id',a.dataset.pr);vPresupuestos()});
  $$('#vs [data-pb]').forEach(a=>a.onclick=async()=>{if(!confirm('¿Borrar el presupuesto N° '+P(a.dataset.pb).numero+'?'))return;const{error}=await sb.from('presupuestos').delete().eq('id',a.dataset.pb);if(error)return toast(error.message,1);vPresupuestos()});
  $$('#vs [data-pv]').forEach(b=>b.onclick=()=>presupuestoAPedido(P(b.dataset.pv)));
}
function presupuestoPDF(p){const w=window.open('','_blank');if(!w)return toast('Permití las ventanas emergentes para generar el PDF.',1);
  const c=S.clientes.find(x=>x.id==p.cliente_id)||{razon_social:p.nombre,telefono:p.telefono};
  w.document.write(`<html><head><meta charset="utf-8"><title>Presupuesto ${p.numero} - ${esc(c.razon_social||'')}</title><style>body{font:14px system-ui,Segoe UI,sans-serif;margin:32px;color:#1c2333;max-width:760px}h1{color:${MARCA.c};margin:0}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${MARCA.c};padding-bottom:12px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border-bottom:1px solid #ccc;padding:6px;text-align:left}.n{text-align:right;white-space:nowrap}.tot td{font-weight:700;font-size:16px;border-bottom:0}small{color:#667}.ayuda{background:#f6e9ec;padding:10px;border-radius:6px}@media print{.ayuda{display:none}}</style><style>${docCss()}</style></head><body>
  <p class="ayuda">Para guardarlo en PDF: en la ventana de impresión elegí <b>Guardar como PDF</b> como destino.</p>
  <div class="top"><div>${logoImg()}<h1>Sabores de mi País</h1>${S.telEmp?'<div>WhatsApp '+esc(S.telEmp)+'</div>':''}${S.emisor?emisorHTML(S.emisor):''}</div><div class="n"><div style="font-weight:800;letter-spacing:.06em;color:${MARCA.c};font-size:15px;margin-bottom:2px">PRESUPUESTO</div><b>N° ${p.numero}</b><br>${fd(diaLocal(p.creado_en))}${p.vence?'<br>Válido hasta '+fd(p.vence):''}</div></div>
  <div class="dcli"><b>Para:</b> ${cliDocNom(c)}${c.cuit?'<br><b>CUIT:</b> '+esc(cuitFmt(c.cuit)):''}${dirCompleta(c)?'<br><b>Domicilio:</b> '+esc(dirLinda(c)):''}</div>
  <table><tr><th>Producto</th><th class="n">Cant.</th><th class="n">Precio</th><th class="n">Subtotal</th></tr>${(p.items||[]).map(i=>`<tr><td><div class="dpr">${docFoto(i.id)}<div>${esc(nomProd(i.id))}${i.promo?'<br><small>'+esc(i.promo)+'</small>':''}</div></div></td><td class="n">${nf(i.q)}${enBultos(i.id,i.q)?'<br><small>'+enBultos(i.id,i.q)+'</small>':''}</td><td class="n">${$m(i.pu)}</td><td class="n">${$m(i.q*i.pu)}</td></tr>`).join('')}
  <tr class="tot"><td colspan="3" class="n">Total</td><td class="n">${$m(p.total)}</td></tr></table>${p.nota?'<p><b>Nota:</b> '+esc(p.nota)+'</p>':''}
  <p><small>Precios sujetos a disponibilidad de stock. Aceptalo desde el link que te mandamos o respondiendo por WhatsApp.</small></p>
  <p class="gracias">¡Gracias por elegirnos!</p>
  <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close()}
async function presupuestoAPedido(p){let c=S.clientes.find(x=>x.id==p.cliente_id);
  if(!c){if(!confirm('«'+(p.nombre||'Sin nombre')+'» todavía no es cliente. ¿Lo doy de alta y armo el pedido? Después completás sus datos en la ficha.'))return;
    let pro=null;if(p.telefono){const{data:px}=await sb.from('prospectos').select('*').neq('estado','cliente').order('creado_en',{ascending:false}).limit(300);pro=(px||[]).find(x=>String(x.telefono||'').replace(/\D/g,'').slice(-8)==String(p.telefono).replace(/\D/g,'').slice(-8))||null}
    const row={razon_social:p.nombre||'Cliente nuevo',telefono:p.telefono,condicion_iva:'consumidor_final',lista:p.lista||'mayorista',condicion_pago_dias:0,vendedor_id:S.perfil.id};
    if(pro){if(pro.domicilio)row.domicilio=pro.domicilio;if(pro.cuit)row.cuit=pro.cuit;if(pro.rubro&&'rubro' in (S.clientes[0]||{}))row.rubro=pro.rubro;if(pro.observaciones)row.observaciones=pro.observaciones}
    const{data,error}=await sb.from('clientes').insert(row).select().single();
    if(error)return toast(error.message,1);c=data;if(pro)sb.from('prospectos').update({estado:'cliente',cliente_id:c.id,actualizado_en:new Date().toISOString()}).eq('id',pro.id).then(()=>{});S.clientes.push(c);S.clientes.sort((a,b)=>a.razon_social.localeCompare(b.razon_social))}
  const{data:o,error}=await sb.from('pedidos').insert({cliente_id:c.id,vendedor_id:S.perfil.id,lista:c.lista,descuento_pct:0,origen:'presupuesto',observaciones:'Presupuesto N° '+p.numero}).select().single();
  if(error)return toast(error.message,1);
  const{error:e2}=await sb.from('pedido_items').insert((p.items||[]).map(i=>{const x={pedido_id:o.id,producto_id:i.id,cantidad:i.q,precio_unitario:i.pu};if(i.promo)x.promo=i.promo;return x}));
  if(e2)return toast('El pedido N° '+o.numero+' quedó sin productos: '+e2.message,1);
  await sb.from('presupuestos').update({cliente_id:c.id,pedido_id:o.id,estado:'aceptado'}).eq('id',p.id);
  toast('Listo: pedido N° '+o.numero+' creado para '+c.razon_social+'.');vPresupuestos()}
async function mandarSugerido(c,w){w=w||window.open('','_blank');const L=await sugeridoDe(c);
  if(!L.length){if(w)w.close();return toast('Todavía no hay suficientes pedidos de '+c.razon_social+' para sugerirle (hacen falta 2).',1)}
  if(!c.token_pedidos){if(w)w.close();return toast('Este cliente no tiene link de pedidos.',1)}
  const u='https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(txtSug(c,L));if(w)w.location.href=u;else window.open(u,'_blank');
  sb.from('contactos_clientes').insert({cliente_id:c.id,tipo:'whatsapp',detalle:'Pedido sugerido'}).then(()=>{});return true}
function colaSugeridos(L){const m=document.createElement('div');m.className='modal';document.body.appendChild(m);const hechos=new Set();
  const draw=()=>{m.innerHTML=`<div class="mc"><div class="bh"><h3>🛒 Pedido sugerido (${hechos.size} de ${L.length})</h3><button class="alt" id="cs_x">Cerrar</button></div>
    <p><small>Tocá <b>Enviar</b>: se abre WhatsApp con su pedido de siempre ya armado y un link para que lo confirme con un toque.</small></p>
    ${L.map(c=>`<div class="bh cpf ${hechos.has(c.id)?'ok':''}"><span>${esc(c.razon_social)}</span><button class="${hechos.has(c.id)?'alt hecho':'wa'}" data-cs="${c.id}">${hechos.has(c.id)?'✓ Enviado':'Enviar'}</button></div>`).join('')}</div>`;
    m.querySelector('#cs_x').onclick=()=>{m.remove();if(S.vs=='toca')vToca()};
    m.querySelectorAll('[data-cs]').forEach(b=>b.onclick=async()=>{const c=L.find(x=>x.id==b.dataset.cs);if(await mandarSugerido(c)){hechos.add(c.id);draw()}})};draw()}
/* ---------- 2. Carritos sin enviar ---------- */
async function vCarritos(){
  const{data,error}=await todo(()=>sb.from('carritos').select('*').order('actualizado_en',{ascending:false}));
  if(error){$('#vs').innerHTML=SQL_MAS;return}
  const L=data.filter(x=>Date.now()-new Date(x.actualizado_en)>3600e3&&+x.total>0),cli=id=>S.clientes.find(c=>c.id==id)||{razon_social:'Cliente'};
  $('#vs').innerHTML=`<div class="kp"><div class="box ${L.filter(x=>!x.contactado_en).length?'alerta':'ok'}"><span class="lab">Sin enviar</span><span class="num">${L.length}</span><span class="det">armaron el carrito y no lo mandaron</span></div>
    <div class="box"><span class="lab">Venta en juego</span><span class="num">${$m0(L.reduce((a,x)=>a+ +x.total,0))}</span><span class="det">sumando esos carritos</span></div></div>
  <div class="box"><p><small>Cuando un cliente arma el carrito en su catálogo y no lo envía, queda guardado acá (aparece después de 1 hora). Escribile: el carrito lo sigue esperando en su link.</small></p>
  ${L.length?`<div class="ag">${L.map(x=>{const c=cli(x.cliente_id);return`<div class="vi ${x.contactado_en?'hecho-vi':''}"><span class="badge b-pendiente">${$m(x.total)}</span>
    <div><a class="lnk" data-fc="${x.cliente_id}"><b>${esc(c.razon_social)}</b></a> <small>· ${hace(x.actualizado_en)}</small><br><small>${(x.items||[]).slice(0,6).map(i=>esc(String(i.id).startsWith('combo:')?'Combo':nomProd(i.id))+' ×'+nf(i.q)).join(' · ')}${(x.items||[]).length>6?' …':''}</small>${x.contactado_en?`<br><small class="sube">✓ Le escribiste ${hace(x.contactado_en)}</small>`:''}</div>
    ${filaAcc(c,`<a class="lnk" data-cb="${x.cliente_id}">Borrar</a>`)}</div>`}).join('')}</div>`:'<p><small>No hay carritos abandonados. 👌</small></p>'}</div>`;
  $$('#vs [data-fc]').forEach(a=>a.onclick=()=>abrirFicha(a.dataset.fc));
  $$('#vs [data-w]').forEach(b=>b.onclick=()=>{const x=L.find(y=>y.cliente_id==b.dataset.w),c=cli(x.cliente_id);
    window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(c)}! Te escribo de *Sabores de mi País* 👋 Vi que armaste un pedido de *${$m(x.total)}* pero no llegó a enviarse. ¿Te ayudo a terminarlo? Lo tenés guardado acá, solo falta tocar *Enviar pedido*:\n${linkPedidos(c)}`),'_blank');
    sb.from('carritos').update({contactado_en:new Date().toISOString()}).eq('cliente_id',c.id).then(()=>setTimeout(()=>S.vs=='carritos'&&vCarritos(),600))});
  $$('#vs [data-cb]').forEach(a=>a.onclick=async()=>{await sb.from('carritos').delete().eq('cliente_id',a.dataset.cb);vCarritos()});
}
/* ---------- 3. Avisame cuando llegue ---------- */
async function vEsperan(){await cargarStock();
  const[av,cf]=await Promise.all([sb.from('avisos_stock').select('*').is('avisado_en',null).order('creado_en'),sb.from('config_app').select('valor').eq('clave','avisar_sin_stock').maybeSingle()]);
  if(av.error){$('#vs').innerHTML=SQL_MAS;return}
  const G={};for(const a of av.data)(G[a.producto_id]=G[a.producto_id]||[]).push(a);
  const disp=id=>S.stock[id]?.d||0,P=Object.keys(G).sort((a,b)=>(disp(b)>0)-(disp(a)>0)||G[b].length-G[a].length),on=cf.data?.valor=='si';
  $('#vs').innerHTML=`<div class="box"><h3>🔔 Avisame cuando llegue</h3><p><small>En el catálogo, los productos sin stock muestran <b>"Sin stock"</b> y un botón <b>🔔 Avisame</b>. Cuando cargás la mercadería, acá te aparecen los clientes que lo estaban esperando para escribirles.</small></p>
    <label class="chk"><input type="checkbox" id="ss_on" ${on?'checked':''} ${S.perfil.rol=='dueno'?'':'disabled'}> Mostrar "Sin stock" en el catálogo online</label>
    ${on&&!S.inv?'<p class="aviso"><small>Ojo: no veo stock cargado. Si no usás el control de stock, dejá esto apagado o todos los productos van a figurar sin stock.</small></p>':''}</div>
  <div class="box"><h3>Clientes esperando productos</h3>${P.length?P.map(id=>{const d=disp(id);return`<div class="box ${d>0?'toca-i':''}" style="margin:8px 0"><div class="bh"><b>${esc(nomProd(id))}</b>${d>0?`<span class="badge b-entregado">¡Llegó! ${nf(d)} disponibles</span>`:'<span class="badge b-cancelado">Sin stock</span>'}</div>
      ${G[id].map(a=>{const c=S.clientes.find(x=>x.id==a.cliente_id)||{razon_social:'Cliente'};return`<div class="bh cpf"><span>${esc(c.razon_social)} <small>· lo pidió ${hace(a.creado_en)}</small></span><span>${c.telefono?`<button class="${d>0?'wa':'alt wa'}" data-aw="${a.id}">Avisar que llegó</button>`:''} <a class="lnk" data-ax="${a.id}">Quitar</a></span></div>`}).join('')}</div>`}).join('')
    :'<p><small>Nadie está esperando productos por ahora.</small></p>'}</div>`;
  $('#ss_on').onchange=async e=>{const{error}=await sb.from('config_app').upsert({clave:'avisar_sin_stock',valor:e.target.checked?'si':'no'});if(error)return toast(error.message,1);toast('Guardado.');vEsperan()};
  const A=id=>av.data.find(a=>a.id==id);
  $$('#vs [data-aw]').forEach(b=>b.onclick=()=>{const a=A(b.dataset.aw),c=S.clientes.find(x=>x.id==a.cliente_id);
    window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(c)}! 🎉 Ya llegó *${nomProd(a.producto_id)}* que nos pediste en *Sabores de mi País*. ¿Te lo separo? Pedilo acá:\n${c.token_pedidos?linkPedidos(c):''}`),'_blank');
    sb.from('avisos_stock').update({avisado_en:new Date().toISOString()}).eq('id',a.id).then(()=>setTimeout(()=>S.vs=='esperan'&&vEsperan(),600))});
  $$('#vs [data-ax]').forEach(a=>a.onclick=async()=>{await sb.from('avisos_stock').delete().eq('id',a.dataset.ax);vEsperan()});
}
async function vLiquidar(){await Promise.all([cargarStock(),cargarPromos()]);const due=S.perfil.rol=='dueno',hoy=diaLocal(new Date());
  const lim=diaLocal(new Date(Date.now()+60*864e5));
  const[ve,pe]=await Promise.all([sb.from('vencimientos').select('*').eq('retirado',false).lte('vence',lim).order('vence'),
    todo(()=>sb.from('pedidos').select('creado_en,pedido_items(producto_id,cantidad)').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-90*864e5).toISOString()).order('numero'))]);
  const vend={};for(const o of pe.data||[])for(const i of o.pedido_items||[])vend[i.producto_id]=(vend[i.producto_id]||0)+(+i.cantidad||0);
  const enPromo=id=>S.promos.find(r=>r.alcance=='producto'&&r.alcance_valor==id&&(r.nombre.startsWith(LIQ)||r.nombre.startsWith(SOBRE))&&(!r.hasta||r.hasta>=hoy));
  const dd=x=>Math.round((new Date(x+'T12:00')-new Date(hoy+'T12:00'))/864e5),costo=id=>+S.productos.find(p=>p.producto_id==id)?.costo||0;
  const V=(ve.data||[]).filter(v=>S.productos.some(p=>p.producto_id==v.producto_id));
  const SO=S.productos.map(p=>{const d=S.stock[p.producto_id]?.d||0,mes=(vend[p.producto_id]||0)/3;return{p,d,mes,cob:mes>0?d/mes:99,val:d*(+p.costo||0)}}).filter(x=>x.d>0&&x.cob>=3&&x.val>0).sort((a,b)=>b.val-a.val).slice(0,30);
  $('#vs').innerHTML=`<div class="box"><h3>⏳ Por vencer (próximos 60 días)</h3><p><small>Sale de los vencimientos que cargás en Stock. Ponelos en liquidación: en el catálogo aparecen con la etiqueta <b>ÚLTIMAS UNIDADES</b> hasta el día que vencen.</small></p>
    ${ve.error?'<p><small>Para usar esto, corré control.sql (vencimientos).</small></p>':V.length?`<div class="tw"><table><tr><th>Producto</th><th>Vence</th><th class="n">Cant.</th><th></th></tr>${V.map(v=>{const n=dd(v.vence),pr=enPromo(v.producto_id);return`<tr><td>${esc(nomProd(v.producto_id))}${v.lote?'<br><small>Lote '+esc(v.lote)+'</small>':''}</td><td><span class="badge ${n<0?'b-cancelado':n<=15?'b-mora30':'b-pendiente'}">${n<0?'Vencido':'en '+n+' d'}</span><br><small>${fd(v.vence)}</small></td><td class="n">${v.cantidad?nf(v.cantidad)+(ppz(v.producto_id)?`<br><small>≈ ${kgTxt(+v.cantidad*ppz(v.producto_id))}</small>`:esKg(v.producto_id)?' kg':''):'—'}</td>
      <td style="white-space:nowrap">${pr?`<span class="promo">−${nf(pr.descuento_pct)} % en el catálogo</span>`:n>=0&&due?`<button data-lq="${v.producto_id}" data-lh="${v.vence}">Liquidar</button>`:''}${n>=0?` <button class="alt wa" data-lav="${v.producto_id}" data-lh="${v.vence}" title="Avisarles a los que lo compran">📲 Avisar</button>`:''}</td></tr>`}).join('')}</table></div>`:'<p><small>No hay productos por vencer en los próximos 60 días.</small></p>'}</div>
  <div class="box"><h3>📦 Sobrestock</h3><p><small>Productos con stock para <b>3 meses o más</b> según lo que vendiste los últimos 90 días. Plata parada: armales una promo o un combo para moverlos.</small></p>
    ${!S.inv?'<p><small>Para ver esto necesitás tener el stock cargado.</small></p>':SO.length?`<div class="tw"><table><tr><th>Producto</th><th class="n">Stock</th><th class="n">Vendés por mes</th><th class="n">Plata parada</th><th></th></tr>${SO.map(x=>{const pr=enPromo(x.p.producto_id);return`<tr><td>${esc(x.p.descripcion)}</td><td class="n">${nf(x.d)}<br><small>${x.cob>=99?'no se vendió':nf(Math.round(x.cob*10)/10)+' meses'}</small></td><td class="n">${nf(Math.round(x.mes))}</td><td class="n">${$m(x.val)}</td>
      <td style="white-space:nowrap">${pr?`<span class="promo">−${nf(pr.descuento_pct)} %</span>`:due?`<button class="alt" data-sp="${x.p.producto_id}">Promo</button> `:''}${due?`<button class="alt" data-sc="${x.p.producto_id}">Combo</button>`:''}</td></tr>`}).join('')}</table></div>`:'<p><small>¡Bien! No tenés productos con sobrestock.</small></p>'}</div>`;
  const crear=async(id,nom,hasta,def)=>{const v=prompt('¿Qué descuento le ponemos a '+nomProd(id)+'? (%)',def);if(v===null)return;const pct=+String(v).replace(',','.');if(!(pct>0&&pct<90))return toast('Poné un % válido.',1);
    const{error}=await sb.from('promociones').insert({nombre:nom,descuento_pct:pct,alcance:'producto',alcance_valor:id,minimo_tipo:'ninguno',minimo_unidades:0,listas:null,desde:hoy,hasta,activa:true});
    if(error)return toast(error.message,1);await cargarPromos();toast('Listo: ya figura con −'+nf(pct)+' % en el catálogo.');vLiquidar()};
  $$('#vs [data-lq]').forEach(b=>b.onclick=()=>crear(b.dataset.lq,LIQ,b.dataset.lh,'25'));
  $$('#vs [data-lav]').forEach(b=>b.onclick=()=>avisarPorVencer(b.dataset.lav,b.dataset.lh));
  $$('#vs [data-sp]').forEach(b=>b.onclick=()=>crear(b.dataset.sp,SOBRE,diaLocal(new Date(Date.now()+30*864e5)),'15'));
  $$('#vs [data-sc]').forEach(b=>b.onclick=async()=>{await cargarVentasCfg();editarCombo(null);setTimeout(()=>{const p=S.productos.find(x=>x.producto_id==b.dataset.sc);$('#ce_q').value=p.descripcion;$('#ce_q').dispatchEvent(new Event('input'));setTimeout(()=>$('#ce_r .r')?.click(),150)},100)});
}
async function vRelampago(){await cargarPromos();const due=S.perfil.rol=='dueno',hoy=diaLocal(new Date());
  const A=S.promos.filter(r=>r.nombre.startsWith('⚡')&&r.activa&&r.hasta>=hoy);let sel=[];
  const draw=()=>{$('#vs').innerHTML=`<div class="box"><h3>⚡ Ofertas relámpago</h3><p><small>Un descuento fuerte por poco tiempo. En el catálogo aparece arriba de todo con <b>cuenta regresiva</b> ("termina en 05:12:33"). La urgencia hace que pidan ya.</small></p>
    ${A.length?`<table>${A.map(r=>`<tr><td><b>${esc(nomProd(r.alcance_valor))}</b><br><small>termina el ${fd(r.hasta)} a las 23:59</small></td><td class="n"><span class="promo">−${nf(r.descuento_pct)} %</span><br>${$m(precioLista(r.alcance_valor,'mayorista')*(1-r.descuento_pct/100))}</td><td>${due?`<a class="lnk" data-rx="${r.id}">Terminar</a>`:''}</td></tr>`).join('')}</table>
      <button class="wa" id="rl_av">Avisar a los clientes</button>`:'<p><small>No hay ofertas relámpago activas.</small></p>'}</div>
    ${due?`<div class="box"><h3>Nueva oferta relámpago</h3><div class="conscan"><input id="rl_q" placeholder="Elegí productos (nombre o código)" autocomplete="off">${btnScan('rl_sc')}</div><div id="rl_r"></div>
      <div>${sel.map((id,i)=>`<span class="chip">${esc(nomProd(id))} <a class="lnk" data-rq="${i}">✕</a></span>`).join(' ')}</div>
      <div class="g"><label class="f">Descuento %<input id="rl_p" type="number" min="1" max="80" value="20"></label>
      <label class="f">Dura<select id="rl_d"><option value="0">Solo hoy</option><option value="1" selected>Hasta mañana</option><option value="2">3 días</option></select></label></div>
      <button id="rl_g">Lanzar oferta</button></div>`:''}`;
    $$('#vs [data-rx]').forEach(a=>a.onclick=async()=>{if(!confirm('¿Terminar esta oferta?'))return;await sb.from('promociones').update({activa:false}).eq('id',a.dataset.rx);vRelampago()});
    $('#rl_av')&&($('#rl_av').onclick=()=>{const msg=`¡Hola {nombre}! ⚡ *OFERTA RELÁMPAGO* en *Sabores de mi País*, solo hasta el ${fd(A[0].hasta)}:\n`+A.map(r=>'• '+nomProd(r.alcance_valor)+' *−'+nf(r.descuento_pct)+' %*').join('\n')+'\n\n¡Corré que vuela! Pedí acá:\n{link}';
      S.vs='campanias';vVentas();setTimeout(()=>{$('#cp_m').value=msg;$('#cp_m').oninput()},400)});
    if(!due)return;const add=p=>{if(!sel.includes(p.producto_id))sel.push(p.producto_id);draw()};
    buscador('#rl_q','#rl_r',add);$('#rl_sc').onclick=()=>escanear('Oferta relámpago',p=>{add(p);return '✔ '+p.descripcion});
    $$('#vs [data-rq]').forEach(a=>a.onclick=()=>{sel.splice(+a.dataset.rq,1);draw()});
    $('#rl_g').onclick=async()=>{if(!sel.length)return toast('Elegí al menos un producto.',1);const pct=+$('#rl_p').value;if(!(pct>0&&pct<90))return toast('Poné un % válido.',1);
      const h=diaLocal(new Date(Date.now()+(+$('#rl_d').value)*864e5));
      const{error}=await sb.from('promociones').insert(sel.map(id=>({nombre:REL,descuento_pct:pct,alcance:'producto',alcance_valor:id,minimo_tipo:'ninguno',minimo_unidades:0,listas:null,desde:hoy,hasta:h,activa:true})));
      if(error)return toast(error.message,1);toast('¡Oferta lanzada! Ya está en el catálogo.');vRelampago()}};
  draw()}
/* ---------- 7. Qué buscan y no encuentran ---------- */
async function vBuscan(){
  const{data,error}=await todo(()=>sb.from('busquedas').select('texto,cliente_id,fecha').gte('fecha',new Date(Date.now()-90*864e5).toISOString()).order('id'));
  if(error){$('#vs').innerHTML=SQL_MAS;return}
  const G={};for(const b of data){const k=norm(b.texto),g=G[k]=G[k]||{t:b.texto,n:0,c:new Set(),u:b.fecha};g.n++;if(b.cliente_id)g.c.add(b.cliente_id);if(b.fecha>g.u)g.u=b.fecha}
  const L=Object.values(G).sort((a,b)=>b.n-a.n);
  $('#vs').innerHTML=`<div class="box" id="bu_sg"></div><div class="box"><h3>🔎 Lo que buscan y no encuentran</h3><p><small>Cada vez que alguien busca en el catálogo y no aparece nada, queda anotado. Son productos que te piden y no tenés… o que tenés pero escritos distinto (en ese caso, agregale esa palabra a la descripción).</small></p>
  ${L.length?`<div class="tw"><table><tr><th>Buscaron</th><th class="n">Veces</th><th>Quiénes</th><th>Última vez</th><th></th></tr>${L.slice(0,80).map((g,i)=>{const pa=S.productos.filter(p=>coincide(txtProd(p),g.t)).slice(0,1)[0]||S.productos.map(p=>({p,s:parecido(norm(g.t),norm(p.descripcion))})).sort((a,b)=>b.s-a.s).filter(x=>x.s>.45)[0]?.p;
    return`<tr><td><b>${esc(g.t)}</b>${pa?`<br><small>¿Será "${esc(pa.descripcion)}"?</small>`:''}</td><td class="n">${g.n}</td><td><small>${[...g.c].slice(0,3).map(id=>esc(S.clientes.find(c=>c.id==id)?.razon_social||'')).join(', ')||'catálogo público'}${g.c.size>3?' y '+(g.c.size-3)+' más':''}</small></td><td><small>${fd(diaLocal(g.u))}</small></td></tr>`}).join('')}</table></div>`:'<p><small>Todavía no hay búsquedas sin resultado (se empiezan a anotar desde ahora).</small></p>'}</div>`;
  sugeridosBox();
}
/* ---------- 8. Clientes y productos A-B-C ---------- */
async function vABC(){S.abcD=S.abcD||180;
  $('#vs').innerHTML=`<div class="box"><div class="bh"><h3>🅰️ Clientes y productos A-B-C</h3><select id="ab_d" style="width:auto">${[[90,'Últimos 3 meses'],[180,'Últimos 6 meses'],[365,'Último año']].map(([v,t])=>`<option value="${v}" ${S.abcD==v?'selected':''}>${t}</option>`).join('')}</select></div>
    <p><small>Ordena por la <b>ganancia</b> que te dejan (venta menos costo, sin IVA). <b>A</b> = los que suman el 80 % de tu ganancia: cuidalos como oro. <b>B</b> = el siguiente 15 %. <b>C</b> = el resto: ahí podés subir precios o empujar productos con más margen.</small></p><div id="ab_r">Calculando…</div></div>`;
  $('#ab_d').onchange=e=>{S.abcD=+e.target.value;vABC()};
  let O;try{O=await ctPedidos(diaLocal(new Date(Date.now()-S.abcD*864e5)),diaLocal(new Date(Date.now()+864e5)))}catch(e){$('#ab_r').innerHTML='<p class="err">'+esc(e.message)+'</p>';return}
  const C={},P={};for(const o of O)for(const i of o.items){const c=C[o.cliente_id]=C[o.cliente_id]||{v:0,g:0},p=P[i.id]=P[i.id]||{v:0,g:0,q:0};c.v+=i.n;c.g+=i.n-i.c;p.v+=i.n;p.g+=i.n-i.c;p.q+=i.q}
  const clas=M=>{const L=Object.entries(M).map(([id,x])=>({id,...x})).sort((a,b)=>b.g-a.g),T=L.reduce((a,x)=>a+Math.max(0,x.g),0);let ac=0;for(const x of L){ac+=Math.max(0,x.g);x.k=T>0&&ac-Math.max(0,x.g)<T*.8?'A':T>0&&ac-Math.max(0,x.g)<T*.95?'B':'C'}return{L,T}};
  const c=clas(C),p=clas(P),cnt=(L,k)=>L.filter(x=>x.k==k).length,BG={A:'b-entregado',B:'b-pendiente',C:'b-cancelado'};
  const tabla=(L,nom,extra)=>`<div class="tw"><table><tr><th></th><th>${nom}</th>${extra?'<th class="n">Unid.</th>':''}<th class="n">Venta</th><th class="n">Ganancia</th><th class="n">Margen</th></tr>${L.slice(0,60).map(x=>`<tr><td><span class="badge ${BG[x.k]}">${x.k}</span></td><td>${esc(nom=='Cliente'?(S.clientes.find(y=>y.id==x.id)?.razon_social||'Cliente'):nomProd(x.id))}</td>${extra?`<td class="n">${nf(Math.round(x.q))}</td>`:''}<td class="n">${$m(x.v)}</td><td class="n">${$m(x.g)}</td><td class="n ${x.v&&x.g/x.v<.1?'baja':''}">${x.v?nf(Math.round(x.g/x.v*1000)/10)+' %':'—'}</td></tr>`).join('')}</table></div>${L.length>60?'<p><small>Se muestran los primeros 60 de '+L.length+'.</small></p>':''}`;
  $('#ab_r').innerHTML=O.length?`<div class="kp"><div class="box ok"><span class="lab">Clientes A</span><span class="num">${cnt(c.L,'A')} de ${c.L.length}</span><span class="det">te dejan el 80 % de la ganancia</span></div>
    <div class="box ok"><span class="lab">Productos A</span><span class="num">${cnt(p.L,'A')} de ${p.L.length}</span><span class="det">el 80 % de la ganancia</span></div><div class="box"><span class="lab">Ganancia del período</span><span class="num">${$m0(c.T)}</span><span class="det">sin IVA</span></div></div>
    <h3>Clientes</h3>${tabla(c.L,'Cliente')}<h3>Productos</h3>${tabla(p.L,'Producto',1)}<div class="fc-acc"><button class="alt" id="ab_x">Copiar para Excel</button></div>`:'<p><small>No hay pedidos en ese período.</small></p>';
  $('#ab_x')&&($('#ab_x').onclick=()=>copiarTabla(['Tipo','Clase','Nombre','Venta','Ganancia'],[...c.L.map(x=>['Cliente',x.k,S.clientes.find(y=>y.id==x.id)?.razon_social||'',Math.round(x.v),Math.round(x.g)]),...p.L.map(x=>['Producto',x.k,nomProd(x.id),Math.round(x.v),Math.round(x.g)])]));
}
async function vRubros(){
  if(!S.clientes.length||!('rubro' in S.clientes[0])){$('#vs').innerHTML=SQL_MAS;return}
  const R={};for(const c of S.clientes){const r=(c.rubro||'').trim();if(r){const k=r.toLowerCase();(R[k]=R[k]||{n:r,c:[]}).c.push(c)}}
  const sin=S.clientes.filter(c=>!(c.rubro||'').trim());S.rub=S.rub&&R[S.rub]?S.rub:Object.keys(R)[0]||'';
  let top=[];if(S.rub){const ids=new Set(R[S.rub].c.map(c=>c.id));const{data}=await todo(()=>sb.from('pedidos').select('cliente_id,pedido_items(producto_id)').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-180*864e5).toISOString()).order('numero'));
    const n={};for(const o of data||[])if(ids.has(o.cliente_id))for(const id of new Set((o.pedido_items||[]).map(i=>i.producto_id)))(n[id]=n[id]||new Set()).add(o.cliente_id);
    top=Object.entries(n).filter(([id])=>S.productos.some(p=>p.producto_id==id)).sort((a,b)=>b[1].size-a[1].size).slice(0,24)}
  const{data:pros}=S.rub?await sb.from('prospectos').select('*').ilike('rubro',R[S.rub].n).neq('estado','cliente'):{data:[]};
  $('#vs').innerHTML=`<div class="box"><h3>🏪 Catálogo por tipo de negocio</h3><p><small>Agrupá a tus clientes por rubro. El catálogo de cada uno muestra arriba <b>"Lo que más piden los kioscos"</b> (o su rubro), y a un negocio nuevo le mandás el catálogo armado para su rubro.</small></p>
    ${Object.keys(R).length?`<div class="sub">${Object.entries(R).map(([k,r])=>`<button class="${S.rub==k?'':'alt'}" data-rb="${esc(k)}">${esc(r.n)} (${r.c.length})</button>`).join('')}</div>`:'<p><small>Todavía no hay clientes con rubro. Asignalos abajo.</small></p>'}</div>
  ${S.rub?`<div class="box"><div class="bh"><h3>Lo que más piden: ${esc(R[S.rub].n)}</h3><span><button class="alt" id="rb_c">Copiar link del catálogo</button> <button class="alt wa" id="rb_w">Mandarlo por WhatsApp</button></span></div>
    ${top.length?`<table>${top.map(([id,s],i)=>`<tr><td>${i+1}</td><td>${esc(nomProd(id))}</td><td class="n"><small>${s.size} de ${R[S.rub].c.length} ${esc(R[S.rub].n.toLowerCase())}s</small></td></tr>`).join('')}</table>`:'<p><small>Todavía no hay pedidos de este rubro.</small></p>'}
    ${(pros||[]).length?`<h3>Prospectos de este rubro</h3>${pros.map(x=>`<div class="bh cpf"><span>${esc(x.nombre)} <small>${esc(x.telefono||'')}</small></span>${x.telefono?`<button class="wa" data-rp="${x.id}">Mandar catálogo</button>`:''}</div>`).join('')}`:''}</div>`:''}
  <div class="box"><h3>Clientes sin rubro (${sin.length})</h3>${rubroDL()}${sin.length?`<p><small>Escribí o elegí el rubro y se guarda solo.</small></p><table>${sin.slice(0,80).map(c=>`<tr><td>${esc(c.razon_social)}</td><td><input list="dl_rub" data-ru="${c.id}" placeholder="Rubro" style="margin:0"></td></tr>`).join('')}</table>`:'<p><small>¡Todos tienen rubro! 👌</small></p>'}</div>`;
  $$('#vs [data-rb]').forEach(b=>b.onclick=()=>{S.rub=b.dataset.rb;vRubros()});
  $$('#vs [data-ru]').forEach(i=>i.onchange=async()=>{const r=i.value.trim();if(!r)return;const{error}=await sb.from('clientes').update({rubro:r}).eq('id',i.dataset.ru);if(error)return toast(error.message,1);
    S.clientes.find(c=>c.id==i.dataset.ru).rubro=r;i.closest('tr').style.opacity=.4;toast('Guardado.')});
  const msg=()=>`¡Hola! 👋 Somos *Sabores de mi País*, distribuidora de alimentos. Te paso nuestro catálogo armado para *${R[S.rub].n.toLowerCase()}s*, con lo que más se vende en negocios como el tuyo y los precios:\n${linkRubro(R[S.rub].n)}`;
  $('#rb_c')&&($('#rb_c').onclick=async()=>{try{await navigator.clipboard.writeText(linkRubro(R[S.rub].n));toast('Link copiado.')}catch(e){prompt('Copiá el link:',linkRubro(R[S.rub].n))}});
  $('#rb_w')&&($('#rb_w').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(msg()),'_blank'));
  $$('#vs [data-rp]').forEach(b=>b.onclick=()=>{const x=pros.find(y=>y.id==b.dataset.rp);window.open('https://wa.me/'+telWA(x.telefono)+'?text='+encodeURIComponent(msg()),'_blank');
    if(x.estado=='nuevo')sb.from('prospectos').update({estado:'contactado',ultimo_contacto:diaLocal(new Date())}).eq('id',x.id).then(()=>{})});
}
/* ---------- 10. Desafío del mes (dentro de Puntos) ---------- */
async function desafioBox(){const box=$('#pt_ds');if(!box)return;const due=S.perfil.rol=='dueno',mes=mesHoy();
  const{data}=await sb.from('config_app').select('valor').eq('clave','desafio').maybeSingle();let d=null;try{d=JSON.parse(data?.valor||'null')}catch(e){}
  const act=d&&d.mes==mes&&+d.meta>0;let filas='';
  if(act){const[a,b]=mesRango(mes);const{data:pe}=await todo(()=>sb.from('pedidos').select('cliente_id,total,estado').neq('estado','cancelado').gte('creado_en',tsAR(a)).lt('creado_en',tsAR(b)).order('numero'));
    const t={};for(const o of pe||[])t[o.cliente_id]=(t[o.cliente_id]||0)+Number(o.total||0);
    const L=Object.entries(t).sort((x,y)=>y[1]-x[1]);filas=L.length?`<table>${L.slice(0,30).map(([id,v])=>`<tr><td>${esc(S.clientes.find(c=>c.id==id)?.razon_social||'Cliente')}</td><td style="width:40%"><div class="barra"><i style="width:${Math.min(100,v/d.meta*100)}%"></i></div></td><td class="n">${v>=d.meta?'<b class="sube">✓ Logrado</b>':$m(d.meta-v)+' le faltan'}</td></tr>`).join('')}</table>`:''}
  box.innerHTML=`<h3>🎯 Desafío del mes</h3><p><small>Un objetivo de compra para este mes. El cliente ve su avance en "Mi cuenta" y en el carrito ("te faltan $ 80.000 para ganar 1.000 puntos"). Cuando le entregás los pedidos y llega a la meta, recibe los puntos solo.</small></p>
    <div class="g"><label class="f">Meta de compra en ${esc(cap1(new Date().toLocaleDateString('es-AR',{month:'long'})))} $<input id="ds_m" type="number" min="0" step="10000" value="${act?d.meta:''}" ${due?'':'disabled'}></label>
    <label class="f">Premio (puntos)<input id="ds_p" type="number" min="0" step="100" value="${act?d.puntos:1000}" ${due?'':'disabled'}></label></div>
    ${due?`<button id="ds_g">${act?'Guardar':'Lanzar desafío'}</button>${act?' <button class="alt" id="ds_x">Terminar</button> <button class="alt wa" id="ds_w">Avisar a los clientes</button>':''}`:''}${filas}`;
  const g=v=>sb.from('config_app').upsert({clave:'desafio',valor:v}).then(({error})=>{if(error)return toast(error.message,1);toast('Guardado.');desafioBox()});
  $('#ds_g')&&($('#ds_g').onclick=()=>{const m=+$('#ds_m').value,p=+$('#ds_p').value;if(!(m>0&&p>0))return toast('Poné la meta y los puntos.',1);g(JSON.stringify({mes,meta:m,puntos:p}))});
  $('#ds_x')&&($('#ds_x').onclick=()=>g(''));
  $('#ds_w')&&($('#ds_w').onclick=()=>{const vp=+($('#pt_v')?.value)||10,msg=`¡Hola {nombre}! 🎯 *Desafío de ${new Date().toLocaleDateString('es-AR',{month:'long'})}* en *Sabores de mi País*: si este mes tus compras llegan a *${$m(d.meta)}*, te regalamos *${nf(d.puntos)} puntos* (${$m(d.puntos*vp)} para tu próximo pedido) 🎁\nMirá cuánto te falta en "Mi cuenta" y pedí acá:\n{link}`;
    S.vs='campanias';vVentas();setTimeout(()=>{$('#cp_m').value=msg;$('#cp_m').oninput()},400)});
}
function vFechas(){const F=proxFechas(200);
  $('#vs').innerHTML=`<div class="box"><h3>📅 Fechas comerciales</h3><p><small>Las fechas que más mueven la venta en Argentina. Lo ideal es avisar a tus clientes <b>2 o 3 semanas antes</b>, así se stockean con vos y no con otro. Te lo recuerdo en Inicio.</small></p></div>
  ${F.map((f,i)=>{const P=prodsFecha(f);return`<div class="box ${f.dd<=21?'toca-i':''}"><div class="bh"><h3 style="margin:0">${esc(f.n)}</h3><span class="badge ${f.dd<=21?'b-mora30':'b-pendiente'}">${f.dd==0?'¡Hoy!':'en '+f.dd+' días'} · ${f.d.toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'numeric'})}</span></div>
    <p><small>${P.length?'Tus productos para esta fecha: '+P.slice(0,10).map(p=>esc(p.descripcion)).join(' · ')+(P.length>10?' y '+(P.length-10)+' más':''):'No encontré productos tuyos para esta fecha.'}</small></p>
    <div class="fc-acc"><button class="wa" data-fx="${i}">Armar campaña</button>${P.length?`<button class="alt" data-fr="${i}">Oferta relámpago con estos</button>`:''}<button class="alt" data-ff="1">Folleto</button></div></div>`}).join('')}`;
  $$('#vs [data-fx]').forEach(b=>b.onclick=()=>{const f=F[+b.dataset.fx],P=prodsFecha(f);const msg=`¡Hola {nombre}! 👋 ${f.t.replace('Se viene','Se viene')} Es el ${f.d.toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'numeric'})}.\n`+(P.length?P.slice(0,6).map(p=>'• '+p.descripcion).join('\n')+'\n':'')+'\nHacé tu pedido con tiempo acá:\n{link}';
    S.vs='campanias';vVentas();setTimeout(()=>{$('#cp_m').value=msg;$('#cp_m').oninput()},400)});
  $$('#vs [data-fr]').forEach(b=>b.onclick=()=>{S.vs='relampago';vVentas();toast('Elegí los productos de la fecha y lanzá la oferta.')});
  $$('#vs [data-ff]').forEach(b=>b.onclick=()=>{S.vs='difusion';vVentas()});
}
async function bonifBox(){const box=$('#xc_bn');if(!box)return;const due=S.perfil.rol=='dueno';await cargarPromos();
  const B=S.promos.filter(esBonif);
  box.innerHTML=`<h3>🎁 Bonificación en mercadería</h3><p><small>Lo clásico de la distribución: <b>"12+1"</b> (llevá 13, pagá 12) o <b>"llevá 10, pagá 9"</b>. Se aplica sola por cada múltiplo: si lleva 26 con 12+1, le regalás 2. En el catálogo dice "llevá 13, pagá 12".</small></p>
    ${B.length?`<table>${B.map(r=>`<tr><td>${esc(nomProd(r.alcance_valor))}</td><td><span class="promo">${esc(r.nombre.replace('Bonificación ',''))}</span> <small>${bonifTxt(r)}</small></td><td>${due?`<a class="lnk" data-bnx="${r.id}">Quitar</a>`:''}</td></tr>`).join('')}</table>`:'<p><small>No hay bonificaciones cargadas.</small></p>'}
    ${due?`<div class="conscan"><input id="bn_q" placeholder="Producto (nombre o código)" autocomplete="off"></div><div id="bn_r"></div><div id="bn_f"></div>`:''}`;
  $$('#xc_bn [data-bnx]').forEach(a=>a.onclick=async()=>{await sb.from('promociones').delete().eq('id',a.dataset.bnx);await cargarPromos();bonifBox()});
  if(!due)return;
  buscador('#bn_q','#bn_r',p=>{$('#bn_q').value=p.descripcion;$('#bn_r').innerHTML='';const b=bul(p.producto_id)?.n||12;
    $('#bn_f').innerHTML=`<div class="g"><label class="f">Llevando (unidades)<input id="bn_n" type="number" min="2" value="${b+1}"></label><label class="f">Paga<input id="bn_p" type="number" min="1" value="${b}"></label></div><p id="bn_v"><small></small></p><button id="bn_g">Guardar bonificación</button>`;
    const v=()=>{const n=+$('#bn_n').value,pg=+$('#bn_p').value;$('#bn_v small').textContent=n>pg&&pg>0?`= ${n-pg} gratis cada ${n} (equivale a −${nf(Math.round((n-pg)/n*1000)/10)} %)`:'La cantidad que paga tiene que ser menor.'};$('#bn_n').oninput=v;$('#bn_p').oninput=v;v();
    $('#bn_g').onclick=async()=>{const n=Math.round(+$('#bn_n').value),pg=Math.round(+$('#bn_p').value);if(!(n>pg&&pg>0))return toast('Revisá las cantidades.',1);
      const{error}=await sb.from('promociones').insert({nombre:'Bonificación '+(n-pg==1?pg+'+1':n+'x'+pg),descuento_pct:Math.round((n-pg)/n*1e6)/1e4,alcance:'producto',alcance_valor:p.producto_id,minimo_tipo:'unidades',minimo_unidades:n,listas:null,desde:diaLocal(new Date()),hasta:null,activa:true});
      if(error)return toast(error.message,1);await cargarPromos();toast('Bonificación guardada.');bonifBox()}})}
/* ---------- 5. Pronto pago (config en Descuentos y mínimo) ---------- */
async function prontoBox(){const box=$('#rg_pp');if(!box)return;const due=S.perfil.rol=='dueno';
  const{data}=await sb.from('config_app').select('valor').eq('clave','pronto_pago').maybeSingle();let d=null;try{d=JSON.parse(data?.valor||'null')}catch(e){}
  box.innerHTML=`<h3>💸 Descuento por pronto pago</h3><p><small>Para cobrar más rápido: si el cliente paga la factura dentro de los días que elijas, le descontás un %. En <b>Cobranza</b> te aparece el botón para aplicarlo (hace la nota de crédito sola) y el cliente lo ve en "Mi cuenta".</small></p>
    <div class="g"><label class="f">Pagando dentro de (días desde la factura)<input id="pp_d" type="number" min="1" max="60" value="${d?.dias||7}" ${due?'':'disabled'}></label><label class="f">Descuento %<input id="pp_p" type="number" min="0" max="20" step="0.5" value="${d?.pct||''}" placeholder="Ej.: 3" ${due?'':'disabled'}></label></div>
    ${due?`<button id="pp_g">Guardar</button>${d?' <button class="alt" id="pp_off">Apagar</button>':''}`:''}`;
  const g=v=>sb.from('config_app').upsert({clave:'pronto_pago',valor:v}).then(({error})=>{if(error)return toast(error.message,1);toast('Guardado.');prontoBox()});
  $('#pp_g')&&($('#pp_g').onclick=()=>{const p=+$('#pp_p').value,dd=Math.round(+$('#pp_d').value);if(!(p>0&&dd>0))return toast('Poné los días y el %.',1);g(JSON.stringify({dias:dd,pct:p}))});
  $('#pp_off')&&($('#pp_off').onclick=()=>g(''))}
/* ---------- 6. Aviso de aumento ---------- */
async function vAumento(){const due=S.perfil.rol=='dueno';
  const{data}=await sb.from('config_app').select('valor').eq('clave','aviso_aumento').maybeSingle();let a=null;try{a=JSON.parse(data?.valor||'null')}catch(e){}
  const hoy=diaLocal(new Date()),act=a&&a.fecha>=hoy;
  $('#vs').innerHTML=`<div class="box"><h3>📈 Aviso de aumento</h3><p><small>Cuando un proveedor te avisa que sube, avisales a tus clientes: <b>"los precios suben el lunes, comprá antes"</b>. En el catálogo aparece un cartel con la cuenta regresiva. Es de las cosas que más pedidos generan en un día.</small></p>
    ${act?`<div class="aviso">Activo: <b>${esc(a.texto||'Aumentan los precios')}</b> el ${fd(a.fecha)}.</div>`:''}
    <div class="g"><label class="f">Los precios suben el<input id="au_f" type="date" min="${hoy}" value="${act?a.fecha:''}" ${due?'':'disabled'}></label>
    <label class="f">Qué sube (lo ve el cliente)<input id="au_t" maxlength="80" value="${esc(act?a.texto||'':'')}" placeholder="Ej.: Aumenta Maní JL y Croppers" ${due?'':'disabled'}></label></div>
    ${due?`<div class="fc-acc"><button id="au_g">${act?'Guardar':'Activar aviso'}</button>${act?'<button class="wa" id="au_w">Avisar por WhatsApp</button><button class="alt" id="au_x">Quitar aviso</button>':''}</div>`:''}
    <p><small>Ideal: activalo 3 o 4 días antes y mandá la campaña. Después del día del aumento el cartel se va solo.</small></p></div>`;
  const g=v=>sb.from('config_app').upsert({clave:'aviso_aumento',valor:v}).then(({error})=>{if(error)return toast(error.message,1);toast('Guardado.');vAumento()});
  $('#au_g')&&($('#au_g').onclick=()=>{const f=$('#au_f').value;if(!f||f<hoy)return toast('Elegí la fecha del aumento.',1);g(JSON.stringify({fecha:f,texto:$('#au_t').value.trim()}))});
  $('#au_x')&&($('#au_x').onclick=()=>g(''));
  $('#au_w')&&($('#au_w').onclick=()=>{const dia=new Date(a.fecha+'T12:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'numeric'});
    const msg=`¡Hola {nombre}! ⚠️ Te aviso de *Sabores de mi País*: *${a.texto||'los precios aumentan'}* a partir del *${dia}*.\n\n👉 Aprovechá a comprar *antes* con los precios de hoy. Hacé tu pedido acá:\n{link}`;
    S.vs='campanias';vVentas();setTimeout(()=>{$('#cp_m').value=msg;$('#cp_m').oninput()},400)})}
async function vNoCompra(){S.ncD=S.ncD||60;
  const{data,error}=await todo(()=>sb.from('contactos_clientes').select('cliente_id,fecha,detalle').eq('tipo','visita').gte('fecha',new Date(Date.now()-S.ncD*864e5).toISOString()).order('fecha',{ascending:false}));
  if(error){$('#vs').innerHTML='<p class="err">'+esc(error.message)+'</p>';return}
  const no=data.filter(x=>/^No compró/.test(x.detalle||'')),si=data.filter(x=>x.detalle=='Compró'),M={};
  for(const x of no){const k=(x.detalle.replace(/^No compró:\s*/,'').split(' · ')[0])||'Otro';(M[k]=M[k]||[]).push(x)}
  const L=Object.entries(M).sort((a,b)=>b[1].length-a[1].length),max=Math.max(1,...L.map(x=>x[1].length));
  $('#vs').innerHTML=`<div class="box"><div class="bh"><h3>🚶 Por qué no te compran</h3><select id="nc_d" style="width:auto">${[[30,'Últimos 30 días'],[60,'Últimos 60 días'],[180,'Últimos 6 meses']].map(([v,t])=>`<option value="${v}" ${S.ncD==v?'selected':''}>${t}</option>`).join('')}</select></div>
    <p><small>Sale de las visitas que registrás con el botón <b>📍 Visita</b> (Clientes → Agenda). Si "Precio" o "Le compra a otro" aparece mucho, revisá esos productos en Competencia.</small></p>
    <div class="kp"><div class="box ok"><span class="lab">Visitas con compra</span><span class="num">${si.length}</span></div><div class="box ${no.length?'alerta':''}"><span class="lab">Sin compra</span><span class="num">${no.length}</span></div>
      <div class="box"><span class="lab">Efectividad</span><span class="num">${si.length+no.length?Math.round(si.length/(si.length+no.length)*100):0} %</span></div></div>
    ${L.length?L.map(([k,X])=>`<div class="bh" style="padding:6px 0"><span style="width:38%">${esc(k)}</span><div class="barra" style="flex:1;margin:0 10px"><i style="width:${X.length/max*100}%"></i></div><b>${X.length}</b></div>`).join('')+
      '<h3>Detalle</h3><table>'+no.slice(0,60).map(x=>`<tr><td><small>${fd(diaLocal(x.fecha))}</small></td><td>${esc(S.clientes.find(c=>c.id==x.cliente_id)?.razon_social||'')}</td><td><small>${esc(x.detalle.replace(/^No compró:\s*/,''))}</small></td></tr>`).join('')+'</table>'
      :'<p><small>Todavía no hay visitas sin compra registradas.</small></p>'}</div>`;
  $('#nc_d').onchange=e=>{S.ncD=+e.target.value;vNoCompra()}}
/* ---------- 9. Precios de la competencia ---------- */
async function vCompetencia(){
  const{data,error}=await sb.from('precios_competencia').select('*').order('fecha',{ascending:false}).limit(1000);
  if(error){$('#vs').innerHTML=SQL_CRE;return}
  const U={};for(const r of data){const k=r.producto_id+'|'+r.competidor.toLowerCase();if(!U[k])U[k]=r}
  const G={};for(const r of Object.values(U))(G[r.producto_id]=G[r.producto_id]||[]).push(r);
  const comps=[...new Set(data.map(r=>r.competidor))].sort();
  const filas=Object.entries(G).map(([id,R])=>{const mio=precioLista(id,'mayorista'),min=Math.min(...R.map(r=>+r.precio));return{id,R,mio,min,dif:mio&&min?(mio-min)/min:0}}).sort((a,b)=>b.dif-a.dif);
  const caros=filas.filter(f=>f.dif>.03).length,baratos=filas.filter(f=>f.dif<-.03).length;
  $('#vs').innerHTML=`<div class="kp"><div class="box ${caros?'alerta':'ok'}"><span class="lab">Estás más caro</span><span class="num">${caros}</span><span class="det">productos (más de 3 %)</span></div><div class="box ok"><span class="lab">Estás más barato</span><span class="num">${baratos}</span><span class="det">productos: ¡usalo para vender!</span></div></div>
  <div class="box"><h3>🏁 Precios de la competencia</h3><p><small>Cuando un cliente te dice "a mí me lo dejan a $ X" o ves una lista de otro distribuidor, anotalo acá. Se compara contra tu precio mayorista.</small></p>
    <div class="g"><div class="conscan"><input id="cm_q" placeholder="Producto (nombre o código)" autocomplete="off"></div><label class="f">Competidor<input id="cm_c" list="dl_cm" placeholder="Ej.: Distribuidora Norte"><datalist id="dl_cm">${comps.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></label>
      <label class="f">Su precio por unidad $<input id="cm_p" type="number" min="0" step="0.01"></label><label class="f">Nota (opcional)<input id="cm_n" placeholder="Ej.: lo dijo La Rosa"></label></div><div id="cm_r"></div><p id="cm_s"><small></small></p><button id="cm_g">Guardar precio</button></div>
  <div class="box">${filas.length?`<div class="tw"><table><tr><th>Producto</th><th class="n">Tu precio</th><th>Competencia</th><th class="n">Diferencia</th></tr>${filas.map(f=>`<tr><td>${esc(nomProd(f.id))}</td><td class="n">${$m(f.mio)}</td><td><small>${f.R.map(r=>`${esc(r.competidor)}: <b>${$m(r.precio)}</b> (${fd(r.fecha)})`).join('<br>')}</small></td>
      <td class="n ${f.dif>.03?'baja':f.dif<-.03?'sube':''}">${f.dif>0?'+':''}${nf(Math.round(f.dif*1000)/10)} %<br><small>${f.dif>.03?'más caro':f.dif<-.03?'más barato':'parejo'}</small></td></tr>`).join('')}</table></div>`:'<p><small>Todavía no cargaste precios de la competencia.</small></p>'}</div>`;
  let sel=null;buscador('#cm_q','#cm_r',p=>{sel=p;$('#cm_q').value=p.descripcion;$('#cm_r').innerHTML='';$('#cm_s small').textContent='Tu precio mayorista: '+$m(precioLista(p.producto_id,'mayorista'));$('#cm_c').focus()});
  $('#cm_g').onclick=async()=>{const c=$('#cm_c').value.trim(),pr=+$('#cm_p').value;if(!sel)return toast('Elegí el producto.',1);if(!c)return toast('Poné el competidor.',1);if(!(pr>0))return toast('Poné el precio.',1);
    const{error}=await sb.from('precios_competencia').insert({producto_id:sel.producto_id,competidor:c,precio:pr,nota:$('#cm_n').value.trim()||null});if(error)return toast(error.message,1);toast('Guardado.');vCompetencia()}}
/* ---------- 10. Muestras y degustaciones ---------- */
async function vMuestras(){
  const[mu,pe]=await Promise.all([sb.from('muestras').select('*').order('fecha',{ascending:false}).limit(300),
    todo(()=>sb.from('pedidos').select('cliente_id,creado_en,pedido_items(producto_id)').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-120*864e5).toISOString()).order('numero'))]);
  if(mu.error){$('#vs').innerHTML=SQL_CRE;return}
  const hoy=diaLocal(new Date()),compro=x=>x.cliente_id&&(pe.data||[]).some(o=>o.cliente_id==x.cliente_id&&diaLocal(o.creado_en)>=x.fecha&&(o.pedido_items||[]).some(i=>i.producto_id==x.producto_id));
  const M=mu.data.map(x=>({...x,ok:x.resultado||(compro(x)?'Compró':null)})),pend=M.filter(x=>!x.ok&&(x.seguimiento||x.fecha)<=hoy),conv=M.filter(x=>x.ok=='Compró').length,res=M.filter(x=>x.ok).length;
  const quien=x=>x.cliente_id?S.clientes.find(c=>c.id==x.cliente_id)?.razon_social||'Cliente':x.nombre||'Sin nombre',tel=x=>x.cliente_id?S.clientes.find(c=>c.id==x.cliente_id)?.telefono:x.telefono;
  $('#vs').innerHTML=`<div class="kp"><div class="box ${pend.length?'alerta':'ok'}"><span class="lab">Para preguntar hoy</span><span class="num">${pend.length}</span><span class="det">muestras sin respuesta</span></div><div class="box ok"><span class="lab">Convirtieron</span><span class="num">${res?Math.round(conv/res*100):0} %</span><span class="det">${conv} de ${res} compraron</span></div></div>
  <div class="box"><h3>🧪 Muestras y degustaciones</h3><p><small>Anotá a quién le dejaste una muestra. A los 7 días te aparece para preguntarle qué le pareció. Si después lo compra en un pedido, se marca solo como "Compró".</small></p>
    <div class="g"><div class="conscan"><input id="mu_q" placeholder="Producto de la muestra" autocomplete="off"></div><label class="f">Cliente<select id="mu_c"><option value="">— Es un negocio nuevo —</option>${S.clientes.map(c=>`<option value="${c.id}">${esc(c.razon_social)}</option>`).join('')}</select></label>
      <label class="f" id="mu_nw">Nombre del negocio<input id="mu_n"></label><label class="f" id="mu_tw">WhatsApp<input id="mu_t"></label><label class="f">Cantidad<input id="mu_k" type="number" min="1" value="1"></label></div><div id="mu_r"></div><button id="mu_g">Guardar muestra</button></div>
  ${pend.length?`<div class="box toca-i"><h3>Preguntales qué les pareció</h3>${pend.map(x=>`<div class="bh cpf"><span>${esc(quien(x))} · <b>${esc(nomProd(x.producto_id))}</b> <small>· ${fd(x.fecha)}</small></span><span>${tel(x)?`<button class="alt wa" data-mw="${x.id}">Preguntar</button> `:''}<button class="alt" data-mr="${x.id}" data-v="Compró">Compró</button> <button class="alt" data-mr="${x.id}" data-v="No le interesó">No</button></span></div>`).join('')}</div>`:''}
  <div class="box"><h3>Historial</h3>${M.length?`<table>${M.slice(0,80).map(x=>`<tr><td><small>${fd(x.fecha)}</small></td><td>${esc(quien(x))}</td><td>${esc(nomProd(x.producto_id))}</td><td>${x.ok?`<span class="badge ${x.ok=='Compró'?'b-entregado':'b-cancelado'}">${esc(x.ok)}</span>`:'<span class="badge b-pendiente">Esperando</span>'}</td></tr>`).join('')}</table>`:'<p><small>Todavía no registraste muestras.</small></p>'}</div>`;
  const tg=()=>{const n=!$('#mu_c').value;$('#mu_nw').hidden=!n;$('#mu_tw').hidden=!n};$('#mu_c').onchange=tg;tg();
  let sel=null;buscador('#mu_q','#mu_r',p=>{sel=p;$('#mu_q').value=p.descripcion;$('#mu_r').innerHTML=''});
  $('#mu_g').onclick=async()=>{if(!sel)return toast('Elegí el producto.',1);const c=$('#mu_c').value,n=$('#mu_n').value.trim();if(!c&&!n)return toast('Elegí el cliente o escribí el nombre.',1);
    const{error}=await sb.from('muestras').insert({cliente_id:c||null,nombre:c?null:n,telefono:c?null:($('#mu_t').value.trim()||null),producto_id:sel.producto_id,cantidad:+$('#mu_k').value||1,seguimiento:diaLocal(new Date(Date.now()+7*864e5))});
    if(error)return toast(error.message,1);toast('Muestra guardada. Te aviso en 7 días.');vMuestras()};
  $$('#vs [data-mr]').forEach(b=>b.onclick=async()=>{await sb.from('muestras').update({resultado:b.dataset.v}).eq('id',b.dataset.mr);vMuestras()});
  $$('#vs [data-mw]').forEach(b=>b.onclick=()=>{const x=M.find(y=>y.id==b.dataset.mw),c=S.clientes.find(y=>y.id==x.cliente_id);
    window.open('https://wa.me/'+telWA(tel(x))+'?text='+encodeURIComponent(`¡Hola! Te escribo de *Sabores de mi País* 👋 ¿Qué te pareció *${nomProd(x.producto_id)}* que te dejamos para probar? Si te gustó, te lo sumo en el próximo pedido 😊`+(c?.token_pedidos?'\n'+linkPedidos(c):'')),'_blank');
    sb.from('muestras').update({seguimiento:diaLocal(new Date(Date.now()+5*864e5))}).eq('id',x.id).then(()=>{})})}
/* ---------- 11. Novedades de la semana ---------- */
async function vNovSemana(){await Promise.all([cargarStock(),cargarPromos()]);const hoy=diaLocal(new Date());
  const{data:hi}=await sb.from('historial_costos').select('producto_id,costo_anterior,costo_nuevo,fecha').gte('fecha',new Date(Date.now()-7*864e5).toISOString()).order('fecha');
  const ult={};for(const h of hi||[]){if(!ult[h.producto_id])ult[h.producto_id]={a:+h.costo_anterior};ult[h.producto_id].n=+h.costo_nuevo}
  const baja=Object.entries(ult).filter(([id,x])=>x.n<x.a*.99&&S.productos.some(p=>p.producto_id==id)).map(([id])=>id);
  const vig=S.promos.filter(r=>r.activa&&r.desde<=hoy&&(!r.hasta||r.hasta>=hoy)),of=vig.filter(r=>r.alcance=='producto').map(r=>r.alcance_valor);
  const nv=S.productos.filter(p=>S.min[p.producto_id]?.nv).map(p=>p.producto_id),otras=vig.filter(r=>r.alcance!='producto');
  const lin=(ids,f)=>[...new Set(ids)].slice(0,8).map(id=>'• '+nomProd(id)+(f?f(id):'')).join('\n');
  const pr=id=>{const r=vig.find(x=>x.alcance=='producto'&&x.alcance_valor==id);return r?' *−'+nf(r.descuento_pct)+' %*'+(esBonif(r)?' ('+bonifTxt(r)+')':''):''};
  const txt=`¡Hola {nombre}! 📋 *Novedades de la semana* en *Sabores de mi País*:`+(baja.length?`\n\n⬇️ *Bajaron de precio*\n${lin(baja)}`:'')+(of.length?`\n\n🔥 *Ofertas*\n${lin(of,pr)}`:'')+(otras.length?'\n'+otras.slice(0,4).map(r=>'• '+r.nombre+' −'+nf(r.descuento_pct)+' %').join('\n'):'')+(nv.length?`\n\n✨ *Nuevos*\n${lin(nv)}`:'')+`\n\nMirá todo y pedí acá:\n{link}`;
  $('#vs').innerHTML=`<div class="box"><h3>📋 Novedades de la semana</h3><p><small>Un mensaje armado solo con lo que <b>bajó de precio</b> (por baja de costo en los últimos 7 días), las <b>ofertas</b> vigentes y los <b>productos nuevos</b>. Mandalo todos los lunes: mantiene a los clientes mirando tu catálogo.</small></p>
    <div class="kp"><div class="box"><span class="lab">Bajaron</span><span class="num">${baja.length}</span></div><div class="box"><span class="lab">Ofertas</span><span class="num">${of.length+otras.length}</span></div><div class="box"><span class="lab">Nuevos</span><span class="num">${nv.length}</span></div></div>
    <pre class="wa-prev">${esc(txt.replace('{nombre}','Juan').replace('{link}','(su link)'))}</pre>
    <div class="fc-acc"><button class="wa" id="ns_c">Mandarlo a los clientes</button><button class="alt" id="ns_i">Armar la imagen (folleto)</button></div></div>`;
  $('#ns_c').onclick=()=>{S.vs='campanias';vVentas();setTimeout(()=>{$('#cp_m').value=txt;$('#cp_m').oninput()},400)};
  $('#ns_i').onclick=async()=>{await folletoOfertas();setTimeout(()=>{const t=$('#fo_ti');if(t)t.value='ESTA SEMANA'},50)}}
/* ---------- 12. Informe por marca / proveedor ---------- */
async function vMarcas(){S.mkD=S.mkD||90;
  $('#vs').innerHTML=`<div class="box"><div class="bh"><h3>🏭 Ventas por marca (para el proveedor)</h3><select id="mk_d" style="width:auto">${[[30,'Últimos 30 días'],[90,'Últimos 3 meses'],[180,'Últimos 6 meses'],[365,'Último año']].map(([v,t])=>`<option value="${v}" ${S.mkD==v?'selected':''}>${t}</option>`).join('')}</select></div>
    <p><small>Cuánto vendiste de cada marca, a cuántos negocios y en qué zonas. Mandáselo al proveedor para negociar mejores precios, bonificaciones o exhibidores.</small></p><div id="mk_r">Calculando…</div></div>`;
  $('#mk_d').onchange=e=>{S.mkD=+e.target.value;vMarcas()};
  let O;try{O=await ctPedidos(diaLocal(new Date(Date.now()-S.mkD*864e5)),diaLocal(new Date(Date.now()+864e5)))}catch(e){$('#mk_r').innerHTML='<p class="err">'+esc(e.message)+'</p>';return}
  const mk=id=>(S.productos.find(p=>p.producto_id==id)?.marca||'Sin marca').trim(),G={};
  for(const o of O){const c=S.clientes.find(x=>x.id==o.cliente_id)||{};const z=(c.ciudad||c.zona||'Sin zona').trim();
    for(const i of o.items){const g=G[mk(i.id)]=G[mk(i.id)]||{v:0,g:0,q:0,cl:{},z:{},p:{}};g.v+=i.n;g.g+=i.n-i.c;g.q+=i.q;g.cl[o.cliente_id]=(g.cl[o.cliente_id]||0)+i.n;g.z[z]=(g.z[z]||0)+i.n;g.p[i.id]=(g.p[i.id]||0)+i.q}}
  const L=Object.entries(G).sort((a,b)=>b[1].v-a[1].v),T=L.reduce((a,x)=>a+x[1].v,0);S.mkSel=S.mkSel&&G[S.mkSel]?S.mkSel:L[0]?.[0];
  if(!L.length){$('#mk_r').innerHTML='<p><small>No hay ventas en ese período.</small></p>';return}
  const g=G[S.mkSel],top=(o,n)=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n);
  $('#mk_r').innerHTML=`<div class="tw"><table><tr><th>Marca</th><th class="n">Venta</th><th class="n">% del total</th><th class="n">Unidades</th><th class="n">Clientes</th><th class="n">Ganancia</th></tr>${L.map(([m,x])=>`<tr class="clic ${m==S.mkSel?'sel':''}" data-mk="${esc(m)}"><td><a class="lnk">${esc(m)}</a></td><td class="n">${$m(x.v)}</td><td class="n">${nf(Math.round(x.v/T*1000)/10)} %</td><td class="n">${nf(Math.round(x.q))}</td><td class="n">${Object.keys(x.cl).length}</td><td class="n">${$m(x.g)}</td></tr>`).join('')}</table></div>
    <div class="box" style="margin-top:12px"><div class="bh"><h3>${esc(S.mkSel)}</h3><span><button class="alt" id="mk_pdf">PDF para el proveedor</button> <button class="alt" id="mk_x">Copiar</button></span></div>
      <div class="dos"><div><b>Productos</b><table>${top(g.p,15).map(([id,q])=>`<tr><td>${esc(nomProd(id))}</td><td class="n">${nf(Math.round(q))} u.</td></tr>`).join('')}</table></div>
      <div><b>Zonas</b><table>${top(g.z,10).map(([z,v])=>`<tr><td>${esc(z)}</td><td class="n">${$m(v)}</td></tr>`).join('')}</table><b>Mejores clientes</b><table>${top(g.cl,8).map(([id,v])=>`<tr><td>${esc(S.clientes.find(c=>c.id==id)?.razon_social||'')}</td><td class="n">${$m(v)}</td></tr>`).join('')}</table></div></div></div>`;
  $$('#mk_r [data-mk]').forEach(r=>r.onclick=()=>{S.mkSel=r.dataset.mk;vMarcas()});
  const per=[[30,'los últimos 30 días'],[90,'los últimos 3 meses'],[180,'los últimos 6 meses'],[365,'el último año']].find(x=>x[0]==S.mkD)[1];
  $('#mk_x').onclick=()=>copiarTabla(['Producto','Unidades'],top(g.p,50).map(([id,q])=>[nomProd(id),Math.round(q)]));
  $('#mk_pdf').onclick=()=>{const w=window.open('','_blank');if(!w)return toast('Permití las ventanas emergentes.',1);
    w.document.write(`<html><head><meta charset="utf-8"><title>Ventas ${esc(S.mkSel)}</title><style>body{font:14px system-ui,sans-serif;margin:32px;color:#1c2333;max-width:760px}h1{color:${MARCA.c};margin:0}table{width:100%;border-collapse:collapse;margin:10px 0 18px}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}.n{text-align:right}.k{display:flex;gap:24px;margin:16px 0}.k div{background:#f4f2f3;padding:10px 14px;border-radius:8px}.k b{display:block;font-size:20px}</style><style>${docCss()}</style></head><body>
      ${logoImg(90)}<h1>Sabores de mi País</h1><p>Informe de ventas de <b>${esc(S.mkSel)}</b> · ${per} · ${new Date().toLocaleDateString('es-AR')}</p>
      <div class="k"><div>Unidades<b>${nf(Math.round(g.q))}</b></div><div>Negocios que lo compran<b>${Object.keys(g.cl).length}</b></div><div>Zonas<b>${Object.keys(g.z).length}</b></div></div>
      <h3>Productos</h3><table><tr><th>Producto</th><th class="n">Unidades</th></tr>${top(g.p,40).map(([id,q])=>`<tr><td>${esc(nomProd(id))}</td><td class="n">${nf(Math.round(q))}</td></tr>`).join('')}</table>
      <h3>Zonas</h3><table>${top(g.z,15).map(([z,v])=>`<tr><td>${esc(z)}</td><td class="n">${nf(Math.round(v/g.v*100))} %</td></tr>`).join('')}</table>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close()}}
/* ---------- 3. Precio sugerido al público ---------- */
async function vPVP(){const due=S.perfil.rol=='dueno';await cargarStock();
  const{data}=await sb.from('config_app').select('valor').eq('clave','precio_sugerido').maybeSingle();let d={activo:false,margen:40,redondeo:50};try{d={...d,...JSON.parse(data?.valor||'{}')}}catch(e){}
  const red=(v,r)=>r>0?Math.ceil(v/r)*r:Math.round(v),pvp=p=>+(S.min[p.producto_id]?.pvp||0)||red(+p.precio_mayorista*(1+d.margen/100),d.redondeo);
  const fijos=S.productos.filter(p=>+(S.min[p.producto_id]?.pvp||0)>0);
  $('#vs').innerHTML=`<div class="box"><h3>💰 Precio sugerido al público</h3><p><small>En el catálogo, cada producto le muestra al comerciante <b>"Vendelo a $ X · ganás $ Y"</b>. Saber cuánto gana es el mejor argumento para que pruebe un producto nuevo o lleve más. No se muestra a los clientes de lista minorista.</small></p>
    <div class="g"><label class="f">Mostrar en el catálogo<select id="pv_a" ${due?'':'disabled'}><option value="1" ${d.activo?'selected':''}>Sí</option><option value="0" ${d.activo?'':'selected'}>No</option></select></label>
      <label class="f">Ganancia sugerida del comerciante (% sobre tu precio mayorista)<input id="pv_m" type="number" min="5" max="300" value="${d.margen}" ${due?'':'disabled'}></label>
      <label class="f">Redondear a<select id="pv_r" ${due?'':'disabled'}>${[[0,'Sin redondeo'],[10,'$ 10'],[50,'$ 50'],[100,'$ 100']].map(([v,t])=>`<option value="${v}" ${d.redondeo==v?'selected':''}>${t}</option>`).join('')}</select></label></div>
    ${due?'<button id="pv_g">Guardar</button>':''}</div>
  <div class="box"><h3>Precio fijo para algunos productos</h3><p><small>Si un producto tiene un precio de venta conocido (el que figura en el envase o el que pone la marca), cargalo acá y se usa ese en lugar del %.</small></p>
    ${due?`<div class="conscan"><input id="pv_q" placeholder="Producto (nombre o código)" autocomplete="off"></div><div id="pv_rr"></div>`:''}
    <table><tr><th>Producto</th><th class="n">Tu precio</th><th class="n">Precio al público</th><th class="n">Gana el comerciante</th><th></th></tr>${(fijos.length?fijos:S.productos.slice(0,8)).map(p=>{const v=pvp(p),m=+p.precio_mayorista;return`<tr><td>${esc(p.descripcion)}</td><td class="n">${$m(m)}</td><td class="n"><b>${$m(v)}</b>${S.min[p.producto_id]?.pvp?' <small>(fijo)</small>':''}</td><td class="n">${$m(v-m)} <small>(${nf(Math.round((v-m)/m*100))} %)</small></td><td>${due&&S.min[p.producto_id]?.pvp?`<a class="lnk" data-pvx="${p.producto_id}">Quitar</a>`:''}</td></tr>`}).join('')}</table>
    ${fijos.length?'':'<p><small>Ejemplo con el % general (todavía no hay precios fijos).</small></p>'}</div>`;
  $('#pv_g')&&($('#pv_g').onclick=async()=>{const{error}=await sb.from('config_app').upsert({clave:'precio_sugerido',valor:JSON.stringify({activo:$('#pv_a').value=='1',margen:+$('#pv_m').value||40,redondeo:+$('#pv_r').value})});if(error)return toast(error.message,1);toast('Guardado.');vPVP()});
  const setP=async(id,v)=>{const{error}=await sb.from('productos').update({pvp:v}).eq('id',id);if(error)return toast(/pvp/.test(error.message)?'Falta correr ventas-fieles.sql en Supabase.':error.message,1);await cargarStock();vPVP()};
  if(due)buscador('#pv_q','#pv_rr',p=>{const v=prompt('Precio de venta al público de '+p.descripcion+' (por unidad):',pvp(p));if(v===null)return;const n=numAR(v);if(!(n>0))return toast('Poné un precio válido.',1);setP(p.producto_id,n)});
  $$('#vs [data-pvx]').forEach(a=>a.onclick=()=>setP(a.dataset.pvx,null))}
async function invEntrega(){try{const{data}=await sb.from('config_app').select('valor').eq('clave','entregas').maybeSingle();const d=JSON.parse(data?.valor||'null');if(!d)return '';
  const N=['','lunes','martes','miércoles','jueves','viernes','sábado','domingo'],ds=(d.dias||[]).map(Number).sort((a,b)=>a-b);
  const dias=ds.length==6&&ds[0]==1&&ds[5]==6?'de lunes a sábado':ds.length==5&&ds[0]==1&&ds[4]==5?'de lunes a viernes':ds.map(x=>N[x]).join(', ').replace(/, ([^,]*)$/,' y $1');
  return `🚚 Pedí antes de las ${d.corte||'18:00'} y te lo llevamos el próximo día de reparto (${dias})\n`}catch(e){return ''}}
async function vInvitar(){S.invF=S.invF||'pend';$('#vs').innerHTML='<p><span class="skl" role="status" aria-label="Cargando"></span></p>';
  const[cf,vi,ent]=await Promise.all([sb.from('config_app').select('clave,valor').in('clave',['invitacion_msg','invitacion_enviados']),sb.from('vistas_catalogo').select('cliente_id,ultima').limit(5000),invEntrega()]);
  const g=k=>(cf.data||[]).find(x=>x.clave==k)?.valor;let msg=g('invitacion_msg')||INV_DEF,env={};try{env=JSON.parse(g('invitacion_enviados')||'{}')||{}}catch(e){}
  const vio={};for(const v of vi.data||[])if(!vio[v.cliente_id]||v.ultima>vio[v.cliente_id])vio[v.cliente_id]=v.ultima;
  const C=S.clientes.filter(c=>c.activo!==false).slice().sort((a,b)=>String(a.razon_social).localeCompare(String(b.razon_social),'es'));
  const est=c=>!telWA(c.telefono)?'sintel':vio[c.id]?'entro':env[c.id]?'env':'pend';
  const txt=c=>msg.replace(/\{nombre\}/g,nomCorto(c)).replace(/\{link\}/g,linkPedidos(c)).replace(/\{entrega\}/g,ent);
  const cnt={pend:0,env:0,entro:0,sintel:0};for(const c of C)cnt[est(c)]++;
  const L=C.filter(c=>S.invF=='todos'||est(c)==S.invF),sig=C.find(c=>est(c)=='pend'),tot=C.length-cnt.sintel,pct=tot?Math.round((cnt.env+cnt.entro)/tot*100):0;
  const ET={pend:'⏳ Falta enviar',env:'📨 Enviado',entro:'👀 Ya entró',sintel:'📵 Sin teléfono'};
  $('#vs').innerHTML=`<div class="box"><div class="bh"><h3>🚀 Invitar a tus clientes a pedir online</h3></div>
    <p><small>Le mandás a cada cliente <b>su link</b> (con sus precios) por WhatsApp. Se abre WhatsApp con el mensaje listo: solo tocás <b>enviar</b> y volvés acá para el siguiente. Cuando el cliente abre el link, pasa solo a <b>👀 Ya entró</b>.</small></p>
    <div style="height:10px;background:#eceef3;border-radius:99px;overflow:hidden;margin:8px 0 4px"><div style="height:100%;width:${pct}%;background:var(--ok)"></div></div><p style="margin:0 0 10px"><b>${cnt.env+cnt.entro}</b> de ${tot} invitados · <b>${cnt.entro}</b> ya entraron (${pct} %)</p>
    ${sig?`<button id="iv_sig" style="width:100%;padding:14px;font-size:17px">📲 Enviar al siguiente: ${esc(sig.razon_social)}</button>`:tot?'<p class="ok">✅ ¡Ya invitaste a todos los clientes con teléfono!</p>':''}
    <details style="margin-top:12px"><summary><b>✏️ Ver / cambiar el mensaje</b></summary>
      <p><small>Podés usar <b>{nombre}</b>, <b>{link}</b> y <b>{entrega}</b> (día y hora de corte, si los tenés cargados).</small></p>
      <textarea id="iv_m" rows="12" style="width:100%">${esc(msg)}</textarea><div class="fc-acc"><button id="iv_g">Guardar mensaje</button><button class="alt" id="iv_r">Volver al mensaje original</button></div>
      ${sig?`<p><small>Así le llega a ${esc(sig.razon_social)}:</small></p><div style="white-space:pre-wrap;background:#e7ffdb;border-radius:10px;padding:10px;font-size:14px">${esc(txt(sig))}</div>`:''}</details></div>
  <div class="sub">${[['pend','Falta enviar'],['env','Enviados'],['entro','Ya entraron'],['sintel','Sin teléfono'],['todos','Todos']].map(([k,t])=>`<button class="${S.invF==k?'':'alt'}" data-ivf="${k}">${t} (${k=='todos'?C.length:cnt[k]})</button>`).join('')}</div>
  <div class="box">${L.length?L.map(c=>{const e=est(c);return `<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--l);flex-wrap:wrap"><div style="min-width:0;flex:1 1 180px"><a class="lnk" data-fc="${c.id}"><b>${esc(c.razon_social)}</b></a><br><small>${esc(c.telefono||'Sin teléfono')} · ${ET[e]}${e=='env'?' el '+fd(env[c.id]):e=='entro'?' el '+fd(vio[c.id]):''}</small></div>
      <div style="white-space:nowrap">${e=='sintel'?`<button class="alt" data-ivt="${c.id}">📞 Cargar teléfono</button>`:`<button class="${e=='pend'?'':'alt wa'}" data-ivs="${c.id}">${e=='pend'?'📲 Enviar':'↻ Reenviar'}</button>${e=='env'?` <a class="lnk" data-ivx="${c.id}">desmarcar</a>`:''}`}</div></div>`}).join(''):'<p class="mas">No hay clientes en esta lista.</p>'}</div>`;
  const guardarEnv=()=>sb.from('config_app').upsert({clave:'invitacion_enviados',valor:JSON.stringify(env)});
  const enviar=async id=>{const c=C.find(x=>x.id==id);if(!c)return;try{await asegurarToken(c)}catch(e){return toast('No se pudo crear el link: '+(e.message||e),1)}
    window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(txt(c)),'_blank');env[c.id]=new Date().toISOString();await guardarEnv();toast('Mandalo en WhatsApp y volvé para el siguiente 👍');vInvitar()};
  $('#iv_sig')&&($('#iv_sig').onclick=()=>enviar(sig.id));
  $$('[data-ivs]').forEach(b=>b.onclick=()=>enviar(b.dataset.ivs));
  $$('[data-ivx]').forEach(a=>a.onclick=async()=>{delete env[a.dataset.ivx];await guardarEnv();vInvitar()});
  $$('[data-ivt]').forEach(b=>b.onclick=async()=>{const c=C.find(x=>x.id==b.dataset.ivt),t=prompt('WhatsApp de '+c.razon_social+' (ej.: 11 5555 1234)',c.telefono||'');if(!t||!t.trim())return;
    const{error}=await sb.from('clientes').update({telefono:t.trim()}).eq('id',c.id);if(error)return toast(error.message,1);c.telefono=t.trim();toast('Teléfono guardado.');vInvitar()});
  $$('[data-ivf]').forEach(b=>b.onclick=()=>{S.invF=b.dataset.ivf;vInvitar()});
  $$('#vs [data-fc]').forEach(a=>a.onclick=()=>{const c=S.clientes.find(x=>x.id==a.dataset.fc);if(c){S.tab='clientes';shell();fichaCliente(c)}});
  $('#iv_g').onclick=async()=>{const v=$('#iv_m').value.trim();if(!v.includes('{link}'))return toast('El mensaje tiene que tener {link} para que vaya el link del cliente.',1);
    const{error}=await sb.from('config_app').upsert({clave:'invitacion_msg',valor:v});if(error)return toast(error.message,1);toast('Mensaje guardado.');vInvitar()};
  $('#iv_r').onclick=async()=>{await sb.from('config_app').upsert({clave:'invitacion_msg',valor:INV_DEF});toast('Volvió el mensaje original.');vInvitar()}}
async function vMiraron(){S.miD=S.miD||3;
  const desde=new Date(Date.now()-S.miD*864e5).toISOString();
  const[vi,pe,ca]=await Promise.all([sb.from('vistas_catalogo').select('*').gte('fecha',desde).order('ultima',{ascending:false}).limit(500),
    sb.from('pedidos').select('cliente_id,creado_en').gte('creado_en',desde).neq('estado','cancelado'),todo(()=>sb.from('carritos').select('cliente_id,total,items'))]);
  if(vi.error){$('#vs').innerHTML=SQL_FIE;return}
  const G={};for(const v of vi.data){const g=G[v.cliente_id]=G[v.cliente_id]||{n:0,u:v.ultima,f:new Set()};g.n+=v.veces;if(v.ultima>g.u)g.u=v.ultima;(v.fams||[]).forEach(x=>g.f.add(x))}
  const pidio=id=>(pe.data||[]).some(o=>o.cliente_id==id&&o.creado_en>=new Date(new Date(G[id].u).getTime()-36e5*2).toISOString()),car=id=>(ca.data||[]).find(x=>x.cliente_id==id);
  const L=Object.keys(G).map(id=>({c:S.clientes.find(x=>x.id==id)||{id,razon_social:'Cliente'},...G[id],ok:pidio(id),car:car(id)})).sort((a,b)=>a.ok-b.ok||new Date(b.u)-new Date(a.u));
  const sin=L.filter(x=>!x.ok);
  $('#vs').innerHTML=`<div class="kp"><div class="box"><span class="lab">Miraron su catálogo</span><span class="num">${L.length}</span><span class="det">clientes</span></div><div class="box ${sin.length?'alerta':'ok'}"><span class="lab">Miraron y no pidieron</span><span class="num">${sin.length}</span><span class="det">¡escribiles ahora!</span></div></div>
  <div class="box"><div class="bh"><h3>👀 Quién miró el catálogo</h3><select id="mi_d" style="width:auto">${[[1,'Hoy'],[3,'Últimos 3 días'],[7,'Última semana']].map(([v,t])=>`<option value="${v}" ${S.miD==v?'selected':''}>${t}</option>`).join('')}</select></div>
    <p><small>Si alguien abrió su link y no mandó pedido, está pensando en comprar: es el mejor momento para escribirle. Ves qué familias miró y si dejó algo en el carrito.</small></p>
    ${L.length?`<div class="ag">${L.map(x=>`<div class="vi ${x.ok?'hecho-vi':''}"><span class="badge ${x.ok?'b-entregado':'b-pendiente'}">${x.ok?'Pidió':'No pidió'}</span>
      <div><a class="lnk" data-fc="${x.c.id}"><b>${esc(x.c.razon_social)}</b></a> <small>· ${hace(x.u)} · ${x.n} ${x.n==1?'vez':'veces'}</small>${x.f.size?`<br><small>Miró: ${[...x.f].map(f=>esc(cap1(f))).join(', ')}</small>`:''}${x.car&&+x.car.total>0?`<br><small class="sube">🛒 Tiene ${$m(x.car.total)} en el carrito</small>`:''}</div>
      ${x.ok?'':filaAcc(x.c)}</div>`).join('')}</div>`:'<p><small>Nadie abrió su catálogo en este período (se empieza a registrar desde ahora).</small></p>'}</div>`;
  $('#mi_d').onchange=e=>{S.miD=+e.target.value;vMiraron()};
  $$('#vs [data-fc]').forEach(a=>a.onclick=()=>abrirFicha(a.dataset.fc));
  $$('#vs [data-w]').forEach(b=>b.onclick=()=>{const x=L.find(y=>y.c.id==b.dataset.w),c=x.c;
    window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(c)}! 👋 Te escribo de *Sabores de mi País*. ¿Te ayudo con el pedido? ${x.f.size?'Vi que estabas mirando '+[...x.f].slice(0,2).map(f=>cap1(f)).join(' y ')+': si querés te paso lo que tenemos en oferta. ':''}${x.car&&+x.car.total>0?'Te quedó un pedido armado de '+$m(x.car.total)+', solo falta enviarlo:':'Tu catálogo:'}\n${linkPedidos(c)}`),'_blank');
    sb.from('contactos_clientes').insert({cliente_id:c.id,tipo:'whatsapp',detalle:'Miró el catálogo'}).then(()=>{})})}
async function vPersonal(){S.peD=S.peD||45;
  const{data:pe}=await todo(()=>sb.from('pedidos').select('cliente_id,creado_en,pedido_items(producto_id)').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-365*864e5).toISOString()).order('numero'));
  const P={},ult={};for(const o of pe||[]){const s=P[o.cliente_id]=P[o.cliente_id]||new Set();for(const i of o.pedido_items||[])s.add(i.producto_id);if(!ult[o.cliente_id]||o.creado_en>ult[o.cliente_id])ult[o.cliente_id]=o.creado_en}
  const pop=(rub)=>{const n={};for(const[cid,s]of Object.entries(P)){const c=S.clientes.find(x=>x.id==cid);if(rub&&(c?.rubro||'').toLowerCase()!=rub)continue;for(const id of s)n[id]=(n[id]||0)+1}return Object.entries(n).sort((a,b)=>b[1]-a[1]).map(x=>x[0])};
  const popG=pop(),cacheR={};const reco=c=>{const r=(c.rubro||'').toLowerCase().trim(),L=r?(cacheR[r]=cacheR[r]||pop(r)):popG,mine=P[c.id]||new Set();return(L.length>3?L:popG).find(id=>!mine.has(id)&&S.productos.some(p=>p.producto_id==id))};
  const A=S.clientes.filter(c=>c.telefono&&c.token_pedidos&&P[c.id]&&(Date.now()-new Date(ult[c.id]))/864e5<S.peD).map(c=>({c,id:reco(c)})).filter(x=>x.id);
  const D=S.clientes.filter(c=>c.telefono&&c.token_pedidos&&ult[c.id]&&(Date.now()-new Date(ult[c.id]))/864e5>=S.peD).map(c=>({c,dias:Math.floor((Date.now()-new Date(ult[c.id]))/864e5)})).sort((a,b)=>a.dias-b.dias);
  const hechos=new Set();
  const draw=()=>{$('#vs').innerHTML=`<div class="box"><h3>🎯 Ofertas personales</h3><p><small>Cupones que sirven <b>solo para ese cliente</b> y una sola vez. El código se crea solo y el WhatsApp sale armado.</small></p>
    <div class="g"><label class="f">Descuento %<input id="pe_p" type="number" min="1" max="50" value="${S.pePct||10}"></label><label class="f">Válido por<select id="pe_v"><option value="7">7 días</option><option value="10" selected>10 días</option><option value="15">15 días</option></select></label>
    <label class="f">Dormido = sin comprar hace<select id="pe_d">${[30,45,60,90].map(v=>`<option value="${v}" ${S.peD==v?'selected':''}>${v} días</option>`).join('')}</select></label></div></div>
  <div class="box"><h3>🧪 Probá algo nuevo (${A.length})</h3><p><small>Para cada cliente activo, un producto que compran los negocios de su rubro (o los más vendidos) y que <b>él nunca llevó</b>.</small></p>
    ${A.length?A.slice(0,60).map(x=>`<div class="bh cpf ${hechos.has('a'+x.c.id)?'ok':''}"><span>${esc(x.c.razon_social)} → <b>${esc(nomProd(x.id))}</b></span><button class="${hechos.has('a'+x.c.id)?'alt hecho':'wa'}" data-pa="${x.c.id}">${hechos.has('a'+x.c.id)?'✓ Enviado':'Crear cupón y mandar'}</button></div>`).join(''):'<p><small>No hay clientes activos con WhatsApp y link de pedidos.</small></p>'}</div>
  <div class="box"><h3>🔙 Cupón de regreso para dormidos (${D.length})</h3><p><small>Clientes que no compran hace ${S.peD} días o más.</small></p>
    ${D.length?D.slice(0,80).map(x=>`<div class="bh cpf ${hechos.has('d'+x.c.id)?'ok':''}"><span>${esc(x.c.razon_social)} <small>· hace ${x.dias} días</small></span><button class="${hechos.has('d'+x.c.id)?'alt hecho':'wa'}" data-pd="${x.c.id}">${hechos.has('d'+x.c.id)?'✓ Enviado':'Crear cupón y mandar'}</button></div>`).join(''):'<p><small>No hay clientes dormidos. 👌</small></p>'}</div>`;
    $('#pe_p').onchange=e=>S.pePct=+e.target.value;$('#pe_d').onchange=e=>{S.peD=+e.target.value;vPersonal()};
    const env=async(c,txt,pre,nota,key)=>{const w=window.open('','_blank');const pct=+$('#pe_p').value||10,dias=+$('#pe_v').value,cod=await crearCuponPersonal(c,pct,dias,nota,pre);if(!cod){w&&w.close();return}
      const u='https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(txt(cod,pct,diaLocal(new Date(Date.now()+dias*864e5))));w?w.location.href=u:window.open(u,'_blank');
      sb.from('contactos_clientes').insert({cliente_id:c.id,tipo:'campaña',detalle:nota}).then(()=>{});hechos.add(key);draw()};
    $$('#vs [data-pa]').forEach(b=>b.onclick=()=>{const x=A.find(y=>y.c.id==b.dataset.pa);env(x.c,(cod,pct,h)=>`¡Hola ${nomCorto(x.c)}! 👋 Te escribo de *Sabores de mi País*. Te quiero hacer probar *${nomProd(x.id)}*: se vende muy bien en negocios como el tuyo.\n\n🎁 Con tu cupón personal *${cod}* tenés *${nf(pct)} % de descuento* en tu próximo pedido (válido hasta el ${fd(h)}).\nEscribilo en el carrito acá:\n${linkPedidos(x.c)}`,null,'Oferta personal: '+nomProd(x.id),'a'+x.c.id)});
    $$('#vs [data-pd]').forEach(b=>b.onclick=()=>{const x=D.find(y=>y.c.id==b.dataset.pd);env(x.c,(cod,pct,h)=>`¡Hola ${nomCorto(x.c)}! Te extrañamos en *Sabores de mi País* 😊\n\n🎁 Para que vuelvas te regalamos *${nf(pct)} % de descuento* con tu cupón personal *${cod}* (válido hasta el ${fd(h)}).\nHacé tu pedido acá y escribilo en el carrito:\n${linkPedidos(x.c)}`,'VOLVE','Cupón de regreso','d'+x.c.id)})};
  draw()}
async function vBienvenida(){const[B,A]=await Promise.all([datosBienvenida(),datosAniversario()]);
  $('#vs').innerHTML=`<div class="box"><h3>👋 Bienvenida a clientes nuevos</h3><p><small>Cada cliente nuevo recibe 3 mensajes: el día que lo das de alta (su link y cómo pedir), a los 7 días ("¿cómo te fue?") y al mes. Te aviso acá y en Inicio cuándo toca cada uno. Empieza a contar desde los clientes que des de alta a partir de ahora.</small></p>
    ${B.length?B.map(x=>`<div class="bh cpf"><span>${esc(x.c.razon_social)} <small>· ${esc(PASOS[x.i][1])} · alta hace ${x.d} días</small></span><button class="wa" data-bw="${x.c.id}" data-bi="${x.i}">Mandar</button></div>`).join(''):'<p><small>No hay mensajes de bienvenida pendientes.</small></p>'}</div>
  <div class="box"><h3>🎂 Aniversarios</h3><p><small>Clientes que cumplen años comprándote (en los próximos 7 días o hace poco). Se toma la fecha de su primer pedido o la que pongas en su ficha ("Cliente desde").</small></p>
    ${A.length?A.map(x=>`<div class="bh cpf"><span>${esc(x.c.razon_social)} <small>· ${x.anios} ${x.anios==1?'año':'años'} · ${x.dif==0?'¡hoy!':x.dif>0?'en '+x.dif+' días':'hace '+(-x.dif)+' días'}</small></span><span><button class="wa" data-aw="${x.c.id}">Saludar</button> <button class="alt" data-ap="${x.c.id}">+ 500 puntos y saludar</button></span></div>`).join(''):'<p><small>No hay aniversarios cerca.</small></p>'}</div>`;
  $$('#vs [data-bw]').forEach(b=>b.onclick=()=>{const x=B.find(y=>y.c.id==b.dataset.bw&&y.i==+b.dataset.bi);window.open('https://wa.me/'+telWA(x.c.telefono)+'?text='+encodeURIComponent(PASOS[x.i][2](x.c)),'_blank');
    sb.from('contactos_clientes').insert({cliente_id:x.c.id,tipo:'bienvenida',detalle:PASOS[x.i][1]}).then(()=>setTimeout(()=>S.vs=='bienvenida'&&vBienvenida(),600))});
  const salud=async(id,pts)=>{const x=A.find(y=>y.c.id==id);if(pts){const{error}=await sb.from('puntos_mov').insert({cliente_id:id,puntos:pts,motivo:'Aniversario '+new Date().getFullYear()});if(error)return toast(error.message,1)}
    window.open('https://wa.me/'+telWA(x.c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(x.c)}! 🎂 ¡Hoy cumplimos ${x.anios} ${x.anios==1?'año':'años'} trabajando juntos! Gracias por confiar en *Sabores de mi País* 🙌`+(pts?`\n\n🎁 Te regalamos *${nf(pts)} puntos* para tu próximo pedido. Los ves en "Mi cuenta".`:'')+(x.c.token_pedidos?'\n'+linkPedidos(x.c):'')),'_blank');
    await sb.from('contactos_clientes').insert({cliente_id:id,tipo:'aniversario',detalle:String(new Date().getFullYear())});setTimeout(()=>S.vs=='bienvenida'&&vBienvenida(),600)};
  $$('#vs [data-aw]').forEach(b=>b.onclick=()=>salud(b.dataset.aw,0));$$('#vs [data-ap]').forEach(b=>b.onclick=()=>salud(b.dataset.ap,500))}
/* ---------- 9. Sorteo del mes ---------- */
async function vSorteo(){const due=S.perfil.rol=='dueno',mes=mesHoy(),[a,b]=mesRango(mes);
  const[cf,hi,pe]=await Promise.all([sb.from('config_app').select('valor').eq('clave','sorteo').maybeSingle(),sb.from('config_app').select('valor').eq('clave','sorteo_ganadores').maybeSingle(),
    todo(()=>sb.from('pedidos').select('cliente_id,total').neq('estado','cancelado').gte('creado_en',tsAR(a)).lt('creado_en',tsAR(b)).order('numero'))]);
  let d=null,H=[];try{d=JSON.parse(cf.data?.valor||'null')}catch(e){}try{H=JSON.parse(hi.data?.valor||'[]')}catch(e){}
  const act=d&&d.mes==mes&&+d.cada>0,t={};for(const o of pe.data||[])t[o.cliente_id]=(t[o.cliente_id]||0)+Number(o.total||0);
  const P=act?Object.entries(t).map(([id,v])=>({id,v,n:Math.floor(v/d.cada)})).filter(x=>x.n>0).sort((x,y)=>y.n-x.n):[],tot=P.reduce((s,x)=>s+x.n,0),ya=H.find(h=>h.mes==mes);
  $('#vs').innerHTML=`<div class="box"><h3>🎟️ Sorteo del mes</h3><p><small>Cada vez que el cliente llega a cierto monto de compra en el mes, gana un número. Lo ve en "Mi cuenta" y en el carrito ("te faltan $ 12.000 para otro número"). A fin de mes tocás <b>Sortear</b> y el CRM elige al ganador (más números, más chances).</small></p>
    <div class="g"><label class="f">1 número cada $<input id="so_c" type="number" min="1000" step="1000" value="${act?d.cada:50000}" ${due?'':'disabled'}></label><label class="f">Premio<input id="so_p" maxlength="80" value="${esc(act?d.premio||'':'')}" placeholder="Ej.: Una caja de Maní JL 500 g" ${due?'':'disabled'}></label></div>
    ${due?`<button id="so_g">${act?'Guardar':'Lanzar sorteo de '+mesNom(mes).toLowerCase()}</button>${act?' <button class="wa" id="so_w">Avisar a los clientes</button>':''}`:''}</div>
  ${act?`<div class="box"><div class="bh"><h3>Participantes: ${P.length} · ${tot} números</h3>${due&&P.length&&!ya?'<button id="so_s">🎲 Sortear ahora</button>':''}</div>
    ${ya?`<div class="aviso okb">🏆 Ganador de ${mesNom(mes).toLowerCase()}: <b>${esc(ya.nombre)}</b> (número ${ya.numero}) <button class="alt wa" id="so_gw">Avisarle</button></div>`:''}
    ${P.length?`<table>${P.map(x=>`<tr><td>${esc(S.clientes.find(c=>c.id==x.id)?.razon_social||'Cliente')}</td><td class="n">${$m(x.v)}</td><td class="n"><b>${x.n}</b> ${x.n==1?'número':'números'}</td></tr>`).join('')}</table>`:'<p><small>Todavía nadie llegó al primer número este mes.</small></p>'}</div>`:''}
  ${H.length?`<div class="box"><h3>Ganadores anteriores</h3><table>${H.slice().reverse().map(h=>`<tr><td>${mesNom(h.mes)}</td><td>${esc(h.nombre)}</td><td><small>${esc(h.premio||'')}</small></td></tr>`).join('')}</table></div>`:''}`;
  $('#so_g')&&($('#so_g').onclick=async()=>{const c=+$('#so_c').value;if(!(c>0))return toast('Poné el monto por número.',1);const{error}=await sb.from('config_app').upsert({clave:'sorteo',valor:JSON.stringify({mes,cada:c,premio:$('#so_p').value.trim()})});if(error)return toast(error.message,1);toast('Guardado.');vSorteo()});
  $('#so_w')&&($('#so_w').onclick=()=>{const msg=`¡Hola {nombre}! 🎟️ *Sorteo de ${mesNom(mes).toLowerCase()}* en *Sabores de mi País*: por cada ${$m(d.cada)} de compra este mes tenés un número para ganar *${d.premio||'un premio'}* 🎁\nMirá tus números en "Mi cuenta" y pedí acá:\n{link}`;S.vs='campanias';vVentas();setTimeout(()=>{$('#cp_m').value=msg;$('#cp_m').oninput()},400)});
  $('#so_s')&&($('#so_s').onclick=async()=>{if(!confirm('¿Hacer el sorteo de '+mesNom(mes).toLowerCase()+' ahora? Participan '+P.length+' clientes con '+tot+' números.'))return;
    const arr=new Uint32Array(1);crypto.getRandomValues(arr);let r=arr[0]%tot,num=r+1;const g=P.find(x=>{if(r<x.n)return true;r-=x.n});
    const nom=S.clientes.find(c=>c.id==g.id)?.razon_social||'Cliente';H.push({mes,cliente_id:g.id,nombre:nom,numero:num,premio:d.premio||'',fecha:new Date().toISOString()});
    const{error}=await sb.from('config_app').upsert({clave:'sorteo_ganadores',valor:JSON.stringify(H)});if(error)return toast(error.message,1);toast('🏆 ¡Ganó '+nom+'!');vSorteo()});
  $('#so_gw')&&($('#so_gw').onclick=()=>{const c=S.clientes.find(x=>x.id==ya.cliente_id)||{};window.open('https://wa.me/'+telWA(c.telefono||'')+'?text='+encodeURIComponent(`¡Hola ${nomCorto(c)}! 🎉🏆 *¡Ganaste el sorteo de ${mesNom(mes).toLowerCase()}* de *Sabores de mi País*! Tu premio: *${ya.premio||'¡sorpresa!'}*. Te lo llevamos con tu próximo pedido. ¡Gracias por elegirnos!`),'_blank')})}
/* ---------- 12. Aviso de cambios de precio personalizado ---------- */
async function vCambiosPrecio(){S.cpD=S.cpD||7;await cargarStock();
  const[hi,pe]=await Promise.all([sb.from('historial_costos').select('producto_id,costo_anterior,costo_nuevo,fecha').gte('fecha',new Date(Date.now()-S.cpD*864e5).toISOString()).order('fecha'),
    todo(()=>sb.from('pedidos').select('cliente_id,pedido_items(producto_id)').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-120*864e5).toISOString()).order('numero'))]);
  const ch={};for(const h of hi.data||[]){if(!ch[h.producto_id])ch[h.producto_id]={a:+h.costo_anterior};ch[h.producto_id].n=+h.costo_nuevo}
  const CH=Object.entries(ch).filter(([id,x])=>x.a>0&&Math.abs(x.n/x.a-1)>=.005&&S.productos.some(p=>p.producto_id==id)).map(([id,x])=>({id,f:x.n/x.a}));
  const P={};for(const o of pe.data||[]){const s=P[o.cliente_id]=P[o.cliente_id]||new Set();for(const i of o.pedido_items||[])s.add(i.producto_id)}
  const L=S.clientes.filter(c=>c.telefono&&P[c.id]).map(c=>({c,X:CH.filter(x=>P[c.id].has(x.id))})).filter(x=>x.X.length).sort((a,b)=>b.X.length-a.X.length);
  const sub=CH.filter(x=>x.f>1).length,baj=CH.length-sub,hechos=new Set();
  const txt=x=>{const c=x.c,lin=x.X.slice(0,15).map(z=>{const nu=precioLista(z.id,c.lista),an=nu/z.f;return `• ${nomProd(z.id)}: ${$m(an)} → *${$m(nu)}* ${z.f>1?'▲':'⬇️'}`});
    return `¡Hola ${nomCorto(c)}! 👋 Te aviso de *Sabores de mi País* los cambios de precio de *los productos que vos llevás*:\n${lin.join('\n')}${x.X.length>15?'\n…y '+(x.X.length-15)+' más':''}`+(x.X.some(z=>z.f<1)?'\n\n⬇️ ¡Aprovechá los que bajaron!':'')+(c.token_pedidos?`\n\nTus precios actualizados:\n${linkPedidos(c)}`:'')};
  const draw=()=>{$('#vs').innerHTML=`<div class="box"><div class="bh"><h3>📢 Aviso de cambios de precio</h3><select id="cpr_d" style="width:auto">${[[7,'Últimos 7 días'],[15,'Últimos 15 días'],[30,'Últimos 30 días']].map(([v,t])=>`<option value="${v}" ${S.cpD==v?'selected':''}>${t}</option>`).join('')}</select></div>
    <p><small>Cuando cambian los costos (y por lo tanto tus precios), a cada cliente le avisás <b>solo de los productos que él compra</b>: más claro y más profesional que mandar la lista entera.</small></p>
    <div class="kp"><div class="box"><span class="lab">Productos que cambiaron</span><span class="num">${CH.length}</span><span class="det">${sub} subieron · ${baj} bajaron</span></div><div class="box"><span class="lab">Clientes a avisar</span><span class="num">${L.length}</span></div></div>
    ${L[0]?`<small>Así le llega a ${esc(L[0].c.razon_social)}:</small><pre class="wa-prev">${esc(txt(L[0]))}</pre>`:''}</div>
    ${L.length?`<div class="box"><h3>Enviar (${hechos.size} de ${L.length})</h3>${L.map(x=>`<div class="bh cpf ${hechos.has(x.c.id)?'ok':''}"><span>${esc(x.c.razon_social)} <small>· ${x.X.length} ${x.X.length==1?'producto':'productos'}</small></span><button class="${hechos.has(x.c.id)?'alt hecho':'wa'}" data-cw="${x.c.id}">${hechos.has(x.c.id)?'✓ Enviado':'Enviar'}</button></div>`).join('')}</div>`:'<div class="box"><p><small>No hubo cambios de precio en los productos que compran tus clientes en este período.</small></p></div>'}`;
    $('#cpr_d').onchange=e=>{S.cpD=+e.target.value;vCambiosPrecio()};
    $$('#vs [data-cw]').forEach(b=>b.onclick=()=>{const x=L.find(y=>y.c.id==b.dataset.cw);window.open('https://wa.me/'+telWA(x.c.telefono)+'?text='+encodeURIComponent(txt(x)),'_blank');
      if(!hechos.has(x.c.id)){hechos.add(x.c.id);sb.from('contactos_clientes').insert({cliente_id:x.c.id,tipo:'campaña',detalle:'Cambios de precio'}).then(()=>{})}draw()})};
  draw()}
function mostrarImgs(box,cvs,nom,texto){Promise.all(cvs.map(cv=>new Promise(ok=>cv.toBlob(ok,'image/jpeg',.9)))).then(blobs=>{
  $(box).innerHTML=`<div class="fo-out">${blobs.map((b,k)=>`<div><img src="${URL.createObjectURL(b)}" alt=""><div class="fc-acc"><a class="lnk" download="${esc(nom(k))}" href="${URL.createObjectURL(b)}">Descargar</a></div></div>`).join('')}</div>
    <div class="fc-acc">${navigator.canShare?'<button class="im_sh">Compartir</button>':''}<button class="alt im_dl">Descargar ${blobs.length>1?'todas':''}</button></div>`;
  const dl=()=>blobs.forEach((b,k)=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=nom(k);document.body.appendChild(a);a.click();a.remove()});
  $(box+' .im_dl').onclick=dl;const sh=$(box+' .im_sh');if(sh)sh.onclick=async()=>{const files=blobs.map((b,k)=>new File([b],nom(k),{type:'image/jpeg'}));try{if(navigator.canShare({files}))await navigator.share({files,text:texto||''});else dl()}catch(e){}}})}
/* ---------- 5. Reclamos ---------- */
async function vReclamos(){S.garantia=await cfgJ('garantia',{activa:false,pct:10,dias:30});
  const{data,error}=await sb.from('reclamos').select('*').order('id',{ascending:false}).limit(150);
  if(error){$('#vs').innerHTML=SQL_SER;return}
  const ab=data.filter(r=>r.estado=='abierto'),cli=id=>S.clientes.find(c=>c.id==id)||{razon_social:'Cliente'};
  const fila=r=>`<div class="box ${r.estado=='abierto'?'alerta-i':''}" style="margin:8px 0"><div class="bh"><span><b>${esc(cli(r.cliente_id).razon_social)}</b> <small>· ${esc(r.tipo)}${r.pedido_numero?' · pedido N° '+r.pedido_numero:''} · ${hace(r.creado_en)}</small></span><span class="badge ${r.estado=='abierto'?'b-mora30':'b-entregado'}">${r.estado=='abierto'?'Abierto':'Resuelto'}</span></div>
    ${r.detalle?`<p>${esc(r.detalle)}</p>`:''}${r.foto?`<img src="${esc(r.foto)}" alt="Foto del reclamo" style="max-width:220px;max-height:220px;border-radius:8px;cursor:zoom-in" data-rz="${r.id}">`:''}
    ${r.estado=='abierto'?`<div class="g"><input data-rr="${r.id}" placeholder="Qué le respondés (ej.: te lo reponemos en la próxima entrega)"></div><label class="chk"><input type="checkbox" data-rg="${r.id}" ${S.garantia.activa?'checked':''}> 🎁 Compensarlo con un cupón de ${nf(S.garantia.pct)} % (garantía)</label><div class="fc-acc"><button data-rs="${r.id}">Resolver y avisarle por WhatsApp</button><a class="lnk" data-rf="${r.cliente_id}">Ver ficha</a></div>`:`<p><small>✓ ${esc(r.respuesta||'Resuelto')} · ${r.resuelto_en?fd(diaLocal(r.resuelto_en)):''}</small></p>`}</div>`;
  $('#vs').innerHTML=`<div class="kp"><div class="box ${ab.length?'alerta':'ok'}"><span class="lab">Reclamos abiertos</span><span class="num">${ab.length}</span><span class="det">resolvelos rápido</span></div><div class="box"><span class="lab">Últimos 30 días</span><span class="num">${data.filter(r=>Date.now()-new Date(r.creado_en)<30*864e5).length}</span></div></div>
    <div class="box"><div class="bh"><h3 style="margin:0">🆘 Reclamos de clientes</h3><button class="alt" onclick="garantiaCfg()">✅ Garantía ${S.garantia.activa?'activa':'(apagada)'}</button></div><p><small>El cliente los manda desde "Mi cuenta" (faltó un producto, llegó roto, equivocado…), con foto. Respondé rápido: un reclamo bien resuelto fideliza más que una oferta.</small></p>
    ${data.length?ab.map(fila).join('')+data.filter(r=>r.estado!='abierto').slice(0,30).map(fila).join(''):'<p><small>No hay reclamos. 👌</small></p>'}</div>`;
  $$('#vs [data-rz]').forEach(i=>i.onclick=()=>{const z=document.createElement('div');z.className='modal';z.innerHTML=`<div class="mc" style="text-align:center"><img src="${i.src}" style="max-width:100%"></div>`;z.onclick=()=>z.remove();document.body.appendChild(z)});
  $$('#vs [data-rf]').forEach(a=>a.onclick=()=>abrirFicha(a.dataset.rf));
  $$('#vs [data-rs]').forEach(b=>b.onclick=async()=>{const r=data.find(x=>x.id==b.dataset.rs),t=$(`[data-rr="${r.id}"]`).value.trim()||'Ya lo solucionamos.',c=cli(r.cliente_id);
    let cup=null;if($(`[data-rg="${r.id}"]`)?.checked&&c.id){cup=await crearCuponPersonal(c,S.garantia.pct,S.garantia.dias,'Garantía: '+r.tipo,'GAR');if(!cup)return}
    const{error}=await sb.from('reclamos').update({estado:'resuelto',respuesta:t+(cup?' · Cupón '+cup:''),resuelto_en:new Date().toISOString()}).eq('id',r.id);if(error)return toast(error.message,1);
    if(c.telefono)window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(c)}! Sobre tu reclamo${r.pedido_numero?' del pedido N° '+r.pedido_numero:''} (${r.tipo.toLowerCase()}): ${t}${cup?`\n\n🎁 Para compensarte tenés un *${nf(S.garantia.pct)} % de descuento* en tu próxima compra con el código *${cup}* (vale ${S.garantia.dias} días). Es nuestra garantía de pedido completo.`:''}\n\nDisculpá las molestias y gracias por avisarnos 🙏`),'_blank');
    toast('Reclamo resuelto.');vReclamos()})}
/* ---------- 6. Lo que piden que traigas (dentro de Qué buscan) ---------- */
async function sugeridosBox(){const box=$('#bu_sg');if(!box)return;
  const{data,error}=await sb.from('pedidos_sugeridos').select('*').order('id',{ascending:false}).limit(500);if(error){box.innerHTML=SQL_SER;return}
  const G={};for(const x of data){const k=norm(x.texto).replace(/[^a-z0-9 ]/g,'').trim();const g=G[k]=G[k]||{t:x.texto,n:0,c:new Set(),ids:[],e:x.estado};g.n++;if(x.cliente_id)g.c.add(x.cliente_id);g.ids.push(x.id)}
  const L=Object.values(G).filter(g=>g.e=='nuevo').sort((a,b)=>b.n-a.n);
  box.innerHTML=`<h3>🗳️ Lo que te piden que traigas</h3><p><small>Lo escriben los clientes en el catálogo ("¿Qué querés que traigamos?"). Si varios piden lo mismo, tenés venta asegurada.</small></p>
    ${L.length?`<table>${L.slice(0,50).map((g,i)=>`<tr><td><b>${esc(g.t)}</b><br><small>${[...g.c].slice(0,3).map(id=>esc(S.clientes.find(c=>c.id==id)?.razon_social||'')).join(', ')||'catálogo público'}</small></td><td class="n"><b>${g.n}</b> ${g.n==1?'pedido':'pedidos'}</td><td style="white-space:nowrap"><a class="lnk" data-sgk="${i}" data-v="lo traemos">Lo traemos</a> · <a class="lnk" data-sgk="${i}" data-v="descartado">Descartar</a></td></tr>`).join('')}</table>`:'<p><small>Todavía nadie pidió productos nuevos.</small></p>'}`;
  $$('#bu_sg [data-sgk]').forEach(a=>a.onclick=async()=>{const g=L[+a.dataset.sgk];await sb.from('pedidos_sugeridos').update({estado:a.dataset.v}).in('id',g.ids);
    if(a.dataset.v=='lo traemos'&&g.c.size&&confirm('¿Avisarles por WhatsApp a los '+g.c.size+' clientes que lo pidieron cuando llegue? (Se abre uno por uno)'))for(const id of g.c){const c=S.clientes.find(x=>x.id==id);if(c?.telefono)window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(c)}! Nos pediste *${g.t}* y lo vamos a traer 🙌 Te aviso apenas llegue.`),'_blank')}
    sugeridosBox()})}
async function vNiveles(){const due=S.perfil.rol=='dueno';
  const{data}=await sb.from('config_app').select('valor').eq('clave','niveles').maybeSingle();let d=NIV_DEF;try{if(data?.valor)d={...NIV_DEF,...JSON.parse(data.valor)}}catch(e){}
  const{data:pe}=await todo(()=>sb.from('pedidos').select('cliente_id,total').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-d.dias*864e5).toISOString()).order('numero'));
  const t={};for(const o of pe||[])t[o.cliente_id]=(t[o.cliente_id]||0)+Number(o.total||0);
  const N=d.niveles.slice().sort((a,b)=>a.desde-b.desde),de=v=>{let x=N[0];for(const n of N)if(v>=n.desde)x=n;return x},cnt={};
  const L=S.clientes.filter(c=>t[c.id]).map(c=>{const n=de(t[c.id]),i=N.indexOf(n),px=N[i+1];cnt[n.n]=(cnt[n.n]||0)+1;return{c,v:t[c.id],n,px,falta:px?px.desde-t[c.id]:0}}).sort((a,b)=>b.v-a.v);
  const cerca=L.filter(x=>x.px&&x.falta<=x.px.desde*.2);
  $('#vs').innerHTML=`<div class="box"><h3>🥇 Niveles de cliente</h3><p><small>Según lo que compra cada cliente en los últimos ${d.dias} días tiene un nivel, con un <b>% extra automático en todos sus pedidos online</b> (y en los que cargás vos). En su catálogo ve su nivel y cuánto le falta para subir: compra más para no bajar.</small></p>
    <label class="chk"><input type="checkbox" id="nv_a" ${d.activo?'checked':''} ${due?'':'disabled'}> Programa de niveles activado</label>
    <table><tr><th>Nivel</th><th>Desde $ (compras en ${d.dias} días)</th><th>% extra</th><th class="n">Clientes</th></tr>${N.map((n,i)=>`<tr><td><input data-nn="${i}" value="${esc(n.n)}" style="width:120px;margin:0" ${due?'':'disabled'}></td><td><input type="number" data-nd="${i}" value="${n.desde}" step="50000" style="width:150px;margin:0" ${due||i?'':'disabled'} ${i?'':'disabled'}></td><td><input type="number" data-np="${i}" value="${n.pct}" step="0.5" min="0" max="20" style="width:80px;margin:0" ${due?'':'disabled'}> %</td><td class="n">${cnt[n.n]||0}</td></tr>`).join('')}</table>
    <label class="f">Período a mirar<select id="nv_d" ${due?'':'disabled'}>${[60,90,180].map(v=>`<option value="${v}" ${d.dias==v?'selected':''}>${v} días</option>`).join('')}</select></label>
    ${due?'<button id="nv_g">Guardar</button>':''}</div>
  ${cerca.length?`<div class="box toca-i"><h3>🔝 Cerca de subir de nivel (${cerca.length})</h3><p><small>Avisales cuánto les falta: es el mejor empujón para un pedido extra.</small></p>${cerca.map(x=>`<div class="bh cpf"><span>${esc(x.c.razon_social)} <small>· ${esc(x.n.n)} → le faltan ${$m(x.falta)} para ${esc(x.px.n)}</small></span>${x.c.telefono?`<button class="wa" data-nw="${x.c.id}">Avisarle</button>`:''}</div>`).join('')}</div>`:''}
  <div class="box"><h3>Clientes por nivel</h3>${L.length?`<table>${L.slice(0,80).map(x=>`<tr><td>${NIV_IC[x.n.n]||'⭐'} ${esc(x.n.n)}</td><td>${esc(x.c.razon_social)}</td><td class="n">${$m(x.v)}</td></tr>`).join('')}</table>`:'<p><small>Sin compras en el período.</small></p>'}</div>`;
  $('#nv_g')&&($('#nv_g').onclick=async()=>{const nv=N.map((n,i)=>({n:$(`[data-nn="${i}"]`).value.trim()||n.n,desde:i?(+$(`[data-nd="${i}"]`).value||0):0,pct:+$(`[data-np="${i}"]`).value||0}));
    const{error}=await sb.from('config_app').upsert({clave:'niveles',valor:JSON.stringify({activo:$('#nv_a').checked,dias:+$('#nv_d').value,niveles:nv})});if(error)return toast(error.message,1);toast('Guardado.');vNiveles()});
  $$('#vs [data-nw]').forEach(b=>b.onclick=()=>{const x=L.find(y=>y.c.id==b.dataset.nw);window.open('https://wa.me/'+telWA(x.c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(x.c)}! 👋 Te cuento que estás muy cerca de subir a *nivel ${x.px.n}* en *Sabores de mi País* ${NIV_IC[x.px.n]||'⭐'}: te faltan solo *${$m(x.falta)}* en compras y pasás a tener *${nf(x.px.pct)} % extra* en todos tus pedidos.`+(x.c.token_pedidos?'\n\nPedí acá:\n'+linkPedidos(x.c):'')),'_blank')})}
/* ---------- 2. Entregas (en Descuentos y mínimo) ---------- */
async function entregasBox(){const box=$('#rg_en');if(!box)return;const due=S.perfil.rol=='dueno';
  const{data}=await sb.from('config_app').select('valor').eq('clave','entregas').maybeSingle();let d=null;try{d=JSON.parse(data?.valor||'null')}catch(e){}const ds=d?.dias||[1,2,3,4,5,6];
  box.innerHTML=`<h3>🚚 Próxima entrega y hora de corte</h3><p><small>En el catálogo cada cliente ve <b>"Pedí antes de las 18:00 y te llega el jueves"</b>. Se usan sus días de visita; si no tiene, los días de reparto de abajo.</small></p>
    <div class="g"><label class="f">Mostrar en el catálogo<select id="en_a" ${due?'':'disabled'}><option value="1" ${d||!data?'selected':''}>Sí</option><option value="0" ${d||!data?'':'selected'}>No</option></select></label><label class="f">Hora de corte (pedidos hasta esa hora salen en la próxima entrega)<input id="en_c" type="time" value="${d?.corte||'18:00'}" ${due?'':'disabled'}></label></div>
    <label class="f">Días de reparto</label><div class="chips">${DIAS.slice(0,6).map(([n,t])=>`<label class="chk"><input type="checkbox" class="en_d" value="${n}" ${ds.includes(n)?'checked':''} ${due?'':'disabled'}> ${t}</label>`).join('')}</div>
    ${due?'<button id="en_g">Guardar</button>':''}`;
  $('#en_g')&&($('#en_g').onclick=async()=>{const v=$('#en_a').value=='1'?JSON.stringify({corte:$('#en_c').value||'18:00',dias:[...$$('.en_d')].filter(x=>x.checked).map(x=>+x.value)}):'';
    const{error}=await sb.from('config_app').upsert({clave:'entregas',valor:v});if(error)return toast(error.message,1);toast('Guardado.');entregasBox()})}
/* ---------- 8. Ventas perdidas por falta de stock ---------- */
async function vPerdidas(){await cargarStock();
  const[pe,av]=await Promise.all([todo(()=>sb.from('pedidos').select('creado_en,cliente_id,pedido_items(producto_id,cantidad)').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-90*864e5).toISOString()).order('numero')),
    sb.from('avisos_stock').select('producto_id,cliente_id').is('avisado_en',null)]);
  const ven={},cl={};for(const o of pe.data||[])for(const i of o.pedido_items||[]){ven[i.producto_id]=(ven[i.producto_id]||0)+(+i.cantidad||0);(cl[i.producto_id]=cl[i.producto_id]||new Set()).add(o.cliente_id)}
  const esp={};for(const a of av.data||[])esp[a.producto_id]=(esp[a.producto_id]||0)+1;
  const L=S.productos.filter(p=>S.stock[p.producto_id]&&(S.stock[p.producto_id].d<=0)&&(ven[p.producto_id]||esp[p.producto_id])).map(p=>{const dia=(ven[p.producto_id]||0)/90,pr=+p.precio_mayorista||0;
    return{p,dia,pierde:dia*pr,c:cl[p.producto_id]?.size||0,esp:esp[p.producto_id]||0,comprar:Math.ceil(dia*30)}}).sort((a,b)=>b.pierde-a.pierde);
  const bajo=S.productos.filter(p=>{const s=S.stock[p.producto_id],dia=(ven[p.producto_id]||0)/90;return s&&s.d>0&&dia>0&&s.d/dia<7}).map(p=>({p,dias:Math.floor(S.stock[p.producto_id].d/((ven[p.producto_id]||0)/90))})).sort((a,b)=>a.dias-b.dias);
  $('#vs').innerHTML=!S.inv?'<div class="box"><p><small>Para ver esto necesitás tener el stock cargado.</small></p></div>':`<div class="kp"><div class="box ${L.length?'alerta':'ok'}"><span class="lab">Productos agotados que se venden</span><span class="num">${L.length}</span></div>
    <div class="box ${L.length?'alerta':''}"><span class="lab">Venta que perdés</span><span class="num">${$m0(L.reduce((a,x)=>a+x.pierde,0))}</span><span class="det">por día, aprox.</span></div><div class="box"><span class="lab">Se agotan en menos de 7 días</span><span class="num">${bajo.length}</span></div></div>
  <div class="box"><h3>💸 Agotados: plata que se pierde</h3><p><small>Calculado con lo que vendiste de cada uno en los últimos 90 días. "Comprar" = lo que vendés en 30 días.</small></p>
    ${L.length?`<div class="tw"><table><tr><th>Producto</th><th class="n">Vendés por día</th><th class="n">Perdés por día</th><th class="n">Clientes que lo compran</th><th class="n">Comprar</th></tr>${L.map(x=>`<tr><td>${esc(x.p.descripcion)}${x.esp?`<br><small class="baja">🔔 ${x.esp} ${x.esp==1?'cliente lo espera':'clientes lo esperan'}</small>`:''}</td><td class="n">${nf(Math.round(x.dia*10)/10)} u.</td><td class="n"><b>${$m(x.pierde)}</b></td><td class="n">${x.c}</td><td class="n"><b>${x.comprar||'—'}</b> u.${x.comprar&&enBultos(x.p.producto_id,x.comprar)?'<br><small>'+enBultos(x.p.producto_id,x.comprar)+'</small>':''}</td></tr>`).join('')}</table></div>`:'<p><small>¡Bien! No hay productos que se vendan y estén agotados.</small></p>'}</div>
  ${bajo.length?`<div class="box"><h3>⚠️ Se van a agotar pronto</h3><table>${bajo.slice(0,30).map(x=>`<tr><td>${esc(x.p.descripcion)}</td><td class="n">${nf(S.stock[x.p.producto_id].d)} u.</td><td class="n"><b class="${x.dias<3?'baja':''}">~${x.dias} días</b></td></tr>`).join('')}</table><p><small>Para armar la orden de compra andá a Compras.</small></p></div>`:''}`}
/* ---------- 9. Potencial de cada cliente ---------- */
async function vPotencial(){
  const{data:pe}=await todo(()=>sb.from('pedidos').select('cliente_id,total,pedido_items(producto_id)').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-90*864e5).toISOString()).order('numero'));
  const T={},P={};for(const o of pe||[]){T[o.cliente_id]=(T[o.cliente_id]||0)+Number(o.total||0)/3;const s=P[o.cliente_id]=P[o.cliente_id]||new Set();for(const i of o.pedido_items||[])s.add(i.producto_id)}
  const G={};for(const c of S.clientes){if(!T[c.id])continue;const r=(c.rubro||'Sin rubro').trim().toLowerCase();(G[r]=G[r]||[]).push(c)}
  const L=[];for(const[r,C]of Object.entries(G)){if(C.length<2)continue;const v=C.map(c=>T[c.id]).sort((a,b)=>a-b),ref=v[Math.floor(v.length*.75)];
    const fr={};for(const c of C)for(const id of P[c.id]||[])fr[id]=(fr[id]||0)+1;
    for(const c of C){const gap=ref-T[c.id];if(gap<=0)continue;const falta=Object.entries(fr).filter(([id,n])=>n/C.length>=.5&&!P[c.id].has(id)&&S.productos.some(p=>p.producto_id==id)).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
      L.push({c,r:C[0].rubro||'Sin rubro',hoy:T[c.id],ref,gap,falta})}}
  L.sort((a,b)=>b.gap-a.gap);
  $('#vs').innerHTML=`<div class="kp"><div class="box"><span class="lab">Venta extra posible</span><span class="num">${$m0(L.reduce((a,x)=>a+x.gap,0))}</span><span class="det">por mes, si llegan al nivel de los mejores de su rubro</span></div></div>
  <div class="box"><h3>📊 Potencial de cada cliente</h3><p><small>Compara lo que te compra cada cliente por mes con los <b>mejores negocios de su mismo rubro</b> (los del 25 % de arriba), y te dice qué productos llevan casi todos los de su rubro y él no. Para que funcione mejor, cargá el rubro de tus clientes (Ventas → Por rubro).</small></p>
    ${L.length?`<div class="ag">${L.slice(0,60).map(x=>`<div class="vi"><span class="badge b-pendiente">+${$m(x.gap)}</span><div><a class="lnk" data-fc="${x.c.id}"><b>${esc(x.c.razon_social)}</b></a> <small>· ${esc(x.r)}</small><br><small>Te compra ~${$m(x.hoy)} por mes · los mejores de su rubro ~${$m(x.ref)}</small>${x.falta.length?`<br><small>Le falta llevar: <b>${x.falta.map(id=>esc(nomProd(id))).join(', ')}</b></small>`:''}</div>
      <div class="acc">${x.falta.length?`<button data-pt="${x.c.id}">Armar pedido con estos</button>`:''}${x.c.telefono&&x.falta.length?`<button class="alt wa" data-pw="${x.c.id}">Ofrecérselos</button>`:''}</div></div>`).join('')}</div>`:'<p><small>Hacen falta al menos 2 clientes con compras en el mismo rubro.</small></p>'}</div>`;
  $$('#vs [data-fc]').forEach(a=>a.onclick=()=>abrirFicha(a.dataset.fc));
  $$('#vs [data-pt]').forEach(b=>b.onclick=()=>{const x=L.find(y=>y.c.id==b.dataset.pt);S.preCli=x.c;S.preItems=x.falta;S.tab='pedidos';shell()});
  $$('#vs [data-pw]').forEach(b=>b.onclick=()=>{const x=L.find(y=>y.c.id==b.dataset.pw);window.open('https://wa.me/'+telWA(x.c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(x.c)}! Te escribo de *Sabores de mi País*. Estos productos los llevan casi todos los negocios como el tuyo y se venden muy bien:\n`+x.falta.map(id=>'• '+nomProd(id)+' — '+$m(precioLista(id,x.c.lista))).join('\n')+(x.c.token_pedidos?'\n\n¿Te los sumo? Pedilos acá:\n'+linkPedidos(x.c):'')),'_blank')})}
/* ---------- 10. Ventas por zona ---------- */
async function vZonas(){S.zoD=S.zoD||90;
  const d0=new Date(Date.now()-S.zoD*864e5).toISOString(),d00=new Date(Date.now()-2*S.zoD*864e5).toISOString();
  const[pe,pr]=await Promise.all([todo(()=>sb.from('pedidos').select('cliente_id,total,creado_en').neq('estado','cancelado').gte('creado_en',d00).order('numero')),todo(()=>sb.from('prospectos').select('ciudad,zona,domicilio,estado').not('estado','in','(cliente,no_interesado)'))]);
  const zona=c=>cap1(String(c.zona||c.ciudad||'Sin zona').trim().replace(/\s*\(.*\)$/,''))||'Sin zona',Z={};
  const zz=k=>Z[k]=Z[k]||{v:0,a:0,cl:new Set(),tot:0,pr:0};
  for(const c of S.clientes)zz(zona(c)).tot++;
  for(const o of pe.data||[]){const c=S.clientes.find(x=>x.id==o.cliente_id)||{},z=zz(zona(c));if(o.creado_en>=d0){z.v+=Number(o.total||0);z.cl.add(o.cliente_id)}else z.a+=Number(o.total||0)}
  for(const x of pr.data||[])zz(zona(x)).pr++;
  const L=Object.entries(Z).filter(([,z])=>z.v||z.a||z.pr).sort((a,b)=>b[1].v-a[1].v),T=L.reduce((s,[,z])=>s+z.v,0)||1;
  $('#vs').innerHTML=`<div class="box"><div class="bh"><h3>🗺️ Ventas por zona</h3><select id="zo_d" style="width:auto">${[[30,'Últimos 30 días'],[90,'Últimos 3 meses'],[180,'Últimos 6 meses']].map(([v,t])=>`<option value="${v}" ${S.zoD==v?'selected':''}>${t}</option>`).join('')}</select></div>
    <p><small>Se agrupa por la ciudad o zona de cada cliente. "Prospectos" = negocios de esa zona que todavía no te compran: donde hay muchos y vendés poco, ahí hay que salir a buscar.</small></p>
    ${L.length?`<div class="tw"><table><tr><th>Zona</th><th class="n">Venta</th><th class="n">% del total</th><th class="n">vs. antes</th><th class="n">Compran / clientes</th><th class="n">Prospectos</th></tr>${L.map(([k,z])=>`<tr><td><b>${esc(k)}</b></td><td class="n">${$m(z.v)}</td><td class="n"><div class="barra" style="width:70px;display:inline-block;vertical-align:middle"><i style="width:${z.v/T*100}%"></i></div> ${nf(Math.round(z.v/T*100))} %</td>
      <td class="n">${z.a?`<span class="${z.v>=z.a?'sube':'baja'}">${z.v>=z.a?'▲':'▼'} ${nf(Math.round(Math.abs(z.v/z.a-1)*100))} %</span>`:z.v?'<span class="sube">nuevo</span>':'—'}</td><td class="n">${z.cl.size} / ${z.tot}</td><td class="n">${z.pr?`<b>${z.pr}</b>`:'—'}</td></tr>`).join('')}</table></div>`:'<p><small>No hay ventas en el período.</small></p>'}</div>`;
  $('#zo_d').onchange=e=>{S.zoD=+e.target.value;vZonas()}}
/* ---------- 11. Estados de WhatsApp ---------- */
async function vEstados(){await Promise.all([cargarStock(),cargarPromos(),cargarVentasCfg()]);S.esL=S.esL||'mayorista';
  const conF=p=>S.min[p.producto_id]?.foto,act=p=>S.min[p.producto_id]?.a!==false&&+p.precio_mayorista>0,azar=a=>a.length?a[Math.floor(Math.random()*a.length)]:null;
  const of=S.productos.filter(p=>act(p)&&promoCerca(p.producto_id,S.esL)).sort((a,b)=>!!conF(b)-!!conF(a)),nv=S.productos.filter(p=>act(p)&&S.min[p.producto_id]?.nv),top=S.productos.filter(p=>act(p)&&conF(p));
  $('#vs').innerHTML=`<div class="box"><h3>📱 Estados de WhatsApp</h3><p><small>Tres imágenes listas para tu <b>estado de WhatsApp</b> de hoy: una oferta, una novedad y un combo. Todos tus contactos las ven sin que les escribas. Ideal: publicar una a la mañana, otra al mediodía y otra a la tarde. Tocá "Otras" para cambiarlas.</small></p>
    <div class="g"><label class="f">Precios de la lista<select id="es_l">${['mayorista','minorista','especial'].map(l=>`<option value="${l}" ${S.esL==l?'selected':''}>${nomL(l)}</option>`).join('')}</select></label></div>
    <div class="fc-acc"><button id="es_g">Armar las 3 imágenes</button><button class="alt" id="es_o">Otras</button></div><div id="es_out"></div></div>`;
  const armar=async()=>{S.esL=$('#es_l').value;const l=S.esL;$('#es_out').innerHTML='<p>Armando…</p>';const cvs=[];
    const p1=azar(of.slice(0,8))||azar(top);if(p1)cvs.push(await dibujarFolleto([itemFolleto(p1,l)],{fmt:'historia',lista:l,titulo:'OFERTA',sub:'del día',vig:'Hasta agotar stock'}));
    const p2=azar(nv)||azar(top.filter(p=>p!=p1));if(p2)cvs.push(await dibujarFolleto([itemFolleto(p2,l)],{fmt:'historia',lista:l,titulo:nv.includes(p2)?'NUEVO':'RECOMENDADO',sub:nv.includes(p2)?'¡Llegó!':'de la semana',vig:''}));
    const cb=azar(S.combos);if(cb){const v=comboPrecio(cb,l);cvs.push(await dibujarFolleto([{d:'🎁 '+cb.nombre,img:S.min[(cb.items||[]).find(x=>S.min[x.id]?.foto)?.id]?.foto||'',p:v.p,ant:v.s,pct:+cb.descuento_pct,cond:comboTxt(cb)}],{fmt:'historia',lista:l,titulo:'COMBO',sub:'con descuento',vig:''}))}
    else{const p3=azar(of.filter(p=>p!=p1))||azar(top.filter(p=>p!=p1&&p!=p2));if(p3)cvs.push(await dibujarFolleto([itemFolleto(p3,l)],{fmt:'historia',lista:l,titulo:'APROVECHÁ',sub:'esta semana',vig:''}))}
    if(!cvs.length){$('#es_out').innerHTML='<p><small>No encontré productos para armar las imágenes (cargá fotos u ofertas).</small></p>';return}
    mostrarImgs('#es_out',cvs,k=>'Estado '+(k+1)+'.jpg','Sabores de mi País'+(S.telEmp?' · Pedí por WhatsApp '+S.telEmp:''))};
  $('#es_g').onclick=armar;$('#es_o').onclick=armar}
/* ---------- 12. Tarjeta de producto ---------- */
function vTarjeta(){let sel=null;
  $('#vs').innerHTML=`<div class="box"><h3>🖼️ Tarjeta de producto</h3><p><small>Una imagen de un producto con foto, precio y (si tenés el catálogo público activo) el QR para pedir. Para mandar por WhatsApp a un cliente o subir a Instagram/estados.</small></p>
    <div class="conscan"><input id="tj_q" placeholder="Elegí el producto (nombre o código)" autocomplete="off">${btnScan('tj_sc')}</div><div id="tj_r"></div><p id="tj_s"></p>
    <div class="g"><label class="f">Precios de la lista<select id="tj_l"><option>mayorista</option><option>minorista</option><option value="especial">gastronomía</option></select></label>
      <label class="f">Formato<select id="tj_f"><option value="cuadrado">Cuadrado (posteo, WhatsApp)</option><option value="historia">Historia / estado</option></select></label>
      <label class="f">Título<input id="tj_t" maxlength="20" value="RECOMENDADO"></label></div>
    <button id="tj_g">Armar tarjeta</button><div id="tj_out"></div></div>`;
  const pick=p=>{sel=p;$('#tj_q').value='';$('#tj_r').innerHTML='';$('#tj_s').innerHTML='<b>'+esc(p.descripcion)+'</b>'+(S.min[p.producto_id]?.foto?'':' <small class="baja">(no tiene foto: cargala en Precios para que quede mejor)</small>');if(S.min[p.producto_id]?.nv)$('#tj_t').value='NUEVO';else if(promoCerca(p.producto_id,$('#tj_l').value))$('#tj_t').value='OFERTA'};
  buscador('#tj_q','#tj_r',pick);$('#tj_sc').onclick=()=>escanear('Tarjeta de producto',p=>{pick(p);return '✔ '+p.descripcion});
  $('#tj_g').onclick=async()=>{if(!sel)return toast('Elegí el producto.',1);await cargarPromos();const l=$('#tj_l').value;$('#tj_out').innerHTML='<p>Armando…</p>';
    const cv=await dibujarFolleto([itemFolleto(sel,l)],{fmt:$('#tj_f').value,lista:l,titulo:($('#tj_t').value||'RECOMENDADO').toUpperCase(),sub:cap1(sel.familia||'')||'Sabores de mi País',vig:''});
    mostrarImgs('#tj_out',[cv],()=>sel.descripcion.replace(/[^\w áéíóúñ-]/gi,'').slice(0,40)+'.jpg',sel.descripcion+' · Sabores de mi País')}}
async function vPlan(){$('#vs').innerHTML='<p>Armando tu plan del día…</p>';const T=await datosPlan(),H=hechosPlan();
  const pend=T.filter(t=>!H.has(t.k)),plata=pend.filter(t=>t.v<1e9).reduce((a,t)=>a+t.v,0);
  $('#vs').innerHTML=`<div class="kp"><div class="box ${pend.length?'alerta':'ok'}"><span class="lab">Para hacer hoy</span><span class="num">${pend.length}</span><span class="det">${T.length-pend.length} hechas</span></div><div class="box"><span class="lab">Plata en juego</span><span class="num">${$m0(plata)}</span><span class="det">venta posible de estas tareas</span></div></div>
  <div class="box"><h3>📋 Tu plan de hoy</h3><p><small>Todo lo que te conviene hacer hoy, en un solo lugar y ordenado por importancia: primero reclamos y pedidos esperando, después lo que más plata puede traer. Tocá la tarea para ir a resolverla y ✓ cuando la termines.</small></p>
    ${T.length?`<div class="ag">${T.map(t=>`<div class="vi ${H.has(t.k)?'hecho-vi':''}"><span class="badge ${t.v>=1e9?'b-mora30':'b-pendiente'}" style="font-size:18px">${t.ic}</span>
      <div><a class="lnk" data-pv="${t.vs}"><b>${esc(t.c.razon_social)}</b></a><br><small>${esc(t.t)}${t.v<1e9&&t.v>=20000&&!t.t.includes('$')?' · <b>'+$m(t.v)+'</b>':''}</small></div>
      <div class="acc">${t.c.telefono?`<button class="alt wa" data-pw="${t.k}">WhatsApp</button>`:''}<button class="alt" data-pg="${t.vs}">Ir</button><button class="${H.has(t.k)?'alt hecho':'alt'}" data-ph="${t.k}" title="Marcar como hecha">${H.has(t.k)?'✓':'Hecho'}</button></div></div>`).join('')}</div>`
      :'<p><small>¡Nada pendiente para hoy! 🎉 Aprovechá para mandar una campaña o las novedades de la semana.</small></p>'}</div>`;
  const go=vs=>{S.vs=vs;vVentas()};
  $$('#vs [data-pv],#vs [data-pg]').forEach(a=>a.onclick=()=>go(a.dataset.pv||a.dataset.pg));
  $$('#vs [data-ph]').forEach(b=>b.onclick=()=>{const H2=hechosPlan();H2.has(b.dataset.ph)?H2.delete(b.dataset.ph):H2.add(b.dataset.ph);try{localStorage.setItem(hechoKey(),JSON.stringify([...H2]))}catch(e){}vPlan()});
  $$('#vs [data-pw]').forEach(b=>b.onclick=()=>{const t=T.find(x=>x.k==b.dataset.pw),c=t.c;window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(c)}! Te escribo de *Sabores de mi País* 👋`+(c.token_pedidos?'\n'+linkPedidos(c):'')),'_blank')})}
/* ---------- 2. Resumen semanal ---------- */
async function vSemana(){
  const ahora=Date.now(),d7=new Date(ahora-7*864e5).toISOString(),d14=new Date(ahora-14*864e5).toISOString(),d42=new Date(ahora-42*864e5).toISOString();
  const{data}=await todo(()=>sb.from('pedidos').select('cliente_id,total,creado_en,pedido_items(producto_id,cantidad)').neq('estado','cancelado').gte('creado_en',d42).order('numero'));
  const A=(data||[]).filter(o=>o.creado_en>=d7),B=(data||[]).filter(o=>o.creado_en>=d14&&o.creado_en<d7),V=(data||[]).filter(o=>o.creado_en<d7);
  const sum=L=>L.reduce((a,o)=>a+Number(o.total||0),0),va=sum(A),vb=sum(B),cA=new Set(A.map(o=>o.cliente_id)),cB=new Set(B.map(o=>o.cliente_id)),cV=new Set(V.map(o=>o.cliente_id));
  const nuevos=[...cA].filter(id=>!cV.has(id)),perdidos=[...cB].filter(id=>!cA.has(id));
  const q=L=>{const m={};for(const o of L)for(const i of o.pedido_items||[])m[i.producto_id]=(m[i.producto_id]||0)+(+i.cantidad||0);return m},qa=q(A),qb=q(B);
  const ids=[...new Set([...Object.keys(qa),...Object.keys(qb)])].map(id=>({id,a:qa[id]||0,b:qb[id]||0,d:(qa[id]||0)-(qb[id]||0)}));
  const alza=ids.filter(x=>x.d>0).sort((a,b)=>b.d-a.d).slice(0,6),baja=ids.filter(x=>x.d<0).sort((a,b)=>a.d-b.d).slice(0,6);
  const dia={};for(const o of A){const k=new Date(o.creado_en).toLocaleDateString('es-AR',{weekday:'long'});dia[k]=(dia[k]||0)+Number(o.total||0)}const mejor=Object.entries(dia).sort((a,b)=>b[1]-a[1])[0];
  const pc=(a,b)=>b>0?`<small class="${a>=b?'sube':'baja'}">${a>=b?'▲':'▼'} ${nf(Math.round(Math.abs(a/b-1)*100))} %</small>`:'',nc=id=>esc(S.clientes.find(c=>c.id==id)?.razon_social||'Cliente');
  const txt=`📊 *Resumen semanal · Sabores de mi País*\nVentas: ${$m(va)} (${vb?(va>=vb?'+':'−')+Math.round(Math.abs(va/vb-1)*100)+' % vs semana anterior':'sin datos de la anterior'})\nPedidos: ${A.length} · Ticket promedio: ${$m(A.length?va/A.length:0)}\nClientes que compraron: ${cA.size} · nuevos: ${nuevos.length} · no repitieron: ${perdidos.length}`+(alza.length?'\n⬆️ En alza: '+alza.slice(0,3).map(x=>nomProd(x.id)).join(', '):'')+(baja.length?'\n⬇️ En baja: '+baja.slice(0,3).map(x=>nomProd(x.id)).join(', '):'');
  $('#vs').innerHTML=`<div class="kp"><div class="box"><span class="lab">Ventas de la semana</span><span class="num">${$m0(va)}</span><span class="det">${pc(va,vb)} vs. anterior (${$m(vb)})</span></div>
    <div class="box"><span class="lab">Pedidos</span><span class="num">${A.length}</span><span class="det">${pc(A.length,B.length)} · ticket ${$m(A.length?va/A.length:0)}</span></div>
    <div class="box"><span class="lab">Clientes que compraron</span><span class="num">${cA.size}</span><span class="det">${nuevos.length} nuevos</span></div>${mejor?`<div class="box"><span class="lab">Mejor día</span><span class="num" style="font-size:20px">${esc(cap1(mejor[0]))}</span><span class="det">${$m(mejor[1])}</span></div>`:''}</div>
  <div class="dos"><div class="box"><h3>⬆️ Productos en alza</h3>${alza.length?`<table>${alza.map(x=>`<tr><td>${esc(nomProd(x.id))}</td><td class="n sube">+${nf(Math.round(x.d))} u.</td></tr>`).join('')}</table>`:'<p><small>—</small></p>'}</div>
    <div class="box"><h3>⬇️ Productos en baja</h3>${baja.length?`<table>${baja.map(x=>`<tr><td>${esc(nomProd(x.id))}</td><td class="n baja">${nf(Math.round(x.d))} u.</td></tr>`).join('')}</table>`:'<p><small>—</small></p>'}</div>
    <div class="box"><h3>🆕 Clientes nuevos</h3>${nuevos.length?nuevos.map(nc).join('<br>'):'<p><small>Ninguno esta semana.</small></p>'}</div>
    <div class="box"><h3>⚠️ Compraron la semana pasada y esta no</h3>${perdidos.length?`<small>${perdidos.slice(0,20).map(nc).join(' · ')}</small><p><small>Mirá "Les toca comprar" y "Comprando menos".</small></p>`:'<p><small>¡Todos repitieron! 👌</small></p>'}</div></div>
  <div class="box"><button class="alt" id="se_c">Copiar el resumen (para WhatsApp)</button></div>`;
  $('#se_c').onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast('Resumen copiado.')}catch(e){prompt('Copiá el resumen:',txt)}}}
/* ---------- 4. Combos sugeridos (dentro de Combos) ---------- */
async function combosSugeridos(){const box=$('#cb_sug');if(!box)return;const co=await cargarCoocurrencias();
  const ya=new Set(S.combosTodos.map(c=>(c.items||[]).map(x=>x.id).sort().join('|'))),P=[];
  for(const[a,r]of Object.entries(co.co))for(const[b,k]of Object.entries(r))if(a<b&&k>=3&&S.productos.some(p=>p.producto_id==a)&&S.productos.some(p=>p.producto_id==b))P.push({a,b,k,s:k/Math.min(co.n[a],co.n[b])});
  const L=P.filter(x=>!ya.has([x.a,x.b].sort().join('|'))).sort((x,y)=>y.k-x.k).slice(0,8);
  box.innerHTML=`<h3>🤖 Combos sugeridos</h3><p><small>Productos que tus clientes ya compran juntos. Armarlos como combo con un descuento chico empuja a llevar los dos.</small></p>
    ${L.length?`<table>${L.map((x,i)=>`<tr><td>${esc(nomProd(x.a))} <b>+</b> ${esc(nomProd(x.b))}<br><small>van juntos en ${x.k} pedidos</small></td><td>${S.perfil.rol=='dueno'?`<button class="alt" data-cs="${i}">Crear combo</button>`:''}</td></tr>`).join('')}</table>`:'<p><small>Todavía no hay suficientes pedidos para sugerir combos (hacen falta productos que aparezcan juntos en 3 pedidos o más).</small></p>'}`;
  $$('#cb_sug [data-cs]').forEach(b=>b.onclick=()=>{const x=L[+b.dataset.cs],q=id=>bul(id)?.n||1,nc=id=>nomCorto2(nomProd(id));
    editarCombo({nombre:'Combo '+nc(x.a)+' + '+nc(x.b),descripcion:'Los que más se llevan juntos',items:[{id:x.a,q:q(x.a)},{id:x.b,q:q(x.b)}],descuento_pct:5,activo:true,hasta:null})})}
/* ---------- 6. Venta solo por bulto ---------- */
async function vBultos(){const due=S.perfil.rol=='dueno';await cargarStock();
  const L=S.productos.filter(p=>bul(p.producto_id)).sort((a,b)=>(!!S.min[b.producto_id]?.sb)-(!!S.min[a.producto_id]?.sb)||a.descripcion.localeCompare(b.descripcion));
  $('#vs').innerHTML=`<div class="box"><h3>📦 Venta solo por bulto cerrado</h3><p><small>Los productos marcados se venden únicamente por caja/pack completo: en el catálogo el botón agrega el bulto entero y la cantidad se redondea al bulto. Sirve para proteger el margen y no abrir cajas.</small></p>
    <input id="bu_q" placeholder="Filtrar productos" style="margin-bottom:8px">
    ${L.length?`<table id="bu_t">${L.map(p=>`<tr data-n="${esc(norm(p.descripcion))}"><td>${esc(p.descripcion)}<br><small>${esc(bulL(bul(p.producto_id)))}</small></td><td><label class="chk"><input type="checkbox" data-sb="${p.producto_id}" ${S.min[p.producto_id]?.sb?'checked':''} ${due?'':'disabled'}> Solo por bulto</label></td></tr>`).join('')}</table>`:'<p><small>No hay productos con bulto cargado.</small></p>'}</div>`;
  $('#bu_q').oninput=e=>{const q=norm(e.target.value);$$('#bu_t tr').forEach(r=>r.hidden=q&&!r.dataset.n.includes(q))};
  $$('#vs [data-sb]').forEach(c=>c.onchange=async()=>{const{error}=await sb.from('productos').update({solo_bulto:c.checked}).eq('id',c.dataset.sb);
    if(error){c.checked=!c.checked;return toast(/solo_bulto/.test(error.message)?'Falta correr ventas-plan.sql en Supabase.':error.message,1)}S.min[c.dataset.sb].sb=c.checked;toast('Guardado.')})}
/* ---------- 9. Preventa ---------- */
async function vPreventa(){const due=S.perfil.rol=='dueno';
  const[pv,rs]=await Promise.all([sb.from('preventas').select('*').order('id',{ascending:false}),sb.from('reservas').select('*')]);
  if(pv.error){$('#vs').innerHTML=SQL_PLA;return}
  const R=id=>(rs.data||[]).filter(r=>r.preventa_id==id);let sel=null;
  $('#vs').innerHTML=`<div class="box"><h3>🔜 Preventa</h3><p><small>Publicá un producto que está por llegar: los clientes lo <b>reservan</b> desde su catálogo. Así sabés cuánto comprar antes de pedirle al proveedor, y cuando llega convertís las reservas en pedidos con un toque.</small></p>
    ${due?`<div class="g"><div class="conscan"><input id="pv_q" placeholder="Producto (si ya está cargado)" autocomplete="off"></div><label class="f">Nombre que ve el cliente<input id="pv_n" placeholder="Ej.: Pan dulce con frutas 500 g"></label>
      <label class="f">Llega aprox.<input id="pv_l" type="date"></label><label class="f">Precio (opcional)<input id="pv_p" type="number" min="0" step="0.01"></label><label class="f">Detalle (opcional)<input id="pv_d" placeholder="Ej.: Llega para Navidad, cupos limitados"></label></div><div id="pv_r"></div><button id="pv_g">Publicar preventa</button>`:''}</div>
  ${(pv.data||[]).map(p=>{const X=R(p.id),tot=X.reduce((a,r)=>a+ +r.cantidad,0),pend=X.filter(r=>!r.pedido_id);return`<div class="box ${p.activa?'':'hecho-vi'}"><div class="bh"><h3 style="margin:0">${esc(p.nombre)}</h3><span class="badge ${p.activa?'b-entregado':'b-cancelado'}">${p.activa?'Abierta':'Cerrada'}</span></div>
    <p><small>${p.llega?'Llega aprox. '+fd(p.llega)+' · ':''}${p.precio?$m(p.precio)+' · ':''}<b>${X.length} ${X.length==1?'cliente reservó':'clientes reservaron'} ${nf(tot)} u.</b>${p.producto_id&&enBultos(p.producto_id,tot)?' ('+enBultos(p.producto_id,tot)+')':''}</small></p>
    ${X.length?`<table>${X.map(r=>`<tr><td>${esc(S.clientes.find(c=>c.id==r.cliente_id)?.razon_social||'')}</td><td class="n">${nf(r.cantidad)} u.</td><td>${r.pedido_id?'<small class="sube">✓ en pedido</small>':''}</td></tr>`).join('')}</table>`:''}
    ${due?`<div class="fc-acc">${p.producto_id&&pend.length?`<button data-pvp="${p.id}">Llegó: crear ${pend.length} ${pend.length==1?'pedido':'pedidos'}</button>`:''}<button class="alt wa" data-pvw="${p.id}">Avisar a los clientes</button><button class="alt" data-pva="${p.id}">${p.activa?'Cerrar':'Reabrir'}</button></div>`:''}</div>`}).join('')}`;
  if(due){buscador('#pv_q','#pv_r',p=>{sel=p;$('#pv_q').value=p.descripcion;$('#pv_r').innerHTML='';if(!$('#pv_n').value)$('#pv_n').value=p.descripcion});
    $('#pv_g').onclick=async()=>{const n=$('#pv_n').value.trim()||sel?.descripcion;if(!n)return toast('Poné el nombre.',1);
      const{error}=await sb.from('preventas').insert({producto_id:sel?.producto_id||null,nombre:n,descripcion:$('#pv_d').value.trim()||null,llega:$('#pv_l').value||null,precio:+$('#pv_p').value||null,foto:sel?S.min[sel.producto_id]?.foto||null:null});
      if(error)return toast(error.message,1);toast('Preventa publicada.');vPreventa()}}
  $$('#vs [data-pva]').forEach(b=>b.onclick=async()=>{const p=pv.data.find(x=>x.id==b.dataset.pva);await sb.from('preventas').update({activa:!p.activa}).eq('id',p.id);vPreventa()});
  $$('#vs [data-pvw]').forEach(b=>b.onclick=()=>{const p=pv.data.find(x=>x.id==b.dataset.pvw);const msg=`¡Hola {nombre}! 🔜 *PREVENTA* en *Sabores de mi País*: *${p.nombre}*${p.llega?' llega aprox. el '+fd(p.llega):''}.${p.descripcion?' '+p.descripcion+'.':''}\nReservá el tuyo desde tu catálogo (arriba de todo) y te llega de los primeros:\n{link}`;S.vs='campanias';vVentas();setTimeout(()=>{$('#cp_m').value=msg;$('#cp_m').oninput()},400)});
  $$('#vs [data-pvp]').forEach(b=>b.onclick=async()=>{const p=pv.data.find(x=>x.id==b.dataset.pvp),X=R(p.id).filter(r=>!r.pedido_id);if(!confirm('¿Crear '+X.length+' pedidos (Por aprobar) con las reservas de '+p.nombre+'?'))return;let n=0;
    for(const r of X){const c=S.clientes.find(x=>x.id==r.cliente_id);if(!c)continue;const pr=p.precio||precioLista(p.producto_id,c.lista);
      const{data:o,error}=await sb.from('pedidos').insert({cliente_id:c.id,vendedor_id:S.perfil.id,lista:c.lista,descuento_pct:0,estado:'pendiente',origen:'preventa',observaciones:'Preventa: '+p.nombre}).select().single();if(error){toast(error.message,1);continue}
      await sb.from('pedido_items').insert({pedido_id:o.id,producto_id:p.producto_id,cantidad:r.cantidad,precio_unitario:pr,promo:'Preventa'});await sb.from('reservas').update({pedido_id:o.id}).eq('id',r.id);n++}
    toast(n+' pedidos creados en Pedidos → Por aprobar.');vPreventa()})}
async function vEmbudo(){const{data,error}=await sb.from('prospectos').select('*').order('creado_en',{ascending:false}).limit(1000);if(error){$('#vs').innerHTML='<p class="err">'+esc(error.message)+'</p>';return}
  const SCp=await cargarPuntajes().catch(()=>null);if(SCp)data.sort((a,b)=>SCp(b)-SCp(a));
  const zoE=x=>String(x.zona||x.ciudad||'').trim(),rbE=x=>String(x.rubro||'').trim(),ZE=[...new Set(data.map(zoE).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')),RE=[...new Set(data.map(rbE).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  if(S.emZo&&!ZE.includes(S.emZo))S.emZo='';if(S.emRu&&!RE.includes(S.emRu))S.emRu='';S.emAll=S.emAll||{};
  const vis=x=>(!S.emZo||zoE(x)==S.emZo)&&(!S.emRu||rbE(x)==S.emRu);
  const G={},etK=x=>x.estado=='no_interesado'||ETAPAS.some(e=>e[0]==x.estado)?x.estado:'nuevo';for(const x of data.filter(vis))(G[etK(x)]=G[etK(x)]||[]).push(x);const tot=data.filter(x=>x.estado!='no_interesado').length,cl=(G.cliente||[]).length,hoy=diaLocal(new Date());
  const seg=data.filter(x=>x.proximo_seguimiento&&x.proximo_seguimiento<=hoy&&!['cliente','no_interesado'].includes(x.estado));
  const dias=x=>{const n=Math.floor((Date.now()-new Date(x.actualizado_en||x.creado_en||Date.now()))/864e5);return isNaN(n)?0:n};
  $('#vs').innerHTML=`<div class="kp"><div class="box"><span class="lab">Prospectos</span><span class="num">${tot}</span></div><div class="box ok"><span class="lab">Se hicieron clientes</span><span class="num">${tot?Math.round(cl/tot*100):0} %</span><span class="det">${cl} de ${tot}</span></div><div class="box ${seg.length?'alerta':''}"><span class="lab">Seguimiento para hoy</span><span class="num">${seg.length}</span></div></div>
  <div class="fc-acc" style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:8px"><button id="em_aqui">📍 Agregar el comercio donde estoy</button><button class="alt" id="em_imp">📋 Pegar una lista de prospectos</button></div>
  <div class="box"><h3>🧲 Embudo de prospectos</h3><p><small>Cada negocio que querés sumar pasa por etapas. Movelo con "→" cuando avanza. Los que llevan muchos días quietos en una etapa necesitan un empujón (o una muestra).</small></p>
    <div class="emf"><label class="f">Zona o barrio<select id="em_z"><option value="">Todas</option>${ZE.map(z=>`<option ${S.emZo==z?'selected':''}>${esc(z)}</option>`).join('')}</select></label><label class="f">Tipo de negocio<select id="em_r"><option value="">Todos</option>${RE.map(z=>`<option ${S.emRu==z?'selected':''}>${esc(z)}</option>`).join('')}</select></label></div>
    <div class="emb">${ETAPAS.map(([k,t],i)=>`<div class="col"><div class="hd"><b>${t}</b> <span class="badge">${(G[k]||[]).length}</span></div>${(G[k]||[]).slice(0,S.emAll[k]?2000:40).map(x=>`<div class="cd ${dias(x)>14&&k!='cliente'?'viejo':''}"><details class="cdd"><summary><b>${esc(x.nombre)}</b></summary><div class="cdx">${x.domicilio?`<span>${IC('pin',14)} ${esc(x.domicilio)}${zoE(x)?' · '+esc(zoE(x)):''}</span>`:''}${x.telefono?`<span>${IC('phone',14)} <a class="lnk" href="tel:${esc(String(x.telefono).replace(/[^+\d]/g,''))}">${esc(x.telefono)}</a></span>`:''}${x.contacto?`<span>${IC('user',14)} ${esc(x.contacto)}</span>`:''}${x.observaciones?`<span class="ob">${esc(x.observaciones)}</span>`:''}${x.domicilio||x.lat?`<a class="lnk" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${x.lat&&x.lng?x.lat+','+x.lng:encodeURIComponent(x.domicilio+', '+(x.ciudad||'Buenos Aires'))}">${IC('map',14)} Cómo llegar</a>`:''}<a class="lnk" data-ed="${x.id}">${IC('pencil',14)} Editar datos</a></div></details>${SCp&&k!='cliente'?' '+badgeP(SCp(x)):''}<small>${esc(x.rubro||'')}${x.rubro?' · ':''}${dias(x)} d en esta etapa</small>
      <div>${x.telefono?`<a class="lnk" data-ew="${x.id}">WhatsApp</a> <a class="lnk" data-err="${x.id}">💬</a>`:''}${i<3?` <a class="lnk" data-em="${x.id}" data-e="${ETAPAS[i+1][0]}">→ ${ETAPAS[i+1][1]}</a>`:''}${i==3?` <a class="lnk" data-ec="${x.id}">→ Dar de alta</a>`:''}${k!='cliente'?` <a class="lnk" data-en="${x.id}">✕</a>`:''}</div></div>`).join('')}${(G[k]||[]).length>40&&!S.emAll[k]?`<button class="alt" data-emv="${k}" style="width:100%">Ver ${(G[k]||[]).length-40} más</button>`:''}</div>`).join('')}</div></div>`;
  $('#em_z').onchange=e=>{S.emZo=e.target.value;vEmbudo()};$('#em_r').onchange=e=>{S.emRu=e.target.value;vEmbudo()};$$('#vs [data-emv]').forEach(b=>b.onclick=()=>{S.emAll[b.dataset.emv]=1;vEmbudo()});$$('#vs [data-ed]').forEach(a=>a.onclick=()=>editarProspecto(data.find(y=>y.id==a.dataset.ed),vEmbudo));
  const P=id=>data.find(x=>x.id==id),upd=async(id,o)=>{const{error}=await sb.from('prospectos').update({...o,actualizado_en:new Date().toISOString()}).eq('id',id);if(error)return toast(error.message,1);vEmbudo()};
  $$('#vs [data-em]').forEach(a=>a.onclick=()=>upd(a.dataset.em,{estado:a.dataset.e,ultimo_contacto:diaLocal(new Date())}));
  $$('#vs [data-en]').forEach(a=>a.onclick=()=>{if(confirm('¿Marcar como "No le interesa"?'))upd(a.dataset.en,{estado:'no_interesado'})});
  $$('#vs [data-ew]').forEach(a=>a.onclick=()=>{const x=P(a.dataset.ew);window.open('https://wa.me/'+telWA(x.telefono)+'?text='+encodeURIComponent(`¡Hola! Te escribo de *Sabores de mi País*, distribuidora de alimentos 👋`+(x.rubro?' Te paso nuestro catálogo para '+x.rubro.toLowerCase()+'s:\n'+linkRubro(x.rubro):'')),'_blank');if(x.estado=='nuevo')upd(x.id,{estado:'contactado',ultimo_contacto:diaLocal(new Date())})});
  $('#em_imp').onclick=()=>importarProspectos(vEmbudo);$('#em_aqui').onclick=()=>agregarAqui(vEmbudo);$$('#vs [data-err]').forEach(a=>a.onclick=()=>respuestasRapidas(P(a.dataset.err)));
  $$('#vs [data-ec]').forEach(a=>a.onclick=async()=>{const x=P(a.dataset.ec);if(!confirm('¿Dar de alta a «'+x.nombre+'» como cliente'+(x.telefono?' y mandarle su catálogo por WhatsApp':'')+'?'))return;const w=x.telefono?window.open('','_blank'):null;if(await altaExpres(x,w))vEmbudo()})}
/* ---------- 12. Precios redondeados ---------- */
async function vRedondeo(){const due=S.perfil.rol=='dueno';
  const{data}=await sb.from('config_app').select('valor').eq('clave','redondeo_precios').maybeSingle();let d={};try{d=JSON.parse(data?.valor||'{}')||{}}catch(e){}
  const OPC=[['0|0','Sin redondear'],['10|0','A $ 10 (ej. 687 → 690)'],['50|0','A $ 50 (ej. 687 → 700)'],['100|0','A $ 100 (ej. 687 → 700)'],['100|90','Terminado en 90 (ej. 687 → 690, 3.041 → 3.090)'],['100|99','Terminado en 99 (ej. 687 → 699)']];
  const red=(v,r)=>{const[pa,fi]=String(r||'0|0').split('|').map(Number);return !pa?v:Math.max(pa,Math.ceil((v-fi)/pa)*pa+fi)};
  $('#vs').innerHTML=`<div class="box"><h3>🏷️ Precios redondeados</h3><p><small>Las listas salen de costo + margen, y quedan precios como $ 687,24. Acá elegís cómo redondearlas (siempre hacia arriba). Se aplica a todo: catálogo, pedidos, listas y folletos. Mirá la vista previa antes de guardar.</small></p>
    <div class="g">${['mayorista','minorista','especial'].map(l=>`<label class="f">Lista ${nomL(l)}<select data-rl="${l}" ${due?'':'disabled'}>${OPC.map(([v,t])=>`<option value="${v}" ${(d[l]?d[l].paso+'|'+(d[l].fin||0):'0|0')==v?'selected':''}>${t}</option>`).join('')}</select></label>`).join('')}</div>
    <div id="rd_p"></div>${due?'<button id="rd_g">Guardar y aplicar</button>':''}</div>`;
  const prev=()=>{const L=S.productos.filter(p=>+p.precio_mayorista>0).slice(0,12),cfg={};$$('[data-rl]').forEach(s=>cfg[s.dataset.rl]=s.value);
    let dm=0,n=0;for(const p of S.productos)for(const l of ['mayorista','minorista','especial']){const v=+p['precio_'+l];if(v>0){dm+=(red(v,cfg[l])-v)/v;n++}}
    $('#rd_p').innerHTML=`<p><small>En promedio los precios ${dm>0?'suben <b>'+nf(Math.round(dm/n*1000)/10)+' %</b> (esa diferencia es ganancia extra)':'no cambian'}.</small></p><div class="tw"><table><tr><th>Producto</th>${['mayorista','minorista','especial'].map(l=>`<th class="n">${nomL(l)}</th>`).join('')}</tr>${L.map(p=>`<tr><td>${esc(p.descripcion)}</td>${['mayorista','minorista','especial'].map(l=>{const v=+p['precio_'+l],r=red(v,cfg[l]);return`<td class="n">${r!=v?`<s><small>${$m(v)}</small></s><br><b>${$m(r)}</b>`:$m(v)}</td>`}).join('')}</tr>`).join('')}</table></div>`};
  $$('[data-rl]').forEach(s=>s.onchange=prev);prev();
  $('#rd_g')&&($('#rd_g').onclick=async()=>{const o={};$$('[data-rl]').forEach(s=>{const[pa,fi]=s.value.split('|').map(Number);if(pa)o[s.dataset.rl]={paso:pa,fin:fi}});
    if(!confirm('¿Aplicar el redondeo a todas las listas de precios?'))return;const{error}=await sb.from('config_app').upsert({clave:'redondeo_precios',valor:JSON.stringify(o)});if(error)return toast(error.message,1);
    await recargarProductos();toast('Listo: precios redondeados. Si no ves el cambio, falta correr ventas-plan.sql.');vRedondeo()})}
/* ---------- Configuración de las automatizaciones ---------- */
async function vAuto(){const A=await cfgAuto(),due=S.perfil.rol=='dueno',dis=due?'':'disabled';
  const tg=(k,t,d)=>`<label class="chk"><input type="checkbox" data-ak="${k}" ${A[k].activa?'checked':''} ${dis}> <b>${t}</b></label><p><small>${d}</small></p>`;
  const num=(k,f,t,w=70)=>`<label class="f">${t}<input type="number" min="0" data-an="${k}.${f}" value="${A[k][f]}" style="width:${w}px" ${dis}></label>`;
  const txa=(k,f,t)=>`<label class="f">${t||'Mensaje'}<textarea rows="3" data-at="${k}.${f}" ${dis}>${esc(A[k][f])}</textarea></label>`+(Object.values(AB_REG).some(([a,b])=>a==k&&b==f)?`<details ${A[k][f+'B']?'open':''}><summary><small>🧪 Prueba A/B: versión B (opcional)${A[k][f+'B']&&A[k].abDesde?' · en prueba desde el '+fd(A[k].abDesde):''}</small></summary><textarea rows="3" data-at="${k}.${f}B" placeholder="Escribí otra versión: la mitad de los clientes recibe esta. A las 2 semanas queda la que más vendió." ${dis}>${esc(A[k][f+'B']||'')}</textarea></details>`:'');
  const pasos=k=>`<div data-ps="${k}">${(A[k].pasos||[]).map((p,i)=>`<div class="paso"><div class="g"><label class="f">Paso ${i+1}: a los<input type="number" min="0" data-pd="${i}" value="${p.dias}" style="width:70px" ${dis}> días</label>
    <label class="f">Qué hace<select data-pt="${i}" ${dis}>${(k=='prospectos'?[['mensaje','WhatsApp'],['visitar','Visitarlo']]:[['mensaje','WhatsApp'],['llamar','Llamarlo']]).map(([v,t])=>`<option value="${v}" ${p.tipo==v?'selected':''}>${t}</option>`).join('')}</select></label>
    ${due?`<button class="alt" data-px="${i}">Quitar</button>`:''}</div><textarea rows="3" data-pm="${i}" ${dis}>${esc(p.txt)}</textarea></div>`).join('')}${due?`<button class="alt" data-pa="${k}">+ Agregar paso</button>`:''}</div>`;
  $('#vs').innerHTML=`<div class="box"><h3>⚙️ Automatizaciones</h3><p><small>Acá definís las reglas. El sistema las revisa solo todos los días y pone cada mensaje en la <b>Cola del día</b>, ya escrito. En los mensajes podés usar: <code>{nombre}</code> <code>{link}</code> <code>{cupon}</code> <code>{pct}</code> <code>{hasta}</code> <code>{monto}</code> <code>{dias}</code> <code>{producto}</code>.</small></p>${due?'':'<p class="aviso">Solo el dueño puede cambiar las reglas.</p>'}</div>
  <div class="box">${tg('reactivar','🔁 Secuencia para que vuelvan a comprar','Según los días sin comprar. Cuando el cliente compra, la secuencia se corta sola y vuelve a empezar desde cero.')}${pasos('reactivar')}</div>
  <div class="box">${tg('dormidos','🎟️ Cupón automático para dormidos','Al cliente dormido le llega un cupón personal de un solo uso. En los resultados ves cuántos lo usaron.')}<div class="g">${num('dormidos','dias','Dormido desde (días)')}${num('dormidos','pct','Descuento %')}${num('dormidos','vence','Vence a los (días)')}</div>${txa('dormidos','txt')}</div>
  <div class="box">${tg('sugerido','📞 Pedido sugerido el día justo','El día que a cada cliente le toca comprar, entra en la cola con su pedido de siempre armado y un link para confirmarlo con un toque.')}</div>
  <div class="box">${tg('ofertas','🔥 Ofertas automáticas por stock','Las ofertas de "Últimas unidades" y "Liquidación" se mandan solas a los clientes que compran ese producto.')}
    <label class="chk"><input type="checkbox" id="au_crear" ${A.ofertas.crear?'checked':''} ${dis}> Crear las ofertas solas (hasta 5 por día) cuando hay sobrestock o algo por vencer</label>
    <div class="g">${num('ofertas','venc_dias','Por vencer en (días)')}${num('ofertas','pct_venc','Descuento por vencer %')}${num('ofertas','sobre_meses','Sobrestock desde (meses de stock)')}${num('ofertas','pct_sobre','Descuento sobrestock %')}${num('ofertas','max_dia','Máximo de mensajes por día')}</div>${txa('ofertas','txt')}</div>
  <div class="box">${tg('nuevos','🌱 Primeros 90 días','Para que el cliente nuevo llegue al 2° y al 3° pedido, que es cuando queda fijo.')}<div class="g">${num('nuevos','dias2','Sin 2° pedido a los (días)')}${num('nuevos','dias3','Sin 3° pedido a los (días)')}${num('nuevos','pct3','Cupón para el 3° %')}</div>${txa('nuevos','txt2','Mensaje para el 2° pedido')}${txa('nuevos','txt3','Mensaje con cupón para el 3°')}</div>
  <div class="box">${tg('prospectos','🧲 Secuencia de prospección','Cada prospecto nuevo con teléfono recibe la secuencia. Los días se cuentan desde el primer mensaje. Los que piden ser clientes desde el catálogo aparecen arriba de la cola para el alta exprés.')}${num('prospectos','max_dia','Prospectos nuevos por día',80)}${pasos('prospectos')}</div>
  <div class="box">${tg('recordatorio','📌 "Recordame en…"','El cliente lo elige al mandar su pedido (7, 15 o 30 días). Ese día entra en la cola con su pedido sugerido.')}${tg('alertaoferta','🔔 Avisame cuando esté en oferta','Cuando un producto que el cliente marcó entra en oferta.')}${txa('alertaoferta','txt')}</div>
  <div class="box">${tg('pago','💵 Después del pago','Cuando registrás un cobro y el cliente todavía no volvió a pedir.')}${txa('pago','txt')}${tg('estacional','📆 El año pasado en esta época','Lo que cada cliente compró hace un año en estas fechas y no volvió a pedir.')}${num('estacional','max_dia','Máximo por día')}${txa('estacional','txt')}</div>
  <div class="box">${tg('dejo','🧩 Productos que dejó de llevar','Productos que el cliente pedía seguido y hace 2 meses no lleva, aunque te siga comprando.')}${num('dejo','max_dia','Máximo por día')}${txa('dejo','txt')}</div>
  <div class="box">${tg('clave','👑 Cuentas clave','Si una cuenta clave compra 15 % menos que su promedio, entra arriba de la cola para llamarla.')}${tg('competencia','⚔️ Ataque a la competencia','A los clientes que en una visita dijeron que le compran a otro, les manda cuánto se ahorrarían con vos (necesita precios de competencia cargados).')}</div>
  <div class="box">${tg('reconquista','🔙 Reconquista de perdidos','Para los marcados como "Se fue a la competencia": a los 30 días un mensaje, a los 60 un cupón y a los 90 la llamada.')}${num('reconquista','pct','Cupón del día 60 %')}${txa('reconquista','txt1','Día 30')}${txa('reconquista','txt2','Día 60 (con cupón)')}${txa('reconquista','txt3','Día 90 (llamada)')}</div>
  <div class="box">${tg('entrada','🚪 Precio de entrada por categoría','Si la mayoría de los negocios de su rubro te compra una categoría y él no, le ofrece un cupón para sus próximos pedidos.')}<div class="g">${num('entrada','pct','Descuento %')}${num('entrada','usos','Pedidos con descuento')}${num('entrada','max_dia','Máximo por día')}</div>${txa('entrada','txt')}</div>
  <div class="box">${tg('acuerdo','📜 Acuerdos atrasados','Desde el día 15, a los que vienen por debajo de su compromiso del mes.')}${txa('acuerdo','txt')}</div>
  <div class="box">${tg('cierre','⏰ Aviso de cierre de pedidos','El día antes de su entrega, a los que todavía no pidieron (usa la hora de corte y los días de reparto de "Descuentos y mínimo").')}${txa('cierre','txt')}</div>
  <div class="box">${tg('volvio','📦 Volvió el stock','Cuando algo que estaba agotado vuelve a tener stock, se lo avisa a los que lo compran seguido (necesita el stock cargado).')}${num('volvio','max_dia','Máximo por día')}${txa('volvio','txt')}</div>
  <div class="box">${tg('bajo','📉 Bajó el precio','Si baja el costo de un producto (y con él su precio), se lo ofrece a los que lo compran.')}${num('bajo','max_dia','Máximo por día')}${txa('bajo','txt')}</div>
  <div class="box">${tg('cumple','🎂 Cumpleaños','Cargá el cumpleaños en la ficha del cliente (Editar). Ese día entra arriba de la cola con un cupón de regalo.')}<div class="g">${num('cumple','pct','Cupón de regalo % (0 = sin cupón)')}${num('cumple','vence','Vence a los (días)')}</div>${txa('cumple','txt')}</div>
  <div class="box">${tg('resena','⭐ Pedir reseña en Google','A los que te califican con 5 ⭐. Una sola vez por cliente.')}<label class="f">Link de tu negocio en Google (el de "Pedir reseñas" en tu Perfil de Empresa)<input data-at="resena.link" value="${esc(A.resena.link||'')}" placeholder="https://g.page/r/..." ${dis}></label>${txa('resena','txt')}</div>
  <div class="box"><h3>🚀 Lanzamiento de zona</h3><p><small>Se usa desde <b>Zonas sin cubrir → Lanzar</b>.</small></p><div class="g">${num('lanzamiento','pct','Cupón primer pedido %')}${num('lanzamiento','vence','Vence a los (días)')}</div>${txa('lanzamiento','txt')}</div>
  <div class="box">${tg('seguimiento','⏳ Seguimiento de lo que quedó sin respuesta','Presupuestos sin aceptar a los 2 días y pedidos sugeridos sin confirmar al día siguiente.')}${txa('seguimiento','txtPre','Mensaje para presupuestos')}${txa('seguimiento','txtSug','Mensaje para pedidos sugeridos')}</div>
  <div class="box">${tg('posentrega','📦 Después de la entrega','Al día siguiente de entregar: "¿llegó todo bien?" con la encuesta de un toque.')}${txa('posentrega','txt')}
    ${tg('malanota','😟 Avisarme si califican mal','Si la nota es de 3 ⭐ o menos, entra arriba de la cola para llamarlo ese mismo día.')}</div>
  <div class="box">${tg('cruzada','🔀 Venta cruzada automática','A cada cliente activo le ofrece el producto que más llevan junto con lo que él compra y nunca probó (hasta un por día por cliente).')}<div class="g">${num('cruzada','pct','Cupón para probarlo % (0 = sin cupón)')}${num('cruzada','max_dia','Máximo por día')}</div>${txa('cruzada','txt')}</div>
  <div class="box">${tg('recomendar','🤝 Pedir la recomendación en el mejor momento','Después del 3er pedido o de una encuesta de 5 ⭐. Va su link de "Recomendá y ganá". Una sola vez por cliente.')}${txa('recomendar','txt')}</div>
  <div class="box">${tg('frios','❄️ Revivir prospectos fríos','Los que dijeron que no, o terminaron la secuencia sin comprar, reciben una sola vez una propuesta distinta.')}${num('frios','dias','Después de (días quietos)')}${txa('frios','txt')}</div>
  <div class="box">${tg('carritos','🛒 Carritos sin enviar','')}${txa('carritos','txt')}${tg('miraron','👀 Miraron el catálogo y no pidieron','')}${txa('miraron','txt')}${tg('deuda','💸 Recordatorio de deuda vencida','Como máximo una vez por semana por cliente.')}${num('deuda','dias','Con más de (días de mora)')}${txa('deuda','txt')}</div>
  <div class="box"><h3>💬 Respuestas rápidas</h3><p><small>Las respuestas a lo que siempre preguntan. Aparecen en la ráfaga, en Prospectos, en el Embudo y en la Ruta. Podés usar <code>{minimo}</code> <code>{envio}</code> <code>{dias}</code> <code>{corte}</code> <code>{pago}</code> <code>{link}</code>.</small></p><div id="au_rr"></div></div>
  ${due?'<div class="box"><button id="au_g">Guardar las automatizaciones</button> <button class="alt" id="au_r">Volver a los mensajes de fábrica</button></div>':''}`;
  const{data:rrd}=await sb.from('config_app').select('valor').eq('clave','respuestas_rapidas').maybeSingle();let RR=RR_DEF;try{const j=JSON.parse(rrd?.valor||'null');if(Array.isArray(j)&&j.length)RR=j}catch(e){}
  const pintaRR=()=>{$('#au_rr').innerHTML=RR.map((r,i)=>`<div class="paso"><div class="g"><label class="f">Título<input data-rrt="${i}" value="${esc(r.t)}" ${dis}></label>${due?`<button class="alt" data-rrx="${i}">Quitar</button>`:''}</div><textarea rows="2" data-rrm="${i}" ${dis}>${esc(r.txt)}</textarea></div>`).join('')+(due?'<button class="alt" id="rr_add">+ Agregar respuesta</button>':'');
    const lee=()=>{RR=RR.map((r,i)=>({t:$(`[data-rrt="${i}"]`).value,txt:$(`[data-rrm="${i}"]`).value}))};
    $$('[data-rrx]').forEach(b=>b.onclick=()=>{lee();RR.splice(+b.dataset.rrx,1);pintaRR()});$('#rr_add')&&($('#rr_add').onclick=()=>{lee();RR.push({t:'Nueva',txt:''});pintaRR()});S._leeRR=lee};pintaRR();
  if(!due)return;
  const leer=()=>{const o=JSON.parse(JSON.stringify(A));$$('[data-ak]').forEach(c=>o[c.dataset.ak].activa=c.checked);o.ofertas.crear=$('#au_crear').checked;
    $$('[data-an]').forEach(i=>{const[k,f]=i.dataset.an.split('.');o[k][f]=Math.max(0,+i.value||0)});$$('[data-at]').forEach(t=>{const[k,f]=t.dataset.at.split('.');o[k][f]=t.value});
    for(const[k,f]of Object.values(AB_REG)){const b=String(o[k][f+'B']||'').trim();if(b&&!o[k].abDesde)o[k].abDesde=diaLocal(new Date());if(!b){o[k][f+'B']='';delete o[k].abDesde}}
    $$('[data-ps]').forEach(d=>{const k=d.dataset.ps;o[k].pasos=[...d.querySelectorAll('.paso')].map(p=>({dias:Math.max(0,+p.querySelector('[data-pd]').value||0),tipo:p.querySelector('[data-pt]').value,txt:p.querySelector('[data-pm]').value}))});return o};
  $$('[data-pa]').forEach(b=>b.onclick=()=>{const o=leer(),k=b.dataset.pa,u=o[k].pasos.slice(-1)[0];o[k].pasos.push({dias:(u?.dias||0)+7,tipo:'mensaje',txt:'¡Hola {nombre}! '});S.autoCfg=o;guardaAuto(o,true)});
  $$('[data-px]').forEach(b=>b.onclick=()=>{const o=leer(),k=b.closest('[data-ps]').dataset.ps;o[k].pasos.splice(+b.dataset.px,1);guardaAuto(o,true)});
  $('#au_g').onclick=async()=>{S._leeRR&&S._leeRR();await sb.from('config_app').upsert({clave:'respuestas_rapidas',valor:JSON.stringify(RR.filter(r=>r.t.trim()&&r.txt.trim()))});guardaAuto(leer())};
  $('#au_r').onclick=()=>{if(!confirm('¿Volver todas las reglas y mensajes a como vinieron de fábrica?'))return;guardaAuto(JSON.parse(JSON.stringify(AUTO_DEF)))}}
async function guardaAuto(o,silencio){const{error}=await sb.from('config_app').upsert({clave:'automatizaciones',valor:JSON.stringify(o)});if(error)return toast(error.message,1);if(!silencio)toast('Automatizaciones guardadas.');vAuto()}
/* ---------- Primeros 90 días ---------- */
async function vNuevos90(){const[A,H,ev]=await Promise.all([cfgAuto(),histAuto(),sb.from('envios_auto').select('clave,enviado_en').like('clave','nv%')]);if(ev.error){$('#vs').innerHTML=SQL_AUT;return}
  const E=new Set((ev.data||[]).map(x=>x.clave)),N=S.clientes.map(c=>({c,r:H.C[c.id]})).filter(x=>esNuevo(x.c,x.r)).sort((a,b)=>a.r.pri<b.r.pri?1:-1);
  const n2=N.filter(x=>x.r.n>=2).length,n3=N.filter(x=>x.r.n>=3).length,venta=N.reduce((a,x)=>a+x.r.t,0);
  const est=x=>x.r.n>=3?['b-entregado','✅ Ya es cliente fijo']:x.r.n==2?(dDesde(x.r.ult)>=A.nuevos.dias3?['b-mora30','Le toca el cupón para el 3°']:['b-pendiente','Esperando el 3° pedido']):(dDesde(x.r.ult)>=A.nuevos.dias2?['b-mora30','No hizo el 2° pedido']:['b-pendiente','Esperando el 2° pedido']);
  $('#vs').innerHTML=`<div class="kp"><div class="box"><span class="lab">Clientes nuevos (90 días)</span><span class="num">${N.length}</span><span class="det">venta ${$m(venta)}</span></div><div class="box"><span class="lab">Hicieron el 2° pedido</span><span class="num">${N.length?Math.round(n2/N.length*100):0} %</span><span class="det">${n2} de ${N.length}</span></div>
    <div class="box ok"><span class="lab">Quedaron fijos (3 pedidos)</span><span class="num">${N.length?Math.round(n3/N.length*100):0} %</span><span class="det">${n3} de ${N.length}</span></div></div>
  <div class="box"><h3>🌱 Primeros 90 días</h3><p><small>El cliente nuevo se gana en los primeros 3 pedidos. Si a los ${A.nuevos.dias2} días no hizo el 2°, le llega un mensaje para repetir. Si a los ${A.nuevos.dias3} días del 2° no hizo el 3°, un cupón de ${nf(A.nuevos.pct3)} %. Todo entra solo en la <b>Cola del día</b>.</small></p>
    ${N.length?`<div class="tw"><table><tr><th>Cliente</th><th>Pedidos</th><th>Último</th><th>Estado</th></tr>${N.map(x=>{const[b,t]=est(x);return`<tr><td><a class="lnk" data-nf="${x.c.id}"><b>${esc(x.c.razon_social)}</b></a><br><small>1° pedido ${fd(diaLocal(new Date(x.r.pri)))} · ${$m(x.r.t)}</small></td>
      <td style="white-space:nowrap;font-size:18px;letter-spacing:2px">${[1,2,3].map(k=>x.r.n>=k?'●':'○').join('')}</td><td>hace ${dDesde(x.r.ult)} d</td><td><span class="badge ${b}">${t}</span>${E.has('nv2:'+x.c.id)||E.has('nv3:'+x.c.id)?'<br><small class="sube">✓ mensaje enviado</small>':''}</td></tr>`}).join('')}</table></div>`
    :'<p><small>No hay clientes con su primer pedido en los últimos 90 días.</small></p>'}<p><button class="alt" id="nv_cola">Ir a la cola del día</button> <button class="alt" id="nv_cfg">⚙️ Cambiar días y mensajes</button></p></div>`;
  $$('#vs [data-nf]').forEach(a=>a.onclick=()=>{S.tab='clientes';shell();fichaCliente(S.clientes.find(c=>c.id==a.dataset.nf))});
  $('#nv_cola').onclick=()=>{S.vs='cola';S.colaF='nuevo';vVentas()};$('#nv_cfg').onclick=()=>{S.vs='auto';vVentas()}}
async function vQR(){const due=S.perfil.rol=='dueno';
  const[cq,vi,pr,pp,ve,H]=await Promise.all([sb.from('campanias_qr').select('*').order('creado_en',{ascending:false}),todo(()=>sb.from('qr_visitas').select('*')),todo(()=>sb.from('prospectos').select('campania,estado').not('campania','is',null)),
    todo(()=>sb.from('presupuestos').select('campania,total').not('campania','is',null)),sb.rpc('vendedores'),histAuto()]);
  if(cq.error){$('#vs').innerHTML=SQL_AUT;return}const V=ve.data||[],rubros=[...new Set(S.clientes.map(c=>c.rubro).filter(Boolean))].sort();
  const st=k=>{const cl=S.clientes.filter(c=>c.campania==k);return{vis:(vi.data||[]).filter(x=>x.codigo==k).reduce((a,x)=>a+x.n,0),alt:(pr.data||[]).filter(x=>x.campania==k).length,ped:(pp.data||[]).filter(x=>x.campania==k).length,cli:cl.length,venta:cl.reduce((a,c)=>a+(H.C[c.id]?.t||0),0)}};
  $('#vs').innerHTML=`<div class="box"><h3>🔳 QR por campaña y vendedor</h3><p><small>Cada volante, cartel, vendedor o zona lleva su propio QR al catálogo público. Así sabés cuántos lo escanearon, cuántos pidieron ser clientes, cuántos hicieron pedido y cuánto compraron.</small></p>
    ${due?`<div class="g"><label class="f">Nombre<input id="qr_n" placeholder="Ej.: Volante Belgrano octubre"></label><label class="f">Tipo<select id="qr_t">${TIPOS_QR.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>
      <label class="f">Vendedor (opcional)<select id="qr_v"><option value="">—</option>${V.map(v=>`<option value="${v.id}">${esc(v.nombre)}</option>`).join('')}</select></label><label class="f">Zona (opcional)<input id="qr_z" placeholder="Ej.: Belgrano"></label>
      <label class="f">Abrir el catálogo en el rubro (opcional)<select id="qr_r"><option value="">Todos los productos</option>${rubros.map(r=>`<option>${esc(r)}</option>`).join('')}</select></label></div><button id="qr_g">Crear QR</button>`:''}</div>
  ${(cq.data||[]).map(x=>{const s=st(x.codigo);return`<div class="box ${x.activa?'':'hecho-vi'}"><div class="bh"><h3 style="margin:0">${esc(x.nombre)}</h3><span class="badge">${esc(x.codigo)}</span></div>
    <p><small>${esc(TIPOS_QR.find(t=>t[0]==x.tipo)?.[1]||x.tipo)}${x.vendedor_id?' · '+esc(V.find(v=>v.id==x.vendedor_id)?.nombre||''):''}${x.zona?' · '+esc(x.zona):''}${x.rubro?' · rubro '+esc(x.rubro):''}${x.activa?'':' · <b>pausado</b>'}</small></p>
    <div class="kp mini"><div class="box"><span class="lab">Escaneos</span><span class="num">${s.vis}</span></div><div class="box"><span class="lab">Pidieron alta</span><span class="num">${s.alt}</span></div><div class="box"><span class="lab">Pedidos web</span><span class="num">${s.ped}</span></div><div class="box ok"><span class="lab">Clientes</span><span class="num">${s.cli}</span><span class="det">${$m(s.venta)}</span></div></div>
    <div class="fc-acc"><button class="alt" data-qd="${x.codigo}">⬇️ Descargar QR</button><button class="alt" data-qp="${x.codigo}">🖨️ Imprimir volantes</button><button class="alt" data-qc="${x.codigo}">Copiar link</button>${due?`<button class="alt" data-qa="${x.codigo}">${x.activa?'Pausar':'Activar'}</button>`:''}</div></div>`}).join('')||'<div class="box"><p><small>Todavía no creaste ningún QR.</small></p></div>'}`;
  const Q=k=>cq.data.find(x=>x.codigo==k);
  $('#qr_g')&&($('#qr_g').onclick=async()=>{const n=$('#qr_n').value.trim();if(!n)return toast('Poné un nombre.',1);let cod;
    for(let k=0;k<5;k++){cod=(norm(n).replace(/[^a-z]/g,'').slice(0,4).toUpperCase()||'QR')+Math.random().toString(36).slice(2,4).toUpperCase();if(!cq.data.some(x=>x.codigo==cod))break}
    const{error}=await sb.from('campanias_qr').insert({codigo:cod,nombre:n,tipo:$('#qr_t').value,vendedor_id:$('#qr_v').value||null,zona:$('#qr_z').value.trim()||null,rubro:$('#qr_r').value||null});if(error)return toast(error.message,1);toast('QR creado: '+cod);vQR()});
  $$('#vs [data-qa]').forEach(b=>b.onclick=async()=>{const x=Q(b.dataset.qa);await sb.from('campanias_qr').update({activa:!x.activa}).eq('codigo',x.codigo);vQR()});
  $$('#vs [data-qc]').forEach(b=>b.onclick=async()=>{const u=linkQR(Q(b.dataset.qc));try{await navigator.clipboard.writeText(u);toast('Link copiado.')}catch(e){prompt('Copiá el link:',u)}});
  $$('#vs [data-qd]').forEach(b=>b.onclick=async()=>{const x=Q(b.dataset.qd),q=await qrURL(linkQR(x),600);if(!q)return toast('No se pudo generar el QR. Probá de nuevo.',1);
    const im=new Image();im.onload=()=>{const cv=document.createElement('canvas');cv.width=680;cv.height=800;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,680,800);g.drawImage(im,40,40,600,600);
      g.fillStyle='#1c2333';g.textAlign='center';g.font='bold 34px Arial';g.fillText('Escaneá y hacé tu pedido',340,700);g.font='24px Arial';g.fillText('Sabores de mi País · '+x.codigo,340,745);
      const a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download='QR-'+x.codigo+'.png';a.click()};im.src=q});
  $$('#vs [data-qp]').forEach(b=>b.onclick=async()=>{const x=Q(b.dataset.qp),q=await qrURL(linkQR(x),400);if(!q)return toast('No se pudo generar el QR.',1);const w=window.open('','_blank');if(!w)return;
    const card=`<div class="c">${MARCA.logo?`<img class="l" src="${MARCA.logo}">`:''}<h2>¿Tenés un kiosco, almacén o dietética?</h2><p>Mirá nuestro catálogo con precios mayoristas y hacé tu pedido online.</p><img class="q" src="${q}"><b>Escaneá con la cámara</b><small>Sabores de mi País · ${esc(x.codigo)}</small></div>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Volantes ${esc(x.codigo)}</title><style>@page{size:A4;margin:8mm}body{margin:0;font-family:Arial,sans-serif}.h{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.c{border:1px dashed #999;border-radius:4mm;padding:6mm;text-align:center;height:132mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm}.l{max-height:20mm}.q{width:55mm;height:55mm}h2{font-size:15pt;margin:0}p{font-size:11pt;margin:0}small{color:#666}</style></head><body><div class="h">${card.repeat(4)}</div><script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);w.document.close()})}
async function vRuta(){S.ruN=S.ruN||8;S.ruE=S.ruE||['nuevo','contactado','interesado'];
  const{data,error}=await sb.from('prospectos').select('*').in('estado',['nuevo','contactado','visitado','interesado']).limit(3000);if(error){$('#vs').innerHTML='<p class="err">'+esc(error.message)+'</p>';return}
  const rub=[...new Set(data.map(x=>x.rubro).filter(Boolean))].sort(),hoy=diaLocal(new Date());
  const C=data.filter(x=>S.ruE.includes(x.estado)&&(!S.ruR||x.rubro==S.ruR)&&!(x.ultimo_contacto&&dDesde(x.ultimo_contacto)<3&&x.ultimo_contacto!=hoy)),con=C.filter(x=>x.lat!=null&&x.lng!=null),sin=C.length-con.length;
  let R=[];if(S.ruO&&con.length){let p=S.ruO;const pool=[...con];while(R.length<S.ruN&&pool.length){pool.sort((a,b)=>distKm(p,[+a.lat,+a.lng])-distKm(p,[+b.lat,+b.lng]));const x=pool.shift();x._d=distKm(p,[+x.lat,+x.lng]);R.push(x);p=[+x.lat,+x.lng]}}
  S.ruL=R;const km=R.reduce((a,x)=>a+x._d,0),SCp=await cargarPuntajes().catch(()=>null);
  $('#vs').innerHTML=`<div class="box"><h3>🚶 Ruta de prospección</h3><p><small>Arma el recorrido del día con los prospectos más cercanos entre sí, empezando desde donde estás. En cada negocio marcás cómo te fue con un toque y queda registrado.</small></p>
    <div class="g"><label class="f">Salgo desde<input id="ru_o" placeholder="Dirección (o usá tu ubicación)" value="${esc(S.ruOt||'')}"></label><label class="f">Cuántos negocios<select id="ru_n">${[5,8,10,15].map(v=>`<option ${S.ruN==v?'selected':''}>${v}</option>`).join('')}</select></label>
      <label class="f">Rubro<select id="ru_r"><option value="">Todos</option>${rub.map(r=>`<option ${S.ruR==r?'selected':''}>${esc(r)}</option>`).join('')}</select></label></div>
    <div class="chk-row">${[['nuevo','Nuevos'],['contactado','Contactados'],['interesado','Interesados'],['visitado','Ya visitados']].map(([k,t])=>`<label class="chk"><input type="checkbox" class="ru_e" value="${k}" ${S.ruE.includes(k)?'checked':''}> ${t}</label>`).join('')}</div>
    <button id="ru_gps">📍 Usar mi ubicación</button> <button class="alt" id="ru_go">Armar ruta desde la dirección</button>
    <p><small>${con.length} prospectos con ubicación${sin?` · ${sin} sin ubicación (cargalos desde "Buscar negocios" o agregales la dirección)`:''}.</small></p></div>
  ${R.length?`<div class="box"><div class="bh"><h3 style="margin:0">Tu ruta: ${R.length} negocios · ~${nf(Math.round(km*10)/10)} km</h3><button class="wa" id="ru_maps">Abrir en Google Maps</button></div>
    <div class="ag">${R.map((x,i)=>`<div class="vi" id="ru_${x.id}"><span class="badge b-pendiente" style="font-size:16px">${i+1}</span><div><b>${esc(x.nombre)}</b> ${SCp?badgeP(SCp(x)):''} <small>· ${esc(x.rubro||'')} · ${x._d<1?Math.round(x._d*1000)+' m':nf(Math.round(x._d*10)/10)+' km'}</small><br><small>${esc(x.domicilio||'')}${x.telefono?' · '+esc(x.telefono):''} · <span class="badge">${esc(EST_PR[x.estado]||x.estado)}</span></small><br><small>💬 ${esc(guionR(x.rubro))}</small></div>
      <div class="acc"><button class="alt" data-rv="${x.id}" data-r="si">👍 Le interesa</button><button class="alt" data-rv="${x.id}" data-r="volver">🔁 Volver</button><button class="alt" data-rv="${x.id}" data-r="no">👎 No</button><button data-ra="${x.id}">🧾 Hizo pedido</button>${x.telefono?`<button class="alt" data-rq2="${x.id}">💬</button>`:''}</div></div>`).join('')}</div></div>`
    :S.ruO?'<div class="box"><p><small>No hay prospectos con ubicación para esos filtros.</small></p></div>':''}`;
  $('#ru_n').onchange=e=>{S.ruN=+e.target.value;vRuta()};$('#ru_r').onchange=e=>{S.ruR=e.target.value;vRuta()};
  $$('.ru_e').forEach(c=>c.onchange=()=>{S.ruE=[...$$('.ru_e')].filter(x=>x.checked).map(x=>x.value);vRuta()});
  $('#ru_gps').onclick=()=>{if(!navigator.geolocation)return toast('Tu navegador no da la ubicación. Escribí la dirección.',1);toast('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(p=>{S.ruO=[p.coords.latitude,p.coords.longitude];S.ruOt='';vRuta()},()=>toast('No se pudo obtener la ubicación. Escribí la dirección.',1),{enableHighAccuracy:true,timeout:15000})};
  $('#ru_go').onclick=async()=>{const z=$('#ru_o').value.trim();if(!z)return toast('Escribí desde dónde salís.',1);let c;
    try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q='+encodeURIComponent(z),{headers:{'Accept-Language':'es'}});c=(await r.json())[0]}catch(e){}
    if(!c)return toast('No encontré esa dirección.',1);S.ruO=[+c.lat,+c.lon];S.ruOt=z;vRuta()};
  $('#ru_maps')&&($('#ru_maps').onclick=()=>{const P=R.slice(0,10).map(x=>x.lat+','+x.lng);window.open('https://www.google.com/maps/dir/?api=1&travelmode=walking&origin='+S.ruO.join(',')+'&destination='+P[P.length-1]+(P.length>1?'&waypoints='+encodeURIComponent(P.slice(0,-1).join('|')):''),'_blank')});
  const marca=(id,html)=>{const d=$('#ru_'+id);if(d){d.classList.add('hecho-vi');d.querySelector('.acc').innerHTML=html}};
  $$('#vs [data-rv]').forEach(b=>b.onclick=async()=>{const x=R.find(y=>y.id==b.dataset.rv),r=b.dataset.r,M={si:['interesado',3,'Le interesó'],volver:['visitado',7,'Volver otro día'],no:['no_interesado',null,'No le interesa']}[r];
    const nota=prompt('Nota de la visita (opcional):','');if(nota===null)return;
    const{error}=await sb.from('prospectos').update({estado:M[0],ultimo_contacto:hoy,proximo_seguimiento:M[1]?diaLocal(new Date(Date.now()+M[1]*864e5)):null,observaciones:('Visita '+fd(hoy)+': '+M[2]+(nota?' — '+nota:'')+(x.observaciones?'\n'+x.observaciones:'')).slice(0,1000),actualizado_en:new Date().toISOString()}).eq('id',x.id);
    if(error)return toast(error.message,1);sb.from('envios_auto').insert({clave:'vis:'+x.id+':'+hoy,tipo:'visita',prospecto_id:x.id,detalle:'Visita: '+M[2]}).then(()=>{});marca(x.id,'<small class="sube">✓ '+M[2]+'</small>')});
  $$('#vs [data-rq2]').forEach(b=>b.onclick=()=>respuestasRapidas(R.find(y=>y.id==b.dataset.rq2)));
  $$('#vs [data-ra]').forEach(b=>b.onclick=async()=>{const x=R.find(y=>y.id==b.dataset.ra);if(!confirm('¿Dar de alta a «'+x.nombre+'» y cargarle el pedido?'))return;const c=await altaExpres(x,null);if(!c)return;
    marca(x.id,'<small class="sube">✓ Ya es cliente</small>');if(confirm('¿Cargar el pedido de '+c.razon_social+' ahora?')){S.preCli=c;S.tab='pedidos';shell()}})}
async function vCaptacion(){S.caP=S.caP||28;const[pr,H,ve]=await Promise.all([todo(()=>sb.from('prospectos').select('*').order('creado_en')),histAuto(),sb.rpc('vendedores')]);
  if(pr.error){$('#vs').innerHTML='<p class="err">'+esc(pr.error.message)+'</p>';return}const desde=Date.now()-S.caP*864e5,en=f=>f&&new Date(f)>=desde;
  const P=pr.data.filter(x=>en(x.creado_en)),conv=pr.data.filter(x=>x.estado=='cliente'&&en(x.actualizado_en));
  const N=S.clientes.filter(c=>{const r=H.C[c.id];return r&&en(r.pri)&&dDesde(r.pri)<=S.caP&&(!c.creado_en||new Date(c.creado_en)>=desde-60*864e5)});
  const venta=N.reduce((a,c)=>a+H.C[c.id].t,0),G={};
  for(const x of P){const k=origenPr(x),g=G[k]=G[k]||{p:0,c:0,v:0};g.p++}
  for(const c of N){const k=origenCli(c),g=G[k]=G[k]||{p:0,c:0,v:0};g.c++;g.v+=H.C[c.id].t}
  const sem=Math.ceil(S.caP/7),W=[...Array(sem)].map((_,i)=>{const a=Date.now()-(sem-i)*7*864e5,b=a+7*864e5;return{t:new Date(a).toLocaleDateString('es-AR',{day:'numeric',month:'numeric'}),p:pr.data.filter(x=>{const t=new Date(x.creado_en);return t>=a&&t<b}).length,c:S.clientes.filter(c=>{const r=H.C[c.id];if(!r)return false;const t=new Date(r.pri);return t>=a&&t<b}).length}});
  const mx=Math.max(1,...W.map(w=>Math.max(w.p,w.c))),VD={};for(const c of N){const k=c.vendedor_id||'—';const g=VD[k]=VD[k]||{n:0,v:0};g.n++;g.v+=H.C[c.id].t}
  $('#vs').innerHTML=`<div class="sub">${[[28,'Últimas 4 semanas'],[90,'Últimos 3 meses'],[180,'Últimos 6 meses']].map(([v,t])=>`<button class="${S.caP==v?'':'alt'}" data-cp="${v}">${t}</button>`).join('')}</div>
  <div class="kp"><div class="box"><span class="lab">Prospectos nuevos</span><span class="num">${P.length}</span><span class="det">${P.filter(x=>x.estado!='nuevo').length} ya contactados</span></div><div class="box ok"><span class="lab">Pasaron a cliente</span><span class="num">${conv.length}</span><span class="det">en el período</span></div>
    <div class="box"><span class="lab">Clientes nuevos que compraron</span><span class="num">${N.length}</span><span class="det">primer pedido en el período</span></div><div class="box ok"><span class="lab">Venta de clientes nuevos</span><span class="num">${$m0(venta)}</span><span class="det">${N.length?'promedio '+$m(venta/N.length):''}</span></div></div>
  <div class="box"><h3>📊 Semana a semana</h3><div class="cbar">${W.map(w=>`<div class="cb"><div class="bars"><span class="bp" style="height:${Math.round(w.p/mx*100)}%" title="${w.p} prospectos"></span><span class="bc" style="height:${Math.round(w.c/mx*100)}%" title="${w.c} clientes"></span></div><small>${w.t}</small><small><b>${w.p}</b>/<b class="sube">${w.c}</b></small></div>`).join('')}</div>
    <p><small><span class="leg bp"></span> Prospectos nuevos <span class="leg bc"></span> Clientes nuevos (primer pedido)</small></p></div>
  <div class="dos"><div class="box"><h3>🧭 ¿De dónde vienen?</h3><div class="tw"><table><tr><th>Origen</th><th class="n">Prospectos</th><th class="n">Clientes nuevos</th><th class="n">Venta</th></tr>${Object.entries(G).sort((a,b)=>b[1].v-a[1].v||b[1].p-a[1].p).map(([k,g])=>`<tr><td>${esc(k)}</td><td class="n">${g.p}</td><td class="n">${g.c}</td><td class="n">${$m(g.v)}</td></tr>`).join('')||'<tr><td colspan="4"><small>Sin datos en el período.</small></td></tr>'}</table></div></div>
    <div class="box"><h3>👤 Clientes nuevos por vendedor</h3>${Object.keys(VD).length?`<table>${Object.entries(VD).sort((a,b)=>b[1].v-a[1].v).map(([id,g])=>`<tr><td>${esc((ve.data||[]).find(v=>v.id==id)?.nombre||'Sin vendedor')}</td><td class="n">${g.n}</td><td class="n">${$m(g.v)}</td></tr>`).join('')}</table>`:'<p><small>Sin clientes nuevos en el período.</small></p>'}
      <h3 style="margin-top:14px">🆕 Los clientes nuevos</h3>${N.length?N.sort((a,b)=>H.C[b.id].t-H.C[a.id].t).slice(0,15).map(c=>`<div class="bh cpf"><span>${esc(c.razon_social)} <small>· ${esc(origenCli(c))}</small></span><b>${$m(H.C[c.id].t)}</b></div>`).join(''):'<p><small>—</small></p>'}</div></div>`;
  $('#vs').insertAdjacentHTML('beforeend','<div class="box" id="ca_metas"></div>');metasBox().catch(()=>{});
  $$('#vs [data-cp]').forEach(b=>b.onclick=()=>{S.caP=+b.dataset.cp;vCaptacion()})}
async function progBox(){const box=$('#cp_prog');if(!box)return;const L=(await campProg()).sort((a,b)=>a.fecha<b.fecha?-1:1),hoy=diaLocal(new Date());
  box.innerHTML=L.length?`<div class="box"><h3>📅 Campañas programadas</h3>${L.map(x=>`<div class="bh cpf"><span><b>${esc(x.nombre)}</b> <small>· ${x.fecha<=hoy?'en la cola desde el '+fd(x.fecha):'sale el '+fd(x.fecha)} · ${x.ids.length} clientes</small></span><button class="alt" data-cpx="${x.id}">Borrar</button></div>`).join('')}<p><small>El día elegido aparecen en la <b>Cola del día</b> (quedan 3 días).</small></p></div>`:'';
  $$('#cp_prog [data-cpx]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Borrar esta campaña programada?'))return;if(await guardaCampProg(L.filter(x=>x.id!=b.dataset.cpx)))progBox()})}
async function metasBox(){const box=$('#ca_metas');if(!box)return;const R=await datosMetas(),M=R.M||METAS_DEF,due=S.perfil.rol=='dueno';
  box.innerHTML=`<h3>🎯 Metas de captación semanales</h3><p><small>Se muestran en Inicio con su avance de lunes a sábado y te avisa si vas atrasado.${R.M?'':' <b>Todavía no las activaste.</b>'}</small></p>
    <div class="g">${[['contactados','Prospectos contactados'],['visitas','Visitas a prospectos'],['nuevos','Clientes nuevos (primer pedido)']].map(([k,t])=>`<label class="f">${t}<input type="number" min="0" data-mt="${k}" value="${M[k]??0}" ${due?'':'disabled'}>${R.M?`<small>esta semana: <b>${R.v[k]}</b></small>`:''}</label>`).join('')}</div>
    ${due?`<button id="mt_g">${R.M?'Guardar metas':'Activar metas'}</button>${R.M?' <button class="alt" id="mt_off">Desactivar</button>':''}`:''}`;
  $('#mt_g')&&($('#mt_g').onclick=async()=>{const o={};$$('[data-mt]').forEach(i=>o[i.dataset.mt]=Math.max(0,+i.value||0));const{error}=await sb.from('config_app').upsert({clave:'metas_captacion',valor:JSON.stringify(o)});if(error)return toast(error.message,1);toast('Metas guardadas: las ves en Inicio.');metasBox()});
  $('#mt_off')&&($('#mt_off').onclick=async()=>{await sb.from('config_app').upsert({clave:'metas_captacion',valor:''});metasBox()})}
/* Zonas sin cubrir */
async function vCobertura(){const C=S.clientes.filter(c=>c.lat!=null&&c.lng!=null);
  if(C.length<3){$('#vs').innerHTML='<div class="box"><h3>🧭 Zonas sin cubrir</h3><p><small>Para esto hacen falta al menos 3 clientes ubicados en el mapa. Ubicalos en <b>Clientes → Mapa</b> (botón "Ubicar por su domicilio").</small></p></div>';return}
  const{data:pr}=await todo(()=>sb.from('prospectos').select('id,nombre,lat,lng,estado').not('lat','is',null));const P=(pr||[]).filter(x=>!['cliente','no_interesado'].includes(x.estado));
  const dLa=.011,dLo=.013,key=(la,lo)=>Math.floor(la/dLa)+':'+Math.floor(lo/dLo),G={};
  for(const c of C){const k=key(+c.lat,+c.lng);(G[k]=G[k]||{c:[],p:0}).c.push(c)}const PG={};for(const x of P){const k=key(+x.lat,+x.lng);PG[k]=(PG[k]||0)+1}
  const cand={};for(const k of Object.keys(G)){const[i,j]=k.split(':').map(Number);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const n=(i+a)+':'+(j+b);if(G[n])continue;const z=cand[n]=cand[n]||{k:n,v:0,near:[]};z.v+=G[k].c.length;z.near.push(...G[k].c)}}
  const S2=Object.values(cand).map(z=>{const[i,j]=z.k.split(':').map(Number);return{...z,la:(i+.5)*dLa,lo:(j+.5)*dLo,p:PG[z.k]||0,sc:z.v+(PG[z.k]||0)*.5}}).sort((a,b)=>b.sc-a.sc).slice(0,8);
  const lab=z=>{const n=z.near.sort((a,b)=>distKm([z.la,z.lo],[+a.lat,+a.lng])-distKm([z.la,z.lo],[+b.lat,+b.lng]))[0];return 'Cerca de '+n.razon_social+(n.ciudad?' ('+n.ciudad+')':n.domicilio?' ('+n.domicilio+')':'')};
  $('#vs').innerHTML=`<div class="box"><h3>🧭 Zonas sin cubrir</h3><p><small>En verde, las zonas (cuadras de ~1 km) donde ya tenés clientes. En naranja, las zonas vecinas donde todavía no tenés ninguno: son las más fáciles de conquistar porque ya pasás cerca con el reparto.</small></p><div id="cv_m" style="height:380px;border-radius:12px"></div></div>
    <div class="box"><h3>📍 Dónde salir a buscar</h3>${S2.map((z,i)=>`<div class="bh cpf"><span><b>${i+1}. ${esc(lab(z))}</b><br><small>${z.v} ${z.v==1?'cliente':'clientes'} alrededor${z.p?' · '+z.p+' prospectos ya cargados':''}</small></span><span><button class="alt" data-cvb="${i}">🔎 Buscar negocios</button> <button class="alt" data-cvr="${i}">🚶 Ruta</button> <button class="alt" data-cvl="${i}">🚀 Lanzar</button></span></div>`).join('')||'<p><small>No encontré zonas vecinas libres.</small></p>'}<p><small>🚀 <b>Lanzar</b>: a todos los prospectos con teléfono de esa zona les llega "¡Llegamos a tu barrio!" con un cupón para el primer pedido.</small></p></div><div id="cv_lz"></div>`;
  $$('#vs [data-cvl]').forEach(b=>b.onclick=()=>{const z=S2[+b.dataset.cvl];lanzarZona(z,lab(z))});lanzBox($('#cv_lz')).catch(()=>{});
  $$('#vs [data-cvb]').forEach(b=>b.onclick=()=>{const z=S2[+b.dataset.cvb];S.bnZ=z.la.toFixed(5)+', '+z.lo.toFixed(5);S.bnR=1;S.vs='buscarneg';vVentas()});
  $$('#vs [data-cvr]').forEach(b=>b.onclick=()=>{const z=S2[+b.dataset.cvr];S.ruO=[z.la,z.lo];S.ruOt='';S.vs='ruta';vVentas()});
  try{if(!window.L){const l=document.createElement('link');l.rel='stylesheet';l.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(l);await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js')}}
  catch(e){$('#cv_m').innerHTML='<p class="err" style="padding:12px">No se pudo cargar el mapa.</p>';return}
  const map=L.map('cv_m');L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);const B=[];
  for(const[k,g]of Object.entries(G)){const[i,j]=k.split(':').map(Number),r=[[i*dLa,j*dLo],[(i+1)*dLa,(j+1)*dLo]];B.push(...r);L.rectangle(r,{color:'#1d7a46',weight:1,fillOpacity:Math.min(.6,.15+g.c.length*.08)}).addTo(map).bindTooltip(g.c.length+' clientes')}
  S2.forEach((z,i)=>{const[a,b]=z.k.split(':').map(Number);L.rectangle([[a*dLa,b*dLo],[(a+1)*dLa,(b+1)*dLo]],{color:'#d97706',weight:2,fillOpacity:.25,dashArray:'4'}).addTo(map).bindTooltip((i+1)+'. '+lab(z))});
  for(const x of P)L.circleMarker([+x.lat,+x.lng],{radius:4,color:'#6b3fa0'}).addTo(map).bindTooltip(x.nombre);
  map.fitBounds(B,{padding:[20,20]})}
/* Exportar contactos para WhatsApp Business */
async function vContactos(){S.ctx=S.ctx||{cli:true,pro:false,g:'todos'};const{data:pr}=await sb.from('prospectos').select('nombre,telefono,rubro,zona,estado').in('estado',['nuevo','contactado','visitado','interesado']).not('telefono','is',null).limit(5000);
  const rub=[...new Set([...S.clientes.map(c=>c.rubro),...(pr||[]).map(x=>x.rubro)].filter(Boolean).map(r=>cap1(r.trim())))].sort();
  const L=()=>{const o=[];if(S.ctx.cli)for(const c of S.clientes)if(c.telefono&&telWA(c.telefono))o.push({n:c.razon_social,t:telWA(c.telefono),r:cap1((c.rubro||'').trim()),z:c.ciudad||c.zona||'',g:'Cliente'});
    if(S.ctx.pro)for(const x of pr||[])if(telWA(x.telefono))o.push({n:x.nombre,t:telWA(x.telefono),r:cap1((x.rubro||'').trim()),z:x.zona||'',g:'Prospecto'});
    return o.filter(x=>S.ctx.g=='todos'||x.r==S.ctx.g)};
  const draw=()=>{const X=L();$('#vs').innerHTML=`<div class="box"><h3>📇 Contactos para WhatsApp Business</h3><p><small>Las <b>listas de difusión</b> de WhatsApp solo le llegan a quien tiene tu número agendado, y vos tenés que tener el suyo. Descargá este archivo, importalo en los contactos del celular y después armá las listas por rubro o zona eligiendo los contactos (cada lista admite hasta 256).</small></p>
    <div class="chk-row"><label class="chk"><input type="checkbox" id="ct_c" ${S.ctx.cli?'checked':''}> Clientes</label><label class="chk"><input type="checkbox" id="ct_p" ${S.ctx.pro?'checked':''}> Prospectos activos</label></div>
    <label class="f">Grupo<select id="ct_g"><option value="todos">Todos</option>${rub.map(r=>`<option ${S.ctx.g==r?'selected':''}>${esc(r)}</option>`).join('')}</select></label>
    <p><b>${X.length}</b> contactos${X.length>256?' · <small>⚠️ más de 256: WhatsApp los va a pedir en varias listas</small>':''}</p>
    <div class="fc-acc"><button id="ct_v">⬇️ Descargar para el celular (.vcf)</button><button class="alt" id="ct_cs">⬇️ Descargar para Google Contactos (.csv)</button></div>
    <ol><li><small>En el Samsung: abrí el archivo .vcf descargado → <b>Importar</b> a Contactos (o subí el .csv en contacts.google.com → Importar).</small></li><li><small>En WhatsApp Business: <b>⋮ → Nueva difusión</b> y elegí los contactos (todos quedan con "Sabores · Rubro" en la empresa, para encontrarlos fácil).</small></li><li><small>Pediles que te agenden: en el primer mensaje de la Cola ya va tu nombre.</small></li></ol></div>`;
    $('#ct_c').onchange=e=>{S.ctx.cli=e.target.checked;draw()};$('#ct_p').onchange=e=>{S.ctx.pro=e.target.checked;draw()};$('#ct_g').onchange=e=>{S.ctx.g=e.target.value;draw()};
    const bajar=(txt,nom,tipo)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:tipo}));a.download=nom;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
    const nomA='contactos-sabores'+(S.ctx.g!='todos'?'-'+norm(S.ctx.g).replace(/[^a-z0-9]+/g,'-'):'');
    const vc=s=>String(s||'').replace(/([,;\\])/g,'\\$1').replace(/\n/g,' ');
    $('#ct_v').onclick=()=>{if(!X.length)return toast('No hay contactos.',1);bajar(X.map(x=>['BEGIN:VCARD','VERSION:3.0','FN:'+vc(x.n),'N:'+vc(x.n)+';;;;','ORG:'+vc('Sabores · '+(x.r||x.g)),'TEL;TYPE=CELL:+'+x.t,'CATEGORIES:'+['Sabores',x.g,x.r,x.z].filter(Boolean).map(vc).join(','),'END:VCARD'].join('\r\n')).join('\r\n'),nomA+'.vcf','text/vcard')};
    $('#ct_cs').onclick=()=>{if(!X.length)return toast('No hay contactos.',1);const q=v=>'"'+String(v||'').replace(/"/g,'""')+'"';
      bajar('﻿Name,Organization 1 - Name,Phone 1 - Type,Phone 1 - Value,Group Membership\n'+X.map(x=>[x.n,'Sabores · '+(x.r||x.g),'Mobile','+'+x.t,['Sabores',x.g,x.r].filter(Boolean).join(' ::: ')].map(q).join(',')).join('\n'),nomA+'.csv','text/csv')}};
  draw()}
/* Modo llamadas */
async function vLlamadas(){const[{data,error},sc]=await Promise.all([sb.from('prospectos').select('*').in('estado',['nuevo','contactado','visitado','interesado']).not('telefono','is',null).limit(3000),cargarPuntajes()]);
  if(error){$('#vs').innerHTML='<p class="err">'+esc(error.message)+'</p>';return}const hoy=diaLocal(new Date());
  const L=data.filter(x=>!(x.ultimo_contacto&&dDesde(x.ultimo_contacto)<3)&&!(x.proximo_seguimiento&&x.proximo_seguimiento>hoy)).map(x=>({x,s:sc(x)})).sort((a,b)=>b.s-a.s).slice(0,60);let i=0,hechas=0;
  const draw=()=>{if(i>=L.length){$('#vs').innerHTML=`<div class="box" style="text-align:center"><h3>📞 ¡Listo!</h3><p>Registraste <b>${hechas}</b> ${hechas==1?'llamada':'llamadas'}.${L.length?'':' No hay prospectos para llamar ahora (con teléfono y sin contacto en los últimos 3 días).'}</p><button class="alt" id="ll_r">Volver a empezar</button></div>`;$('#ll_r').onclick=vLlamadas;return}
    const{x,s}=L[i],t=String(x.telefono).replace(/[^\d+]/g,'');
    $('#vs').innerHTML=`<div class="box"><div class="bh"><small>${i+1} de ${L.length} · ordenados por puntaje</small>${badgeP(s)}</div><div class="rfbar"><span style="width:${Math.round(i/L.length*100)}%"></span></div>
      <h2 style="margin:10px 0 2px">${esc(x.nombre)}</h2><p style="margin:0"><small>${esc([x.rubro,x.domicilio,x.zona].filter(Boolean).join(' · '))} · <span class="badge">${esc(EST_PR[x.estado]||x.estado)}</span></small></p>${x.observaciones?`<p><small><i>${esc(String(x.observaciones).slice(0,200))}</i></small></p>`:''}
      <a class="btnl wa big" style="display:inline-block;margin:10px 0" href="tel:${esc(t)}">📞 Llamar ${esc(x.telefono)}</a>
      <div class="guion"><b>Guion</b><ol><li>Hola, ¿hablo con el encargado de <b>${esc(x.nombre)}</b>? Te llamo de <b>Sabores de mi País</b>, distribuidora de alimentos de la zona.</li><li>${esc(guionR(x.rubro))}</li><li>¿Te paso el catálogo por WhatsApp con los precios? Para el primer pedido tenemos un kit de bienvenida con descuento.</li><li>¿Qué día te queda bien que pase a dejarte una muestra?</li></ol></div>
      <label class="f">Nota (opcional)<input id="ll_n" placeholder="Ej.: le compra a Distri Norte, volver a llamar el lunes"></label>
      <div class="fc-acc"><button data-lr="si">👍 Interesado</button><button class="alt" data-lr="volver">🔁 Volver a llamar</button><button class="alt" data-lr="noat">📵 No atendió</button><button class="alt" data-lr="no">👎 No le interesa</button><button class="alt" id="ll_w">💬 WhatsApp</button><button class="alt" id="ll_s">Saltear</button></div></div>`;
    $('#ll_s').onclick=()=>{i++;draw()};$('#ll_w').onclick=()=>respuestasRapidas(x);
    $$('#vs [data-lr]').forEach(b=>b.onclick=async()=>{const r=b.dataset.lr,M={si:['interesado',2,'Interesado'],volver:[x.estado=='nuevo'?'contactado':x.estado,3,'Volver a llamar'],noat:[x.estado,1,'No atendió'],no:['no_interesado',null,'No le interesa']}[r],n=$('#ll_n').value.trim();
      let dias=M[1];if(r=='volver'){const v=prompt('¿En cuántos días lo volvés a llamar?','3');if(v===null)return;dias=Math.max(1,+v||3)}
      const{error}=await sb.from('prospectos').update({estado:M[0],ultimo_contacto:r=='noat'?x.ultimo_contacto:hoy,proximo_seguimiento:dias?diaLocal(new Date(Date.now()+dias*864e5)):null,observaciones:('Llamada '+fd(hoy)+': '+M[2]+(n?' — '+n:'')+(x.observaciones?'\n'+x.observaciones:'')).slice(0,1000),actualizado_en:new Date().toISOString()}).eq('id',x.id);
      if(error)return toast(error.message,1);if(r!='noat')sb.from('envios_auto').insert({clave:'ll:'+x.id+':'+hoy,tipo:'llamada',prospecto_id:x.id,detalle:'Llamada: '+M[2]}).then(()=>{});hechas++;i++;draw()})};
  draw()}
/* Lanzamiento de zona */
async function lanzarZona(z,etq){const A=await cfgAuto(),{data:pr}=await sb.from('prospectos').select('id,nombre,telefono,lat,lng,estado').in('estado',['nuevo','contactado','visitado','interesado']).not('lat','is',null);
  const P=(pr||[]).filter(x=>x.telefono&&distKm([z.la,z.lo],[+x.lat,+x.lng])<=1.2);
  if(!P.length){if(confirm('No hay prospectos con teléfono en esa zona todavía. ¿Buscamos negocios ahí primero?')){S.bnZ=z.la.toFixed(5)+', '+z.lo.toFixed(5);S.bnR=1;S.vs='buscarneg';vVentas()}return}
  if(!confirm(`🚀 Lanzar "${etq}":\n${P.length} prospectos reciben "¡Llegamos a tu barrio!" con un cupón de ${nf(A.lanzamiento.pct)} % para el primer pedido (válido ${A.lanzamiento.vence} días). ¿Seguimos?`))return;
  const cod='BARRIO'+Math.random().toString(36).slice(2,6).toUpperCase(),hasta=diaLocal(new Date(Date.now()+A.lanzamiento.vence*864e5));
  let{error}=await sb.from('cupones').insert({codigo:cod,descuento_pct:A.lanzamiento.pct,hasta,solo_nuevos:true,usos_max:null,nota:'Lanzamiento: '+etq});if(error&&/nota/.test(error.message))({error}=await sb.from('cupones').insert({codigo:cod,descuento_pct:A.lanzamiento.pct,hasta,solo_nuevos:true,usos_max:null}));
  if(error)return toast(error.message,1);const{lanzamientos:LZ}=await cfgVarios(['lanzamientos']);const N=[...(LZ||[]).filter(x=>dDesde(x.fecha)<=60),{id:String(Date.now()),zona:etq,fecha:diaLocal(new Date()),cupon:cod,hasta,ids:P.map(x=>x.id)}];
  const{error:e2}=await sb.from('config_app').upsert({clave:'lanzamientos',valor:JSON.stringify(N)});if(e2)return toast(e2.message,1);toast('🚀 Zona lanzada: '+P.length+' mensajes en la Cola del día (cupón '+cod+').');S.vs='cola';S.colaF='lanzamiento';vVentas()}
async function lanzBox(box){if(!box)return;const{lanzamientos:LZ}=await cfgVarios(['lanzamientos']);if(!LZ?.length){box.innerHTML='';return}
  const ids=[...new Set(LZ.flatMap(x=>x.ids))].slice(0,1000),[{data:pr},{data:cu}]=await Promise.all([sb.from('prospectos').select('id,estado').in('id',ids),sb.from('cupones_usos').select('codigo').in('codigo',LZ.map(x=>x.cupon))]);
  box.innerHTML=`<div class="box"><h3>🚀 Zonas lanzadas</h3>${LZ.slice().reverse().map(x=>`<div class="bh cpf"><span><b>${esc(x.zona)}</b> <small>· ${fd(x.fecha)} · cupón ${esc(x.cupon)}</small></span><small>${x.ids.length} prospectos · <b>${(pr||[]).filter(p=>x.ids.includes(p.id)&&p.estado=='cliente').length}</b> ya clientes · ${(cu||[]).filter(u=>u.codigo==x.cupon).length} usaron el cupón</small></div>`).join('')}</div>`}
/* ---------- 1 y 4. Ataque a la competencia y reconquista ---------- */
async function vAtaque(){const due=S.perfil.rol=='dueno';const[CP,H]=await Promise.all([preciosComp(),histAuto()]);await cargarPromos();const mm=S.margenMin??15,hoy=diaLocal(new Date());
  const filas=Object.entries(CP).map(([pid,R])=>{const p=S.productos.find(x=>String(x.producto_id)==pid);if(!p)return null;const mio=precioLista(pid,'mayorista'),min=Math.min(...R.map(r=>+r.precio)),best=R.find(r=>+r.precio==min);
    const mgI=min>0?(1-(+p.costo||0)/min)*100:0;return{pid,p,mio,min,best,dif:mio&&min?(mio-min)/min*100:0,mgI}}).filter(Boolean).sort((a,b)=>a.dif-b.dif);
  const gan=filas.filter(x=>x.dif<0),pie=filas.filter(x=>x.dif>0);
  const perd=S.clientes.filter(c=>c.perdido_en).map(c=>({c,d:dDesde(c.perdido_en)}));
  const T=S.clientes.map(c=>({c,a:ahorroCliente(c,H,CP)})).filter(x=>x.a&&x.c.telefono&&x.c.token_pedidos).sort((a,b)=>(!!b.c.perdido_en)-(!!a.c.perdido_en)||b.a.ah-a.a.ah);
  const yaIg=pid=>S.promos.find(r=>r.alcance=='producto'&&String(r.alcance_valor)==pid&&r.nombre.startsWith('Igualamos')&&(!r.hasta||r.hasta>=hoy));
  $('#vs').innerHTML=`<div class="kp"><div class="box ok"><span class="lab">Productos donde sos más barato</span><span class="num">${gan.length}</span></div><div class="box ${pie.length?'alerta':''}"><span class="lab">Donde la competencia es más barata</span><span class="num">${pie.length}</span></div><div class="box"><span class="lab">Clientes a atacar</span><span class="num">${T.length}</span><span class="det">ahorrarían ${$m(T.reduce((a,x)=>a+x.a.ah,0))}/mes</span></div><div class="box ${perd.length?'alerta':''}"><span class="lab">Perdidos a la competencia</span><span class="num">${perd.length}</span></div></div>
  ${filas.length?'':'<div class="aviso">Cargá precios de la competencia en <b>Analizar → 🏁 Competencia</b> para que esto funcione.</div>'}
  <div class="box"><div class="bh"><h3 style="margin:0">⚔️ Clientes a los que les conviene comprarte más</h3>${T.length?`<button class="wa" id="at_go">▶ Ráfaga (${Math.min(T.length,40)})</button>`:''}</div><p><small>Para cada cliente, lo que se ahorra por mes con tus precios frente a la competencia, en los productos que él compra. Primero los que se fueron a la competencia.</small></p>
    ${T.slice(0,40).map(x=>`<div class="bh cpf"><span><b>${esc(x.c.razon_social)}</b>${x.c.perdido_en?' <span class="badge b-mora30">perdido</span>':''}<br><small>Ahorra ~${$m(x.a.ah)}/mes vs ${esc(x.a.competidor)} en ${x.a.prods.slice(0,3).map(nomProd).map(esc).join(', ')}</small></span><button class="alt wa" data-atw="${x.c.id}">WhatsApp</button></div>`).join('')||'<p><small>Todavía no hay clientes con ahorro calculable.</small></p>'}</div>
  <div class="box"><h3>🎯 Donde la competencia está más barata</h3><p><small><b>Igualar</b> crea una oferta por 30 días con el precio de la competencia, solo si tu margen no baja de tu mínimo (${nf(mm)} %).</small></p>
    ${pie.length?`<div class="tw"><table><tr><th>Producto</th><th class="n">Tu precio</th><th class="n">Competencia</th><th class="n">Margen si igualás</th><th></th></tr>${pie.map(x=>`<tr><td>${esc(x.p.descripcion)}</td><td class="n">${$m(x.mio)}</td><td class="n">${$m(x.min)}<br><small>${esc(x.best.competidor)}</small></td><td class="n ${x.mgI<mm?'baja':'sube'}">${nf(Math.round(x.mgI*10)/10)} %</td>
      <td>${yaIg(x.pid)?'<small class="sube">✓ igualado</small>':x.mgI>=mm&&due?`<button class="alt" data-ig="${x.pid}">Igualar</button>`:x.mgI<mm?'<small>no conviene</small>':''}</td></tr>`).join('')}</table></div>`:'<p><small>¡En todo lo cargado sos igual o más barato! 💪</small></p>'}</div>
  <div class="box"><h3>🔙 Perdidos a la competencia</h3><p><small>Se marcan desde la ficha del cliente (<b>🚩 Se fue a la competencia</b>). A los 30, 60 y 90 días entra en la Cola un plan de reconquista: mensaje con lo que se ahorra, cupón y, al final, la llamada. Si vuelve a comprar, se desmarca solo.</small></p>
    ${perd.length?perd.map(x=>`<div class="bh cpf"><span><b>${esc(x.c.razon_social)}</b> <small>· se fue con ${esc(x.c.perdido_con||'¿?')} hace ${x.d} días${x.c.perdido_motivo?' · '+esc(x.c.perdido_motivo):''}</small></span><button class="alt" data-prc="${x.c.id}">Volvió ✓</button></div>`).join(''):'<p><small>No hay clientes marcados como perdidos.</small></p>'}</div>`;
  const msg=x=>`¡Hola ${nomCorto(x.c)}! 👋 Comparamos precios: en *${x.a.prods.slice(0,3).map(nomProd).join(', ')}* estamos más baratos que ${x.a.competidor}. Con lo que vos llevás, te ahorrás unos *${$m(x.a.ah)} por mes* 💪\nMirá tus precios y pedí acá:\n${linkPedidos(x.c)}`;
  const it=x=>({k:'ca2:'+x.c.id+':'+hoy.slice(0,7),tipo:'competencia',c:x.c,pri:64,val:x.a.ah,mot:'Ahorra '+$m(x.a.ah)+'/mes con vos vs '+x.a.competidor,txt:msg(x)});
  $('#at_go')&&($('#at_go').onclick=()=>rafaga(T.slice(0,40).map(it)));
  $$('#vs [data-atw]').forEach(b=>b.onclick=()=>rafaga([it(T.find(x=>x.c.id==b.dataset.atw))]));
  $$('#vs [data-ig]').forEach(b=>b.onclick=async()=>{const x=pie.find(y=>y.pid==b.dataset.ig),pct=Math.round((1-x.min/x.mio)*10000)/100;if(!confirm(`¿Igualar ${x.p.descripcion} a ${$m(x.min)} (−${nf(pct)} %) por 30 días?`))return;
    const{error}=await sb.from('promociones').insert({nombre:'Igualamos precio',descuento_pct:pct,alcance:'producto',alcance_valor:x.pid,minimo_tipo:'ninguno',minimo_unidades:0,listas:['mayorista'],desde:hoy,hasta:diaLocal(new Date(Date.now()+30*864e5)),activa:true});
    if(error)return toast(error.message,1);await cargarPromos();toast('Listo: ya figura igualado en el catálogo.');vAtaque()});
  $$('#vs [data-prc]').forEach(b=>b.onclick=async()=>{const c=S.clientes.find(x=>x.id==b.dataset.prc);const{error}=await sb.from('clientes').update({perdido_en:null,perdido_con:null,perdido_motivo:null}).eq('id',c.id);if(error)return toast(error.message,1);c.perdido_en=null;toast('¡Bien! '+c.razon_social+' volvió.');vAtaque()})}
/* ---------- 2. Oferta por cupo ---------- */
async function vCupo(){const due=S.perfil.rol=='dueno';const{data,error}=await sb.from('promociones').select('*').not('cupo','is',null).order('id',{ascending:false}).limit(50);if(error){$('#vs').innerHTML=SQL_EST;return}let sel=null;const data2=(data||[]).filter(p=>p.cupo!=null);
  $('#vs').innerHTML=`<div class="box"><h3>🔥 Oferta por cupo</h3><p><small>Un precio especial solo para los primeros pedidos. En el catálogo aparece <b>"🔥 QUEDAN 7"</b> con lo que realmente queda, y cuando se completa el cupo la oferta se apaga sola.</small></p>
    ${due?`<div class="g"><div class="conscan"><input id="cu_q" placeholder="Producto" autocomplete="off"></div><label class="f">Descuento %<input id="cu_p" type="number" min="1" max="60" value="15"></label><label class="f">Cupo (pedidos)<input id="cu_n" type="number" min="1" value="20"></label><label class="f">Hasta (opcional)<input id="cu_h" type="date"></label></div><div id="cu_r"></div><button id="cu_g">Lanzar oferta por cupo</button>`:''}</div>
  ${data2.map(p=>`<div class="box ${p.activa?'':'hecho-vi'}"><div class="bh"><h3 style="margin:0">${esc(nomProd(p.alcance_valor))} −${nf(p.descuento_pct)} %</h3><span class="badge ${p.activa?'b-entregado':'b-cancelado'}">${p.activa?'Activa':'Terminada'}</span></div>
    <div class="barra" style="margin:8px 0"><i style="width:${Math.min(100,Math.round(p.usados/p.cupo*100))}%"></i></div><p><small><b>${p.usados} de ${p.cupo}</b> pedidos · quedan <b>${Math.max(0,p.cupo-p.usados)}</b>${p.hasta?' · hasta el '+fd(p.hasta):''}</small></p>
    ${due?`<div class="fc-acc">${p.activa?`<button class="wa" data-cuw="${p.id}">📣 Avisar a los clientes</button><button class="alt" data-cux="${p.id}">Terminar</button>`:''}</div>`:''}</div>`).join('')}`;
  if(due){buscador('#cu_q','#cu_r',p=>{sel=p;$('#cu_q').value=p.descripcion;$('#cu_r').innerHTML=''});
    $('#cu_g').onclick=async()=>{if(!sel)return toast('Elegí el producto.',1);const pct=+$('#cu_p').value,n=Math.round(+$('#cu_n').value);if(!(pct>0&&pct<90)||!(n>0))return toast('Revisá el % y el cupo.',1);
      const{error}=await sb.from('promociones').insert({nombre:CUPO_PRE+' '+Math.random().toString(36).slice(2,6).toUpperCase(),descuento_pct:pct,alcance:'producto',alcance_valor:sel.producto_id,minimo_tipo:'ninguno',minimo_unidades:0,listas:null,desde:diaLocal(new Date()),hasta:$('#cu_h').value||null,activa:true,cupo:n,usados:0});
      if(error)return toast(/cupo/.test(error.message)?'Falta correr ventas-estrategia.sql en Supabase.':error.message,1);await cargarPromos();toast('¡Oferta lanzada! Ahora avisales a tus clientes.');vCupo()}}
  $$('#vs [data-cux]').forEach(b=>b.onclick=async()=>{await sb.from('promociones').update({activa:false}).eq('id',b.dataset.cux);await cargarPromos();vCupo()});
  $$('#vs [data-cuw]').forEach(b=>b.onclick=()=>{const p=data.find(x=>x.id==b.dataset.cuw),q=Math.max(0,p.cupo-p.usados);const m=`¡Hola {nombre}! 🔥 *Oferta por cupo* en *Sabores de mi País*: *${nomProd(p.alcance_valor)}* con *${nf(p.descuento_pct)} % de descuento* solo para los primeros *${p.cupo} pedidos* (quedan ${q}). Cuando se completa, se termina.\nPedí acá:\n{link}`;
    S.vs='campanias';vVentas();setTimeout(()=>{$('#cp_m').value=m;$('#cp_m').oninput()},400)})}
/* ---------- 5. Liga de clientes ---------- */
async function vLiga(){const due=S.perfil.rol=='dueno';const[{data:cf},H]=await Promise.all([sb.from('config_app').select('valor').eq('clave','liga').maybeSingle(),histAuto()]);let L={activa:false,premios:['Caja de regalo','10 % en el próximo pedido','5 % en el próximo pedido'],puntos:[3000,2000,1000]};try{L={...L,...JSON.parse(cf?.valor||'{}')}}catch(e){}
  const mes=diaLocal(new Date()).slice(0,7),G={};for(const c of S.clientes){const r=(c.rubro||'').trim();if(!r)continue;const t=H.P.filter(o=>o.cliente_id==c.id&&String(o.creado_en).slice(0,7)==mes).reduce((a,o)=>a+ +o.total,0);(G[cap1(r)]=G[cap1(r)]||[]).push({c,t})}
  for(const k of Object.keys(G))G[k].sort((a,b)=>b.t-a.t);
  $('#vs').innerHTML=`<div class="box"><h3>🏆 Liga de clientes</h3><p><small>Cada cliente ve en su catálogo en qué puesto va este mes entre los negocios de su rubro ("vas 4° de 18 kioscos") y cuánto le falta para subir. <b>No ve los nombres de los demás.</b> A fin de mes premiás a los 3 primeros de cada rubro.</small></p>
    <label class="chk"><input type="checkbox" id="lg_a" ${L.activa?'checked':''} ${due?'':'disabled'}> Liga activa (se muestra en los catálogos)</label>
    <div class="g">${[0,1,2].map(i=>`<label class="f">${['🥇','🥈','🥉'][i]} Premio<input data-lp="${i}" value="${esc(L.premios[i]||'')}" ${due?'':'disabled'}></label><label class="f">Puntos de regalo<input type="number" min="0" data-lq="${i}" value="${L.puntos[i]||0}" style="width:100px" ${due?'':'disabled'}></label>`).join('')}</div>
    ${due?'<button id="lg_g">Guardar</button> <button class="alt wa" id="lg_w">📣 Contarle a los clientes</button>':''}<p><small>Los clientes sin rubro cargado no participan.</small></p></div>
  ${Object.entries(G).map(([r,X])=>`<div class="box"><div class="bh"><h3 style="margin:0">${esc(r)} <small>(${X.length})</small></h3>${due?`<button class="alt" data-lpr="${esc(r)}">🏅 Premiar a los 3 primeros</button>`:''}</div><table>${X.slice(0,10).map((x,i)=>`<tr><td>${i<3?['🥇','🥈','🥉'][i]:i+1}</td><td>${esc(x.c.razon_social)}</td><td class="n">${$m(x.t)}</td></tr>`).join('')}</table></div>`).join('')||'<div class="box"><p><small>Cargá el rubro de tus clientes para armar la liga.</small></p></div>'}`;
  const leer=()=>({activa:$('#lg_a').checked,premios:[0,1,2].map(i=>$(`[data-lp="${i}"]`).value.trim()),puntos:[0,1,2].map(i=>Math.max(0,+$(`[data-lq="${i}"]`).value||0))});
  $('#lg_g')&&($('#lg_g').onclick=async()=>{const{error}=await sb.from('config_app').upsert({clave:'liga',valor:JSON.stringify(leer())});if(error)return toast(error.message,1);toast('Liga guardada.');vLiga()});
  $('#lg_w')&&($('#lg_w').onclick=()=>{const l=leer();S.vs='campanias';vVentas();setTimeout(()=>{$('#cp_m').value=`¡Hola {nombre}! 🏆 Arrancó la *Liga Sabores* del mes: los 3 negocios de tu rubro que más compren ganan: 🥇 ${l.premios[0]} · 🥈 ${l.premios[1]} · 🥉 ${l.premios[2]}.\nMirá en qué puesto vas en tu catálogo:\n{link}`;$('#cp_m').oninput()},400)});
  $$('#vs [data-lpr]').forEach(b=>b.onclick=async()=>{const X=G[b.dataset.lpr].filter(x=>x.t>0).slice(0,3),l=leer();if(!X.length)return toast('Nadie compró todavía este mes.',1);
    if(!confirm('Premiar: '+X.map((x,i)=>['🥇','🥈','🥉'][i]+' '+x.c.razon_social+(l.puntos[i]?' (+'+l.puntos[i]+' puntos)':'')).join(', ')+'?'))return;
    for(const[i,x]of X.entries())if(l.puntos[i])await sb.from('puntos_mov').insert({cliente_id:x.c.id,puntos:l.puntos[i],motivo:'Liga '+b.dataset.lpr+' '+mes+': puesto '+(i+1)});
    rafaga(X.map((x,i)=>({k:'lg:'+mes+':'+x.c.id,tipo:'liga',c:x.c,pri:50,val:0,mot:'Puesto '+(i+1)+' en la liga de '+b.dataset.lpr,txt:`¡Felicitaciones ${nomCorto(x.c)}! 🏆 Saliste *${i+1}° en la Liga Sabores* de ${b.dataset.lpr.toLowerCase()}s este mes. Tu premio: *${l.premios[i]}*${l.puntos[i]?' (te sumamos '+nf(l.puntos[i])+' puntos)':''}. ¡Gracias por elegirnos! 🙌`})))})}
/* ---------- 6. Pedido grande quincenal ---------- */
async function vQuincenal(){const[{data:cf},R]=await Promise.all([sb.from('config_app').select('valor').eq('clave','quincenal').maybeSingle(),datosRecompra().catch(()=>[])]);let Q={pct:5,costo:8000};try{Q={...Q,...JSON.parse(cf?.valor||'{}')}}catch(e){}
  const H=await histAuto(),L=[];for(const c of S.clientes){const r=H.C[c.id];if(!r||r.n<4||!c.telefono||!c.token_pedidos)continue;const f=r.f.slice(-6).map(x=>new Date(x)),g=[];for(let i=1;i<f.length;i++)g.push((f[i]-f[i-1])/864e5);if(g.length<3)continue;
    const m=g.sort((a,b)=>a-b)[Math.floor(g.length/2)];if(m<=9&&dDesde(r.ult)<=30)L.push({c,ciclo:Math.round(m),tk:r.tk,ah:Math.round(30/Math.max(m,1)/2)*Q.costo})}
  L.sort((a,b)=>b.ah-a.ah);
  $('#vs').innerHTML=`<div class="box"><h3>📦 Pedido grande quincenal</h3><p><small>Clientes que piden todas las semanas. Si pasan a pedir cada 15 días con el doble, a vos te baja el costo de reparto y ellos ganan un descuento. Se les da un <b>cupón personal</b> que vale solo en pedidos de al menos el doble de su promedio (6 usos, 90 días).</small></p>
    <div class="g"><label class="f">Descuento por pedido grande %<input id="qu_p" type="number" min="1" max="20" value="${Q.pct}"></label><label class="f">Tu costo por entrega $<input id="qu_c" type="number" min="0" value="${Q.costo}"></label></div><button class="alt" id="qu_g">Guardar</button>
    <p><b>${L.length}</b> clientes semanales · ahorro de reparto posible: <b>${$m(L.reduce((a,x)=>a+x.ah,0))}/mes</b></p>${L.length?`<button class="wa" id="qu_go">▶ Ofrecerles a todos (ráfaga)</button>`:''}</div>
  <div class="box">${L.map(x=>`<div class="bh cpf"><span><b>${esc(x.c.razon_social)}</b><br><small>pide cada ~${x.ciclo} días · promedio ${$m(x.tk)} · pedido grande desde ${$m(Math.round(x.tk*2/1000)*1000)}</small></span><span><small>ahorrás ${$m(x.ah)}/mes</small> <button class="alt wa" data-quw="${x.c.id}">Ofrecer</button></span></div>`).join('')||'<p><small>No hay clientes que pidan todas las semanas.</small></p>'}</div>`;
  $('#qu_g').onclick=async()=>{const o={pct:Math.max(1,+$('#qu_p').value||5),costo:Math.max(0,+$('#qu_c').value||0)};await sb.from('config_app').upsert({clave:'quincenal',valor:JSON.stringify(o)});toast('Guardado.');vQuincenal()};
  const it=x=>{const min=Math.round(x.tk*2/1000)*1000;return{k:'qu:'+x.c.id+':'+diaLocal(new Date()).slice(0,7),tipo:'quincenal',c:x.c,pri:55,val:x.tk,mot:'Pide cada ~'+x.ciclo+' días: pasarlo a quincenal',cupon:{pct:Q.pct,dias:90,pre:'QUINCE',nota:'Pedido quincenal (mínimo '+min+')',usos:6,minimo:min},
    txt:`¡Hola ${nomCorto(x.c)}! 👋 Te propongo algo: en vez de pedir todas las semanas, hacé *un pedido grande cada 15 días* (desde ${$m(min)}) y te llevás *${nf(Q.pct)} % de descuento* en cada uno 💰\nUsá el cupón *{cupon}* en el carrito (vale 3 meses):\n${linkPedidos(x.c)}`}};
  $('#qu_go')&&($('#qu_go').onclick=()=>rafaga(L.map(it)));$$('#vs [data-quw]').forEach(b=>b.onclick=()=>rafaga([it(L.find(x=>x.c.id==b.dataset.quw))]))}
/* ---------- 7. Acuerdos comerciales ---------- */
async function vAcuerdos(){const due=S.perfil.rol=='dueno';const[{data,error},H]=await Promise.all([sb.from('acuerdos').select('*').order('id',{ascending:false}),histAuto()]);if(error){$('#vs').innerHTML=SQL_EST;return}
  const mes=diaLocal(new Date()).slice(0,7),dia=new Date().getDate(),fin=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  const lleva=cid=>H.P.filter(o=>o.cliente_id==cid&&String(o.creado_en).slice(0,7)==mes).reduce((a,o)=>a+ +o.total,0);
  $('#vs').innerHTML=`<div class="box"><h3>📜 Acuerdos comerciales</h3><p><small>El cliente se compromete a comprar un monto por mes y a cambio tiene un <b>descuento</b> o el <b>precio congelado</b> en los productos que siempre lleva (se cargan como sus precios pactados). En su catálogo ve el avance del mes y a vos te avisa si viene atrasado.</small></p>
    ${due?`<div class="g"><label class="f">Cliente<select id="ac_c"><option value="">Elegí…</option>${S.clientes.filter(c=>H.C[c.id]).map(c=>`<option value="${c.id}">${esc(c.razon_social)} · compra ${$m(H.C[c.id].t/13)}/mes</option>`).join('')}</select></label>
      <label class="f">Compromiso por mes $<input id="ac_m" type="number" min="0"></label><label class="f">Beneficio<select id="ac_t"><option value="pct">Descuento en lo que siempre lleva</option><option value="congelado">Precio congelado</option></select></label><label class="f">Descuento %<input id="ac_p" type="number" min="0" max="30" value="5"></label><label class="f">Hasta<input id="ac_h" type="date" value="${diaLocal(new Date(Date.now()+180*864e5))}"></label></div><button id="ac_g">Crear acuerdo</button>`:''}</div>
  ${(data||[]).map(a=>{const c=S.clientes.find(x=>x.id==a.cliente_id);if(!c)return '';const l=lleva(c.id),p=Math.min(100,Math.round(l/a.monto_mes*100)),esp=a.monto_mes*dia/fin,atr=a.activo&&l<esp*.8;
    return`<div class="box ${a.activo?'':'hecho-vi'}"><div class="bh"><h3 style="margin:0">${esc(c.razon_social)}</h3><span class="badge ${a.activo?(atr?'b-mora30':'b-entregado'):'b-cancelado'}">${a.activo?(atr?'Atrasado':'Al día'):'Terminado'}</span></div>
      <p><small>Compromiso ${$m(a.monto_mes)}/mes · ${a.tipo=='pct'?nf(a.pct)+' % de descuento':'precio congelado'} en ${(a.productos||[]).length} productos · hasta ${a.hasta?fd(a.hasta):'—'}</small></p>
      <div class="barra"><i style="width:${p}%"></i></div><p><small>Este mes lleva <b>${$m(l)}</b> de ${$m(a.monto_mes)} (${p} %)${atr?' · ⚠️ a esta altura debería llevar '+$m(esp):''}</small></p>
      ${due&&a.activo?`<button class="alt" data-acx="${a.id}">Terminar acuerdo</button>`:''}</div>`}).join('')}`;
  if(!due)return;
  $('#ac_g').onclick=async()=>{const c=S.clientes.find(x=>x.id==$('#ac_c').value),m=+$('#ac_m').value,t=$('#ac_t').value,pct=t=='pct'?+$('#ac_p').value:0;if(!c||!(m>0))return toast('Elegí el cliente y el monto.',1);if(t=='pct'&&!(pct>0))return toast('Poné el descuento.',1);
    const r=H.C[c.id],ids=[...(r?.pr||[])].filter(id=>S.productos.some(p=>String(p.producto_id)==id)).slice(0,40);if(!ids.length)return toast('Ese cliente no tiene compras en los últimos 6 meses.',1);
    const{data:prev}=await sb.from('precios_cliente').select('producto_id,precio').eq('cliente_id',c.id);
    const rows=ids.map(id=>({cliente_id:c.id,producto_id:id,precio:Math.round(precioLista(id,c.lista)*(1-pct/100)*100)/100})).filter(x=>x.precio>0);
    if(!confirm(`Acuerdo con ${c.razon_social}: compra ${$m(m)}/mes y tiene ${t=='pct'?nf(pct)+' % de descuento':'el precio congelado'} en ${rows.length} productos. ¿Lo creamos?`))return;
    const{error:e1}=await sb.from('precios_cliente').upsert(rows);if(e1)return toast(e1.message,1);
    const{error}=await sb.from('acuerdos').insert({cliente_id:c.id,monto_mes:m,tipo:t,pct:pct||null,hasta:$('#ac_h').value||null,productos:rows.map(x=>({id:x.producto_id,prev:(prev||[]).find(p=>String(p.producto_id)==String(x.producto_id))?.precio??null}))});
    if(error)return toast(error.message,1);toast('Acuerdo creado. Ya ve sus precios en el catálogo.');
    const tl=`¡Hola ${nomCorto(c)}! 🤝 Quedó armado nuestro acuerdo: comprando *${$m(m)} por mes* tenés ${t=='pct'?'*'+nf(pct)+' % de descuento*':'*el precio congelado*'} en los productos que siempre llevás. En tu catálogo ves el avance de cada mes:\n${linkPedidos(c)}`;
    if(c.telefono&&confirm('¿Mandarle el mensaje por WhatsApp?'))window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(tl),'_blank');vAcuerdos()};
  $$('#vs [data-acx]').forEach(b=>b.onclick=async()=>{const a=data.find(x=>x.id==b.dataset.acx);if(!confirm('¿Terminar el acuerdo? Sus precios vuelven a como estaban antes.'))return;
    for(const p of a.productos||[]){if(p.prev!=null)await sb.from('precios_cliente').upsert({cliente_id:a.cliente_id,producto_id:p.id,precio:p.prev});else await sb.from('precios_cliente').delete().eq('cliente_id',a.cliente_id).eq('producto_id',p.id)}
    await sb.from('acuerdos').update({activo:false}).eq('id',a.id);toast('Acuerdo terminado.');vAcuerdos()})}
async function vClave(){const H=await histAuto();if(!S.clientes.length||!('cuenta_clave' in S.clientes[0])){$('#vs').innerHTML=SQL_EST;return}const due=S.perfil.rol=='dueno';
  const{data:co}=await sb.from('contactos_clientes').select('cliente_id,fecha').gte('fecha',new Date(Date.now()-60*864e5).toISOString());const ult={};for(const x of co||[])if(!ult[x.cliente_id]||x.fecha>ult[x.cliente_id])ult[x.cliente_id]=x.fecha;
  const K=S.clientes.filter(c=>c.cuenta_clave).map(c=>{const w=ventaVentanas(H,c.id);return{c,...w,caida:w.prom>0?1-w.v30/w.prom:0}}).sort((a,b)=>b.caida-a.caida);
  const top=S.clientes.filter(c=>!c.cuenta_clave&&H.C[c.id]).map(c=>({c,v:H.P.filter(o=>o.cliente_id==c.id&&dDesde(o.creado_en)<=90).reduce((a,o)=>a+ +o.total,0)})).sort((a,b)=>b.v-a.v).slice(0,Math.max(0,20-K.length));
  $('#vs').innerHTML=`<div class="box"><h3>👑 Cuentas clave</h3><p><small>Tus clientes más importantes, con atención especial: los ves todos juntos, sabés hace cuánto no hablás con cada uno y, apenas uno compra <b>15 % menos</b> que su promedio, entra arriba de la Cola del día para llamarlo.</small></p></div>
  <div class="box">${K.length?`<div class="tw"><table><tr><th>Cliente</th><th class="n">Últimos 30 días</th><th class="n">Promedio mensual</th><th>Último contacto</th><th></th></tr>${K.map(x=>`<tr><td><a class="lnk" data-kf="${x.c.id}"><b>${esc(x.c.razon_social)}</b></a>${x.caida>=.15?` <span class="badge b-mora30">−${Math.round(x.caida*100)} %</span>`:x.caida<-.1?` <span class="badge b-entregado">+${Math.round(-x.caida*100)} %</span>`:''}</td><td class="n">${$m(x.v30)}</td><td class="n">${$m(x.prom)}</td><td>${ult[x.c.id]?'hace '+dDesde(ult[x.c.id])+' d':'<span class="baja">más de 60 d</span>'}</td>
    <td class="acc">${x.c.telefono?`<a class="alt btnl" href="tel:${esc(String(x.c.telefono).replace(/[^\d+]/g,''))}">📞</a> <button class="alt wa" data-kw="${x.c.id}">WhatsApp</button> `:''}<button class="alt" data-kn="${x.c.id}" title="Calculadora de negociación">🧮</button>${due?` <button class="alt" data-kx="${x.c.id}" title="Quitar de cuentas clave">✕</button>`:''}</td></tr>`).join('')}</table></div>`:'<p><small>Todavía no marcaste cuentas clave. Elegí abajo.</small></p>'}</div>
  ${due&&top.length?`<div class="box"><h3>Sugeridas (las que más te compraron en 90 días)</h3>${top.map(x=>`<div class="bh cpf"><span>${esc(x.c.razon_social)} <small>· ${$m(x.v)} en 90 días</small></span><button class="alt" data-ka="${x.c.id}">👑 Marcar</button></div>`).join('')}</div>`:''}`;
  const set=async(id,v)=>{const{error}=await sb.from('clientes').update({cuenta_clave:v}).eq('id',id);if(error)return toast(error.message,1);S.clientes.find(c=>c.id==id).cuenta_clave=v;vClave()};
  $$('#vs [data-ka]').forEach(b=>b.onclick=()=>set(b.dataset.ka,true));$$('#vs [data-kx]').forEach(b=>b.onclick=()=>set(b.dataset.kx,false));
  $$('#vs [data-kf]').forEach(a=>a.onclick=()=>{S.tab='clientes';shell();fichaCliente(S.clientes.find(c=>c.id==a.dataset.kf))});$$('#vs [data-kn]').forEach(b=>b.onclick=()=>negociar(S.clientes.find(c=>c.id==b.dataset.kn)));
  $$('#vs [data-kw]').forEach(b=>b.onclick=()=>{const c=S.clientes.find(x=>x.id==b.dataset.kw);window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(c)}! ¿Cómo andás? Te escribo de *Sabores de mi País* 👋 Quería saber cómo te está yendo y si necesitás algo para esta semana.`),'_blank');sb.from('contactos_clientes').insert({cliente_id:c.id,tipo:'whatsapp',detalle:'Cuenta clave'}).then(()=>{})})}
/* ---------- 10. Rentabilidad real por cliente ---------- */
async function vRentCli(){const[{data:cf},H,{data:nc},{data:fe}]=await Promise.all([sb.from('config_app').select('valor').eq('clave','rentab_cfg').maybeSingle(),histAuto(),
    sb.from('notas_credito').select('cliente_id,total,fecha').gte('fecha',diaLocal(new Date(Date.now()-90*864e5))),sb.from('facturas_estado').select('cliente_id,pendiente,dias_mora').gt('pendiente',0.005).gt('dias_mora',0)]);
  let K={costo:8000,tasa:6};try{K={...K,...JSON.parse(cf?.valor||'{}')}}catch(e){}const due=S.perfil.rol=='dueno';
  const L=S.clientes.map(c=>{const P=H.P.filter(o=>o.cliente_id==c.id&&dDesde(o.creado_en)<=90&&o.estado!='cancelado');if(!P.length)return null;let v=0,co=0,de=0,sc=false;
    for(const o of P)for(const i of o.pedido_items||[]){const p=S.productos.find(x=>String(x.producto_id)==String(i.producto_id));const q=+i.cantidad||0,cu=+p?.costo||0,pl=precioLista(i.producto_id,c.lista)||0;co+=q*cu;de+=Math.max(0,pl*q-0);if(!cu)sc=true}
    v=P.reduce((a,o)=>a+ +o.total,0);const lista=P.reduce((a,o)=>a+(o.pedido_items||[]).reduce((s,i)=>s+(precioLista(i.producto_id,c.lista)||0)*(+i.cantidad||0),0),0),desc=Math.max(0,lista-v);
    const ent=P.length,rep=ent*K.costo,dev=(nc||[]).filter(n=>n.cliente_id==c.id).reduce((a,n)=>a+ +n.total,0),mo=(fe||[]).filter(f=>f.cliente_id==c.id).reduce((a,f)=>a+ +f.pendiente*K.tasa/100*Math.min(3,f.dias_mora/30),0);
    const mb=v-co,neto=mb-rep-dev-mo,tk=v/ent,rec=[];
    if(neto<0)rec.push(tk<K.costo*5?'Subile el pedido mínimo o cobrale el envío':'Revisá sus descuentos');if(ent>=10&&tk<K.costo*8)rec.push('Pasalo a pedido quincenal');if(mo>mb*.1)rec.push('Pedile pago anticipado o contado');if(desc>v*.1)rec.push('Le estás dando mucho descuento ('+Math.round(desc/v*100)+' %)');
    return{c,v,mb,desc,rep,dev,mo,neto,ent,rec,sc}}).filter(Boolean).sort((a,b)=>a.neto-b.neto);
  const tot=L.reduce((a,x)=>a+x.neto,0),neg=L.filter(x=>x.neto<0);
  $('#vs').innerHTML=`<div class="kp"><div class="box"><span class="lab">Ganancia real (90 días)</span><span class="num">${$m0(tot)}</span><span class="det">después de reparto, devoluciones y mora</span></div><div class="box ${neg.length?'alerta':'ok'}"><span class="lab">Clientes que te hacen perder</span><span class="num">${neg.length}</span><span class="det">${$m(neg.reduce((a,x)=>a+x.neto,0))}</span></div></div>
  <div class="box"><h3>💼 Rentabilidad real por cliente</h3><p><small>Margen de la mercadería menos lo que te cuesta atenderlo: <b>reparto</b> (cada entrega), <b>devoluciones</b> (notas de crédito) y <b>mora</b> (plata parada). Primero los que menos te dejan, con una recomendación.</small></p>
    <div class="g"><label class="f">Costo por entrega $<input id="rc_c" type="number" min="0" value="${K.costo}" ${due?'':'disabled'}></label><label class="f">Costo de la plata parada (% mensual)<input id="rc_t" type="number" min="0" step="0.5" value="${K.tasa}" ${due?'':'disabled'}></label>${due?'<button class="alt" id="rc_g">Recalcular</button>':''}</div>
    <div class="tw"><table><tr><th>Cliente</th><th class="n">Venta</th><th class="n">Margen</th><th class="n">Reparto</th><th class="n">Dev. + mora</th><th class="n">Te deja</th><th>Qué hacer</th></tr>${L.slice(0,80).map(x=>`<tr><td>${esc(x.c.razon_social)}<br><small>${x.ent} entregas</small></td><td class="n">${$m(x.v)}</td><td class="n">${$m(x.mb)}${x.sc?'<br><small>⚠️ faltan costos</small>':''}</td><td class="n">${$m(x.rep)}</td><td class="n">${$m(x.dev+x.mo)}</td><td class="n ${x.neto<0?'baja':'sube'}"><b>${$m(x.neto)}</b></td><td><small>${x.rec.map(esc).join('<br>')||'✓'}</small></td></tr>`).join('')}</table></div></div>`;
  $('#rc_g')&&($('#rc_g').onclick=async()=>{await sb.from('config_app').upsert({clave:'rentab_cfg',valor:JSON.stringify({costo:Math.max(0,+$('#rc_c').value||0),tasa:Math.max(0,+$('#rc_t').value||0)})});vRentCli()})}
/* ---------- 11. Simulador de aumento ---------- */
async function vSimulador(){S.si=S.si||{t:'marca',v:'',pct:8};const[H,CP]=await Promise.all([histAuto(),preciosComp()]);
  const mks=[...new Set(S.productos.map(p=>p.marca).filter(Boolean))].sort(),fams=[...new Set(S.productos.map(p=>(p.familia||'').trim()).filter(Boolean))].sort();
  const draw=()=>{const{t,v,pct}=S.si,P=S.productos.filter(p=>v&&(t=='marca'?p.marca==v:(p.familia||'').trim()==v)),ids=new Set(P.map(p=>String(p.producto_id)));
    let venta=0,costo=0;const cli={};for(const o of H.P){if(dDesde(o.creado_en)>90)continue;for(const i of o.pedido_items||[]){if(!ids.has(String(i.producto_id)))continue;const p=P.find(x=>String(x.producto_id)==String(i.producto_id)),q=+i.cantidad||0,pr=precioLista(i.producto_id,(S.clientes.find(c=>c.id==o.cliente_id)||{}).lista||'mayorista');venta+=pr*q;costo+=(+p.costo||0)*q;cli[o.cliente_id]=(cli[o.cliente_id]||0)+pr*q}}
    venta/=3;costo/=3;const mg=venta>0?(venta-costo)/venta:0,extra=venta*pct/100,pe=pct/(mg*100+pct)*100;
    const riesgo=P.map(p=>{const R=CP[String(p.producto_id)]||[],min=R.length?Math.min(...R.map(r=>+r.precio)):null,nuevo=precioLista(p.producto_id,'mayorista')*(1+pct/100);return{p,min,nuevo,pasa:min!=null&&nuevo>min}}).filter(x=>x.pasa);
    const top=Object.entries(cli).map(([id,v2])=>({c:S.clientes.find(c=>c.id==id),v:v2/3})).filter(x=>x.c).sort((a,b)=>b.v-a.v);
    const sens=top.filter(x=>x.c.perdido_en||riesgo.some(r=>H.C[x.c.id]?.pr.has(String(r.p.producto_id))));
    $('#si_o').innerHTML=!v?'<p><small>Elegí una marca o familia.</small></p>':`<div class="kp"><div class="box"><span class="lab">Venta por mes</span><span class="num">${$m0(venta)}</span><span class="det">${P.length} productos · margen ${nf(Math.round(mg*1000)/10)} %</span></div><div class="box ok"><span class="lab">Ganancia extra por mes</span><span class="num">${$m0(extra)}</span><span class="det">si nadie compra menos</span></div><div class="box"><span class="lab">Podés perder hasta</span><span class="num">${nf(Math.round(pe*10)/10)} %</span><span class="det">del volumen y seguís ganando lo mismo</span></div></div>
      <div class="dos"><div class="box"><h3>⚠️ Quedarías más caro que la competencia</h3>${riesgo.length?`<table>${riesgo.map(x=>`<tr><td>${esc(x.p.descripcion)}</td><td class="n">${$m(x.nuevo)}<br><small>vs ${$m(x.min)}</small></td></tr>`).join('')}</table>`:'<p><small>Con los precios de competencia cargados, en ninguno.</small></p>'}</div>
        <div class="box"><h3>👀 A quién podés perder</h3><p><small>Clientes que más compran de esto${riesgo.length?' (en rojo, los que llevan productos donde quedarías más caro)':''}.</small></p>${top.slice(0,15).map(x=>`<div class="bh cpf"><span class="${sens.includes(x)?'baja':''}">${esc(x.c.razon_social)}</span><small>${$m(x.v)}/mes</small></div>`).join('')||'<p><small>—</small></p>'}</div></div>
      <div class="box"><p><small>💡 Para aplicarlo: cambiá los costos o márgenes en <b>Precios</b> y avisá con <b>Ofertas → 📈 Aviso de aumento</b> (así los clientes compran antes y no se van).</small></p><button class="alt" id="si_av">📈 Ir a Aviso de aumento</button></div>`;
    $('#si_av')&&($('#si_av').onclick=()=>{S.vs='aumento';vVentas()})};
  $('#vs').innerHTML=`<div class="box"><h3>🧪 Simulador de aumento</h3><p><small>Antes de subir precios: cuánto ganás de más, cuánto volumen podés perder sin salir perdiendo, dónde quedarías más caro que la competencia y qué clientes cuidar.</small></p>
    <div class="g"><label class="f">Aumentar<select id="si_t"><option value="marca" ${S.si.t=='marca'?'selected':''}>Una marca</option><option value="familia" ${S.si.t=='familia'?'selected':''}>Una familia</option></select></label><label class="f">Cuál<select id="si_v"></select></label><label class="f">Aumento %<input id="si_p" type="number" min="1" max="50" value="${S.si.pct}"></label></div></div><div id="si_o"></div>`;
  const opts=()=>{const L=S.si.t=='marca'?mks:fams;$('#si_v').innerHTML='<option value="">Elegí…</option>'+L.map(x=>`<option ${S.si.v==x?'selected':''}>${esc(x)}</option>`).join('')};opts();
  $('#si_t').onchange=e=>{S.si.t=e.target.value;S.si.v='';opts();draw()};$('#si_v').onchange=e=>{S.si.v=e.target.value;draw()};$('#si_p').oninput=e=>{S.si.pct=Math.max(0,+e.target.value||0);draw()};draw()}
/* ---------- 12. Plan de ataque semanal ---------- */
async function armarPlanSemana(){const H=await histAuto(),lu=lunes();
  const[{data:pr},{data:me},CP]=await Promise.all([sb.from('prospectos').select('id,zona,rubro,estado,lat,lng,telefono').in('estado',['nuevo','contactado','interesado']),sb.from('config_app').select('valor').eq('clave','metas_captacion').maybeSingle(),preciosComp().catch(()=>({}))]);
  let M=null;try{M=JSON.parse(me?.valor||'null')}catch(e){}
  const z={};for(const x of pr||[]){const k=(x.zona||'').trim();if(k)z[k]=(z[k]||0)+1}const zona=Object.entries(z).sort((a,b)=>b[1]-a[1])[0];
  const fam={};const cR={};for(const c of S.clientes){const r=H.C[c.id];if(!r||!c.rubro)continue;(cR[norm(c.rubro)]=cR[norm(c.rubro)]||[]).push(r)}
  for(const c of S.clientes){const r=H.C[c.id];if(!r||!c.rubro)continue;const peers=cR[norm(c.rubro)]||[];if(peers.length<3)continue;const mias=new Set([...r.pr].map(id=>(S.productos.find(p=>String(p.producto_id)==id)?.familia||'').trim()));
    const cnt={};for(const q of peers)for(const f of new Set([...q.pr].map(id=>(S.productos.find(p=>String(p.producto_id)==id)?.familia||'').trim())))if(f)cnt[f]=(cnt[f]||0)+1;for(const[f,n]of Object.entries(cnt))if(n/peers.length>=.4&&!mias.has(f))fam[f]=(fam[f]||0)+1}
  const cat=Object.entries(fam).sort((a,b)=>b[1]-a[1])[0];
  const K=S.clientes.filter(c=>c.cuenta_clave).map(c=>({c,...ventaVentanas(H,c.id)})).filter(x=>x.prom>0&&x.v30<x.prom*.85).slice(0,5);
  await cargarStock().catch(()=>{});const vend={};for(const o of H.P)if(dDesde(o.creado_en)<=90)for(const i of o.pedido_items||[])vend[i.producto_id]=(vend[i.producto_id]||0)+(+i.cantidad||0);
  const so=S.inv?S.productos.map(p=>{const d=S.stock[p.producto_id]?.d||0,mes=(vend[p.producto_id]||0)/3;return{p,cob:mes>0?d/mes:99,val:d*(+p.costo||0)}}).filter(x=>x.cob>=2&&x.cob<99&&x.val>0).sort((a,b)=>b.val-a.val)[0]:null;
  const ataque=Object.keys(CP).length?S.clientes.filter(c=>c.perdido_en).length:0;
  const T=[];if(zona)T.push({k:'zona',t:`🗺️ Atacar la zona <b>${esc(zona[0])}</b>: ${zona[1]} prospectos sin cerrar (Ruta o Modo llamadas)`,go:'ruta'});
  if(M?.contactados)T.push({k:'pros',t:`🧲 Contactar <b>${M.contactados}</b> prospectos y hacer <b>${M.visitas||0}</b> visitas`,go:'cola'});
  if(cat)T.push({k:'cat',t:`🚪 Empujar la categoría <b>${esc(cat[0])}</b>: ${cat[1]} clientes de rubros que la venden todavía no te la compran (precio de entrada en la Cola)`,go:'cola'});
  if(K.length)T.push({k:'clave',t:`👑 Visitar o llamar a las cuentas clave que bajaron: ${K.map(x=>'<b>'+esc(x.c.razon_social)+'</b>').join(', ')}`,go:'clave'});
  if(so)T.push({k:'oferta',t:`🔥 Lanzar una oferta por cupo con <b>${esc(so.p.descripcion)}</b> (tenés stock para ${nf(Math.round(so.cob*10)/10)} meses)`,go:'cupo'});
  if(ataque)T.push({k:'ataque',t:`⚔️ Reconquistar a los ${ataque} clientes que se fueron a la competencia`,go:'ataque'});
  T.push({k:'cola',t:'⚡ Mandar la Cola del día todas las mañanas',go:'cola'});
  const v0=H.P.filter(o=>o.creado_en<new Date(tsAR(lu)).toISOString()&&dDesde(o.creado_en)<=7+((new Date().getDay()+6)%7)).reduce((a,o)=>a+ +o.total,0);
  return{semana:lu,T,hechos:[],base:{venta_sem_ant:v0,cat:cat?.[0]||null}}}
async function vPlanSem(){const{data:cf}=await sb.from('config_app').select('valor').eq('clave','plan_semana').maybeSingle();let P=null;try{P=JSON.parse(cf?.valor||'null')}catch(e){}
  if(!P||P.semana!=lunes()){P=await armarPlanSemana();await sb.from('config_app').upsert({clave:'plan_semana',valor:JSON.stringify(P)})}
  const H=await histAuto(),ini=new Date(tsAR(P.semana)).toISOString(),{data:ev}=await sb.from('envios_auto').select('tipo,prospecto_id,cliente_id').gte('enviado_en',ini);
  const venta=H.P.filter(o=>o.creado_en>=ini&&o.estado!='cancelado').reduce((a,o)=>a+ +o.total,0),nue=Object.values(H.C).filter(r=>r.pri>=ini).length,pros=new Set((ev||[]).filter(x=>x.prospecto_id).map(x=>x.prospecto_id)).size,env=(ev||[]).length;
  const catV=P.base.cat?H.P.filter(o=>o.creado_en>=ini).reduce((a,o)=>a+(o.pedido_items||[]).filter(i=>(S.productos.find(p=>String(p.producto_id)==String(i.producto_id))?.familia||'').trim()==P.base.cat).length,0):0;
  const dia=(new Date().getDay()+6)%7,vie=dia>=4;
  $('#vs').innerHTML=`<div class="box"><div class="bh"><h3 style="margin:0">🗓️ Plan de ataque · semana del ${fd(P.semana)}</h3><button class="alt" id="ps_n">Rearmar</button></div><p><small>Se arma solo cada lunes con tus datos. Tildá lo que vas haciendo; ${vie?'y mirá abajo cómo te fue.':'el viernes te muestra cómo te fue.'}</small></p>
    ${P.T.map(t=>`<div class="bh cpf ${P.hechos.includes(t.k)?'ok':''}"><label class="chk" style="flex:1"><input type="checkbox" data-pk="${t.k}" ${P.hechos.includes(t.k)?'checked':''}> <span>${t.t}</span></label><button class="alt" data-pg="${t.go}">Ir</button></div>`).join('')}</div>
  <div class="box"><h3>${vie?'📊 Cómo te fue esta semana':'📊 Cómo vas'}</h3><div class="kp mini"><div class="box"><span class="lab">Venta de la semana</span><span class="num">${$m0(venta)}</span><span class="det">semana pasada ${$m(P.base.venta_sem_ant)}</span></div><div class="box"><span class="lab">Mensajes de la cola</span><span class="num">${env}</span></div><div class="box"><span class="lab">Prospectos trabajados</span><span class="num">${pros}</span></div><div class="box ok"><span class="lab">Clientes nuevos</span><span class="num">${nue}</span></div>${P.base.cat?`<div class="box"><span class="lab">${esc(P.base.cat)}</span><span class="num">${catV}</span><span class="det">renglones vendidos</span></div>`:''}<div class="box"><span class="lab">Plan cumplido</span><span class="num">${Math.round(P.hechos.length/P.T.length*100)} %</span></div></div></div>`;
  const save=async()=>{await sb.from('config_app').upsert({clave:'plan_semana',valor:JSON.stringify(P)})};
  $$('#vs [data-pk]').forEach(c=>c.onchange=async()=>{P.hechos=c.checked?[...new Set([...P.hechos,c.dataset.pk])]:P.hechos.filter(x=>x!=c.dataset.pk);await save();vPlanSem()});
  $$('#vs [data-pg]').forEach(b=>b.onclick=()=>{S.vs=b.dataset.pg;vVentas()});
  $('#ps_n').onclick=async()=>{if(!confirm('¿Rearmar el plan de esta semana con los datos de hoy?'))return;const N=await armarPlanSemana();N.hechos=P.hechos.filter(k=>N.T.some(t=>t.k==k));P=N;await save();vPlanSem()}}
async function cfgIG(){const{data}=await sb.from('config_app').select('valor').eq('clave','ig_cfg').maybeSingle();let o={};try{o=JSON.parse(data?.valor||'{}')||{}}catch(e){}return S.igCfg={...IG_DEF,...o}}
function hashtagsIG(extra){const K=S.igCfg||IG_DEF,z=K.zona?norm(K.zona).replace(/[^a-z0-9]+/g,''):'';
  const T=['#SaboresDeMiPais','#distribuidora','#mayorista','#kiosco','#almacen','#golosinas',...(z?['#'+z,'#kiosco'+z,'#distribuidora'+z,'#mayorista'+z]:[]),...(extra||[]).filter(Boolean).map(tagLimpio),...String(K.tags||'').split(/[\s,]+/).filter(Boolean).map(t=>t.startsWith('#')?t:'#'+t)];
  return [...new Set(T.map(t=>t.toLowerCase()==t?t:t))].slice(0,18).join(' ')}
function cajaTexto(box,txt){const d=document.createElement('div');d.className='box igtx';d.innerHTML=`<label class="f">Texto para la publicación (copialo y pegalo en Instagram)<textarea rows="7">${esc(txt)}</textarea></label><button class="alt">📋 Copiar texto</button>`;
  $(box).appendChild(d);d.querySelector('button').onclick=async()=>{const t=d.querySelector('textarea').value;try{await navigator.clipboard.writeText(t);toast('Texto copiado.')}catch(e){prompt('Copiá el texto:',t)}}}
function topSemana(H,n=5){const q={};for(const o of H.P)if(dDesde(o.creado_en)<=7&&o.estado!='cancelado')for(const i of o.pedido_items||[])q[i.producto_id]=(q[i.producto_id]||0)+(+i.cantidad||0);
  return Object.entries(q).sort((a,b)=>b[1]-a[1]).map(([id])=>S.productos.find(p=>String(p.producto_id)==String(id))).filter(Boolean).slice(0,n)}
async function placaTexto(o){const W=1080,Hh=o.alto||1350,cv=document.createElement('canvas');cv.width=W;cv.height=Hh;const c=cv.getContext('2d'),F='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
  const g=c.createLinearGradient(0,0,W,Hh);g.addColorStop(0,MARCA.n);g.addColorStop(1,MARCA.c);c.fillStyle=g;c.fillRect(0,0,W,Hh);
  const lg=await cargarImg(MARCA.logo);if(lg){const h=150,w=lg.width*h/lg.height;c.drawImage(lg,(W-w)/2,60,w,h)}
  c.fillStyle='#fff';rrect(c,60,260,W-120,Hh-420,40);c.fill();c.textAlign='center';let y=360;
  if(o.titulo){c.fillStyle=MARCA.c;c.font=`900 ${o.tam||88}px ${F}`;for(const l of lineas(c,o.titulo,W-200,2)){c.fillText(l,W/2,y);y+=(o.tam||88)*1.1}y+=10}
  if(o.estrellas){c.fillStyle='#e0a100';c.font=`70px ${F}`;c.fillText('★'.repeat(o.estrellas),W/2,y+20);y+=110}
  if(o.texto){c.fillStyle='#1c2333';c.font=`${o.it?'italic ':''}600 48px ${F}`;for(const l of lineas(c,o.texto,W-220,o.maxL||8)){c.fillText(l,W/2,y);y+=64}y+=20}
  if(o.pasos){c.textAlign='left';c.font=`600 44px ${F}`;o.pasos.forEach((p,i)=>{c.fillStyle=MARCA.c;c.beginPath();c.arc(170,y-14,34,0,7);c.fill();c.fillStyle='#fff';c.textAlign='center';c.fillText(String(i+1),170,y);c.textAlign='left';c.fillStyle='#1c2333';
    for(const[k,l]of lineas(c,p,W-340,2).entries())c.fillText(l,230,y+k*54);y+=130});c.textAlign='center'}
  if(o.firma){c.fillStyle='#6a7184';c.font=`600 40px ${F}`;c.fillText(o.firma,W/2,Math.min(y+30,Hh-200))}
  c.fillStyle='#fff';c.font=`700 40px ${F}`;c.fillText(o.pie||'Sabores de mi País · distribuidora de alimentos',W/2,Hh-80);return cv}
/* ---------- Contenido (posts, stories, carrusel, testimonios) ---------- */
async function vIG(){const K=await cfgIG();await Promise.all([cargarStock(),cargarPromos(),cargarVentasCfg()]);S.igL=S.igL||'mayorista';const due=S.perfil.rol=='dueno';
  $('#vs').innerHTML=`<div class="box"><h3>📸 Contenido para Instagram</h3><p><small>Imágenes listas con tus productos reales, en formato de <b>publicación (1080×1350)</b> y de <b>historia (1080×1920)</b>, cada una con su texto y hashtags de tu zona. Las descargás y las subís desde el celular.</small></p>
    <div class="g"><label class="f">Tu usuario de Instagram<input id="ig_u" placeholder="@saboresdemipais" value="${esc(K.usuario)}" ${due?'':'disabled'}></label><label class="f">Tu zona (para hashtags)<input id="ig_z" value="${esc(K.zona)}" ${due?'':'disabled'}></label><label class="f">Hashtags propios (opcional)<input id="ig_t" placeholder="#belgrano #nuñez" value="${esc(K.tags)}" ${due?'':'disabled'}></label>
      <label class="f">Precios de la lista<select id="ig_l">${['mayorista','minorista','especial'].map(l=>`<option value="${l}" ${S.igL==l?'selected':''}>${nomL(l)}</option>`).join('')}</select></label></div>${due?'<button class="alt" id="ig_g">Guardar</button>':''}
    <div class="fc-acc" style="margin-top:10px"><button data-igt="oferta">🔥 Oferta</button><button data-igt="novedad">✨ Novedad</button><button data-igt="combo">🎁 Combo</button><button data-igt="cupo">⏳ Oferta por cupo</button><button data-igt="top">🏆 Top 5 de la semana (carrusel)</button><button data-igt="testimonio">⭐ Testimonios</button></div></div><div id="ig_o"></div>`;
  $('#ig_g')&&($('#ig_g').onclick=async()=>{const o={usuario:$('#ig_u').value.trim(),zona:$('#ig_z').value.trim(),tags:$('#ig_t').value.trim()};const{error}=await sb.from('config_app').upsert({clave:'ig_cfg',valor:JSON.stringify(o)});if(error)return toast(error.message,1);S.igCfg={...IG_DEF,...o};toast('Guardado.')});
  $$('[data-igt]').forEach(b=>b.onclick=()=>{S.igL=$('#ig_l').value;armarIG(b.dataset.igt)});if(S.igPre){const t=S.igPre;S.igPre=null;armarIG(t)}}
async function armarIG(tipo){const l=S.igL||'mayorista',out=$('#ig_o');if(!out)return;out.innerHTML='<div class="box"><p>Armando…</p></div>';const conF=p=>S.min[p.producto_id]?.foto,act=p=>S.min[p.producto_id]?.a!==false&&+p['precio_'+l]>0,azar=a=>a.length?a[Math.floor(Math.random()*a.length)]:null;
  const fam=p=>(p.familia||'').trim(),cvs=[];let txt='',nom='instagram';
  try{if(tipo=='oferta'){const of=S.productos.filter(p=>act(p)&&promoCerca(p.producto_id,l)).sort((a,b)=>!!conF(b)-!!conF(a)),p=azar(of.slice(0,8));if(!p)throw 'No hay productos en oferta: armá una en Ofertas.';const it=itemFolleto(p,l);
      cvs.push(await dibujarFolleto([it],{fmt:'post',lista:l,titulo:'OFERTA',sub:'de la semana',vig:'Hasta agotar stock'}),await dibujarFolleto([it],{fmt:'historia',lista:l,titulo:'OFERTA',sub:'de la semana',vig:'Hasta agotar stock'}));
      txt=`🔥 OFERTA DE LA SEMANA\n${p.descripcion}${it.pct?' con '+nf(it.pct)+' % OFF':''}: ${$m(it.p)}${it.ant?' (antes '+$m(it.ant)+')':''}${it.cond?'\n'+it.cond:''}\nPara kioscos, almacenes y dietéticas.`+pieIG()+'\n\n'+hashtagsIG([fam(p),p.marca]);nom='oferta'}
    else if(tipo=='novedad'){const nv=S.productos.filter(p=>act(p)&&S.min[p.producto_id]?.nv),p=azar(nv)||azar(S.productos.filter(p=>act(p)&&conF(p)))||azar(S.productos.filter(act));if(!p)throw 'No hay productos para mostrar.';const it=itemFolleto(p,l),es=nv.includes(p);
      cvs.push(await dibujarFolleto([it],{fmt:'post',lista:l,titulo:es?'NUEVO':'RECOMENDADO',sub:es?'¡Llegó!':'de la semana',vig:''}),await dibujarFolleto([it],{fmt:'historia',lista:l,titulo:es?'NUEVO':'RECOMENDADO',sub:es?'¡Llegó!':'de la semana',vig:''}));
      txt=`${es?'✨ ¡LLEGÓ!':'👌 RECOMENDADO'}\n${p.descripcion}: ${$m(it.p)}\n${es?'Ya lo tenemos para tu negocio.':'Uno de los que más se venden.'}`+pieIG()+'\n\n'+hashtagsIG([fam(p),p.marca,'novedades']);nom='novedad'}
    else if(tipo=='combo'){const cb=azar(S.combos||[]);if(!cb)throw 'No hay combos activos: armá uno en Ofertas → Combos.';const v=comboPrecio(cb,l),it={d:'🎁 '+cb.nombre,img:S.min[(cb.items||[]).find(x=>S.min[x.id]?.foto)?.id]?.foto||'',p:v.p,ant:v.s,pct:+cb.descuento_pct,cond:comboTxt(cb)};
      cvs.push(await dibujarFolleto([it],{fmt:'post',lista:l,titulo:'COMBO',sub:'con descuento',vig:''}),await dibujarFolleto([it],{fmt:'historia',lista:l,titulo:'COMBO',sub:'con descuento',vig:''}));
      txt=`🎁 COMBO ${cb.nombre.toUpperCase()}\n${comboTxt(cb)}\nA ${$m(v.p)} (−${nf(cb.descuento_pct)} %)`+pieIG()+'\n\n'+hashtagsIG(['combos','ofertas']);nom='combo'}
    else if(tipo=='cupo'){const{data}=await sb.from('promociones').select('*').not('cupo','is',null).eq('activa',true);const pr=(data||[]).filter(x=>x.cupo!=null&&x.activa)[0];if(!pr)throw 'No hay ofertas por cupo activas: lanzá una en Ofertas → 🔥 Oferta por cupo.';
      const p=S.productos.find(x=>String(x.producto_id)==String(pr.alcance_valor));if(!p)throw 'No encontré el producto de la oferta.';const it=itemFolleto(p,l),q=Math.max(0,pr.cupo-pr.usados);
      cvs.push(await dibujarFolleto([it],{fmt:'post',lista:l,titulo:'SOLO '+pr.cupo,sub:'primeros pedidos',vig:'Quedan '+q}),await dibujarFolleto([it],{fmt:'historia',lista:l,titulo:'QUEDAN '+q,sub:'¡se termina!',vig:''}));
      txt=`⏳ OFERTA POR CUPO\n${p.descripcion} con ${nf(pr.descuento_pct)} % OFF, solo para los primeros ${pr.cupo} pedidos. ¡Quedan ${q}!`+pieIG()+'\n\n'+hashtagsIG([fam(p),'ofertas']);nom='cupo'}
    else if(tipo=='top'){const H=await histAuto(),T=topSemana(H,5);if(T.length<3)throw 'Todavía no hay suficientes ventas esta semana.';const its=T.map(p=>itemFolleto(p,l));
      cvs.push(await dibujarFolleto(its.slice(0,4),{fmt:'post',lista:l,titulo:'TOP '+T.length,sub:'lo más vendido de la semana',vig:''}));for(const[i,it]of its.entries())cvs.push(await dibujarFolleto([it],{fmt:'post',lista:l,titulo:'#'+(i+1),sub:'más vendido',vig:''}));
      txt=`🏆 TOP ${T.length} DE LA SEMANA\nLo que más se llevaron los negocios esta semana:\n${T.map((p,i)=>(i+1)+'. '+p.descripcion).join('\n')}\n¿Ya los tenés en tu negocio? 👀`+pieIG()+'\n\n'+hashtagsIG(['masvendidos',...T.map(fam)]);nom='top'}
    else if(tipo=='testimonio'){const{data,error}=await sb.from('encuestas').select('*').eq('publicar',true).gte('puntaje',4).order('respondida_en',{ascending:false}).limit(6);if(error)throw 'Falta correr ventas-auto3.sql.';
      const E=(data||[]).filter(e=>e.comentario&&e.publicar);if(!E.length)throw 'No hay opiniones publicadas: en Encuestas tocá "Mostrar en el catálogo" en las de 4 y 5 ⭐ (con permiso del cliente).';
      for(const e of E.slice(0,3)){const c=S.clientes.find(x=>x.id==e.cliente_id);cvs.push(await placaTexto({titulo:'Lo que dicen nuestros clientes',tam:64,estrellas:+e.puntaje,texto:'“'+e.comentario+'”',it:true,firma:(c?.razon_social||'')+(c?.rubro?' · '+c.rubro:'')}))}
      txt=`⭐ LO QUE DICEN NUESTROS CLIENTES\nGracias a los negocios que confían en nosotros todas las semanas 🙌`+pieIG()+'\n\n'+hashtagsIG(['clientesfelices']);nom='testimonio'}
  }catch(e){out.innerHTML='<div class="box"><p class="err">'+esc(typeof e=='string'?e:e.message)+'</p></div>';return}
  out.innerHTML='<div class="box" id="ig_im"></div>';mostrarImgs('#ig_im',cvs,k=>nom+'-'+(k+1)+'.jpg',txt);cajaTexto('#ig_o',txt)}
/* ---------- Calendario semanal y guiones de reels ---------- */
async function vIGCal(){await Promise.all([cfgIG(),cargarStock(),cargarPromos()]);const H=await histAuto(),T=topSemana(H,5),nv=S.productos.filter(p=>S.min[p.producto_id]?.nv),of=S.productos.filter(p=>promoCerca(p.producto_id,'mayorista'));
  const lu=new Date(tsAR(lunes())),dia=i=>{const d=new Date(lu);d.setDate(d.getDate()+i);return d.toLocaleDateString('es-AR',{weekday:'long',day:'numeric'})};
  const kio=S.clientes.filter(c=>/kiosco/i.test(c.rubro||'')).map(c=>c.id),qk={};for(const o of H.P)if(kio.includes(o.cliente_id)&&dDesde(o.creado_en)<=60)for(const i of o.pedido_items||[])qk[i.producto_id]=(qk[i.producto_id]||0)+(+i.cantidad||0);
  const top3k=Object.entries(qk).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id])=>nomProd(id));
  const C=[['✨ Novedad',nv[0]?'Mostrá '+nv[0].descripcion:'Mostrá un producto recomendado','novedad'],['🔥 Oferta',of[0]?'Oferta de '+of[0].descripcion:'La oferta de la semana','oferta'],['⭐ Testimonio o detrás de escena','Una opinión real de un cliente, o una foto del depósito armando pedidos','testimonio'],
    ['🎁 Combo','El combo de la semana','combo'],['🏆 Top 5 (carrusel)',T.length?'Lo más vendido: '+T.slice(0,2).map(p=>p.descripcion).join(', ')+'…':'Lo más vendido de la semana','top'],['🎬 Reel','Uno de los guiones de abajo',null],['📲 Historia','"Hacé tu pedido hoy y te llega el lunes" + link de la bio',null]];
  const G=[{t:'📦 Llegó mercadería',e:['Toma de la camioneta o del depósito abriendo cajas (3 s).','Mostrá de cerca '+(nv.slice(0,3).map(p=>p.descripcion).join(', ')||'los productos nuevos')+' (1 producto por toma).','Cierre: vos a cámara "¿Lo querés en tu negocio? Link en la bio".'],tx:['LLEGÓ MERCADERÍA 📦','¡Recién llegado!','Pedilo hoy 👉 link en la bio']},
    {t:'🏆 Lo que más venden los kioscos',e:['Texto grande: "Lo que más venden los kioscos este mes".','Mostrá uno por uno: '+(top3k.join(', ')||'los 3 más vendidos')+'.','Cierre: "¿Te faltan en tu kiosco? Te los llevamos".'],tx:['TOP 3 KIOSCOS 🏆',...(top3k.length?top3k:['#1','#2','#3']),'Pedí 👉 link en la bio']},
    {t:'🛒 Así armamos tu pedido',e:['Llega un pedido por el catálogo (pantalla del celu).','Manos armando las cajas en el depósito, rápido.','Sale la camioneta / entrega en el local con el comerciante.'],tx:['Pedís desde el celu 📱','Lo armamos al toque 📦','Te llega a tu local 🚚']},
    {t:'💰 Cuánto ganás con un producto',e:['Mostrá un producto y su precio mayorista.','Texto: "Lo vendés a $X" (precio sugerido) "y ganás $Y por unidad".','Cierre: "Hacé la cuenta con 1 caja 😉".'],tx:['¿CUÁNTO GANÁS? 💰','Lo comprás a $…','Lo vendés a $…','Pedí 👉 link en la bio']}];
  $('#vs').innerHTML=`<div class="box"><h3>🗓️ Calendario de la semana</h3><p><small>Qué publicar cada día, con tus datos reales. Tocá <b>Armar</b> y te lleva directo a la imagen con su texto.</small></p>
    ${C.map((x,i)=>`<div class="bh cpf"><span><b>${esc(cap1(dia(i)))} · ${x[0]}</b><br><small>${esc(x[1])}</small></span>${x[2]?`<button class="alt" data-icg="${x[2]}">Armar</button>`:''}</div>`).join('')}</div>
  <div class="box"><h3>🎬 Guiones de reels</h3><p><small>Videos cortos (15 a 30 segundos) que se graban con el celular. Cada toma de 2 a 4 segundos, con el texto en pantalla y una música en tendencia.</small></p>
    ${G.map((g,i)=>`<details class="paso"><summary><b>${g.t}</b></summary><ol>${g.e.map(x=>`<li><small>${esc(x)}</small></li>`).join('')}</ol><p><small><b>Texto en pantalla:</b> ${g.tx.map(esc).join(' → ')}</small></p><button class="alt" data-icr="${i}">📋 Copiar guion</button></details>`).join('')}</div>`;
  $$('#vs [data-icg]').forEach(b=>b.onclick=()=>{S.igPre=b.dataset.icg;S.vs='ig';vVentas()});
  $$('#vs [data-icr]').forEach(b=>b.onclick=async()=>{const g=G[+b.dataset.icr],t=`REEL: ${g.t}\n\nTomas:\n${g.e.map((x,i)=>(i+1)+'. '+x).join('\n')}\n\nTexto en pantalla: ${g.tx.join(' → ')}\n\nDescripción:\n${g.t} 👀`+pieIG()+'\n\n'+hashtagsIG(['reels']);try{await navigator.clipboard.writeText(t);toast('Guion copiado.')}catch(e){prompt('Copiá:',t)}})}
async function statsCamp(cods){const H=await histAuto();const[vi,pr,pp]=await Promise.all([sb.from('qr_visitas').select('codigo,n').in('codigo',cods),sb.from('prospectos').select('campania,estado').in('campania',cods),sb.from('presupuestos').select('campania').in('campania',cods)]);
  const cl=S.clientes.filter(c=>cods.includes(c.campania));return{vis:(vi.data||[]).reduce((a,x)=>a+x.n,0),alt:(pr.data||[]).length,ped:(pp.data||[]).length,cli:cl.length,venta:cl.reduce((a,c)=>a+(H.C[c.id]?.t||0),0)}}
async function vIGBio(){const{error}=await sb.from('campanias_qr').upsert({codigo:'INSTAGRAM',nombre:'Instagram (link de la bio)',tipo:'redes'},{onConflict:'codigo',ignoreDuplicates:true});if(error&&/campanias_qr/.test(error.message)){$('#vs').innerHTML=SQL_AUT;return}
  const{data:cp}=await sb.from('config_app').select('valor').eq('clave','catalogo_publico').maybeSingle(),s=await statsCamp(['INSTAGRAM']),u=linkBio();
  $('#vs').innerHTML=`<div class="box"><h3>🔗 Tu página para la bio de Instagram</h3><p><small>Una página propia con tu logo, las ofertas de la semana, el catálogo, "Quiero ser cliente" y tu WhatsApp. Pegá el link en la <b>bio</b> de tu Instagram (Editar perfil → Enlaces). Todo lo que entra por ahí queda marcado como <b>📸 Instagram</b> en Captación.</small></p>
    ${cp?.valor?'':'<div class="aviso">Primero activá el <b>catálogo público</b> (Precios → Para salir a vender), porque la página lo usa.</div>'}
    <input readonly value="${esc(u)}" id="bi_u"><div class="fc-acc"><button id="bi_c">📋 Copiar link</button><a class="alt btnl" href="${esc(u)}" target="_blank" rel="noopener">Ver cómo queda</a></div></div>
  <div class="kp"><div class="box"><span class="lab">Visitas desde Instagram</span><span class="num">${s.vis}</span></div><div class="box"><span class="lab">Pidieron ser clientes</span><span class="num">${s.alt}</span></div><div class="box"><span class="lab">Pedidos web</span><span class="num">${s.ped}</span></div><div class="box ok"><span class="lab">Clientes</span><span class="num">${s.cli}</span><span class="det">${$m(s.venta)}</span></div></div>`;
  $('#bi_c').onclick=async()=>{try{await navigator.clipboard.writeText(u);toast('Link copiado: pegalo en tu bio.')}catch(e){$('#bi_u').select();document.execCommand('copy');toast('Link copiado.')}}}
/* ---------- Sorteo en Instagram ---------- */
async function vIGSorteo(){const due=S.perfil.rol=='dueno';const[{data:cf},K]=await Promise.all([sb.from('config_app').select('valor').eq('clave','sorteos_ig').maybeSingle(),cfgIG()]);let L=[];try{L=JSON.parse(cf?.valor||'[]')||[]}catch(e){}
  const cods=L.map(x=>x.codigo),{data:pr}=cods.length?await sb.from('prospectos').select('id,nombre,telefono,rubro,contacto,campania,estado,creado_en').in('campania',cods):{data:[]};
  const link=x=>urlBase('ver=sorteo&qr='+encodeURIComponent(x.codigo)+'&p='+encodeURIComponent(x.premio));
  $('#vs').innerHTML=`<div class="box"><h3>🎁 Sorteo en Instagram para comerciantes</h3><p><small>"Seguinos, etiquetá a un kiosco amigo y anotate en el link". Cada participante deja nombre del negocio, WhatsApp, rubro y su Instagram, y queda cargado como <b>prospecto</b> con su secuencia andando. Al cerrar, el sistema elige un ganador al azar entre los anotados.</small></p>
    ${due?`<div class="g"><label class="f">Premio<input id="so_p" placeholder="Ej.: Caja surtida de golosinas"></label><label class="f">Cierra el<input id="so_c" type="date" value="${diaLocal(new Date(Date.now()+10*864e5))}"></label></div><button id="so_g">Crear sorteo</button>`:''}</div>
  ${L.slice().reverse().map(x=>{const P=(pr||[]).filter(p=>p.campania==x.codigo),abierto=!x.ganador&&x.cierre>=diaLocal(new Date());return`<div class="box"><div class="bh"><h3 style="margin:0">🎁 ${esc(x.premio)}</h3><span class="badge ${x.ganador?'b-entregado':abierto?'b-pendiente':'b-mora30'}">${x.ganador?'Ganador: '+esc(x.ganador.nombre):abierto?'Abierto hasta el '+fd(x.cierre):'Cerrado: elegí el ganador'}</span></div>
    <p><small><b>${P.length}</b> anotados · ${P.filter(p=>p.estado=='cliente').length} ya son clientes</small></p><input readonly value="${esc(link(x))}">
    <div class="fc-acc"><button class="alt" data-soc="${x.codigo}">📋 Copiar link del formulario</button><button class="alt" data-soi="${x.codigo}">🖼️ Imagen y texto del sorteo</button>${due&&!x.ganador&&P.length?`<button data-sog="${x.codigo}">🎲 Elegir ganador</button>`:''}${x.ganador?`<button class="alt" data-sow="${x.codigo}">🖼️ Anunciar ganador</button>`:''}</div>
    ${P.length?`<details><summary><small>Ver anotados</small></summary>${P.map(p=>`<div class="bh cpf"><span>${esc(p.nombre)} <small>· ${esc(p.rubro||'')} · ${esc(p.contacto||'')}</small></span><small>${esc(p.telefono||'')}</small></div>`).join('')}</details>`:''}<div id="so_o_${x.codigo}"></div></div>`}).join('')}`;
  const X=c=>L.find(x=>x.codigo==c),guarda=async()=>{const{error}=await sb.from('config_app').upsert({clave:'sorteos_ig',valor:JSON.stringify(L)});if(error)toast(error.message,1);return !error};
  $('#so_g')&&($('#so_g').onclick=async()=>{const p=$('#so_p').value.trim(),c=$('#so_c').value;if(!p||!c)return toast('Poné el premio y la fecha de cierre.',1);const cod='SORTEO'+Math.random().toString(36).slice(2,6).toUpperCase();
    const{error}=await sb.from('campanias_qr').insert({codigo:cod,nombre:'Sorteo Instagram: '+p,tipo:'redes'});if(error)return toast(/campanias_qr/.test(error.message)?'Falta correr ventas-auto.sql en Supabase.':error.message,1);
    L.push({codigo:cod,premio:p,cierre:c,ganador:null});if(await guarda()){toast('Sorteo creado. Armá la imagen y poné el link en tu bio.');vIGSorteo()}});
  $$('#vs [data-soc]').forEach(b=>b.onclick=async()=>{const u=link(X(b.dataset.soc));try{await navigator.clipboard.writeText(u);toast('Link copiado.')}catch(e){prompt('Copiá:',u)}});
  $$('#vs [data-soi]').forEach(b=>b.onclick=async()=>{const x=X(b.dataset.soi),box='#so_o_'+x.codigo;$(box).innerHTML='<p>Armando…</p>';
    const pasos=['Seguí '+(K.usuario||'nuestra cuenta'),'Etiquetá a un kiosco o almacén amigo','Anotate en el link de la bio'],cv=await placaTexto({titulo:'🎁 SORTEO',tam:110,texto:x.premio,maxL:3,pasos,firma:'Para comerciantes · cierra el '+fd(x.cierre)});
    const cv2=await placaTexto({alto:1920,titulo:'🎁 SORTEO',tam:120,texto:x.premio,maxL:3,pasos,firma:'Cierra el '+fd(x.cierre)});
    const t=`🎁 ¡SORTEO PARA COMERCIANTES!\nSorteamos: ${x.premio}\n\nPara participar:\n1️⃣ Seguí ${K.usuario||'nuestra cuenta'}\n2️⃣ Etiquetá en los comentarios a un kiosco o almacén amigo\n3️⃣ Anotate en el link de la bio (nombre del negocio y WhatsApp)\n\n📅 Cierra el ${fd(x.cierre)}. El ganador se elige al azar entre los anotados y lo anunciamos en las historias.\nVálido para comercios. Sorteo sin obligación de compra.\n\n`+hashtagsIG(['sorteo','sorteoargentina']);
    $(box).innerHTML='<div id="so_im_'+x.codigo+'"></div>';mostrarImgs('#so_im_'+x.codigo,[cv,cv2],k=>'sorteo-'+(k+1)+'.jpg',t);cajaTexto(box,t)});
  $$('#vs [data-sog]').forEach(b=>b.onclick=async()=>{const x=X(b.dataset.sog),P=(pr||[]).filter(p=>p.campania==x.codigo);if(!confirm('¿Elegir el ganador al azar entre '+P.length+' anotados?'))return;const g=P[Math.floor(Math.random()*P.length)];
    x.ganador={id:g.id,nombre:g.nombre,tel:g.telefono||'',fecha:diaLocal(new Date())};if(!await guarda())return;alert('🎉 Ganador: '+g.nombre);if(g.telefono&&confirm('¿Avisarle por WhatsApp?'))window.open('https://wa.me/'+telWA(g.telefono)+'?text='+encodeURIComponent(`¡Hola! 🎉 Te escribimos de *Sabores de mi País*: ¡*${g.nombre}* ganó nuestro sorteo de Instagram! El premio es: *${x.premio}*. Coordinemos la entrega en tu local 😊`),'_blank');vIGSorteo()});
  $$('#vs [data-sow]').forEach(b=>b.onclick=async()=>{const x=X(b.dataset.sow),box='#so_o_'+x.codigo,cv=await placaTexto({alto:1920,titulo:'🎉 ¡TENEMOS GANADOR!',tam:96,texto:x.ganador.nombre,maxL:3,firma:'Ganó: '+x.premio});
    $(box).innerHTML='<div id="so_w_'+x.codigo+'"></div>';mostrarImgs('#so_w_'+x.codigo,[cv],()=>'ganador.jpg','');cajaTexto(box,`🎉 ¡Tenemos ganador del sorteo! Felicitaciones ${x.ganador.nombre} 🙌 Gracias a todos los que participaron.`)})}
/* ---------- Prospectos de Instagram ---------- */
async function vIGPros(){const{data,error}=await sb.from('prospectos').select('*').eq('origen','instagram').order('creado_en',{ascending:false}).limit(500);if(error){$('#vs').innerHTML='<p class="err">'+esc(error.message)+'</p>';return}
  const igu=x=>String(x.instagram||(String(x.contacto||'').startsWith('@')?x.contacto:'')||'').replace(/^@/,'');
  const DM=x=>`¡Hola! 👋 Vi tu cuenta y me encantó ${x.nombre}. Somos *Sabores de mi País*, distribuidora de alimentos: golosinas, snacks, frutos secos y más, con entrega en tu local. ¿Te paso el catálogo con precios mayoristas? Si me dejás tu WhatsApp te lo mando ahora 🙌`;
  $('#vs').innerHTML=`<div class="box"><h3>📥 Prospectos de Instagram</h3><p><small>Cargá los negocios que encontrás en Instagram (buscá por hashtags de tu zona o por quién sigue a la competencia). Te da el mensaje directo listo para copiar. Cuando te pasan el WhatsApp, cargalo y arranca solo la secuencia de la Cola.</small></p>
    <div class="g"><label class="f">Negocio<input id="ip_n" placeholder="Kiosco Lalo"></label><label class="f">Usuario de Instagram<input id="ip_u" placeholder="@kioscolalo"></label><label class="f">Rubro<input id="ip_r" placeholder="Kiosco"></label><label class="f">Zona<input id="ip_z" placeholder="Belgrano"></label></div><button id="ip_g">Agregar</button></div>
  <div class="box">${data.length?data.map(x=>`<div class="vi"><span class="badge ${x.telefono?'b-entregado':x.estado=='contactado'?'b-pendiente':''}">${x.telefono?'📱':x.estado=='contactado'?'💬':'🆕'}</span><div><b>${esc(x.nombre)}</b> <small>· ${esc(x.rubro||'')}${x.zona?' · '+esc(x.zona):''}</small><br><small>${igu(x)?'@'+esc(igu(x)):''} · ${esc(EST_PR[x.estado]||x.estado)}${x.telefono?' · '+esc(x.telefono):''}</small></div>
    <div class="acc">${igu(x)?`<a class="alt btnl" href="https://www.instagram.com/${encodeURIComponent(igu(x))}/" target="_blank" rel="noopener">Abrir perfil</a>`:''}<button class="alt" data-idm="${x.id}">📋 Copiar mensaje</button>${x.telefono?'':`<button class="alt" data-itl="${x.id}">📱 Me pasó el WhatsApp</button>`}</div></div>`).join(''):'<p><small>Todavía no cargaste prospectos de Instagram.</small></p>'}</div>`;
  const P=id=>data.find(x=>x.id==id);
  $('#ip_g').onclick=async()=>{const n=$('#ip_n').value.trim(),u=$('#ip_u').value.trim().replace(/^@?/,'@');if(!n)return toast('Poné el nombre del negocio.',1);
    const row={nombre:n,contacto:u.length>1?u:null,rubro:$('#ip_r').value.trim()||null,zona:$('#ip_z').value.trim()||null,estado:'nuevo',origen:'instagram',observaciones:'Instagram '+(u.length>1?u:''),instagram:u.length>1?u:null};
    let{error}=await sb.from('prospectos').insert(row);if(error&&/instagram/.test(error.message)){const{instagram,...r2}=row;({error}=await sb.from('prospectos').insert(r2))}if(error)return toast(error.message,1);toast('Agregado.');vIGPros()};
  $$('#vs [data-idm]').forEach(b=>b.onclick=async()=>{const x=P(b.dataset.idm),t=DM(x);try{await navigator.clipboard.writeText(t);toast('Mensaje copiado: pegalo en el chat de Instagram.')}catch(e){prompt('Copiá:',t)}
    if(x.estado=='nuevo')await sb.from('prospectos').update({estado:'contactado',ultimo_contacto:diaLocal(new Date()),actualizado_en:new Date().toISOString()}).eq('id',x.id);vIGPros()});
  $$('#vs [data-itl]').forEach(b=>b.onclick=async()=>{const x=P(b.dataset.itl),t=prompt('WhatsApp de '+x.nombre+':','');if(!t)return;if(String(t).replace(/\D/g,'').length<8)return toast('Ese número no parece válido.',1);
    const{error}=await sb.from('prospectos').update({telefono:t.trim(),estado:'nuevo',actualizado_en:new Date().toISOString()}).eq('id',x.id);if(error)return toast(error.message,1);toast('¡Listo! Su secuencia de WhatsApp arranca en la Cola del día.');vIGPros()})}
/* ---------- Catálogo para Instagram Shopping ---------- */
async function vIGShop(){await cargarStock();S.isL=S.isL||'minorista';
  const L=()=>S.productos.filter(p=>S.min[p.producto_id]?.a!==false&&+p['precio_'+S.isL]>0&&/^https:\/\//.test(S.min[p.producto_id]?.foto||''));
  const draw=()=>{const X=L(),sin=S.productos.filter(p=>S.min[p.producto_id]?.a!==false&&+p['precio_'+S.isL]>0).length-X.length;
    $('#vs').innerHTML=`<div class="box"><h3>🛍️ Catálogo para Instagram Shopping</h3><p><small>Un archivo con tus productos en el formato de Meta, para que puedas <b>etiquetarlos en tus publicaciones</b> (con nombre y precio). Se sube en el Commerce Manager de Meta.</small></p>
      <label class="f">Precios de la lista<select id="is_l">${['minorista','mayorista','especial'].map(l=>`<option value="${l}" ${S.isL==l?'selected':''}>${nomL(l)}</option>`).join('')}</select></label>
      <p><b>${X.length}</b> productos con foto y precio${sin>0?` · ${sin} sin foto (no entran: cargales la foto en Precios)`:''}.</p><button id="is_d">⬇️ Descargar catálogo (.csv)</button>
      <ol><li><small>Entrá a <b>business.facebook.com/commerce</b> con la cuenta de tu página → <b>Agregar catálogo</b> → Comercio electrónico.</small></li><li><small>En el catálogo: <b>Fuentes de datos → Agregar artículos → Carga masiva</b> y subí este archivo.</small></li>
        <li><small>En Instagram: Configuración → <b>Empresa → Compras</b> y vinculá el catálogo (Meta lo revisa unos días).</small></li><li><small>Cuando cambien precios o productos, descargá el archivo de nuevo y volvé a subirlo.</small></li></ol></div>`;
    $('#is_l').onchange=e=>{S.isL=e.target.value;draw()};
    $('#is_d').onclick=()=>{if(!X.length)return toast('No hay productos con foto.',1);const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',lk=linkPublico();
      const rows=X.map(p=>[p.codigo||p.producto_id,p.descripcion.slice(0,150),[p.familia,p.marca].filter(Boolean).join(' · ')+' · Sabores de mi País, distribuidora de alimentos',S.inv&&(S.stock[p.producto_id]?.d||0)<=0?'out of stock':'in stock','new',(+p['precio_'+S.isL]).toFixed(2)+' ARS',lk,S.min[p.producto_id].foto,p.marca||'Sabores de mi País']);
      const csv='\ufeff'+['id,title,description,availability,condition,price,link,image_link,brand',...rows.map(r=>r.map(q).join(','))].join('\n');
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='catalogo-instagram-'+S.isL+'.csv';a.click()}};
  draw()}
/* ---------- 1. Combo de siempre ---------- */
function comboDe(c,H){const P=H.P.filter(o=>o.cliente_id==c.id&&o.estado!='cancelado').slice(-6);if(P.length<3)return null;const n={},q={};
  for(const o of P){const vis=new Set();for(const i of o.pedido_items||[]){const id=String(i.producto_id);if(!vis.has(id)){vis.add(id);n[id]=(n[id]||0)+1}q[id]=(q[id]||0)+(+i.cantidad||0)}}
  const it=Object.entries(n).filter(([id,k])=>k/P.length>=.5&&S.productos.some(p=>String(p.producto_id)==id)).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,k])=>({id,q:Math.max(1,Math.round(q[id]/k))}));
  if(it.length<2)return null;const tot=it.reduce((a,x)=>a+precioLista(x.id,c.lista)*x.q,0);return tot>0?{it,tot,min:Math.floor(tot*.9/100)*100}:null}
async function vMiCombo(){const due=S.perfil.rol=='dueno';const[{data:cf},{data:cu,error},H]=await Promise.all([sb.from('config_app').select('valor').eq('clave','micombo').maybeSingle(),sb.from('cupones').select('codigo,cliente_id,hasta,minimo,nota').like('codigo','MICOMBO-%'),histAuto()]);
  if(error){$('#vs').innerHTML='<p class="err">'+esc(error.message)+'</p>';return}let K={pct:3};try{K={...K,...JSON.parse(cf?.valor||'{}')}}catch(e){}const hoy=diaLocal(new Date()),act=(cu||[]).filter(x=>!x.hasta||x.hasta>=hoy);
  const L=S.clientes.filter(c=>c.token_pedidos&&H.C[c.id]&&dDesde(H.C[c.id].ult)<=60).map(c=>({c,cb:comboDe(c,H)})).filter(x=>x.cb);
  $('#vs').innerHTML=`<div class="box"><h3>🧺 Combo de siempre</h3><p><small>Cada cliente ve arriba de su catálogo <b>"Tu combo de siempre"</b> con los productos que lleva en la mayoría de sus pedidos, y un botón para agregarlos todos. Si su pedido llega al total de su combo (con un 10 % de margen), se le aplica solo un descuento chico. Es un cupón personal que vale 35 días: volvé a generarlos una vez por mes.</small></p>
    <div class="g"><label class="f">Descuento del combo %<input id="mc_p" type="number" min="1" max="15" value="${K.pct}" ${due?'':'disabled'}></label></div>
    <p><b>${L.length}</b> clientes con combo posible · <b>${act.length}</b> combos activos ahora</p>${due?`<button id="mc_g">🧺 Generar / actualizar los combos</button>${act.length?' <button class="alt" id="mc_x">Quitar todos</button>':''}`:''}</div>
  <div class="box">${L.slice(0,40).map(x=>`<div class="bh cpf"><span><b>${esc(x.c.razon_social)}</b><br><small>${x.cb.it.map(i=>esc(nomProd(i.id))+' × '+i.q).join(' · ')}</small></span><small>desde ${$m(x.cb.min)}${act.some(a=>a.cliente_id==x.c.id)?' · <span class="sube">✓ activo</span>':''}</small></div>`).join('')||'<p><small>Hace falta que los clientes tengan al menos 3 pedidos.</small></p>'}</div>`;
  $('#mc_g')&&($('#mc_g').onclick=async()=>{const pct=Math.min(15,Math.max(1,+$('#mc_p').value||3));if(!confirm('¿Generar el combo de siempre para '+L.length+' clientes con '+pct+' % de descuento?'))return;$('#mc_g').disabled=true;
    await sb.from('config_app').upsert({clave:'micombo',valor:JSON.stringify({pct})});const del=await sb.from('cupones').delete().like('codigo','MICOMBO-%');if(del.error){$('#mc_g').disabled=false;return toast(del.error.message,1)}
    const hasta=diaLocal(new Date(Date.now()+35*864e5)),rows=L.map(x=>({codigo:codPersonal(x.c,'MICOMBO'),descuento_pct:pct,usos_max:null,minimo:x.cb.min,hasta,cliente_id:x.c.id,nota:JSON.stringify(x.cb.it)}));
    for(let i=0;i<rows.length;i+=200){const{error:e}=await sb.from('cupones').insert(rows.slice(i,i+200));if(e){$('#mc_g').disabled=false;return toast(e.message,1)}}toast('Listo: '+rows.length+' combos activos en los catálogos.');vMiCombo()});
  $('#mc_x')&&($('#mc_x').onclick=async()=>{if(!confirm('¿Quitar todos los combos de siempre?'))return;await sb.from('cupones').delete().like('codigo','MICOMBO-%');vMiCombo()})}
/* ---------- 5. Oferta de último momento ---------- */
async function vCheckout(){const due=S.perfil.rol=='dueno';await Promise.all([cargarStock(),cargarPromos()]);const[{data:cf},H]=await Promise.all([sb.from('config_app').select('valor').eq('clave','oferta_checkout').maybeSingle(),histAuto()]);
  let K=null;try{K=JSON.parse(cf?.valor||'null')}catch(e){}const hoy=diaLocal(new Date()),v=vendidos90(H),on=K&&K.activa&&(!K.hasta||K.hasta>=hoy);
  const sug=S.productos.filter(p=>margenP(p)!=null&&(!S.inv||(S.stock[p.producto_id]?.d||0)>0)).map(p=>({p,m:margenP(p),v:v[String(p.producto_id)]||0})).sort((a,b)=>b.m-a.m).slice(0,8);let sel=null;
  $('#vs').innerHTML=`<div class="box"><h3>🛒 Oferta de último momento</h3><p><small>Cuando el cliente revisa su pedido antes de enviarlo, le aparece <b>un producto a precio especial: "¿Lo sumás?"</b>. Elegí uno con buen margen. En el resto del catálogo no se anuncia.</small></p>
    ${on?`<div class="aviso" style="background:#e8f4ec;color:#14532d">Activa: <b>${esc(nomProd(K.pid))}</b> con −${nf(K.pct)} %${K.hasta?' hasta el '+fd(K.hasta):''}. ${due?'<button class="alt" id="ck_x">Terminar</button>':''}</div>`:''}
    ${due?`<div class="g"><div class="conscan"><input id="ck_q" placeholder="Producto" autocomplete="off"></div><label class="f">Descuento %<input id="ck_p" type="number" min="1" max="50" value="10"></label><label class="f">Hasta<input id="ck_h" type="date" value="${diaLocal(new Date(Date.now()+14*864e5))}"></label></div><div id="ck_r"></div><button id="ck_g">Activar</button>`:''}</div>
  <div class="box"><h3>💡 Sugeridos (los de mejor margen con stock)</h3>${sug.map(x=>`<div class="bh cpf"><span>${esc(x.p.descripcion)} <small>· margen ${nf(Math.round(x.m))} % · vendiste ${nf(Math.round(x.v))} u. en 90 días</small></span>${due?`<button class="alt" data-cks="${x.p.producto_id}">Elegir</button>`:''}</div>`).join('')}</div>`;
  const pick=p=>{sel=p;$('#ck_q').value=p.descripcion;$('#ck_r').innerHTML=''};if(due){buscador('#ck_q','#ck_r',pick);$$('#vs [data-cks]').forEach(b=>b.onclick=()=>{pick(S.productos.find(p=>String(p.producto_id)==b.dataset.cks));window.scrollTo({top:0,behavior:'smooth'})})}
  const apagar=async()=>{const ids=S.promos.filter(r=>r.nombre==CHECK_PRE).map(r=>r.id);if(ids.length)await sb.from('promociones').update({activa:false}).in('id',ids);await sb.from('config_app').upsert({clave:'oferta_checkout',valor:''});await cargarPromos()};
  $('#ck_x')&&($('#ck_x').onclick=async()=>{await apagar();toast('Oferta terminada.');vCheckout()});
  $('#ck_g')&&($('#ck_g').onclick=async()=>{if(!sel)return toast('Elegí el producto.',1);const pct=+$('#ck_p').value;if(!(pct>0&&pct<60))return toast('Revisá el %.',1);const m=margenP(sel);if(m!=null&&m-pct<(S.margenMin??15)&&!confirm('Con ese descuento el margen queda en '+nf(Math.round(m-pct))+' %, debajo de tu mínimo. ¿Seguir igual?'))return;
    await apagar();const h=$('#ck_h').value||null;const{error}=await sb.from('promociones').insert({nombre:CHECK_PRE,descuento_pct:pct,alcance:'producto',alcance_valor:sel.producto_id,minimo_tipo:'ninguno',minimo_unidades:0,listas:null,desde:hoy,hasta:h,activa:true});if(error)return toast(error.message,1);
    await sb.from('config_app').upsert({clave:'oferta_checkout',valor:JSON.stringify({activa:true,pid:String(sel.producto_id),pct,hasta:h})});await cargarPromos();toast('¡Activa! Aparece al revisar el pedido.');vCheckout()})}
/* ---------- 9. Productos para empujar ---------- */
async function vEmpujar(){await Promise.all([cargarStock(),cargarPromos()]);const H=await histAuto(),v=vendidos90(H),hoy=diaLocal(new Date());
  const B=S.productos.map(p=>({p,m:margenP(p),v:v[String(p.producto_id)]||0,st:S.stock[p.producto_id]?.d||0})).filter(x=>x.m!=null&&(!S.inv||x.st>0));if(!B.length){$('#vs').innerHTML='<div class="box"><p><small>Hace falta tener costos cargados.</small></p></div>';return}
  const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]||0},mm=med(B.map(x=>x.m)),mv=med(B.map(x=>x.v));
  const L=B.filter(x=>x.m>=mm&&x.v<=mv).sort((a,b)=>(b.st*(+b.p.costo||0))-(a.st*(+a.p.costo||0))||b.m-a.m).slice(0,25);
  const enPr=id=>S.promos.find(r=>r.alcance=='producto'&&String(r.alcance_valor)==String(id)&&(!r.hasta||r.hasta>=hoy));
  $('#vs').innerHTML=`<div class="box"><h3>🚀 Productos para empujar</h3><p><small>Te dejan <b>más margen que el promedio</b> (${nf(Math.round(mm))} %) pero <b>se venden menos que el promedio</b>. Venderlos más es la forma más rápida de ganar más sin vender más caro. Para cada uno: una oferta corta, un mensaje a los clientes de esa familia y una imagen.</small></p></div>
  <div class="box">${L.map(x=>`<div class="vi"><span class="badge b-entregado">${nf(Math.round(x.m))} %</span><div><b>${esc(x.p.descripcion)}</b><br><small>vendiste ${nf(Math.round(x.v))} u. en 90 días${S.inv?' · stock '+nf(x.st):''}${enPr(x.p.producto_id)?' · <span class="sube">ya está en oferta</span>':''}</small></div>
    <div class="acc">${enPr(x.p.producto_id)?'':`<button class="alt" data-emo="${x.p.producto_id}">🏷️ Oferta 14 días</button>`}<button class="alt wa" data-emw="${x.p.producto_id}">📣 Mensaje</button><button class="alt" data-emi="${x.p.producto_id}">📸 Imagen</button></div></div>`).join('')||'<p><small>No hay productos para empujar.</small></p>'}</div>`;
  $$('#vs [data-emo]').forEach(b=>b.onclick=async()=>{if(S.perfil.rol!='dueno')return toast('Solo el dueño crea ofertas.',1);const p=S.productos.find(x=>String(x.producto_id)==b.dataset.emo),pct=+prompt('Descuento para '+p.descripcion+' (%):','10');if(!(pct>0&&pct<60))return;
    const{error}=await sb.from('promociones').insert({nombre:'Oferta de la semana',descuento_pct:pct,alcance:'producto',alcance_valor:p.producto_id,minimo_tipo:'ninguno',minimo_unidades:0,listas:null,desde:hoy,hasta:diaLocal(new Date(Date.now()+14*864e5)),activa:true});if(error)return toast(error.message,1);await cargarPromos();toast('Oferta creada.');vEmpujar()});
  $$('#vs [data-emw]').forEach(b=>b.onclick=()=>{const p=S.productos.find(x=>String(x.producto_id)==b.dataset.emw),fam=(p.familia||'').trim(),r=enPr(p.producto_id);
    S.vs='campanias';vVentas();setTimeout(()=>{if(fam){$('#cp_s').value='familia';$('#cp_s').onchange();setTimeout(()=>{$('#cp_x').value=fam;$('#cp_x').onchange&&$('#cp_x').onchange()},300)}
      $('#cp_m').value=`¡Hola {nombre}! 👋 Te recomiendo *${p.descripcion}*: se vende muy bien y te deja buen margen${r?'. Esta semana está con *'+nf(r.descuento_pct)+' % de descuento*':''}. Sumalo a tu pedido acá:\n{link}`;$('#cp_m').oninput()},500)});
  $$('#vs [data-emi]').forEach(b=>b.onclick=()=>{S.vs='tarjeta';vVentas();setTimeout(()=>{const p=S.productos.find(x=>String(x.producto_id)==b.dataset.emi);$('#tj_q').value=p.descripcion;$('#tj_q').dispatchEvent(new Event('input'))},400)})}
/* ---------- 10. Pronóstico del mes ---------- */
async function vPronostico(){const H=await histAuto(),hoy=new Date(),mes=diaLocal(hoy).slice(0,7),d=hoy.getDate(),fin=new Date(hoy.getFullYear(),hoy.getMonth()+1,0).getDate();
  const{data:o}=await sb.from('config_app').select('valor').eq('clave','objetivo_'+mes).maybeSingle();const meta=+o?.valor||0;
  const P=H.P.filter(x=>String(x.creado_en).slice(0,7)==mes&&!['pendiente','cancelado'].includes(x.estado)),V=P.reduce((a,x)=>a+ +x.total,0),porDia={};for(const x of P){const k=+diaLocal(new Date(x.creado_en)).slice(8);porDia[k]=(porDia[k]||0)+ +x.total}
  const proy=d>0?V/d*fin:0,falta=Math.max(0,meta-V),ritmo=fin-d+1>0?falta/(fin-d+1):0,ant=diaLocal(new Date(hoy.getFullYear(),hoy.getMonth()-1,1)).slice(0,7),ant2=diaLocal(new Date(hoy.getFullYear(),hoy.getMonth()-2,1)).slice(0,7);
  const este=new Set(H.P.filter(x=>String(x.creado_en).slice(0,7)==mes).map(x=>x.cliente_id)),hab=S.clientes.filter(c=>!este.has(c.id)&&c.telefono).map(c=>{const m1=H.P.filter(x=>x.cliente_id==c.id&&String(x.creado_en).slice(0,7)==ant),m2=H.P.filter(x=>x.cliente_id==c.id&&String(x.creado_en).slice(0,7)==ant2);
    return{c,ok:m1.length&&m2.length,prom:(m1.reduce((a,x)=>a+ +x.total,0)+m2.reduce((a,x)=>a+ +x.total,0))/2}}).filter(x=>x.ok).sort((a,b)=>b.prom-a.prom);
  const pot=hab.reduce((a,x)=>a+x.prom,0),mx=Math.max(1,...Object.values(porDia),meta?meta/fin:0);
  $('#vs').innerHTML=`<div class="kp"><div class="box"><span class="lab">Vendido a hoy</span><span class="num">${$m0(V)}</span><span class="det">${d} de ${fin} días</span></div><div class="box ${meta&&proy<meta?'alerta':'ok'}"><span class="lab">Si seguís a este ritmo</span><span class="num">${$m0(proy)}</span><span class="det">${meta?(proy>=meta?'✅ llegás a la meta':'⚠️ te faltarían '+$m(meta-proy)):'cargá la meta en Inicio'}</span></div>
    ${meta?`<div class="box"><span class="lab">Para llegar a ${$m(meta)}</span><span class="num">${$m0(ritmo)}</span><span class="det">por día de acá a fin de mes</span></div>`:''}<div class="box ok"><span class="lab">Clientes habituales que faltan</span><span class="num">${hab.length}</span><span class="det">suelen comprar ${$m(pot)}/mes</span></div></div>
  <div class="box"><h3>📈 Venta por día</h3><div class="cbar">${[...Array(fin)].map((_,i)=>{const k=i+1,vv=porDia[k]||0;return`<div class="cb"><div class="bars"><span class="bc" style="height:${Math.round(vv/mx*100)}%;${k>d?'opacity:.15':''}" title="${$m(vv)}"></span></div><small>${k}</small></div>`}).join('')}</div>${meta?`<p><small>Para llegar a la meta necesitás un promedio de ${$m(meta/fin)} por día.</small></p>`:''}</div>
  <div class="box"><div class="bh"><h3 style="margin:0">🙋 Compraron los 2 meses anteriores y este todavía no</h3>${hab.length?`<button class="wa" id="pr_go">📣 Escribirles hoy (Cola)</button>`:''}</div>
    ${hab.slice(0,30).map(x=>`<div class="bh cpf"><span>${esc(x.c.razon_social)}</span><small>suele comprar ${$m(x.prom)}/mes</small></div>`).join('')||'<p><small>¡Todos tus habituales ya pidieron este mes! 👏</small></p>'}</div>`;
  $('#pr_go')&&($('#pr_go').onclick=async()=>{const P2=await campProg();P2.push({id:'pm'+Date.now(),nombre:'Habituales que faltan este mes',fecha:diaLocal(new Date()),msg:'¡Hola {nombre}! 👋 Te escribo de *Sabores de mi País*: este mes todavía no hiciste tu pedido. ¿Te preparo lo de siempre? Lo armás acá en un minuto:\n{link}',ids:hab.map(x=>x.c.id)});
    if(await guardaCampProg(P2.filter(x=>dDesde(x.fecha)<=7))){toast(hab.length+' mensajes en la Cola del día.');S.vs='cola';S.colaF='campania';vVentas()}})}
/* ---------- 11. Tablero en vivo ---------- */
function vTableroInfo(){$('#vs').innerHTML=`<div class="box"><h3>📺 Tablero en vivo</h3><p><small>Para dejar abierto en una pantalla, TV o tablet del depósito u oficina: venta de hoy, pedidos que van entrando, meta del mes, pedidos por aprobar y mejores clientes. Se actualiza solo cada minuto y suena cuando entra un pedido.</small></p>
  <a class="btnl wa big" style="display:inline-block" href="${location.href.split('#')[0]}#tablero" target="_blank" rel="noopener">📺 Abrir tablero en pantalla completa</a><p><small>En la TV: abrí el CRM en el navegador, iniciá sesión y entrá a este link. Tocá F11 (o "pantalla completa").</small></p></div>`}
/* ---------- 12. Premio por pedir online ---------- */
async function vOnline(){const due=S.perfil.rol=='dueno';const[{data:cf},H]=await Promise.all([sb.from('config_app').select('valor').eq('clave','premio_online').maybeSingle(),histAuto()]);let K={activa:false,puntos:200};try{K={...K,...JSON.parse(cf?.valor||'{}')}}catch(e){}
  const act=S.clientes.filter(c=>H.C[c.id]&&dDesde(H.C[c.id].ult)<=60),onl=new Set(H.P.filter(o=>o.origen=='online'&&dDesde(o.creado_en)<=60).map(o=>o.cliente_id)),P30=H.P.filter(o=>dDesde(o.creado_en)<=30&&o.estado!='cancelado'),p30=P30.filter(o=>o.origen=='online').length;
  const nunca=act.filter(c=>!onl.has(c.id)&&c.telefono&&c.token_pedidos).sort((a,b)=>H.C[b.id].t-H.C[a.id].t);
  $('#vs').innerHTML=`<div class="kp"><div class="box"><span class="lab">Clientes que piden online</span><span class="num">${act.length?Math.round(act.filter(c=>onl.has(c.id)).length/act.length*100):0} %</span><span class="det">${act.filter(c=>onl.has(c.id)).length} de ${act.length} activos</span></div><div class="box"><span class="lab">Pedidos online (30 días)</span><span class="num">${P30.length?Math.round(p30/P30.length*100):0} %</span><span class="det">${p30} de ${P30.length}</span></div></div>
  <div class="box"><h3>📲 Premio por pedir online</h3><p><small>Cada pedido que el cliente hace desde su catálogo le suma puntos extra (se acreditan solos). Así se acostumbran a pedir solos y vos ahorrás tiempo de teléfono y WhatsApp. En su catálogo ven el aviso.</small></p>
    <label class="chk"><input type="checkbox" id="on_a" ${K.activa?'checked':''} ${due?'':'disabled'}> Activo</label><label class="f">Puntos extra por pedido online<input id="on_p" type="number" min="1" value="${K.puntos}" ${due?'':'disabled'}></label>${due?'<button id="on_g">Guardar</button>':''}</div>
  <div class="box"><div class="bh"><h3 style="margin:0">Activos que nunca pidieron online (${nunca.length})</h3>${nunca.length?`<button class="wa" id="on_go">▶ Invitarlos (ráfaga)</button>`:''}</div>${nunca.slice(0,40).map(c=>`<div class="bh cpf"><span>${esc(c.razon_social)}</span><small>${H.C[c.id].n} pedidos por otros medios</small></div>`).join('')}</div>`;
  $('#on_g')&&($('#on_g').onclick=async()=>{const{error}=await sb.from('config_app').upsert({clave:'premio_online',valor:JSON.stringify({activa:$('#on_a').checked,puntos:Math.max(1,+$('#on_p').value||200)})});if(error)return toast(error.message,1);toast('Guardado.');vOnline()});
  $('#on_go')&&($('#on_go').onclick=()=>rafaga(nunca.slice(0,40).map(c=>({k:'ol:'+c.id+':'+diaLocal(new Date()).slice(0,7),tipo:'online',c,pri:40,val:0,mot:'Nunca pidió online',txt:`¡Hola ${nomCorto(c)}! 👋 ¿Sabías que podés hacer tus pedidos solo, cuando quieras, desde tu catálogo personal? Ves tus precios, las ofertas y lo mandás en un minuto.${K.activa?' Y cada pedido que hacés por ahí te suma *'+nf(K.puntos)+' puntos extra* 🎁':''}\n${linkPedidos(c)}`}))))}
function listaKg(lista){return S.productos.filter(p=>esPeso(p.producto_id)&&S.min[p.producto_id]?.a!==false).map(p=>{const id=p.producto_id,pz=ppz(id)||1,pu=precioLista(id,lista),pr=promoPara(id,lista,1),pct=pr?+pr.descuento_pct||0:0,pf=pu*(1-pct/100);
  return{id,p,pz:ppz(id),kg:pf/pz,kgA:pct?pu/pz:0,pu:pf,pct,fam:String(p.familia||'Otros').trim()||'Otros'}}).filter(x=>x.pu>0).sort((a,b)=>a.fam.localeCompare(b.fam)||a.p.descripcion.localeCompare(b.p.descripcion))}
function textoKg(L,lista,c){const fams=[...new Set(L.map(x=>x.fam))];
  return (c?`¡Hola ${nomCorto(c)}! 👋 `:'')+`🧀 *Fiambres y quesos · precio por kilo*\n_Sabores de mi País · ${new Date().toLocaleDateString('es-AR')}_\n`+
    fams.map(f=>`\n*${f.toUpperCase()}*\n`+L.filter(x=>x.fam==f).map(x=>`• ${x.p.descripcion}: *${$r(x.kg)}/kg*${x.pct?` 🔥 −${nf(x.pct)} %`:''}${x.pz?` _(pieza ≈ ${kgTxt(x.pz)})_`:''}`).join('\n')).join('\n')+
    `\n\n⚖️ Se venden por pieza entera y se cobran por el peso real.\n👉 Pedí acá: ${c&&c.token_pedidos?linkPedidos(c):linkPublico()}`}
async function imgListaKg(L,lista){const W=1080,H=1350,POR=9,F='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif',out=[],logo=await cargarImg(MARCA.logo);
  for(let k=0;k<L.length;k+=POR){const R=L.slice(k,k+POR),cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
    c.fillStyle='#f6f2ec';c.fillRect(0,0,W,H);const cab=250,g=c.createLinearGradient(0,0,W,cab);g.addColorStop(0,MARCA.n);g.addColorStop(1,MARCA.c);c.fillStyle=g;c.fillRect(0,0,W,cab);
    let tx=48;if(logo){const s=Math.min(170/logo.height,300/logo.width),lw=logo.width*s,lh=logo.height*s;c.drawImage(logo,48,(cab-lh)/2,lw,lh);tx=48+lw+32}
    c.fillStyle='#fff';let fs=84;c.font=`900 ${fs}px ${F}`;while(c.measureText('FIAMBRES Y QUESOS').width>W-tx-48&&fs>40){fs-=4;c.font=`900 ${fs}px ${F}`}c.fillText('FIAMBRES Y QUESOS',tx,cab/2+6);
    c.fillStyle='#ffd54a';c.font=`800 ${Math.round(fs*.5)}px ${F}`;c.fillText('Precio por kilo'+(L.length>POR?` · ${k/POR+1}/${Math.ceil(L.length/POR)}`:''),tx,cab/2+6+fs*.66);
    const av=H-cab-60-170,rh=Math.min(120,av/Math.max(R.length,5)),top=cab+30+(av-rh*R.length)/2;
    R.forEach((x,i)=>{const y=top+i*rh,b=y+rh*.45;c.fillStyle=i%2?'#fff':'#fbf8f3';rrect(c,36,y+4,W-72,rh-8,18);c.fill();
      c.fillStyle='#1c2333';c.font=`700 36px ${F}`;c.textAlign='left';c.fillText(lineas(c,x.p.descripcion,W-470,1)[0],64,b);
      c.fillStyle='#6a7184';c.font=`500 26px ${F}`;c.fillText(x.pz?'Pieza ≈ '+kgTxt(x.pz)+' · ≈ '+$r(x.pu):'Pieza entera · se cobra el peso real',64,b+36);
      c.textAlign='right';c.fillStyle=x.pct?'#d62828':MARCA.c;c.font=`700 30px ${F}`;const kw=c.measureText('/kg').width;c.fillText('/kg',W-64,b+10);c.font=`900 50px ${F}`;c.fillText($r(x.kg),W-64-kw-8,b+10);
      if(x.pct){c.font=`800 24px ${F}`;c.fillText('−'+nf(x.pct)+' % OFERTA',W-64,b+42)}c.textAlign='left'});
    c.fillStyle=MARCA.c;c.fillRect(0,H-150,W,150);c.fillStyle='#fff';c.textAlign='center';c.font=`800 44px ${F}`;c.fillText(S.telEmp?'Pedí por WhatsApp  '+S.telEmp:'Sabores de mi País',W/2,H-86);
    c.font=`500 26px ${F}`;c.fillStyle='rgba(255,255,255,.9)';c.fillText('Pieza entera · se cobra por el peso real · precios con IVA · lista '+lista,W/2,H-40);c.textAlign='left';out.push(cv)}
  return out}
function imprimirKg(L,lista){const w=window.open('','_blank');if(!w)return toast('Permití las ventanas emergentes.',1);const fams=[...new Set(L.map(x=>x.fam))];
  w.document.write(`<html><head><meta charset="utf-8"><title>Fiambres y quesos por kilo - lista ${lista}</title><style>body{font:14px system-ui,Segoe UI,sans-serif;margin:28px;color:#1c2333}h1{color:${MARCA.c};margin:0}.top{display:flex;gap:14px;align-items:center;border-bottom:2px solid ${MARCA.c};padding-bottom:10px}
    table{width:100%;border-collapse:collapse;margin:8px 0 16px}th{background:#eceef3;text-align:left;padding:6px}td{padding:6px;border-bottom:1px solid #dcdfe5}.n{text-align:right;white-space:nowrap}h3{margin:16px 0 0;color:${MARCA.c}}.of{color:#d62828;font-weight:700}small{color:#6a7184}.ayuda{background:#f6e9ec;padding:10px;border-radius:6px}@media print{.ayuda{display:none}}</style><style>${docCss()}</style></head><body>
    <p class="ayuda">Para guardarlo en PDF elegí <b>Guardar como PDF</b> como destino.</p>
    <div class="top">${logoImg(80)}<div><h1>Fiambres y quesos · precio por kilo</h1><div>Sabores de mi País · lista ${esc(lista)} · ${new Date().toLocaleDateString('es-AR')}</div></div></div>
    ${fams.map(f=>`<h3>${esc(f)}</h3><table><tr><th>Producto</th><th class="n">Precio por kilo</th><th class="n">Pieza aprox.</th><th class="n">Valor aprox. de la pieza</th></tr>${L.filter(x=>x.fam==f).map(x=>`<tr><td>${esc(x.p.descripcion)}${x.pct?` <span class="of">−${nf(x.pct)} %</span>`:''}</td><td class="n"><b>${$r(x.kg)}</b>${x.kgA?` <small><s>${$r(x.kgA)}</s></small>`:''}</td><td class="n">${x.pz?kgTxt(x.pz):'—'}</td><td class="n">${x.pz?$r(x.pu):'—'}</td></tr>`).join('')}</table>`).join('')}
    <p><small>Se venden por pieza entera y se cobran por el peso real de cada pieza. Precios con IVA.${S.telEmp?' Pedidos: '+esc(S.telEmp):''}</small></p>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close()}
async function vFiambresKg(){S.fkL=S.fkL||'mayorista';const lista=S.fkL,L=listaKg(lista);
  $('#vs').innerHTML=`<div class="box"><h3>🧀 Lista de fiambres y quesos por kilo</h3><p><small>Tus clientes piensan en <b>precio por kilo</b>: con esta lista comparan con su proveedor de siempre en un segundo. Se arma sola con los productos marcados como <b>por peso</b>, con las ofertas que tengan hoy. Compartila por WhatsApp, imprimila o subila como imagen a los estados e Instagram.</small></p>
    <div class="g"><label class="f">Lista de precios<select id="fk_l">${LISTAS_KG.map(([k,t])=>`<option value="${k}" ${k==lista?'selected':''}>${t}</option>`).join('')}</select></label></div>
    ${L.length?`<div class="tw"><table><tr><th>Producto</th><th class="n">Por kilo</th><th class="n">Pieza ≈</th><th class="n">Valor pieza ≈</th></tr>${L.map(x=>`<tr><td>${esc(x.p.descripcion)}<br><small>${esc(x.fam)}</small>${x.pct?` <span class="promo">−${nf(x.pct)} %</span>`:''}</td><td class="n"><b>${$r(x.kg)}</b></td><td class="n">${x.pz?kgTxt(x.pz):'—'}</td><td class="n">${x.pz?$r(x.pu):'—'}</td></tr>`).join('')}</table></div>
      <div class="fc-acc" style="margin-top:10px"><button class="wa" id="fk_wa">📲 Compartir por WhatsApp</button><button class="alt" id="fk_cp">Copiar texto</button><button class="alt" id="fk_pr">🖨️ Imprimir / PDF</button><button class="alt" id="fk_im">🖼️ Imagen para estados e Instagram</button><button class="alt" id="fk_pz">⚖️ Productos por peso</button></div><div id="fk_img" style="margin-top:10px"></div>`
    :`<p>Todavía no marcaste productos por peso.</p><button id="fk_pz">⚖️ Marcar fiambres y quesos</button>`}</div><div class="box" id="fk_cl"></div>`;
  $('#fk_l').onchange=e=>{S.fkL=e.target.value;vFiambresKg()};$('#fk_pz').onclick=async()=>{await pesablesModal();const t=setInterval(()=>{if(!document.querySelector('.modal')){clearInterval(t);if(S.vs=='fiambres')vFiambresKg()}},600)};
  if(!L.length)return $('#fk_cl').remove();
  $('#fk_wa').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(textoKg(L,lista)),'_blank');
  $('#fk_cp').onclick=async()=>{try{await navigator.clipboard.writeText(textoKg(L,lista));toast('Texto copiado.')}catch(e){prompt('Copiá el texto:',textoKg(L,lista))}};
  $('#fk_pr').onclick=()=>imprimirKg(L,lista);
  $('#fk_im').onclick=async()=>{$('#fk_img').innerHTML='Armando la imagen…';const cv=await imgListaKg(L,lista);mostrarImgs('#fk_img',cv,k=>`fiambres-por-kilo-${k+1}.jpg`,'🧀 Fiambres y quesos por kilo · Sabores de mi País')};
  // A quién mandársela: los que compran fiambres y quesos
  const H=await histAuto(),ids=new Set(L.map(x=>String(x.id))),sem=lunes();
  const C=S.clientes.filter(c=>c.telefono&&c.activo!==false&&H.C[c.id]&&[...H.C[c.id].pr].some(p=>ids.has(p)));
  const{data:ya}=await sb.from('envios_auto').select('cliente_id').eq('tipo','fiambres').gte('enviado_en',new Date(tsAR(sem)).toISOString());const Y=new Set((ya||[]).map(x=>x.cliente_id));
  const P=C.filter(c=>!Y.has(c.id)).sort((a,b)=>(H.C[b.id].tk||0)-(H.C[a.id].tk||0));
  $('#fk_cl').innerHTML=`<h3>📤 Mandársela a los que compran fiambres y quesos</h3><p><small><b>${C.length}</b> clientes compraron fiambres o quesos en los últimos 6 meses${Y.size?` · a ${Y.size} ya se la mandaste esta semana`:''}. A cada uno le llega con <b>su lista de precios</b> y su link para pedir.</small></p>
    ${P.length?`<button class="wa big" id="fk_go">▶ Empezar ráfaga (${P.length})</button>`:'<p><small>No queda nadie para mandarle esta semana. 👍</small></p>'}`;
  $('#fk_go')&&($('#fk_go').onclick=()=>rafaga(P.map(c=>{const l=c.lista||'mayorista',LL=listaKg(l);return{k:'fiambres_'+c.id+'_'+sem,tipo:'fiambres',c,pri:50,val:H.C[c.id].tk||0,acc:'wa',mot:'Lista de fiambres y quesos por kilo ('+l+')',txt:textoKg(LL,l,c)}})))}
/* Vencimientos de fiambres y quesos: avisar a los que lo compran */
async function avisarPorVencer(id,vence){await cargarPromos();const H=await histAuto(),hoy=diaLocal(new Date()),pz=ppz(id);
  const C=S.clientes.filter(c=>c.telefono&&c.activo!==false&&H.C[c.id]?.pr.has(String(id))).sort((a,b)=>(H.C[b.id].tk||0)-(H.C[a.id].tk||0));
  if(!C.length)return toast('Ningún cliente compró este producto en los últimos 6 meses.',1);
  rafaga(C.map(c=>{const l=c.lista||'mayorista',pu=precioLista(id,l),pr=promoPara(id,l,1),pct=pr?+pr.descuento_pct||0:0,pf=pu*(1-pct/100);
    return{k:'porvencer_'+id+'_'+c.id+'_'+hoy,tipo:'porvencer',c,pri:60,val:pf,acc:'wa',mot:'Por vencer: '+nomProd(id)+' ('+fd(vence)+')',
      txt:`¡Hola ${nomCorto(c)}! 👋 Tengo *${nomProd(id)}* a precio especial${pct?` (*−${nf(pct)} %*)`:''}: ${pz?`*${$r(pf/pz)} el kilo* (pieza ≈ ${kgTxt(pz)})`:esKg(id)?`*${$r(pf)} el kilo*`:`*${$m(pf)}*`}. Son las últimas, vencen el ${fd(vence)}. ¿Te separo? 🙌\n👉 ${c.token_pedidos?linkPedidos(c):linkPublico()}`}}))}
/* ---------- 4. Rentabilidad de quesos y fiambres por kilo ---------- */
async function vRentKg(){S.rkD=S.rkD||90;$('#vs').innerHTML='<p>Calculando…</p>';const min=S.margenMin??15;
  const{data,error}=await todo(()=>sb.from('pedidos').select('id,cliente_id,creado_en,pedido_items(*)').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-S.rkD*864e5).toISOString()));
  if(error){$('#vs').innerHTML='<p class="err">'+esc(error.message)+'</p>';return}
  const R={};for(const o of data||[])for(const i of o.pedido_items||[]){const id=i.producto_id;if(!esPeso(id)&&i.peso_real==null)continue;const kg=kgItem(i);if(!(kg>0))continue;
    const p=S.productos.find(x=>x.producto_id==id),z=ppz(id),cu=+i.costo_unitario||+p?.costo||0,ck=esKg(id)||!z?cu:cu/z,r=R[id]=R[id]||{id,kg:0,v:0,c:0,cl:new Set()};
    r.kg+=kg;r.v+=(+i.cantidad||0)*(+i.precio_unitario||0);r.c+=(ck||0)*kg;r.cl.add(o.cliente_id)}
  const L=Object.values(R).map(r=>({...r,g:r.v-r.c,gk:(r.v-r.c)/r.kg,m:r.v>0?(r.v-r.c)/r.v*100:0})).sort((a,b)=>b.g-a.g);
  const T=L.reduce((a,r)=>({kg:a.kg+r.kg,v:a.v+r.v,g:a.g+r.g}),{kg:0,v:0,g:0}),mP=T.v?T.g/T.v*100:0,medKg=L.length?L.map(r=>r.kg).sort((a,b)=>a-b)[Math.floor(L.length/2)]:0;
  const tag=r=>r.m<min?'<span class="badge b-cancelado">⚠️ Revisar precio</span>':r.m>=mP+5&&r.kg<=medKg?'<span class="badge b-entregado">🚀 Empujar</span>':'';
  $('#vs').innerHTML=`<div class="box"><h3>🧀 Rentabilidad de quesos y fiambres</h3><p><small>Cuánto ganás por kilo en cada uno, con el peso real cuando el pedido se pesó. <b>🚀 Empujar</b>: dejan más margen que el promedio y se venden poco. <b>⚠️ Revisar precio</b>: dejan menos del ${nf(min)} %.</small></p>
    <div class="sub">${[30,90,180].map(d=>`<button class="${S.rkD==d?'':'alt'}" data-rkd="${d}">Últimos ${d} días</button>`).join('')}</div>
    <div class="kp"><div class="box"><span class="lab">Kilos vendidos</span><span class="num">${nf(Math.round(T.kg))} kg</span><span class="det">${L.length} productos</span></div><div class="box"><span class="lab">Venta</span><span class="num">${$m0(T.v)}</span><span class="det">${T.kg?$m(T.v/T.kg)+' por kilo':''}</span></div>
      <div class="box ok"><span class="lab">Ganancia</span><span class="num">${$m0(T.g)}</span><span class="det">${pctf(mP)} · ${T.kg?$m(T.g/T.kg)+' por kilo':''}</span></div></div>
    ${L.length?`<div class="tw"><table><tr><th>Producto</th><th class="n">Kilos</th><th class="n">Venta</th><th class="n">Ganancia</th><th class="n">Por kilo</th><th class="n">Margen</th><th class="n">Clientes</th></tr>${L.map(r=>`<tr><td>${esc(nomProd(r.id))} ${tag(r)}</td><td class="n">${nf(Math.round(r.kg*10)/10)}</td><td class="n">${$m(r.v)}</td><td class="n">${$m(r.g)}</td><td class="n"><b>${$m(r.gk)}</b></td><td class="n ${r.m<min?'mora':''}">${pctf(r.m)}</td><td class="n">${r.cl.size}</td></tr>`).join('')}</table></div>
    <div class="fc-acc" style="margin-top:8px"><button class="alt" id="rk_cp">Copiar para Excel</button>${L.some(r=>tag(r).includes('Empujar'))?'<button class="alt" id="rk_em">🚀 Ir a Productos para empujar</button>':''}</div>`
    :'<p>Todavía no hay ventas de quesos y fiambres marcados por peso en este período.</p>'}</div>`;
  $$('#vs [data-rkd]').forEach(b=>b.onclick=()=>{S.rkD=+b.dataset.rkd;vRentKg()});
  $('#rk_cp')&&($('#rk_cp').onclick=()=>copiarTabla(['Producto','Kilos','Venta','Ganancia','Ganancia por kilo','Margen %','Clientes'],L.map(r=>[nomProd(r.id),Math.round(r.kg*10)/10,Math.round(r.v),Math.round(r.g),Math.round(r.gk),Math.round(r.m*10)/10,r.cl.size])));
  $('#rk_em')&&($('#rk_em').onclick=()=>{S.vs='empujar';vVentas()})}
/* ---------- 10. Cierre del día ---------- */
async function cierreDia(d){d=d||diaLocal(new Date());const ini=new Date(tsAR(d)).toISOString(),fin=new Date(new Date(tsAR(d)).getTime()+864e5).toISOString();
  const[re,ga,pp,ne,en,ab,me,ta]=await Promise.all([todo(()=>sb.from('recibos').select('importe,medio,cliente_id,observacion').eq('anulado',false).gte('fecha',ini).lt('fecha',fin)),todo(()=>sb.from('gastos').select('importe,descripcion,medio').eq('fecha',d)),
    todo(()=>sb.from('pagos_proveedor').select('importe,medio').eq('fecha',d)),todo(()=>sb.from('pedidos').select('total').neq('estado','cancelado').gte('creado_en',ini).lt('creado_en',fin)),
    todo(()=>sb.from('pedidos').select('total,numero').eq('estado','entregado').gte('entregado_en',ini).lt('entregado_en',fin)),sb.from('pedidos').select('numero,total,estado,cliente_id').in('estado',['en_reparto','listo']),
    sb.from('mermas').select('costo').gte('fecha',ini).lt('fecha',fin),sb.from('tareas').select('titulo').eq('hecha',false).lte('fecha',d)]);
  if(re.data)re.data=re.data.filter(x=>!/^(Nota de crédito|Retenciones)/.test(x.observacion||''));if(pp.data)pp.data=pp.data.filter(x=>x.medio!='retencion');
  const s=L=>(L||[]).reduce((a,x)=>a+(+x.importe||+x.total||+x.costo||0),0),pm={};for(const r of re.data||[])pm[r.medio]=(pm[r.medio]||0)+(+r.importe||0);
  const ef=(pm.efectivo||0)-s((ga.data||[]).filter(x=>!x.medio||x.medio=='efectivo'))-s((pp.data||[]).filter(x=>x.medio=='efectivo'));
  const SR=(ab.data||[]).filter(o=>o.estado=='en_reparto'),m=document.createElement('div');m.className='modal';document.body.appendChild(m);
  const txt=`🧾 *Cierre del día* · ${fd(d)}\n\n💵 Cobrado: ${$m(s(re.data))}${Object.keys(pm).length?' ('+Object.entries(pm).map(([k,v])=>k+' '+$m(v)).join(', ')+')':''}\n💸 Gastos: ${$m(s(ga.data))} · Pagos a proveedores: ${$m(s(pp.data))}\n👛 Efectivo neto del día: ${$m(ef)}\n🛒 Pedidos nuevos: ${(ne.data||[]).length} · ${$m(s(ne.data))}\n✅ Entregados: ${(en.data||[]).length} · ${$m(s(en.data))}${SR.length?'\n🚚 Quedaron en reparto sin entregar: '+SR.length+' ('+SR.map(o=>'N° '+o.numero).join(', ')+')':''}${s(me.data)?'\n📉 Merma: '+$m(s(me.data)):''}`;
  m.innerHTML=`<div class="mc"><div class="bh"><h3>🧾 Cierre del día · ${fd(d)}</h3><button class="alt" id="cd_x">Cerrar</button></div>
    <div class="kp"><div class="box ok"><span class="lab">Cobrado</span><span class="num">${$m0(s(re.data))}</span><span class="det">${Object.entries(pm).map(([k,v])=>k+' '+$m(v)).join(' · ')||'sin cobros'}</span></div>
      <div class="box"><span class="lab">Salió</span><span class="num">${$m0(s(ga.data)+s(pp.data))}</span><span class="det">gastos ${$m(s(ga.data))} · proveedores ${$m(s(pp.data))}</span></div>
      <div class="box"><span class="lab">Efectivo neto</span><span class="num">${$m0(ef)}</span><span class="det">cobrado en efectivo − gastos y pagos en efectivo</span></div>
      <div class="box"><span class="lab">Pedidos nuevos</span><span class="num">${(ne.data||[]).length}</span><span class="det">${$m(s(ne.data))}</span></div>
      <div class="box ok"><span class="lab">Entregados</span><span class="num">${(en.data||[]).length}</span><span class="det">${$m(s(en.data))}</span></div>
      <div class="box ${SR.length?'alerta':''}"><span class="lab">Sin entregar</span><span class="num">${SR.length}</span><span class="det">${SR.length?'quedaron en reparto: '+SR.map(o=>'N° '+o.numero).join(', '):'todo entregado'}</span></div></div>
    ${s(me.data)?`<p>📉 Merma del día: <b>${$m(s(me.data))}</b></p>`:''}${(ta.data||[]).length?`<p>📝 Tareas pendientes: ${(ta.data||[]).map(t=>esc(t.titulo)).join(' · ')}</p>`:''}
    <p><small>Para contar el efectivo y registrar la diferencia, usá el <b>arqueo de caja</b> en el menú Caja.</small></p>
    <div class="fc-acc"><button class="wa" id="cd_wa">📲 Mandar cierre</button><button class="alt" id="cd_cj">Ir al arqueo de Caja</button></div></div>`;
  m.querySelector('#cd_x').onclick=()=>m.remove();m.querySelector('#cd_wa').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
  m.querySelector('#cd_cj').onclick=()=>{m.remove();S.cjD=d;S.tab='caja';shell()}}
/* 1. Conciliación de transferencias */
async function conciliar(){const m=document.createElement('div');m.className='modal';document.body.appendChild(m);let rows=[];
  m.innerHTML=`<div class="mc"><div class="bh"><h3>🏦 Conciliar transferencias</h3><button class="alt" id="cn_x">Cerrar</button></div>
    <p><small>Descargá los movimientos del banco o de Mercado Pago (Excel, CSV o PDF) y subilos acá, o copiá y pegá las filas. El CRM busca de qué cliente es cada transferencia (por CUIT, nombre o importe) y la registrás como cobro con un toque. Las que ya registraste no se repiten.</small></p>
    <div class="g"><input type="file" id="cn_f" accept=".xlsx,.xls,.ods,.csv,.txt,.pdf"></div><textarea id="cn_t" rows="4" placeholder="…o pegá acá las filas del extracto"></textarea><button class="alt" id="cn_l">Leer movimientos</button><div id="cn_r"></div></div>`;
  const q=s=>m.querySelector(s);q('#cn_x').onclick=()=>m.remove();
  q('#cn_l').onclick=async()=>{const f=q('#cn_f').files[0],t=q('#cn_t').value.trim();if(!f&&!t)return toast('Subí el archivo o pegá las filas.',1);q('#cn_r').innerHTML='<p>Leyendo…</p>';
    try{rows=(f?await leerArchivoLista(f):partirTexto(t)).filter(r=>r.some(c=>c))}catch(e){q('#cn_r').innerHTML='<p class="err">No se pudo leer: '+esc(e.message||e)+'</p>';return}if(!rows.length){q('#cn_r').innerHTML='<p class="err">No encontré filas.</p>';return}
    const nc=Math.max(...rows.map(r=>r.length)),col=i=>rows.map(r=>r[i]||''),esF=v=>/^\d{1,2}[\/.-]\d{1,2}([\/.-]\d{2,4})?/.test(String(v).trim())||/^\d{4}-\d{2}-\d{2}/.test(String(v).trim()),esM=v=>{const n=numAR(v);return n!=null&&Math.abs(n)>0&&/\d[.,]\d{2}$/.test(String(v).trim())};
    const sc=[...Array(nc).keys()].map(i=>{const C=col(i).filter(Boolean);return{i,f:C.filter(esF).length,m:C.filter(esM).length,t:C.reduce((a,v)=>a+(/[a-záéíóúñ]{3,}/i.test(v)?v.length:0),0)}});
    const gF=sc.slice().sort((a,b)=>b.f-a.f)[0]?.i??0,mon=sc.filter(x=>x.m>0).sort((a,b)=>a.i-b.i),gM=mon.length>1?mon[mon.length-2].i:mon[0]?.i??nc-1,gD=sc.filter(x=>x.i!=gF&&x.i!=gM).sort((a,b)=>b.t-a.t)[0]?.i??1,mu=rows.find(r=>r.length==nc)||rows[0];
    const opt=(id,g)=>`<select id="${id}">${[...Array(nc).keys()].map(i=>`<option value="${i}" ${i==g?'selected':''}>Columna ${i+1}: ${esc(mu[i]||'').slice(0,26)}</option>`).join('')}</select>`;
    q('#cn_r').innerHTML=`<p>Leí <b>${rows.length}</b> filas. Decime qué es cada columna (el importe que <b>entró</b>):</p><div class="g"><label class="f">Fecha${opt('cn_cf',gF)}</label><label class="f">Detalle (quién transfirió)${opt('cn_cd',gD)}</label><label class="f">Importe que entró${opt('cn_cm',gM)}</label></div><button id="cn_b">Buscar clientes</button><div id="cn_p"></div>`;
    q('#cn_b').onclick=buscar};
  const buscar=async()=>{const iF=+q('#cn_cf').value,iD=+q('#cn_cd').value,iM=+q('#cn_cm').value;q('#cn_p').innerHTML='Buscando…';
    const[fe,sa,ya]=await Promise.all([todo(()=>sb.from('facturas_estado').select('cliente_id,factura_id,pendiente,vencimiento').gt('pendiente',0.005).order('vencimiento')),todo(()=>sb.from('saldos_clientes').select('*')),cfgJ('conciliados',{h:[]})]);
    const FE=fe.data||[],SA=sa.data||[],YA=new Set(ya.h||[]),CL=S.clientes.filter(c=>c.activo!==false).map(c=>({c,cu:String(c.cuit||'').replace(/\D/g,''),T:new Set(toks(c.razon_social+' '+(c.contacto||'')))}));
    const M=rows.map(r=>{const imp=numAR(r[iM]);if(!(imp>0))return null;const d=String(r[iD]||''),f=String(r[iF]||''),h=(f+'|'+imp+'|'+d).slice(0,120),dg=d.replace(/\D/g,''),T=new Set(toks(d));const sug=[];
      for(const x of CL){let s=0,por=[];if(x.cu.length==11&&dg.includes(x.cu)){s+=1;por.push('CUIT')}const p=parecidoT(x.T,T);if(p>=.5){s+=p*.8;por.push('nombre')}
        const pend=FE.filter(e=>e.cliente_id==x.c.id),sal=+SA.find(e=>e.cliente_id==x.c.id)?.saldo||0;if(pend.some(e=>Math.abs(+e.pendiente-imp)<1)||Math.abs(sal-imp)<1){s+=.5;por.push('importe')}
        if(s>=.5)sug.push({c:x.c,s,por})}
      sug.sort((a,b)=>b.s-a.s);return{f,d,imp,h,ya:YA.has(h),sug:sug.slice(0,3)}}).filter(Boolean);
    q('#cn_p').innerHTML=`<p><b>${M.length}</b> ingresos · <b>${M.filter(x=>!x.ya&&x.sug.length).length}</b> con cliente sugerido${M.some(x=>x.ya)?' · '+M.filter(x=>x.ya).length+' ya registrados':''}</p>
      <div class="tw"><table><tr><th></th><th>Fecha · detalle</th><th class="n">Importe</th><th>Cliente</th></tr>${M.map((x,k)=>`<tr class="${x.ya?'hecho':''}"><td>${x.ya?'✓':`<input type="checkbox" data-cnk="${k}" ${x.sug[0]&&x.sug[0].s>=.8?'checked':''} style="width:auto;margin:0">`}</td><td><small>${esc(x.f)}</small><br>${esc(x.d).slice(0,70)}</td><td class="n"><b>${$m(x.imp)}</b></td>
        <td>${x.ya?'<small>ya registrado</small>':`<select data-cns="${k}" style="margin:0;max-width:220px"><option value="">— Elegí el cliente —</option>${x.sug.map(s=>`<option value="${s.c.id}">${esc(s.c.razon_social)} (${s.por.join(', ')})</option>`).join('')}<option disabled>──────────</option>${S.clientes.filter(c=>c.activo!==false).map(c=>`<option value="${c.id}">${esc(c.razon_social)}</option>`).join('')}</select>`}</td></tr>`).join('')}</table></div>
      <div class="fc-acc"><button id="cn_ok">Registrar los tildados como cobro por transferencia</button></div>`;
    M.forEach((x,k)=>{const s=q(`[data-cns="${k}"]`);if(s&&x.sug[0])s.value=x.sug[0].c.id});
    m.querySelectorAll('[data-cns]').forEach(s=>s.onchange=()=>{const c=q(`[data-cnk="${s.dataset.cns}"]`);if(c)c.checked=!!s.value});
    q('#cn_ok').onclick=async()=>{const K=[...m.querySelectorAll('[data-cnk]:checked')].map(c=>+c.dataset.cnk).filter(k=>q(`[data-cns="${k}"]`).value);if(!K.length)return toast('Tildá al menos uno con cliente elegido.',1);
      if(!confirm('¿Registrar '+K.length+' cobros por transferencia?'))return;q('#cn_ok').disabled=true;let n=0;
      for(const k of K){const x=M[k],cid=q(`[data-cns="${k}"]`).value;let rest=x.imp;const im=[];for(const f of FE.filter(e=>e.cliente_id==cid)){if(rest<=0)break;const a=Math.min(rest,+f.pendiente);if(a<=0)continue;im.push({factura_id:f.factura_id,importe:+a.toFixed(2)});f.pendiente-=a;rest=+(rest-a).toFixed(2)}
        const{error}=await sb.rpc('registrar_cobranza',{p_cliente:cid,p_importe:x.imp,p_medio:'transferencia',p_imputaciones:im});if(error){toast('No se pudo registrar '+$m(x.imp)+': '+error.message,1);continue}YA.add(x.h);x.ya=true;n++}
      await guardaCfgJ('conciliados',{h:[...YA].slice(-3000)});toast(n+' cobros registrados.');buscar()}};}
/* 5. Año contra año */
async function vAnual(){$('#vs').innerHTML='<p>Comparando años…</p>';const hoy=new Date(),y=hoy.getFullYear(),ini=new Date(tsAR((y-1)+'-01-01')).toISOString();
  const{data,error}=await todo(()=>sb.from('pedidos').select('total,creado_en').neq('estado','cancelado').gte('creado_en',ini));if(error){$('#vs').innerHTML='<p class="err">'+esc(error.message)+'</p>';return}
  const V={};for(const o of data||[]){const d=new Date(o.creado_en),k=d.getFullYear()+'-'+d.getMonth();V[k]=(V[k]||0)+(+o.total||0)}
  const MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],A=MES.map((n,i)=>({n,a:V[(y-1)+'-'+i]||0,b:V[y+'-'+i]||0})),mx=Math.max(1,...A.flatMap(x=>[x.a,x.b])),W=600,H=200,bw=(W-40)/12;
  const svg=`<svg viewBox="0 0 ${W} ${H+20}" style="width:100%;max-width:${W}px;height:auto">${A.map((x,i)=>{const X=20+i*bw,ha=x.a/mx*H,hb=x.b/mx*H;return`<rect x="${X+3}" y="${H-ha}" width="${bw/2-4}" height="${ha}" fill="#c9ccd4"><title>${x.n} ${y-1}: ${$m(x.a)}</title></rect><rect x="${X+bw/2}" y="${H-hb}" width="${bw/2-4}" height="${hb}" fill="${MARCA.c}"><title>${x.n} ${y}: ${$m(x.b)}</title></rect><text x="${X+bw/2}" y="${H+14}" font-size="11" text-anchor="middle" fill="#6a7184">${x.n}</text>`}).join('')}</svg>`;
  const m1=hoy.getMonth(),prox=[(m1+1)%12,(m1+2)%12],ly=prox.map(mm=>{const yy=mm>m1?y-1:y;return{mm,ini:new Date(yy,mm,1),fin:new Date(yy,mm+1,1)}});
  const d0=new Date(Math.min(...ly.map(x=>+x.ini))),d1=new Date(Math.max(...ly.map(x=>+x.fin)));
  const[pa,pr]=await Promise.all([todo(()=>sb.from('pedidos').select('creado_en,pedido_items(producto_id,cantidad)').neq('estado','cancelado').gte('creado_en',d0.toISOString()).lt('creado_en',d1.toISOString())),todo(()=>sb.from('pedidos').select('creado_en,pedido_items(producto_id,cantidad)').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-60*864e5).toISOString()))]);
  const qa={},qr={};for(const o of pa.data||[])for(const i of o.pedido_items||[])qa[i.producto_id]=(qa[i.producto_id]||0)+(+i.cantidad||0);for(const o of pr.data||[])for(const i of o.pedido_items||[])qr[i.producto_id]=(qr[i.producto_id]||0)+(+i.cantidad||0);
  const T=Object.entries(qa).map(([id,q])=>({id,q,r:qr[id]||0,x:(qr[id]||0)>0?q/qr[id]:9})).filter(x=>x.q>0&&x.x>=1.3&&S.productos.some(p=>p.producto_id==x.id)).sort((a,b)=>b.q*b.x-a.q*a.x).slice(0,20);
  const tA=A.slice(0,m1+1).reduce((a,x)=>a+x.a,0),tB=A.slice(0,m1+1).reduce((a,x)=>a+x.b,0);
  $('#vs').innerHTML=`<div class="box"><h3>📆 Año contra año</h3><p><small>Gris: ${y-1} · color: ${y}. En lo que va del año vendiste <b>${$m(tB)}</b> contra <b>${$m(tA)}</b> en el mismo período de ${y-1}${tA?' ('+(tB>=tA?'+':'')+pctf((tB/tA-1)*100)+')':''}.</small></p>${svg}
    <div class="tw"><table><tr><th>Mes</th><th class="n">${y-1}</th><th class="n">${y}</th><th class="n">Cambio</th></tr>${A.map((x,i)=>i<=m1||x.a?`<tr><td>${x.n}</td><td class="n">${$m(x.a)}</td><td class="n">${i<=m1?$m(x.b):'—'}</td><td class="n">${i<=m1&&x.a?(x.b>=x.a?'+':'')+pctf((x.b/x.a-1)*100):'—'}</td></tr>`:'').join('')}</table></div></div>
    <div class="box"><h3>🛒 Comprá antes: lo que se vende más en ${prox.map(i=>MES[i]).join(' y ')}</h3><p><small>Lo que vendiste en esos meses el año pasado, comparado con lo que venís vendiendo en los últimos 60 días. Si subió mucho, conviene comprar antes de que suba o falte.</small></p>
    ${T.length?`<div class="tw"><table><tr><th>Producto</th><th class="n">${prox.map(i=>MES[i]).join('+')} ${y-1}</th><th class="n">Últimos 60 días</th><th class="n">Se vende</th></tr>${T.map(x=>`<tr><td>${esc(nomProd(x.id))}</td><td class="n">${esc(cantTxt(x.id,x.q))}</td><td class="n">${esc(cantTxt(x.id,x.r))}</td><td class="n"><b>${x.x>=9?'nuevo':'×'+nf(Math.round(x.x*10)/10)}</b></td></tr>`).join('')}</table></div>`:'<p><small>Todavía no hay datos de esos meses del año pasado.</small></p>'}</div>`}
function menuAplicar(GR){S.GRfull=GR;const MV=S.menuV||{oc:[],fav:[]};if(S.menuV===undefined){S.menuV=null;cfgJ('menu_ventas',{oc:[],fav:[]}).then(v=>{S.menuV=v;if(S.tab=='ventas'&&((v.oc||[]).length||(v.fav||[]).length))vVentas()})}
  let G=GR.map(([g,L])=>[g,L.filter(([k])=>!(MV.oc||[]).includes(k)||k==S.vs)]).filter(([g,L])=>L.length);const all=GR.flatMap(([g,L])=>L);
  if((MV.fav||[]).length)G.unshift(['⭐ Favoritas',MV.fav.map(k=>all.find(x=>x[0]==k)).filter(Boolean)]);return G}
/* C. Garantía "pedido completo" */
async function garantiaCfg(){const G=await cfgJ('garantia',{activa:false,pct:10,dias:30}),m=document.createElement('div');m.className='modal';document.body.appendChild(m);
  m.innerHTML=`<div class="mc"><div class="bh"><h3>✅ Garantía "Pedido completo"</h3><button class="alt" id="ga_x">Cerrar</button></div>
    <p><small>Si a un pedido le faltó algo o llegó mal, al resolver el reclamo se le genera solo un <b>cupón de compensación</b> para su próxima compra, con un mensaje de disculpas. En el catálogo los clientes ven el sello <b>"✅ Pedido completo garantizado"</b>. Genera mucha confianza: casi nadie lo ofrece.</small></p>
    <label class="chk"><input type="checkbox" id="ga_a" ${G.activa?'checked':''}> Ofrecer la garantía (sello en el catálogo y cupón al resolver reclamos)</label>
    <div class="g"><label class="f">Descuento del cupón (%)<input type="number" id="ga_p" min="1" max="50" value="${G.pct}"></label><label class="f">Vence en (días)<input type="number" id="ga_d" min="7" max="120" value="${G.dias}"></label></div>
    <button id="ga_g">Guardar</button></div>`;
  m.querySelector('#ga_x').onclick=()=>m.remove();m.querySelector('#ga_g').onclick=async()=>{const v={activa:m.querySelector('#ga_a').checked,pct:Math.max(1,+m.querySelector('#ga_p').value||10),dias:Math.max(7,+m.querySelector('#ga_d').value||30)};
    const{error}=await guardaCfgJ('garantia',v);if(error)return toast(error.message,1);S.garantia=v;toast(v.activa?'Garantía activada: el sello ya aparece en el catálogo.':'Garantía apagada.');m.remove();if(S.vs=='reclamos')vReclamos()}}
async function vFaq(){const{data:I0,error}=await sb.rpc('faq_info');const I=I0||{};
  if(error){$('#vs').innerHTML=`<div class="box"><h3>💬 Preguntas del catálogo</h3><p class="err">${/faq_info/.test(error.message)?SQL_PRAC:esc(error.message)}</p></div>`;return}
  const F=Object.assign({horario:'',retiro:'',cambios:'',envio:'',pago:'',extras:[],ocultar:[]},I.faq||{});
  const AUTO=[['horario','¿En qué horario atienden?',F.horario?'✔ '+F.horario:'⚠️ Cargá el horario abajo'],
    ['dias','¿Qué días entregan?',(I.zonas||[]).length?'✔ '+I.zonas.map(z=>z.z+': '+diasTxtC(z.dias)).join(' · '):(I.entrega?.dias||[]).length?'✔ '+diasTxtC(I.entrega.dias):'⚠️ Cargá los días de cada zona en Reparto → 🗺️ Zonas y camioneta'],
    ['minimo','¿Hay pedido mínimo?',+I.minimo?'✔ '+$m(I.minimo):'✔ "No hay pedido mínimo"'],['envio','¿Cobran el envío?',+I.envio?'✔ Gratis desde '+$m(I.envio):F.envio?'✔ '+F.envio:'(no aparece: no cargaste envío gratis)'],
    ['pago','¿Cómo puedo pagar?','✔ Efectivo'+(I.pago?', transferencia':'')+(I.mp?', Mercado Pago':'')],['pedido','¿Cómo hago un pedido?','✔ Explicación de cómo pedir'],
    ['peso','¿Cómo se cobran los quesos y fiambres?','✔ Por el peso real'],['seguimiento','¿Puedo ver dónde está mi pedido?','✔ Seguimiento en vivo'],
    ['problema','¿Qué pasa si falta algo o llega mal?',I.garantia?'✔ Con la garantía Pedido completo':'✔ Que avisen desde Mi cuenta']];
  const linkPub=new URL('pedido.html?ver=catalogo#faq',location.href.split('#')[0].split('?')[0]).href;
  $('#vs').innerHTML=`<div class="box"><div class="bh"><h3 style="margin:0">💬 Preguntas frecuentes del catálogo</h3><button class="alt" id="fq_v">👀 Ver como cliente</button></div>
    <p><small>En el catálogo aparece <b>❓ Preguntas frecuentes</b> con las respuestas armadas solas con lo que ya cargaste (días de cada zona, mínimo, envío gratis, formas de pago, garantía). Si cambiás algo en el CRM, la respuesta se actualiza sola. Así te escriben menos para preguntar.</small></p>
    <h4>Las que se arman solas</h4>${AUTO.map(([k,p,r])=>`<div class="vi" style="align-items:center;padding:4px 0"><label class="chk" style="flex:1;margin:0"><input type="checkbox" data-fqo="${k}" ${F.ocultar.includes(k)?'':'checked'} style="width:auto;margin:0 8px 0 0"><span><b>${p}</b><br><small>${esc(r)}</small></span></label></div>`).join('')}
    <h4>Completá</h4><div class="g"><label class="f">Horario de atención<input id="fq_h" placeholder="Ej.: Lunes a viernes de 8 a 17 y sábados de 8 a 13" value="${esc(F.horario)}"></label>
      <label class="f">¿Se puede retirar por el depósito? (vacío = no aparece)<input id="fq_r" placeholder="Ej.: Sí, de lunes a viernes de 9 a 16 en Av. X 1234" value="${esc(F.retiro)}"></label>
      <label class="f">Cambios y devoluciones (vacío = no aparece)<input id="fq_c" placeholder="Ej.: Si algo llega mal, lo cambiamos en la próxima entrega" value="${esc(F.cambios)}"></label>
      <label class="f">Algo más sobre el envío (opcional)<input id="fq_e" placeholder="Ej.: Fuera de tu zona, consultanos" value="${esc(F.envio)}"></label>
      <label class="f">Algo más sobre los pagos (opcional)<input id="fq_p" placeholder="Ej.: Cuenta corriente a 15 días para clientes habituales" value="${esc(F.pago)}"></label></div>
    <h4>Tus propias preguntas</h4><div id="fq_x"></div><a class="lnk" id="fq_a">+ Agregar una pregunta</a>
    <div class="fc-acc" style="margin-top:12px"><button id="fq_g">Guardar</button><button class="alt" id="fq_l">📋 Copiar link de las preguntas</button></div></div>`;
  let X=(F.extras||[]).map(x=>({...x}));
  const dx=()=>{$('#fq_x').innerHTML=X.map((x,i)=>`<div class="g" style="align-items:end"><input data-fxp="${i}" placeholder="Pregunta" value="${esc(x.p||'')}"><input data-fxr="${i}" placeholder="Respuesta" value="${esc(x.r||'')}"><a class="lnk" data-fxd="${i}">quitar</a></div>`).join('')||'<p><small>Por ejemplo: "¿Venden al público?", "¿Hacen factura A?".</small></p>';
    $$('[data-fxp]').forEach(e=>e.oninput=()=>X[+e.dataset.fxp].p=e.value);$$('[data-fxr]').forEach(e=>e.oninput=()=>X[+e.dataset.fxr].r=e.value);$$('[data-fxd]').forEach(a=>a.onclick=()=>{X.splice(+a.dataset.fxd,1);dx()})};dx();
  $('#fq_a').onclick=()=>{X.push({p:'',r:''});dx()};
  $('#fq_v').onclick=()=>window.open(linkPub,'_blank');
  $('#fq_l').onclick=async()=>{try{await navigator.clipboard.writeText(linkPub);toast('Link copiado: pegalo en WhatsApp o en tu Instagram.')}catch(e){prompt('Copiá el link:',linkPub)}};
  $('#fq_g').onclick=async()=>{const v={horario:$('#fq_h').value.trim(),retiro:$('#fq_r').value.trim(),cambios:$('#fq_c').value.trim(),envio:$('#fq_e').value.trim(),pago:$('#fq_p').value.trim(),
      extras:X.filter(x=>String(x.p||'').trim()&&String(x.r||'').trim()).map(x=>({p:x.p.trim(),r:x.r.trim()})),ocultar:[...$$('[data-fqo]')].filter(c=>!c.checked).map(c=>c.dataset.fqo)};
    const{error}=await guardaCfgJ('faq',v);if(error)return toast(error.message,1);toast('Preguntas guardadas: ya se ven en el catálogo.');vFaq()}}
async function fraccionar(){await cargarStock();const m=document.createElement('div');m.className='modal';document.body.appendChild(m);let O=null,D=[];
  const unidad=id=>esKg(id)?'kg':esPeso(id)?'piezas':'unidades';
  const draw=async()=>{const{data:H,error}=await sb.from('fraccionados').select('*').gte('fecha',new Date(Date.now()-120*864e5).toISOString()).order('fecha',{ascending:false}).limit(500);
    const G={};for(const x of H||[]){const g=G[x.origen_id]=G[x.origen_id]||{n:0,b:0,u:0,m:0,c:0};g.n++;g.b+=+x.kg_bruto;g.u+=+x.kg_util;g.m+=+x.merma_kg;g.c+=+x.merma_kg*(+x.costo/(+x.kg_bruto||1))}
    m.innerHTML=`<div class="mc"><div class="bh"><h3>🔪 Fraccionar hormas y piezas</h3><button class="alt" id="fr_x">Cerrar</button></div>
      <p><small>Comprás la horma o la pieza entera y la cortás para vender por kilo o en cuñas. Cargás cuánto pesó entera y en qué la cortaste: se descuenta la pieza del stock, se suma lo fraccionado, se anota la merma del corte y te calcula el <b>costo real por kilo</b>.</small></p>
      ${error?`<p class="err">${/fraccionados/.test(error.message)?SQL_PRAC:esc(error.message)}</p>`:`<div class="box"><h4 style="margin-top:0">1. ¿Qué cortaste?</h4>
        ${O?`<p><b>${esc(O.descripcion)}</b> · ${unidad(O.producto_id)} · stock ${nf(stk(O.producto_id).f)} <a class="lnk" id="fr_oc">cambiar</a></p>
          <div class="g">${esKg(O.producto_id)?'':`<label class="f">Cuántas ${esPeso(O.producto_id)?'piezas':'unidades'}<input id="fr_n" inputmode="decimal" value="${O._n||1}"></label>`}
          <label class="f">Peso real entero (kg)<input id="fr_kg" inputmode="decimal" placeholder="Ej.: 4,25" value="${O._kg||''}"></label>
          <label class="f">Costo de lo que cortaste ($)<input id="fr_c" inputmode="decimal" placeholder="Costo total" value="${O._c||''}"></label></div>`
        :`<div class="conscan"><input id="fr_q" placeholder="Horma o pieza entera (nombre o código)" autocomplete="off">${btnScan('fr_sc')}</div><div id="fr_r"></div>`}
        ${O?`<h4>2. ¿En qué lo fraccionaste?</h4>${D.map((d,i)=>`<div class="vi" style="align-items:center;gap:8px"><span style="flex:1"><b>${esc(d.p.descripcion)}</b><br><small>${esKg(d.p.producto_id)?'se vende por kilo':esPeso(d.p.producto_id)?'piezas de ≈ '+nf(ppz(d.p.producto_id))+' kg':'por unidad'}</small></span>
            <label class="f" style="max-width:110px">${esKg(d.p.producto_id)?'Kilos':'Cantidad'}<input data-frq="${i}" inputmode="decimal" value="${d.q||''}"></label>
            ${esKg(d.p.producto_id)?'':`<label class="f" style="max-width:110px">Kilos en total<input data-frk="${i}" inputmode="decimal" value="${d.kg||''}"></label>`}<a class="lnk" data-frd="${i}">quitar</a></div>`).join('')}
          <div class="conscan"><input id="fr_dq" placeholder="+ Agregar producto fraccionado (ej.: Pategrás x kg, cuña)" autocomplete="off">${btnScan('fr_dsc')}</div><div id="fr_dr"></div>
          <div id="fr_res"></div>`:''}</div>
      ${Object.keys(G).length?`<h4>Rendimiento de tus cortes (últimos 4 meses)</h4><div class="tw"><table><tr><th>Producto</th><th class="n">Cortes</th><th class="n">Rinde</th><th class="n">Merma</th><th class="n">Plata perdida</th></tr>${Object.entries(G).sort((a,b)=>b[1].c-a[1].c).map(([id,g])=>`<tr><td>${esc(nomProd(id))}</td><td class="n">${g.n}</td><td class="n ${g.u/g.b<.9?'mora':''}">${pctf(Math.round(g.u/g.b*1000)/10)}</td><td class="n">${nf(Math.round(g.m*100)/100)} kg</td><td class="n">${$m(g.c)}</td></tr>`).join('')}</table></div>
        <h4>Últimos cortes</h4><div class="tw"><table>${(H||[]).slice(0,12).map(x=>`<tr><td><small>${fd(String(x.fecha).slice(0,10))}</small></td><td>${esc(nomProd(x.origen_id))}<br><small>${(x.destinos||[]).map(d=>esc(nomProd(d.id))+' '+nf(d.q)).join(' · ')}</small></td><td class="n">${nf(x.kg_bruto)} → ${nf(x.kg_util)} kg</td><td class="n">${$m(x.costo_kg)}/kg</td></tr>`).join('')}</table></div>`:''}`}</div>`;
    const q=s=>m.querySelector(s);q('#fr_x').onclick=()=>m.remove();if(error)return;
    if(!O){buscador('#fr_q','#fr_r',p=>{O=p;O._n=1;D=[];draw()});q('#fr_sc').onclick=()=>escanear('Horma o pieza',p=>{O=p;O._n=1;D=[];draw();return '✔ '+p.descripcion});return}
    q('#fr_oc').onclick=()=>{O=null;D=[];draw()};
    const add=p=>{if(p.producto_id==O.producto_id)return toast('Elegí el producto en que lo cortaste (otro distinto).',1);if(D.some(d=>d.p.producto_id==p.producto_id))return;D.push({p,q:'',kg:''});sv();draw()};
    buscador('#fr_dq','#fr_dr',add);q('#fr_dsc').onclick=()=>escanear('Producto fraccionado',p=>{add(p);return '✔ '+p.descripcion});
    const sv=()=>{const n=q('#fr_n');O._n=n?n.value:O._n;O._kg=q('#fr_kg').value;O._c=q('#fr_c').value;
      D.forEach((d,i)=>{d.q=q(`[data-frq="${i}"]`)?.value??d.q;const k=q(`[data-frk="${i}"]`);if(k)d.kg=k.value})};
    const calc=()=>{sv();const id=O.producto_id,kgB=sumaKg(O._kg),n=esKg(id)?kgB:+String(O._n||'').replace(',','.')||0;
      if(!O._c&&kgB>0){const ck=costoKgDe(id);if(ck)O._c=String(Math.round((esKg(id)||esPeso(id)?ck*kgB:(+O.costo||0)*n)*100)/100);if(q('#fr_c'))q('#fr_c').value=O._c||''}
      const costo=numAR(O._c)||0;
      const L=D.map(d=>{const did=d.p.producto_id,qq=+String(d.q||'').replace(',','.')||0;let kg=esKg(did)?qq:numAR(d.kg)||0;if(!kg&&esPeso(did)&&qq)kg=qq*ppz(did);return{...d,id:did,qq,kg}});
      const kgU=L.reduce((a,x)=>a+x.kg,0),merma=Math.max(0,kgB-kgU),ckU=kgU>0?costo/kgU:0;return{id,kgB,n,costo,L,kgU,merma,ckU}};
    const res=()=>{const c=calc(),box=q('#fr_res');if(!box)return;
      if(!(c.kgB>0)||!c.L.length){box.innerHTML='<p><small>Poné el peso de la pieza entera y agregá en qué la cortaste.</small></p>';return}
      if(c.kgU>c.kgB*1.02){box.innerHTML=`<p class="err">Lo fraccionado (${nf(Math.round(c.kgU*100)/100)} kg) pesa más que la pieza entera. Revisá los kilos.</p>`;return}
      box.innerHTML=`<div class="kp"><div class="box"><span class="lab">Rinde</span><span class="num">${pctf(Math.round(c.kgU/c.kgB*1000)/10)}</span><span class="det">${nf(Math.round(c.kgU*100)/100)} de ${nf(c.kgB)} kg</span></div>
        <div class="box ${c.merma/c.kgB>.08?'alerta':''}"><span class="lab">Merma del corte</span><span class="num">${nf(Math.round(c.merma*100)/100)} kg</span><span class="det">${c.costo?$m(c.merma*c.costo/c.kgB):''}</span></div>
        <div class="box"><span class="lab">Costo real por kilo</span><span class="num">${c.ckU?$m(c.ckU):'—'}</span><span class="det">${c.costo&&c.kgB?'entero: '+$m(c.costo/c.kgB)+'/kg':''}</span></div></div>
        ${c.ckU&&S.perfil.rol=='dueno'?`<label class="chk"><input type="checkbox" id="fr_uc" checked> Actualizar el costo de lo fraccionado (${c.L.filter(x=>x.qq>0).map(x=>esc(x.p.descripcion)+': '+$m(esPeso(x.id)||esKg(x.id)?c.ckU:c.ckU*x.kg/(x.qq||1))+(esPeso(x.id)||esKg(x.id)?'/kg':' c/u')).join(' · ')}). Los precios se recalculan solos.</label>`:''}
        <div class="g"><input id="fr_no" placeholder="Nota (opcional)"></div><button id="fr_g">Guardar el corte</button>`;
      q('#fr_g').onclick=guardar};
    const guardar=async()=>{const c=calc();if(c.L.some(x=>!(x.qq>0)))return toast('Poné la cantidad de cada producto fraccionado.',1);if(!(c.n>0))return toast('Poné cuántas piezas cortaste.',1);
      const oid=c.id,mq=esKg(oid)?c.merma:esPeso(oid)&&ppz(oid)?c.merma/ppz(oid):c.n?c.merma/(c.kgB/c.n):c.merma;
      const p={origen:oid,cantidad:c.n,kg_bruto:Math.round(c.kgB*1000)/1000,kg_util:Math.round(c.kgU*1000)/1000,merma_kg:Math.round(c.merma*1000)/1000,merma_q:Math.round(mq*1000)/1000,costo:Math.round(c.costo*100)/100,
        costo_kg:Math.round(c.ckU*100)/100,costo_kg_bruto:c.kgB?Math.round(c.costo/c.kgB*100)/100:0,destinos:c.L.map(x=>({id:x.id,q:x.qq,kg:Math.round(x.kg*1000)/1000})),nota:q('#fr_no').value.trim(),stock:!!S.inv};
      q('#fr_g').disabled=true;const{error:e}=await sb.rpc('fraccionar',{p});if(e){q('#fr_g').disabled=false;return toast(/fraccionar|mover_stock/.test(e.message)?SQL_PRAC:e.message,1)}
      let msg='Corte guardado: rinde '+pctf(Math.round(c.kgU/c.kgB*1000)/10)+', costo real '+$m(c.ckU)+'/kg.';
      if(q('#fr_uc')?.checked){const it=c.L.map(x=>({id:x.id,costo:Math.round((esPeso(x.id)||esKg(x.id)?c.ckU:c.ckU*x.kg/(x.qq||1))*100)/100})).filter(x=>x.costo>0);
        const{error:e2}=await sb.rpc('fijar_costos',{p_items:it});if(e2)msg+=' No se pudo actualizar el costo: '+e2.message;else{msg+=' Costos actualizados.';await recargarProductos()}}
      await cargarStock();toast(msg);O=null;D=[];draw();if(S.tab=='stock')vStock()};
    m.querySelectorAll('input').forEach(e=>{if(!['fr_dq','fr_q','fr_no'].includes(e.id))e.oninput=()=>{if(e.id=='fr_kg'&&!q('#fr_c').dataset.t)O._c='';if(e.id=='fr_c')q('#fr_c').dataset.t=1;res()}});
    m.querySelectorAll('[data-frd]').forEach(a=>a.onclick=()=>{sv();D.splice(+a.dataset.frd,1);draw()});
    res()};
  draw()}
/* ---------- 9. Votación de productos nuevos ---------- */
async function vVotacion(){const V=await cfgJ('votacion',{activa:false,id:'',pregunta:'¿Qué producto querés que traigamos?',opciones:[],hasta:''});
  const{data,error}=V.id?await sb.from('votos_producto').select('cliente_id,opcion,creado_en').eq('votacion',V.id):{data:[]};
  const cnt={};for(const x of data||[])cnt[x.opcion]=(cnt[x.opcion]||0)+1;const tot=(data||[]).length;
  $('#vs').innerHTML=`<div class="box"><h3>🗳️ Votación de productos nuevos</h3><p><small>Tus clientes votan en su catálogo qué producto querés que traigas. Así sabés qué comprar antes de arriesgarte. Un voto por cliente (lo pueden cambiar).</small></p>
    ${error?`<p class="err">${esFaltaSQL(error)?SQL_AV:esc(error.message)}</p>`:''}
    ${V.id&&(V.opciones||[]).length?`<h4>Resultados${tot?' · '+tot+' votos':''}</h4>${V.opciones.map(o=>{const n=cnt[o.id]||0,pc=tot?Math.round(n/tot*100):0;return `<div style="margin:6px 0"><div class="bh"><span>${esc(o.t)}</span><b>${n} (${pc} %)</b></div><div class="barra"><i style="width:${pc}%"></i></div></div>`}).join('')}
      ${tot?`<p><small>Votaron: ${[...new Set((data||[]).map(x=>nomCli(x.cliente_id)))].slice(0,30).map(esc).join(', ')}</small></p>`:''}`:''}
    <h4>Armar la votación</h4><label class="chk"><input type="checkbox" id="vo_a" ${V.activa?'checked':''}> Mostrarla en el catálogo</label>
    <div class="g"><input id="vo_p" value="${esc(V.pregunta||'')}" placeholder="Pregunta"><label class="f">Hasta (opcional)<input type="date" id="vo_h" value="${esc(V.hasta||'')}"></label></div>
    <label class="f">Opciones (una por renglón, de 2 a 6)<textarea id="vo_o" rows="5" placeholder="Pan dulce con frutas&#10;Turrón de maní&#10;Sidra 750 ml">${esc((V.opciones||[]).map(o=>o.t).join('\n'))}</textarea></label>
    <div class="fc-acc"><button id="vo_g">Guardar</button>${V.id?'<button class="alt" id="vo_n">Empezar una votación nueva</button>':''}</div></div>`;
  const leer=nueva=>{const T=$('#vo_o').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,6),old=V.opciones||[];
    return{activa:$('#vo_a').checked,pregunta:$('#vo_p').value.trim()||'¿Qué producto querés que traigamos?',hasta:$('#vo_h').value||'',id:nueva||!V.id?Date.now().toString(36):V.id,opciones:T.map((t,i)=>({id:(!nueva&&old.find(o=>o.t==t)?.id)||('o'+i+Date.now().toString(36)),t}))}};
  const sv=async nueva=>{const v=leer(nueva);if(v.opciones.length<2)return toast('Poné al menos 2 opciones.',1);const{error:e}=await guardaCfgJ('votacion',v);if(e)return toast(e.message,1);toast(v.activa?'Votación guardada: ya se ve en el catálogo.':'Votación guardada (oculta).');vVotacion()};
  $('#vo_g').onclick=()=>sv(false);$('#vo_n')&&($('#vo_n').onclick=()=>{if(confirm('¿Empezar de cero? Los votos actuales quedan guardados pero no se cuentan.'))sv(true)})}
async function vBuscarNegocios(){S.bnR=S.bnR||1;
  $('#vs').innerHTML=`<div class="box"><h3>🗺️ Buscar negocios en el mapa</h3><p><small>Busca en OpenStreetMap (gratis) los comercios de una zona que todavía no son tus clientes ni prospectos. Elegí los que te interesan y quedan cargados como prospectos para contactar o visitar. No todos los negocios figuran en el mapa, pero sale una buena base.</small></p>
    <div class="g"><label class="f">Zona o dirección<input id="bn_z" placeholder="Ej.: Belgrano, CABA · o Av. Cabildo 2000, CABA" value="${esc(S.bnZ||'')}"></label>
      <label class="f">Radio<select id="bn_r">${[[.5,'500 m'],[1,'1 km'],[2,'2 km'],[3,'3 km']].map(([v,t])=>`<option value="${v}" ${S.bnR==v?'selected':''}>${t}</option>`).join('')}</select></label></div>
    ${[['c','🛒 Comercios'],['g','🍽️ Gastronomía y hoteles']].map(([g,gt])=>`<p style="margin:10px 0 4px"><b>${gt}</b> <a class="lnk" data-bng="${g}">marcar todos</a></p><div class="chk-row">${OSM_TIPOS.filter(x=>x[4]==g).map(([k,t])=>`<label class="chk"><input type="checkbox" class="bn_t" value="${k}" ${(S.bnT||['convenience','kiosk','supermarket','health_food']).includes(k)?'checked':''}> ${t}</label>`).join('')}</div>`).join('')}
    <label class="chk" style="margin-top:8px"><input type="checkbox" id="bn_tel" ${S.bnTel?'checked':''}> Solo los que tienen teléfono</label>
    <button id="bn_g">Buscar</button><div id="bn_o"></div></div>`;
  $$('[data-bng]').forEach(a=>a.onclick=()=>{const cs=[...$$('.bn_t')].filter(c=>OSM_TIPOS.find(x=>x[0]==c.value)[4]==a.dataset.bng),on=!cs.every(c=>c.checked);cs.forEach(c=>c.checked=on)});
  $('#bn_g').onclick=async()=>{const z=$('#bn_z').value.trim();if(!z)return toast('Escribí la zona.',1);S.bnZ=z;S.bnR=+$('#bn_r').value;S.bnTel=$('#bn_tel').checked;const T=[...$$('.bn_t')].filter(x=>x.checked).map(x=>x.value);if(!T.length)return toast('Elegí al menos un tipo de negocio.',1);S.bnT=T;
    $('#bn_o').innerHTML='<p>Buscando la zona…</p>';let c;const cm=z.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);if(cm)c={lat:cm[1],lon:cm[2]};
    if(!c)try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q='+encodeURIComponent(z),{headers:{'Accept-Language':'es'}});c=(await r.json())[0]}catch(e){}
    if(!c){$('#bn_o').innerHTML='<p class="err">No encontré esa zona. Probá con barrio y ciudad, por ejemplo "Villa Urquiza, CABA".</p>';return}
    $('#bn_o').innerHTML='<p>Buscando negocios (puede tardar unos segundos)…</p>';const lat=+c.lat,lon=+c.lon,rad=Math.round(S.bnR*1000);
    /* consulta liviana (nwr), en tandas de pocos tipos y con servidores de respaldo: el público a veces está saturado */
    const SRV=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
    const consulta=async fs=>{const q=`[out:json][timeout:60];(${fs.map(f=>`nwr${f}(around:${rad},${lat},${lon});`).join('')});out center 600;`;
      for(const u of SRV){try{const ct=new AbortController(),tm=setTimeout(()=>ct.abort(),45000);
        const r=await fetch(u,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:ct.signal});clearTimeout(tm);
        if(!r.ok)continue;const j=await r.json();if(j&&Array.isArray(j.elements))return j.elements}catch(e){}}return null};
    const FS=T.map(t=>OSM_TIPOS.find(x=>x[0]==t)[3]),tam=rad>1500?3:6,tandas=[];for(let i=0;i<FS.length;i+=tam)tandas.push(FS.slice(i,i+tam));
    const vistos=new Set(),EL=[];let fallo=0;
    for(let i=0;i<tandas.length;i++){$('#bn_o').innerHTML=`<p>Buscando negocios… (${i+1} de ${tandas.length})</p>`;
      const e=await consulta(tandas[i]);if(!e){fallo++;continue}for(const x of e){const k=x.type+x.id;if(!vistos.has(k)){vistos.add(k);EL.push(x)}}}
    if(fallo==tandas.length){$('#bn_o').innerHTML=`<p class="err">El servicio de mapas no respondió (está saturado). Probá de nuevo en un rato${rad>1000?' o con un radio más chico (1 km)':''}.</p>`;return}
    const J={elements:EL};if(fallo)toast('Algunos tipos de negocio no se pudieron buscar (el servicio de mapas está saturado). Probá de nuevo para completar.',1);
    const{data:pr}=await todo(()=>sb.from('prospectos').select('nombre,lat,lng'));const ex=[...S.clientes.filter(x=>x.lat!=null).map(x=>({n:norm(x.razon_social),p:[+x.lat,+x.lng]})),...(pr||[]).map(x=>({n:norm(x.nombre),p:x.lat!=null?[+x.lat,+x.lng]:null}))];
    const L=(J.elements||[]).map(e=>{const t=e.tags||{},la=e.lat??e.center?.lat,lo=e.lon??e.center?.lon,tp=osmTipo(t,T);
      return{id:e.type+e.id,nombre:t.name||t.brand||'',tipo:tp?.[1]||t.shop||t.amenity||t.tourism||'',rubro:tp?.[2]||'Kiosco',dir:[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' ')||'',ciudad:t['addr:city']||'',tel:t.phone||t['contact:phone']||t['contact:whatsapp']||'',lat:la,lng:lo,d:distKm([lat,lon],[la,lo])}})
      .filter(x=>x.nombre&&x.lat&&(!S.bnTel||x.tel)).filter(x=>!ex.some(y=>y.n==norm(x.nombre)||(y.p&&distKm(y.p,[x.lat,x.lng])<.03))).sort((a,b)=>a.d-b.d);
    if(!L.length){$('#bn_o').innerHTML='<p><small>No encontré negocios nuevos con nombre en esa zona. Probá con un radio más grande u otros tipos.</small></p>';return}
    $('#bn_o').innerHTML=`<p><b>${L.length}</b> negocios que todavía no tenés. ${L.filter(x=>x.tel).length} tienen teléfono.</p><label class="chk"><input type="checkbox" id="bn_all" checked> Seleccionar todos</label>
      <div class="tw"><table>${L.map((x,i)=>`<tr><td><input type="checkbox" class="bn_s" data-i="${i}" checked style="width:auto;margin:0"></td><td><b>${esc(x.nombre)}</b><br><small>${esc(x.tipo)}${x.dir?' · '+esc(x.dir):''}${x.tel?' · 📞 '+esc(x.tel):''}</small></td><td class="n"><small>${x.d<1?Math.round(x.d*1000)+' m':nf(Math.round(x.d*10)/10)+' km'}</small></td></tr>`).join('')}</table></div>
      <button id="bn_imp">Cargar como prospectos</button><p><small>Datos © colaboradores de OpenStreetMap.</small></p>`;
    $('#bn_all').onchange=e=>$$('.bn_s').forEach(c=>c.checked=e.target.checked);
    $('#bn_imp').onclick=async()=>{const S2=[...$$('.bn_s')].filter(c=>c.checked).map(c=>L[+c.dataset.i]);if(!S2.length)return toast('Elegí al menos uno.',1);$('#bn_imp').disabled=true;
      const rows=S2.map(x=>({nombre:x.nombre,rubro:x.rubro,estado:'nuevo',telefono:x.tel||null,domicilio:x.dir?x.dir+(x.ciudad?', '+x.ciudad:''):null,ciudad:x.ciudad||null,observaciones:'Encontrado en el mapa ('+x.tipo+')',lat:+x.lat.toFixed(6),lng:+x.lng.toFixed(6),origen:'mapa'}));
      let{error}=await sb.from('prospectos').insert(rows);if(error&&/lat|lng|origen/.test(error.message))({error}=await sb.from('prospectos').insert(rows.map(({lat,lng,origen,...r})=>r)));
      if(error){$('#bn_imp').disabled=false;return toast(error.message,1)}toast(S2.length+' prospectos cargados. Los ves en el Embudo y en el mapa.');S.vs='embudo';vVentas()}}}
/* ---------- 6 y 7. Metas por marca y reintegros del proveedor ---------- */
async function vProveedores(){const due=S.perfil.rol=='dueno',mes=mesHoy(),[a,b]=mesRango(mes);await cargarStock();
  const[cf,ac]=await Promise.all([sb.from('config_app').select('valor').eq('clave','metas_marca').maybeSingle(),sb.from('config_app').select('valor').eq('clave','acciones_proveedor').maybeSingle()]);
  let M=[],A=[];try{M=JSON.parse(cf.data?.valor||'[]')}catch(e){}try{A=JSON.parse(ac.data?.valor||'[]')}catch(e){}
  const d0=[a,...A.map(x=>x.desde)].sort()[0],d90=diaLocal(new Date(Date.now()-90*864e5)),desde=[d0,d90].sort()[0];
  const{data:pe}=await todo(()=>sb.from('pedidos').select('cliente_id,creado_en,pedido_items(producto_id,cantidad,precio_unitario)').neq('estado','cancelado').gte('creado_en',tsAR(desde)).order('numero'));
  const mk=id=>(S.productos.find(p=>p.producto_id==id)?.marca||'').trim().toUpperCase(),bulto=id=>bul(id)?.n||1;
  const suma=(marca,d1,d2,f)=>{let u=0,cj=0,v=0;const cl=new Set();for(const o of pe||[]){const dd=diaLocal(o.creado_en);if(dd<d1||dd>=d2)continue;for(const i of o.pedido_items||[])if(mk(i.producto_id)==marca.toUpperCase()&&(!f||f(i))){u+=+i.cantidad;cj+=+i.cantidad/bulto(i.producto_id);v+=+i.cantidad*+i.precio_unitario;cl.add(o.cliente_id)}}return{u,cj,v,cl}};
  const marcas=[...new Set(S.productos.map(p=>(p.marca||'').trim()).filter(Boolean))].sort(),hoy=new Date(),dm=new Date(hoy.getFullYear(),hoy.getMonth()+1,0).getDate(),fr=hoy.getDate()/dm;
  const save=(k,v)=>sb.from('config_app').upsert({clave:k,valor:JSON.stringify(v)}).then(({error})=>{if(error)return toast(error.message,1);toast('Guardado.');vProveedores()});
  $('#vs').innerHTML=`<div class="box"><h3>🏭 Metas por marca (${esc(mesNom(mes).toLowerCase())})</h3><p><small>Cuando un proveedor te pone un objetivo ("200 cajas de Maní JL este mes y te damos un bonus"), cargalo acá: ves el avance, si vas en ritmo, y qué clientes que la compran todavía no la pidieron este mes.</small></p>
    ${M.filter(m=>m.mes==mes).map((m,i)=>{const s=suma(m.marca,a,b),val=m.tipo=='pesos'?s.v:m.tipo=='unidades'?s.u:s.cj,pc=Math.min(1,val/m.meta),ok=val/Math.max(fr,.01)>=m.meta;
      const s90=suma(m.marca,d90,b),falta=[...s90.cl].filter(id=>!s.cl.has(id));
      return`<div class="box ${pc>=1?'toca-i':''}" style="margin:8px 0"><div class="bh"><b>${esc(m.marca)}</b><span>${m.tipo=='pesos'?$m(val)+' de '+$m(m.meta):nf(Math.round(val))+' de '+nf(m.meta)+' '+(m.tipo=='unidades'?'unidades':'cajas')}</span></div>
        <div class="barra"><i style="width:${pc*100}%"></i></div><p><small>${pc>=1?'<b class="sube">🎉 ¡Meta cumplida!</b>':ok?'<span class="sube">Vas en ritmo para llegar.</span>':'<span class="baja">A este ritmo no llegás: faltan '+(m.tipo=='pesos'?$m(m.meta-val):nf(Math.ceil(m.meta-val))+(m.tipo=='unidades'?' u.':' cajas'))+'.</span>'}${m.premio?' · Premio: '+esc(m.premio):''}</small></p>
        ${falta.length&&pc<1?`<p><small>La compraron en los últimos 90 días y este mes no (${falta.length}): ${falta.slice(0,12).map(id=>`<a class="lnk" data-mw="${id}" data-mk="${esc(m.marca)}">${esc(S.clientes.find(c=>c.id==id)?.razon_social||'')}</a>`).join(' · ')}</small></p>`:''}
        ${due?`<a class="lnk" data-mx="${i}">Quitar meta</a>`:''}</div>`}).join('')||'<p><small>No hay metas para este mes.</small></p>'}
    ${due?`<div class="g"><label class="f">Marca<select id="mt_m">${marcas.map(m=>`<option>${esc(m)}</option>`).join('')}</select></label><label class="f">Meta<input id="mt_v" type="number" min="1"></label>
      <label class="f">Medida<select id="mt_t"><option value="cajas">Cajas / bultos</option><option value="unidades">Unidades</option><option value="pesos">Pesos ($)</option></select></label><label class="f">Premio del proveedor (opcional)<input id="mt_p" placeholder="Ej.: 3 % de bonificación"></label></div><button class="alt" id="mt_g">+ Agregar meta</button>`:''}</div>
  <div class="box"><h3>💰 Acciones con reintegro</h3><p><small>Si una marca te reintegra un % de lo que vendés en una promo (o un monto por unidad), cargá la acción y el CRM calcula cuánto tenés que reclamarle.</small></p>
    ${A.length?`<table><tr><th>Marca</th><th>Período</th><th class="n">Vendiste</th><th class="n">A reclamar</th><th></th></tr>${A.map((x,i)=>{const s=suma(x.marca,x.desde,diaLocal(new Date(new Date(x.hasta+'T12:00').getTime()+864e5))),r=x.tipo=='unidad'?s.u*x.valor:s.v*x.valor/100;
      return`<tr><td><b>${esc(x.marca)}</b>${x.nota?'<br><small>'+esc(x.nota)+'</small>':''}</td><td><small>${fd(x.desde)} al ${fd(x.hasta)}<br>${x.tipo=='unidad'?$m(x.valor)+' por unidad':nf(x.valor)+' % de la venta'}</small></td><td class="n">${$m(s.v)}<br><small>${nf(Math.round(s.u))} u.</small></td><td class="n"><b>${$m(r)}</b>${x.cobrado?'<br><small class="sube">✓ cobrado</small>':''}</td>
        <td>${due?`<a class="lnk" data-ac="${i}">${x.cobrado?'Pendiente':'Cobrado'}</a> · <a class="lnk" data-ax="${i}">Quitar</a>`:''}</td></tr>`}).join('')}</table>`:'<p><small>No hay acciones cargadas.</small></p>'}
    ${due?`<div class="g"><label class="f">Marca<select id="ac_m">${marcas.map(m=>`<option>${esc(m)}</option>`).join('')}</select></label><label class="f">Desde<input id="ac_d" type="date" value="${a}"></label><label class="f">Hasta<input id="ac_h" type="date" value="${diaLocal(new Date(new Date(b+'T12:00').getTime()-864e5))}"></label>
      <label class="f">Reintegro<select id="ac_t"><option value="pct">% de lo vendido</option><option value="unidad">$ por unidad</option></select></label><label class="f">Valor<input id="ac_v" type="number" min="0" step="0.01"></label><label class="f">Nota<input id="ac_n" placeholder="Ej.: Acción Día del Niño"></label></div><button class="alt" id="ac_g">+ Agregar acción</button>`:''}</div>`;
  $('#mt_g')&&($('#mt_g').onclick=()=>{const v=+$('#mt_v').value;if(!(v>0))return toast('Poné la meta.',1);save('metas_marca',[...M,{mes,marca:$('#mt_m').value,meta:v,tipo:$('#mt_t').value,premio:$('#mt_p').value.trim()}])});
  $$('#vs [data-mx]').forEach(x=>x.onclick=()=>{const L=M.filter(m=>m.mes==mes),q=L[+x.dataset.mx];save('metas_marca',M.filter(m=>m!==q))});
  $('#ac_g')&&($('#ac_g').onclick=()=>{const v=+$('#ac_v').value;if(!(v>0)||!$('#ac_d').value||!$('#ac_h').value)return toast('Completá período y valor.',1);save('acciones_proveedor',[...A,{marca:$('#ac_m').value,desde:$('#ac_d').value,hasta:$('#ac_h').value,tipo:$('#ac_t').value,valor:v,nota:$('#ac_n').value.trim(),cobrado:false}])});
  $$('#vs [data-ac]').forEach(x=>x.onclick=()=>{A[+x.dataset.ac].cobrado=!A[+x.dataset.ac].cobrado;save('acciones_proveedor',A)});
  $$('#vs [data-ax]').forEach(x=>x.onclick=()=>{if(confirm('¿Quitar la acción?')){A.splice(+x.dataset.ax,1);save('acciones_proveedor',A)}});
  $$('#vs [data-mw]').forEach(x=>x.onclick=()=>{const c=S.clientes.find(y=>y.id==x.dataset.mw);if(!c?.telefono)return abrirFicha(c.id);
    window.open('https://wa.me/'+telWA(c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(c)}! Te escribo de *Sabores de mi País* 👋 ¿Te preparo *${x.dataset.mk}*? Este mes tenemos buenas condiciones.`+(c.token_pedidos?'\n'+linkPedidos(c):'')),'_blank')})}
/* ---------- 8. Exhibidores en comodato ---------- */
async function vComodatos(){const due=S.perfil.rol=='dueno';
  const{data,error}=await sb.from('comodatos').select('*').order('id',{ascending:false});if(error){$('#vs').innerHTML=SQL_PRV;return}
  const{data:pe}=await todo(()=>sb.from('pedidos').select('cliente_id,total,pedido_items(producto_id,cantidad,precio_unitario)').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-30*864e5).toISOString()).order('numero'));
  const compra=(cid,marca)=>{let v=0;for(const o of pe||[])if(o.cliente_id==cid){if(!marca)v+=+o.total;else for(const i of o.pedido_items||[])if((S.productos.find(p=>p.producto_id==i.producto_id)?.marca||'').toUpperCase()==marca.toUpperCase())v+=+i.cantidad*+i.precio_unitario}return v};
  const A=data.filter(x=>x.activo).map(x=>({...x,c:S.clientes.find(c=>c.id==x.cliente_id)||{razon_social:'Cliente'},v:compra(x.cliente_id,x.marca)})),mal=A.filter(x=>x.minimo_mes&&x.v<x.minimo_mes);
  $('#vs').innerHTML=`<div class="kp"><div class="box"><span class="lab">Exhibidores prestados</span><span class="num">${A.length}</span></div><div class="box ${mal.length?'alerta':'ok'}"><span class="lab">No cumplen la compra mínima</span><span class="num">${mal.length}</span><span class="det">últimos 30 días</span></div></div>
  <div class="box"><h3>🧊 Exhibidores y heladeras en comodato</h3><p><small>Registrá qué le prestaste a cada cliente (exhibidor, heladera, display) y la compra mínima por mes que acordaron. Te avisa quién no la está cumpliendo.</small></p>
    ${A.length?`<table><tr><th>Cliente</th><th>Qué tiene</th><th class="n">Compró (30 días)</th><th class="n">Mínimo</th><th></th></tr>${A.map(x=>`<tr><td><a class="lnk" data-fc="${x.cliente_id}">${esc(x.c.razon_social)}</a></td><td>${esc(x.tipo)}${x.marca?' · '+esc(x.marca):''}<br><small>desde ${fd(x.desde)}${x.descripcion?' · '+esc(x.descripcion):''}</small></td>
      <td class="n ${x.minimo_mes&&x.v<x.minimo_mes?'baja':'sube'}">${$m(x.v)}</td><td class="n">${x.minimo_mes?$m(x.minimo_mes):'—'}</td><td style="white-space:nowrap">${x.minimo_mes&&x.v<x.minimo_mes&&x.c.telefono?`<button class="alt wa" data-cw="${x.id}">Escribirle</button> `:''}${due?`<a class="lnk" data-cr="${x.id}">Retirado</a>`:''}</td></tr>`).join('')}</table>`:'<p><small>No registraste exhibidores prestados.</small></p>'}
    ${due?`<h3>Registrar un exhibidor</h3><div class="g"><label class="f">Cliente<select id="co_c"><option value="">Elegí…</option>${S.clientes.map(c=>`<option value="${c.id}">${esc(c.razon_social)}</option>`).join('')}</select></label>
      <label class="f">Qué es<input id="co_t" list="dl_co" placeholder="Exhibidor, heladera, display…"><datalist id="dl_co"><option value="Exhibidor"><option value="Heladera"><option value="Display de mostrador"><option value="Canasto"></datalist></label>
      <label class="f">Marca (opcional, para medir solo esa)<input id="co_m" list="dl_mk"><datalist id="dl_mk">${[...new Set(S.productos.map(p=>p.marca).filter(Boolean))].map(m=>`<option value="${esc(m)}">`).join('')}</datalist></label>
      <label class="f">Compra mínima por mes $<input id="co_v" type="number" min="0" step="10000"></label><label class="f">Detalle (N° de serie, etc.)<input id="co_d"></label></div><button id="co_g">Guardar</button>`:''}</div>`;
  $$('#vs [data-fc]').forEach(a=>a.onclick=()=>abrirFicha(a.dataset.fc));
  $('#co_g')&&($('#co_g').onclick=async()=>{const c=$('#co_c').value,t=$('#co_t').value.trim();if(!c||!t)return toast('Elegí el cliente y qué le prestaste.',1);
    const{error}=await sb.from('comodatos').insert({cliente_id:c,tipo:t,marca:$('#co_m').value.trim()||null,minimo_mes:+$('#co_v').value||null,descripcion:$('#co_d').value.trim()||null});if(error)return toast(error.message,1);toast('Guardado.');vComodatos()});
  $$('#vs [data-cr]').forEach(a=>a.onclick=async()=>{if(!confirm('¿Marcar como retirado?'))return;await sb.from('comodatos').update({activo:false}).eq('id',a.dataset.cr);vComodatos()});
  $$('#vs [data-cw]').forEach(b=>b.onclick=()=>{const x=A.find(y=>y.id==b.dataset.cw);window.open('https://wa.me/'+telWA(x.c.telefono)+'?text='+encodeURIComponent(`¡Hola ${nomCorto(x.c)}! Te escribo de *Sabores de mi País*. ¿Cómo va el ${x.tipo.toLowerCase()}${x.marca?' de '+x.marca:''}? Veo que este mes pidieron poco para mantenerlo lleno: ¿te preparo un pedido para reponerlo? 😊`+(x.c.token_pedidos?'\n'+linkPedidos(x.c):'')),'_blank')})}
/* ---------- 9. Freno a morosos (config, en Descuentos y mínimo) ---------- */
async function frenoBox(){const box=$('#rg_fm');if(!box)return;const due=S.perfil.rol=='dueno';
  const{data}=await sb.from('config_app').select('valor').eq('clave','freno_morosos').maybeSingle();let d=null;try{d=JSON.parse(data?.valor||'null')}catch(e){}
  box.innerHTML=`<h3>🚦 Freno a morosos en el catálogo</h3><p><small>Si un cliente tiene facturas vencidas hace más de los días que elijas, el catálogo le muestra su deuda con el botón de pago. Podés solo avisarle, o no dejarlo enviar pedidos hasta que pague. En Pedidos, los pedidos de clientes con deuda se marcan en rojo.</small></p>
    <div class="g"><label class="f">Activar<select id="fm_a" ${due?'':'disabled'}><option value="">No</option><option value="avisar" ${d?.modo=='avisar'?'selected':''}>Sí, avisarle la deuda</option><option value="bloquear" ${d?.modo=='bloquear'?'selected':''}>Sí, y no dejarlo pedir</option></select></label>
      <label class="f">Con deuda vencida de más de (días)<input id="fm_d" type="number" min="1" value="${d?.dias||30}" ${due?'':'disabled'}></label></div>${due?'<button id="fm_g">Guardar</button>':''}`;
  $('#fm_g')&&($('#fm_g').onclick=async()=>{const m=$('#fm_a').value;const{error}=await sb.from('config_app').upsert({clave:'freno_morosos',valor:m?JSON.stringify({modo:m,dias:+$('#fm_d').value||30}):''});if(error)return toast(error.message,1);toast('Guardado.');frenoBox()})}
/* ---------- 11. Cuándo te piden más ---------- */
async function vHorarios(){
  const{data}=await todo(()=>sb.from('pedidos').select('creado_en,origen,total').neq('estado','cancelado').gte('creado_en',new Date(Date.now()-90*864e5).toISOString()).order('numero'));
  S.hoO=S.hoO||'todos';const L=(data||[]).filter(o=>S.hoO=='todos'||(S.hoO=='online'?o.origen=='online':o.origen!='online'));
  const H={},franja=h=>h<9?0:h<12?1:h<15?2:h<18?3:h<21?4:5,FR=['Antes de las 9','9 a 12','12 a 15','15 a 18','18 a 21','Después de las 21'];
  for(const o of L){const d=new Date(new Date(o.creado_en).toLocaleString('en-US',{timeZone:'America/Argentina/Buenos_Aires'})),k=(d.getDay()||7)+'_'+franja(d.getHours());H[k]=(H[k]||0)+1}
  const mx=Math.max(1,...Object.values(H)),best=Object.entries(H).sort((a,b)=>b[1]-a[1]).slice(0,3);
  $('#vs').innerHTML=`<div class="box"><div class="bh"><h3>🕐 Cuándo te piden más</h3><select id="ho_o" style="width:auto"><option value="todos" ${S.hoO=='todos'?'selected':''}>Todos los pedidos</option><option value="online" ${S.hoO=='online'?'selected':''}>Solo online</option><option value="crm" ${S.hoO=='crm'?'selected':''}>Cargados en el CRM</option></select></div>
    <p><small>Pedidos de los últimos 90 días por día y horario. Mandá las campañas y los estados <b>un rato antes</b> de los horarios más fuertes.</small></p>
    ${L.length?`<div class="tw"><table class="heat"><tr><th></th>${DIAS.map(([n,t])=>`<th>${t}</th>`).join('')}</tr>${FR.map((f,i)=>`<tr><td><small>${f}</small></td>${DIAS.map(([n])=>{const v=H[n+'_'+i]||0;return`<td style="background:rgba(123,45,62,${(v/mx*.85).toFixed(2)});color:${v/mx>.5?'#fff':'inherit'}">${v||''}</td>`}).join('')}</tr>`).join('')}</table></div>
    <p>🔥 Los momentos más fuertes: ${best.map(([k,v])=>{const[d,f]=k.split('_');return'<b>'+DIAS_L[+d]+' '+FR[+f].toLowerCase()+'</b> ('+v+')'}).join(' · ')}</p>`:'<p><small>Todavía no hay pedidos suficientes.</small></p>'}</div>`;
  $('#ho_o').onchange=e=>{S.hoO=e.target.value;vHorarios()}}
function vContable(){
  if(S.perfil.rol!='dueno'){$('#v').innerHTML='<p>Solo el dueño puede ver esta sección.</p>';return}
  S.ct=S.ct||'resultados';S.ctMes=S.ctMes||mesHoy();
  if(!S.emisor){datosEmisor().then(()=>{if(S.tab=='contable')vContable()}).catch(()=>{})}
  /* Monotributo: no liquida IVA ni es agente de retención, se ocultan esas pestañas */
  const mono=!/responsable\s*inscripto/i.test(S.emisor?.iva||'Monotributo'),SUBS=CT_SUBS.filter(([k])=>!(mono&&['iva','ret'].includes(k)));if(!SUBS.some(([k])=>k==S.ct))S.ct='resultados';
  $('#v').innerHTML=`<h2>Contable</h2><div class="sub ctsub tabs ct-pg">${SUBS.map(([k,t])=>`<button class="${S.ct==k?'':'alt'}" data-ct="${k}">${t}</button>`).join('')}</div><div id="ct"><span class="skl" role="status" aria-label="Cargando"></span></div>`;
  $$('[data-ct]').forEach(b=>b.onclick=()=>{S.ct=b.dataset.ct;vContable()});
  ({resultados:ctResultados,rentab:ctRentab,iva:ctIVA,ret:ctRet,cheques:ctCheques,bancos:ctBancos,flujo:ctFlujo,stockv:ctStockV,contador:ctContador})[S.ct]();
}
function selMes(fn){return `<div class="mesbar"><button class="alt" id="ms_a" aria-label="Mes anterior">←</button><input type="month" id="ms_m" value="${S.ctMes}"><button class="alt" id="ms_s" aria-label="Mes siguiente">→</button></div>`}
function onMes(fn){$('#ms_a').onclick=()=>{S.ctMes=mesMas(S.ctMes,-1);fn()};$('#ms_s').onclick=()=>{S.ctMes=mesMas(S.ctMes,1);fn()};$('#ms_m').onchange=e=>{if(e.target.value){S.ctMes=e.target.value;fn()}}}
/* Ventas (pedidos aprobados en adelante) con neto sin IVA y costo */
async function ctPedidos(desde,hasta){
  const E=await datosEmisor().catch(()=>({}));S.ctMono=!/responsable\s*inscripto/i.test(E.iva||'');
  const base='id,numero,total,estado,cliente_id,creado_en,descuento_pct';
  let r=await todo(()=>sb.from('pedidos').select(base+',pedido_items(producto_id,cantidad,precio_unitario,costo_unitario)').not('estado','in','(pendiente,cancelado)').gte('creado_en',tsAR(desde)).lt('creado_en',tsAR(hasta)).order('numero'));
  if(r.error)r=await todo(()=>sb.from('pedidos').select(base+',pedido_items(producto_id,cantidad,precio_unitario)').not('estado','in','(pendiente,cancelado)').gte('creado_en',tsAR(desde)).lt('creado_en',tsAR(hasta)).order('numero'));
  if(r.error)throw r.error;
  return r.data.map(o=>{const I=o.pedido_items||[],bruto=I.reduce((a,i)=>a+Number(i.cantidad||0)*Number(i.precio_unitario||0),0),k=bruto>0?Number(o.total||bruto)/bruto:1;
    let neto=0,costo=0,sinC=false;const items=I.map(i=>{const q=Number(i.cantidad||0),a=S.ctMono?0:alic(i.producto_id),v=q*Number(i.precio_unitario||0)*k,n=v/(1+a/100);
      const cu=i.costo_unitario!=null?Number(i.costo_unitario):costoAct(i.producto_id),c=cu>0?q*cu/(1+a/100):0;if(!(cu>0))sinC=true;neto+=n;costo+=c;return{id:i.producto_id,q,v,n,c,sc:!(cu>0)}});
    return{...o,_d:diaLocal(o.creado_en),neto,costo,sinC,items}})}
/* ---------- Resultados ---------- */
async function ctResultados(){
  const box=$('#ct');box.innerHTML=selMes()+'<div id="rs"><span class="skl" role="status" aria-label="Cargando"></span></div>';onMes(ctResultados);
  const m0=mesMas(S.ctMes,-5),[d0]=mesRango(m0),[,d1]=mesRango(S.ctMes);
  let P,G;try{[P,G]=await Promise.all([ctPedidos(d0,d1),todo(()=>sb.from('gastos').select('*').gte('fecha',d0).lt('fecha',d1).order('fecha'))])}catch(e){$('#rs').innerHTML='<p class="err">No se pudieron leer las ventas: '+esc(e.message)+'</p>';return}
  if(G.error){$('#rs').innerHTML='<p class="err">No se pudieron leer los gastos: '+esc(G.error.message)+'</p>';return}
  const meses=[];for(let i=5;i>=0;i--)meses.push(mesMas(S.ctMes,-i));
  const R=meses.map(m=>{const V=P.filter(o=>o._d.slice(0,7)==m),g=G.data.filter(x=>x.fecha.slice(0,7)==m);
    const v=V.reduce((a,o)=>a+o.neto,0),c=V.reduce((a,o)=>a+o.costo,0),ga=g.reduce((a,x)=>a+Number(x.importe||0),0);return{m,v,c,mb:v-c,g:ga,r:v-c-ga,sinC:V.some(o=>o.sinC),n:V.length,G:g}});
  const{data:NCR}=await sb.from('notas_credito').select('fecha,items,repuesto').gte('fecha',d0).lt('fecha',d1);
  for(const n of NCR||[]){const x=R.find(r=>r.m==String(n.fecha).slice(0,7));if(!x)continue;
    for(const it of n.items||[]){const al=S.ctMono?0:alic(it.id),q=Number(it.q);x.v-=q*Number(it.pu)/(1+al/100);if(n.repuesto)x.c-=q*Number(it.cu||costoAct(it.id))/(1+al/100)}x.mb=x.v-x.c;x.r=x.v-x.c-x.g;x.nc=(x.nc||0)+1}
  const a=R[5],b=R[4],cmp=(x,y)=>y>0&&x>0?`<small class="${x>=y?'sube':'baja'}">${x>=y?'▲':'▼'} ${pc1(Math.abs(x-y)/Math.abs(y))} vs mes anterior</small>`:'';
  const gc={};for(const x of a.G)gc[x.categoria]=(gc[x.categoria]||0)+Number(x.importe||0);const gC=Object.entries(gc).sort((x,y)=>y[1]-x[1]),gMax=Math.max(1,...gC.map(x=>x[1]));
  const maxAbs=Math.max(1,...R.map(x=>Math.abs(x.r)));
  $('#rs').innerHTML=`<div class="kp">
    <div class="box"><span class="lab">Ventas${S.ctMono?'':' sin IVA'}</span><span class="num">${$m0(a.v)}</span><span class="det">${a.n} ${a.n==1?'pedido':'pedidos'} ${cmp(a.v,b.v)}</span></div>
    <div class="box"><span class="lab">Margen bruto</span><span class="num">${$m0(a.mb)}</span><span class="det">${a.v?pc1(a.mb/a.v)+' de las ventas':'—'}</span></div>
    <div class="box"><span class="lab">Gastos</span><span class="num">${$m0(a.g)}</span><span class="det">${a.G.length} ${a.G.length==1?'gasto cargado':'gastos cargados'}</span></div>
    <div class="box ${a.r<0?'alerta':'ok'}"><span class="lab">Ganancia del mes</span><span class="num">${$s(a.r)}</span><span class="det">${a.v?pc1(a.r/a.v)+' de las ventas ':''}${cmp(a.r,b.r)}</span></div></div>
  <div class="dos fc2">
    <div class="box"><h3>Estado de resultados · ${mesNom(S.ctMes)}</h3><table>
      <tr><td>Ventas${S.ctMono?'':' (sin IVA)'}</td><td class="n">${$m(a.v)}</td></tr>
      <tr><td>− Costo de la mercadería vendida${S.ctMono?'':' (sin IVA)'}${a.sinC?' <small class="mora">hay productos sin costo</small>':''}</td><td class="n">− ${$m(a.c)}</td></tr>
      <tr class="tot"><td><b>Margen bruto</b></td><td class="n"><b>${$m(a.mb)}</b></td></tr>
      ${gC.map(([k,v])=>`<tr><td>− ${esc(k)}</td><td class="n">− ${$m(v)}</td></tr>`).join('')||'<tr><td>− Gastos</td><td class="n">− '+$m(0)+'</td></tr>'}
      <tr class="tot"><td><b>Ganancia neta</b></td><td class="n ${a.r<0?'mora':''}"><b>${$s(a.r)}</b></td></tr></table>
      <p><small>${S.ctMono?'Ventas = pedidos aprobados en adelante, con el precio que cobrás (sos monotributista, no se descuenta IVA). El costo es el que pagaste por cada producto.':'Ventas = pedidos aprobados en adelante, sin IVA. El costo es el de cada producto al momento de la venta, sin IVA.'} Los gastos se toman como se cargaron en Caja.</small></p></div>
    <div class="box"><h3>Ganancia de los últimos 6 meses</h3>${R.map(x=>`<div class="rbar"><span>${MESES[+x.m.slice(5)-1]+' '+x.m.slice(2,4)}</span><div class="rb"><i class="${x.r<0?'neg':''}" style="width:${(Math.abs(x.r)/maxAbs*100).toFixed(1)}%"></i></div><b class="${x.r<0?'mora':''}">${$s(x.r)}</b></div>`).join('')}
      ${gC.length?`<h3 style="margin-top:16px">Gastos de ${mesNom(S.ctMes)}</h3>${gC.map(([k,v])=>`<div class="gbar"><span>${esc(k)}</span><b>${$m(v)}</b><i style="width:${(v/gMax*100).toFixed(1)}%"></i></div>`).join('')}`:''}</div></div>
  <div class="box"><div class="bh"><h3>Comparativo mensual</h3><button class="alt" id="rs_cp">Copiar para Excel</button></div><div class="tscroll"><table><tr><th>Mes</th><th class="n">Ventas${S.ctMono?'':' s/IVA'}</th><th class="n">Costo</th><th class="n">Margen bruto</th><th class="n">Gastos</th><th class="n">Ganancia</th><th class="n">% s/ventas</th></tr>
    ${R.map(x=>`<tr><td style="white-space:nowrap">${mesNom(x.m).replace(/ de (\d{4})$/,' $1')}</td><td class="n">${$m(x.v)}</td><td class="n">${$m(x.c)}</td><td class="n">${$m(x.mb)}</td><td class="n">${$m(x.g)}</td><td class="n ${x.r<0?'mora':''}"><b>${$s(x.r)}</b></td><td class="n">${x.v?pc1(x.r/x.v):'—'}</td></tr>`).join('')}</table></div></div>`;
  $('#rs_cp').onclick=()=>copiarTabla(['Mes','Ventas sin IVA','Costo','Margen bruto','Gastos','Ganancia'],R.map(x=>[mesNom(x.m),xl(x.v),xl(x.c),xl(x.mb),xl(x.g),xl(x.r)]));
}
/* ---------- Rentabilidad ---------- */
async function ctRentab(){
  S.rtP=S.rtP||'3m';S.rtV=S.rtV||'cli';
  $('#ct').innerHTML=`<div class="sub">${PERIODOS.map(([k,t])=>`<button class="${S.rtP==k?'':'alt'}" data-rt="${k}">${t}</button>`).join('')}</div>
    <div class="sub">${[['cli','Por cliente'],['prod','Por producto'],['marca','Por marca']].map(([k,t])=>`<button class="${S.rtV==k?'':'alt'}" data-rv="${k}">${t}</button>`).join('')}</div><div id="rt"><span class="skl" role="status" aria-label="Cargando"></span></div>`;
  $$('[data-rt]').forEach(b=>b.onclick=()=>{S.rtP=b.dataset.rt;ctRentab()});$$('[data-rv]').forEach(b=>b.onclick=()=>{S.rtV=b.dataset.rv;ctRentab()});
  const[a,b]=rango(S.rtP);let P;try{P=await ctPedidos(a,b)}catch(e){$('#rt').innerHTML='<p class="err">'+esc(e.message)+'</p>';return}
  const g={};const add=(k,n,o,x)=>{const r=g[k]=g[k]||{n,v:0,c:0,q:0,p:new Set(),sc:false};r.v+=x.n;r.c+=x.c;r.q+=x.q;r.p.add(o.id);if(x.sc)r.sc=true};
  for(const o of P)for(const x of o.items){
    if(S.rtV=='cli')add(o.cliente_id,nomCli(o.cliente_id),o,x);
    else if(S.rtV=='prod')add(x.id,nomProd(x.id),o,x);
    else{const mk=S.productos.find(p=>p.producto_id==x.id)?.marca||'Sin marca';add(mk,mk,o,x)}}
  const L=Object.values(g).map(r=>({...r,gan:r.v-r.c,mg:r.v?(r.v-r.c)/r.v:0})).sort((x,y)=>y.gan-x.gan);
  const tv=L.reduce((s,r)=>s+r.v,0),tg=L.reduce((s,r)=>s+r.gan,0),col=S.rtV=='cli'?'Cliente':S.rtV=='prod'?'Producto':'Marca';
  const peor=L.filter(r=>r.v>0&&!r.sc).sort((x,y)=>x.mg-y.mg).slice(0,3);
  $('#rt').innerHTML=`<div class="kp"><div class="box"><span class="lab">Ventas${S.ctMono?'':' sin IVA'}</span><span class="num">${$m0(tv)}</span><span class="det">${PERIODOS.find(x=>x[0]==S.rtP)[1]}</span></div>
    <div class="box ok"><span class="lab">Ganancia bruta</span><span class="num">${$m0(tg)}</span><span class="det">${tv?pc1(tg/tv)+' de margen promedio':'—'}</span></div>
    <div class="box"><span class="lab">${col} que más te deja</span><span class="num" style="font-size:18px">${L[0]?esc(L[0].n):'—'}</span><span class="det">${L[0]?$m(L[0].gan)+' de ganancia':''}</span></div>
    <div class="box"><span class="lab">Margen más bajo</span><span class="num" style="font-size:18px">${peor[0]?esc(peor[0].n):'—'}</span><span class="det">${peor[0]?pc1(peor[0].mg)+' de margen':''}</span></div></div>
  <div class="box"><div class="bh"><h3>Rentabilidad ${S.rtV=='cli'?'por cliente':S.rtV=='prod'?'por producto':'por marca'}</h3><button class="alt" id="rt_cp">Copiar para Excel</button></div>
  ${L.length?`<div class="tscroll"><table><tr><th>${col}</th>${S.rtV=='prod'?'<th class="n">Unid.</th>':'<th class="n">Pedidos</th>'}<th class="n">Ventas${S.ctMono?'':' s/IVA'}</th><th class="n">Costo</th><th class="n">Ganancia</th><th class="n">Margen</th><th class="n">% de la ganancia</th></tr>
  ${L.slice(0,60).map(r=>`<tr><td>${esc(r.n)}${r.sc?' <small class="mora">sin costo</small>':''}</td><td class="n">${S.rtV=='prod'?nf(r.q):r.p.size}</td><td class="n">${$m(r.v)}</td><td class="n">${$m(r.c)}</td><td class="n"><b>${$s(r.gan)}</b></td><td class="n ${r.mg<0.1?'mora':''}">${pc1(r.mg)}</td><td class="n">${tg?pc1(r.gan/tg):'—'}</td></tr>`).join('')}</table></div>${L.length>60?`<small>Y ${L.length-60} más (se copian todos).</small>`:''}`:'<p><small>No hay ventas en este período.</small></p>'}
  <p><small>Ordenado por ganancia en pesos, no por cuánto compra. Margen en rojo = menos del 10 %.</small></p></div>`;
  $('#rt_cp').onclick=()=>copiarTabla([col,S.rtV=='prod'?'Unidades':'Pedidos','Ventas sin IVA','Costo','Ganancia','Margen %'],L.map(r=>[r.n,S.rtV=='prod'?r.q:r.p.size,xl(r.v),xl(r.c),xl(r.gan),(r.mg*100).toFixed(1).replace('.',',')]));
}
/* ---------- Valor del stock ---------- */
async function ctStockV(){
  await cargarStock();
  const L=S.productos.map(p=>{const s=stk(p.producto_id).f;return{p,s,c:s*Number(p.costo||0),v:s*Number(p.precio_mayorista||0)}}).filter(x=>x.s>0);
  const tc=L.reduce((a,x)=>a+x.c,0),tv=L.reduce((a,x)=>a+x.v,0),sinC=L.filter(x=>!(Number(x.p.costo)>0)).length;
  const mk={};for(const x of L){const k=x.p.marca||'Sin marca';const r=mk[k]=mk[k]||{n:k,c:0,v:0,u:0,i:0};r.c+=x.c;r.v+=x.v;r.u+=x.s;r.i++}
  const M=Object.values(mk).sort((a,b)=>b.c-a.c),mx=Math.max(1,...M.map(x=>x.c));
  $('#ct').innerHTML=S.inv?`<div class="kp"><div class="box"><span class="lab">Stock a costo</span><span class="num">${$m0(tc)}</span><span class="det">Lo que te costó la mercadería (con IVA)</span></div>
    <div class="box ok"><span class="lab">Stock a precio mayorista</span><span class="num">${$m0(tv)}</span><span class="det">Lo que vale si lo vendés</span></div>
    <div class="box"><span class="lab">Ganancia que tenés en el depósito</span><span class="num">${$m0(tv-tc)}</span><span class="det">${L.length} productos con stock${sinC?' · '+sinC+' sin costo':''}</span></div></div>
  <div class="dos fc2"><div class="box"><h3>Por marca</h3>${M.map(x=>`<div class="gbar"><span>${esc(x.n)} <small>(${x.i} prod.)</small></span><b>${$m(x.c)}</b><i style="width:${(x.c/mx*100).toFixed(1)}%"></i></div>`).join('')}</div>
  <div class="box"><div class="bh"><h3>Productos con más plata inmovilizada</h3><button class="alt" id="sv_cp">Copiar todo para Excel</button></div><div class="tscroll"><table><tr><th>Producto</th><th class="n">Stock</th><th class="n">A costo</th><th class="n">A precio</th></tr>
  ${L.sort((a,b)=>b.c-a.c).slice(0,25).map(x=>`<tr><td>${esc(x.p.descripcion)}</td><td class="n">${nf(x.s)}</td><td class="n">${$m(x.c)}</td><td class="n">${$m(x.v)}</td></tr>`).join('')}</table></div></div></div>`
  :'<div class="aviso">Todavía no cargaste el inventario. Cuando cargues las cantidades en la pestaña <b>Stock</b>, acá vas a ver cuánta plata tenés en mercadería.</div>';
  $('#sv_cp')&&($('#sv_cp').onclick=()=>copiarTabla(['Código','Producto','Marca','Stock','Costo unit.','Precio mayorista','Total a costo','Total a precio'],L.map(x=>[x.p.codigo||'',x.p.descripcion,x.p.marca||'',x.s,xl(x.p.costo),xl(x.p.precio_mayorista),xl(x.c),xl(x.v)])));
}
/* ---------- IVA ---------- */
async function datosIVA(m){
  const[a,b]=mesRango(m);
  const[fv,fp,rt]=await Promise.all([
    todo(()=>sb.from('facturas_venta').select('*').gte('fecha',a).lt('fecha',b).order('fecha').order('numero')),
    todo(()=>sb.from('facturas_proveedor').select('*,proveedores(razon_social,cuit)').gte('fecha',a).lt('fecha',b).order('fecha')),
    todo(()=>sb.from('retenciones').select('*').gte('fecha',a).lt('fecha',b).order('fecha'))]);
  if(fv.error)throw fv.error;if(fp.error)throw fp.error;
  const F=fv.data.filter(f=>!f.anulada),ids=[...new Set(F.map(f=>f.pedido_id).filter(Boolean))];let it={};
  for(let i=0;i<ids.length;i+=150){const{data}=await sb.from('pedido_items').select('pedido_id,producto_id,cantidad,precio_unitario').in('pedido_id',ids.slice(i,i+150));for(const x of data||[])(it[x.pedido_id]=it[x.pedido_id]||[]).push(x)}
  const V=F.map(f=>{const I=it[f.pedido_id]||[],tot=Number(f.total||0),s=esNC(f.tipo)?-1:1;const br={};let bt=0;
    for(const x of I){const v=Number(x.cantidad||0)*Number(x.precio_unitario||0),a=alic(x.producto_id);br[a]=(br[a]||0)+v;bt+=v}
    if(!bt){br[21]=1;bt=1}
    const r={f,n21:0,i21:0,n105:0,i105:0,nx:0,ix:0,tot:s*tot};
    for(const[a,v]of Object.entries(br)){const t=tot*v/bt,n=t/(1+a/100),iv=t-n;if(+a==21){r.n21+=s*n;r.i21+=s*iv}else if(+a==10.5){r.n105+=s*n;r.i105+=s*iv}else{r.nx+=s*n;r.ix+=s*iv}}
    return r});
  const{data:NCD}=await sb.from('notas_credito').select('*').gte('fecha',a).lt('fecha',b).order('numero');
  for(const n of (NCD||[]).filter(n=>n.recibo_numero)){const r={f:{fecha:n.fecha,tipo:'NC',punto_venta:1,numero:n.numero,cliente_id:n.cliente_id,anulada:false},n21:0,i21:0,n105:0,i105:0,nx:0,ix:0,tot:-Number(n.total)};
    for(const x of n.items||[]){const t=Number(x.q)*Number(x.pu),al=alic(x.id),nn=t/(1+al/100),iv=t-nn;if(al==21){r.n21-=nn;r.i21-=iv}else if(al==10.5){r.n105-=nn;r.i105-=iv}else{r.nx-=nn;r.ix-=iv}}V.push(r)}
  const C=fp.data.map(f=>{const s=esNC(f.tipo)?-1:1,pi=Number(f.perc_iva||0),pb=Number(f.perc_iibb||0),pt=Number(f.percepciones||0);
    return{f,neto:s*Number(f.neto||0),iva:s*Number(f.iva||0),pi:s*pi,pb:s*pb,po:s*Math.max(0,pt-pi-pb),tot:s*Number(f.total||0)}});
  const RT=rt.error?[]:rt.data;
  const sum=(A,k)=>A.reduce((x,r)=>x+r[k],0);
  const deb=sum(V,'i21')+sum(V,'i105')+sum(V,'ix'),cred=sum(C,'iva'),pIVA=sum(C,'pi'),rIVA=RT.filter(r=>r.impuesto=='IVA').reduce((x,r)=>x+Number(r.importe),0);
  const pIIBB=sum(C,'pb'),rIIBB=RT.filter(r=>r.impuesto=='IIBB').reduce((x,r)=>x+Number(r.importe),0),rGan=RT.filter(r=>r.impuesto=='Ganancias').reduce((x,r)=>x+Number(r.importe),0);
  return{V,C,RT,rtErr:rt.error,deb,cred,pIVA,rIVA,pIIBB,rIIBB,rGan,netoV:sum(V,'n21')+sum(V,'n105')+sum(V,'nx'),saldo:deb-cred-pIVA-rIVA}}
async function ctIVA(){
  $('#ct').innerHTML=selMes()+'<div id="iv"><span class="skl" role="status" aria-label="Cargando"></span></div>';onMes(ctIVA);
  let D;try{D=await datosIVA(S.ctMes)}catch(e){$('#iv').innerHTML='<p class="err">'+esc(e.message)+'</p>';return}
  const aPagar=D.saldo>0;
  $('#iv').innerHTML=`${D.rtErr?SQL_FALTA:''}<div class="kp">
    <div class="box"><span class="lab">IVA de tus ventas (débito)</span><span class="num">${$m0(D.deb)}</span><span class="det">${D.V.length} ${D.V.length==1?'factura':'facturas'} · neto ${$m(D.netoV)}</span></div>
    <div class="box"><span class="lab">IVA de tus compras (crédito)</span><span class="num">${$m0(D.cred)}</span><span class="det">${D.C.length} ${D.C.length==1?'factura':'facturas'} de proveedores</span></div>
    <div class="box"><span class="lab">Percepciones y retenciones de IVA</span><span class="num">${$m0(D.pIVA+D.rIVA)}</span><span class="det">Percep. ${$m(D.pIVA)} · Retenc. ${$m(D.rIVA)}</span></div>
    <div class="box ${aPagar?'alerta':'ok'}"><span class="lab">${aPagar?'IVA a pagar':'Saldo a favor'}</span><span class="num">${$m0(Math.abs(D.saldo))}</span><span class="det">Estimado · confirmalo con tu contador</span></div></div>
  <div class="box"><h3>Ingresos Brutos</h3><table><tr><td>Base imponible estimada (ventas netas facturadas)</td><td class="n">${$m(D.netoV)}</td></tr>
    <tr><td>Percepciones de IIBB sufridas (en compras)</td><td class="n">${$m(D.pIIBB)}</td></tr><tr><td>Retenciones de IIBB sufridas (en cobros)</td><td class="n">${$m(D.rIIBB)}</td></tr>
    <tr class="tot"><td><b>Total a descontar de IIBB</b></td><td class="n"><b>${$m(D.pIIBB+D.rIIBB)}</b></td></tr>${D.rGan?`<tr><td>Retenciones de Ganancias sufridas</td><td class="n">${$m(D.rGan)}</td></tr>`:''}</table></div>
  <div class="box"><div class="bh"><h3>Libro IVA Ventas</h3><button class="alt" id="iv_cv">Copiar para Excel</button></div>
    ${D.V.length?`<div class="tscroll"><table><tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th class="n">Neto 21%</th><th class="n">IVA 21%</th><th class="n">Neto 10,5%</th><th class="n">IVA 10,5%</th><th class="n">Total</th></tr>
    ${D.V.map(r=>{const x=filaV(r);return`<tr><td>${x[0]}</td><td>${esc(x[1])}</td><td>${esc(x[2])}<br><small>${esc(x[3])}</small></td><td class="n">${$m(r.n21)}</td><td class="n">${$m(r.i21)}</td><td class="n">${$m(r.n105)}</td><td class="n">${$m(r.i105)}</td><td class="n"><b>${$m(r.tot)}</b></td></tr>`}).join('')}</table></div>`:'<p><small>No hay facturas de venta en este mes.</small></p>'}</div>
  <div class="box"><div class="bh"><h3>Libro IVA Compras</h3><button class="alt" id="iv_cc">Copiar para Excel</button></div>
    ${D.C.length?`<div class="tscroll"><table><tr><th>Fecha</th><th>Comprobante</th><th>Proveedor</th><th class="n">Neto</th><th class="n">IVA</th><th class="n">Perc. IVA</th><th class="n">Perc. IIBB</th><th class="n">Total</th></tr>
    ${D.C.map(r=>`<tr><td>${fd(r.f.fecha)}</td><td>${esc(r.f.tipo+' '+r.f.numero)}</td><td>${esc(r.f.proveedores?.razon_social||'')}</td><td class="n">${$m(r.neto)}</td><td class="n">${$m(r.iva)}</td><td class="n">${$m(r.pi)}</td><td class="n">${$m(r.pb)}</td><td class="n"><b>${$m(r.tot)}</b></td></tr>`).join('')}</table></div>`:'<p><small>No hay facturas de proveedores en este mes. Se cargan en Compras → Facturas y pagos.</small></p>'}</div>
  <div class="box"><h3>Alícuota de IVA de los productos</h3><p><small>Todos los productos están al <b>21 %</b> salvo que los cambies acá. Elegí una marca o familia y la alícuota.</small></p>
    <div class="g"><select id="al_k"><option value="">Elegí marca o familia…</option>${[...new Set(S.productos.map(p=>p.marca).filter(Boolean))].sort().map(x=>`<option value="m:${esc(x)}">Marca: ${esc(x)}</option>`).join('')}${[...new Set(S.productos.map(p=>p.familia).filter(Boolean))].sort().map(x=>`<option value="f:${esc(x)}">Familia: ${esc(x)}</option>`).join('')}</select>
    <select id="al_v"><option value="21">21 %</option><option value="10.5">10,5 %</option><option value="27">27 %</option><option value="0">Exento (0 %)</option></select><button id="al_g">Aplicar</button></div>
    <p id="al_r"><small>${(()=>{const o={};for(const p of S.productos){const a=alic(p.producto_id);o[a]=(o[a]||0)+1}return Object.entries(o).map(([a,n])=>n+' productos al '+String(a).replace('.',',')+' %').join(' · ')})()}</small></p></div>
  <p><small>Las facturas de venta del CRM son internas hasta que conectemos la factura electrónica de ARCA. Usá estos libros como control y pasáselos a tu contador.</small></p>`;
  $('#iv_cv').onclick=()=>copiarTabla(HEAD_V,D.V.map(filaV));$('#iv_cc').onclick=()=>copiarTabla(HEAD_C,D.C.map(filaC));
  $('#al_g').onclick=async()=>{const k=$('#al_k').value,v=+$('#al_v').value;if(!k)return toast('Elegí una marca o familia.',1);
    const[t,val]=[k.slice(0,1),k.slice(2)],ids=S.productos.filter(p=>(t=='m'?p.marca:p.familia)==val).map(p=>p.producto_id);
    if(!confirm('¿Poner '+String(v).replace('.',',')+' % de IVA a '+ids.length+' productos de '+val+'?'))return;
    const{error}=await sb.rpc('fijar_alicuota',{p_ids:ids,p_alic:v});if(error)return toast(/fijar_alicuota/.test(error.message)?'Falta correr mejoras-clientes.sql en Supabase.':error.message,1);
    await cargarStock();toast('Listo: '+ids.length+' productos al '+String(v).replace('.',',')+' %.');ctIVA()};
}
/* ---------- Retenciones y percepciones ---------- */
async function ctRet(){
  $('#ct').innerHTML=selMes()+'<div id="rr"><span class="skl" role="status" aria-label="Cargando"></span></div>';onMes(ctRet);
  const[a,b]=mesRango(S.ctMes);let r=await todo(()=>sb.from('retenciones').select('*,proveedores(razon_social)').gte('fecha',a).lt('fecha',b).order('fecha',{ascending:false}));if(r.error)r=await todo(()=>sb.from('retenciones').select('*').gte('fecha',a).lt('fecha',b).order('fecha',{ascending:false}));
  if(r.error){$('#rr').innerHTML=SQL_FALTA;return}
  const TIPO_RET={retencion:'Te retuvieron',percepcion:'Percepción',practicada:'Retuviste vos'};const tot={};for(const x of r.data){const k=(x.tipo=='practicada'?'Retuviste vos · ':x.tipo=='percepcion'?'Percepciones · ':'Te retuvieron · ')+x.impuesto+(x.jurisdiccion?' '+x.jurisdiccion:'');tot[k]=(tot[k]||0)+Number(x.importe)}
  $('#rr').innerHTML=`<div class="dos fc2"><div class="box"><h3>Cargar certificado</h3><p><small>Retenciones que te hacen tus clientes al pagarte, o percepciones que no estén en una factura de proveedor.</small></p><div class="g">
    <label class="f">Fecha<input type="date" id="rt_f" value="${diaLocal(new Date())}"></label>
    <label class="f">Tipo<select id="rt_t"><option value="retencion">Retención (al cobrar)</option><option value="percepcion">Percepción</option></select></label>
    <label class="f">Impuesto<select id="rt_i"><option>IIBB</option><option>IVA</option><option>Ganancias</option><option>SUSS</option><option>Otro</option></select></label>
    <label class="f">Jurisdicción (IIBB)<input id="rt_j" placeholder="Ej.: CABA, Buenos Aires"></label>
    <label class="f">Cliente<select id="rt_c"><option value="">—</option>${S.clientes.map(c=>`<option value="${c.id}">${esc(c.razon_social)}</option>`).join('')}</select></label>
    <label class="f">N° de certificado<input id="rt_n"></label>
    <label class="f">Importe<input type="number" id="rt_m" step="0.01" min="0" inputmode="decimal"></label></div>
    <label class="chk-row" id="rt_dl"><input type="checkbox" id="rt_d" style="width:auto;margin:0"> Descontarla de la deuda del cliente (genera un recibo por el importe retenido)</label>
    <button id="rt_g">Guardar</button></div>
  <div class="box"><h3>Total de ${mesNom(S.ctMes)}</h3>${Object.keys(tot).length?`<table>${Object.entries(tot).map(([k,v])=>`<tr><td>${k}</td><td class="n"><b>${$m(v)}</b></td></tr>`).join('')}</table>`:'<p><small>No hay certificados cargados este mes.</small></p>'}
    <p><small>Las percepciones que vienen en las facturas de proveedores se suman solas en la pestaña IVA.</small></p></div></div>
  <div class="box"><div class="bh"><h3>Certificados del mes</h3><button class="alt" id="rt_cp">Copiar para Excel</button></div>${r.data.length?`<div class="tscroll"><table><tr><th>Fecha</th><th>Tipo</th><th>Impuesto</th><th>Cliente / proveedor</th><th>Certificado</th><th class="n">Importe</th><th></th></tr>
    ${r.data.map(x=>`<tr><td>${fd(x.fecha)}</td><td>${TIPO_RET[x.tipo]||x.tipo}</td><td>${x.impuesto}${x.jurisdiccion?' <small>'+esc(x.jurisdiccion)+'</small>':''}</td><td>${x.cliente_id?esc(nomCli(x.cliente_id)):x.proveedores?.razon_social?esc(x.proveedores.razon_social):'—'}</td><td>${esc(x.comprobante||'')}${x.notas&&/^(Recibo|OP) N°/.test(x.notas)?' <small>'+esc(x.notas)+'</small>':''}</td><td class="n">${$m(x.importe)}</td><td>${x.recibo_id||x.orden_pago_id?'<small title="Se borra anulando el recibo o la orden de pago">—</small>':`<a class="lnk" data-rb="${x.id}">Borrar</a>`}</td></tr>`).join('')}</table></div>`:'<p><small>Sin certificados.</small></p>'}</div>`;
  const upd=()=>{$('#rt_dl').hidden=!($('#rt_t').value=='retencion'&&$('#rt_c').value)};$('#rt_t').onchange=upd;$('#rt_c').onchange=upd;upd();
  $('#rt_g').onclick=async()=>{const imp=+$('#rt_m').value;if(!(imp>0))return toast('Poné el importe.',1);const cli=$('#rt_c').value||null;
    $('#rt_g').disabled=true;
    const{error}=await sb.from('retenciones').insert({fecha:$('#rt_f').value,tipo:$('#rt_t').value,impuesto:$('#rt_i').value,jurisdiccion:$('#rt_j').value.trim()||null,cliente_id:cli,comprobante:$('#rt_n').value.trim()||null,importe:imp});
    if(error){$('#rt_g').disabled=false;return toast(error.message,1)}
    if(cli&&$('#rt_d').checked&&!$('#rt_dl').hidden){const{data:F}=await sb.from('facturas_estado').select('*').eq('cliente_id',cli).gt('pendiente',0.005).order('vencimiento');
      let rest=imp;const im=[];for(const x of F||[]){if(rest<=0)break;const v=Math.min(rest,x.pendiente);im.push({factura_id:x.factura_id,importe:+v.toFixed(2)});rest=+(rest-v).toFixed(2)}
      const{data:n,error:e2}=await sb.rpc('registrar_cobranza',{p_cliente:cli,p_importe:imp,p_medio:'otro',p_imputaciones:im});
      toast(e2?'Certificado guardado, pero no se pudo descontar de la deuda: '+e2.message:'Certificado guardado y descontado de la deuda (recibo N° '+n+').',!!e2)}
    else toast('Certificado guardado.');ctRet()};
  $$('#rr [data-rb]').forEach(a=>a.onclick=async()=>{if(!confirm('¿Borrar este certificado?'))return;const{error}=await sb.from('retenciones').delete().eq('id',a.dataset.rb);error?toast(error.message,1):ctRet()});
  $('#rt_cp').onclick=()=>copiarTabla(['Fecha','Tipo','Impuesto','Jurisdicción','Cliente','CUIT','Certificado','Importe'],r.data.map(x=>[fd(x.fecha),x.tipo,x.impuesto,x.jurisdiccion||'',x.cliente_id?nomCli(x.cliente_id):'',x.cliente_id?cuitCli(x.cliente_id):'',x.comprobante||'',xl(x.importe)]));
}
async function ctBancos(){
  const C=await cargarCuentas();if(!C){$('#ct').innerHTML=SQL_FALTA;return}
  S.ctaSel=S.ctaSel&&C.some(c=>c.id==S.ctaSel)?S.ctaSel:C[0]?.id;
  const total=C.filter(c=>c.activa).reduce((a,c)=>a+c.saldo,0);
  $('#ct').innerHTML=`<div class="kp">${C.filter(c=>c.activa).map(c=>`<div class="box clic ${S.ctaSel==c.id?'sel':''}" data-cs="${c.id}"><span class="lab">${esc(c.nombre)}</span><span class="num ${c.saldo<0?'mora':''}">${$s(c.saldo)}</span><span class="det">${TIPO_CTA[c.tipo]||c.tipo}</span></div>`).join('')}
    <div class="box ok"><span class="lab">Total en cuentas</span><span class="num">${$s(total)}</span><span class="det">${C.filter(c=>c.activa).length} cuentas</span></div></div>
  <div class="dos fc2"><div class="box" id="bk_mv">${C.length?'Cargando…':'<p>Todavía no cargaste ninguna cuenta. Agregá tu banco, Mercado Pago, etc. con el saldo que tienen hoy.</p>'}</div>
  <div class="box"><h3>Agregar cuenta</h3><div class="g"><input id="cn_n" placeholder="Nombre (ej.: Banco Galicia, Mercado Pago)"><select id="cn_t">${Object.entries(TIPO_CTA).filter(x=>x[0]!='efectivo').map(([k,t])=>`<option value="${k}">${t}</option>`).join('')}</select>
    <label class="f">Saldo de hoy<input id="cn_s" type="number" step="0.01" value="0"></label></div><button id="cn_g">Agregar cuenta</button>
    ${C.filter(c=>c.activa).length>1?`<h3 style="margin-top:18px">Pasar plata entre cuentas</h3><div class="g"><label class="f">Desde<select id="tr_a">${optCuentas(C)}</select></label><label class="f">Hacia<select id="tr_b">${optCuentas(C,C.filter(c=>c.activa)[1]?.id)}</select></label><label class="f">Importe<input id="tr_m" type="number" step="0.01" min="0"></label></div><button id="tr_g">Transferir</button>`:''}
    <p><small>Los cobros por transferencia, pagos a proveedores, gastos y cheques depositados se anotan solos en la cuenta que elijas al cargarlos.</small></p></div></div>`;
  $$('[data-cs]').forEach(b=>b.onclick=()=>{S.ctaSel=+b.dataset.cs;ctBancos()});
  $('#cn_g').onclick=async()=>{const n=$('#cn_n').value.trim();if(!n)return toast('Poné el nombre de la cuenta.',1);
    const{data,error}=await sb.from('cuentas').insert({nombre:n,tipo:$('#cn_t').value,saldo_inicial:+$('#cn_s').value||0,fecha_saldo:diaLocal(new Date())}).select().single();if(error)return toast(error.message,1);S.ctaSel=data.id;toast('Cuenta agregada.');ctBancos()};
  $('#tr_g')&&($('#tr_g').onclick=async()=>{const a=+$('#tr_a').value,b=+$('#tr_b').value,m=+$('#tr_m').value;if(a==b)return toast('Elegí dos cuentas distintas.',1);if(!(m>0))return toast('Poné el importe.',1);
    const id=crypto.randomUUID(),na=C.find(c=>c.id==a).nombre,nb=C.find(c=>c.id==b).nombre,f=diaLocal(new Date());
    const{error}=await sb.from('movimientos_cuenta').insert([{cuenta_id:a,importe:-m,concepto:'Transferencia a '+nb,origen:'transferencia',transferencia_id:id,fecha:f},{cuenta_id:b,importe:m,concepto:'Transferencia desde '+na,origen:'transferencia',transferencia_id:id,fecha:f}]);
    if(error)return toast(error.message,1);toast('Transferencia registrada.');ctBancos()});
  if(!S.ctaSel)return;
  const c=C.find(x=>x.id==S.ctaSel);S.ctaMes=S.ctaMes||mesHoy();const[a,b]=mesRango(S.ctaMes);
  const{data:M,error}=await sb.from('movimientos_cuenta').select('*').eq('cuenta_id',c.id).gte('fecha',a).lt('fecha',b).order('fecha',{ascending:false}).order('id',{ascending:false});
  if(error){$('#bk_mv').innerHTML='<p class="err">'+esc(error.message)+'</p>';return}
  $('#bk_mv').innerHTML=`<div class="bh"><h3>${esc(c.nombre)} · ${mesNom(S.ctaMes)}</h3><div class="fc-acc"><button class="alt" id="cm_a">←</button><button class="alt" id="cm_s">→</button></div></div>
    <div class="g"><input type="date" id="mv_f" value="${diaLocal(new Date())}"><select id="mv_t"><option value="1">Entra plata</option><option value="-1">Sale plata</option></select><input id="mv_m" type="number" step="0.01" min="0" placeholder="Importe"><input id="mv_c" placeholder="Concepto (ej.: comisión banco)"></div><button class="alt" id="mv_g">Agregar movimiento</button>
    ${M.length?`<table style="margin-top:10px">${M.map(x=>`<tr><td>${fd(x.fecha)}</td><td>${esc(x.concepto)}${x.ref?'<br><small>'+esc(x.ref)+'</small>':''}</td><td class="n ${x.importe<0?'mora':''}">${$s(+x.importe)}</td><td>${x.origen=='manual'||x.origen=='transferencia'?`<a class="lnk" data-mb="${x.id}" data-tr="${x.transferencia_id||''}">Borrar</a>`:''}</td></tr>`).join('')}</table>`:'<p><small>Sin movimientos en este mes.</small></p>'}
    <p><small>Saldo actual: <b>${$s(c.saldo)}</b> · saldo inicial ${$m(c.saldo_inicial)} al ${fd(c.fecha_saldo)}</small> · <a class="lnk" id="cta_x">${c.activa?'Desactivar cuenta':'Activar'}</a></p>`;
  $('#cm_a').onclick=()=>{S.ctaMes=mesMas(S.ctaMes,-1);ctBancos()};$('#cm_s').onclick=()=>{S.ctaMes=mesMas(S.ctaMes,1);ctBancos()};
  $('#mv_g').onclick=async()=>{const m=+$('#mv_m').value,co=$('#mv_c').value.trim();if(!(m>0)||!co)return toast('Poné importe y concepto.',1);
    const e=await movCuenta(c.id,m*+$('#mv_t').value,co,'manual',null,$('#mv_f').value);e?toast(e.message,1):(toast('Movimiento agregado.'),ctBancos())};
  $$('#bk_mv [data-mb]').forEach(x=>x.onclick=async()=>{if(!confirm('¿Borrar este movimiento?'))return;const q=sb.from('movimientos_cuenta').delete();
    const{error}=x.dataset.tr?await q.eq('transferencia_id',x.dataset.tr):await q.eq('id',x.dataset.mb);error?toast(error.message,1):ctBancos()});
  $('#cta_x').onclick=async()=>{const{error}=await sb.from('cuentas').update({activa:!c.activa}).eq('id',c.id);error?toast(error.message,1):ctBancos()};
}
async function ctCheques(){
  S.chF=S.chF||'cartera';
  const[ch,C]=await Promise.all([todo(()=>sb.from('cheques').select('*').order('fecha_pago')),cargarCuentas()]);
  if(ch.error||!C){$('#ct').innerHTML=SQL_FALTA;return}
  const H=ch.data,hoy=diaLocal(new Date()),en7=diaLocal(new Date(Date.now()+7*864e5));
  const cart=H.filter(x=>x.tipo=='recibido'&&x.estado=='en_cartera'),emi=H.filter(x=>x.tipo=='emitido'&&x.estado=='emitido');
  const s=A=>A.reduce((a,x)=>a+Number(x.importe),0);
  const L=S.chF=='cartera'?cart:S.chF=='emitidos'?emi:H.slice().reverse();
  $('#ct').innerHTML=`<div class="kp"><div class="box ok"><span class="lab">Cheques en cartera</span><span class="num">${$m0(s(cart))}</span><span class="det">${cart.length} cheques recibidos</span></div>
    <div class="box"><span class="lab">Para depositar ya</span><span class="num">${$m0(s(cart.filter(x=>x.fecha_pago<=hoy)))}</span><span class="det">${cart.filter(x=>x.fecha_pago<=hoy).length} con fecha cumplida</span></div>
    <div class="box ${s(emi.filter(x=>x.fecha_pago<=en7))?'alerta':''}"><span class="lab">Tus cheques a debitar (7 días)</span><span class="num">${$m0(s(emi.filter(x=>x.fecha_pago<=en7)))}</span><span class="det">Total emitidos pendientes ${$m(s(emi))}</span></div></div>
  <div class="sub">${[['cartera','En cartera'],['emitidos','Emitidos pendientes'],['todos','Todos']].map(([k,t])=>`<button class="${S.chF==k?'':'alt'}" data-chf="${k}">${t}</button>`).join('')}<button id="ch_nv">+ Cargar cheque</button></div>
  <div id="ch_form"></div>
  <div class="box">${L.length?`<div class="tscroll"><table><tr><th>Pago</th><th>Cheque</th><th>De / Para</th><th class="n">Importe</th><th>Estado</th><th></th></tr>
    ${L.map(x=>{const venc=x.fecha_pago<=hoy&&['en_cartera','emitido'].includes(x.estado);return`<tr><td class="${venc?'mora':''}">${fd(x.fecha_pago)}</td><td>${x.echeq?'<span class="badge b-online">eCheq</span> ':''}${esc(x.banco||'')} ${x.numero?'N° '+esc(x.numero):''}<br><small>${x.tipo=='recibido'?'Recibido':'Propio'}${x.librador?' · '+esc(x.librador):''}</small></td>
    <td>${x.cliente_id?'De: '+esc(nomCli(x.cliente_id)):''}${x.destino?(x.cliente_id?'<br>':'')+'Para: '+esc(x.destino):''}</td><td class="n"><b>${$m(x.importe)}</b></td><td><span class="badge b-${x.estado=='rechazado'?'mora30':['depositado','cobrado','debitado'].includes(x.estado)?'entregado':'aprobado'}">${EST_CH[x.estado]}</span></td>
    <td class="acc">${x.estado=='en_cartera'?`<button class="alt" data-chd="${x.id}">Depositar</button> <button class="alt" data-che="${x.id}">Endosar</button> <select data-chx="${x.id}"><option value="">Más…</option><option value="cobrado">Cobrado por ventanilla</option><option value="rechazado">Rechazado</option><option value="anulado">Anular</option></select>`
      :x.estado=='emitido'?`<button class="alt" data-chb="${x.id}">Debitado</button> <select data-chx="${x.id}"><option value="">Más…</option><option value="anulado">Anular</option></select>`:''}</td></tr>`}).join('')}</table></div>`:'<p><small>No hay cheques en esta lista.</small></p>'}</div>`;
  $$('[data-chf]').forEach(b=>b.onclick=()=>{S.chF=b.dataset.chf;ctCheques()});
  const ch1=id=>H.find(x=>x.id==id);
  $('#ch_nv').onclick=()=>{$('#ch_form').innerHTML=`<div class="box"><h3>Cargar cheque</h3><div class="g"><label class="f">Tipo<select id="ch_t"><option value="recibido">Recibido de un cliente</option><option value="emitido">Propio (lo firmo yo)</option></select></label>
    <label class="f">Importe<input id="ch_m" type="number" step="0.01" min="0"></label><label class="f" id="ch_cl">Cliente<select id="ch_c"><option value="">—</option>${S.clientes.map(c=>`<option value="${c.id}">${esc(c.razon_social)}</option>`).join('')}</select></label>
    <label class="f" id="ch_pl" hidden>Para (proveedor u otro)<input id="ch_d"></label><label class="f" id="ch_ctl" hidden>Cuenta de donde sale<select id="ch_ct"><option value="">—</option>${optCuentas(C)}</select></label></div><div id="ch_ff">${formCheque()}</div><button id="ch_g">Guardar cheque</button></div>`;
    const tg=()=>{const e=$('#ch_t').value=='emitido';$('#ch_cl').hidden=e;$('#ch_pl').hidden=!e;$('#ch_ctl').hidden=!e;const v=leerCheque();$('#ch_ff').innerHTML=formCheque({...v,tipo:e?'emitido':'recibido'})};$('#ch_t').onchange=tg;
    $('#ch_g').onclick=async()=>{const m=+$('#ch_m').value;if(!(m>0))return toast('Poné el importe.',1);const e=$('#ch_t').value=='emitido';
      const{error}=await sb.from('cheques').insert({tipo:e?'emitido':'recibido',estado:e?'emitido':'en_cartera',importe:m,...leerCheque(),cliente_id:e?null:($('#ch_c').value||null),destino:e?($('#ch_d').value.trim()||null):null,cuenta_id:e?(+$('#ch_ct').value||null):null});
      error?toast(error.message,1):(toast('Cheque guardado.'),ctCheques())}};
  const pedirCuenta=(titulo,cb)=>{if(!C.filter(c=>c.activa).length)return toast('Primero agregá una cuenta en Contable → Bancos.',1);
    const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="mc"><h3>${titulo}</h3><label class="f">Cuenta<select id="pc_c">${optCuentas(C)}</select></label><label class="f">Fecha<input type="date" id="pc_f" value="${diaLocal(new Date())}"></label><div><button id="pc_ok">Confirmar</button> <button class="alt" id="pc_x">Cancelar</button></div></div>`;
    document.body.appendChild(m);$('#pc_x').onclick=()=>m.remove();$('#pc_ok').onclick=async()=>{$('#pc_ok').disabled=true;await cb(+$('#pc_c').value,$('#pc_f').value);m.remove()}};
  $$('[data-chd]').forEach(b=>b.onclick=()=>{const x=ch1(b.dataset.chd);pedirCuenta('Depositar cheque de '+$m(x.importe),async(cu,f)=>{
    const{error}=await sb.from('cheques').update({estado:'depositado',cuenta_id:cu}).eq('id',x.id);if(error)return toast(error.message,1);
    const e=await movCuenta(cu,+x.importe,'Depósito cheque '+(x.numero?'N° '+x.numero:'')+(x.cliente_id?' de '+nomCli(x.cliente_id):''),'cheque',x.banco,f>x.fecha_pago?f:x.fecha_pago);
    toast(e?e.message:'Cheque depositado.',!!e);ctCheques()})});
  $$('[data-chb]').forEach(b=>b.onclick=()=>{const x=ch1(b.dataset.chb);const fin=async(cu,f)=>{const{error}=await sb.from('cheques').update({estado:'debitado',cuenta_id:cu}).eq('id',x.id);if(error)return toast(error.message,1);
    const e=await movCuenta(cu,-x.importe,'Débito cheque propio '+(x.numero?'N° '+x.numero:'')+(x.destino?' a '+x.destino:''),'cheque',null,f);toast(e?e.message:'Cheque debitado.',!!e);ctCheques()};
    x.cuenta_id?fin(x.cuenta_id,diaLocal(new Date())):pedirCuenta('¿De qué cuenta se debitó?',fin)});
  $$('[data-che]').forEach(b=>b.onclick=()=>{const x=ch1(b.dataset.che);const pv=(S.prov&&S.prov.length?S.prov:[]);
    const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="mc"><h3>Endosar cheque de ${$m(x.importe)}</h3><label class="f">A quién se lo das<select id="en_p"><option value="">Otro (escribir abajo)</option></select></label><input id="en_o" placeholder="Nombre si no es un proveedor">
      <label class="chk-row"><input type="checkbox" id="en_r" checked style="width:auto;margin:0"> Registrarlo como pago al proveedor</label><div><button id="en_ok">Endosar</button> <button class="alt" id="en_x">Cancelar</button></div></div>`;
    document.body.appendChild(m);$('#en_x').onclick=()=>m.remove();
    sb.from('proveedores').select('id,razon_social').eq('activo',true).order('razon_social').then(({data})=>{$('#en_p').innerHTML+=(data||[]).map(p=>`<option value="${p.id}">${esc(p.razon_social)}</option>`).join('');$('#en_p').dataset.l=JSON.stringify(data||[])});
    $('#en_ok').onclick=async()=>{const pid=$('#en_p').value,nom=pid?JSON.parse($('#en_p').dataset.l||'[]').find(p=>p.id==pid)?.razon_social:$('#en_o').value.trim();if(!nom)return toast('Elegí a quién se lo endosás.',1);
      $('#en_ok').disabled=true;const{error}=await sb.from('cheques').update({estado:'endosado',proveedor_id:pid||null,destino:nom}).eq('id',x.id);if(error)return toast(error.message,1);
      if(pid&&$('#en_r').checked){const{error:e2}=await sb.from('pagos_proveedor').insert({proveedor_id:pid,importe:+x.importe,medio:'cheque',referencia:'Cheque endosado '+(x.banco||'')+' '+(x.numero?'N° '+x.numero:'')});if(e2)toast('Endosado, pero no se pudo registrar el pago: '+e2.message,1)}
      m.remove();toast('Cheque endosado a '+nom+'.');ctCheques()}});
  $$('[data-chx]').forEach(s=>s.onchange=async()=>{const v=s.value;if(!v)return;const x=ch1(s.dataset.chx);
    if(!confirm('¿Marcar el cheque de '+$m(x.importe)+' como «'+EST_CH[v]+'»?')){s.value='';return}
    const{error}=await sb.from('cheques').update({estado:v}).eq('id',x.id);if(error)return toast(error.message,1);
    toast(v=='rechazado'?'Cheque marcado como rechazado. Acordate de reclamarle a '+(x.cliente_id?nomCli(x.cliente_id):'quien te lo dio')+' y de cargarle el importe.':'Listo.',v=='rechazado');ctCheques()});
}
/* ---------- Flujo de caja proyectado ---------- */
async function ctFlujo(){
  const hoy=new Date();hoy.setHours(12,0,0,0);const lun=new Date(hoy);lun.setDate(hoy.getDate()-((hoy.getDay()+6)%7));
  const W=[];for(let i=0;i<8;i++){const a=new Date(lun);a.setDate(lun.getDate()+7*i);const b=new Date(a);b.setDate(a.getDate()+7);W.push({a:diaLocal(a),b:diaLocal(b),l:a.toLocaleDateString('es-AR',{day:'numeric',month:'short'})})}
  const sem=d=>{if(!d)return -1;if(d<W[0].a)return -1;return W.findIndex(w=>d>=w.a&&d<w.b)};
  const h3=diaLocal(new Date(hoy.getFullYear(),hoy.getMonth()-3,1)),h0=diaLocal(new Date(hoy.getFullYear(),hoy.getMonth(),1));
  const[fe,fp,pg,ch,ga,C,cj]=await Promise.all([todo(()=>sb.from('facturas_estado').select('*').gt('pendiente',0.005).order('vencimiento')),
    todo(()=>sb.from('facturas_proveedor').select('id,proveedor_id,tipo,vencimiento,total').order('vencimiento')),todo(()=>sb.from('pagos_proveedor').select('proveedor_id,importe').order('id')),
    todo(()=>sb.from('cheques').select('*').in('estado',['en_cartera','emitido']).order('fecha_pago')),todo(()=>sb.from('gastos').select('fecha,importe').gte('fecha',h3).lt('fecha',h0).order('fecha')),cargarCuentas(),
    sb.from('cierres_caja').select('fecha,efectivo_contado').order('fecha',{ascending:false}).limit(1)]);
  const z=()=>Array(8).fill(0),fila=(n,t)=>({n,t,v:z(),atr:0});
  const cob=fila('Cobros de clientes (facturas que vencen)','+'),chr=fila('Cheques en cartera que se cobran','+'),pv=fila('Pagos a proveedores (facturas que vencen)','−'),che=fila('Tus cheques que se debitan','−'),gas=fila('Gastos (promedio de los últimos 3 meses)','−');
  const put=(f,d,v)=>{const i=sem(d);if(i<0){if(d&&d<W[0].a)f.atr+=v}else if(i<8)f.v[i]+=v};
  for(const x of fe.data||[])put(cob,x.vencimiento,Number(x.pendiente));
  for(const x of ch.data||[])x.tipo=='recibido'?put(chr,x.fecha_pago,+x.importe):put(che,x.fecha_pago,+x.importe);
  const pag={};for(const x of pg.data||[])pag[x.proveedor_id]=(pag[x.proveedor_id]||0)+Number(x.importe);
  const porP={};for(const f of fp.data||[]){if(esNC(f.tipo))pag[f.proveedor_id]=(pag[f.proveedor_id]||0)+Number(f.total);else(porP[f.proveedor_id]=porP[f.proveedor_id]||[]).push(f)}
  for(const[p,F]of Object.entries(porP)){let r=pag[p]||0;for(const f of F){const t=Number(f.total),use=Math.min(r,t);r-=use;if(t-use>0.005)put(pv,f.vencimiento,t-use)}}
  const gm=(ga.data||[]).reduce((a,x)=>a+Number(x.importe),0)/3/4.33;gas.v=gas.v.map(()=>gm);
  const banc=C?C.filter(c=>c.activa).reduce((a,c)=>a+c.saldo,0):0,ef=Number(cj.data?.[0]?.efectivo_contado||0),ini=banc+ef;
  const ent=[cob,chr],sal=[pv,che,gas];let acc=ini;const neto=z(),acum=z();
  for(let i=0;i<8;i++){neto[i]=ent.reduce((a,f)=>a+f.v[i],0)-sal.reduce((a,f)=>a+f.v[i],0);acc+=neto[i];acum[i]=acc}
  const malI=acum.findIndex(v=>v<0);
  $('#ct').innerHTML=`<div class="kp"><div class="box"><span class="lab">Plata disponible hoy</span><span class="num">${$s(ini)}</span><span class="det">Cuentas ${$m(banc)} · efectivo ${$m(ef)}${cj.data?.[0]?' (último cierre)':''}</span></div>
    <div class="box ok"><span class="lab">Entra en 8 semanas</span><span class="num">${$m0(ent.reduce((a,f)=>a+f.v.reduce((x,y)=>x+y,0),0))}</span><span class="det">+ ${$m(cob.atr+chr.atr)} atrasado sin cobrar</span></div>
    <div class="box"><span class="lab">Sale en 8 semanas</span><span class="num">${$m0(sal.reduce((a,f)=>a+f.v.reduce((x,y)=>x+y,0),0))}</span><span class="det">+ ${$m(pv.atr+che.atr)} vencido sin pagar</span></div>
    <div class="box ${malI>=0?'alerta':'ok'}"><span class="lab">${malI>=0?'Te falta plata':'Saldo en 8 semanas'}</span><span class="num">${malI>=0?$m(-acum[malI]):$s(acum[7])}</span><span class="det">${malI>=0?'en la semana del '+W[malI].l:'si todo se cobra y paga a tiempo'}</span></div></div>
  ${C?'':SQL_FALTA}${malI>=0?`<div class="aviso">⚠️ Si todo se cobra y paga en fecha, en la semana del <b>${W[malI].l}</b> te faltarían <b>${$m(-acum[malI])}</b>. Conviene apurar cobros o correr algún pago.</div>`:''}
  <div class="box"><div class="bh"><h3>Próximas 8 semanas</h3><button class="alt" id="fl_cp">Copiar para Excel</button></div><div class="tscroll"><table class="flujo"><tr><th></th><th class="n">Atrasado</th>${W.map(w=>`<th class="n">Sem. ${w.l}</th>`).join('')}</tr>
    <tr class="sec"><td colspan="10"><b>Entra</b></td></tr>${ent.map(f=>`<tr><td>${f.n}</td><td class="n gris">${f.atr?$m(f.atr):'—'}</td>${f.v.map(v=>`<td class="n">${v?$m(v):'—'}</td>`).join('')}</tr>`).join('')}
    <tr class="sec"><td colspan="10"><b>Sale</b></td></tr>${sal.map(f=>`<tr><td>${f.n}</td><td class="n gris">${f.atr?$m(f.atr):'—'}</td>${f.v.map(v=>`<td class="n">${v?$m(v):'—'}</td>`).join('')}</tr>`).join('')}
    <tr class="tot"><td><b>Neto de la semana</b></td><td></td>${neto.map(v=>`<td class="n ${v<0?'mora':''}">${$s(v)}</td>`).join('')}</tr>
    <tr class="tot"><td><b>Saldo acumulado</b><br><small>arranca con ${$s(ini)}</small></td><td></td>${acum.map(v=>`<td class="n ${v<0?'mora':''}"><b>${$s(v)}</b></td>`).join('')}</tr></table></div>
  <p><small>"Atrasado" son facturas y cheques con fecha ya pasada: no se suman al saldo porque no se sabe cuándo se cobran o pagan. Los pagos a proveedores descuentan lo que ya les pagaste, empezando por la factura más vieja.</small></p></div>`;
  $('#fl_cp').onclick=()=>copiarTabla(['Concepto','Atrasado',...W.map(w=>'Sem. '+w.l)],[...ent,...sal].map(f=>[f.t+' '+f.n,xl(f.atr),...f.v.map(xl)]).concat([['Neto','',...neto.map(xl)],['Saldo acumulado','',...acum.map(xl)]]));
}
/* ---------- Para el contador ---------- */
function ctContador(){
  $('#ct').innerHTML=selMes()+`<div class="box"><h3>Paquete mensual para el contador</h3><p>Arma <b>un solo Excel</b> de ${mesNom(S.ctMes)} con una hoja para cada cosa:</p>
  <ul class="lista-ok"><li>Resumen del mes (IVA, IIBB, resultado)</li><li>Libro IVA Ventas y Libro IVA Compras</li><li>Retenciones y percepciones</li><li>Gastos</li><li>Cobros (recibos) y pagos a proveedores</li><li>Cheques y movimientos de bancos</li></ul>
  <button id="cx_g">Descargar Excel de ${mesNom(S.ctMes)}</button><p id="cx_e"></p><p><small>Después mandáselo por mail o WhatsApp a tu contador.</small></p></div>`;
  onMes(ctContador);
  $('#cx_g').onclick=async()=>{const b=$('#cx_g'),est=t=>$('#cx_e').textContent=t;b.disabled=true;
    try{est('Cargando el generador de Excel…');if(!window.XLSX)await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const m=S.ctMes,[a,z]=mesRango(m);est('Juntando los datos del mes…');
      const[D,P,ga,re,pp,ch,mv,C]=await Promise.all([datosIVA(m),ctPedidos(a,z),todo(()=>sb.from('gastos').select('*').gte('fecha',a).lt('fecha',z).order('fecha')),
        todo(()=>sb.from('recibos').select('*').eq('anulado',false).gte('fecha',tsAR(a)).lt('fecha',tsAR(z)).order('numero')),
        todo(()=>sb.from('pagos_proveedor').select('*,proveedores(razon_social,cuit)').gte('fecha',a).lt('fecha',z).order('fecha')),
        todo(()=>sb.from('cheques').select('*').order('fecha_pago')),todo(()=>sb.from('movimientos_cuenta').select('*').gte('fecha',a).lt('fecha',z).order('fecha')),cargarCuentas()]);
      const n=v=>+Number(v||0).toFixed(2),wb=XLSX.utils.book_new(),hoja=(nom,head,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([head,...rows]),nom);
      const vN=P.reduce((s,o)=>s+o.neto,0),vC=P.reduce((s,o)=>s+o.costo,0),gT=(ga.data||[]).reduce((s,x)=>s+Number(x.importe),0);
      hoja('Resumen',['Concepto','Importe'],[['Sabores de mi País · '+mesNom(m),''],['',''],['IVA débito fiscal (ventas)',n(D.deb)],['IVA crédito fiscal (compras)',n(D.cred)],['Percepciones de IVA sufridas',n(D.pIVA)],['Retenciones de IVA sufridas',n(D.rIVA)],['Saldo IVA (positivo = a pagar)',n(D.saldo)],['',''],
        ['Ventas netas facturadas (base IIBB)',n(D.netoV)],['Percepciones de IIBB sufridas',n(D.pIIBB)],['Retenciones de IIBB sufridas',n(D.rIIBB)],['Retenciones de Ganancias sufridas',n(D.rGan)],['',''],
        ['Ventas sin IVA (todos los pedidos)',n(vN)],['Costo de la mercadería vendida sin IVA',n(vC)],['Gastos',n(gT)],['Resultado del mes',n(vN-vC-gT)]]);
      const num=r=>r.map((v,i)=>i>=4&&typeof v=='string'&&/^-?\d+,\d\d$/.test(v)?n(v.replace(',','.')):v);
      hoja('IVA Ventas',HEAD_V,D.V.map(r=>num(filaV(r))));hoja('IVA Compras',HEAD_C,D.C.map(r=>num(filaC(r))));
      hoja('Retenciones',['Fecha','Tipo','Impuesto','Jurisdicción','Cliente','CUIT','Certificado','Importe'],D.RT.map(x=>[x.fecha,x.tipo,x.impuesto,x.jurisdiccion||'',x.cliente_id?nomCli(x.cliente_id):'',x.cliente_id?cuitCli(x.cliente_id):'',x.comprobante||'',n(x.importe)]));
      hoja('Gastos',['Fecha','Categoría','Detalle','Medio','Importe'],(ga.data||[]).map(x=>[x.fecha,x.categoria,x.descripcion||'',MED_TXT[x.medio]||x.medio,n(x.importe)]));
      hoja('Cobros',['Fecha','Recibo','Cliente','CUIT','Medio','Importe'],(re.data||[]).map(x=>[diaLocal(x.fecha),x.numero,nomCli(x.cliente_id),cuitCli(x.cliente_id),MED_TXT[x.medio]||x.medio,n(x.importe)]));
      hoja('Pagos a proveedores',['Fecha','Proveedor','CUIT','Medio','Referencia','Importe'],(pp.data||[]).map(x=>[x.fecha,x.proveedores?.razon_social||'',x.proveedores?.cuit||'',MED_TXT[x.medio]||x.medio,x.referencia||'',n(x.importe)]));
      hoja('Cheques',['Tipo','eCheq','Banco','Número','Librador','Fecha de pago','Importe','Estado','Cliente','Destino'],(ch.data||[]).filter(x=>(x.fecha_pago>=a&&x.fecha_pago<z)||['en_cartera','emitido'].includes(x.estado)).map(x=>[x.tipo,x.echeq?'Sí':'No',x.banco||'',x.numero||'',x.librador||'',x.fecha_pago,n(x.importe),EST_CH[x.estado],x.cliente_id?nomCli(x.cliente_id):'',x.destino||'']));
      hoja('Bancos',['Fecha','Cuenta','Concepto','Referencia','Importe'],(mv.data||[]).map(x=>[x.fecha,C?.find(c=>c.id==x.cuenta_id)?.nombre||'',x.concepto,x.ref||'',n(x.importe)]));
      est('Armando el archivo…');XLSX.writeFile(wb,'Contador Sabores '+m+'.xlsx',{compression:true});est('Listo: se descargó «Contador Sabores '+m+'.xlsx».')}
    catch(e){est('No se pudo armar el Excel: '+(e.message||e))}b.disabled=false};
}
