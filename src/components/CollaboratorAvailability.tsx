import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Radio, RadioTower } from "lucide-react";
import { toast } from "sonner";

export function CollaboratorAvailability() {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const watchId = useRef<number | null>(null);

  useEffect(() => () => {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  function publish(availableNow: boolean, latitude: number | null, longitude: number | null) {
    return supabase.rpc("set_collaborator_presence" as never, {
      _disponivel: availableNow,
      _latitude: latitude,
      _longitude: longitude,
    } as never);
  }

  function stopWatch() {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }

  async function turnOff() {
    setBusy(true);
    stopWatch();
    const { error } = await publish(false, null, null);
    setBusy(false);
    if (error) return toast.error("Não foi possível desativar sua disponibilidade.");
    setAvailable(false);
    toast.success("Você está indisponível. Sua localização não será exibida.");
  }

  function turnOn() {
    if (!navigator.geolocation) return toast.error("Este aparelho não oferece localização pelo navegador.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const { error } = await publish(true, latitude, longitude);
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
      setAvailable(true);
      setBusy(false);
      stopWatch();
      watchId.current = navigator.geolocation.watchPosition(async (next) => {
        await publish(true, next.coords.latitude, next.coords.longitude);
      }, () => {
        void turnOff();
        toast.error("Não foi possível atualizar sua localização. Você ficou indisponível.");
      }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
      toast.success("Disponibilidade ativada. Sua localização será compartilhada apenas com clientes que receberam sua proposta.");
    }, () => {
      setBusy(false);
      toast.error("Permita o acesso à localização para ficar disponível.");
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
  }

  return (
    <section className="mx-4 mt-3 rounded-2xl border border-border bg-card p-3 flex items-center gap-3">
      <div className={`size-9 rounded-xl flex items-center justify-center ${available ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
        {available ? <RadioTower size={18} /> : <Radio size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{available ? "Disponível" : "Indisponível"}</p>
        <p className="text-[10px] text-muted-foreground leading-snug">
          {available ? "Localização compartilhada com clientes das suas propostas." : "Ative para compartilhar sua localização com clientes das suas propostas."}
        </p>
      </div>
      <button type="button" disabled={busy} onClick={() => available ? void turnOff() : turnOn()}
        className={`h-9 px-3 rounded-xl text-xs font-semibold disabled:opacity-50 ${available ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground"}`}>
        {busy ? "Aguarde…" : available ? "Ficar offline" : "Ficar disponível"}
      </button>
    </section>
  );
}
