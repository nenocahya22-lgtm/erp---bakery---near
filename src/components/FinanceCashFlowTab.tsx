import React, { useState, useEffect } from 'react';
import { CalculationResult } from '../types';
import { CircleDollarSign, Coins, RefreshCw, ShoppingCart } from 'lucide-react';

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

  // OPEX — user editable, mulai dari 0 (tidak ada dummy)
  const [rentOpex, setRentOpex] = useState(0);
  const [wagesOpex, setWagesOpex] = useState(0);
  const [utilityOpex, setUtilityOpex] = useState(0);
  const [marketingOpex, setMarketingOpex] = useState(0);

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

  const totalOPEX = rentOpex + wagesOpex + utilityOpex + marketingOpex;
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

      {/* OPEX PARAMETERS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
          <Coins className="w-4.5 h-4.5 text-emerald-600" /> Parameter Biaya Tetap (OPEX)
        </h3>
        <p className="text-[10px] text-gray-400 -mt-2">Isi biaya tetap bulanan Anda. Semua field mulai dari Rp 0 — tidak ada data dummy.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
          <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-150">
            <h4 className="text-gray-800 uppercase tracking-widest font-extrabold">1. OPEX Grup A</h4>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Gaji Staff</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">Rp</span>
                <input type="number" value={wagesOpex}
                  onChange={(e) => setWagesOpex(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Sewa Toko</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">Rp</span>
                <input type="number" value={rentOpex}
                  onChange={(e) => setRentOpex(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold" />
              </div>
            </div>
          </div>
          <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-150">
            <h4 className="text-gray-800 uppercase tracking-widest font-extrabold">2. OPEX Grup B</h4>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Listrik & Gas Oven</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">Rp</span>
                <input type="number" value={utilityOpex}
                  onChange={(e) => setUtilityOpex(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Marketing & Iklan</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">Rp</span>
                <input type="number" value={marketingOpex}
                  onChange={(e) => setMarketingOpex(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold" />
              </div>
            </div>
          </div>
          <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-150">
            <h4 className="text-gray-800 uppercase tracking-widest font-extrabold">3. Ringkasan</h4>
            <div className="p-3 rounded-lg border border-gray-200 bg-white space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Revenue Bulan Ini:</span>
                <span className="font-mono font-bold text-emerald-700">{formatCurrency(monthlyRevenue)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">COGS (HPP Real):</span>
                <span className="font-mono font-bold text-rose-600">{formatCurrency(actualCOGS)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Total OPEX:</span>
                <span className="font-mono font-bold text-rose-600">{formatCurrency(totalOPEX)}</span>
              </div>
              <div className="flex justify-between text-[10px] border-t border-gray-200 pt-1.5">
                <span className="text-gray-700 font-bold">Laba Bersih:</span>
                <span className={`font-mono font-bold ${actualNetIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
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
        </div>
      </div>
    </div>
  );
}
