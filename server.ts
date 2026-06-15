import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import apiApp from './api/_app';

dotenv.config();

const app = express();
const PORT = 3000;

// Mount all API routes from the shared Express app (sama dengan yang di Vercel)
app.use(apiApp);

// ─── VITE DEV MODE ───
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
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 API endpoints: http://localhost:${PORT}/api/health`);
    console.log(`🧠 Gemini AI: ${process.env.GEMINI_API_KEY ? '✅ Key configured' : '⚠️  No GEMINI_API_KEY set'}`);
  });
}

setupVite();
