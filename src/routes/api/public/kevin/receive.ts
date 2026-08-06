import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-kevin-token",
  "access-control-allow-methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/kevin/receive")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const { connectionByToken, gravarRecebidos, registrarLog, getIdentity } = await import("@/lib/kevin.server");
        const conexao = await connectionByToken(request.headers.get("x-kevin-token"));
        if (!conexao) return Response.json({ error: "Token inválido" }, { status: 401, headers: cors });
        try {
          const body = (await request.json()) as {
            origem?: string;
            tipos?: string[];
            registros?: { tipo: string; remote_id: string; payload: unknown }[];
          };
          const registros = (body.registros ?? []).filter(
            (r) => r && typeof r.tipo === "string" && r.remote_id != null && conexao.permissoes.includes(r.tipo),
          );
          const total = await gravarRecebidos(conexao, body.origem ?? conexao.remote_nome, registros);
          const identity = await getIdentity();
          await registrarLog({
            conexao_id: conexao.id,
            origem: body.origem ?? conexao.remote_nome,
            destino: identity.app_nome,
            direcao: "entrada",
            operacao: "recebimento",
            tipos: body.tipos ?? [],
            registros: total,
          });
          return Response.json({ ok: true, registros: total }, { headers: cors });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 400, headers: cors });
        }
      },
    },
  },
});
