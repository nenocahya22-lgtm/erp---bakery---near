import React, { useState, useEffect } from 'react';
import { CalculationResult, BahanBaku, Cabang, BranchTransaction } from '../types';
import { TrendingUp, FolderTree, Package, DollarSign, AlertCircle, Sparkles, AlertTriangle, Lightbulb, RefreshCw, Copy, Check, FileDown, Rocket, ArrowRight, Bell, X, Trash2, MessageSquare, Send, Settings, CheckCircle2, Building2, ShoppingCart } from 'lucide-react';
import { showToast } from '../lib/toast';
import { safeGetLocalStorage } from '../lib/safe-json';
import { jsPDF } from 'jspdf';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

interface AlertItem {
  id: string;
  type: 'margin_danger' | 'margin_warning' | 'margin_high' | 'stock_critical' | 'stock_low' | 'waste_alert' | 'system_error' | 'info';
  message: string;
  timestamp: string;
  dismissed: boolean;
}

interface WaNotification {
  id: string;
  type: string;
  platform: string;
  message: string;
  time: string;
  sent: boolean;
}

interface RetailOrder {
  ordId: string;
  source: string;
  customerName: string;
  items: string;
  totalSum: number;
  status: string;
  timeAgo: string;
  date: string;
  catatan: string;
  addOns?: { nama: string; harga: number }[];
}

export interface DashboardTabProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  cabangList?: Cabang[];
  branchTransactions?: BranchTransaction[];
  onWipeAllData?: () => void;
  onSyncToFirestore?: () => Promise<void>;
}

export default function DashboardTab({ calculatedProducts, bahanBaku, cabangList = [], branchTransactions = [], onWipeAllData, onSyncToFirestore }: DashboardTabProps) {
  // AI Marketing Assistant states
  const [analysisResult, setAnalysisResult] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [copied, setCopied] = React.useState<boolean>(false);

  // ─── MONITORING & ALERT SYSTEM ───
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>(() =>
    safeGetLocalStorage<AlertItem[]>('system_alerts_data', [])
  );
  const [waNotifications, setWaNotifications] = useState<WaNotification[]>(() =>
    safeGetLocalStorage<WaNotification[]>('wa_notification_queue', [])
  );
  const [syncingToFirestore, setSyncingToFirestore] = useState(false);

  const handleSyncToFirestore = async () => {
    if (!onSyncToFirestore) return;
    setSyncingToFirestore(true);
    try {
      await onSyncToFirestore();
    } finally {
      setSyncingToFirestore(false);
    }
  };

  useEffect(() => { localStorage.setItem('system_alerts_data', JSON.stringify(alerts)); }, [alerts]);
  useEffect(() => { localStorage.setItem('wa_notification_queue', JSON.stringify(waNotifications)); }, [waNotifications]);

  // Auto-generate alerts from system state every 30s
  useEffect(() => {
    const checkAlerts = () => {
      const newAlerts: AlertItem[] = [];
      const now = new Date().toISOString();
      calculatedProducts.forEach(p => {
        if (p.marginPersen < 0) {
          newAlerts.push({ id: `mg-neg-${Date.now()}`, type: 'margin_danger', message: `🔴 MARGIN NEGATIF! "${p.namaProduk}" rugi ${Math.abs(p.marginPersen).toFixed(1)}%`, timestamp: now, dismissed: false });
        } else if (p.marginPersen < 5) {
          newAlerts.push({ id: `mg-low-${Date.now()}`, type: 'margin_danger', message: `⚠️ MARGIN KRITIS! "${p.namaProduk}" hanya ${p.marginPersen.toFixed(1)}%`, timestamp: now, dismissed: false });
        } else if (p.marginPersen < 15) {
          newAlerts.push({ id: `mg-warn-${Date.now()}`, type: 'margin_warning', message: `📉 Margin "${p.namaProduk}" ${p.marginPersen.toFixed(1)}% — di bawah 15%`, timestamp: now, dismissed: false });
        }
      });
      bahanBaku.filter(b => b.isiKemasan < 50).forEach(b => {
        newAlerts.push({ id: `stk-${Date.now()}`, type: 'stock_critical', message: `📦 STOK KRITIS! "${b.nama}" sisa ${b.isiKemasan} ${b.satuan}`, timestamp: now, dismissed: false });
      });
      bahanBaku.filter(b => b.isiKemasan >= 50 && b.isiKemasan < 200).forEach(b => {
        newAlerts.push({ id: `stk-lw-${Date.now()}`, type: 'stock_low', message: `📦 Stok "${b.nama}" ${b.isiKemasan} ${b.satuan} — menipis`, timestamp: now, dismissed: false });
      });
      // Waste > 5% sales per cabang
      branchWasteData.forEach(w => {
        const salesData = branchSalesData.find(b => b.cabang.id === w.cabangId);
        if (salesData && salesData.totalRevenue > 0) {
          const wastePct = (w.totalWasteLoss / salesData.totalRevenue) * 100;
          if (wastePct > 5) {
            newAlerts.push({
              id: `wst-${Date.now()}`, type: 'waste_alert',
              message: `🗑️ WASTE TINGGI! "${w.cabangNama}" waste ${wastePct.toFixed(1)}% dari revenue (${formatCurrency(w.totalWasteLoss)})`,
              timestamp: now, dismissed: false,
            });
          }
        }
      });
      setAlerts(prev => {
        const existingIds = new Set<string>(prev.filter(a => !a.dismissed).map(a => a.id));
        const uniqueNew = newAlerts.filter(a => !Array.from(existingIds).some(eid => (eid as string).split('-').slice(0,-1).join('-') === a.id.split('-').slice(0,-1).join('-')));
        return uniqueNew.length === 0 ? prev : [...uniqueNew, ...prev].slice(0, 50);
      });
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [calculatedProducts, bahanBaku]);

  // ─── BRANCH SALES DATA ───
  const [posOrders, setPosOrders] = useState<RetailOrder[]>(() =>
    safeGetLocalStorage<RetailOrder[]>('pos_orders_data', [])
  );
  const [revenueTracker, setRevenueTracker] = useState<{ transactions: any[]; dailyTotals: Record<string, { total: number; sources: Record<string, number> }> }>(() =>
    safeGetLocalStorage<{ transactions: any[]; dailyTotals: Record<string, { total: number; sources: Record<string, number> }> }>('revenue_tracker_data', { transactions: [], dailyTotals: {} })
  );

  useEffect(() => {
    const saved = localStorage.getItem('pos_orders_data');
    if (saved) setPosOrders(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('revenue_tracker_data');
    if (saved) setRevenueTracker(JSON.parse(saved));
  }, []);

  // Compute per-cabang sales metrics
  const today = new Date().toISOString().substring(0, 10);
  const todayRevenueTracker = revenueTracker.dailyTotals[today];
  
  const branchSalesData = cabangList.map(cabang => {
    // POS orders that came from this branch
    const branchSource = `POS Cabang ${cabang.nama}`;
    const branchPosOrders = posOrders.filter(o => o.source === branchSource && o.date === today);
    const totalRevenueFromPos = branchPosOrders.reduce((s, o) => s + o.totalSum, 0);
    
    // Revenue from tracker sources
    const revenueFromTracker = todayRevenueTracker?.sources?.[branchSource] || 0;
    const totalRevenue = Math.max(totalRevenueFromPos, revenueFromTracker);
    
    // Branch transactions (stock movements)
    const branchTx = branchTransactions.filter(t => t.cabangId === cabang.id);
    const posTransactions = branchTx.filter(t => t.tipe === 'pos_jual');
    const totalDeducted = posTransactions.reduce((s, t) => s + t.qty, 0);

    // Recent orders (most recent first)
    const recentOrders = [...posOrders]
      .filter(o => o.source === branchSource)
      .sort((a, b) => b.date.localeCompare(a.date) || b.timeAgo.localeCompare(a.timeAgo))
      .slice(0, 5);

    return {
      cabang,
      totalRevenue,
      totalOrders: branchPosOrders.length,
      totalDeducted,
      recentOrders,
    };
  });

  const totalBranchRevenue = branchSalesData.reduce((s, b) => s + b.totalRevenue, 0);
  const totalBranchOrders = branchSalesData.reduce((s, b) => s + b.totalOrders, 0);

  // ─── WASTE DATA PER CABANG ───
  const wasteLogs = safeGetLocalStorage<any[]>('waste_logs_data', []);
  const branchWasteData = cabangList.map(cabang => {
    const cabangWasteLogs = wasteLogs.filter((w: any) =>
      (w.location || '').toLowerCase().includes(cabang.nama.toLowerCase())
    );
    const totalWasteLoss = cabangWasteLogs.reduce((s: number, w: any) => s + (w.lossValue || 0), 0);
    const totalWasteQty = cabangWasteLogs.reduce((s: number, w: any) => s + (w.qtyWasted || 0), 0);
    return { cabangId: cabang.id, cabangNama: cabang.nama, totalWasteLoss, totalWasteQty, logCount: cabangWasteLogs.length };
  });

  const dismissAlert = (id: string) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  const activeAlerts = alerts.filter(a => !a.dismissed);
  const dangerAlerts = activeAlerts.filter(a => a.type === 'margin_danger' || a.type === 'stock_critical');

  // Pick WA notifications from localStorage (POS orders queue)
  useEffect(() => {
    const saved = localStorage.getItem('wa_notification_queue');
    if (saved) setWaNotifications(JSON.parse(saved));
    const interval = setInterval(() => {
      const s = localStorage.getItem('wa_notification_queue');
      if (s) setWaNotifications(JSON.parse(s));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // 1. Calculate Metrics
  const totalBahan = bahanBaku.length;
  const totalProduk = calculatedProducts.length;

  // Average Margin across products with validated prices
  const validProducts = calculatedProducts.filter((p) => p.hargaJual > 0);
  const avgMargin =
    validProducts.length > 0
      ? validProducts.reduce((acc, curr) => acc + curr.marginPersen, 0) / validProducts.length
      : 0;

  // Total Business Revenue and Cost calculations (Summed up of 1 batch of each product)
  const totalCostBatches = calculatedProducts.reduce((acc, curr) => acc + curr.hppTotalResep, 0);
  const totalRevenueBatches = calculatedProducts.reduce((acc, curr) => acc + curr.hargaJual, 0);
  const totalProfitBatches = Math.max(0, totalRevenueBatches - totalCostBatches);

  const handleAnalyzeTrends = async () => {
    setLoading(true);
    setAnalysisResult('');
    try {
      const simplifiedProducts = calculatedProducts.map(p => ({
        namaProduk: p.namaProduk,
        hppPerPorsi: Math.round(p.hppPerPorsi),
        hargaJualPerPorsi: Math.round(p.hargaJualPerPorsi),
        marginPersen: Math.round(p.marginPersen),
        jumlahBahan: p.bahanList.length
      }));

      // ─── ANALISIS BAHAN BAKU — fluktuasi harga ───
      const bahanAnalysis = bahanBaku.map(b => ({
        nama: b.nama,
        satuan: b.satuan,
        hargaBeliReal: b.hargaBeliReal || b.hargaBeli,
        hargaJualKemasan: Math.round((b.hargaBeliReal || b.hargaBeli) * (1 + (b.markupPercent || 25) / 100)),
        markupPercent: b.markupPercent || 25,
        stokPusat: b.isiKemasan,
      }));

      // Identifikasi bahan dengan harga tinggi (potential margin problem)
      const bahanMahal = bahanAnalysis.filter(b => b.hargaBeliReal > 50000).sort((a, b) => b.hargaBeliReal - a.hargaBeliReal);
      const bahanStokKritis = bahanAnalysis.filter(b => b.stokPusat < 50);

      const summaryStats = {
        totalBahan,
        totalProduk,
        avgMargin: Math.round(avgMargin),
        totalProfitBatches,
        bahanMahal: bahanMahal.slice(0, 5),
        bahanStokKritis: bahanStokKritis.slice(0, 5),
        totalBahanStokKritis: bahanStokKritis.length,
      };

      const res = await fetch('/api/marketing/assistant-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: simplifiedProducts,
          summaryStats
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data.text);
      } else {
        setAnalysisResult(`Error: ${data.error || 'Gagal merumuskan draf analisis asisten virtual.'}`);
      }
    } catch (err: any) {
      console.error(err);
      // Fallback lokal yang lebih kritis — analisis bahan baku + margin
      let localResult = '📋 **ANALISIS BISNIS KRITIS — INTELLIGENCE REPORT**\n';
      localResult += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      
      // ─── RINGKASAN ───
      localResult += '📊 **RINGKASAN BISNIS:**\n';
      localResult += `  • Total Bahan Baku: ${totalBahan}\n`;
      localResult += `  • Total Produk: ${totalProduk}\n`;
      localResult += `  • Rata-rata Margin: ${avgMargin.toFixed(1)}%\n`;
      localResult += `  • Potensi Laba Kotor: ${formatCurrency(totalProfitBatches)}\n`;
      
      // ─── ANALISIS BAHAN BAKU ───
      const bahanMahal = bahanBaku.filter(b => (b.hargaBeliReal || b.hargaBeli) > 50000);
      if (bahanMahal.length > 0) {
        localResult += '\n🔥 **BAHAN BAKU PREMIUM (HARGA > Rp50.000):**\n';
        bahanMahal.slice(0, 5).forEach(b => {
          const hargaReal = b.hargaBeliReal || b.hargaBeli;
          const markup = b.markupPercent || 25;
          const hargaJual = Math.round(hargaReal * (1 + markup/100));
          localResult += `  • ${b.nama}: Beli ${formatCurrency(hargaReal)} → Jual ${formatCurrency(hargaJual)} (markup ${markup}%)\n`;
          
          // Cari produk yang menggunakan bahan ini
          const produkTerkena = calculatedProducts.filter(p => 
            p.bahanList.some(bl => bl.namaBahan === b.nama)
          );
          if (produkTerkena.length > 0) {
            localResult += `    ↳ Digunakan di: ${produkTerkena.slice(0, 3).map(p => `${p.namaProduk} (margin ${p.marginPersen.toFixed(0)}%)`).join(', ')}\n`;
            // Saran margin
            const avgMarginTerkena = produkTerkena.reduce((s, p) => s + p.marginPersen, 0) / produkTerkena.length;
            if (avgMarginTerkena < 20) {
              localResult += `    ⚠️ Rata-rata margin produk ini ${avgMarginTerkena.toFixed(1)}% — **pertimbangkan naikkan harga jual produk**\n`;
            }
          }
        });
      }

      // ─── STOK KRITIS ───
      const stokKritis = bahanBaku.filter(b => b.isiKemasan < 50);
      if (stokKritis.length > 0) {
        localResult += '\n🔴 **STOK KRITIS — SEGERA ORDER!**\n';
        stokKritis.forEach(b => {
          localResult += `  • ${b.nama}: sisa ${b.isiKemasan} ${b.satuan} — segera buat PO ke supplier!\n`;
        });
      }

      // ─── MARGIN ───
      if (validProducts.length > 0) {
        localResult += '\n📈 **PRODUK MARGIN TERTINGGI (BENCHMARK):**\n';
        const topMargin = [...validProducts].sort((a, b) => b.marginPersen - a.marginPersen).slice(0, 3);
        topMargin.forEach(p => {
          localResult += `  • ${p.namaProduk}: margin ${p.marginPersen.toFixed(1)}% — bisa jadi model strategi pricing\n`;
        });

        localResult += '\n📉 **PRODUK PERLU OPTIMASI (MARGIN < 20%):**\n';
        const lowMargin = validProducts.filter(p => p.marginPersen < 20);
        if (lowMargin.length > 0) {
          lowMargin.forEach(p => {
            const targetPrice = Math.round(p.hppPerPorsi / 0.8);
            localResult += `  • ${p.namaProduk}: margin ${p.marginPersen.toFixed(1)}% → sarankan harga ${formatCurrency(targetPrice)} (margin 20%)\n`;
            
            // Cek apakah ada bahan mahal di produk ini
            const bahanMahalDiProduk = p.bahanList.filter(bl => 
              bahanBaku.some(b => b.nama === bl.namaBahan && (b.hargaBeliReal || b.hargaBeli) > 30000)
            );
            if (bahanMahalDiProduk.length > 0) {
              localResult += `    → Bahan premium: ${bahanMahalDiProduk.map(b => b.namaBahan).join(', ')}\n`;
            }
          });
        } else {
          localResult += '  ✅ Semua produk punya margin sehat di atas 20%!\n';
        }
      }

      // ─── REKOMENDASI ───
      localResult += '\n🎯 **REKOMENDASI STRATEGIS:**\n';
      if (stokKritis.length > 0) {
        localResult += `  🔴 Segera buat Purchase Order untuk ${stokKritis.length} bahan yang stoknya kritis\n`;
      }
      if (bahanMahal.length > 0) {
        localResult += `  💰 Evaluasi markup ${bahanMahal.length} bahan premium — pastikan margin produk tetap sehat\n`;
      }
      localResult += '  📦 Bundling produk margin tinggi + rendah untuk subsidi silang\n';
      localResult += '  📊 Review harga jual produk dengan margin di bawah 20%\n';
      localResult += '  🗑️ Optimalkan stok bahan baku untuk kurangi waste (cek tab Manajemen Waste)\n';
      localResult += '  📸 Update foto produk untuk meningkatkan persepsi nilai\n';
      setAnalysisResult(localResult);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    if (!analysisResult) return;
    try {
      const doc = new jsPDF();
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Near Bakery & Co. ERP - AI Marketing Audit", 14, 20);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Tanggal Audit: ${new Date().toLocaleDateString('id-ID')}`, 14, 26);
      doc.text("--------------------------------------------------------------------------------", 14, 30);
      
      const splitText = doc.splitTextToSize(analysisResult, 180);
      let pageHeight = doc.internal.pageSize.height;
      let y = 38;
      
      splitText.forEach((line: string) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 14, y);
        y += 6;
      });
      
      doc.save("near-bakery-ai-marketing-rekomendasi.pdf");
      showToast("✅ Berhasil mengunduh dokumen laporan AI Marketing PDF!", 'success');
    } catch (e: any) {
      console.error(e);
      showToast("Terjadi kegagalan pembuatan PDF: " + e.message, 'error');
    }
  };

  // Simple custom Markdown rendering engine
  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-extrabold text-amber-200">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const renderLine = (line: string, index: number) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="h-2" />;

    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={index} className="text-xs font-bold text-amber-300 mt-4 mb-2 uppercase font-mono tracking-wider flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {trimmed.replace('### ', '')}
        </h4>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={index} className="text-sm font-extrabold text-blue-300 border-b border-indigo-950 pb-1 mt-5 mb-3 tracking-wide uppercase flex items-center gap-2">
          {trimmed.replace('## ', '')}
        </h3>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={index} className="text-base font-black text-white mt-6 mb-4 tracking-wide border-b border-indigo-900 pb-1.5 uppercase bg-indigo-950/40 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" /> {trimmed.replace('# ', '')}
        </h2>
      );
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.substring(2);
      return (
        <li key={index} className="ml-5 list-disc pl-1 text-[11px] text-slate-300 leading-relaxed my-1">
          {parseBoldText(content)}
        </li>
      );
    }

    return (
      <p key={index} className="text-slate-350 text-[11px] leading-relaxed my-1.5 pl-0.5">
        {parseBoldText(trimmed)}
      </p>
    );
  };

  // 2. Identify Warnings
  const warnings: { message: string; type: 'error' | 'warning' }[] = [];

  // Check if any product has no ingredients
  calculatedProducts.forEach((p) => {
    if (p.bahanList.length === 0) {
      warnings.push({
        message: `Produk "${p.namaProduk}" belum dikonfigurasi resep bahannya. HPP belum bisa dihitung secara akurat.`,
        type: 'warning',
      });
    }

    // Check if any ingredient is missing from Bahan Baku
    p.bahanList.forEach((ing) => {
      if (ing.hargaSatuan === 0) {
        warnings.push({
          message: `Bahan "${ing.namaBahan}" di resep "${p.namaProduk}" belum terdaftar di tab Bahan Baku atau memiliki harga beli Rp 0.`,
          type: 'error',
        });
      }
    });
  });

  // Check for abnormally low margin products
  calculatedProducts.forEach((p) => {
    if (p.marginPersen < 15 && p.hargaJual > 0) {
      warnings.push({
        message: `Produk "${p.namaProduk}" memiliki margin keuntungan sangat rendah (${p.marginPersen.toFixed(1)}%). Segera evaluasi overhead atau harga jual!`,
        type: 'warning',
      });
    } else if (p.marginPersen < 0 && p.hargaJual > 0) {
      warnings.push({
        message: `Produk "${p.namaProduk}" menjual di bawah modal modal (RUGI ${p.marginPersen.toFixed(1)}%).`,
        type: 'error',
      });
    }
  });

  const errorWarnings = warnings.filter(w => w.type === 'error');
  const hasAnomalies = errorWarnings.length > 0 || calculatedProducts.length === 0;

  return (
    <div id="dashboard-container" className="space-y-6">
      
      {/* SYSTEM STATUS / WELCOME BLOCK — no scary alarm for empty data */}
      <div className={`p-5 rounded-2xl border transition-all ${
        calculatedProducts.length === 0
          ? 'bg-blue-50 border-blue-200 shadow-sm'
          : hasAnomalies
            ? 'bg-rose-50 border-rose-200 shadow-sm'
            : 'bg-emerald-50 border-emerald-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            calculatedProducts.length === 0
              ? 'bg-blue-500 text-white'
              : hasAnomalies
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
          }`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
              {calculatedProducts.length === 0
                ? '👋 Selamat Datang di Near Bakery & Co. ERP!'
                : hasAnomalies
                  ? '⚠️ Sistem Mendeteksi Beberapa Catatan'
                  : '✅ Sistem Sehat & Siap Digunakan'
              }
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {calculatedProducts.length === 0
                ? 'Mulai dengan menambahkan Bahan Baku dan Resep Produk. Semua data tersimpan aman di browser Anda (localStorage).'
                : hasAnomalies
                  ? `${errorWarnings.length} isu terdeteksi — lihat detail di bawah untuk optimasi.`
                  : 'Seluruh data valid — tidak ada anomali finansial.'
              }
            </p>
          </div>
          {calculatedProducts.length === 0 && (
            <div className="flex gap-2">
              <span className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold">Siap Mulai</span>
            </div>
          )}
        </div>

        {/* Show warnings only if products exist but have issues */}
        {hasAnomalies && calculatedProducts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-rose-200 space-y-1.5">
            <span className="block text-[10px] font-bold uppercase text-rose-600">Detail:</span>
            <ul className="text-xs text-rose-700 space-y-1">
              {errorWarnings.map((w, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span>•</span> <span>{w.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>



      {/* QUICK SYNC BUTTON */}
      {onSyncToFirestore && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 shadow-md text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-blue-200" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Sinkronisasi Web Store</h3>
              <p className="text-[10px] text-blue-200 mt-0.5">
                Kirim data produk, harga & kategori terbaru ke Firestore — Web Store akan langsung update
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncToFirestore}
            disabled={syncingToFirestore}
            className="px-5 py-2.5 bg-white text-indigo-700 hover:bg-blue-50 disabled:bg-slate-200 disabled:text-slate-400 text-xs font-extrabold uppercase rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${syncingToFirestore ? 'animate-spin' : ''}`} />
            {syncingToFirestore ? 'Sync...' : '🔄 Sync Sekarang'}
          </button>
        </div>
      )}

      {/* 1. TOP METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Materials count */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Total Bahan Baku</span>
            <span className="text-2xl font-extrabold text-gray-950 font-mono">{totalBahan}</span>
            <span className="block text-[10px] text-gray-500 font-medium">Bahan terdaftar aktif</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <Package className="w-5.5 h-5.5 text-emerald-600" />
          </div>
        </div>

        {/* Metric 2: Recipes count */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Total Resep Produk</span>
            <span className="text-2xl font-extrabold text-gray-950 font-mono">{totalProduk}</span>
            <span className="block text-[10px] text-gray-500 font-medium">Formulasi resep aktif</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <FolderTree className="w-5.5 h-5.5 text-blue-600" />
          </div>
        </div>

        {/* Metric 3: Profit margin estimation averages */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Rerata Margin Laba</span>
            <span className="text-2xl font-extrabold text-emerald-800 font-mono">{avgMargin.toFixed(1)}%</span>
            <span className="block text-[10px] text-gray-500 font-medium">Portofolio menu bisnis</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5.5 h-5.5 text-amber-600" />
          </div>
        </div>

        {/* Metric 4: Batch Profit estimations */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Potensi Laba Kotor</span>
            <span className="text-2xl font-extrabold text-blue-800 font-mono">{formatCurrency(totalProfitBatches)}</span>
            <span className="block text-[10px] text-gray-400 font-medium">Per 1 batch gabungan</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-5.5 h-5.5 text-purple-600" />
          </div>
        </div>
      </div>

      {/* ==================== PENJUALAN PER CABANG ==================== */}
      {cabangList.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    🏪 Ringkasan Penjualan per Cabang
                    {totalBranchRevenue > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full font-mono">
                        {formatCurrency(totalBranchRevenue)} hari ini
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Data POS dari {cabangList.length} cabang aktif — {totalBranchOrders} transaksi hari ini
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {branchSalesData.map(b => (
              <div key={b.cabang.id} className="p-5 hover:bg-gray-50/50 transition">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900">{b.cabang.nama}</span>
                      <span className="text-[10px] text-gray-400 block">{b.cabang.alamat || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Revenue Hari Ini</span>
                      <span className="text-base font-black font-mono text-emerald-700">
                        {b.totalRevenue > 0 ? formatCurrency(b.totalRevenue) : <span className="text-gray-300">Rp 0</span>}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Transaksi</span>
                      <span className="text-base font-black font-mono text-blue-700">{b.totalOrders}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Pemakaian Bahan</span>
                      <span className="text-base font-black font-mono text-amber-700">
                        {b.totalOrders > 0 ? `${b.totalDeducted.toFixed(0)} unit` : <span className="text-gray-300">-</span>}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">AOV</span>
                      <span className="text-base font-black font-mono text-purple-700">
                        {b.totalOrders > 0 ? formatCurrency(Math.round(b.totalRevenue / b.totalOrders)) : <span className="text-gray-300">-</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent orders from this branch */}
                {b.recentOrders.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block mb-2">Transaksi Terakhir</span>
                    <div className="flex flex-wrap gap-2">
                      {b.recentOrders.slice(0, 3).map((o, i) => (
                        <div key={o.ordId || i} className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-[10px]">
                          <span className="font-semibold text-gray-700">{o.items}</span>
                          <span className="text-gray-400 mx-1">—</span>
                          <span className="font-mono font-bold text-emerald-700">{formatCurrency(o.totalSum)}</span>
                          <span className="text-gray-400 ml-1">{o.timeAgo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {branchSalesData.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-400">
                Belum ada cabang terdaftar. Tambah cabang di Data Pusat.
              </div>
            )}
          </div>

          {/* TOTAL BARIS */}
          {branchSalesData.filter(b => b.totalRevenue > 0).length > 0 && (
            <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShoppingCart className="w-4 h-4" />
                <span>Total Penjualan Semua Cabang</span>
              </div>
              <div className="flex items-center gap-6">
                <span>{totalBranchOrders} transaksi</span>
                <span className="text-base font-black font-mono">{formatCurrency(totalBranchRevenue)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SALES VS WASTE PER CABANG ==================== */}
      {cabangList.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  📊 Perbandingan Sales vs Waste per Cabang
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Bandingkan revenue dengan kerugian waste — waspada jika waste &gt; 5% dari sales.
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-5">
            {branchSalesData.map(b => {
              const wData = branchWasteData.find(w => w.cabangId === b.cabang.id);
              const wasteLoss = wData?.totalWasteLoss || 0;
              const wastePct = b.totalRevenue > 0 ? (wasteLoss / b.totalRevenue) * 100 : 0;
              const maxVal = Math.max(b.totalRevenue, wasteLoss, 100000);
              const salesBarPct = (b.totalRevenue / maxVal) * 100;
              const wasteBarPct = (wasteLoss / maxVal) * 100;
              return (
                <div key={b.cabang.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" /> {b.cabang.nama}
                    </span>
                    <div className="text-[10px] font-mono text-gray-500">
                      {wastePct > 5 ? (
                        <span className="text-red-600 font-bold">⚠️ Waste {wastePct.toFixed(1)}%</span>
                      ) : wastePct > 0 ? (
                        <span className="text-amber-600">Waste {wastePct.toFixed(1)}%</span>
                      ) : (
                        <span className="text-emerald-600">✅ Tidak ada waste</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-16 text-right text-gray-500">Sales</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-md relative overflow-hidden">
                        <div style={{ width: `${Math.max(salesBarPct, 1)}%` }}
                          className="bg-emerald-500 h-full rounded-md flex items-center px-2 text-[9px] text-white font-bold font-mono">
                          {formatCurrency(b.totalRevenue)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-16 text-right text-gray-500">Waste</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-md relative overflow-hidden">
                        <div style={{ width: `${Math.max(wasteBarPct, wasteLoss > 0 ? 1 : 0)}%` }}
                          className={`h-full rounded-md flex items-center px-2 text-[9px] text-white font-bold font-mono ${wastePct > 5 ? 'bg-red-500' : wasteLoss > 0 ? 'bg-amber-400' : 'bg-gray-200 text-gray-400'}`}>
                          {wasteLoss > 0 ? formatCurrency(wasteLoss) : 'Rp 0'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {branchWasteData.some(w => w.totalWasteLoss > 0) && (
            <div className="p-3 bg-amber-50 border-t border-amber-100 text-[10px] text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Total waste semua cabang: {formatCurrency(branchWasteData.reduce((s, w) => s + w.totalWasteLoss, 0))}
              {branchSalesData.some(b => {
                const w = branchWasteData.find(w2 => w2.cabangId === b.cabang.id);
                return w && b.totalRevenue > 0 && (w.totalWasteLoss / b.totalRevenue) * 100 > 5;
              }) && <span className="font-bold text-red-700"> — Ada cabang dengan waste di atas 5%!</span>}
            </div>
          )}
        </div>
      )}

      {/* ==================== AUTOMATED AI MARKETING ASSISTANT MODULE ==================== */}
      <div 
        id="dashboard-ai-marketing-assistant" 
        className="bg-slate-950 border border-slate-900 rounded-2xl p-6 relative overflow-hidden shadow-xl text-white"
      >
        {/* Decorative Grid Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/15 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 pb-5 border-b border-indigo-950/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-650 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40 shrink-0">
              <Rocket className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase bg-indigo-950 border border-indigo-850 text-indigo-400">
                  ERP AUTOMATION ACTIVE
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-1 flex items-center gap-2 font-sans">
                AI Marketing Assistant & Trend Diagnostician
              </h3>
              <p className="text-[11px] text-slate-400 max-w-xl mt-0.5 leading-relaxed">
                Asisten AI cerdas memantau integritas finansial, mendeteksi produk dengan margin kritis yang menurun, serta merumuskan rekomendasi diskon porsi & program kampanye taktis otomatis untuk mendongkrak penjualan rill Anda.
              </p>
            </div>
          </div>

          <button
            onClick={handleAnalyzeTrends}
            disabled={loading}
            className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-600 hover:to-purple-600 disabled:from-slate-800 disabled:to-slate-800 active:scale-[0.98] transition-all text-white font-extrabold text-xs uppercase rounded-xl shadow-lg cursor-pointer flex justify-center items-center gap-2 shrink-0 border border-indigo-500/20"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                Mengevaluasi Tren Transaksi...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-350 animate-bounce" />
                Jalankan Analisis Tren & Promosi (AI)
              </>
            )}
          </button>
        </div>

        {/* Loading status details */}
        {loading && (
          <div className="py-12 text-center text-slate-300 relative z-10 bg-slate-950/20 rounded-xl my-4 border border-indigo-950/20">
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-400 mx-auto mb-4" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 block font-bold animate-pulse">Menghubungkan Database HPP Bakery...</span>
            <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
              Mengevaluasi {totalProduk} produk menu resep, menyusun draf pricing strategi, menghitung formula margin laba, dan menyiapkan copy broadcast chat...
            </p>
          </div>
        )}

        {/* Results view panel */}
        {analysisResult && !loading && (
          <div className="mt-5 space-y-4 relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-indigo-950/20 p-3 rounded-xl border border-indigo-900/30">
              <span className="text-[10px] font-mono font-bold text-indigo-455 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-450" /> REKOMENDASI TAKTIS PEMULIHAN PENJUALAN
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyText}
                  className="flex-1 sm:flex-none justify-center items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg border border-slate-800 transition active:scale-[0.97] cursor-pointer flex"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-indigo-400" />
                      Salin Laporan
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportPDF}
                  className="flex-1 sm:flex-none justify-center items-center gap-1.5 px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-100 font-bold text-[10px] uppercase tracking-wider rounded-lg transition active:scale-[0.97] cursor-pointer flex"
                >
                  <FileDown className="w-3.5 h-3.5 text-indigo-300" />
                  Unduh PDF
                </button>
                
                <button
                  onClick={() => setAnalysisResult('')}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition cursor-pointer text-[10px] font-bold uppercase tracking-wider"
                  title="Tutup laporan"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Rendered Text */}
            <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 md:p-6 max-h-[500px] overflow-y-auto font-sans shadow-inner scrollbar-thin space-y-1">
              {analysisResult.split('\n').map((line, idx) => renderLine(line, idx))}
            </div>

            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 justify-end">
              <span>Rekomendasi AI terintegrasi level real-time dengan HPP & Stok Anda.</span>
            </div>
          </div>
        )}

        {/* Default Help Hint if empty result list */}
        {!analysisResult && !loading && (
          <div className="mt-5 p-4 bg-indigo-950/10 border border-indigo-900/10 rounded-xl flex items-start gap-3 relative z-10">
            <Lightbulb className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              <strong>Saran Penggunaan Bisnis:</strong> Asisten pemasaran menganalisis anomali pada margin menu rill Anda (seperti margin di bawah target/warning). Cukup klik tombol di atas untuk melihat draf WhatsApp blast diskon porsi rill, copy promosi, dan ide diskon happy hour yang sesuai dengan persediaan stok resep pusat Anda!
            </p>
          </div>
        )}
      </div>

      {/* ==================== MONITORING & ALERT SYSTEM ==================== */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <button onClick={() => setShowAlerts(!showAlerts)}
          className="w-full p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-600" />
            <div className="text-left">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                🔔 Monitoring & Alert
                {dangerAlerts.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded-lg animate-pulse">
                    {dangerAlerts.length} KRITIS
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeAlerts.length} alert aktif — deteksi margin & stok otomatis
              </p>
            </div>
          </div>
          <span className={`text-xs text-gray-400 transition-transform ${showAlerts ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showAlerts && (
          <div className="border-t border-gray-100">
            {activeAlerts.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-200 mx-auto mb-1" />
                <p className="text-xs text-gray-500 font-semibold">✅ Semua Aman</p>
                <p className="text-[10px] text-gray-400">Tidak ada alert aktif.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {activeAlerts.slice(0, 20).map(alert => (
                  <div key={alert.id} className={`p-3 flex items-start gap-2.5 text-xs ${
                    alert.type === 'margin_danger' || alert.type === 'stock_critical' ? 'bg-red-50/50' : ''
                  }`}>
                    <span>{alert.type === 'margin_danger' || alert.type === 'stock_critical' || alert.type === 'waste_alert' ? '🔴' : alert.type === 'stock_low' ? '🟡' : '💰'}</span>
                    <p className="flex-1 text-gray-700">{alert.message}</p>
                    <button onClick={() => dismissAlert(alert.id)}
                      className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 cursor-pointer shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* WA Queue summary */}
            {waNotifications.filter(n => !n.sent).length > 0 && (
              <div className="p-3 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium">
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                  {waNotifications.filter(n => !n.sent).length} notifikasi WhatsApp antri
                </span>
                <button onClick={() => {
                  localStorage.removeItem('wa_notification_queue');
                  setWaNotifications([]);
                }}
                  className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer">
                  <Trash2 className="w-3 h-3 inline" /> Hapus
                </button>
              </div>
            )}

            <div className="p-3 bg-gray-50 text-[10px] text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Update otomatis setiap 30 detik — <strong>Kritis:</strong> margin &lt;5% atau stok &lt;50
            </div>
          </div>
        )}
      </div>

      {/* ==================== LOW-MARGIN ALERT GUARD ==================== */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Low-Margin Alert Guard</h3>
        </div>
        <p className="text-xs text-gray-500">Produk dengan margin di bawah 15% — rekomendasi harga jual baru untuk mencapai margin 20%.</p>

        {calculatedProducts.filter(p => p.marginPersen < 15 && p.hargaJual > 0).length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
            <span className="text-xs font-bold text-emerald-800">✅ Semua produk memiliki margin sehat di atas 15%</span>
          </div>
        ) : (
          <div className="space-y-3">
            {calculatedProducts.filter(p => p.marginPersen < 15 && p.hargaJual > 0).map(p => {
              const targetMargin = 20;
              const requiredPrice = Math.round(p.hppPerPorsi / (1 - targetMargin / 100));
              return (
                <div key={p.namaProduk} className={`p-4 rounded-xl border text-sm ${
                  p.marginPersen < 5 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-900">{p.namaProduk}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.marginPersen < 5 ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                      }`}>
                        Margin: {p.marginPersen.toFixed(1)}%
                      </span>
                    </div>
                    <span className="font-mono text-xs">{formatCurrency(p.hppPerPorsi)} / {formatCurrency(p.hargaJualPerPorsi)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Harga jual sekarang:</span>
                    <span className="font-mono font-bold text-red-600">{formatCurrency(p.hargaJualPerPorsi)}</span>
                    <ArrowRight className="w-3 h-3 text-emerald-600" />
                    <span className="text-gray-500">Rekomendasi:</span>
                    <span className="font-mono font-bold text-emerald-700">{formatCurrency(requiredPrice)}</span>
                    <span className="text-[10px] text-gray-400">(margin 20%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cost vs Selling price breakdown visualizer charts (SVG bars) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Perbandingan HPP vs Harga Jual (per Porsi)</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Grafik visual menganalisis perbandingan modal modal HPP (hijau gelap) dibandingkan dengan harga jual bersih (abu-abu terang).
            </p>
          </div>

          {calculatedProducts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-gray-150 rounded-xl bg-gray-50/50">
              <p className="text-xs text-gray-400 font-medium font-semibold">Tabel grafik kosong karena data produk tidak ditemukan.</p>
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              {calculatedProducts.map((p) => {
                const maxPrice = Math.max(...calculatedProducts.map((p) => p.hargaJualPerPorsi), 10000);
                const hppPct = (p.hppPerPorsi / maxPrice) * 100;
                const sellingPct = (p.hargaJualPerPorsi / maxPrice) * 100;

                return (
                  <div key={p.namaProduk} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-900 truncate max-w-[200px]">{p.namaProduk}</span>
                      <div className="font-mono flex items-center gap-2">
                        <span className="text-gray-400">Modal: {formatCurrency(p.hppPerPorsi)}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-emerald-700 font-bold">Jual: {formatCurrency(p.hargaJualPerPorsi)}</span>
                      </div>
                    </div>

                    <div className="h-5 bg-gray-100 rounded-md relative overflow-hidden text-[9px] text-white flex">
                      {/* Cost fill */}
                      <div
                        style={{ width: `${hppPct}%` }}
                        className="bg-emerald-600/95 h-full rounded-l-md transition-all flex items-center pl-2 font-bold font-mono"
                      >
                        HPP
                      </div>
                      {/* Profit portion */}
                      {p.profitPerPorsi > 0 && (
                        <div
                          style={{ width: `${sellingPct - hppPct}%` }}
                          className="bg-blue-600/90 h-full rounded-r-md transition-all flex items-center justify-end pr-2 font-bold font-mono"
                        >
                          Laba {p.marginPersen.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Notifications, Warnings & Quick Audits checklist */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Hasil Audit & Peringatan HPP
            </h3>

            {warnings.length === 0 ? (
              <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-emerald-600 mx-auto stroke-1 animate-pulse-slow" />
                <h4 className="text-xs font-bold text-emerald-800 uppercase">Audit Sempurna!</h4>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Seluruh produk telah memiliki takaran bahan baku yang valid, harga modal terisi, dan menghasilkan porsi dengan margin yang sehat berpotensi profit tinggi.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed flex gap-2.5 ${
                      w.type === 'error'
                        ? 'bg-red-50 border-red-100 text-red-900'
                        : 'bg-amber-50 border-amber-150 text-amber-900'
                    }`}
                  >
                    {w.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold uppercase text-[9px] tracking-wider block mb-0.5">
                        {w.type === 'error' ? 'Peringatan Utama' : 'Saran Optimasi'}
                      </span>
                      <span>{w.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-gray-400">
            <span>Pembaharuan real-time terintegrasi dengan Google Sheets. Kelola tab Bahan Baku dan Resep secara lengkap untuk performa finansial menu terbaik.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
