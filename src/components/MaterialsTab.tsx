import React, { useState } from 'react';
import { BahanBaku } from '../types';
import { Plus, Search, Edit2, Trash2, X, Package, Calculator, Info } from 'lucide-react';

interface MaterialsTabProps {
  bahanBaku: BahanBaku[];
  onAddMaterial: (material: BahanBaku) => void;
  onEditMaterial: (oldName: string, material: BahanBaku) => void;
  onDeleteMaterial: (name: string) => void;
}

export default function MaterialsTab({
  bahanBaku,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
}: MaterialsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<BahanBaku | null>(null);
  // Form State
  const [nama, setNama] = useState('');
  const [satuan, setSatuan] = useState('gr');
  const [hargaBeliReal, setHargaBeliReal] = useState('');
  const [markupPercent, setMarkupPercent] = useState('0');
  const [hargaBeli, setHargaBeli] = useState(''); // This acts as the effective markup package price
  const [isiKemasan, setIsiKemasan] = useState('1000');

  const filteredMaterials = bahanBaku.filter((b) =>
    b.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditingMaterial(null);
    setNama('');
    setSatuan('gr');
    setHargaBeliReal('');
    setMarkupPercent('0');
    setHargaBeli('');
    setIsiKemasan('1000');
    setShowModal(true);
  };

  const openEditModal = (b: BahanBaku) => {
    setEditingMaterial(b);
    setNama(b.nama);
    setSatuan(b.satuan);
    const realPrice = b.hargaBeliReal !== undefined ? b.hargaBeliReal : b.hargaBeli;
    setHargaBeliReal(String(realPrice));
    setMarkupPercent(String(b.markupPercent || 0));
    setHargaBeli(String(b.hargaBeli));
    setIsiKemasan(String(b.isiKemasan));
    setShowModal(true);
  };

  const handleRealPriceChange = (val: string) => {
    setHargaBeliReal(val);
    const priceReal = parseFloat(val) || 0;
    const pct = parseFloat(markupPercent) || 0;
    const finalPrice = Math.round(priceReal * (1 + pct / 100));
    setHargaBeli(String(finalPrice));
  };

  const handleMarkupPercentChange = (val: string) => {
    setMarkupPercent(val);
    const priceReal = parseFloat(hargaBeliReal) || 0;
    const pct = parseFloat(val) || 0;
    const finalPrice = Math.round(priceReal * (1 + pct / 100));
    setHargaBeli(String(finalPrice));
  };

  // Compute auto markup price for display (readOnly — auto-calculated from markup%)
  const autoMarkupPrice = (() => {
    const priceReal = parseFloat(hargaBeliReal) || 0;
    const pct = parseFloat(markupPercent) || 0;
    if (priceReal > 0) {
      return Math.round(priceReal * (1 + pct / 100));
    }
    return null;
  })();

  // Sync the hargaBeli state whenever autoMarkupPrice changes
  React.useEffect(() => {
    if (autoMarkupPrice !== null) {
      setHargaBeli(String(autoMarkupPrice));
    }
  }, [autoMarkupPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    const realPrice = parseFloat(hargaBeliReal) || 0;
    const price = parseFloat(hargaBeli) || realPrice; // fallback to real if markup is empty
    const qty = parseFloat(isiKemasan) || 1;
    const pct = parseFloat(markupPercent) || 0;

    const item: BahanBaku = {
      nama: nama.trim(),
      satuan: satuan.trim(),
      hargaBeli: price,
      isiKemasan: qty,
      hargaSatuan: price / (qty || 1),
      hargaBeliReal: realPrice,
      hargaSatuanReal: realPrice / (qty || 1),
      markupPercent: pct,
    };

    if (editingMaterial) {
      onEditMaterial(editingMaterial.nama, item);
    } else {
      onAddMaterial(item);
    }
    setShowModal(false);
  };

  const handleDelete = (name: string) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus bahan baku "${name}"? Tindakan ini dapat mempengaruhi harga produk yang menggunakan bahan ini.`
    );
    if (confirmDelete) {
      onDeleteMaterial(name);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div id="materials-container" className="space-y-6">
      {/* Tab Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bahan Baku & Harga Mark-Up</h2>
          <p className="text-xs text-gray-500 mt-1">
            Kelola data bahan mentah, tentukan harga real modal, lakukan mark-up instan, dan gunakan harga mark-up tersebut untuk perhitungan otomatis di menu resep.
          </p>
        </div>
        <button
          id="btn-add-material"
          onClick={openAddModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Bahan Baku
        </button>
      </div>

      {/* Grid search and table/cards */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="input-search-material"
              type="text"
              placeholder="Cari bahan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
            />
          </div>
          <div className="ml-auto text-xs text-gray-500 font-medium bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-150">
            Total Inventory: {bahanBaku.length} Item Terdata
          </div>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto stroke-1 mb-3" />
            <p className="text-sm text-gray-500 font-medium">Bahan baku tidak ditemukan</p>
            <p className="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci atau tambahkan bahan baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase bg-gray-50/50">
                  <th className="px-6 py-4">Nama Bahan</th>
                  <th className="px-6 py-4">Satuan & Isi</th>
                  <th className="px-6 py-4 text-right text-gray-500">Harga Beli Real</th>
                  <th className="px-6 py-4 text-center">Markup (%)</th>
                  <th className="px-6 py-4 text-right text-emerald-800 bg-emerald-50/20">Harga Setelah Markup</th>
                  <th className="px-6 py-4 text-right">Harga Unit Real</th>
                  <th className="px-6 py-4 text-right text-emerald-700 bg-emerald-50/30 font-bold">Harga Unit Markup (Resep)</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredMaterials.map((b, idx) => {
                  const realPrice = b.hargaBeliReal !== undefined ? b.hargaBeliReal : b.hargaBeli;
                  const realSatuanPrice = b.hargaSatuanReal !== undefined ? b.hargaSatuanReal : (realPrice / (b.isiKemasan || 1));
                  const mPercent = b.markupPercent !== undefined ? b.markupPercent : 0;
                  
                  return (
                    <tr key={idx} className="hover:bg-emerald-50/10 transition-colors">
                      <td className="px-6 py-4.5 font-semibold text-gray-900">{b.nama}</td>
                      <td className="px-6 py-4.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{b.isiKemasan} {b.satuan}</span>
                          <span className="text-[10px] text-gray-400 font-mono">1 Kemasan</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-right font-mono font-medium text-gray-500">
                        {formatCurrency(realPrice)}
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-sm text-xs font-bold font-mono ${
                          mPercent > 0 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          +{mPercent}%
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right font-mono font-bold bg-emerald-50/10 text-emerald-900">
                        {formatCurrency(b.hargaBeli)}
                      </td>
                      <td className="px-6 py-4.5 text-right font-mono text-xs text-gray-400">
                        {formatCurrency(realSatuanPrice)} <span className="text-[9px]">/{b.satuan}</span>
                      </td>
                      <td className="px-6 py-4.5 text-right text-emerald-700 font-extrabold font-mono bg-emerald-50/20">
                        {formatCurrency(b.hargaSatuan)} <span className="text-[10px] text-gray-500 font-medium">/{b.satuan}</span>
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(b)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(b.nama)}
                            className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card helper */}
      <div className="bg-emerald-50/45 border border-emerald-200/60 rounded-2xl p-5 flex gap-3 text-emerald-900 text-xs">
        <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sm block mb-1">🛡️ Alur Hitung HPP Otomatis Ter-Markup</span>
          <p className="text-emerald-800 leading-relaxed text-xs">
            Sistem menyimpan <span className="font-semibold underline">Harga Real</span> (harga beli asli dari supplier) dan <span className="font-semibold underline">Harga Markup</span>. 
            Harga per Bahan yang ter-markup ini akan dikirim secara langsung ke dalam <span className="font-semibold">Menu Resep</span> untuk menjamin bahwa perhitungan HPP dan target margin Anda selalu didasarkan pada harga pengamanan (markup), bukan harga modal mentah sehingga operasional Anda tetap untung!
          </p>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden transform transition-all">
            <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">
                {editingMaterial ? '🛡️ Ubah Bahan Baku & Markup' : '🛡️ Tambah Bahan Baku & Markup'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">
                  Nama Bahan Baku
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ragi, Terigu Segitiga, Gula Halus"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  disabled={!!editingMaterial} // Nama bertindak sebagai primary key agar tidak bentrok
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">
                    Satuan Terkecil
                  </label>
                  <select
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="gr">gram (gr)</option>
                    <option value="ml">mililiter (ml)</option>
                    <option value="pcs">pieces (pcs)</option>
                    <option value="butir">butir</option>
                    <option value="kg">kilogram (kg)</option>
                    <option value="liter">liter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">
                    Isi Per Kemasan
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="Contoh: 1000 atau 1"
                    value={isiKemasan}
                    onChange={(e) => setIsiKemasan(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100 space-y-3">
                <span className="block text-xs font-bold text-rose-900 uppercase">1. Biaya Beli Modal (Asli Supplier)</span>
                <div>
                  <label className="block text-[10px] font-semibold text-rose-850 mb-1">
                    HARGA BELI ASLI SUPPIER (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-rose-600 font-bold">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="Contoh: 10000"
                      value={hargaBeliReal}
                      onChange={(e) => handleRealPriceChange(e.target.value)}
                      className="w-full pl-9 text-sm border border-rose-250 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono text-rose-950 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                <span className="block text-xs font-bold text-emerald-900 uppercase">2. Aturan Mark-Up (Pengamanan Harga)</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-emerald-850 mb-1">
                      MARK-UP PERSEN (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={markupPercent}
                        onChange={(e) => handleMarkupPercentChange(e.target.value)}
                        className="w-full text-sm border border-emerald-250 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-emerald-950 font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-emerald-850 mb-1">
                      HARGA SESUDAH MARKUP (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-bold">Rp</span>
                      <input
                        type="number"
                        min="0"
                        readOnly
                        placeholder={autoMarkupPrice !== null ? String(autoMarkupPrice) : 'Isi markup% dulu'}
                        value={autoMarkupPrice !== null ? autoMarkupPrice : ''}
                        className="w-full pl-8 text-sm border border-emerald-250 rounded-xl px-3 py-2 bg-emerald-50/50 focus:outline-none font-mono text-emerald-950 font-extrabold cursor-not-allowed"
                      />
                      {autoMarkupPrice !== null && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-500 uppercase">Auto</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview Cost Calculation */}
              {parseFloat(hargaBeliReal) > 0 && parseFloat(isiKemasan) > 0 && (
                <div className="bg-emerald-900/5 p-3.5 rounded-xl border border-emerald-900/10 space-y-1.5 text-xs text-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-gray-600" /> Harga Real per {satuan}:
                    </span>
                    <span className="font-mono font-semibold text-rose-700">
                      {formatCurrency((parseFloat(hargaBeliReal) || 0) / (parseFloat(isiKemasan) || 1))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-150 pt-1.5">
                    <span className="font-bold text-emerald-900 flex items-center gap-1">
                      ⭐ Harga Markup per {satuan}:
                    </span>
                    <span className="font-mono font-extrabold text-emerald-700 text-sm">
                      {formatCurrency((parseFloat(hargaBeli) || 0) / (parseFloat(isiKemasan) || 1))}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all cursor-pointer font-bold"
                >
                  {editingMaterial ? 'Simpan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
