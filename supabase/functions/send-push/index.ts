import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
      return json({ error: "push_not_configured" }, 503);
    }

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const caller = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: auth,
        apikey: serviceRoleKey,
      },
    });

    if (!caller.ok) return json({ error: "unauthorized" }, 401);
    const user = await caller.json();

    const adminCheck = await fetch(
      `${supabaseUrl}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin`,
      { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } },
    );
    if (!adminCheck.ok || (await adminCheck.json()).length === 0) {
      return json({ error: "forbidden" }, 403);
    }

    const body = await req.json();
    const userId = String(body.user_id || "");
    const notification = body.notification || {};
    if (!userId || !notification.title || !notification.body) {
      return json({ error: "invalid_payload" }, 400);
    }

    webpush.setVapidDetails(
      "mailto:admin@pedeprokevin.app",
      vapidPublicKey,
      vapidPrivateKey,
    );

    const devicesResponse = await fetch(
      `${supabaseUrl}/rest/v1/notification_devices?select=id,endpoint,subscription&user_id=eq.${encodeURIComponent(userId)}&ativo=eq.true`,
      { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } },
    );

    if (!devicesResponse.ok) return json({ error: "devices_lookup_failed" }, 502);

    const devices = await devicesResponse.json();
    let sent = 0;
    let removed = 0;

    for (const device of devices) {
      try {
        await webpush.sendNotification(
          device.subscription,
          JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            data: { url: notification.url || "/perfil" },
            tag: notification.tag || "pede-pro-kevin",
          }),
        );
        sent += 1;
      } catch (error) {
        const statusCode = Number(error?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          await fetch(
            `${supabaseUrl}/rest/v1/notification_devices?id=eq.${encodeURIComponent(device.id)}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                apikey: serviceRoleKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ ativo: false, atualizado_em: new Date().toISOString() }),
            },
          );
          removed += 1;
        }
      }
    }

    return json({ sent, removed, total: devices.length });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "push_failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
