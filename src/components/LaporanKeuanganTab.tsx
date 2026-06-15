import React, { useState, useEffect } from 'react';
import { CalculationResult, BahanBaku } from '../types';
import { BookOpen, DollarSign, TrendingUp, Package, AlertTriangle, FileDown, Printer, RefreshCw, Trash2, Plus, Coins, ShoppingCart } from 'lucide-react';
import { safeGetLocalStorage } from '../lib/safe-json';

interface RevenueTx {
  id: string; time: string; product: string; qty: number; amount: number; source: string; date: string;
}

interface RevenueTracker {
  transactions: RevenueTx[];
  dailyTotals: Record<string, { total: number; sources: Record<string, number> }>;
}

interface LaporanKeuanganTabProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  wasteTotalLoss: number;
  rdTotalCost: number;
}

export default function LaporanKeuanganTab({ calculatedProducts, bahanBaku, wasteTotalLoss, rdTotalCost }: LaporanKeuanganTabProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // ─── CABANG FILTER ───
  const cabangList = safeGetLocalStorage<any[]>('cabang_list_data', []);
  const [selectedCabang, setSelectedCabang] = useState('semua');

  // ─── REVENUE DATA ───
  const getRevenueData = (): RevenueTracker =>
    safeGetLocalStorage<RevenueTracker>('revenue_tracker_data', { transactions: [], dailyTotals: {} });
  const [revenueData, setRevenueData] = useState<RevenueTracker>(getRevenueData);

  useEffect(() => {
    const interval = setInterval(() => setRevenueData(getRevenueData()), 5000);
    return () => clearInterval(interval);
  }, []);

  // ─── BRANCH DATA ───
  const branchTx = safeGetLocalStorage<any[]>('branch_transactions_data', []);
  const wasteByLocation = safeGetLocalStorage<Record<string, number>>('waste_by_location_data', {});

  // ─── OPEX ITEMS (dinamis) ───
  const [opexItems, setOpexItems] = useState<{ id: string; label: string; amount: number }[]>(() =>
    safeGetLocalStorage<{ id: string; label: string; amount: number }[]>('opex_items_data', [])
  );
  const [newOpexLabel, setNewOpexLabel] = useState('');
  const [newOpexAmount, setNewOpexAmount] = useState('');

  useEffect(() => { localStorage.setItem('opex_items_data', JSON.stringify(opexItems)); }, [opexItems]);

  const addOpex = () => {
    if (!newOpexLabel.trim() || !newOpexAmount) return;
    setOpexItems(prev => [...prev, { id: `opex-${Date.now()}`, label: newOpexLabel.trim(), amount: parseInt(newOpexAmount) || 0 }]);
    setNewOpexLabel('');
    setNewOpexAmount('');
  };

  const deleteOpex = (id: string) => {
    if (window.confirm('Hapus item OPEX ini?')) {
      setOpexItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateOpex = (id: string, amount: number) => {
    setOpexItems(prev => prev.map(item => item.id === id ? { ...item, amount } : item));
  };

  // ─── FILTER DATA PER CABANG ───
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthStart = monthAgo.toISOString().substring(0, 10);
  const today = new Date().toISOString().substring(0, 10);

  const filteredTx = revenueData.transactions.filter((tx: any) => {
    if (selectedCabang === 'semua') return tx.date >= monthStart;
    const txCabang = (tx.source || '').toLowerCase().trim();
    return tx.date >= monthStart && txCabang.includes(selectedCabang.toLowerCase().trim());
  });

  const todayRevenue = revenueData.dailyTotals[today]?.total || 0;
  const monthlyRevenue = filteredTx.reduce((sum: number, tx: any) => sum + tx.amount, 0);
  const monthlyQty = filteredTx.reduce((sum: number, tx: any) => sum + tx.qty, 0);

  // Filter waste per cabang
  const filteredWaste = selectedCabang === 'semua'
    ? wasteTotalLoss
    : (wasteByLocation[selectedCabang] || 0);

  // Filter branch transactions per cabang
  const filteredBranchTx = selectedCabang === 'semua'
    ? branchTx
    : branchTx.filter((tx: any) => (tx.cabangId || '').toLowerCase().trim() === selectedCabang.toLowerCase().trim());

  // ─── COGS ───
  const avgHpp = calculatedProducts.length > 0
    ? calculatedProducts.reduce((s, p) => s + p.hppPerPorsi, 0) / calculatedProducts.length : 0;

  const actualCOGS = filteredTx.reduce((sum: number, tx: any) => {
    const prod = calculatedProducts.find(p => p.namaProduk.toLowerCase().trim() === tx.product.toLowerCase().trim());
    return sum + (prod ? prod.hppPerPorsi * tx.qty : avgHpp * tx.qty);
  }, 0);

  // ─── NET INCOME ───
  const totalOPEX = opexItems.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = monthlyRevenue - actualCOGS - totalOPEX - filteredWaste - rdTotalCost;
  const marginPct = monthlyRevenue > 0 ? (netIncome / monthlyRevenue) * 100 : 0;

  // ─── STOK & PRODUK ───
  const totalBahan = bahanBaku.length;
  const totalStokValue = bahanBaku.reduce((s, b) => s + (b.isiKemasan * b.hargaSatuan), 0);
  const stokKritis = bahanBaku.filter(b => b.isiKemasan < 50).length;
  const totalProduk = calculatedProducts.length;
  const avgMargin = calculatedProducts.length > 0
    ? calculatedProducts.reduce((s, p) => s + p.marginPersen, 0) / calculatedProducts.length : 0;

  // ─── EXPORT ───
  const handlePrint = () => {
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`
      <html><head>
        <title>Laporan Keuangan</title>
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
        <h1>📊 LAPORAN KEUANGAN</h1>
        <p style="color:#6b7280;font-size:12px;">Near Bakery & Co. — ${new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        <p style="color:#6b7280;font-size:12px;">Cabang: ${selectedCabang === 'semua' ? 'Semua Cabang' : selectedCabang}</p>

        <h2>💰 RINGKASAN KEUANGAN (30 Hari)</h2>
        <table>
          <tr><td>Revenue (Penjualan)</td><td style="text-align:right;font-family:monospace;font-weight:bold;">${formatCurrency(monthlyRevenue)}</td></tr>
          <tr><td>Total Transaksi</td><td style="text-align:right;">${filteredTx.length} transaksi (${monthlyQty} pcs)</td></tr>
          <tr><td>HPP Bahan Baku</td><td style="text-align:right;font-family:monospace;color:#dc2626;">${formatCurrency(actualCOGS)}</td></tr>
          <tr><td>Total OPEX</td><td style="text-align:right;font-family:monospace;color:#dc2626;">${formatCurrency(totalOPEX)}</td></tr>
          <tr><td>Waste & Write-off</td><td style="text-align:right;font-family:monospace;color:#dc2626;">${formatCurrency(filteredWaste)}</td></tr>
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

        <h2>📋 RINCIAN BIAYA OPEX</h2>
        <table>
          <tr><th>Item</th><th style="text-align:right;">Amount</th></tr>
          ${opexItems.filter(o => o.amount > 0).map(o => `<tr><td>${o.label}</td><td style="text-align:right;font-family:monospace;">${formatCurrency(o.amount)}</td></tr>`).join('')}
        </table>
        <script>window.print();<\/script>
      </body></html>
    `);
    pw.document.close();
  };

  const handleExportCSV = () => {
    const headers = ['Metrik', 'Nilai'];
    const rows = [
      ['Cabang', selectedCabang === 'semua' ? 'Semua Cabang' : selectedCabang],
      ['Revenue 30 Hari', formatCurrency(monthlyRevenue)],
      ['Total Transaksi', filteredTx.length.toString()],
      ['Qty Terjual', monthlyQty.toString()],
      ['HPP Bahan', formatCurrency(actualCOGS)],
      ['Total OPEX', formatCurrency(totalOPEX)],
      ['Waste & Write-off', formatCurrency(filteredWaste)],
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
      ...opexItems.filter(o => o.amount > 0).map(o => [`OPEX: ${o.label}`, formatCurrency(o.amount)]),
    ];
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_keuangan_${new Date().toISOString().substring(0,10)}.csv`;
    a.click();
  };

  // ─── DELETE TRANSACTION ───
  const handleDeleteTx = (txId: string) => {
    if (window.confirm('Hapus transaksi ini?')) {
      try {
        const data = getRevenueData();
        data.transactions = data.transactions.filter((t: any) => t.id !== txId);
        data.dailyTotals = {};
        data.transactions.forEach((t: any) => {
          if (!data.dailyTotals[t.date]) data.dailyTotals[t.date] = { total: 0, sources: {} };
          data.dailyTotals[t.date].total += t.amount;
          if (!data.dailyTotals[t.date].sources[t.source]) data.dailyTotals[t.date].sources[t.source] = 0;
          data.dailyTotals[t.date].sources[t.source] += t.amount;
        });
        localStorage.setItem('revenue_tracker_data', JSON.stringify(data));
        setRevenueData(data);
      } catch (e) { console.error('Delete tx failed:', e); }
    }
  };

  // ─── PRODUK TERJUAL ───
  const productSales = (() => {
    const grouped: Record<string, { qty: number; rev: number }> = {};
    filteredTx.forEach((tx: any) => {
      if (!grouped[tx.product]) grouped[tx.product] = { qty: 0, rev: 0 };
      grouped[tx.product].qty += tx.qty;
      grouped[tx.product].rev += tx.amount;
    });
    return Object.entries(grouped).sort(([, a], [, b]) => b.rev - a.rev);
  })();

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-600" /> Laporan Keuangan
            </h2>
            <p className="text-xs text-gray-500 mt-1">Gabungan Arus Kas & Pembukuan — pantau keuangan per cabang dalam satu layar.</p>
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
          <button onClick={() => setRevenueData(getRevenueData())}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-700 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* ─── REVENUE REAL-TIME ─── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 shadow-sm text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                Revenue Real-time {selectedCabang !== 'semua' ? `(@${selectedCabang})` : ''}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            </div>
            <div className="text-3xl font-black mt-1 font-mono tracking-tight">
              {formatCurrency(todayRevenue)}
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-right">
            <span className="text-[9px] uppercase font-bold text-emerald-200 block mb-0.5">Bulan Ini (30hr)</span>
            <span className="text-lg font-black font-mono">{formatCurrency(monthlyRevenue)}</span>
            <span className="text-[10px] text-emerald-200 block">{filteredTx.length} transaksi</span>
          </div>
        </div>
      </div>

      {/* ─── RINGKASAN KEUANGAN ─── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Revenue (30hr)</span>
          <p className="text-xl font-black font-mono text-emerald-700">{formatCurrency(monthlyRevenue)}</p>
          <div className="text-[10px] text-gray-400">{filteredTx.length} transaksi ({monthlyQty} pcs)</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">HPP Bahan</span>
          <p className="text-xl font-black font-mono text-rose-600">{formatCurrency(actualCOGS)}</p>
          <div className="text-[10px] text-gray-400">{monthlyRevenue > 0 ? ((actualCOGS/monthlyRevenue)*100).toFixed(1) : 0}% dari revenue</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Biaya Operasional</span>
          <p className="text-xl font-black font-mono text-rose-600">{formatCurrency(totalOPEX)}</p>
          <div className="text-[10px] text-gray-400">{opexItems.filter(o => o.amount > 0).length} item aktif</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Waste & R&D</span>
          <p className="text-xl font-black font-mono text-amber-600">{formatCurrency(filteredWaste + rdTotalCost)}</p>
          <div className="text-[10px] text-gray-400">Waste: {formatCurrency(filteredWaste)} | R&D: {formatCurrency(rdTotalCost)}</div>
        </div>
        <div className={`p-4 rounded-2xl border shadow-xs space-y-1 ${netIncome >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <span className="text-[10px] uppercase font-bold text-gray-500 block">Laba Bersih</span>
          <p className={`text-xl font-black font-mono ${netIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(netIncome)}</p>
          <div className="text-[10px] font-bold flex justify-between">
            <span>Margin:</span>
            <span className={netIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}>{marginPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* ─── DETAIL LABA RUGI ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" /> Detail Laba Rugi
          </h3>
        </div>
        <div className="divide-y divide-gray-100 px-4 text-xs font-medium">
          <div className="py-3 flex justify-between">
            <span>📈 Omzet Pendapatan (Revenue Real)</span>
            <span className="font-mono font-bold text-emerald-700">{formatCurrency(monthlyRevenue)}</span>
          </div>
          <div className="py-3 flex justify-between text-rose-600">
            <span>(-) HPP Bahan Baku</span>
            <span className="font-mono font-bold">-{formatCurrency(actualCOGS)}</span>
          </div>
          {opexItems.filter(o => o.amount > 0).map(item => (
            <div key={item.id} className="py-3 flex justify-between text-rose-600">
              <span>(-) {item.label}</span>
              <span className="font-mono font-bold">-{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="py-3 flex justify-between text-amber-600">
            <span>(-) Waste & Write-off</span>
            <span className="font-mono font-bold">-{formatCurrency(filteredWaste)}</span>
          </div>
          <div className="py-3 flex justify-between text-amber-600">
            <span>(-) R&D (Litbang)</span>
            <span className="font-mono font-bold">-{formatCurrency(rdTotalCost)}</span>
          </div>
          <div className={`py-3 flex justify-between font-extrabold text-sm ${
            netIncome >= 0 ? 'text-emerald-800 bg-emerald-50 px-2 rounded-lg' : 'text-red-700 bg-red-50 px-2 rounded-lg'
          }`}>
            <span>💰 LABA BERSIH (Net Income)</span>
            <span className="font-mono">{formatCurrency(netIncome)}</span>
          </div>
        </div>
      </div>

      {/* ─── BIYA OPEX DINAMIS ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
          <Coins className="w-4.5 h-4.5 text-emerald-600" /> Biaya OPEX — Dinamis
        </h3>
        <p className="text-[10px] text-gray-400 -mt-2">Tambah, edit, atau hapus item biaya tetap bulanan.</p>

        <div className="space-y-2">
          {opexItems.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada item OPEX. Tambah di bawah.</p>
          ) : (
            <div className="space-y-2">
              {opexItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <span className="font-bold text-xs text-gray-700 flex-1">{item.label}</span>
                  <div className="relative w-32">
                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-400 font-bold text-xs">Rp</span>
                    <input type="number" value={item.amount}
                      onChange={(e) => updateOpex(item.id, parseInt(e.target.value) || 0)}
                      className="w-full pl-7 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs" />
                  </div>
                  <button onClick={() => deleteOpex(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
          <input type="text" value={newOpexLabel} onChange={e => setNewOpexLabel(e.target.value)}
            placeholder="Nama biaya..."
            className="flex-1 border border-emerald-200 rounded-lg p-2 text-xs font-semibold" />
          <div className="relative w-28">
            <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-400 font-bold text-xs">Rp</span>
            <input type="number" value={newOpexAmount} onChange={e => setNewOpexAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-7 pr-2 py-1.5 border border-emerald-200 rounded-lg font-mono font-bold text-xs" />
          </div>
          <button onClick={addOpex} disabled={!newOpexLabel.trim() || !newOpexAmount}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Tambah
          </button>
        </div>
      </div>

      {/* ─── PRODUK TERJUAL + STOK & ALERTS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PRODUK TERJUAL */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Produk Terjual (30hr)
          </h3>
          {productSales.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada transaksi.</p>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {productSales.slice(0, 10).map(([prod, data]) => (
                <div key={prod} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                  <span className="font-semibold text-gray-700">{prod}</span>
                  <div className="text-right">
                    <span className="font-mono font-bold block">{data.qty} pcs</span>
                    <span className="text-[9px] text-gray-400">{formatCurrency(data.rev)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STOK & PRODUK */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
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

        {/* ALERTS */}
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
            {filteredWaste > 0 && (
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-700">Total waste: {formatCurrency(filteredWaste)}</span>
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
            {netIncome < 0 && (
              <div className="p-2 bg-red-50 rounded-lg border border-red-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-700 font-bold">⚠️ LABA NEGATIF! Segera evaluasi biaya operasional.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── DAFTAR TRANSAKSI ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-emerald-600" /> Daftar Transaksi (30hr) {selectedCabang !== 'semua' ? `(@${selectedCabang})` : ''}
          </h3>
          <span className="text-[10px] text-gray-400 font-mono">{filteredTx.length} transaksi</span>
        </div>
        {filteredTx.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            Belum ada transaksi {selectedCabang !== 'semua' ? `cabang ${selectedCabang}` : ''} dalam 30 hari terakhir.
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Produk</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5">Sumber</th>
                  <th className="px-4 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTx.slice().reverse().map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-mono text-gray-500 text-[9px]">{tx.date}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{tx.product}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{tx.qty}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">{formatCurrency(tx.amount)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{tx.source}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => handleDeleteTx(tx.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="Hapus transaksi">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Hapus transaksi untuk koreksi data. Perubahan akan recalculate daily totals otomatis.
        </div>
      </div>

      {/* ─── SUMBER DATA ─── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
          <span className="font-bold text-gray-700">Sumber Data:</span>
          <span className="bg-blue-50 px-2 py-0.5 rounded">💰 Revenue: Revenue Tracker (POS)</span>
          <span className="bg-emerald-50 px-2 py-0.5 rounded">📦 Stok: Bahan Baku</span>
          <span className="bg-amber-50 px-2 py-0.5 rounded">🗑️ Waste: Manajemen Waste</span>
          <span className="bg-purple-50 px-2 py-0.5 rounded">🔬 R&D: Sandbox R&D</span>
          <span className="bg-rose-50 px-2 py-0.5 rounded">🏪 Cabang: Data Cabang</span>
          <span className="bg-sky-50 px-2 py-0.5 rounded">📋 OPEX: Biaya Operasional</span>
        </div>
      </div>
    </div>
  );
}
