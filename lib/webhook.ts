export async function verifySignature(
  raw: string,
  signature: string | null,
  secret: string,
) {
  if (!signature || !/^sha256=[0-9a-f]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const bytes = Uint8Array.from(
    signature
      .slice(7)
      .match(/.{2}/g)!
      .map((h) => parseInt(h, 16)),
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    new TextEncoder().encode(raw),
  );
}
