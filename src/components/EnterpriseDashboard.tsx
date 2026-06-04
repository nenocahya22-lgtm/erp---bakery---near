import React, { useState } from 'react';
import { CalculationResult, BahanBaku } from '../types';
import { TrendingUp, DollarSign, BarChart3, FileDown, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface EnterpriseDashboardProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
}

export default function EnterpriseDashboard({ calculatedProducts }: EnterpriseDashboardProps) {
  const [laborMonthlyCost, setLaborMonthlyCost] = useState(12000000);
  const [electricityMonthlyCost, setElectricityMonthlyCost] = useState(3500000);
  const [packagingCostPerPiece, setPackagingCostPerPiece] = useState(1200);
  const [simulatedMonthlySalesCount, setSimulatedMonthlySalesCount] = useState(2400);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const estimatedPiecePriceAvg = calculatedProducts.length > 0
    ? calculatedProducts.reduce((acc, curr) => acc + curr.hargaJualPerPorsi, 0) / calculatedProducts.length
    : 0;

  const estimatedPieceHppAvg = calculatedProducts.length > 0
    ? calculatedProducts.reduce((acc, curr) => acc + curr.hppPerPorsi, 0) / calculatedProducts.length
    : 0;

  const grossMonthlyRevenue = estimatedPiecePriceAvg * simulatedMonthlySalesCount;
  const rawMaterialMonthlyCost = estimatedPieceHppAvg * simulatedMonthlySalesCount;
  const packagingMonthlyCost = packagingCostPerPiece * simulatedMonthlySalesCount;
  const totalOperatingCosts = laborMonthlyCost + electricityMonthlyCost;
  const grossMonthlyProfit = Math.max(0, grossMonthlyRevenue - rawMaterialMonthlyCost - packagingMonthlyCost);
  const netMonthlyIncome = grossMonthlyProfit - totalOperatingCosts;

  const avgMargin = calculatedProducts.length > 0
    ? calculatedProducts.reduce((acc, curr) => acc + curr.marginPersen, 0) / calculatedProducts.length
    : 0;

  const basePriceAvg = estimatedPiecePriceAvg > 0 ? estimatedPiecePriceAvg : 18500;
  const baseHppAvg = estimatedPieceHppAvg > 0 ? estimatedPieceHppAvg : 9800;

  const chartData = [
    { label: 'Jan 2026', mult: 0.82 },
    { label: 'Feb 2026', mult: 0.90 },
    { label: 'Mar 2026', mult: 1.05 },
    { label: 'Apr 2026', mult: 1.35 },
    { label: 'Mei 2026', mult: 1.00 },
    { label: 'Jun 2026', mult: 1.10 },
  ].map((m) => {
    const monthlySales = Math.round(simulatedMonthlySalesCount * m.mult);
    const revenue = basePriceAvg * monthlySales;
    const cogs = (baseHppAvg + packagingCostPerPiece) * monthlySales;
    return {
      name: m.label,
      'Pendapatan (Revenue)': Math.round(revenue),
      'HPP Terpadu (COGS)': Math.round(cogs),
      'Laba Kotor (Gross Profit)': Math.max(0, Math.round(revenue - cogs)),
    };
  });

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-950 text-white p-3.5 rounded-xl border border-gray-800 shadow-2xl text-xs font-semibold font-mono space-y-1.5 min-w-[200px]">
          <p className="text-gray-400 font-extrabold border-b border-gray-800 pb-1.5 font-sans">{label}</p>
          {payload.map((pld: any) => (
            <div key={pld.name} className="flex justify-between gap-6">
              <span className="flex items-center gap-1.5" style={{ color: pld.stroke || pld.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pld.stroke || pld.color }} />
                {pld.name}:
              </span>
              <span className="text-white font-bold">{formatCurrency(pld.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('BAKERY ERP - LAPORAN P&L', 10, 10);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(`Laporan: ${new Date().toLocaleString('id-ID', { dateStyle: 'long' })}`, 10, 22);
      doc.setDrawColor(229, 231, 235);
      doc.line(10, 24, 200, 24);

      doc.setTextColor(31, 41, 55);
      doc.setFontSize(9.5);
      doc.text('1. PARAMETER OPERASIONAL', 10, 30);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Volume Jual: ${simulatedMonthlySalesCount} pcs/bln`, 12, 36);
      doc.text(`Gaji: ${formatCurrency(laborMonthlyCost)}`, 110, 36);
      doc.text(`Listrik: ${formatCurrency(electricityMonthlyCost)}`, 110, 41);
      doc.text(`Kemasan: ${formatCurrency(packagingCostPerPiece)}/pcs`, 110, 46);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('2. IKHTISAR LABA RUGI', 10, 55);
      doc.line(10, 57, 200, 57);

      doc.setFillColor(243, 244, 246);
      doc.rect(10, 60, 190, 16, 'F');
      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('REVENUE', 15, 65);
      doc.text('COGS', 62, 65);
      doc.text('OPEX', 112, 65);
      doc.text('NET INCOME', 158, 65);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(16, 185, 129);
      doc.text(formatCurrency(grossMonthlyRevenue), 15, 72);
      doc.setTextColor(239, 68, 68);
      doc.text(formatCurrency(rawMaterialMonthlyCost + packagingMonthlyCost), 62, 72);
      doc.setTextColor(55, 65, 81);
      doc.text(formatCurrency(totalOperatingCosts), 112, 72);
      doc.setTextColor(netMonthlyIncome >= 0 ? 16 : 239, netMonthlyIncome >= 0 ? 185 : 68, netMonthlyIncome >= 0 ? 129 : 68);
      doc.text(formatCurrency(netMonthlyIncome), 158, 72);

      const chartCard = document.getElementById('monthly-trend-analysis-card');
      if (chartCard) {
        const canvas = await html2canvas(chartCard, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 190;
        const imgHeight = Math.min((canvas.height * imgWidth) / canvas.width, 72);
        doc.addImage(imgData, 'PNG', 10, 88, imgWidth, imgHeight);
      }

      doc.save(`P&L_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err: any) {
      setExportError(err?.message || 'Gagal export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Bulan', 'Revenue', 'COGS', 'Gross Profit'];
    const rows = chartData.map(d => [d.name, d['Pendapatan (Revenue)'], d['HPP Terpadu (COGS)'], d['Laba Kotor (Gross Profit)']]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `PL_Trend_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" /> Laporan P&L (Laba Rugi)
        </h2>
        <p className="text-xs text-gray-500 mt-1">Analisis laporan Laba Rugi real-time, grafik tren, dan ekspor PDF/CSV.</p>
      </div>

      {/* CHART */}
      <div id="monthly-trend-analysis-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-gray-50 gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" /> Tren Pendapatan vs COGS
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Proyeksi semester 1 berdasarkan data HPP & harga jual.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {exportError && <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2.5 py-1.5 rounded-lg">⚠️ {exportError}</span>}
            <button onClick={handleExportPDF} disabled={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-[11px] px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs">
              {isExporting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cetak PDF...</> : <><FileDown className="w-3.5 h-3.5" /> Export PDF</>}
            </button>
            <button onClick={handleExportCSV}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs">
              <FileDown className="w-3.5 h-3.5 text-emerald-400" /> CSV
            </button>
          </div>
        </div>

        <div className="h-[320px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCogs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" stroke="#6ca380" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} dy={8} />
              <YAxis stroke="#6ca380" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `Rp ${(v / 1e6).toFixed(1)}jt`} dx={-8} />
              <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
              <Legend verticalAlign="top" height={40} iconType="circle" iconSize={8}
                wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '10px' }} />
              <Area type="monotone" dataKey="Pendapatan (Revenue)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="HPP Terpadu (COGS)" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCogs)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P&L REPORT */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
          <DollarSign className="w-5 h-5 text-emerald-600" /> Laporan Laba Rugi Bulanan
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-semibold text-gray-700">
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Volume Jual</label>
            <input type="number" value={simulatedMonthlySalesCount}
              onChange={(e) => setSimulatedMonthlySalesCount(parseInt(e.target.value) || 100)}
              className="w-full bg-white border border-gray-200 rounded p-1.5 font-bold font-mono" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Gaji Staff</label>
            <input type="number" value={laborMonthlyCost}
              onChange={(e) => setLaborMonthlyCost(parseInt(e.target.value) || 0)}
              className="w-full bg-white border border-gray-200 rounded p-1.5 font-bold font-mono" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Listrik & Oven</label>
            <input type="number" value={electricityMonthlyCost}
              onChange={(e) => setElectricityMonthlyCost(parseInt(e.target.value) || 0)}
              className="w-full bg-white border border-gray-200 rounded p-1.5 font-bold font-mono" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Kemasan/pcs</label>
            <input type="number" value={packagingCostPerPiece}
              onChange={(e) => setPackagingCostPerPiece(parseInt(e.target.value) || 0)}
              className="w-full bg-white border border-gray-200 rounded p-1.5 font-bold font-mono" />
          </div>
        </div>

        <div className="border border-gray-150 rounded-xl overflow-hidden text-xs">
          <div className="bg-gray-50 p-3 flex justify-between font-bold border-b text-slate-900">
            <span>AKUN</span>
            <span>JUMLAH</span>
          </div>
          <div className="divide-y divide-gray-100 px-3 py-1 bg-white font-medium">
            <div className="py-2.5 flex justify-between">
              <span>Omzet Pendapatan (Revenue)</span>
              <span className="font-mono font-bold">{formatCurrency(grossMonthlyRevenue)}</span>
            </div>
            <div className="py-2.5 flex justify-between text-red-600">
              <span>(-) HPP Bahan Baku</span>
              <span className="font-mono font-bold">-{formatCurrency(rawMaterialMonthlyCost)}</span>
            </div>
            <div className="py-2.5 flex justify-between text-red-600">
              <span>(-) Kemasan</span>
              <span className="font-mono font-bold">-{formatCurrency(packagingMonthlyCost)}</span>
            </div>
            <div className="py-2.5 flex justify-between text-blue-700 bg-gray-50 px-2 rounded font-bold">
              <span>Laba Kotor (Gross Profit)</span>
              <span className="font-mono">{formatCurrency(grossMonthlyProfit)}</span>
            </div>
            <div className="py-2.5 flex justify-between text-red-600">
              <span>(-) Gaji Staff</span>
              <span className="font-mono font-bold">-{formatCurrency(laborMonthlyCost)}</span>
            </div>
            <div className="py-2.5 flex justify-between text-red-600">
              <span>(-) Listrik & Oven</span>
              <span className="font-mono font-bold">-{formatCurrency(electricityMonthlyCost)}</span>
            </div>
            <div className={`py-3 flex justify-between border-t-2 font-extrabold text-base ${netMonthlyIncome >= 0 ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
              <span>LABA BERSIH (Net Income)</span>
              <span className="font-mono">{formatCurrency(netMonthlyIncome)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
