import { createFileRoute, Link } from "@tanstack/react-router";
import { PRIVACIDADE_VERSAO } from "@/lib/kevin/shared";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Pede pro Kevin" },
      { name: "description", content: "Como o Pede pro Kevin trata dados pessoais, segurança e direitos dos usuários." },
    ],
  }),
  component: Privacidade,
});

const SECOES: { t: string; p: string[] }[] = [
  { t: "1. Dados tratados", p: ["Podem ser tratados dados de cadastro e contato, como nome, telefone, e-mail e dados de perfil; dados de pedidos, propostas, mensagens, anexos e ocorrências; dados de candidatura e qualificação de colaboradores; e registros técnicos e de segurança.", "A candidatura pode exigir CPF, data de nascimento, comprovante de residência, fotografias e documentos de qualificação quando necessários à finalidade informada. Esses dados são pessoais e exigem proteção reforçada."] },
  { t: "2. Finalidades", p: ["Os dados são utilizados para criar e proteger contas, conectar clientes e colaboradores, exibir propostas, permitir contato, acompanhar pedidos, analisar denúncias, prevenir fraudes, administrar permissões, prestar suporte e cumprir obrigações legais.", "A coleta deve ser limitada ao mínimo necessário para cada finalidade. Dados não devem ser coletados apenas por conveniência ou mantidos indefinidamente sem justificativa."] },
  { t: "3. Bases legais e transparência", p: ["O tratamento poderá se apoiar, conforme o caso, em execução de contrato ou procedimentos preliminares, cumprimento de obrigação legal, exercício regular de direitos, legítimo interesse avaliado e outras bases legais aplicáveis. Consentimento será utilizado quando for a base adequada e deverá ser específico e informado.", "O aceite dos Termos e o registro de ciência desta Política não substituem a identificação da base legal correta para cada operação de tratamento."] },
  { t: "4. Compartilhamento", p: ["Dados estritamente necessários podem ser compartilhados entre cliente e colaborador vinculados ao mesmo pedido para viabilizar a execução e o contato. Documentos pessoais de candidatura não são exibidos a clientes nem a outros colaboradores.", "Prestadores de infraestrutura e tecnologia podem tratar dados sob instruções e controles apropriados. Dados também poderão ser fornecidos para cumprir obrigação legal, ordem válida ou proteger direitos e segurança, nos limites aplicáveis."] },
  { t: "5. Documentos e acesso administrativo", p: ["Documentos de identificação e residência devem ficar em armazenamento privado, com acesso restrito ao titular e a administradores autorizados. Consultas administrativas excepcionais devem ter finalidade, justificativa e registro de auditoria.", "Quando tecnicamente disponível, serão usadas permissões temporárias, URLs assinadas com curta duração, logs de acesso, controles de tipo e tamanho de arquivo e revisão periódica de permissões."] },
  { t: "6. Segurança", p: ["São esperados controles como autenticação, políticas de acesso por função, RLS no banco, armazenamento privado, proteção de segredos no servidor, logs, backups e correção de vulnerabilidades. Nenhum sistema pode prometer risco zero.", "Incidentes envolvendo dados pessoais serão avaliados e tratados conforme as obrigações legais e regulamentares aplicáveis."] },
  { t: "7. Inteligência artificial e análise de anexos", p: ["Anexos e prints poderão ser analisados por ferramentas automatizadas para auxiliar a verificar coerência com o pedido e identificar situações suspeitas ou inconclusivas. A automação é apoio, não prova definitiva nem decisão infalível.", "Quando necessário, casos serão encaminhados para revisão humana. O uso de fornecedores externos deverá considerar finalidade, segurança, retenção e compartilhamento de dados."] },
  { t: "8. Retenção e descarte", p: ["Os dados serão mantidos pelo tempo necessário às finalidades informadas, à segurança, à resolução de ocorrências e ao cumprimento de obrigações legais. Prazos e critérios devem ser definidos por categoria de dado.", "Encerrada a finalidade e inexistindo base legal para conservação, os dados deverão ser eliminados ou anonimizados de forma segura, respeitadas retenções obrigatórias e preservação legítima de provas."] },
  { t: "9. Direitos dos titulares", p: ["O titular pode solicitar confirmação de tratamento, acesso, correção, informação sobre compartilhamento, portabilidade quando aplicável, anonimização, bloqueio ou eliminação nos termos da LGPD, além de exercer os demais direitos previstos em lei.", "Solicitações serão avaliadas considerando identidade do solicitante, direitos de terceiros, obrigações legais e limites aplicáveis."] },
  { t: "10. Contato e atualizações", p: ["Solicitações de privacidade podem ser encaminhadas pelos canais oficiais de atendimento disponibilizados no aplicativo. Esta Política poderá ser atualizada; alterações relevantes serão comunicadas e poderão exigir novo aceite quando necessário."] },
];

function Privacidade() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-screen-sm mx-auto px-6 py-10 space-y-5">
        <Link to="/home" className="text-xs text-primary font-semibold">← Voltar</Link>
        <h1 className="text-2xl font-semibold">Política de Privacidade</h1>
        <p className="text-xs text-muted-foreground">Versão {PRIVACIDADE_VERSAO}</p>
        <p className="text-sm text-muted-foreground">Este documento explica como os dados pessoais são tratados. O tratamento deve respeitar a LGPD e as bases legais aplicáveis a cada finalidade.</p>
        {SECOES.map((s) => (
          <section key={s.t} className="space-y-2">
            <h2 className="text-sm font-semibold">{s.t}</h2>
            {s.p.map((p) => <p key={p} className="text-sm text-muted-foreground leading-relaxed">{p}</p>)}
          </section>
        ))}
        <Link to="/termos" className="text-sm text-primary font-semibold">Consultar Termos de Uso</Link>
      </div>
    </main>
  );
}
