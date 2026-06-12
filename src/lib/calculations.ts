import { BahanBaku, ProductHpp, DetailResep, CalculationResult } from '../types';

// ─── AUTO KONVERSI SATUAN ───
// Tabel konversi ke satuan dasar (gram)
const SATUAN_CONVERSIONS: Record<string, { toBase: (v: number) => number; fromBase: (v: number) => number; group: 'mass' | 'volume' | 'count' | 'other' }> = {
  'gr':    { toBase: v => v,                    fromBase: v => v,                    group: 'mass' },
  'kg':    { toBase: v => v * 1000,             fromBase: v => v / 1000,             group: 'mass' },
  'ons':   { toBase: v => v * 100,              fromBase: v => v / 100,              group: 'mass' },
  'ml':    { toBase: v => v,                    fromBase: v => v,                    group: 'volume' },
  'liter': { toBase: v => v * 1000,             fromBase: v => v / 1000,             group: 'volume' },
  'pcs':   { toBase: v => v,                    fromBase: v => v,                    group: 'count' },
  'sdm':   { toBase: v => v * 15,               fromBase: v => v / 15,               group: 'volume' }, // 1 sdm ≈ 15 ml
  'sdt':   { toBase: v => v * 5,                fromBase: v => v / 5,                group: 'volume' }, // 1 sdt ≈ 5 ml
  'cup':   { toBase: v => v * 240,              fromBase: v => v / 240,              group: 'volume' }, // 1 cup ≈ 240 ml
  'bungkus': { toBase: v => v,                  fromBase: v => v,                    group: 'count' },
  'pack':  { toBase: v => v,                    fromBase: v => v,                    group: 'count' },
  'box':   { toBase: v => v,                    fromBase: v => v,                    group: 'count' },
  'krat':  { toBase: v => v,                    fromBase: v => v,                    group: 'count' },
  'ikat':  { toBase: v => v,                    fromBase: v => v,                    group: 'count' },
  'ekor':  { toBase: v => v,                    fromBase: v => v,                    group: 'count' },
};

/**
 * Konversi nilai antar satuan yang kompatibel (mass→mass, volume→volume, count→count).
 * Contoh: convertSatuan(2000, 'gr', 'kg') → 2
 */
export function convertSatuan(value: number, fromSatuan: string, toSatuan: string): number {
  const from = SATUAN_CONVERSIONS[fromSatuan];
  const to = SATUAN_CONVERSIONS[toSatuan];
  if (!from || !to) return value; // unknown unit, return as-is
  if (from.group !== to.group) return value; // incompatible groups
  const baseValue = from.toBase(value);
  return to.fromBase(baseValue);
}

/**
 * Dapatkan satuan terbaik untuk display (otomatis: gram→kg jika >=1000, ml→liter jika >=1000)
 */
export function getBestSatuan(satuan: string, value: number): { satuan: string; displayValue: number } {
  if ((satuan === 'gr' || satuan === 'grams') && value >= 1000) {
    return { satuan: 'kg', displayValue: value / 1000 };
  }
  if ((satuan === 'ml') && value >= 1000) {
    return { satuan: 'liter', displayValue: value / 1000 };
  }
  return { satuan, displayValue: value };
}

/**
 * Format nilai dengan satuan yang optimal (contoh: 1500 gr → "1.5 kg")
 */
export function formatWithSatuan(value: number, satuan: string): string {
  const { satuan: bestSat, displayValue } = getBestSatuan(satuan, value);
  const formatted = displayValue % 1 === 0 ? displayValue.toFixed(0) : displayValue.toFixed(1);
  return `${formatted} ${bestSat}`;
}

// ─── SALES VELOCITY — Average Daily Sales per product per branch ───
// Membaca dari localStorage revenue_tracker_data untuk menghitung kecepatan penjualan
// Digunakan oleh FEFO & Smart Distribution untuk rekomendasi distribusi batch

export interface SalesVelocityEntry {
  productName: string;
  cabangId: string;
  cabangNama: string;
  dailySales: number;
  daysOfData: number;
  totalSold: number;
}

/**
 * Hitung Average Daily Sales (ADS) per produk per cabang dari revenue_tracker_data
 * @param daysLookback — jumlah hari ke belakang untuk kalkulasi (default 14)
 * @returns Map<productName, Map<cabangId, SalesVelocityEntry>>
 */
export function calculateADS(daysLookback: number = 14): Map<string, Map<string, SalesVelocityEntry>> {
  const result = new Map<string, Map<string, SalesVelocityEntry>>();
  
  try {
    const raw = localStorage.getItem('revenue_tracker_data');
    if (!raw) return result;
    const data = JSON.parse(raw);
    const transactions: any[] = data.transactions || [];
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysLookback);
    
    // Group sold qty by (productName, source -> cabangId)
    const salesMap = new Map<string, Map<string, { totalQty: number; dateSet: Set<string> }>>();
    
    transactions.forEach((tx: any) => {
      if (!tx.date || !tx.product || !tx.qty) return;
      const txDate = new Date(tx.date);
      if (txDate < cutoff) return;
      
      const productKey = tx.product.toLowerCase().trim();
      const source = tx.source || 'Walk-In POS';
      // Parse cabangId dari source
      let cabangKey = 'pusat';
      let cabangNama = 'Pusat';
      if (source.includes('Cabang')) {
        cabangKey = source.replace('POS Cabang - ', '').trim().toLowerCase().replace(/\s+/g, '-');
        cabangNama = source.replace('POS Cabang - ', '').trim();
      }
      
      if (!salesMap.has(productKey)) {
        salesMap.set(productKey, new Map());
      }
      const cabangMap = salesMap.get(productKey)!;
      if (!cabangMap.has(cabangKey)) {
        cabangMap.set(cabangKey, { totalQty: 0, dateSet: new Set() });
      }
      const entry = cabangMap.get(cabangKey)!;
      entry.totalQty += tx.qty;
      entry.dateSet.add(tx.date);
    });
    
    // Convert to result format
    salesMap.forEach((cabangMap, productKey) => {
      const productMap = new Map<string, SalesVelocityEntry>();
      cabangMap.forEach((entry, cabangKey) => {
        const daysActive = Math.max(1, entry.dateSet.size);
        productMap.set(cabangKey, {
          productName: productKey,
          cabangId: cabangKey,
          cabangNama: cabangKey === 'pusat' ? 'Pusat' : cabangKey,
          dailySales: entry.totalQty / daysActive,
          daysOfData: daysActive,
          totalSold: entry.totalQty,
        });
      });
      result.set(productKey, productMap);
    });
  } catch (e) {
    console.warn('Failed to calculate ADS:', e);
  }
  
  return result;
}

/**
 * Hitung ADS untuk bahan baku tertentu (aggregate dari semua produk yang menggunakan bahan tersebut)
 */
export function calculateBahanADS(
  bahanNama: string,
  detailResep: { namaProduk: string; namaBahan: string; takaran: number }[],
  daysLookback: number = 14
): Map<string, { cabangId: string; cabangNama: string; dailyConsumption: number; totalUsed: number }> {
  const productADS = calculateADS(daysLookback);
  const result = new Map<string, { cabangId: string; cabangNama: string; dailyConsumption: number; totalUsed: number }>();
  
  // Cari semua produk yang menggunakan bahan ini
  const relatedProducts = detailResep.filter(
    r => r.namaBahan.toLowerCase().trim() === bahanNama.toLowerCase().trim()
  );
  
  if (relatedProducts.length === 0) return result;
  
  // Sum konsumsi per cabang
  productADS.forEach((cabangMap, productKey) => {
    cabangMap.forEach((entry) => {
      const relatedProd = relatedProducts.find(
        r => r.namaProduk.toLowerCase().trim() === productKey
      );
      if (!relatedProd) return;
      
      const key = entry.cabangId;
      const existing = result.get(key);
      const dailyConsumption = entry.dailySales * (relatedProd.takaran / 1000);
      
      if (existing) {
        result.set(key, {
          ...existing,
          dailyConsumption: existing.dailyConsumption + dailyConsumption,
          totalUsed: existing.totalUsed + entry.totalSold * (relatedProd.takaran / 1000),
        });
      } else {
        result.set(key, {
          cabangId: entry.cabangId,
          cabangNama: entry.cabangNama,
          dailyConsumption,
          totalUsed: entry.totalSold * (relatedProd.takaran / 1000),
        });
      }
    });
  });
  
  return result;
}

// ─── OVERHEAD DIHAPUS ───
// Biaya overhead (tenaga kerja, utilitas, kemasan) tidak lagi ditambahkan ke HPP.
// Sudah ditangani secara terpisah di modul Anggaran & Alokasi (AnggaranAlokasiTab).
// HPP sekarang = Biaya Bahan murni.

export function calculateAllProducts(
  bahanBaku: BahanBaku[],
  productHpp: ProductHpp[],
  detailResep: DetailResep[]
): CalculationResult[] {
  // Create quick lookup map for materials
  const bahanMap = new Map<string, BahanBaku>();
  bahanBaku.forEach((b) => {
    bahanMap.set(b.nama.toLowerCase().trim(), b);
  });

  return productHpp.map((product) => {
    const productDetailRows = detailResep.filter(
      (r) => r.namaProduk.toLowerCase().trim() === product.namaProduk.toLowerCase().trim()
    );

    let biayaBahanTotal = 0;
    const bahanListMapped = productDetailRows.map((detail) => {
      const material = bahanMap.get(detail.namaBahan.toLowerCase().trim());
      const hargaSatuan = material ? material.hargaSatuan : 0;
      // 🔧 Normalisasi satuan: takaran resep dalam gram, konversi ke satuan material
      const materialSatuan = material?.satuan || 'gr';
      const conv = SATUAN_CONVERSIONS[materialSatuan];
      const takaranInMaterialUnit = conv?.group === 'mass'
        ? convertSatuan(detail.takaran, 'gr', materialSatuan)
        : detail.takaran;
      const totalBiayaBahan = takaranInMaterialUnit * hargaSatuan;
      biayaBahanTotal += totalBiayaBahan;

      return {
        namaBahan: detail.namaBahan,
        takaran: detail.takaran,
        satuan: material ? material.satuan : 'gr',
        hargaBeli: material ? material.hargaBeli : 0,
        isiKemasan: material ? material.isiKemasan : 1,
        hargaSatuan,
        totalBiayaBahan,
      };
    });

    // ─── HPP LENGKAP ───
    // HPP = Biaya Bahan murni (tanpa overhead)
    // Overhead ditangani terpisah di modul Anggaran & Alokasi
    // Waste % — shrinkage factor untuk bisnis bakery (misal: adonan nempel, tumpah, over-proof)
    const wastePct = product.wastePercent || 0;
    const wasteMultiplier = 1 / (1 - Math.min(wastePct, 50) / 100); // Cap at 50% max
    
    const biayaOverhead = 0;
    const biayaTenagaKerja = 0;
    const biayaUtilitas = 0;
    const biayaKemasan = 0;
    
    const hppBeforeWaste = biayaBahanTotal;
    const hppTotalResep = biayaBahanTotal * wasteMultiplier; // Biaya bahan + waste/shrinkage
    const hppPerPorsi = hppTotalResep / (product.porsiJual || 1);
    const hargaJualPerPorsi = product.hargaJual / (product.porsiJual || 1);
    const profitPerPorsi = hargaJualPerPorsi - hppPerPorsi;
    const marginPersen = hargaJualPerPorsi > 0 ? (profitPerPorsi / hargaJualPerPorsi) * 100 : 0;

    return {
      namaProduk: product.namaProduk,
      porsiJual: product.porsiJual,
      hargaJual: product.hargaJual,
      biayaBahanTotal,
      hppTotalResep,
      hppPerPorsi,
      hargaJualPerPorsi,
      profitPerPorsi,
      marginPersen,
      wastePercent: wastePct,
      hppBeforeWaste,
      biayaOverhead,
      biayaTenagaKerja,
      biayaUtilitas,
      biayaKemasan,
      bahanList: bahanListMapped,
    };
  });
}
