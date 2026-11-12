import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deleteDevOrderFor,
  listDevDataFor,
  parseOrderIdInput,
  parseStatusInput,
  updateDevOrderStatusFor,
  connectCentralKevinV2For,
  parseKevinPairingCodeInput,
  sendKevinV2SettingsPingFor,
} from "./dev-actions.server";

export const listDevData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listDevDataFor(context));

export const deleteDevOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseOrderIdInput)
  .handler(async ({ context, data }) => deleteDevOrderFor(context, data.id));

export const updateDevOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseStatusInput)
  .handler(async ({ context, data }) => updateDevOrderStatusFor(context, data.id, data.status));
export const connectCentralKevinV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseKevinPairingCodeInput)
  .handler(async ({ context, data }) => connectCentralKevinV2For(context, data.code));

export const sendKevinV2SettingsPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => sendKevinV2SettingsPingFor(context));
