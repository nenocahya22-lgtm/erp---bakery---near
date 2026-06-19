import React from 'react';
import {
  Croissant, ArrowRight, Lock, ShoppingBag, BarChart3,
  Package, Sparkles, Layers, Star, ExternalLink, ChefHat,
  TrendingUp, Shield, Leaf, Coffee
} from 'lucide-react';

interface LandingPageProps {
  onEnterERP: () => void;
  onEnterWebstore: () => void;
}

export default function LandingPage({ onEnterERP, onEnterWebstore }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-900 overflow-x-hidden">
      {/* ─── HERO SECTION ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950" />
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-30" />
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-emerald-300 rounded-full animate-ping opacity-20" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-900/30">
              <Layers className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-[0.2em]">
              <Star className="w-4 h-4 fill-emerald-400" />
              <span>Artisan Bakery Premium</span>
              <Star className="w-4 h-4 fill-emerald-400" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1]">
              Near Bakery
              <span className="block text-emerald-400">& Co.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
              Sistem manajemen terpadu untuk bakery artisan modern — kelola produksi, stok,
              penjualan, dan toko online dari satu platform.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onEnterERP}
              className="group w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/30 hover:shadow-emerald-900/50 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3"
            >
              <Lock className="w-4 h-4" />
              <span>Masuk ke ERP</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onEnterWebstore}
              className="group w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest transition-all border border-slate-700 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Kunjungi Webstore</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-16 flex items-center gap-6 text-slate-600 text-xs font-semibold uppercase tracking-widest">
          <div className="h-px w-16 bg-slate-700" />
          <span>Scroll untuk fitur</span>
          <div className="h-px w-16 bg-slate-700" />
        </div>
      </section>

      {/* ─── FITUR ─── */}
      <section className="relative px-4 py-24">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Fitur Unggulan ERP
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Semua yang Anda butuhkan untuk mengelola bakery dari hulu ke hilir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Package className="w-6 h-6" />, title: 'Manajemen Stok & Bahan', desc: 'Pantau bahan baku, stok cabang, dan expiry date secara real-time.' },
              { icon: <ChefHat className="w-6 h-6" />, title: 'Resep & Produksi', desc: 'Kelola resep, kalkulasi HPP, production planner, dan work order.' },
              { icon: <BarChart3 className="w-6 h-6" />, title: 'Laporan Keuangan', desc: 'BEP, anggaran, laporan laba rugi, dan analisis margin otomatis.' },
              { icon: <ShoppingBag className="w-6 h-6" />, title: 'POS Kasir', desc: 'Sistem kasir terintegrasi dengan manajemen pesanan online & offline.' },
              { icon: <TrendingUp className="w-6 h-6" />, title: 'Strategi Bisnis', desc: 'CRM marketing, analisis waste, dan optimasi harga jual.' },
              { icon: <Coffee className="w-6 h-6" />, title: 'Webstore Terintegrasi', desc: 'Sinkronisasi produk & stok ke toko online pelanggan secara otomatis.' },
            ].map((feature, i) => (
              <div
                key={i}
                className="group bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800 hover:border-emerald-700/50 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-700/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-600/30 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-white font-bold text-sm mb-2 uppercase tracking-wider">{feature.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative px-4 py-24">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/30 to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <div className="w-20 h-20 rounded-full bg-emerald-600/20 border border-emerald-700/30 flex items-center justify-center mx-auto">
            <Sparkles className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Siap Kelola Bakery Anda?
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Masuk ke sistem ERP untuk mulai mengelola produksi, stok, penjualan,
            dan sinkronisasi webstore.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterERP}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/30 cursor-pointer flex items-center gap-3"
            >
              <Lock className="w-4 h-4" />
              Masuk ke ERP
            </button>
            <button
              onClick={onEnterWebstore}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest transition-all border border-slate-700 cursor-pointer flex items-center gap-3"
            >
              <ShoppingBag className="w-4 h-4" />
              Kunjungi Webstore
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative border-t border-slate-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-slate-400">Near Bakery & Co. ERP</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Near Bakery & Co. — Sistem Manajemen Bakery Terpadu</p>
          <div className="flex items-center gap-4 text-slate-600">
            <Shield className="w-3 h-3" />
            <span>Data tersimpan aman di lokal & cloud</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
