import React, { useState, useEffect } from 'react';
import { CalculationResult, BahanBaku } from '../types';
import { BookOpen, TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, FileDown, Printer } from 'lucide-react';
import { safeGetLocalStorage } from '../lib/safe-json';

interface RevenueTx {
  id: string; time: string; product: string; qty: number; amount: number; source: string; date: string;
}

interface PembukuanTabProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  wasteTotalLoss: number;
  rdTotalCost: number;
}

export default function PembukuanTab({ calculatedProducts, bahanBaku, wasteTotalLoss, rdTotalCost }: PembukuanTabProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // ─── CABANG FILTER ───
  const cabangList = safeGetLocalStorage<any[]>('cabang_list_data', []);
  const [selectedCabang, setSelectedCabang] = useState('semua');

  const getRevenueData = () => {
    return safeGetLocalStorage<{ transactions: any[]; dailyTotals: Record<string, number> }>('revenue_tracker_data', { transactions: [], dailyTotals: {} });
  };
  const branchTx = safeGetLocalStorage<any[]>('branch_transactions_data', []);

  const [revenueData, setRevenueData] = useState(getRevenueData);
  useEffect(() => {
    const interval = setInterval(() => setRevenueData(getRevenueData()), 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter data berdasarkan cabang
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthStart = monthAgo.toISOString().substring(0, 10);

  const filteredTx = revenueData.transactions.filter((tx: any) => {
    if (selectedCabang === 'semua') return tx.date >= monthStart;
    const txCabang = (tx.source || '').toLowerCase().trim();
    const selected = selectedCabang.toLowerCase().trim();
    return tx.date >= monthStart && txCabang.includes(selected);
  });
  const monthlyRevenue = filteredTx.reduce((sum: number, tx: any) => sum + tx.amount, 0);
  const monthlyQty = filteredTx.reduce((sum: number, tx: any) => sum + tx.qty, 0);

  // Filter waste per cabang (jika ada data waste by location)
  const wasteByLocation = safeGetLocalStorage<Record<string, number>>('waste_by_location_data', {});
  const filteredWaste = selectedCabang === 'semua'
    ? wasteTotalLoss
    : (wasteByLocation[selectedCabang] || 0);

  // Filter branch transactions per cabang
  const filteredBranchTx = selectedCabang === 'semua'
    ? branchTx
    : branchTx.filter((tx: any) => (tx.cabangId || '').toLowerCase().trim() === selectedCabang.toLowerCase().trim());

  // HPP real dari transaksi
  const avgHpp = calculatedProducts.length > 0
    ? calculatedProducts.reduce((s, p) => s + p.hppPerPorsi, 0) / calculatedProducts.length : 0;

  const actualCOGS = filteredTx.reduce((sum: number, tx: any) => {
    const prod = calculatedProducts.find(p => p.namaProduk.toLowerCase().trim() === tx.product.toLowerCase().trim());
    return sum + (prod ? prod.hppPerPorsi * tx.qty : avgHpp * tx.qty);
  }, 0);

  // Laba bersih
  const netIncome = monthlyRevenue - actualCOGS - filteredWaste - rdTotalCost;
  const marginPct = monthlyRevenue > 0 ? (netIncome / monthlyRevenue) * 100 : 0;

  // Data stok (global — stok adalah pusat)
  const totalBahan = bahanBaku.length;
  const totalStokValue = bahanBaku.reduce((s, b) => s + (b.isiKemasan * b.hargaSatuan), 0);
  const stokKritis = bahanBaku.filter(b => b.isiKemasan < 50).length;

  // Data produk
  const totalProduk = calculatedProducts.length;
  const avgMargin = calculatedProducts.length > 0
    ? calculatedProducts.reduce((s, p) => s + p.marginPersen, 0) / calculatedProducts.length : 0;

  const handlePrint = () => {
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`
      <html><head>
        <title>Laporan Pembukuan</title>
        <style>
          body{font-family:'Segoe UI',Arial,sans-serif;max-width:900px;margin:0 auto;padding:40px;color:#1f2937;}
          h1{font-size:20px;color:#065f46;}
          h2{font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:5px;margin-top:20px;}
          table{width:100%;border-collapse:collapse;font-size:12px;margin:10px 0;}
          th{background:#f3f4f6;padding:8px;font-size:10px;text-transform:uppercase;text-align:left;}
          td{padding:6px;border-bottom:1px solid #e5e7eb;}
          .total{background:#f0fdf4;font-weight:bold;}
          .negatif{color:#dc2626;}
          .positif{color:#059669;}
        </style>
      </head><body>
        <h1>📒 LAPORAN PEMBUKUAN</h1>
        <p style="color:#6b7280;font-size:12px;">Near Bakery & Co. — ${new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        
        <h2>📊 RINGKASAN KEUANGAN (30 Hari)</h2>
        <table>
          <tr><td>Revenue (Penjualan)</td><td style="text-align:right;font-family:monospace;font-weight:bold;">${formatCurrency(monthlyRevenue)}</td></tr>
          <tr><td>Total Transaksi</td><td style="text-align:right;">${monthlyTransactions.length} transaksi (${monthlyQty} pcs)</td></tr>
          <tr><td>HPP Bahan Baku</td><td style="text-align:right;font-family:monospace;color:#dc2626;">${formatCurrency(actualCOGS)}</td></tr>
          <tr><td>Waste & Write-off</td><td style="text-align:right;font-family:monospace;color:#dc2626;">${formatCurrency(wasteTotalLoss)}</td></tr>
          <tr><td>R&D (Litbang)</td><td style="text-align:right;font-family:monospace;color:#dc2626;">${formatCurrency(rdTotalCost)}</td></tr>
          <tr class="total"><td>LABA BERSIH</td><td style="text-align:right;font-family:monospace;" class="${netIncome >= 0 ? 'positif' : 'negatif'}">${formatCurrency(netIncome)}</td></tr>
        </table>

        <h2>📦 STOK & PRODUK</h2>
        <table>
          <tr><td>Total Bahan Baku</td><td style="text-align:right;">${totalBahan} item</td></tr>
          <tr><td>Nilai Stok</td><td style="text-align:right;font-family:monospace;">${formatCurrency(totalStokValue)}</td></tr>
          <tr><td>Stok Kritis</td><td style="text-align:right;color:#dc2626;">${stokKritis} item</td></tr>
          <tr><td>Total Produk</td><td style="text-align:right;">${totalProduk} item</td></tr>
          <tr><td>Rata-rata Margin</td><td style="text-align:right;">${avgMargin.toFixed(1)}%</td></tr>
        </table>

        <h2>🏪 CABANG</h2>
        <table>
          <tr><td>Total Cabang</td><td style="text-align:right;">${cabangList.length} cabang</td></tr>
          <tr><td>Total Transaksi Cabang</td><td style="text-align:right;">${branchTx.length} transaksi</td></tr>
        </table>
        <script>window.print();<\\/script>
      </body></html>
    `);
    pw.document.close();
  };

  const handleExportCSV = () => {
    const headers = ['Metrik', 'Nilai'];
    const rows = [
      ['Revenue 30 Hari', formatCurrency(monthlyRevenue)],
      ['Total Transaksi', monthlyTransactions.length.toString()],
      ['Qty Terjual', monthlyQty.toString()],
      ['HPP Bahan', formatCurrency(actualCOGS)],
      ['Waste & Write-off', formatCurrency(wasteTotalLoss)],
      ['R&D', formatCurrency(rdTotalCost)],
      ['Laba Bersih', formatCurrency(netIncome)],
      ['Margin %', `${marginPct.toFixed(1)}%`],
      ['Total Bahan', totalBahan.toString()],
      ['Nilai Stok', formatCurrency(totalStokValue)],
      ['Stok Kritis', stokKritis.toString()],
      ['Total Produk', totalProduk.toString()],
      ['Rata-rata Margin', `${avgMargin.toFixed(1)}%`],
      ['Total Cabang', cabangList.length.toString()],
      ['Total Transaksi Cabang', branchTx.length.toString()],
    ];
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pembukuan_${new Date().toISOString().substring(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* HEADER with CABANG FILTER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-600" /> Pembukuan
            </h2>
            <p className="text-xs text-gray-500 mt-1">Ringkasan data bisnis — filter per cabang untuk lihat detail masing-masing.</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-150">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-1.5">Cabang</span>
            <select
              value={selectedCabang}
              onChange={e => setSelectedCabang(e.target.value)}
              className="text-xs font-bold border-0 bg-white rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="semua">🌐 Semua Cabang (Global)</option>
              {cabangList.filter((c: any) => c.isActive).map((c: any) => (
                <option key={c.id} value={c.nama}>{c.nama}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
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

      {/* RINGKASAN KEUANGAN per Cabang */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" /> Ringkasan Keuangan — 30 Hari {selectedCabang !== 'semua' ? `(@${selectedCabang})` : '(Semua Cabang)'}
          </h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400">Revenue</span>
            <p className="text-xl font-black font-mono text-gray-900">{formatCurrency(monthlyRevenue)}</p>
            <p className="text-[10px] text-gray-400">{filteredTx.length} transaksi</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400">HPP Bahan</span>
            <p className="text-xl font-black font-mono text-rose-600">{formatCurrency(actualCOGS)}</p>
            <p className="text-[10px] text-gray-400">{monthlyQty} pcs terjual</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400">Waste</span>
            <p className="text-xl font-black font-mono text-amber-600">{formatCurrency(filteredWaste)}</p>
            <p className="text-[10px] text-gray-400">+ R&D: {formatCurrency(rdTotalCost)}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400">Rata-rata Margin</span>
            <p className={`text-xl font-black font-mono ${avgMargin >= 20 ? 'text-emerald-700' : 'text-amber-600'}`}>{avgMargin.toFixed(1)}%</p>
          </div>
          <div className={`space-y-1 p-3 rounded-xl ${netIncome >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <span className="text-[10px] uppercase font-bold text-gray-500">Laba Bersih</span>
            <p className={`text-xl font-black font-mono ${netIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(netIncome)}</p>
            <p className={`text-[10px] font-bold ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Margin: {marginPct.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* STOK & PRODUK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <Package className="w-4 h-4 text-emerald-600" /> Stok & Produk
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Bahan Baku:</span>
              <span className="font-bold font-mono">{totalBahan} item</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Nilai Stok Total:</span>
              <span className="font-bold font-mono text-emerald-700">{formatCurrency(totalStokValue)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Stok Kritis:</span>
              <span className={`font-bold font-mono ${stokKritis > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{stokKritis} item</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Produk:</span>
              <span className="font-bold font-mono">{totalProduk} item</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Rerata Margin:</span>
              <span className={`font-bold font-mono ${avgMargin >= 20 ? 'text-emerald-700' : 'text-amber-600'}`}>{avgMargin.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Produk Terjual (30hr)
          </h3>
          {monthlyTransactions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada transaksi.</p>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {(() => {
                const grouped: Record<string, { qty: number; rev: number }> = {};
                monthlyTransactions.forEach((tx: any) => {
                  if (!grouped[tx.product]) grouped[tx.product] = { qty: 0, rev: 0 };
                  grouped[tx.product].qty += tx.qty;
                  grouped[tx.product].rev += tx.amount;
                });
                return Object.entries(grouped).sort(([, a], [, b]) => b.rev - a.rev).slice(0, 10).map(([prod, data]) => (
                  <div key={prod} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                    <span className="font-semibold text-gray-700">{prod}</span>
                    <div className="text-right">
                      <span className="font-mono font-bold block">{data.qty} pcs</span>
                      <span className="text-[9px] text-gray-400">{formatCurrency(data.rev)}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Monitoring & Alert
          </h3>
          <div className="space-y-2 text-xs">
            {stokKritis > 0 && (
              <div className="p-2 bg-red-50 rounded-lg border border-red-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-700">{stokKritis} bahan stok kritis</span>
              </div>
            )}
            {wasteTotalLoss > 0 && (
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-700">Total waste: {formatCurrency(wasteTotalLoss)}</span>
              </div>
            )}
            {monthlyRevenue === 0 && (
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-blue-700">Belum ada transaksi {selectedCabang !== 'semua' ? `cabang ${selectedCabang}` : ''} bulan ini</span>
              </div>
            )}
            {cabangList.length > 0 && (
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-700">{cabangList.filter((c: any) => c.isActive).length} cabang aktif — {filteredBranchTx.length} transaksi cabang {selectedCabang !== 'semua' ? `(${selectedCabang})` : ''}</span>
              </div>
            )}
            {avgMargin < 20 && totalProduk > 0 && (
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-700">Rata-rata margin {avgMargin.toFixed(1)}% — di bawah target 20%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUMBER DATA */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
          <span className="font-bold text-gray-700">Sumber Data:</span>
          <span className="bg-blue-50 px-2 py-0.5 rounded">💰 Revenue: Revenue Tracker (POS)</span>
          <span className="bg-emerald-50 px-2 py-0.5 rounded">📦 Stok: Bahan Baku</span>
          <span className="bg-amber-50 px-2 py-0.5 rounded">🗑️ Waste: Manajemen Waste</span>
          <span className="bg-purple-50 px-2 py-0.5 rounded">🔬 R&D: Sandbox R&D</span>
          <span className="bg-rose-50 px-2 py-0.5 rounded">🏪 Cabang: Data Cabang</span>
        </div>
      </div>
    </div>
  );
}
