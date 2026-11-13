import { createFileRoute } from "@tanstack/react-router";
import { retryKevinV2Files } from "@/lib/kevin-system/runtime.server";

function authorized(request: Request) {
  const expected = process.env.KEVIN_ADMIN_TOKEN ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || supplied.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return mismatch === 0;
}

// @ts-expect-error The generated TanStack route tree is refreshed during build.
export const Route = createFileRoute("/api/kevin/v2/file-retry")({
  server: { handlers: {
    POST: async ({ request }) => {
      if (!authorized(request)) return Response.json({ ok: false, error: "Não autorizado." }, { status: 401 });
      try { return Response.json(await retryKevinV2Files(10), { headers: { "cache-control": "no-store" } }); }
      catch (error) { return Response.json({ ok: false, error: error instanceof Error ? error.message : "Falha na recuperação." }, { status: 502 }); }
    },
  } },
});
