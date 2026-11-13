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
  // Send our local connection ID so Central can address this app in reverse.
  const confirmationBody = {
    connectionId: handshake.connectionId,
    remoteConnectionId: localConnection.id,
  };
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
  if (!isRecord(body) || body.connectionId !== connectionId ||
      typeof body.remoteConnectionId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.remoteConnectionId)) {
    throw new Error("Confirmação inválida: ID remoto ausente.");
  }
  const remoteConnectionId = body.remoteConnectionId;
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
    .update({ status: "connected", confirmed_at: new Date().toISOString(), remote_connection_id: remoteConnectionId })
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

/** Receives a signed file transfer into the private Kevin bucket. */
export async function receiveKevinV2File(request: Request, body: unknown) {
  const connection = await authenticateKevinV2Request(request, body);
  if (!isRecord(body) || typeof body.transferId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.transferId) ||
      typeof body.fileName !== "string" || typeof body.contentType !== "string" ||
      typeof body.base64 !== "string" || typeof body.sha256 !== "string") {
    throw new Error("Metadados do arquivo inválidos.");
  }
  const fileName = body.fileName.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(fileName) || fileName.includes("..")) {
    throw new Error("Nome de arquivo não permitido.");
  }
  const allowedTypes = new Set(["application/pdf","application/json","application/zip","text/plain","image/jpeg","image/png","image/webp"]);
  if (!allowedTypes.has(body.contentType)) throw new Error("Tipo de arquivo não permitido.");
  if (body.base64.length > 14_000_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.base64)) {
    throw new Error("Arquivo excede o limite ou está codificado incorretamente.");
  }
  const binary = Uint8Array.from(atob(body.base64), (char) => char.charCodeAt(0));
  if (binary.length < 1 || binary.length > 10 * 1024 * 1024) throw new Error("O arquivo deve ter entre 1 byte e 10 MB.");
  const hashBytes = await crypto.subtle.digest("SHA-256", binary);
  const checksum = Array.from(new Uint8Array(hashBytes), (b) => b.toString(16).padStart(2, "0")).join("");
  if (checksum !== body.sha256.toLowerCase()) throw new Error("Checksum do arquivo não confere.");
  const { data: existing, error: existingError } = await v2Db.from("kevin_v2_files")
    .select("id,sha256,status").eq("connection_id", connection.id).eq("transfer_id", body.transferId).maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    if (existing.sha256 !== checksum) throw new Error("ID de transferência reutilizado com conteúdo diferente.");
    return { transferId: body.transferId, status: existing.status, sha256: checksum, duplicate: true };
  }
  const objectPath = connection.id + "/" + body.transferId + "/" + fileName;
  const { error: uploadError } = await v2Db.storage.from("kevin-v2-files").upload(objectPath, binary, {
    contentType: body.contentType, upsert: false,
  });
  if (uploadError) throw uploadError;
  const identity = await getKevinV2Identity();
  const { error: insertError } = await v2Db.from("kevin_v2_files").insert({
    transfer_id: body.transferId, connection_id: connection.id,
    source_app_id: connection.remote_app_id, target_app_id: identity.app_id,
    object_path: objectPath, file_name: fileName, content_type: body.contentType,
    size_bytes: binary.length, sha256: checksum, direction: "inbound", status: "verified",
    verified_at: new Date().toISOString(),
  });
  if (insertError) {
    await v2Db.storage.from("kevin-v2-files").remove([objectPath]);
    throw insertError;
  }
  await v2Db.from("kevin_v2_transfer_history").insert({
    correlation_id: body.transferId, connection_id: connection.id, operation: "file_push",
    direction: "inbound", source_app_id: connection.remote_app_id, target_app_id: identity.app_id,
    item_count: 1, status: "success", detail: fileName,
  });
  return { transferId: body.transferId, status: "verified", sizeBytes: binary.length, sha256: checksum };
}

/** Stores a file locally, then sends it to Central using the paired HMAC channel. */
export async function sendKevinV2File(input: { fileName: string; contentType: string; base64: string }) {
  requireKevinV2Config();
  const centralOrigin = process.env.KEVIN_CENTRAL_ORIGIN ?? "";
  if (!centralOrigin) throw new Error("KEVIN_CENTRAL_ORIGIN não configurada.");
  const central = new URL(normalizeKevinOrigin(centralOrigin));
  const fileName = input.fileName.trim();
  const allowedTypes = new Set(["application/pdf","application/json","application/zip","text/plain","image/jpeg","image/png","image/webp"]);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(fileName) || fileName.includes("..") || !allowedTypes.has(input.contentType)) {
    throw new Error("Nome ou tipo de arquivo não permitido.");
  }
  if (input.base64.length > 14_000_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.base64)) throw new Error("Arquivo inválido ou acima de 10 MB.");
  const bytes = Uint8Array.from(atob(input.base64), c => c.charCodeAt(0));
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error("O arquivo deve ter entre 1 byte e 10 MB.");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
  const { data: rows, error } = await v2Db.from("kevin_v2_connections")
    .select("id,remote_connection_id,local_app_id,remote_app_id,remote_origin,encrypted_shared_secret,status")
    .eq("status","connected").eq("remote_origin",central.origin).limit(2);
  if (error) throw error;
  if (!rows || rows.length !== 1 || !rows[0].remote_connection_id) throw new Error("Não existe um único pareamento bilateral ativo.");
  const connection = rows[0] as unknown as Connection;
  const identity = await getKevinV2Identity();
  const transferId = crypto.randomUUID();
  const objectPath = connection.id + "/" + transferId + "/" + fileName;
  const { error: uploadError } = await v2Db.storage.from("kevin-v2-files").upload(objectPath, bytes, { contentType: input.contentType, upsert: false });
  if (uploadError) throw uploadError;
  const { error: insertError } = await v2Db.from("kevin_v2_files").insert({
    transfer_id: transferId, connection_id: connection.id, source_app_id: identity.app_id,
    target_app_id: connection.remote_app_id, object_path: objectPath, file_name: fileName,
    content_type: input.contentType, size_bytes: bytes.length, sha256, direction: "outbound", status: "pending",
  });
  if (insertError) { await v2Db.storage.from("kevin-v2-files").remove([objectPath]); throw insertError; }
  const body = { transferId, fileName, contentType: input.contentType, base64: input.base64, sha256 };
  const pathAndQuery = "/api/public/kevin/v2/files";
  const timestamp = String(Math.floor(Date.now()/1000)), nonce = generateKevinNonce();
  const secret = await decryptKevinSecret(connection.encrypted_shared_secret, MASTER_KEY());
  const signature = await signKevinRequest({ secret, method:"POST", pathAndQuery, timestamp, nonce, body });
  try {
    const response = await fetch(new URL(pathAndQuery, central.origin), {
      method:"POST", headers: { "content-type":"application/json", "x-kevin-connection":connection.remote_connection_id,
        "x-kevin-timestamp":timestamp, "x-kevin-nonce":nonce, "x-kevin-signature":signature },
      body:JSON.stringify(body), redirect:"manual", signal:AbortSignal.timeout(30_000),
    });
    const result = await response.json().catch(()=>null) as {ok?:boolean;sha256?:string;status?:string}|null;
    if (!response.ok || result?.ok !== true || result.sha256 !== sha256 || result.status !== "verified") throw new Error("Central não confirmou a integridade do arquivo.");
    const { error: updateError } = await v2Db.from("kevin_v2_files").update({ status:"verified", verified_at:new Date().toISOString() })
      .eq("connection_id",connection.id).eq("transfer_id",transferId);
    if (updateError) throw updateError;
    await v2Db.from("kevin_v2_transfer_history").insert({ correlation_id:transferId, connection_id:connection.id,
      operation:"file_push", direction:"outbound", source_app_id:identity.app_id, target_app_id:connection.remote_app_id,
      item_count:1, status:"success", detail:fileName });
    return { ok:true, transferId, status:"verified", sizeBytes:bytes.length, sha256 };
  } catch (sendError) {
    await v2Db.from("kevin_v2_transfer_history").insert({ correlation_id:transferId, connection_id:connection.id,
      operation:"file_push", direction:"outbound", source_app_id:identity.app_id, target_app_id:connection.remote_app_id,
      item_count:0, status:"error", error_code:"FILE_PUSH_FAILED", detail:sendError instanceof Error ? sendError.message.slice(0,500) : "Falha no envio" });
    throw sendError;
  }
}


/** Reenvia arquivos pendentes preservando transfer_id, objeto e checksum. */
export async function retryKevinV2Files(limit = 10) {
  requireKevinV2Config();
  const identity = await getKevinV2Identity();
  const { data: pending, error: pendingError } = await v2Db.from("kevin_v2_files")
    .select("transfer_id,connection_id,object_path,file_name,content_type,size_bytes,sha256")
    .eq("direction", "outbound").eq("status", "pending").order("created_at", { ascending: true }).limit(Math.max(1, Math.min(10, limit)));
  if (pendingError) throw pendingError;
  const results: { transferId: string; status: "verified" | "pending"; error?: string }[] = [];
  for (const file of pending ?? []) {
    const transferId = String(file.transfer_id);
    const { data: priorErrors, error: historyReadError } = await v2Db.from("kevin_v2_transfer_history")
      .select("created_at").eq("correlation_id", transferId).eq("direction", "outbound")
      .eq("operation", "file_push").eq("status", "error").order("created_at", { ascending: false }).limit(6);
    if (historyReadError) throw historyReadError;
    const attempts = priorErrors?.length ?? 0;
    if (attempts >= 6) {
      results.push({ transferId, status: "pending", error: "Limite de seis tentativas atingido; requer intervenção manual." });
      continue;
    }
    const backoffMs = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000][Math.max(0, attempts - 1)] ?? 24 * 60 * 60_000;
    const lastAttempt = priorErrors?.[0]?.created_at ? Date.parse(priorErrors[0].created_at) : 0;
    if (lastAttempt && Date.now() - lastAttempt < backoffMs) {
      results.push({ transferId, status: "pending", error: "Aguardando intervalo de segurança antes da próxima tentativa." });
      continue;
    }
    try {
      const { data: connectionData, error: connectionError } = await v2Db.from("kevin_v2_connections")
        .select("id,remote_connection_id,remote_app_id,remote_origin,encrypted_shared_secret,status")
        .eq("id", file.connection_id).eq("status", "connected").maybeSingle();
      if (connectionError) throw connectionError;
      if (!connectionData || !connectionData.remote_connection_id) throw new Error("Conexão bilateral indisponível.");
      const connection = connectionData as unknown as Connection;
      const { data: blob, error: downloadError } = await v2Db.storage.from("kevin-v2-files").download(String(file.object_path));
      if (downloadError || !blob) throw new Error("Não foi possível recuperar o arquivo do armazenamento privado.");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.length !== Number(file.size_bytes) || bytes.length < 1 || bytes.length > 10 * 1024 * 1024) throw new Error("Tamanho do arquivo armazenado não confere.");
      const digestBytes = await crypto.subtle.digest("SHA-256", bytes);
      const sha256 = Array.from(new Uint8Array(digestBytes), b => b.toString(16).padStart(2, "0")).join("");
      if (sha256 !== String(file.sha256)) throw new Error("Checksum do arquivo armazenado não confere.");
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      const body = { transferId, fileName: String(file.file_name), contentType: String(file.content_type), base64: btoa(binary), sha256 };
      const pathAndQuery = "/api/public/kevin/v2/files";
      const timestamp = String(Math.floor(Date.now() / 1000)), nonce = generateKevinNonce();
      const secret = await decryptKevinSecret(connection.encrypted_shared_secret, MASTER_KEY());
      const signature = await signKevinRequest({ secret, method: "POST", pathAndQuery, timestamp, nonce, body });
      const response = await fetch(new URL(pathAndQuery, connection.remote_origin), {
        method: "POST", headers: { "content-type": "application/json", "x-kevin-connection": connection.remote_connection_id,
          "x-kevin-timestamp": timestamp, "x-kevin-nonce": nonce, "x-kevin-signature": signature },
        body: JSON.stringify(body), redirect: "manual", signal: AbortSignal.timeout(30_000),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; sha256?: string; status?: string } | null;
      if (!response.ok || result?.ok !== true || result.sha256 !== sha256 || result.status !== "verified") throw new Error("A Central não confirmou a integridade do arquivo.");
      const { error: updateError } = await v2Db.from("kevin_v2_files").update({ status: "verified", verified_at: new Date().toISOString() })
        .eq("connection_id", connection.id).eq("transfer_id", transferId).eq("status", "pending");
      if (updateError) throw updateError;
      const { error: historyError } = await v2Db.from("kevin_v2_transfer_history").insert({
        correlation_id: transferId, connection_id: connection.id, operation: "file_push", direction: "outbound",
        source_app_id: identity.app_id, target_app_id: connection.remote_app_id, item_count: 1, status: "success",
        detail: "retry:" + String(file.file_name),
      });
      if (historyError) throw historyError;
      results.push({ transferId, status: "verified" });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Falha no reenvio.";
      const { data: connectionData } = await v2Db.from("kevin_v2_connections").select("remote_app_id").eq("id", file.connection_id).maybeSingle();
      await v2Db.from("kevin_v2_transfer_history").insert({
        correlation_id: transferId, connection_id: file.connection_id, operation: "file_push", direction: "outbound",
        source_app_id: identity.app_id, target_app_id: connectionData?.remote_app_id ?? null,
        item_count: 0, status: "error", error_code: "FILE_RETRY_FAILED", detail: message,
      });
      results.push({ transferId, status: "pending", error: message });
    }
  }
  return { ok: true, checked: pending?.length ?? 0, verified: results.filter(item => item.status === "verified").length, pending: results.filter(item => item.status === "pending").length, results };
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
  let { data: outbox, error: outboxReadError } = await v2Db.from("kevin_v2_outbox")
    .select("id,event_id,entity_version,occurred_at")
    .eq("event_id", eventId).maybeSingle();
  if (outboxReadError) throw outboxReadError;
  if (!outbox) {
    const inserted = await v2Db.from("kevin_v2_outbox").insert({
      event_id: eventId, source_app_id: identity.app_id, category: "settings",
      source_record_id: "app-config-test", operation: "upsert",
      occurred_at: occurredAt, payload: { test: true, ping: "handshake-check" },
    }).select("id,event_id,entity_version,occurred_at").single();
    if (inserted.error && inserted.error.code !== "23505") throw inserted.error;
    if (inserted.data) outbox = inserted.data;
    else {
      const retry = await v2Db.from("kevin_v2_outbox").select("id,event_id,entity_version,occurred_at")
        .eq("event_id", eventId).single();
      if (retry.error) throw retry.error;
      outbox = retry.data;
    }
  }
  if (!outbox) throw new Error("Não foi possível persistir o evento de saída.");
  const event = await createKevinEnvelope({
    eventId: String(outbox.event_id),
    sourceAppId: String(identity.app_id),
    sourceAppName: String(identity.app_name),
    category: "settings",
    recordId: "app-config-test",
    operation: "upsert",
    entityVersion: Number(outbox.entity_version),
    occurredAt: String(outbox.occurred_at),
    payload: { test: true, ping: "handshake-check" },
  });
  const { error: checksumError } = await v2Db.from("kevin_v2_outbox")
    .update({ checksum: event.checksum, payload: { test: true, ping: "handshake-check" } })
    .eq("id", outbox.id);
  if (checksumError) throw checksumError;

  let { data: delivery, error: deliveryReadError } = await v2Db.from("kevin_v2_deliveries")
    .select("id,attempts,status").eq("outbox_id", outbox.id).eq("connection_id", connection.id).maybeSingle();
  if (deliveryReadError) throw deliveryReadError;
  if (!delivery) {
    const insertedDelivery = await v2Db.from("kevin_v2_deliveries").insert({
      outbox_id: outbox.id, connection_id: connection.id, status: "pending",
    }).select("id,attempts,status").single();
    if (insertedDelivery.error && insertedDelivery.error.code !== "23505") throw insertedDelivery.error;
    if (insertedDelivery.data) delivery = insertedDelivery.data;
    else {
      const retry = await v2Db.from("kevin_v2_deliveries").select("id,attempts,status")
        .eq("outbox_id", outbox.id).eq("connection_id", connection.id).single();
      if (retry.error) throw retry.error;
      delivery = retry.data;
    }
  }
  if (!delivery) throw new Error("Não foi possível persistir a entrega.");
  const nextAttempt = Number(delivery.attempts ?? 0) + 1;
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
    const { error: deliveryUpdateError } = await v2Db.from("kevin_v2_deliveries").update(success
      ? { status: "delivered", delivered_at: new Date().toISOString(), lease_until: null, attempts: nextAttempt, last_error_code: null, last_error_message: null }
      : { status: "pending", attempts: nextAttempt, last_error_code: "REMOTE_REJECTED", last_error_message: JSON.stringify(responseBody).slice(0, 500) })
      .eq("id", delivery.id);
    if (deliveryUpdateError) throw deliveryUpdateError;
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
    await v2Db.from("kevin_v2_deliveries").update({
      status: "pending", attempts: nextAttempt,
      last_error_code: "NETWORK_OR_PROCESSING_ERROR",
      last_error_message: error instanceof Error ? error.message.slice(0, 500) : "Falha no envio.",
    }).eq("id", delivery.id);
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
        try {
          await v2Db.from("kevin_v2_inbox").update({
            status: "rejected", error_code: "PROCESSING_FAILED",
          }).eq("source_app_id", event.sourceAppId).eq("event_id", event.eventId)
            .in("status", ["received", "rejected"]);
        } catch {
          // A still-received row remains retryable; preserve the original processing error.
        }
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


/** Polls Central for explicitly approved, allowlisted commands and returns signed execution ACKs. */
export async function pollCentralKevinV2Commands() {
  requireKevinV2Config();
  const centralOrigin = process.env.KEVIN_CENTRAL_ORIGIN ?? "";
  if (!centralOrigin) throw new Error("KEVIN_CENTRAL_ORIGIN não configurada.");
  const central = new URL(normalizeKevinOrigin(centralOrigin));
  const { data: rows, error } = await v2Db.from("kevin_v2_connections")
    .select("id,remote_connection_id,remote_app_id,remote_name,remote_origin,scopes,encrypted_shared_secret,status")
    .eq("status", "connected").eq("remote_origin", central.origin).limit(2);
  if (error) throw error;
  if (!rows || rows.length !== 1) throw new Error("É necessário exatamente um pareamento ativo com a Central Kevin.");
  const connection = rows[0] as unknown as Connection;
  if (!connection.remote_connection_id) throw new Error("ID remoto ausente; refaça a confirmação bilateral.");
  if (!connection.scopes.includes("settings")) throw new Error("A conexão não possui o escopo settings.");
  const secret = await decryptKevinSecret(connection.encrypted_shared_secret, MASTER_KEY());

  const pullPath = "/api/public/kevin/v2/commands/pull";
  const pullBody = { limit: 5 };
  const pullTimestamp = String(Math.floor(Date.now() / 1000));
  const pullNonce = generateKevinNonce();
  const pullSignature = await signKevinRequest({
    secret, method: "POST", pathAndQuery: pullPath,
    timestamp: pullTimestamp, nonce: pullNonce, body: pullBody,
  });
  const pullResponse = await fetch(new URL(pullPath, central.origin), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-kevin-connection": connection.remote_connection_id,
      "x-kevin-timestamp": pullTimestamp,
      "x-kevin-nonce": pullNonce,
      "x-kevin-signature": pullSignature,
    },
    body: JSON.stringify(pullBody),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const pulled: unknown = await pullResponse.json().catch(() => null);
  if (!pullResponse.ok || !isRecord(pulled) || pulled.ok !== true || !Array.isArray(pulled.commands)) {
    throw new Error("A Central não entregou uma fila de comandos válida.");
  }

  const identity = await getKevinV2Identity();
  const results: { commandId: string; status: string }[] = [];
  for (const raw of pulled.commands) {
    if (!isRecord(raw) || typeof raw.id !== "string" || !/^[0-9a-f-]{36}$/i.test(raw.id)) continue;
    let status: "succeeded" | "failed" | "rejected" = "rejected";
    let result: Record<string, unknown> = { error: "Comando não suportado por esta versão." };
    if (raw.command_type === "system.ping") {
      status = "succeeded";
      result = {
        appId: identity.app_id,
        appSlug: identity.app_slug,
        appName: identity.app_name,
        appVersion: identity.app_version,
        protocol: KEVIN_PROTOCOL,
        checkedAt: new Date().toISOString(),
      };
    }
    const ackBody = { commandId: raw.id, status, result };
    const ackPath = "/api/public/kevin/v2/commands/ack";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = generateKevinNonce();
    const signature = await signKevinRequest({
      secret, method: "POST", pathAndQuery: ackPath, timestamp, nonce, body: ackBody,
    });
    const ackResponse = await fetch(new URL(ackPath, central.origin), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-kevin-connection": connection.remote_connection_id,
        "x-kevin-timestamp": timestamp,
        "x-kevin-nonce": nonce,
        "x-kevin-signature": signature,
      },
      body: JSON.stringify(ackBody),
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const ack = await ackResponse.json().catch(() => null);
    if (!ackResponse.ok || !isRecord(ack) || ack.ok !== true) {
      throw new Error("A Central não confirmou a execução do comando " + raw.id + ".");
    }
    const { error: historyError } = await v2Db.from("kevin_v2_transfer_history").insert({
      correlation_id: crypto.randomUUID(),
      connection_id: connection.id,
      operation: "command",
      direction: "inbound",
      source_app_id: connection.remote_app_id,
      target_app_id: connection.local_app_id,
      category: "settings",
      item_count: 1,
      status: status === "succeeded" ? "success" : "rejected",
      error_code: status === "succeeded" ? null : "COMMAND_" + status.toUpperCase(),
      detail: "Central command " + raw.id + " (" + String(raw.command_type) + ") => " + status,
    });
    if (historyError) throw historyError;
    results.push({ commandId: raw.id, status });
  }
  return { received: results.length, results };
}
