import React, { useState, useEffect } from 'react';
import { PieChart, DollarSign, Percent, TrendingUp, CheckCircle2, AlertTriangle, Coins, Sliders, Plus, Trash2, Clock, Printer, RefreshCw, X } from 'lucide-react';
import { CalculationResult, BahanBaku } from '../types';

interface AllocationRule {
  id: string;
  label: string;
  icon: string;
  pct: number; // alokasi dari revenue (%)
  budgetLimit: number; // batas anggaran maks (%)
  color: string;
  opexAmount: number; // nilai OPEX real (Rp)
}

interface AllocationHistory {
  id: string;
  date: string;
  revenue: number;
  allocations: { label: string; amount: number; pct: number; color: string }[];
}

interface RevenueTx {
  id: string; time: string; product: string; qty: number; amount: number; source: string; date: string;
}
interface RevenueTracker {
  transactions: RevenueTx[];
  dailyTotals: Record<string, { total: number; sources: Record<string, number> }>;
}

const DEFAULT_RULES: AllocationRule[] = [
  { id: 'produksi', label: 'Biaya Bahan Produksi', icon: '🏭', pct: 40, budgetLimit: 45, color: '#10b981', opexAmount: 0 },
  { id: 'waste', label: 'Waste & Write-off', icon: '🗑️', pct: 5, budgetLimit: 8, color: '#ef4444', opexAmount: 0 },
  { id: 'rd', label: 'R&D Budget', icon: '🔬', pct: 5, budgetLimit: 8, color: '#8b5cf6', opexAmount: 0 },
  { id: 'sewa', label: 'Sewa Ruko', icon: '🏠', pct: 15, budgetLimit: 18, color: '#f59e0b', opexAmount: 0 },
  { id: 'gaji', label: 'Gaji Staff', icon: '👨‍🍳', pct: 20, budgetLimit: 25, color: '#3b82f6', opexAmount: 0 },
  { id: 'ops', label: 'Operasional (Listrik, Gas, Air)', icon: '💡', pct: 10, budgetLimit: 12, color: '#ec4899', opexAmount: 0 },
  { id: 'laba', label: 'Laba Bersih Owner', icon: '🏦', pct: 5, budgetLimit: 10, color: '#14b8a6', opexAmount: 0 },
];

const PRESET_COLORS = ['#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#84cc16', '#06b6d4', '#a855f7'];
const PRESET_ICONS = ['🏭', '🗑️', '🔬', '🏠', '👨‍🍳', '💡', '🏦', '📊', '🚚', '💻', '📋', '🎯'];

function getRevenueTracker(): RevenueTracker {
  const saved = localStorage.getItem('revenue_tracker_data');
  return saved ? JSON.parse(saved) : { transactions: [], dailyTotals: {} };
}

interface AnggaranAlokasiTabProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  wasteTotalLoss: number;
  rdTotalCost: number;
}

export default function AnggaranAlokasiTab({ calculatedProducts, bahanBaku, wasteTotalLoss, rdTotalCost }: AnggaranAlokasiTabProps) {
  const [activeTab, setActiveTab] = useState<'alokasi' | 'history'>('alokasi');
  const [rules, setRules] = useState<AllocationRule[]>(() => {
    const saved = localStorage.getItem('anggaran_alokasi_rules');
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  const [history, setHistory] = useState<AllocationHistory[]>(() => {
    const saved = localStorage.getItem('anggaran_alokasi_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [revenueTracker, setRevenueTracker] = useState<RevenueTracker>(getRevenueTracker);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState({ label: '', icon: '📋', pct: 5, budgetLimit: 10, color: '#6366f1' });
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');

  useEffect(() => {
    const interval = setInterval(() => setRevenueTracker(getRevenueTracker()), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { localStorage.setItem('anggaran_alokasi_rules', JSON.stringify(rules)); }, [rules]);
  useEffect(() => { localStorage.setItem('anggaran_alokasi_history', JSON.stringify(history)); }, [history]);

  // Update waste & rd actual values automatically
  useEffect(() => {
    setRules(prev => prev.map(r => {
      if (r.label.toLowerCase().includes('waste')) return { ...r, opexAmount: wasteTotalLoss };
      if (r.label.toLowerCase().includes('rd') || r.label.toLowerCase().includes('litbang')) return { ...r, opexAmount: rdTotalCost };
      return r;
    }));
  }, [wasteTotalLoss, rdTotalCost]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Revenue dari POS
  const today = new Date().toISOString().substring(0, 10);
  const todayData = revenueTracker.dailyTotals[today] || { total: 0, sources: {} };

  const getFilteredRevenue = () => {
    const txs = revenueTracker.transactions;
    if (selectedPeriod === 'today') return { total: todayData.total, txs: txs.filter(tx => tx.date === today) };
    if (selectedPeriod === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const start = weekAgo.toISOString().substring(0, 10);
      const filtered = txs.filter(tx => tx.date >= start);
      return { total: filtered.reduce((s, tx) => s + tx.amount, 0), txs: filtered };
    }
    // month
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
    const start = monthAgo.toISOString().substring(0, 10);
    const filtered = txs.filter(tx => tx.date >= start);
    return { total: filtered.reduce((s, tx) => s + tx.amount, 0), txs: filtered };
  };

  const { total: filteredRevenue } = getFilteredRevenue();
  // Use real revenue if available, otherwise fallback to simulation
  const monthlyRevenue = filteredRevenue > 0
    ? filteredRevenue
    : (calculatedProducts.reduce((s, p) => s + p.hargaJual, 0) * 10) || 50000000;

  const totalPct = rules.reduce((sum, r) => sum + r.pct, 0);
  const isBalanced = totalPct === 100;

  const handlePctChange = (id: string, newPct: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, pct: Math.max(0, Math.min(100, newPct)) } : r));
  };

  const handleBudgetLimitChange = (id: string, newLimit: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, budgetLimit: Math.max(0, Math.min(100, newLimit)) } : r));
  };

  const handleOpexChange = (id: string, amount: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, opexAmount: amount } : r));
  };

  const handleAddRule = () => {
    if (!newRule.label.trim()) return;
    const id = `rule-${Date.now()}`;
    setRules(prev => [...prev, { ...newRule, id, label: newRule.label.trim(), opexAmount: 0 }]);
    setNewRule({ label: '', icon: '📋', pct: 5, budgetLimit: 10, color: '#6366f1' });
    setShowAddForm(false);
  };

  const handleDeleteRule = (id: string) => {
    if (rules.length <= 1) { alert('Minimal harus ada 1 aturan.'); return; }
    if (!window.confirm('Hapus aturan ini?')) return;
    setRules(prev => prev.filter(r => r.id !== id));
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

  const handleReset = () => {
    if (window.confirm('Reset semua ke default?')) setRules(DEFAULT_RULES);
  };

  const amounts = rules.map(r => ({ ...r, amount: Math.round(monthlyRevenue * r.pct / 100) }));

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-emerald-600" /> Anggaran & Alokasi
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Atur alokasi revenue + batas anggaran + masukkan biaya OPEX real — semua dalam satu layar.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset}
            className="px-3 py-1.5 text-gray-400 hover:text-red-600 text-[10px] font-bold rounded-lg hover:bg-gray-100 transition cursor-pointer flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
          <button onClick={() => setActiveTab('history')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
            <Clock className="w-3 h-3" /> Riwayat ({history.length})
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
          <div className="flex gap-2 flex-wrap">
            {(['month', 'week', 'today'] as const).map(p => (
              <button key={p} onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                  selectedPeriod === p ? 'bg-white/20 text-white' : 'bg-white/5 text-emerald-200 hover:bg-white/10'
                }`}>
                {p === 'month' ? '30 Hari' : p === 'week' ? '7 Hari' : 'Hari Ini'}
              </button>
            ))}
            {filteredRevenue > 0 && (
              <span className="bg-white/10 px-3 py-1.5 rounded-lg text-sm font-black font-mono">
                {formatCurrency(filteredRevenue)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {activeTab === 'alokasi' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Daftar Aturan */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Pos Alokasi & Anggaran
                </h3>
                <button onClick={() => setShowAddForm(!showAddForm)}
                  className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Tambah
                </button>
              </div>

              {showAddForm && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Nama Pos" value={newRule.label}
                      onChange={(e) => setNewRule(p => ({ ...p, label: e.target.value }))}
                      className="border border-gray-200 rounded-lg p-2" />
                    <div className="flex gap-2">
                      <select value={newRule.icon} onChange={(e) => setNewRule(p => ({ ...p, icon: e.target.value }))}
                        className="border border-gray-200 rounded-lg p-2 bg-white">
                        {PRESET_ICONS.map(ico => <option key={ico} value={ico}>{ico}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Alokasi %</span>
                      <input type="number" min="0" max="100" value={newRule.pct}
                        onChange={(e) => setNewRule(p => ({ ...p, pct: parseInt(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 rounded-lg p-2 font-mono" />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Batas Anggaran %</span>
                      <input type="number" min="0" max="100" value={newRule.budgetLimit}
                        onChange={(e) => setNewRule(p => ({ ...p, budgetLimit: parseInt(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 rounded-lg p-2 font-mono" />
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
                    <button onClick={handleAddRule} disabled={!newRule.label.trim()}
                      className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 transition cursor-pointer">
                      <Plus className="w-3 h-3 inline" /> Tambah
                    </button>
                  </div>
                </div>
              )}

              {/* List of rules */}
              <div className="space-y-3">
                {rules.map(rule => {
                  const actualPct = monthlyRevenue > 0 ? (rule.opexAmount / monthlyRevenue) * 100 : 0;
                  const isOverBudget = rule.budgetLimit > 0 && actualPct > rule.budgetLimit;
                  const isOverAllocation = rule.pct > 0 && actualPct > rule.pct;
                  return (
                    <div key={rule.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 group">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: rule.color }} />
                          <span className="text-sm">{rule.icon}</span>
                          <span className="text-xs font-bold text-gray-900">{rule.label}</span>
                        </div>
                        <button onClick={() => handleDeleteRule(rule.id)}
                          className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* 3 sliders: Alokasi, Anggaran, OPEX Real */}
                      <div className="space-y-2 text-xs">
                        {/* Alokasi */}
                        <div>
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[9px] uppercase font-bold text-gray-500">Alokasi dari Revenue</span>
                            <div className="flex items-center gap-2">
                              <input type="number" min="0" max="100" value={rule.pct}
                                onChange={(e) => handlePctChange(rule.id, parseInt(e.target.value) || 0)}
                                className="w-12 border border-gray-200 rounded p-0.5 text-center font-mono font-bold text-xs" />
                              <span className="font-bold text-emerald-700 w-28 text-right font-mono">{formatCurrency(Math.round(monthlyRevenue * rule.pct / 100))}</span>
                            </div>
                          </div>
                          <input type="range" min="0" max="100" value={rule.pct}
                            onChange={(e) => handlePctChange(rule.id, parseInt(e.target.value))}
                            className="w-full accent-emerald-600 cursor-pointer" style={{ accentColor: rule.color }} />
                        </div>

                        {/* Batas Anggaran */}
                        <div>
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[9px] uppercase font-bold text-gray-500">Batas Anggaran Maks</span>
                            <div className="flex items-center gap-2">
                              <input type="number" min="0" max="100" value={rule.budgetLimit}
                                onChange={(e) => handleBudgetLimitChange(rule.id, parseInt(e.target.value) || 0)}
                                className="w-12 border border-gray-200 rounded p-0.5 text-center font-mono font-bold text-xs" />
                              <span className="font-bold text-amber-700">{rule.budgetLimit}%</span>
                            </div>
                          </div>
                          <input type="range" min="0" max="100" value={rule.budgetLimit}
                            onChange={(e) => handleBudgetLimitChange(rule.id, parseInt(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer" />
                        </div>

                        {/* OPEX Real */}
                        <div>
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[9px] uppercase font-bold text-gray-500">Biaya OPEX Real (Rp/bulan)</span>
                            <input type="number" value={rule.opexAmount} placeholder="0"
                              onChange={(e) => handleOpexChange(rule.id, parseInt(e.target.value) || 0)}
                              className="w-28 border border-gray-200 rounded p-1 text-right font-mono font-bold text-xs" />
                          </div>
                        </div>

                        {/* Compliance bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : isOverAllocation ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, rule.budgetLimit > 0 ? (actualPct / rule.budgetLimit) * 100 : 0)}%` }} />
                          </div>
                          <span className={`text-[9px] font-bold font-mono ${isOverBudget ? 'text-red-600' : isOverAllocation ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {actualPct.toFixed(1)}% / {rule.budgetLimit}%
                          </span>
                          {isOverBudget && <span className="text-[9px] text-red-600 font-bold">⚠️ OVER!</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total check */}
              <div className={`p-3 rounded-xl border text-xs font-bold flex justify-between items-center ${isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <span>{isBalanced ? '✅ Total alokasi 100% — Seimbang!' : `⚠️ Total alokasi ${totalPct}% — harus 100%`}</span>
                <span className="font-mono text-sm">{totalPct}%</span>
              </div>
            </div>

            {/* Tombol Simpan Snapshot */}
            <div className="flex gap-3">
              <button onClick={handleSaveSnapshot}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4" /> Simpan Snapshot Alokasi
              </button>
              <button onClick={() => {
                const printWin = window.open('', '_blank');
                if (!printWin) return;
                const rows = amounts.map(a =>
                  `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${a.icon} ${a.label}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${a.pct}%</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:bold;">${formatCurrency(a.amount)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${formatCurrency(a.opexAmount)}</td></tr>`
                ).join('');
                printWin.document.write(`
                  <html><head><title>Alokasi & Anggaran</title>
                  <style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1f2937;}h1{font-size:22px;color:#065f46;}table{width:100%;border-collapse:collapse;}th{background:#f3f4f6;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;}.total{background:#f0fdf4;padding:12px;border-radius:8px;margin-top:16px;}</style></head><body>
                  <h1>📊 LAPORAN ALOKASI & ANGGARAN</h1>
                  <div style="color:#6b7280;font-size:12px;margin-bottom:20px;">Omzet: ${formatCurrency(monthlyRevenue)} | ${new Date().toLocaleDateString('id-ID')}</div>
                  <table><thead><tr><th>Pos</th><th style="text-align:center;">%</th><th style="text-align:right;">Alokasi</th><th style="text-align:right;">OPEX Real</th></tr></thead><tbody>${rows}</tbody></table>
                  <div class="total">Total Teralokasi: ${formatCurrency(amounts.reduce((s, a) => s + a.amount, 0))} (${totalPct}%)</div>
                  <script>window.print();<\\/script></body></html>
                `);
                printWin.document.close();
              }} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5">
                <Printer className="w-4 h-4" /> Cetak
              </button>
            </div>
          </div>

          {/* RIGHT: Visual + Summary */}
          <div className="lg:col-span-5 space-y-4">
            {/* Pie Chart */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Visual Breakdown</h3>
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
                        <span className="text-[9px] text-gray-400 uppercase font-bold">Omzet</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {!isBalanced && (
                <div className="text-center py-8 text-xs text-amber-600 font-bold">
                  Atur persentase hingga total 100% untuk melihat pie chart.
                </div>
              )}
              <div className="space-y-1.5">
                {amounts.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: a.color }} />
                      <span>{a.icon} {a.label}</span>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="font-bold text-gray-900 font-mono">{a.pct}%</span>
                      <span className="text-gray-600 font-mono w-24 text-right">{formatCurrency(a.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between text-sm font-bold">
                <span className="text-gray-700">Total Dialokasikan</span>
                <span className="font-mono text-emerald-700">{formatCurrency(amounts.reduce((s, a) => s + a.amount, 0))}</span>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Ringkasan</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-50 p-2.5 rounded-lg">
                  <span className="text-[9px] text-gray-500 block uppercase font-bold">Revenue</span>
                  <span className="font-mono font-bold text-emerald-800">{formatCurrency(monthlyRevenue)}</span>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-lg">
                  <span className="text-[9px] text-gray-500 block uppercase font-bold">Total Alokasi</span>
                  <span className="font-mono font-bold text-blue-800">{totalPct}%</span>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-lg">
                  <span className="text-[9px] text-gray-500 block uppercase font-bold">Total OPEX</span>
                  <span className="font-mono font-bold text-amber-800">{formatCurrency(rules.reduce((s, r) => s + r.opexAmount, 0))}</span>
                </div>
                <div className="bg-purple-50 p-2.5 rounded-lg">
                  <span className="text-[9px] text-gray-500 block uppercase font-bold">Sisa Alokasi</span>
                  <span className="font-mono font-bold text-purple-800">{formatCurrency(monthlyRevenue - amounts.reduce((s, a) => s + a.amount, 0))}</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-xl border border-emerald-100 text-xs space-y-1">
              <span className="font-bold text-emerald-800 block mb-1">💡 Cara Kerja</span>
              <p className="text-emerald-700">Setiap pos punya 3 parameter:</p>
              <ul className="list-disc list-inside text-emerald-700 space-y-0.5">
                <li><strong>Alokasi %</strong> — persentase revenue yang dialokasikan ke pos ini</li>
                <li><strong>Batas Anggaran %</strong> — batas maksimal pengeluaran riil</li>
                <li><strong>OPEX Real (Rp)</strong> — biaya aktual per bulan (input manual atau otomatis dari Waste/R&D)</li>
              </ul>
              <p className="text-emerald-700 mt-1">Total alokasi harus 100%. Biaya operasional (listrik, gas, dll) via OPEX — <strong>tidak perlu di-resep lagi</strong>.</p>
            </div>
          </div>
        </div>
      ) : (
        /* TAB: HISTORY */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" /> Riwayat Snapshot Alokasi
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setActiveTab('alokasi')}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer">
                ← Kembali ke Alokasi
              </button>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="p-8 text-center">
              <PieChart className="w-10 h-10 text-gray-200 mx-auto stroke-1 mb-2" />
              <p className="text-sm text-gray-500 font-semibold">Belum Ada Snapshot</p>
              <p className="text-xs text-gray-400 mt-1">Atur alokasi lalu klik "Simpan Snapshot" untuk menyimpan riwayat.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map(h => (
                <div key={h.id} className="p-4 hover:bg-gray-50/50">
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
