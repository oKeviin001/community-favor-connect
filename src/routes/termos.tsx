import { createFileRoute, Link } from "@tanstack/react-router";
import { TERMOS_VERSAO } from "@/lib/kevin/shared";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Pede pro Kevin" },
      { name: "description", content: "Plataforma de conexão entre clientes e entregadores independentes: o app não processa pagamentos e os valores são apenas propostas." },
      { property: "og:title", content: "Termos de Uso — Pede pro Kevin" },
      { property: "og:description", content: "O Pede pro Kevin conecta pessoas; valores e forma de pagamento são combinados entre cliente e entregador." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Termos,
});

const SECOES: { t: string; p: string[] }[] = [
  { t: "1. Sobre a plataforma", p: ["O Pede pro Kevin é uma plataforma de conexão entre clientes e entregadores independentes. O objetivo é conectar pessoas que precisam de ajuda com pessoas dispostas a realizar favores, compras e entregas.", "O aplicativo não vende produtos próprios e não é um marketplace com pagamento integrado: atua exclusivamente como ponto de encontro entre as partes."] },
  { t: "2. O aplicativo não processa pagamentos", p: ["O Pede pro Kevin não realiza pagamentos.", "O Pede pro Kevin não recebe depósitos.", "O Pede pro Kevin não retém valores.", "O Pede pro Kevin não processa transações financeiras.", "Não existe saldo interno, carteira digital ou repasse de valores dentro do aplicativo."] },
  { t: "3. Propostas e valores", p: ["Os valores informados pelos usuários representam apenas propostas iniciais.", "O valor final da entrega poderá ser negociado livremente entre cliente e entregador.", "A forma de pagamento será definida entre as partes.", "O Pede pro Kevin não participa da negociação financeira realizada entre cliente e entregador."] },
  { t: "4. Cadastro", p: ["O usuário deve fornecer informações verdadeiras e atualizadas, manter seus dados corretos, manter seu acesso seguro, não compartilhar senhas e não utilizar dados falsos.", "O fornecimento de informações falsas poderá resultar na suspensão ou exclusão da conta."] },
  { t: "5. Responsabilidade dos clientes", p: ["Informar corretamente o endereço, os itens desejados e a proposta pela entrega, tratar entregadores com respeito, não solicitar atividades ilegais e não utilizar a plataforma para fraudes.", "O cliente é responsável pelas informações fornecidas e pelos acordos realizados através da plataforma."] },
  { t: "6. Responsabilidade dos entregadores", p: ["Realizar os serviços aceitos de boa-fé, tratar clientes com respeito, manter comunicação adequada, cumprir o que foi combinado e informar eventuais problemas durante a execução.", "A plataforma poderá remover entregadores com comportamento inadequado, fraudulento ou incompatível com a comunidade."] },
  { t: "7. Serviços proibidos", p: ["É proibido utilizar a plataforma para atividades ilegais, transporte de itens proibidos por lei, fraudes, golpes, ameaças, assédio, conteúdo ofensivo ou compra de produtos ilícitos. Qualquer violação poderá resultar em bloqueio imediato da conta."] },
  { t: "8. Disponibilidade do serviço", p: ["Podem ocorrer manutenções, atualizações, falhas técnicas e interrupções temporárias. Não é garantida disponibilidade ininterrupta do sistema."] },
  { t: "9. Cancelamentos", p: ["Pedidos poderão ser cancelados a qualquer momento antes da conclusão, conforme o combinado entre as partes. Como não há retenção de valores pela plataforma, eventuais acertos são tratados diretamente entre cliente e entregador."] },
  { t: "10. Suspensão ou encerramento de contas", p: ["Contas poderão ser suspensas ou encerradas em casos de fraude, uso indevido do sistema, violação destes Termos ou conduta prejudicial à comunidade."] },
  { t: "11. Limitação de responsabilidade", p: ["A plataforma não se responsabiliza por acordos firmados entre usuários, informações incorretas fornecidas pelos usuários, problemas causados por terceiros, produtos indisponíveis em estabelecimentos e atrasos decorrentes de trânsito, clima ou situações imprevisíveis.", "Cada usuário é responsável pelas informações fornecidas e pelos acordos realizados através da plataforma."] },
  { t: "12. Alterações dos termos", p: ["Estes Termos poderão ser alterados periodicamente. Alterações relevantes serão informadas através da plataforma."] },
  { t: "13. Contato", p: ["Dúvidas, sugestões ou solicitações poderão ser encaminhadas pelos canais oficiais de atendimento disponibilizados pela plataforma."] },
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
