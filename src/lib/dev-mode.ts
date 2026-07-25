import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DEV_EMAIL = "kevindosgames1@gmail.com";
const LS_GOD = "ppk_god_mode";
const LS_OVERRIDES = "ppk_overrides_v1";

export interface Overrides {
  fretePct: number;
  freteMin: number;
  taxaPct: number;
  taxaMin: number;
  categoriasExtra: { id: string; label: string; emoji: string; tint: string }[];
}

export const DEFAULT_OVERRIDES: Overrides = {
  fretePct: 0.1,
  freteMin: 8,
  taxaPct: 0.05,
  taxaMin: 3,
  categoriasExtra: [],
};

export function loadOverrides(): Overrides {
  if (typeof window === "undefined") return DEFAULT_OVERRIDES;
  try {
    const raw = localStorage.getItem(LS_OVERRIDES);
    if (!raw) return DEFAULT_OVERRIDES;
    return { ...DEFAULT_OVERRIDES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_OVERRIDES;
  }
}

export function saveOverrides(o: Overrides) {
  localStorage.setItem(LS_OVERRIDES, JSON.stringify(o));
  window.dispatchEvent(new Event("ppk:overrides"));
}

export function isGodMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_GOD) === "1";
}

export function setGodMode(v: boolean) {
  localStorage.setItem(LS_GOD, v ? "1" : "0");
  window.dispatchEvent(new Event("ppk:god"));
}

export function useIsDev(): boolean {
  const [dev, setDev] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setDev(data.user?.email?.toLowerCase() === DEV_EMAIL);
    });
  }, []);
  return dev;
}

export function useGodMode(): boolean {
  const [g, setG] = useState<boolean>(() => isGodMode());
  useEffect(() => {
    const h = () => setG(isGodMode());
    window.addEventListener("ppk:god", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("ppk:god", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return g;
}

export function useOverrides(): Overrides {
  const [o, setO] = useState<Overrides>(() => loadOverrides());
  useEffect(() => {
    const h = () => setO(loadOverrides());
    window.addEventListener("ppk:overrides", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("ppk:overrides", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return o;
}