import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAppConfig } from "@/lib/app-config";
import { Field, PageHeader, SectionTitle } from "@/components/kit";
import {
  CATEGORIAS_PRINCIPAIS,
  PROPOSTA_AVISO,
  corClasses,
  formatBRL,
  getCategorias,
  type CategoriaId,
} from "@/lib/order-helpers";
import { useGodMode } from "@/lib/dev-mode";
import { toast } from "sonner";
import { Check, Info, MapPin, Navigation, ShoppingBag, Wallet } from "lucide-react";

const searchSchema = z.object({
  categoria: z.enum(["mercado", "farmacia", "padaria", "lojas", "retirada", "favor", "livre"]).optional(),
});

export const Route = createFileRoute("/_authenticated/novo-pedido")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Novo pedido — Pede pro Kevin" },
      { name: "description", content: "Descreva o que você precisa e informe quanto pretende pagar pela entrega." },
      { property: "og:title", content: "Novo pedido — Pede pro Kevin" },
      { property: "og:description", content: "Descreva o que você precisa e informe quanto pretende pagar pela entrega." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NovoPedido,
});

function NovoPedido() {
  const { categoria: initialCat } = Route.useSearch();
  const navigate = useNavigate();
  const god = useGodMode();
  const categorias = getCategorias();
  const cards = useMemo(
    () => CATEGORIAS_PRINCIPAIS.map((id) => categorias.find((c) => c.id === id)!).filter(Boolean),
    [categorias],
  );

  const [categoria, setCategoria] = useState<CategoriaId | null>(initialCat ?? null);
  const [descricao, setDescricao] = useState("");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [bairro, setBairro] = useState("");
  const [referencia, setReferencia] = useState("");
  const [obs, setObs] = useState("");
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(false);
  const { config } = useAppConfig("clientes");
  const pedidosPausados = config.pausarPedidos === true;

  const valorNum = Number(valor.replace(",", ".")) || 0;
  const catSel = categorias.find((c) => c.id === categoria);

  const podeEnviar = !pedidosPausados && (god || Boolean(categoria && descricao.trim() && destino.trim() && valorNum > 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Faça login para continuar.");
      const { data, error } = await supabase
        .from("orders")
        .insert({
          cliente_id: u.user.id,
          categoria: (categoria ?? "livre") as never,
          descricao: descricao.trim() || (god ? "(teste dev)" : ""),
          loja: origem.trim() || null,
          endereco_loja: origem.trim() || null,
          endereco_entrega: destino.trim() || (god ? "Endereço de teste" : ""),
          bairro: bairro.trim() || null,
          referencia: referencia.trim() || null,
          observacoes: obs.trim() || null,
          valor_produto: 0,
          valor_frete: valorNum,
          taxa_servico: 0,
          valor_estimado_min: valorNum,
          valor_estimado_max: valorNum,
          status: "aguardando_entregador",
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Pedido solicitado! Já está visível para os entregadores.");
      navigate({ to: "/pedidos/$id", params: { id: data.id } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell hideNav>
      {pedidosPausados && (
        <div className="px-6 pt-6">
          <div className="rounded-2xl border border-warning/25 bg-warning/10 p-4 text-sm leading-relaxed">
            Novos pedidos estão temporariamente pausados pela administração. Tente novamente mais tarde.
          </div>
        </div>
      )}
      <PageHeader
        backTo="/home"
        kicker="Novo pedido"
        title="O que você precisa hoje?"
        subtitle="Escolha o tipo de serviço e faça seu pedido."
      />

      <form onSubmit={handleSubmit} className="px-6 pb-10 space-y-8">
        {/* 1 — Tipo de serviço */}
        <section className="fade-rise">
          <SectionTitle index={1}>Escolha o tipo de serviço</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {cards.map((c) => {
              const ativo = categoria === c.id;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategoria(c.id as CategoriaId)}
                  className={`text-left p-4 rounded-2xl border transition-all motion-interactive ${
                    ativo
                      ? "border-primary bg-primary/5 shadow-soft"
                      : "border-border bg-card hover:bg-secondary/60"
                  }`}
                >
                  <div
                    className={`size-11 rounded-2xl flex items-center justify-center text-xl mb-3 border ${corClasses(c.color)}`}
                  >
                    {c.emoji}
                  </div>
                  <p className={`text-sm font-semibold ${ativo ? "text-primary" : ""}`}>{c.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-1">{c.descricao}</p>
                  {ativo && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary mt-2">
                      <Check size={12} strokeWidth={3} /> Selecionado
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2 — Descrição */}
        <section className="fade-rise">
          <SectionTitle index={2}>Descrição do pedido</SectionTitle>
          <div className="surface p-4">
            <Field label="O que você precisa?" required>
              <textarea
                rows={5}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={500}
                placeholder="Ex: 2 pacotes de arroz, 1 óleo, 1 refrigerante..."
                className="field-textarea"
              />
            </Field>
            <p className="text-[11px] text-muted-foreground text-right mt-1.5">{descricao.length}/500</p>
          </div>
        </section>

        {/* 3 — Localização */}
        <section className="fade-rise">
          <SectionTitle index={3}>Localização</SectionTitle>
          <div className="surface p-4 space-y-4 motion-fade-in">
            <Field label="Origem (onde buscar)" hint="Loja, mercado, farmácia ou endereço de retirada.">
              <div className="relative">
                <ShoppingBag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value)}
                  maxLength={200}
                  placeholder="Padaria do Zé — Rua das Flores, 12"
                  className="field-input pl-11"
                />
              </div>
            </Field>
            <Field label="Destino (endereço de entrega)" required>
              <div className="relative">
                <Navigation size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  maxLength={200}
                  placeholder="Rua, número e complemento"
                  className="field-input pl-11"
                />
              </div>
            </Field>
            <Field label="Bairro / região">
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  maxLength={80}
                  placeholder="Centro"
                  className="field-input pl-11"
                />
              </div>
            </Field>
            <Field label="Referências">
              <input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                maxLength={160}
                placeholder="Portão azul, ao lado da praça"
                className="field-input"
              />
            </Field>
            <Field label="Observações">
              <textarea
                rows={3}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                maxLength={300}
                placeholder="Marca preferida, troco, horário..."
                className="field-textarea"
              />
            </Field>
          </div>
        </section>

        {/* 4 — Sua proposta */}
        <section className="fade-rise">
          <SectionTitle index={4}>Quanto você pretende pagar pela entrega?</SectionTitle>
          <div className="surface p-4 space-y-4">
            <Field label="Sua proposta pela entrega" required>
              <div className="relative">
                <Wallet size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="field-input pl-11"
                />
              </div>
            </Field>

            <div className="rounded-2xl bg-secondary border border-border p-4 motion-fade-in">
              <p className="label-kicker">Você oferece</p>
              <p className="text-2xl font-semibold text-primary mt-1.5">
                {valorNum > 0 ? formatBRL(valorNum) : "R$ --,--"}
              </p>
            </div>

            <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <Info size={13} className="shrink-0 mt-px" />
              {PROPOSTA_AVISO}
            </p>
          </div>
        </section>

        {/* 5 — Resumo */}
        <section className="fade-rise">
          <SectionTitle index={5}>Resumo</SectionTitle>
          <div className="surface p-4 space-y-3 motion-fade-in">
            <ResumoLinha label="Tipo de serviço" value={catSel?.label ?? "Não selecionado"} />
            <ResumoLinha label="Origem" value={origem || "Não informada"} />
            <ResumoLinha label="Destino" value={destino || "Não informado"} />
            <ResumoLinha label="Região" value={bairro || "Não informada"} />
            <ResumoLinha label="Sua proposta" value={valorNum > 0 ? formatBRL(valorNum) : "A combinar"} />
            <ResumoLinha label="Observações" value={obs || "Nenhuma"} />
          </div>
        </section>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading || !podeEnviar}
            className="btn-base btn-base-active btn-primary-solid w-full h-14"
          >
            {loading ? "Enviando..." : "Solicitar pedido"}
          </button>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            O Pede pro Kevin apenas conecta pessoas: o valor final e a forma de pagamento são combinados diretamente entre você e o entregador.
          </p>
        </div>
      </form>
    </AppShell>
  );
}

function ResumoLinha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-words max-w-[62%]">{value}</span>
    </div>
  );
}
