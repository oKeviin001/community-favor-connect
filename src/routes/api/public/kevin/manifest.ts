import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-kevin-token",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/kevin/manifest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const { buildManifesto } = await import("@/lib/kevin.server");
        const origin = new URL(request.url).origin;
        const manifesto = await buildManifesto(origin);
        return Response.json(manifesto, { headers: cors });
      },
    },
  },
});
