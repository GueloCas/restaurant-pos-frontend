import { createClient } from "npm:@supabase/supabase-js@2.109.0";
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
export async function handleInvite(req: Request) {
  const reply = (status: number, code: string) => new Response(JSON.stringify({ code }), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply(405, "METHOD_NOT_ALLOWED");
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return reply(401, "UNAUTHORIZED");
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: authError } = await admin.auth.getUser(authorization.slice(7));
    if (authError || !identity.user) return reply(401, "UNAUTHORIZED");
    const { data: actor, error: actorError } = await admin.from("profiles").select("role,tenant_id").eq("id", identity.user.id).single();
    if (actorError || actor?.role !== "ADMIN") return reply(403, "FORBIDDEN");
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 100 || !["ADMIN", "CASHIER", "WAITER"].includes(body.role)) return reply(400, "INVALID_INPUT");
    // Redirects are server-controlled. Configure APP_ORIGIN when deploying the frontend.
    const origin = Deno.env.get("APP_ORIGIN") ?? "http://localhost:5173";
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: origin + "/aceptar-invitacion" });
    if (inviteError || !invited.user) return reply(409, "INVITE_NOT_CONFIRMED");
    // Never upsert or reassign an existing profile to a different restaurant.
    const { error: profileError } = await admin.from("profiles").insert({ id: invited.user.id, tenant_id: actor.tenant_id, full_name: name, role: body.role });
    if (profileError) return reply(500, "PROFILE_NOT_CONFIRMED");
    return reply(200, "INVITED");
  } catch { return reply(500, "INVITE_NOT_CONFIRMED"); }
}
Deno.serve(handleInvite);
