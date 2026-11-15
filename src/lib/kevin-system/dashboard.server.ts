import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getKevinV2Identity, requireKevinV2Config } from "./runtime.server";

/** Safe projection only: encrypted secrets never leave the server. */
export async function getKevinDashboard() {
  const identity = await getKevinV2Identity();
  const [connections, files, history] = await Promise.all([
    supabaseAdmin.from("kevin_v2_connections")
      .select("id,remote_name,remote_origin,remote_connection_id,status,scopes,confirmed_at,last_successful_sync_at,last_error_code")
      .order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("kevin_v2_files")
      .select("transfer_id,file_name,direction,status,size_bytes,verified_at,created_at")
      .order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("kevin_v2_transfer_history")
      .select("operation,direction,status,item_count,error_code,created_at")
      .order("created_at", { ascending: false }).limit(20),
  ]);
  if (connections.error) throw connections.error;
  let keyConfigured = true;
  try { requireKevinV2Config(); } catch { keyConfigured = false; }
  const centralOrigin = process.env.KEVIN_CENTRAL_ORIGIN ?? "";
  const active = (connections.data ?? []).filter(c => c.status === "connected" && c.remote_origin === centralOrigin);
  return {
    identity,
    connections: connections.data ?? [],
    files: files.data ?? [],
    history: history.data ?? [],
    readiness: {
      keyConfigured,
      originsConfigured: Boolean(centralOrigin && process.env.KEVIN_APP_ORIGIN),
      bilateralConnection: active.length === 1 && Boolean(active[0]?.remote_connection_id),
      filesAvailable: !files.error,
      historyAvailable: !history.error,
    },
    supportedCommands: ["system.ping"],
  };
}