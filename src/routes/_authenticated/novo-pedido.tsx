import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { getCategorias, calcularTaxa, formatBRL, type CategoriaId } from "@/lib/order-helpers";
import { useGodMode } from "@/lib/dev-mode";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

const searchSchema = z.object({
  categoria: z.enum(["mercado", "farmacia", "padaria", "lojas", "retirada", "favor", "livre"]).optional(),
});

export const Route = createFileRoute("/_authenticated/novo-pedido")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Novo pedido — Pede pro Kevin" },
      { name: "description", content: "Descreva seu pedido e um vizinho entregará." },
    ],
  }),
  component: NovoPedido,
});

function NovoPedido() {
  const { categoria: initialCat } = Route.useSearch();
  const navigate = useNavigate();
  const god = useGodMode();
  const categorias = getCategorias();
  const [categoria, setCategoria] = useState<CategoriaId>(initialCat ?? "livre");
  const [descricao, setDescricao] = useState("");
  const [loja, setLoja] = useState("");
  const [enderecoLoja, setEnderecoLoja] = useState("");
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [obs, setObs] = useState("");
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(false);

  const valorNum = Number(valor.replace(",", ".")) || 0;
  const { frete, taxa, total } = calcularTaxa(valorNum);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Faça login");
      const { data, error } = await supabase
        .from("orders")
        .insert({
          cliente_id: u.user.id,
          categoria: categoria as never,
          descricao: descricao || (god ? "(teste dev)" : ""),
          loja: loja || null,
          endereco_loja: enderecoLoja || null,
          endereco_entrega: enderecoEntrega || (god ? "Endereço de teste" : ""),
          observacoes: obs || null,
          valor_produto: valorNum || (god ? 10 : 0),
          valor_frete: frete,
          taxa_servico: taxa,
          status: "aguardando_entregador",
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("payments").insert({
        order_id: data.id,
        valor: total,
        status: "depositado",
      });
      toast.success("Pedido criado! Depósito registrado.");
      navigate({ to: "/pedidos/$id", params: { id: data.id } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell hideNav>
      <header className="px-6 pt-10 pb-2 flex items-center gap-3">
        <Link to="/home" className="size-10 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold">Novo pedido</h1>
      </header>

      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Categoria
          </label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {categorias.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoria(c.id as CategoriaId)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl ring-1 text-[11px] font-medium ${
                  categoria === c.id
                    ? "bg-primary/10 ring-primary text-primary"
                    : "bg-card ring-black/5 text-muted-foreground"
                }`}
              >
                <span className="text-xl">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="O que você precisa?">
          <textarea
            required={!god}
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={500}
            placeholder="Ex: 2 pães franceses, 1 litro de leite integral e requeijão"
            className="w-full px-4 py-3 rounded-2xl bg-card ring-1 ring-black/5 text-base placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>

        <Field label="Loja / estabelecimento (opcional)">
          <input
            value={loja}
            onChange={(e) => setLoja(e.target.value)}
            maxLength={120}
            placeholder="Padaria do Zé"
            className="w-full h-12 px-4 rounded-2xl bg-card ring-1 ring-black/5 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>

        <Field label="Endereço da loja (opcional)">
          <input
            value={enderecoLoja}
            onChange={(e) => setEnderecoLoja(e.target.value)}
            maxLength={200}
            placeholder="Rua, número, bairro"
            className="w-full h-12 px-4 rounded-2xl bg-card ring-1 ring-black/5 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>

        <Field label="Endereço de entrega">
          <input
            required={!god}
            value={enderecoEntrega}
            onChange={(e) => setEnderecoEntrega(e.target.value)}
            maxLength={200}
            placeholder="Rua, número, complemento"
            className="w-full h-12 px-4 rounded-2xl bg-card ring-1 ring-black/5 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>

        <Field label="Valor estimado dos produtos (R$)">
          <input
            required={!god}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className="w-full h-12 px-4 rounded-2xl bg-card ring-1 ring-black/5 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>

        <Field label="Observações (opcional)">
          <textarea
            rows={2}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            maxLength={300}
            placeholder="Preferências, marca, troco..."
            className="w-full px-4 py-3 rounded-2xl bg-card ring-1 ring-black/5 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>

        <div className="bg-secondary rounded-2xl p-4 space-y-2 ring-1 ring-black/5">
          <Row label="Produtos" value={formatBRL(valorNum)} />
          <Row label="Frete" value={formatBRL(frete)} />
          <Row label="Taxa da plataforma" value={formatBRL(taxa)} />
          <div className="h-px bg-border my-2" />
          <Row label="Total (depósito)" value={formatBRL(total)} bold />
        </div>

        <button
          type="submit"
          disabled={loading || (!god && (!descricao || !enderecoEntrega || !valorNum))}
          className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-medium text-base shadow-lg shadow-primary/10 disabled:opacity-60"
        >
          {loading ? "Depositando..." : god ? "Publicar (dev)" : `Depositar ${formatBRL(total)} e publicar`}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          O valor fica retido pela plataforma até você confirmar a entrega.
        </p>
      </form>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}