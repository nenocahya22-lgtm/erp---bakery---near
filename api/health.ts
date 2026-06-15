// Standalone health check — no Express dependency
// Untuk test apakah Vercel serverless functions berfungsi
export default function handler(
  req: { method: string; url: string; headers: Record<string, string | string[] | undefined> },
  res: { 
    setHeader: (key: string, value: string) => void;
    status: (code: number) => { json: (data: Record<string, unknown>) => void; end: (msg?: string) => void };
    end: (msg?: string) => void;
  }
) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    status: 'ok',
    geminiKey: process.env.GEMINI_API_KEY ? 'configured ✅' : 'not set ⚠️',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });
}
