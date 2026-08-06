export const KEVIN_PROTOCOL = "kevin-protocol/1";
export const APP_SLUG = "pede-pro-kevin";
export const APP_NOME = "Pede pro Kevin";
export const APP_VERSAO = "1.0.0";

export const TERMOS_VERSAO = "1.0";
export const PRIVACIDADE_VERSAO = "1.0";

export const TIPOS_DADOS = [
  { id: "usuarios", label: "Usuários" },
  { id: "pedidos", label: "Pedidos" },
  { id: "entregadores", label: "Entregadores" },
  { id: "avaliacoes", label: "Avaliações" },
  { id: "reclamacoes", label: "Reclamações" },
  { id: "configuracoes", label: "Configurações" },
  { id: "relatorios", label: "Relatórios" },
  { id: "estatisticas", label: "Estatísticas" },
  { id: "conteudo", label: "Conteúdo institucional" },
] as const;

export type TipoDado = (typeof TIPOS_DADOS)[number]["id"];
export const TIPOS_IDS = TIPOS_DADOS.map((t) => t.id) as TipoDado[];

export function labelTipo(id: string): string {
  return TIPOS_DADOS.find((t) => t.id === id)?.label ?? id;
}
