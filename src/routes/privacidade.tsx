import { createFileRoute, Link } from "@tanstack/react-router";
import { PRIVACIDADE_VERSAO } from "@/lib/kevin/shared";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Pede pro Kevin" },
      { name: "description", content: "Como o Pede pro Kevin coleta, utiliza, protege e armazena os dados dos usuários, conforme a LGPD." },
      { property: "og:title", content: "Política de Privacidade — Pede pro Kevin" },
      { property: "og:description", content: "Transparência sobre dados coletados, finalidade, segurança e direitos do usuário (LGPD)." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacidade,
});

const SECOES: { t: string; p: string[] }[] = [
  { t: "1. Quais dados são armazenados", p: ["Dados de cadastro: nome, telefone, endereço, e-mail (quando informado) e foto de perfil (quando fornecida).", "Dados de utilização: pedidos criados, propostas informadas, histórico de entregas, mensagens trocadas dentro da plataforma e avaliações.", "Dados de candidatura a entregador: documentos enviados, dados de contato e informações de disponibilidade.", "Dados técnicos: data e horário de acesso, informações básicas do dispositivo e registros necessários para a segurança da plataforma."] },
  { t: "2. Por que esses dados são armazenados", p: ["Para identificar usuários, permitir a conexão entre clientes e entregadores, possibilitar o contato entre as partes, manter o histórico dos pedidos, prevenir fraudes, garantir a segurança da comunidade e cumprir obrigações legais.", "Nenhum dado é coletado sem finalidade legítima relacionada ao funcionamento do serviço."] },
  { t: "3. Como os dados são utilizados", p: ["Os dados são utilizados apenas dentro do aplicativo, para exibir pedidos aos entregadores, permitir a conversa entre as partes, mostrar avaliações e melhorar a experiência de uso.", "O Pede pro Kevin não processa pagamentos e, portanto, não armazena dados bancários, dados de cartão ou informações de transações financeiras.", "O Pede pro Kevin não comercializa dados pessoais dos usuários."] },
  { t: "4. Compartilhamento de dados", p: ["Alguns dados são exibidos à outra parte do pedido (nome, telefone e endereço de entrega) exatamente para viabilizar a entrega combinada.", "Fora isso, os dados só poderão ser compartilhados para cumprimento de obrigação legal, atendimento de ordem judicial ou proteção da segurança da plataforma."] },
  { t: "5. Segurança dos dados", p: ["Adotamos medidas razoáveis contra acesso não autorizado, alteração, divulgação e destruição indevidas. Apesar dos esforços, nenhum sistema é totalmente imune a riscos."] },
  { t: "6. Direitos dos usuários (LGPD)", p: ["Nos termos da Lei Geral de Proteção de Dados, o usuário pode solicitar a confirmação do tratamento, o acesso aos seus dados, a correção de dados incompletos ou desatualizados, a portabilidade, a revogação do consentimento e a exclusão dos dados pessoais quando aplicável."] },
  { t: "7. Como solicitar a exclusão da conta", p: ["A solicitação pode ser feita diretamente no aplicativo, na tela de Perfil, pela opção de exclusão de conta, ou pelos canais oficiais de atendimento.", "Após a solicitação, a conta é desativada e os dados que não precisem ser mantidos por obrigação legal são removidos. Registros exigidos por lei podem ser mantidos pelo prazo legal aplicável."] },
  { t: "8. Retenção de dados", p: ["Os dados são armazenados apenas pelo tempo necessário para a prestação dos serviços, cumprimento de obrigações legais e proteção da plataforma e dos usuários."] },
  { t: "9. Alterações desta política", p: ["Esta Política poderá ser atualizada periodicamente. Alterações relevantes serão comunicadas através da plataforma."] },
];

function Privacidade() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-screen-sm mx-auto px-6 py-10 space-y-5">
        <Link to="/home" className="text-xs text-primary font-semibold">← Voltar</Link>
        <h1 className="text-2xl font-semibold">Política de Privacidade</h1>
        <p className="text-xs text-muted-foreground">Versão {PRIVACIDADE_VERSAO}</p>
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
