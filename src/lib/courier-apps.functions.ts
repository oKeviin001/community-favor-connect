import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  decideApplicationFor,
  getApplicationFor,
  listApplicationsFor,
  parseApplicationIdInput,
  parseDecisionInput,
} from "./courier-apps.server";

export const listCourierApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listApplicationsFor(context));

export const getCourierApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseApplicationIdInput)
  .handler(async ({ context, data }) => getApplicationFor(context, data.id));

export const decideCourierApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseDecisionInput)
  .handler(async ({ context, data }) => decideApplicationFor(context, data.id, data.decisao, data.nota));
