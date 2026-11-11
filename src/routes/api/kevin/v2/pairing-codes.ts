import { createFileRoute } from "@tanstack/react-router";
import { createKevinV2PairingCode } from "@/lib/kevin-system/runtime.server";
import { isKevinCategory } from "@/lib/kevin-system/protocol";

function authorized(request: Request) {
  const expected = process.env.KEVIN_ADMIN_TOKEN ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || supplied.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return mismatch === 0;
}
export const Route = createFileRoute("/api/kevin/v2/pairing-codes")({
  server: { handlers: {
    POST: async ({ request }) => {
      if (!authorized(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });
      try {
        const body = await request.json() as { scopes?: unknown; expiresInMinutes?: number };
        if (!Array.isArray(body.scopes) || body.scopes.length === 0 || body.scopes.some((scope) => !isKevinCategory(scope))) {
          return Response.json({ error: "Informe um ou mais escopos válidos." }, { status: 400 });
        }
        const result = await createKevinV2PairingCode({
          scopes: body.scopes,
          expiresInMinutes: body.expiresInMinutes,
        });
        return Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Falha ao criar código." }, { status: 503 });
      }
    },
  } },
});
