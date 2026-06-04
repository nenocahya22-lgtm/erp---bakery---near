import React, { useState } from 'react';
import { CalculationResult, BahanBaku } from '../types';
import { TrendingUp, Sparkles, DollarSign, CloudRain, Sun, Calendar, Layers, Sliders, ArrowUpRight, BarChart3, FileDown, RefreshCw } from 'lucide-react';
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

export default function EnterpriseDashboard({ calculatedProducts, bahanBaku }: EnterpriseDashboardProps) {
  // Live Food Costing Commodity Inflation Slider
  const [commodityMarketInflation, setCommodityMarketInflation] = useState(0); // overall raw materials price change %

  // Labor & Utilities simulated monthly costs (Module 10 and 16)
  const [laborMonthlyCost, setLaborMonthlyCost] = useState(12000000); // 12 million IDR
  const [electricityMonthlyCost, setElectricityMonthlyCost] = useState(3500000); // 3.5 million IDR
  const [packagingCostPerPiece, setPackagingCostPerPiece] = useState(1200); // 1.2k IDR/pkg
  const [simulatedMonthlySalesCount, setSimulatedMonthlySalesCount] = useState(2400); // pieces sold per month

  // Forecast events selector
  const [currentSeasonForecast, setCurrentSeasonForecast] = useState<'Normal' | 'Rainy' | 'Holiday'>('Normal');

  // PDF Export loading state
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // 1. Calculate live food costing with slider inflation added on raw materials
  const rawPortfolioBahanSum = calculatedProducts.reduce((acc, curr) => {
    const rawCostOnly = curr.hppTotalResep - curr.overhead;
    return acc + rawCostOnly;
  }, 0);

  const inflatedRawPortfolioSum = rawPortfolioBahanSum * (1 + commodityMarketInflation / 100);
  const overheadPortfolioSum = calculatedProducts.reduce((acc, curr) => acc + curr.overhead, 0);
  const inflatedPortfolioHpp = inflatedRawPortfolioSum + overheadPortfolioSum;

  // Let's compute average margins
  const averageBaseMargin = calculatedProducts.length > 0
    ? calculatedProducts.reduce((acc, curr) => acc + curr.marginPersen, 0) / calculatedProducts.length
    : 0;

  // Reduced margin because of raw material price hikes
  const inflatedAverageMargin = Math.max(-100, averageBaseMargin - (commodityMarketInflation * 0.4));

  // 2. Real-Time Projections of P&L Statement (Laporan Laba Rugi)
  const estimatedPiecePriceAvg = calculatedProducts.length > 0
    ? calculatedProducts.reduce((acc, curr) => acc + curr.hargaJualPerPorsi, 0) / calculatedProducts.length
    : 0;

  const estimatedPieceHppAvg = calculatedProducts.length > 0
    ? (calculatedProducts.reduce((acc, curr) => acc + curr.hppPerPorsi, 0) / calculatedProducts.length) * (1 + commodityMarketInflation / 100)
    : 0;

  const grossMonthlyRevenue = estimatedPiecePriceAvg * simulatedMonthlySalesCount;
  const rawMaterialMonthlyCost = estimatedPieceHppAvg * simulatedMonthlySalesCount;
  const packagingMonthlyCost = packagingCostPerPiece * simulatedMonthlySalesCount;

  // Consolidated profit metrics
  const totalOperatingCosts = laborMonthlyCost + electricityMonthlyCost;
  const grossMonthlyProfit = Math.max(0, grossMonthlyRevenue - rawMaterialMonthlyCost - packagingMonthlyCost);
  const netMonthlyIncome = grossMonthlyProfit - totalOperatingCosts;

  // 3. AI Predictive Forecasting models (BI)
  const getWeatherImpactRecommendation = () => {
    switch (currentSeasonForecast) {
      case 'Rainy':
        return {
          effect: '☔ Musim Hujan Mengakibatkan Lonjakan Delivery (+15%)',
          tip: 'Oven roti manis & donat kentang dipasang lebih tinggi di pagi hari. Donat cokelat hangat memiliki retensi walk-in walk-out tercepat.'
        };
      case 'Holiday':
        return {
          effect: '🎄 Liburan Hari Raya Lebaran & Natal (+45% Pre-Order)',
          tip: 'Disarankan mengamankan stok Mentega Wijsman 200 kg sekarang! Tambahkan shift baker malam untuk mengejar parsel hampers brownies.'
        };
      default:
        return {
          effect: '☀️ Cuaca Normal (Penjualan Stabil Terjaga)',
          tip: 'Pertahankan produksi MPS reguler. Fokus pada kebersihan preventif mesin-mesin oven utama.'
        };
    }
  };

  const weatherAdvice = getWeatherImpactRecommendation();

  // Monthly trend analysis based on calculated products HPP, margins and sales multipliers
  const basePriceAvg = estimatedPiecePriceAvg > 0 ? estimatedPiecePriceAvg : 18500;
  const baseHppAvg = estimatedPieceHppAvg > 0 ? estimatedPieceHppAvg : 9800;

  const monthlyCoefficients = [
    { label: 'Jan 2026', mult: 0.82, season: 'Normal' },
    { label: 'Feb 2026', mult: 0.90, season: 'Normal' },
    { label: 'Mar 2026', mult: 1.05, season: 'Normal' },
    { label: 'Apr 2026', mult: 1.35, season: 'Holiday' }, // peak season Lebaran/holiday
    { label: 'Mei 2026', mult: 1.00, season: 'Normal' },
    { label: 'Jun 2026 (Proyeksi)', mult: 1.10, season: 'Active' }, // active month
  ];

  const chartData = monthlyCoefficients.map((m) => {
    let finalMult = m.mult;
    
    // June 2026 is modified dynamically based on weather/season forecast in current state
    if (m.season === 'Active') {
      if (currentSeasonForecast === 'Rainy') {
        finalMult = m.mult * 1.15; // +15%
      } else if (currentSeasonForecast === 'Holiday') {
        finalMult = m.mult * 1.45; // +45%
      }
    }
    
    const monthlySales = Math.round(simulatedMonthlySalesCount * finalMult);
    const revenue = basePriceAvg * monthlySales;
    const cogs = (baseHppAvg + packagingCostPerPiece) * monthlySales;
    const grossProfit = Math.max(0, revenue - cogs);

    return {
      name: m.label,
      'Pendapatan (Revenue)': Math.round(revenue),
      'HPP Terpadu (COGS)': Math.round(cogs),
      'Laba Kotor (Gross Profit)': Math.round(grossProfit),
    };
  });

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-950 text-white p-3.5 rounded-xl border border-gray-800 shadow-2xl text-xs font-semibold font-mono space-y-1.5 min-w-[200px]" id="recharts-custom-tooltip">
          <p className="text-gray-400 font-extrabold border-b border-gray-800 pb-1.5 font-sans text-xs">{label}</p>
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

  // PDF Export Functionality
  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // 1. Title Banner Accent Rectangle
      doc.setFillColor(16, 185, 129); // Emerald Green
      doc.rect(0, 0, 210, 15, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('BAKERY ERP PRO - BISNIS INTELIJEN & LAPORAN ANALISIS TREN', 10, 10);
      
      // 2. Metadata details
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      const timestamp = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
      doc.text(`Waktu Laporan: ${timestamp} | Operator: Owner Sektor 123`, 10, 22);

      // Separator Line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.4);
      doc.line(10, 24, 200, 24);

      // 3. Operational Simulation Parameters info
      doc.setTextColor(31, 41, 55);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('1. PARAMETER OPERASIONAL & PENJUALAN', 10, 30);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`• Target Volume Jual Rata-rata: ${simulatedMonthlySalesCount} pcs/bulan`, 12, 36);
      doc.text(`• Tingkat Suku Inflasi Bahan Baku: +${commodityMarketInflation}%`, 12, 41);
      doc.text(`• Prediksi Cuaca & Efek Wilayah: ${currentSeasonForecast} (${weatherAdvice.effect})`, 12, 46);

      doc.text(`• Bobot Gaji Bulanan Staff: ${formatCurrency(laborMonthlyCost)}`, 110, 36);
      doc.text(`• Bobot Biaya Gas & Listrik Oven: ${formatCurrency(electricityMonthlyCost)}`, 110, 41);
      doc.text(`• Biaya Kemasan Kotak Roti: ${formatCurrency(packagingCostPerPiece)}/pcs`, 110, 46);

      // 4. Executive summary metrics
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('2. IKHTISAR LABA RUGI PRODUK (P&L REAL-TIME)', 10, 55);
      doc.line(10, 57, 200, 57);

      // Card Backdrops
      doc.setFillColor(243, 244, 246);
      doc.rect(10, 60, 190, 16, 'F');
      
      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('OMZET PENDAPATAN (REVENUE)', 15, 65);
      doc.text('BIAYA MATERIIL (COGS)', 62, 65);
      doc.text('BEBAN OPERASIONAL (OPEX)', 112, 65);
      doc.text('LABA BERSIH (NET INCOME)', 158, 65);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(16, 185, 129); // Revenue (Emerald)
      doc.text(formatCurrency(grossMonthlyRevenue), 15, 72);
      
      doc.setTextColor(239, 68, 68); // COGS (Red)
      doc.text(formatCurrency(rawMaterialMonthlyCost + packagingMonthlyCost), 62, 72);
      
      doc.setTextColor(55, 65, 81); // Slate
      doc.text(formatCurrency(totalOperatingCosts), 112, 72);
      
      if (netMonthlyIncome >= 0) {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(239, 68, 68);
      }
      doc.text(formatCurrency(netMonthlyIncome), 158, 72);

      // 5. Recharts chart image render capture
      doc.setTextColor(31, 41, 55);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('3. VISUALISASI TREN COGS VS REVENUE SEMESTER 1', 10, 83);
      doc.line(10, 85, 200, 85);

      const chartCard = document.getElementById('monthly-trend-analysis-card');
      if (chartCard) {
        const canvas = await html2canvas(chartCard, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });
        const imgData = canvas.toDataURL('image/png');
        
        // Fit perfectly in A4 width
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Constrain height of chart card
        const constrainedHeight = Math.min(imgHeight, 72);
        doc.addImage(imgData, 'PNG', 10, 88, imgWidth, constrainedHeight);
        
        const tableStartY = 88 + constrainedHeight + 10;

        // 6. Detailed Consolidated Grid Table
        doc.setTextColor(31, 41, 55);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text('4. REKAPITULASI DATA PERIODE SEMESTER', 10, tableStartY - 3);
        doc.line(10, tableStartY - 1, 200, tableStartY - 1);

        doc.setFillColor(31, 41, 55); // Header bg
        doc.rect(10, tableStartY, 190, 7.5, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('PERIODE / BULAN', 15, tableStartY + 5);
        doc.text('ESTIMASI PENDAPATAN', 65, tableStartY + 5);
        doc.text('HPP TERPADU (COGS)', 115, tableStartY + 5);
        doc.text('ESTIMASI LABA KOTOR', 165, tableStartY + 5);

        let rowPosition = tableStartY + 7.5;
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(55, 65, 81);

        chartData.forEach((row, i) => {
          // Stripe backgrounds
          if (i % 2 === 1) {
            doc.setFillColor(249, 250, 251);
            doc.rect(10, rowPosition, 190, 6.5, 'F');
          } else {
            doc.setFillColor(255, 255, 255);
            doc.rect(10, rowPosition, 190, 6.5, 'F');
          }
          
          doc.text(row.name, 15, rowPosition + 4.5);
          doc.text(formatCurrency(row['Pendapatan (Revenue)']), 65, rowPosition + 4.5);
          doc.text(formatCurrency(row['HPP Terpadu (COGS)']), 115, rowPosition + 4.5);
          doc.text(formatCurrency(row['Laba Kotor (Gross Profit)']), 165, rowPosition + 4.5);
          
          rowPosition += 6.5;
        });

        // Footnote details
        doc.setFontSize(7.5);
        doc.setTextColor(156, 163, 175);
        doc.setFont('Helvetica', 'italic');
        doc.text('Laporan ini bersifat rahasia untuk penggunaan internal manajemen saja. Terintegrasi terpadu dengan Google Sheets.', 10, 282);
      } else {
        doc.setFontSize(10);
        doc.text('Grafik Tren Bulanan gagal direkonstruksi untuk ekspor PDF.', 15, 95);
      }

      doc.save(`Bakery_ERP_Executive_P&L_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err: any) {
      console.error('PDF export crashed:', err);
      setExportError(err?.message || 'Proses ekspor PDF menemui kegagalan.');
    } finally {
      setIsExporting(false);
    }
  };

  // CSV Export for P&L trends dataset
  const handleExportCSV = () => {
    try {
      // CSV Headers
      const headers = ['Bulan', 'Pendapatan (Revenue)', 'HPP Terpadu (COGS)', 'Laba Kotor (Gross Profit)'];
      
      // Map chartData rows
      const rows = chartData.map(d => [
        d.name,
        d['Pendapatan (Revenue)'],
        d['HPP Terpadu (COGS)'],
        d['Laba Kotor (Gross Profit)']
      ]);
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');
      
      // Create element and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `PL_Trend_Analysis_${new Date().toISOString().substring(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Gagal mengekspor CSV:', err);
      setExportError('Ekspor dataset CSV gagal diproses.');
    }
  };

  return (
    <div id="enterprise-dashboard-container" className="space-y-6">
      
      {/* HEADER SECTION PANEL */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Dasbor Keuangan Eksekutif & Prediksi AI (BI P&L Suite)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Analisis laporan Laba Rugi (P&L) usaha real-time, simulasikan inflasi harga bahan baku pasar mentega/telur, serta baca tren cuaca prediksi AI.
          </p>
        </div>
      </div>

      {/* COMPACT SENSITIVITY PORTFOLIO & INFLATION SLIDER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-2 border-b border-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1">
              <Sliders className="w-4.5 h-4.5 text-emerald-600" />
              Live Food Costing (Uji Sensitivitas Inflasi Komunitas)
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Geser harga mentega/telur untuk melihat dampak seketika pada margin portofolio menu.</p>
          </div>
          
          <div className="bg-amber-50 text-amber-800 font-bold text-xs p-2 rounded-lg border border-amber-100 font-mono">
            Inflasi Pasar: +{commodityMarketInflation}%
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-3">
            <span className="block text-xs font-semibold text-gray-700">Simulasikan Kenaikan Harga Rata-Rata Bahan Baku:</span>
            <input
              type="range"
              min="0"
              max="60"
              step="1"
              value={commodityMarketInflation}
              onChange={(e) => setCommodityMarketInflation(parseInt(e.target.value))}
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-bold px-0.5">
              <span>0% (Stabil Normal)</span>
              <span>20% (Kenaikan Sedikit)</span>
              <span>40% (Inflasi Tinggi)</span>
              <span>60% (Krisis Pangan)</span>
            </div>
          </div>

          <div className="md:col-span-4 bg-slate-50 border border-gray-150 p-4 rounded-xl space-y-2 text-xs">
            <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">Hasil Portofolio HPP Terinflasi:</span>
            <div className="flex justify-between font-medium">
              <span>HPP Base (Sesuai Sheet):</span>
              <span className="font-mono text-gray-800 font-bold">{formatCurrency(rawPortfolioBahanSum + overheadPortfolioSum)}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-red-700 font-bold">
              <span>HPP Setelah Kenaikan (+{commodityMarketInflation}%):</span>
              <span className="font-mono text-sm">{formatCurrency(inflatedPortfolioHpp)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Margin Keuntungan Rata-Rata:</span>
              <span className={`font-mono font-bold ${inflatedAverageMargin < 20 ? 'text-red-600 animate-pulse' : 'text-emerald-700'}`}>
                {inflatedAverageMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MONTHLY TREND ANALYSIS (RECHARTS INTERNALS) */}
      <div id="monthly-trend-analysis-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-gray-50 gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Tren Bulanan: Total Pendapatan vs COGS (HPP Terpadu)
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Visualisasi historis dan proyeksi semester pertama tahun 2026 berdasarkan harga bahan terinflasi & volume jual {simulatedMonthlySalesCount} pcs/bulan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2" data-html2canvas-ignore="true">
            {exportError && (
              <span className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-lg">
                ⚠️ {exportError}
              </span>
            )}
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-[11px] px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
              title="Unduh Laporan Format PDF Resmi"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white animate-spin" />
                  <span>Cetak PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Export to PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-[11px] px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] border border-slate-800"
              title="Unduh data trend ke CSV untuk program lain"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>DOWNLOAD CSV</span>
            </button>
            <div className="text-[10px] text-gray-500 font-bold bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl border border-emerald-100 font-mono">
              P&L Margin: {inflatedAverageMargin.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="h-[320px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
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
              <XAxis 
                dataKey="name" 
                stroke="#6ca380" 
                style={{ fontSize: '11px', fontWeight: '600' }}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis 
                stroke="#6ca380" 
                style={{ fontSize: '10px', fontFamily: 'monospace' }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `Rp ${(value / 1e6).toFixed(1)}jt`}
                dx={-8}
              />
              <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
              <Legend 
                verticalAlign="top" 
                height={40} 
                iconType="circle" 
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', fontWeight: '600', paddingBottom: '10px' }}
              />
              <Area 
                type="monotone" 
                dataKey="Pendapatan (Revenue)" 
                stroke="#10b981" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorRev)" 
              />
              <Area 
                type="monotone" 
                dataKey="HPP Terpadu (COGS)" 
                stroke="#ef4444" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorCogs)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: REAL-TIME PROFIT & LOSS REPORT (P&L) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="pb-2 border-b border-gray-50 flex justify-between items-center bg-gray-50 p-3 rounded-xl border">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Laporan Prospek Laba Rugi Bulanan (Real-Time P&L)
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Est. Volume: {simulatedMonthlySalesCount} pcs roti matang diproduksi terjual.</p>
            </div>
            <button
              onClick={() => alert('Laporan keuangan laba rugi bulanan di-export ke Google Sheets!')}
              className="bg-emerald-600 text-white hover:bg-emerald-705 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Export P&L ↗
            </button>
          </div>

          {/* Interactive fields editor inside P&L */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-semibold text-gray-700">
            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Vol Jual / Bln</span>
              <input
                type="number"
                value={simulatedMonthlySalesCount}
                onChange={(e) => setSimulatedMonthlySalesCount(parseInt(e.target.value) || 100)}
                className="w-full bg-white border border-gray-200 rounded p-1.5 font-bold font-mono"
              />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Gaji Staff / Bln</span>
              <input
                type="number"
                value={laborMonthlyCost}
                onChange={(e) => setLaborMonthlyCost(parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-gray-200 rounded p-1.5 font-bold font-mono"
              />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Listrik & Oven / Bln</span>
              <input
                type="number"
                value={electricityMonthlyCost}
                onChange={(e) => setElectricityMonthlyCost(parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-gray-200 rounded p-1.5 font-bold font-mono"
              />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Kemasan / pcs</span>
              <input
                type="number"
                value={packagingCostPerPiece}
                onChange={(e) => setPackagingCostPerPiece(parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-gray-200 rounded p-1.5 font-bold font-mono"
              />
            </div>
          </div>

          <div className="border border-gray-150 rounded-xl overflow-hidden text-xs md:text-sm">
            <div className="bg-gray-50/70 p-3 flex justify-between font-bold border-b text-slate-900 border-gray-200">
              <span>NAMA AKUN AKUNTANSI</span>
              <span>JUMLAH OPERASIONAL BULANAN</span>
            </div>
            
            <div className="divide-y divide-gray-100 px-3 py-1 bg-white font-medium">
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-600 font-sans">Omzet Pendapatan Bersih POS (Revenue):</span>
                <span className="font-mono text-gray-900 font-bold">{formatCurrency(grossMonthlyRevenue)}</span>
              </div>

              <div className="py-2.5 flex justify-between text-red-600">
                <span className="font-sans">(-) Biaya Bahan Baku Pokok (HPP Terinflasi):</span>
                <span className="font-mono font-bold">-{formatCurrency(rawMaterialMonthlyCost)}</span>
              </div>

              <div className="py-2.5 flex justify-between text-red-650">
                <span className="font-sans">(-) Biaya Kemasan Box & Plastik (Perishable Packaging):</span>
                <span className="font-mono font-bold">-{formatCurrency(packagingMonthlyCost)}</span>
              </div>

              <div className="py-2.5 flex justify-between text-blue-700 bg-gray-50/50 px-2 rounded font-bold">
                <span className="font-sans">Laba Kotor Operasional (Gross Profit):</span>
                <span className="font-mono">{formatCurrency(grossMonthlyProfit)}</span>
              </div>

              <div className="py-2.5 flex justify-between text-red-600">
                <span className="font-sans">(-) Beban Gaji Staf Baker / Kasir (Staff Labor):</span>
                <span className="font-mono font-bold">-{formatCurrency(laborMonthlyCost)}</span>
              </div>

              <div className="py-2.5 flex justify-between text-red-600">
                <span className="font-sans">(-) Beban Listrik, Oven & Gas Chiller (Utility Energy):</span>
                <span className="font-mono font-bold">-{formatCurrency(electricityMonthlyCost)}</span>
              </div>

              <div className={`py-3 flex justify-between border-t-2 border-slate-350 px-2 rounded font-extrabold text-base ${netMonthlyIncome >= 0 ? 'text-emerald-800 bg-emerald-50/50 border-emerald-150' : 'text-red-700 bg-red-50/50 border-red-150'}`}>
                <span className="font-sans uppercase">Keuntungan Bersih (Real Net Income):</span>
                <span className="font-mono">{formatCurrency(netMonthlyIncome)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI PREDICTIVE FORECAST */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="pb-2 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              AI Predictive Forecast (BI)
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Analisis histori dan tren cuaca untuk estimasi pre-order.</p>
          </div>

          <div className="space-y-4">
            {/* Season Switcher */}
            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Pilih Prediksi Kondisi</span>
              <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-lg text-xs leading-none">
                <button
                  type="button"
                  onClick={() => setCurrentSeasonForecast('Normal')}
                  className={`py-2 px-1 text-[10px] font-bold rounded cursor-pointer ${currentSeasonForecast === 'Normal' ? 'bg-white text-gray-900' : 'text-gray-500'}`}
                >
                  <Sun className="w-3.5 h-3.5 mx-auto mb-0.5 text-amber-500 inline-block mr-1 align-middle" /> Normal
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSeasonForecast('Rainy')}
                  className={`py-2 px-1 text-[10px] font-bold rounded cursor-pointer ${currentSeasonForecast === 'Rainy' ? 'bg-white text-gray-900' : 'text-gray-500'}`}
                >
                  <CloudRain className="w-3.5 h-3.5 mx-auto mb-0.5 text-blue-500 inline-block mr-1 align-middle" /> Hujan
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSeasonForecast('Holiday')}
                  className={`py-2 px-1 text-[10px] font-bold rounded cursor-pointer ${currentSeasonForecast === 'Holiday' ? 'bg-white text-gray-900' : 'text-gray-500'}`}
                >
                  <Calendar className="w-3.5 h-3.5 mx-auto mb-0.5 text-red-500 inline-block mr-1 align-middle" /> Liburan
                </button>
              </div>
            </div>

            {/* Weather forecast visual advice card */}
            <div className="bg-amber-50/50 p-4 border border-amber-150 rounded-xl space-y-2.5 text-xs text-amber-900 leading-relaxed">
              <span className="font-bold uppercase text-[9px] tracking-wider block bg-amber-100 rounded px-2 py-0.5 w-max">
                Analisis AI Trend BI
              </span>
              <span className="font-bold block text-sm">{weatherAdvice.effect}</span>
              <p className="text-amber-800 text-[11px] font-medium">{weatherAdvice.tip}</p>
            </div>

            {/* Quick alert carbon footprint tracker */}
            <div className="bg-slate-50 border border-gray-150 p-4 rounded-xl space-y-1 text-[11px] text-gray-500">
              <span className="font-bold text-gray-800 uppercase text-[9px] tracking-wider block mb-1">
                Carbon & Energy Footprint (Sustainability)
              </span>
              <p>Oven gas emisi emisi rata-rata: <span className="font-bold text-gray-700">0.45 kg CO₂</span> per kg adonan panggang manis.</p>
              <p className="mt-1 font-medium font-mono text-emerald-800">💡 Tip Hijau: Panaskan oven mak. 15 mnt sebelum waktu molding selesai untuk memangkas emisi energi listrik.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
