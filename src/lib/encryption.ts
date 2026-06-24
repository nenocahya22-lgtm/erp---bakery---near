/**
 * Encryption Utility — Web Crypto API AES-GCM
 * 
 * Mengenkripsi data sensitif sebelum disimpan ke localStorage.
 * Key diturunkan dari password owner menggunakan PBKDF2.
 * 
 * Format tersimpan: "enc:{iv_base64}:{ciphertext_base64}"
 * 
 * Keamanan:
 * - AES-GCM 256-bit (NIST standar)
 * - IV (Initialization Vector) unik tiap enkripsi
 * - Key tidak pernah disimpan di localStorage — hanya di memory
 * - Auto-lock jika key tidak di-set (tidak bisa baca/tulis data terenkripsi)
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100_000;
const SALT = 'erp-bakery-localstorage-v1'; // Static salt — aman karena output sudah dienkripsi AES

// ─── IN-MEMORY KEY STORE ───
// Key hanya disimpan di runtime memory, tidak pernah dipersist
let encryptionKey: CryptoKey | null = null;
let isLocked = true;

/**
 * Base64 encode/decode untuk ArrayBuffer
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Inisialisasi key dari password owner.
 * Panggil ini saat user login — key akan tersimpan di memory.
 */
export async function initEncryption(password: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(SALT),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: ALGORITHM,
        length: KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt']
    );

    isLocked = false;
    return true;
  } catch (err) {
    console.error('[Encryption] Gagal inisialisasi key:', err);
    return false;
  }
}

/**
 * Kunci enkripsi — hapus key dari memory.
 * Panggil saat user logout.
 */
export function lockEncryption(): void {
  encryptionKey = null;
  isLocked = true;
}

/**
 * Cek apakah enkripsi aktif (key sudah di-set)
 */
export function isEncryptionActive(): boolean {
  return !isLocked && encryptionKey !== null;
}

/**
 * Enkripsi string → format "enc:{iv_base64}:{ciphertext_base64}"
 * Returns string original jika enkripsi tidak aktif (fallback)
 */
export async function encryptData(plaintext: string): Promise<string> {
  if (isLocked || !encryptionKey) {
    console.warn('[Encryption] Key tidak tersedia — data disimpan tanpa enkripsi.');
    return plaintext;
  }

  try {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV untuk GCM
    
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
      },
      encryptionKey,
      encoder.encode(plaintext)
    );

    const ivBase64 = arrayBufferToBase64(iv.buffer);
    const cipherBase64 = arrayBufferToBase64(ciphertext);

    return `enc:${ivBase64}:${cipherBase64}`;
  } catch (err) {
    console.error('[Encryption] Gagal enkripsi:', err);
    return plaintext; // Fallback ke plaintext jika gagal
  }
}

/**
 * Dekripsi string format "enc:{iv_base64}:{ciphertext_base64}"
 * Returns string original jika format tidak sesuai atau enkripsi tidak aktif
 */
export async function decryptData(encrypted: string): Promise<string> {
  // Jika bukan format terenkripsi, kembalikan aslinya
  if (!encrypted.startsWith('enc:')) {
    return encrypted;
  }

  if (isLocked || !encryptionKey) {
    console.warn('[Encryption] Key tidak tersedia — tidak bisa dekripsi.');
    return encrypted;
  }

  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      console.warn('[Encryption] Format data terenkripsi tidak valid.');
      return encrypted;
    }

    const [, ivBase64, cipherBase64] = parts;
    const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
    const ciphertext = base64ToArrayBuffer(cipherBase64);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      encryptionKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (err) {
    console.error('[Encryption] Gagal dekripsi:', err);
    return encrypted; // Fallback ke ciphertext jika gagal
  }
}

/**
 * Enkripsi data JSON dan simpan ke localStorage.
 * Key otomatis dibuat dari password owner hash.
 */
export async function encryptAndSaveToLocalStorage(
  key: string,
  data: unknown,
  useEncryption: boolean = true
): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(data);
    
    if (useEncryption && !isLocked && encryptionKey) {
      const encrypted = await encryptData(jsonString);
      localStorage.setItem(key, encrypted);
    } else {
      localStorage.setItem(key, jsonString);
    }
    
    return true;
  } catch (err) {
    console.warn(`[Encryption] Gagal simpan key "${key}":`, err);
    return false;
  }
}

/**
 * Baca dan dekripsi data dari localStorage.
 */
export async function decryptFromLocalStorage<T>(
  key: string,
  fallback: T
): Promise<T> {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null || saved === undefined) return fallback;

    // Coba parse langsung (data tidak terenkripsi)
    if (!saved.startsWith('enc:')) {
      return JSON.parse(saved) as T;
    }

    // Data terenkripsi — dekripsi dulu
    if (isLocked || !encryptionKey) {
      console.warn(`[Encryption] Key tidak tersedia — tidak bisa baca "${key}".`);
      return fallback;
    }

    const decrypted = await decryptData(saved);
    return JSON.parse(decrypted) as T;
  } catch (err) {
    console.warn(`[Encryption] Gagal baca key "${key}":`, err);
    return fallback;
  }
}

/**
 * Update status enkripsi semua data yang sudah tersimpan.
 * Berguna saat user mengganti password.
 */
export async function reEncryptAllData(oldPassword: string, newPassword: string): Promise<boolean> {
  try {
    // Init dengan password lama
    await initEncryption(oldPassword);
    if (isLocked) return false;

    // Baca semua key yang terenkripsi
    const encryptedKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key);
      if (value && value.startsWith('enc:')) {
        encryptedKeys.push(key);
      }
    }

    if (encryptedKeys.length === 0) return true;

    // Dekripsi semua data dengan key lama
    const decryptedData: Record<string, unknown> = {};
    for (const key of encryptedKeys) {
      const raw = localStorage.getItem(key) || '';
      const decrypted = await decryptData(raw);
      try {
        decryptedData[key] = JSON.parse(decrypted);
      } catch {
        decryptedData[key] = decrypted;
      }
    }

    // Init ulang dengan password baru
    lockEncryption();
    await initEncryption(newPassword);
    if (isLocked) return false;

    // Enkripsi ulang dengan key baru
    for (const [key, data] of Object.entries(decryptedData)) {
      await encryptAndSaveToLocalStorage(key, data, true);
    }

    return true;
  } catch (err) {
    console.error('[Encryption] Gagal re-encrypt data:', err);
    return false;
  }
}
