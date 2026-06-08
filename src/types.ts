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

// === WEB STORE CONFIG ===
export interface WebStoreProduct {
  productName: string;
  active: boolean;
  displayImage: string; // base64 or URL
  description: string;
  kategori: string;
}

export interface WebStorePromo {
  id: string;
  title: string;
  description: string;
  image: string;
  active: boolean;
}

export interface WebStoreConfig {
  // Store Identity
  storeName: string;
  slogan: string;
  logo: string; // base64
  aboutText: string;
  contactWhatsApp: string;
  contactEmail: string;
  contactInstagram: string;
  alamat: string;
  
  // Hero Banner
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string; // base64
  heroBtnText: string;
  heroBtnLink: string;
  
  // Products
  products: WebStoreProduct[];
  
  // Theme
  primaryColor: string;
  secondaryColor: string;
  
  // Promotions
  promos: WebStorePromo[];
  
  // Footer
  footerText: string;
  facebookUrl: string;
  twitterUrl: string;
  
  // Timestamp
  lastUpdated: string;
}

// Default config factory
export const createDefaultWebStoreConfig = (products: { namaProduk: string; kategori?: string }[]): WebStoreConfig => ({
  storeName: 'Near Bakery & Co.',
  slogan: 'Fresh Baked Daily with Love',
  logo: '',
  aboutText: 'Toko roti artisan yang menyajikan roti segar setiap hari. Dibuat dengan bahan-bahan berkualitas terbaik dan resep turun-temurun.',
  contactWhatsApp: '6281234567890',
  contactEmail: 'hello@nearbakery.com',
  contactInstagram: '@nearbakery',
  alamat: 'Jl. Contoh No. 123, Kota',
  heroTitle: 'Fresh from the Oven',
  heroSubtitle: 'Artisan breads & pastries made daily with premium ingredients',
  heroImage: '',
  heroBtnText: 'Pesan Sekarang',
  heroBtnLink: '#products',
  products: products.map(p => ({
    productName: p.namaProduk,
    active: true,
    displayImage: '',
    description: '',
    kategori: p.kategori || 'Lainnya',
  })),
  primaryColor: '#059669',
  secondaryColor: '#f59e0b',
  promos: [],
  footerText: '© 2026 Near Bakery & Co. All rights reserved.',
  facebookUrl: '',
  twitterUrl: '',
  lastUpdated: new Date().toISOString(),
});

