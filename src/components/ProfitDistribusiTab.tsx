import React, { useState, useEffect } from 'react';
import { PieChart, DollarSign, Percent, TrendingUp, Printer, RefreshCw, Clock, Trash2 } from 'lucide-react';

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

const DEFAULT_RULES: AllocationRule[] = [
  { id: 'produksi', label: 'Biaya Produksi', icon: '🏭', pct: 40, color: '#10b981' },
  { id: 'waste', label: 'Waste & Write-off', icon: '🗑️', pct: 5, color: '#ef4444' },
  { id: 'rd', label: 'R&D Budget', icon: '🔬', pct: 5, color: '#8b5cf6' },
  { id: 'sewa', label: 'Sewa Ruko', icon: '🏠', pct: 15, color: '#f59e0b' },
  { id: 'gaji', label: 'Gaji Staff', icon: '👨‍🍳', pct: 20, color: '#3b82f6' },
  { id: 'ops', label: 'Operasional Lain', icon: '📦', pct: 5, color: '#ec4899' },
  { id: 'laba', label: 'Laba Bersih Owner', icon: '🏦', pct: 10, color: '#14b8a6' },
];

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
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');

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

  // Calculate if each allocation is balanced relative to others
  const amounts = rules.map(r => ({ ...r, amount: Math.round(monthlyRevenue * r.pct / 100) }));

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

      {/* TAB NAV */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'settings' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
          <Percent className="w-3.5 h-3.5 inline mr-1" /> Atur Alokasi
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
          <Clock className="w-3.5 h-3.5 inline mr-1" /> Riwayat
        </button>
      </div>

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
              <p className="text-[10px] text-gray-400 mt-2">Simpan snapshot alokasi ke riwayat untuk tracking bulanan.</p>
            </div>
          </div>

          {/* KANAN: Visual Breakdown */}
          <div className="lg:col-span-5 space-y-4">
            {/* Pie Chart Visual */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Visual Breakdown</h3>
              
              {/* Simple Pie representation using conic-gradient */}
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

              {/* Legend */}
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
