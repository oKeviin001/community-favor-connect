import { Activity, ArrowUpRight, BookOpen, Database, GitBranch, KeyRound, ShieldCheck } from "lucide-react";

type Props = { mode: "central" | "app" };

const stages = [
  { title: "Núcleo do protocolo", detail: "Contrato v2, envelopes, checksum e HMAC preparados no repositório.", state: "Código-base adicionado", icon: ShieldCheck },
  { title: "Banco persistente", detail: "Schema draft separado para pareamento, conexões, outbox, inbox e espelho.", state: "Aguardando aplicação no Supabase", icon: Database },
  { title: "Worker recuperável", detail: "Entrega com ACK, lease, retry, dead-letter e reconciliação.", state: "Aguardando backend agendado", icon: Activity },
  { title: "Aprendizado profundo", detail: "Manifesto estrutural e snapshot Git read-only por commit SHA.", state: "Contrato definido; integração pendente", icon: BookOpen },
  { title: "Transferência de módulos", detail: "Pacotes revisáveis por branch/PR, sem executar código remoto.", state: "Contrato definido; pipeline pendente", icon: GitBranch },
  { title: "Pareamento KVN", detail: "Código de uso único, scopes mínimos e segredo criptografado por app.", state: "Aguardando banco e secrets", icon: KeyRound },
];

export function SistemaKevinOverview({ mode }: Props) {
  const isCentral = mode === "central";
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Ecossistema Kevin · Protocolo v2</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {isCentral ? "Central Kevin" : "Sistema Kevin"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {isCentral
              ? "Centro de controle e espelho persistente dos aplicativos autorizados. A Central não substitui os bancos originais."
              : "Camada de integração do Pede pro Kevin. O aplicativo continua sendo a fonte autoritativa dos seus pedidos e usuários."}
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Estado da implementação</p>
              <p className="mt-1 text-xs text-muted-foreground">Preparação do núcleo compartilhado · sem dados fictícios</p>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Configuração pendente
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Esta versão contém o contrato de interoperabilidade e utilitários criptográficos. Nenhum aplicativo será apresentado como conectado até que o banco, as credenciais, o worker e o teste entre dois ambientes sejam validados.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <article key={stage.title} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary"><Icon size={19} /></div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">{stage.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{stage.detail}</p>
                    <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">{stage.state}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Próximas dependências obrigatórias</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-5 text-muted-foreground">
            <li>Aplicar e conferir o schema v2 no Supabase de cada aplicativo, sem sobrescrever as tabelas legadas.</li>
            <li>Configurar KEVIN_MASTER_KEY e credenciais privilegiadas somente nos secrets do servidor.</li>
            <li>Ativar o worker agendado e os endpoints assinados nos dois aplicativos.</li>
            <li>Executar pareamento, push, pull, ACK, duplicação, queda de conexão e recuperação em staging.</li>
          </ol>
        </section>

        {!isCentral && (
          <div className="mt-6">
            <a href="/transferencia" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold hover:bg-secondary/80">
              Abrir painel legado de transferência v1 <ArrowUpRight size={16} />
            </a>
            <p className="mt-2 text-xs text-muted-foreground">
              O protocolo v1 permanece separado para não quebrar a integração existente enquanto a versão 2 é concluída.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
