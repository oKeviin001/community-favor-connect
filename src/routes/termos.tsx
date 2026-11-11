import { createFileRoute, Link } from "@tanstack/react-router";
import { TERMOS_VERSAO } from "@/lib/kevin/shared";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Pede pro Kevin" },
      { name: "description", content: "Regras de uso da plataforma de conexão Pede pro Kevin." },
    ],
  }),
  component: Termos,
});

const SECOES: { t: string; p: string[] }[] = [
  { t: "1. Natureza da plataforma", p: ["O Pede pro Kevin é uma plataforma digital que conecta pessoas que precisam de serviços a colaboradores independentes com habilidades e disponibilidade. A plataforma organiza pedidos, propostas, comunicação e acompanhamento; não é, por si só, a prestadora direta dos serviços anunciados.", "As partes devem avaliar a proposta, combinar escopo, prazo, preço e condições antes de contratar. O colaborador não é empregado da plataforma apenas por utilizar suas ferramentas. A caracterização jurídica de cada relação depende dos fatos e da legislação aplicável."] },
  { t: "2. Negociação e pagamentos", p: ["Cliente e colaborador negociam e contratam diretamente. O pagamento é realizado diretamente pelo cliente ao colaborador, que recebe 100% do valor combinado pelo serviço.", "A plataforma não recebe, retém, custodia ou repassa o dinheiro dos serviços e não oferece carteira, saldo, escrow ou processamento de pagamento. Comprovantes anexados ao pedido servem para registro e análise, não significam que a plataforma recebeu ou movimentou valores.", "A plataforma não garante que o cliente pagará, que o colaborador executará o serviço, nem que haverá contratação ou renda. Isso não afasta responsabilidades legais próprias da plataforma."] },
  { t: "3. Ocorrências e desacordos", p: ["Se o cliente não pagar, o colaborador poderá registrar ocorrência. A plataforma poderá solicitar evidências, ouvir o cliente e, após análise, aplicar restrições proporcionais, inclusive impedir temporariamente novos pedidos. A dívida não é automaticamente transferida à plataforma.", "Se o colaborador receber diretamente e não executar o serviço, o cliente poderá registrar ocorrência. O colaborador poderá apresentar sua versão. Pode haver suspensão preventiva fundamentada e, se a irregularidade for confirmada, bloqueio ou remoção. A plataforma não promete devolução automática de valor pago diretamente ao colaborador.", "Denúncias serão avaliadas considerando contexto e evidências. Uma denúncia unilateral não determina, por si só, culpa definitiva ou banimento permanente. A plataforma poderá preservar registros e colaborar com autoridades quando legalmente cabível."] },
  { t: "4. Cadastro e qualificação", p: ["Os usuários devem fornecer informações verdadeiras e manter seus dados atualizados. Colaboradores podem passar por verificação de identidade, entrevista e análise de documentos, ferramentas, transporte e especialidades.", "A aprovação pode ser específica por categoria. A aprovação em uma especialidade não autoriza automaticamente atuação em todas as demais. Falsidade, fraude ou risco relevante podem resultar em restrições após análise adequada."] },
  { t: "5. Propostas e contratação", p: ["Valores e mensagens apresentados em propostas são condições oferecidas pelo colaborador. O preço pode ser fixo ou 'A combinar'. O cliente e o colaborador devem confirmar diretamente o escopo e as condições finais.", "A seleção de uma proposta vincula o pedido ao colaborador escolhido. As demais propostas podem deixar de aparecer como disponíveis, mas registros necessários ao histórico e à segurança poderão ser preservados."] },
  { t: "6. Comprovantes e conversas", p: ["A plataforma poderá solicitar comprovantes, imagens e registros de conversas relacionados ao pedido para auxiliar na análise de ocorrências e na confirmação das etapas.", "Ferramentas automatizadas ou inteligência artificial poderão auxiliar a classificar registros como consistentes, suspeitos ou inconclusivos. A análise automatizada não é prova absoluta de execução e casos duvidosos poderão ser revisados por uma pessoa."] },
  { t: "7. Responsabilidades dos usuários", p: ["Clientes devem informar corretamente o pedido, endereço, escopo e condições, pagar diretamente o valor combinado e tratar colaboradores com respeito.", "Colaboradores devem informar suas qualificações de forma verdadeira, negociar claramente, executar o que aceitaram ou comunicar impedimentos, respeitar clientes e manter evidências pertinentes.", "É proibido usar a plataforma para fraude, ameaça, assédio, discriminação, atividades ilícitas ou transporte de itens proibidos."] },
  { t: "8. Responsabilidade da plataforma", p: ["A plataforma deve tratar falhas próprias do serviço digital, como indisponibilidade, acesso contratado que não seja liberado, falhas de funcionalidades sob seu controle e incidentes de segurança, conforme as obrigações legais aplicáveis.", "A plataforma não assume automaticamente dívidas ou prejuízos decorrentes exclusivamente de acordos entre usuários ou pagamentos realizados diretamente entre eles. Nenhuma disposição destes Termos elimina direitos indisponíveis ou responsabilidades que a lei atribua à plataforma."] },
  { t: "9. Fase piloto e eventual mensalidade", p: ["A fase inicial de testes será gratuita. Uma possível fase comercial poderá prever primeiro mês gratuito e mensalidade estimada de R$ 10 por colaborador, sujeita a revisão e comunicação antes de entrar em vigor.", "Qualquer mensalidade remunerará acesso, ferramentas e oportunidades de conexão. Não garante quantidade de pedidos, contratação, faturamento ou renda. Regras de cobrança e cancelamento deverão ser informadas antes da contratação."] },
  { t: "10. Segurança, suspensão e recurso", p: ["A plataforma poderá solicitar informações, preservar registros e aplicar medidas proporcionais para proteger usuários e o serviço. Sempre que apropriado, a pessoa afetada poderá conhecer o motivo e apresentar sua versão.", "Medidas preventivas podem ser adotadas diante de risco relevante, com revisão posterior. A plataforma poderá suspender ou encerrar contas em casos de fraude, violação destes Termos ou risco à comunidade."] },
  { t: "11. Disponibilidade e alterações", p: ["Podem ocorrer manutenção, atualização, falhas e interrupções temporárias. A plataforma buscará corrigir problemas sob seu controle, sem prometer disponibilidade ininterrupta.", "Estes Termos podem ser atualizados. Alterações relevantes serão comunicadas e poderão exigir novo aceite antes da continuidade de funcionalidades afetadas."] },
  { t: "12. Contato e direitos legais", p: ["Dúvidas, reclamações e solicitações podem ser encaminhadas pelos canais de atendimento disponibilizados no aplicativo. Estes Termos devem ser interpretados conforme a legislação brasileira, preservados os direitos dos usuários."] },
];

function Termos() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-screen-sm mx-auto px-6 py-10 space-y-5">
        <Link to="/home" className="text-xs text-primary font-semibold">← Voltar</Link>
        <h1 className="text-2xl font-semibold">Termos de Uso</h1>
        <p className="text-xs text-muted-foreground">Versão {TERMOS_VERSAO}</p>
        <p className="text-sm text-muted-foreground">Leia este documento antes de aceitar. O aceite registra sua concordância, mas não elimina direitos ou obrigações previstos em lei.</p>
        {SECOES.map((s) => (
          <section key={s.t} className="space-y-2">
            <h2 className="text-sm font-semibold">{s.t}</h2>
            {s.p.map((p) => <p key={p} className="text-sm text-muted-foreground leading-relaxed">{p}</p>)}
          </section>
        ))}
        <Link to="/privacidade" className="text-sm text-primary font-semibold">Consultar Política de Privacidade</Link>
      </div>
    </main>
  );
}
