#!/usr/bin/env python3
"""
Near Bakery & Co. — Thermal Printer 58mm ESC/POS
=================================================
Mencetak struk belanja ke printer thermal 58mm via serial (COM11).

Usage:
  python cetak_struk.py <config_json>

config_json format:
{
  "toko": {
    "nama": "NEAR BAKERY & CO.",
    "alamat": "Jl. Contoh No. 123",
    "kontak": "0812-3456-7890",
    "footer_1": "Terima kasih!",
    "footer_2": "Near Bakery & Co."
  },
  "transaksi": {
    "no_transaksi": "TX-123456",
    "kasir": "Admin",
    "pelanggan": "Budi",
    "waktu": "22/06/2026 14:30",
    "total_harga": 50000,
    "metode_bayar": "Tunai",
    "uang_dibayar": 100000,
    "kembalian": 50000
  },
  "items": [
    { "nama": "Roti Tawar", "qty": 2, "satuan": "pcs", "harga": 15000 },
    { "nama": "Croissant", "qty": 1, "satuan": "pcs", "harga": 20000 }
  ]
}
"""

import sys
import json
import os

# ─── KONFIGURASI PRINTER ───
PRINTER_PORT = os.environ.get('PRINTER_PORT', 'COM11')
PRINTER_BAUD = int(os.environ.get('PRINTER_BAUD', '9600'))

# Lebar struk 58mm = 32 karakter monospace
LEBAR_STRUK = 32


def cetak_struk(config: dict) -> bool:
    """
    Mencetak struk thermal 58mm menggunakan ESC/POS protocol via serial.
    """
    try:
        from escpos.printer import Serial

        p = Serial(
            devfile=PRINTER_PORT,
            baudrate=PRINTER_BAUD,
            bytesize=8,
            parity='N',
            stopbits=1,
            xonxoff=False,
            rtscts=False
        )
    except ImportError:
        print("ERROR: python-escpos tidak terinstall. Jalankan: pip install python-escpos")
        return False
    except Exception as e:
        print(f"ERROR: Gagal konek ke printer di {PRINTER_PORT}: {e}")
        return False

    toko = config.get('toko', {})
    transaksi = config.get('transaksi', {})
    items = config.get('items', [])

    try:
        # ═══════════════════════════════════════════
        # 0. INIT PRINTER — RESET + CODEPAGE
        # ═══════════════════════════════════════════
        p.hw("INIT")                     # Reset printer ke default state
        p.charcode(code='USA')           # Codepage CP437 (Latin) — teks, angka, simbol benar
        p._raw(b'\x1b\x32')             # ESC 2 = Set line spacing ke default (30 dots)
        p._raw(b'\x1b\x33\x24')         # ESC 3 n = Set line spacing ke 36 dots (n=36)

        # ═══════════════════════════════════════════
        # 1. HEADER TOKO
        # ═══════════════════════════════════════════
        p.set(align='center', height=2, width=2)
        p.text(f"{toko.get('nama', 'NEAR BAKERY & CO.')}\n")

        p.set(align='center', height=1, width=1)
        if toko.get('alamat'):
            p.text(f"{toko['alamat']}\n")
        if toko.get('kontak'):
            p.text(f"{toko['kontak']}\n")

        p.text("-" * LEBAR_STRUK + "\n")

        # ═══════════════════════════════════════════
        # 2. METADATA TRANSAKSI
        # ═══════════════════════════════════════════
        p.set(align='left', height=1, width=1)
        p.bold(False)

        def label_value(label: str, value: str, label_len: int = 10) -> str:
            return f"{label:<{label_len}}: {value}"

        if transaksi.get('no_transaksi'):
            p.text(f"{label_value('No', transaksi['no_transaksi'])}\n")
        if transaksi.get('pelanggan'):
            p.text(f"{label_value('Customer', transaksi['pelanggan'])}\n")
        if transaksi.get('kasir'):
            p.text(f"{label_value('Kasir', transaksi['kasir'])}\n")
        if transaksi.get('waktu'):
            p.text(f"{label_value('Waktu', transaksi['waktu'])}\n")

        p.text("-" * LEBAR_STRUK + "\n")

        # ═══════════════════════════════════════════
        # 3. ITEM BELANJA
        # ═══════════════════════════════════════════
        p.set(align='left', height=1, width=1)
        p.bold(False)
        for item in items:
            qty = item.get('qty', 1)
            satuan = item.get('satuan', 'pcs')
            nama = item.get('nama', '')
            harga = item.get('harga', 0)

            teks_produk = f"{qty} {satuan} {nama}"
            teks_harga = _format_harga(harga)

            sisa_spasi = LEBAR_STRUK - len(teks_produk) - len(teks_harga)

            if sisa_spasi >= 0:
                baris = teks_produk + (" " * sisa_spasi) + teks_harga
            else:
                # Potong nama produk
                max_nama_len = LEBAR_STRUK - len(teks_harga) - 3
                potong = teks_produk[:max_nama_len] + ".."
                sisa = LEBAR_STRUK - len(potong) - len(teks_harga)
                baris = potong + (" " * sisa) + teks_harga

            p.text(f"{baris}\n")

        p.text("-" * LEBAR_STRUK + "\n")

        # ═══════════════════════════════════════════
        # 4. TOTAL
        # ═══════════════════════════════════════════
        p.set(align='right', height=1, width=1)
        p.bold(True)
        total = transaksi.get('total_harga', 0)
        p.text(f"TOTAL: {_format_harga(total)}\n")
        p.bold(False)

        # ═══════════════════════════════════════════
        # 5. PEMBAYARAN
        # ═══════════════════════════════════════════
        p.set(align='right', height=1, width=1)
        p.bold(False)
        metode = transaksi.get('metode_bayar', '')
        if metode:
            p.text(f"Bayar ({metode})\n")

        dibayar = transaksi.get('uang_dibayar', 0)
        kembalian = transaksi.get('kembalian', 0)
        if dibayar > 0:
            p.text(f"Tunai: {_format_harga(dibayar)}\n")
        if kembalian > 0:
            p.text(f"Kembali: {_format_harga(kembalian)}\n")

        p.text("\n")

        # ═══════════════════════════════════════════
        # 6. FOOTER
        # ═══════════════════════════════════════════
        p.set(align='center', height=1, width=1)
        p.bold(False)
        if toko.get('footer_1'):
            p.text(f"{toko['footer_1']}\n")
        if toko.get('footer_2'):
            p.text(f"{toko['footer_2']}\n")

        # ═══════════════════════════════════════════
        # 7. POTONG KERTAS
        # ═══════════════════════════════════════════
        p.text("\n\n\n")
        p.cut()
        p.close()
        return True

    except Exception as e:
        print(f"ERROR: Gagal mencetak: {e}")
        return False


def _format_harga(nilai: int) -> str:
    """Format angka ke format Rupiah singkat (cocok untuk struk 32 char)."""
    if nilai >= 1000000:
        return f"Rp{nilai // 1000}K"
    return f"Rp{nilai:,}".replace(",", ".")


def main():
    # Baca JSON dari stdin
    raw = sys.stdin.read()

    # Hapus BOM (Byte Order Mark) jika ada — Windows kadang nambah ini
    if raw.startswith('\ufeff'):
        raw = raw[1:]

    if not raw or not raw.strip():
        # Fallback: coba baca dari argv (untuk backward compat/test manual)
        if len(sys.argv) >= 2:
            raw = sys.argv[1]
            if raw.startswith('@'):
                filepath = raw[1:]
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        raw = f.read()
                except FileNotFoundError:
                    print(f"ERROR: File tidak ditemukan: {filepath}")
                    sys.exit(1)
        else:
            print("ERROR: Tidak ada data diterima. Kirim JSON via stdin.")
            sys.exit(1)

    try:
        config = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"ERROR: JSON tidak valid: {e}")
        sys.exit(1)

    success = cetak_struk(config)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
