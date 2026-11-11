/** Shared, secret-free contract for Sistema Kevin v2. */
export const KEVIN_PROTOCOL = "kevin-protocol/2" as const;
export const KEVIN_ECOSYSTEM = "kevin" as const;
export const MAX_EVENT_BYTES = 256 * 1024;
export const MAX_BATCH_SIZE = 100;
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export const KEVIN_CATEGORIES = [
  "users", "customers", "couriers", "orders", "reviews",
  "complaints", "settings", "reports", "statistics", "content",
] as const;
export type KevinCategory = (typeof KEVIN_CATEGORIES)[number];
export type KevinOperation = "upsert" | "delete";

export interface KevinIdentity {
  id: string; slug: string; name: string; version: string;
  protocol: typeof KEVIN_PROTOCOL; ecosystem: typeof KEVIN_ECOSYSTEM; origin: string;
}
export interface KevinManifest {
  identity: KevinIdentity; generatedAt: string; modules: string[];
  userTypes: string[]; permissions: string[]; features: string[];
  dataScopes: KevinCategory[]; schemaVersions: Record<string, number>;
  capabilities: {
    receiveEvents: boolean; sendEvents: boolean; pullChanges: boolean;
    adminCommands: boolean; codeLearning: boolean; moduleImport: boolean;
  };
}
export interface KevinEventEnvelope<T = unknown> {
  protocol: typeof KEVIN_PROTOCOL; eventId: string; sourceAppId: string;
  sourceAppName: string; category: KevinCategory; recordId: string;
  operation: KevinOperation; entityVersion: number; occurredAt: string;
  checksum: string; payload: T | null;
}
export interface KevinApiError {
  ok: false;
  error: { code: string; message: string; retryable: boolean; correlationId: string };
}
export interface KevinApiSuccess<T> {
  ok: true; data: T; correlationId: string;
}

export function isKevinCategory(value: unknown): value is KevinCategory {
  return typeof value === "string" && (KEVIN_CATEGORIES as readonly string[]).includes(value);
}
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Número não finito no payload Kevin.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (isPlainRecord(value)) {
    const entries = Object.keys(value).sort().filter((k) => value[k] !== undefined)
      .map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k]));
    return "{" + entries.join(",") + "}";
  }
  throw new Error("Payload contém tipo não serializável.");
}
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
export function constantTimeStringEqual(a: string, b: string): boolean {
  const aa = new TextEncoder().encode(a), bb = new TextEncoder().encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}
export async function createKevinEnvelope<T>(
  input: Omit<KevinEventEnvelope<T>, "protocol" | "checksum">,
): Promise<KevinEventEnvelope<T>> {
  if (!isKevinCategory(input.category)) throw new Error("Categoria Kevin inválida.");
  if (!input.eventId || !input.sourceAppId || !input.recordId) throw new Error("Identificadores obrigatórios.");
  if (!Number.isSafeInteger(input.entityVersion) || input.entityVersion < 1) throw new Error("Versão inválida.");
  if (input.operation === "delete" && input.payload !== null) throw new Error("Delete deve ter payload null.");
  const unsigned = { ...input, protocol: KEVIN_PROTOCOL };
  const serialized = canonicalJson(unsigned);
  if (new TextEncoder().encode(serialized).byteLength > MAX_EVENT_BYTES) throw new Error("Evento excede limite.");
  return { ...unsigned, checksum: await sha256Hex(serialized) };
}
export async function validateKevinEnvelope(value: unknown): Promise<KevinEventEnvelope> {
  if (!isPlainRecord(value)) throw new Error("Envelope inválido.");
  const v = value as Record<string, unknown>;
  if (v.protocol !== KEVIN_PROTOCOL || typeof v.eventId !== "string" ||
      typeof v.sourceAppId !== "string" || typeof v.sourceAppName !== "string" ||
      !isKevinCategory(v.category) || typeof v.recordId !== "string" ||
      (v.operation !== "upsert" && v.operation !== "delete") ||
      !Number.isSafeInteger(v.entityVersion) || Number(v.entityVersion) < 1 ||
      typeof v.occurredAt !== "string" || Number.isNaN(Date.parse(v.occurredAt)) ||
      typeof v.checksum !== "string" || !/^[a-f0-9]{64}$/.test(v.checksum)) {
    throw new Error("Campos do envelope inválidos.");
  }
  if (v.operation === "delete" && v.payload !== null) throw new Error("Delete deve ter payload null.");
  const { checksum, ...unsigned } = v;
  const serialized = canonicalJson(unsigned);
  if (new TextEncoder().encode(serialized).byteLength > MAX_EVENT_BYTES) throw new Error("Evento excede limite.");
  if (!constantTimeStringEqual(await sha256Hex(serialized), checksum)) throw new Error("Checksum não confere.");
  return v as unknown as KevinEventEnvelope;
}
/** Bloqueia esquemas/hosts locais óbvios. Egress firewall ainda é necessário contra DNS rebinding/SSRF. */
export function normalizeKevinOrigin(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("URL remota inválida."); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      (url.pathname !== "/" && url.pathname !== "") ||
      host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      host === "0.0.0.0" || host === "::1" || /^127\./.test(host) ||
      /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error("Origem HTTPS pública obrigatória; endereços locais não são aceitos.");
  }
  return url.origin;
}
export function newKevinId(): string { return crypto.randomUUID(); }
