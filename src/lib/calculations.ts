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
      const totalBiayaBahan = detail.takaran * hargaSatuan;
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

    const hppTotalResep = biayaBahanTotal; // HPP = biaya bahan saja (tanpa overhead)
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
      bahanList: bahanListMapped,
    };
  });
}
