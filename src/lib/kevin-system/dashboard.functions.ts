import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const kevinDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (error || data !== true) throw new Error("Acesso restrito aos administradores.");
    const { getKevinDashboard } = await import("./dashboard.server");
    return getKevinDashboard();
  });

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("commands") }),
  z.object({ action: z.literal("retry") }),
  z.object({ action: z.literal("send"), fileName: z.string().min(1).max(120), contentType: z.string().max(80), base64: z.string().min(1).max(14_000_000) }),
]);

export const kevinAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => actionSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: admin, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (error || admin !== true) throw new Error("Acesso restrito aos administradores.");
    const runtime = await import("./runtime.server");
    if (data.action === "commands") {
      const result = await runtime.pollCentralKevinV2Commands();
      return { message: `${result.received} comando(s) recebido(s).` };
    }
    if (data.action === "retry") {
      const result = await runtime.retryKevinV2Files();
      return { message: `${result.verified} confirmado(s), ${result.pending} pendente(s).` };
    }
    const result = await runtime.sendKevinV2File(data);
    return { message: `Arquivo confirmado pela Central: ${result.transferId}.` };
  });