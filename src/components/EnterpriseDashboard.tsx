import React, { useState, useEffect } from 'react';
import { CalculationResult, BahanBaku } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import { TrendingUp, DollarSign, BarChart3, FileDown, RefreshCw, Plus, Trash2 } from 'lucide-react';
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // ─── CABANG FILTER ───
  const cabangList = safeGetLocalStorage<any[]>('cabang_list_data', []);
  const [selectedCabang, setSelectedCabang] = useState('semua');

  // ─── BIAYA DINAMIS (seperti OPEX di Arus Kas) ───
  const [expenseItems, setExpenseItems] = useState<{ id: string; label: string; amount: number }[]>(() =>
    safeGetLocalStorage<{ id: string; label: string; amount: number }[]>('pl_expense_items_data', [
      { id: 'exp-gaji', label: 'Gaji Staff', amount: 0 },
      { id: 'exp-listrik', label: 'Listrik & Oven', amount: 0 },
      { id: 'exp-kemasan', label: 'Kemasan', amount: 0 },
      { id: 'exp-sewa', label: 'Sewa Tempat', amount: 0 },
      { id: 'exp-air', label: 'Air & PDAM', amount: 0 },
      { id: 'exp-internet', label: 'Internet & Telepon', amount: 0 },
      { id: 'exp-transport', label: 'Transportasi', amount: 0 },
      { id: 'exp-promosi', label: 'Promosi & Marketing', amount: 0 },
      { id: 'exp-perawatan', label: 'Perawatan Alat', amount: 0 },
    ])
  );
  const [newExpLabel, setNewExpLabel] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');

  useEffect(() => { localStorage.setItem('pl_expense_items_data', JSON.stringify(expenseItems)); }, [expenseItems]);

  const addExpense = () => {
    if (!newExpLabel.trim() || !newExpAmount) return;
    setExpenseItems(prev => [...prev, { id: `exp-${Date.now()}`, label: newExpLabel.trim(), amount: parseInt(newExpAmount) || 0 }]);
    setNewExpLabel('');
    setNewExpAmount('');
  };

  const deleteExpense = (id: string) => {
    if (window.confirm('Hapus item biaya ini?')) {
      setExpenseItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateExpense = (id: string, amount: number) => {
    setExpenseItems(prev => prev.map(item => item.id === id ? { ...item, amount } : item));
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Baca data revenue REAL dari localStorage
  const getRevenueData = () =>
    safeGetLocalStorage<{ transactions: any[]; dailyTotals: Record<string, { total: number; sources: Record<string, number> }> }>('revenue_tracker_data', { transactions: [], dailyTotals: {} });
  const [revenueData, setRevenueData] = useState(getRevenueData);

  React.useEffect(() => {
    const interval = setInterval(() => setRevenueData(getRevenueData()), 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter transaksi per cabang
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthStart = monthAgo.toISOString().substring(0, 10);
  const filteredTx = revenueData.transactions.filter((tx: any) => {
    if (selectedCabang === 'semua') return tx.date >= monthStart;
    const txCabang = (tx.source || '').toLowerCase().trim();
    return tx.date >= monthStart && txCabang.includes(selectedCabang.toLowerCase().trim());
  });
  const monthlyRevenue = filteredTx.reduce((sum: number, tx: any) => sum + tx.amount, 0);
  const monthlyQty = filteredTx.reduce((sum: number, tx: any) => sum + tx.qty, 0);

  // Data dari calculatedProducts untuk referensi
  const avgMargin = calculatedProducts.length > 0
    ? calculatedProducts.reduce((acc, curr) => acc + curr.marginPersen, 0) / calculatedProducts.length
    : 0;
  const avgHpp = calculatedProducts.length > 0
    ? calculatedProducts.reduce((acc, curr) => acc + curr.hppPerPorsi, 0) / calculatedProducts.length
    : 0;
  const avgPrice = calculatedProducts.length > 0
    ? calculatedProducts.reduce((acc, curr) => acc + curr.hargaJualPerPorsi, 0) / calculatedProducts.length
    : 0;

  // Estimasi dari data real
  const rawMaterialCost = filteredTx.reduce((sum: number, tx: any) => {
    const prod = calculatedProducts.find(p => p.namaProduk.toLowerCase().trim() === tx.product.toLowerCase().trim());
    return sum + (prod ? prod.hppPerPorsi * tx.qty : avgHpp * tx.qty);
  }, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const grossProfit = Math.max(0, monthlyRevenue - rawMaterialCost);
  const netIncome = grossProfit - totalExpenses;

  // Chart data dari transaksi real per bulan (6 bulan terakhir) — filter per cabang
  const getMonthlyData = () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const startDate = sixMonthsAgo.toISOString().substring(0, 7);
    
    const monthMap: Record<string, { revenue: number; cogs: number }> = {};
    const targetTx = selectedCabang === 'semua' ? revenueData.transactions : filteredTx;
    targetTx.forEach((tx: any) => {
      if (selectedCabang !== 'semua') {
        const txCabang = (tx.source || '').toLowerCase().trim();
        if (!txCabang.includes(selectedCabang.toLowerCase().trim())) return;
      }
      const month = tx.date?.substring(0, 7) || new Date().toISOString().substring(0, 7);
      if (month >= startDate) {
        if (!monthMap[month]) monthMap[month] = { revenue: 0, cogs: 0 };
        monthMap[month].revenue += tx.amount || 0;
        const prod = calculatedProducts.find(p => p.namaProduk.toLowerCase().trim() === (tx.product || '').toLowerCase().trim());
        monthMap[month].cogs += (prod ? prod.hppPerPorsi * (tx.qty || 1) : avgHpp * (tx.qty || 1)) || 0;
      }
    });

    const months = Object.keys(monthMap).sort();
    if (months.length === 0) {
      return [{
        name: new Date().toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        'Pendapatan (Revenue)': Math.round(monthlyRevenue) || 0,
        'HPP Terpadu (COGS)': Math.round(rawMaterialCost) || 0,
        'Laba Kotor (Gross Profit)': Math.max(0, Math.round(monthlyRevenue - rawMaterialCost)) || 0,
      }];
    }

    return months.map(m => ({
      name: new Date(m + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      'Pendapatan (Revenue)': Math.round(monthMap[m].revenue),
      'HPP Terpadu (COGS)': Math.round(monthMap[m].cogs),
      'Laba Kotor (Gross Profit)': Math.max(0, Math.round(monthMap[m].revenue - monthMap[m].cogs)),
    }));
  };

  const chartData = getMonthlyData();

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
      doc.text(`Volume Jual Real: ${monthlyQty} pcs`, 12, 36);
      let yOffset = 36;
      expenseItems.filter(e => e.amount > 0).forEach(item => {
        doc.text(`${item.label}: ${formatCurrency(item.amount)}`, 110, yOffset);
        yOffset += 5;
      });

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
      doc.text(formatCurrency(monthlyRevenue), 15, 72);
      doc.setTextColor(239, 68, 68);
      doc.text(formatCurrency(rawMaterialCost), 62, 72);
      doc.setTextColor(55, 65, 81);
      doc.text(formatCurrency(totalExpenses), 112, 72);
      doc.setTextColor(netIncome >= 0 ? 16 : 239, netIncome >= 0 ? 185 : 68, netIncome >= 0 ? 129 : 68);
      doc.text(formatCurrency(netIncome), 158, 72);

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
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-600" /> Laporan P&L (Laba Rugi)
            </h2>
            <p className="text-xs text-gray-500 mt-1">Analisis Laba Rugi real-time, grafik tren, dan ekspor PDF/CSV per cabang.</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-150">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-1.5">Cabang</span>
            <select
              value={selectedCabang}
              onChange={e => setSelectedCabang(e.target.value)}
              className="text-xs font-bold border-0 bg-white rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="semua">🌐 Semua Cabang</option>
              {cabangList.filter((c: any) => c.isActive).map((c: any) => (
                <option key={c.id} value={c.nama}>{c.nama}</option>
              ))}
            </select>
          </div>
        </div>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-semibold text-gray-700">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Revenue {selectedCabang !== 'semua' ? `(@${selectedCabang})` : ''}</span>
            <span className="block text-lg font-black font-mono text-emerald-700">{formatCurrency(monthlyRevenue)}</span>
            <span className="text-[9px] text-gray-400">{monthlyQty} pcs terjual</span>
          </div>
          <div className="md:col-span-3">
            <span className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Biaya Operasional <span className="text-blue-500 font-normal normal-case">tambah/edit/hapus sendiri</span></span>
            <div className="space-y-1.5">
              {expenseItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-150">
                  <span className="text-[10px] font-bold text-gray-600 w-28 shrink-0">{item.label}</span>
                  <div className="relative flex-1 max-w-[160px]">
                    <span className="absolute inset-y-0 left-0 pl-1.5 flex items-center text-gray-400 text-[9px]">Rp</span>
                    <input type="number" value={item.amount}
                      onChange={(e) => updateExpense(item.id, parseInt(e.target.value) || 0)}
                      className="w-full pl-7 pr-1.5 py-1 border border-gray-200 rounded-lg font-mono font-bold text-xs" />
                  </div>
                  <button onClick={() => deleteExpense(item.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* Form tambah biaya baru */}
              <div className="flex items-center gap-2 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                <input type="text" value={newExpLabel} onChange={e => setNewExpLabel(e.target.value)}
                  placeholder="Nama biaya..." className="flex-1 border border-emerald-200 rounded-lg p-1.5 text-xs" />
                <div className="relative w-24">
                  <span className="absolute inset-y-0 left-0 pl-1.5 flex items-center text-gray-400 text-[9px]">Rp</span>
                  <input type="number" value={newExpAmount} onChange={e => setNewExpAmount(e.target.value)}
                    className="w-full pl-7 pr-1.5 py-1 border border-emerald-200 rounded-lg font-mono font-bold text-xs" />
                </div>
                <button onClick={addExpense} disabled={!newExpLabel.trim() || !newExpAmount}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-[10px] font-bold rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Tambah
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-150 rounded-xl overflow-hidden text-xs">
          <div className="bg-gray-50 p-3 flex justify-between font-bold border-b text-slate-900">
            <span>AKUN</span>
            <span>JUMLAH</span>
          </div>
          <div className="divide-y divide-gray-100 px-3 py-1 bg-white font-medium">
            <div className="py-2.5 flex justify-between">
              <span>📈 Omzet Pendapatan (Revenue Real)</span>
              <span className="font-mono font-bold">{formatCurrency(monthlyRevenue)}</span>
            </div>
            <div className="py-2.5 flex justify-between text-red-600">
              <span>(-) HPP Bahan Baku</span>
              <span className="font-mono font-bold">-{formatCurrency(rawMaterialCost)}</span>
            </div>
            <div className="py-2.5 flex justify-between text-blue-700 bg-gray-50 px-2 rounded font-bold">
              <span>📊 Laba Kotor (Gross Profit)</span>
              <span className="font-mono">{formatCurrency(grossProfit)}</span>
            </div>
            {expenseItems.filter(e => e.amount > 0).map(item => (
              <div key={item.id} className="py-2.5 flex justify-between text-red-600">
                <span>(-) {item.label}</span>
                <span className="font-mono font-bold">-{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className={`py-3 flex justify-between border-t-2 font-extrabold text-base ${netIncome >= 0 ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
              <span>💰 LABA BERSIH (Net Income)</span>
              <span className="font-mono">{formatCurrency(netIncome)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
