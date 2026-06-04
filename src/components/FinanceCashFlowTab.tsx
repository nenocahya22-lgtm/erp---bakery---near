import React, { useState } from 'react';
import { CalculationResult } from '../types';
import { CircleDollarSign, ArrowUpRight, ArrowDownRight, Coins, Sliders, HelpCircle, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface FinanceCashFlowTabProps {
  calculatedProducts: CalculationResult[];
  wasteTotalLoss: number;
  rdTotalCost: number;
}

export default function FinanceCashFlowTab({ calculatedProducts, wasteTotalLoss, rdTotalCost }: FinanceCashFlowTabProps) {
  // Format numeric helper for IDR Currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Cash flow master parameters
  const [initialCash, setInitialCash] = useState<number>(100000000); // Saldo kas tunai aktif
  const [simulatedMonthlySales, setSimulatedMonthlySales] = useState<number>(3500); // volume jual per bulan
  
  // Real dynamic OPEX state
  const [rentOpex, setRentOpex] = useState<number>(10000000); // Sewa ruko bulanan
  const [wagesOpex, setWagesOpex] = useState<number>(15000000); // Gaji sdm/baker
  const [utilityOpex, setUtilityOpex] = useState<number>(3500000); // Listrik & gas oven
  const [marketingOpex, setMarketingOpex] = useState<number>(2000000); // Promosi & iklan

  // --- NEW: KATEGORI ANGGARAN / BUDGET PERCENTAGE ALLOCATION TARGETS ---
  // Owner can configure how many % of total revenue can be allocated to categories
  const [budgetWastePct, setBudgetWastePct] = useState<number>(3.5); // Max % of revenue on waste
  const [budgetRdPct, setBudgetRdPct] = useState<number>(5.0); // Max % of revenue on R&D trials
  const [budgetOpsPct, setBudgetOpsPct] = useState<number>(15.0); // Max % of revenue on general operations (utilities, rent, marketing)
  const [budgetSdmPct, setBudgetSdmPct] = useState<number>(25.0); // Max % of revenue on SDM (wages)

  // Calculations based on live recipe database HPP & Selling Prices
  const totalProducts = calculatedProducts.length;
  
  // Strict actual financial variables base
  const avgSellingPrice = totalProducts > 0 
    ? calculatedProducts.reduce((sum, p) => sum + p.hargaJualPerPorsi, 0) / totalProducts
    : 18000;
    
  const avgHppCost = totalProducts > 0
    ? calculatedProducts.reduce((sum, p) => sum + p.hppPerPorsi, 0) / totalProducts
    : 8500;

  // Revenue projection from real recipe pricing baseline
  const actualRevenue = Math.round(avgSellingPrice * simulatedMonthlySales);
  const actualCOGS = Math.round(avgHppCost * simulatedMonthlySales);

  // Total OPEX
  const totalOPEX = rentOpex + wagesOpex + utilityOpex + marketingOpex;
  
  // Net cash flow incorporating actual waste + actual R&D costs
  const actualNetIncome = actualRevenue - actualCOGS - totalOPEX - wasteTotalLoss - rdTotalCost;
  const netMarginPercent = actualRevenue > 0 ? (actualNetIncome / actualRevenue) * 100 : 0;

  // Runway calculation
  const monthlyTotalBurn = actualCOGS + totalOPEX + wasteTotalLoss + rdTotalCost;
  const runwayMonths = (monthlyTotalBurn - actualRevenue) > 0 
    ? (initialCash / (monthlyTotalBurn - actualRevenue)) 
    : Infinity;

  // Actual percentages of current revenue used for budget compliance visual check
  const actualWastePct = actualRevenue > 0 ? (wasteTotalLoss / actualRevenue) * 100 : 0;
  const actualRdPct = actualRevenue > 0 ? (rdTotalCost / actualRevenue) * 100 : 0;
  const actualOpsPct = actualRevenue > 0 ? ((utilityOpex + rentOpex + marketingOpex) / actualRevenue) * 100 : 0;
  const actualSdmPct = actualRevenue > 0 ? (wagesOpex / actualRevenue) * 100 : 0;

  // Budget Compliance Flags
  const isWasteOverBudget = actualWastePct > budgetWastePct;
  const isRdOverBudget = actualRdPct > budgetRdPct;
  const isOpsOverBudget = actualOpsPct > budgetOpsPct;
  const isSdmOverBudget = actualSdmPct > budgetSdmPct;

  // Save allocations to localStorage so that they can be read by other modules if needed
  React.useEffect(() => {
    localStorage.setItem('budget_waste_pct', budgetWastePct.toString());
    localStorage.setItem('budget_rd_pct', budgetRdPct.toString());
    localStorage.setItem('budget_ops_pct', budgetOpsPct.toString());
    localStorage.setItem('budget_sdm_pct', budgetSdmPct.toString());
    
    // Save state warning indicators
    const hasViolation = isWasteOverBudget || isRdOverBudget || isOpsOverBudget || isSdmOverBudget;
    localStorage.setItem('budget_compliance_violation', hasViolation ? 'true' : 'false');
  }, [budgetWastePct, budgetRdPct, budgetOpsPct, budgetSdmPct, isWasteOverBudget, isRdOverBudget, isOpsOverBudget, isSdmOverBudget]);

  return (
    <div id="finance-cash-flow-container" className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
            <CircleDollarSign className="w-6 h-6 text-emerald-600" />
            Keuangan & Pengaturan Kategori Anggaran (Cash Flow)
          </h2>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            Definisikan target limits persentase anggaran untuk Waste, Litbang, SDM, dan Operasional lalu pantau kepatuhannya secara real-time.
          </p>
        </div>
        <div className="text-right text-xs bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-3 py-1.5 rounded-xl font-mono">
          Runway Kas: {runwayMonths === Infinity ? 'Aman (Surplus)' : `${runwayMonths.toFixed(1)} Bulan`}
        </div>
      </div>

      {/* CASH FLOW SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Metric 1: Inflow */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Proyeksi Inflow (Omzet)</span>
          <p className="font-mono text-lg font-black text-emerald-700">{formatCurrency(actualRevenue)}</p>
          <div className="text-[10px] text-gray-400 font-medium">Vol Jual: {simulatedMonthlySales} pcs | Rerata Jual {formatCurrency(avgSellingPrice)}</div>
        </div>

        {/* Metric 2: Outflow */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Proyeksi Outflow (HPP+OPEX)</span>
          <p className="font-mono text-lg font-black text-rose-600">{formatCurrency(actualCOGS + totalOPEX)}</p>
          <div className="text-[10px] text-gray-400 font-medium">HPP: {formatCurrency(actualCOGS)} | OPEX: {formatCurrency(totalOPEX)}</div>
        </div>

        {/* Metric 3: Active Waste + RD Damage */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Penyusutan Waste & Kos R&D</span>
          <p className="font-mono text-lg font-black text-slate-900">{formatCurrency(wasteTotalLoss + rdTotalCost)}</p>
          <div className="text-[10px] text-gray-400 font-medium">Waste: {formatCurrency(wasteTotalLoss)} | Litbang R&D: {formatCurrency(rdTotalCost)}</div>
        </div>

        {/* Metric 4: Net Profit */}
        <div className={`p-4.5 rounded-2xl border shadow-xs space-y-1 ${
          actualNetIncome >= 0 ? 'bg-emerald-50/55 border-emerald-100' : 'bg-red-50/50 border-red-100'
        }`}>
          <span className="text-[10px] uppercase font-bold text-gray-500 block">Laba / Cash Flow Bersih</span>
          <p className={`font-mono text-lg font-black ${actualNetIncome >= 0 ? 'text-emerald-700' : 'text-red-650'}`}>{formatCurrency(actualNetIncome)}</p>
          <div className="text-[10px] text-gray-400 font-bold flex justify-between">
            <span>Netto Margin:</span>
            <span className={actualNetIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}>{netMarginPercent.toFixed(1)}%</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* BUDGET ALLOCATION SETTINGS CARD */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-5">
          <div className="border-b border-gray-50 pb-2 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4.5 h-4.5 text-emerald-600" />
                Target Limit Kategori Anggaran (% Omzet)
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Konfigurasikan batas rasio pengeluaran ideal untuk kelangsungan bisnis kustom Anda.</p>
            </div>
          </div>

          <div className="space-y-4">
            
            {/* Waste Budget percentage limit */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-150">
              <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                <span>1. Budget Limit Waste (Limbah)</span>
                <span className="text-emerald-700 font-mono">{budgetWastePct.toFixed(1)}% dari Omzet</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="15"
                step="0.5"
                value={budgetWastePct}
                onChange={(e) => setBudgetWastePct(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[10px] text-gray-400 leading-none">Rekomendasi rasio limbah roti aman berkisar 2.0% - 5.0% dari target omzet operasional.</p>
            </div>

            {/* R&D Budget percentage limit */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-150">
              <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                <span>2. Budget Limit R&D (Litbang Trial)</span>
                <span className="text-emerald-700 font-mono">{budgetRdPct.toFixed(1)}% dari Omzet</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={budgetRdPct}
                onChange={(e) => setBudgetRdPct(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[10px] text-gray-400 leading-none">Rencana uji coba & trial menu porsi baru untuk stabilitas persaingan pasar di ritel.</p>
            </div>

            {/* Ops Cost Budget percentage limit */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-150">
              <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                <span>3. Budget Limit Operasional (Sewa + Utilitas)</span>
                <span className="text-emerald-700 font-mono">{budgetOpsPct.toFixed(1)}% dari Omzet</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={budgetOpsPct}
                onChange={(e) => setBudgetOpsPct(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[10px] text-gray-400 leading-none">Termasuk sewa ruko, oven listrik gas, air, pemeliharaan mesin, dan ads marketing.</p>
            </div>

            {/* Wages/SDM Budget percentage limit */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-150">
              <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                <span>4. Budget Limit Penggajian SDM (Gaji Baker Staf)</span>
                <span className="text-emerald-700 font-mono">{budgetSdmPct.toFixed(1)}% dari Omzet</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                step="1"
                value={budgetSdmPct}
                onChange={(e) => setBudgetSdmPct(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[10px] text-gray-400 leading-none">Total remunerasi gaji, bonus, lembur dapur baker pusat dan penjaga etalase toko kasir.</p>
            </div>

          </div>
        </div>

        {/* COMPLIANCE REAL-TIME MONITOR CARD */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="border-b border-gray-50 pb-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-650" />
              Kepatuhan Anggaran Real-time
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Mendeteksi kebocoran dan deviasi biaya terhadap rasio target anggaran yang ditetapkan.</p>
          </div>

          <div className="space-y-4 pt-1">
            
            {/* Waste Compliance Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-800">1. Realisasi Waste (Limbah Roti)</span>
                <span className={`font-mono ${isWasteOverBudget ? 'text-red-600' : 'text-emerald-700'}`}>
                  {actualWastePct.toFixed(2)}% / {budgetWastePct.toFixed(1)}% Limit
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${isWasteOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (actualWastePct / (budgetWastePct || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-gray-450 leading-none">
                <span>Nilai Riil Kehilangan: {formatCurrency(wasteTotalLoss)}</span>
                <span className={isWasteOverBudget ? 'text-red-650 animate-pulse font-extrabold' : 'text-emerald-700'}>
                  {isWasteOverBudget ? '⚠️ OVER BUDGET!' : '✓ Compliant'}
                </span>
              </div>
            </div>

            {/* R&D Compliance Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-800">2. Realisasi Pengeluaran R&D</span>
                <span className={`font-mono ${isRdOverBudget ? 'text-red-650' : 'text-emerald-700'}`}>
                  {actualRdPct.toFixed(2)}% / {budgetRdPct.toFixed(1)}% Limit
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${isRdOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (actualRdPct / (budgetRdPct || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-gray-450 leading-none">
                <span>Biaya Trial: {formatCurrency(rdTotalCost)}</span>
                <span className={isRdOverBudget ? 'text-red-650 animate-pulse font-extrabold' : 'text-emerald-700'}>
                  {isRdOverBudget ? '⚠️ OVER BUDGET!' : '✓ Compliant'}
                </span>
              </div>
            </div>

            {/* OPEX Compliance Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-800">3. Realisasi Operasional & Rutin</span>
                <span className={`font-mono ${isOpsOverBudget ? 'text-red-650' : 'text-emerald-700'}`}>
                  {actualOpsPct.toFixed(2)}% / {budgetOpsPct.toFixed(1)}% Limit
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${isOpsOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (actualOpsPct / (budgetOpsPct || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-gray-450 leading-none">
                <span>Sewa, Utilitas & Promosi: {formatCurrency(utilityOpex + rentOpex + marketingOpex)}</span>
                <span className={isOpsOverBudget ? 'text-red-650 animate-pulse font-extrabold' : 'text-emerald-700'}>
                  {isOpsOverBudget ? '⚠️ OVER BUDGET!' : '✓ Compliant'}
                </span>
              </div>
            </div>

            {/* Wages Compliance Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-800">4. Realisasi Gaji Baker Staf (SDM)</span>
                <span className={`font-mono ${isSdmOverBudget ? 'text-red-650' : 'text-emerald-700'}`}>
                  {actualSdmPct.toFixed(2)}% / {budgetSdmPct.toFixed(1)}% Limit
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${isSdmOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (actualSdmPct / (budgetSdmPct || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-gray-450 leading-none">
                <span>Gaji Staff Ritel & Baker: {formatCurrency(wagesOpex)}</span>
                <span className={isSdmOverBudget ? 'text-red-650 animate-pulse font-extrabold' : 'text-emerald-700'}>
                  {isSdmOverBudget ? '⚠️ OVER BUDGET!' : '✓ Compliant'}
                </span>
              </div>
            </div>

          </div>

          <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-150 space-y-2 text-xs">
            <h4 className="font-bold text-gray-900 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Saran Integrasi Keuangan ERP:
            </h4>
            <p className="text-gray-500 text-[11px] leading-relaxed">
              {(isWasteOverBudget || isRdOverBudget || isOpsOverBudget || isSdmOverBudget) ? (
                <span className="text-red-700 font-bold">Laju pengeluaran Anda melewati batas pengaman rasio omzet! Kurangi porsi kerusakan bahan sisa di dapur pusat untuk meggeser posisi cash flow kembali hijau aman.</span>
              ) : (
                <span className="text-emerald-800">Rasio keuangan di seluruh lini sejalan dengan anggaran aman owner. Pertahankan performa harian kasir guna menjaga ekuilibrium arus kas.</span>
              )}
            </p>
          </div>
        </div>

        {/* MANUAL ADJUSTMENTS CONFIG CARD */}
        <div className="lg:col-span-12 bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
          <div className="border-b border-gray-50 pb-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-4.5 h-4.5 text-emerald-600" />
              Ubah Parameter Pemasukan & Parameter Biaya Tetap (OPEX)
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Sesuaikan saldo berjalan dan parameter biaya tetap bulanan guna simulasi model usaha bisnis makro.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
            
            <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-150">
              <h4 className="text-gray-800 uppercase tracking-widest font-extrabold">1. Parameter Target Kas Ritel</h4>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Kas Tunai Aktif Berjalan</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={initialCash}
                    onChange={(e) => setInitialCash(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Target Volume Jual Bulanan (Roti/Kue)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={simulatedMonthlySales}
                    onChange={(e) => setSimulatedMonthlySales(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-[10px]">pcs</span>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-150">
              <h4 className="text-gray-800 uppercase tracking-widest font-extrabold">2. Biaya Tetap OPEX (Grup A)</h4>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Biaya Gaji Staff Baker</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={wagesOpex}
                    onChange={(e) => setWagesOpex(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Sewa Gerai Toko / Ruko</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={rentOpex}
                    onChange={(e) => setRentOpex(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-150">
              <h4 className="text-gray-800 uppercase tracking-widest font-extrabold">3. Biaya Tetap OPEX (Grup B)</h4>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Listrik, Air & Gas Oven Pusat</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={utilityOpex}
                    onChange={(e) => setUtilityOpex(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Sponsor Iklan & Brosur Marketing</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={marketingOpex}
                    onChange={(e) => setMarketingOpex(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
