import React, { useState, useEffect } from 'react';
import { PieChart, DollarSign, Percent, TrendingUp, Printer, RefreshCw, Clock, Trash2, ShoppingCart } from 'lucide-react';

interface AllocationRule {
  id: string;
  label: string;
  icon: string;
  pct: number;
  color: string;
}

interface AllocationHistory {
  id: string;
  date: string;
  revenue: number;
  allocations: { label: string; amount: number; pct: number; color: string }[];
}

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

const DEFAULT_RULES: AllocationRule[] = [
  { id: 'produksi', label: 'Biaya Produksi', icon: '🏭', pct: 40, color: '#10b981' },
  { id: 'waste', label: 'Waste & Write-off', icon: '🗑️', pct: 5, color: '#ef4444' },
  { id: 'rd', label: 'R&D Budget', icon: '🔬', pct: 5, color: '#8b5cf6' },
  { id: 'sewa', label: 'Sewa Ruko', icon: '🏠', pct: 15, color: '#f59e0b' },
  { id: 'gaji', label: 'Gaji Staff', icon: '👨‍🍳', pct: 20, color: '#3b82f6' },
  { id: 'ops', label: 'Operasional Lain', icon: '📦', pct: 5, color: '#ec4899' },
  { id: 'laba', label: 'Laba Bersih Owner', icon: '🏦', pct: 10, color: '#14b8a6' },
];

const SOURCE_ICONS: Record<string, string> = {
  'Walk-In POS': '🛒',
  'WhatsApp Order': '💬',
  'GoFood': '🟢',
  'GrabFood': '🟣',
  'ShopeeFood': '🟠',
  'Web Toko': '🌐',
};

function getRevenueTracker(): RevenueTracker {
  const saved = localStorage.getItem('revenue_tracker_data');
  return saved ? JSON.parse(saved) : { transactions: [], dailyTotals: {} };
}

export default function ProfitDistribusiTab() {
  const [rules, setRules] = useState<AllocationRule[]>(() => {
    const saved = localStorage.getItem('profit_distribution_rules');
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState(50000000);
  const [history, setHistory] = useState<AllocationHistory[]>(() => {
    const saved = localStorage.getItem('profit_distribution_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<'settings' | 'revenue' | 'history'>('revenue');
  const [revenueTracker, setRevenueTracker] = useState<RevenueTracker>(getRevenueTracker);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // Refresh revenue data every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRevenueTracker(getRevenueTracker());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('profit_distribution_rules', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem('profit_distribution_history', JSON.stringify(history));
  }, [history]);

  const totalPct = rules.reduce((sum, r) => sum + r.pct, 0);
  const isBalanced = totalPct === 100;

  const handlePctChange = (id: string, newPct: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, pct: Math.max(0, Math.min(100, newPct)) } : r));
  };

  const handleReset = () => {
    if (window.confirm('Reset semua alokasi ke default (40% produksi, 5% waste, 5% R&D, 15% sewa, 20% gaji, 5% ops, 10% laba)?')) {
      setRules(DEFAULT_RULES);
    }
  };

  const handleSaveSnapshot = () => {
    const amounts = rules.map(r => ({
      label: r.label,
      amount: Math.round(monthlyRevenue * r.pct / 100),
      pct: r.pct,
      color: r.color,
    }));
    const entry: AllocationHistory = {
      id: `hist-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      revenue: monthlyRevenue,
      allocations: amounts,
    };
    setHistory(prev => [entry, ...prev]);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Calculate allocation amounts
  const amounts = rules.map(r => ({ ...r, amount: Math.round(monthlyRevenue * r.pct / 100) }));

  // Compute real revenue data
  const today = new Date().toISOString().substring(0, 10);
  const todayData = revenueTracker.dailyTotals[today] || { total: 0, sources: {} };

  const getFilteredTransactions = (): RevenueTx[] => {
    const txs = revenueTracker.transactions;
    if (selectedPeriod === 'today') {
      return txs.filter(tx => tx.date === today);
    } else if (selectedPeriod === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStart = weekAgo.toISOString().substring(0, 10);
      return txs.filter(tx => tx.date >= weekStart);
    } else if (selectedPeriod === 'month') {
      const monthStart = today.substring(0, 7);
      return txs.filter(tx => tx.date.startsWith(monthStart));
    }
    return txs;
  };

  const getFilteredTotal = (): number => {
    return getFilteredTransactions().reduce((sum, tx) => sum + tx.amount, 0);
  };

  const getFilteredSources = (): Record<string, number> => {
    const txs = getFilteredTransactions();
    const sources: Record<string, number> = {};
    txs.forEach(tx => {
      if (!sources[tx.source]) sources[tx.source] = 0;
      sources[tx.source] += tx.amount;
    });
    return sources;
  };

  const filteredTransactions = getFilteredTransactions();
  const filteredTotal = getFilteredTotal();
  const filteredSources = getFilteredSources();

  const handleSyncToSimulation = () => {
    setMonthlyRevenue(filteredTotal);
    setActiveTab('settings');
  };

  // Compute allocation from real revenue
  const realAmounts = rules.map(r => ({ ...r, amount: Math.round(filteredTotal * r.pct / 100) }));

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-emerald-600" /> Alokasi Distribusi Laba
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Atur persentase pembagian laba kotor secara otomatis — setiap rupiah yang masuk langsung teralokasi ke pos-pos bisnis Anda.
          </p>
        </div>
        <button onClick={() => {
          const printWin = window.open('', '_blank');
          if (!printWin) return;
          const rows = rules.map(r => {
            const amt = Math.round(monthlyRevenue * r.pct / 100);
            return `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${r.icon} ${r.label}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${r.pct}%</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:bold;">${formatCurrency(amt)}</td></tr>`;
          }).join('');
          printWin.document.write(`
            <html><head><title>Alokasi Laba</title>
            <style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:700px;margin:0 auto;padding:40px;color:#1f2937;}h1{font-size:22px;color:#065f46;}.meta{color:#6b7280;font-size:12px;margin-bottom:20px;}table{width:100%;border-collapse:collapse;margin:10px 0;}th{background:#f3f4f6;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;}td{padding:8px;border-bottom:1px solid #e5e7eb;}.total{background:#f0fdf4;padding:12px;border-radius:8px;margin-top:16px;font-size:14px;font-weight:bold;}@media print{body{padding:20px;}}</style></head><body>
            <h1>📊 LAPORAN ALOKASI DISTRIBUSI LABA</h1>
            <div class="meta">Omzet: ${formatCurrency(monthlyRevenue)} | Tanggal: ${new Date().toLocaleDateString('id-ID', { year:'numeric',month:'long',day:'numeric' })}</div>
            <table><thead><tr><th>Pos Alokasi</th><th style="text-align:center;">%</th><th style="text-align:right;">Jumlah</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="total">Total Teralokasi: ${formatCurrency(amounts.reduce((s, a) => s + a.amount, 0))} (${totalPct}%)</div>
            <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:11px;">Near Bakery & Co. ERP — Sistem Alokasi Laba Otomatis</p>
            <script>window.print();<\\/script></body></html>
          `);
          printWin.document.close();
        }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
          <Printer className="w-3.5 h-3.5" /> Cetak
        </button>
      </div>

      {/* REAL-TIME REVENUE SUMMARY CARD */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 shadow-sm text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Revenue Real-time</span>
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            </div>
            <div className="text-3xl font-black mt-1 font-mono tracking-tight">
              {formatCurrency(todayData.total)}
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {Object.entries(todayData.sources).length > 0 && (
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-emerald-200 block">Sumber</span>
                {Object.entries(todayData.sources).map(([src, amt]) => (
                  <div key={src} className="text-xs font-bold text-white flex items-center gap-1 justify-end">
                    <span>{SOURCE_ICONS[src] || '💰'}</span>
                    <span>{formatCurrency(amt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-emerald-500/40">
          <span className="text-[10px] text-emerald-200">
            <ShoppingCart className="w-3 h-3 inline mr-1" />
            {revenueTracker.transactions.length} total transaksi
          </span>
          <span className="text-[10px] text-emerald-200">
            <Clock className="w-3 h-3 inline mr-1" />
            Update setiap 3 detik
          </span>
        </div>
      </div>

      {/* TAB NAV */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveTab('revenue')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'revenue' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
          <DollarSign className="w-3.5 h-3.5 inline mr-1" /> Revenue Riil
        </button>
        <button onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'settings' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
          <Percent className="w-3.5 h-3.5 inline mr-1" /> Atur Alokasi
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
          <Clock className="w-3.5 h-3.5 inline mr-1" /> Riwayat
        </button>
      </div>

      {/* TAB: REVENUE RIIL */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          {/* Period selector */}
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'all'] as const).map(p => (
              <button key={p} onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                  selectedPeriod === p ? 'bg-slate-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                }`}>
                {p === 'today' ? 'Hari Ini' : p === 'week' ? '7 Hari' : p === 'month' ? 'Bulan Ini' : 'Semua'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* KIRI: Revenue stats */}
            <div className="lg:col-span-7 space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Total Revenue</span>
                  <div className="text-xl font-black text-gray-900 font-mono mt-1">{formatCurrency(filteredTotal)}</div>
                  <span className="text-[10px] text-gray-400">{filteredTransactions.length} transaksi</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Rata-rata per Transaksi</span>
                  <div className="text-xl font-black text-gray-900 font-mono mt-1">
                    {filteredTransactions.length > 0
                      ? formatCurrency(Math.round(filteredTotal / filteredTransactions.length))
                      : formatCurrency(0)}
                  </div>
                  <span className="text-[10px] text-gray-400">AOV (Average Order Value)</span>
                </div>
              </div>

              {/* Breakdown by source */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Breakdown per Sumber</h3>
                {Object.keys(filteredSources).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Belum ada transaksi untuk periode ini.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(filteredSources)
                      .sort(([, a], [, b]) => b - a)
                      .map(([src, amt]) => {
                        const pct = filteredTotal > 0 ? (amt / filteredTotal) * 100 : 0;
                        return (
                          <div key={src} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-gray-700">
                                {SOURCE_ICONS[src] || '💰'} {src}
                              </span>
                              <span className="font-mono font-bold text-gray-900">{formatCurrency(amt)}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Allocation Preview based on real revenue */}
              {filteredTotal > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Alokasi dari Revenue Riil
                    </h3>
                    <button onClick={handleSyncToSimulation}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Pakai ke Simulasi
                    </button>
                  </div>
                  <div className="space-y-2">
                    {realAmounts.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: a.color }} />
                          <span>{a.icon} {a.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-900 font-mono">{a.pct}%</span>
                          <span className="text-gray-500 ml-2 font-mono">{formatCurrency(a.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs font-bold">
                    <span className="text-gray-700">Total Revenue Riil</span>
                    <span className="font-mono text-emerald-700">{formatCurrency(filteredTotal)}</span>
                  </div>
                </div>
              )}

              {/* Recent transactions */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Transaksi Terbaru
                  <span className="text-gray-400 font-normal normal-case ml-2">({filteredTransactions.length})</span>
                </h3>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto stroke-1 mb-2" />
                    <p className="text-sm text-gray-500 font-semibold">Belum Ada Transaksi</p>
                    <p className="text-xs text-gray-400 mt-1">Lakukan transaksi POS atau pesanan online untuk melihat revenue real-time.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filteredTransactions.slice().reverse().slice(0, 50).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">{SOURCE_ICONS[tx.source] || '💰'}</span>
                          <div>
                            <p className="font-bold text-gray-900">{tx.product}</p>
                            <p className="text-[10px] text-gray-400">
                              {tx.qty} pcs · {tx.source} · {tx.time}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-emerald-700">{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* KANAN: Visual */}
            <div className="lg:col-span-5 space-y-4">
              {/* Pie chart from real revenue */}
              {isBalanced && filteredTotal > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                    Visual Alokasi (Revenue Riil)
                  </h3>
                  <div className="flex justify-center mb-4">
                    <div className="w-48 h-48 rounded-full relative"
                      style={{
                        background: `conic-gradient(${rules.map((r, i) => {
                          const startPct = rules.slice(0, i).reduce((s, x) => s + x.pct, 0);
                          return `${r.color} ${startPct}% ${startPct + r.pct}%`;
                        }).join(', ')})`
                      }}>
                      <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-lg font-black text-gray-900 block">{formatCurrency(filteredTotal)}</span>
                          <span className="text-[9px] text-gray-400 uppercase font-bold">Revenue Riil</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {realAmounts.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: a.color }} />
                          <span>{a.icon} {a.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-900 font-mono">{a.pct}%</span>
                          <span className="text-gray-500 ml-2 font-mono">{formatCurrency(a.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rata-rata harian */}
              {filteredTotal > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100 text-xs space-y-2">
                  <span className="font-bold text-indigo-800 block">📊 Insight Revenue</span>
                  {Object.entries(filteredSources).length > 1 && (
                    <div className="space-y-1 text-indigo-700">
                      <p>Top source: <span className="font-bold">
                        {Object.entries(filteredSources).sort(([, a], [, b]) => b - a)[0]?.[0]}
                      </span></p>
                      <p>Total sumber: {Object.keys(filteredSources).length} channel penjualan</p>
                    </div>
                  )}
                  <button onClick={handleSyncToSimulation}
                    className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer">
                    <RefreshCw className="w-3 h-3 inline mr-1" /> Gunakan Revenue Ini untuk Simulasi
                  </button>
                </div>
              )}

              {/* Update info */}
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs text-[10px] text-gray-400 space-y-1">
                <p>🔄 Data revenue diperbarui otomatis setiap 3 detik.</p>
                <p>📌 Transaksi dari POS Kasir dan Pesanan Online tercatat otomatis.</p>
                <p>💾 Semua data tersimpan di Local Storage browser Anda.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* KIRI: Sliders */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Atur Persentase Alokasi</h3>
                <button onClick={handleReset}
                  className="text-[10px] text-gray-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Reset Default
                </button>
              </div>

              <div className="space-y-3">
                {rules.map(rule => (
                  <div key={rule.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{rule.icon}</span>
                        <span className="text-xs font-bold text-gray-700">{rule.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" max="100" value={rule.pct}
                          onChange={(e) => handlePctChange(rule.id, parseInt(e.target.value) || 0)}
                          className="w-14 border border-gray-200 rounded-lg p-1 text-xs font-mono font-bold text-center" />
                        <span className="text-xs font-bold text-gray-500">%</span>
                        <span className="w-20 text-right text-xs font-mono font-bold text-emerald-700">
                          {formatCurrency(Math.round(monthlyRevenue * rule.pct / 100))}
                        </span>
                      </div>
                    </div>
                    <input type="range" min="0" max="100" value={rule.pct}
                      onChange={(e) => handlePctChange(rule.id, parseInt(e.target.value))}
                      className="w-full accent-emerald-600"
                      style={{ accentColor: rule.color }} />
                  </div>
                ))}
              </div>

              {/* Total indicator */}
              <div className={`p-3 rounded-xl border text-xs font-bold flex justify-between items-center ${isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <span>{isBalanced ? '✅ Total alokasi 100% — Seimbang!' : `⚠️ Total alokasi ${totalPct}% — harus 100%`}</span>
                <span className="font-mono text-sm">{totalPct}%</span>
              </div>
            </div>

            {/* Revenue Input */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Simulasi Omzet Bulanan</h4>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />
                <input type="number" value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(parseInt(e.target.value) || 0)}
                  className="flex-1 border border-gray-200 rounded-lg p-2.5 font-mono font-bold text-sm" />
                <button onClick={handleSaveSnapshot}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Simpan Snapshot
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-gray-400">Simpan snapshot alokasi ke riwayat untuk tracking bulanan.</p>
                {filteredTotal > 0 && (
                  <button onClick={handleSyncToSimulation}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-1 rounded-lg">
                    <RefreshCw className="w-3 h-3" /> Pakai Revenue Riil ({formatCurrency(filteredTotal)})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* KANAN: Visual Breakdown */}
          <div className="lg:col-span-5 space-y-4">
            {/* Pie Chart Visual */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Visual Breakdown</h3>
              
              {isBalanced && (
                <div className="flex justify-center mb-4">
                  <div className="w-48 h-48 rounded-full relative"
                    style={{
                      background: `conic-gradient(${rules.map((r, i) => {
                        const startPct = rules.slice(0, i).reduce((s, x) => s + x.pct, 0);
                        return `${r.color} ${startPct}% ${startPct + r.pct}%`;
                      }).join(', ')})`
                    }}>
                    <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-lg font-black text-gray-900 block">{formatCurrency(monthlyRevenue)}</span>
                        <span className="text-[9px] text-gray-400 uppercase font-bold">Total Omzet</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {amounts.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: a.color }} />
                      <span>{a.icon} {a.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 font-mono">{a.pct}%</span>
                      <span className="text-gray-500 ml-2 font-mono">{formatCurrency(a.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold">
                <span className="text-gray-700">Total Dialokasikan</span>
                <span className="font-mono text-emerald-700">{formatCurrency(amounts.reduce((s, a) => s + a.amount, 0))}</span>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-xl border border-emerald-100 text-xs space-y-1">
              <span className="font-bold text-emerald-800 block mb-1">💡 Cara Kerja Sistem</span>
              <p className="text-emerald-700">Setiap kali transaksi POS atau pesanan online terjadi, sistem akan menghitung otomatis berapa rupiah untuk masing-masing pos alokasi berdasarkan persentase yang Anda atur.</p>
              <p className="text-emerald-700 mt-1">Contoh: Omzet Rp 1.000.000 → 40% (Rp 400.000) langsung masuk pos Biaya Produksi, 10% (Rp 100.000) ke Laba Bersih Owner.</p>
              <div className="mt-2 pt-2 border-t border-emerald-200">
                <p className="text-emerald-800 font-bold">📊 Revenue Riil Hari Ini: <span className="font-mono">{formatCurrency(todayData.total)}</span></p>
                <button onClick={() => setActiveTab('revenue')}
                  className="text-[10px] text-emerald-600 font-bold underline mt-1 cursor-pointer">Lihat detail revenue →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" /> Riwayat Snapshot Alokasi
            </h3>
            <span className="text-[10px] text-gray-400">{history.length} snapshot</span>
          </div>

          {history.length === 0 ? (
            <div className="p-8 text-center">
              <PieChart className="w-10 h-10 text-gray-200 mx-auto stroke-1 mb-2" />
              <p className="text-sm text-gray-500 font-semibold">Belum Ada Snapshot</p>
              <p className="text-xs text-gray-400 mt-1">Atur alokasi persentase lalu klik "Simpan Snapshot" untuk menyimpan riwayat.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map(h => (
                <div key={h.id} className="p-4 hover:bg-gray-50/50 transition">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="font-bold text-gray-900 text-sm">{h.date}</span>
                      <span className="text-xs text-gray-500 ml-3">Omzet: <span className="font-mono font-bold">{formatCurrency(h.revenue)}</span></span>
                    </div>
                    <button onClick={() => handleDeleteHistory(h.id)}
                      className="text-gray-400 hover:text-red-600 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {h.allocations.map((a, i) => (
                      <div key={i} className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-xs">
                        <span className="block font-bold text-gray-700 truncate">{a.label}</span>
                        <span className="font-mono font-bold" style={{ color: a.color }}>{a.pct}%</span>
                        <span className="block font-mono text-gray-600">{formatCurrency(a.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
