import React, { useState, useEffect } from 'react';
import { BahanBaku } from '../types';
import { Package, Search, Printer, FileDown } from 'lucide-react';

interface RekapBahanTabProps {
  bahanBaku: BahanBaku[];
}

export default function RekapBahanTab({ bahanBaku }: RekapBahanTabProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'nama' | 'stok' | 'harga'>('nama');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const filtered = bahanBaku
    .filter(b => b.nama.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'stok') return a.isiKemasan - b.isiKemasan;
      if (sortBy === 'harga') return (b.hargaBeliReal || b.hargaBeli) - (a.hargaBeliReal || a.hargaBeli);
      return a.nama.localeCompare(b.nama);
    });

  const handlePrint = () => {
    const pw = window.open('', '_blank');
    if (!pw) return;
    const rows = filtered.map(b => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;">${b.kode || '-'}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${b.nama}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${b.isiKemasan.toLocaleString()}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:center;">${b.satuan}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${formatCurrency(b.hargaSatuan)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${formatCurrency(b.isiKemasan * b.hargaSatuan)}</td>
      </tr>
    `).join('');
    pw.document.write(`
      <html><head>
        <title>Rekap Bahan Baku</title>
        <style>
          body{font-family:'Segoe UI',Arial,sans-serif;max-width:1000px;margin:0 auto;padding:40px;color:#1f2937;}
          h1{font-size:20px;color:#065f46;margin-bottom:5px;}
          .sub{color:#6b7280;font-size:12px;margin-bottom:20px;}
          table{width:100%;border-collapse:collapse;font-size:12px;}
          th{background:#f3f4f6;padding:8px;font-size:10px;text-transform:uppercase;text-align:left;}
          td{padding:6px;border-bottom:1px solid #e5e7eb;}
          .total{background:#f0fdf4;font-weight:bold;border-top:2px solid #065f46;}
        </style>
      </head><body>
        <h1>📋 REKAP BAHAN BAKU</h1>
        <div class="sub">Near Bakery & Co. — ${new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
        <table>
          <thead><tr>
            <th>Kode</th><th>Nama Bahan</th><th style="text-align:right;">Stok</th><th style="text-align:center;">Satuan</th><th style="text-align:right;">Harga Satuan</th><th style="text-align:right;">Total Nilai</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="total">
              <td colspan="5">Total Bahan: ${filtered.length} item</td>
              <td style="text-align:right;">${formatCurrency(filtered.reduce((s,b) => s + (b.isiKemasan * b.hargaSatuan), 0))}</td>
            </tr>
          </tfoot>
        </table>
        <script>window.print();<\\/script>
      </body></html>
    `);
    pw.document.close();
  };

  const handleExportCSV = () => {
    const headers = ['Kode','Nama Bahan','Stok','Satuan','Harga Satuan','Total Nilai'];
    const rows = filtered.map(b => [b.kode||'', b.nama, b.isiKemasan.toString(), b.satuan, (b.hargaSatuan).toString(), (b.isiKemasan * b.hargaSatuan).toString()]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap_bahan_${new Date().toISOString().substring(0,10)}.csv`;
    a.click();
  };

  const totalNilaiStok = bahanBaku.reduce((s, b) => s + (b.isiKemasan * b.hargaSatuan), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" /> Rekap Bahan Baku
          </h2>
          <p className="text-xs text-gray-500 mt-1">Tabel stok & nilai seluruh bahan baku — cetak & export CSV.</p>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Total Item</span>
          <span className="block text-2xl font-black font-mono text-gray-900 mt-1">{bahanBaku.length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Total Stok (unit)</span>
          <span className="block text-2xl font-black font-mono text-gray-900 mt-1">
            {bahanBaku.reduce((s, b) => s + b.isiKemasan, 0).toLocaleString()}
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Nilai Stok Total</span>
          <span className="block text-2xl font-black font-mono text-emerald-700 mt-1">{formatCurrency(totalNilaiStok)}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Stok Kritis (&lt;50)</span>
          <span className="block text-2xl font-black font-mono text-red-600 mt-1">{bahanBaku.filter(b => b.isiKemasan < 50).length}</span>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari bahan..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-bold">Urut:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="border border-gray-200 rounded-lg p-1.5 text-[10px] font-bold bg-white">
              <option value="nama">Nama A-Z</option>
              <option value="stok">Stok ↑</option>
              <option value="harga">Harga ↓</option>
            </select>
            <button onClick={handlePrint}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
              <Printer className="w-3 h-3" /> Cetak
            </button>
            <button onClick={handleExportCSV}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
              <FileDown className="w-3 h-3" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama Bahan</th>
                <th className="px-4 py-3 text-right">Stok Pusat</th>
                <th className="px-4 py-3 text-center">Satuan</th>
                <th className="px-4 py-3 text-right">Harga Satuan</th>
                <th className="px-4 py-3 text-right">Total Nilai</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Tidak ada data bahan.</td></tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.nama} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-gray-400">{b.kode || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{b.nama}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{b.isiKemasan.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{b.satuan}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(b.hargaSatuan)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(b.isiKemasan * b.hargaSatuan)}</td>
                    <td className="px-4 py-3 text-center">
                      {b.isiKemasan < 50 ? (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[9px] font-bold">🔴 Kritis</span>
                      ) : b.isiKemasan < 200 ? (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-bold">🟡 Menipis</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-bold">✅ Aman</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
