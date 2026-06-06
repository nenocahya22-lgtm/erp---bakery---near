import React, { useState, useEffect } from 'react';
import { PieChart, DollarSign, Percent, TrendingUp, Printer, RefreshCw, Clock, Trash2, ShoppingCart, Plus, X } from 'lucide-react';

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

const PRESET_COLORS = ['#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#84cc16', '#06b6d4', '#a855f7'];
const PRESET_ICONS = ['🏭', '🗑️', '🔬', '🏠', '👨‍🍳', '📦', '🏦', '📊', '🚚', '💻', '📋', '🎯'];

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState({ label: '', icon: '📋', pct: 5, color: '#6366f1' });

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

  const handleAddRule = () => {
    if (!newRule.label.trim()) return;
    const id = `rule-${Date.now()}`;
    setRules(prev => [...prev, { ...newRule, id, label: newRule.label.trim() }]);
    setNewRule({ label: '', icon: '📋', pct: 5, color: '#6366f1' });
    setShowAddForm(false);
  };

  const handleDeleteRule = (id: string) => {
    if (rules.length <= 1) {
      alert('Minimal harus ada 1 aturan alokasi.');
      return;
    }
    if (!window.confirm('Hapus aturan alokasi ini?')) return;
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleReset = () => {
    if (window.confirm('Reset semua alokasi ke default (7 aturan standar)?')) {
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

  const amounts = rules.map(r => ({ ...r, amount: Math.round(monthlyRevenue * r.pct / 100) }));

  const today = new Date().toISOString().substring(0, 10);
  const todayData = revenueTracker.dailyTotals[today] || { total: 0, sources: {} };

  const getFilteredTransactions = (): RevenueTx[] => {
    const txs = revenueTracker.transactions;
    if (selectedPeriod === 'today') return txs.filter(tx => tx.date === today);
    if (selectedPeriod === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return txs.filter(tx => tx.date >= weekAgo.toISOString().substring(0, 10));
    }
    if (selectedPeriod === 'month') return txs.filter(tx => tx.date.startsWith(today.substring(0, 7)));
    return txs;
  };

  const getFilteredTotal = (): number => getFilteredTransactions().reduce((sum, tx) => sum + tx.amount, 0);
  const getFilteredSources = (): Record<string, number> => {
    const sources: Record<string, number> = {};
    getFilteredTransactions().forEach(tx => {
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
            Atur persentase pembagian laba kotor secara otomatis <strong>— tambah atau hapus aturan alokasi sendiri.</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset}
            className="px-3 py-1.5 text-gray-400 hover:text-red-600 text-[10px] font-bold rounded-lg hover:bg-gray-100 transition cursor-pointer flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
          <button onClick={() => {
            const printWin = window.open('', '_blank');
            if (!printWin) return;
            const rows = rules.map(r => {
              const amt = Math.round(monthlyRevenue * r.pct / 100);
              return `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${r.icon} ${r.label}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${r.pct}%</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:bold;">${formatCurrency(amt)}</td></tr>`;
            }).join('');
            printWin.document.write(`
              <html><head><title>Alokasi Laba</title>
              <style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:700px;margin:0 auto;padding:40px;color:#1f2937;}h1{font-size:22px;color:#065f46;}table{width:100%;border-collapse:collapse;}th{background:#f3f4f6;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;}.total{background:#f0fdf4;padding:12px;border-radius:8px;margin-top:16px;}@media print{body{padding:20px;}}</style></head><body>
              <h1>📊 LAPORAN ALOKASI DISTRIBUSI LABA</h1>
              <div style="color:#6b7280;font-size:12px;margin-bottom:20px;">Omzet: ${formatCurrency(monthlyRevenue)} | ${new Date().toLocaleDateString('id-ID')}</div>
              <table><thead><tr><th>Pos Alokasi</th><th style="text-align:center;">%</th><th style="text-align:right;">Jumlah</th></tr></thead><tbody>${rows}</tbody></table>
              <div class="total">Total Teralokasi: ${formatCurrency(amounts.reduce((s, a) => s + a.amount, 0))} (${totalPct}%)</div>
              <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:11px;">Near Bakery & Co. ERP — Alokasi Laba</p>
              <script>window.print();<\/script></body></html>
            `);
            printWin.document.close();
          }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
        </div>
      </div>

      {/* REVENUE CARD */}
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
      </div>

      {/* TAB NAV */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveTab('revenue')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'revenue' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
          <DollarSign className="w-3.5 h-3.5 inline mr-1" /> Revenue Riil
        </button>
        <button onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'settings' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
          <Percent className="w-3.5 h-3.5 inline mr-1" /> Atur Alokasi ({rules.length} aturan)
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
          <Clock className="w-3.5 h-3.5 inline mr-1" /> Riwayat
        </button>
      </div>

      {/* TAB: REVENUE */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
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
          {/* ... revenue content same as before ... */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Total Revenue</span>
                  <div className="text-xl font-black text-gray-900 font-mono mt-1">{formatCurrency(filteredTotal)}</div>
                  <span className="text-[10px] text-gray-400">{filteredTransactions.length} transaksi</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Rata-rata per Transaksi</span>
                  <div className="text-xl font-black text-gray-900 font-mono mt-1">
                    {filteredTransactions.length > 0 ? formatCurrency(Math.round(filteredTotal / filteredTransactions.length)) : formatCurrency(0)}
                  </div>
                </div>
              </div>

              {/* Source breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Breakdown per Sumber</h3>
                {Object.keys(filteredSources).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Belum ada transaksi untuk periode ini.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(filteredSources).sort(([, a], [, b]) => b - a).map(([src, amt]) => {
                      const pct = filteredTotal > 0 ? (amt / filteredTotal) * 100 : 0;
                      return (
                        <div key={src} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-gray-700">{SOURCE_ICONS[src] || '💰'} {src}</span>
                            <span className="font-mono font-bold text-gray-900">{formatCurrency(amt)}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Allocation preview from real revenue */}
              {filteredTotal > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Alokasi dari Revenue Riil</h3>
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
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              {isBalanced && filteredTotal > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Visual Alokasi (Revenue Riil)</h3>
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
              <button onClick={handleSyncToSimulation}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer">
                <RefreshCw className="w-3 h-3 inline mr-1" /> Gunakan Revenue Ini untuk Simulasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SETTINGS — DYNAMIC ALLOCATION */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Atur Persentase Alokasi <span className="text-gray-400 normal-case text-[10px]">({rules.length} aturan)</span>
                </h3>
                <button onClick={() => setShowAddForm(!showAddForm)}
                  className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Tambah Alokasi
                </button>
              </div>

              {/* Add form */}
              {showAddForm && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2 mb-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <input type="text" placeholder="Nama Alokasi" value={newRule.label}
                      onChange={(e) => setNewRule(p => ({ ...p, label: e.target.value }))}
                      className="border border-gray-200 rounded-lg p-2 text-xs" />
                    <div className="flex gap-2">
                      <select value={newRule.icon} onChange={(e) => setNewRule(p => ({ ...p, icon: e.target.value }))}
                        className="border border-gray-200 rounded-lg p-2 text-xs bg-white">
                        {PRESET_ICONS.map(ico => <option key={ico} value={ico}>{ico}</option>)}
                      </select>
                      <input type="number" min="0" max="100" value={newRule.pct}
                        onChange={(e) => setNewRule(p => ({ ...p, pct: parseInt(e.target.value) || 0 }))}
                        className="w-14 border border-gray-200 rounded-lg p-2 text-xs font-mono text-center" />
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => setNewRule(p => ({ ...p, color: c }))}
                        className={`w-5 h-5 rounded-full border-2 cursor-pointer transition ${newRule.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddForm(false)}
                      className="px-3 py-1 text-gray-500 text-xs font-bold rounded-lg hover:bg-gray-100 transition cursor-pointer">Batal</button>
                    <button onClick={handleAddRule}
                      disabled={!newRule.label.trim()}
                      className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 transition cursor-pointer">
                      <Plus className="w-3 h-3 inline" /> Tambah
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: rule.color }} />
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
                        <button onClick={() => handleDeleteRule(rule.id)}
                          className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition cursor-pointer p-1"
                          title="Hapus aturan">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <input type="range" min="0" max="100" value={rule.pct}
                      onChange={(e) => handlePctChange(rule.id, parseInt(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                      style={{ accentColor: rule.color }} />
                  </div>
                ))}
              </div>

              <div className={`p-3 rounded-xl border text-xs font-bold flex justify-between items-center ${isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <span>{isBalanced ? '✅ Total alokasi 100% — Seimbang!' : `⚠️ Total alokasi ${totalPct}% — harus 100%`}</span>
                <span className="font-mono text-sm">{totalPct}%</span>
              </div>
            </div>

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
              {filteredTotal > 0 && (
                <button onClick={handleSyncToSimulation}
                  className="mt-2 text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-1 rounded-lg">
                  <RefreshCw className="w-3 h-3" /> Pakai Revenue Riil ({formatCurrency(filteredTotal)})
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
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
                    <div className="text-right flex items-center gap-2">
                      <span className="font-bold text-gray-900 font-mono">{a.pct}%</span>
                      <span className="text-gray-500 font-mono">{formatCurrency(a.amount)}</span>
                      <button onClick={() => handleDeleteRule(a.id)}
                        className="text-gray-300 hover:text-red-600 opacity-0 hover:opacity-100 transition cursor-pointer"
                        title="Hapus">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold">
                <span className="text-gray-700">Total Dialokasikan</span>
                <span className="font-mono text-emerald-700">{formatCurrency(amounts.reduce((s, a) => s + a.amount, 0))}</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-xl border border-emerald-100 text-xs space-y-1">
              <span className="font-bold text-emerald-800 block mb-1">💡 Aturan Dinamis</span>
              <p className="text-emerald-700">Klik <strong>"Tambah Alokasi"</strong> untuk membuat aturan baru. Klik ikon <strong>🗑️</strong> untuk menghapus. Atur persentase dengan slider atau input manual.</p>
              <p className="text-emerald-700 mt-1">Total harus 100% agar seimbang. Revenue riil dari POS bisa dipakai langsung ke simulasi.</p>
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
