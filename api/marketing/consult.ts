// Vercel Serverless Function — POST /api/marketing/consult
// AI Ujung Tombak Marketing — CMO Consultation & Q&A
import { getAiClient, requireApiKey } from '../_gemini';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed — use POST' });
  if (!requireApiKey(req, res)) return;

  try {
    const { 
      question, 
      products, 
      bahanBaku, 
      detailResep, 
      revenueData, 
      wasteLogs, 
      cabangList,
      history = []
    } = req.body || {};

    const client = getAiClient();
    
    // Siapkan ringkasan data untuk konteks AI
    const productContext = (products || []).map((p: any) => ({
      nama: p.namaProduk,
      hpp: p.hppPerPorsi,
      hargaJual: p.hargaJualPerPorsi,
      margin: p.marginPersen,
      yield: p.porsiJual
    }));

    const ingredientContext = (bahanBaku || []).map((b: any) => ({
      nama: b.nama,
      stok: b.isiKemasan,
      satuan: b.satuan
    }));

    const recipeContext = (detailResep || []).map((r: any) => ({
      produk: r.namaProduk,
      bahan: r.namaBahan,
      takaran: r.takaran,
      satuan: r.satuan
    }));

    const totalRevenue = (revenueData?.transactions || []).reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const totalOrders = (revenueData?.transactions || []).length;

    const chatHistory = history.map((h: any) => `User: ${h.question}\nAI: ${h.answer}`).join('\n\n');

    const prompt = `Anda adalah CHIEF MARKETING OFFICER (CMO) dan KEPALA OPERASIONAL Near Bakery & Co. Anda bukan sekadar asisten, Anda adalah "Ujung Tombak" perusahaan.

=== INSTRUKSI UTAMA ===
1. KEPENTINGAN PERUSAHAAN: Selalu utamakan profitabilitas dan keberlangsungan bisnis. Jangan berikan diskon jika margin < 20%.
2. DATA-DRIVEN: Gunakan angka-angka dari data sistem yang diberikan untuk memperkuat argumen Anda.
3. PROAKTIF & TEGAS: Jika ada masalah (stok habis, margin tipis), katakan langsung dan berikan instruksi perbaikan.
4. DETAIL RESEP: Anda tahu semua resep. Jika ditanya soal resep, berikan langkah teknis pembuatan yang profesional.
5. DEBATABLE: Jika user memberikan ide yang buruk bagi bisnis (misal diskon terlalu besar), tantang ide tersebut dengan data.

=== DATA SISTEM REAL-TIME ===
PRODUK & MARGIN: ${JSON.stringify(productContext)}
STOK BAHAN: ${JSON.stringify(ingredientContext)}
DETAIL RESEP (BOM): ${JSON.stringify(recipeContext)}
REVENUE: Rp ${totalRevenue.toLocaleString('id-ID')} (${totalOrders} transaksi)
CABANG: ${(cabangList || []).length} aktif
WASTE TOTAL: Rp ${(wasteLogs || []).reduce((s: number, w: any) => s + (w.lossValue || 0), 0).toLocaleString('id-ID')}

=== RIWAYAT PERCAKAPAN ===
${chatHistory}

=== PERTANYAAN/INSTRUKSI USER ===
"${question}"

BERIKAN JAWABAN DALAM FORMAT MARKDOWN YANG TAJAM, SPESIFIK, DAN PROFESIONAL.`;

    const response = await client.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini Spearhead error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
}
