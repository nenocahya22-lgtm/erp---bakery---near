// Vercel Serverless Function — catch-all for /api/* paths
// Vercel routes ALL /api/* requests to this function,
// preserving the original req.url so Express routes work correctly
import app from './_app';

export default app;
