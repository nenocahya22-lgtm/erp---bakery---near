/**
 * Printer Service — Thermal Printer 58mm untuk POS Kasir
 * 
 * Mencoba cetak via WebSerial (browser langsung ke Bluetooth COM11),
 * fallback ke server API (Python), fallback ke browser print.
 */

import {
  isWebSerialSupported,
  isPrinterConnected,
  connectPrinter,
  disconnectPrinter,
  cetakWebSerial,
} from './printer-webserial';

export interface PrinterToko {
  nama: string;
  alamat: string;
  kontak: string;
  footer_1: string;
  footer_2: string;
}

export interface PrinterTransaksi {
  no_transaksi: string;
  kasir: string;
  pelanggan: string;
  waktu: string;
  total_harga: number;
  metode_bayar: string;
  uang_dibayar?: number;
  kembalian?: number;
}

export interface PrinterItem {
  nama: string;
  qty: number;
  satuan: string;
  harga: number;
}

export interface PrinterPayload {
  toko: PrinterToko;
  transaksi: PrinterTransaksi;
  items: PrinterItem[];
}

// Default konfigurasi toko — ambil dari localStorage (Pengaturan Sistem)
function getDefaultToko(): PrinterToko {
  try {
    return {
      nama: localStorage.getItem('store_name') || 'NEAR BAKERY & CO.',
      alamat: localStorage.getItem('store_address') || '',
      kontak: localStorage.getItem('store_phone') || '',
      footer_1: localStorage.getItem('store_footer') || 'Terima kasih!',
      footer_2: 'Near Bakery & Co.',
    };
  } catch {
    return { nama: 'NEAR BAKERY & CO.', alamat: '', kontak: '', footer_1: 'Terima kasih!', footer_2: 'Near Bakery & Co.' };
  }
}
const DEFAULT_TOKO: PrinterToko = getDefaultToko();

// ─── RE-EXPORT dari WebSerial ───
export { isWebSerialSupported, isPrinterConnected, connectPrinter, disconnectPrinter };

/**
 * Cetak struk thermal 58mm.
 * Priority: WebSerial (browser langsung) > Relay Server (Python) > Server API
 * 
 * ⚠️ PENTING: Jika WebSerial terhubung dan cetak, TIDAK lanjut ke metode lain
 * karena data MUNGKIN sudah terkirim ke printer (buffer issue). Ini mencegah double-print.
 */
export async function cetakStrukThermal(
  transaksi: PrinterTransaksi,
  items: PrinterItem[],
  toko?: Partial<PrinterToko>,
): Promise<{ success: boolean; message: string }> {
  // ─── PRIORITAS 1: WebSerial (langsung dari browser ke Bluetooth) ───
  // Jika printer sudah terhubung via WebSerial, hanya coba via WebSerial.
  // JANGAN fallback ke metode lain meskipun gagal, karena data mungkin sudah
  // terkirim sebagian ke printer dan fallback akan menyebabkan PRINT GANDA.
  if (isPrinterConnected()) {
    const result = await cetakWebSerial(transaksi, items, toko);
    return result;
  }

  // ─── PRIORITAS 2: Relay Server (Python HTTP relay di localhost:3001) ───
  const relayUrl = import.meta.env.VITE_PRINTER_RELAY_URL || 'http://localhost:3001';
  const payload: PrinterPayload = {
    toko: { ...DEFAULT_TOKO, ...toko },
    transaksi,
    items,
  };

  try {
    const res = await fetch(`${relayUrl}/api/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // timeout 5 detik
    });

    const data = await res.json();
    if (data.success) return { success: true, message: data.message || '✅ Struk berhasil dicetak via relay!' };
    console.warn('Relay server gagal:', data.error);
  } catch (err: any) {
    console.warn('Relay server tidak tersedia (http://localhost:3001), fallback:', err.message);
  }

  // ─── PRIORITAS 3: Server API (Vite dev server / Python) ───
  try {
    const res = await fetch('/api/printer/cetak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    if (data.success) return data;
    console.warn('API server gagal:', data.error);
  } catch (err: any) {
    console.warn('API server tidak tersedia:', err.message);
  }

  // ─── SEMUA METODE GAGAL ───
  return { 
    success: false, 
    message: 'Printer tidak terhubung. Jalankan start-printer.bat dulu, atau klik "Hubungkan Printer" untuk WebSerial.' 
  };
}

/**
 * Format number ke format Rupiah untuk struk
 */
export function formatRupiahStruk(nilai: number): string {
  if (nilai >= 1000000) {
    return `Rp${Math.round(nilai / 1000)}K`;
  }
  return `Rp${nilai.toLocaleString('id-ID')}`;
}

/**
 * Generate HTML struk untuk fallback browser print
 */
export function generateHtmlStruk(
  transaksi: PrinterTransaksi,
  items: PrinterItem[],
  toko?: Partial<PrinterToko>,
): string {
  const t = { ...DEFAULT_TOKO, ...toko };
  const addOnsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding:1px 2px;font-size:9px;">${item.qty} ${item.satuan} ${item.nama}</td>
      <td style="padding:1px 2px;text-align:right;font-size:9px;">${formatRupiahStruk(item.harga)}</td>
    </tr>`,
    )
    .join('');

  const kembalianHtml =
    transaksi.kembalian && transaksi.kembalian > 0
      ? `<tr><td style="font-size:9px;">Kembali</td><td style="text-align:right;font-size:9px;">${formatRupiahStruk(transaksi.kembalian)}</td></tr>`
      : '';

  return `
    <html><head>
      <title>Bill - ${transaksi.no_transaksi}</title>
      <style>
        @page{margin:0;}
        body{font-family:'Courier New',monospace;font-size:10px;width:58mm;padding:4mm;margin:0;color:#000;}
        h2{font-size:11px;text-align:center;margin:2px 0;}
        .center{text-align:center;}
        .line{border-top:1px dashed #000;margin:4px 0;}
        table{width:100%;border-collapse:collapse;}
        td{padding:1px 0;vertical-align:top;}
        .right{text-align:right;}
        .bold{font-weight:bold;}
        .total{font-size:12px;font-weight:bold;}
        .footer{text-align:center;font-size:8px;margin-top:6px;}
        .label{color:#555;}
      </style>
    </head><body>
      <h2>${t.nama}</h2>
      <p class="center" style="font-size:8px;">${t.alamat}</p>
      ${t.kontak ? `<p class="center" style="font-size:8px;">${t.kontak}</p>` : ''}
      <div class="line"></div>
      <p style="font-size:8px;">
        No: ${transaksi.no_transaksi}<br>
        ${transaksi.waktu}<br>
        Kasir: ${transaksi.kasir}<br>
        ${transaksi.pelanggan ? `Customer: ${transaksi.pelanggan}` : ''}
      </p>
      <div class="line"></div>
      <table>
        ${addOnsHtml}
      </table>
      <div class="line"></div>
      <table>
        <tr><td class="bold">TOTAL</td><td class="right total">${formatRupiahStruk(transaksi.total_harga)}</td></tr>
        ${transaksi.metode_bayar ? `<tr><td style="font-size:9px;">Bayar (${transaksi.metode_bayar})</td><td style="text-align:right;font-size:9px;">${transaksi.uang_dibayar ? formatRupiahStruk(transaksi.uang_dibayar) : '-'}</td></tr>` : ''}
        ${kembalianHtml}
      </table>
      <p class="footer">${t.footer_1}</p>
      <p class="footer">${t.footer_2}</p>
      <script>window.print(); setTimeout(() => window.close(), 1000);</script>
    </body></html>`;
}
