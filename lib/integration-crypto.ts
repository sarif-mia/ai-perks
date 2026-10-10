function decodeHex(value: string) {
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new Error("Integration encryption key must be 32 bytes");
  return Uint8Array.from(value.match(/.{2}/g)!, (v) => parseInt(v, 16));
}
function base64(value: Uint8Array) {
  return btoa(Array.from(value, (n) => String.fromCharCode(n)).join(""));
}
function unbase64(value: string) {
  return Uint8Array.from(atob(value), (v) => v.charCodeAt(0));
}
export async function encryptCredentials(value: unknown, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    decodeHex(secret),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return base64(iv) + "." + base64(new Uint8Array(ciphertext));
}
export async function decryptCredentials<T>(
  value: string,
  secret: string,
): Promise<T> {
  const [iv, body] = value.split(".");
  const key = await crypto.subtle.importKey(
    "raw",
    decodeHex(secret),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unbase64(iv) },
    key,
    unbase64(body),
  );
  return JSON.parse(new TextDecoder().decode(clear)) as T;
}
