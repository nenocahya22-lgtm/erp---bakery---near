import React, { useState, useEffect } from 'react';
import { BahanBaku, Cabang, SuratOrder, BranchStock, BranchTransaction, WasteLog } from '../types';
import {
  Building2, Plus, Trash2, Edit2, X, Package, Truck, CheckCircle2,
  AlertTriangle, Search, Users, KeyRound, Eye, EyeOff, BarChart3
} from 'lucide-react';

interface DataPusatTabProps {
  bahanBaku: BahanBaku[];
  onAddMaterial: (m: BahanBaku) => void;
  onEditMaterial: (oldName: string, m: BahanBaku) => void;
  onDeleteMaterial: (name: string) => void;
  cabangList: Cabang[];
  onAddCabang: (c: Cabang) => void;
  onEditCabang: (id: string, c: Cabang) => void;
  onDeleteCabang: (id: string) => void;
  suratOrders: SuratOrder[];
  onAddSuratOrder: (so: SuratOrder) => void;
  onUpdateSuratOrder: (id: string, so: SuratOrder) => void;
  cabangStok: BranchStock[];
  branchTransactions: BranchTransaction[];
  wasteLogs: WasteLog[];
}

export default function DataPusatTab({
  bahanBaku, onAddMaterial, onEditMaterial, onDeleteMaterial,
  cabangList, onAddCabang, onEditCabang, onDeleteCabang,
  suratOrders, onAddSuratOrder, onUpdateSuratOrder,
  cabangStok, branchTransactions, wasteLogs,
}: DataPusatTabProps) {
  const [activeSection, setActiveSection] = useState<'cabang' | 'bahan' | 'stok' | 'sod' | 'stok_cabang'>('cabang');

  // ─── CABANG STATE ───
  const [showCabangModal, setShowCabangModal] = useState(false);
  const [editingCabang, setEditingCabang] = useState<Cabang | null>(null);
  const [cabangNama, setCabangNama] = useState('');
  const [cabangAlamat, setCabangAlamat] = useState('');
  const [cabangUsername, setCabangUsername] = useState('');
  const [cabangPassword, setCabangPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [cabangSearch, setCabangSearch] = useState('');

  // ─── BAHAN STATE ───
  const [bahanSearch, setBahanSearch] = useState('');

  // ─── SURAT ORDER STATE ───
  const [showSOModal, setShowSOModal] = useState(false);
  const [soCabangId, setSoCabangId] = useState('');
  const [soItems, setSoItems] = useState<{ bahanNama: string; qty: number }[]>([]);

  // ─── CABANG HANDLERS ───
  const openAddCabang = () => {
    setEditingCabang(null);
    setCabangNama(''); setCabangAlamat(''); setCabangUsername(''); setCabangPassword('');
    setShowCabangModal(true);
  };

  const openEditCabang = (c: Cabang) => {
    setEditingCabang(c);
    setCabangNama(c.nama); setCabangAlamat(c.alamat); setCabangUsername(c.username); setCabangPassword(c.password);
    setShowCabangModal(true);
  };

  const handleSaveCabang = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cabangNama.trim() || !cabangUsername.trim() || !cabangPassword.trim()) return;

    const cabang: Cabang = {
      id: editingCabang?.id || `cab-${Date.now()}`,
      nama: cabangNama.trim(),
      alamat: cabangAlamat.trim(),
      username: cabangUsername.trim().toLowerCase(),
      password: cabangPassword.trim(),
      isActive: editingCabang?.isActive ?? true,
      createdAt: editingCabang?.createdAt || new Date().toISOString(),
    };

    if (editingCabang) {
      onEditCabang(editingCabang.id, cabang);
    } else {
      onAddCabang(cabang);
    }
    setShowCabangModal(false);
  };

  // ─── SURAT ORDER HANDLERS ───
  const openAddSO = () => {
    setSoCabangId(cabangList.length > 0 ? cabangList[0].id : '');
    setSoItems(bahanBaku.map(b => ({ bahanNama: b.nama, qty: 0 })));
    setShowSOModal(true);
  };

  const handleSendSO = () => {
    if (!soCabangId) return;
    const cabang = cabangList.find(c => c.id === soCabangId);
    if (!cabang) return;

    const items = soItems.filter(i => i.qty > 0);
    if (items.length === 0) return;

    const so: SuratOrder = {
      id: `so-${Date.now()}`,
      cabangId: soCabangId,
      cabangNama: cabang.nama,
      tanggalKirim: new Date().toISOString(),
      status: 'dikirim',
      items,
    };

    onAddSuratOrder(so);
    setShowSOModal(false);
  };

  const handleTerimaSO = (soId: string) => {
    const so = suratOrders.find(s => s.id === soId);
    if (so) {
      onUpdateSuratOrder(soId, { ...so, status: 'diterima' });
    }
  };

  const handleSetujuiSO = (soId: string) => {
    const so = suratOrders.find(s => s.id === soId);
    if (so && so.status === 'minta') {
      if (window.confirm(`Setujui permintaan barang dari "${so.cabangNama}"?\nStok pusat akan berkurang secara otomatis.`)) {
        onUpdateSuratOrder(soId, { ...so, status: 'dikirim' });
      }
    }
  };

  // ─── RENDER BADGE ───
  const sectionBtn = (key: typeof activeSection, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveSection(key)}
      className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition cursor-pointer ${
        activeSection === key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {icon} {label}
    </button>
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <Building2 className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">🏛️ Data Pusat</h2>
            <p className="text-xs text-gray-500">Kelola cabang, bahan baku, stok pusat, dan surat order ke seluruh outlet.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionBtn('cabang', `Cabang (${cabangList.length})`, <Building2 className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('bahan', `Bahan (${bahanBaku.length})`, <Package className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('stok', 'Stok Pusat', <Package className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('stok_cabang', 'Stok Cabang', <BarChart3 className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('sod', `SO (${suratOrders.length})`, <Truck className="w-3.5 h-3.5 inline" />)}
        </div>
      </div>

      {/* ─── SECTION: CABANG ─── */}
      {activeSection === 'cabang' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Cari cabang..." value={cabangSearch}
                onChange={e => setCabangSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <button onClick={openAddCabang}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Daftar Cabang Baru
            </button>
          </div>

          {cabangList.filter(c => c.nama.toLowerCase().includes(cabangSearch.toLowerCase())).length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada cabang terdaftar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                    <th className="px-4 py-3">Cabang</th>
                    <th className="px-4 py-3">Alamat</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Password</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cabangList.filter(c => c.nama.toLowerCase().includes(cabangSearch.toLowerCase())).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{c.nama}</td>
                      <td className="px-4 py-3 text-gray-500">{c.alamat || '—'}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{c.username}</td>
                      <td className="px-4 py-3 font-mono text-gray-400">{'•'.repeat(c.password.length)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {c.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditCabang(c)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                            title="Edit Cabang">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { if (window.confirm(`Hapus cabang "${c.nama}"?`)) onDeleteCabang(c.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                            title="Hapus Cabang">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* INFO: Login Cabang */}
          <div className="p-4 bg-blue-50/50 border-t border-blue-100">
            <p className="text-[11px] text-blue-800 font-medium flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Setiap cabang memiliki login sendiri: staff cabang bisa login dengan <strong>Username</strong> dan <strong>Password</strong> di atas untuk mengakses modul POS, Minta Barang, SO, dan Waste cabang mereka.
            </p>
          </div>
        </div>
      )}

      {/* ─── SECTION: BAHAN BAKU ─── */}
      {activeSection === 'bahan' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Cari bahan..." value={bahanSearch}
                onChange={e => setBahanSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
          {bahanBaku.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada bahan terdaftar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Nama Bahan</th>
                    <th className="px-4 py-3">Satuan</th>
                    <th className="px-4 py-3 text-right">Harga Markup</th>
                    <th className="px-4 py-3 text-right">Harga Satuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bahanBaku.filter(b => b.nama.toLowerCase().includes(bahanSearch.toLowerCase())).map((b, idx) => (
                    <tr key={b.nama} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-gray-500">{b.kode || `BB-${String(idx + 1).padStart(3, '0')}`}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{b.nama}</td>
                      <td className="px-4 py-3">{b.isiKemasan} {b.satuan}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(b.hargaBeli)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">{formatCurrency(b.hargaSatuan)}/{b.satuan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── SECTION: STOK PUSAT ─── */}
      {activeSection === 'stok' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-600" /> Stok Pusat — Real-time
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Stok pusat terhitung dari <strong>isiKemasan (stok input manual)</strong> dikurangi <strong>SO yang sudah dikirim ke cabang</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-[10px] uppercase font-bold text-emerald-800">Total Jenis Bahan</p>
              <p className="text-xl font-black text-emerald-700 font-mono mt-1">{bahanBaku.length}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-[10px] uppercase font-bold text-blue-800">Total Cabang Aktif</p>
              <p className="text-xl font-black text-blue-700 font-mono mt-1">{cabangList.filter(c => c.isActive).length}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-[10px] uppercase font-bold text-amber-800">SO Dikirim</p>
              <p className="text-xl font-black text-amber-700 font-mono mt-1">{suratOrders.filter(s => s.status === 'dikirim').length}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-[10px] uppercase font-bold text-purple-800">Permintaan Pending</p>
              <p className="text-xl font-black text-purple-700 font-mono mt-1">{suratOrders.filter(s => s.status === 'minta').length}</p>
            </div>
          </div>

          {/* Daftar stok per bahan */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                  <th className="px-3 py-2.5 rounded-l-lg">Bahan</th>
                  <th className="px-3 py-2.5 text-right">Stok Input</th>
                  <th className="px-3 py-2.5 text-right">Dikirim ke Cabang</th>
                  <th className="px-3 py-2.5 text-right rounded-r-lg">Stok Tersisa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bahanBaku.map(b => {
                  const totalDikirim = suratOrders
                    .filter(s => s.status === 'dikirim' || s.status === 'diterima')
                    .flatMap(s => s.items)
                    .filter(i => i.bahanNama === b.nama)
                    .reduce((acc, i) => acc + i.qty, 0);
                  const stokTersisa = Math.max(0, b.isiKemasan - totalDikirim);
                  return (
                    <tr key={b.nama} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-semibold text-gray-900">{b.nama}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{b.isiKemasan} {b.satuan}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-red-600">-{totalDikirim} {b.satuan}</td>
                      <td className={`px-3 py-2.5 text-right font-mono font-bold ${stokTersisa < 10 ? 'text-red-700' : 'text-emerald-700'}`}>{stokTersisa} {b.satuan}</td>
                    </tr>
                  );
                })}
                {bahanBaku.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">Belum ada bahan baku.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Info alur */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-800">
            <strong>Alur Stok Pusat → Cabang:</strong><br />
            1. Cabang minta barang → Status <strong>"🕐 Minta"</strong> (pending)<br />
            2. Owner setujui → Status <strong>"Dikirim"</strong> → <strong>Stok Pusat berkurang</strong> ✅<br />
            3. Cabang terima → Status <strong>"Diterima"</strong> → <strong>Stok Cabang bertambah</strong> ✅<br />
            Stok pusat otomatis ter-update dari setiap pengiriman.
          </div>
        </div>
      )}

      {/* ─── SECTION: STOK CABANG ─── */}
      {activeSection === 'stok_cabang' && (
        <div className="space-y-4">
          {cabangList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-8 text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto stroke-1 mb-3" />
              <h3 className="text-sm font-bold text-gray-700">Belum ada cabang</h3>
              <p className="text-xs text-gray-400">Daftarkan cabang dulu untuk mulai tracking stok.</p>
            </div>
          ) : (
            cabangList.filter(c => c.isActive).map(cabang => {
              const cabangStockItems = cabangStok.filter(s => s.cabangId === cabang.id);
              const cabangTx = branchTransactions.filter(t => t.cabangId === cabang.id);
              const soCount = suratOrders.filter(s => s.cabangId === cabang.id && s.status === 'diterima').length;
              const wasteTotal = wasteLogs
                .filter(w => w.location === `Cabang ${cabang.nama}`)
                .reduce((acc, w) => acc + w.lossValue, 0);

              return (
                <div key={cabang.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-slate-50 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">{cabang.nama}</h3>
                          <p className="text-[10px] text-gray-500">{cabang.alamat || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          {soCount} SO diterima
                        </span>
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                          Waste: {formatCurrency(wasteTotal)}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                          {cabangTx.length} transaksi
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                      <Package className="w-3.5 h-3.5 inline mr-1" /> Stok Teoritis vs Fisik
                    </h4>
                    {cabangStockItems.length === 0 ? (
                      <div className="space-y-2">
                        {bahanBaku.map(b => {
                          // Calculate teoritis from SO received - (estimated sales+ waste)
                          const soReceived = suratOrders
                            .filter(s => s.cabangId === cabang.id && s.status === 'diterima')
                            .flatMap(s => s.items)
                            .filter(i => i.bahanNama === b.nama)
                            .reduce((acc, i) => acc + i.qty, 0);
                          const wasteQty = wasteLogs
                            .filter(w => w.location === `Cabang ${cabang.nama}` && w.bahanNama === b.nama)
                            .reduce((acc, w) => acc + w.qtyWasted, 0);
                          const teoritis = Math.max(0, soReceived - wasteQty);
                          if (teoritis === 0 && soReceived === 0) return null;
                          return (
                            <div key={b.nama} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-xl">
                              <span className="text-xs font-medium text-gray-700">{b.nama}</span>
                              <span className="text-xs font-mono font-bold text-emerald-700">{teoritis} {b.satuan}</span>
                            </div>
                          );
                        })}
                        {(cabangStockItems.length === 0 && bahanBaku.filter(b => {
                          const soReceived = suratOrders.filter(s => s.cabangId === cabang.id && s.status === 'diterima').flatMap(s => s.items).filter(i => i.bahanNama === b.nama).reduce((acc, i) => acc + i.qty, 0);
                          return soReceived > 0;
                        }).length === 0) && (
                          <p className="text-xs text-gray-400 text-center py-4">Belum ada stok masuk — kirim SO dulu.</p>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                              <th className="px-3 py-2 rounded-l-lg">Bahan</th>
                              <th className="px-3 py-2 text-right">Teoritis</th>
                              <th className="px-3 py-2 text-right">Fisik (SO)</th>
                              <th className="px-3 py-2 text-right">Selisih</th>
                              <th className="px-3 py-2 text-center rounded-r-lg">Analisa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {cabangStockItems.map(item => {
                              const selisih = item.stokTeoritis - item.stokFisik;
                              const wasteQty = wasteLogs
                                .filter(w => w.location === `Cabang ${cabang.nama}` && w.bahanNama === item.bahanNama)
                                .reduce((acc, w) => acc + w.qtyWasted, 0);
                              return (
                                <tr key={`${item.cabangId}-${item.bahanNama}`} className={`hover:bg-gray-50 ${selisih !== 0 ? 'bg-amber-50/30' : ''}`}>
                                  <td className="px-3 py-2.5 font-semibold text-gray-900">{item.bahanNama}</td>
                                  <td className="px-3 py-2.5 text-right font-mono">{item.stokTeoritis}</td>
                                  <td className="px-3 py-2.5 text-right font-mono">{item.stokFisik}</td>
                                  <td className={`px-3 py-2.5 text-right font-mono font-bold ${
                                    selisih === 0 ? 'text-emerald-600' : selisih > 0 ? 'text-blue-600' : 'text-red-600'
                                  }`}>{selisih > 0 ? `+${selisih}` : selisih}</td>
                                  <td className="px-3 py-2.5 text-center">
                                    {selisih === 0 ? (
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✅ Aman</span>
                                    ) : selisih > 0 ? (
                                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold" title="Stok fisik lebih besar dari teoritis — kemungkinan kelebihan kirim atau salah catat">
                                        🔵 Plus
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold cursor-help" title={`Kekurangan ${Math.abs(selisih)} ${item.satuan} — cek waste (${wasteQty} ${item.satuan}) atau kemungkinan overproduksi / salah catat`}>
                                        🔴 Minus
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Recent transactions */}
                    {cabangTx.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          🔄 Transaksi Terbaru
                        </h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {cabangTx.slice(0, 10).map(tx => (
                            <div key={tx.id} className="flex items-center justify-between text-[10px] py-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  tx.tipe === 'so_terima' ? 'bg-emerald-100 text-emerald-800' :
                                  tx.tipe === 'so_minta' ? 'bg-blue-100 text-blue-800' :
                                  tx.tipe === 'pos_jual' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                                }`}>{tx.tipe}</span>
                                <span className="text-gray-600">{tx.bahanNama}</span>
                              </div>
                              <span className={`font-mono font-bold ${
                                tx.tipe === 'so_terima' || tx.tipe === 'so_minta' ? 'text-emerald-700' : 'text-red-700'
                              }`}>
                                {tx.tipe === 'so_terima' || tx.tipe === 'so_minta' ? '+' : '-'}{tx.qty} {tx.satuan}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── SECTION: SURAT ORDER ─── */}
      {activeSection === 'sod' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" /> Surat Order ke Cabang
              </h3>
              <button onClick={openAddSO}
                disabled={cabangList.length === 0 || bahanBaku.length === 0}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer disabled:cursor-not-allowed">
                <Plus className="w-3.5 h-3.5" /> Kirim Barang
              </button>
            </div>

            {suratOrders.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada surat order.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Cabang</th>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {suratOrders.map(so => (
                      <tr key={so.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-500">
                          {new Date(so.tanggalKirim).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{so.cabangNama}</td>
                        <td className="px-4 py-3">
                          {so.items.map((item, idx) => (
                            <span key={idx} className="inline-block bg-gray-100 rounded px-1.5 py-0.5 mr-1 mb-1 text-[10px]">
                              {item.bahanNama}: <strong>{item.qty}</strong>
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            so.status === 'diterima'
                              ? 'bg-emerald-100 text-emerald-800'
                              : so.status === 'dikirim'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {so.status === 'diterima' ? 'Diterima' : so.status === 'dikirim' ? 'Dikirim' : '🕐 Minta'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {so.status === 'minta' && (
                            <button onClick={() => handleSetujuiSO(so.id)}
                              className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer">
                              <CheckCircle2 className="w-3 h-3" /> Setujui & Kirim
                            </button>
                          )}
                          {so.status === 'dikirim' && (
                            <button onClick={() => handleTerimaSO(so.id)}
                              className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer">
                              <CheckCircle2 className="w-3 h-3" /> Terima
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL CABANG ─── */}
      {showCabangModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900">
                {editingCabang ? 'Edit Cabang' : '🏪 Daftar Cabang Baru'}
              </h3>
              <button onClick={() => setShowCabangModal(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCabang} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Cabang</label>
                <input type="text" required placeholder="Contoh: Cabang A — Jl. Merdeka"
                  value={cabangNama} onChange={e => setCabangNama(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Alamat</label>
                <textarea placeholder="Alamat lengkap cabang" rows={2}
                  value={cabangAlamat} onChange={e => setCabangAlamat(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Username Login</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
                      <Users className="w-3.5 h-3.5" />
                    </span>
                    <input type="text" required placeholder="username"
                      value={cabangUsername} onChange={e => setCabangUsername(e.target.value)}
                      className="w-full pl-8 text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
                      <KeyRound className="w-3.5 h-3.5" />
                    </span>
                    <input type={showPass ? 'text' : 'password'} required placeholder="password"
                      value={cabangPassword} onChange={e => setCabangPassword(e.target.value)}
                      className="w-full pl-8 pr-8 text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer">
                      {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowCabangModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer">Batal</button>
                <button type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer">
                  {editingCabang ? 'Simpan' : 'Daftarkan Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL SURAT ORDER ─── */}
      {showSOModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900">🚚 Kirim Barang ke Cabang</h3>
              <button onClick={() => setShowSOModal(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Tujuan Cabang</label>
                <select value={soCabangId} onChange={e => setSoCabangId(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5">
                  {cabangList.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Isi Barang (isi 0 untuk tidak dikirim)</label>
                <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
                  {soItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="w-1/2 font-medium text-gray-700">{item.bahanNama}</span>
                      <input type="number" min="0" step="0.1"
                        value={item.qty}
                        onChange={e => {
                          const newItems = [...soItems];
                          newItems[idx] = { ...newItems[idx], qty: parseFloat(e.target.value) || 0 };
                          setSoItems(newItems);
                        }}
                        className="w-24 border border-gray-200 rounded-lg p-1.5 text-right font-mono" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowSOModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer">Batal</button>
                <button onClick={handleSendSO}
                  disabled={soItems.filter(i => i.qty > 0).length === 0}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl cursor-pointer disabled:cursor-not-allowed">
                  Kirim Surat Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
