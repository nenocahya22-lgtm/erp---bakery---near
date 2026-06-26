/**
 * Payment Proof — Upload Bukti Transfer (Sisi Customer / Web Store Frontend)
 * ============================================================================
 * ALTERNATIF TANPA FIREBASE STORAGE:
 * Gambar dikompres via Canvas API, dikonversi ke base64, dan disimpan LANGSUNG
 * di Firestore. Tidak perlu billing account, tidak perlu setup Storage.
 *
 * Auto-kompresi:
 *   - Foto HP (3-5MB) → otomatis di-resize + dikompres ke JPEG kwalitas rendah
 *   - Target: < 600KB binary → ~820KB base64 → aman di bawah 1MB Firestore
 *
 * Flow:
 *   1. Customer pilih file gambar (mentah, berapa pun ukurannya)
 *   2. File dikompres via Canvas API (resize + JPEG compression)
 *   3. Hasil kompresi dikonversi ke base64 (data URL)
 *   4. Base64 string disimpan ke Firestore: orders/{orderId}.paymentProofUrl
 *   5. Admin ERP membaca langsung dari Firestore
 */

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firestore-bridge';

// ─── KONFIGURASI KOMPRESI ───
const MAX_FILE_SIZE = 600 * 1024;      // 600 KB target akhir
const MAX_DIMENSION = 1600;            // Resize ke max 1600px di sisi terpanjang
const INITIAL_QUALITY = 0.8;           // Kwalitas JPEG awal
const MIN_QUALITY = 0.2;               // Kwalitas minimum (berhenti jika sudah terlalu rendah)

// ─── PUBLIC API ───

export interface UploadResult {
  success: boolean;
  downloadUrl?: string;
  message: string;
}

/**
 * Upload bukti transfer — ALTERNATIF TANPA FIREBASE STORAGE.
 * Gambar otomatis dikompres via Canvas API, lalu dikonversi ke base64
 * dan disimpan langsung di Firestore.
 *
 * @param orderId - ID order dari Firestore
 * @param file - File gambar (JPEG/PNG, otomatis dikompres)
 * @param onProgress - Callback progress (0-100) — estimasi, bukan real-time
 * @returns UploadResult — { success, downloadUrl, message }
 */
export async function uploadPaymentProofCustomer(
  orderId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  // ─── VALIDASI ───
  if (!file) {
    return { success: false, message: 'File tidak ditemukan.' };
  }
  if (!file.type.startsWith('image/')) {
    return { success: false, message: '❌ File harus berupa gambar (JPG/PNG).' };
  }

  try {
    // ─── KOMPRESI GAMBAR VIA CANVAS API ───
    onProgress?.(10);

    const compressedBlob = await compressImage(file, MAX_FILE_SIZE, MAX_DIMENSION, onProgress);

    // Jika kompresi gagal (blob lebih besar dari target), tetap lanjut
    // dengan hasil terbaik yang bisa dicapai
    onProgress?.(70);

    // ─── KONVERSI KE BASE64 ───
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(compressedBlob);
    });

    // ─── VALIDASI UKURAN BASE64 ───
    const base64Size = new Blob([base64]).size;
    if (base64Size > 900 * 1024) {
      return {
        success: false,
        message: '❌ Gambar terlalu besar meskipun sudah dikompres. Coba gunakan gambar dengan resolusi lebih rendah.'
      };
    }

    onProgress?.(85);

    // ─── SIMPAN KE FIRESTORE ───
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(
      orderRef,
      {
        paymentProofUrl: base64,
        paymentStatus: 'Belum Bayar',
        proofNeedsReview: true,
        proofUploadedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    onProgress?.(100);

    return {
      success: true,
      downloadUrl: base64,
      message: '✅ Bukti transfer berhasil diupload! Kami akan verifikasi dalam 1×24 jam.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || '❌ Gagal upload. Silakan coba lagi.',
    };
  }
}

/**
 * Kompres gambar via Canvas API — auto-resize + turunkan kwalitas JPEG
 * sampai ukuran di bawah target. Cocok untuk foto HP (3-5MB → < 600KB).
 *
 * @param file - File gambar asli
 * @param maxSizeBytes - Target ukuran maksimal (default 600KB)
 * @param maxDimension - Resize sisi terpanjang (default 1600px)
 * @param onProgress - Callback progress opsional
 * @returns Blok hasil kompresi (JPEG)
 */
export async function compressImage(
  file: File,
  maxSizeBytes: number = MAX_FILE_SIZE,
  maxDimension: number = MAX_DIMENSION,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  // Jika file sudah di bawah target, pakai asli (tidak perlu kompres)
  if (file.size <= maxSizeBytes) {
    onProgress?.(40);
    return file;
  }

  // Muat gambar ke Image element
  const img = await createImageFromFile(file);
  onProgress?.(25);

  // Hitung dimensi baru — resize proporsional
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Buat Canvas untuk kompresi
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  // Kompresi bertahap: turunkan kwalitas sampai ukuran di bawah target
  let quality = INITIAL_QUALITY;
  let blob: Blob | null = null;

  while (quality >= MIN_QUALITY) {
    blob = await canvasToBlob(canvas, quality);
    if (blob.size <= maxSizeBytes) {
      break; // Sudah di bawah target
    }
    quality -= 0.1; // Turunkan kwalitas 10%
  }

  onProgress?.(50);

  // Fallback: jika masih terlalu besar walau kwalitas minimum,
  // resize lagi ke dimensi lebih kecil
  if (blob && blob.size > maxSizeBytes && (width > 800 || height > 800)) {
    // Coba resize ke 800px dengan kwalitas 0.5
    const scale = Math.min(800 / width, 800 / height, 0.7);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, 0.5);

    // Iterasi lagi
    quality = 0.5;
    while (quality >= MIN_QUALITY && blob.size > maxSizeBytes) {
      blob = await canvasToBlob(canvas, quality);
      quality -= 0.1;
    }
  }

  onProgress?.(60);

  return blob || new Blob([await file.arrayBuffer()], { type: 'image/jpeg' });
}

// ─── HELPER ───

function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal memuat gambar'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Gagal mengompres gambar'));
      },
      'image/jpeg',
      quality,
    );
  });
}

// ─── CEK STATUS ───

/**
 * Cek apakah order sudah punya bukti transfer
 */
export async function getPaymentProofStatus(
  orderId: string
): Promise<{
  hasProof: boolean;
  proofUrl: string | null;
  paymentStatus: string;
  status: string;
}> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) {
      return { hasProof: false, proofUrl: null, paymentStatus: '', status: '' };
    }
    const data = snap.data();
    return {
      hasProof: !!data.paymentProofUrl,
      proofUrl: data.paymentProofUrl || null,
      paymentStatus: data.paymentStatus || 'Belum Bayar',
      status: data.status || 'Menunggu Pembayaran',
    };
  } catch {
    return { hasProof: false, proofUrl: null, paymentStatus: '', status: '' };
  }
}

/**
 * Hapus bukti transfer (customer batalkan upload)
 */
export async function removePaymentProofCustomer(
  orderId: string
): Promise<UploadResult> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(
      orderRef,
      {
        paymentProofUrl: '',
        proofNeedsReview: false,
      },
      { merge: true }
    );
    return { success: true, message: '✅ Bukti transfer dihapus.' };
  } catch (err: any) {
    return {
      success: false,
      message: '❌ Gagal menghapus: ' + (err.message || 'Unknown error'),
    };
  }
}
