import { useEffect, useState } from "react";
import { Bell, Send, ShieldCheck, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadNotificationControl, playNotificationSound, setNotificationControl, type NotificationControl } from "@/lib/notifications";
import { toast } from "sonner";

type Target = "clientes" | "entregadores" | "todos";

export function GodModeNotificationControls() {
  const [control, setControl] = useState<NotificationControl | null>(null);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<Target>("entregadores");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void loadNotificationControl()
      .then(setControl)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Não foi possível carregar o controle de notificações."));
  }, []);

  async function toggle(key: keyof NotificationControl) {
    if (!control) return;
    const next = { ...control, [key]: !control[key] };
    setControl(next);
    setSaving(true);
    try {
      setControl(await setNotificationControl(next));
      toast.success("Controle atualizado.");
    } catch (error) {
      setControl(control);
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function sendFree() {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    if (!cleanTitle || !cleanMessage) {
      toast.error("Informe um título e uma mensagem.");
      return;
    }
    setSending(true);
    try {
      let query = supabase.from("profiles").select("id,tipo");
      if (target === "clientes") query = query.eq("tipo", "cliente");
      if (target === "entregadores") query = query.in("tipo", ["entregador", "ambos"]);

      const { data: recipients, error } = await query;
      if (error) throw error;
      const ids = (recipients ?? []).map((row) => row.id);
      if (!ids.length) {
        toast.info("Nenhum destinatário encontrado.");
        return;
      }

      const { error: insertError } = await supabase.from("notifications").insert(
        ids.map((userId) => ({
          user_id: userId,
          tipo: "sistema",
          titulo: cleanTitle,
          mensagem: cleanMessage,
          dados: { origem: "modo_deus", livre: true, publico: target },
        })),
      );
      if (insertError) throw insertError;

      const pushResults = await Promise.allSettled(
        ids.map((userId) =>
          supabase.functions.invoke("send-push", {
            body: {
              user_id: userId,
              notification: { title: cleanTitle, body: cleanMessage, tag: "livre", url: "/perfil" },
            },
          }),
        ),
      );
      const pushed = pushResults.reduce((sum, item) => {
        if (item.status !== "fulfilled") return sum;
        return sum + Number(item.value.data?.sent ?? 0);
      }, 0);

      toast.success(`Aviso enviado para ${ids.length} usuário(s).${pushed ? ` Push: ${pushed} dispositivo(s).` : ""}`);
      setTitle("");
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  }

  const categories: { key: keyof NotificationControl; label: string }[] = [
    { key: "pedidos", label: "Pedidos" },
    { key: "mensagens", label: "Mensagens" },
    { key: "entregas", label: "Entregas" },
    { key: "avaliacoes", label: "Avaliações" },
    { key: "candidatura", label: "Candidatura" },
    { key: "pagamentos", label: "Pagamentos" },
    { key: "disputas", label: "Disputas" },
    { key: "seguranca", label: "Segurança" },
    { key: "sistema", label: "Sistema" },
    { key: "som", label: "Som" },
  ];

  return (
    <div className="space-y-3">
      <section className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={19} className="text-primary mt-1" />
          <div>
            <p className="font-semibold text-sm">Controle global</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Somente o Modo Deus pode habilitar ou desabilitar categorias e o som para toda a plataforma.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {control ? categories.map(({ key, label }) => (
            <button key={key} type="button" disabled={saving} onClick={() => toggle(key)}
              className="min-h-11 rounded-xl border border-border bg-secondary px-3 flex items-center justify-between text-xs font-medium disabled:opacity-60">
              <span>{label}</span>
              <span className={`relative w-10 h-6 rounded-full ${control[key] ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-1 size-4 rounded-full bg-white shadow-sm ${control[key] ? "translate-x-5" : "translate-x-1"}`} />
              </span>
            </button>
          )) : <p className="text-xs text-muted-foreground">Carregando...</p>}
        </div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Volume2 size={19} className="text-primary mt-1" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Teste de som</p>
            <p className="text-xs text-muted-foreground mt-1">Testa o som diretamente neste dispositivo, sem depender de uma notificação.</p>
          </div>
        </div>
        <button type="button" onClick={() => playNotificationSound(true)}
          className="btn-base btn-soft w-full h-11 rounded-2xl mt-3 text-sm font-semibold flex items-center justify-center gap-2">
          <Volume2 size={16} /> Testar som agora
        </button>
      </section>

      <section className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Send size={19} className="text-primary mt-1" />
          <div>
            <p className="font-semibold text-sm">Notificação livre</p>
            <p className="text-xs text-muted-foreground mt-1">Envie um aviso manual para clientes, entregadores ou todos.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {([
            ["clientes", "Clientes"],
            ["entregadores", "Entregadores"],
            ["todos", "Todos"],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setTarget(value)}
              className={`h-10 rounded-xl border text-xs font-semibold ${target === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>
              {label}
            </button>
          ))}
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Título"
          className="mt-3 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={4} placeholder="Mensagem..."
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary resize-none" />

        <button type="button" disabled={sending} onClick={sendFree}
          className="btn-base btn-primary-solid w-full h-12 rounded-2xl mt-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          <Bell size={16} /> {sending ? "Enviando..." : `Enviar para ${target}`}
        </button>
        <p className="text-[11px] text-muted-foreground mt-3">O aviso fica registrado no sistema e o push é tentado nos dispositivos cadastrados. Evite dados sensíveis.</p>
      </section>
    </div>
  );
}
