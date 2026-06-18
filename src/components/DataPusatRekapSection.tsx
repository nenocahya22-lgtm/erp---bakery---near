import React from 'react';
import { BahanBaku, Cabang, BranchStock } from '../types';
import { FileText, Printer, Building2, Package } from 'lucide-react';

interface DataPusatRekapSectionProps {
  bahanBaku: BahanBaku[];
  cabangList?: Cabang[];
  cabangStok?: BranchStock[];
}

export default function DataPusatRekapSection({ bahanBaku, cabangList = [], cabangStok = [] }: DataPusatRekapSectionProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const cetakLaporanHtml = (judul: string, headers: string[], rows: string[][], footer?: string): string => {
    return `
      <html><head>
        <title>${judul} - Near Bakery</title>
        <style>
          body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1f2937;}
          h1{font-size:20px;color:#065f46;border-bottom:2px solid #065f46;padding-bottom:8px;}
          .meta{font-size:11px;color:#6b7280;margin-bottom:20px;}
          table{width:100%;border-collapse:collapse;margin:16px 0;}
          th{background:#f3f4f6;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;}
          td{padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;}
          tr:hover{background:#f9fafb;}
          .footer{margin-top:30px;border-top:2px solid #d1d5db;padding-top:16px;font-size:11px;}
          .sign{margin-top:50px;display:flex;justify-content:space-between;font-size:10px;}
          @media print{body{padding:20px;}@page{margin:15mm;}}
        </style>
      </head><body>
        <h1>📋 ${judul}</h1>
        <div class="meta">Near Bakery & Co. — Dicetak: ${new Date().toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
        ${footer ? `<div class="footer">${footer}</div>` : ''}
        <div class="sign"><div>_____________<br>Pembuat</div><div>_____________<br>Mengetahui</div></div>
        <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:9px;">Near Bakery & Co. ERP — ${judul}</p>
        <script>window.print();setTimeout(()=>window.close(),500);<\/script>
      </body></html>`;
  };

  const cetakDokumen = (judul: string, html: string) => {
    const pw = window.open('', '_blank');
    if (!pw) {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${judul.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('📄 Popup terblokir! File HTML berhasil di-download.\n\n🔹 Buka file tersebut di browser\n🔹 Tekan Ctrl+P atau klik menu File → Print\n🔹 Pilih "Save as PDF" sebagai printer\n🔹 Klik Simpan untuk menyimpan sebagai PDF.');
      return;
    }
    pw.document.write(html);
    pw.document.close();
  };

  const handleCetakRekapBahan = () => {
    const headers = ['Kode','Nama Bahan','Stok','Satuan','Harga Satuan','Total Nilai'];
    const sorted = [...bahanBaku].sort((a, b) => a.nama.localeCompare(b.nama));
    const rows = sorted.map(b => [
      b.kode||'-', b.nama, b.isiKemasan.toString(), b.satuan, formatCurrency(b.hargaSatuan), formatCurrency(b.isiKemasan * b.hargaSatuan)
    ]);
    cetakDokumen('Rekap_Bahan', cetakLaporanHtml('REKAP BAHAN BAKU', headers, rows,
      `Total: ${sorted.length} item | Nilai: ${formatCurrency(sorted.reduce((s,b) => s + (b.isiKemasan * b.hargaSatuan), 0))}`
    ));
  };

  const handleExportCSVRekap = () => {
    const headers = ['Kode','Nama Bahan','Stok','Satuan','Harga Satuan','Total Nilai'];
    const sorted = [...bahanBaku].sort((a, b) => a.nama.localeCompare(b.nama));
    const rows = sorted.map(b => [b.kode||'', b.nama, b.isiKemasan.toString(), b.satuan, b.hargaSatuan.toString(), (b.isiKemasan * b.hargaSatuan).toString()]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap_bahan_${new Date().toISOString().substring(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" /> 📋 Rekap Bahan Baku
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">Seluruh data bahan baku — stok, harga, dan total nilai.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCetakRekapBahan}
            className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
            <Printer className="w-3 h-3" /> Cetak Laporan
          </button>
          <button onClick={handleExportCSVRekap}
            className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
            <FileText className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      {bahanBaku.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-8">Belum ada bahan baku terdaftar.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50/50 border-b border-gray-100">
            <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
              <p className="text-[9px] uppercase font-bold text-gray-500">Total Bahan</p>
              <p className="text-lg font-black text-emerald-700 font-mono">{bahanBaku.length}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
              <p className="text-[9px] uppercase font-bold text-gray-500">Total Nilai Stok</p>
              <p className="text-lg font-black text-emerald-700 font-mono text-sm">{formatCurrency(bahanBaku.reduce((s,b) => s + (b.isiKemasan * b.hargaSatuan), 0))}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
              <p className="text-[9px] uppercase font-bold text-gray-500">Kritis</p>
              <p className="text-lg font-black text-red-700 font-mono">{bahanBaku.filter(b => b.isiKemasan < 50).length}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
              <p className="text-[9px] uppercase font-bold text-gray-500">Stok Rendah</p>
              <p className="text-lg font-black text-amber-700 font-mono">{bahanBaku.filter(b => b.isiKemasan >= 50 && b.isiKemasan < 200).length}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <thead>
                <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Nama Bahan</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3">Satuan</th>
                  <th className="px-4 py-3 text-right">Harga Satuan</th>
                  <th className="px-4 py-3 text-right">Total Nilai</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...bahanBaku].sort((a, b) => a.nama.localeCompare(b.nama)).map((b, idx) => {
                  const totalNilai = b.isiKemasan * b.hargaSatuan;
                  let status: { label: string; color: string };
                  if (b.isiKemasan < 50) {
                    status = { label: '🔴 Kritis', color: 'text-red-800 bg-red-100' };
                  } else if (b.isiKemasan < 200) {
                    status = { label: '🟡 Menipis', color: 'text-amber-800 bg-amber-100' };
                  } else {
                    status = { label: '✅ Aman', color: 'text-emerald-800 bg-emerald-100' };
                  }
                  return (
                    <tr key={b.nama} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-gray-500">{b.kode || `BB-${String(idx + 1).padStart(3, '0')}`}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{b.nama}</td>
                      <td className="px-4 py-3"><span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{b.kategori || 'Produk'}</span></td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{b.isiKemasan}</td>
                      <td className="px-4 py-3 font-semibold">{b.satuan}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(b.hargaSatuan)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(totalNilai)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${status.color}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-600 text-right font-bold">
            Total Nilai Stok: <span className="font-mono font-black text-emerald-700">{formatCurrency(bahanBaku.reduce((s,b) => s + (b.isiKemasan * b.hargaSatuan), 0))}</span>
          </div>
        </>
      )}

      {/* ─── PER-CABANG STOK MATRIX ─── */}
      {cabangList.length > 0 && (
        <div className="border-t border-gray-200 mt-4">
          <div className="p-4 bg-gray-50/80 border-b border-gray-100">
            <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" /> Stok per Cabang
            </h4>
            <p className="text-[10px] text-gray-500 mt-0.5">Rincian stok setiap bahan baku di masing-masing cabang.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                  <th className="px-4 py-3 sticky left-0 bg-gray-50">Nama Bahan</th>
                  <th className="px-4 py-3 text-right">Stok Pusat</th>
                  {cabangList.map(c => (
                    <th key={c.id} className="px-4 py-3 text-right">{c.nama}</th>
                  ))}
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...bahanBaku].sort((a, b) => a.nama.localeCompare(b.nama)).map(b => {
                  const cabangStokMap = new Map<string, number>();
                  cabangStok
                    .filter(s => s.bahanNama.toLowerCase() === b.nama.toLowerCase())
                    .forEach(s => {
                      cabangStokMap.set(s.cabangId, (cabangStokMap.get(s.cabangId) || 0) + s.stokTeoritis);
                    });
                  const perCabang = cabangList.map(c => cabangStokMap.get(c.id) || 0);
                  const totalCabang = perCabang.reduce((s, v) => s + v, 0);
                  const totalAll = b.isiKemasan + totalCabang;
                  return (
                    <tr key={b.nama} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-semibold text-gray-900 sticky left-0 bg-white">{b.nama}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{b.isiKemasan}</td>
                      {perCabang.map((v, i) => (
                        <td key={cabangList[i].id} className={`px-4 py-2.5 text-right font-mono ${v === 0 ? 'text-gray-300' : v < 10 ? 'text-red-600 font-bold' : 'text-gray-900'}`}>
                          {v > 0 ? v : '-'}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">{totalAll}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 text-[10px] font-bold text-gray-600">
                <tr>
                  <td className="px-4 py-2.5">Total per Cabang</td>
                  <td className="px-4 py-2.5 text-right font-mono">{bahanBaku.reduce((s, b) => s + b.isiKemasan, 0)}</td>
                  {cabangList.map(c => {
                    const totalForCabang = cabangStok
                      .filter(s => s.cabangId === c.id)
                      .reduce((s, v) => s + v.stokTeoritis, 0);
                    return (
                      <td key={c.id} className="px-4 py-2.5 text-right font-mono">{totalForCabang > 0 ? totalForCabang : '-'}</td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-700">
                    {bahanBaku.reduce((s, b) => s + b.isiKemasan, 0) + cabangList.reduce((s, c) => s + cabangStok.filter(cs => cs.cabangId === c.id).reduce((s2, v) => s2 + v.stokTeoritis, 0), 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-3 bg-gray-50/50 border-t border-gray-100 text-[10px] text-gray-400 flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Kritis (&lt;10)</span>
            <span className="flex items-center gap-1"><Package className="w-3 h-3 text-emerald-500" /> Stok dari SO terima - POS jual - Waste</span>
          </div>
        </div>
      )}
    </div>
  );
}
