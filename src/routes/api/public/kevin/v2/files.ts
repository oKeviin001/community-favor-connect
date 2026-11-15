import { createFileRoute } from "@tanstack/react-router";
import { receiveKevinV2File } from "@/lib/kevin-system/runtime.server";

export const Route = createFileRoute("/api/public/kevin/v2/files")({
  server: { handlers: {
    OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
    POST: async ({ request }) => {
      let body: unknown;
      try { body = await request.json(); }
      catch { return Response.json({ ok: false, error: "JSON inválido." }, { status: 400, headers: cors }); }
      try {
        const result = await receiveKevinV2File(request, body);
        return Response.json({ ok: true, ...result }, { headers: { ...cors, "cache-control": "no-store" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Transferência recusada.";
        const status = /assinatura|nonce|cabeçalhos|conexão|autenticação/i.test(message) ? 401 : 400;
        return Response.json({ ok: false, error: message }, { status, headers: cors });
      }
    },
  } },
});
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-kevin-connection, x-kevin-timestamp, x-kevin-nonce, x-kevin-signature",
  "access-control-allow-methods": "POST, OPTIONS",
};
