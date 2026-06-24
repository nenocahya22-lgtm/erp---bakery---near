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
  Star,
  Info,
  MapPin,
  Share2,
  Clock,

  Instagram,
  Facebook,
  Youtube,
} from 'lucide-react';import { saveWebStoreConfig,
  getWebStoreConfig,
  getAllWebStoreConfigs,
  syncProductsToFirestore,
  cleanupStaleProducts,
  registerSubdomain,
  getAllSubdomains,
  getAllFirestoreProducts,
  getFirestoreCategories,
  saveCategoriesToFirestore,
  hashProductName,
  db,
  FirestoreProductSummary,
} from '../lib/firestore-bridge';
import { deleteDoc, doc } from 'firebase/firestore';
import { safeGetLocalStorage } from '../lib/safe-json';
import { getSharedCategories, setSharedCategories } from '../lib/category-store';
import WebStoreFirestoreSection from './WebStoreFirestoreSection';


import WebStoreIdentitySection from './WebStoreIdentitySection';
import WebStoreHeroSection from './WebStoreHeroSection';
import WebStoreCategoriesSection from './WebStoreCategoriesSection';
import WebStoreCirclesSection from './WebStoreCirclesSection';
import WebStoreProductsSection from './WebStoreProductsSection';
import WebStoreThemeSection from './WebStoreThemeSection';
import WebStorePromosSection from './WebStorePromosSection';
import WebStorePaymentSection from './WebStorePaymentSection';
import WebStoreTextsSection from './WebStoreTextsSection';
import WebStoreFooterSection from './WebStoreFooterSection';
import WebStoreFeaturedSection from './WebStoreFeaturedSection';
import WebStoreAboutSection from './WebStoreAboutSection';
import WebStoreLocationSection from './WebStoreLocationSection';
import WebStoreSocialSection from './WebStoreSocialSection';
import WebStoreHoursSection from './WebStoreHoursSection';
import WebStoreBranchSection from './WebStoreBranchSection';
import WebStoreWebdataSection from './WebStoreWebdataSection';
import WebStorePreviewSection from './WebStorePreviewSection';

const STORAGE_KEY = 'storenear_web_config';

interface Props {
  productHpp: ProductHpp[];
  calculatedProducts?: any[];
  bahanBaku?: any[];
  detailResep?: any[];
  cabangList?: Cabang[];
  onImportProduct?: (product: ProductHpp) => void;
}

// Helper: load image as base64 with compression (max 400px, JPEG 0.5 quality)
// 🔧 Ukuran diperkecil dari 800→400px, quality 0.7→0.5 agar base64 tidak overload localStorage (~5MB limit)
const loadImageAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height / width) * MAX);
            width = MAX;
          } else {
            width = Math.round((width / height) * MAX);
            height = MAX;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

/** 🆕 Auto-detect icon berdasarkan keyword nama kategori */
const autoDetectCategoryIcon = (catName: string): string => {
  const lower = catName.toLowerCase();
  // Urutan prioritas: dari spesifik ke umum
  if (/roti|sourdough|bread/i.test(lower)) return 'wheat';
  if (/croissant|viennoiserie|pastry|danis?h/i.test(lower)) return 'croissant';
  if (/kue|tart|cake|cheesecake|bolu|brownies/i.test(lower)) return 'cake';
  if (/kue kering|cookies?|biscuit|kukis/i.test(lower)) return 'cookie';
  if (/kopi|coffee|minuman|teh|drink|susu|jus|smoothie|mocktail/i.test(lower)) return 'coffee';
  return 'package'; // default untuk lainnya
};

export default function WebStoreManagerTab({ productHpp, calculatedProducts, bahanBaku, detailResep, cabangList, onImportProduct }: Props) {
  const [config, setConfig] = useState<WebStoreConfig>(() => {
    const saved = safeGetLocalStorage<WebStoreConfig | null>(STORAGE_KEY, null);
    if (saved) {
      // ⚠️ JANGAN override kategori dari shared store / category-store!
      // Jika user sudah menghapus kategori di Web Store Manager,
      // shared store mungkin masih menyimpan data lama dan akan mengembalikannya.
      // Biarkan kategori dari saved config (localStorage) sebagai sumber kebenaran.
      // 🔧 Restore gambar dari localStorage key terpisah (recipe_img_*, store_logo)
      //    untuk menghindari limit ~5MB localStorage — gambar tidak disimpan di config.
      saved.products = saved.products.map(p => ({
        ...p,
        displayImage: localStorage.getItem(`recipe_img_${p.productName.toLowerCase().trim()}`) || p.displayImage || '',
      }));
      saved.logo = localStorage.getItem('store_logo') || saved.logo || '';
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
          // 🔧 Simpan ke localStorage tanpa gambar (gambar sudah di products/{id} Firestore)
          const remoteConfigWithoutImages = {
            ...remoteConfig,
            logo: '',
            products: remoteConfig.products.map(p => ({
              ...p,
              displayImage: '',
            })),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteConfigWithoutImages));
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

  // Auto-save to localStorage (tanpa gambar agar tidak overflow ~5MB) + sync kategori ke shared store
  useEffect(() => {
    // 🔧 Strip displayImage & logo sebelum simpan ke localStorage — gambar disimpan
    //    terpisah di key 'recipe_img_<productName>' dan 'store_logo'.
    //    Dengan begini, config tetap kecil meskipun ada 50+ produk dengan gambar.
    const configWithoutImages = {
      ...config,
      logo: '',
      products: config.products.map(p => ({
        ...p,
        displayImage: '',
      })),
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configWithoutImages));
    // Sync kategori dari config ke shared store agar Formulasi Resep juga update
    if (config.categories && config.categories.length > 0) {
      setSharedCategories({
        categories: config.categories,
        categoryIcons: config.categoryIcons || {},
      });
    }
  }, [config]);

  // Auto-save kategori ke Firestore ketika berubah — HANYA kategori, bukan full config
  // Catatan: auto-save ini hanya untuk menjaga konsistensi dengan collection categories/{cabangId}
  // Config lengkap disimpan via PUBLISH PERUBAHAN (handleSaveToFirestore)
  useEffect(() => {
    if (!isFirestoreConnected || !config.categories) return;
    const cabangId = config.cabangId || 'pusat';
    const timer = setTimeout(() => {
      saveCategoriesToFirestore(cabangId, config.categories || [], config.categoryIcons || {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [config.categories, config.categoryIcons, config.cabangId, isFirestoreConnected]);

  // ─── 🧹 AUTO-CLEANUP: Hapus stale products — jalan saat mount & saat jumlah produk berubah ───
  //    Tanpa ini, produk yang sudah dihapus dari ERP tetap ada di collection
  //    'products' Firestore, dan Web Store akan terus menampilkannya.
  //    🔧 Sekarang juga jalan ulang saat calculatedProducts?.length berubah (produk ditambah/dihapus),
  //    tidak hanya saat mount. Jadi hapus produk dari Formulasi Resep → langsung cleanup.
  useEffect(() => {
    if (!isFirestoreConnected || !calculatedProducts || calculatedProducts.length === 0) return;
    const cabangId = config.cabangId || 'pusat';
    cleanupStaleProducts(calculatedProducts, cabangId).then(count => {
      if (count > 0) {
        console.log(`🧹 Auto-cleanup: ${count} stale products removed from Firestore`);
        // Refresh tampilan data web store
        fetchFirestoreProducts();
      }
    }).catch(e => console.warn('Auto-cleanup error:', e));
  }, [isFirestoreConnected, config.cabangId, calculatedProducts?.length]); // 🔧 Tambah dependensi jumlah produk

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

      // 🆕 Fallback ketiga: ekstrak kategori UNIK dari produk di Firestore
      // Ini penting karena kategori mungkin hanya ada sebagai field 'category' di setiap produk,
      // tanpa disimpan terpisah di collection categories/{cabangId} atau webstore_config.
      if (!cats || !cats.categories.length) {
        try {
          const products = await getAllFirestoreProducts();
          const uniqueCats = [...new Set(products.map(p => p.category).filter(Boolean))];
          if (uniqueCats.length > 0) {
            // Auto-detect icon berdasarkan keyword nama kategori
            const catIcons: Record<string, string> = {};
            uniqueCats.forEach(cat => {
              catIcons[cat] = autoDetectCategoryIcon(cat);
            });
            cats = {
              categories: uniqueCats,
              categoryIcons: catIcons,
            };
            // 🚫 HAPUS: Auto-sync kategori ke Firestore — ini menyebabkan kategori yang sudah
            //    dihapus user dari Web Store Manager muncul lagi. Fallback ini hanya untuk DISPLAY
            //    di panel Data Web Store. User bisa import manual via tombol "Import ke ERP".
            //    Dulu ada: await saveCategoriesToFirestore(...)
          }
        } catch (e) {
          console.warn('Fallback products categories failed:', e);
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
  const handleImportCategory = useCallback((category: string) => {
    const icon = firestoreCategories?.categoryIcons?.[category] || 'package';
    if (!(config.categories || []).includes(category)) {
      updateConfig({
        categories: [...(config.categories || []), category],
        categoryIcons: { ...(config.categoryIcons || {}), [category]: icon },
      });
    }
  }, [firestoreCategories, config.categories, config.categoryIcons]);

  useEffect(() => {
    if (isFirestoreConnected) {
      fetchFirestoreProducts();
      fetchFirestoreCategories();
    }
  }, [isFirestoreConnected, fetchFirestoreProducts, fetchFirestoreCategories]);

  // 🚫 HAPUS: Auto-import kategori dari Firestore — ini menyebabkan kategori yang sudah dihapus
  //    user kembali lagi saat refresh. User harus import manual via tombol "Import ke ERP".
  //    Dulu ada: useEffect yang auto-import waktu config.categories kosong.

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

  // ─── SAVE TO FIRESTORE + AUTO SYNC PRODUK & KATEGORI ───
  const handleSaveToFirestore = async () => {
    setIsSavingToFirestore(true);
    try {
      const cabangId = config.cabangId || 'pusat';
      // 1. Simpan konfigurasi web store
      await saveWebStoreConfig(cabangId, config);
      setIsFirestoreConnected(true);
      
      // 2. Auto-sync kategori ke collection categories/{cabangId}
      // ⚠️ HARUS selalu save, termasuk array kosong! Kalau tidak, kategori
      //    yang sudah dihapus user tetap ada di Firestore dan web store
      //    akan terus menampilkannya.
      try {
        await saveCategoriesToFirestore(cabangId, config.categories || [], config.categoryIcons || {});
      } catch (e) {
        console.warn('Category sync error (non-critical):', e);
      }
      
      // 3. Auto-sync produk ke collection products (jika data tersedia)
      if (calculatedProducts && productHpp && detailResep && bahanBaku) {
        try {
          const count = await syncProductsToFirestore(
            calculatedProducts,
            productHpp.filter(p => p.status !== 'draft'),
            detailResep,
            bahanBaku,
            cabangId,
            config // Kirim config langsung (hindari race condition)
          );
          setLastSynced(new Date().toLocaleTimeString('id-ID'));
          showToast(`✅ ${count} produk + kategori tersinkronisasi! Web Store akan update.`, 'success');
        } catch (e) {
          console.warn('Product sync error (non-critical):', e);
          const imgCount = calculatedProducts ? calculatedProducts.filter(c => c.namaProduk && localStorage.getItem(`recipe_img_${(c.namaProduk || '').toLowerCase().trim()}`)).length : 0;
          showToast(`⚠️ Konfigurasi tersimpan. Gagal sync ${imgCount > 0 ? `(${imgCount} gambar AI siap)` : ''} — coba Sync Manual di tab Katalog Produk.`, 'warning');
        }
      } else {
        showToast('⚠️ Konfigurasi tersimpan. Data produk belum siap — buka tab Formulasi Resep dulu, lalu PUBLISH ulang.', 'warning');
      }
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
      const count = await syncProductsToFirestore(calculatedProducts, productHpp.filter(p => p.status !== 'draft'), detailResep, bahanBaku, cabangId, config);
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

  // Image upload handlers — 🔧 simpan gambar ke key terpisah agar tidak overload localStorage
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const b64 = await loadImageAsBase64(file);
      updateConfig({ logo: b64 });
      localStorage.setItem('store_logo', b64); // Simpan terpisah dari config
      showToast('Logo berhasil diupload!', 'success');
    }
  };

  const handleUploadProductImage = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const b64 = await loadImageAsBase64(file);
      updateProduct(idx, { displayImage: b64 });
      // 🔧 Simpan di localStorage key terpisah — syncProductsToFirestore sudah baca dari sini priority #1
      const productName = config.products[idx].productName;
      localStorage.setItem(`recipe_img_${productName.toLowerCase().trim()}`, b64);
      showToast('Gambar produk berhasil diupload!', 'success');
    }
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
          
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2 mt-4">🌐 Landing Page</div>
          {sidebarBtn('featured', <Star className="w-4 h-4" />, 'Produk Unggulan')}
          {sidebarBtn('about', <Info className="w-4 h-4" />, 'Tentang Toko')}
          {sidebarBtn('location', <MapPin className="w-4 h-4" />, 'Lokasi & Maps')}
          {sidebarBtn('social', <Share2 className="w-4 h-4" />, 'Media Sosial')}
          {sidebarBtn('hours', <Clock className="w-4 h-4" />, 'Jam Operasional')}
          
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
        <WebStoreIdentitySection config={config} updateConfig={updateConfig} logoInputRef={logoInputRef} handleUploadLogo={handleUploadLogo} />
      )}
{activeSection === 'hero' && (
        <WebStoreHeroSection config={config} updateConfig={updateConfig} />
      )}
{activeSection === 'categories' && (
        <WebStoreCategoriesSection config={config} updateConfig={updateConfig} newCategoryName={newCategoryName} setNewCategoryName={setNewCategoryName} newCategoryIcon={newCategoryIcon} setNewCategoryIcon={setNewCategoryIcon} autoDetectCategoryIcon={autoDetectCategoryIcon} />
      )}
{activeSection === 'circles' && (
        <WebStoreCirclesSection config={config} updateConfig={updateConfig} />
      )}
{activeSection === 'products' && (
        <WebStoreProductsSection config={config} updateConfig={updateConfig} updateProduct={updateProduct} products={products} setProducts={setProducts} handleDuplicateProduct={handleDuplicateProduct} handleUploadProductImage={handleUploadProductImage} filteredProducts={filteredProducts} searchQuery={searchQuery} />
      )}
{activeSection === 'theme' && (
        <WebStoreThemeSection config={config} updateConfig={updateConfig} />
      )}
{activeSection === 'promos' && (
        <WebStorePromosSection config={config} updateConfig={updateConfig} showPromoModal={showPromoModal} setShowPromoModal={setShowPromoModal} handleAddPromo={handleAddPromo} handleEditPromo={handleEditPromo} handleSavePromo={handleSavePromo} handleDeletePromo={handleDeletePromo} handleUploadPromoImage={handleUploadPromoImage} />
      )}
{activeSection === 'payment' && (
        <WebStorePaymentSection config={config} updateConfig={updateConfig} showPaymentModal={showPaymentModal} setShowPaymentModal={setShowPaymentModal} handleAddPayment={handleAddPayment} handleEditPayment={handleEditPayment} handleSavePayment={handleSavePayment} handleDeletePayment={handleDeletePayment} />
      )}
{activeSection === 'texts' && (
        <WebStoreTextsSection config={config} updateConfig={updateConfig} />
      )}
{activeSection === 'footer' && (
        <WebStoreFooterSection config={config} updateConfig={updateConfig} />
      )}
{activeSection === 'featured' && (
        <WebStoreFeaturedSection config={config} updateConfig={updateConfig} featuredProducts={featuredProducts} productList={productList} cabangList={cabangList} />
      )}
{activeSection === 'about' && (
        <WebStoreAboutSection config={config} updateConfig={updateConfig} />
      )}
{activeSection === 'location' && (
        <WebStoreLocationSection config={config} updateConfig={updateConfig} />
      )}
{activeSection === 'social' && (
        <WebStoreSocialSection config={config} updateConfig={updateConfig} />
      )}
{activeSection === 'hours' && (
        <WebStoreHoursSection config={config} updateConfig={updateConfig} />
      )}
{activeSection === 'branch' && (
        <WebStoreBranchSection config={config} updateConfig={updateConfig} cabangList={cabangList} handleRegisterSubdomain={handleRegisterSubdomain} />
      )}
{activeSection === 'webdata' && (
        <WebStoreWebdataSection config={config} updateConfig={updateConfig} fetchFirestoreProducts={fetchFirestoreProducts} fetchFirestoreCategories={fetchFirestoreCategories} handleImportCategory={handleImportCategory} cabangList={cabangList} handleExport={handleExport} handleImport={handleImport} newCategoryName={newCategoryName} setNewCategoryName={setNewCategoryName} newCategoryIcon={newCategoryIcon} setNewCategoryIcon={setNewCategoryIcon} />
      )}
{activeSection === 'preview' && (
        <WebStorePreviewSection showPreview={showPreview} setShowPreview={setShowPreview} config={config} products={products} cabangList={cabangList} />
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