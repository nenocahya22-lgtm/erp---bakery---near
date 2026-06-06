import React, { useState, useEffect } from 'react';
import { CalculationResult } from '../types';
import { CircleDollarSign, Coins, RefreshCw, ShoppingCart, Trash2, Plus } from 'lucide-react';

interface RevenueTx {
  id: string;
  time: string;
  product: string;
  qty: number;
  amount: number;
  source: string;
  date: string;
}

interface RevenueTracker {
  transactions: RevenueTx[];
  dailyTotals: Record<string, { total: number; sources: Record<string, number> }>;
}

interface FinanceCashFlowTabProps {
  calculatedProducts: CalculationResult[];
  wasteTotalLoss: number;
  rdTotalCost: number;
}

export default function FinanceCashFlowTab({ calculatedProducts, wasteTotalLoss, rdTotalCost }: FinanceCashFlowTabProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Baca data revenue REAL dari localStorage
  const getRevenueData = (): RevenueTracker => {
    const saved = localStorage.getItem('revenue_tracker_data');
    return saved ? JSON.parse(saved) : { transactions: [], dailyTotals: {} };
  };

  const [revenueData, setRevenueData] = useState<RevenueTracker>(getRevenueData);

  useEffect(() => {
    const interval = setInterval(() => {
      setRevenueData(getRevenueData());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // OPEX — dinamis, bisa tambah/hapus baris
  const [opexItems, setOpexItems] = useState<{ id: string; label: string; amount: number }[]>(() => {
    const saved = localStorage.getItem('opex_items_data');
    return saved ? JSON.parse(saved) : [];
  });
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

  // Hitung revenue dari data real
  const today = new Date().toISOString().substring(0, 10);
  const todayRevenue = revenueData.dailyTotals[today]?.total || 0;

  // Revenue bulan ini (30 hari ke belakang)
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthStart = monthAgo.toISOString().substring(0, 10);
  const monthlyRevenue = Object.entries(revenueData.dailyTotals)
    .filter(([date]) => date >= monthStart)
    .reduce((sum, [, data]) => sum + data.total, 0);

  // Volume penjualan dari transaksi real
  const monthlyTransactions = revenueData.transactions.filter(tx => tx.date >= monthStart);
  const monthlySalesQty = monthlyTransactions.reduce((sum, tx) => sum + tx.qty, 0);

  // Rata-rata HPP dan harga jual dari calculatedProducts
  const totalProducts = calculatedProducts.length;
  const avgSellingPrice = totalProducts > 0
    ? calculatedProducts.reduce((sum, p) => sum + p.hargaJualPerPorsi, 0) / totalProducts : 0;
  const avgHppCost = totalProducts > 0
    ? calculatedProducts.reduce((sum, p) => sum + p.hppPerPorsi, 0) / totalProducts : 0;

  // Hitung COGS dari revenue real (bukan dari simulatedMonthlySales)
  const actualCOGS = monthlyTransactions.reduce((sum, tx) => {
    const product = calculatedProducts.find(p =>
      p.namaProduk.toLowerCase().trim() === tx.product.toLowerCase().trim()
    );
    if (product) {
      return sum + (product.hppPerPorsi * tx.qty);
    }
    return sum + (avgHppCost * tx.qty);
  }, 0);

  const totalOPEX = opexItems.reduce((sum, item) => sum + item.amount, 0);
  const actualNetIncome = monthlyRevenue - actualCOGS - totalOPEX - wasteTotalLoss - rdTotalCost;
  const netMarginPercent = monthlyRevenue > 0 ? (actualNetIncome / monthlyRevenue) * 100 : 0;

  const monthlyTotalBurn = actualCOGS + totalOPEX + wasteTotalLoss + rdTotalCost;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
            <CircleDollarSign className="w-6 h-6 text-emerald-600" /> Arus Kas (Cash Flow)
          </h2>
          <p className="text-xs text-gray-500 mt-1">Pantau arus kas masuk/keluar — data <strong>real dari transaksi POS & penjualan</strong>.</p>
        </div>
        <button onClick={() => setRevenueData(getRevenueData())}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
          <RefreshCw className="w-3 h-3" /> Refresh Data
        </button>
      </div>

      {/* RINGKASAN REAL-TIME */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 shadow-sm text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Revenue Real-time</span>
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
            <span className="text-[9px] uppercase font-bold text-emerald-200 block mb-0.5">Bulan Ini</span>
            <span className="text-lg font-black font-mono">{formatCurrency(monthlyRevenue)}</span>
            <span className="text-[10px] text-emerald-200 block">{monthlyTransactions.length} transaksi</span>
          </div>
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Inflow (Omzet Bulan Ini)</span>
          <p className="font-mono text-lg font-black text-emerald-700">{formatCurrency(monthlyRevenue)}</p>
          <div className="text-[10px] text-gray-400">Vol Jual: {monthlySalesQty} pcs</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Outflow (HPP Real)</span>
          <p className="font-mono text-lg font-black text-rose-600">{formatCurrency(actualCOGS + totalOPEX)}</p>
          <div className="text-[10px] text-gray-400">HPP: {formatCurrency(actualCOGS)} | OPEX: {formatCurrency(totalOPEX)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Waste & R&D</span>
          <p className="font-mono text-lg font-black text-slate-900">{formatCurrency(wasteTotalLoss + rdTotalCost)}</p>
          <div className="text-[10px] text-gray-400">Waste: {formatCurrency(wasteTotalLoss)} | R&D: {formatCurrency(rdTotalCost)}</div>
        </div>
        <div className={`p-4 rounded-2xl border shadow-xs space-y-1 ${
          actualNetIncome >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
        }`}>
          <span className="text-[10px] uppercase font-bold text-gray-500 block">Laba Bersih</span>
          <p className={`font-mono text-lg font-black ${actualNetIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(actualNetIncome)}</p>
          <div className="text-[10px] font-bold flex justify-between">
            <span>Margin:</span>
            <span className={actualNetIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}>{netMarginPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* OPEX PARAMETERS — DINAMIS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
          <Coins className="w-4.5 h-4.5 text-emerald-600" /> Parameter Biaya Tetap (OPEX) — Dinamis
        </h3>
        <p className="text-[10px] text-gray-400 -mt-2">Tambah, edit, atau hapus item biaya tetap bulanan. Semua mulai dari Rp 0.</p>

        {/* Daftar OPEX */}
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

        {/* Form tambah OPEX baru */}
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

        {/* Ringkasan */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-gray-200 bg-white space-y-1">
            <span className="text-[10px] text-gray-500">Revenue Bulan Ini:</span>
            <span className="block font-mono font-bold text-emerald-700">{formatCurrency(monthlyRevenue)}</span>
          </div>
          <div className="p-3 rounded-lg border border-gray-200 bg-white space-y-1">
            <span className="text-[10px] text-gray-500">COGS (HPP Real):</span>
            <span className="block font-mono font-bold text-rose-600">{formatCurrency(actualCOGS)}</span>
          </div>
          <div className="p-3 rounded-lg border border-gray-200 bg-white space-y-1">
            <span className="text-[10px] text-gray-500">Total OPEX:</span>
            <span className="block font-mono font-bold text-rose-600">{formatCurrency(totalOPEX)}</span>
          </div>
          <div className={`p-3 rounded-lg border space-y-1 ${actualNetIncome >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <span className="text-[10px] text-gray-500">Laba Bersih:</span>
            <span className={`block font-mono font-bold ${actualNetIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatCurrency(actualNetIncome)}
            </span>
          </div>
        </div>

        {monthlyRevenue === 0 && (
          <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg">
            <ShoppingCart className="w-3 h-3 inline mr-1" />
            Belum ada data revenue. Lakukan transaksi POS untuk melihat arus kas real.
          </div>
        )}
      </div>

      {/* DAFTAR TRANSAKSI INDIVIDU — dengan tombol delete */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-emerald-600" /> Daftar Transaksi (30hr)
          </h3>
          <span className="text-[10px] text-gray-400 font-mono">{monthlyTransactions.length} transaksi</span>
        </div>
        {monthlyTransactions.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            Belum ada transaksi dalam 30 hari terakhir.
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
                {monthlyTransactions.slice().reverse().map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-mono text-gray-500 text-[9px]">{tx.date}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{tx.product}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{tx.qty}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">{formatCurrency(tx.amount)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{tx.source}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => {
                        if (window.confirm(`Hapus transaksi ${tx.id} (${tx.product})?`)) {
                          // Hapus dari revenue_tracker_data
                          try {
                            const saved = localStorage.getItem('revenue_tracker_data');
                            if (saved) {
                              const data = JSON.parse(saved);
                              data.transactions = data.transactions.filter((t: any) => t.id !== tx.id);
                              // Recalc daily totals
                              data.dailyTotals = {};
                              data.transactions.forEach((t: any) => {
                                if (!data.dailyTotals[t.date]) data.dailyTotals[t.date] = { total: 0, sources: {} };
                                data.dailyTotals[t.date].total += t.amount;
                                if (!data.dailyTotals[t.date].sources[t.source]) data.dailyTotals[t.date].sources[t.source] = 0;
                                data.dailyTotals[t.date].sources[t.source] += t.amount;
                              });
                              localStorage.setItem('revenue_tracker_data', JSON.stringify(data));
                              setRevenueData(data);
                            }
                          } catch (e) { console.error('Delete tx failed:', e); }
                        }
                      }} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="Hapus transaksi">
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
    </div>
  );
}
