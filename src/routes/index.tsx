import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pede pro Kevin — Entregas comunitárias" },
      { name: "description", content: "Peça favores e entregas locais com vizinhos da sua região." },
      { property: "og:title", content: "Pede pro Kevin — Entregas comunitárias" },
      { property: "og:description", content: "Peça favores e entregas locais com vizinhos da sua região." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/home" });
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
