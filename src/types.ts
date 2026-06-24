export interface BahanBaku {
  kode?: string; // Auto-generated kode like BB-001
  nama: string;
  kategori?: string;
  satuan: string;
  hargaBeli: number; // Effective purchase price (marked up)
  isiKemasan: number; // Berisi total stok saat ini (bukan berat per kemasan)
  stok: number; // Total saldo stok saat ini (sama dengan isiKemasan, untuk kejelasan semantik)
  hargaSatuan: number; // calculated: hargaBeli / isiKemasan (marked up price per unit)
  hargaBeliReal: number; // Actual purchase price (real)
  hargaSatuanReal: number; // Real price per unit: hargaBeliReal / isiKemasan
  markupPercent?: number; // Markup percentage (e.g., 25 for 25%)
  konversiGram?: number; // Berat per unit (gram) untuk satuan count (pcs/bungkus/dll). Contoh: 1 telur = 50gr
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Ukuran 20×20", "Ukuran 20×10"
  porsi: number; // Berapa porsi / potong yang dihasilkan varian ini
  hargaJual: number; // Harga jual varian ini
  active: boolean;
  // Opsional: override bahan jika proporsi berbeda dari resep dasar
  ingredients?: { namaBahan: string; takaran: number }[];
}

export interface ProductHpp {
  kode?: string; // Auto-generated kode like PRD-001
  namaProduk: string;
  porsiJual: number; // Berapa porsi yang dihasilkan dalam satu resep
  hargaJual: number; // Harga jual total resep atau per porsi
  kategori?: string; // e.g. 'Roti', 'Cake', 'Cookies', 'Coffee', 'Lainnya'
  wastePercent?: number; // Waste/shrinkage % (default 0). Example: 5 berarti 5% shrinkage
  variants?: ProductVariant[]; // Varian ukuran untuk produk ini
  status?: 'draft' | 'published'; // draft = masih diedit, published = siap produksi
}

export interface ProductTopping {
  id: string;
  namaProduk: string;
  namaTopping: string;
  namaBahan: string; // Bahan baku yang digunakan sebagai topping
  takaran: number;
  hargaBeli: number;
  isiKemasan: number;
  satuan: string;
  hargaSatuan: number;
  hargaJualTopping: number;
}

export interface DetailResep {
  namaProduk: string;
  namaBahan: string;
  takaran: number;
}

export interface CalculationResult {
  namaProduk: string;
  porsiJual: number;
  hargaJual: number;
  biayaBahanTotal: number;
  hppTotalResep: number;
  hppPerPorsi: number;
  hargaJualPerPorsi: number;    profitPerPorsi: number;    marginPersen: number;
    wastePercent: number; // Waste/shrinkage factor used in calculation
    hppBeforeWaste: number; // HPP before applying waste factor
    biayaOverhead?: number;
    biayaTenagaKerja?: number;
    biayaUtilitas?: number;
    biayaKemasan?: number;
    warnings?: string[]; // Conversion warnings — ditampilkan di UI
    // Hasil kalkulasi per varian (jika produk punya varian ukuran)
    variants?: {
      id: string;
      name: string;
      porsi: number;
      hargaJual: number;
      biayaBahanTotal: number;
      hppTotal: number;
      hppPerPorsi: number;
      bahanList: {
        namaBahan: string;
        takaran: number;
        satuan: string;
        hargaBeli: number;
        isiKemasan: number;
        hargaSatuan: number;
        totalBiayaBahan: number;
      }[];
    }[];
    bahanList: {
    namaBahan: string;
    takaran: number;
    satuan: string;
    hargaBeli: number;
    isiKemasan: number;
    hargaSatuan: number;
    totalBiayaBahan: number;
  }[];
}

export interface SpreadsheetInfo {
  id: string;
  title: string;
  url: string;
}

export interface WasteLog {
  id: string;
  bahanNama: string;
  qtyWasted: number;
  satuan: string;
  lossValue: number;
  location: 'Gudang Utama' | 'Dapur Pusat' | 'Storefront / Kasir';
  reason: string;
  dateLogged: string;
}

export interface WriteOffLog {
  id: string;
  namaProduk: string;
  qtyUnsold: number;
  lossValue: number;
  reason: string;
  dateLogged: string;
}

export interface PriceRecord {
  id: string;
  bahanNama: string;
  hargaBeli: number;
  date: string;
  note: string;
}

export interface RDExperiment {
  id: string;
  projectName: string;
  targetOutputPorsi: number;
  estOverhead: number;
  estHargaJual: number;
  components: {
    bahanName: string;
    takaran: number;
    unitPrice: number;
    satuan: string;
  }[];
  dateCreated: string;
}

// === PRODUCTION CALENDAR ===
export interface ProductionCalendarEntry {
  id: string;
  tanggal: string; // YYYY-MM-DD
  label: string;
  warna: 'emerald' | 'amber' | 'blue' | 'red' | 'purple';
  cabangId?: string; // null = all branches
  notes?: string;
}

// === BRANCH STOCK TRACKING ===
export interface BranchStock {
  cabangId: string;
  bahanNama: string;
  stokTeoritis: number; // calculated from SO received - POS sold - Waste
  stokFisik: number; // from stock opname
  satuan: string;
  lastUpdated: string;
}

export interface BranchTransaction {
  id: string;
  cabangId: string;
  tipe: 'so_terima' | 'pos_jual' | 'waste' | 'so_minta' | 'so_kirim' | 'retur';
  bahanNama: string;
  qty: number;
  satuan: string;
  tanggal: string;
  refId: string;
}

// === MULTI-CABANG SYSTEM ===
export interface Cabang {
  id: string;
  nama: string;
  alamat: string;
  username: string;
  password: string; // Hash SHA-256 dari password
  passwordHint?: string; // Petunjuk untuk mengingat password (opsional)
  isActive: boolean;
  createdAt: string;
}

export interface SuratOrder {
  id: string;
  cabangId: string;
  cabangNama: string;
  tanggalKirim: string;
  status: 'minta' | 'dikirim' | 'diterima' | 'diretur';
  items: { bahanNama: string; qty: number; qtyTerima?: number }[];
  returNote?: string; // Catatan retur jika barang rusak di jalan
}

export interface StockOpname {
  id: string;
  bahanNama: string;
  cabangId: string;
  stokSatuan: number; // gram/ml/pcs hasil timbang langsung
  packUtuh: number; // kemasan factory yang belum dibuka
  packTerbuka: number; // kemasan yang sudah dibuka
  sisaPackBuka: number; // sisa timbangan dari pack terbuka
  petugas: string;
  catatan: string;
  tanggal: string;
}

// === OPNAME DRAFT — Stock Opname Approval ===
export interface OpnameDraft {
  id: string;
  cabangId: string;
  cabangNama: string;
  bahanNama: string;
  stokFisik: number; // proposed new physical stock
  stokTeoritis: number; // current theoretical stock
  satuan: string;
  tanggal: string;
  petugas: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectNote?: string;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  vendorName: string;
  bahanNama: string;
  qty: number;
  satuan: string;
  satuanBeli: string;
  konversi: number;
  hargaSatuan: number;
  totalCost: number;
  tanggalOrder: string;
  status: 'Draft' | 'Disetujui' | 'Dikirim ke Supplier' | 'Diterima';
}

// === SATUAN OPTIONS ===
export const SATUAN_OPTIONS = ['gr', 'kg', 'pcs', 'ml', 'liter', 'ons', 'sdm', 'sdt', 'cup', 'bungkus', 'pack', 'box', 'krat', 'ikat', 'ekor', 'karung', 'dus'];

export const getSatuanFromBahan = (bahan: BahanBaku | undefined): string => bahan?.satuan || 'gr';

// === WEB STORE CONFIG ===
export interface PaymentMethod {
  id: string;
  type: 'transfer_bank' | 'ewallet' | 'cod';
  name: string;
  label: string;
  active: boolean;
  // For transfer bank
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  // For e-wallet
  phoneNumber?: string;
  // Sort order
  order: number;
}

export interface WebStoreProduct {
  productName: string;
  active: boolean;
  displayImage: string; // base64 or URL
  description: string;
  kategori: string;
  discountPercent?: number; // 0-100, 0 = no discount
  variants?: { id: string; name: string; price: number; originalPrice?: number }[]; // Varian ukuran untuk Web Store
}

export interface WebStorePromo {
  id: string;
  title: string;
  description: string;
  image: string;
  active: boolean;
}

export interface WebStoreConfig {
  // Store Identity — Navbar
  storeName: string;
  navbarBrandText: string;
  slogan: string;
  logo: string; // base64
  contactWhatsApp: string;
  contactEmail: string;
  contactInstagram: string;
  alamat: string;
  searchPlaceholder: string;
  storeLocatorText: string;
  
  // Hero Banner
  heroTagline: string;
  heroTitle: string;
  heroDescription: string;
  heroBtnText: string;
  heroBadgeText1: string;
  heroBadgeText2: string;
  heroBadgeText3: string;

  // Badge Premium Circle Styling
  badgeCircleBgColor?: string;
  badgeCircleTextColor?: string;
  badgeCircleBorderColor?: string;
  badgeCircleBorderWidth?: number;
  badgeCircleSize?: 'sm' | 'md' | 'lg';

  // Category Circle Styling
  categoryCircleBgColor?: string;
  categoryCircleTextColor?: string;
  categoryCircleBorderColor?: string;
  categoryCircleSize?: 'sm' | 'md' | 'lg';
  categoryCircleGap?: 'tight' | 'normal' | 'loose';

  heroBgColor: string;
  
  // Products
  products: WebStoreProduct[];
  productGridTitle: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  
  // Theme Colors — matching Web Store design system
  colorBrandGreen: string;
  colorGreenAccent: string;
  colorHouseGreen: string;
  colorGold: string;
  colorCanvasWarm: string;
  
  // Categories (managed from ERP, synced to Web Store)
  categories: string[];
  categoryIcons: Record<string, string>; // category name → icon name
  
  // Promotions
  promos: WebStorePromo[];
  
  // Payment Methods
  paymentMethods: PaymentMethod[];

  // Branch
  cabangId: string;
  branchSubdomain: string;

  // Footer
  footerCopyright: string;
  footerLinks: string[];
  checkoutFooterText: string;

  // Made-to-Order (Pre-Order) Mode — pengganti stok display
  madeToOrder: boolean;
  preOrderLabel: string;
  preOrderBadge: string;

  // ─── FEATURED PRODUCTS (produk unggulan di hero) ───
  featuredProductNames: string[]; // nama produk yang ditampilkan sebagai unggulan
  featuredSectionTitle: string;
  featuredSectionSubtitle: string;
  featuredSectionEnabled: boolean;
  
  // ─── ABOUT SECTION (tentang toko) ───
  aboutEnabled: boolean;
  aboutTitle: string;
  aboutDescription: string;
  aboutImage: string; // base64
  aboutButtonText: string;
  aboutButtonLink: string;
  aboutStatsEnabled: boolean;
  aboutStats: { label: string; value: string }[];
  
  // ─── LOCATION / MAPS (lokasi cabang) ───
  locationEnabled: boolean;
  locationAddress: string;
  locationCity: string;
  locationMapsUrl: string; // Google Maps embed URL
  locationLat?: number;
  locationLng?: number;
  locationPhone: string;
  
  // ─── SOCIAL MEDIA LINKS ───
  socialMedia: { platform: string; url: string; icon: string; active: boolean }[];
  
  // ─── OPERATING HOURS (jam buka) ───
  operatingHoursEnabled: boolean;
  operatingHoursNote: string;
  operatingHours: { day: string; open: string; close: string; active: boolean }[];
  
  // ─── Timestamp
  lastUpdated: string;
}

export const SOCIAL_MEDIA_PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'facebook', label: 'Facebook', icon: '👍' },
  { value: 'twitter', label: 'Twitter / X', icon: '🐦' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'youtube', label: 'YouTube', icon: '▶️' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'line', label: 'LINE', icon: '💚' },
  { value: 'shopee', label: 'Shopee', icon: '🛒' },
  { value: 'tokopedia', label: 'Tokopedia', icon: '🛍️' },
  { value: 'gofood', label: 'GoFood', icon: '🛵' },
  { value: 'grabfood', label: 'GrabFood', icon: '🚗' },
  { value: 'website', label: 'Website', icon: '🌐' },
];

export const DAYS_OF_WEEK = [
  'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'
];

export const createDefaultSocialMedia = () => [
  { platform: 'instagram', url: 'https://instagram.com/nearbakery', icon: '📷', active: true },
  { platform: 'facebook', url: '', icon: '👍', active: false },
  { platform: 'whatsapp', url: 'https://wa.me/6281234567890', icon: '💬', active: true },
];

export const createDefaultOperatingHours = () => [
  { day: 'Senin', open: '08:00', close: '20:00', active: true },
  { day: 'Selasa', open: '08:00', close: '20:00', active: true },
  { day: 'Rabu', open: '08:00', close: '20:00', active: true },
  { day: 'Kamis', open: '08:00', close: '20:00', active: true },
  { day: 'Jumat', open: '08:00', close: '20:00', active: true },
  { day: 'Sabtu', open: '09:00', close: '21:00', active: true },
  { day: 'Minggu', open: '09:00', close: '18:00', active: true },
];

// Default config factory
export const createDefaultPaymentMethods = (): PaymentMethod[] => [
  {
    id: 'bca-transfer',
    type: 'transfer_bank',
    name: 'Transfer Bank (BCA)',
    label: 'Transfer Bank BCA (Verifikasi Otomatis Admin)',
    active: true,
    bankName: 'Bank BCA',
    accountNumber: '77359182301',
    accountName: 'Near Bakery & Co. PT',
    order: 1,
  },
  {
    id: 'cod',
    type: 'cod',
    name: 'COD (Cash On Delivery)',
    label: 'COD - Pembayaran Cash saat Roti Diantarkan Kurir',
    active: true,
    order: 2,
  },
  {
    id: 'ewallet-gopay',
    type: 'ewallet',
    name: 'E-Wallet (Gopay/OVO)',
    label: 'Dompet Digital Gopay, OVO, atau ShopeePay',
    active: true,
    phoneNumber: '6281234567890',
    order: 3,
  },
];

// ─── IoT DEVICES — Sensor dapur pintar ───
export interface IoTDevice {
  id: string;
  name: string;
  type: 'oven' | 'freezer' | 'scale' | 'mixer' | 'humidity' | 'timer';
  value: number;
  unit: string;
  status: 'online' | 'offline' | 'warning';
  lastUpdate: string;
  location: string;
  minThreshold?: number;
  maxThreshold?: number;
}

// ─── SMART DISTRIBUTION / SALES VELOCITY ───
export interface ADSData {
  productName: string;
  cabangId: string;
  cabangNama: string;
  dailySales: number; // Average Daily Sales (in units)
  daysOfData: number;
  lastTransaction: string; // date
}

export interface DistributionRecommendation {
  batchId: string;
  batchNo: string;
  bahanNama: string;
  expiryDate: string;
  sisaHari: number;
  leadTime: number; // hari
  sisaHariEfektif: number;
  adsPerCabang: { cabangId: string; cabangNama: string; ads: number; rekomendasiQty: number; skorPrioritas: number }[];
  rekomendasiCabangId: string;
  rekomendasiCabangNama: string;
  wasteRisk: 'rendah' | 'sedang' | 'tinggi';
}

export interface StockSwapSuggestion {
  bahanNama: string;
  dariCabangId: string;
  dariCabangNama: string;
  keCabangId: string;
  keCabangNama: string;
  qty: number;
  satuan: string;
  alasan: string;
  potensiSavedValue: number; // Estimated money saved by preventing waste
}

export interface AutoPromoSignal {
  id: string;
  productName: string;
  cabangId: string;
  cabangNama: string;
  reason: string;
  suggestedDiscount: number; // 0-100
  batchExpiry: string;
  createdAt: string;
  status: 'pending' | 'activated' | 'dismissed';
}

export const createDefaultWebStoreConfig = (products: { namaProduk: string; kategori?: string; variants?: { id: string; name: string; hargaJual: number }[] }[], cabangId?: string): WebStoreConfig => ({
  storeName: 'NEAR BAKERY & CO.',
  navbarBrandText: 'NEAR BAKERY & CO.',
  slogan: 'Artisan Bakery Premium',
  logo: '',
  contactWhatsApp: '6281234567890',
  contactEmail: 'hello@nearbakery.com',
  contactInstagram: '@nearbakery',
  alamat: 'Jl. Contoh No. 123, Kota',
  searchPlaceholder: 'Cari menu artisan...',
  storeLocatorText: 'Temukan Toko',
  heroTagline: 'Artisan Bakery Premium',
  heroTitle: 'Roti & Pastry Hangat, Dipanggang Segar Setiap Hari',
  heroDescription: 'Nikmati keaslian cita rasa Sourdough alami, croissant mentega renyah, dan aneka kue premium yang dibuat dengan sepenuh hati oleh baker berpengalaman.',
  heroBtnText: 'Daftar & Pesan Sekarang',
  heroBadgeText1: '100% ALAMI',
  heroBadgeText2: 'Ragi Alami',
  heroBadgeText3: 'TANPA PENGAWET',
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
  heroBgColor: '#1E3932',
  products: products.map(p => ({
    productName: p.namaProduk,
    active: true,
    displayImage: '',
    description: '',
    kategori: p.kategori || 'Lainnya',
    variants: p.variants ? p.variants.filter(v => v.hargaJual > 0).map(v => ({
      id: v.id,
      name: v.name,
      price: v.hargaJual,
    })) : undefined,
  })),
  productGridTitle: 'Pilihan Hari Ini',
  emptyStateTitle: 'Belum Ada Menu Tersedia',
  emptyStateDescription: 'Database Anda saat ini kosong. Masuk ke panel penjual untuk menambahkan produk.',
  categories: [
    'Roti & Sourdough',
    'Viennoiserie & Croissant',
    'Kue & Tart',
    'Kue Kering & Cookies',
    'Minuman Kopi & Teh',
  ],
  categoryIcons: {
    'Roti & Sourdough': 'wheat',
    'Viennoiserie & Croissant': 'croissant',
    'Kue & Tart': 'cake',
    'Kue Kering & Cookies': 'cookie',
    'Minuman Kopi & Teh': 'coffee',
  },
  colorBrandGreen: '#006241',
  colorGreenAccent: '#00754A',
  colorHouseGreen: '#1E3932',
  colorGold: '#cba258',
  colorCanvasWarm: '#f2f0eb',
  promos: [],
  paymentMethods: createDefaultPaymentMethods(),
  cabangId: cabangId || 'pusat',
  branchSubdomain: 'pusat',
  footerCopyright: '© 2026 Near Bakery & Co. — Artisan Bakery Premium',
  footerLinks: ['Menu', 'Rewards', 'Gift Cards'],
  checkoutFooterText: 'Near Bakery & Co. — Kualitas Terjamin',
  madeToOrder: true,
  preOrderLabel: 'Pre-Order — Produksi Setiap Hari',
  preOrderBadge: 'MADE-TO-ORDER',
  
  // ─── Featured Products ───
  featuredProductNames: products.slice(0, 4).map(p => p.namaProduk),
  featuredSectionTitle: 'Produk Unggulan Kami',
  featuredSectionSubtitle: 'Rekomendasi terbaik dari baker kami — fresh baked every day!',
  featuredSectionEnabled: true,
  
  // ─── About Section ───
  aboutEnabled: true,
  aboutTitle: 'Cerita Kami',
  aboutDescription: 'Near Bakery & Co. adalah bakery artisan yang berdiri sejak 2020. Kami percaya bahwa roti terbaik lahir dari bahan alami, ragi sourdough liar, dan sentuhan tangan baker yang penuh dedikasi. Setiap produk kami buat dengan resep tradisional yang diwariskan turun-temurun, dipadukan dengan inovasi modern untuk menciptakan cita rasa yang tak terlupakan.',
  aboutImage: '',
  aboutButtonText: 'Pelajari Lebih Lanjut',
  aboutButtonLink: '#',
  aboutStatsEnabled: true,
  aboutStats: [
    { label: 'Bahan Alami', value: '100%' },
    { label: 'Tanpa Pengawet', value: '100%' },
    { label: 'Kepuasan Pelanggan', value: '98%' },
    { label: 'Produk Artisan', value: '50+' },
  ],
  
  // ─── Location ───
  locationEnabled: true,
  locationAddress: 'Jl. Contoh No. 123',
  locationCity: 'Kota Contoh',
  locationMapsUrl: 'https://maps.google.com/?q=near+bakery',
  locationPhone: '6281234567890',
  
  // ─── Social Media ───
  socialMedia: createDefaultSocialMedia(),
  
  // ─── Operating Hours ───
  operatingHoursEnabled: true,
  operatingHoursNote: '* Jam operasional dapat berubah pada hari libur nasional',
  operatingHours: createDefaultOperatingHours(),
  
  lastUpdated: new Date().toISOString(),
});

