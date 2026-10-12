/* Familias de productos de Sabores de mi País (las mismas del catálogo con fotos).
   Las usan el CRM (index.html), el catálogo de clientes (pedido.html) y el catálogo con precios (catalogo.html). */
const FAMILIAS=[
 ['Fiambres',['Jamón cocido','Fiambre cocido de pata de cerdo','Paleta de cerdo cocida','Fiambre de cerdo para emparedados','Jamón crudo','Bondiola','Lomo de cerdo','Panceta y pastrón','Mortadela','Leverwurst','Salchichón, queso de cerdo y salchichas','Salames y salamines','Fiambres feteados']],
 ['Quesos',['Quesos de campo y provoletas','Cheddar y dips','Queso rallado','Quesos untables y queso crema','Quesos blandos','Quesos en hebras, fetas y fraccionados','Mozzarella','Quesos azules','Quesos duros','Quesos semiduros']],
 ['Lácteos',['Manteca','Crema de leche','Leches','Yogures','Postres, flanes y gelatinas','Dulce de leche']],
 ['Almacén',['Maní y snacks','Snacks y untables','Semillas','Tostadas, galletas y crackers','Conservas de pescado','Paté y picadillo','Conservas de frutas','Tomate y salsas de tomate','Conservas de verduras y legumbres','Aceites y grasas','Vinagres, aceto y jugo de limón','Mayonesa','Aderezos y salsas','Arroz','Harinas, polenta y rebozadores','Sal','Especias y condimentos','Yerba mate','Café, cacao y endulzantes']],
 ['Dulces',['Mermeladas','Dulces de batata y membrillo','Repostería, miel y salsas dulces']],
 ['Heladería y panadería',['Coberturas y baños de chocolate','Chips, crocantes y decoración','Frutos secos','Frutas para sembrar','Pastas y variegatos','Dulce de leche familiar y heladero','Salsas para helado','Insumos para elaborar','Cucuruchos y capelinas','Descartables y envases']],
 ['Congelados',['Congelados']],
 ['Higiene personal',['Higiene personal']]];
const FAM_ORDEN={},FAM_GRUPO={};(()=>{let i=0;for(const[g,fs]of FAMILIAS)for(const f of fs){FAM_ORDEN[f.toUpperCase()]=i++;FAM_GRUPO[f.toUpperCase()]=g}})();
/* Ordena nombres de familia: primero las del catálogo en su orden, después las demás por nombre y "Otros" al final */
function famCmp(a,b){const A=String(a||''),B=String(b||'');if(A=='Otros'&&B!='Otros')return 1;if(B=='Otros'&&A!='Otros')return -1;
  const x=FAM_ORDEN[A.toUpperCase()],y=FAM_ORDEN[B.toUpperCase()];
  if(x!=null&&y!=null)return x-y;if(x!=null)return -1;if(y!=null)return 1;return A.localeCompare(B,'es')}
const famGrupo=f=>FAM_GRUPO[String(f||'').toUpperCase()]||'';
/* Reglas por descripción, para los productos que no están en el catálogo (el orden importa) */
const FAM_REGLAS=[
 /* Heladería y panadería (van primero para que no caigan en Lácteos o Almacén) */
 ['Coberturas y baños de chocolate',/^cobertura|^bano (de moldeo|granizado|semiamargo)|^manteca de cacao/],
 ['Frutas para sembrar',/para sembrar|^frutilla (tamizada|pulpa|en trozos|entera|iqf)|^pulpa de frutilla|^frutos del bosque|^cereza entera/],
 ['Pastas y variegatos',/^pasta de (anana|banana|cereza|coco|frutilla|melon|vainilla|marroc)|^pasta de mani para elaborar|^variegato/],
 ['Dulce de leche familiar y heladero',/^dulce de leche heladero|^dulce de leche familiar (la salamandra|cassanello|el rosquinense)/],
 ['Salsas para helado',/^salsa de (caramelo|chocolate|dulce de leche|frutilla) eureka/],
 ['Cucuruchos y capelinas',/^cucurucho|^capelina/],
 ['Descartables y envases',/^termico|^cucharitas? (palita|sundae)|^cuchara (palita|sundae)|^balde con tapa|^vaso de pasta|^servilleta/],
 ['Insumos para elaborar',/^colorante|^maltodextrina|^cerelose|^acido citrico|^agente de batido|^estabilizante|^leche en polvo (entera|descremada) regina|^almidon de maiz|^vino marsala/],
 ['Chips, crocantes y decoración',/^chip |^microgalletitas|^lentejas de chocolate|banada en chocolate|^chocolate (blanco en trocitos|marroc)|^boton relleno/],
 ['Mermeladas',/mermelada|^dulce (light )?de (frutilla|frutos|durazno|arandanos)|dulce light de batata/],
 ['Dulces de batata y membrillo',/^dulce de (batata|membrillo)|^postre de dulce de leche|\bbatata\b|\bmembrillo\b/],
 ['Repostería, miel y salsas dulces',/esencia de vainilla|^salsa de (frutilla|chocolate|caramelo)|\bmiel\b/],
 ['Conservas de pescado',/\batun\b|sardinas|caballa/],
 ['Harinas, polenta y rebozadores',/^(pan rallado|rebozador|polenta|sopa paraguaya|faina|semola|vitina)/],
 ['Conservas de verduras y legumbres',/^(granos de choclo|choclo|remolacha|porotos|garbanzos|esparrago|jardinera|espinaca|acelga|lentejas|arvejas|champi|palmito|pimiento|morron|aceituna|alcaparra)/],
 ['Tostadas, galletas y crackers',/^(tostad|almohaditas|dips crackers|crackers|galletas)/],
 ['Maní y snacks',/\bman[ií]\b|^crocante|pasta de man[ií]|manteca de man[ií]/],
 ['Café, cacao y endulzantes',/^cafe|^capsulas|^cacao|^azucar|^edulcorante/],
 ['Congelados',/^(medallones|milanesa|nuggets|papas|pizzeta|hamburguesas)/],
 ['Fiambres feteados',/(feteado|feteada) /],
 ['Jamón cocido',/^jamon (cocido|coc\b|natural|premium)|^jamon c\b/],
 ['Fiambre cocido de pata de cerdo',/pata de cerdo|\bpata\b/],
 ['Paleta de cerdo cocida',/paleta/],
 ['Fiambre de cerdo para emparedados',/^fiambre (cocido de cerdo|de cerdo)|emparedado/],
 ['Jamón crudo',/jamon crudo|pernil|^crudo\b/],
 ['Bondiola',/^bondiola/],
 ['Lomo de cerdo',/^lomo|lomito/],
 ['Panceta y pastrón',/^panceta|^pastron/],
 ['Mortadela',/mortadela/],
 ['Leverwurst',/leverwurst/],
 ['Salchichón, queso de cerdo y salchichas',/^salchich|^queso de cerdo/],
 ['Salames y salamines',/^(salam|rodajitas|peperoni|pepperoni|spianata|sorpresata|longaniza|chorizo|cantimpalo|fuet)/],
 ['Quesos de campo y provoletas',/^quesos? de campo|provoleta/],
 ['Cheddar y dips',/cheddar/],
 ['Queso rallado',/rallado/],
 ['Quesos untables y queso crema',/untable|para untar|queso crema|queso con crema|queso de crema|mascarpone|mendicrim|tholem|patagonia|cremette/],
 ['Quesos blandos',/cremoso|por ?salut|port ?salut|ricota|pategras light/],
 ['Quesos en hebras, fetas y fraccionados',/^queso.*(hebras|fetas|fraccionado|corazon de horma)/],
 ['Mozzarella',/mozzarella|muzzarella|muzarella/],
 ['Quesos azules',/queso azul|roquefort/],
 ['Quesos duros',/sardo|reggianito|parmesano|\bgoya\b|sbrinz|provolone|pepato|grana|romanito/],
 ['Quesos semiduros',/^queso|cuatro quesos|danbo|pategras|gouda|fontina|tybo|holanda|fymbo|gruyer|edam|criollo/],
 ['Manteca',/^manteca/],
 ['Crema de leche',/^crema/],
 ['Leches',/^leche/],
 ['Yogures',/^yogur/],
 ['Postres, flanes y gelatinas',/^postre|^flan|^gelatina/],
 ['Dulce de leche',/dulce de leche/],
 ['Snacks y untables',/^(hummus|babaganoush|snacks)/],
 ['Semillas',/^(semillas|mix)/],
 ['Tostadas, galletas y crackers',/^(tostad|almohaditas|dips crackers|crackers|galletas)/],
 ['Conservas de pescado',/\batun\b|sardinas|caballa/],
 ['Paté y picadillo',/^(pate|picadillo)/],
 ['Conservas de frutas',/^(duraznos?|anana|peras|coctel)/],
 ['Tomate y salsas de tomate',/tomate|^salsa (filetto|pomarola|portuguesa)/],
 ['Conservas de verduras y legumbres',/^(granos de choclo|choclo|remolacha|porotos|garbanzos|esparrago|jardinera|espinaca|acelga|lentejas|arvejas|champi|palmito|pimiento|morron|aceituna|alcaparra)/],
 ['Aceites y grasas',/^(aceite|grasa)/],
 ['Vinagres, aceto y jugo de limón',/^(vinagre|aceto|jugo de limon)/],
 ['Mayonesa',/mayonesa/],
 ['Aderezos y salsas',/^(ketchup|mostaza|salsa)/],
 ['Arroz',/^arroz/],
 ['Harinas, polenta y rebozadores',/^(pan rallado|rebozador|polenta|sopa paraguaya|faina|semola|vitina)/],
 ['Sal',/^sal\b/],
 ['Especias y condimentos',/celusal|^(oregano|pimenton|pimienta|aji molido|adobo|provenzal)/],
 ['Yerba mate',/^yerba/],
 ['Higiene personal',/^(pasta dental|cepillo)/]];
const famSinT=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function famPorDescripcion(d){const s=famSinT(d);for(const[f,re]of FAM_REGLAS)if(re.test(s))return f;return ''}
/* Índice del catálogo de fotos (fotos/catalogo/catalogo.json): [código, descripción, archivo, familia] */
let FAM_CAT=null;
async function catalogoFotos(){if(FAM_CAT)return FAM_CAT;
  try{const r=await fetch('fotos/catalogo/catalogo.json',{cache:'no-cache'});const L=r.ok?await r.json():[];
    const porCod={};for(const[c,d,f,fa]of L){const k=String(c||'').trim().replace(/^0+/,'');if(k)(porCod[k]=porCod[k]||[]).push({c:k,d,img:'fotos/catalogo/'+f+'.webp',fa})}
    FAM_CAT={L,porCod}}catch(e){FAM_CAT={L:[],porCod:{}}}
  return FAM_CAT}
/* Busca la foto/familia del catálogo para un código (si hay varias con el mismo código, la de descripción más parecida) */
function catPorCodigo(cod,desc){if(!FAM_CAT)return null;const L=FAM_CAT.porCod[String(cod||'').trim().replace(/^0+/,'')];if(!L)return null;if(L.length==1)return L[0];
  const tok=t=>new Set(famSinT(t).split(/[^a-z0-9]+/).filter(w=>w.length>1));const A=tok(desc);
  let best=L[0],bs=-1;for(const x of L){const B=tok(x.d);let k=0;for(const w of A)if(B.has(w))k++;const s=k/(A.size+B.size||1);if(s>bs){bs=s;best=x}}return best}
