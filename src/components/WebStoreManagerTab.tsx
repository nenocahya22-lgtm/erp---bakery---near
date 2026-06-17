import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WebStoreConfig, WebStoreProduct, WebStorePromo, PaymentMethod, ProductHpp, Cabang, createDefaultWebStoreConfig, createDefaultPaymentMethods, AutoPromoSignal } from '../types';
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
  TrendingUp,
  Sparkles,
  Lightbulb,
  Zap,
} from 'lucide-react';import { saveWebStoreConfig,
  getWebStoreConfig,
  getAllWebStoreConfigs,
  syncProductsToFirestore,
  registerSubdomain,
  getAllSubdomains,
  getAllFirestoreProducts,
  getFirestoreCategories,
  saveCategoriesToFirestore,
  FirestoreProductSummary,
} from '../lib/firestore-bridge';
import { safeGetLocalStorage } from '../lib/safe-json';
import { getSharedCategories, setSharedCategories } from '../lib/category-store';

const STORAGE_KEY = 'storenear_web_config';

interface Props {
  productHpp: ProductHpp[];
  calculatedProducts?: any[];
  bahanBaku?: any[];
  detailResep?: any[];
  cabangList?: Cabang[];
  onImportProduct?: (product: ProductHpp) => void;
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

export default function WebStoreManagerTab({ productHpp, calculatedProducts, bahanBaku, detailResep, cabangList, onImportProduct }: Props) {
  const [config, setConfig] = useState<WebStoreConfig>(() => {
    const saved = safeGetLocalStorage<WebStoreConfig | null>(STORAGE_KEY, null);
    if (saved) {
      // Merge kategori dari shared store (single source of truth)
      const shared = getSharedCategories();
      if (shared.categories.length > 0) {
        saved.categories = shared.categories;
        saved.categoryIcons = shared.categoryIcons;
      }
      return saved;
    }
    return createDefaultWebStoreConfig(productHpp.filter(p => p.status !== 'draft'));
  });

  const [activeSection, setActiveSection] = useState<string>('identity');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [editingPromo, setEditingPromo] = useState<WebStorePromo | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('wheat');
  const [isSavingToFirestore, setIsSavingToFirestore] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);
  const [firestoreProducts, setFirestoreProducts] = useState<FirestoreProductSummary[]>([]);
  const [isFetchingWebProducts, setIsFetchingWebProducts] = useState(false);
  const [firestoreCategories, setFirestoreCategories] = useState<{ categories: string[]; categoryIcons: Record<string, string> } | null>(null);
  const [isFetchingCategories, setIsFetchingCategories] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const promoInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-save to localStorage + sync kategori ke shared store
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, lastUpdated: new Date().toISOString() }));
    // Sync kategori dari config ke shared store agar Formulasi Resep juga update
    if (config.categories && config.categories.length > 0) {
      setSharedCategories({
        categories: config.categories,
        categoryIcons: config.categoryIcons || {},
      });
    }
  }, [config]);

  // Auto-save kategori ke Firestore ketika berubah
  useEffect(() => {
    if (!isFirestoreConnected || !config.categories) return;
    const cabangId = config.cabangId || 'pusat';
    const timer = setTimeout(() => {
      saveCategoriesToFirestore(cabangId, config.categories || [], config.categoryIcons || {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [config.categories, config.categoryIcons, config.cabangId, isFirestoreConnected]);

  // Fetch all products from Firestore (web store) — untuk panel Data Web Store
  const fetchFirestoreProducts = useCallback(async () => {
    setIsFetchingWebProducts(true);
    try {
      const products = await getAllFirestoreProducts();
      setFirestoreProducts(products);
    } catch (e) {
      console.warn('Failed to fetch firestore products:', e);
    } finally {
      setIsFetchingWebProducts(false);
    }
  }, []);

  // Fetch categories dari Firestore — fallback dari webstore_config jika categories collection kosong
  const fetchFirestoreCategories = useCallback(async () => {
    setIsFetchingCategories(true);
    try {
      const cabangId = config.cabangId || 'pusat';
      // Coba baca dari collection categories dulu
      let cats = await getFirestoreCategories(cabangId);
      
      // Fallback: baca kategori dari webstore_config (yang diisi dari Web Store)
      if (!cats || !cats.categories.length) {
        try {
          const wsConfig = await getWebStoreConfig(cabangId);
          if (wsConfig?.categories && wsConfig.categories.length > 0) {
            cats = {
              categories: wsConfig.categories,
              categoryIcons: wsConfig.categoryIcons || {},
            };
          }
        } catch (e) {
          console.warn('Fallback webstore_config categories failed:', e);
        }
      }
      
      setFirestoreCategories(cats);
    } catch (e) {
      console.warn('Failed to fetch firestore categories:', e);
    } finally {
      setIsFetchingCategories(false);
    }
  }, [config.cabangId]);

  // Import categories from Firestore ke local config
  const handleImportCategoriesFromFirestore = useCallback(() => {
    if (!firestoreCategories || !firestoreCategories.categories.length) {
      showToast('Tidak ada kategori di Firestore untuk diimpor.', 'info');
      return;
    }
    // Merge categories — tambah yang belum ada
    const existingCats = new Set(config.categories || []);
    const newCats = firestoreCategories.categories.filter(c => !existingCats.has(c));
    if (newCats.length === 0) {
      showToast('Semua kategori sudah terdaftar di ERP.', 'info');
      return;
    }
    updateConfig({
      categories: [...(config.categories || []), ...newCats],
      categoryIcons: { ...(config.categoryIcons || {}), ...firestoreCategories.categoryIcons },
    });
    showToast(`✅ ${newCats.length} kategori berhasil diimpor dari Firestore!`, 'success');
  }, [firestoreCategories, config.categories, config.categoryIcons]);

  useEffect(() => {
    if (isFirestoreConnected) {
      fetchFirestoreProducts();
      fetchFirestoreCategories();
    }
  }, [isFirestoreConnected, fetchFirestoreProducts, fetchFirestoreCategories]);

  // Auto-import kategori dari Firestore ke local config jika local masih kosong
  useEffect(() => {
    if (firestoreCategories && firestoreCategories.categories.length > 0 && (!config.categories || config.categories.length === 0)) {
      updateConfig({
        categories: firestoreCategories.categories,
        categoryIcons: { ...(config.categoryIcons || {}), ...firestoreCategories.categoryIcons },
      });
    }
  }, [firestoreCategories]);

  // Sync products from productHpp
  useEffect(() => {
    setConfig(prev => {
      const existingNames = new Set(prev.products.map(p => p.productName));
      const newFromHpp = productHpp
        .filter(p => p.status !== 'draft')
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
      const cabangId = config.cabangId || 'pusat';
      const count = await syncProductsToFirestore(calculatedProducts, productHpp.filter(p => p.status !== 'draft'), detailResep, bahanBaku, cabangId);
      setLastSynced(new Date().toLocaleTimeString('id-ID'));
      await fetchFirestoreProducts();
      showToast(`✅ ${count} produk + kategori berhasil disinkronisasi ke Firestore! Web Store akan update.`, 'success');
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

  // ─── AI MARKETING — SKOR & INSIGHT ───
  const marketingScore = useMemo(() => {
    let score = 0;
    // Produk dengan gambar = +20
    const withImages = config.products.filter(p => p.displayImage).length;
    score += Math.min(20, (withImages / Math.max(1, config.products.length)) * 20);
    // Produk dengan deskripsi = +15
    const withDesc = config.products.filter(p => p.description.trim().length > 10).length;
    score += Math.min(15, (withDesc / Math.max(1, config.products.length)) * 15);
    // Kategori terisi = +10
    score += Math.min(10, (config.categories?.length || 0) * 2);
    // Promo aktif = +15
    score += Math.min(15, (config.promos?.filter(p => p.active).length || 0) * 5);
    // Payment methods = +10
    score += Math.min(10, (config.paymentMethods?.filter(p => p.active).length || 0) * 3);
    // Logo terupload = +10
    if (config.logo) score += 10;
    // Hero terisi = +10
    if (config.heroTitle && config.heroTitle.length > 5) score += 10;
    // Slogan terisi = +5
    if (config.slogan) score += 5;
    // Kontak terisi = +5
    if (config.contactWhatsApp) score += 5;
    return Math.min(100, score);
  }, [config]);

  const aiInsights = useMemo(() => {
    const insights: { icon: string; text: string; action?: string; severity: 'info' | 'warning' | 'success' }[] = [];
    
    // 1. Produk tanpa gambar
    const noImage = config.products.filter(p => !p.displayImage && p.active);
    if (noImage.length > 0) {
      insights.push({ icon: '📸', text: `${noImage.length} produk aktif belum punya gambar. Web Store tampil kurang menarik.`, action: 'Upload Gambar', severity: 'warning' });
    }
    // 2. Produk tanpa deskripsi
    const noDesc = config.products.filter(p => p.description.trim().length < 10 && p.active);
    if (noDesc.length > 0) {
      insights.push({ icon: '📝', text: `${noDesc.length} produk belum punya deskripsi. Tambahkan minimal 10 karakter.`, action: 'Tambah Deskripsi', severity: 'info' });
    }
    // 3. Skor marketing rendah
    if (marketingScore < 50) {
      insights.push({ icon: '📊', text: `Skor Marketing ${marketingScore}/100 — masih banyak yang bisa dioptimalkan.`, severity: 'warning' });
    } else if (marketingScore >= 80) {
      insights.push({ icon: '🏆', text: `Skor Marketing ${marketingScore}/100 — Web Store Anda siap bersaing!`, severity: 'success' });
    }
    // 4. Auto-promo signals dari FEFO
    try {
      const signals = safeGetLocalStorage<AutoPromoSignal[]>('fefo_auto_promo_signals', []);
      const pendingSignals = signals.filter(s => s.status === 'pending');
      if (pendingSignals.length > 0) {
        insights.push({ icon: '🏷️', text: `${pendingSignals.length} sinyal promo dari FEFO menunggu aktivasi. Batch hampir expired!`, action: 'Aktifkan Promo', severity: 'warning' });
      }
    } catch (e) { /* silent */ }
    
    return insights;
  }, [config, marketingScore]);

  // ─── UI HELPERS ───
  const sidebarBtn = (key: string, icon: React.ReactNode, label: string) => (
    <button onClick={() => setActiveSection(key)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
        activeSection === key ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}>
      <span className={`w-5 h-5 shrink-0 flex items-center justify-center ${activeSection === key ? 'text-white' : 'text-emerald-500'}`}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  const inputClass = "w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all bg-white";
  const labelClass = "text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block";
  const cardClass = "bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4";

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* ─── DASHBOARD STATUS HEADER ─── */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">🌐 Web Store Manager</h2>
              <p className="text-xs text-gray-500">Atur web store per cabang — konten, produk, promo, tema, & pembayaran</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleSaveToFirestore} disabled={isSavingToFirestore}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm hover:scale-105">
              <Zap className="w-4 h-4" />
              {isSavingToFirestore ? 'Menyimpan...' : '🚀 PUBLISH PERUBAHAN'}
            </button>
            <button onClick={() => setShowPreview(true)}
              className="px-3 py-2 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl transition-all cursor-pointer flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <a href={config.branchSubdomain && config.branchSubdomain !== 'pusat'
              ? `https://${config.branchSubdomain}.near-bakery-store.web.app`
              : 'https://near-bakery-store.web.app'}
              target="_blank" rel="noreferrer"
              className="px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> 🌐 Lihat Toko
            </a>
          </div>
        </div>
        
        {/* Status Metrics */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className={`p-3 rounded-xl border flex items-center gap-2 ${isFirestoreConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isFirestoreConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <div>
              <span className="text-[10px] font-bold block">{isFirestoreConnected ? '🟢 Online' : '🔴 Local Only'}</span>
              <span className="text-[8px] text-gray-400">Status Web</span>
            </div>
          </div>
          <div className="p-3 rounded-xl border bg-blue-50 border-blue-200 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <div>
              <span className="text-[10px] font-bold block">{lastSynced || 'Belum sync'}</span>
              <span className="text-[8px] text-gray-400">Sync Terakhir</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl border flex items-center gap-2 ${marketingScore >= 80 ? 'bg-emerald-50 border-emerald-200' : marketingScore >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <TrendingUp className={`w-3.5 h-3.5 ${marketingScore >= 80 ? 'text-emerald-600' : marketingScore >= 50 ? 'text-amber-600' : 'text-red-600'}`} />
            <div>
              <span className="text-[10px] font-bold block">{marketingScore}/100</span>
              <span className="text-[8px] text-gray-400">Skor Marketing</span>
            </div>
          </div>
          <div className="p-3 rounded-xl border bg-purple-50 border-purple-200 flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
            <div>
              <span className="text-[10px] font-bold block">{config.products.filter(p => p.active).length}/{config.products.length}</span>
              <span className="text-[8px] text-gray-400">Produk Aktif</span>
            </div>
          </div>
          <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            <div>
              <span className="text-[10px] font-bold block">{config.cabangId || 'pusat'}</span>
              <span className="text-[8px] text-gray-400">Cabang</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN LAYOUT: SIDEBAR + CONTENT ─── */}
      <div className="flex gap-5 min-h-[600px]">
        {/* SIDEBAR NAVIGASI */}
        <aside className="w-56 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-xs p-3 space-y-1 overflow-y-auto max-h-[750px]">
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2 mt-1">🎨 Identitas</div>
          {sidebarBtn('identity', <ShoppingBag className="w-4 h-4" />, 'Umum & Identitas')}
          {sidebarBtn('hero', <Image className="w-4 h-4" />, 'Hero Banner')}
          {sidebarBtn('theme', <Palette className="w-4 h-4" />, 'Desain & Tema')}
          {sidebarBtn('circles', <Palette className="w-4 h-4" />, 'Badge & Circle')}
          
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2 mt-4">📦 Konten</div>
          {sidebarBtn('categories', <FileJson className="w-4 h-4" />, 'Kategori')}
          {sidebarBtn('products', <ShoppingBag className="w-4 h-4" />, 'Katalog Produk')}
          {sidebarBtn('promos', <Megaphone className="w-4 h-4" />, 'Promo & Banner')}
          {sidebarBtn('texts', <FileJson className="w-4 h-4" />, 'Teks & Label')}
          {sidebarBtn('footer', <Globe className="w-4 h-4" />, 'Footer')}
          
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2 mt-4">💳 Bisnis</div>
          {sidebarBtn('payment', <CreditCard className="w-4 h-4" />, 'Pembayaran')}
          {sidebarBtn('branch', <Building2 className="w-4 h-4" />, 'Cabang')}
          {sidebarBtn('webdata', <RefreshCw className="w-4 h-4" />, 'Data Web Store')}
          
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2 mt-4">🤖 AI</div>
          {sidebarBtn('marketing', <Sparkles className="w-4 h-4" />, 'AI Marketing Center')}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 space-y-6">

      {/* ─── SECTION: IDENTITY & NAVBAR ─── */}
      {activeSection === 'identity' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800">🏪 Identitas Toko & Navbar</h3>
          <p className="text-[10px] text-gray-500">Semua field ini mengatur teks yang muncul di Navbar Web Store.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nama Brand (Navbar)</label>
              <input className={inputClass} value={config.navbarBrandText} onChange={e => updateConfig({ navbarBrandText: e.target.value })} placeholder="NEAR BAKERY & CO." />
            </div>
            <div>
              <label className={labelClass}>Nama Toko</label>
              <input className={inputClass} value={config.storeName} onChange={e => updateConfig({ storeName: e.target.value })} placeholder="Near Bakery & Co." />
            </div>
            <div>
              <label className={labelClass}>Slogan (Hero Gold Text)</label>
              <input className={inputClass} value={config.slogan} onChange={e => updateConfig({ slogan: e.target.value })} placeholder="Artisan Bakery Premium" />
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
              <label className={labelClass}>Search Placeholder</label>
              <input className={inputClass} value={config.searchPlaceholder} onChange={e => updateConfig({ searchPlaceholder: e.target.value })} placeholder="Cari menu artisan..." />
            </div>
            <div>
              <label className={labelClass}>Teks "Temukan Toko"</label>
              <input className={inputClass} value={config.storeLocatorText} onChange={e => updateConfig({ storeLocatorText: e.target.value })} placeholder="Temukan Toko" />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Kontak (tampil di Footer)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>WhatsApp</label>
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
              <div>
                <label className={labelClass}>Alamat</label>
                <input className={inputClass} value={config.alamat} onChange={e => updateConfig({ alamat: e.target.value })} placeholder="Jl. Contoh No. 123, Kota" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION: HERO BANNER ─── */}
      {activeSection === 'hero' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800">🖼️ Hero Banner</h3>
          <p className="text-[10px] text-gray-500">Sesuaikan banner utama Web Store — teks gold, judul, deskripsi, badge, dan tombol.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Teks Gold (Tagline)</label>
              <input className={inputClass} value={config.heroTagline} onChange={e => updateConfig({ heroTagline: e.target.value })} placeholder="Artisan Bakery Premium" />
            </div>
            <div>
              <label className={labelClass}>Judul Utama</label>
              <input className={inputClass} value={config.heroTitle} onChange={e => updateConfig({ heroTitle: e.target.value })} placeholder="Roti & Pastry Hangat..." />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Deskripsi</label>
              <textarea className={`${inputClass} h-16 resize-none`} value={config.heroDescription} onChange={e => updateConfig({ heroDescription: e.target.value })} placeholder="Nikmati keaslian cita rasa Sourdough alami..." />
            </div>
            <div>
              <label className={labelClass}>Teks Tombol CTA</label>
              <input className={inputClass} value={config.heroBtnText} onChange={e => updateConfig({ heroBtnText: e.target.value })} placeholder="Daftar & Pesan Sekarang" />
            </div>
            <div>
              <label className={labelClass}>Background Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={config.heroBgColor} onChange={e => updateConfig({ heroBgColor: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                <input className={inputClass} value={config.heroBgColor} onChange={e => updateConfig({ heroBgColor: e.target.value })} placeholder="#1E3932" />
              </div>
            </div>
          </div>
          
          {/* Badge Premium */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Badge Premium (lingkaran di hero)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Baris 1</label>
                <input className={inputClass} value={config.heroBadgeText1} onChange={e => updateConfig({ heroBadgeText1: e.target.value })} placeholder="100% ALAMI" />
              </div>
              <div>
                <label className={labelClass}>Baris 2</label>
                <input className={inputClass} value={config.heroBadgeText2} onChange={e => updateConfig({ heroBadgeText2: e.target.value })} placeholder="Ragi Alami" />
              </div>
              <div>
                <label className={labelClass}>Baris 3</label>
                <input className={inputClass} value={config.heroBadgeText3} onChange={e => updateConfig({ heroBadgeText3: e.target.value })} placeholder="TANPA PENGAWET" />
              </div>
            </div>
          </div>

          {/* Mini Preview */}
          <div className="mt-4 p-6 rounded-2xl text-white relative overflow-hidden" style={{background: config.heroBgColor || '#1E3932'}}>
            <div className="relative z-10 space-y-2">
              <span className="text-[#cba258] font-semibold text-xs tracking-widest uppercase">{config.heroTagline || 'Artisan Bakery Premium'}</span>
              <h4 className="text-2xl font-black">{config.heroTitle || 'Roti & Pastry Hangat'}</h4>
              <p className="text-sm text-white/70 max-w-md">{config.heroDescription || 'Nikmati keaslian cita rasa...'}</p>
              <button className="mt-1 px-5 py-2 bg-white hover:bg-gray-100 text-emerald-800 text-xs font-bold rounded-full transition-all">
                {config.heroBtnText || 'Daftar & Pesan Sekarang'}
              </button>
            </div>
            {/* Badge lingkaran di pojok */}
            <div className="absolute bottom-4 right-4 flex gap-2 z-10">
              {[config.heroBadgeText1 || '100% ALAMI', config.heroBadgeText2 || 'Ragi Alami', config.heroBadgeText3 || 'TANPA PENGAWET'].map((text, i) => (
                <div key={i}
                  className={`rounded-full flex items-center justify-center text-center leading-tight font-bold shadow-lg ${
                    (config.badgeCircleSize || 'md') === 'sm' ? 'w-12 h-12 text-[7px]' :
                    (config.badgeCircleSize || 'md') === 'lg' ? 'w-20 h-20 text-[9px]' :
                    'w-16 h-16 text-[8px]'
                  }`}
                  style={{
                    backgroundColor: config.badgeCircleBgColor || '#1E3932',
                    color: config.badgeCircleTextColor || '#cba258',
                    border: `${config.badgeCircleBorderWidth ?? 2}px solid ${config.badgeCircleBorderColor || '#cba258'}`,
                  }}
                >
                  {text.split(' ').map((word, wi) => (
                    <span key={wi} className="block leading-tight">{word}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION: CATEGORIES ─── */}
      {activeSection === 'categories' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800">📂 Kelola Kategori</h3>
          <p className="text-[10px] text-gray-500">
            Tambah, edit, dan hapus kategori produk Web Store. Kategori ini akan muncul di slider Web Store.
            Setiap kategori bisa diberi icon (wheat, croissant, cake, cookie, coffee, atau lainnya).
          </p>
          
          {/* Daftar kategori existing */}
          <div className="space-y-2">
            {(config.categories || []).map((cat, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <span className="text-lg">
                    {(config.categoryIcons || {})[cat] === 'wheat' ? '🌾' :
                     (config.categoryIcons || {})[cat] === 'croissant' ? '🥐' :
                     (config.categoryIcons || {})[cat] === 'cake' ? '🎂' :
                     (config.categoryIcons || {})[cat] === 'cookie' ? '🍪' :
                     (config.categoryIcons || {})[cat] === 'coffee' ? '☕' : '📦'}
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-800 flex-1">{cat}</span>
                <button
                  onClick={() => {
                    const newCats = (config.categories || []).filter((_, i) => i !== idx);
                    const newIcons = { ...(config.categoryIcons || {}) };
                    delete newIcons[cat];
                    updateConfig({ categories: newCats, categoryIcons: newIcons });
                    // Hapus juga dari shared store agar Formulasi Resep ikut update
                    const shared = getSharedCategories();
                    setSharedCategories({
                      categories: newCats,
                      categoryIcons: newIcons,
                    });
                  }}
                  className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          {(!config.categories || config.categories.length === 0) && (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada kategori. Tambah kategori di bawah.</p>
          )}

          {/* Form tambah kategori — controlled component */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Tambah Kategori Baru</h4>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className={labelClass}>Nama Kategori</label>
                <input
                  className={inputClass}
                  placeholder="Roti & Sourdough"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const name = newCategoryName.trim();
                      if (name && !(config.categories || []).includes(name)) {
                        updateConfig({ 
                          categories: [...(config.categories || []), name],
                          categoryIcons: { ...(config.categoryIcons || {}), [name]: newCategoryIcon }
                        });
                        setNewCategoryName('');
                      }
                    }
                  }}
                />
              </div>
              <select
                className={`${inputClass} w-32`}
                value={newCategoryIcon}
                onChange={e => setNewCategoryIcon(e.target.value)}
              >
                <option value="wheat">🌾 Roti</option>
                <option value="croissant">🥐 Croissant</option>
                <option value="cake">🎂 Kue</option>
                <option value="cookie">🍪 Cookies</option>
                <option value="coffee">☕ Kopi</option>
                <option value="package">📦 Lainnya</option>
              </select>
              <button
                onClick={() => {
                  const name = newCategoryName.trim();
                  if (name && !(config.categories || []).includes(name)) {
                    const newCats = [...(config.categories || []), name];
                    const newIcons = { ...(config.categoryIcons || {}), [name]: newCategoryIcon };
                    updateConfig({ 
                      categories: newCats,
                      categoryIcons: newIcons
                    });
                    // Juga daftarkan ke shared store agar Formulasi Resep ikut update
                    setSharedCategories({ categories: newCats, categoryIcons: newIcons });
                    setNewCategoryName('');
                  }
                }}
                className="px-3 py-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Tambah
              </button>
            </div>
          </div>

          {/* Reset ke default */}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <button
              onClick={() => {
                const defaults = {
                  categories: ['Roti & Sourdough', 'Viennoiserie & Croissant', 'Kue & Tart', 'Kue Kering & Cookies', 'Minuman Kopi & Teh'],
                  categoryIcons: {
                    'Roti & Sourdough': 'wheat',
                    'Viennoiserie & Croissant': 'croissant',
                    'Kue & Tart': 'cake',
                    'Kue Kering & Cookies': 'cookie',
                    'Minuman Kopi & Teh': 'coffee'
                  }
                };
                updateConfig(defaults);
                // Sync ke shared store agar Formulasi Resep juga ikut reset
                setSharedCategories(defaults);
              }}
              className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
            >
              Reset ke Default
            </button>
          </div>
        </div>
      )}

      {/* ─── SECTION: BADGE & CIRCLE STYLING ─── */}
      {activeSection === 'circles' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-600" />
            🔄 Badge & Circle Styling
          </h3>
          <p className="text-[10px] text-gray-500">
            Atur tampilan <strong>badge premium lingkaran</strong> di hero dan <strong>icon kategori</strong> Web Store.
            Semua perubahan langsung terlihat di preview.
          </p>

          {/* ─── BADGE PREMIUM ─── */}
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-sm">🏅</span>
              <div>
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Badge Premium (Lingkaran Hero)</h4>
                <p className="text-[9px] text-amber-700">3 lingkaran di hero: "100% ALAMI", "Ragi Alami", "TANPA PENGAWET"</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Warna Latar Badge</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.badgeCircleBgColor || '#1E3932'}
                    onChange={e => updateConfig({ badgeCircleBgColor: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                  <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                    value={config.badgeCircleBgColor || '#1E3932'}
                    onChange={e => updateConfig({ badgeCircleBgColor: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Warna Teks Badge</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.badgeCircleTextColor || '#cba258'}
                    onChange={e => updateConfig({ badgeCircleTextColor: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                  <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                    value={config.badgeCircleTextColor || '#cba258'}
                    onChange={e => updateConfig({ badgeCircleTextColor: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Warna Border Badge</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.badgeCircleBorderColor || '#cba258'}
                    onChange={e => updateConfig({ badgeCircleBorderColor: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                  <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                    value={config.badgeCircleBorderColor || '#cba258'}
                    onChange={e => updateConfig({ badgeCircleBorderColor: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Ketebalan Border</label>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <button key={n}
                      onClick={() => updateConfig({ badgeCircleBorderWidth: n })}
                      className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        (config.badgeCircleBorderWidth ?? 2) === n
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'bg-white border border-gray-200 text-gray-500 hover:bg-amber-50'
                      }`}
                    >
                      {n}px
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Ukuran Badge</label>
              <div className="flex items-center gap-2">
                {[
                  { value: 'sm', label: 'Kecil', desc: '60px' },
                  { value: 'md', label: 'Sedang', desc: '80px' },
                  { value: 'lg', label: 'Besar', desc: '100px' },
                ].map(s => (
                  <button key={s.value}
                    onClick={() => updateConfig({ badgeCircleSize: s.value as any })}
                    className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      (config.badgeCircleSize || 'md') === s.value
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-amber-50'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg mb-1">{s.value === 'sm' ? '●' : s.value === 'md' ? '⬤' : '🟤'}</div>
                      <div>{s.label}</div>
                      <div className="text-[9px] opacity-70">{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ─── PREVIEW BADGE ─── */}
            <div className="mt-3 p-4 rounded-xl bg-slate-900 flex items-center justify-center gap-4">
              {[config.heroBadgeText1 || '100% ALAMI', config.heroBadgeText2 || 'Ragi Alami', config.heroBadgeText3 || 'TANPA PENGAWET'].map((text, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`rounded-full flex items-center justify-center text-center leading-tight font-bold shadow-lg ${
                      (config.badgeCircleSize || 'md') === 'sm' ? 'w-14 h-14 text-[8px]' :
                      (config.badgeCircleSize || 'md') === 'lg' ? 'w-24 h-24 text-[10px]' :
                      'w-20 h-20 text-[9px]'
                    }`}
                    style={{
                      backgroundColor: config.badgeCircleBgColor || '#1E3932',
                      color: config.badgeCircleTextColor || '#cba258',
                      border: `${config.badgeCircleBorderWidth ?? 2}px solid ${config.badgeCircleBorderColor || '#cba258'}`,
                    }}
                  >
                    {text.split(' ').map((word, wi) => (
                      <span key={wi} className="block leading-tight">{word}</span>
                    ))}
                  </div>
                  <span className="text-[8px] text-gray-400">#{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── KATEGORI CIRCLE ─── */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-sm">🎯</span>
              <div>
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Kategori Circle (Icon Bulat)</h4>
                <p className="text-[9px] text-emerald-700">Icon kategori berbentuk lingkaran — muncul di slider Web Store</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Warna Latar Circle</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.categoryCircleBgColor || '#f0ebe3'}
                    onChange={e => updateConfig({ categoryCircleBgColor: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                  <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                    value={config.categoryCircleBgColor || '#f0ebe3'}
                    onChange={e => updateConfig({ categoryCircleBgColor: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Warna Icon / Emoji</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.categoryCircleTextColor || '#006241'}
                    onChange={e => updateConfig({ categoryCircleTextColor: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                  <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                    value={config.categoryCircleTextColor || '#006241'}
                    onChange={e => updateConfig({ categoryCircleTextColor: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Warna Border Circle</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.categoryCircleBorderColor || '#d4c9b8'}
                    onChange={e => updateConfig({ categoryCircleBorderColor: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                  <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                    value={config.categoryCircleBorderColor || '#d4c9b8'}
                    onChange={e => updateConfig({ categoryCircleBorderColor: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Ukuran Circle</label>
                <div className="flex items-center gap-2">
                  {[
                    { value: 'sm', label: 'Kecil', icon: '●' },
                    { value: 'md', label: 'Sedang', icon: '⬤' },
                    { value: 'lg', label: 'Besar', icon: '🟤' },
                  ].map(s => (
                    <button key={s.value}
                      onClick={() => updateConfig({ categoryCircleSize: s.value as any })}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        (config.categoryCircleSize || 'md') === s.value
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-emerald-50'
                      }`}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Jarak Antar Circle</label>
                <div className="flex items-center gap-2">
                  {[
                    { value: 'tight', label: 'Rapat', emoji: '◼◼◼' },
                    { value: 'normal', label: 'Normal', emoji: '◼ ◼ ◼' },
                    { value: 'loose', label: 'Renggang', emoji: '◼  ◼  ◼' },
                  ].map(g => (
                    <button key={g.value}
                      onClick={() => updateConfig({ categoryCircleGap: g.value as any })}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        (config.categoryCircleGap || 'normal') === g.value
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-emerald-50'
                      }`}
                    >
                      <span className="tracking-[0.1em]">{g.emoji}</span>
                      <span className="block text-[9px]">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── PREVIEW KATEGORI CIRCLE ─── */}
            <div className="mt-3 p-4 rounded-xl bg-[#f2f0eb] flex items-center justify-center" style={{background: config.colorCanvasWarm || '#f2f0eb'}}>
              <div className={`flex items-center ${
                (config.categoryCircleGap || 'normal') === 'tight' ? 'gap-2' :
                (config.categoryCircleGap || 'normal') === 'loose' ? 'gap-6' :
                'gap-4'
              }`}>
                {(config.categories || []).length === 0 ? (
                  <span className="text-[10px] text-gray-400">Belum ada kategori. Tambah di tab 📂 Kategori.</span>
                ) : (
                  (config.categories || []).slice(0, 5).map((cat, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      <div
                        className={`rounded-full flex items-center justify-center text-lg font-bold shadow-sm border ${
                          (config.categoryCircleSize || 'md') === 'sm' ? 'w-12 h-12 text-base' :
                          (config.categoryCircleSize || 'md') === 'lg' ? 'w-20 h-20 text-2xl' :
                          'w-16 h-16 text-xl'
                        }`}
                        style={{
                          backgroundColor: config.categoryCircleBgColor || '#f0ebe3',
                          color: config.categoryCircleTextColor || '#006241',
                          borderColor: config.categoryCircleBorderColor || '#d4c9b8',
                        }}
                      >
                        {(config.categoryIcons || {})[cat] === 'wheat' ? '🌾' :
                         (config.categoryIcons || {})[cat] === 'croissant' ? '🥐' :
                         (config.categoryIcons || {})[cat] === 'cake' ? '🎂' :
                         (config.categoryIcons || {})[cat] === 'cookie' ? '🍪' :
                         (config.categoryIcons || {})[cat] === 'coffee' ? '☕' : '📦'}
                      </div>
                      <span className="text-[9px] font-bold text-gray-600 text-center max-w-[70px] truncate">{cat.split(' ')[0]}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tombol Reset ke Default */}
          <div className="border-t border-gray-100 pt-3 flex gap-3">
            <button
              onClick={() => updateConfig({
                badgeCircleBgColor: '#1E3932',
                badgeCircleTextColor: '#cba258',
                badgeCircleBorderColor: '#cba258',
                badgeCircleBorderWidth: 2,
                badgeCircleSize: 'md',
                categoryCircleBgColor: '#f0ebe3',
                categoryCircleTextColor: '#006241',
                categoryCircleBorderColor: '#d4c9b8',
                categoryCircleSize: 'md',
                categoryCircleGap: 'normal',
              })}
              className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
            >
              Reset ke Default
            </button>
          </div>
        </div>
      )}

      {/* ─── SECTION: PRODUCTS ─── */}
      {activeSection === 'products' && (
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-800">📦 Produk & Teks Grid</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-normal text-gray-500">{config.products.filter(p => p.active).length} dari {config.products.length} aktif</span>
              <button onClick={handleSyncProducts} disabled={isSyncing}
                className="px-3 py-1.5 text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all cursor-pointer flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sync...' : 'Sync ke Firestore'}
              </button>
            </div>
          </div>
          
          {/* Product Grid Text Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
            <div>
              <label className={labelClass}>Judul Grid Produk</label>
              <input className={inputClass} value={config.productGridTitle} onChange={e => updateConfig({ productGridTitle: e.target.value })} placeholder="Pilihan Hari Ini" />
            </div>
            <div>
              <label className={labelClass}>Empty State Title (Admin)</label>
              <input className={inputClass} value={config.emptyStateTitle} onChange={e => updateConfig({ emptyStateTitle: e.target.value })} placeholder="Belum Ada Menu Tersedia" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Empty State Description</label>
              <textarea className={`${inputClass} h-16 resize-none`} value={config.emptyStateDescription} onChange={e => updateConfig({ emptyStateDescription: e.target.value })} placeholder="Database Anda saat ini kosong..." />
            </div>
          </div>

          {/* Made-to-Order Mode */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-amber-900">🛵 Mode Made-to-Order</h4>
                <p className="text-[10px] text-amber-700">Sembunyikan stok, tampilkan sebagai katalog pre-order</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.madeToOrder} onChange={e => updateConfig({ madeToOrder: e.target.checked })} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
            {config.madeToOrder && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-amber-800 block mb-0.5">Label Pre-Order</label>
                  <input className="text-xs p-2 border border-amber-300 rounded-lg w-full bg-white" value={config.preOrderLabel} onChange={e => updateConfig({ preOrderLabel: e.target.value })} placeholder="Pre-Order — Produksi Setiap Hari" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-amber-800 block mb-0.5">Badge Produk</label>
                  <input className="text-xs p-2 border border-amber-300 rounded-lg w-full bg-white" value={config.preOrderBadge} onChange={e => updateConfig({ preOrderBadge: e.target.value })} placeholder="MADE-TO-ORDER" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {config.products.map((p, idx) => (
              <div key={p.productName} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0 mt-1">
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
                  {/* ─── VARIAN CHIPS ─── */}
                  {p.variants && p.variants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {p.variants.map(v => (
                        <div key={v.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          v.active !== false
                            ? 'bg-purple-50 border-purple-200 text-purple-700'
                            : 'bg-gray-100 border-gray-200 text-gray-400'
                        }`}>
                          <span>{v.name}</span>
                          <span className="font-mono">{formatCurrency(v.price || 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-1.5">
                    <input className="flex-1 px-2.5 py-1.5 text-[10px] border border-gray-200 rounded-lg outline-none focus:border-emerald-400"
                      value={p.description} onChange={e => updateProduct(idx, { description: e.target.value })} placeholder="Deskripsi produk..." />
                    <input type="number" min="0" max="100"
                      className="w-16 px-2 py-1.5 text-[10px] font-bold border border-amber-200 rounded-lg outline-none focus:border-amber-400 bg-amber-50 text-amber-800"
                      value={p.discountPercent || 0}
                      onChange={e => updateProduct(idx, { discountPercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                      placeholder="0%" title="Diskon %" />
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
          <p className="text-[10px] text-gray-500">Sesuaikan warna Web Store — cocokkan dengan warna brand Near Bakery & Co.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className={labelClass}>Brand Green (Nav, Tombol)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={config.colorBrandGreen} onChange={e => updateConfig({ colorBrandGreen: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                <input className={inputClass} value={config.colorBrandGreen} onChange={e => updateConfig({ colorBrandGreen: e.target.value })} placeholder="#006241" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Green Accent (Tombol)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={config.colorGreenAccent} onChange={e => updateConfig({ colorGreenAccent: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                <input className={inputClass} value={config.colorGreenAccent} onChange={e => updateConfig({ colorGreenAccent: e.target.value })} placeholder="#00754A" />
              </div>
            </div>
            <div>
              <label className={labelClass}>House Green (Hero BG)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={config.colorHouseGreen} onChange={e => updateConfig({ colorHouseGreen: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                <input className={inputClass} value={config.colorHouseGreen} onChange={e => updateConfig({ colorHouseGreen: e.target.value })} placeholder="#1E3932" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Gold (Aksen Emas)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={config.colorGold} onChange={e => updateConfig({ colorGold: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                <input className={inputClass} value={config.colorGold} onChange={e => updateConfig({ colorGold: e.target.value })} placeholder="#cba258" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Canvas Warm (BG Halaman)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={config.colorCanvasWarm} onChange={e => updateConfig({ colorCanvasWarm: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                <input className={inputClass} value={config.colorCanvasWarm} onChange={e => updateConfig({ colorCanvasWarm: e.target.value })} placeholder="#f2f0eb" />
              </div>
            </div>
          </div>
          {/* Swatch Preview */}
          <div className="mt-4 p-4 rounded-2xl flex items-center gap-4" style={{background: config.colorCanvasWarm || '#f2f0eb'}}>
            <div className="w-12 h-12 rounded-xl" style={{background: config.colorBrandGreen || '#006241'}} />
            <div className="w-12 h-12 rounded-xl" style={{background: config.colorGreenAccent || '#00754A'}} />
            <div className="w-12 h-12 rounded-xl" style={{background: config.colorHouseGreen || '#1E3932'}} />
            <div className="w-12 h-12 rounded-xl" style={{background: config.colorGold || '#cba258'}} />
            <div className="w-12 h-12 rounded-xl border border-gray-200" style={{background: config.colorCanvasWarm || '#f2f0eb'}} />
            <span className="text-xs text-gray-500 ml-2">Brand Green · Green Accent · House Green · Gold · Canvas Warm</span>
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

      {/* ─── SECTION: TEXTS ─── */}
      {activeSection === 'texts' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800">📝 Teks & Label Web Store</h3>
          <p className="text-[10px] text-gray-500">Sesuaikan semua teks yang muncul di halaman Web Store.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Judul Grid Produk</label>
              <input className={inputClass} value={config.productGridTitle} onChange={e => updateConfig({ productGridTitle: e.target.value })} placeholder="Pilihan Hari Ini" />
            </div>
            <div>
              <label className={labelClass}>Banyak Produk Label</label>
              <div className="px-3 py-2 text-xs text-gray-500 bg-slate-50 rounded-xl border border-gray-200">
                <strong>{config.products.filter(p => p.active).length}</strong> Sajian <span className="text-[9px] text-gray-400">(otomatis)</span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Empty State Title</label>
              <input className={inputClass} value={config.emptyStateTitle} onChange={e => updateConfig({ emptyStateTitle: e.target.value })} placeholder="Belum Ada Menu Tersedia" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Empty State Description</label>
              <textarea className={`${inputClass} h-16 resize-none`} value={config.emptyStateDescription} onChange={e => updateConfig({ emptyStateDescription: e.target.value })} placeholder="Database Anda saat ini kosong..." />
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION: FOOTER ─── */}
      {activeSection === 'footer' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800">📋 Footer Web Store</h3>
          <p className="text-[10px] text-gray-500">Atur teks footer, copyright, dan tautan.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Copyright Text</label>
              <input className={inputClass} value={config.footerCopyright} onChange={e => updateConfig({ footerCopyright: e.target.value })} placeholder="© 2026 Near Bakery & Co." />
            </div>
            <div>
              <label className={labelClass}>Footer Links (dipisah koma)</label>
              <input className={inputClass} value={Array.isArray(config.footerLinks) ? config.footerLinks.join(', ') : ''} onChange={e => updateConfig({ footerLinks: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Menu, Rewards, Gift Cards" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Checkout Footer Text</label>
              <input className={inputClass} value={config.checkoutFooterText} onChange={e => updateConfig({ checkoutFooterText: e.target.value })} placeholder="Near Bakery & Co. — Kualitas Terjamin" />
            </div>
          </div>
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

      {/* ─── SECTION: DATA WEB STORE ─── */}
      {activeSection === 'webdata' && (
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                📡 Data Web Store (Firestore)
              </h3>
              <p className="text-[10px] text-gray-500 mt-1">
                Semua produk & kategori yang ada di Firestore — baik dari ERP maupun dari Web Store. 
                Dari sini Anda bisa melihat dan mengimpor produk/kategori yang belum terdaftar di ERP.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { fetchFirestoreProducts(); fetchFirestoreCategories(); }} disabled={isFetchingWebProducts || isFetchingCategories}
                className="px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingWebProducts || isFetchingCategories ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {isFetchingWebProducts ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Memuat data dari Firestore...</p>
            </div>
          ) : firestoreProducts.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-xs text-gray-400">Belum ada produk di Firestore. Sync produk dari ERP terlebih dahulu.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {firestoreProducts.map((fp) => {
                const existsInErp = productHpp.some(
                  p => p.namaProduk.toLowerCase().trim() === fp.name.toLowerCase().trim()
                );
                return (
                  <div key={fp.docId} className={`flex items-center gap-3 p-3 rounded-xl border ${
                    existsInErp ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      existsInErp ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {fp.imageUrl ? (
                        <img src={fp.imageUrl} alt={fp.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800 truncate">{fp.name}</span>
                        <span className="text-[9px] text-gray-400 font-mono bg-slate-200 px-1.5 py-0.5 rounded">{fp.category}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] font-bold text-emerald-700">
                          Rp {fp.price.toLocaleString('id-ID')}
                        </span>
                        {fp.hpp && fp.hpp > 0 && (
                          <span className="text-[9px] text-gray-400">HPP: Rp {fp.hpp.toLocaleString('id-ID')}</span>
                        )}
                        {fp.discountPercent && fp.discountPercent > 0 && (
                          <span className="text-[9px] text-amber-600 font-bold">-{fp.discountPercent}%</span>
                        )}

                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {existsInErp ? (
                        <span className="px-2 py-1 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded-lg">
                          ✅ Di ERP
                        </span>
                      ) : (
                        <>
                          <span className="px-2 py-1 text-[9px] font-bold bg-amber-100 text-amber-800 rounded-lg">
                            🟡 Web Store Only
                          </span>
                          <button
                            onClick={() => {
                              if (onImportProduct) {
                                onImportProduct({
                                  namaProduk: fp.name,
                                  porsiJual: 1,
                                  hargaJual: fp.price,
                                  kategori: fp.category || 'Lainnya',
                                });
                                showToast(`✅ "${fp.name}" berhasil diimpor ke ERP! Atur resep di Formulasi Resep.`, 'success');
                              }
                            }}
                            className="px-2.5 py-1.5 text-[9px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer"
                          >
                            + Import ke ERP
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ringkasan stats */}
          <div className="border-t border-gray-100 pt-3 mt-3 flex items-center justify-between text-[10px] text-gray-500">
            <span>Total di Firestore: <strong>{firestoreProducts.length}</strong> produk</span>
            <span>Di ERP: <strong>{firestoreProducts.filter(fp => productHpp.some(p => p.namaProduk.toLowerCase().trim() === fp.name.toLowerCase().trim())).length}</strong></span>
            <span>Web Store Only: <strong>{firestoreProducts.filter(fp => !productHpp.some(p => p.namaProduk.toLowerCase().trim() === fp.name.toLowerCase().trim())).length}</strong></span>
          </div>

          {/* ─── KATEGORI DARI FIRESTORE ─── */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5" />
                Kategori dari Firestore
              </h4>
              <div className="flex gap-2">
                <button onClick={fetchFirestoreCategories} disabled={isFetchingCategories}
                  className="px-2 py-1 text-[9px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer flex items-center gap-1">
                  <RefreshCw className={`w-3 h-3 ${isFetchingCategories ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button onClick={handleImportCategoriesFromFirestore}
                  className="px-2 py-1 text-[9px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-all cursor-pointer flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Import ke ERP
                </button>
              </div>
            </div>

            {isFetchingCategories ? (
              <div className="text-center py-4">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400 mx-auto" />
              </div>
            ) : firestoreCategories && firestoreCategories.categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {firestoreCategories.categories.map((cat, idx) => {
                  const existsInLocal = (config.categories || []).includes(cat);
                  return (
                    <div key={idx}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${
                        existsInLocal
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}
                    >
                      <span className="text-xs">
                        {(firestoreCategories.categoryIcons || {})[cat] === 'wheat' ? '🌾' :
                         (firestoreCategories.categoryIcons || {})[cat] === 'croissant' ? '🥐' :
                         (firestoreCategories.categoryIcons || {})[cat] === 'cake' ? '🎂' :
                         (firestoreCategories.categoryIcons || {})[cat] === 'cookie' ? '🍪' :
                         (firestoreCategories.categoryIcons || {})[cat] === 'coffee' ? '☕' : '📦'}
                      </span>
                      <span>{cat}</span>
                      {existsInLocal ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <span className="text-[8px] text-amber-500 font-bold">🆕</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 text-center py-3">
                Belum ada kategori di Firestore. Sync produk dari ERP untuk membuat kategori.
              </p>
            )}
            <div className="text-[9px] text-gray-400 mt-2">
              {firestoreCategories ? `${firestoreCategories.categories.length} kategori ditemukan` : 'Belum dimuat'}
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION: PREVIEW ─── */}
      {activeSection === 'preview' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-gray-800">👁️ Preview Web Store</h3>
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
            <div className="max-w-sm mx-auto bg-white min-h-[600px]">
              {/* Header */}
              <div className="p-4 flex items-center gap-3 border-b border-gray-100" style={{ background: config.colorBrandGreen || '#006241' }}>
                {config.logo ? (
                  <img src={config.logo} alt="" className="w-10 h-10 object-contain rounded-lg bg-white p-1" />
                ) : (
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold">{(config.navbarBrandText || 'N').charAt(0)}</div>
                )}
                <div className="text-white">
                  <h3 className="text-sm font-bold">{config.navbarBrandText || 'NEAR BAKERY & CO.'}</h3>
                  <p className="text-[9px] opacity-80">{config.slogan || 'Artisan Bakery Premium'}</p>
                </div>
              </div>
              {/* Hero */}
              <div className="relative h-52 flex items-center justify-center text-center overflow-hidden" style={{ background: config.heroBgColor || '#1E3932' }}>
                <div className="relative z-10 p-4 space-y-1">
                  <span className="text-[#cba258] text-[9px] tracking-widest uppercase font-semibold">{config.heroTagline || 'Artisan Bakery Premium'}</span>
                  <h2 className="text-lg font-black text-white">{config.heroTitle || 'Roti & Pastry Hangat'}</h2>
                  <p className="text-[10px] text-white/70 max-w-xs mx-auto">{config.heroDescription || 'Nikmati keaslian cita rasa...'}</p>
                  <button className="mt-2 px-5 py-1.5 text-[10px] font-bold rounded-full text-white shadow-sm" style={{ background: config.colorGold || '#cba258' }}>
                    {config.heroBtnText || 'Daftar & Pesan Sekarang'}
                  </button>
                </div>
                {/* Badge Premium Circles */}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {[config.heroBadgeText1 || '100% ALAMI', config.heroBadgeText2 || 'Ragi Alami', config.heroBadgeText3 || 'TANPA PENGAWET'].map((text, i) => (
                    <div key={i}
                      className={`rounded-full flex items-center justify-center text-center leading-tight font-bold shadow-sm ${
                        (config.badgeCircleSize || 'md') === 'sm' ? 'w-10 h-10 text-[6px]' :
                        (config.badgeCircleSize || 'md') === 'lg' ? 'w-16 h-16 text-[8px]' :
                        'w-12 h-12 text-[7px]'
                      }`}
                      style={{
                        backgroundColor: config.badgeCircleBgColor || '#1E3932',
                        color: config.badgeCircleTextColor || '#cba258',
                        border: `${config.badgeCircleBorderWidth ?? 2}px solid ${config.badgeCircleBorderColor || '#cba258'}`,
                      }}
                    >
                      {text.split(' ').map((word, wi) => (
                        <span key={wi} className="block leading-tight">{word}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {/* Category Circles Preview */}
              <div className="px-4 pt-3 pb-2 overflow-x-auto">
                <div className={`flex items-center ${
                  (config.categoryCircleGap || 'normal') === 'tight' ? 'gap-2' :
                  (config.categoryCircleGap || 'normal') === 'loose' ? 'gap-5' :
                  'gap-3'
                }`}>
                  {(config.categories || []).slice(0, 5).map((cat, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-0.5">
                      <div
                        className={`rounded-full flex items-center justify-center text-base font-bold shadow-sm border ${
                          (config.categoryCircleSize || 'md') === 'sm' ? 'w-9 h-9 text-sm' :
                          (config.categoryCircleSize || 'md') === 'lg' ? 'w-14 h-14 text-xl' :
                          'w-11 h-11 text-lg'
                        }`}
                        style={{
                          backgroundColor: config.categoryCircleBgColor || '#f0ebe3',
                          color: config.categoryCircleTextColor || '#006241',
                          borderColor: config.categoryCircleBorderColor || '#d4c9b8',
                        }}
                      >
                        {(config.categoryIcons || {})[cat] === 'wheat' ? '🌾' :
                         (config.categoryIcons || {})[cat] === 'croissant' ? '🥐' :
                         (config.categoryIcons || {})[cat] === 'cake' ? '🎂' :
                         (config.categoryIcons || {})[cat] === 'cookie' ? '🍪' :
                         (config.categoryIcons || {})[cat] === 'coffee' ? '☕' : '📦'}
                      </div>
                      <span className="text-[7px] font-bold text-gray-500 text-center max-w-[50px] truncate">{cat.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Products */}
              <div className="p-4">
                <h3 className="text-xs font-bold text-gray-800 mb-3">{config.productGridTitle || 'Pilihan Hari Ini'}</h3>
                {config.madeToOrder && config.preOrderLabel && (
                  <p className="text-[8px] text-amber-700 font-bold mb-2 -mt-2">{config.preOrderLabel}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {config.products.filter(p => p.active).slice(0, 4).map(p => (
                    <div key={p.productName} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <div className="relative w-full h-20 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
                        {p.displayImage ? <img src={p.displayImage} alt={p.productName} className="w-full h-full object-cover" /> : <ShoppingBag className="w-6 h-6 text-slate-300" />}
                        {config.madeToOrder && (
                          <span className="absolute top-1 left-1 text-[6px] font-black uppercase bg-amber-600 text-white px-1 py-0.5 rounded-sm leading-tight">{config.preOrderBadge || 'MADE-TO-ORDER'}</span>
                        )}
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
              <div className="p-4 text-center text-[9px] text-gray-400 border-t border-gray-100" style={{ background: (config.colorBrandGreen || '#006241') + '08' }}>
                <a href={`https://wa.me/${config.contactWhatsApp}`} className="text-emerald-600 font-bold block mb-1">WhatsApp: {config.contactWhatsApp}</a>
                <p>{config.contactEmail} | {config.contactInstagram}</p>
                <p className="mt-2">{config.footerCopyright || '© 2026 Near Bakery & Co. — Artisan Bakery Premium'}</p>
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
        </main>
      </div>


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
