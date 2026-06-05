import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
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
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI services' });
  }
});

// AI Automated Dashboard Marketing Assistant API Route
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
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini assistant error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI services' });
  }
});

// Backup Email API Route — Send backup data via SMTP using Nodemailer
app.post('/api/backup/send', async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, toEmail, backupData, backupDate } = req.body;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !toEmail || !backupData) {
      return res.status(400).json({ error: 'SMTP configuration incomplete or missing backup data.' });
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
