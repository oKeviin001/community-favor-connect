import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, ExternalLink, Loader2, Trash2 } from "lucide-react";

interface PrintItem {
  id: string;
  path: string;
  uploader_id: string;
  descricao: string | null;
  criado_em: string;
}

export function PrintWhatsapp({
  orderId,
  userId,
  onChange,
}: {
  orderId: string;
  userId: string;
  onChange: (hasPrint: boolean) => void;
}) {
  const [items, setItems] = useState<PrintItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("order_attachments")
      .select("id, path, uploader_id, descricao, criado_em")
      .eq("order_id", orderId)
      .eq("tipo", "whatsapp")
      .order("criado_em", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    const rows = (data as PrintItem[]) ?? [];
    setItems(rows);
    const next: Record<string, string> = {};
    await Promise.all(
      rows.map(async (item) => {
        const { data: signed } = await supabase.storage.from("comprovantes").createSignedUrl(item.path, 3600);
        if (signed?.signedUrl) next[item.id] = signed.signedUrl;
      }),
    );
    setUrls(next);
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onChange(items.some((item) => item.uploader_id === userId));
  }, [items, userId, onChange]);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem do print da conversa.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máximo de 10 MB).");
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${orderId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("comprovantes").upload(path, file, {
      contentType: file.type,
    });
    if (uploadError) {
      setBusy(false);
      toast.error(uploadError.message);
      return;
    }
    const { error } = await supabase.from("order_attachments").insert({
      order_id: orderId,
      uploader_id: userId,
      path,
      tipo: "whatsapp",
      descricao: `Print do WhatsApp — ${file.name}`.slice(0, 120),
    });
    setBusy(false);
    if (error) {
      await supabase.storage.from("comprovantes").remove([path]);
      toast.error(error.message);
      return;
    }
    toast.success("Print do WhatsApp enviado e registrado.");
    await load();
  }

  async function remover(item: PrintItem) {
    const { error } = await supabase.from("order_attachments").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from("comprovantes").remove([item.path]);
    toast.success("Print removido.");
    await load();
  }

  return (
    <section className="px-6 pt-6">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
        Registro obrigatório
      </h3>
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold">Print da conversa no WhatsApp</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Envie o print com os combinados. Sem esse registro, o pedido não pode ser concluído.
        </p>
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl bg-secondary p-2.5">
            {urls[item.id] ? (
              <img src={urls[item.id]} alt="Print da conversa no WhatsApp" className="size-14 rounded-lg object-cover" />
            ) : (
              <div className="size-14 rounded-lg bg-card" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Print registrado</p>
              <p className="text-[11px] text-muted-foreground">{new Date(item.criado_em).toLocaleString("pt-BR")}</p>
            </div>
            {urls[item.id] && (
              <a href={urls[item.id]} target="_blank" rel="noreferrer" aria-label="Abrir print" className="p-2 text-muted-foreground">
                <ExternalLink size={16} />
              </a>
            )}
            {item.uploader_id === userId && (
              <button type="button" onClick={() => void remover(item)} aria-label="Remover print" className="p-2 text-muted-foreground">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        <label className={`w-full h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center gap-2 text-sm font-medium ${busy ? "opacity-60" : "cursor-pointer"}`}>
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
          {busy ? "Enviando print..." : items.length ? "Enviar outro print" : "Enviar print do WhatsApp"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </label>
      </div>
    </section>
  );
}
