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
