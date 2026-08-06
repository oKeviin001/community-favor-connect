import { createFileRoute, Link } from "@tanstack/react-router";
import { TERMOS_VERSAO } from "@/lib/kevin/shared";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Pede pro Kevin" },
      { name: "description", content: "Termos de Uso da plataforma comunitária Pede pro Kevin: cadastro, responsabilidades, serviços proibidos e limitações." },
      { property: "og:title", content: "Termos de Uso — Pede pro Kevin" },
      { property: "og:description", content: "Regras de uso da plataforma de entregas e favores locais Pede pro Kevin." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Termos,
});

const SECOES: { t: string; p: string[] }[] = [
  { t: "1. Sobre a plataforma", p: ["O Pede pro Kevin é uma plataforma de conexão entre pessoas. Clientes podem solicitar compras em mercados, farmácias e lojas, retirada de encomendas, entrega de objetos, pequenos favores locais e outros serviços permitidos pela legislação brasileira.", "O aplicativo não vende produtos próprios: atua como intermediador entre clientes e entregadores."] },
  { t: "2. Cadastro", p: ["O usuário deve fornecer informações verdadeiras e atualizadas, manter seus dados corretos, manter seu acesso seguro, não compartilhar senhas e não utilizar dados falsos.", "O fornecimento de informações falsas poderá resultar na suspensão ou exclusão da conta."] },
  { t: "3. Responsabilidade dos clientes", p: ["Informar corretamente o endereço e os itens desejados, tratar entregadores com respeito, não solicitar atividades ilegais e não utilizar a plataforma para fraudes.", "O cliente é responsável pelas informações fornecidas durante a criação do pedido."] },
  { t: "4. Responsabilidade dos entregadores", p: ["Realizar os serviços aceitos de boa-fé, tratar clientes com respeito, manter comunicação adequada, cumprir os pedidos aceitos e informar eventuais problemas durante a execução.", "A plataforma poderá remover entregadores com comportamento inadequado, fraudulento ou incompatível com a comunidade."] },
  { t: "5. Serviços proibidos", p: ["É proibido utilizar a plataforma para atividades ilegais, transporte de itens proibidos por lei, fraudes, golpes, ameaças, assédio, conteúdo ofensivo ou compra de produtos ilícitos. Qualquer violação poderá resultar em bloqueio imediato da conta."] },
  { t: "6. Disponibilidade do serviço", p: ["Podem ocorrer manutenções, atualizações, falhas técnicas e interrupções temporárias. Não é garantida disponibilidade ininterrupta do sistema."] },
  { t: "7. Cancelamentos", p: ["Pedidos poderão ser cancelados conforme as regras vigentes da plataforma. Cada situação poderá ser analisada individualmente quando necessário."] },
  { t: "8. Suspensão ou encerramento de contas", p: ["Contas poderão ser suspensas ou encerradas em casos de fraude, uso indevido do sistema, violação destes Termos ou conduta prejudicial à comunidade."] },
  { t: "9. Limitação de responsabilidade", p: ["A plataforma não se responsabiliza por informações incorretas fornecidas pelos usuários, problemas causados por terceiros, produtos indisponíveis em estabelecimentos e atrasos decorrentes de trânsito, clima ou situações imprevisíveis. Cada caso poderá ser analisado individualmente pela administração."] },
  { t: "10. Alterações dos termos", p: ["Estes Termos poderão ser alterados periodicamente. Alterações relevantes serão informadas através da plataforma."] },
  { t: "11. Contato", p: ["Dúvidas, sugestões ou solicitações poderão ser encaminhadas pelos canais oficiais de atendimento disponibilizados pela plataforma."] },
];

function Termos() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-screen-sm mx-auto px-6 py-10 space-y-5">
        <Link to="/home" className="text-xs text-primary font-semibold">← Voltar</Link>
        <h1 className="text-2xl font-semibold">Termos de Uso</h1>
        <p className="text-xs text-muted-foreground">Versão {TERMOS_VERSAO}</p>
        <p className="text-sm text-muted-foreground">
          Ao criar uma conta ou utilizar qualquer funcionalidade da plataforma, o usuário declara ter lido, compreendido
          e concordado integralmente com estes Termos de Uso.
        </p>
        {SECOES.map((s) => (
          <section key={s.t} className="space-y-2">
            <h2 className="text-sm font-semibold">{s.t}</h2>
            {s.p.map((p) => (
              <p key={p} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
