/**
 * Global Toast Utility — menggantikan window.alert() di seluruh aplikasi.
 * 
 * Cara pakai:
 *   import { showToast } from '../lib/toast';
 *   showToast('Pesan berhasil!', 'success');
 * 
 * Tidak perlu threading props — cukup import dan panggil.
 * Komponen <ToastListener /> dipasang di App.tsx untuk render UI toast.
 */

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastEventDetail {
  message: string;
  type: ToastType;
}

const TOAST_EVENT = 'app:toast';

/**
 * Tampilkan toast global — bisa dipanggil dari mana saja.
 * Alternatif modern untuk window.alert()
 */
export function showToast(message: string, type: ToastType = 'info'): void {
  window.dispatchEvent(
    new CustomEvent<ToastEventDetail>(TOAST_EVENT, {
      detail: { message, type },
    })
  );
}

