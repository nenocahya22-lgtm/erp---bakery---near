import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

// ─── LOKAL: Express App untuk dev ───
// Di production (Vercel), API di-handle oleh serverless functions individual di api/
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());
const PORT = 3000;

// ─── HEALTH ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', geminiKey: process.env.GEMINI_API_KEY ? 'configured ✅' : 'not set ⚠️', timestamp: new Date().toISOString() });
});

// ─── LAZY-INIT GEMINI ───
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// ─── API KEY AUTH ───
function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return next();
  const providedKey = req.headers['x-api-key'] as string;
  if (providedKey === apiKey) return next();
  return res.status(403).json({ error: 'Forbidden: invalid or missing API key' });
}

app.use('/api', requireApiKey);

// ─── RATE LIMITER: maks 10 request / menit per IP untuk endpoint marketing (Gemini) ───
const marketingLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.' },
});

app.use('/api/marketing', marketingLimiter);

// ─── API: MARKETING CONSULT ───
app.post('/api/marketing/consult', async (req, res) => {
  try {
    const { productMetrics, salesDropReason, competitorFactor, costChanges } = req.body;
    const client = getAiClient();
    const prompt = `Anda adalah CMO profesional bakery. Analisis data: ${JSON.stringify(productMetrics || {})}. Penurunan: ${salesDropReason || 'kompetitor baru'}. Kompetitor: ${competitorFactor || 'ada outlet baru'}. Biaya: ${costChanges || 'naik 15-20%'}. Berikan analisis dalam format Markdown: 1) Diagnosa, 2) Strategi harga, 3) Saran bundling, 4) Kampanye marketing (WA blast, Instagram, GoFood), 5) Rencana aksi 7 hari. Gunakan bahasa Indonesia.`;
    const response = await client.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini consult error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
});

// ─── API: MARKETING FULL ANALYSIS ───
app.post('/api/marketing/full-analysis', async (req, res) => {
  try {
    const { products, bahanBaku, productHpp, detailResep, wasteLogs, cabangList, suratOrders, revenueData, ordersData, userQuery } = req.body;
    const client = getAiClient();
    const wasteTotal = (wasteLogs || []).reduce((s: number, w: any) => s + (w.lossValue || 0), 0);
    const totalRevenue = (revenueData?.transactions || []).reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const totalOrders = (revenueData?.transactions || []).length;
    const lowStockBahan = (bahanBaku || []).filter((b: any) => b.isiKemasan < 100).map((b: any) => b.nama);
    const lowMarginProducts = (products || []).filter((p: any) => p.marginPersen < 20);
    const highMarginProducts = (products || []).filter((p: any) => p.marginPersen > 40);
    const pendingSO = (suratOrders || []).filter((s: any) => s.status === 'minta').length;
    const productCostDetails = (products || []).map((p: any) => ({ nama: p.namaProduk, hpp: p.hppPerPorsi, hargaJual: p.hargaJualPerPorsi, margin: p.marginPersen }));

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

    const prompt = `Anda adalah CHIEF MARKETING OFFICER (CMO) dan KONSULTAN OPERASIONAL untuk Near Bakery & Co. Berdasarkan DATA REAL-TIME berikut, berikan analisis dan rekomendasi dalam format MARKDOWN terstruktur.

=== DATA SISTEM ===
PRODUK \u0026 MARGIN: ${JSON.stringify(productCostDetails)}
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

TUGAS ANDA:
1. DIAGNOSIS — produk bermasalah, waste tertinggi, stok kritis — gunakan DATA TREN 3 BULAN untuk validasi
2. REKOMENDASI OPERASIONAL — efisiensi resep, manajemen waste, supply chain
3. STRATEGI HARGA \u0026 PROMOSI — bundling, diskon maksimal
4. KAMPANYE SIAP PAKAI — draft WA (300 karakter), caption IG (100 karakter + 3 hashtag), promo GoFood
5. RENCANA AKSI 7 HARI — harus berdasarkan tren, bukan sekadar spekulasi

Gunakan bahasa Indonesia profesional, hangat, meyakinkan. SETIAP rekomendasi harus spesifik dengan angka.`;
    const response = await client.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
});

// ─── VITE DEV MODE ───
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 API endpoints: http://localhost:${PORT}/api/health`);
    console.log(`🧠 Gemini AI: ${process.env.GEMINI_API_KEY ? '✅ Key configured' : '⚠️  No GEMINI_API_KEY set'}`);
  });
}

setupVite();
