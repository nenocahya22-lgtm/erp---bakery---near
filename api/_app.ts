import express from 'express';
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

// ─── HEALTH CHECK (sebelum middleware — tanpa auth) ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', geminiKey: process.env.GEMINI_API_KEY ? 'configured ✅' : 'not set ⚠️', timestamp: new Date().toISOString() });
});

// ─── API KEY AUTH (opsional) ───
// Hanya aktif jika GEMINI_API_KEY diisi di environment Vercel
// Jika tidak diisi, API bisa diakses tanpa auth
function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return next();
  
  const providedKey = req.headers['x-api-key'] as string;
  if (providedKey === apiKey) return next();
  
  return res.status(403).json({ error: 'Forbidden: invalid or missing API key' });
}

app.use('/api', requireApiKey);

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
    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
});

// ─── API: MARKETING ASSISTANT AUTO ───
app.post('/api/marketing/assistant-auto', async (req, res) => {
  try {
    const { products, summaryStats } = req.body;
    const client = getAiClient();

    const prompt = `Anda adalah AI Marketing Assistant untuk Near Bakery & Co. Lakukan audit instan:
DATA: ${JSON.stringify(products || [])}
STATS: ${JSON.stringify(summaryStats || {})}

Berikan: 1) Analisis tren margin, 2) Rekomendasi diskon/pricing, 3) Draf kampanye (WA, Instagram, GoFood bundling).
Bahasa Indonesia profesional dengan angka kalkulasi.`;

    const response = await client.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini assistant error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
});

// ─── API: GENERATE IMAGE DESC ───
app.post('/api/marketing/generate-image-desc', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Generate detailed English food photo description from: "${prompt}". Return ONLY English, max 50 words.`,
    });
    const englishDesc = response.text?.trim() || prompt;
    const searchQuery = encodeURIComponent(englishDesc.split(' ').slice(0, 5).join(' ') + ' food');
    res.json({ desc: englishDesc, url: `https://source.unsplash.com/600x400/?${searchQuery}` });
  } catch (error: any) {
    console.error('Image desc error:', error);
    res.json({ desc: req.body.prompt || 'Bakery food', url: `https://source.unsplash.com/600x400/?${encodeURIComponent((req.body.prompt || 'bakery food').split(' ').slice(0, 5).join(' '))}` });
  }
});

// ─── API: BACKUP EMAIL ───
app.post('/api/backup/send', async (req, res) => {
  try {
    const { toEmail, backupData, backupDate } = req.body;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !toEmail || !backupData) {
      return res.status(400).json({ error: 'SMTP not configured or missing backup data. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment variables.' });
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort) || 587,
      secure: parseInt(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const formattedDate = new Date(backupDate || Date.now()).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const info = await transporter.sendMail({
      from: fromEmail || smtpUser,
      to: toEmail,
      subject: `📦 Backup Data ERP Near Bakery — ${formattedDate}`,
      text: `Backup data sistem ERP Near Bakery & Co.\n\nTanggal: ${formattedDate}\n\nFile backup terlampir dalam JSON.`,
      attachments: [{ filename: `near-bakery-backup-${new Date().toISOString().substring(0, 10)}.json`, content: backupData, contentType: 'application/json' }],
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Backup email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send backup email' });
  }
});

export default app;
