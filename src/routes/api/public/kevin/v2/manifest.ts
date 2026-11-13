import { createFileRoute } from "@tanstack/react-router";
import { getKevinV2Identity } from "@/lib/kevin-system/runtime.server";
import { KEVIN_CATEGORIES, KEVIN_PROTOCOL } from "@/lib/kevin-system/protocol";

export const Route = createFileRoute("/api/public/kevin/v2/manifest")({
  server: { handlers: {
    OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
    GET: async () => {
      try {
        const identity = await getKevinV2Identity();
        return Response.json({
          protocol: KEVIN_PROTOCOL, identity,
          capabilities: { receiveEvents: true, sendEvents: true, signedRequests: true, acknowledgements: true, transferFiles: true, pullChanges: false, adminCommands: true },
          supportedCommands: ["system.ping"],
          scopes: KEVIN_CATEGORIES,
        }, { headers: { ...cors, "cache-control": "no-store" } });
      } catch {
        return Response.json({ error: "Kevin v2 ainda não foi ativado neste aplicativo." }, { status: 503, headers: cors });
      }
    },
  } },
});

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "accept, content-type",
  "access-control-allow-methods": "GET, OPTIONS",
};
