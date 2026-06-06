import React, { useState } from 'react';
import { Sparkles, Download, RefreshCw, Image, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getFoodImageForPrompt, getSavedRecipeImage, saveRecipeImage } from '../lib/image-generator';

export default function ImageGeneratorTab() {
  const [prompt, setPrompt] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('img_gen_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    let finalUrl = getFoodImageForPrompt(prompt.trim());

    try {
      // Coba generate via Gemini API server
      const res = await fetch('/api/marketing/generate-image-desc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        finalUrl = data.url || finalUrl;
      }
    } catch {
      // Fallback: pakai keyword matching lokal (already set)
    }

    setGeneratedUrl(finalUrl);
    saveRecipeImage(`generated_${Date.now()}`, finalUrl);

    // Simpan ke history
    const newHistory = [`${prompt.trim()}|${finalUrl}`, ...history].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('img_gen_history', JSON.stringify(newHistory));

    setIsGenerating(false);
  };

  const handleDownload = async () => {
    if (!generatedUrl) return;
    try {
      const response = await fetch(generatedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bakery-${prompt.slice(0, 20).replace(/\s+/g, '-')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback: open in new tab
      window.open(generatedUrl, '_blank');
    }
  };

  const handleCopyUrl = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefine = () => {
    setPrompt(prompt + ' ');
    handleGenerate();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-600" /> AI Image Generator
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Generate gambar makanan & produk bakery dari prompt text. Download atau gunakan untuk menu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: Prompt Input */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-emerald-600" /> Prompt Gambar
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Deskripsi Gambar</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Contoh: Roti Sourdough Charcoal Premium dengan taburan biji wijen, difoto dengan lighting studio profesional"
                className="w-full border border-gray-200 rounded-lg p-3 text-xs h-28 resize-none"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              />
            </div>

            <p className="text-[10px] text-gray-400">
              Makin detail deskripsi, makin akurat gambar yang dihasilkan. Sebutkan jenis makanan, bahan, gaya penyajian, dan suasana.
            </p>

            {/* Quick prompts */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-bold text-gray-400 block">Quick Prompt:</span>
              <div className="flex flex-wrap gap-1.5">
                {['Roti Sourdough Premium', 'Donat Glazed Cokelat', 'Bolu Mentega Lumer', 'Croissant Gold Brown'].map(q => (
                  <button key={q} onClick={() => setPrompt(q)}
                    className="px-2 py-1 bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 text-[9px] font-semibold rounded-lg border border-gray-200 hover:border-emerald-200 transition cursor-pointer">
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5">
              {isGenerating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Mencari Gambar...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Gambar</>
              )}
            </button>

            {generatedUrl && (
              <div className="flex gap-2">
                <button onClick={handleDownload}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={handleCopyUrl}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Image className="w-3.5 h-3.5" />}
                  {copied ? 'Tersalin!' : 'Copy URL'}
                </button>
                <button onClick={handleRefine}
                  className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Refine
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KANAN: Preview */}
        <div className="lg:col-span-8 space-y-4">
          {!generatedUrl ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center mb-4">
                <Image className="w-8 h-8 text-gray-300 stroke-1" />
              </div>
              <p className="text-sm text-gray-500 font-semibold">Belum Ada Gambar</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Ketik prompt deskripsi makanan yang diinginkan, lalu klik "Generate Gambar" untuk mencari foto dari database kuliner premium.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="relative">
                <img
                  src={generatedUrl}
                  alt={prompt}
                  className="w-full h-[400px] object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-5">
                  <p className="text-white text-sm font-bold">{prompt}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">Sumber: Unsplash Food Photography</p>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Gambar siap digunakan</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDownload}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Riwayat Generate</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {history.map((item, i) => {
                  const [promptText, imgUrl] = item.split('|');
                  return (
                    <button key={i} onClick={() => { setPrompt(promptText); setGeneratedUrl(imgUrl); }}
                      className="group relative rounded-lg overflow-hidden border border-gray-100 hover:border-emerald-300 transition cursor-pointer">
                      <img src={imgUrl} alt={promptText} className="w-full h-16 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=60';
                        }} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-end p-1">
                        <span className="text-[7px] text-white font-bold truncate w-full opacity-0 group-hover:opacity-100">{promptText}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
