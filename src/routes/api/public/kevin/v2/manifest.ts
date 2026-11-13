import { createFileRoute } from "@tanstack/react-router";
import { getKevinV2Identity } from "@/lib/kevin-system/runtime.server";
import { KEVIN_CATEGORIES, KEVIN_PROTOCOL } from "@/lib/kevin-system/protocol";

export const Route = createFileRoute("/api/public/kevin/v2/manifest")({
  server: { handlers: {
    GET: async () => {
      try {
        const identity = await getKevinV2Identity();
        return Response.json({
          protocol: KEVIN_PROTOCOL, identity,
          capabilities: { receiveEvents: true, sendEvents: true, signedRequests: true, acknowledgements: true, transferFiles: false, pullChanges: false, adminCommands: true },
          supportedCommands: ["system.ping"],
          scopes: KEVIN_CATEGORIES,
        }, { headers: { "cache-control": "no-store" } });
      } catch {
        return Response.json({ error: "Kevin v2 ainda não foi ativado neste aplicativo." }, { status: 503 });
      }
    },
  } },
});
