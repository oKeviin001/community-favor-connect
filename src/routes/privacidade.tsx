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
  { t: "1. Dados coletados", p: ["Dados de cadastro: nome, telefone, endereço, e-mail e foto de perfil (quando fornecida).", "Dados de utilização: pedidos realizados, histórico de entregas, mensagens trocadas dentro da plataforma e avaliações.", "Dados técnicos: data e horário de acesso, informações básicas do dispositivo e registros necessários para a segurança da plataforma."] },
  { t: "2. Finalidade da coleta", p: ["Permitir o funcionamento do aplicativo, identificar usuários, conectar clientes e entregadores, melhorar a experiência, garantir a segurança da plataforma e cumprir obrigações legais.", "Os dados nunca serão coletados sem finalidade legítima relacionada ao funcionamento do serviço."] },
  { t: "3. Compartilhamento de dados", p: ["Os dados poderão ser compartilhados apenas para execução do serviço, cumprimento de obrigação legal, atendimento de ordem judicial ou proteção da segurança da plataforma.", "O Pede pro Kevin não comercializa dados pessoais dos usuários."] },
  { t: "4. Segurança dos dados", p: ["Adotamos medidas razoáveis contra acesso não autorizado, alteração, divulgação e destruição indevidas. Apesar dos esforços, nenhum sistema é totalmente imune a riscos."] },
  { t: "5. Direitos dos usuários", p: ["Nos termos da LGPD, o usuário pode solicitar acesso, correção, atualização dos seus dados, exclusão da conta e exclusão dos dados pessoais quando aplicável."] },
  { t: "6. Exclusão de conta", p: ["O usuário pode solicitar a exclusão a qualquer momento. Após a solicitação, a conta é desativada e os dados que não precisem ser mantidos por obrigação legal poderão ser removidos; registros exigidos por lei podem ser mantidos pelo prazo legal aplicável."] },
  { t: "7. Retenção de dados", p: ["Os dados são armazenados apenas pelo tempo necessário para a prestação dos serviços, cumprimento de obrigações legais e proteção da plataforma e dos usuários."] },
  { t: "8. Alterações desta política", p: ["Esta Política poderá ser atualizada periodicamente. Alterações relevantes serão comunicadas através da plataforma."] },
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
