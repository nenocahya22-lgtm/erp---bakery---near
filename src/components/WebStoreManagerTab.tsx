import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebStoreConfig, WebStoreProduct, WebStorePromo, PaymentMethod, ProductHpp, Cabang, createDefaultWebStoreConfig, createDefaultPaymentMethods } from '../types';
import {
  Globe,
  Save,
  Upload,
  Download,
  Image,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  ExternalLink,
  ShoppingBag,
  Palette,
  Megaphone,
  FileJson,
  CheckCircle2,
  X,
  AlertTriangle,
  Eye,
  Smartphone,
  CreditCard,
  Banknote,
  Wallet,
  Building2,
  Copy,
  Cpu,
} from 'lucide-react';
import {
  saveWebStoreConfig,
  getWebStoreConfig,
  getAllWebStoreConfigs,
  syncProductsToFirestore,
  registerSubdomain,
  getAllSubdomains,
} from '../lib/firestore-bridge';

const STORAGE_KEY = 'storenear_web_config';

interface Props {
  productHpp: ProductHpp[];
  calculatedProducts?: any[];
  bahanBaku?: any[];
  detailResep?: any[];
  cabangList?: Cabang[];
}

// Helper: load image as base64
const loadImageAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

export default function WebStoreManagerTab({ productHpp, calculatedProducts, bahanBaku, detailResep, cabangList }: Props) {
  const [config, setConfig] = useState<WebStoreConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* fall through */ }
    }
    return createDefaultWebStoreConfig(productHpp);
  });

  const [activeSection, setActiveSection] = useState<string>('identity');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [editingPromo, setEditingPromo] = useState<WebStorePromo | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingToFirestore, setIsSavingToFirestore] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const promoInputRef = useRef<HTMLInputElement>(null);
  const paymentLogoInputRef = useRef<HTMLInputElement>(null);

  // Load config dari Firestore on mount
  useEffect(() => {
    const loadFromFirestore = async () => {
      try {
        const cabangId = config.cabangId || 'pusat';
        const remoteConfig = await getWebStoreConfig(cabangId);
        if (remoteConfig) {
          setConfig(remoteConfig);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteConfig));
          setIsFirestoreConnected(true);
          showToast('✅ Config Firestore berhasil dimuat!', 'success');
        } else {
          setIsFirestoreConnected(true);
        }
      } catch (err) {
        console.warn('Firestore load failed, using local:', err);
        setIsFirestoreConnected(false);
      }
    };
    loadFromFirestore();
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, lastUpdated: new Date().toISOString() }));
  }, [config]);

  // Sync products from productHpp
  useEffect(() => {
    setConfig(prev => {
      const existingNames = new Set(prev.products.map(p => p.productName));
      const newFromHpp = productHpp
        .filter(p => !existingNames.has(p.namaProduk))
        .map(p => ({
          productName: p.namaProduk,
          active: true,
          displayImage: '',
          description: '',
          kategori: p.kategori || 'Lainnya',
        }));
      if (newFromHpp.length === 0) return prev;
      return { ...prev, products: [...prev.products, ...newFromHpp] };
    });
  }, [productHpp]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateConfig = (partial: Partial<WebStoreConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  };

  const updateProduct = (idx: number, partial: Partial<WebStoreProduct>) => {
    setConfig(prev => {
      const products = [...prev.products];
      products[idx] = { ...products[idx], ...partial };
      return { ...prev, products };
    });
  };

  // ─── SAVE TO FIRESTORE ───
  const handleSaveToFirestore = async () => {
    setIsSavingToFirestore(true);
    try {
      const cabangId = config.cabangId || 'pusat';
      await saveWebStoreConfig(cabangId, config);
      setIsFirestoreConnected(true);
      showToast('✅ Konfigurasi tersimpan ke Firestore! Web Store akan update otomatis.', 'success');
    } catch (err: any) {
      console.error('Firestore save error:', err);
      showToast('❌ Gagal simpan ke Firestore: ' + (err.message || 'Unknown'), 'error');
    } finally {
      setIsSavingToFirestore(false);
    }
  };

  // ─── SYNC PRODUCTS TO FIRESTORE ───
  const handleSyncProducts = async () => {
    if (!calculatedProducts || !productHpp || !detailResep || !bahanBaku) {
      showToast('Data kalkulasi belum tersedia. Buka tab Formulasi Resep dulu.', 'info');
      return;
    }
    setIsSyncing(true);
    try {
      const count = await syncProductsToFirestore(calculatedProducts, productHpp, detailResep, bahanBaku);
      setLastSynced(new Date().toLocaleTimeString('id-ID'));
      showToast(`✅ ${count} produk berhasil disinkronisasi ke Firestore! Web Store akan update.`, 'success');
    } catch (err: any) {
      console.error('Product sync error:', err);
      showToast('❌ Gagal sync produk: ' + (err.message || 'Unknown'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── SUBDOMAIN REGISTRATION ───
  const handleRegisterSubdomain = async () => {
    const cabangId = config.cabangId || 'pusat';
    const subdomain = config.branchSubdomain || 'pusat';
    const storeName = config.storeName || 'Near Bakery';
    try {
      await registerSubdomain(subdomain, cabangId, storeName);
      showToast(`✅ Subdomain "${subdomain}" berhasil didaftarkan!`, 'success');
    } catch (err: any) {
      showToast('❌ Gagal daftar subdomain: ' + (err.message || 'Unknown'), 'error');
    }
  };

  // Image upload handlers
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const b64 = await loadImageAsBase64(file); updateConfig({ logo: b64 }); showToast('Logo berhasil diupload!', 'success'); }
  };
  const handleUploadHero = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const b64 = await loadImageAsBase64(file); updateConfig({ heroImage: b64 }); showToast('Hero image berhasil diupload!', 'success'); }
  };
  const handleUploadProductImage = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const b64 = await loadImageAsBase64(file); updateProduct(idx, { displayImage: b64 }); showToast('Gambar produk berhasil diupload!', 'success'); }
  };
  const handleUploadPromoImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingPromo) { const b64 = await loadImageAsBase64(file); setEditingPromo({ ...editingPromo, image: b64 }); }
  };

  // ─── PROMO CRUD ───
  const handleAddPromo = () => {
    setEditingPromo({ id: `promo-${Date.now()}`, title: '', description: '', image: '', active: true });
    setShowPromoModal(true);
  };
  const handleEditPromo = (promo: WebStorePromo) => {
    setEditingPromo({ ...promo });
    setShowPromoModal(true);
  };
  const handleSavePromo = () => {
    if (!editingPromo || !editingPromo.title.trim()) { showToast('Judul promo harus diisi!', 'error'); return; }
    setConfig(prev => {
      const existing = prev.promos.findIndex(p => p.id === editingPromo.id);
      if (existing >= 0) {
        const promos = [...prev.promos]; promos[existing] = editingPromo;
        return { ...prev, promos };
      }
      return { ...prev, promos: [...prev.promos, editingPromo] };
    });
    setShowPromoModal(false); setEditingPromo(null);
    showToast('Promo berhasil disimpan!', 'success');
  };
  const handleDeletePromo = (id: string) => {
    setConfig(prev => ({ ...prev, promos: prev.promos.filter(p => p.id !== id) }));
    showToast('Promo dihapus.', 'info');
  };

  // ─── PAYMENT METHODS CRUD ───
  const handleAddPayment = () => {
    setEditingPayment({
      id: `pm-${Date.now()}`,
      type: 'transfer_bank',
      name: '',
      label: '',
      active: true,
      bankName: '',
      accountNumber: '',
      accountName: '',
      order: (config.paymentMethods?.length || 0) + 1,
    });
    setShowPaymentModal(true);
  };
  const handleEditPayment = (pm: PaymentMethod) => {
    setEditingPayment({ ...pm });
    setShowPaymentModal(true);
  };
  const handleSavePayment = () => {
    if (!editingPayment || !editingPayment.name.trim()) { showToast('Nama metode pembayaran harus diisi!', 'error'); return; }
    setConfig(prev => {
      const existing = prev.paymentMethods.findIndex(p => p.id === editingPayment.id);
      if (existing >= 0) {
        const pms = [...prev.paymentMethods]; pms[existing] = editingPayment;
        return { ...prev, paymentMethods: pms };
      }
      return { ...prev, paymentMethods: [...(prev.paymentMethods || []), editingPayment] };
    });
    setShowPaymentModal(false); setEditingPayment(null);
    showToast('Metode pembayaran berhasil disimpan!', 'success');
  };
  const handleDeletePayment = (id: string) => {
    setConfig(prev => ({ ...prev, paymentMethods: (prev.paymentMethods || []).filter(p => p.id !== id) }));
    showToast('Metode pembayaran dihapus.', 'info');
  };

  // ─── EXPORT / IMPORT ───
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `storenear-config-${new Date().toISOString().substring(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Konfigurasi berhasil diexport!', 'success');
  };
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text(); const parsed = JSON.parse(text);
        if (!parsed.storeName || !parsed.products) { showToast('Format JSON tidak valid!', 'error'); return; }
        setConfig(parsed); showToast('Konfigurasi berhasil diimport!', 'success');
      } catch { showToast('Gagal membaca file JSON!', 'error'); }
    };
    input.click();
  };

  // ─── UI HELPERS ───
  const sectionBtn = (key: string, icon: React.ReactNode, label: string) => (
    <button onClick={() => setActiveSection(key)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
        activeSection === key ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}>
      {icon}{label}
    </button>
  );

  const inputClass = "w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all bg-white";
  const labelClass = "text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block";
  const cardClass = "bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-emerald-600" />
            Web Store Manager
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Atur web store per cabang — semua konten, produk, promo, tema, & pembayaran
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExport} className="px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={handleImport} className="px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <button onClick={handleSaveToFirestore} disabled={isSavingToFirestore}
            className="px-3 py-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
            <Save className="w-3.5 h-3.5" />
            {isSavingToFirestore ? 'Menyimpan...' : '💾 Simpan ke Cloud'}
          </button>
          {calculatedProducts && (
            <button onClick={handleSyncProducts} disabled={isSyncing}
              className="px-3 py-2 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
              <Cpu className="w-3.5 h-3.5" />
              {isSyncing ? 'Sync...' : '🔄 Sync Produk'}
            </button>
          )}
          <button onClick={() => setShowPreview(true)}
            className="px-3 py-2 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500">
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isFirestoreConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isFirestoreConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {isFirestoreConnected ? 'Firestore Connected' : 'Local Only'}
        </span>
        {lastSynced && <span>Sync terakhir: {lastSynced}</span>}
        <span className="text-gray-300">|</span>
        <span>Cabang: <strong>{config.cabangId || 'pusat'}</strong></span>
        <span className="text-gray-300">|</span>
        <span>Subdomain: <strong>{config.branchSubdomain || 'pusat'}</strong></span>
      </div>

      {/* NAVIGATION SECTIONS */}
      <div className="flex flex-wrap gap-2">
        {sectionBtn('identity', <ShoppingBag className="w-4 h-4" />, '🏪 Identitas')}
        {sectionBtn('hero', <Image className="w-4 h-4" />, '🖼️ Hero')}
        {sectionBtn('products', <ShoppingBag className="w-4 h-4" />, '📦 Produk')}
        {sectionBtn('theme', <Palette className="w-4 h-4" />, '🎨 Tema')}
        {sectionBtn('promos', <Megaphone className="w-4 h-4" />, '📢 Promo')}
        {sectionBtn('payment', <CreditCard className="w-4 h-4" />, '💳 Pembayaran')}
        {sectionBtn('branch', <Building2 className="w-4 h-4" />, '🏛️ Cabang')}
      </div>

      {/* ─── SECTION: IDENTITY ─── */}
      {activeSection === 'identity' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800">🏪 Identitas Toko</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nama Toko</label>
              <input className={inputClass} value={config.storeName} onChange={e => updateConfig({ storeName: e.target.value })} placeholder="Near Bakery & Co." />
            </div>
            <div>
              <label className={labelClass}>Slogan</label>
              <input className={inputClass} value={config.slogan} onChange={e => updateConfig({ slogan: e.target.value })} placeholder="Fresh Baked Daily" />
            </div>
            <div>
              <label className={labelClass}>Logo</label>
              <div className="flex items-center gap-3">
                {config.logo ? (
                  <img src={config.logo} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-gray-200" />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-gray-400"><Image className="w-6 h-6" /></div>
                )}
                <button onClick={() => logoInputRef.current?.click()} className="px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Upload Logo</button>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
              </div>
            </div>
            <div>
              <label className={labelClass}>WhatsApp (no. HP)</label>
              <input className={inputClass} value={config.contactWhatsApp} onChange={e => updateConfig({ contactWhatsApp: e.target.value })} placeholder="6281234567890" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} value={config.contactEmail} onChange={e => updateConfig({ contactEmail: e.target.value })} placeholder="hello@nearbakery.com" />
            </div>
            <div>
              <label className={labelClass}>Instagram</label>
              <input className={inputClass} value={config.contactInstagram} onChange={e => updateConfig({ contactInstagram: e.target.value })} placeholder="@nearbakery" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Alamat</label>
            <input className={inputClass} value={config.alamat} onChange={e => updateConfig({ alamat: e.target.value })} placeholder="Jl. Contoh No. 123, Kota" />
          </div>
          <div>
            <label className={labelClass}>Tentang Toko</label>
            <textarea className={`${inputClass} h-24 resize-none`} value={config.aboutText} onChange={e => updateConfig({ aboutText: e.target.value })} placeholder="Tulis deskripsi tentang toko..." />
          </div>
        </div>
      )}

      {/* ─── SECTION: HERO ─── */}
      {activeSection === 'hero' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800">🖼️ Hero Banner</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Judul Utama</label>
              <input className={inputClass} value={config.heroTitle} onChange={e => updateConfig({ heroTitle: e.target.value })} placeholder="Fresh from the Oven" />
            </div>
            <div>
              <label className={labelClass}>Subjudul</label>
              <input className={inputClass} value={config.heroSubtitle} onChange={e => updateConfig({ heroSubtitle: e.target.value })} placeholder="Artisan breads & pastries" />
            </div>
            <div>
              <label className={labelClass}>Teks Tombol</label>
              <input className={inputClass} value={config.heroBtnText} onChange={e => updateConfig({ heroBtnText: e.target.value })} placeholder="Pesan Sekarang" />
            </div>
            <div>
              <label className={labelClass}>Link Tombol</label>
              <input className={inputClass} value={config.heroBtnLink} onChange={e => updateConfig({ heroBtnLink: e.target.value })} placeholder="#products" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Gambar Hero</label>
            <div className="flex items-center gap-3">
              {config.heroImage ? (
                <div className="relative">
                  <img src={config.heroImage} alt="Hero" className="w-full max-h-48 object-cover rounded-xl border border-gray-200" />
                  <button onClick={() => updateConfig({ heroImage: '' })} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="w-full h-32 bg-slate-100 rounded-xl flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200"><Image className="w-8 h-8" /></div>
              )}
            </div>
            <button onClick={() => heroInputRef.current?.click()} className="mt-2 px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Upload Hero Image</button>
            <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadHero} />
          </div>
          <div className="mt-4 p-4 bg-gradient-to-br from-emerald-900 to-slate-900 rounded-2xl text-white relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-2xl font-black">{config.heroTitle || 'Fresh from the Oven'}</h4>
              <p className="text-sm text-emerald-200 mt-1">{config.heroSubtitle || 'Artisan breads & pastries'}</p>
              <button className="mt-3 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all">
                {config.heroBtnText || 'Pesan Sekarang'}
              </button>
            </div>
            {config.heroImage && <img src={config.heroImage} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="" />}
          </div>
        </div>
      )}

      {/* ─── SECTION: PRODUCTS ─── */}
      {activeSection === 'products' && (
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-800">📦 Produk Tampilan Web Store</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-normal text-gray-500">{config.products.filter(p => p.active).length} dari {config.products.length} aktif</span>
              <button onClick={handleSyncProducts} disabled={isSyncing}
                className="px-3 py-1.5 text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all cursor-pointer flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sync...' : 'Sync ke Firestore'}
              </button>
            </div>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {config.products.map((p, idx) => (
              <div key={p.productName} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0">
                  {p.displayImage ? (
                    <img src={p.displayImage} alt={p.productName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Image className="w-5 h-5" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={p.active} onChange={e => updateProduct(idx, { active: e.target.checked })} className="w-3.5 h-3.5 rounded accent-emerald-600" />
                    <span className="text-xs font-bold text-gray-800 truncate">{p.productName}</span>
                    <span className="text-[9px] text-gray-400 font-mono bg-slate-200 px-1.5 py-0.5 rounded">{p.kategori}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {(() => {
                      const cp = (calculatedProducts || []).find(c => c.namaProduk === p.productName);
                      if (cp) return <><span className="text-[9px] text-gray-400">HPP: {formatCurrency(cp.hppPerPorsi)}</span><span className="text-[10px] font-bold text-emerald-700">Jual: {formatCurrency(cp.hargaJualPerPorsi)}</span></>;
                      return <span className="text-[9px] text-gray-400 italic">Harga belum diatur</span>;
                    })()}
                  </div>
                  <div className="flex gap-2 mt-1.5">
                    <input className="flex-1 px-2.5 py-1.5 text-[10px] border border-gray-200 rounded-lg outline-none focus:border-emerald-400"
                      value={p.description} onChange={e => updateProduct(idx, { description: e.target.value })} placeholder="Deskripsi produk..." />
                    <label className="px-2.5 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer shrink-0">
                      <Image className="w-3 h-3 inline mr-1" />Gambar
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleUploadProductImage(idx, e)} />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {config.products.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada produk. Tambahkan produk di tab Formulasi Resep terlebih dahulu.</p>
          )}
        </div>
      )}

      {/* ─── SECTION: THEME ─── */}
      {activeSection === 'theme' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800">🎨 Tema & Warna</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Warna Utama (Primary)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={config.primaryColor} onChange={e => updateConfig({ primaryColor: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                <input className={inputClass} value={config.primaryColor} onChange={e => updateConfig({ primaryColor: e.target.value })} placeholder="#059669" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Warna Aksen (Secondary)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={config.secondaryColor} onChange={e => updateConfig({ secondaryColor: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                <input className={inputClass} value={config.secondaryColor} onChange={e => updateConfig({ secondaryColor: e.target.value })} placeholder="#f59e0b" />
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-2xl text-white" style={{ background: config.primaryColor }}>
            <p className="text-xs font-bold opacity-80">Warna Utama</p>
            <p className="text-lg font-black">{config.primaryColor}</p>
            <div className="mt-2 inline-block px-4 py-1.5 rounded-lg text-xs font-bold" style={{ background: config.secondaryColor }}>
              Tombol Aksen: {config.secondaryColor}
            </div>
          </div>
          <div>
            <label className={labelClass}>Footer Text</label>
            <input className={inputClass} value={config.footerText} onChange={e => updateConfig({ footerText: e.target.value })} placeholder="© 2026 Near Bakery & Co." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Facebook URL</label>
              <input className={inputClass} value={config.facebookUrl} onChange={e => updateConfig({ facebookUrl: e.target.value })} placeholder="https://facebook.com/nearbakery" />
            </div>
            <div>
              <label className={labelClass}>Twitter URL</label>
              <input className={inputClass} value={config.twitterUrl} onChange={e => updateConfig({ twitterUrl: e.target.value })} placeholder="https://twitter.com/nearbakery" />
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION: PROMOS ─── */}
      {activeSection === 'promos' && (
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-800">📢 Promosi</h3>
            <button onClick={handleAddPromo} className="px-3 py-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Tambah Promo
            </button>
          </div>
          {config.promos.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada promo. Klik "Tambah Promo" untuk membuat promo.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {config.promos.map(promo => (
                <div key={promo.id} className={`p-4 rounded-xl border ${promo.active ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'} relative`}>
                  <div className="flex items-start gap-3">
                    {promo.image ? (
                      <img src={promo.image} alt={promo.title} className="w-16 h-16 object-cover rounded-lg" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-gray-400"><Megaphone className="w-5 h-5" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-gray-800">{promo.title}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{promo.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 justify-end">
                    <button onClick={() => setConfig(prev => ({ ...prev, promos: prev.promos.map(p => p.id === promo.id ? { ...p, active: !p.active } : p) }))}
                      className={`px-2 py-1 text-[9px] font-bold rounded-lg cursor-pointer ${promo.active ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                      {promo.active ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button onClick={() => handleEditPromo(promo)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 cursor-pointer"><Edit3 className="w-3 h-3" /></button>
                    <button onClick={() => handleDeletePromo(promo.id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── SECTION: PAYMENT METHODS ─── */}
      {activeSection === 'payment' && (
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-800">💳 Metode Pembayaran</h3>
            <button onClick={handleAddPayment} className="px-3 py-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Tambah Metode
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            Metode pembayaran ini akan tampil di halaman checkout web store. Kelola semuanya dari sini.
          </p>
          {(!config.paymentMethods || config.paymentMethods.length === 0) ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Belum ada metode pembayaran. Klik "Tambah Metode" atau reset ke default.</p>
              <button onClick={() => updateConfig({ paymentMethods: createDefaultPaymentMethods() })}
                className="mt-3 px-4 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">
                Reset ke Default
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {config.paymentMethods.sort((a, b) => a.order - b.order).map(pm => (
                <div key={pm.id} className={`p-4 rounded-xl border ${pm.active ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'} flex items-start gap-3`}>
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0">
                    {pm.type === 'transfer_bank' ? <Banknote className="w-5 h-5 text-blue-600" /> :
                     pm.type === 'ewallet' ? <Wallet className="w-5 h-5 text-green-600" /> :
                     <ShoppingBag className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${pm.active ? 'text-gray-800' : 'text-gray-400'}`}>{pm.name}</span>
                      <span className="text-[9px] text-gray-400 font-mono uppercase">{pm.type.replace('_', ' ')}</span>
                    </div>
                    {pm.type === 'transfer_bank' && pm.bankName && (
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {pm.bankName} — {pm.accountNumber} a.n. {pm.accountName}
                      </p>
                    )}
                    {pm.type === 'ewallet' && pm.phoneNumber && (
                      <p className="text-[10px] text-gray-600 mt-0.5">No. HP: {pm.phoneNumber}</p>
                    )}
                    <p className="text-[9px] text-gray-400 mt-0.5">{pm.label}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setConfig(prev => ({
                      ...prev,
                      paymentMethods: (prev.paymentMethods || []).map(p => p.id === pm.id ? { ...p, active: !p.active } : p)
                    }))}
                      className={`px-2 py-1 text-[9px] font-bold rounded-lg cursor-pointer ${pm.active ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                      {pm.active ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button onClick={() => handleEditPayment(pm)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 cursor-pointer"><Edit3 className="w-3 h-3" /></button>
                    <button onClick={() => handleDeletePayment(pm.id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── SECTION: BRANCH ─── */}
      {activeSection === 'branch' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800">🏛️ Konfigurasi Cabang & Subdomain</h3>
          <p className="text-[10px] text-gray-500">
            Setiap cabang bisa memiliki web store sendiri dengan subdomain berbeda. Atur di sini.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>ID Cabang</label>
              <select className={inputClass} value={config.cabangId || 'pusat'} onChange={e => updateConfig({ cabangId: e.target.value })}>
                <option value="pusat">Pusat</option>
                {(cabangList || []).map(c => (
                  <option key={c.id} value={c.id}>{c.nama} ({c.id})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Subdomain</label>
              <div className="flex items-center gap-2">
                <input className={inputClass} value={config.branchSubdomain} onChange={e => updateConfig({ branchSubdomain: e.target.value })} placeholder="cabang-a" />
                <span className="text-[9px] text-gray-400">.nearbakery.com</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRegisterSubdomain} className="px-4 py-2 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer">
              Daftarkan Subdomain
            </button>
            <button onClick={async () => {
              const subs = await getAllSubdomains();
              if (subs.length === 0) {
                showToast('Belum ada subdomain terdaftar.', 'info');
              } else {
                showToast(`Subdomain: ${subs.map(s => `${s.subdomain} → ${s.cabangNama}`).join(', ')}`, 'info');
              }
            }} className="px-4 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer">
              Lihat Semua Subdomain
            </button>
          </div>
          {cabangList && cabangList.length > 0 && (
            <div className="mt-4">
              <h4 className="text-[10px] font-bold text-gray-600 mb-2">Daftar Cabang Tersedia:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {cabangList.filter(c => c.isActive).map(c => (
                  <div key={c.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-gray-700">{c.nama}</p>
                      <p className="text-[9px] text-gray-400">{c.alamat}</p>
                    </div>
                    <button onClick={() => {
                      updateConfig({ cabangId: c.id, branchSubdomain: c.id.toLowerCase().replace(/[^a-z0-9]/g, '-'), storeName: `Near Bakery - ${c.nama}` });
                      showToast(`Beralih ke cabang: ${c.nama}`, 'success');
                    }} className="ml-auto px-2 py-1 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 cursor-pointer">
                      Pilih
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SECTION: PREVIEW ─── */}
      {activeSection === 'preview' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800">👁️ Preview Web Store</h3>
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
            <div className="max-w-sm mx-auto bg-white min-h-[600px]">
              {/* Header */}
              <div className="p-4 flex items-center gap-3 border-b border-gray-100" style={{ background: config.primaryColor }}>
                {config.logo ? (
                  <img src={config.logo} alt="" className="w-10 h-10 object-contain rounded-lg bg-white p-1" />
                ) : (
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold">{config.storeName.charAt(0)}</div>
                )}
                <div className="text-white">
                  <h3 className="text-sm font-bold">{config.storeName}</h3>
                  <p className="text-[9px] opacity-80">{config.slogan}</p>
                </div>
              </div>
              {/* Hero */}
              <div className="relative h-44 flex items-center justify-center text-center" style={{ background: `linear-gradient(135deg, ${config.primaryColor}dd, ${config.primaryColor}88)` }}>
                {config.heroImage && <img src={config.heroImage} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="" />}
                <div className="relative z-10 p-4">
                  <h2 className="text-xl font-black text-white">{config.heroTitle}</h2>
                  <p className="text-xs text-white/80 mt-1">{config.heroSubtitle}</p>
                  <button className="mt-3 px-5 py-2 text-xs font-bold rounded-xl text-white shadow-lg" style={{ background: config.secondaryColor }}>
                    {config.heroBtnText}
                  </button>
                </div>
              </div>
              {/* Products */}
              <div className="p-4">
                <h3 className="text-xs font-bold text-gray-800 mb-3">Menu Kami</h3>
                <div className="grid grid-cols-2 gap-3">
                  {config.products.filter(p => p.active).slice(0, 4).map(p => (
                    <div key={p.productName} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <div className="w-full h-20 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
                        {p.displayImage ? <img src={p.displayImage} alt={p.productName} className="w-full h-full object-cover" /> : <ShoppingBag className="w-6 h-6 text-slate-300" />}
                      </div>
                      <p className="text-[10px] font-bold text-gray-800 mt-1.5 truncate">{p.productName}</p>
                      {(() => {
                        const cp = (calculatedProducts || []).find(c => c.namaProduk === p.productName);
                        return cp ? <p className="text-[9px] text-emerald-700 font-bold">{formatCurrency(cp.hargaJualPerPorsi)}</p> : null;
                      })()}
                    </div>
                  ))}
                </div>
              </div>
              {/* Payment methods preview */}
              <div className="px-4 pb-4">
                <h3 className="text-[10px] font-bold text-gray-600 mb-2">💳 Metode Pembayaran</h3>
                <div className="space-y-1.5">
                  {(config.paymentMethods || []).filter(p => p.active).slice(0, 3).map(pm => (
                    <div key={pm.id} className="flex items-center gap-2 text-[10px] text-gray-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {pm.type === 'transfer_bank' ? '🏦' : pm.type === 'ewallet' ? '📱' : '💰'}
                      <span>{pm.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Footer */}
              <div className="p-4 text-center text-[9px] text-gray-400 border-t border-gray-100" style={{ background: config.primaryColor + '08' }}>
                <a href={`https://wa.me/${config.contactWhatsApp}`} className="text-emerald-600 font-bold block mb-1">WhatsApp: {config.contactWhatsApp}</a>
                <p>{config.contactEmail} | {config.contactInstagram}</p>
                <p className="mt-2">{config.footerText}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PROMO MODAL ─── */}
      {showPromoModal && editingPromo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-gray-800">{editingPromo.id.startsWith('promo-') ? 'Tambah Promo' : 'Edit Promo'}</h3>
              <button onClick={() => { setShowPromoModal(false); setEditingPromo(null); }} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className={labelClass}>Judul Promo</label>
              <input className={inputClass} value={editingPromo.title} onChange={e => setEditingPromo({ ...editingPromo, title: e.target.value })} placeholder="Diskon 20% Croissant!" />
            </div>
            <div>
              <label className={labelClass}>Deskripsi</label>
              <textarea className={`${inputClass} h-20 resize-none`} value={editingPromo.description} onChange={e => setEditingPromo({ ...editingPromo, description: e.target.value })} placeholder="Nikmati croissant hangat dengan diskon spesial..." />
            </div>
            <div>
              <label className={labelClass}>Gambar Promo</label>
              <div className="flex items-center gap-3">
                {editingPromo.image ? <img src={editingPromo.image} alt="" className="w-16 h-16 object-cover rounded-lg border" /> : <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-gray-400"><Image className="w-5 h-5" /></div>}
                <button onClick={() => promoInputRef.current?.click()} className="px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Upload</button>
                <input ref={promoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPromoImage} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={editingPromo.active} onChange={e => setEditingPromo({ ...editingPromo, active: e.target.checked })} className="w-3.5 h-3.5 rounded accent-emerald-600" />
              <span className="text-xs text-gray-600">Aktif</span>
            </div>
            <button onClick={handleSavePromo} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">Simpan Promo</button>
          </div>
        </div>
      )}

      {/* ─── PAYMENT MODAL ─── */}
      {showPaymentModal && editingPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-gray-800">{editingPayment.id.startsWith('pm-') ? 'Tambah Metode Pembayaran' : 'Edit Metode Pembayaran'}</h3>
              <button onClick={() => { setShowPaymentModal(false); setEditingPayment(null); }} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className={labelClass}>Jenis Pembayaran</label>
              <select className={inputClass} value={editingPayment.type} onChange={e => setEditingPayment({ ...editingPayment, type: e.target.value as any })}>
                <option value="transfer_bank">Transfer Bank</option>
                <option value="ewallet">E-Wallet</option>
                <option value="cod">COD (Cash On Delivery)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Nama Metode</label>
              <input className={inputClass} value={editingPayment.name} onChange={e => setEditingPayment({ ...editingPayment, name: e.target.value })} placeholder="Transfer Bank (BCA)" />
            </div>
            <div>
              <label className={labelClass}>Label / Deskripsi</label>
              <input className={inputClass} value={editingPayment.label} onChange={e => setEditingPayment({ ...editingPayment, label: e.target.value })} placeholder="Transfer Bank BCA (Verifikasi Otomatis)" />
            </div>

            {editingPayment.type === 'transfer_bank' && (
              <>
                <div>
                  <label className={labelClass}>Nama Bank</label>
                  <input className={inputClass} value={editingPayment.bankName || ''} onChange={e => setEditingPayment({ ...editingPayment, bankName: e.target.value })} placeholder="Bank BCA" />
                </div>
                <div>
                  <label className={labelClass}>Nomor Rekening</label>
                  <input className={inputClass} value={editingPayment.accountNumber || ''} onChange={e => setEditingPayment({ ...editingPayment, accountNumber: e.target.value })} placeholder="77359182301" />
                </div>
                <div>
                  <label className={labelClass}>Nama Pemilik Rekening</label>
                  <input className={inputClass} value={editingPayment.accountName || ''} onChange={e => setEditingPayment({ ...editingPayment, accountName: e.target.value })} placeholder="Near Bakery & Co. PT" />
                </div>
              </>
            )}

            {editingPayment.type === 'ewallet' && (
              <div>
                <label className={labelClass}>Nomor HP E-Wallet</label>
                <input className={inputClass} value={editingPayment.phoneNumber || ''} onChange={e => setEditingPayment({ ...editingPayment, phoneNumber: e.target.value })} placeholder="6281234567890" />
              </div>
            )}

            <div>
              <label className={labelClass}>Urutan Tampil</label>
              <input type="number" className={inputClass} value={editingPayment.order} onChange={e => setEditingPayment({ ...editingPayment, order: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={editingPayment.active} onChange={e => setEditingPayment({ ...editingPayment, active: e.target.checked })} className="w-3.5 h-3.5 rounded accent-emerald-600" />
              <span className="text-xs text-gray-600">Aktif</span>
            </div>
            <button onClick={handleSavePayment} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">Simpan Metode Pembayaran</button>
          </div>
        </div>
      )}

      {/* FLOATING SAVE BUTTON */}
      <div className="fixed bottom-6 right-6 z-40 flex gap-2">
        <button onClick={handleSaveToFirestore} disabled={isSavingToFirestore}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2 hover:scale-105">
          <Save className="w-4 h-4" />
          {isSavingToFirestore ? 'Menyimpan...' : 'Simpan ke Cloud'}
        </button>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-24 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2.5 ${
          toast.type === 'success' ? 'bg-emerald-950 text-white border-emerald-800' :
          toast.type === 'error' ? 'bg-red-950 text-white border-red-800' :
          'bg-slate-900 text-white border-slate-700'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
           toast.type === 'error' ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
           <Globe className="w-4 h-4 text-emerald-400" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
