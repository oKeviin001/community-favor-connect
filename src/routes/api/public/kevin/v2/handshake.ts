import { createFileRoute } from "@tanstack/react-router";
import { acceptKevinV2Pairing } from "@/lib/kevin-system/runtime.server";
import { normalizeKevinOrigin, KEVIN_PROTOCOL } from "@/lib/kevin-system/protocol";

export const Route = createFileRoute("/api/public/kevin/v2/handshake" as never)({
  server: { handlers: {
    OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
    POST: async ({ request }) => {
      try {
        const body = await request.json() as {
          protocol?: string; code?: string;
          remote?: { app_id?: string; app_name?: string; app_slug?: string; app_version?: string; origin?: string };
        };
        if (body.protocol !== KEVIN_PROTOCOL || !body.code || !body.remote?.app_id || !body.remote.app_name || !body.remote.origin) {
          return Response.json({ error: "Dados de pareamento incompletos." }, { status: 400, headers: cors });
        }
        const remote = {
          app_id: body.remote.app_id, app_name: body.remote.app_name,
          app_slug: body.remote.app_slug, app_version: body.remote.app_version,
          origin: normalizeKevinOrigin(body.remote.origin),
        };
        const result = await acceptKevinV2Pairing({ code: body.code, remote });
        return Response.json({ ok: true, protocol: KEVIN_PROTOCOL, ...result }, {
          headers: { ...cors, "cache-control": "no-store" },
        });
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Pareamento recusado." }, { status: 400, headers: cors });
      }
    },
  } },
});
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
