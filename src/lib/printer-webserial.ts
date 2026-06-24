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

// Flag untuk mencegah print ganda (mutex)
let isPrinting = false;

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

  if (isPrinting) {
    return { success: false, message: '⏳ Masih ada print job berjalan. Tunggu selesai.' };
  }
  isPrinting = true;

  if (!connectedWriter) {
    try {
      const writer = connectedPort!.writable.getWriter();
      connectedWriter = writer;
    } catch (e) {
      isPrinting = false;
      return { success: false, message: `Gagal mendapatkan writer: ${e}` };
    }
  }

  // Ambil pengaturan toko dari localStorage (Pengaturan Sistem)
  const storeName = localStorage.getItem('store_name') || 'NEAR BAKERY & CO.';
  const storeAddress = localStorage.getItem('store_address') || '';
  const storePhone = localStorage.getItem('store_phone') || '';
  const storeFooter = localStorage.getItem('store_footer') || 'Terima kasih!';

  const t: PrinterToko = {
    nama: toko?.nama || storeName,
    alamat: toko?.alamat || storeAddress,
    kontak: toko?.kontak || storePhone,
    footer_1: toko?.footer_1 || storeFooter,
    footer_2: toko?.footer_2 || 'Near Bakery & Co.',
  };

  try {
    const LEBAR = 32;

    const fmt = (n: number) => n >= 1000000 ? `Rp${Math.round(n / 1000)}K` : `Rp${n.toLocaleString('id-ID')}`;

    const tulis = (teks: string) => {
      const bytes = new TextEncoder().encode(teks + '\n');
      return sendRaw(Array.from(bytes));
    };

    const garis = () => tulis('='.repeat(LEBAR));
    const garisTipis = () => tulis('-'.repeat(LEBAR));

    // ─── 0. INIT ───
    await sendRaw([
      ESC, 0x40,           // ESC @ — Initialize
      ESC, 0x32,           // ESC 2 — line spacing default
      ESC, 0x33, 24,       // ESC 3 24 — line spacing lebih rapat (muat banyak item)
    ]);

    // ─── 1. HEADER TOKO ───
    await sendRaw([ESC, 0x61, 0x01]);  // Center align
    await sendRaw([ESC, 0x45, 0x01]);  // Bold ON
    await sendRaw([ESC, 0x21, 0x00]);  // Normal size (tidak double — MP-58 rawan overflow)
    await tulis(t.nama);
    await sendRaw([ESC, 0x45, 0x00]);  // Bold OFF

    await sendRaw([ESC, 0x61, 0x01]);  // Center
    if (t.alamat) await tulis(t.alamat);
    if (t.kontak) await tulis(`Telp: ${t.kontak}`);
    await garis();

    // ─── 2. METADATA TRANSAKSI ───
    await sendRaw([ESC, 0x61, 0x00]);  // Left align
    if (transaksi.no_transaksi) await tulis(`No    : ${transaksi.no_transaksi}`);
    if (transaksi.pelanggan) await tulis(`Atas  : ${transaksi.pelanggan}`);
    if (transaksi.kasir) await tulis(`Kasir : ${transaksi.kasir}`);
    if (transaksi.waktu) await tulis(`Jam   : ${transaksi.waktu}`);
    await garisTipis();

    // ─── 3. ITEM BELANJA ───
    // Header item
    await sendRaw([ESC, 0x45, 0x01]);  // Bold ON
    await tulis(`${'#  Item'.padEnd(22)} ${'Harga'.padStart(10)}`);
    await sendRaw([ESC, 0x45, 0x00]);  // Bold OFF
    await garisTipis();

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const noUrut = `${idx + 1}.`;
      const teksProduk = `${noUrut} ${item.nama}`;
      const qtyStr = `${item.qty}${item.satuan === 'pcs' ? '' : ' ' + item.satuan}`;
      const teksHarga = fmt(item.harga);

      // Format: "1. Roti Tawar   x2     Rp25.000"
      // Atau untuk 58mm: "1. Roti Tawar     Rp25.000"
      //                  "   x2"
      if (item.qty > 1) {
        // Baris 1: nama + harga
        const baris1 = `${noUrut} ${item.nama}`;
        const sisa = LEBAR - baris1.length - teksHarga.length - 1;
        if (sisa >= 0) {
          await tulis(baris1 + ' '.repeat(sisa) + teksHarga);
        } else {
          const potong = baris1.slice(0, LEBAR - teksHarga.length - 4) + '...';
          const sisa2 = LEBAR - potong.length - teksHarga.length - 1;
          await tulis(potong + ' '.repeat(Math.max(0, sisa2)) + teksHarga);
        }
        // Baris 2: qty
        await tulis(`   x${qtyStr}`);
      } else {
        const sisa = LEBAR - teksProduk.length - teksHarga.length - 1;
        if (sisa >= 0) {
          await tulis(teksProduk + ' '.repeat(sisa) + teksHarga);
        } else {
          const potong = teksProduk.slice(0, LEBAR - teksHarga.length - 4) + '...';
          const sisa2 = LEBAR - potong.length - teksHarga.length - 1;
          await tulis(potong + ' '.repeat(Math.max(0, sisa2)) + teksHarga);
        }
      }
    }
    await garis();

    // ─── 4. TOTAL ───
    await sendRaw([ESC, 0x61, 0x02]);  // Right align
    await sendRaw([ESC, 0x45, 0x01]);  // Bold ON
    await tulis(`TOTAL  : ${fmt(transaksi.total_harga)}`);
    await sendRaw([ESC, 0x45, 0x00]);  // Bold OFF

    // ─── 5. PEMBAYARAN ───
    if (transaksi.metode_bayar) {
      await sendRaw([ESC, 0x61, 0x02]);  // Right align
      await tulis(`[${transaksi.metode_bayar}]`);
    }
    if (transaksi.uang_dibayar && transaksi.uang_dibayar > 0) {
      await sendRaw([ESC, 0x61, 0x02]);
      await tulis(`Bayar   : ${fmt(transaksi.uang_dibayar)}`);
    }
    if (transaksi.kembalian && transaksi.kembalian > 0) {
      await sendRaw([ESC, 0x61, 0x02]);
      await tulis(`Kembali : ${fmt(transaksi.kembalian)}`);
    }
    await tulis('');

    // ─── 6. FOOTER ───
    await sendRaw([ESC, 0x61, 0x01]);  // Center
    if (t.footer_1) await tulis(t.footer_1);
    if (t.footer_2) await tulis(t.footer_2);

    // ─── 7. AKHIR DOKUMEN ───
    for (let i = 0; i < 4; i++) await tulis('');

    await sendRaw([0x0C]);              // Form Feed
    await sendRaw([0x1D, 0x56, 0x00]); // GS V 0 (cut/end-of-job)

    isPrinting = false;
    return { success: true, message: '✅ Struk berhasil dicetak!' };
  } catch (err: any) {
    isPrinting = false;
    if (err.message?.includes('disconnected') || err.message?.includes('not open')) {
      disconnectPrinter();
    }
    return { success: false, message: `Gagal cetak: ${err.message || err}` };
  }
}

// ─── INTERNAL ───

async function sendRaw(bytes: number[]): Promise<void> {
  if (!connectedWriter) throw new Error('Printer tidak terhubung');
  try {
    await connectedWriter.write(new Uint8Array(bytes));
  } catch (err) {
    // Jika writer error, buang writer lock dan throw
    connectedWriter = null;
    throw err;
  }
}
