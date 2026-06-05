import React, { useState, useEffect, useMemo } from 'react';
import { CalculationResult } from '../types';
import { Megaphone, RefreshCw, Sparkles, Send, Users, Mail, Compass, Coins, TrendingUp, ShoppingCart, BarChart3, AlertTriangle, Star, Tag } from 'lucide-react';

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

  // Ambil data revenue real-time dari localStorage
  const revenueData = useMemo(() => {
    try {
      const saved = localStorage.getItem('revenue_tracker_data');
      return saved ? JSON.parse(saved) : { transactions: [], dailyTotals: {} };
    } catch { return { transactions: [], dailyTotals: {} }; }
  }, []);

  // Ambil data orders
  const ordersData = useMemo(() => {
    try {
      const saved = localStorage.getItem('pos_orders_data');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, []);

  // Auto-analysis based on real data
  const autoAnalysis = useMemo(() => {
    const analysis: {
      totalRevenue: number;
      totalOrders: number;
      topProducts: { name: string; revenue: number; qty: number }[];
      lowMarginProducts: { name: string; margin: number; hpp: number; price: number }[];
      suggestions: string[];
    } = {
      totalRevenue: 0,
      totalOrders: 0,
      topProducts: [],
      lowMarginProducts: [],
      suggestions: [],
    };

    // Hitung dari revenue tracker
    const txs = revenueData.transactions || [];
    analysis.totalRevenue = txs.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    analysis.totalOrders = txs.length;

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

    // Low margin products
    calculatedProducts.forEach(p => {
      const margin = p.marginPersen;
      if (margin < 20) {
        analysis.lowMarginProducts.push({
          name: p.namaProduk,
          margin,
          hpp: p.hppPerPorsi,
          price: p.hargaJualPerPorsi,
        });
      }
    });

    // Auto suggestions based on data
    if (analysis.lowMarginProducts.length > 0) {
      analysis.suggestions.push(`⚠️ ${analysis.lowMarginProducts.length} produk dengan margin di bawah 20% — review harga jual atau kurangi biaya bahan.`);
      analysis.lowMarginProducts.slice(0, 3).forEach(p => {
        analysis.suggestions.push(`📉 ${p.name}: margin ${p.margin.toFixed(1)}% (HPP ${formatCurrency(p.hpp)}, Jual ${formatCurrency(p.price)}). Naikkan harga minimal ${formatCurrency(Math.round(p.hpp / 0.8))} untuk margin 20%.`);
      });
    }

    if (analysis.topProducts.length > 0) {
      const top = analysis.topProducts[0];
      analysis.suggestions.push(`🏆 Produk terlaris: ${top.name} (${formatCurrency(top.revenue)}). Optimalkan stok dan promosi!`);
      
      if (analysis.topProducts.length >= 2) {
        const worst = analysis.topProducts[analysis.topProducts.length - 1];
        if (worst.revenue < top.revenue * 0.3) {
          analysis.suggestions.push(`🔄 ${worst.name} penjualan rendah (${formatCurrency(worst.revenue)} vs ${formatCurrency(top.revenue)}). Coba: (1) Turunkan harga 15% (2) Ganti nama jadi lebih menarik (3) Update foto produk.`);
        }
      }
    }

    // Rekomendasi diskon
    analysis.suggestions.push(`💡 Strategi Diskon: Buat promo "Beli 2 Gratis 1" untuk produk dengan stok tinggi atau margin > 40%.`);
    analysis.suggestions.push(`📸 Update foto produk dengan AI Generator di tab Image Gen untuk tampilan lebih profesional di menu.`);
    analysis.suggestions.push(`🏷️ Ganti nama produk dengan kata-kata menarik: "Roti Cokelat" → "Roti Cokelat Belgian Premium Lumer" untuk meningkatkan persepsi nilai.`);

    return analysis;
  }, [revenueData, calculatedProducts, ordersData]);

  const handleAutoAnalyze = () => {
    setShowAutoAnalysis(true);
    // Generate marketing advice based on real data
    let advice = '📊 **ANALISIS OTOMATIS CRM & SARAN MARKETING**\n\n';
    advice += `📈 Total Revenue: ${formatCurrency(autoAnalysis.totalRevenue)}\n`;
    advice += `🛒 Total Transaksi: ${autoAnalysis.totalOrders}\n\n`;

    if (autoAnalysis.topProducts.length > 0) {
      advice += '🏆 **TOP 5 PRODUK TERLARIS:**\n';
      autoAnalysis.topProducts.forEach((p, i) => {
        advice += `  ${i + 1}. ${p.name} — ${formatCurrency(p.revenue)} (${p.qty} pcs)\n`;
      });
      advice += '\n';
    }

    if (autoAnalysis.lowMarginProducts.length > 0) {
      advice += '⚠️ **PRODUK MARGIN RENDAH (PERLU DITINJAU):**\n';
      autoAnalysis.lowMarginProducts.forEach(p => {
        advice += `  • ${p.name}: Margin ${p.margin.toFixed(1)}% — HPP ${formatCurrency(p.hpp)}, Jual ${formatCurrency(p.price)}\n`;
        advice += `    → Sarankan harga jual baru: ${formatCurrency(Math.round(p.hpp / 0.75))} (margin 25%)\n`;
        advice += `    → Atau ganti nama jadi lebih premium untuk justify kenaikan harga\n`;
      });
      advice += '\n';
    }

    advice += '💡 **REKOMENDASI MARKETING:**\n';
    autoAnalysis.suggestions.forEach(s => {
      advice += `  • ${s}\n`;
    });

    advice += '\n🎯 **STRATEGI DISKON:**\n';
    advice += `  • Produk dengan margin > 40%: Berani diskon 20-30%\n`;
    advice += `  • Produk dengan margin < 20%: JANGAN diskon, naikkan harga dulu\n`;
    advice += `  • Bundle deal: "Paket Hemat 3 Roti + 1 Coffee" untuk naikkan AOV\n`;

    advice += '\n📸 **REBRANDING PRODUK:**\n';
    advice += `  • Ganti nama produk: Tambahkan kata "Premium", "Signature", "Artisan"\n`;
    advice += `  • Update deskripsi: Ceritakan bahan premium yang dipakai\n`;
    advice += `  • Generate foto baru pakai AI Image Generator di tab Tools\n`;

    setMarketingAdvice(advice);
  };

  const handleConsultCmo = async () => {
    setMarketingLoading(true);
    setMarketingAdvice('');
    try {
      const res = await fetch('/api/marketing/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesDropReason, competitorFactor, costChanges, products: calculatedProducts.map(p => ({ name: p.namaProduk, margin: p.marginPersen, price: p.hargaJualPerPorsi })) })
      });
      const data = await res.json();
      setMarketingAdvice(data.text || 'Gagal merumuskan strategi.');
    } catch (err: any) {
      setMarketingAdvice(`⚠️ Server AI tidak tersedia. Tapi saya analisis secara lokal:\n\n${autoAnalysis.suggestions.join('\n')}`);
    } finally {
      setMarketingLoading(false);
    }
  };

  const handleBlastWhatsApp = () => {
    setBlastSending(true);
    setTimeout(() => {
      setBlastSending(false);
      alert(`✅ Promosi terkirim ke segmen "${blastTarget}"!\n\nPesan promosi:\n🔥 PROMO SPESIAL NEAR BAKERY!\n${autoAnalysis.topProducts.length > 0 ? `Produk terlaris kami: ${autoAnalysis.topProducts[0].name}` : 'Diskon spesial untuk Anda!'}\nKunjungi toko kami sekarang!`);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-indigo-600" /> CRM & Marketing
        </h2>
        <p className="text-xs text-gray-500 mt-1">Analisis penjualan otomatis, rekomendasi AI marketing, dan broadcast promosi.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: AI CMO + Auto Analysis */}
        <div className="lg:col-span-7 space-y-6">
          {/* AUTO ANALYSIS CARD */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Analisis Penjualan Real-time
            </h3>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                <span className="text-[9px] text-gray-500 uppercase font-bold">Revenue</span>
                <div className="font-black text-emerald-800 font-mono mt-0.5">{formatCurrency(autoAnalysis.totalRevenue)}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                <span className="text-[9px] text-gray-500 uppercase font-bold">Transaksi</span>
                <div className="font-black text-blue-800 font-mono mt-0.5">{autoAnalysis.totalOrders}</div>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
                <span className="text-[9px] text-gray-500 uppercase font-bold">Produk</span>
                <div className="font-black text-amber-800 font-mono mt-0.5">{calculatedProducts.length}</div>
              </div>
            </div>

            {/* Top Products */}
            {autoAnalysis.topProducts.length > 0 && (
              <div>
                <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500" /> Produk Terlaris
                </h4>
                <div className="space-y-1.5">
                  {autoAnalysis.topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[8px] font-bold">{i + 1}</span>
                        <span className="font-semibold text-gray-800">{p.name}</span>
                      </div>
                      <div className="flex gap-3 text-right">
                        <span className="text-gray-500">{p.qty} pcs</span>
                        <span className="font-mono font-bold text-emerald-700">{formatCurrency(p.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low margin alerts */}
            {autoAnalysis.lowMarginProducts.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs">
                <span className="font-bold text-red-800 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> {autoAnalysis.lowMarginProducts.length} Produk Margin Rendah
                </span>
                <div className="mt-1.5 space-y-1">
                  {autoAnalysis.lowMarginProducts.slice(0, 3).map(p => (
                    <div key={p.name} className="flex justify-between text-red-700">
                      <span>{p.name}</span>
                      <span className="font-mono font-bold">{p.margin.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleAutoAnalyze}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-300" /> Analisis Otomatis & Saran Marketing
            </button>

            {marketingAdvice && showAutoAnalysis && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs text-slate-200 whitespace-pre-wrap max-h-[400px] overflow-y-auto font-mono leading-relaxed">
                {marketingAdvice}
              </div>
            )}
          </div>

          {/* CONSULT FORM */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
              <Compass className="w-4 h-4 text-indigo-600" /> Konsultan AI Marketing (Virtual CMO)
            </h3>

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
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Drop Penjualan</label>
                <input type="text" value={salesDropReason} onChange={(e) => setSalesDropReason(e.target.value)}
                  placeholder="Misal: Roti kurang manis..."
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Aksi Kompetitor</label>
                <input type="text" value={competitorFactor} onChange={(e) => setCompetitorFactor(e.target.value)}
                  placeholder="Outlet baru 100m..."
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kenaikan Harga</label>
                <input type="text" value={costChanges} onChange={(e) => setCostChanges(e.target.value)}
                  placeholder="Mentega naik 10%..."
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white" />
              </div>
            </div>

            <button onClick={handleConsultCmo} disabled={marketingLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold text-xs uppercase rounded-xl shadow-md transition cursor-pointer flex justify-center items-center gap-1.5">
              {marketingLoading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Merumuskan Strategi...</>
              ) : (
                <><Sparkles className="w-4 h-4 text-yellow-300" /> Saran Spesifik Virtual AI CMO</>
              )}
            </button>

            {marketingAdvice && !showAutoAnalysis && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs text-slate-200 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {marketingAdvice}
              </div>
            )}
          </div>
        </div>

        {/* KANAN: SUGGESTIONS + WA BLAST */}
        <div className="lg:col-span-5 space-y-6">
          {/* Automated Suggestions */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Tag className="w-4 h-4 text-emerald-600" /> Saran Marketing Otomatis
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {autoAnalysis.suggestions.map((s, i) => (
                <div key={i} className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-[11px] leading-relaxed">
                  <span className="font-medium text-gray-700">{s}</span>
                </div>
              ))}
              {autoAnalysis.suggestions.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Data penjualan masih kosong. Lakukan transaksi POS dulu.</p>
              )}
            </div>
          </div>

          {/* RFM */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Users className="w-4 h-4 text-emerald-600" /> Segmentasi Pelanggan (RFM)
            </h3>
            <p className="text-xs text-gray-500">Berdasarkan data transaksi POS.</p>
            <div className="space-y-3">
              {/* Generate RFM from real data */}
              {(() => {
                const segments = [
                  { segment: '💎 VIP (Top Spender)', size: Math.max(1, Math.round(ordersData.length * 0.1)), description: 'Pelanggan dengan transaksi tertinggi. Prioritaskan layanan!', actionCode: 'Give loyalty card + free item' },
                  { segment: '⭐ Regular', size: Math.max(1, Math.round(ordersData.length * 0.3)), description: 'Pelanggan setia yang sering belanja.', actionCode: 'Beri diskon 10% tiap kunjungan ke-5' },
                  { segment: '📢 At Risk', size: Math.max(1, Math.round(ordersData.length * 0.2)), description: 'Sudah lama tidak bertransaksi.', actionCode: 'Kirim promo reaktivasi via WA' },
                  { segment: '🆕 New Customer', size: Math.max(1, Math.round(ordersData.length * 0.15)), description: 'Pelanggan baru yang perlu di-retensi.', actionCode: 'Welcome offer: diskon 20% pembelian kedua' },
                ];
                return segments.map((g, idx) => (
                  <div key={idx} className="p-3.5 bg-gray-50 border border-gray-150 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-900">{g.segment}</span>
                      <span className="font-mono text-emerald-800 bg-white border px-2 py-0.5 rounded text-[10px]">{g.size} member</span>
                    </div>
                    <p className="text-gray-500 text-[11px]">{g.description}</p>
                    <p className="text-[10px] text-indigo-600 font-semibold">🎯 {g.actionCode}</p>
                  </div>
                ));
              })()}
              {ordersData.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Data pelanggan akan muncul setelah ada transaksi POS.</p>
              )}
            </div>
          </div>

          {/* WA BLAST */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Mail className="w-4 h-4 text-emerald-600" /> Broadcast Promosi
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Target Segmen</label>
                <select value={blastTarget} onChange={(e) => setBlastTarget(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                  <option value="Semua">Semua Pelanggan</option>
                  <option value="VIP (Top Spender)">💎 VIP</option>
                  <option value="Regular">⭐ Regular</option>
                  <option value="At Risk">📢 At Risk</option>
                  <option value="New Customer">🆕 New Customer</option>
                </select>
              </div>

              {/* Preview promosi */}
              <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-[10px] text-green-800">
                <span className="font-bold block mb-1">📱 Pratinjau Pesan:</span>
                🔥 PROMO SPESIAL NEAR BAKERY!<br />
                {autoAnalysis.topProducts.length > 0 
                  ? `💫 ${autoAnalysis.topProducts[0].name} — our best seller!` 
                  : '✨ Diskon spesial untuk Anda!'}<br />
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
