#!/usr/bin/env python3
"""
Near Bakery & Co. — Thermal Printer 58mm ESC/POS
=================================================
Mencetak struk belanja ke printer thermal 58mm via serial (Bluetooth).

Menggunakan python-escpos untuk koneksi serial,
dengan raw ESC/POS untuk command yang tidak ada di v3.1.

Usage: Kirim JSON via stdin ke script ini.
"""

import sys
import json
import os
import time

# ─── KONFIGURASI PRINTER ───
PRINTER_PORT = os.environ.get('PRINTER_PORT', 'COM11')
PRINTER_BAUD = int(os.environ.get('PRINTER_BAUD', '9600'))

# Lebar struk 58mm = 32 karakter monospace
LEBAR = 32

# ESC/POS raw commands untuk yang tidak ada di python-escpos v3.1
BOLD_ON  = b'\x1b\x45\x01'  # ESC E 1
BOLD_OFF = b'\x1b\x45\x00'  # ESC E 0


def cetak_struk(config: dict) -> bool:
    """Cetak struk thermal 58mm via serial."""
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

    try:
        from escpos.printer import Serial

        p = Serial(
            devfile=port,
            baudrate=baud,
            bytesize=8,
            parity='N',
            stopbits=1,
            xonxoff=False,
            rtscts=False,
        )
        time.sleep(2)  # Tunggu Bluetooth establish
    except ImportError:
        print("ERROR: python-escpos tidak terinstall.", file=sys.stderr)
        return False
    except Exception as e:
        print(f"ERROR: Gagal buka {port}: {e}", file=sys.stderr)
        return False

    try:
        # ═══════════════════════════════════════════
        # 0. INIT
        # ═══════════════════════════════════════════
        p.hw("INIT")
        p.charcode(code='CP437')
        time.sleep(0.5)

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

        p.text("-" * LEBAR + "\n")

        # ═══════════════════════════════════════════
        # 2. METADATA TRANSAKSI
        # ═══════════════════════════════════════════
        p.set(align='left', height=1, width=1)
        if transaksi.get('no_transaksi'):
            p.text(f"No        : {transaksi['no_transaksi']}\n")
        if transaksi.get('pelanggan'):
            p.text(f"Pelanggan : {transaksi['pelanggan']}\n")
        if transaksi.get('kasir'):
            p.text(f"Kasir     : {transaksi['kasir']}\n")
        if transaksi.get('waktu'):
            p.text(f"Waktu     : {transaksi['waktu']}\n")

        p.text("-" * LEBAR + "\n")

        # ═══════════════════════════════════════════
        # 3. ITEM BELANJA
        # ═══════════════════════════════════════════
        p.set(align='left', height=1, width=1)
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

            p.text(f"{baris}\n")

        p.text("-" * LEBAR + "\n")

        # ═══════════════════════════════════════════
        # 4. TOTAL
        # ═══════════════════════════════════════════
        p.set(align='right', height=1, width=1)
        p._raw(BOLD_ON)
        total = transaksi.get('total_harga', 0)
        p.text(f"TOTAL     : {fmt(total)}\n")
        p._raw(BOLD_OFF)

        # ═══════════════════════════════════════════
        # 5. PEMBAYARAN
        # ═══════════════════════════════════════════
        p.set(align='right', height=1, width=1)
        metode = transaksi.get('metode_bayar', '')
        if metode:
            p.text(f"Bayar ({metode})\n")
        dibayar = transaksi.get('uang_dibayar', 0)
        kembalian = transaksi.get('kembalian', 0)
        if dibayar > 0:
            p.text(f"Tunai     : {fmt(dibayar)}\n")
        if kembalian > 0:
            p.text(f"Kembali   : {fmt(kembalian)}\n")

        p.text("\n")

        # ═══════════════════════════════════════════
        # 6. FOOTER
        # ═══════════════════════════════════════════
        p.set(align='center', height=1, width=1)
        if toko.get('footer_1'):
            p.text(f"{toko['footer_1']}\n")
        if toko.get('footer_2'):
            p.text(f"{toko['footer_2']}\n")

        # ═══════════════════════════════════════════
        # 7. POTONG KERTAS
        # ═══════════════════════════════════════════
        p.text("\n\n\n\n")
        p.cut()
        p.close()
        return True

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        try:
            p.close()
        except:
            pass
        return False


def main():
    raw_data = sys.stdin.read()
    if raw_data.startswith('\ufeff'):
        raw_data = raw_data[1:]
    if not raw_data or not raw_data.strip():
        print("ERROR: Tidak ada data.", file=sys.stderr)
        sys.exit(1)
    try:
        config = json.loads(raw_data)
    except json.JSONDecodeError as e:
        print(f"ERROR: JSON: {e}", file=sys.stderr)
        sys.exit(1)
    success = cetak_struk(config)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
