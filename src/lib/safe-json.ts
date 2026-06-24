/**
 * Safe JSON parse — mencegah crash aplikasi jika localStorage corrupted.
 * Selalu gunakan ini untuk parsing JSON dari penyimpanan eksternal (localStorage, API).
 */
export function safeParseJSON<T>(jsonString: string | null, fallback: T): T {
  if (jsonString === null || jsonString === undefined) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.warn('[safeParseJSON] Gagal parse JSON, pakai fallback:', e);
    return fallback;
  }
}

/**
 * Safe localStorage getter — ambil item dan parse JSON dengan aman.
 */
export function safeGetLocalStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return safeParseJSON<T>(saved, fallback);
  } catch (e) {
    console.warn(`[safeGetLocalStorage] Gagal baca key "${key}":`, e);
    return fallback;
  }
}

/**
 * Safe localStorage setter — stringify JSON dengan try-catch.
 */
export function safeSetLocalStorage(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`[safeSetLocalStorage] Gagal simpan key "${key}":`, e);
    return false;
  }
}

/**
 * Encrypted localStorage setter — enkripsi data sensitif sebelum disimpan.
 * Gunakan untuk data seperti password hash, token, dan data keuangan.
 * Falls back ke plain JSON jika enkripsi tidak tersedia.
 * 
 * Catatan: Enkripsi hanya aktif setelah initEncryption() dipanggil (saat login Owner).
 * Lihat src/lib/encryption.ts untuk detail.
 */
export async function safeSetEncrypted(key: string, value: unknown): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(value);
    // Encryption module di-import static — tidak perlu dynamic import
    const { encryptData, isEncryptionActive } = await import('./encryption');
    if (isEncryptionActive()) {
      const encrypted = await encryptData(jsonString);
      localStorage.setItem(key, encrypted);
    } else {
      localStorage.setItem(key, jsonString);
    }
    return true;
  } catch (e) {
    console.warn(`[safeSetEncrypted] Gagal simpan key "${key}":`, e);
    return false;
  }
}

/**
 * Encrypted localStorage getter — baca dan dekripsi data sensitif.
 * Falls back ke JSON.parse biasa jika data tidak terenkripsi.
 */
export async function safeGetEncrypted<T>(key: string, fallback: T): Promise<T> {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null || saved === undefined) return fallback;

    // Jika tidak terenkripsi, parse biasa
    if (!saved.startsWith('enc:')) {
      return JSON.parse(saved) as T;
    }

    // Data terenkripsi — dekripsi dulu
    const { decryptData, isEncryptionActive } = await import('./encryption');
    if (isEncryptionActive()) {
      const decrypted = await decryptData(saved);
      return JSON.parse(decrypted) as T;
    }

    return fallback;
  } catch (e) {
    console.warn(`[safeGetEncrypted] Gagal baca key "${key}":`, e);
    return fallback;
  }
}
