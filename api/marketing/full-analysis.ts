// Vercel Serverless Function — POST /api/marketing/full-analysis
// Full system analysis with Gemini AI — dipanggil dari CrmMarketingTab
import { getAiClient, requireApiKey } from '../_gemini';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed — use POST' });
  }

  // API key check (optional)
  if (!requireApiKey(req, res)) return;

  try {
    const { products, bahanBaku, productHpp, detailResep, wasteLogs, cabangList, suratOrders, revenueData, ordersData, userQuery } = req.body || {};

    const client = getAiClient();
    const wasteTotal = (wasteLogs || []).reduce((s: number, w: any) => s + (w.lossValue || 0), 0);
    const totalRevenue = (revenueData?.transactions || []).reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const totalOrders = (revenueData?.transactions || []).length;
    const lowStockBahan = (bahanBaku || []).filter((b: any) => b.isiKemasan < 100).map((b: any) => b.nama);
    const lowMarginProducts = (products || []).filter((p: any) => p.marginPersen < 20);
    const highMarginProducts = (products || []).filter((p: any) => p.marginPersen > 40);
    const pendingSO = (suratOrders || []).filter((s: any) => s.status === 'minta').length;

    const productCostDetails = (products || []).map((p: any) => ({
      nama: p.namaProduk,
      hpp: p.hppPerPorsi,
      hargaJual: p.hargaJualPerPorsi,
      margin: p.marginPersen,
    }));

    // ─── TREND DATA 3 BULAN ───
    const transactions = revenueData?.transactions || [];
    const now = new Date();
    const months: string[] = [];
    const monthlyRevenue: Record<string, number> = {};
    const monthlyOrders: Record<string, number> = {};
    const monthlyTopProducts: Record<string, Record<string, number>> = {};
    const monthlyWaste: Record<string, number> = {};

    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(key);
      monthlyRevenue[key] = 0;
      monthlyOrders[key] = 0;
      monthlyTopProducts[key] = {};
      monthlyWaste[key] = 0;
    }

    transactions.forEach((tx: any) => {
      if (!tx.date) return;
      const monthKey = tx.date.substring(0, 7);
      if (monthlyRevenue[monthKey] !== undefined) {
        monthlyRevenue[monthKey] += tx.amount || 0;
        monthlyOrders[monthKey]++;
        const prod = tx.product || 'Unknown';
        if (!monthlyTopProducts[monthKey][prod]) monthlyTopProducts[monthKey][prod] = 0;
        monthlyTopProducts[monthKey][prod] += tx.qty || 0;
      }
    });

    (wasteLogs || []).forEach((w: any) => {
      if (!w.dateLogged) return;
      const monthKey = w.dateLogged.substring(0, 7);
      if (monthlyWaste[monthKey] !== undefined) {
        monthlyWaste[monthKey] += w.lossValue || 0;
      }
    });

    const trendLines = months.map(m => {
      const topProd = Object.entries(monthlyTopProducts[m] || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, qty]) => `${name}(${qty}pcs)`).join(', ');
      return `- ${m}: Revenue Rp ${(monthlyRevenue[m] || 0).toLocaleString('id-ID')}, ${monthlyOrders[m] || 0} transaksi, Waste Rp ${(monthlyWaste[m] || 0).toLocaleString('id-ID')}, Top produk: ${topProd || 'N/A'}`;
    }).join('\n');

    const revenueChange = monthlyRevenue[months[2]] && monthlyRevenue[months[0]]
      ? ((monthlyRevenue[months[0]] - monthlyRevenue[months[1]]) / monthlyRevenue[months[1]] * 100).toFixed(1)
      : 'N/A';
    const revenueTrend = revenueChange !== 'N/A'
      ? (parseFloat(revenueChange) > 5 ? 'MENINGKAT' : parseFloat(revenueChange) < -5 ? 'MENURUN' : 'STABIL')
      : 'N/A';

    const timeseriesSummary = `TREN 3 BULAN TERAKHIR (${months[0]} s.d. ${months[2]}):\n${trendLines}\n\nPerubahan revenue bulan terakhir: ${revenueChange}% (${revenueTrend})`;

    const prompt = `Anda adalah AHLI MARKETING & OPERASIONAL BAKERY — "Ujung Tombak" Near Bakery & Co. Anda BUKAN sekadar analis. Anda adalah mitra strategis owner yang bertugas memberikan diagnosa bisnis yang TAJAM dan RENCANA AKSI yang LANGSUNG BISA DIJALANKAN.

=== IDENTITAS ===
- Profesional, tegas, data-driven — bicara dengan angka bukan perasaan
- Paham BANGET: HPP, margin, gramasi, yield, waste, tren penjualan, supply chain bakery
- TIDAK Suka basa-basi — langsung ke inti masalah dan solusi
- Setiap rekomendasi harus SPESIFIK dengan ANGKA dan bisa dieksekusi dalam 7 hari

=== DATA SISTEM REAL-TIME ===
PRODUK & MARGIN: ${JSON.stringify(productCostDetails)}
BAHAN BAKU: ${JSON.stringify((bahanBaku || []).map((b: any) => ({ nama: b.nama, stok: b.isiKemasan })))}
TOTAL WASTE: Rp ${wasteTotal.toLocaleString('id-ID')}
TOTAL REVENUE: Rp ${totalRevenue.toLocaleString('id-ID')} (${totalOrders} transaksi)
CABANG AKTIF: ${(cabangList || []).filter((c: any) => c.isActive).length}
SO PENDING: ${pendingSO}
BAHAN STOK RENDAH: ${lowStockBahan.join(', ') || 'Tidak ada'}
PRODUK MARGIN RENDAH: ${lowMarginProducts.length}
PRODUK MARGIN TINGGI: ${highMarginProducts.length}

${timeseriesSummary}

PERTANYAAN: ${userQuery || '(Analisis lengkap)'}

=== TUGAS: BERIKAN ANALISIS & RENCANA AKSI ===

Format jawaban harus MARKDOWN dengan struktur berikut:

## 1. DIAGNOSIS CEPAT (30 detik)
- 3 masalah PALING KRITIS saat ini (berdasarkan data, bukan feeling)
- Produk apa yang paling bermasalah? (margin rendah, stok habis, waste tinggi)
- Cabang mana yang perlu perhatian?

## 2. REKOMENDASI OPERASIONAL
- Efisiensi resep: bahan apa yang bisa diturunkan gramasinya?
- Manajemen waste: produk/bahan apa yang paling banyak terbuang?
- Supply chain: SO apa yang masih pending? stok apa yang kritis?

## 3. STRATEGI HARGA & PROMOSI
- Produk apa yang bisa di-bundling? Hitung margin SETELAH bundling!
- Diskon maksimal yang aman per produk (jangan sampai margin <15%)
- Promo musiman yang relevan

## 4. KAMPANYE SIAP PAKAI (langsung copy-paste)
- **WA Blast** (max 300 karakter): draft siap kirim
- **Caption Instagram** (max 150 karakter + 3 hashtag)
- **Promo GoFood/GrabFood**: diskon berapa% untuk produk apa

## 5. RENCANA AKSI 7 HARI
- Hari 1-2: prioritas utama
- Hari 3-5: tind lanjut
- Hari 6-7: evaluasi

SETIAP ANGKA HARUS BERDASARKAN DATA SISTEM. Jangan ngasih saran tanpa data pendukung.`;

    const response = await client.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
}
