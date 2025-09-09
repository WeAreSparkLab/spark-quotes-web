// supabase/functions/redeem-support-key/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: { code?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const code = body.code?.trim();
  if (!code) return json({ error: "Missing code" }, 400);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: "Server misconfigured" }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Get current user from the Authorization header the client sends
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
  const user = userRes?.user;
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  // 1) Try to atomically consume the key (uses < max_uses)
  const { data: consumed, error: consumeErr } = await admin.rpc(
    "redeem_key",
    { p_code: code, p_user: user.id }
  );

  if (consumeErr) {
    return json({ error: "Could not redeem key" }, 500);
  }
  if (!consumed) {
    // function returns false if no row updated (invalid or used up)
    return json({ error: "Invalid or already used key" }, 409);
  }

  // 2) Mark the user as supporter
  const { error: upsertErr } = await admin
    .from("profiles")
    .upsert({ id: user.id, is_supporter: true }, { onConflict: "id" });

  if (upsertErr) {
    return json({ error: "Failed to update profile" }, 500);
  }

  return json({ ok: true });
});
