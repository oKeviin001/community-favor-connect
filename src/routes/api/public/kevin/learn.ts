import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-kevin-token",
  "access-control-allow-methods": "GET, OPTIONS",
};

export const Route = createFileRoute("/api/public/kevin/learn")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const { buildEstrutura, connectionByToken, registrarLog, getIdentity } = await import("@/lib/kevin.server");
        const conexao = await connectionByToken(request.headers.get("x-kevin-token"));
        if (!conexao) return Response.json({ error: "Token inválido" }, { status: 401, headers: cors });
        const identity = await getIdentity();
        const estrutura = await buildEstrutura();
        await registrarLog({
          conexao_id: conexao.id,
          origem: identity.app_nome,
          destino: conexao.remote_nome,
          direcao: "saida",
          operacao: "aprendizado",
          registros: 1,
        });
        return Response.json(estrutura, { headers: cors });
      },
    },
  },
});
