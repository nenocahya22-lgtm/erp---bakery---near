// Vercel Serverless Function — POST /api/marketing/generate-image-desc
// Generate image description from product name
import { getAiClient, requireApiKey } from '../_gemini';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed — use POST' });
  if (!requireApiKey(req, res)) return;

  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Generate detailed English food photo description from: "${prompt}". Return ONLY English, max 50 words.`,
    });

    const englishDesc = response.text?.trim() || prompt;
    const searchQuery = encodeURIComponent(englishDesc.split(' ').slice(0, 5).join(' ') + ' food');
    res.status(200).json({ desc: englishDesc, url: `https://source.unsplash.com/600x400/?${searchQuery}` });
  } catch (error: any) {
    console.error('Image desc error:', error);
    const fallbackPrompt = (req.body || {}).prompt || 'Bakery food';
    res.status(200).json({ desc: fallbackPrompt, url: `https://source.unsplash.com/600x400/?${encodeURIComponent(fallbackPrompt.split(' ').slice(0, 5).join(' '))}` });
  }
}
