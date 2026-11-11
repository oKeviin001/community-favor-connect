/** SERVER-ONLY. Never import this module into browser components. */
import { canonicalJson, sha256Hex, SIGNATURE_TOLERANCE_SECONDS } from "./protocol";

const enc = new TextEncoder();
function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function unhex(value: string): Uint8Array {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2) throw new Error("Segredo inválido.");
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return out;
}
async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", unhex(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export function generateKevinSecret(): string { return hex(crypto.getRandomValues(new Uint8Array(32))); }
export function generateKevinNonce(): string { return hex(crypto.getRandomValues(new Uint8Array(16))); }

function signatureMessage(method: string, path: string, timestamp: string, nonce: string, bodyHash: string): string {
  return [method.toUpperCase(), path, timestamp, nonce, bodyHash].join("\n");
}
export async function signKevinRequest(input: {
  secret: string; method: string; pathAndQuery: string; timestamp: string; nonce: string; body: unknown;
}): Promise<string> {
  const hash = await sha256Hex(canonicalJson(input.body ?? null));
  const signed = signatureMessage(input.method, input.pathAndQuery, input.timestamp, input.nonce, hash);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(input.secret), enc.encode(signed))));
}
export async function verifyKevinRequest(input: {
  secret: string; method: string; pathAndQuery: string; timestamp: string; nonce: string;
  body: unknown; signature: string; nowMs?: number;
}): Promise<boolean> {
  const ts = Number(input.timestamp) * 1000, now = input.nowMs ?? Date.now();
  if (!Number.isFinite(ts) || Math.abs(now - ts) > SIGNATURE_TOLERANCE_SECONDS * 1000 ||
      !/^[a-f0-9]{64}$/i.test(input.signature)) return false;
  const hash = await sha256Hex(canonicalJson(input.body ?? null));
  const signed = signatureMessage(input.method, input.pathAndQuery, input.timestamp, input.nonce, hash);
  try {
    return await crypto.subtle.verify("HMAC", await hmacKey(input.secret), unhex(input.signature), enc.encode(signed));
  } catch { return false; }
}
/** KEVIN_MASTER_KEY: 32 bytes encoded as 64 hexadecimal characters, server secret only. */
export async function encryptKevinSecret(secret: string, masterKeyHex: string): Promise<string> {
  const rawKey = unhex(masterKeyHex);
  if (rawKey.length !== 32) throw new Error("KEVIN_MASTER_KEY deve ter 32 bytes.");
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, unhex(secret));
  return "v1." + hex(iv) + "." + hex(new Uint8Array(cipher));
}
export async function decryptKevinSecret(ciphertext: string, masterKeyHex: string): Promise<string> {
  const [version, iv, body] = ciphertext.split(".");
  if (version !== "v1" || !iv || !body) throw new Error("Ciphertext inválido.");
  const rawKey = unhex(masterKeyHex);
  if (rawKey.length !== 32) throw new Error("KEVIN_MASTER_KEY deve ter 32 bytes.");
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unhex(iv) }, key, unhex(body));
  return hex(new Uint8Array(plain));
}
