// Simple test endpoint — no imports, no dependencies
// Untuk debugging FUNCTION_INVOCATION_FAILED
export default function handler(req: any, res: any) {
  const body = req.body || {};
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    message: 'test ok',
    method: req.method,
    bodyKeys: Object.keys(body),
    hasPrompt: !!body.userQuery,
    envHasKey: !!process.env.GEMINI_API_KEY,
    nodeVersion: process.version,
  });
}
