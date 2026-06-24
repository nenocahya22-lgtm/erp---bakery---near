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
  'karung': { toBase: v => v,                   fromBase: v => v,                    group: 'count' },
  'dus':   { toBase: v => v,                    fromBase: v => v,                    group: 'count' },
};

/**
 * Konversi nilai antar satuan yang kompatibel (mass→mass, volume→volume, count→count).
 * Contoh: convertSatuan(2000, 'gr', 'kg') → 2
 * 
 * Untuk satuan count (pcs/bungkus/dll): nilai takaran resep HARUS dalam satuan yang sama
 * dengan satuan material. Sistem TIDAK bisa otomatis konversi gr → pcs karena
 * berat per pcs berbeda tiap bahan. Contoh: 1 telur = 50gr, 1 plastik = 2gr.
 * Jika Anda memasukkan takaran 200gr telur, dan satuan material adalah 'pcs',
 * sistem akan menganggap 200 pcs — ini SALAH.
 * Solusi: Ubah satuan material ke 'gr' atau masukkan takaran dalam 'pcs'.
 */
export function convertSatuan(value: number, fromSatuan: string, toSatuan: string, warnIncompatible: boolean = false): number {
  const from = SATUAN_CONVERSIONS[fromSatuan];
  const to = SATUAN_CONVERSIONS[toSatuan];
  if (!from || !to) return value;
  if (from.group !== to.group) {
    if (warnIncompatible) {
      console.warn(`⚠️ Konversi satuan tidak kompatibel: ${fromSatuan} (${from.group}) → ${toSatuan} (${to.group}). Nilai digunakan apa adanya.`);
    }
    return value;
  }
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
        // Konsumsi harian = ADS × takaran per resep (dalam satuan takaran resep)
        const dailyConsumption = entry.dailySales * relatedProd.takaran;
      
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

/**
 * Hitung HPP untuk varian tertentu — override takaran bahan jika varian punya ingredients sendiri
 * ⚠️ Harus konsisten dengan calculateAllProducts: waste multiplier diterapkan juga di sini!
 */
function calculateVariantHPP(
  variant: { name: string; porsi: number; ingredients?: { namaBahan: string; takaran: number }[] },
  baseProductName: string,
  baseDetails: DetailResep[],
  bahanMap: Map<string, BahanBaku>,
  wastePercent: number = 0
): { biayaBahanTotal: number; bahanList: any[]; hppTotal: number; hppPerPorsi: number; warnings?: string[] } {
  // Gunakan ingredients varian jika ada, fallback ke resep dasar
  const variantDetails = variant.ingredients && variant.ingredients.length > 0
    ? variant.ingredients.map(ing => ({
        namaProduk: baseProductName,
        namaBahan: ing.namaBahan,
        takaran: ing.takaran,
      }))
    : baseDetails;

  let biayaBahanTotal = 0;
  const variantWarnings: string[] = [];
  const bahanListMapped = variantDetails.map((detail) => {
    const material = bahanMap.get(detail.namaBahan.toLowerCase().trim());
    const hargaSatuan = material ? (material.hargaSatuanReal > 0 ? material.hargaSatuanReal : material.hargaSatuan) : 0;
    // Normalisasi satuan (sama seperti calculateAllProducts)
    const materialSatuan = material?.satuan || 'gr';
    const conv = SATUAN_CONVERSIONS[materialSatuan];
    let takaranEffective: number;
    if (conv?.group === 'mass') {
      takaranEffective = convertSatuan(detail.takaran, 'gr', materialSatuan, true);
    } else if (conv?.group === 'volume') {
      takaranEffective = convertSatuan(detail.takaran, 'ml', materialSatuan, true);
    } else if (conv?.group === 'count' && material?.konversiGram && material.konversiGram > 0) {
      takaranEffective = detail.takaran / material.konversiGram;
    } else {
      if (materialSatuan && !['gr','kg','ons','ml','liter'].includes(materialSatuan)) {
        variantWarnings.push(`⚠️ Konversi: Bahan "${detail.namaBahan}" dalam satuan "${materialSatuan}" — pastikan takaran resep (${detail.takaran}) sudah dalam satuan yang sama.`);
      }
      takaranEffective = detail.takaran;
    }
    const totalBiayaBahan = Math.round((takaranEffective * hargaSatuan) * 100) / 100;
    biayaBahanTotal += totalBiayaBahan;

    return {
      namaBahan: detail.namaBahan,
      takaran: detail.takaran,
      satuan: material ? material.satuan : 'gr',
      hargaBeli: material ? (material.hargaBeliReal > 0 ? material.hargaBeliReal : material.hargaBeli) : 0,
      isiKemasan: material ? material.isiKemasan : 1,
      hargaSatuan,
      totalBiayaBahan,
    };
  });

  // 🔥 Terapkan waste multiplier — KONSISTEN dengan calculateAllProducts!
  // Sebelumnya BUG: varian tidak pakai waste multiplier, sehingga HPP varian
  // selalu lebih rendah dari produk dasar. Sekarang diperbaiki.
  const wasteMultiplier = 1 / (1 - Math.min(wastePercent, 50) / 100);
  const hppTotalAfterWaste = Math.round((biayaBahanTotal * wasteMultiplier) * 100) / 100;

  const variantPorsi = variant.porsi || 1;
  return {
    biayaBahanTotal: Math.round(biayaBahanTotal * 100) / 100,
    bahanList: bahanListMapped,
    hppTotal: hppTotalAfterWaste,
    hppPerPorsi: Math.round((hppTotalAfterWaste / variantPorsi) * 100) / 100,
    warnings: variantWarnings.length > 0 ? variantWarnings : undefined,
  };
}

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
    const productWarnings: string[] = [];
    const bahanListMapped = productDetailRows.map((detail) => {
      const material = bahanMap.get(detail.namaBahan.toLowerCase().trim());
      const hargaSatuan = material ? (material.hargaSatuanReal > 0 ? material.hargaSatuanReal : material.hargaSatuan) : 0;
      // 🔧 Normalisasi satuan — tentukan asal satuan takaran berdasarkan grup material:
      // - Mass (gr/kg/ons) → takaran diasumsikan dalam gram, konversi ke satuan material
      // - Volume (ml/liter) → takaran diasumsikan dalam ml, konversi ke satuan material
      // - Count (pcs/pack/dll) → takaran HARUS dalam satuan material (tidak ada otomatis)
      const materialSatuan = material?.satuan || 'gr';
      const conv = SATUAN_CONVERSIONS[materialSatuan];
      let takaranInMaterialUnit: number;
      if (conv?.group === 'mass') {
        takaranInMaterialUnit = convertSatuan(detail.takaran, 'gr', materialSatuan, true);
      } else if (conv?.group === 'volume') {
        takaranInMaterialUnit = convertSatuan(detail.takaran, 'ml', materialSatuan, true);
      } else if (conv?.group === 'count' && material?.konversiGram && material.konversiGram > 0) {
        takaranInMaterialUnit = detail.takaran / material.konversiGram;
        productWarnings.push(`ℹ️ Konversi: Bahan "${detail.namaBahan}" (${materialSatuan}) — resep ${detail.takaran}gr ÷ ${material.konversiGram}gr/${materialSatuan} = ${takaranInMaterialUnit.toFixed(2)} ${materialSatuan}`);
      } else {
        if (materialSatuan && !['gr','kg','ons','ml','liter'].includes(materialSatuan)) {
          productWarnings.push(`⚠️ Konversi: Bahan "${detail.namaBahan}" dalam satuan "${materialSatuan}" — pastikan takaran resep (${detail.takaran}) sudah dalam satuan yang sama.`);
        }
        takaranInMaterialUnit = detail.takaran;
      }
      const totalBiayaBahan = Math.round((takaranInMaterialUnit * hargaSatuan) * 100) / 100;
      biayaBahanTotal += totalBiayaBahan;

      return {
        namaBahan: detail.namaBahan,
        takaran: detail.takaran,
        satuan: material ? material.satuan : 'gr',
        hargaBeli: material ? (material.hargaBeliReal > 0 ? material.hargaBeliReal : material.hargaBeli) : 0,
        isiKemasan: material ? material.isiKemasan : 1,
        hargaSatuan,
        totalBiayaBahan,
      };
    });

    // ─── VALIDASI: Beri warning kalau harga jual = 0 ───
    if ((product.hargaJual || 0) <= 0) {
      productWarnings.push(`⚠️ Harga jual produk "${product.namaProduk}" belum diisi! HPP tidak bisa dihitung.`);
    }

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
    const hppTotalResep = Math.round((biayaBahanTotal * wasteMultiplier) * 100) / 100;
    const hppPerPorsi = Math.round((hppTotalResep / (product.porsiJual || 1)) * 100) / 100;
    const hargaJualPerPorsi = Math.round((product.hargaJual / (product.porsiJual || 1)) * 100) / 100;
    const profitPerPorsi = Math.round((hargaJualPerPorsi - hppPerPorsi) * 100) / 100;
    const marginPersen = hargaJualPerPorsi > 0 ? Math.round(((profitPerPorsi / hargaJualPerPorsi) * 100) * 100) / 100 : 0;

    // ─── HITUNG VARIAN jika ada ───
    const variantResults = (product.variants || [])
      .filter(v => v.active !== false)
      .map(v => {
        const vHpp = calculateVariantHPP(v, product.namaProduk, productDetailRows, bahanMap, wastePct);
        if (vHpp.warnings) {
          productWarnings.push(...vHpp.warnings);
        }
        return {
          id: v.id,
          name: v.name,
          porsi: v.porsi,
          hargaJual: v.hargaJual || 0,
          biayaBahanTotal: vHpp.biayaBahanTotal,
          hppTotal: vHpp.hppTotal,
          hppPerPorsi: vHpp.hppPerPorsi,
          bahanList: vHpp.bahanList,
        };
      });

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
      variants: variantResults,
      warnings: productWarnings.length > 0 ? productWarnings : undefined,
    };
  });
}
