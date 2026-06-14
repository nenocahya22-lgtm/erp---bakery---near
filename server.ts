import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// ─── API KEY AUTHENTICATION MIDDLEWARE ───
// Semua endpoint /api/* butuh header x-api-key yang cocok dengan GEMINI_API_KEY
// Mencegah penyalahgunaan oleh pihak tidak berwenang
const API_KEY = process.env.GEMINI_API_KEY || '';

function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const providedKey = req.headers['x-api-key'] as string;
  
  // Development mode: bypass if no GEMINI_API_KEY is set
  if (!process.env.GEMINI_API_KEY && process.env.NODE_ENV === 'development') {
    return next();
  }
  
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: API key not set' });
  }
  
  if (!providedKey) {
    return res.status(401).json({ error: 'Unauthorized: x-api-key header is required' });
  }
  
  if (providedKey !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: invalid API key' });
  }
  
  next();
}

// Terapkan middleware ke semua /api/* endpoints
app.use('/api', requireApiKey);

// Lazy-initialized Gemini
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }
    aiClient = new GoogleGenAI({ apiKey });
    // Catatan: User-Agent default digunakan untuk kompatibilitas API
  }
  return aiClient;
}

// AI Marketing Consultant API Route
app.post('/api/marketing/consult', async (req, res) => {
  try {
    const { productMetrics, salesDropReason, competitorFactor, costChanges } = req.body;
    
    const client = getAiClient();
    
    const prompt = `
      Anda adalah seorang Chief Marketing Officer (CMO) profesional dan Konsultan Pemasaran Bisnis Bakery kelas dunia di dunia nyata.
      Kamu menganalisis data performa penjualan bakery kita ("Near Bakery & Co. ERP") dan memberikan saran taktis pemasaran terperinci yang bisa segera dieksekusi oleh tim operasional untuk memulihkan penjualan yang turun.

      Berikut adalah kondisi terkini produk bakery kita:
      - Detail Produk: ${JSON.stringify(productMetrics || {})}
      - Penyebab Utama Penurunan Penjualan: ${salesDropReason || "Kompetitor baru dan kenaikan harga bahan baku baku"}
      - Faktor Kompetitor: ${competitorFactor || "Ada outlet baru di dekat lokasi toko"}
      - Detail Perubahan Biaya (jika ada): ${costChanges || "Harga mentega dan tepung terigu naik sekitar 15-20%"}

      Harap berikan respons analisis pemasaran yang sangat berwawasan dalam format Markdown terstruktur yang rapi:
      1. **Analisis Deteksi & Diagnosa Penurunan**: Deteksi akar masalah berdasarkan data di atas. Mengapa margin tertekan? Mengapa loyalitas pelanggan goyah?
      2. **Strategi Penyesuaian Harga / Margin (Pricing & Margin Strategy)**: Saran taktis menghadapi kenaikan harga bahan baku tanpa mengusir pelanggan (misalnya: penyesuaian porsi kecil, bundling, subsidi silang, atau strategi psikologis harga).
      3. **Saran Menu Add-on / Topping & Bundling**: Rekomendasi topping tambahan atau add-on taktis (keju melimpah, krim sereal, saus matcha lava) untuk meningkatkan nilai rata-rata transaksi (Average Transaction Value).
      4. **Kampanye Pemasaran Taktis (Actionable Campaign Calendar)**:
         - **Promo 1: WhatsApp Targeted Blast**: Tulis draf template pesan WhatsApp siap salin-tempel yang ramah, personal, dan persuasif untuk dikirimkan ke segmentasi CRM kita (terutama segmen "At Risk/Chun").
         - **Promo 2: Social Media / Instagram Campaign**
         - **Promo 3: Channel Delivery O2O (GoFood/GrabFood/ShopeeFood) Promo Set**
      5. **Rencana Aksi Operasional 7 Hari Pertama**: Langkah konkret hari demi hari (Hari 1-7) yang harus dilakukan pemilik bakery.

      Gunakan bahasa Indonesia yang profesional, ramah, meyakinkan, penuh energi positif, terstruktur rapi dengan bullet points, tabel, dan tanda pemisah dramatis. Beraktinglah seakan kamu adalah staf marketing handal kami dan kita tidak perlu lagi merekrut marketing eksternal yang mahal!
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI services' });
  }
});

// ─── AI FULL SYSTEM ANALYSIS — UJUNG TOMBAK & OTAK MARKETING ───
// Endpoint ini menerima SEMUA data sistem dan memberikan rekomendasi
// realistis, actionable, berbasis data nyata dari seluruh modul ERP.
app.post('/api/marketing/full-analysis', async (req, res) => {
  try {
    const {
      products,        // calculatedProducts (full calculation results)
      bahanBaku,       // all raw materials
      productHpp,      // product HPP records
      detailResep,     // recipe details
      wasteLogs,       // waste records
      cabangList,      // branch list
      suratOrders,     // delivery orders
      revenueData,     // revenue tracker
      ordersData,      // POS orders
      analysisType,    // 'full' | 'quick' | 'crisis'
      userQuery,       // optional user question
    } = req.body;

    const client = getAiClient();

    // Hitung statistik agregat untuk konteks AI
    const wasteTotal = (wasteLogs || []).reduce((s: number, w: any) => s + (w.lossValue || 0), 0);
    const wasteByLocation: Record<string, number> = {};
    (wasteLogs || []).forEach((w: any) => {
      const loc = w.location || 'Unknown';
      wasteByLocation[loc] = (wasteByLocation[loc] || 0) + (w.lossValue || 0);
    });

    const totalRevenue = (revenueData?.transactions || []).reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const totalOrders = (revenueData?.transactions || []).length;

    const lowStockBahan = (bahanBaku || []).filter((b: any) => b.isiKemasan < 100).map((b: any) => b.nama);
    const lowMarginProducts = (products || []).filter((p: any) => p.marginPersen < 20);
    const highMarginProducts = (products || []).filter((p: any) => p.marginPersen > 40);
    const pendingSO = (suratOrders || []).filter((s: any) => s.status === 'minta').length;

    // Cari bahan paling mahal per produk (untuk rekomendasi efisiensi)
    const productCostDetails = (products || []).map((p: any) => {
      const topCostIngredients = (p.bahanList || [])
        .sort((a: any, b: any) => b.totalBiayaBahan - a.totalBiayaBahan)
        .slice(0, 3);
      return {
        nama: p.namaProduk,
        hpp: p.hppPerPorsi,
        hargaJual: p.hargaJualPerPorsi,
        margin: p.marginPersen,
        topIngredients: topCostIngredients,
      };
    });

    const prompt = `
      Anda adalah **CHIEF MARKETING OFFICER (CMO)** dan **KONSULTAN OPERASIONAL** untuk **Near Bakery & Co.**, sebuah bakery premium di Indonesia.

      Anda adalah UJUNG TOMBAK dan OTAK pemasaran perusahaan. Anda membaca SEMUA DATA dari seluruh sistem ERP secara real-time dan memberikan rekomendasi yang REALISTIS, SPESIFIK, dan SIAP EKSEKUSI — seperti marketing manager sungguhan yang duduk di kantor pusat setiap hari.

      === DATA SISTEM LENGKAP (REAL-TIME) ===

      📊 **PRODUK & MARGIN:**
      ${JSON.stringify(productCostDetails, null, 2)}

      📦 **BAHAN BAKU (STOK PUSAT):**
      ${JSON.stringify((bahanBaku || []).map((b: any) => ({ nama: b.nama, stok: b.isiKemasan, satuan: b.satuan, hargaSatuan: b.hargaSatuan })), null, 2)}

      🗑️ **TOTAL WASTE:** Rp ${wasteTotal.toLocaleString('id-ID')}
      **Rincian Waste per Lokasi:**
      ${JSON.stringify(wasteByLocation, null, 2)}
      **Data Waste Lengkap:** ${JSON.stringify((wasteLogs || []).slice(0, 10), null, 2)}

      💰 **TOTAL REVENUE:** Rp ${totalRevenue.toLocaleString('id-ID')}
      **TOTAL TRANSAKSI:** ${totalOrders}

      🏪 **CABANG AKTIF:** ${(cabangList || []).filter((c: any) => c.isActive).length}
      🚚 **SO PENDING:** ${pendingSO}

      ⚠️ **BAHAN STOK RENDAH:** ${lowStockBahan.length > 0 ? lowStockBahan.join(', ') : 'Tidak ada'}
      ⚠️ **PRODUK MARGIN RENDAH (< 20%):** ${lowMarginProducts.length}
      ✅ **PRODUK MARGIN TINGGI (> 40%):** ${highMarginProducts.length}

      **DATA DETAIL RESEP:**
      ${JSON.stringify((detailResep || []).slice(0, 30), null, 2)}

      **DATA ALL WASTE LOGS (terbaru):**
      ${JSON.stringify((wasteLogs || []).slice(0, 15), null, 2)}

      **PERTANYAAN / KONTEKS KHUSUS:**
      ${userQuery || '(Tidak ada — berikan analisis lengkap berdasarkan data)'}

      === TUGAS ANDA ===

      Berdasarkan DATA LENGKAP DI ATAS, berikan analisis dan rekomendasi dalam format MARKDOWN yang TERSTRUKTUR, SIAP PAKAI:

      ## 📊 1. DIAGNOSIS SISTEM — Deteksi Masalah
      - Produk mana yang marginnya bermasalah? Sebutkan nama produk spesifik, HPP, harga jual, margin %.
      - Waste tertinggi ada di mana? Berapa nilai yang hilang? Apakah ada pola?
      - Stok bahan apa yang kritis? Apa dampaknya ke produksi?
      - Apakah ada permintaan cabang pending yang perlu segera disetujui?

      ## 🛠️ 2. REKOMENDASI OPERASIONAL & EFISIENSI
      - **Efisiensi Resep:** Untuk produk margin rendah, sebutkan bahan baku TERMAHAL di resepnya dan rekomendasi pengurangan takaran secara realistis (misal: "Roti Coklat: kurangi cokelat dari 50gr ke 40gr — turunkan HPP Rp 500 tanpa mengubah rasa"). Berikan ANGKA SPESIFIK.
      - **Manajemen Waste:** Saran konkret mengurangi waste di lokasi dengan kerugian tertinggi.
      - **Supply Chain:** Bahan apa yang perlu re-order? Supplier mana?

      ## 🎯 3. STRATEGI HARGA & PROMOSI
      - Produk margin tinggi (>40%) yang BISA diberi diskon untuk boosting penjualan. Hitung diskon maksimal agar margin tetap >20%.
      - Produk margin rendah yang HARUS naik harga. Berapa kenaikannya?
      - **Rekomendasi Bundling:** Produk margin tinggi + margin rendah yang bisa dijual sebagai paket.

      ## 📱 4. KAMPANYE PEMASARAN SIAP PAKAI
      - **Draf Broadcast WhatsApp (300 karakter, bahasa Indonesia informal-natural, siap copy-paste):**
      - **Caption Instagram (100 karakter + 3 hashtag):**
      - **Promo Ojol / Delivery (GoFood/Grab):**

      ## 📅 5. RENCANA AKSI 7 HARI
      Langkah konkret hari per hari (Hari 1 sampai Hari 7) yang harus dilakukan owner/manager.

      ---
      **GAYA BAHASA:** Bahasa Indonesia profesional, hangat, meyakinkan, seperti sedang bicara dengan pemilik bakery secara langsung. Gunakan data dan angka dari laporan di atas untuk membuat argumen yang kuat. JANGAN memberi saran umum — setip rekomendasi harus spesifik dengan angka.

      **Jika ada data yang kosong (0 transaksi, 0 waste, dll), beri tahu dengan sopan dan tetap berikan rekomendasi untuk memulai.**
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini full analysis error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI services' });
  }
});

// AI Automated Dashboard Marketing Assistant API Route (enhanced)
app.post('/api/marketing/assistant-auto', async (req, res) => {
  try {
    const { products, summaryStats } = req.body;
    
    const client = getAiClient();
    
    const prompt = `
      Anda adalah "AI Marketing Assistant" otomatis dan Konsultan Pendapatan Bisnis Bakery kelas dunia terintegrasi dalam ERP Near Bakery & Co.
      
      Tugas penting Anda adalah melakukan audit instan otomatis secara mendalam terhadap portofolio produk dan performa keuangan bakery saat ini, mendeteksi tren penurunan penjualan, lalu merumuskan rekomendasi aksi pemasaran konkret yang taktis (seperti diskon, bundling hemat, dan isi pesan promosi pemasaran).
      
      Berikut data internal terupdate dari sistem ERP Near Bakery:
      - Daftar Produk & Formulasi Margin HPP:
        ${JSON.stringify(products || [])}
      - Ringkasan Statistik ERP:
        ${JSON.stringify(summaryStats || {})}

      Harap rancang laporan analisis tren & rekomendasi otomatis yang sangat berkelas dengan format Markdown terstruktur yang informatif, rapi, ramah, dan penuh motivasi bisnis:
      
      1. **Analisis Tren Penyakit Penjualan Otomatis (ERP Auto-Diagnostic)**:
         Deteksi produk-produk spesifik yang memiliki "Margin Khawatir/Rawan" (di bawah 15%) atau yang terancam fluktuasi harga bahan baku. Berikan diagnosis tren mengapa menu ini tertekan.
      
      2. **Rekomendasi Tindakan Koreksi Harga (Pricing Strategies & Discounts)**:
         Berikan perhitungan rekomendasi diskon taktis atau penyesuaian harga khusus untuk menghadapi kompetitor tanpa memotong porsi keuntungan (misal: "Diskon Happy Hour 15% untuk produk X pada pukul 15.00", "Beli 2 Bonus 1 untuk produk Y"). Berikan argumen matematika HPP di balik strategi ini.
      
      3. **Draf Kampanye Promosi Kreatif Siap Pakai**:
         - **Draf Broadcast WhatsApp CRM**: Tulis pesan persuasif yang profesional bergaya bakery modern Jakarta untuk meningkatkan repeat purchase.
         - **Idea Campaign Instagram / TikTok Reel**: Konsep konten estetik yang bisa dibuat cepat hari ini.
         - **Promo Paket Bundling Ojol**: Tuliskan resep paket promo bundling delivery (misalnya Roti A + Kopi B hemat 20%).
         
      Bahasa: Bahasa Indonesia yang tajam, sangat profesional, penuh angka kalkulasi, inspiratif, meyakinkan, terstruktur dengan bullet list yang eye-catching.
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini assistant error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI services' });
  }
});

// AI Image Description Generator API Route — Gemini generates desc, then fetch Unsplash
app.post('/api/marketing/generate-image-desc', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Generate a detailed English description for a food photograph based on this Indonesian description: "${prompt}". Return ONLY the English description, maximum 50 words, suitable for Unsplash search.`,
    });

    const englishDesc = response.text?.trim() || prompt;

    // Fetch from Unsplash API (free tier, no key needed for basic search)
    const searchQuery = encodeURIComponent(englishDesc.split(' ').slice(0, 5).join(' ') + ' food');
    const unsplashUrl = `https://source.unsplash.com/600x400/?${searchQuery}`;

    res.json({ desc: englishDesc, url: unsplashUrl });
  } catch (error: any) {
    console.error('Image desc error:', error);
    // Fallback: return a default Unsplash food URL
    res.json({ 
      desc: req.body.prompt || 'Bakery food',
      url: `https://source.unsplash.com/600x400/?${encodeURIComponent((req.body.prompt || 'bakery food').split(' ').slice(0, 5).join(' '))}`
    });
  }
});

// Backup Email API Route — Send backup data via SMTP using Nodemailer
// ⚠️ Hanya menggunakan SMTP credentials dari environment variable, BUKAN dari client!
app.post('/api/backup/send', async (req, res) => {
  try {
    const { toEmail, backupData, backupDate } = req.body;
    
    // Gunakan SMTP dari environment variable, bukan dari client!
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !toEmail || !backupData) {
      return res.status(400).json({ error: 'SMTP configuration incomplete or missing backup data. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment.' });
    }

    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort) || 587,
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const formattedDate = new Date(backupDate || Date.now()).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const info = await transporter.sendMail({
      from: fromEmail || smtpUser,
      to: toEmail,
      subject: `📦 Backup Data ERP Near Bakery — ${formattedDate}`,
      text: `Backup data sistem ERP Near Bakery & Co.\n\nTanggal: ${formattedDate}\n\nFile backup terlampir dalam format JSON. Simpan file ini di tempat yang aman.\n\nData yang disertakan:\n- Bahan Baku\n- HPP Produk\n- Resep Detail\n- Revenue Transaksi\n- Waste & Write-off\n- R&D Experiments\n\nNear Bakery & Co. ERP\nSistem Backup Otomatis`,
      attachments: [
        {
          filename: `near-bakery-backup-${new Date().toISOString().substring(0, 10)}.json`,
          content: backupData,
          contentType: 'application/json',
        },
      ],
    });

    console.log('Backup email sent:', info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Backup email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send backup email' });
  }
});

// Vite middleware for development, and static file serving for production
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
