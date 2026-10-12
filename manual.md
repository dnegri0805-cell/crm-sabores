# Manual de uso · CRM Sabores de mi País

Guía ordenada por sección para consultar o pasarle al equipo. Cada punto dice **qué hace** y **dónde está**.

## 1. Primeros pasos

- **CRM (uso interno):** https://dnegri0805-cell.github.io/crm-sabores/ — se entra con usuario y contraseña.
- **Catálogo de cada cliente:** link personal `pedido.html?c=…` que se manda desde la ficha del cliente (botón de WhatsApp). Cada cliente ve sus precios, su cuenta y sus promos.
- **Catálogo público (sin precios de cliente):** `pedido.html?ver=catalogo` — para redes, folletos y nuevos clientes.
- **Actualización automática:** cuando hay una mejora, la página se recarga sola. La versión se ve arriba, junto a tu nombre (ej. `v2026-10-11.30`). Si algo "no aparece", cerrá y abrí la pestaña.
- **En el celular:** abrí el CRM en Chrome → menú ⋮ → *Agregar a pantalla de inicio*. Queda como una app.
- **📲 Atajos en el ícono:** mantené apretado el ícono de la app y vas directo a **Nuevo pedido**, **Cola del día**, **Reparto** o **Cobrar**. Si no aparecen, esperá un día o sacá la app y volvé a agregarla a la pantalla de inicio.
- **🔐 Entrar con huella o cara** (en **Aa**): al abrir el CRM en ese equipo, o si quedó más de 5 minutos en segundo plano, te pide la huella, la cara o el PIN del celular. Si falla, **Entrar con mi contraseña**. Se activa en cada equipo.
- **❓ Ayuda:** arriba, al lado del buscador, abre la explicación de la pantalla en la que estás.
- **Aa Cómo se ve:** letra normal, grande o muy grande, modo claro u oscuro, y **🔔 avisos en este equipo** (notificación cuando entra un pedido online, aunque estés en otra app, mientras el CRM esté abierto). Se guarda por equipo.
- **Atajos en la PC:** N nuevo pedido · C Cola del día · I Inicio · R Reparto · B o Ctrl + K buscar · ? ayuda.
- **Abre más rápido:** guarda en el equipo los clientes y productos y los actualiza solos por detrás.
- **🔎 Buscar:** arriba a la derecha (o **Ctrl + K**) buscás un cliente, un producto (con precio, costo y stock) o un pedido por su número, desde cualquier pantalla.
- **Menú principal:** Inicio · Pedidos · Ventas · Reparto · Clientes · Cobranza · Caja · Compras · Stock · Precios · Reportes · Contable · Manual. Los números en rojo indican cosas pendientes.

## 2. Inicio

Es el tablero del día. Arriba de todo, si falta algo: **🩺 Falta correr un SQL** (el CRM detecta solo qué archivo falta; botón **📋 Copiar** y **Abrir Supabase**) y **⚙️ Configuración pendiente** (datos de pago, link de Mercado Pago, WhatsApp, gastos fijos, zonas, cámaras, depósito, etc., cada uno con **Ir**). En el celular, arriba aparecen **6 botones grandes**: Nuevo pedido, Cola del día, Por aprobar, Armar, Reparto y Cobrar.

**✅ Mi día:** todo lo que tenés que hacer hoy en una sola lista, con cuántos hay de cada cosa: mandar la Cola, aprobar, armar, pesar, repartir, cobrar vencidos, depositar cheques, pagar a proveedores, revisar órdenes de compra en borrador, anotar la temperatura y tus tareas. Cada renglón tiene **Ir** y lo tildás cuando lo terminaste.

**🤖 Aprobación automática** (desde Mi día o Pedidos): los pedidos online de clientes de confianza (sin deuda vencida, sobre el mínimo, dentro de su límite y con al menos 2 pedidos entregados) se aprueban solos. Requiere **solo.sql**.

**🗓️ Orden de compra semanal:** el día que elijas (por defecto el lunes), al abrir el CRM se arma sola una orden en borrador por proveedor con lo que hay que reponer. La revisás y la mandás por WhatsApp desde Compras. Arriba muestra el **objetivo del mes y la proyección** (si llegamos o no al ritmo actual).

**📊 Resumen de hoy** (solo el dueño): vendido (y cuánto contra ayer), ganancia estimada, cobrado (por medio de pago), pedidos que falta entregar y kilos de quesos y fiambres vendidos. Con **📲 Mandármelo** te lo mandás por WhatsApp. Ahí mismo están **📈 Ganancia neta** (cargás tus gastos fijos del mes y ves la ganancia después de gastos y merma, la proyección del mes y el **punto de equilibrio**: cuánto tenés que vender en el mes y por día hábil para cubrir los gastos), **🧾 Cierre del día** (cobrado por medio, gastos y pagos, efectivo neto, pedidos nuevos, entregados y lo que quedó sin entregar, para mandar por WhatsApp) y **📄 Informe del mes** (ventas, margen, cobranza, compras, gastos, merma, deuda, stock, mejores clientes y productos, en PDF para vos y tu contador; también en Reportes).

**🌙 Para mañana** (desde las 16 h, y en el atajo del ícono): qué entregás mañana y cuántos falta armar, pedidos por aprobar, **qué mercadería te falta** para esos pedidos, a quién cobrar (contado y vencidos), cheques para depositar y vencimientos (camioneta, cheques tuyos, proveedores, mercadería y tareas). Si tenés los **🔔 avisos** activados, a las **21 h** te llega como notificación. También va en el mail del resumen diario.

**📤 Comprobantes de pago** que te mandaron los clientes y **🛠️ Equipos del depósito** con service o calibración cerca: aparecen arriba cuando hay.

**🤝 Hoy prometieron pagar** y **📂 Documentos por vencer** (de tus clientes, un mes antes): aparecen arriba cuando hay.

**🚐 Camioneta:** si se vence la VTV, el seguro u otro papel (15 días antes) o se acerca el service, aparece arriba con botón **Ver**.

**🔁 Tareas que se repiten** (en Tareas): cargás una vez "pagar el alquiler el 10" o "llamar al contador los lunes" y aparecen solas el día que toca.

**📝 Tareas:** anotá cosas para hacer con fecha (pagarle a un proveedor, llamar a un cliente). Las vencidas quedan en rojo; las tildás cuando las hacés. Abajo, **🤖 Se armaron solas**: facturas de proveedores que vencen en 3 días, cheques para depositar, mercadería por vencer y cuentas clave que no compran hace 30 días.

En **⚠️ Alertas** también aparecen la **🌡️ temperatura de cámara** fuera de rango (o sin anotar a las 11), los **🚦 clientes en riesgo alto** y los **precios pactados que quedaron con poco margen** después de un aumento: **Revisar y actualizar** te propone el precio nuevo, los actualizás de una y le avisás a cada cliente por WhatsApp.

Debajo aparecen tarjetas de aviso; cada una lleva a la pantalla donde se actúa:

- **🎯 Metas de captación:** avance de la semana y aviso si vas atrasado.
- **⚡ Cola del día:** cuántos mensajes hay listos para mandar hoy, con botón *Empezar*.
- **Plan del día:** a quién llamar o visitar hoy, ya priorizado.
- **Les toca comprar:** clientes que por su frecuencia ya deberían pedir.
- **Fidelización, comprando menos, clientes que crecen, servicio y fieles:** alertas de clientes que bajan, suben o merecen un reconocimiento.
- **🚚 Mañana le llevás:** el día anterior a la entrega (los pedidos con día de entrega), la Cola le avisa al cliente con un link para tocar si **no va a estar**. Si lo toca, el pedido queda marcado **🚫 Avisó que no va a estar** (en Pedidos y en el Modo chofer). Requiere **avisos.sql**.
- **🎉 Hitos:** cuando un cliente llega a su pedido 10, 25, 50 o 100, la Cola le manda un agradecimiento con un cupón (5, 10, 15 o 20 %).
- **📊 Resumen del mes:** los primeros 7 días de cada mes, la Cola arma para cada cliente con cuenta corriente su resumen del mes anterior (compras, pagos y saldo) para mandárselo.
- **Fechas:** cumpleaños, aniversarios y fechas comerciales cercanas.
- **Alerta en vivo:** cada 45 segundos revisa si entró un pedido online, un reclamo o un pedido del catálogo público, y suena un aviso. Dejá el CRM abierto en la PC para no perder ninguno.

## 3. Pedidos

**Dónde:** menú *Pedidos*. Pestañas: En curso · Por aprobar · Entregados · Todos.

**Cargar un pedido** (botón *+ Nuevo pedido*):

- Elegí el cliente; se aplican solos su lista de precios, **nivel**, **precios pactados** y promos vigentes.
- **🎤 Dictar:** en el celular tocás Dictar y decís el pedido ("diez kilos de danbo… dos cajas de maní salado"), con una pausa entre producto y producto. Lo reconoce igual que Pegar de WhatsApp.
- **🔁 Repetir último:** desde la ficha del cliente, carga su último pedido con los precios de hoy.
- **📷 Foto de la lista** (dentro de Pegar de WhatsApp): sacás o elegís una foto de la lista (en papel o la que te mandó el cliente) y el CRM lee el texto y reconoce los productos. Funciona mejor con letra clara o impresa, buena luz y la hoja derecha; siempre revisá lo que reconoció.
- **Pegar de WhatsApp:** pegás el mensaje del cliente tal cual y el sistema reconoce productos y cantidades.
- **Combos** y **cupón** se agregan desde el mismo formulario.
- Abajo se ve el **ticket promedio** del cliente y, para el dueño, la **ganancia estimada** del pedido.
- **📦 Faltó algo** (en los pedidos aprobados o en preparación): ponés cuánto falta de cada producto, se saca del pedido y queda como **"le debemos"**. Cuando ese cliente hace su próximo pedido (online, al aprobarlo, o cargado por vos) te pregunta si lo agregás. Opción de avisarle por WhatsApp. Requiere **visitas.sql**.
- **📴 Sin señal:** si cargás un pedido sin internet (en la calle), queda guardado en el celular y se manda solo cuando vuelve la señal. Arriba de la lista ves cuántos están esperando.
- **Mandar como presupuesto:** en vez de pedido, genera un presupuesto con link para que el cliente lo acepte (queda en *Ventas → Presupuestos*).

**Pedidos online:** los que hace el cliente desde su catálogo entran en *Por aprobar*. Revisalos y aprobalos. Cada pedido por aprobar muestra **cuánto te deja**: 🟢 bien, 🟡 debajo de tu margen mínimo, 🔴 perdés plata, ya descontado el costo de reparto de su zona (el que cargás en Zonas y camioneta). Si perdés plata, antes de aprobar te pregunta.

**Estados:** A preparación → Marcar listo → Salió a reparto → Entregado. Si te equivocás, abajo aparece **Deshacer** unos segundos (también al cambiar costos en Precios). Los cancelados se ven en **Cancelados** y se pueden **♻️ Reactivar**. El cliente ve el seguimiento en su cuenta.

**🧺 Hoja de armado** (botón al lado de *Últimos pedidos*, y también en Reparto): todo lo que hay que preparar sumado por producto, agrupado por familia, con los kilos de quesos y fiambres, en qué pedidos va cada cosa y aviso si falta stock. Tildás lo que vas juntando (o escaneás el código), la imprimís (con una hoja por pedido) y pasás todos a *En preparación* con un botón.

**En cada pedido** aparecen avisos útiles: ganancia, si el cliente tiene deuda, si **se olvidó** algo que suele comprar y cuánto le falta para el descuento por monto o el envío gratis. Con **💬 ¿Te agrego…?** le mandás el mensaje para completar el pedido antes de prepararlo.

## 3 bis. Fiambres y quesos (productos por peso)

Se venden **por pieza entera** y se cobran **por el peso real**.

- **Todos los quesos y fiambres de la lista ya quedan marcados solos** (el SQL ventas-peso los marca; los envasados por gramos, fetas, rallados y untables quedan afuera). Si después cargás productos nuevos, en **Precios → ⚖️ Productos por peso** está el botón **⚡ Marcar todos los quesos y fiambres**.
- **Por kilo o por pieza:** si el producto no tiene cargado el peso de la pieza, se vende **por kilo**: el precio de la lista es el precio por kilo, el cliente pide kilos y en el pedido, la nota de pedido (PDF), el remito y el WhatsApp sale **"16 kg · a pesar"** con el precio **"$ X /kg"**. Al pesar, los kilos se reemplazan por el peso real. Si le cargás el peso promedio de la pieza, pasa a venderse por pieza (abajo).

- **Configurar (una vez):** en **Precios → ⚖️ Productos por peso** marcás cada fiambre o queso y cargás el **peso promedio de la pieza** (ej.: horma 3,5 kg). El **costo se carga por kilo**, como te lo pasa el proveedor; en Precios esas filas muestran los precios por kilo y cuánto queda la pieza.
- **En el catálogo:** el cliente ve "⚖️ Pieza ≈ 3,5 kg · $ X el kg". Puede pedir por piezas o tocar **pedir en kilos** (ej.: 7 kg → 2 piezas). Se le avisa que el total final se ajusta al peso real.
- **En los pedidos:** cada pieza va al precio estimado (precio por kilo × peso promedio), así los mínimos, descuentos y promos funcionan igual que siempre.
- **Al preparar:** en el pedido aparece **⚖️ Pesar**. Escribís el peso real de cada renglón (si son varias piezas: **3,52 + 3,61**) y el importe se ajusta solo, con el detalle "7,13 kg × $/kg". Después te ofrece avisarle al cliente el total final por WhatsApp.
- **Stock:** se cuenta en piezas.
- **Mientras pesás:** al lado de cada producto te dice **📅 qué pieza usar primero** (la que vence antes). Al guardar, esa pieza se descuenta sola de los vencimientos.
- **El peso promedio se ajusta solo:** con lo que vas pesando y con los kilos que llegan del proveedor, el peso de la pieza se va corrigiendo, y con él el precio estimado.
- **🧀 Lista por kilo:** en **Ventas → 📣 Difundir → 🧀 Fiambres por kilo** se arma sola la lista con el precio por kilo (con las ofertas del día), para elegir la lista de precios. Se comparte por WhatsApp, se imprime o se guarda en PDF, o se baja como **imagen para estados e Instagram**. Abajo, **▶ Empezar ráfaga** se la manda a cada cliente que compra fiambres o quesos, con sus precios y su link (una vez por semana).
- **Remito:** muestra las piezas y los **kilos reales** de cada fiambre o queso (o "≈ kg, se cobra por peso real" si todavía no se pesó), con el total de kilos.
- **Compras:** la *Sugerencia de compra* muestra cuántas piezas pedir, los **kilos aproximados** y el costo por kilo. La orden de compra impresa sale con piezas, kilos aproximados y costo por kilo. Al **recibir** podés anotar los **kilos que llegaron** (ej.: 3,4 + 3,7); el costo queda siempre por kilo.
- **Por vencer:** en **Ventas → 🏷️ Ofertas → 📦 Liquidar stock**, cada fiambre o queso por vencer muestra los kilos y tiene **📲 Avisar**: arma la ráfaga para los clientes que lo compran, con el precio por kilo y la fecha.

## 4. Ventas · Recuperar y cerrar

**Dónde:** menú *Ventas* (abre en *Cola del día*). Con **⚙️** (al lado del título) ocultás las pantallas que no usás y marcás tus **⭐ favoritas**, que quedan en su propia solapa. Arriba hay solapas: **⚡ Hoy** (Cola, Plan de ataque, Plan del día, Automatizaciones) · **🤝 Clientes** · **🧲 Prospectos** · **🏷️ Ofertas** · **📣 Difundir** · **📸 Instagram** · **📊 Analizar**. Al tocar una solapa aparecen sus pantallas. Con **🔎 Buscar pantalla…** escribís, por ejemplo, "cupo" y la encontrás aunque esté en otra solapa. Casi todas tienen botón de **WhatsApp con el mensaje ya armado**.

- **⚡ Cola del día:** todos los mensajes que conviene mandar hoy, ya escritos y ordenados por importancia. Tocás **▶ Empezar ráfaga**: se abre WhatsApp con el mensaje, lo mandás, volvés y sigue el próximo. Cada cliente aparece una vez por día y nada se repite. Qué entra:
  - *Para cerrar ventas:* carritos sin enviar, miraron el catálogo, les toca comprar (con su **pedido sugerido**), aviso de **cierre de pedidos** (el día antes de su entrega), presupuestos y sugeridos **sin respuesta**, **volvió el stock**, **bajó el precio**, ofertas automáticas, **venta cruzada** y campañas programadas.
  - *Pedidos por el cliente:* los que pidieron **📌 que les recuerdes** su pedido y los **🔔 avisos de oferta** que marcaron.
  - *Más oportunidades:* **💵 después del pago**, **📆 lo que llevaron el año pasado en esta época** y **🧩 productos que dejaron de llevar**.
  - *Para cuidar al cliente:* secuencia para que vuelvan, **cupón a dormidos**, clientes nuevos (primeros 90 días), bienvenida, aniversarios, **cumpleaños** con cupón, "¿llegó todo bien?" después de la entrega, los que **calificaron mal** (arriba de todo, para llamarlos) y recordatorio de deudas.
  - *Para conseguir clientes:* los que piden ser clientes (**alta exprés**), la secuencia de prospectos, **lanzamientos de zona**, prospectos fríos, pedido de **recomendación** y de **reseña en Google**.
  - *Avisos de pedidos:* cuando aprobás un pedido o sale a reparto, el aviso al cliente queda listo en la ráfaga (si no lo mandaste antes).
  - Si hay clientes que suelen pedir a otra hora, se divide en **⏰ Mandar ahora** y **🕐 Más tarde**. En la ráfaga, **💬 Respuestas** tiene las respuestas rápidas.
  - Los últimos 5 días del mes, si no llegás al objetivo, arriba aparece el **🏁 Empujón de fin de mes**.
  - Abajo, **Resultados**: cuántos compraron en los 7 días siguientes, cuántos cupones se usaron y cómo va cada prueba A/B.
- **🗓️ Plan de ataque:** cada lunes se arma solo el plan de la semana (zona a atacar, prospectos y visitas, categoría a empujar, cuentas clave que bajaron, oferta por cupo, reconquista). Tildás lo que hacés y ves cómo vas: venta de la semana, mensajes, prospectos trabajados y clientes nuevos.
- **👑 Cuentas clave:** tus mejores clientes juntos, con su compra de los últimos 30 días contra su promedio y hace cuánto no hablás con cada uno. Si uno baja 15 %, entra arriba de la Cola para llamarlo. Se marcan acá o desde la ficha.
- **⚔️ Ataque a la competencia:** con los precios de competencia cargados, muestra a cada cliente cuánto se ahorra por mes comprándote a vos (con ráfaga de WhatsApp), dónde la competencia es más barata (botón **Igualar** por 30 días, solo si tu margen no baja del mínimo) y los clientes **perdidos a la competencia** con su plan de reconquista (30, 60 y 90 días).
- **⚙️ Automatizaciones:** las reglas de la cola. Secuencia para que vuelvan a comprar (por días sin comprar: mensaje, mensaje, llamada), cupón a dormidos (días, %, vencimiento), pedido sugerido el día justo, **ofertas automáticas** por sobrestock o vencimiento (opcional: que se creen solas), primeros 90 días, secuencia de prospección (día 0 presentación, día 3 kit de primer pedido, día 7 visita), seguimiento de lo que quedó sin respuesta, después de la entrega, aviso de malas notas, venta cruzada (con cupón para probar), pedir recomendación y reseña en Google, revivir prospectos fríos, cierre de pedidos, volvió el stock, bajó el precio, cumpleaños, lanzamiento de zona, carritos, miraron y deudas. Todos los textos se pueden editar. **🧪 Prueba A/B:** en varios mensajes podés escribir una *versión B*; la mitad de los clientes recibe cada una y a las 2 semanas queda sola la que más vendió. Al final, las **💬 Respuestas rápidas** (pedido mínimo, entregas, pago, zona, cómo pedir, lista de precios).
- **📋 Plan del día:** lista priorizada de a quién contactar hoy y por qué. Empezá el día por acá.
- **📞 Les toca comprar:** clientes que ya deberían pedir. Trae **pedido sugerido** y un **📋 Guion** de llamada.
- **👀 Miraron el catálogo:** entraron a su link pero no pidieron. Momento ideal para escribirles.
- **📉 Comprando menos:** clientes que bajaron su compra o dejaron de llevar productos.
- **🛒 Carritos sin enviar:** armaron un pedido online y no lo mandaron.
- **🔔 Esperan productos:** pidieron aviso de un producto sin stock; cuando entra, avisales desde acá.
- **⭐ Encuestas:** calificaciones de los clientes después de la entrega. Las de 4 y 5 ⭐ con comentario se pueden **🌐 mostrar en el catálogo público** ("Lo que dicen nuestros clientes").
- **📝 Presupuestos:** presupuestos enviados, aceptados o vencidos. Los pedidos del catálogo público entran acá como 🌐 Catálogo.
- **🧪 Muestras:** registrá muestras entregadas y hacé el seguimiento.
- **👋 Bienvenida y aniversarios:** mensajes para clientes nuevos y para quienes cumplen tiempo con nosotros.
- **🌱 Primeros 90 días:** clientes nuevos y en qué pedido van (●○○). Si no hacen el 2° pedido les llega un mensaje; si no hacen el 3°, un cupón. Muestra qué % quedó como cliente fijo.
- **🆘 Reclamos:** reclamos hechos desde "Mi cuenta" del cliente; respondé y cerralos.
- **🧲 Embudo de prospectos:** Nuevo → Contactado → Visitado → Interesado → Ya es cliente. Botón **📋 Pegar una lista de prospectos** (nombre y teléfono por fila) y 💬 respuestas rápidas.
- **🚶 Ruta de prospección:** con tu ubicación (o una dirección) arma el recorrido con los prospectos más cercanos, con una frase para cada rubro. En cada negocio tocás 👍 Le interesa · 🔁 Volver · 👎 No · 🧾 Hizo pedido (lo da de alta en el momento). Botón para abrir la ruta en Google Maps.
- **🧭 Zonas sin cubrir:** mapa con las zonas donde ya tenés clientes (verde) y las vecinas donde todavía no (naranja), con botones para buscar negocios, armar la ruta o **🚀 Lanzar** la zona ("¡Llegamos a tu barrio!" con cupón para el primer pedido a todos los prospectos de ahí). Abajo, los resultados de cada lanzamiento.
- **📞 Modo llamadas:** prospectos con teléfono uno tras otro, ordenados por puntaje, con guion y el resultado en un toque (interesado, volver a llamar, no atendió, no le interesa).
- **🗺️ Buscar negocios:** busca kioscos, almacenes, dietéticas, etc. en una zona y los carga como prospectos.
- **🧊 Exhibidores:** heladeras y exhibidores prestados en comodato: a quién, desde cuándo y si rinde.

## 5. Ventas · Ofertas

Todo lo que se configura acá **aparece solo en el catálogo del cliente** y se aplica en el pedido.

- **⚡ Relámpago:** oferta con cuenta regresiva (horas). Ideal para mover algo rápido.
- **🎯 Ofertas personales:** un precio especial solo para un cliente.
- **🥇 Niveles:** Bronce/Plata/Oro según lo que compra; cada nivel con su descuento.
- **💰 Precio sugerido:** el "vendelo a" (PVP) que ve el comerciante, con su margen.
- **🎁 Combos:** packs armados; incluye **combos sugeridos** y el **kit de primer pedido** (solo clientes nuevos).
- **🏷️ Precio por cantidad:** descuento desde X unidades o por bulto, y **bonificación** tipo 12+1. Se puede limitar a ciertos días ("solo hoy martes").
- **🎟️ Cupones:** códigos de descuento con vencimiento y usos.
- **📦 Liquidar stock:** productos con mucho stock o próximos a vencer, con precio de salida.
- **🔜 Preventa:** productos que todavía no llegaron; el cliente reserva y acá ves cuánto pidieron.
- **📦 Venta por bulto:** marcá productos que solo se venden por caja cerrada.
- **🏷️ Precios redondeados:** redondea las listas (ej. mayorista a $10, minorista terminado en 90).
- **📈 Aviso de aumento:** avisá a los clientes que sube el precio para que compren antes.
- **✨ Novedades:** productos nuevos destacados en el catálogo.
- **🔥 Oferta por cupo:** precio especial solo para los primeros N pedidos. En el catálogo se ve "🔥 QUEDAN 7" real y se apaga sola al completarse.
- **📜 Acuerdos comerciales:** el cliente se compromete a un monto por mes y tiene descuento o precio congelado en lo que siempre lleva (como precios pactados). Ve su avance en el catálogo; si viene atrasado, entra en la Cola. Al terminar, sus precios vuelven a como estaban.
- **🧺 Combo de siempre:** cada cliente ve arriba de su catálogo "Tu combo de siempre" (lo que lleva en la mayoría de sus pedidos) con botón **Agregar todo**; si su pedido llega a ese total, se le aplica solo un descuento chico. Se generan una vez por mes con un botón.
- **🛒 Oferta de último momento:** un producto (mejor si es de buen margen) a precio especial que aparece al revisar el pedido: "¿Lo sumás?".
- **🚀 Productos para empujar:** los que dejan más margen que el promedio y se venden menos; para cada uno, oferta de 14 días, mensaje a los clientes de esa familia e imagen.
- **📲 Premio por pedir online:** puntos extra automáticos en cada pedido hecho desde el catálogo, el % de clientes que ya pide online y una ráfaga para invitar a los que nunca lo hicieron.
- **📦 Pedido quincenal:** clientes que piden todas las semanas; se les ofrece un cupón para pedidos grandes cada 15 días (mínimo: el doble de su promedio) y ves cuánto ahorrás en reparto.
- **💲 Descuentos y mínimo:** escalas por monto, pedido mínimo, costo de envío, descuento por pronto pago, días de entrega y **hora de corte**, y **freno a morosos** (avisar o bloquear pedidos con deuda vencida).

## 6. Ventas · Difundir

- **📇 Contactos para WhatsApp:** descarga tus clientes y prospectos (todos o por rubro) para importarlos al celular (.vcf) o a Google Contactos (.csv) y armar listas de difusión que lleguen a todos.
- **🔳 QR por campaña:** un QR propio para cada volante, cartel, vendedor o zona. Ves escaneos, pedidos de alta, pedidos web, clientes y cuánto compraron. Se descarga el QR o se imprimen 4 volantes por hoja.
- **📣 Campañas:** mensaje masivo por WhatsApp a un grupo de clientes (por zona, rubro, nivel, etc.), uno por uno con su link. Se manda ahora o se **📅 programa** para otro día: ese día aparece sola en la Cola del día.
- **📋 Novedades semanal:** arma el mensaje semanal con ofertas y novedades listo para enviar.
- **📅 Fechas:** calendario comercial (Día del Padre, Pascuas, Navidad…) con productos sugeridos para cada fecha.
- **🏪 Por rubro:** mensajes y productos pensados para kioscos, dietéticas, almacenes, etc.
- **🖼️ Folletos y catálogo:** genera folleto/catálogo para imprimir o compartir, y el link al catálogo público (por rubro y con código de quien refiere).
- **🏆 Puntos y desafío:** programa de puntos (cuánto suma cada $, valor del punto, tope de canje, premio por recomendar) y el desafío del mes.
- **🏆 Liga de clientes:** ranking mensual por rubro. Cada cliente ve en su catálogo en qué puesto va y cuánto le falta para subir (sin ver a los demás). A fin de mes premiás a los 3 primeros (puntos y mensaje).
- **🎟️ Sorteo del mes:** cada pedido da chances; el sistema elige ganador.
- **📢 Cambios de precio:** lista de lo que subió o bajó para avisar a clientes.
- **📱 Estados de WhatsApp:** imágenes listas para subir a tus estados.
- **🖼️ Tarjeta de producto:** imagen de un producto con precio para compartir.

## 6 bis. Ventas · Instagram

- **📸 Contenido:** imágenes listas en formato publicación (1080×1350) e historia (1080×1920) para 🔥 oferta, ✨ novedad, 🎁 combo, ⏳ oferta por cupo, 🏆 **Top 5 de la semana** (carrusel con tus ventas reales) y ⭐ **testimonios** (las opiniones que publicaste). Cada una trae su **texto y hashtags de tu zona** para copiar. Arriba cargás tu usuario, zona y hashtags propios.
- **🗓️ Calendario y reels:** qué publicar cada día de la semana con tus datos (botón Armar) y **guiones de reels** (llegó mercadería, lo que más venden los kioscos, así armamos tu pedido, cuánto ganás con un producto) para copiar.
- **🔗 Página para la bio:** tu página propia con catálogo, ofertas, "Quiero ser cliente", WhatsApp y opiniones. Pegá el link en la bio de Instagram: lo que entra por ahí queda como **📸 Instagram** en Captación, con visitas, altas, pedidos y clientes.
- **🎁 Sorteo:** creás el sorteo (premio y cierre), te arma la imagen, el texto con las bases y el link del formulario. Los anotados quedan como prospectos con su secuencia; al cerrar, **🎲 Elegir ganador** al azar y la imagen para anunciarlo.
- **📥 Prospectos de Instagram:** cargás negocios que encontrás en Instagram (con su @), abrís su perfil y copiás el mensaje directo listo. Cuando te pasan el WhatsApp, lo cargás y arranca la secuencia de la Cola.
- **🛍️ Catálogo para Shopping:** descarga tus productos (con foto) en el formato de Meta para subirlos al Commerce Manager y etiquetarlos en las publicaciones.

## 7. Ventas · Analizar

- **🧲 Captación:** prospectos nuevos, cuántos pasaron a cliente, clientes nuevos y su venta, semana a semana, **de dónde vienen** (QR, Buscar negocios, catálogo público, recomendación, visita) y por vendedor. Abajo, las **🎯 metas de captación semanales** (prospectos contactados, visitas y clientes nuevos), que se ven en Inicio con su avance.
- **🔮 Pronóstico del mes:** cuánto vas a vender a fin de mes a este ritmo, cuánto por día te falta para la meta y los clientes habituales que todavía no pidieron (con botón para escribirles hoy).
- **📺 Tablero en vivo:** para una TV o pantalla: venta de hoy, pedidos que van entrando (suena cuando entra uno), meta del mes, por aprobar y mejores clientes. Se actualiza solo.
- **💼 Rentabilidad por cliente:** cuánto te deja cada cliente después de reparto, devoluciones y mora, con qué hacer con los que no rinden.
- **🧪 Simulador de aumento:** elegís marca o familia y %: ganancia extra, cuánto volumen podés perder sin salir perdiendo, dónde quedarías más caro que la competencia y a qué clientes cuidar.
- **📊 Resumen semanal:** cómo fue la semana contra la anterior.
- **📆 Año contra año:** venta de cada mes contra el mismo mes del año pasado, y **Comprá antes**: lo que más se vendió en los próximos dos meses del año pasado comparado con lo que venís vendiendo.
- **🧀 Rentabilidad quesos y fiambres:** kilos vendidos, venta, ganancia y **ganancia por kilo** de cada uno (con el peso real), y cuáles conviene **🚀 empujar** o **⚠️ revisar el precio**.
- **🏭 Metas y reintegros:** objetivos por proveedor/marca y reintegros que te deben.
- **🕐 Cuándo piden:** días y horarios en que entran los pedidos (para saber cuándo mandar mensajes).
- **🅰️ ABC:** qué productos y clientes hacen la mayor parte de la venta.
- **🏭 Por marca:** venta y margen por marca.
- **🏁 Competencia:** precios de la competencia cargados por ustedes, comparados con los nuestros.
- **🚶 Por qué no compran:** motivos registrados en visitas y llamadas.
- **💸 Ventas perdidas:** lo que no se pudo vender por falta de stock.
- **📊 Potencial:** cuánto más podría comprar cada cliente comparado con clientes parecidos.
- **🗺️ Por zona:** venta y clientes por zona.
- **🔎 Qué buscan y piden:** lo que los clientes buscan en el catálogo y no encuentran, y productos que sugieren.

## 8. Clientes

**Dónde:** menú *Clientes*. Pestañas: Clientes · Agenda de visitas · Mapa · Dormidos · Prospectos · Pedidos fijos.

- **Clientes:** buscador y filtros (con deuda, por zona, por lista). Tocando un cliente se abre su **ficha**.
- **📂 Documentos** (en la ficha): constancia de CUIT, de Ingresos Brutos, habilitación, contrato de comodato o DNI (foto o PDF). Quedan en una carpeta privada que solo se ve entrando al CRM; si tienen vencimiento te avisa en Inicio un mes antes. Requiere **cuentas.sql**.
- **🏖️ Vacaciones** (en la ficha): cierra desde / vuelve el. Mientras está cerrado no se arma su pedido fijo y la Cola no le escribe; cuando vuelve, la Cola le manda *¡Bienvenido! ¿Reponemos?*.
- **🕐 Horario de recepción** (en la ficha): por ejemplo de 8 a 12. **🧭 Ordenar recorrido** pone primero a los que cierran temprano y el **Modo chofer** avisa si llegás fuera de horario.
- **🎙️ Nota de voz** (en Notas de la ficha): grabás un audio después de la visita (hasta 3 minutos), con un resumen escrito o dictado opcional. Se escucha con **▶️ Escuchar**. Requiere **visitas.sql**.
- **📸 Góndola** (en la ficha): fotos de la góndola o heladera del cliente en cada visita, con nota, para ver cómo exhibe tus productos. Carpeta privada. Requiere **visitas.sql**.
- **🗒️ Notas** (en la ficha): anotás lo que no te querés olvidar del cliente; con fecha, también te queda como tarea. Las notas aparecen al cargarle un pedido y en el Modo chofer. Requiere **cobrar.sql**.
- **📄 Estado de cuenta** (en la ficha): PDF con el saldo, los comprobantes pendientes (vencidos en rojo), los últimos pagos y tus datos para pagar; también le manda el resumen por WhatsApp.
- **🧹 Revisión de datos** (arriba en Clientes): lo que conviene completar, con su arreglo: **clientes duplicados** (mismo teléfono, CUIT o nombre) con botón **Unificar** (todos sus pedidos, facturas y cobros pasan a uno; requiere **entregas.sql**), clientes **sin ubicación** (botón para ubicarlos solos en el mapa con su dirección), sin teléfono, sin localidad o sin rubro (se completan ahí mismo) y productos sin costo, sin foto o con margen raro.
- **Ficha del cliente:** datos, lista de precios, **rubro**, **cliente desde**, **🎂 cumpleaños**, **👑 cuenta clave**, **🚩 se fue a la competencia** (con quién y por qué), **🧮 Negociar** (hasta cuánto podés bajarle sin perder plata, producto por producto), **quién lo recomendó**, **puntos**, **precios pactados**, historial, deuda y el **📋 guion** de venta. Desde acá se manda su **link de catálogo** por WhatsApp.
- **Agenda de visitas:** recorrido del día; el botón **📍 Visita** registra la visita y el resultado. También sugiere **prospectos de paso** cerca del recorrido.
- **📍 Avisarme al llegar** (Clientes, arriba): con el CRM abierto en el celular, cuando llegás a la puerta de un cliente (a menos de 80 m) te muestra su última compra, lo que debe, lo que le debemos, su promesa de pago y sus notas, con botones para el pedido, la ficha, la visita y la góndola.
- **Mapa:** clientes coloreados por **última compra** o deuda, y los prospectos. **💰 Cuánto compra:** colores según lo que compró cada uno en los últimos 3 meses (verde oscuro, el 20 % que más compra). **🚚 Cerca del reparto:** las paradas del recorrido (los pedidos que salen o, si no hay, los clientes que visitás hoy) y, a menos de 1,2 km, los **clientes dormidos** (más de 45 días sin comprar) y los **prospectos**, con lista, WhatsApp y Cómo llegar para pasar a verlos.
- **Dormidos:** clientes que hace mucho no compran.
- **Prospectos:** negocios a conquistar, con su estado y su **⭐ puntaje** (0 a 100: rubro que mejor convierte, cercanía a tus clientes, teléfono, origen y estado). La cola, las llamadas y el embudo empiezan por los de mayor puntaje. **⚡ Alta exprés:** lo da de alta y le manda por WhatsApp su catálogo personal con la bienvenida y el kit de primer pedido.
- **Pedidos fijos:** pedidos que se repiten solos (semanal, quincenal…).

## 9. Reparto, cobranza y caja

- **Reparto:** pedidos listos para salir, armado del recorrido y remitos. El chofer marca *Entregado* y el cliente lo ve en su cuenta.
- **📅 Días de entrega por zona y pedido mínimo por zona** (Reparto → Zonas y camioneta): el cliente elige en su catálogo el día de entrega entre los días de su zona, y el catálogo le pide el mínimo de su zona. En Reparto cada pedido muestra su 📅 fecha y se eligen solos los de hoy. Requiere **entregas.sql**.
- **📅 Días sin reparto** (Reparto): feriados o días que no salís. El catálogo no los ofrece y con **📲 Avisar** les mandás a los clientes afectados que pidan antes.
- **🧭 Ordenar recorrido** (Reparto): ordena las paradas por cercanía desde tu depósito (la primera vez te pide la ubicación del depósito, estando ahí). Los clientes sin ubicación quedan al final.
- **📴 Sin señal en el reparto:** si en el Modo chofer te quedás sin internet, los entregados, cobros y "no estaba" quedan guardados en el celular y se mandan solos cuando vuelve la señal (no cierres la pantalla).
- **🚚 Modo chofer** (en Reparto, con los pedidos elegidos): una parada por pantalla, en orden. Muestra cliente, dirección (**📍 Cómo llegar**), **📞 Llamar**, **📲 Estoy llegando**, lo que lleva, el total y **cuánto cobrar** (contado o saldo de la cuenta). **✅ Entregado y cobrado** registra el cobro (efectivo, transferencia, cheque) con su recibo, marca entregado y pide la **firma del cliente en la pantalla** (o la foto del remito, si preferís). También *Entregado sin cobrar* y *🚪 No estaba*. Al final, el resumen del reparto para mandarlo por WhatsApp.
- **💰 Cuánto te dejó el reparto:** al terminar el **Modo chofer** ves lo entregado, la ganancia de la mercadería, los km aproximados y el combustible (con las cargas de 🚐 Camioneta), y cuánto te dejó el reparto. Queda guardado en **Reparto → 📈 Repartos** con el total del mes. Requiere **visitas.sql**.
- **🗓️ Calendario** (Reparto): el mes a la vista con los pedidos de cada día de entrega, los feriados y los días sin reparto. Tocás un día y ves qué sale.
- **🚐 Camioneta al día** (Reparto): patente, kilómetros, vencimientos (VTV, seguro, patente, matafuego, licencia, RUTA), service cada X km con **✅ Hice el service hoy**, y las **⛽ cargas de combustible** (km del tablero, litros, importe; si querés se anotan también como gasto de caja). Con dos tanques llenos te calcula el **consumo (km por litro)** y **cuánto te cuesta cada kilómetro** (combustible más service, seguro y arreglos que cargues en Caja). Requiere **practico.sql**.
- **Cobranza:** quién debe y cuánto, con filtro *Con deuda vencida*. Registrás pagos (efectivo, transferencia, cheque) y se genera el **recibo**. El botón **pronto pago** aplica el descuento si paga dentro del plazo.
- **🤝 Promesas de pago** (Cobranza → Clientes que deben → **🤝 Promesa**): anotás cuándo te dijo que paga y cuánto. Ese día aparece en Inicio; se marca **cumplida** sola cuando registrás el cobro, y si no pagó, al otro día la Cola le manda el recordatorio. En cada cliente ves cuántas promesas cumple.
- **💸 Recargo por mora** (Cobranza → Clientes que deben): lo activás con el interés por mes y los días de gracia. A cada cliente con deuda vencida le aparece el recargo, que va en el WhatsApp de deuda, el resumen en PDF y el estado de cuenta. Con **perdonar o cobrado** vuelve a cero desde ese día.
- **💵 Contar billetes** (Caja → Cierre, al lado de Efectivo contado): ponés cuántos billetes hay de cada uno y te arma el total y la diferencia; el detalle queda en la nota del cierre.
- **Caja:** ingresos y egresos del día y cierre de caja (arqueo). Arriba, **🧾 Cierre del día**.
- **Cobranza → 🏦 Conciliar transferencias:** subís el extracto del banco o de Mercado Pago (Excel, CSV o PDF) o pegás las filas; el CRM sugiere de qué cliente es cada ingreso (por CUIT, nombre o importe) y registrás los cobros con un toque. Los ya registrados no se repiten.
- **💳 Cómo pagar con QR:** el remito, la nota de pedido y el estado de cuenta llevan tus datos de pago (alias/CBU) y un QR con tu link de Mercado Pago (se cargan en Configuración: datos de pago y link de MP).
- **Cobranza → 🚦 Semáforo de riesgo:** 🔴 clientes con deuda vencida que además compran mucho menos, llevan 45 días o más de mora o pagan menos de la mitad de lo que compran; 🟡 los que tienen algo vencido. Botón para escribirles y **🔒 Cortar crédito** (el límite queda en su deuda actual).
- **Cobranza → 💳 Crédito inteligente:** límite sugerido para cada cliente según cómo compra y paga (buen pagador 1,5 veces su compra mensual, regular 1 vez, malo media vez). Tildás y aplicás.
- **Reparto → 🗺️ Zonas y camioneta:** para cada zona (sale de la zona o localidad del cliente), los **días de entrega** y el **costo por parada**. Ves cuánto te deja cada zona después del reparto y el **pedido mínimo sugerido**. Cargás la **capacidad de la camioneta** (bultos y kilos) y la hoja de reparto te avisa si te pasás o si hay pedidos de zonas que no entregás ese día. También en Ventas → Analizar.
- **📍 Seguimiento en vivo:** mientras el **Modo chofer** está abierto (con permiso de ubicación), el celular comparte dónde está la camioneta. El cliente ve en su catálogo *"Tu pedido está en camino · antes que vos hay 2 paradas · llega aprox. 11:40"* y un mapa con **📍 Ver dónde está**. Los mensajes de *Ya salió* y *Estoy llegando* llevan el link para seguirlo. No ve a los demás clientes. Al cerrar el Modo chofer se deja de compartir. Requiere **vivo.sql**.
- **✍️ Remito firmado en el celular:** al entregar, el cliente firma con el dedo y se anota quién recibió. Queda en el pedido (botón **✍️ Firmado**), sale impresa en el remito y el cliente lo ve en **Mi cuenta → ✍️ Remito** (con los kilos reales). Botón para mandárselo por WhatsApp. Funciona sin señal. Requiere **vivo.sql**.

## 10. Compras, stock, precios y reportes

- **Compras:** Órdenes de compra (con botón **WhatsApp** que le manda el pedido armado al proveedor y la marca como enviada) · **Sugerencia de compra** (qué reponer según lo que se vende) · **🏷️ Mejor proveedor** · Proveedores · Facturas y pagos a proveedores.
- **📈 Historial de costos** (Compras): cuánto subió cada producto y cada proveedor (30, 90, 180 días o un año), con gráfico por producto y ⚠️ en los que subieron mucho más que el resto.
- **Mínimo y descuento por proveedor** (en la Sugerencia de compra): cargás el mínimo de compra y el descuento por volumen de cada proveedor; te avisa cuánto falta y con **Completar** suma lo que más rota. La orden semanal automática también completa el mínimo.
- **📅 Aumentos programados** (Precios): cargás un aumento anunciado (de un proveedor, marca, familia o todos) con su fecha. Unos días antes la Cola avisa a los clientes que compran esos productos, y ese día los costos y precios suben solos.
- **🏷️ Mejor proveedor:** el último costo de cada producto en cada proveedor (lo que compraste y las listas que importás), cuál es más barato, cuánto ahorrarías por mes y un botón para pasar el producto a ese proveedor. Requiere **operacion.sql**.
- **Importar la lista del proveedor** (en Precios): elegí el proveedor. Si la lista trae productos que hoy le comprás a otro, **no te cambia el costo**: quedan guardados para comparar en *Mejor proveedor* (y te marca 💡 si son más baratos).
- **Stock → 📉 Merma:** cargás roturas, vencidos, diferencias de peso, faltantes. Se descuenta del stock y ves cuánta plata perdés, por motivo y por producto (también en el informe del mes).
- **🧾 Factura por foto** (Compras, arriba): elegís el proveedor y le sacás una foto a la factura; el CRM lee cada renglón (cantidad, producto y precio), lo busca en tus productos y arma la compra para recibirla. Revisá todo antes de confirmar.
- **📈 Gráfico de un producto** (Compras → Historial de costos, buscador de arriba): cómo fue cambiando el costo, cuánto subió en 12 meses y tus precios de venta.
- **🚨 Alerta de costo al recibir** (Compras → Recibir): si un producto llega más caro que la última vez (3 % o más) o si otro proveedor lo tiene más barato, te avisa antes de confirmar. Como el costo nuevo cambia tus precios de venta solos, podés tildar **Mantener costo anterior**.
- **🏭 Día de pedido de cada proveedor** (Compras → Orden semanal → 🏭 Día de cada proveedor): marcás qué día pasa el preventista o cierra el pedido cada uno. Ese día se arma sola su orden de compra en borrador. Los que no tienen día siguen con la orden semanal.
- **Stock → 📦 Conteo del día:** cada día te pide contar solo 10 productos (los que hace más que no contás y los que más plata valen). Al guardar corrige el stock y te muestra las diferencias. También aparece en **Mi día**.
- **Stock → 🛠️ Equipos:** cámaras, heladeras, cortadora y balanza, con cada cuánto les toca el service, la calibración y la garantía. Avisa en Inicio 15 días antes.
- **Stock → 🔪 Fraccionar:** cortás una horma o pieza entera para vender por kilo o en cuñas. Elegís qué cortaste, cuánto pesó entera y en qué la fraccionaste (kilos o cuñas). Se baja la pieza del stock, se suma lo fraccionado, la **merma del corte** queda en Merma y te muestra el **rendimiento** y el **costo real por kilo**; con un tilde actualiza el costo (y los precios) de lo fraccionado. Abajo, el rendimiento promedio de cada producto. Requiere **practico.sql**.
- **Stock → 🔎 Lotes (trazabilidad):** al preparar un pedido se anota solo qué lote se usó (el que vence antes, de los vencimientos cargados) y sale en el remito. Ante un reclamo o retiro, buscás el producto o el lote y ves a qué clientes se les entregó, con botón para avisarles. Requiere **negocio.sql**.
- **Stock → 🌡️ Temperatura:** anotás la temperatura de cada cámara; si está fuera de rango (lo configurás, por defecto 0 a 5 °C) queda en rojo y aparece en Inicio. **Planilla del mes** para imprimir ante una inspección.
- **Stock:** existencias, movimientos y vencimientos. Los quesos y fiambres se ven **en kilos**; con **Solo quesos y fiambres** ves cuántos kilos tenés y cuánta plata al costo. En **📋 Conteo por partes → ⚖️ Quesos y fiambres** contás con el celular escribiendo los pesos de las etiquetas (**3,5 + 3,6**) o escaneando (te pide el peso de cada pieza).
- **Precios:** costos y listas mayorista/minorista; los cambios se reflejan al instante en los catálogos.
- **Margen adicional por familia** (en Precios, debajo de *Margen de cada lista*): puntos que se suman o restan al margen de la lista solo para una familia (ej.: mayorista 25 % y *Frutos secos* +5 → 30 %). Las familias se ven agrupadas (Fiambres, Quesos, Heladería y panadería…). Requiere **margen-familia.sql**.
- **Rubro Heladería y panadería:** los productos de JEMA'S se cargan con **heladeria.sql**, ya ordenados en sus familias (coberturas, frutas para sembrar, pastas, dulce de leche heladero, descartables…). Se venden por kilo.
- **Reportes:** ventas por cliente, por producto y por marca, por período (este mes, mes anterior, este año).
- **Contable:** Resultados · Rentabilidad · IVA · Retenciones · Cheques · Bancos · Flujo de caja · Valor del stock · Para el contador (exportaciones).

## 11. Catálogo del cliente (lo que ve el cliente)

Se abre con su link personal. Pasos para el cliente: **buscar → agregar → Ver pedido → Enviar**.

- **Arriba:** su puesto en la **🏆 liga** de su rubro, el avance de su **🤝 acuerdo**, su nivel, días de entrega y **hora de corte**, crédito disponible, aviso si tiene deuda vencida (si está en *bloquear*, no puede enviar hasta pagar) y botón para **instalar el catálogo como app**.
- **Para pedir rápido:** ⚡ **Pedido rápido** (sus productos de siempre en una lista), **pedido sugerido**, **repetir último pedido**, **favoritos** ❤️ y **escanear** 📷 el código de barras.
- **Ofertas visibles:** relámpago con reloj, **últimas unidades**, preventa con botón *Reservar*, combos, bonificación 12+1, precio por cantidad.
- **En cada producto:** precio, **precio por kilo/litro**, PVP "**vendelo a**" con su ganancia, y si es solo por caja cerrada.
- **En cada producto también:** "🔥 Lo pidieron N negocios esta semana" o "⭐ De lo más pedido por los kioscos" (datos reales) y el botón **🔔 Avisame si baja**.
- **Arriba también:** 🧺 su combo de siempre y el aviso de puntos extra por pedir online.
- **Al terminar el pedido:** puede elegir **📌 que le recuerdes** el próximo en 7, 15 o 30 días.
- **En el carrito:** ⚡ la oferta de último momento, y 💡 **Te conviene** (cuánto le falta para un descuento, con botón para sumarlo), cupón, canje de puntos, avance del desafío y chances del sorteo, pedido mínimo y envío.
- **Sugerir producto:** si no encuentra algo, lo pide desde el buscador (te llega a *Qué buscan y piden*).
- **Pedido automático:** puede dejar programado que se repita su pedido.
- **✏️ Corregir el pedido** (Mi cuenta): mientras está por aprobar, el cliente lo pasa al carrito, lo cambia y lo vuelve a enviar.
- **📅 Día de entrega:** en el carrito elige cuándo se lo llevás (los días de su zona, sin feriados).
- **Sin stock:** si un producto está agotado, le ofrece uno parecido de la misma familia con botón **Agregar**.
- **📤 Mandar comprobante** (Mi cuenta): el cliente sube la foto o captura de la transferencia; te llega a **Cobranza → 📤 Comprobantes** para registrar el cobro con un toque. Requiere **avisos.sql**.
- **🗳️ Votación de productos:** armás la pregunta y las opciones en **Ventas → 🤝 Clientes → 🗳️ Votación de productos**; los clientes votan en su catálogo y ves los resultados. Requiere **avisos.sql**.
- **🎄 Canastas navideñas** (de octubre a diciembre): el comercio elige el tipo (dulce, clásica o para picar) y cuántas arma; le sugiere los productos, el costo por canasta y a cuánto venderla, y lo pasa al carrito.
- **🤝 Pedido en grupo:** si no llega al mínimo, en el carrito puede **crear un grupo** y mandarle el código a un comercio vecino (o **unirse** con un código que le pasaron). Cada uno hace y paga su pedido; el mínimo se cuenta entre los dos y se entrega en la misma vuelta. El primero puede mandar su pedido apenas crea el grupo. En Pedidos se ven con la marca **🤝 Grupo**. Requiere **cuentas.sql**.
- **🏷️ Etiquetas para la góndola** (Mi cuenta): el comercio elige los productos que te compra y la ganancia, y se imprime etiquetas de precio para recortar (los quesos y fiambres, con precio por kilo).
- **🧀 Armá una picada:** el cliente pone para cuántas personas y qué tipo (liviana, picada o abundante) y le arma los kilos de cada queso y fiambre (puede cambiarlos, sumar o quitar). Le muestra cuánto le cuesta y **a cuánto venderla armada**, y con **🛒 Pasar al carrito** la agrega. Usa los quesos y fiambres que se venden por peso.
- **❓ Preguntas frecuentes:** horario, días de entrega de su zona, mínimo, envío, formas de pago, cómo pedir, peso real, seguimiento y reclamos. Se arman solas con lo que cargaste; las completás o agregás las tuyas en **Ventas → 🤝 Clientes → 💬 Preguntas del catálogo** (ahí también está el link para compartirlas). Requiere **practico.sql**.
- **🪄 Armame un pedido de $ …:** pone cuánto quiere gastar y se le arma el pedido con lo que siempre lleva.

## 12. Mi cuenta del cliente y catálogo público

**Mi cuenta** (pestaña dentro del catálogo del cliente):

- Sus pedidos con **seguimiento**, comprobante y botón de **reclamo**. Si está en reparto, **📍 Dónde está** (mapa en vivo); si ya se entregó, **✍️ Remito** firmado.
- Sello **✅ Pedido completo garantizado**, si activás la garantía.
- Saldo, **recibos** y descuento por **pronto pago**.
- **Puntos**, **Recomendá y ganá** (link para invitar a otro comercio), sorteo y desafío del mes.
- Configuración de su **pedido automático**.

**Catálogo público** (`pedido.html?ver=catalogo`):

- Muestra productos sin datos de cliente; se puede filtrar por rubro.
- Botón **Quiero ser cliente**: el interesado deja sus datos y entra como prospecto.
- Si arma un pedido, llega a *Ventas → Presupuestos* marcado 🌐 Catálogo, para confirmarlo vos.
- Los que piden ser clientes aparecen arriba de todo en la **Cola del día** para el alta exprés.
- Con un QR de campaña el link lleva `&qr=CÓDIGO` y todo lo que haga esa persona queda anotado a esa campaña.

**✅ Garantía "Pedido completo"** (Ventas → Reclamos → **✅ Garantía**): la activás y elegís el % del cupón y su vencimiento. Los clientes ven el sello en el catálogo y, al resolver un reclamo, se genera solo un cupón de compensación que va en el mensaje de disculpas. Requiere **vivo.sql**.

## 13. Configuración inicial recomendada

Una sola vez, en este orden:

1. **Precios:** revisá costos y listas; activá *Precios redondeados* si querés precios prolijos.
2. **Ventas → Descuentos y mínimo:** pedido mínimo, envío, escalas, pronto pago, días de entrega, hora de corte y freno a morosos.
3. **Ventas → Niveles** y **Puntos y desafío:** definir beneficios.
4. **Ventas → Precio sugerido:** márgenes de reventa por rubro.
5. **Clientes:** completar rubro, zona y teléfono de cada cliente (son la base de campañas y análisis).
6. **Mandar a cada cliente su link** de catálogo desde la ficha.
7. **Ventas → Automatizaciones:** revisá los días y los textos de cada regla.
8. Desde ahí, la rutina diaria: **Ventas → Cola del día (ráfaga) → Plan del día → Pedidos por aprobar → Reparto → Cobranza**.

## 14. Copias de seguridad y preguntas frecuentes

- **Copias de seguridad:** se hacen solas todos los días en un repositorio privado de GitHub. No hay que hacer nada. Además, con **💾 Descargar todo en Excel** (Reportes, arriba, o en Inicio) bajás una copia completa a tu compu.
- **"No veo una mejora nueva":** cerrá la pestaña y volvé a abrir; la versión de arriba tiene que coincidir con la última.
- **"El cliente no puede enviar el pedido":** revisá si no llega al mínimo, si pasó la hora de corte o si tiene deuda vencida con freno en *bloquear*.
- **"El cliente perdió su link":** reenvialo desde su ficha.
- **Seguridad:** nunca compartas la clave secreta de la base de datos; el link de cada cliente es personal.
- **Mails automáticos:** a las 7:45 llega *Tu cola de hoy* con botón para empezar, y a las 20:30 el resumen del día. Se activan cuando se cargan los datos de Gmail en GitHub.
- **Próximamente:** factura electrónica ARCA y usuarios para vendedores y choferes.
