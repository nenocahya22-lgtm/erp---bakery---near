import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, Trash2, AlertCircle, MessageSquare } from 'lucide-react';
import { CalculationResult, BahanBaku, ProductHpp, DetailResep, WasteLog, Cabang, SuratOrder } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import { showToast } from '../lib/toast';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface AiChatTabProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  wasteLogs: WasteLog[];
  cabangList: Cabang[];
  suratOrders: SuratOrder[];
  showToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const STORAGE_KEY = 'ai_chat_messages';

export default function AiChatTab(props: AiChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    safeGetLocalStorage<ChatMessage[]>(STORAGE_KEY, [])
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Greeting kalo belum ada pesan
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'ai',
        text: `Halo! 👋 Aku asisten AI marketing **Near Bakery & Co.**\n\nAku bisa bantu:\n• 📊 Analisis data produk, stok, dan penjualan\n• 🏪 Saran spesifik per cabang\n• 💰 Rekomendasi harga, diskon, dan bundling\n• 🥖 Bantu cari / buat resep baru\n• 📈 Strategi marketing dan promosi\n• 🔍 Cari vendor alternatif kalo HPP mahal\n\nTanya aja apa aja yang berhubungan sama bisnis roti kamu! 😊`,
        timestamp: Date.now(),
      }]);
    }
  }, []);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: msg, timestamp: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    setError(null);

    // Ambil revenue + orders dari localStorage
    const revenueData = safeGetLocalStorage('revenue_tracker_data', { transactions: [] });
    const ordersData = safeGetLocalStorage('pos_orders_data', []);

    try {
      const res = await fetch('/api/marketing/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: updated.map(m => ({ role: m.role, text: m.text })),
          products: props.calculatedProducts,
          bahanBaku: props.bahanBaku,
          detailResep: props.detailResep,
          wasteLogs: props.wasteLogs,
          cabangList: props.cabangList,
          suratOrders: props.suratOrders,
          productHpp: props.productHpp,
          revenueData,
          ordersData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Gagal terhubung ke AI (${res.status})`);
      }

      const data = await res.json();
      const aiMsg: ChatMessage = { role: 'ai', text: data.text, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg = err.message || 'Gagal komunikasi dengan server AI';
      setError(errMsg);
      // Fallback jawaban lokal
      const fallback: ChatMessage = {
        role: 'ai',
        text: `😅 Maaf, aku lagi susah mikir bentar... **${errMsg}**\n\nCoba pastiin server jalan ya (\`npm run dev\`) dan **GEMINI_API_KEY** udah diisi di \`.env\`.\n\nSementara ini, saran dari data yang ada:\n- Total produk: ${props.calculatedProducts.length} item\n- Cabang aktif: ${props.cabangList.filter(c => c.isActive).length} cabang\n- Total waste: Rp ${(props.wasteLogs || []).reduce((s, w) => s + (w.lossValue || 0), 0).toLocaleString('id-ID')}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (messages.length <= 1) return;
    const greeting = messages[0];
    setMessages([greeting]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([greeting]));
    showToast?.('Riwayat chat dibersihkan', 'info');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // Simple markdown render (bold, list, code)
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-gray-200 px-1 rounded text-[11px]">{part.slice(1, -1)}</code>;
      }
      // Handle line breaks
      return part.split('\n').map((line, li) => (
        <React.Fragment key={`${i}-${li}`}>
          {li > 0 && <br />}
          {line.startsWith('- ') ? (
            <span className="block ml-2">• {line.slice(2)}</span>
          ) : line.startsWith('  - ') ? (
            <span className="block ml-4 text-gray-600">◦ {line.slice(4)}</span>
          ) : (
            line
          )}
        </React.Fragment>
      ));
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-170px)] bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">AI Marketing</h2>
            <p className="text-[10px] text-emerald-200">
              {loading ? '⏳ Lagi mikir...' : '🟢 Online — Tanya apa aja!'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            setInput('');
            setError(null);
            setLoading(false);
            inputRef.current?.focus();
          }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-white/70 hover:text-white"
            title="Reset input">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-white/70 hover:text-white"
            title="Hapus riwayat chat">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── CHAT AREA ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              msg.role === 'ai'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {msg.role === 'ai' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
              msg.role === 'ai'
                ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-xs'
                : 'bg-emerald-600 text-white rounded-tr-sm'
            }`}>
              {msg.role === 'ai' ? renderText(msg.text) : msg.text}
              <div className={`text-[9px] mt-1.5 ${
                msg.role === 'ai' ? 'text-gray-400' : 'text-emerald-200'
              }`}>
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* ─── LOADING ─── */}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-white border border-gray-200 px-3.5 py-2.5 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* ─── ERROR ─── */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ─── INPUT ─── */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanya apa aja... (contoh: 'produk apa yang marginnya paling kecil?')"
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              input.trim() && !loading
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Kirim</span>
          </button>
        </div>
        <p className="text-[9px] text-gray-400 mt-1.5 text-center">
          Didukung Google Gemini AI • Data real-time dari sistem ERP
        </p>
      </div>
    </div>
  );
}
