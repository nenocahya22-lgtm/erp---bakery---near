/**
 * WebSerial Printer — Thermal Printer 58mm via Browser WebSerial API
 * ===================================================================
 * Mengirim ESC/POS commands langsung dari browser ke printer thermal
 * via Bluetooth serial (COM11) — tanpa Python, tanpa server lokal.
 *
 * Cara pakai:
 *   1. Klik "Hubungkan Printer" → pilih perangkat Bluetooth COM11
 *   2. Klik "Bill" di POS → struk langsung cetak dari browser
 *
 * Syarat: Chrome / Edge (WebSerial), HTTPS (Vercel sudah otomatis)
 */

import type { PrinterToko, PrinterTransaksi, PrinterItem } from './printer';

// ─── State: port yang sudah terkoneksi ───
let connectedPort: SerialPort | null = null;
let connectedWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;

// ─── ESC/POS CONSTANTS ───
const ESC = 0x1B;
const LF = 0x0A;

// ─── PUBLIC API ───

/** Cek apakah browser support WebSerial */
export function isWebSerialSupported(): boolean {
  return 'serial' in navigator;
}

/** Cek apakah sudah terkoneksi ke printer */
export function isPrinterConnected(): boolean {
  return connectedPort !== null && connectedWriter !== null;
}

/**
 * Minta koneksi ke printer Bluetooth via WebSerial.
 * Wajib dipanggil dari event click (user gesture).
 */
export async function connectPrinter(): Promise<{ success: boolean; message: string }> {
  if (!isWebSerialSupported()) {
    return { success: false, message: 'Browser tidak support WebSerial. Pakai Chrome/Edge versi terbaru.' };
  }

  try {
    // Minta user pilih perangkat serial (Bluetooth COM)
    const port = await navigator.serial.requestPort();

    // Buka port dengan baud rate 9600
    await port.open({ baudRate: 9600 });

    // Dapatkan writer untuk kirim data
    const writer = port.writable.getWriter();

    // Simpan state
    connectedPort = port;
    connectedWriter = writer;

    // Kirim INIT ke printer
    await sendRaw([
      ESC, 0x40,           // ESC @ — Initialize printer
      ESC, 0x32,           // ESC 2 — Line spacing default (30 dots)
      ESC, 0x33, 36,       // ESC 3 36 — Line spacing 36 dots
    ]);

    return { success: true, message: '✅ Printer Bluetooth terhubung!' };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, message: 'Tidak ada perangkat dipilih. Klik "Hubungkan Printer" lagi.' };
    }
    return { success: false, message: `Gagal konek: ${err.message || err}` };
  }
}

/**
 * Putuskan koneksi printer
 */
export async function disconnectPrinter(): Promise<void> {
  try {
    if (connectedWriter) {
      connectedWriter.releaseLock();
      connectedWriter = null;
    }
    if (connectedPort) {
      await connectedPort.close();
      connectedPort = null;
    }
  } catch (e) {
    console.warn('Disconnect printer error:', e);
  }
}

/**
 * Cetak struk thermal langsung via WebSerial.
 * @returns {success, message}
 */
export async function cetakWebSerial(
  transaksi: PrinterTransaksi,
  items: PrinterItem[],
  toko?: Partial<PrinterToko>,
): Promise<{ success: boolean; message: string }> {
  if (!isPrinterConnected()) {
    return { success: false, message: 'Printer belum terhubung. Klik "Hubungkan Printer" dulu.' };
  }

  const t: PrinterToko = {
    nama: toko?.nama || 'NEAR BAKERY & CO.',
    alamat: toko?.alamat || '',
    kontak: toko?.kontak || '',
    footer_1: toko?.footer_1 || 'Terima kasih!',
    footer_2: toko?.footer_2 || 'Near Bakery & Co.',
  };

  try {
    const LEBAR = 32;

    // Helper: format harga
    const fmt = (n: number) => n >= 1000000 ? `Rp${Math.round(n / 1000)}K` : `Rp${n.toLocaleString('id-ID')}`;

    // Helper: tulis teks + LF
    const tulis = (teks: string) => {
      const bytes = new TextEncoder().encode(teks + '\n');
      return sendRaw(Array.from(bytes));
    };

    // Helper: tulis teks tanpa LF
    const tulisLangsung = (teks: string) => {
      return sendRaw(Array.from(new TextEncoder().encode(teks)));
    };

    // Helper: garis separator
    const garis = () => tulis('-'.repeat(LEBAR));

    // ─── 0. INIT ───
    await sendRaw([
      ESC, 0x40,           // ESC @ — Initialize
      ESC, 0x32,           // ESC 2 — line spacing default
      ESC, 0x33, 36,       // ESC 3 36 — line spacing 36 dots
    ]);

    // ─── 1. HEADER TOKO ───
    await sendRaw([
      ESC, 0x61, 0x01,     // ESC a 1 — Center align
      ESC, 0x21, 0x30,     // ESC ! 0x30 — Double width + height
    ]);
    await tulis(t.nama);

    await sendRaw([ESC, 0x61, 0x01]);  // Center
    await sendRaw([ESC, 0x21, 0x00]);  // Normal size
    if (t.alamat) await tulis(t.alamat);
    if (t.kontak) await tulis(t.kontak);
    await garis();

    // ─── 2. METADATA TRANSAKSI ───
    await sendRaw([ESC, 0x61, 0x00]);  // Left align
    if (transaksi.no_transaksi) await tulis(`No        : ${transaksi.no_transaksi}`);
    if (transaksi.pelanggan) await tulis(`Pelanggan : ${transaksi.pelanggan}`);
    if (transaksi.kasir) await tulis(`Kasir     : ${transaksi.kasir}`);
    if (transaksi.waktu) await tulis(`Waktu     : ${transaksi.waktu}`);
    await garis();

    // ─── 3. ITEM BELANJA ───
    for (const item of items) {
      const teksProduk = `${item.qty} ${item.satuan} ${item.nama}`;
      const teksHarga = fmt(item.harga);
      const sisa = LEBAR - teksProduk.length - teksHarga.length;

      if (sisa >= 0) {
        await tulis(teksProduk + ' '.repeat(sisa) + teksHarga);
      } else {
        const potong = teksProduk.slice(0, LEBAR - teksHarga.length - 3) + '..';
        const sisa2 = LEBAR - potong.length - teksHarga.length;
        await tulis(potong + ' '.repeat(sisa2) + teksHarga);
      }
    }
    await garis();

    // ─── 4. TOTAL ───
    await sendRaw([ESC, 0x61, 0x02]);  // Right align
    await sendRaw([ESC, 0x45, 0x01]);  // ESC E 1 — Bold ON
    await sendRaw([ESC, 0x21, 0x08]);  // ESC ! 0x08 — Bold (some printers)
    await tulis(`TOTAL     : ${fmt(transaksi.total_harga)}`);
    await sendRaw([ESC, 0x45, 0x00]);  // ESC E 0 — Bold OFF

    // ─── 5. PEMBAYARAN ───
    await sendRaw([ESC, 0x61, 0x02]);  // Right align
    if (transaksi.metode_bayar) await tulis(`Bayar (${transaksi.metode_bayar})`);
    if (transaksi.uang_dibayar && transaksi.uang_dibayar > 0) await tulis(`Tunai     : ${fmt(transaksi.uang_dibayar)}`);
    if (transaksi.kembalian && transaksi.kembalian > 0) await tulis(`Kembali   : ${fmt(transaksi.kembalian)}`);
    await tulis('');

    // ─── 6. FOOTER ───
    await sendRaw([ESC, 0x61, 0x01]);  // Center
    if (t.footer_1) await tulis(t.footer_1);
    if (t.footer_2) await tulis(t.footer_2);

    // ─── 7. POTONG KERTAS ───
    await tulis('');
    await tulis('');
    await tulis('');
    await sendRaw([
      ESC, 0x6D,           // ESC m — Partial cut (most common)
      // Or: GS V m — Full cut
      // 0x1D, 0x56, 0x00,
    ]);

    return { success: true, message: '✅ Struk berhasil dicetak via WebSerial!' };
  } catch (err: any) {
    // Jika koneksi putus, reset state
    if (err.message?.includes('disconnected') || err.message?.includes('not open')) {
      disconnectPrinter();
    }
    return { success: false, message: `Gagal cetak: ${err.message || err}` };
  }
}

// ─── INTERNAL ───

async function sendRaw(bytes: number[]): Promise<void> {
  if (!connectedWriter) throw new Error('Printer tidak terhubung');
  await connectedWriter.write(new Uint8Array(bytes));
}
