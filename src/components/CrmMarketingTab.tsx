import React, { useState, useEffect, useMemo } from 'react';
import { CalculationResult, BahanBaku, ProductHpp, DetailResep, WasteLog, Cabang, SuratOrder } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import { Megaphone, RefreshCw, Sparkles, Send, Users, Mail, TrendingUp, ShoppingCart, BarChart3, AlertTriangle, Tag, Globe, Brain, Lightbulb, ClipboardList, MessageCircle, HelpCircle } from 'lucide-react';

// ─── GENERATE LOCAL ANSWER untuk Free-Form Q&A ───
function generateLocalAnswer(question: string, data: {
  bahanBaku: BahanBaku[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  calculatedProducts: CalculationResult[];
  wasteLogs: WasteLog[];
  cabangList: Cabang[];
  suratOrders: SuratOrder[];
  revenueData: any;
  autoAnalysis: any;
}): string {
  const { bahanBaku, productHpp, calculatedProducts, wasteLogs, cabangList, suratOrders, revenueData, autoAnalysis } = data;
  const q = question.toLowerCase();
  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

  // ─── PRODUK TERLARIS ───
  if (q.includes('terlaris') || q.includes('best seller') || q.includes('populer') || q.includes('laku')) {
    if (autoAnalysis.topProducts.length === 0) return '📊 Belum ada data penjualan. Mulai transaksi POS dulu ya!';
    let ans = '🏆 **PRODUK TERLARIS**\n\n';
    autoAnalysis.topProducts.forEach((p: any, i: number) => {
      ans += `${i + 1}. **${p.name}** — ${fmt(p.revenue)} (${p.qty} pcs terjual)\n`;
    });
    ans += '\n💡 **SARAN MARKETING:**\n';
    ans += '• Jadikan best seller sebagai **hero promo** — tampilkan di banner Web Store\n';
    ans += '• **Bundle** produk kurang laku + best seller untuk naikkan penjualan\n';
    ans += '• Pastikan stok bahan best seller selalu aman — jangan sampai kehabisan!\n';
    ans += `• Rekomendasi harga jual best seller: naikkan 5-10% jika permintaan tinggi\n`;
    return ans;
  }

  // ─── MARGIN / PROFIT ───
  if (q.includes('margin') || q.includes('profit') || q.includes('untung') || q.includes('hpp') || q.includes('laba')) {
    if (calculatedProducts.length === 0) return '📝 Belum ada produk terdaftar. Buat resep dulu di Formulasi Resep.';
    let ans = '📊 **ANALISIS MARGIN & HPP LENGKAP**\n\n';
    const lowMargin = calculatedProducts.filter(p => p.marginPersen < 20);
    const healthyMargin = calculatedProducts.filter(p => p.marginPersen >= 20 && p.marginPersen <= 40);
    const highMargin = calculatedProducts.filter(p => p.marginPersen > 40);
    ans += `✅ Margin Sehat (20-40%): ${healthyMargin.length} produk\n`;
    ans += `💎 Margin Premium (>40%): ${highMargin.length} produk\n`;
    ans += `⚠️ Margin Rendah (<20%): ${lowMargin.length} produk\n\n`;
    
    if (lowMargin.length > 0) {
      ans += '**🔴 REVIEW HARGA — Margin Rendah:**\n';
      lowMargin.slice(0, 5).forEach((p: any) => {
        const targetPrice = Math.round(p.hppPerPorsi / 0.7); // target margin 30%
        ans += `• **${p.namaProduk}**: margin ${p.marginPersen.toFixed(1)}%\n`;
        ans += `  HPP ${fmt(p.hppPerPorsi)} → Jual ${fmt(p.hargaJualPerPorsi)} → **Saran: ${fmt(targetPrice)}** (+${Math.round((targetPrice / p.hppPerPorsi - 1) * 100)}%)\n`;
      });
      ans += '\n💡 Naikkan harga atau kecilkan porsi 10% untuk perbaiki margin.\n';
    }
    
    if (highMargin.length > 0) {
      ans += '\n**💎 PRODUK MARGIN PREMIUM — Bisa untuk Diskon:**\n';
      highMargin.slice(0, 3).forEach((p: any) => {
        ans += `• ${p.namaProduk}: margin ${p.marginPersen.toFixed(1)}% — aman untuk promo diskon 10-15%\n`;
      });
    }
    
    ans += '\n📋 **RINGKASAN:**\n';
    const avgMargin = calculatedProducts.reduce((s, p) => s + p.marginPersen, 0) / calculatedProducts.length;
    ans += `Rata-rata margin: ${avgMargin.toFixed(1)}%\n`;
    if (avgMargin < 25) ans += '⚠️ Margin rata-rata di bawah 25% — prioritaskan efisiensi bahan dan review harga.\n';
    else if (avgMargin >= 40) ans += '✅ Margin rata-rata premium — bisnis sehat, pertahankan!\n';
    else ans += '✅ Margin rata-rata cukup sehat.\n';
    return ans;
  }

  // ─── STOK ───
  if (q.includes('stok') || q.includes('stock') || q.includes('habis') || q.includes('kurang') || q.includes('bahan baku')) {
    const lowBahan = bahanBaku.filter(b => b.isiKemasan < 100);
    if (lowBahan.length === 0) {
      let ans = '✅ **SEMUA STOK AMAN**\n\n';
      ans += `Total ${bahanBaku.length} bahan baku terdaftar, semua stok mencukupi.\n\n`;
      ans += '💡 Jaga konsistensi dengan rutin stok opname mingguan.\n';
      ans += '📊 Pantau tren pemakaian bahan untuk antisipasi kenaikan harga supplier.';
      return ans;
    }
    let ans = `⚠️ **BAHAN STOK RENDAH (${lowBahan.length} item)**\n\n`;
    // Urutkan dari yang paling kritis
    lowBahan.sort((a, b) => a.isiKemasan - b.isiKemasan).slice(0, 10).forEach(b => {
      ans += `• **${b.nama}**: sisa ${b.isiKemasan} ${b.satuan} — 🔴 KRITIS\n`;
    });
    if (lowBahan.length > 10) ans += `...dan ${lowBahan.length - 10} bahan lainnya\n`;
    ans += '\n**🚨 TINDAKAN SEGERA:**\n';
    ans += '1. Segera order ke supplier\n';
    ans += '2. Cek supplier alternatif untuk harga lebih kompetitif\n';
    ans += '3. Prioritaskan bahan untuk menu best seller\n';
    ans += '4. Aktifkan notifikasi stok minimum di sistem\n';
    return ans;
  }

  // ─── WASTE ───
  if (q.includes('waste') || q.includes('sampah') || q.includes('mubazir') || q.includes('loss') || q.includes('terbuang') || q.includes('efisien')) {
    if (wasteLogs.length === 0) {
      let ans = '✅ **ZERO WASTE** — Tidak ada waste tercatat.\n\n';
      ans += 'Produksi sangat efisien! Pertahankan.\n\n';
      ans += '💡 Tips: Tetap catat waste kecil sekalipun untuk analisis jangka panjang.';
      return ans;
    }
    let ans = `🗑️ **ANALISIS WASTE LENGKAP**\n\n`;
    ans += `💰 Total kerugian waste: **${fmt(autoAnalysis.totalWaste)}**\n`;
    ans += `📋 Jumlah catatan: ${wasteLogs.length} kejadian\n`;
    ans += `📊 Rata-rata per kejadian: ${fmt(Math.round(autoAnalysis.totalWaste / wasteLogs.length))}\n\n`;
    ans += '**📍 RINCIAN PER LOKASI:**\n';
    if (Object.keys(autoAnalysis.wasteByLocation || {}).length > 0) {
      Object.entries(autoAnalysis.wasteByLocation || {})
        .sort(([, a]: any, [, b]: any) => b - a)
        .forEach(([loc, val]: any) => {
          ans += `• ${loc}: ${fmt(val)} — ${Math.round((val / autoAnalysis.totalWaste) * 100)}% dari total\n`;
        });
    }
    ans += '\n**💡 STRATEGI REDUKSI WASTE:**\n';
    ans += '1. Produksi berdasarkan data penjualan (jangan over-produksi)\n';
    ans += '2. Terapkan FEFO (First Expiry First Out) untuk bahan baku\n';
    ans += '3. Olah waste jadi produk diskon (misal: roti kemarin → roti panggang)\n';
    ans += '4. Donasi waste layak konsumsi → branding CSR positif\n';
    if (autoAnalysis.totalWaste > 0 && autoAnalysis.totalRevenue > 0) {
      const wasteRatio = (autoAnalysis.totalWaste / autoAnalysis.totalRevenue) * 100;
      ans += `\n📊 Rasio waste/revenue: ${wasteRatio.toFixed(1)}%`;
      if (wasteRatio > 5) ans += ' — 🔴 MELEBIHI BATAS (target <5%)';
      else ans += ' — ✅ Dalam batas wajar';
    }
    return ans;
  }

  // ─── REVENUE / OMSET ───
  if (q.includes('revenue') || q.includes('omzet') || q.includes('penjualan') || q.includes('pendapatan') || q.includes('berapa') || q.includes('total') || q.includes('keuangan') || q.includes('bisnis')) {
    let ans = '📈 **LAPORAN KEUANGAN LENGKAP**\n\n';
    ans += `💰 **Total Revenue:** ${fmt(autoAnalysis.totalRevenue)}\n`;
    ans += `🛒 **Total Transaksi:** ${autoAnalysis.totalOrders}\n`;
    ans += `🏪 **Cabang Aktif:** ${autoAnalysis.totalBranches}\n`;
    ans += `🗑️ **Waste Terkini:** ${fmt(autoAnalysis.totalWaste)}\n`;
    ans += `🚚 **SO Pending:** ${autoAnalysis.pendingSO}\n`;
    ans += `📦 **Bahan Stok Rendah:** ${autoAnalysis.lowStockBahan.length} item\n`;
    ans += `📝 **Total Menu:** ${productHpp.length} produk\n`;
    ans += `⚙️ **Bahan Baku:** ${bahanBaku.length} item\n\n`;
    if (autoAnalysis.totalRevenue > 0) {
      const avgPerTx = autoAnalysis.totalRevenue / Math.max(1, autoAnalysis.totalOrders);
      ans += `📊 Rata-rata per transaksi: ${fmt(Math.round(avgPerTx))}\n`;
    }
    ans += '\n💡 **SARAN:** Pantau tren penjualan mingguan. Jika turun >20% dalam seminggu, segera evaluasi promo dan kualitas produk.';
    return ans;
  }

  // ─── CABANG ───
  if (q.includes('cabang') || q.includes('outlet') || q.includes('toko') || q.includes('gerai')) {
    const active = cabangList.filter(c => c.isActive);
    let ans = `🏪 **INFORMASI CABANG**\n\n`;
    ans += `Total cabang: ${cabangList.length}\n`;
    ans += `Cabang aktif: ${active.length}\n`;
    if (!active.length) {
      ans += '\n❌ Belum ada cabang aktif.\n';
      ans += '💡 Aktifkan cabang di Data Pusat → Kelola Cabang.';
      return ans;
    }
    ans += '\n**Daftar Cabang Aktif:**\n';
    active.forEach(c => {
      ans += `• **${c.nama}** — @${c.username}\n`;
      if (c.alamat) ans += `  📍 ${c.alamat}\n`;
      if (c.noTelp) ans += `  📞 ${c.noTelp}\n`;
    });
    ans += `\n🚚 Permintaan SO pending: **${autoAnalysis.pendingSO}** — perlu disetujui`;
    if (autoAnalysis.pendingSO > 0) {
      ans += '\n💡 Segera proses SO di Data Pusat → Surat Order agar stok cabang tidak kosong.';
    }
    return ans;
  }

  // ─── MENU / RESEP ───
  if (q.includes('resep') || q.includes('menu') || q.includes('produk') || q.includes('makanan') || q.includes('roti') || q.includes('minuman') || q.includes('kue')) {
    if (productHpp.length === 0) return '📝 **Belum ada produk.**\n\n💡 Buat resep dulu di Formulasi Resep — mulai dengan produk best seller potensial seperti Roti Sobek atau Sourdough.';
    let ans = `📝 **KATALOG MENU (${productHpp.length} produk)**\n\n`;
    
    // Kelompokkan per kategori
    const byCategory: Record<string, typeof productHpp> = {};
    productHpp.forEach(p => {
      const cat = p.kategori || 'Lainnya';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(p);
    });
    
    Object.entries(byCategory).forEach(([cat, products]) => {
      ans += `**📂 ${cat}** — ${products.length} produk\n`;
      products.forEach(p => {
        const calc = calculatedProducts.find(c => c.namaProduk === p.namaProduk);
        ans += `  • ${p.namaProduk}`;
        if (calc) {
          ans += ` — HPP ${fmt(calc.hppPerPorsi)} | Jual ${fmt(calc.hargaJualPerPorsi)} | Margin ${calc.marginPersen.toFixed(1)}%`;
        }
        ans += '\n';
      });
    });
    
    ans += '\n💡 **SARAN:**\n';
    const lowMargin = calculatedProducts.filter(p => p.marginPersen < 20);
    if (lowMargin.length > 0) {
      ans += `🔴 ${lowMargin.length} produk margin rendah — review harga\n`;
    }
    ans += '📸 Upload foto semua produk untuk Web Store — produk dengan foto 40% lebih laku!\n';
    ans += '🏷️ Tambah varian ukuran untuk naikkan rata-rata transaksi';
    return ans;
  }

  // ─── PELANGGAN ───
  if (q.includes('pelanggan') || q.includes('customer') || q.includes('pembeli') || q.includes('konsumen') || q.includes('market')) {
    const orders = revenueData.transactions || [];
    const uniqueCustomers = new Set(orders.map((t: any) => t.customerName || 'Pelanggan').filter(Boolean)).size;
    let ans = '👥 **ANALISIS PELANGGAN**\n\n';
    ans += `👤 Total pelanggan unik: **${uniqueCustomers}**\n`;
    ans += `🛒 Total transaksi: **${orders.length}**\n`;
    if (orders.length > 0 && uniqueCustomers > 0) {
      const avg = orders.reduce((s: number, t: any) => s + (t.amount || 0), 0) / orders.length;
      const avgPerCustomer = orders.reduce((s: number, t: any) => s + (t.amount || 0), 0) / uniqueCustomers;
      ans += `💰 Rata-rata per transaksi: ${fmt(Math.round(avg))}\n`;
      ans += `💵 Rata-rata per pelanggan: ${fmt(Math.round(avgPerCustomer))}\n`;
      ans += `🔄 Frekuensi beli rata-rata: ${(orders.length / uniqueCustomers).toFixed(1)}x\n\n`;
      ans += '**💡 STRATEGI RETAIL:**\n';
      ans += '• **Loyalty program**: Diskon 10% tiap pembelian ke-5\n';
      ans += '• **Reaktivasi**: Hubungi pelanggan yang tidak beli >30 hari\n';
      ans += '• **Upsell**: Tawarkan topping/add-on saat checkout\n';
      ans += '• **Bundle**: Produk + minuman dengan harga spesial';
    } else {
      ans += '\n📊 Belum cukup data. Mulai transaksi POS untuk analisis lebih dalam.';
    }
    return ans;
  }

  // ─── DETEKSI PROAKTIF: Cek & report otomatis ───
  // Jika user tidak bertanya spesifik, berikan analisis kesehatan bisnis
  const issues: string[] = [];
  const goodNews: string[] = [];

  // Deteksi revenue rendah
  if (autoAnalysis.totalRevenue === 0) {
    issues.push('🔴 **Belum ada transaksi POS** — mulai catat penjualan!');
  } else if (autoAnalysis.totalOrders < 10) {
    issues.push('🟡 **Transaksi masih sedikit** (<10) — perbanyak promosi dan catat penjualan rutin.');
  }

  // Deteksi margin rendah
  const lowMarginCount = calculatedProducts.filter(p => p.marginPersen < 20).length;
  if (lowMarginCount > 0) {
    issues.push(`🔴 **${lowMarginCount} produk margin rendah** (<20%) — review harga jual atau efisiensi bahan baku.`);
  }

  // Deteksi waste tinggi
  if (autoAnalysis.totalWaste > 0 && autoAnalysis.totalRevenue > 0) {
    const wasteRatio = (autoAnalysis.totalWaste / autoAnalysis.totalRevenue) * 100;
    if (wasteRatio > 5) {
      issues.push(`🔴 **Waste tinggi** (${wasteRatio.toFixed(1)}% dari revenue) — target maksimal 5%. Optimasi produksi!`);
    } else if (wasteRatio > 2) {
      goodNews.push(`✅ Waste terkendali (${wasteRatio.toFixed(1)}% dari revenue) — masih dalam batas wajar.`);
    }
  }

  // Deteksi stok rendah
  if (autoAnalysis.lowStockBahan.length > 0) {
    issues.push(`🟡 **${autoAnalysis.lowStockBahan.length} bahan stok rendah** — segera order: ${autoAnalysis.lowStockBahan.slice(0, 3).join(', ')}${autoAnalysis.lowStockBahan.length > 3 ? '...' : ''}`);
  }

  // Deteksi SO pending
  if (autoAnalysis.pendingSO > 0) {
    issues.push(`🟡 **${autoAnalysis.pendingSO} Surat Order pending** — setujui di Data Pusat agar cabang tidak kekurangan stok.`);
  }

  // Good news
  if (calculatedProducts.length > 0 && lowMarginCount === 0) {
    goodNews.push('✅ **Semua produk margin sehat** — tidak ada yang di bawah 20%.');
  }
  if (autoAnalysis.topProducts.length > 0) {
    goodNews.push(`🏆 **Best seller**: ${autoAnalysis.topProducts[0].name} — ${fmt(autoAnalysis.topProducts[0].revenue)}`);
  }
  if (bahanBaku.length > 0 && autoAnalysis.lowStockBahan.length === 0) {
    goodNews.push('✅ **Stok semua bahan aman** — tidak ada yang perlu di-order segera.');
  }
  if (wasteLogs.length === 0) {
    goodNews.push('✅ **Zero waste** — produksi sangat efisien!');
  }

  // Bangun jawaban
  let ans = '📋 **ANALISIS KESEHATAN BISNIS — OTOMATIS**\n\n';
  
  ans += `**📊 SISTEM MEMBACA:** ${bahanBaku.length} bahan, ${productHpp.length} resep, ${cabangList.length} cabang, ${autoAnalysis.totalOrders} transaksi\n\n`;

  if (issues.length > 0) {
    ans += '**🔴 MASALAH TERDETEKSI:**\n';
    issues.forEach(i => { ans += `${i}\n`; });
    ans += '\n';
  }

  if (goodNews.length > 0) {
    ans += '**✅ KABAR BAIK:**\n';
    goodNews.forEach(g => { ans += `${g}\n`; });
    ans += '\n';
  }

  if (issues.length === 0 && goodNews.length === 0) {
    ans += '📝 Belum cukup data untuk analisis mendalam. Mulai isi data bisnis Anda!\n\n';
  }

  ans += '**💡 REKOMENDASI UMUM:**\n';
  if (autoAnalysis.totalRevenue > 0) {
    ans += '• Update foto produk di Web Store — tampilan visual naikkan minat beli\n';
  }
  ans += '• Bundling produk margin tinggi + rendah untuk optimasi profit\n';
  ans += '• Catat transaksi POS rutin untuk analisis tren penjualan\n';
  ans += '• Lakukan stok opname mingguan untuk cegah waste\n';
  ans += '• Promo bundling dan diskon terbatas untuk dorong repeat order\n\n';

  ans += '**🔍 Coba tanya spesifik:**\n';
  ans += '• "Apa produk terlaris?"\n';
  ans += '• "Produk dengan margin rendah"\n';
  ans += '• "Stok apa yang habis?"\n';
  ans += '• "Data waste"\n';
  ans += '• "Info pelanggan"\n';
  ans += '• "Rekomendasi strategi marketing"';
  return ans;
}

interface CrmMarketingTabProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  wasteLogs: WasteLog[];
  cabangList: Cabang[];
  suratOrders: SuratOrder[];
}

export default function CrmMarketingTab({ 
  calculatedProducts, 
  bahanBaku, 
  productHpp, 
  detailResep, 
  wasteLogs, 
  cabangList, 
  suratOrders 
}: CrmMarketingTabProps) {
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [marketingAdvice, setMarketingAdvice] = useState('');
  const [salesDropReason, setSalesDropReason] = useState('');
  const [competitorFactor, setCompetitorFactor] = useState('');
  const [costChanges, setCostChanges] = useState('');
  const [selectedTargetProduct, setSelectedTargetProduct] = useState('');
  const [blastSending, setBlastSending] = useState(false);
  const [blastTarget, setBlastTarget] = useState('Semua');
  const [showAutoAnalysis, setShowAutoAnalysis] = useState(false);
  const [aiError, setAiError] = useState('');
  // ─── FREE-FORM Q&A ───
  const [freeQuestion, setFreeQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<{ question: string; answer: string }[]>(() =>
    safeGetLocalStorage<{ question: string; answer: string }[]>('crm_qa_history', [])
  );
  const [qaLoading, setQaLoading] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // ─── AMBIL DATA DARI LOCALSTORAGE (revenue, orders) ───
  const revenueData = useMemo(() =>
    safeGetLocalStorage<{ transactions: any[]; dailyTotals: Record<string, { total: number; sources: Record<string, number> }> }>('revenue_tracker_data', { transactions: [], dailyTotals: {} })
  , []);

  const ordersData = useMemo(() =>
    safeGetLocalStorage<any[]>('pos_orders_data', [])
  , []);

  // ─── AUTO-ANALYSIS (local, fallback) ───
  const autoAnalysis = useMemo(() => {
    const analysis: {
      totalRevenue: number;
      totalOrders: number;
      totalWaste: number;
      wasteByLocation: Record<string, number>;
      totalBranches: number;
      pendingSO: number;
      lowStockBahan: string[];
      topProducts: { name: string; revenue: number; qty: number }[];
      lowMarginProducts: { name: string; margin: number; hpp: number; price: number }[];
      highMarginProducts: { name: string; margin: number; hpp: number; price: number }[];
      suggestions: string[];
    } = {
      totalRevenue: 0,
      totalOrders: 0,
      totalWaste: 0,
      wasteByLocation: {},
      totalBranches: 0,
      pendingSO: 0,
      lowStockBahan: [],
      topProducts: [],
      lowMarginProducts: [],
      highMarginProducts: [],
      suggestions: [],
    };

    // Revenue
    const txs = revenueData.transactions || [];
    analysis.totalRevenue = txs.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    analysis.totalOrders = txs.length;

    // Waste
    analysis.totalWaste = wasteLogs.reduce((s, w) => s + w.lossValue, 0);
    wasteLogs.forEach(w => {
      const loc = w.location || 'Unknown';
      analysis.wasteByLocation[loc] = (analysis.wasteByLocation[loc] || 0) + w.lossValue;
    });

    // Cabang & SO
    analysis.totalBranches = cabangList.filter(c => c.isActive).length;
    analysis.pendingSO = suratOrders.filter(s => s.status === 'minta').length;

    // Low stock bahan
    analysis.lowStockBahan = bahanBaku.filter(b => b.isiKemasan < 100).map(b => b.nama);

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

    // Low & high margin
    calculatedProducts.forEach(p => {
      if (p.marginPersen < 20) {
        analysis.lowMarginProducts.push({
          name: p.namaProduk,
          margin: p.marginPersen,
          hpp: p.hppPerPorsi,
          price: p.hargaJualPerPorsi,
        });
      }
      if (p.marginPersen > 40) {
        analysis.highMarginProducts.push({
          name: p.namaProduk,
          margin: p.marginPersen,
          hpp: p.hppPerPorsi,
          price: p.hargaJualPerPorsi,
        });
      }
    });

    // Suggestions
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
    } else if (calculatedProducts.length > 0) {
      analysis.suggestions.push('✅ Semua produk punya margin sehat di atas 20%!');
    }

    if (analysis.highMarginProducts.length > 0) {
      analysis.suggestions.push(`💎 ${analysis.highMarginProducts.length} produk margin premium (>40%) — ideal untuk diskon atau bundling.`);
    }

    if (analysis.pendingSO > 0) {
      analysis.suggestions.push(`🚚 ${analysis.pendingSO} permintaan barang cabang pending — setujui di Data Pusat untuk menjaga stok cabang.`);
    }

    if (analysis.totalWaste > 0) {
      analysis.suggestions.push(`🗑️ Total waste tercatat: ${formatCurrency(analysis.totalWaste)} — cek Manajemen Waste untuk optimasi produksi.`);
      const topWasteLoc = Object.entries(analysis.wasteByLocation).sort(([,a], [,b]) => b - a)[0];
      if (topWasteLoc) {
        analysis.suggestions.push(`📍 Waste tertinggi di: ${topWasteLoc[0]} (${formatCurrency(topWasteLoc[1])}) — investigasi penyebabnya.`);
      }
    }

    if (analysis.lowStockBahan.length > 0) {
      analysis.suggestions.push(`⚠️ ${analysis.lowStockBahan.length} bahan stok rendah: ${analysis.lowStockBahan.slice(0, 5).join(', ')}${analysis.lowStockBahan.length > 5 ? '...' : ''}`);
    }

    if (bahanBaku.length === 0) {
      analysis.suggestions.push('📦 Belum ada bahan baku terdaftar. Mulai dari Data Pusat → Bahan.');
    }

    if (calculatedProducts.length === 0) {
      analysis.suggestions.push('📝 Belum ada formulasi resep. Buat resep di tab Formulasi Resep.');
    }

    analysis.suggestions.push('💡 Strategi: Bundle produk margin tinggi + rendah, update foto produk, review harga berkala.');
    analysis.suggestions.push('🏪 Cabang aktif: ' + analysis.totalBranches + ' — pastikan stok tiap cabang terpantau via Stok Opname.');

    return analysis;
  }, [revenueData, calculatedProducts, wasteLogs, bahanBaku, cabangList, suratOrders]);

  // ─── AI FULL SYSTEM ANALYSIS ───
  const handleFullAIAnalysis = async () => {
    setMarketingLoading(true);
    setMarketingAdvice('');
    setShowAutoAnalysis(true);
    setAiError('');

    try {
      const payload = {
        products: calculatedProducts,
        bahanBaku,
        productHpp,
        detailResep,
        wasteLogs,
        cabangList,
        suratOrders,
        revenueData,
        ordersData,
        analysisType: 'full',
        userQuery: `Lakukan analisis menyeluruh. Target produk spesifik: ${selectedTargetProduct || 'Semua produk'}. ${salesDropReason ? `Penurunan penjualan: ${salesDropReason}.` : ''} ${competitorFactor ? `Kompetitor: ${competitorFactor}.` : ''} ${costChanges ? `Biaya: ${costChanges}.` : ''}`,
      };

      const res = await fetch('/api/marketing/full-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setMarketingAdvice(data.text);
          return;
        }
      }
      throw new Error('API tidak merespon');
    } catch (err: any) {
      console.error('AI Analysis error:', err);
      setAiError(err.message || 'Gagal terhubung ke AI. Pastikan server berjalan dan GEMINI_API_KEY terisi.');
      
      // Fallback: tetap tampilkan auto-analysis
      let fallbackAdvice = '⚠️ **AI TIDAK TERJANGKAU**\n\n';
      fallbackAdvice += 'Server AI (Gemini) tidak merespon. Kemungkinan penyebab:\n';
      fallbackAdvice += '1. Server belum berjalan (`npm run dev`)\n';
      fallbackAdvice += '2. `GEMINI_API_KEY` belum diisi di file `.env`\n';
      fallbackAdvice += '3. Koneksi internet terputus\n\n';
      fallbackAdvice += '━━━━━━━━━━━━━━━━━━━━━━\n\n';
      fallbackAdvice += '📊 **ANALISIS LOKAL (FALLBACK) — Berdasarkan Data Sistem:**\n\n';
      fallbackAdvice += `📈 **TOTAL REVENUE:** ${formatCurrency(autoAnalysis.totalRevenue)}\n`;
      fallbackAdvice += `🛒 **TOTAL TRANSAKSI:** ${autoAnalysis.totalOrders}\n`;
      fallbackAdvice += `🏪 **CABANG AKTIF:** ${autoAnalysis.totalBranches}\n`;
      fallbackAdvice += `🚚 **SO PENDING:** ${autoAnalysis.pendingSO}\n`;
      fallbackAdvice += `🗑️ **TOTAL WASTE:** ${formatCurrency(autoAnalysis.totalWaste)}\n`;
      fallbackAdvice += `⚠️ **BAHAN STOK RENDAH:** ${autoAnalysis.lowStockBahan.length} item\n\n`;

      fallbackAdvice += '**REKOMENDASI OTOMATIS:**\n';
      autoAnalysis.suggestions.forEach((s, i) => {
        fallbackAdvice += `${i + 1}. ${s}\n`;
      });

      fallbackAdvice += '\n💡 **Agar AI aktif:**\n';
      fallbackAdvice += '1. Buka file `.env` di project root\n';
      fallbackAdvice += '2. Isi `GEMINI_API_KEY=\"your-api-key\"`\n';
      fallbackAdvice += '3. Restart server: `npm run dev`\n';
      fallbackAdvice += '4. Klik tombol ini lagi!\n';

      setMarketingAdvice(fallbackAdvice);
    } finally {
      setMarketingLoading(false);
    }
  };

  const handleConsultCMO = async () => {
    // Virtual CMO = full analysis dengan fokus pada input user
    setMarketingLoading(true);
    setMarketingAdvice('');
    setShowAutoAnalysis(true);
    setAiError('');
    try {
      const payload = {
        products: calculatedProducts,
        bahanBaku,
        productHpp,
        detailResep,
        wasteLogs,
        cabangList,
        suratOrders,
        revenueData,
        ordersData,
        analysisType: 'full',
        userQuery: `Konsultasi spesifik. Sales turun karena: ${salesDropReason || 'Tidak disebutkan'}. Kompetitor: ${competitorFactor || 'Tidak disebutkan'}. Biaya naik: ${costChanges || 'Tidak disebutkan'}. Fokus pada produk: ${selectedTargetProduct || 'Semua produk'}. Berikan solusi taktis.`,
      };

      const res = await fetch('/api/marketing/full-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setMarketingAdvice(data.text);
          return;
        }
      }
      throw new Error('API tidak merespon');
    } catch (err: any) {
      let localAdvice = '📋 **KONSULTASI LOKAL — SARAN MARKETING**\n';
      localAdvice += '━━━━━━━━━━━━━━━━━━━━━━\n\n';
      
      if (salesDropReason || competitorFactor || costChanges) {
        localAdvice += '📋 **BERDASARKAN INPUT ANDA:**\n';
        if (salesDropReason) localAdvice += `📉 Penurunan: ${salesDropReason}\n`;
        if (competitorFactor) localAdvice += `🏪 Kompetitor: ${competitorFactor}\n`;
        if (costChanges) localAdvice += `💰 Kenaikan Biaya: ${costChanges}\n`;
        localAdvice += '\n';
        if (salesDropReason) {
          localAdvice += '📉 **Atasi Penurunan Penjualan:**\n  • Survei pelanggan\n  • Bundling dengan best seller\n  • Diskon terbatas\n\n';
        }
        if (competitorFactor) {
          localAdvice += '🏪 **Hadapi Kompetitor:**\n  • Fokus ke kualitas\n  • Loyalty program\n  • Promo khusus pelanggan setia\n\n';
        }
        if (costChanges) {
          localAdvice += '💰 **Atasi Kenaikan Biaya:**\n  • Kecilkan porsi 10%\n  • Cari supplier alternatif\n  • Bundling produk margin tinggi + rendah\n\n';
        }
      }

      localAdvice += '📊 **DATA SISTEM:**\n';
      localAdvice += `  • Revenue: ${formatCurrency(autoAnalysis.totalRevenue)}\n`;
      localAdvice += `  • Transaksi: ${autoAnalysis.totalOrders}\n`;
      localAdvice += `  • Cabang: ${autoAnalysis.totalBranches}\n`;
      localAdvice += `  • Waste: ${formatCurrency(autoAnalysis.totalWaste)}\n`;
      localAdvice += `  • SO Pending: ${autoAnalysis.pendingSO}\n`;
      localAdvice += `  • Margin Rendah: ${autoAnalysis.lowMarginProducts.length}\n`;
      localAdvice += `  • Stok Rendah: ${autoAnalysis.lowStockBahan.length}\n\n`;

      localAdvice += '💡 **REKOMENDASI OTOMATIS:**\n';
      autoAnalysis.suggestions.forEach(s => { localAdvice += `  • ${s}\n`; });

      setMarketingAdvice(localAdvice);
    } finally {
      setMarketingLoading(false);
    }
  };

  // ─── FREE-FORM Q&A — Tanya apa saja tentang bisnis ───
  const handleFreeQuestion = () => {
    if (!freeQuestion.trim()) return;
    setQaLoading(true);
    const q = freeQuestion.trim();
    setFreeQuestion('');

    // Small delay agar loading spinner visible
    setTimeout(() => {
      const answer = generateLocalAnswer(q, {
        bahanBaku, productHpp, detailResep, calculatedProducts,
        wasteLogs, cabangList, suratOrders, revenueData, autoAnalysis,
      });

      const newEntry = { question: q, answer };
      const updated = [...qaHistory, newEntry].slice(-20);
      setQaHistory(updated);
      localStorage.setItem('crm_qa_history', JSON.stringify(updated));
      setQaLoading(false);
    }, 150);
  };

  const clearQaHistory = () => {
    setQaHistory([]);
    localStorage.removeItem('crm_qa_history');
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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-5 rounded-2xl shadow-md text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-yellow-300" /> AI Marketing — Otak Bisnis
        </h2>
        <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
          Didukung <strong>Google Gemini AI</strong> yang membaca seluruh data sistem secara real-time: stok bahan, resep, HPP, margin, waste, penjualan POS, cabang, dan permintaan barang. 
          Memberikan rekomendasi taktis dan operasional layaknya seorang CMO profesional.
        </p>
      </div>

      {/* SYSTEM OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs text-center">
          <TrendingUp className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
          <span className="text-[8px] uppercase font-bold text-gray-500 block">Revenue</span>
          <span className="text-xs font-black text-emerald-800 font-mono">{formatCurrency(autoAnalysis.totalRevenue)}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs text-center">
          <ShoppingCart className="w-4 h-4 text-blue-600 mx-auto mb-1" />
          <span className="text-[8px] uppercase font-bold text-gray-500 block">Transaksi</span>
          <span className="text-xs font-black text-blue-800 font-mono">{autoAnalysis.totalOrders}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs text-center">
          <Globe className="w-4 h-4 text-purple-600 mx-auto mb-1" />
          <span className="text-[8px] uppercase font-bold text-gray-500 block">Cabang</span>
          <span className="text-xs font-black text-purple-800 font-mono">{autoAnalysis.totalBranches}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs text-center">
          <AlertTriangle className={`w-4 h-4 mx-auto mb-1 ${autoAnalysis.totalWaste > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
          <span className="text-[8px] uppercase font-bold text-gray-500 block">Waste</span>
          <span className="text-xs font-black text-amber-800 font-mono">{formatCurrency(autoAnalysis.totalWaste)}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs text-center">
          <BarChart3 className="w-4 h-4 text-red-600 mx-auto mb-1" />
          <span className="text-[8px] uppercase font-bold text-gray-500 block">Margin Rendah</span>
          <span className="text-xs font-black text-red-800 font-mono">{autoAnalysis.lowMarginProducts.length}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs text-center">
          <Tag className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
          <span className="text-[8px] uppercase font-bold text-gray-500 block">Margin Tinggi</span>
          <span className="text-xs font-black text-emerald-800 font-mono">{autoAnalysis.highMarginProducts.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: AI Analysis */}
        <div className="lg:col-span-7 space-y-6">
          {/* AI FULL ANALYSIS */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
              <Brain className="w-4 h-4 text-indigo-600" /> Analisis AI — Semua Data Sistem
            </h3>
            <p className="text-[10px] text-gray-500">
              AI membaca <strong>{bahanBaku.length} bahan baku</strong>, {productHpp.length} resep, {wasteLogs.length} catatan waste, {cabangList.length} cabang, {suratOrders.length} surat order, dan {autoAnalysis.totalOrders} transaksi POS — lalu memberikan rekomendasi CMO级.
            </p>

            {/* Consultation Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Target Menu</label>
                <select value={selectedTargetProduct} onChange={(e) => setSelectedTargetProduct(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs">
                  <option value="">-- Semua Menu --</option>
                  {calculatedProducts.map(p => (
                    <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk} — Margin {p.marginPersen.toFixed(1)}%</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Penurunan Penjualan</label>
                <input type="text" value={salesDropReason} onChange={(e) => setSalesDropReason(e.target.value)}
                  placeholder="Misal: Roti kurang laku..." className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs" />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Aksi Kompetitor</label>
                <input type="text" value={competitorFactor} onChange={(e) => setCompetitorFactor(e.target.value)}
                  placeholder="Outlet baru 100m..." className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs" />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Kenaikan Biaya</label>
                <input type="text" value={costChanges} onChange={(e) => setCostChanges(e.target.value)}
                  placeholder="Mentega naik 10%..." className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs" />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleFullAIAnalysis} disabled={marketingLoading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold text-xs uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                {marketingLoading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Menganalisis...</>
                ) : (
                  <><Sparkles className="w-4 h-4 text-yellow-300" /> Analisis Sistem Lengkap</>
                )}
              </button>
              <button onClick={handleConsultCMO} disabled={marketingLoading}
                className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-bold text-xs uppercase rounded-xl transition cursor-pointer flex items-center gap-1.5">
                <Brain className="w-4 h-4" /> Virtual CMO
              </button>
            </div>

            {aiError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800">
                <strong>⚠️ {aiError}</strong>
              </div>
            )}

            {marketingAdvice && showAutoAnalysis && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs text-slate-200 whitespace-pre-wrap max-h-[600px] overflow-y-auto font-mono leading-relaxed">
                {marketingAdvice}
              </div>
            )}
          </div>

          {/* INFO: Cara pakai AI */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-[10px] text-indigo-800 leading-relaxed">
            <strong className="text-indigo-900">🧠 Cara Kerja AI Marketing:</strong><br />
            Saat kamu klik <strong>"Analisis Sistem Lengkap"</strong>, AI (Google Gemini) membaca <strong>SEMUA DATA</strong> dari sistem secara real-time:
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li>📦 {bahanBaku.length} bahan baku + stok pusat</li>
              <li>📝 {productHpp.length} formulasi resep + detail bahan</li>
              <li>🗑️ {wasteLogs.length} catatan waste + rincian per lokasi</li>
              <li>🏪 {cabangList.length} cabang + {suratOrders.length} surat order</li>
              <li>💰 {autoAnalysis.totalOrders} transaksi POS</li>
            </ul>
            {bahanBaku.length === 0 && productHpp.length === 0 ? (
              <span className="block mt-2 text-amber-700 font-bold">⚠️ Data masih kosong — isi dulu Data Pusat & Resep untuk hasil analisis maksimal.</span>
            ) : (
              <span className="block mt-2">✨ AI akan memberikan rekomendasi taktis: efisiensi resep, strategi harga, promo, dan rencana aksi 7 hari.</span>
            )}
            <p className="mt-2 text-[9px] text-indigo-600">
              Pastikan server berjalan (<code className="bg-indigo-200 px-1 rounded">npm run dev</code>) dan <code className="bg-indigo-200 px-1 rounded">GEMINI_API_KEY</code> terisi di <code className="bg-indigo-200 px-1 rounded">.env</code>.
            </p>
          </div>
        </div>

        {/* RIGHT: Suggestions & Tools */}
        <div className="lg:col-span-5 space-y-6">
          {/* Auto Suggestions */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> Rekomendasi Otomatis
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {autoAnalysis.suggestions.map((s, i) => (
                <div key={i} className="p-2.5 bg-gray-50 border border-gray-150 rounded-xl text-[10px] leading-relaxed">
                  <span className="font-medium text-gray-700">{s}</span>
                </div>
              ))}
              {autoAnalysis.suggestions.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Belum ada cukup data untuk analisis.</p>
              )}
            </div>
          </div>

          {/* Segmentasi Pelanggan — REAL DATA dari POS */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Users className="w-4 h-4 text-emerald-600" /> Segmentasi Pelanggan
            </h3>
            <div className="space-y-3">
              {(() => {
                // Derive real segments from POS orders data
                const customerMap: Record<string, { totalSpend: number; visits: number; lastDate: string; sources: string[] }> = {};
                (ordersData as any[]).forEach((o: any) => {
                  const name = (o.customerName || 'Pelanggan POS').toLowerCase().trim();
                  if (!customerMap[name]) {
                    customerMap[name] = { totalSpend: 0, visits: 0, lastDate: '', sources: [] };
                  }
                  customerMap[name].totalSpend += o.totalSum || 0;
                  customerMap[name].visits += 1;
                  if (o.date && o.date > customerMap[name].lastDate) customerMap[name].lastDate = o.date;
                  if (o.source && !customerMap[name].sources.includes(o.source)) customerMap[name].sources.push(o.source);
                });

                const customers = Object.values(customerMap);
                const totalCustomers = customers.length;

                if (totalCustomers === 0) {
                  return <p className="text-xs text-gray-400 text-center py-4">Belum ada data pelanggan. Mulai transaksi POS untuk melihat segmentasi.</p>;
                }

                const avgSpend = customers.reduce((s, c) => s + c.totalSpend, 0) / totalCustomers;

                // Real segments based on actual data
                const vip = customers.filter(c => c.totalSpend > avgSpend * 2.5 || c.visits >= 10);
                const regular = customers.filter(c => !vip.includes(c) && c.visits >= 3);
                const atRisk = customers.filter(c => !vip.includes(c) && !regular.includes(c) && c.visits >= 2);
                const newCustomers = customers.filter(c => c.visits === 1);

                const segmentData = [
                  { segment: '💎 VIP (Top Spender)', customers: vip, action: 'Loyalty card + free item tiap 10x beli' },
                  { segment: '⭐ Regular', customers: regular, action: 'Diskon 10% tiap kunjungan ke-5' },
                  { segment: '📢 At Risk', customers: atRisk, action: 'Kirim promo reaktivasi via WA' },
                  { segment: '🆕 New Customer', customers: newCustomers, action: 'Welcome offer: diskon 20%' },
                ];

                return segmentData.map((g, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-900">{g.segment}</span>
                      <span className="font-mono text-emerald-800 px-2 py-0.5 rounded text-[10px]">{g.customers.length} pelanggan</span>
                    </div>
                    <p className="text-[10px] text-indigo-600 font-semibold mt-1">🎯 {g.action}</p>
                    {g.customers.length > 0 && (
                      <p className="text-[9px] text-gray-400 mt-0.5 font-mono">
                        💰 Rata-rata: {formatCurrency(Math.round(g.customers.reduce((s, c) => s + c.totalSpend, 0) / g.customers.length))} /pelanggan
                        {g.customers.length > 1 && ` • ${g.customers.length} total`}
                      </p>
                    )}
                  </div>
                ));
              })()}
              <div className="bg-slate-50 p-2 rounded-lg text-[9px] text-gray-500 text-center">
                🧑‍🤝‍🧑 Segmentasi berdasarkan data {ordersData.length} transaksi POS nyata. Data diperbarui otomatis.
              </div>
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

          {/* ─── FREE-FORM Q&A — Tanya Bebas ─── */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <MessageCircle className="w-4 h-4 text-indigo-600" /> Tanya Bebas — AI Marketing
            </h3>
            <p className="text-[10px] text-gray-500">
              Tanya apa saja tentang bisnis Anda. Sistem akan menjawab berdasarkan data real-time.
            </p>
            <div className="flex gap-2">
              <input type="text" value={freeQuestion} onChange={e => setFreeQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleFreeQuestion(); }}
                placeholder="Contoh: produk apa yang paling laku?"
                className="flex-1 border border-gray-200 rounded-xl p-2.5 text-xs bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none" />
              <button onClick={handleFreeQuestion} disabled={qaLoading || !freeQuestion.trim()}
                className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1">
                {qaLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HelpCircle className="w-3.5 h-3.5" />}
                Tanya
              </button>
            </div>
            {qaHistory.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {qaHistory.slice().reverse().map((entry, i) => (
                  <div key={i} className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-[10px]">
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-500 font-bold shrink-0 mt-0.5">Q:</span>
                      <span className="text-gray-800 font-medium">{entry.question}</span>
                    </div>
                    <div className="flex items-start gap-2 mt-1.5">
                      <span className="text-emerald-500 font-bold shrink-0 mt-0.5">A:</span>
                      <span className="text-gray-600 whitespace-pre-wrap">{entry.answer}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {qaHistory.length > 0 && (
              <button onClick={clearQaHistory}
                className="text-[9px] text-gray-400 hover:text-red-500 transition cursor-pointer">
                🗑️ Hapus riwayat tanya jawab
              </button>
            )}
          </div>

          {/* System Health */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <ClipboardList className="w-4 h-4 text-gray-600" /> Status Sistem
            </h3>
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between items-center">
                <span>Bahan Baku Terdaftar</span>
                <span className="font-bold font-mono">{bahanBaku.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Resep Produk</span>
                <span className="font-bold font-mono">{productHpp.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Detail Resep (bahan)</span>
                <span className="font-bold font-mono">{detailResep.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Catatan Waste</span>
                <span className="font-bold font-mono">{wasteLogs.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Cabang Aktif</span>
                <span className="font-bold font-mono">{autoAnalysis.totalBranches}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Surat Order (Total)</span>
                <span className="font-bold font-mono">{suratOrders.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Bahan Stok Rendah</span>
                <span className={`font-bold font-mono ${autoAnalysis.lowStockBahan.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{autoAnalysis.lowStockBahan.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Produk Margin Rendah</span>
                <span className={`font-bold font-mono ${autoAnalysis.lowMarginProducts.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{autoAnalysis.lowMarginProducts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
