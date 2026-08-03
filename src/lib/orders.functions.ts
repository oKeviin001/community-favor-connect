import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { confirmDeliveryFor, parseOrderId } from "./orders.server";

export const confirmDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseOrderId)
  .handler(async ({ context, data }) => confirmDeliveryFor(context, data.orderId));