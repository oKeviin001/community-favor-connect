import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-kevin-token",
  "access-control-allow-methods": "GET, OPTIONS",
};

export const Route = createFileRoute("/api/public/kevin/export")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const { coletarDados, connectionByToken, registrarLog, getIdentity } = await import("@/lib/kevin.server");
        const conexao = await connectionByToken(request.headers.get("x-kevin-token"));
        if (!conexao) return Response.json({ error: "Token inválido" }, { status: 401, headers: cors });

        const url = new URL(request.url);
        const pedidos = (url.searchParams.get("tipos") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
        const desde = url.searchParams.get("desde");
        const autorizados = pedidos.filter((t) => conexao.permissoes.includes(t));
        if (autorizados.length === 0) {
          return Response.json({ error: "Nenhum tipo autorizado para esta conexão." }, { status: 403, headers: cors });
        }

        const identity = await getIdentity();
        const dados = await coletarDados(autorizados, desde);
        const registros = Object.entries(dados).flatMap(([tipo, itens]) =>
          itens.map((i) => ({ tipo, remote_id: i.remote_id, payload: i.payload })),
        );
        await registrarLog({
          conexao_id: conexao.id,
          origem: identity.app_nome,
          destino: conexao.remote_nome,
          direcao: "saida",
          operacao: "exportacao",
          tipos: autorizados,
          registros: registros.length,
        });
        return Response.json(
          { origem: identity.app_nome, identificador: identity.app_uuid, tipos: autorizados, registros },
          { headers: cors },
        );
      },
    },
  },
});
