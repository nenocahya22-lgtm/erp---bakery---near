// Vercel Serverless Function — POST /api/marketing/consult
// CMO consultation endpoint
import { getAiClient, requireApiKey } from '../_gemini';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed — use POST' });
  if (!requireApiKey(req, res)) return;

  try {
    const { productMetrics, salesDropReason, competitorFactor, costChanges } = req.body || {};
    const client = getAiClient();
    const prompt = `Anda adalah CMO profesional bakery. Analisis data: ${JSON.stringify(productMetrics || {})}. Penurunan: ${salesDropReason || 'kompetitor baru'}. Kompetitor: ${competitorFactor || 'ada outlet baru'}. Biaya: ${costChanges || 'naik 15-20%'}. Berikan analisis dalam format Markdown: 1) Diagnosa, 2) Strategi harga, 3) Saran bundling, 4) Kampanye marketing (WA blast, Instagram, GoFood), 5) Rencana aksi 7 hari. Gunakan bahasa Indonesia.`;
    const response = await client.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini consult error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
}
