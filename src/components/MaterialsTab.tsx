import React, { useState } from 'react';
import { BahanBaku, Cabang, StockOpname } from '../types';
import { Plus, Search, Edit2, Trash2, X, Package, Calculator, Info, ClipboardCheck, Building2, Save } from 'lucide-react';

interface MaterialsTabProps {
  bahanBaku: BahanBaku[];
  cabangList: Cabang[];
  onAddMaterial: (material: BahanBaku) => void;
  onEditMaterial: (oldName: string, material: BahanBaku) => void;
  onDeleteMaterial: (name: string) => void;
}

export default function MaterialsTab({
  bahanBaku,
  cabangList,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
}: MaterialsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<BahanBaku | null>(null);
  const [activeSection, setActiveSection] = useState<'master' | 'opname'>('master');

  // Form State for CRUD
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('');
  const [satuan, setSatuan] = useState('gr');
  const [hargaBeliReal, setHargaBeliReal] = useState('');
  const [markupPercent, setMarkupPercent] = useState('0');
  const [hargaBeli, setHargaBeli] = useState('');
  const [isiKemasan, setIsiKemasan] = useState('1000');

  // ─── STOCK OPNAME STATE ───
  const [opnameData, setOpnameData] = useState<StockOpname[]>(() => {
    const saved = localStorage.getItem('stock_opname_data');
    return saved ? JSON.parse(saved) : [];
  });
  const [opnameCabang, setOpnameCabang] = useState('');
  const [opnamePetugas, setOpnamePetugas] = useState('');
  const [opnameForm, setOpnameForm] = useState<Record<string, {
    stokSatuan: number; packUtuh: number; packTerbuka: number; sisaPackBuka: number; catatan: string;
  }>>({});
  const [showOpnameModal, setShowOpnameModal] = useState(false);

  const saveOpname = (data: StockOpname[]) => {
    setOpnameData(data);
    localStorage.setItem('stock_opname_data', JSON.stringify(data));
  };

  const filteredMaterials = bahanBaku.filter((b) =>
    b.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditingMaterial(null);
    setNama(''); setKategori(''); setSatuan('gr');
    setHargaBeliReal(''); setMarkupPercent('0'); setHargaBeli('');
    setIsiKemasan('1000');
    setShowModal(true);
  };

  const openEditModal = (b: BahanBaku) => {
    setEditingMaterial(b);
    setNama(b.nama); setKategori(b.kategori || '');
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
    setHargaBeli(String(Math.round(priceReal * (1 + pct / 100))));
  };

  const handleMarkupPercentChange = (val: string) => {
    setMarkupPercent(val);
    const priceReal = parseFloat(hargaBeliReal) || 0;
    const pct = parseFloat(val) || 0;
    setHargaBeli(String(Math.round(priceReal * (1 + pct / 100))));
  };

  const autoMarkupPrice = (() => {
    const priceReal = parseFloat(hargaBeliReal) || 0;
    const pct = parseFloat(markupPercent) || 0;
    return priceReal > 0 ? Math.round(priceReal * (1 + pct / 100)) : null;
  })();

  React.useEffect(() => {
    if (autoMarkupPrice !== null) setHargaBeli(String(autoMarkupPrice));
  }, [autoMarkupPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    const realPrice = parseFloat(hargaBeliReal) || 0;
    const price = parseFloat(hargaBeli) || realPrice;
    const qty = parseFloat(isiKemasan) || 1;
    const pct = parseFloat(markupPercent) || 0;
    const nextIndex = bahanBaku.length;

    const item: BahanBaku = {
      kode: `BB-${String(nextIndex + 1).padStart(3, '0')}`,
      nama: nama.trim(),
      satuan: satuan.trim(),
      kategori: kategori.trim(),
      hargaBeli: price,
      isiKemasan: qty,
      hargaSatuan: price / (qty || 1),
      hargaBeliReal: realPrice,
      hargaSatuanReal: realPrice / (qty || 1),
      markupPercent: pct,
    };

    if (editingMaterial) onEditMaterial(editingMaterial.nama, item);
    else onAddMaterial(item);
    setShowModal(false);
  };

  const handleDelete = (name: string) => {
    if (window.confirm(`Hapus bahan "${name}"?`)) onDeleteMaterial(name);
  };

  // ─── OPNAME HANDLERS ───
  const openOpnameForm = (cabangId: string) => {
    const cabang = cabangList.find(c => c.id === cabangId);
    if (!cabang) return;
    setOpnameCabang(cabangId);
    setOpnamePetugas('');

    // Load existing opname data for this cabang
    const existing: Record<string, { stokSatuan: number; packUtuh: number; packTerbuka: number; sisaPackBuka: number; catatan: string }> = {};
    bahanBaku.forEach(b => {
      const last = opnameData
        .filter(o => o.bahanNama === b.nama && o.cabangId === cabangId)
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0];
      existing[b.nama] = {
        stokSatuan: last?.stokSatuan || 0,
        packUtuh: last?.packUtuh || 0,
        packTerbuka: last?.packTerbuka || 0,
        sisaPackBuka: last?.sisaPackBuka || 0,
        catatan: '',
      };
    });
    setOpnameForm(existing);
    setShowOpnameModal(true);
  };

  const handleSaveOpname = () => {
    if (!opnameCabang || !opnamePetugas.trim()) return;
    const cabang = cabangList.find(c => c.id === opnameCabang);
    if (!cabang) return;

    const newOpnames: StockOpname[] = [];
    Object.entries(opnameForm).forEach(([bahanNama, data]) => {
      if (data.stokSatuan > 0 || data.packUtuh > 0 || data.packTerbuka > 0) {
        newOpnames.push({
          id: `op-${Date.now()}-${bahanNama.replace(/\s/g, '-')}`,
          bahanNama,
          cabangId: opnameCabang,
          stokSatuan: data.stokSatuan,
          packUtuh: data.packUtuh,
          packTerbuka: data.packTerbuka,
          sisaPackBuka: data.sisaPackBuka,
          petugas: opnamePetugas.trim(),
          catatan: data.catatan,
          tanggal: new Date().toISOString(),
        });
      }
    });

    const updated = [...opnameData, ...newOpnames];
    saveOpname(updated);
    setShowOpnameModal(false);
    alert(`✅ Opname ${cabang.nama} selesai! ${newOpnames.length} bahan dicatat.`);
  };

  // Get last opname for a material + cabang
  const getLastOpname = (bahanNama: string, cabangId: string) => {
    return opnameData
      .filter(o => o.bahanNama === bahanNama && o.cabangId === cabangId)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0];
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const sectionBtn = (key: 'master' | 'opname', label: string, icon: React.ReactNode) => (
    <button onClick={() => setActiveSection(key)}
      className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition cursor-pointer ${
        activeSection === key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}>
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <Package className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">📋 Master Bahan</h2>
            <p className="text-xs text-gray-500">Data master bahan baku — daftar, harga markup, dan stock opname per cabang.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionBtn('master', `Master Bahan (${bahanBaku.length})`, <Package className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('opname', 'Stock Opname Cabang', <ClipboardCheck className="w-3.5 h-3.5 inline" />)}
        </div>
      </div>

      {/* ─── MASTER BAHAN LIST ─── */}
      {activeSection === 'master' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Cari bahan..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <button onClick={openAddModal}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition cursor-pointer">
                <Plus className="w-4 h-4" /> Tambah Bahan
              </button>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto stroke-1 mb-3" />
                <p className="text-sm text-gray-500">Bahan tidak ditemukan</p>
                <p className="text-xs text-gray-400 mt-1">Tambahkan bahan baru untuk memulai.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase bg-gray-50/50">
                      <th className="px-4 py-3">Kode</th>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Satuan</th>
                      <th className="px-4 py-3 text-right">Harga Real</th>
                      <th className="px-4 py-3 text-center">Markup</th>
                      <th className="px-4 py-3 text-right text-emerald-700">Harga Markup</th>
                      <th className="px-4 py-3 text-right">Harga Unit Markup</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {filteredMaterials.map((b, idx) => {
                      const realPrice = b.hargaBeliReal !== undefined ? b.hargaBeliReal : b.hargaBeli;
                      const mPercent = b.markupPercent || 0;
                      return (
                        <tr key={idx} className="hover:bg-emerald-50/10">
                          <td className="px-4 py-3 font-mono text-[10px] font-bold text-gray-500">{b.kode || `BB-${String(idx + 1).padStart(3, '0')}`}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{b.nama}</td>
                          <td className="px-4 py-3 text-gray-500">{b.kategori || '—'}</td>
                          <td className="px-4 py-3">{b.isiKemasan} {b.satuan}</td>
                          <td className="px-4 py-3 text-right font-mono text-gray-500">{formatCurrency(realPrice)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono ${
                              mPercent > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
                            }`}>+{mPercent}%</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(b.hargaBeli)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(b.hargaSatuan)}/{b.satuan}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEditModal(b)}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 cursor-pointer" title="Edit">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(b.nama)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 cursor-pointer" title="Hapus">
                                <Trash2 className="w-3.5 h-3.5" />
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

          <div className="bg-emerald-50/45 border border-emerald-200/60 rounded-2xl p-5 flex gap-3 text-emerald-900 text-xs">
            <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block mb-1">🛡️ Alur Harga Markup</span>
              <p className="text-emerald-800 leading-relaxed">
                Data Pusat mendaftarkan bahan dengan <strong>Harga Beli + Markup %</strong>. 
                Harga Markup otomatis tersedia di Master Bahan dan dipakai oleh <strong>Resep & HPP</strong> untuk 
                perhitungan biaya produksi. Buka tab <strong>Stock Opname</strong> untuk mencatat stok per cabang.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ─── STOCK OPNAME CABANG ─── */}
      {activeSection === 'opname' && (
        <div className="space-y-4">
          {cabangList.filter(c => c.isActive).length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto stroke-1 mb-3" />
              <h3 className="text-sm font-bold text-gray-700">Belum ada cabang</h3>
              <p className="text-xs text-gray-400">Daftarkan cabang dulu di menu Data Pusat.</p>
            </div>
          ) : (
            cabangList.filter(c => c.isActive).map(cabang => {
              const totalOpname = opnameData.filter(o => o.cabangId === cabang.id).length;
              const lastOp = opnameData.filter(o => o.cabangId === cabang.id)
                .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0];
              return (
                <div key={cabang.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{cabang.nama}</h3>
                        <p className="text-[10px] text-gray-500">
                          {totalOpname > 0 ? `${totalOpname} data opname • Terakhir: ${lastOp ? formatDate(lastOp.tanggal) : '—'}` : 'Belum ada opname'}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => openOpnameForm(cabang.id)}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer">
                      <ClipboardCheck className="w-3.5 h-3.5" /> Opname Sekarang
                    </button>
                  </div>

                  {/* Last opname results table */}
                  {opnameData.filter(o => o.cabangId === cabang.id).length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                            <th className="px-3 py-2">Bahan</th>
                            <th className="px-3 py-2 text-right">Stok Satuan</th>
                            <th className="px-3 py-2 text-right">Pack Utuh</th>
                            <th className="px-3 py-2 text-right">Pack Terbuka</th>
                            <th className="px-3 py-2 text-right">Sisa Buka</th>
                            <th className="px-3 py-2 text-right">Total Kalkulasi</th>
                            <th className="px-3 py-2">Petugas</th>
                            <th className="px-3 py-2">Tanggal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {bahanBaku.map(b => {
                            const last = getLastOpname(b.nama, cabang.id);
                            if (!last) return null;
                            const totalCalc = (last.packUtuh * (b.isiKemasan || 1000)) + last.sisaPackBuka;
                            return (
                              <tr key={b.nama} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-semibold text-gray-900">{b.nama}</td>
                                <td className="px-3 py-2 text-right font-mono">{last.stokSatuan} {b.satuan}</td>
                                <td className="px-3 py-2 text-right font-mono">{last.packUtuh}</td>
                                <td className="px-3 py-2 text-right font-mono">{last.packTerbuka}</td>
                                <td className="px-3 py-2 text-right font-mono">{last.sisaPackBuka} {b.satuan}</td>
                                <td className={`px-3 py-2 text-right font-mono font-bold ${
                                  totalCalc !== last.stokSatuan ? 'text-amber-700' : 'text-emerald-700'
                                }`}>{totalCalc} {b.satuan}</td>
                                <td className="px-3 py-2">{last.petugas}</td>
                                <td className="px-3 py-2 text-gray-500">{formatDate(last.tanggal)}</td>
                              </tr>
                            );
                          })}
                          {!opnameData.some(o => o.cabangId === cabang.id) && (
                            <tr><td colSpan={8} className="text-center py-4 text-gray-400">Belum ada data opname.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Info alur */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-[10px] text-blue-800">
            <strong>📋 Alur Stock Opname:</strong><br />
            1. Pilih cabang → klik <strong>"Opname Sekarang"</strong><br />
            2. Isi: Stok Satuan (timbang/takar) | Pack Utuh | Pack Terbuka | Sisa Pack Buka<br />
            3. Sistem otomatis hitung total kalkulasi: (Pack Utuh × IsiPerPack) + Sisa Pack Buka<br />
            4. Data opname otomatis masuk ke <strong>Data Pusat</strong> untuk monitoring stok real-time ✅
          </div>
        </div>
      )}

      {/* ─── OPNAME MODAL ─── */}
      {showOpnameModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" /> Stock Opname — {cabangList.find(c => c.id === opnameCabang)?.nama}
                </h3>
                <p className="text-[10px] text-gray-500">Isi stok hasil timbang fisik & jumlah kemasan.</p>
              </div>
              <button onClick={() => setShowOpnameModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Petugas Opname</label>
                  <input type="text" placeholder="Nama petugas" value={opnamePetugas}
                    onChange={e => setOpnamePetugas(e.target.value)}
                    className="border border-gray-200 rounded-lg p-2 text-xs w-48" />
                </div>
                <div className="text-xs text-gray-500 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                  ⏱ {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                      <th className="px-3 py-2 rounded-l-lg">Bahan</th>
                      <th className="px-3 py-2 text-right">Isi/Pack</th>
                      <th className="px-3 py-2 text-right">Stok Satuan</th>
                      <th className="px-3 py-2 text-right">Pack Utuh</th>
                      <th className="px-3 py-2 text-right">Pack Terbuka</th>
                      <th className="px-3 py-2 text-right">Sisa Pack Buka</th>
                      <th className="px-3 py-2 text-right">Total Kalkulasi</th>
                      <th className="px-3 py-2">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bahanBaku.map(b => {
                      const form = opnameForm[b.nama] || { stokSatuan: 0, packUtuh: 0, packTerbuka: 0, sisaPackBuka: 0, catatan: '' };
                      const isiPerPack = b.isiKemasan || 1000;
                      const totalCalc = (form.packUtuh * isiPerPack) + form.sisaPackBuka;
                      const selisih = form.stokSatuan > 0 ? Math.abs(form.stokSatuan - totalCalc) : 0;
                      return (
                        <tr key={b.nama} className={`hover:bg-gray-50 ${selisih > 50 ? 'bg-amber-50/50' : ''}`}>
                          <td className="px-3 py-2 font-semibold text-gray-900">{b.nama}</td>
                          <td className="px-3 py-2 text-right text-gray-400">{b.isiKemasan} {b.satuan}</td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" step="1"
                              value={form.stokSatuan || ''}
                              onChange={e => setOpnameForm(prev => ({
                                ...prev,
                                [b.nama]: { ...prev[b.nama], stokSatuan: parseFloat(e.target.value) || 0 }
                              }))}
                              className="w-20 border border-gray-200 rounded p-1 text-right font-mono text-xs" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" step="1"
                              value={form.packUtuh || ''}
                              onChange={e => setOpnameForm(prev => ({
                                ...prev,
                                [b.nama]: { ...prev[b.nama], packUtuh: parseInt(e.target.value) || 0 }
                              }))}
                              className="w-16 border border-gray-200 rounded p-1 text-right font-mono text-xs" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" step="1"
                              value={form.packTerbuka || ''}
                              onChange={e => setOpnameForm(prev => ({
                                ...prev,
                                [b.nama]: { ...prev[b.nama], packTerbuka: parseInt(e.target.value) || 0 }
                              }))}
                              className="w-16 border border-gray-200 rounded p-1 text-right font-mono text-xs" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" step="1"
                              value={form.sisaPackBuka || ''}
                              onChange={e => setOpnameForm(prev => ({
                                ...prev,
                                [b.nama]: { ...prev[b.nama], sisaPackBuka: parseFloat(e.target.value) || 0 }
                              }))}
                              className="w-20 border border-gray-200 rounded p-1 text-right font-mono text-xs" />
                          </td>
                          <td className={`px-3 py-2 text-right font-mono font-bold text-xs ${
                            totalCalc > 0 && Math.abs(totalCalc - form.stokSatuan) > 50 ? 'text-amber-700' : 'text-emerald-700'
                          }`}>
                            {totalCalc > 0 ? `${totalCalc} ${b.satuan}` : '—'}
                            {selisih > 50 && <span className="block text-[9px] text-amber-600">⚠️ Selisih {selisih}</span>}
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" placeholder="—"
                              value={form.catatan}
                              onChange={e => setOpnameForm(prev => ({
                                ...prev,
                                [b.nama]: { ...prev[b.nama], catatan: e.target.value }
                              }))}
                              className="w-24 border border-gray-200 rounded p-1 text-xs" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setShowOpnameModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer">
                  Batal
                </button>
                <button onClick={handleSaveOpname}
                  disabled={!opnamePetugas.trim()}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Simpan Opname
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CRUD MODAL ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">
                {editingMaterial ? 'Edit Bahan' : 'Tambah Bahan Baru'}
              </h3>
              <button onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Nama Bahan</label>
                <input type="text" required placeholder="Contoh: Tepung Terigu Protein Tinggi"
                  value={nama} onChange={e => setNama(e.target.value)}
                  disabled={!!editingMaterial}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Kategori</label>
                  <select value={kategori} onChange={e => setKategori(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5">
                    <option value="">— Pilih —</option>
                    <option value="Tepung">Tepung</option>
                    <option value="Gula">Gula</option>
                    <option value="Lemak">Lemak</option>
                    <option value="Telur">Telur</option>
                    <option value="Susu">Susu</option>
                    <option value="Ragi">Ragi</option>
                    <option value="Bumbu">Bumbu</option>
                    <option value="Topping">Topping</option>
                    <option value="Kemasan">Kemasan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Satuan Dasar</label>
                  <select value={satuan} onChange={e => setSatuan(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5">
                    <option value="gr">gram (gr)</option>
                    <option value="ml">mililiter (ml)</option>
                    <option value="pcs">pieces (pcs)</option>
                    <option value="butir">butir</option>
                    <option value="kg">kilogram (kg)</option>
                    <option value="liter">liter</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Isi Per Kemasan ({satuan})</label>
                <input type="number" step="any" min="0.01" required placeholder="1000"
                  value={isiKemasan} onChange={e => setIsiKemasan(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 font-mono" />
              </div>

              <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100 space-y-3">
                <span className="block text-xs font-bold text-rose-900 uppercase">1. Harga Beli Asli (Supplier)</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-rose-600 font-bold">Rp</span>
                  <input type="number" min="0" required placeholder="10000"
                    value={hargaBeliReal} onChange={e => handleRealPriceChange(e.target.value)}
                    className="w-full pl-9 text-sm border border-rose-200 rounded-xl px-3 py-2 font-mono text-rose-900 font-bold" />
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                <span className="block text-xs font-bold text-emerald-900 uppercase">2. Markup Harga</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-emerald-800 mb-1">Markup (%)</label>
                    <input type="number" min="0" step="any" placeholder="0"
                      value={markupPercent} onChange={e => handleMarkupPercentChange(e.target.value)}
                      className="w-full text-sm border border-emerald-200 rounded-xl px-3 py-2 font-mono font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-emerald-800 mb-1">Harga Markup (Rp)</label>
                    <div className="relative">
                      <input type="number" readOnly
                        value={autoMarkupPrice !== null ? autoMarkupPrice : ''}
                        placeholder={autoMarkupPrice !== null ? String(autoMarkupPrice) : 'Auto'}
                        className="w-full text-sm border border-emerald-200 rounded-xl px-3 py-2 bg-emerald-50/50 font-mono font-extrabold text-emerald-900 cursor-not-allowed" />
                    </div>
                  </div>
                </div>
              </div>

              {parseFloat(hargaBeliReal) > 0 && parseFloat(isiKemasan) > 0 && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Harga Real/{satuan}:</span><span className="font-mono font-semibold text-rose-700">{formatCurrency((parseFloat(hargaBeliReal)||0)/(parseFloat(isiKemasan)||1))}</span></div>
                  <div className="flex justify-between border-t border-gray-200 pt-1"><span className="font-bold text-emerald-900">Harga Markup/{satuan}:</span><span className="font-mono font-extrabold text-emerald-700">{formatCurrency((parseFloat(hargaBeli)||0)/(parseFloat(isiKemasan)||1))}</span></div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer">Batal</button>
                <button type="submit"
                  className="px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer">
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
