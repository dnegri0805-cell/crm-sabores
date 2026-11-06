import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Alta, cambio de rol y baja de usuarios del CRM. Solo el dueño puede usarla.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const ROLES = ["dueno", "administracion", "vendedor", "deposito"];
// Contraseña temporal fácil de dictar: sin letras que se confunden
const temporal = () => {
  const L = "abcdefghjkmnpqrstuvwxyz", N = "23456789";
  const r = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  return "Sabores-" + Array.from({ length: 4 }, () => r(L)).join("") + Array.from({ length: 4 }, () => r(N)).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") || "";
    const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: due, error: e1 } = await user.rpc("es_dueno");
    if (e1 || !due) return json({ error: "Solo el dueño puede manejar los usuarios." }, 403);
    const adm = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: yoU } = await adm.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    const yoId = yoU?.user?.id;
    if (!yoId) return json({ error: "No pude identificar tu usuario." }, 401);
    const b = await req.json().catch(() => ({}));

    if (b.accion === "lista") {
      const { data: P } = await adm.from("perfiles").select("id,nombre,rol,activo,creado_en").order("creado_en");
      const em: Record<string, any> = {};
      // Correo, último ingreso y si tiene contraseña temporal: se leen directo de la base
      // (antes con auth.admin.listUsers, que fallaba sin avisar y dejaba todo vacío).
      const { data: I, error: eI } = await adm.rpc("usuarios_info");
      if (!eI && I) for (const u of I as any[]) em[u.id] = { email: u.email, ultimo: u.ultimo, temporal: !!u.temporal };
      else {
        const { data: U } = await adm.auth.admin.listUsers({ perPage: 200 });
        for (const u of U?.users || []) em[u.id] = { email: u.email, ultimo: u.last_sign_in_at, temporal: !!u.user_metadata?.clave_temporal };
      }
      return json({ yo: yoId, usuarios: (P || []).map((p) => ({ ...p, ...(em[p.id] || {}) })) });
    }

    if (b.accion === "crear") {
      const email = String(b.email || "").trim().toLowerCase(), nombre = String(b.nombre || "").trim(), rol = ROLES.includes(b.rol) ? b.rol : "vendedor";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "El correo no parece válido." }, 400);
      if (!nombre) return json({ error: "Poné el nombre." }, 400);
      const clave = temporal();
      const { data: c, error } = await adm.auth.admin.createUser({ email, password: clave, email_confirm: true, user_metadata: { nombre, clave_temporal: true } });
      if (error) return json({ error: /already|registered|exists/i.test(error.message) ? "Ya hay un usuario con ese correo." : error.message }, 400);
      const id = c.user!.id;
      const { error: e2 } = await adm.from("perfiles").upsert({ id, nombre, rol, activo: true });
      if (e2) return json({ error: "Se creó el acceso pero no pude guardar el rol: " + e2.message }, 500);
      return json({ ok: true, id, email, clave });
    }

    if (b.accion === "rol" || b.accion === "activo") {
      if (b.id === yoId) return json({ error: "No podés cambiar tu propio acceso desde acá." }, 400);
      const o: Record<string, unknown> = {};
      if (b.accion === "rol") { if (!ROLES.includes(b.rol)) return json({ error: "Rol inválido." }, 400); o.rol = b.rol; }
      else o.activo = !!b.activo;
      const { error } = await adm.from("perfiles").update(o).eq("id", b.id);
      if (error) return json({ error: error.message }, 400);
      if (b.accion === "activo") await adm.auth.admin.updateUserById(b.id, { ban_duration: b.activo ? "none" : "876000h" });
      return json({ ok: true });
    }

    if (b.accion === "clave") {
      if (b.id === yoId) return json({ error: "Tu propia contraseña la cambiás desde 'Cambiar mi contraseña'." }, 400);
      const clave = temporal();
      const { data: u } = await adm.auth.admin.getUserById(b.id);
      const { error } = await adm.auth.admin.updateUserById(b.id, { password: clave, user_metadata: { ...(u?.user?.user_metadata || {}), clave_temporal: true } });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, clave, email: u?.user?.email });
    }
    return json({ error: "Acción desconocida." }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
