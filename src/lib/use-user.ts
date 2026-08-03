import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEV_EMAIL } from "./dev-constants";

export type UserMode = "cliente" | "entregador" | "ambos";

export interface UserProfile {
  id: string;
  nome: string;
  telefone: string | null;
  bairro: string | null;
  tipo: UserMode;
  nota_media: number | null;
  total_avaliacoes: number | null;
  total_entregas: number | null;
  bloqueado: boolean;
  suspenso: boolean;
}

export interface UserState {
  loading: boolean;
  userId: string | null;
  email: string | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isDev: boolean;
  canOrder: boolean;
  canDeliver: boolean;
  reload: () => void;
}

export function useUser(): UserState {
  const [state, setState] = useState<Omit<UserState, "reload">>({
    loading: true,
    userId: null,
    email: null,
    profile: null,
    isAdmin: false,
    isDev: false,
    canOrder: true,
    canDeliver: false,
  });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) {
        if (mounted) setState((s) => ({ ...s, loading: false }));
        return;
      }
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (!mounted) return;
      const email = user.email?.toLowerCase() ?? null;
      const isDev = email === DEV_EMAIL;
      const isAdmin = isDev || (roles ?? []).some((r) => r.role === "admin");
      const profile = (prof as UserProfile | null) ?? null;
      const tipo = (profile?.tipo ?? "cliente") as UserMode;
      setState({
        loading: false,
        userId: user.id,
        email,
        profile,
        isAdmin,
        isDev,
        canOrder: tipo === "cliente" || tipo === "ambos",
        canDeliver: tipo === "entregador" || tipo === "ambos" || isAdmin,
      });
    })();
    return () => {
      mounted = false;
    };
  }, [tick]);

  return { ...state, reload };
}