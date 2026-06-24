#!/usr/bin/env python3
"""
Near Bakery & Co. — Thermal Printer 58mm ESC/POS
=================================================
Mencetak struk belanja ke printer thermal 58mm via serial (Bluetooth) atau Windows Spooler.
Menggunakan Python-escpos Dummy printer untuk menyusun buffer data lengkap di RAM,
lalu mengirimkannya dalam satu payload tunggal (single-write) ke Windows Spooler (pywin32)
atau port Serial (pyserial). Ini menghindari hilangnya karakter/baris setengah-setengah
yang umum terjadi pada printer dengan buffer kecil seperti Rongta RPP02.

Usage: Kirim JSON via stdin ke script ini.
"""

import sys
import json
import os
import time

# ─── KONFIGURASI DEFAULT ───
PRINTER_PORT = os.environ.get('PRINTER_PORT', 'auto')
PRINTER_BAUD = int(os.environ.get('PRINTER_BAUD', '9600'))

# Lebar struk 58mm = 32 karakter monospace
LEBAR = 32

def cetak_struk(config: dict) -> bool:
    """Cetak struk thermal 58mm via serial atau Windows spooler."""
    port = config.get('printer_port', PRINTER_PORT)
    baud = int(config.get('printer_baud', PRINTER_BAUD))
    toko = config.get('toko', {})
    transaksi = config.get('transaksi', {})
    items = config.get('items', [])

    # Format harga ke rupiah
    def fmt(n):
        if n >= 1000000:
            return f"Rp{n // 1000}K"
        return f"Rp{n:,}".replace(",", ".")

    # 1. Gunakan Dummy printer dari python-escpos untuk menyusun buffer ESC/POS lengkap di memori
    try:
        from escpos.printer import Dummy
        p = Dummy()
    except ImportError:
        print("ERROR: python-escpos tidak terinstall.", file=sys.stderr)
        return False

    try:
        # Initialize printer & set line spacing default
        p.hw("INIT")
        p._raw(b'\x1b\x32')  # ESC 2 — Line spacing default (30 dots)
        p.charcode(code='CP437')

        # ─── HEADER TOKO ───
        # Gunakan normal size + bold agar tulisan rapi dan terbaca jelas di printer 58mm
        p.set(align='center', bold=True)
        p.text(f"{toko.get('nama', 'NEAR BAKERY & CO.')}\n")
        p.set(align='center', bold=False)

        if toko.get('alamat'):
            p.text(f"{toko['alamat']}\n")
        if toko.get('kontak'):
            p.text(f"{toko['kontak']}\n")

        p.text("-" * LEBAR + "\n")

        # ─── METADATA TRANSAKSI ───
        p.set(align='left')
        if transaksi.get('no_transaksi'):
            p.text(f"No        : {transaksi['no_transaksi']}\n")
        if transaksi.get('pelanggan'):
            p.text(f"Pelanggan : {transaksi['pelanggan']}\n")
        if transaksi.get('kasir'):
            p.text(f"Kasir     : {transaksi['kasir']}\n")
        if transaksi.get('waktu'):
            p.text(f"Waktu     : {transaksi['waktu']}\n")

        p.text("-" * LEBAR + "\n")

        # ─── ITEM BELANJA ───
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
                # Potong nama produk jika terlalu panjang
                potong = teks_produk[:LEBAR - len(teks_harga) - 3] + '..'
                sisa2 = LEBAR - len(potong) - len(teks_harga)
                baris = potong + (' ' * sisa2) + teks_harga

            p.text(f"{baris}\n")

        p.text("-" * LEBAR + "\n")

        # ─── TOTAL ───
        p.set(align='right', bold=True)
        total = transaksi.get('total_harga', 0)
        p.text(f"TOTAL     : {fmt(total)}\n")
        p.set(align='right', bold=False)

        # ─── PEMBAYARAN ───
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

        # ─── FOOTER ───
        p.set(align='center')
        if toko.get('footer_1'):
            p.text(f"{toko['footer_1']}\n")
        if toko.get('footer_2'):
            p.text(f"{toko['footer_2']}\n")

        # ─── AKHIR DOKUMEN ───
        # Feed paper 4 baris ke posisi robek manual
        for _ in range(4):
            p.text("\n")

        # Form Feed (FF = 0x0C) — memberi sinyal ke printer bahwa ini akhir halaman
        # Penting agar printer berhenti mengumpankan kertas!
        p._raw(b'\x0c')

        # Cut command (GS V 0) — untuk printer yang punya auto-cutter, ini akan memotong.
        # Untuk RPP02 (tanpa auto-cutter), perintah ini diabaikan tapi tetap
        # berfungsi sebagai sinyal END-OF-JOB agar printer berhenti memproses.
        p._raw(b'\x1d\x56\x00')

    except Exception as e:
        print(f"ERROR formatting: {e}", file=sys.stderr)
        return False

    # 2. Dapatkan seluruh buffer raw byte untuk dikirim sekaligus
    raw_bytes = p.output
    connected = False
    error_msgs = []

    # A. Coba kirim via Serial jika port terindikasi serial (e.g. COM3, COM11)
    if port.upper().startswith('COM') or port.startswith('/dev/'):
        try:
            import serial
            print(f"Mencoba cetak via Serial Port: {port}...")
            # Buka port serial
            ser = serial.Serial(
                port=port,
                baudrate=baud,
                bytesize=8,
                parity='N',
                stopbits=1,
                timeout=5,
                xonxoff=False,
                rtscts=False,
            )
            time.sleep(1)
            
            # Kirim per-block dengan delay kecil agar buffer printer tidak overflow
            chunk_size = 64
            for i in range(0, len(raw_bytes), chunk_size):
                ser.write(raw_bytes[i:i+chunk_size])
                time.sleep(0.05)
                
            ser.flush()
            ser.close()
            connected = True
        except Exception as e:
            error_msgs.append(f"Serial {port} gagal: {e}")

    # B. Coba kirim via Windows Printer Spooler (Win32Raw)
    if not connected and sys.platform == 'win32':
        try:
            import win32print
            printers = [prn[2] for prn in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)]
            
            target_printer = None
            if port in printers:
                target_printer = port
            else:
                # Cari printer terdaftar dengan kata kunci printer thermal
                candidates = []
                for name in printers:
                    name_up = name.upper()
                    if any(k in name_up for k in ['POS58', 'POS-58', 'POSPRINTER', 'XP-58', 'MP-58', 'ONE1LABEL', 'THERMAL', 'RONGTA', 'RPP02', 'RPP']):
                        candidates.append(name)
                if candidates:
                    target_printer = candidates[0]

            if target_printer:
                print(f"Mencoba cetak via Windows Spooler: {target_printer}...")
                hPrinter = win32print.OpenPrinter(target_printer)
                try:
                    hJob = win32print.StartDocPrinter(hPrinter, 1, ("Near Bakery Bill", None, "RAW"))
                    try:
                        win32print.StartPagePrinter(hPrinter)
                        # Kirim seluruh buffer raw ESC/POS sekaligus (single-write)
                        win32print.WritePrinter(hPrinter, raw_bytes)
                        win32print.EndPagePrinter(hPrinter)
                        connected = True
                    finally:
                        win32print.EndDocPrinter(hPrinter)
                except Exception as ex:
                    error_msgs.append(f"WritePrinter ke {target_printer} gagal: {ex}")
                finally:
                    win32print.ClosePrinter(hPrinter)
            else:
                error_msgs.append(f"Printer Windows '{port}' tidak ditemukan, dan tidak ada printer POS58/Rongta yang terdeteksi.")
        except Exception as e:
            error_msgs.append(f"Windows Spooler gagal: {e}")

    if not connected:
        print(f"ERROR: Gagal mencetak ke printer. Detail:\n" + "\n".join(error_msgs), file=sys.stderr)
        return False

    return True

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
