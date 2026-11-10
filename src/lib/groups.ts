import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Grupo {
  slug: string;
  nome: string;
  descricao: string | null;
  icone: string;
  ativo: boolean;
  ordem: number;
}

const ENUM_CATS = ["mercado", "farmacia", "padaria", "lojas", "retirada", "favor", "livre"] as const;

/** Categoria legada (enum) usada para compatibilidade quando o pedido é de um grupo novo. */
export function categoriaLegada(slug: string): (typeof ENUM_CATS)[number] {
  return (ENUM_CATS as readonly string[]).includes(slug) ? (slug as (typeof ENUM_CATS)[number]) : "livre";
}

export function grupoDoPedido(o: { categoria?: string | null; categoria_servico?: string | null }) {
  return o.categoria_servico || o.categoria || "livre";
}

export function useGrupos(incluirInativos = false) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    let q = supabase.from("service_categories").select("slug, nome, descricao, icone, ativo, ordem").order("ordem");
    if (!incluirInativos) q = q.eq("ativo", true);
    const { data } = await q;
    setGrupos((data as Grupo[]) ?? []);
    setLoading(false);
  }, [incluirInativos]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { grupos, loading, reload };
}
