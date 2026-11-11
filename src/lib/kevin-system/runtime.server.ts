/** SERVER-ONLY runtime for Kevin v2. Requires the v2 draft schema to be applied first. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  KEVIN_PROTOCOL, isKevinCategory, validateKevinEnvelope,
  type KevinEventEnvelope,
} from "./protocol";
import {
  decryptKevinSecret, encryptKevinSecret, generateKevinSecret,
  verifyKevinRequest,
} from "./crypto.server";

type Db = typeof supabaseAdmin;
type Connection = {
  id: string; local_app_id: string; remote_app_id: string; remote_name: string;
  remote_origin: string; scopes: string[]; encrypted_shared_secret: string;
  status: string;
};
const MASTER_KEY = () => process.env.KEVIN_MASTER_KEY ?? "";
const APP_ID = () => process.env.KEVIN_APP_ID ?? "pede-pro-kevin";

export function requireKevinV2Config() {
  if (!/^[a-f0-9]{64}$/i.test(MASTER_KEY())) {
    throw new Error("KEVIN_MASTER_KEY ausente ou inválida (64 caracteres hexadecimais).");
  }
}

export async function getKevinV2Identity() {
  const { data, error } = await supabaseAdmin.from("kevin_v2_app_identity")
    .select("app_id,app_slug,app_name,app_version").eq("singleton", true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Identidade v2 não configurada no banco.");
  return data;
}

export async function createKevinV2PairingCode(input: {
  scopes: string[]; createdBy: string; expiresInMinutes?: number;
}) {
  requireKevinV2Config();
  const allowed = input.scopes.filter(isKevinCategory);
  if (!allowed.length || allowed.length !== input.scopes.length) throw new Error("Escopos inválidos.");
  const code = `KVN-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}`;
  const codeHash = await digest(code);
  const expiresAt = new Date(Date.now() + Math.min(1440, Math.max(5, input.expiresInMinutes ?? 15)) * 60_000);
  const { error } = await supabaseAdmin.from("kevin_v2_pairing_codes").insert({
    code_hash: codeHash, requested_scopes: allowed, created_by: input.createdBy,
    expires_at: expiresAt.toISOString(), status: "active",
  });
  if (error) throw error;
  return { code, expiresAt: expiresAt.toISOString(), scopes: allowed };
}

export async function acceptKevinV2Pairing(input: {
  code: string; remote: { app_id: string; app_name: string; app_slug?: string; app_version?: string; origin: string };
}) {
  requireKevinV2Config();
  const identity = await getKevinV2Identity();
  const codeHash = await digest(input.code.trim().toUpperCase());
  // Conditional UPDATE is the single-use lock: only one concurrent request can consume it.
  const { data: pairing, error } = await supabaseAdmin.from("kevin_v2_pairing_codes")
    .update({ status: "consumed", consumed_at: new Date().toISOString(), consumed_by_app_id: input.remote.app_id })
    .eq("code_hash", codeHash).eq("status", "active").gt("expires_at", new Date().toISOString())
    .select("id,requested_scopes").maybeSingle();
  if (error) throw error;
  if (!pairing) throw new Error("Código inválido, expirado ou já utilizado.");

  const secret = generateKevinSecret();
  const encrypted = await encryptKevinSecret(secret, MASTER_KEY());
  const { data: connection, error: connectionError } = await supabaseAdmin
    .from("kevin_v2_connections").upsert({
      local_app_id: identity.app_id, remote_app_id: input.remote.app_id,
      remote_name: input.remote.app_name, remote_slug: input.remote.app_slug ?? null,
      remote_origin: input.remote.origin, remote_version: input.remote.app_version ?? null,
      protocol_version: KEVIN_PROTOCOL, scopes: pairing.requested_scopes,
      encrypted_shared_secret: encrypted, status: "connected", confirmed_at: new Date().toISOString(),
    }, { onConflict: "local_app_id,remote_app_id" })
    .select("id,scopes").single();
  if (connectionError) throw connectionError;
  return { connectionId: connection.id, secret, scopes: connection.scopes, identity };
}

export async function authenticateKevinV2Request(request: Request, body: unknown) {
  requireKevinV2Config();
  const connectionId = request.headers.get("x-kevin-connection");
  const timestamp = request.headers.get("x-kevin-timestamp") ?? "";
  const nonce = request.headers.get("x-kevin-nonce") ?? "";
  const signature = request.headers.get("x-kevin-signature") ?? "";
  if (!connectionId || !/^\d{10}$/.test(timestamp) || !/^[a-f0-9]{32}$/i.test(nonce) ||
      !/^[a-f0-9]{64}$/i.test(signature)) throw new Error("Cabeçalhos de autenticação ausentes ou inválidos.");

  const { data: connection, error } = await supabaseAdmin.from("kevin_v2_connections")
    .select("*").eq("id", connectionId).eq("status", "connected").maybeSingle();
  if (error) throw error;
  if (!connection) throw new Error("Conexão Kevin não encontrada.");
  const row = connection as Connection;
  const secret = await decryptKevinSecret(row.encrypted_shared_secret, MASTER_KEY());
  const valid = await verifyKevinRequest({
    secret, method: request.method, pathAndQuery: new URL(request.url).pathname + new URL(request.url).search,
    timestamp, nonce, body, signature,
  });
  if (!valid) throw new Error("Assinatura inválida ou expirada.");

  const { error: nonceError } = await supabaseAdmin.from("kevin_v2_nonces").insert({
    connection_id: row.id, nonce, expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (nonceError) {
    if (nonceError.code === "23505") throw new Error("Requisição repetida.");
    throw nonceError;
  }
  await supabaseAdmin.from("kevin_v2_connections").update({ last_seen_at: new Date().toISOString() }).eq("id", row.id);
  return row;
}

export async function receiveKevinV2Events(request: Request, body: unknown) {
  const connection = await authenticateKevinV2Request(request, body);
  if (!body || typeof body !== "object" || !Array.isArray((body as { events?: unknown }).events)) {
    throw new Error("Lote de eventos inválido.");
  }
  const events = (body as { events: unknown[] }).events;
  if (events.length < 1 || events.length > 100) throw new Error("O lote deve conter de 1 a 100 eventos.");
  const accepted: string[] = [], rejected: { eventId?: string; error: string }[] = [];
  for (const raw of events) {
    try {
      const event = await validateKevinEnvelope(raw) as KevinEventEnvelope;
      if (event.sourceAppId !== connection.remote_app_id || !connection.scopes.includes(event.category)) {
        throw new Error("Origem ou escopo não autorizado.");
      }
      const { error: inboxError } = await supabaseAdmin.from("kevin_v2_inbox").insert({
        source_app_id: event.sourceAppId, event_id: event.eventId, category: event.category,
        source_record_id: event.recordId, entity_version: event.entityVersion,
        operation: event.operation, checksum: event.checksum, status: "received",
      });
      if (inboxError?.code === "23505") { accepted.push(event.eventId); continue; }
      if (inboxError) throw inboxError;
      const { data: applied, error: applyError } = await supabaseAdmin.rpc("kevin_v2_apply_storage", {
        p_source_app_id: event.sourceAppId, p_category: event.category,
        p_source_record_id: event.recordId, p_payload: event.payload,
        p_entity_version: event.entityVersion, p_checksum: event.checksum,
        p_deleted_at: event.operation === "delete" ? event.occurredAt : null,
      });
      if (applyError) throw applyError;
      await supabaseAdmin.from("kevin_v2_inbox").update({
        status: applied === "applied" ? "applied" : "duplicate", applied_at: new Date().toISOString(),
      }).eq("source_app_id", event.sourceAppId).eq("event_id", event.eventId);
      accepted.push(event.eventId);
    } catch (error) {
      rejected.push({ eventId: (raw as { eventId?: string })?.eventId, error: safeMessage(error) });
    }
  }
  await supabaseAdmin.from("kevin_v2_transfer_history").insert({
    correlation_id: crypto.randomUUID(), connection_id: connection.id, operation: "push",
    direction: "inbound", source_app_id: connection.remote_app_id, target_app_id: connection.local_app_id,
    item_count: accepted.length, status: rejected.length ? (accepted.length ? "partial" : "error") : "success",
    error_code: rejected.length ? "EVENT_REJECTED" : null,
    detail: rejected.length ? JSON.stringify(rejected).slice(0, 1500) : null,
  });
  return { accepted, rejected };
}

export async function ackKevinV2Deliveries(request: Request, body: unknown) {
  const connection = await authenticateKevinV2Request(request, body);
  if (!body || typeof body !== "object" || !Array.isArray((body as { eventIds?: unknown }).eventIds)) {
    throw new Error("ACK inválido.");
  }
  const eventIds = (body as { eventIds: unknown[] }).eventIds.filter((v): v is string => typeof v === "string").slice(0, 100);
  if (!eventIds.length) throw new Error("Nenhum eventId informado.");
  const { data: outbox } = await supabaseAdmin.from("kevin_v2_outbox")
    .select("id,event_id").in("event_id", eventIds);
  const outboxIds = (outbox ?? []).map((row) => row.id);
  if (outboxIds.length) {
    const { error } = await supabaseAdmin.from("kevin_v2_deliveries").update({
      status: "delivered", delivered_at: new Date().toISOString(), lease_until: null,
    }).eq("connection_id", connection.id).in("outbox_id", outboxIds).in("status", ["pending", "leased"]);
    if (error) throw error;
  }
  return { acknowledged: outboxIds.length };
}

function safeMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 300) : "Falha inesperada.";
}
async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
function randomChars(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
