/** SERVER-ONLY runtime for Kevin v2. Requires the v2 draft schema to be applied first. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import {
  KEVIN_PROTOCOL, isKevinCategory, validateKevinEnvelope, normalizeKevinOrigin,
  createKevinEnvelope, type KevinEventEnvelope,
} from "./protocol";
import {
  decryptKevinSecret, encryptKevinSecret, generateKevinSecret,
  verifyKevinRequest, signKevinRequest, generateKevinNonce,
} from "./crypto.server";

type Connection = {
  id: string; remote_connection_id: string; local_app_id: string; remote_app_id: string; remote_name: string;
  remote_origin: string; scopes: string[]; encrypted_shared_secret: string;
  status: string;
};

const MASTER_KEY = () => process.env.KEVIN_MASTER_KEY ?? "";
const v2Db = supabaseAdmin;

export function requireKevinV2Config() {
  const key = MASTER_KEY();
  if (!/^[a-f0-9]{64}$/i.test(key) && !/^[A-Za-z0-9]{64,}$/.test(key)) {
    throw new Error("KEVIN_MASTER_KEY ausente ou inválida.");
  }
}

export async function getKevinV2Identity() {
  const { data, error } = await v2Db.from("kevin_v2_app_identity")
    .select("app_id,app_slug,app_name,app_version").eq("singleton", true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Identidade v2 não configurada no banco.");
  return data;
}

export async function createKevinV2PairingCode(input: {
  scopes: string[]; createdBy?: string; expiresInMinutes?: number;
}) {
  requireKevinV2Config();
  const allowed = input.scopes.filter(isKevinCategory);
  if (!allowed.length || allowed.length !== input.scopes.length) throw new Error("Escopos inválidos.");
  const code = `KVN-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}`;
  const codeHash = await digest(code);
  const expiresAt = new Date(Date.now() + Math.min(1440, Math.max(5, input.expiresInMinutes ?? 15)) * 60_000);
  const { error } = await v2Db.from("kevin_v2_pairing_codes").insert({
    code_hash: codeHash, requested_scopes: allowed, created_by: input.createdBy ?? null,
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
  const { data: pairing, error } = await v2Db.from("kevin_v2_pairing_codes")
    .update({ status: "consumed", consumed_at: new Date().toISOString(), consumed_by_app_id: input.remote.app_id })
    .eq("code_hash", codeHash).eq("status", "active").gt("expires_at", new Date().toISOString())
    .select("id,requested_scopes").maybeSingle();
  if (error) throw error;
  if (!pairing) throw new Error("Código inválido, expirado ou já utilizado.");

  const secret = generateKevinSecret();
  const encrypted = await encryptKevinSecret(secret, MASTER_KEY());
  const { data: connection, error: connectionError } = await v2Db
    .from("kevin_v2_connections").insert({
      local_app_id: identity.app_id, remote_app_id: input.remote.app_id,
      remote_name: input.remote.app_name, remote_slug: input.remote.app_slug ?? null,
      remote_origin: input.remote.origin, remote_version: input.remote.app_version ?? null,
      protocol_version: KEVIN_PROTOCOL, scopes: pairing.requested_scopes,
      encrypted_shared_secret: encrypted, status: "pending", confirmed_at: null,
    })
    .select("id,scopes").single();
  if (connectionError) throw connectionError;
  return { connectionId: connection.id, secret, scopes: connection.scopes, identity };
}


/** Inicia a conexão com a Central e só a ativa após a confirmação HMAC bilateral. */
export async function initiateCentralKevinV2Pairing(code: string) {
  requireKevinV2Config();
  const centralOrigin = process.env.KEVIN_CENTRAL_ORIGIN ?? "";
  const localOrigin = process.env.KEVIN_APP_ORIGIN ?? "";
  if (!centralOrigin || !localOrigin) {
    throw new Error("Configure KEVIN_CENTRAL_ORIGIN e KEVIN_APP_ORIGIN nos secrets do servidor.");
  }
  const central = new URL(normalizeKevinOrigin(centralOrigin));
  const local = new URL(normalizeKevinOrigin(localOrigin));
  if (typeof code !== "string" || !/^KVN-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code.trim().toUpperCase())) {
    throw new Error("Código de pareamento inválido.");
  }
  const identity = await getKevinV2Identity();
  const handshakeBody = {
    protocol: KEVIN_PROTOCOL,
    code: code.trim().toUpperCase(),
    remote: {
      app_id: identity.app_id,
      app_name: identity.app_name,
      app_slug: identity.app_slug,
      app_version: identity.app_version,
      origin: local.origin,
    },
  };
  const handshakeResponse = await fetch(new URL("/api/public/kevin/v2/handshake", central.origin), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(handshakeBody),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const handshake: unknown = await handshakeResponse.json().catch(() => null);
  if (!handshakeResponse.ok || !isRecord(handshake) || handshake.ok !== true ||
      typeof handshake.connectionId !== "string" || !/^[0-9a-f-]{36}$/i.test(handshake.connectionId) ||
      typeof handshake.secret !== "string" || !/^[a-f0-9]{64}$/i.test(handshake.secret) ||
      !Array.isArray(handshake.scopes) || !handshake.scopes.every((scope) => typeof scope === "string" && isKevinCategory(scope)) ||
      !isRecord(handshake.identity) || typeof handshake.identity.app_id !== "string" ||
      typeof handshake.identity.app_name !== "string") {
    const message = isRecord(handshake) && typeof handshake.error === "string" ? handshake.error : "A Central recusou o pareamento.";
    throw new Error(message);
  }
  const secret = handshake.secret;
  const scopes = handshake.scopes.filter((scope): scope is import("./protocol").KevinCategory => typeof scope === "string" && isKevinCategory(scope));
  const encrypted = await encryptKevinSecret(secret, MASTER_KEY());
  const remoteIdentity = handshake.identity;
  const { data: localConnection, error: insertError } = await v2Db.from("kevin_v2_connections").insert({
    local_app_id: identity.app_id,
    remote_app_id: String(remoteIdentity.app_id),
    remote_name: String(remoteIdentity.app_name),
    remote_slug: typeof remoteIdentity.app_slug === "string" ? remoteIdentity.app_slug : null,
    remote_origin: central.origin,
    remote_connection_id: handshake.connectionId,
    remote_version: typeof remoteIdentity.app_version === "string" ? remoteIdentity.app_version : null,
    protocol_version: KEVIN_PROTOCOL,
    scopes,
    encrypted_shared_secret: encrypted,
    status: "pending",
    confirmed_at: null,
  }).select("id").single();
  if (insertError) throw insertError;
  const confirmationBody = { connectionId: handshake.connectionId };
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = generateKevinNonce();
  const pathAndQuery = "/api/public/kevin/v2/confirm";
  const signature = await signKevinRequest({
    secret, method: "POST", pathAndQuery, timestamp, nonce, body: confirmationBody,
  });
  const confirmationResponse = await fetch(new URL(pathAndQuery, central.origin), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-kevin-connection": handshake.connectionId,
      "x-kevin-timestamp": timestamp,
      "x-kevin-nonce": nonce,
      "x-kevin-signature": signature,
    },
    body: JSON.stringify(confirmationBody),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const confirmation: unknown = await confirmationResponse.json().catch(() => null);
  if (!confirmationResponse.ok || !isRecord(confirmation) || confirmation.ok !== true) {
    const message = isRecord(confirmation) && typeof confirmation.error === "string" ? confirmation.error : "A Central não confirmou o pareamento.";
    throw new Error(message);
  }
  const { error: updateError } = await v2Db.from("kevin_v2_connections").update({
    status: "connected",
    confirmed_at: new Date().toISOString(),
  }).eq("id", localConnection.id).eq("status", "pending");
  if (updateError) throw updateError;
  return { status: "connected" as const, remoteName: String(remoteIdentity.app_name), scopes };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}


/** Confirma o lado local somente após o remoto provar posse do segredo compartilhado. */
export async function confirmKevinV2Pairing(request: Request, body: unknown) {
  requireKevinV2Config();
  const connectionId = request.headers.get("x-kevin-connection") ?? "";
  const timestamp = request.headers.get("x-kevin-timestamp") ?? "";
  const nonce = request.headers.get("x-kevin-nonce") ?? "";
  const signature = request.headers.get("x-kevin-signature") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(connectionId) || !/^\d{10}$/.test(timestamp) ||
      !/^[a-f0-9]{32}$/i.test(nonce) || !/^[a-f0-9]{64}$/i.test(signature)) {
    throw new Error("Cabeçalhos de autenticação inválidos.");
  }
  if (!isRecord(body) || body.connectionId !== connectionId) throw new Error("Confirmação inválida.");
  const { data: connection, error } = await v2Db.from("kevin_v2_connections")
    .select("id,encrypted_shared_secret").eq("id", connectionId).eq("status", "pending").maybeSingle();
  if (error) throw error;
  if (!connection) throw new Error("Pareamento pendente não encontrado ou já confirmado.");
  const secret = await decryptKevinSecret(connection.encrypted_shared_secret, MASTER_KEY());
  const url = new URL(request.url);
  const valid = await verifyKevinRequest({
    secret, method: request.method, pathAndQuery: url.pathname + url.search,
    timestamp, nonce, body, signature,
  });
  if (!valid) throw new Error("Assinatura inválida ou expirada.");
  const { error: nonceError } = await v2Db.from("kevin_v2_nonces").insert({
    connection_id: connection.id, nonce, expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (nonceError) throw new Error(nonceError.code === "23505" ? "Requisição repetida." : "Não foi possível registrar o nonce.");
  const { data: updated, error: updateError } = await v2Db.from("kevin_v2_connections")
    .update({ status: "connected", confirmed_at: new Date().toISOString() })
    .eq("id", connection.id).eq("status", "pending").select("id").maybeSingle();
  if (updateError) throw updateError;
  if (!updated) throw new Error("A conexão foi alterada antes da confirmação.");
  return { connectionId, status: "connected" as const };
}

export async function authenticateKevinV2Request(request: Request, body: unknown) {
  requireKevinV2Config();
  const connectionId = request.headers.get("x-kevin-connection");
  const timestamp = request.headers.get("x-kevin-timestamp") ?? "";
  const nonce = request.headers.get("x-kevin-nonce") ?? "";
  const signature = request.headers.get("x-kevin-signature") ?? "";
  if (!connectionId || !/^\d{10}$/.test(timestamp) || !/^[a-f0-9]{32}$/i.test(nonce) ||
      !/^[a-f0-9]{64}$/i.test(signature)) throw new Error("Cabeçalhos de autenticação ausentes ou inválidos.");

  const { data: connection, error } = await v2Db.from("kevin_v2_connections")
    .select("*").eq("id", connectionId).eq("status", "connected").maybeSingle();
  if (error) throw error;
  if (!connection) throw new Error("Conexão Kevin não encontrada.");
  const row = connection as unknown as Connection;
  const secret = await decryptKevinSecret(row.encrypted_shared_secret, MASTER_KEY());
  const valid = await verifyKevinRequest({
    secret, method: request.method, pathAndQuery: new URL(request.url).pathname + new URL(request.url).search,
    timestamp, nonce, body, signature,
  });
  if (!valid) throw new Error("Assinatura inválida ou expirada.");

  const { error: nonceError } = await v2Db.from("kevin_v2_nonces").insert({
    connection_id: row.id, nonce, expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (nonceError) {
    if (nonceError.code === "23505") throw new Error("Requisição repetida.");
    throw nonceError;
  }
  await v2Db.from("kevin_v2_connections").update({ last_seen_at: new Date().toISOString() }).eq("id", row.id);
  return row;
}

/** Envia um único ping de diagnóstico, sem dados de negócio, à Central já pareada. */
export async function sendKevinV2SettingsPing() {
  requireKevinV2Config();
  const centralOrigin = process.env.KEVIN_CENTRAL_ORIGIN ?? "";
  if (!centralOrigin) throw new Error("KEVIN_CENTRAL_ORIGIN não configurada.");
  const central = new URL(normalizeKevinOrigin(centralOrigin));
  const { data: rows, error: connectionError } = await v2Db.from("kevin_v2_connections")
    .select("id,remote_connection_id,local_app_id,remote_app_id,remote_name,remote_origin,scopes,encrypted_shared_secret,status")
    .eq("status", "connected").eq("remote_origin", central.origin).limit(2);
  if (connectionError) throw connectionError;
  if (!rows || rows.length !== 1) throw new Error("É necessário exatamente um pareamento ativo com a Central Kevin.");
  const connection = rows[0] as unknown as Connection;
  if (!connection.remote_connection_id) throw new Error("A conexão local não possui o ID correspondente da Central. É necessária a atualização de compatibilidade.");
  if (!connection.scopes.includes("settings")) throw new Error("A conexão não possui o escopo settings.");
  const identity = await getKevinV2Identity();
  // Stable diagnostic identity makes retries idempotent at the Central inbox.
  // This is the exact, explicitly approved test payload; it contains no business data.
  const eventId = "8e3d5c2a-7b91-4f06-a2c8-91d7e5b4c630";
  const occurredAt = "2026-11-12T00:00:00.000Z";
  const { data: priorSuccess, error: priorError } = await v2Db
    .from("kevin_v2_transfer_history")
    .select("id")
    .eq("connection_id", connection.id)
    .eq("direction", "outbound")
    .eq("category", "settings")
    .eq("status", "success")
    .ilike("detail", `%${eventId}%`)
    .limit(1)
    .maybeSingle();
  if (priorError) throw priorError;
  if (priorSuccess) {
    return { ok: true as const, eventId, alreadyDelivered: true, category: "settings" as const };
  }
  const event = await createKevinEnvelope({
    eventId,
    sourceAppId: String(identity.app_id),
    sourceAppName: String(identity.app_name),
    category: "settings",
    recordId: "app-config-test",
    operation: "upsert",
    entityVersion: 1,
    occurredAt,
    payload: { test: true, ping: "handshake-check" },
  });
  const body = { events: [event] };
  const pathAndQuery = "/api/public/kevin/v2/events";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = generateKevinNonce();
  const secret = await decryptKevinSecret(connection.encrypted_shared_secret, MASTER_KEY());
  const signature = await signKevinRequest({ secret, method: "POST", pathAndQuery, timestamp, nonce, body });
  let responseStatus = 0;
  let responseBody: unknown = null;
  try {
    const response = await fetch(new URL(pathAndQuery, central.origin), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-kevin-connection": connection.remote_connection_id,
        "x-kevin-timestamp": timestamp,
        "x-kevin-nonce": nonce,
        "x-kevin-signature": signature,
      },
      body: JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    responseStatus = response.status;
    responseBody = await response.json().catch(() => null);
    const result = responseBody as { ok?: unknown; accepted?: unknown; rejected?: unknown } | null;
    const accepted = result && Array.isArray(result.accepted) ? result.accepted : [];
    const rejected = result && Array.isArray(result.rejected) ? result.rejected : [];
    const success = response.ok && result?.ok === true && accepted.includes(event.eventId) && rejected.length === 0;
    const { error: historyError } = await v2Db.from("kevin_v2_transfer_history").insert({
      correlation_id: crypto.randomUUID(), connection_id: connection.id, operation: "push",
      direction: "outbound", source_app_id: connection.local_app_id, target_app_id: connection.remote_app_id,
      category: "settings", item_count: success ? 1 : 0, status: success ? "success" : "error",
      error_code: success ? null : "SETTINGS_PING_REJECTED",
      detail: success ? `Diagnóstico settings ping confirmado pela Central. eventId=${eventId}` : JSON.stringify({
        eventId, httpStatus: responseStatus, response: responseBody,
      }).slice(0, 1500),
    });
    if (historyError) throw historyError;
    if (!success) {
      const details = rejected.length
        ? JSON.stringify(rejected).slice(0, 500)
        : JSON.stringify(responseBody).slice(0, 500);
      throw new Error(`A Central não confirmou o heartbeat. HTTP ${responseStatus}. ${details}`);
    }
    await v2Db.from("kevin_v2_connections").update({
      last_seen_at: new Date().toISOString(), last_successful_sync_at: new Date().toISOString(),
      last_error_code: null, last_error_message: null,
    }).eq("id", connection.id);
    return { ok: true as const, eventId: event.eventId, httpStatus: responseStatus, accepted: 1, category: "settings" as const };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("A Central não confirmou")) throw error;
    await v2Db.from("kevin_v2_transfer_history").insert({
      correlation_id: crypto.randomUUID(), connection_id: connection.id, operation: "push",
      direction: "outbound", source_app_id: connection.local_app_id, target_app_id: connection.remote_app_id,
      category: "settings", item_count: 0, status: "error", error_code: "SETTINGS_PING_FAILED",
      detail: JSON.stringify({ eventId, error: error instanceof Error ? error.message.slice(0, 1200) : "Falha no envio." }),
    });
    await v2Db.from("kevin_v2_connections").update({
      last_error_code: "SETTINGS_PING_FAILED",
      last_error_message: error instanceof Error ? error.message.slice(0, 500) : "Falha no envio.",
    }).eq("id", connection.id);
    throw error;
  }
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
    let event: KevinEventEnvelope | undefined;
    let inboxRecorded = false;
    try {
      event = await validateKevinEnvelope(raw) as KevinEventEnvelope;
      if (event.payload !== null && !isJsonValue(event.payload)) throw new Error("Payload não é JSON válido.");
      if (event.sourceAppId !== connection.remote_app_id || !connection.scopes.includes(event.category)) {
        throw new Error("Origem ou escopo não autorizado.");
      }

      const { error: inboxError } = await v2Db.from("kevin_v2_inbox").insert({
        source_app_id: event.sourceAppId, event_id: event.eventId, category: event.category,
        source_record_id: event.recordId, entity_version: event.entityVersion,
        operation: event.operation, checksum: event.checksum, status: "received",
      });
      if (inboxError?.code === "23505") {
        const { data: existing, error: lookupError } = await v2Db.from("kevin_v2_inbox")
          .select("status,checksum").eq("source_app_id", event.sourceAppId)
          .eq("event_id", event.eventId).maybeSingle();
        if (lookupError) throw lookupError;
        if (!existing) throw inboxError;
        if (existing.checksum !== event.checksum) throw new Error("eventId reutilizado com checksum diferente.");
        if (existing.status === "applied" || existing.status === "duplicate") {
          accepted.push(event.eventId);
          continue;
        }
        if (existing.status !== "received" && existing.status !== "rejected") {
          throw new Error("Evento duplicado sem estado recuperável no inbox.");
        }
        inboxRecorded = true;
      } else if (inboxError) {
        throw inboxError;
      } else {
        inboxRecorded = true;
      }

      const { data: applied, error: applyError } = await v2Db.rpc("kevin_v2_apply_storage", {
        p_source_app_id: event.sourceAppId, p_category: event.category,
        p_source_record_id: event.recordId, p_payload: event.payload,
        p_entity_version: event.entityVersion, p_checksum: event.checksum,
        p_deleted_at: event.operation === "delete" ? event.occurredAt : (null as unknown as string),
      });
      if (applyError) throw applyError;
      const { data: updated, error: updateError } = await v2Db.from("kevin_v2_inbox").update({
        status: applied === "applied" ? "applied" : "duplicate",
        applied_at: new Date().toISOString(), error_code: null,
      }).eq("source_app_id", event.sourceAppId).eq("event_id", event.eventId)
        .in("status", ["received", "rejected"]).select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!updated) throw new Error("Espelho atualizado, mas o estado do inbox mudou; ACK não confirmado.");
      accepted.push(event.eventId);
    } catch (error) {
      if (event && inboxRecorded) {
        await v2Db.from("kevin_v2_inbox").update({
          status: "rejected", error_code: "PROCESSING_FAILED",
        }).eq("source_app_id", event.sourceAppId).eq("event_id", event.eventId)
          .in("status", ["received", "rejected"]);
      }
      rejected.push({
        ...(event?.eventId ? { eventId: event.eventId } : {}),
        error: safeMessage(error),
      });
    }
  }
  await v2Db.from("kevin_v2_transfer_history").insert({
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
  const { data: outbox } = await v2Db.from("kevin_v2_outbox")
    .select("id,event_id").in("event_id", eventIds);
  const outboxIds = (outbox ?? []).map((row) => row.id);
  if (outboxIds.length) {
    const { error } = await v2Db.from("kevin_v2_deliveries").update({
      status: "delivered", delivered_at: new Date().toISOString(), lease_until: null,
    }).eq("connection_id", connection.id).in("outbox_id", outboxIds).in("status", ["pending", "leased"]);
    if (error) throw error;
  }
  return { acknowledged: outboxIds.length };
}

function isJsonValue(value: unknown): value is Json {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (value !== null && typeof value === "object") return Object.values(value).every(isJsonValue);
  return false;
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
