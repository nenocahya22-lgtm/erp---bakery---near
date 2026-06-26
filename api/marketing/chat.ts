// Vercel Serverless Function — POST /api/marketing/chat
// AI Chatbot untuk tim marketing — bisa lihat data, kasih saran, bikin resep, dll.
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
  // Frontend tidak perlu mengirim API key (cukup proteksi same-origin).
  return true;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed — use POST' });
  if (!requireApiKey(req, res)) return;

  try {
    const { message, history, products, bahanBaku, detailResep, wasteLogs, cabangList, suratOrders, productHpp, revenueData, ordersData } = req.body || {};

    const client = getAiClient();

    // ─── AGREGASI DATA ───
    const productList = (products || []).map((p: any) => ({
      nama: p.namaProduk, hpp: p.hppPerPorsi, hargaJual: p.hargaJualPerPorsi,
      margin: p.marginPersen, yield: p.porsiJual,
    }));

    const bahanStok = (bahanBaku || []).map((b: any) => ({
      nama: b.nama, stok: b.isiKemasan, satuan: b.satuan, hargaSatuan: b.hargaSatuan,
    }));

    const resepDetail = (detailResep || []).map((r: any) => ({
      produk: r.namaProduk, bahan: r.namaBahan, takaran: r.takaran, satuan: r.satuan,
    }));

    const wasteTotal = (wasteLogs || []).reduce((s: number, w: any) => s + (w.lossValue || 0), 0);
    const branchDetail = (cabangList || []).map((c: any) => ({
      nama: c.nama || c.cabangNama, subdomain: c.subdomain,
      isActive: c.isActive, alamat: c.alamat,
    }));
    const pendingSO = (suratOrders || []).filter((s: any) => s.status === 'minta').length;
    const totalRevenue = (revenueData?.transactions || []).reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const totalOrders = (revenueData?.transactions || []).length;
    const lowStockBahan = (bahanBaku || []).filter((b: any) => b.isiKemasan < 100).map((b: any) => b.nama);
    const lowMarginProducts = (products || []).filter((p: any) => p.marginPersen < 20);

    // ─── UBAH HISTORY KE FORMAT CHAT ───
    const chatHistory = (history || []).slice(-20).map((h: any) =>
      `${h.role === 'user' ? 'User' : 'AI'}: ${h.text}`
    ).join('\n\n');

    const systemData = `
PRODUK (${productList.length} item):
${JSON.stringify(productList)}

STOK BAHAN (${bahanStok.length} item):
${JSON.stringify(bahanStok)}

RESEP (BOM):
${JSON.stringify(resepDetail)}

CABANG:
${JSON.stringify(branchDetail)}

REVENUE: Rp ${totalRevenue.toLocaleString('id-ID')} (${totalOrders} transaksi)
WASTE: Rp ${wasteTotal.toLocaleString('id-ID')}
PENDING SO: ${pendingSO}
STOK KRITIS: ${lowStockBahan.join(', ') || 'Tidak ada'}
PRODUK MARGIN RENDAH (<20%): ${lowMarginProducts.length}
`.trim();

const prompt = `Kamu adalah AHLI MARKETING & OPERASIONAL BAKERY — "Ujung Tombak" Near Bakery & Co. Kamu BUKAN sekadar asisten. Kamu adalah mitra strategis owner yang mengerti bisnis roti dari hulu ke hilir.

IDENTITAS & KEPRIBADIAN:
- Ngobrol santai, hangat, bahasa Indonesia sehari-hari — tapi TEGAS kalo soal bisnis
- Paham BANGET: HPP, margin, gramasi, yield, waste, densitas bahan, konversi gram/pcs/ml
- Boleh pake emoji 👍
- PUNYA PENDIRIAN — kalo ide user merugikan bisnis, KATAKAN DENGAN DATA
- Setiap saranmu berdampak ke untung/rugi — jadi harus konkret dan terukur

KEMAMPUAN UTAMA:
1. 📊 ANALISIS DATA — baca SEMUA data: produk, stok, resep, cabang, revenue, waste
2. 🏪 SARAN PER CABANG — saran spesifik per cabang berdasarkan data masing-masing
3. 💰 SARAN HPP — hitung ulang HPP, saran turunkan gramasi bahan termahal, cari alternatif
4. 🥖 RESEP — kasih resep LENGKAP: bahan, takaran gram/ml, langkah, suhu oven, waktu, estimasi HPP & harga jual
5. 📈 STRATEGI — bundling dengan hitung margin final, promo musiman, campaign WA/IG/GoFood
6. 🔍 VENDOR — rekomendasi supplier alternatif dengan perkiraan harga
7. 🔮 FORECAST — prediksi tren berdasarkan best seller, slow mover, musiman

DATA SISTEM SAAT INI:
${systemData}

RIWAYAT OBROLAN:
${chatHistory}

PESAN USER:
"${message}"

INSTRUKSI W AJIB:
1. CEK DATA SISTEM DULU sebelum jawab — jangan pernah ngasal!
2. Kalo resep: wajib kasih takaran PERSIS (gram/ml), langkah detail, suhu & waktu oven, + ESTIMASI HPP & SARAN HARGA JUAL (margin ≥30%)
3. Kalo analisis: kasih ANGKA, bukan "meningkat/menurun" tanpa data
4. Kalo diskon: hitung margin SETELAH diskon. Tolak kalo <15%
5. Kalo cabang: panggil nama cabangnya, saran spesifik
6. Format MARKDOWN: bold utk angka penting, --- pemisah
7. Gak ada data? Bilang jujur.

Kamu UJUNG TOMBAK — jawaban harus konkret, data-driven, langsung eksekusi!`;

    const response = await client.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
}
