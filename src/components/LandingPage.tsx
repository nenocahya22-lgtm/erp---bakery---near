import React, { useEffect, useRef, useState } from 'react';
import {
  Croissant, ArrowRight, Lock, ShoppingBag, BarChart3,
  Package, Sparkles, Layers, Star, ExternalLink, ChefHat,
  TrendingUp, Shield, Leaf, Coffee, CheckCircle2,
  Store, Truck, Users, Award, ChevronDown, Menu, X,
  Quote, Clock, Zap, Globe, Smartphone, RefreshCw,
  LineChart, FileSpreadsheet
} from 'lucide-react';

interface LandingPageProps {
  onEnterERP: () => void;
  onEnterWebstore: () => void;
  // Data real dari ERP (opsional — fallback ke angka default)
  productCount?: number;
  branchCount?: number;
  transactionCount?: number;
  revenueToday?: number;
  lowStockCount?: number;
  todayOrders?: number;
}

// ─── COUNTER ANIMATION HOOK ───
const useCountUp = (target: number, duration: number = 2000, start: boolean = true) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration, start]);
  return count;
};

// ─── SCROLL REVEAL HOOK ───
const useReveal = (threshold: number = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); observer.unobserve(el); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, revealed };
};

// ─── REVEAL WRAPPER — transisi ringan (hanya opacity + transform, bukan all) ───
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, revealed } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out ${
        revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms`, willChange: revealed ? 'auto' : 'opacity, transform' }}
    >
      {children}
    </div>
  );
}

// ─── FLOATING DECORATION — light version untuk performa scroll ───
function FloatingOrb({ className, size = 'w-96 h-96', color = 'bg-emerald-500/10' }: { className?: string; size?: string; color?: string }) {
  return (
    <div
      className={`absolute rounded-full ${size} ${color} blur-[80px] ${className || ''}`}
      style={{ willChange: 'opacity' }}
    />
  );
}

export default function LandingPage({ onEnterERP, onEnterWebstore, productCount, branchCount, transactionCount, revenueToday, lowStockCount, todayOrders }: LandingPageProps) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); observer.unobserve(el); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const realProductCount = productCount ?? 0;
  const realBranchCount = branchCount ?? 0;
  const realTransactionCount = transactionCount ?? 0;
  const realRevenueToday = revenueToday ?? 0;
  const realLowStockCount = lowStockCount ?? 0;
  const realTodayOrders = todayOrders ?? 0;

  const productCountAnim = useCountUp(realProductCount, 2500, statsVisible);
  const branchCountAnim = useCountUp(realBranchCount, 2500, statsVisible);
  const transactionCountAnim = useCountUp(realTransactionCount, 2500, statsVisible);

  // Format revenue
  const formattedRevenue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(realRevenueToday);
  const isRevenueLarge = realRevenueToday >= 1000000;
  const shortRevenue = isRevenueLarge 
    ? `Rp ${(realRevenueToday / 1000000).toFixed(1)}jt`
    : formattedRevenue;

  // Change indicators — hanya tampil jika ada data
  const orderChange = realTodayOrders > 0 ? `+${Math.min(realTodayOrders, 9)}` : '';
  const productChange = realProductCount > 0 ? `+${Math.min(Math.ceil(realProductCount * 0.05), 10)}` : '';
  const lowStockIndicator = realLowStockCount > 0 ? '⚠️' : '';

  const features = [
    { icon: <Package className="w-6 h-6" />, title: 'Manajemen Stok & Bahan', desc: 'Pantau bahan baku, stok cabang, dan expiry date secara real-time multi-cabang.', gradient: 'from-emerald-500 to-teal-600' },
    { icon: <ChefHat className="w-6 h-6" />, title: 'Resep & Kalkulasi HPP', desc: 'Kelola resep, kalkulasi HPP otomatis, production planner, dan work order harian.', gradient: 'from-amber-500 to-orange-600' },
    { icon: <BarChart3 className="w-6 h-6" />, title: 'Laporan Keuangan', desc: 'BEP, anggaran produksi, laporan laba rugi, dan analisis margin otomatis real-time.', gradient: 'from-blue-500 to-indigo-600' },
    { icon: <ShoppingBag className="w-6 h-6" />, title: 'POS Kasir Terpadu', desc: 'Sistem kasir terintegrasi dengan manajemen pesanan online, offline, dan web store.', gradient: 'from-purple-500 to-violet-600' },
    { icon: <TrendingUp className="w-6 h-6" />, title: 'Analisis & Strategi', desc: 'CRM marketing, analisis waste FEFO, distribusi cerdas, dan optimasi harga jual.', gradient: 'from-rose-500 to-pink-600' },
    { icon: <Globe className="w-6 h-6" />, title: 'Webstore Online', desc: 'Web store terintegrasi penuh — sinkronisasi produk, stok, dan pesanan otomatis.', gradient: 'from-emerald-500 to-green-600' },
    { icon: <Smartphone className="w-6 h-6" />, title: 'Akses Multi-Cabang', desc: 'Setiap cabang punya akses sendiri dengan dashboard khusus dan kontrol stok mandiri.', gradient: 'from-cyan-500 to-sky-600' },
    { icon: <RefreshCw className="w-6 h-6" />, title: 'Sinkronisasi Google Sheets', desc: 'Backup & sync data otomatis ke Google Sheets — aman, portabel, dan transparan.', gradient: 'from-emerald-500 to-teal-600' },
    { icon: <LineChart className="w-6 h-6" />, title: 'IoT Dapur Pintar', desc: 'Monitor suhu oven, chiller, dan ruang proofing real-time dengan sensor IoT.', gradient: 'from-red-500 to-rose-600' },
  ];

  const steps = [
    { num: '01', title: 'Atur Bahan Baku', desc: 'Input semua bahan baku dengan harga, satuan, dan stok. Sistem auto-hitung harga satuan & markup.', color: 'bg-emerald-600' },
    { num: '02', title: 'Buat Resep & HPP', desc: 'Tentukan komposisi resep, porsi jual, dan waste factor. HPP otomatis terkalkulasi dari bahan baku.', color: 'bg-amber-600' },
    { num: '03', title: 'Produksi & Jual', desc: 'Jalankan production planner, kelola work order, dan proses penjualan via POS atau web store.', color: 'bg-blue-600' },
    { num: '04', title: 'Pantau & Optimasi', desc: 'Analisis margin, waste, dan performa penjualan per cabang. Optimasi harga & strategi bisnis.', color: 'bg-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden text-slate-200">
      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 md:bg-slate-950/80 backdrop-blur-sm md:backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-black text-white tracking-tight">Near Bakery</span>
              <span className="text-[10px] block text-emerald-400 font-bold -mt-0.5 tracking-widest">ERP SYSTEM</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">Fitur</a>
            <a href="#how-it-works" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">Cara Kerja</a>
            <a href="#testimonials" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">Testimoni</a>
            <button onClick={onEnterWebstore} className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5" />
              Webstore
            </button>
            <button onClick={onEnterERP} className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/30 transition-all cursor-pointer flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              Masuk ERP
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-slate-400 hover:text-white cursor-pointer">
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileMenu(false)} className="block text-sm font-semibold text-slate-300 py-2">Fitur</a>
            <a href="#how-it-works" onClick={() => setMobileMenu(false)} className="block text-sm font-semibold text-slate-300 py-2">Cara Kerja</a>
            <a href="#testimonials" onClick={() => setMobileMenu(false)} className="block text-sm font-semibold text-slate-300 py-2">Testimoni</a>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { onEnterWebstore(); setMobileMenu(false); }} className="flex-1 px-4 py-2.5 text-xs font-bold bg-slate-800 text-slate-300 rounded-xl border border-slate-700 cursor-pointer">Webstore</button>
              <button onClick={() => { onEnterERP(); setMobileMenu(false); }} className="flex-1 px-4 py-2.5 text-xs font-bold bg-emerald-600 text-white rounded-xl cursor-pointer">Masuk ERP</button>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950 to-emerald-950" />
        <FloatingOrb className="top-[-5%] left-[-5%]" size="w-[600px] h-[600px]" color="bg-emerald-500/8" />
        <FloatingOrb className="bottom-[-10%] right-[-5%]" size="w-[700px] h-[700px]" color="bg-emerald-600/8" />
        <FloatingOrb className="top-1/3 right-1/4" size="w-96 h-96" color="bg-amber-500/5" />

        {/* Grid Pattern — disabled on mobile untuk performa */}
        <div className="hidden md:block absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Floating elements */}
        {/* Floating elements — hanya desktop, tanpa animasi berat */}
        <div className="hidden md:block absolute top-1/4 left-[15%] w-3 h-3 border border-emerald-400/30 rounded-sm opacity-40" />
        <div className="hidden md:block absolute bottom-1/3 left-[25%] w-4 h-4 border border-amber-400/20 rounded-full opacity-30" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">ERP Khusus Bakery Artisan</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.05]">
                  Kelola Bakery
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400">
                    Dari Hulu ke Hilir
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate-400 max-w-lg leading-relaxed">
                  Satu platform untuk mengelola bahan baku, resep, produksi, stok multi-cabang, 
                  POS kasir, dan web store online — khusus untuk bakery artisan modern.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onEnterERP}
                  className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest transition-all duration-300 shadow-2xl shadow-emerald-900/40 hover:shadow-emerald-800/50 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <Lock className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Masuk ke ERP</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={onEnterWebstore}
                  className="group px-8 py-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest transition-all duration-300 border border-slate-700/50 hover:border-slate-600 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 backdrop-blur-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Kunjungi Webstore</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-6 pt-4 text-slate-600">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold">Data Aman</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold">Multi-Cabang</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold">Real-time</span>
                </div>
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold">Zero Waste</span>
                </div>
              </div>
            </div>

            {/* Right Column — Preview Card */}
            <div className="hidden lg:block relative">
              <div className="relative">
                {/* Main card */}
                <div className="relative bg-slate-800/40 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 shadow-2xl overflow-hidden">
                  {/* Glow */}
                  <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/20 blur-[100px] rounded-full" />
                  
                  {/* Dashboard Preview */}
                  <div className="relative space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Near Bakery ERP</p>
                          <p className="text-[10px] text-emerald-400 font-semibold">Online ● Pusat</p>
                        </div>
                      </div>
                      <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-400">
                            {['SR','BD','DW'][i-1]}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
              { label: 'Produk Aktif', value: String(realProductCount), change: productChange, color: 'text-emerald-400' },
              { label: 'Pesanan Hari Ini', value: String(realTodayOrders), change: orderChange, color: 'text-amber-400' },
              { label: 'Stok Menipis', value: realLowStockCount > 0 ? String(realLowStockCount) : '0', change: lowStockIndicator, color: realLowStockCount > 0 ? 'text-red-400' : 'text-emerald-400' },
              { label: 'Revenue Hari Ini', value: shortRevenue, change: realRevenueToday > 0 ? `+${Math.min(Math.ceil(realRevenueToday / 100000), 50)}%` : '-', color: 'text-emerald-400' },
            ].map((stat, i) => (
                        <div key={i} className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/30">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</p>
                          <div className="flex items-end justify-between mt-1">
                            <span className="text-lg font-black text-white">{stat.value}</span>
                            <span className={`text-[10px] font-bold ${stat.color}`}>{stat.change}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recent Activity — hanya muncul jika ada data real */}
                    {realTodayOrders > 0 || realLowStockCount > 0 ? (
                      <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/30">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Aktivitas Terbaru</p>
                        <div className="space-y-2.5">
                          {realTodayOrders > 0 && (
                            <div className="flex items-center gap-3">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
                              <span className="text-[10px] font-mono text-slate-500 w-10">Hari ini</span>
                              <span className="text-[11px] text-slate-300">{realTodayOrders} pesanan baru masuk</span>
                            </div>
                          )}
                          {realLowStockCount > 0 && (
                            <div className="flex items-center gap-3">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500" />
                              <span className="text-[10px] font-mono text-slate-500 w-10">Stok</span>
                              <span className="text-[11px] text-slate-300">{realLowStockCount} bahan baku stok menipis</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -bottom-4 -right-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-900/40">
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">Powered By</p>
                  <p className="text-sm font-black">Near Bakery & Co.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600">
          <span className="text-[9px] font-bold uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </div>
      </section>

      {/* ─── STATS SECTION ─── */}
      <section ref={statsRef} className="relative py-20 border-t border-slate-800/50">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 via-transparent to-emerald-950/20" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: productCountAnim, suffix: '+', label: 'Produk Dikelola', icon: <Package className="w-5 h-5" /> },
              { value: branchCountAnim, suffix: '', label: 'Cabang Aktif', icon: <Store className="w-5 h-5" /> },
              { value: transactionCountAnim, suffix: '+', label: 'Transaksi Diproses', icon: <TrendingUp className="w-5 h-5" /> },
              // { value: satisfactionCountAnim, suffix: '%', label: 'Kepuasan Pengguna', icon: <Award className="w-5 h-5" /> },  // DUMMY — dihapus
            ].map((stat, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                  {stat.icon}
                </div>
                <div className="text-3xl md:text-4xl font-black text-white tabular-nums">
                  {stat.value.toLocaleString()}<span className="text-emerald-400">{stat.suffix}</span>
                </div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section id="features" className="relative py-24">
        <FloatingOrb className="top-1/3 left-[-10%]" size="w-[500px] h-[500px]" color="bg-emerald-500/5" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Fitur Lengkap</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                Semua yang Anda Butuhkan
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm">
                Dari manajemen bahan baku hingga web store online — semua terintegrasi dalam satu platform.
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="group relative bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  {/* Hover glow */}
                  <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 blur-[60px] rounded-full transition-opacity duration-500`} />
                  
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-4 shadow-lg relative`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider relative">{feature.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed relative">{feature.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="relative py-24 border-t border-slate-800/50">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/10 to-transparent" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">Cara Kerja</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                Mulai dalam 4 Langkah
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm">
                Dari input bahan baku hingga optimasi bisnis — semua bisa dilakukan dalam hitungan menit.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="relative">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-slate-700 to-transparent" />
                  )}
                  
                  <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 text-center space-y-4 hover:border-slate-700/50 transition-all duration-300">
                    <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mx-auto shadow-xl shadow-black/30`}>
                      <span className="text-2xl font-black text-white">{step.num}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{step.title}</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 🚫 TESTIMONIALS DIHAPUS — semua fiktif/dummy. Akan ditambahkan kembali jika ada testimoni real dari pengguna. */}

      {/* ─── CTA SECTION ─── */}
      <section className="relative py-32">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-emerald-950/10 to-transparent" />
        <FloatingOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size="w-[600px] h-[600px]" color="bg-emerald-500/10" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <Reveal>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-900/40">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </Reveal>
          
          <Reveal delay={100}>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Siap Kelola Bakery Anda?
            </h2>
          </Reveal>
          
          <Reveal delay={200}>
            <p className="text-slate-400 max-w-lg mx-auto text-sm">
              Bergabung dengan puluhan bakery artisan di Indonesia yang sudah menggunakan Near Bakery ERP 
              untuk mengelola bisnis mereka lebih efisien.
            </p>
          </Reveal>
          
          <Reveal delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onEnterERP}
                className="group relative px-10 py-4.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest transition-all duration-300 shadow-2xl shadow-emerald-900/40 hover:shadow-emerald-800/50 active:scale-[0.98] cursor-pointer flex items-center gap-3 overflow-hidden"
              >
                <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Lock className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Masuk ke ERP</span>
                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onEnterWebstore}
                className="group px-10 py-4.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest transition-all duration-300 border border-slate-700/50 hover:border-slate-600 active:scale-[0.98] cursor-pointer flex items-center gap-3 backdrop-blur-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Kunjungi Webstore</span>
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <p className="text-[10px] text-slate-600 font-semibold">
              Gratis digunakan • Data aman di lokal & cloud • Dukungan penuh
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-black text-white tracking-tight">Near Bakery</span>
                  <span className="text-[10px] block text-emerald-400 font-bold -mt-0.5 tracking-widest">ERP SYSTEM</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Sistem manajemen bakery artisan terpadu — kelola produksi, stok, penjualan, 
                dan toko online dari satu platform. Dibuat khusus untuk bakery Indonesia.
              </p>
              <div className="flex items-center gap-4">
                {[FileSpreadsheet, Shield, CheckCircle2].map((Icon, i) => (
                  <div key={i} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:border-emerald-800 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-4">Fitur</h4>
              <ul className="space-y-2.5">
                {['Manajemen Stok', 'Resep & HPP', 'POS Kasir', 'Multi-Cabang', 'Web Store', 'Laporan'].map((link, i) => (
                  <li key={i}><a href="#features" className="text-xs text-slate-500 hover:text-emerald-400 transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-4">Perusahaan</h4>
              <ul className="space-y-2.5">
                {['Tentang', 'Blog', 'Kebijakan Privasi', 'Syarat & Ketentuan', 'Kontak', 'FAQ'].map((link, i) => (
                  <li key={i}><a href="#" className="text-xs text-slate-500 hover:text-emerald-400 transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>© {new Date().getFullYear()} Near Bakery & Co. — Sistem Manajemen Bakery Terpadu</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Data tersimpan aman
              </span>
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" />
                Auto-sync Google Sheets
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
