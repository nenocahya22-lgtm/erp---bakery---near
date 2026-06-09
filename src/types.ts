export interface BahanBaku {
  kode?: string; // Auto-generated kode like BB-001
  nama: string;
  kategori?: string;
  satuan: string;
  hargaBeli: number; // Effective purchase price (marked up)
  isiKemasan: number;
  hargaSatuan: number; // calculated: hargaBeli / isiKemasan (marked up price per unit)
  hargaBeliReal: number; // Actual purchase price (real)
  hargaSatuanReal: number; // Real price per unit: hargaBeliReal / isiKemasan
  markupPercent?: number; // Markup percentage (e.g., 25 for 25%)
}

export interface ProductHpp {
  kode?: string; // Auto-generated kode like PRD-001
  namaProduk: string;
  porsiJual: number; // Berapa porsi yang dihasilkan dalam satu resep
  hargaJual: number; // Harga jual total resep atau per porsi
  kategori?: string; // e.g. 'Roti', 'Cake', 'Cookies', 'Coffee', 'Lainnya'
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
  hargaJualPerPorsi: number;
  profitPerPorsi: number;
  marginPersen: number;
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
  tipe: 'so_terima' | 'pos_jual' | 'waste' | 'so_minta' | 'so_kirim';
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
  password: string;
  isActive: boolean;
  createdAt: string;
}

export interface SuratOrder {
  id: string;
  cabangId: string;
  cabangNama: string;
  tanggalKirim: string;
  status: 'minta' | 'dikirim' | 'diterima';
  items: { bahanNama: string; qty: number }[];
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

export interface PurchaseOrder {
  id: string;
  poNo: string;
  vendorName: string;
  bahanNama: string;
  qty: number;
  satuan: string;
  hargaSatuan: number;
  totalCost: number;
  tanggalOrder: string;
  status: 'Draft' | 'Disetujui' | 'Dikirim ke Supplier' | 'Diterima';
}

// === SATUAN OPTIONS ===
export const SATUAN_OPTIONS = ['gr', 'kg', 'pcs', 'ml', 'liter', 'ons', 'sdm', 'sdt', 'cup', 'bungkus', 'pack', 'box', 'krat', 'ikat', 'ekor'];

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
  
  // Timestamp
  lastUpdated: string;
}

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

export const createDefaultWebStoreConfig = (products: { namaProduk: string; kategori?: string }[], cabangId?: string): WebStoreConfig => ({
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
  heroBgColor: '#1E3932',
  products: products.map(p => ({
    productName: p.namaProduk,
    active: true,
    displayImage: '',
    description: '',
    kategori: p.kategori || 'Lainnya',
  })),
  productGridTitle: 'Pilihan Hari Ini',
  emptyStateTitle: 'Belum Ada Menu Tersedia',
  emptyStateDescription: 'Database Anda saat ini kosong. Masuk ke panel penjual untuk menambahkan produk.',
  categories: ['Roti & Sourdough', 'Viennoiserie & Croissant', 'Kue & Tart', 'Kue Kering & Cookies', 'Minuman Kopi & Teh'],
  categoryIcons: {
    'Roti & Sourdough': 'wheat',
    'Viennoiserie & Croissant': 'croissant',
    'Kue & Tart': 'cake',
    'Kue Kering & Cookies': 'cookie',
    'Minuman Kopi & Teh': 'coffee'
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
  lastUpdated: new Date().toISOString(),
});

