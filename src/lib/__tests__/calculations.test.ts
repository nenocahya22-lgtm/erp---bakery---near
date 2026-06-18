import { describe, it, expect } from 'vitest';
import {
  convertSatuan,
  getBestSatuan,
  formatWithSatuan,
  calculateAllProducts,
} from '../calculations';
import type { BahanBaku, ProductHpp, DetailResep } from '../../types';

describe('convertSatuan', () => {
  it('mengkonversi gram ke kilogram', () => {
    expect(convertSatuan(2000, 'gr', 'kg')).toBe(2);
  });

  it('mengkonversi kilogram ke gram', () => {
    expect(convertSatuan(1.5, 'kg', 'gr')).toBe(1500);
  });

  it('mengkonversi ml ke liter', () => {
    expect(convertSatuan(3000, 'ml', 'liter')).toBe(3);
  });

  it('mengembalikan nilai asli untuk satuan yang tidak dikenal', () => {
    expect(convertSatuan(10, 'xyz', 'abc')).toBe(10);
  });

  it('mengembalikan nilai asli untuk grup satuan berbeda', () => {
    // Mass → Volume tidak kompatibel
    expect(convertSatuan(100, 'gr', 'ml')).toBe(100);
  });

  it('mengkonversi ons ke gram', () => {
    expect(convertSatuan(2, 'ons', 'gr')).toBe(200);
  });

  it('mengkonversi liter ke ml', () => {
    expect(convertSatuan(0.5, 'liter', 'ml')).toBe(500);
  });
});

describe('getBestSatuan', () => {
  it('mengkonversi gram ke kg jika >= 1000', () => {
    const result = getBestSatuan('gr', 1500);
    expect(result.satuan).toBe('kg');
    expect(result.displayValue).toBe(1.5);
  });

  it('tetap gram jika < 1000', () => {
    const result = getBestSatuan('gr', 500);
    expect(result.satuan).toBe('gr');
    expect(result.displayValue).toBe(500);
  });

  it('mengkonversi ml ke liter jika >= 1000', () => {
    const result = getBestSatuan('ml', 2000);
    expect(result.satuan).toBe('liter');
    expect(result.displayValue).toBe(2);
  });

  it('tidak mengkonversi satuan non-mass/volume', () => {
    const result = getBestSatuan('pcs', 100);
    expect(result.satuan).toBe('pcs');
    expect(result.displayValue).toBe(100);
  });
});

describe('formatWithSatuan', () => {
  it('memformat dengan satuan optimal', () => {
    expect(formatWithSatuan(1500, 'gr')).toBe('1.5 kg');
  });

  it('memformat nilai kecil tanpa konversi', () => {
    expect(formatWithSatuan(300, 'gr')).toBe('300 gr');
  });
});

describe('calculateAllProducts', () => {
  const bahanBaku: BahanBaku[] = [
    {
      nama: 'Tepung Terigu',
      satuan: 'gr',
      hargaBeli: 12000,
      isiKemasan: 1000,
      stok: 1000,
      hargaSatuan: 12,
      hargaBeliReal: 12000,
      hargaSatuanReal: 12,
      markupPercent: 0,
    },
    {
      nama: 'Mentega',
      satuan: 'gr',
      hargaBeli: 15000,
      isiKemasan: 500,
      stok: 500,
      hargaSatuan: 30,
      hargaBeliReal: 15000,
      hargaSatuanReal: 30,
      markupPercent: 0,
    },
  ];

  const productHpp: ProductHpp[] = [
    {
      namaProduk: 'Roti Tawar',
      porsiJual: 12,
      hargaJual: 36000,
      kategori: 'Roti',
      status: 'published',
    },
  ];

  const detailResep: DetailResep[] = [
    { namaProduk: 'Roti Tawar', namaBahan: 'Tepung Terigu', takaran: 500 },
    { namaProduk: 'Roti Tawar', namaBahan: 'Mentega', takaran: 100 },
  ];

  it('menghitung HPP produk dengan benar', () => {
    const results = calculateAllProducts(bahanBaku, productHpp, detailResep);
    expect(results).toHaveLength(1);

    const roti = results[0];
    expect(roti.namaProduk).toBe('Roti Tawar');
    expect(roti.porsiJual).toBe(12);
    expect(roti.bahanList).toHaveLength(2);

    // Tepung: 500gr × Rp12 = 6000
    // Mentega: 100gr × Rp30 = 3000
    // Total bahan: 9000
    expect(roti.biayaBahanTotal).toBe(9000);
    expect(roti.hppTotalResep).toBe(9000); // waste 0%
    expect(roti.hppPerPorsi).toBe(750); // 9000 / 12
  });

  it('menghitung margin dengan benar', () => {
    const results = calculateAllProducts(bahanBaku, productHpp, detailResep);
    const roti = results[0];

    // Harga jual: 36000 / 12 = 3000 per porsi
    // HPP: 750 per porsi
    // Profit: 3000 - 750 = 2250
    // Margin: 2250 / 3000 = 75%
    expect(roti.hargaJualPerPorsi).toBe(3000);
    expect(roti.profitPerPorsi).toBe(2250);
    expect(roti.marginPersen).toBe(75);
  });

  it('menerapkan waste percent jika ada', () => {
    const productWithWaste: ProductHpp[] = [
      {
        namaProduk: 'Croissant',
        porsiJual: 10,
        hargaJual: 50000,
        wastePercent: 10,
        status: 'published',
      },
    ];

    const resepCroissant: DetailResep[] = [
      { namaProduk: 'Croissant', namaBahan: 'Tepung Terigu', takaran: 300 },
      { namaProduk: 'Croissant', namaBahan: 'Mentega', takaran: 200 },
    ];

    const results = calculateAllProducts(bahanBaku, productWithWaste, resepCroissant);
    const croissant = results[0];

    // Tepung: 300 × 12 = 3600
    // Mentega: 200 × 30 = 6000
    // Total: 9600
    // Waste 10%: 9600 / (1 - 10/100) = 9600 / 0.9 = 10666.67
    expect(croissant.biayaBahanTotal).toBe(9600);
    expect(croissant.hppTotalResep).toBeCloseTo(10666.67, 0);
    expect(croissant.wastePercent).toBe(10);
    expect(croissant.hppBeforeWaste).toBe(9600);
  });

  it('mengembalikan array kosong jika tidak ada produk', () => {
    const results = calculateAllProducts(bahanBaku, [], detailResep);
    expect(results).toHaveLength(0);
  });

  it('menangani produk tanpa bahan dengan grace', () => {
    const produkTanpaResep: ProductHpp[] = [
      {
        namaProduk: 'Produk Baru',
        porsiJual: 1,
        hargaJual: 10000,
        status: 'draft',
      },
    ];

    const results = calculateAllProducts(bahanBaku, produkTanpaResep, []);
    expect(results).toHaveLength(1);
    expect(results[0].biayaBahanTotal).toBe(0);
    expect(results[0].bahanList).toHaveLength(0);
  });
});
