// digest-pending-requests
// Authenticated Edge Function boundary between n8n and the digest RPC.
// n8n sends: Authorization: Bearer <N8N_WEBHOOK_SECRET>
// Returns the same array that get_pending_requests_for_digest() returns.
// verify_jwt=false — authentication is the shared integration secret only.

const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const integrationSecret = Deno.env.get("N8N_WEBHOOK_SECRET") ?? "";
    if (!integrationSecret) {
      console.error("N8N_WEBHOOK_SECRET_NOT_CONFIGURED");
      return json({ error: "Service unavailable" }, 503);
    }

    // Timing-safe secret comparison — never log the supplied value.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supplied = authHeader.replace(/^Bearer\s+/i, "");
    if (!supplied) return json({ error: "Unauthorized" }, 401);

    const enc = new TextEncoder();
    const a = enc.encode(supplied.padEnd(integrationSecret.length, "\0"));
    const b = enc.encode(integrationSecret.padEnd(supplied.length, "\0"));
    let diff = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    if (diff !== 0 || supplied.length !== integrationSecret.length) {
      return json({ error: "Unauthorized" }, 401);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? SUPABASE_URL;

    const rpcRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_pending_requests_for_digest`,
      {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );

    if (!rpcRes.ok) {
      console.error("DIGEST_RPC_ERROR", { status: rpcRes.status });
      return json({ error: "Failed to fetch digest data" }, 502);
    }

    const data = await rpcRes.json();
    return json(data, 200);

  } catch (err) {
    console.error("UNHANDLED_ERROR", { error: err instanceof Error ? err.message : String(err) });
    return json({ error: "Internal server error" }, 500);
  }
});
