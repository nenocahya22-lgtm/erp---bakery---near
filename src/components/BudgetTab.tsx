import React, { useState, useEffect } from 'react';
import { Sliders, CheckCircle2, AlertTriangle, Coins, Trash2, Plus } from 'lucide-react';
import { CalculationResult } from '../types';

interface BudgetTabProps {
  calculatedProducts: CalculationResult[];
  wasteTotalLoss: number;
  rdTotalCost: number;
}

export default function BudgetTab({ calculatedProducts, wasteTotalLoss, rdTotalCost }: BudgetTabProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Budget items — dinamis CRUD
  const [budgetItems, setBudgetItems] = useState<{ id: string; label: string; budgetPct: number; actualValue: number }[]>(() => {
    const saved = localStorage.getItem('budget_items_data');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'bgt-1', label: 'Waste (Limbah)', budgetPct: 3.5, actualValue: wasteTotalLoss },
      { id: 'bgt-2', label: 'R&D (Litbang)', budgetPct: 5.0, actualValue: rdTotalCost },
      { id: 'bgt-3', label: 'Operasional', budgetPct: 15.0, actualValue: 0 },
      { id: 'bgt-4', label: 'SDM (Gaji)', budgetPct: 25.0, actualValue: 0 },
    ];
  });
  const [newLabel, setNewLabel] = useState('');
  const [newBudgetPct, setNewBudgetPct] = useState('5');

  useEffect(() => { localStorage.setItem('budget_items_data', JSON.stringify(budgetItems)); }, [budgetItems]);

  const addBudgetItem = () => {
    if (!newLabel.trim() || !newBudgetPct) return;
    setBudgetItems(prev => [...prev, { id: `bgt-${Date.now()}`, label: newLabel.trim(), budgetPct: parseFloat(newBudgetPct) || 0, actualValue: 0 }]);
    setNewLabel('');
    setNewBudgetPct('5');
  };

  const deleteBudgetItem = (id: string) => {
    if (window.confirm('Hapus item anggaran ini?')) {
      setBudgetItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateBudgetPct = (id: string, pct: number) => {
    setBudgetItems(prev => prev.map(item => item.id === id ? { ...item, budgetPct: pct } : item));
  };

  const updateActualValue = (id: string, val: number) => {
    setBudgetItems(prev => prev.map(item => item.id === id ? { ...item, actualValue: val } : item));
  };

  // Update waste & rd actual values from props
  useEffect(() => {
    setBudgetItems(prev => prev.map(item => {
      if (item.label.toLowerCase().includes('waste')) return { ...item, actualValue: wasteTotalLoss };
      if (item.label.toLowerCase().includes('rd') || item.label.toLowerCase().includes('litbang')) return { ...item, actualValue: rdTotalCost };
      return item;
    }));
  }, [wasteTotalLoss, rdTotalCost]);

  const totalRevenue = (() => {
    try {
      const saved = localStorage.getItem('revenue_tracker_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        const txs = parsed.transactions || [];
        const total = txs.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
        if (total > 0) return total;
      }
    } catch (e) {
      console.error(e);
    }
    return calculatedProducts.length > 0
      ? calculatedProducts.reduce((s, p) => s + p.hargaJual, 0) * 10
      : 10000000;
  })();

  const totalBudgetPct = budgetItems.reduce((sum, item) => sum + item.budgetPct, 0);
  const itemsOverBudget = budgetItems.filter(item => {
    const actualPct = totalRevenue > 0 ? (item.actualValue / totalRevenue) * 100 : 0;
    return actualPct > item.budgetPct;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Coins className="w-6 h-6 text-emerald-600" /> Anggaran Budget
        </h2>
        <p className="text-xs text-gray-500 mt-1">Tetapkan batas persentase anggaran untuk Waste, R&D, SDM, dan Operasional.</p>
      </div>

      {/* BUDGET DINAMIS CRUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BUDGET SETTINGS — DINAMIS */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <Sliders className="w-4 h-4 text-emerald-600" /> Items Anggaran — Dinamis
          </h3>
          
          {budgetItems.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada item anggaran. Tambah di bawah.</p>
          ) : (
            <div className="space-y-3">
              {budgetItems.map(item => {
                const actualPct = totalRevenue > 0 ? (item.actualValue / totalRevenue) * 100 : 0;
                const isOver = actualPct > item.budgetPct;
                return (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-700">{item.label}</span>
                      <button onClick={() => deleteBudgetItem(item.id)}
                        className="p-0.5 text-gray-400 hover:text-red-600 transition cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 shrink-0">Limit:</span>
                      <input type="range" min={0.5} max={45} step={0.5} value={item.budgetPct}
                        onChange={(e) => updateBudgetPct(item.id, parseFloat(e.target.value))}
                        className="flex-1 accent-emerald-600" />
                      <span className="text-xs font-mono font-bold text-emerald-700 w-12 text-right">{item.budgetPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, (actualPct / item.budgetPct) * 100)}%` }} />
                      </div>
                      <span className={`font-mono font-bold ${isOver ? 'text-red-600' : 'text-emerald-700'}`}>
                        {actualPct.toFixed(1)}% / {item.budgetPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Form tambah */}
          <div className="flex items-center gap-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
            <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="Nama anggaran..." className="flex-1 border border-emerald-200 rounded-lg p-1.5 text-xs font-semibold" />
            <input type="number" value={newBudgetPct} onChange={e => setNewBudgetPct(e.target.value)}
              placeholder="%" className="w-16 border border-emerald-200 rounded-lg p-1.5 text-xs font-mono font-bold" />
            <button onClick={addBudgetItem} disabled={!newLabel.trim() || !newBudgetPct}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-[10px] font-bold rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-1">
              <Plus className="w-3 h-3" /> Tambah
            </button>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs">
            <div className="flex justify-between font-bold">
              <span>Total Alokasi Anggaran:</span>
              <span className={`font-mono ${totalBudgetPct > 100 ? 'text-red-600' : 'text-emerald-700'}`}>
                {totalBudgetPct.toFixed(1)}%{totalBudgetPct > 100 ? ' ⚠️ OVER!' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* COMPLIANCE MONITOR */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Kepatuhan Real-time
          </h3>

          {budgetItems.map(item => {
            const actualPct = totalRevenue > 0 ? (item.actualValue / totalRevenue) * 100 : 0;
            const isOver = actualPct > item.budgetPct;
            return (
              <div key={item.id} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-800">{item.label}</span>
                  <span className={`font-mono ${isOver ? 'text-red-600' : 'text-emerald-700'}`}>
                    {actualPct.toFixed(2)}% / {item.budgetPct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (actualPct / (item.budgetPct || 1)) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Nilai: {item.actualValue.toLocaleString('id-ID')}</span>
                  <span className={isOver ? 'text-red-600 font-bold' : 'text-emerald-700'}>{isOver ? '⚠️ OVER!' : '✓ OK'}</span>
                </div>
              </div>
            );
          })}

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
            <span className="font-bold text-gray-900 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Saran:
            </span>
            <p className="text-gray-500 text-[11px] mt-1">
              {itemsOverBudget.length > 0
                ? `${itemsOverBudget.length} item melebihi batas anggaran! Evaluasi pengeluaran.`
                : 'Rasio keuangan sesuai anggaran. Pertahankan performa.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
