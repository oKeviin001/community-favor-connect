import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Paperclip, Trash2, FileText } from "lucide-react";

interface Attachment {
  id: string;
  path: string;
  tipo: string;
  descricao: string | null;
  uploader_id: string;
  criado_em: string;
}

export function Comprovantes({
  orderId,
  userId,
  canUpload,
}: {
  orderId: string;
  userId: string | null;
  canUpload: boolean;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("order_attachments")
      .select("id, path, tipo, descricao, uploader_id, criado_em")
      .eq("order_id", orderId)
      .order("criado_em");
    const rows = (data as Attachment[]) ?? [];
    setItems(rows);
    const next: Record<string, string> = {};
    await Promise.all(
      rows.map(async (r) => {
        const { data: signed } = await supabase.storage
          .from("comprovantes")
          .createSignedUrl(r.path, 3600);
        if (signed?.signedUrl) next[r.id] = signed.signedUrl;
      }),
    );
    setUrls(next);
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(file: File) {
    if (!userId) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Arquivo muito grande (máx. 10MB)");
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${userId}/${orderId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("comprovantes").upload(path, file);
    if (upErr) {
      setBusy(false);
      return toast.error(upErr.message);
    }
    const { error } = await supabase.from("order_attachments").insert({
      order_id: orderId,
      uploader_id: userId,
      path,
      tipo: file.type.startsWith("image/") ? "foto" : "comprovante",
      descricao: file.name.slice(0, 120),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Comprovante enviado");
    load();
  }

  async function remover(a: Attachment) {
    const { error } = await supabase.from("order_attachments").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    await supabase.storage.from("comprovantes").remove([a.path]);
    load();
  }

  return (
    <section className="px-6 pt-6">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
        Comprovantes
      </h3>
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Nenhum comprovante anexado ainda.
          </p>
        )}
        {items.map((a) => (
          <div key={a.id} className="flex items-center gap-3">
            {a.tipo === "foto" && urls[a.id] ? (
              <img
                src={urls[a.id]}
                alt={a.descricao ?? "Comprovante"}
                loading="lazy"
                className="size-12 rounded-xl object-cover bg-secondary"
              />
            ) : (
              <div className="size-12 rounded-xl bg-secondary flex items-center justify-center">
                <FileText size={18} className="text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <a
                href={urls[a.id] ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium truncate block"
              >
                {a.descricao ?? "Arquivo"}
              </a>
              <p className="text-[11px] text-muted-foreground">
                {new Date(a.criado_em).toLocaleString("pt-BR")}
              </p>
            </div>
            {a.uploader_id === userId && (
              <button onClick={() => remover(a)} className="text-muted-foreground p-2" aria-label="Remover">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}

        {canUpload && (
          <label className="mt-2 w-full h-12 rounded-2xl bg-secondary flex items-center justify-center gap-2 text-sm font-medium cursor-pointer">
            <Paperclip size={16} />
            {busy ? "Enviando..." : "Anexar foto ou comprovante"}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) upload(f);
              }}
            />
          </label>
        )}
      </div>
    </section>
  );
}