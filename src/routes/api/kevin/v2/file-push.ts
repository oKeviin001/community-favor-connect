import { createFileRoute } from "@tanstack/react-router";
import { sendKevinV2File } from "@/lib/kevin-system/runtime.server";

function authorized(request: Request) {
  const expected = process.env.KEVIN_ADMIN_TOKEN ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || supplied.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return mismatch === 0;
}

// @ts-expect-error The generated TanStack route tree is refreshed during build.
export const Route = createFileRoute("/api/kevin/v2/file-push")({
  server: { handlers: {
    POST: async ({ request }) => {
      if (!authorized(request)) return Response.json({ ok:false, error:"Não autorizado." }, { status:401 });
      let body: unknown;
      try { body = await request.json(); } catch { return Response.json({ok:false,error:"JSON inválido."},{status:400}); }
      if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ok:false,error:"Metadados inválidos."},{status:400});
      const input = body as Record<string,unknown>;
      if (typeof input.fileName !== "string" || typeof input.contentType !== "string" || typeof input.base64 !== "string") {
        return Response.json({ok:false,error:"fileName, contentType e base64 são obrigatórios."},{status:400});
      }
      try {
        const result = await sendKevinV2File({fileName:input.fileName,contentType:input.contentType,base64:input.base64});
        return Response.json(result,{headers:{"cache-control":"no-store"}});
      } catch (error) {
        return Response.json({ok:false,error:error instanceof Error ? error.message : "Falha no envio."},{status:502,headers:{"cache-control":"no-store"}});
      }
    },
  } },
});
