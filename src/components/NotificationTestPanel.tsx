import { useState } from "react";
import { Bell, CheckCircle2, Play, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NOTIFICATION_TYPES, playNotificationSound, type NotificationType } from "@/lib/notifications";
import { toast } from "sonner";

const TESTS: Record<NotificationType, { title: string; message: string }> = {
  pedido: { title: "Novo aviso de pedido", message: "Este é um teste de notificação de pedido." },
  mensagem: { title: "Nova mensagem", message: "Este é um teste de notificação de mensagem." },
  entrega: { title: "Atualização de entrega", message: "Este é um teste de notificação de entrega." },
  avaliacao: { title: "Nova avaliação", message: "Este é um teste de notificação de avaliação." },
  candidatura: { title: "Atualização da candidatura", message: "Este é um teste de notificação de candidatura." },
  sistema: { title: "Aviso do sistema", message: "Este é um teste de notificação do sistema." },
};

export function NotificationTestPanel() {
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  async function send(type: NotificationType) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    const test = TESTS[type];
    const { error } = await supabase.from("notifications").insert({
      user_id: user.user.id,
      tipo: type,
      titulo: test.title,
      mensagem: test.message,
      dados: { teste: true, origem: "modo_deus" },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    const { data: pushResult, error: pushError } = await supabase.functions.invoke("send-push", {
      body: {
        user_id: user.user.id,
        notification: {
          title: test.title,
          body: test.message,
          tag: `teste-${type}`,
          url: "/perfil",
        },
      },
    });

    if (pushError && !String(pushError.message).includes("push_not_configured")) {
      toast.info("Aviso registrado no app; push externo ainda não está configurado.");
    } else if (pushResult?.sent) {
      toast.success(`Push enviado para ${pushResult.sent} dispositivo(s).`);
    }

    setLast(type);
  }

  async function sendAll() {
    setRunning(true);
    setLast(null);
    for (const item of NOTIFICATION_TYPES) {
      await send(item.id);
      await new Promise((resolve) => window.setTimeout(resolve, 450));
    }
    playNotificationSound(true);
    setRunning(false);
    toast.success("Bateria de testes enviada.");
  }

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bell size={19} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Laboratório de notificações</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Envia notificações reais para a sua própria conta. Com o app aberto, você deve receber o aviso visual e o som conforme suas preferências.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {NOTIFICATION_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={running}
              onClick={() => send(item.id)}
              className="min-h-11 rounded-xl bg-secondary border border-border px-3 text-left text-xs font-medium disabled:opacity-50"
            >
              <span className="block">{item.label}</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5">Testar</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={running}
          onClick={sendAll}
          className="btn-base btn-primary-solid w-full h-12 rounded-2xl mt-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Play size={16} />
          {running ? "Enviando testes..." : "Testar todas as notificações"}
        </button>

        <button
          type="button"
          onClick={() => playNotificationSound(true)}
          className="btn-base btn-soft w-full h-11 rounded-2xl mt-2 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Volume2 size={16} /> Testar somente o som
        </button>

        {last && (
          <p className="text-[11px] text-success mt-3 flex items-center gap-1.5">
            <CheckCircle2 size={13} /> Último teste enviado: {NOTIFICATION_TYPES.find((x) => x.id === last)?.label}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-warning/25 bg-warning/10 p-4">
        <p className="text-xs font-semibold">O que este teste verifica</p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          Preferência da categoria, registro no banco, entrega em tempo real, aviso dentro do app, som e notificação do navegador quando autorizada.
          A entrega com o aplicativo completamente fechado ainda depende da configuração do serviço Web Push.
        </p>
      </div>
    </div>
  );
}
