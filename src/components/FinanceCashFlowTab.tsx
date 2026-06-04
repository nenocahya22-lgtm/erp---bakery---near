import React, { useState } from 'react';
import { CalculationResult } from '../types';
import { CircleDollarSign, Coins } from 'lucide-react';

interface FinanceCashFlowTabProps {
  calculatedProducts: CalculationResult[];
  wasteTotalLoss: number;
  rdTotalCost: number;
}

export default function FinanceCashFlowTab({ calculatedProducts, wasteTotalLoss, rdTotalCost }: FinanceCashFlowTabProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const [initialCash, setInitialCash] = useState(100000000);
  const [simulatedMonthlySales, setSimulatedMonthlySales] = useState(3500);
  const [rentOpex, setRentOpex] = useState(10000000);
  const [wagesOpex, setWagesOpex] = useState(15000000);
  const [utilityOpex, setUtilityOpex] = useState(3500000);
  const [marketingOpex, setMarketingOpex] = useState(2000000);

  const totalProducts = calculatedProducts.length;
  const avgSellingPrice = totalProducts > 0
    ? calculatedProducts.reduce((sum, p) => sum + p.hargaJualPerPorsi, 0) / totalProducts : 18000;
  const avgHppCost = totalProducts > 0
    ? calculatedProducts.reduce((sum, p) => sum + p.hppPerPorsi, 0) / totalProducts : 8500;

  const actualRevenue = Math.round(avgSellingPrice * simulatedMonthlySales);
  const actualCOGS = Math.round(avgHppCost * simulatedMonthlySales);
  const totalOPEX = rentOpex + wagesOpex + utilityOpex + marketingOpex;
  const actualNetIncome = actualRevenue - actualCOGS - totalOPEX - wasteTotalLoss - rdTotalCost;
  const netMarginPercent = actualRevenue > 0 ? (actualNetIncome / actualRevenue) * 100 : 0;

  const monthlyTotalBurn = actualCOGS + totalOPEX + wasteTotalLoss + rdTotalCost;
  const runwayMonths = (monthlyTotalBurn - actualRevenue) > 0
    ? (initialCash / (monthlyTotalBurn - actualRevenue)) : Infinity;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
            <CircleDollarSign className="w-6 h-6 text-emerald-600" /> Arus Kas (Cash Flow)
          </h2>
          <p className="text-xs text-gray-500 mt-1">Pantau arus kas masuk/keluar dan atur parameter biaya tetap bulanan.</p>
        </div>
        <div className="text-right text-xs bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-3 py-1.5 rounded-xl font-mono">
          Runway: {runwayMonths === Infinity ? 'Surplus' : `${runwayMonths.toFixed(1)} Bulan`}
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Inflow (Omzet)</span>
          <p className="font-mono text-lg font-black text-emerald-700">{formatCurrency(actualRevenue)}</p>
          <div className="text-[10px] text-gray-400">Vol Jual: {simulatedMonthlySales} pcs</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Outflow (HPP+OPEX)</span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
          <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-150">
            <h4 className="text-gray-800 uppercase tracking-widest font-extrabold">1. Target Kas</h4>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Kas Tunai Aktif</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">Rp</span>
                <input type="number" value={initialCash}
                  onChange={(e) => setInitialCash(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Target Volume Jual</label>
              <input type="number" value={simulatedMonthlySales}
                onChange={(e) => setSimulatedMonthlySales(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold" />
            </div>
          </div>
          <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-150">
            <h4 className="text-gray-800 uppercase tracking-widest font-extrabold">2. OPEX Grup A</h4>
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
            <h4 className="text-gray-800 uppercase tracking-widest font-extrabold">3. OPEX Grup B</h4>
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
        </div>
      </div>
    </div>
  );
}
