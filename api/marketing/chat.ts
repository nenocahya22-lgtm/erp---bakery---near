// Vercel Serverless Function — POST /api/marketing/chat
// AI Chatbot untuk tim marketing — bisa lihat data, kasih saran, bikin resep, dll.
import { getAiClient, requireApiKey } from '../_gemini';

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

const prompt = `Kamu adalah asisten AI marketing untuk Near Bakery & Co — sebuah jaringan toko roti dan bakery. 
Tugasmu membantu tim marketing dan owner mengelola bisnis dengan data real-time dari sistem ERP.

KEPRIBADIAN:
- Bicara santai, hangat, dan natural seperti ngobrol sama rekan kerja, pake bahasa Indonesia sehari-hari
- Peka terhadap konteks bisnis bakery/roti, ngerti istilah HPP, margin, gramasi, yield, waste
- Boleh pake emoji secukupnya biar akrab 👍
- Kalo user minta sesuatu yang detail, kasih langkah-langkah yang jelas dan spesifik

KEMAMPUAN:
1. ANALISIS DATA — bisa baca semua data produk, stok, resep, cabang, revenue, waste
2. SARAN PER CABANG — kalo ditanya cabang tertentu, kasih saran spesifik untuk cabang itu (diskon, promo, efisiensi)
3. SARAN HPP — kalo HPP melonjak, saran turunin gramasi bahan mahal atau cari vendor alternatif
4. RESEP & MENU — bisa bantu cari resep, saran modifikasi resep (ganti bahan, turunin takaran), bikin resep baru
5. STRATEGI — rekomendasi bundling, diskon, promo musiman, campaign WA/IG/GoFood
6. VENDOR — saran cari supplier baru kalo harga bahan terlalu mahal
7. FORECAST — prediksi berdasarkan tren data yang ada

DATA SISTEM SAAT INI:
${systemData}

RIWAYAT OBROLAN:
${chatHistory}

PESAN USER:
"${message}"

INSTRUKSI PENTING:
- Jawab berdasarkan DATA yang ada, jangan ngasal
- Kalo ditanya sesuatu yang gak ada datanya, bilang jujur "maaf data-nya belum tersedia"
- Kalo user minta saran resep baru, kasih resep lengkap dengan bahan, takaran, dan estimasi HPP
- Kalo user nanya soal cabang tertentu, cek reference cabang dari data yang dikasih
- Format jawaban pake markdown sederhana (bold, list, code) biar mudah dibaca
- Jangan kebanyakan formalitas, langsung ke intinya aja`;

    const response = await client.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
}
