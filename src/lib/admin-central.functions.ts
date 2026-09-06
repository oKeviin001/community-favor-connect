import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminMutateFor, adminQueryFor, parseAdminMutation, parseAdminQuery } from "./admin-central.server";

export const adminQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseAdminQuery)
  .handler(async ({ context, data }) => adminQueryFor(context, data.view, data.filtro, data.busca));

export const adminMutate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseAdminMutation)
  .handler(async ({ context, data }) => adminMutateFor(context, data.acao, data.payload));
