// Shared Gemini AI client helper untuk Vercel serverless functions
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export function requireApiKey(req: any, res: any): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return true; // No key configured = bypass auth
  
  const providedKey = req.headers['x-api-key'];
  if (providedKey === apiKey) return true;
  
  res.status(403).json({ error: 'Forbidden: invalid or missing API key' });
  return false;
}


