import { BahanBaku, ProductHpp, DetailResep, CalculationResult } from '../types';

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
