import React, { useState, useEffect } from 'react';
import { ProductTopping, BahanBaku, ProductHpp, SATUAN_OPTIONS } from '../types';
import { Plus, Trash2, Coins, Tag, AlertTriangle, Search } from 'lucide-react';

interface Props {
  toppings: ProductTopping[];
  productHpp: ProductHpp[];
  bahanBaku: BahanBaku[];
  onAddTopping: (t: ProductTopping) => void;
  onDeleteTopping: (id: string) => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

export default function ToppingsTab({ toppings, productHpp, bahanBaku, onAddTopping, onDeleteTopping }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState<string>('semua');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [selectedProduk, setSelectedProduk] = useState('');
  const [toppingName, setToppingName] = useState('');
  const [selectedBahan, setSelectedBahan] = useState('');
  const [takaran, setTakaran] = useState('');
  const [satuan, setSatuan] = useState('gr');
  const [hargaJual, setHargaJual] = useState('');

  const bahanMap = new Map<string, BahanBaku>();
  bahanBaku.forEach(b => bahanMap.set(b.nama.toLowerCase().trim(), b));

  // Filter toppings
  const filteredToppings = toppings.filter(t => {
    if (productFilter !== 'semua' && t.namaProduk.toLowerCase().trim() !== productFilter.toLowerCase().trim()) return false;
    if (searchQuery && !t.namaTopping.toLowerCase().includes(searchQuery.toLowerCase()) && !t.namaBahan.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Auto-fill harga jual when bahan + takaran changes
  useEffect(() => {
    if (selectedBahan && takaran) {
      const raw = bahanMap.get(selectedBahan.toLowerCase().trim());
      if (raw) {
        const qty = parseFloat(takaran) || 0;
        const hppCalc = Math.round(qty * raw.hargaSatuan);
        setHargaJual(hppCalc.toString());
      }
    }
  }, [selectedBahan, takaran, bahanBaku]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBahan || !toppingName.trim() || !takaran) return;

    const raw = bahanMap.get(selectedBahan.toLowerCase().trim());
    if (!raw) return;

    const qty = parseFloat(takaran) || 0;
    if (qty <= 0) return;

    const newTp: ProductTopping = {
      id: Math.random().toString(36).substring(2, 9),
      namaProduk: selectedProduk || 'Semua Produk',
      namaTopping: toppingName.trim(),
      namaBahan: selectedBahan,
      takaran: qty,
      hargaBeli: raw.hargaBeli,
      isiKemasan: raw.isiKemasan,
      satuan,
      hargaSatuan: raw.hargaSatuan,
      hargaJualTopping: Math.round(qty * raw.hargaSatuan),
    };

    onAddTopping(newTp);
    // Reset form
    setSelectedBahan('');
    setToppingName('');
    setTakaran('');
    setSatuan('gr');
    setHargaJual('');
    setShowAddForm(false);
  };

  const totalToppingValue = toppings.reduce((sum, t) => sum + t.hargaJualTopping, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Coins className="w-6 h-6 text-indigo-600" />
            Manajemen Add-on / Topping
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Kelola semua opsi topping & add-on secara terpusat — tidak terikat per resep, hindari dobel hitung di POS
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tambah Topping
        </button>
      </div>

      {/* STATS BAR */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500 flex-wrap">
        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold">
          {toppings.length} Topping Terdaftar
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold">
          Total Nilai: {formatCurrency(totalToppingValue)}
        </span>
        <span className="text-gray-300">|</span>
        <span>{productHpp.length} Produk dapat dikaitkan</span>
      </div>

      {/* FILTER + SEARCH */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari topping..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all bg-white"
          />
        </div>
        <select
          value={productFilter}
          onChange={e => setProductFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white font-medium"
        >
          <option value="semua">Semua Produk</option>
          {productHpp.map(p => (
            <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk}</option>
          ))}
        </select>
      </div>

      {/* ADD FORM MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Tambah Topping Baru
              </h3>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nama Topping</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ekstra Keju, Choco Chip, Selai Strawberry"
                    value={toppingName}
                    onChange={e => setToppingName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Produk Terkait (opsional)</label>
                  <select
                    value={selectedProduk}
                    onChange={e => setSelectedProduk(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white"
                  >
                    <option value="">Semua Produk (global)</option>
                    {productHpp.map(p => (
                      <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk}</option>
                    ))}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-1">Kosongkan jika topping tersedia untuk semua produk</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Bahan Baku</label>
                  <select
                    required
                    value={selectedBahan}
                    onChange={e => {
                      setSelectedBahan(e.target.value);
                      setToppingName(`Topping ${e.target.value}`);
                      const raw = bahanMap.get(e.target.value.toLowerCase().trim());
                      if (raw) setSatuan(raw.satuan);
                    }}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white"
                  >
                    <option value="">-- Pilih Bahan --</option>
                    {bahanBaku.map(b => (
                      <option key={b.nama} value={b.nama}>{b.nama} ({formatCurrency(b.hargaSatuan)}/{b.satuan})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Takaran</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      placeholder="15"
                      value={takaran}
                      onChange={e => setTakaran(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <select value={satuan} onChange={e => setSatuan(e.target.value)}
                      className="w-16 text-[10px] border border-gray-200 rounded-xl px-2 font-bold bg-white text-center">
                      {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    readOnly
                    value={hargaJual}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-100 font-mono font-bold text-indigo-700"
                    placeholder="Otomatis dari bahan"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">Otomatis: takaran × harga satuan bahan</p>
                </div>
              </div>
              <button type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
                <Plus className="w-4 h-4 inline mr-1" /> Simpan Topping
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TOPPINGS TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredToppings.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-bold">
              {toppings.length === 0 ? 'Belum ada topping. Klik "Tambah Topping" untuk mulai.' : 'Tidak ada topping yang cocok dengan filter.'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-900 text-[10px] font-bold uppercase text-white">
                <th className="px-4 py-3">Nama Topping</th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">Bahan</th>
                <th className="px-4 py-3 text-right">Takaran</th>
                <th className="px-4 py-3 text-center">Satuan</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredToppings.map(t => (
                <tr key={t.id} className="hover:bg-indigo-50/20 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-800">{t.namaTopping}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {t.namaProduk === 'Semua Produk' ? '🌐 Global' : t.namaProduk}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.namaBahan}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">{t.takaran}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-500">{t.satuan}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-indigo-700">{formatCurrency(t.hargaJualTopping)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus topping "${t.namaTopping}"?`)) onDeleteTopping(t.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* INFO CARD */}
      <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Mengapa Topping Dipisah?</h4>
            <p className="text-[10px] text-amber-800 mt-1 leading-relaxed">
              Dengan memisahkan manajemen add-on/topping dari resep, Anda menghindari <strong>double counting</strong> 
              saat transaksi di POS. Topping tidak lagi masuk ke perhitungan HPP menu — topping adalah item terpisah 
              yang ditambahkan saat kasir, sehingga harga jualnya murni tambahan, bukan bagian dari harga menu.
            </p>
            <p className="text-[10px] text-amber-800 mt-1 leading-relaxed">
              Atur margin harga jual topping di sini. Nilai otomatis dari <strong>takaran × harga satuan bahan</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
