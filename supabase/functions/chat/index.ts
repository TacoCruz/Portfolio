// Portfolio chatbot proxy — runs on Supabase Edge Functions.
//
// Why this exists: the OpenRouter API key must never appear in the public
// GitHub repo or in the browser. The page calls this function; this function
// holds the key (as the OPENROUTER_API_KEY secret) and talks to OpenRouter.
//
// ── Things you can edit ──────────────────────────────────────────────
const MODEL = "openai/gpt-4o-mini"; // any OpenRouter model id, see openrouter.ai/models
const DAILY_LIMIT = 3;              // questions per visitor per 24 h
const MAX_TOKENS = 700;             // longest possible answer
// After editing, the function must be redeployed:
// `supabase functions deploy chat --project-ref kfhcaphutihlhuaalzjk`
// ─────────────────────────────────────────────────────────────────────

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return json({ error: "OPENROUTER_API_KEY secret is not set" }, 500);

  // Validate the request body before spending a rate-limit slot on it.
  const body = await req.json().catch(() => null);
  const system = typeof body?.system === "string" ? body.system.slice(0, 12000) : "";
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (
    !messages ||
    messages.length === 0 ||
    messages.length > 24 ||
    !messages.every(
      (m: { role?: string; content?: string }) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.length <= 4000,
    )
  ) {
    return json({ error: "bad request" }, 400);
  }

  // Rate limit: DAILY_LIMIT questions per IP per rolling 24 h.
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("chat_requests")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);
  if (countError) return json({ error: "rate-limit check failed" }, 500);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json(
      {
        error: "rate_limited",
        reply:
          "You've reached the limit of " + DAILY_LIMIT +
          " questions per day. Come back tomorrow, or reach Daniel directly at danielcruzcastro30@gmail.com.",
      },
      429,
    );
  }
  await supabase.from("chat_requests").insert({ ip });

  const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Daniel Cruz Portfolio Assistant",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!orResponse.ok) {
    const detail = await orResponse.text().catch(() => "");
    console.error("OpenRouter error", orResponse.status, detail);
    return json({ error: "upstream_error" }, 502);
  }

  const data = await orResponse.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string") return json({ error: "upstream_error" }, 502);

  const remaining = DAILY_LIMIT - ((count ?? 0) + 1);
  return json({ reply, remaining });
});
