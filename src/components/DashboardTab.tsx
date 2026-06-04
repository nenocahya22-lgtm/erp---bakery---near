import React from 'react';
import { CalculationResult, BahanBaku } from '../types';
import { TrendingUp, FolderTree, Package, DollarSign, AlertCircle, Sparkles, AlertTriangle, Lightbulb, RefreshCw, Copy, Check, FileDown, Rocket, ArrowRight } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface DashboardTabProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  onWipeAllData?: () => void;
}

export default function DashboardTab({ calculatedProducts, bahanBaku, onWipeAllData }: DashboardTabProps) {
  // AI Marketing Assistant states
  const [analysisResult, setAnalysisResult] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [copied, setCopied] = React.useState<boolean>(false);

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

      const summaryStats = {
        totalBahan,
        totalProduk,
        avgMargin: Math.round(avgMargin),
        totalProfitBatches
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
      setAnalysisResult(`Gagal terhubung ke modul AI: ${err.message || err}`);
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
      alert("✅ Berhasil mengunduh dokumen laporan AI Marketing PDF!");
    } catch (e: any) {
      console.error(e);
      alert("Terjadi kegagalan pembuatan PDF: " + e.message);
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
        message: `Produk "${p.namaProduk}" belum dikonfigurasi resep bahannya. HPP saat ini hanya menghitung overhead.`,
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const errorWarnings = warnings.filter(w => w.type === 'error');
  const hasAnomalies = errorWarnings.length > 0 || calculatedProducts.length === 0;

  return (
    <div id="dashboard-container" className="space-y-6">
      
      {/* PROFESSIONAL ERP INTEGRITY SIREN / RED ALARM STATUS BLOCK */}
      <div 
        id="erp-integrity-monitor" 
        className={`p-5 rounded-2xl border transition-all ${
          hasAnomalies 
            ? 'bg-rose-950/10 border-rose-800/80 shadow-lg shadow-rose-950/5 animate-pulse-slow' 
            : 'bg-emerald-950/5 border-emerald-800/40 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              hasAnomalies ? 'bg-red-650 text-white animate-bounce' : 'bg-emerald-600 text-white'
            }`}>
              <AlertCircle className="w-6 h-6 stroke-2" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-950">
                  {hasAnomalies 
                    ? '🚨 SIRENE AKTIF: ALARM MERAH INTEGRITAS DATA!'
                    : '🛡️ STATUS INTEGRITAS: AMAN & TERHUBUNG'
                  }
                </h3>
                <span className={`w-2 h-2 rounded-full ${hasAnomalies ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {hasAnomalies 
                  ? 'Sistem mendeteksi adanya data janggal atau interkoneksi database yang terputus. Tindakan koreksi mendesak diperlukan.'
                  : 'Seluruh resep menu, harga modal bahan baku, dan simpanan margin laba lulus audit otomatis 100% tanpa anomali finansial.'
                }
              </p>
            </div>
          </div>

          <div className="text-xs">
            <span className={`px-3 py-1.5 rounded-lg font-mono font-bold tracking-wider uppercase block ${
              hasAnomalies ? 'bg-rose-950/45 text-rose-400 border border-rose-800/40' : 'bg-emerald-950/30 text-emerald-600 border border-emerald-800/20'
            }`}>
              Ledger: {hasAnomalies ? 'DISCREPANCY DETECTED' : 'SYSTEM HEALTHY'}
            </span>
          </div>

        </div>

        {/* Breakdown of Anomalies if any exist */}
        {hasAnomalies && (
          <div className="mt-4 pt-4 border-t border-rose-800/25 space-y-2">
            <span className="block text-[10px] font-extrabold uppercase text-rose-700 tracking-wider font-mono">Daftar Kejanggalan Finansial Terdeteksi:</span>
            <ul className="text-xs text-rose-800 space-y-1 rounded-xl bg-rose-950/5 p-3.5 border border-rose-900/10 font-medium">
              {calculatedProducts.length === 0 && (
                <li className="flex items-center gap-1.5">• <span className="font-bold underline text-rose-950">Google Sheet Terputus</span>: Tidak ada data produk yang diimpor untuk simulasi HPP denda produksi.</li>
              )}
              {errorWarnings.map((w, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="shrink-0">•</span> 
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>



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
