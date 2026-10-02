import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, ShieldCheck, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/configuracoes/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Pede pro Kevin" },
      { name: "description", content: "Informações sobre as notificações do Pede pro Kevin." },
    ],
  }),
  component: Notificacoes,
});

function Notificacoes() {
  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <Link to="/perfil" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft size={16} /> Voltar para o perfil
        </Link>
        <p className="label-kicker mt-6">Configurações</p>
        <h1 className="text-[26px] font-semibold leading-tight mt-1">Notificações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Os tipos de aviso são administrados pelo Modo Deus para manter o funcionamento da plataforma sob controle.
        </p>
      </header>

      <div className="px-6 space-y-4 pb-8">
        <section className="surface p-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck size={19} />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Controle centralizado</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Você não precisa configurar cada categoria aqui. O Modo Deus define quais tipos de notificação estão ativos e se o som do sistema está liberado.
              </p>
            </div>
          </div>
        </section>

        <section className="surface p-5">
          <div className="flex items-start gap-3">
            <Smartphone size={19} className="text-muted-foreground mt-0.5" />
            <div>
              <h2 className="font-semibold text-sm">Permissão deste celular</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                A autorização para o celular ou navegador mostrar notificações continua sendo uma permissão do próprio dispositivo. Ela não altera o controle global do Modo Deus.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-4">
            Se as notificações não aparecerem, verifique as permissões de notificações do navegador ou do aplicativo nas configurações do celular.
          </p>
        </section>

        <section className="surface p-5">
          <div className="flex items-start gap-3">
            <Bell size={19} className="text-muted-foreground mt-0.5" />
            <div>
              <h2 className="font-semibold text-sm">Testes</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Os testes de cada tipo, o teste de todos os avisos, o teste do som e o envio de uma mensagem livre ficam disponíveis exclusivamente no Modo Deus.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
