// ─── PASSWORD SECURITY — PBKDF2 ───
// Format: "pbkdf2:{salt_hex}:{hash_hex}"
// 100.000 iterasi PBKDF2 + SHA-256 — aman untuk browser

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function generateSalt(): string {
  const bytes = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function hashPbkdf2(password: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = hexToBytes(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

export function isPbkdf2Hash(stored: string): boolean {
  return stored.startsWith('pbkdf2:');
}

/** Hash password with PBKDF2 and return stored format "pbkdf2:{salt}:{hash}" */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await hashPbkdf2(password, salt);
  return `pbkdf2:${salt}:${hash}`;
}

/** Verify password against stored PBKDF2 hash, or legacy SHA-256 hash */
export async function verifyPassword(input: string, storedHash: string): Promise<boolean> {
  if (isPbkdf2Hash(storedHash)) {
    const parts = storedHash.split(':');
    if (parts.length === 3) {
      const [, salt, hash] = parts;
      const inputHash = await hashPbkdf2(input, salt);
      return inputHash === hash;
    }
    return false;
  }
  // Legacy SHA-256 fallback
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const inputSha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return inputSha256 === storedHash;
}
