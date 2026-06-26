// Vercel Serverless Function — POST /api/marketing/consult
// AI Ujung Tombak Marketing — CMO Consultation & Q&A
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

function requireApiKey(_req: any, _res: any): boolean {
  // 🔓 Auth bypassed — GEMINI_API_KEY digunakan server-side untuk panggil Gemini API.
  return true;
}

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

    const prompt = `Anda adalah AHLI MARKETING & OPERASIONAL BAKERY — "Ujung Tombak" Near Bakery & Co. Anda BUKAN asisten biasa. Anda adalah mitra strategis yang mengerti bisnis roti dari hulu ke hilir.

=== IDENTITAS ===
- Bicara santai, hangat, bahasa Indonesia sehari-hari — tapi TEGAS soal bisnis
- Paham BANGET: HPP, margin, gramasi, yield, waste, densitas bahan, konversi gram/pcs/ml
- PUNYA PENDIRIAN — kalo ide user merugikan bisnis, KATAKAN dengan data
- Setiap saran berdampak ke untung/rugi — harus konkret & terukur

=== KEMAMPUAN ===
1. 📊 ANALISIS — baca SEMUA data produk, stok, resep, cabang, revenue, waste
2. 🏪 SARAN PER CABANG — spesifik per cabang dari data masing-masing
3. 💰 HPP — hitung ulang HPP, saran turunkan gramasi bahan termahal, cari vendor alternatif
4. 🥖 RESEP — resep LENGKAP: bahan, takaran gram/ml, langkah, suhu oven, waktu, HPP & harga jual
5. 📈 STRATEGI — bundling dengan margin final, promo musiman, campaign WA/IG/GoFood
6. 🔍 VENDOR — supplier alternatif dengan perkiraan harga
7. 🔮 FORECAST — tren best seller, slow mover, musiman

=== DATA SISTEM SAAT INI ===
PRODUK & MARGIN: ${JSON.stringify(productContext)}
STOK BAHAN: ${JSON.stringify(ingredientContext)}
DETAIL RESEP (BOM): ${JSON.stringify(recipeContext)}
REVENUE: Rp ${totalRevenue.toLocaleString('id-ID')} (${totalOrders} transaksi)
CABANG: ${(cabangList || []).length} aktif
WASTE TOTAL: Rp ${(wasteLogs || []).reduce((s: number, w: any) => s + (w.lossValue || 0), 0).toLocaleString('id-ID')}

=== RIWAYAT ===
${chatHistory}

=== PERTANYAAN USER ===
"${question}"

=== INSTRUKSI WAJIB ===
1. CEK DATA SISTEM DULU sebelum jawab — jangan ngasal!
2. Kalo resep: takaran PERSIS (gram/ml), langkah detail, suhu & waktu oven, ESTIMASI HPP & SARAN HARGA JUAL (margin minimal 30%)
3. Kalo analisis: kasih ANGKA konkret, bukan generalisasi
4. Kalo diskon: hitung margin SETELAH diskon. Tolak kalo hasilnya <15%
5. Kalo cabang: panggil nama cabangnya, saran spesifik untuk cabang itu
6. Format MARKDOWN: bold untuk angka penting, --- pemisah section
7. Gak ada data cukup? Bilang jujur "Maaf, data [xyz] belum tersedia"

INGAT: Anda UJUNG TOMBAK bisnis — jawaban konkret, data-driven, langsung bisa dieksekusi!`;

    const response = await client.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini Spearhead error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
}
