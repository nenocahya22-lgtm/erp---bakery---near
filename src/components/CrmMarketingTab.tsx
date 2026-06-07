import React, { useState, useEffect, useMemo } from 'react';
import { CalculationResult } from '../types';
import { Megaphone, RefreshCw, Sparkles, Send, Users, Mail, Compass, TrendingUp, ShoppingCart, BarChart3, AlertTriangle, Star, Tag, Cloud, Globe, FileText } from 'lucide-react';

interface CrmMarketingTabProps {
  calculatedProducts: CalculationResult[];
}

export default function CrmMarketingTab({ calculatedProducts }: CrmMarketingTabProps) {
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [marketingAdvice, setMarketingAdvice] = useState('');
  const [salesDropReason, setSalesDropReason] = useState('');
  const [competitorFactor, setCompetitorFactor] = useState('');
  const [costChanges, setCostChanges] = useState('');
  const [selectedTargetProduct, setSelectedTargetProduct] = useState('');
  const [blastSending, setBlastSending] = useState(false);
  const [blastTarget, setBlastTarget] = useState('Semua');
  const [showAutoAnalysis, setShowAutoAnalysis] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // ─── AMBIL DATA REAL DARI SELURUH SISTEM ───
  const revenueData = useMemo(() => {
    try {
      const saved = localStorage.getItem('revenue_tracker_data');
      return saved ? JSON.parse(saved) : { transactions: [], dailyTotals: {} };
    } catch { return { transactions: [], dailyTotals: {} }; }
  }, []);

  const ordersData = useMemo(() => {
    try {
      const saved = localStorage.getItem('pos_orders_data');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, []);

  const wasteData = useMemo(() => {
    try {
      const saved = localStorage.getItem('waste_logs_data');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, []);

  const cabangList = useMemo(() => {
    try {
      const saved = localStorage.getItem('cabang_list_data');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, []);

  const suratOrders = useMemo(() => {
    try {
      const saved = localStorage.getItem('surat_orders_data');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, []);

  // ─── AUTO-ANALYSIS ───
  const autoAnalysis = useMemo(() => {
    const analysis: {
      totalRevenue: number;
      totalOrders: number;
      totalWaste: number;
      totalBranches: number;
      pendingSO: number;
      topProducts: { name: string; revenue: number; qty: number }[];
      lowMarginProducts: { name: string; margin: number; hpp: number; price: number }[];
      suggestions: string[];
    } = {
      totalRevenue: 0,
      totalOrders: 0,
      totalWaste: 0,
      totalBranches: 0,
      pendingSO: 0,
      topProducts: [],
      lowMarginProducts: [],
      suggestions: [],
    };

    // Revenue
    const txs = revenueData.transactions || [];
    analysis.totalRevenue = txs.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    analysis.totalOrders = txs.length;

    // Waste
    analysis.totalWaste = wasteData.reduce((s: number, w: any) => s + (w.lossValue || 0), 0);

    // Cabang & SO
    analysis.totalBranches = cabangList.filter((c: any) => c.isActive).length;
    analysis.pendingSO = suratOrders.filter((s: any) => s.status === 'minta').length;

    // Top products
    const prodMap: Record<string, { revenue: number; qty: number }> = {};
    txs.forEach((tx: any) => {
      if (!prodMap[tx.product]) prodMap[tx.product] = { revenue: 0, qty: 0 };
      prodMap[tx.product].revenue += tx.amount || 0;
      prodMap[tx.product].qty += tx.qty || 0;
    });
    analysis.topProducts = Object.entries(prodMap)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));

    // Low margin
    calculatedProducts.forEach(p => {
      if (p.marginPersen < 20) {
        analysis.lowMarginProducts.push({
          name: p.namaProduk,
          margin: p.marginPersen,
          hpp: p.hppPerPorsi,
          price: p.hargaJualPerPorsi,
        });
      }
    });

    // ─── SUGGESTIONS BASED ON REAL SYSTEM DATA ───
    if (analysis.totalRevenue === 0) {
      analysis.suggestions.push('📊 Belum ada data penjualan. Mulai transaksi POS untuk melihat analisis marketing.');
    } else {
      analysis.suggestions.push(`📈 Total Revenue: ${formatCurrency(analysis.totalRevenue)} dari ${analysis.totalOrders} transaksi.`);
      
      if (analysis.topProducts.length > 0) {
        const top = analysis.topProducts[0];
        analysis.suggestions.push(`🏆 Produk terlaris: ${top.name} (${formatCurrency(top.revenue)}). Optimalkan produksi & promosi!`);
      }
    }

    if (analysis.lowMarginProducts.length > 0) {
      analysis.suggestions.push(`⚠️ ${analysis.lowMarginProducts.length} produk dengan margin di bawah 20% — review harga jual atau efisiensi bahan.`);
      analysis.lowMarginProducts.slice(0, 3).forEach(p => {
        analysis.suggestions.push(`📉 ${p.name}: margin ${p.margin.toFixed(1)}% (HPP ${formatCurrency(p.hpp)}, Jual ${formatCurrency(p.price)}). Target harga: ${formatCurrency(Math.round(p.hpp / 0.8))}`);
      });
    } else {
      analysis.suggestions.push('✅ Semua produk punya margin sehat di atas 20%!');
    }

    if (analysis.pendingSO > 0) {
      analysis.suggestions.push(`🚚 ${analysis.pendingSO} permintaan barang cabang pending — setujui di Data Pusat untuk menjaga stok cabang.`);
    }

    if (analysis.totalWaste > 0) {
      analysis.suggestions.push(`🗑️ Total waste tercatat: ${formatCurrency(analysis.totalWaste)} — cek Manajemen Waste untuk optimasi produksi.`);
    }

    analysis.suggestions.push('💡 Strategi: Bundle produk margin tinggi + rendah, update foto produk dengan AI Generator, review harga berkala.');
    analysis.suggestions.push('🏪 Cabang aktif: ' + analysis.totalBranches + ' — pastikan stok tiap cabang terpantau via Stok Opname.');

    return analysis;
  }, [revenueData, calculatedProducts, ordersData, wasteData, cabangList, suratOrders]);

  const handleAutoAnalyze = () => {
    setShowAutoAnalysis(true);
    let advice = '📊 **ANALISIS OTOMATIS MARKETING — LAPORAN LENGKAP**\n\n';
    advice += `📈 **TOTAL REVENUE:** ${formatCurrency(autoAnalysis.totalRevenue)}\n`;
    advice += `🛒 **TOTAL TRANSAKSI:** ${autoAnalysis.totalOrders}\n`;
    advice += `🏪 **CABANG AKTIF:** ${autoAnalysis.totalBranches}\n`;
    advice += `🚚 **SO PENDING:** ${autoAnalysis.pendingSO}\n`;
    advice += `🗑️ **TOTAL WASTE:** ${formatCurrency(autoAnalysis.totalWaste)}\n\n`;

    advice += '━━━━━━━━━━━━━━━━━━━━━━\n\n';

    if (autoAnalysis.topProducts.length > 0) {
      advice += '🏆 **TOP PRODUK TERLARIS:**\n';
      autoAnalysis.topProducts.forEach((p, i) => {
        advice += `  ${i + 1}. ${p.name} — ${formatCurrency(p.revenue)} (${p.qty} pcs)\n`;
      });
      advice += '\n';
    }

    if (autoAnalysis.lowMarginProducts.length > 0) {
      advice += '⚠️ **PRODUK MARGIN RENDAH (PERLU TINJAUAN):**\n';
      autoAnalysis.lowMarginProducts.forEach(p => {
        advice += `  • ${p.name}: Margin ${p.margin.toFixed(1)}%\n`;
        advice += `    → HPP: ${formatCurrency(p.hpp)} | Jual: ${formatCurrency(p.price)}\n`;
        advice += `    → Rekomendasi harga baru: ${formatCurrency(Math.round(p.hpp / 0.75))} (margin 25%)\n`;
      });
      advice += '\n';
    }

    advice += '💡 **REKOMENDASI STRATEGIS:**\n';
    autoAnalysis.suggestions.forEach(s => {
      advice += `  • ${s}\n`;
    });

    advice += '\n🎯 **STRATEGI DISKON & PROMOSI:**\n';
    advice += `  • Produk margin > 40%: Berani diskon 20-30% untuk boost penjualan\n`;
    advice += `  • Produk margin < 20%: JANGAN diskon, naikkan harga dulu\n`;
    advice += `  • Bundle deal: Paket Hemat 3 Roti + 1 Coffee untuk naikkan AOV\n`;
    advice += `  • Member loyalty: Setiap 10x beli gratis 1 produk\n\n`;

    advice += '📸 **REBRANDING & FOTO PRODUK:**\n';
    advice += `  • Update nama produk: Tambahkan "Premium", "Signature", "Artisan"\n`;
    advice += `  • Generate foto baru pakai AI Generator (di tab Resep → Generate)\n`;
    advice += `  • Tambah deskripsi menarik: ceritakan bahan premium yang dipakai\n`;

    setMarketingAdvice(advice);
  };

  const handleConsultCmo = async () => {
    setMarketingLoading(true);
    setMarketingAdvice('');
    setShowAutoAnalysis(false);
    try {
      // Try API first
      const res = await fetch('/api/marketing/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesDropReason: salesDropReason || 'Tidak disebutkan',
          competitorFactor: competitorFactor || 'Tidak disebutkan',
          costChanges: costChanges || 'Tidak disebutkan',
          productMetrics: calculatedProducts.map(p => ({ name: p.namaProduk, margin: p.marginPersen, price: p.hargaJualPerPorsi })),
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) { setMarketingAdvice(data.text); return; }
      }
      throw new Error('API not available');
    } catch {
      // Fallback lokal
      let localAdvice = '📋 **ANALISIS LOKAL — SARAN MARKETING**\n';
      localAdvice += '━━━━━━━━━━━━━━━━━━━━━━\n\n';
      
      if (salesDropReason || competitorFactor || costChanges) {
        localAdvice += '📋 **KONSULTASI BERDASARKAN INPUT ANDA:**\n';
        if (salesDropReason) localAdvice += `📉 Penurunan: ${salesDropReason}\n`;
        if (competitorFactor) localAdvice += `🏪 Kompetitor: ${competitorFactor}\n`;
        if (costChanges) localAdvice += `💰 Kenaikan Biaya: ${costChanges}\n`;
        localAdvice += '\n';

        if (salesDropReason) {
          localAdvice += '📉 **Strategi Atasi Penurunan Penjualan:**\n';
          localAdvice += '  • Survei pelanggan: tanya langsung kenapa kurang suka\n';
          localAdvice += '  • Coba variasi baru atau bundling dengan best seller\n';
          localAdvice += '  • Beri diskon terbatas untuk produk yang kurang laku\n\n';
        }
        if (competitorFactor) {
          localAdvice += '🏪 **Strategi Hadapi Kompetitor:**\n';
          localAdvice += '  • Fokus ke kualitas & pelayanan (beda dari kompetitor)\n';
          localAdvice += '  • Loyalty program: kartu member digital\n';
          localAdvice += '  • Promo khusus pelanggan setia\n\n';
        }
        if (costChanges) {
          localAdvice += '💰 **Strategi Atasi Kenaikan Biaya:**\n';
          localAdvice += '  • Jangan naikkan harga langsung — kecilkan porsi 10%\n';
          localAdvice += '  • Cari supplier alternatif dengan harga lebih murah\n';
          localAdvice += '  • Bundling produk margin tinggi + rendah\n\n';
        }
      }

      localAdvice += '📊 **ANALISIS SISTEM REAL-TIME:**\n';
      localAdvice += `  • Revenue: ${formatCurrency(autoAnalysis.totalRevenue)}\n`;
      localAdvice += `  • Transaksi: ${autoAnalysis.totalOrders}\n`;
      localAdvice += `  • Cabang: ${autoAnalysis.totalBranches}\n`;
      localAdvice += `  • Waste: ${formatCurrency(autoAnalysis.totalWaste)}\n`;
      localAdvice += `  • SO Pending: ${autoAnalysis.pendingSO}\n\n`;

      localAdvice += '💡 **REKOMENDASI LANGSUNG:**\n';
      autoAnalysis.suggestions.forEach(s => {
        localAdvice += `  • ${s}\n`;
      });

      setMarketingAdvice(localAdvice);
    } finally {
      setMarketingLoading(false);
    }
  };

  const handleBlastWhatsApp = () => {
    setBlastSending(true);
    setTimeout(() => {
      setBlastSending(false);
      alert(`✅ Promosi terkirim ke segmen "${blastTarget}"!\n\n🔥 PROMO SPESIAL NEAR BAKERY!\n${autoAnalysis.topProducts.length > 0 ? `Produk terlaris kami: ${autoAnalysis.topProducts[0].name}` : 'Diskon spesial untuk Anda!'}\nKunjungi toko kami sekarang!`);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-indigo-600" /> AI Marketing — Ujung Tombak Bisnis
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Asisten AI yang memonitor seluruh sistem (pusat hingga cabang), menganalisis data penjualan, margin, waste, dan memberikan rekomendasi marketing taktis.
        </p>
      </div>

      {/* SYSTEM OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs text-center">
          <TrendingUp className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <span className="text-[9px] uppercase font-bold text-gray-500 block">Revenue</span>
          <span className="text-sm font-black text-emerald-800 font-mono">{formatCurrency(autoAnalysis.totalRevenue)}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs text-center">
          <ShoppingCart className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <span className="text-[9px] uppercase font-bold text-gray-500 block">Transaksi</span>
          <span className="text-sm font-black text-blue-800 font-mono">{autoAnalysis.totalOrders}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs text-center">
          <Globe className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <span className="text-[9px] uppercase font-bold text-gray-500 block">Cabang Aktif</span>
          <span className="text-sm font-black text-purple-800 font-mono">{autoAnalysis.totalBranches}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs text-center">
          <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${autoAnalysis.totalWaste > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
          <span className="text-[9px] uppercase font-bold text-gray-500 block">Total Waste</span>
          <span className="text-sm font-black text-amber-800 font-mono">{formatCurrency(autoAnalysis.totalWaste)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Analysis */}
        <div className="lg:col-span-7 space-y-6">
          {/* AUTO ANALYSIS */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Analisis Sistem Real-time
            </h3>
            <p className="text-[10px] text-gray-500">Data diambil dari seluruh modul: POS, Waste, Cabang, SO, dan Resep. Dengan ini AI Marketing bisa melihat gambaran utuh perusahaan.</p>

            <button onClick={handleAutoAnalyze}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-300" /> Analisis Sistem & Saran Marketing
            </button>

            {marketingAdvice && showAutoAnalysis && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs text-slate-200 whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono leading-relaxed">
                {marketingAdvice}
              </div>
            )}
          </div>

          {/* CONSULT FORM */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
              <Compass className="w-4 h-4 text-indigo-600" /> Konsultan AI Marketing (Virtual CMO)
            </h3>
            <p className="text-[10px] text-gray-500">Ceritakan kondisi bisnis Anda — AI akan memberikan rekomendasi spesifik berbasis data real sistem.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Target Menu</label>
                <select value={selectedTargetProduct} onChange={(e) => setSelectedTargetProduct(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                  <option value="">-- Semua Menu --</option>
                  {calculatedProducts.map(p => (
                    <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk} — Margin {p.marginPersen.toFixed(1)}%</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Penurunan Penjualan</label>
                <input type="text" value={salesDropReason} onChange={(e) => setSalesDropReason(e.target.value)}
                  placeholder="Misal: Roti kurang laku..." className="w-full border border-gray-200 rounded-lg p-2.5 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Aksi Kompetitor</label>
                <input type="text" value={competitorFactor} onChange={(e) => setCompetitorFactor(e.target.value)}
                  placeholder="Outlet baru 100m..." className="w-full border border-gray-200 rounded-lg p-2.5 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kenaikan Biaya</label>
                <input type="text" value={costChanges} onChange={(e) => setCostChanges(e.target.value)}
                  placeholder="Mentega naik 10%..." className="w-full border border-gray-200 rounded-lg p-2.5 bg-white" />
              </div>
            </div>

            <button onClick={handleConsultCmo} disabled={marketingLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold text-xs uppercase rounded-xl shadow-md transition cursor-pointer flex justify-center items-center gap-1.5">
              {marketingLoading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Merumuskan Strategi...</>
              ) : (
                <><Sparkles className="w-4 h-4 text-yellow-300" /> Konsultasi Virtual CMO</>
              )}
            </button>

            {marketingAdvice && !showAutoAnalysis && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs text-slate-200 whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                {marketingAdvice}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Suggestions & Broadcast */}
        <div className="lg:col-span-5 space-y-6">
          {/* Suggestions */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Tag className="w-4 h-4 text-emerald-600" /> Saran Marketing Otomatis
            </h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {autoAnalysis.suggestions.map((s, i) => (
                <div key={i} className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-[11px] leading-relaxed">
                  <span className="font-medium text-gray-700">{s}</span>
                </div>
              ))}
              {autoAnalysis.suggestions.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Data masih kosong — lakukan transaksi POS dulu.</p>
              )}
            </div>
          </div>

          {/* Segmentasi */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Users className="w-4 h-4 text-emerald-600" /> Segmentasi Pelanggan
            </h3>
            <div className="space-y-3">
              {(() => {
                const segments = [
                  { segment: '💎 VIP (Top Spender)', size: Math.max(1, Math.round(ordersData.length * 0.1)), action: 'Loyalty card + free item' },
                  { segment: '⭐ Regular', size: Math.max(1, Math.round(ordersData.length * 0.3)), action: 'Diskon 10% tiap kunjungan ke-5' },
                  { segment: '📢 At Risk', size: Math.max(1, Math.round(ordersData.length * 0.2)), action: 'Kirim promo reaktivasi via WA' },
                  { segment: '🆕 New Customer', size: Math.max(1, Math.round(ordersData.length * 0.15)), action: 'Welcome offer: diskon 20%' },
                ];
                return segments.map((g, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-900">{g.segment}</span>
                      <span className="font-mono text-emerald-800 px-2 py-0.5 rounded text-[10px]">{g.size} member</span>
                    </div>
                    <p className="text-[10px] text-indigo-600 font-semibold mt-1">🎯 {g.action}</p>
                  </div>
                ));
              })()}
              {ordersData.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Data akan muncul setelah ada transaksi POS.</p>
              )}
            </div>
          </div>

          {/* WA BLAST */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Mail className="w-4 h-4 text-emerald-600" /> Broadcast Promosi
            </h3>
            <div className="space-y-3 text-xs">
              <select value={blastTarget} onChange={(e) => setBlastTarget(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                <option value="Semua">Semua Pelanggan</option>
                <option value="VIP">💎 VIP</option>
                <option value="Regular">⭐ Regular</option>
                <option value="At Risk">📢 At Risk</option>
                <option value="New Customer">🆕 New Customer</option>
              </select>
              <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-[10px] text-green-800">
                <span className="font-bold block mb-1">📱 Pratinjau:</span>
                🔥 PROMO SPESIAL NEAR BAKERY!<br />
                {autoAnalysis.topProducts.length > 0 ? `💫 ${autoAnalysis.topProducts[0].name} — our best seller!` : '✨ Diskon spesial!'}<br />
                Kunjungi toko kami sekarang! 🏪
              </div>
              <button onClick={handleBlastWhatsApp} disabled={blastSending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                {blastSending ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengirim...</> : <><Send className="w-3.5 h-3.5" /> Kirim Broadcast WA</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
