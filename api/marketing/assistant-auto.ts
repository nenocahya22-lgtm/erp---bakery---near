// Vercel Serverless Function — POST /api/marketing/assistant-auto
// Quick auto analysis endpoint
import { getAiClient, requireApiKey } from '../_gemini';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed — use POST' });
  if (!requireApiKey(req, res)) return;

  try {
    const { products, summaryStats } = req.body || {};
    const client = getAiClient();
    const prompt = `Anda adalah AI Marketing Assistant untuk Near Bakery & Co. Lakukan audit instan:\nDATA: ${JSON.stringify(products || [])}\nSTATS: ${JSON.stringify(summaryStats || {})}\n\nBerikan: 1) Analisis tren margin, 2) Rekomendasi diskon/pricing, 3) Draf kampanye (WA, Instagram, GoFood bundling).\nBahasa Indonesia profesional dengan angka kalkulasi.`;
    const response = await client.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini assistant error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
}
