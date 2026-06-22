#!/usr/bin/env python3
"""
Near Bakery & Co. — Thermal Printer 58mm ESC/POS
=================================================
Mencetak struk belanja ke printer thermal 58mm via serial (Bluetooth COM4).

Menggunakan raw pyserial + ESC/POS commands langsung (tanpa python-escpos)
untuk kompatibilitas Bluetooth SPP yang lebih baik.

Usage: Kirim JSON via stdin ke script ini.
"""

import sys
import json
import os
import time
import serial

# ─── KONFIGURASI PRINTER ───
PRINTER_PORT = os.environ.get('PRINTER_PORT', 'COM4')
PRINTER_BAUD = int(os.environ.get('PRINTER_BAUD', '19200'))

# Lebar struk 58mm = 32 karakter monospace
LEBAR = 32

# ─── ESC/POS COMMANDS ───
ESC = b'\x1b'
GS = b'\x1d'

def cmd(*args):
    """Gabung bytes jadi satu command."""
    return b''.join(bytes([a]) if isinstance(a, int) else a for a in args)

INIT      = cmd(ESC, 0x40)        # ESC @ — Initialize printer
BOLD_ON   = cmd(ESC, 0x45, 0x01)  # ESC E 1 — Bold ON
BOLD_OFF  = cmd(ESC, 0x45, 0x00)  # ESC E 0 — Bold OFF
CENTER    = cmd(ESC, 0x61, 0x01)  # ESC a 1 — Center align
LEFT      = cmd(ESC, 0x61, 0x00)  # ESC a 0 — Left align
RIGHT     = cmd(ESC, 0x61, 0x02)  # ESC a 2 — Right align
SIZE_NORMAL = cmd(ESC, 0x21, 0x00) # ESC ! 0 — Normal size
SIZE_BIG    = cmd(ESC, 0x21, 0x30) # ESC ! 0x30 — Double width + height
LINE_SP   = cmd(ESC, 0x33, 36)    # ESC 3 36 — Line spacing 36 dots
CUT       = cmd(ESC, 0x6D)        # ESC m — Partial cut


def cetak_struk(config: dict) -> bool:
    """Cetak struk thermal 58mm via serial (Bluetooth COM4)."""
    port = config.get('printer_port', PRINTER_PORT)
    baud = int(config.get('printer_baud', PRINTER_BAUD))
    toko = config.get('toko', {})
    transaksi = config.get('transaksi', {})
    items = config.get('items', [])

    # Format harga
    def fmt(n):
        if n >= 1000000:
            return f"Rp{n // 1000}K"
        return f"Rp{n:,}".replace(",", ".")

    # Tulis teks + newline
    def tulis(teks):
        p.write(teks.encode('ascii', errors='replace') + b'\n')

    # Tulis raw bytes
    def raw(bytes_data):
        p.write(bytes_data)

    try:
        # Buka port — minimal settings, tanpa flow control
        p = serial.Serial(
            port=port,
            baudrate=baud,
            timeout=5,
            write_timeout=5,
        )
        # Set DTR + RTS high — penting untuk Bluetooth SPP
        p.dtr = True
        p.rts = True
        time.sleep(0.3)
        # Tunggu koneksi Bluetooth establish
        time.sleep(2)
    except serial.SerialException as e:
        print(f"ERROR: Gagal buka {port}: {e}", file=sys.stderr)
        return False

    try:
        # ═══════════════════════════════════════════
        # 0. INIT
        # ═══════════════════════════════════════════
        raw(INIT)
        raw(LINE_SP)
        time.sleep(0.5)

        # ═══════════════════════════════════════════
        # 1. HEADER TOKO
        # ═══════════════════════════════════════════
        raw(CENTER + SIZE_BIG)
        tulis(toko.get('nama', 'NEAR BAKERY & CO.'))

        raw(CENTER + SIZE_NORMAL)
        if toko.get('alamat'):
            tulis(toko['alamat'])
        if toko.get('kontak'):
            tulis(toko['kontak'])

        tulis('-' * LEBAR)

        # ═══════════════════════════════════════════
        # 2. METADATA TRANSAKSI
        # ═══════════════════════════════════════════
        raw(LEFT + BOLD_OFF)
        if transaksi.get('no_transaksi'):
            tulis(f"No        : {transaksi['no_transaksi']}")
        if transaksi.get('pelanggan'):
            tulis(f"Pelanggan : {transaksi['pelanggan']}")
        if transaksi.get('kasir'):
            tulis(f"Kasir     : {transaksi['kasir']}")
        if transaksi.get('waktu'):
            tulis(f"Waktu     : {transaksi['waktu']}")

        tulis('-' * LEBAR)

        # ═══════════════════════════════════════════
        # 3. ITEM BELANJA
        # ═══════════════════════════════════════════
        raw(LEFT + BOLD_OFF)
        for item in items:
            qty = item.get('qty', 1)
            satuan = item.get('satuan', 'pcs')
            nama = item.get('nama', '')
            harga = item.get('harga', 0)

            teks_produk = f"{qty} {satuan} {nama}"
            teks_harga = fmt(harga)
            sisa = LEBAR - len(teks_produk) - len(teks_harga)

            if sisa >= 0:
                baris = teks_produk + (' ' * sisa) + teks_harga
            else:
                potong = teks_produk[:LEBAR - len(teks_harga) - 3] + '..'
                sisa2 = LEBAR - len(potong) - len(teks_harga)
                baris = potong + (' ' * sisa2) + teks_harga

            tulis(baris)

        tulis('-' * LEBAR)

        # ═══════════════════════════════════════════
        # 4. TOTAL
        # ═══════════════════════════════════════════
        raw(RIGHT + BOLD_ON)
        total = transaksi.get('total_harga', 0)
        tulis(f"TOTAL     : {fmt(total)}")
        raw(BOLD_OFF)

        # ═══════════════════════════════════════════
        # 5. PEMBAYARAN
        # ═══════════════════════════════════════════
        raw(RIGHT + BOLD_OFF)
        metode = transaksi.get('metode_bayar', '')
        if metode:
            tulis(f"Bayar ({metode})")
        dibayar = transaksi.get('uang_dibayar', 0)
        kembalian = transaksi.get('kembalian', 0)
        if dibayar > 0:
            tulis(f"Tunai     : {fmt(dibayar)}")
        if kembalian > 0:
            tulis(f"Kembali   : {fmt(kembalian)}")

        tulis('')

        # ═══════════════════════════════════════════
        # 6. FOOTER
        # ═══════════════════════════════════════════
        raw(CENTER + BOLD_OFF)
        if toko.get('footer_1'):
            tulis(toko['footer_1'])
        if toko.get('footer_2'):
            tulis(toko['footer_2'])

        # ═══════════════════════════════════════════
        # 7. POTONG KERTAS
        # ═══════════════════════════════════════════
        tulis('')
        tulis('')
        tulis('')
        tulis('')  # Ekstra LF untuk eject
        raw(CUT)

        # Flush buffer — pastikan semua data terkirim lewat Bluetooth
        p.flush()
        time.sleep(0.5)
        p.close()
        return True

    except serial.SerialException as e:
        print(f"ERROR: {e}", file=sys.stderr)
        p.close()
        return False
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        p.close()
        return False


def main():
    # Baca JSON dari stdin
    raw_data = sys.stdin.read()

    # Hapus BOM jika ada
    if raw_data.startswith('\ufeff'):
        raw_data = raw_data[1:]

    if not raw_data or not raw_data.strip():
        print("ERROR: Tidak ada data. Kirim JSON via stdin.", file=sys.stderr)
        sys.exit(1)

    try:
        config = json.loads(raw_data)
    except json.JSONDecodeError as e:
        print(f"ERROR: JSON tidak valid: {e}", file=sys.stderr)
        sys.exit(1)

    success = cetak_struk(config)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
