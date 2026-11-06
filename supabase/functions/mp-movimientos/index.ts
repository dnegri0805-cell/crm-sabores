import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Consulta la cuenta de Mercado Pago con la credencial guardada en mp_conexion.
// Solo la ve el titular que la conectó (mp_conexion.usuario_id).
// La credencial nunca sale del servidor: la app solo recibe la cuenta y los movimientos.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const user = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
    const { data: puede, error: e1 } = await user.rpc("mp_puedo_ver");
    if (e1 || !puede) return json({ error: "Mercado Pago lo ve solo el titular de la cuenta." }, 403);

    const adm = createClient(url, service);
    const { data: c } = await adm.from("mp_conexion").select("token").eq("id", 1).maybeSingle();
    const token = c?.token;
    if (!token) return json({ conectado: false });
    const mp = (p: string) => fetch("https://api.mercadopago.com" + p, { headers: { Authorization: "Bearer " + token } });

    const body = await req.json().catch(() => ({}));
    const r = await mp("/users/me");
    if (!r.ok) return json({ conectado: false, error: r.status === 401 ? "La credencial no es válida o venció. Generá una nueva en Mercado Pago." : "Mercado Pago respondió con error " + r.status });
    const me = await r.json();
    const cuenta = [me.first_name, me.last_name].filter(Boolean).join(" ") || me.nickname || me.email || String(me.id);
    await adm.from("mp_conexion").update({ cuenta }).eq("id", 1);
    if (body.accion !== "movimientos") return json({ conectado: true, cuenta });

    const dias = Math.min(60, Math.max(1, Number(body.dias) || 15));
    const q = new URLSearchParams({ sort: "date_created", criteria: "desc", range: "date_created", begin_date: `NOW-${dias}DAYS`, end_date: "NOW", limit: "50" });
    const p = await mp("/v1/payments/search?" + q);
    if (!p.ok) return json({ conectado: true, cuenta, error: "No pude leer los movimientos (error " + p.status + ")." });
    const d = await p.json();
    const lista = (d.results || []).filter((x: any) => x.collector_id == me.id || x.collector?.id == me.id).map((x: any) => ({
      id: x.id,
      fecha: x.date_approved || x.date_created,
      monto: x.transaction_amount,
      neto: x.transaction_details?.net_received_amount ?? null,
      estado: x.status,
      medio: x.payment_method_id,
      tipo: x.payment_type_id,
      operacion: x.operation_type,
      descripcion: x.description || null,
      referencia: x.external_reference || null,
      pagador: [x.payer?.first_name, x.payer?.last_name].filter(Boolean).join(" ") || x.payer?.email || null,
      doc: x.payer?.identification?.number || null,
    }));
    return json({ conectado: true, cuenta, total: d.paging?.total ?? lista.length, movimientos: lista });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
