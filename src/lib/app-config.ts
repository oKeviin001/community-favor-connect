import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppConfig {
  cadastroEntregadores?: boolean;
  pausarPedidos?: boolean;
  manutencao?: boolean;
  avisoHome?: string;
  limitePedidosUsuario?: number;
  bairrosAtivos?: string[];
}

export interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  publico: string;
}

export interface AppConfigState {
  loading: boolean;
  config: AppConfig;
  avisos: Aviso[];
}

export function useAppConfig(publico?: "clientes" | "entregadores"): AppConfigState {
  const [state, setState] = useState<AppConfigState>({ loading: true, config: {}, avisos: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [cfg, avs] = await Promise.all([
        supabase.from("app_settings").select("valor").eq("chave", "geral").maybeSingle(),
        supabase
          .from("announcements")
          .select("id, titulo, mensagem, publico")
          .eq("ativo", true)
          .order("criado_em", { ascending: false }),
      ]);
      if (!alive) return;
      const avisos = ((avs.data as Aviso[]) ?? []).filter(
        (a) => a.publico === "todos" || !publico || a.publico === publico,
      );
      setState({
        loading: false,
        config: (cfg.data?.valor ?? {}) as AppConfig,
        avisos,
      });
    })();
    return () => {
      alive = false;
    };
  }, [publico]);

  return state;
}
