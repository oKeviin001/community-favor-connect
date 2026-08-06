import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-kevin-token",
  "access-control-allow-methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/kevin/handshake")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const { receberHandshake } = await import("@/lib/kevin.server");
        try {
          const body = (await request.json()) as { codigo?: string; manifesto?: Record<string, unknown> };
          if (!body.codigo || !body.manifesto) {
            return Response.json({ ok: false, error: "Código e manifesto são obrigatórios." }, { status: 400, headers: cors });
          }
          const origin = new URL(request.url).origin;
          const result = await receberHandshake(body.codigo, body.manifesto, origin);
          return Response.json(result, { headers: cors });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 400, headers: cors });
        }
      },
    },
  },
});
