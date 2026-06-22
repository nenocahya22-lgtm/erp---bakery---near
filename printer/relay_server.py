#!/usr/bin/env python3
"""
Near Bakery & Co. — Thermal Printer Relay Server
=================================================
HTTP relay server yang menjembatani erpbakery.vercel.app 
dengan printer thermal Bluetooth COM11.

Cara pakai:
  1. Double-click start-printer.bat
  2. Atau: python relay_server.py

Server akan listen di http://localhost:3001
Endpoint:
  POST /api/print   — Cetak struk thermal
  GET  /api/status  — Cek status server
"""

import json
import subprocess
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# ─── Konfigurasi ───
PRINTER_PORT = os.environ.get('PRINTER_PORT', 'COM11')
PRINTER_BAUD = os.environ.get('PRINTER_BAUD', '9600')
RELAY_PORT = int(os.environ.get('RELAY_PORT', '3001'))

# Path ke script cetak_struk.py (relatif ke file ini)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CETAK_STRUK_PATH = os.path.join(SCRIPT_DIR, 'cetak_struk.py')


class PrinterRelayHandler(BaseHTTPRequestHandler):
    """HTTP handler untuk relay printer thermal."""

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self._send_cors_headers()
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        """Handle GET requests."""
        parsed = urlparse(self.path)
        if parsed.path == '/' or parsed.path == '/status':
            self._send_html(200, f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Near Bakery — Printer Relay</title>
<style>
  body{{font-family:-apple-system,sans-serif;max-width:480px;margin:40px auto;padding:20px;background:#f8fafc;color:#1e293b;}}
  h1{{color:#059669;font-size:20px;text-align:center;}}
  .card{{background:white;border-radius:12px;padding:16px;margin:12px 0;box-shadow:0 1px 3px rgba(0,0,0,.1);}}
  .label{{color:#64748b;font-size:11px;text-transform:uppercase;font-weight:700;}}
  .value{{font-family:monospace;font-size:14px;margin-top:2px;}}
  .ok{{color:#059669;font-weight:700;}} .warn{{color:#d97706;}} .err{{color:#dc2626;}}
  .btn{{display:inline-block;padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px;
        cursor:pointer;text-decoration:none;border:none;}}
  .btn-primary{{background:#059669;color:white;}} .btn-primary:hover{{background:#047857;}}
  .btn-outline{{background:transparent;color:#059669;border:2px solid #059669;}}
  .btn-outline:hover{{background:#f0fdf4;}}
  #result{{margin-top:12px;padding:10px;border-radius:8px;display:none;font-size:13px;}}
</style></head><body>
<h1>🖨️ Near Bakery — Printer Relay</h1>
<div class="card">
  <div class="label">Status</div>
  <div class="value ok">✅ AKTIF</div>
</div>
<div class="card">
  <div class="label">Printer</div>
  <div class="value">{PRINTER_PORT} @ {PRINTER_BAUD} baud</div>
</div>
<div class="card">
  <div class="label">Server</div>
  <div class="value">http://localhost:{RELAY_PORT}/api/print</div>
</div>
<div class="card" style="text-align:center;">
  <p style="font-size:12px;color:#64748b;margin-bottom:12px;">Cetak struk test untuk verifikasi printer:</p>
  <button class="btn btn-primary" onclick="testPrint()">🖨️ Cetak Test</button>
  <div id="result"></div>
</div>
<div class="card" style="font-size:11px;color:#64748b;">
  <strong>Cara pakai:</strong><br>
  1. Biarkan jendela CMD ini terbuka<br>
  2. Buka erpbakery.vercel.app → POS Kasir<br>
  3. Klik "Bill" → struk otomatis cetak!
</div>
<script>
async function testPrint(){{
  const btn=event.target;const r=document.getElementById('result');
  btn.disabled=true;btn.textContent='⏳ Mencetak...';
  r.style.display='none';
  try{{
    const res=await fetch('/api/test-print',{{method:'POST'}});
    const d=await res.json();
    r.style.display='block';
    if(d.success){{r.className='ok';r.innerHTML='✅ '+d.message;}}
    else{{r.className='err';r.innerHTML='❌ '+d.error;}}
  }}catch(e){{r.style.display='block';r.className='err';r.innerHTML='❌ Gagal: '+e.message;}}
  btn.disabled=false;btn.textContent='🖨️ Cetak Test';
}}
</script>
</body></html>''')
        elif parsed.path == '/api/status':
            self._send_json(200, {
                'status': 'running',
                'printer_port': PRINTER_PORT,
                'printer_baud': PRINTER_BAUD,
                'script': os.path.basename(CETAK_STRUK_PATH),
            })
        else:
            self._send_json(404, {'error': 'Not found'})

    def do_POST(self):
        """Handle POST requests."""
        parsed = urlparse(self.path)

        # ─── TEST PRINT ───
        if parsed.path == '/api/test-print':
            self._handle_test_print()
            return

        if parsed.path != '/api/print':
            self._send_json(404, {'error': 'Not found. Use POST /api/print'})
            return

        # Baca body
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            self._send_json(400, {'success': False, 'error': 'Body kosong'})
            return

        try:
            body = self.rfile.read(content_length)
            data = json.loads(body)
        except json.JSONDecodeError as e:
            self._send_json(400, {'success': False, 'error': f'JSON tidak valid: {e}'})
            return

        # Tambah konfigurasi printer ke data
        data['printer_port'] = PRINTER_PORT
        data['printer_baud'] = int(PRINTER_BAUD)

        # Panggil cetak_struk.py via stdin
        try:
            proc = subprocess.run(
                [sys.executable, CETAK_STRUK_PATH],
                input=json.dumps(data, ensure_ascii=False),
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=20,  # Timeout 20 detik
            )

            if proc.returncode == 0:
                print(f"✅ Struk berhasil dicetak | stdout: {proc.stdout.strip()}")
                self._send_json(200, {'success': True, 'message': 'Struk berhasil dicetak!'})
            else:
                error_msg = proc.stderr.strip() or proc.stdout.strip() or 'Gagal mencetak'
                print(f"❌ Gagal cetak: {error_msg}")
                self._send_json(500, {'success': False, 'error': error_msg})

        except subprocess.TimeoutExpired:
            print("❌ Timeout: Python script tidak merespon dalam 20 detik")
            self._send_json(504, {'success': False, 'error': 'Timeout: printer tidak merespon'})
        except FileNotFoundError:
            msg = f'Python tidak ditemukan di: {sys.executable}'
            print(f"❌ {msg}")
            self._send_json(500, {'success': False, 'error': msg})
        except Exception as e:
            print(f"❌ Error: {e}")
            self._send_json(500, {'success': False, 'error': str(e)})

    def _handle_test_print(self):
        """Cetak struk test untuk verifikasi printer."""
        test_config = {
            'toko': {'nama': 'NEAR BAKERY & CO.', 'footer_1': 'TEST PRINT BERHASIL!', 'footer_2': 'Near Bakery & Co.'},
            'transaksi': {
                'no_transaksi': 'TEST-001',
                'waktu': 'Test Print',
                'total_harga': 50000,
                'metode_bayar': 'Test',
            },
            'items': [
                {'nama': 'Test Print Thermal', 'qty': 1, 'satuan': 'pcs', 'harga': 25000},
                {'nama': 'Jika ini terbaca, printer OK!', 'qty': 1, 'satuan': 'pcs', 'harga': 25000},
            ],
            'printer_port': PRINTER_PORT,
            'printer_baud': int(PRINTER_BAUD),
        }

        try:
            proc = subprocess.run(
                [sys.executable, CETAK_STRUK_PATH],
                input=json.dumps(test_config, ensure_ascii=False),
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=20,
            )

            if proc.returncode == 0:
                print(f"✅ Test print berhasil")
                self._send_json(200, {'success': True, 'message': 'Test print berhasil! Cek printer.'})
            else:
                error_msg = proc.stderr.strip() or proc.stdout.strip() or 'Gagal test print'
                print(f"❌ Test print gagal: {error_msg}")
                self._send_json(500, {'success': False, 'error': error_msg})

        except subprocess.TimeoutExpired:
            self._send_json(504, {'success': False, 'error': 'Timeout: printer tidak merespon dalam 20 detik'})
        except Exception as e:
            self._send_json(500, {'success': False, 'error': str(e)})

    def _send_json(self, status_code: int, data: dict):
        """Kirim response JSON dengan CORS headers."""
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, status_code: int, html: str):
        """Kirim response HTML."""
        body = html.encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_cors_headers(self):
        """Kirim CORS headers agar bisa dipanggil dari Vercel."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, format, *args):
        """Override log message format."""
        print(f"[Relay] {args[0]} {args[1]} {args[2]}")


def main():
    server = HTTPServer(('127.0.0.1', RELAY_PORT), PrinterRelayHandler)
    print(f"")
    print(f"  ╔══════════════════════════════════════════╗")
    print(f"  ║     NEAR BAKERY — PRINTER RELAY SERVER   ║")
    print(f"  ╠══════════════════════════════════════════╣")
    print(f"  ║  Server : http://localhost:{RELAY_PORT}")
    print(f"  ║  Printer: {PRINTER_PORT} @ {PRINTER_BAUD} baud")
    print(f"  ║  Script : {os.path.basename(CETAK_STRUK_PATH)}")
    print(f"  ║                                          ║")
    print(f"  ║  Biarkan jendela ini tetap terbuka!      ║")
    print(f"  ║  Tutup jendela untuk menghentikan server ║")
    print(f"  ╚══════════════════════════════════════════╝")
    print(f"")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
        server.server_close()


if __name__ == '__main__':
    main()
