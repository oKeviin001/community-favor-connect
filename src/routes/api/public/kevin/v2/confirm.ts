import { createFileRoute } from "@tanstack/react-router";
import { confirmKevinV2Pairing } from "@/lib/kevin-system/runtime.server";

export const Route = createFileRoute("/api/public/kevin/v2/confirm")({
  server: { handlers: {
    OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
    POST: async ({ request }) => {
      let body: unknown;
      try { body = await request.json(); }
      catch { return Response.json({ error: "JSON inválido." }, { status: 400, headers: cors }); }
      try {
        const result = await confirmKevinV2Pairing(request, body);
        return Response.json({ ok: true, ...result }, { headers: { ...cors, "cache-control": "no-store" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Confirmação recusada.";
        return Response.json({ ok: false, error: message }, {
          status: /assinatura|repetida|cabeçalhos|conexão/i.test(message) ? 401 : 400,
          headers: cors,
        });
      }
    },
  } },
});
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-kevin-connection, x-kevin-timestamp, x-kevin-nonce, x-kevin-signature",
  "access-control-allow-methods": "POST, OPTIONS",
};
