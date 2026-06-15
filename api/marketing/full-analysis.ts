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

    const prompt = `Anda adalah CHIEF MARKETING OFFICER (CMO) dan KONSULTAN OPERASIONAL untuk Near Bakery & Co. Berdasarkan DATA REAL-TIME berikut, berikan analisis dan rekomendasi dalam format MARKDOWN terstruktur.

=== DATA SISTEM ===
PRODUK & MARGIN: ${JSON.stringify(productCostDetails)}
BAHAN BAKU: ${JSON.stringify((bahanBaku || []).map((b: any) => ({ nama: b.nama, stok: b.isiKemasan })))}
TOTAL WASTE: Rp ${wasteTotal.toLocaleString('id-ID')}
TOTAL REVENUE: Rp ${totalRevenue.toLocaleString('id-ID')} (${totalOrders} transaksi)
CABANG AKTIF: ${(cabangList || []).filter((c: any) => c.isActive).length}
SO PENDING: ${pendingSO}
BAHAN STOK RENDAH: ${lowStockBahan.join(', ') || 'Tidak ada'}
PRODUK MARGIN RENDAH: ${lowMarginProducts.length}
PRODUK MARGIN TINGGI: ${highMarginProducts.length}
PERTANYAAN: ${userQuery || '(Analisis lengkap)'}

TUGAS ANDA:
1. DIAGNOSIS — produk bermasalah, waste tertinggi, stok kritis
2. REKOMENDASI OPERASIONAL — efisiensi resep, manajemen waste, supply chain
3. STRATEGI HARGA & PROMOSI — bundling, diskon maksimal
4. KAMPANYE SIAP PAKAI — draft WA (300 karakter), caption IG (100 karakter + 3 hashtag), promo GoFood
5. RENCANA AKSI 7 HARI

Gunakan bahasa Indonesia profesional, hangat, meyakinkan. SETIAP rekomendasi harus spesifik dengan angka.`;

    const response = await client.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
}
