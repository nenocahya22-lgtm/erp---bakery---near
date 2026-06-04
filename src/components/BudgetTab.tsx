import React from 'react';
import { Sliders, CheckCircle2, AlertTriangle, Coins } from 'lucide-react';
import { CalculationResult } from '../types';

interface BudgetTabProps {
  calculatedProducts: CalculationResult[];
  wasteTotalLoss: number;
  rdTotalCost: number;
}

export default function BudgetTab({ calculatedProducts, wasteTotalLoss, rdTotalCost }: BudgetTabProps) {
  const [budgetWastePct, setBudgetWastePct] = React.useState(3.5);
  const [budgetRdPct, setBudgetRdPct] = React.useState(5.0);
  const [budgetOpsPct, setBudgetOpsPct] = React.useState(15.0);
  const [budgetSdmPct, setBudgetSdmPct] = React.useState(25.0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const totalRevenue = calculatedProducts.length > 0
    ? calculatedProducts.reduce((s, p) => s + p.hargaJual, 0) * 100
    : 10000000;

  const actualWastePct = totalRevenue > 0 ? (wasteTotalLoss / totalRevenue) * 100 : 0;
  const actualRdPct = totalRevenue > 0 ? (rdTotalCost / totalRevenue) * 100 : 0;
  const actualOpsPct = budgetOpsPct; // Simplified placeholder
  const actualSdmPct = budgetSdmPct;

  const isWasteOver = actualWastePct > budgetWastePct;
  const isRdOver = actualRdPct > budgetRdPct;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Coins className="w-6 h-6 text-emerald-600" /> Anggaran Budget
        </h2>
        <p className="text-xs text-gray-500 mt-1">Tetapkan batas persentase anggaran untuk Waste, R&D, SDM, dan Operasional.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BUDGET SETTINGS */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <Sliders className="w-4 h-4 text-emerald-600" /> Target Limit Anggaran (%)
          </h3>

          <BudgetSlider label="Waste (Limbah)" value={budgetWastePct} onChange={setBudgetWastePct} min={0.5} max={15} step={0.5} />
          <BudgetSlider label="R&D (Litbang)" value={budgetRdPct} onChange={setBudgetRdPct} min={1} max={20} step={0.5} />
          <BudgetSlider label="Operasional (Sewa+Utilitas)" value={budgetOpsPct} onChange={setBudgetOpsPct} min={5} max={40} step={1} />
          <BudgetSlider label="SDM (Gaji Staf)" value={budgetSdmPct} onChange={setBudgetSdmPct} min={10} max={45} step={1} />
        </div>

        {/* COMPLIANCE MONITOR */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Kepatuhan Real-time
          </h3>

          <ComplianceBar label="Waste" actual={actualWastePct} limit={budgetWastePct} loss={wasteTotalLoss} isOver={isWasteOver} />
          <ComplianceBar label="R&D" actual={actualRdPct} limit={budgetRdPct} loss={rdTotalCost} isOver={isRdOver} />

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
            <span className="font-bold text-gray-900 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Saran:
            </span>
            <p className="text-gray-500 text-[11px] mt-1">
              {(isWasteOver || isRdOver)
                ? 'Pengeluaran melebihi batas aman! Kurangi waste dan biaya trial.'
                : 'Rasio keuangan sesuai anggaran. Pertahankan performa.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetSlider({ label, value, onChange, min, max, step }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number;
}) {
  return (
    <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-150">
      <div className="flex justify-between text-xs font-bold text-gray-700">
        <span>{label}</span>
        <span className="text-emerald-700 font-mono">{value.toFixed(1)}%</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-600 cursor-pointer" />
    </div>
  );
}

function ComplianceBar({ label, actual, limit, loss, isOver }: {
  label: string; actual: number; limit: number; loss: number; isOver: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-gray-800">{label}</span>
        <span className={`font-mono ${isOver ? 'text-red-600' : 'text-emerald-700'}`}>
          {actual.toFixed(2)}% / {limit.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(100, (actual / (limit || 1)) * 100)}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>Loss: {loss.toLocaleString('id-ID')}</span>
        <span className={isOver ? 'text-red-600 font-bold' : 'text-emerald-700'}>{isOver ? '⚠️ OVER!' : '✓ OK'}</span>
      </div>
    </div>
  );
}
