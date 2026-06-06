import React, { useState, useEffect } from 'react';
import { Cabang, BahanBaku, SuratOrder, WasteLog, CalculationResult, DetailResep, ProductHpp, BranchStock, BranchTransaction } from '../types';
import {
  ShoppingCart, Package, ClipboardList, Trash2, TrendingUp,
  Plus, X, Truck, LogOut, Building2, AlertTriangle, BarChart3, ClipboardCheck,
  Calendar, Clock, FileText, Scale, Printer, Thermometer
} from 'lucide-react';

interface BranchDashboardProps {
  cabang: Cabang;
  bahanBaku: BahanBaku[];
  suratOrders: SuratOrder[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  calculatedProducts: CalculationResult[];
  wasteLogs: WasteLog[];
  cabangStok: BranchStock[];
  branchTransactions: BranchTransaction[];
  onAddWasteLog: (log: WasteLog, cabangId?: string) => void;
  onDeleteWasteLog: (id: string) => void;
  onAddSuratOrder: (so: SuratOrder) => void;
  onUpdateSuratOrder: (id: string, so: SuratOrder) => void;
  onCompletePOSSale: (productName: string, soldQty: number, totalRevenue: number, source?: string, cabangId?: string) => void;
  onSyncStokOpname: (cabangId: string, bahanNama: string, stokFisik: number, satuan: string) => void;
  onLogout: () => void;
}

export default function BranchDashboard({
  cabang, bahanBaku, suratOrders, productHpp, detailResep,
  calculatedProducts, wasteLogs, cabangStok, branchTransactions,
  onAddWasteLog, onDeleteWasteLog,
  onAddSuratOrder, onUpdateSuratOrder, onCompletePOSSale, onSyncStokOpname, onLogout,
}: BranchDashboardProps) {
  const [activeModul, setActiveModul] = useState<'pos' | 'minta' | 'so' | 'waste' | 'laporan' | 'planner' | 'prodcenter'>('pos');

  // ─── LOCAL STOCK OPNAME ───
  const [stokOpname, setStokOpname] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`stok_opname_${cabang.id}`);
    return saved ? JSON.parse(saved) : {};
  });
  useEffect(() => {
    localStorage.setItem(`stok_opname_${cabang.id}`, JSON.stringify(stokOpname));
  }, [stokOpname, cabang.id]);

  // ─── POS STATE ───
  const [posCart, setPosCart] = useState<{ product: string; qty: number; price: number }[]>([]);
  const [posNote, setPosNote] = useState('');

  // ─── MINTA BARANG STATE ───
  const [mintaItems, setMintaItems] = useState<{ bahanNama: string; qty: number }[]>([]);

  // ─── WASTE STATE ───
  const [wasteBahan, setWasteBahan] = useState('');
  const [wasteQty, setWasteQty] = useState('');
  const [wasteAlasan, setWasteAlasan] = useState('');

  // ─── HELPERS ───
  const branchSOs = suratOrders.filter(s => s.cabangId === cabang.id);
  const branchWasteLogs = wasteLogs.filter(w => w.location === `Cabang ${cabang.nama}`);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // ─── POS HANDLERS ───
  const handleAddToCart = (productName: string) => {
    const existing = posCart.find(c => c.product === productName);
    if (existing) {
      setPosCart(prev => prev.map(c => c.product === productName ? { ...c, qty: c.qty + 1 } : c));
    } else {
      const product = calculatedProducts.find(p => p.namaProduk === productName);
      setPosCart(prev => [...prev, { product: productName, qty: 1, price: product?.hargaJualPerPorsi || 0 }]);
    }
  };

  const handleCheckout = () => {
    if (posCart.length === 0) return;
    const total = posCart.reduce((acc, c) => acc + c.qty * c.price, 0);
    posCart.forEach(c => {
      onCompletePOSSale(c.product, c.qty, c.qty * c.price, `POS Cabang ${cabang.nama}`, cabang.id);
    });
    showLocalToast(`Transaksi berhasil! Total ${formatCurrency(total)}`, 'success');
    setPosCart([]);
  };

  // ─── MINTA BARANG ───
  const handleMintaBarang = () => {
    const items = mintaItems.filter(i => i.qty > 0);
    if (items.length === 0) return;

    const so: SuratOrder = {
      id: `so-${Date.now()}-${cabang.id}`,
      cabangId: cabang.id,
      cabangNama: cabang.nama,
      tanggalKirim: new Date().toISOString(),
      status: 'minta',
      items,
    };
    onAddSuratOrder(so);
    showLocalToast('Permintaan barang dikirim ke pusat!', 'success');
    setMintaItems([]);
  };

  // ─── STOCK OPNAME ───
  const getStokTeoritis = (bahanNama: string) => {
    const soItems = branchSOs
      .filter(s => s.status === 'diterima')
      .flatMap(s => s.items)
      .filter(i => i.bahanNama === bahanNama)
      .reduce((acc, i) => acc + i.qty, 0);
    const wasteAmount = branchWasteLogs
      .filter(w => w.bahanNama === bahanNama)
      .reduce((acc, w) => acc + w.qtyWasted, 0);
    return Math.max(0, soItems - wasteAmount);
  };

  const handleSaveStokOpname = (bahanNama: string, fisik: number) => {
    setStokOpname(prev => ({ ...prev, [bahanNama]: fisik }));
    const bahan = bahanBaku.find(b => b.nama === bahanNama);
    onSyncStokOpname(cabang.id, bahanNama, fisik, bahan?.satuan || 'pcs');
    showLocalToast(`Stok ${bahanNama} dicatat: ${fisik}`, 'info');
  };

  // ─── PLANNER STATE (shared antara kiri & kanan) ───
  const [plannerTargets, setPlannerTargets] = useState<Record<string, number>>({});
  const calcPlannerNeeds = () => {
    const needs: Record<string, { total: number; satuan: string; hargaTotal: number; perProduk: { nama: string; qty: number }[] }> = {};
    Object.entries(plannerTargets).forEach(([prodName, prodQty]) => {
      if (!prodQty || prodQty <= 0) return;
      const resep = detailResep.filter(r => r.namaProduk === prodName);
      resep.forEach(r => {
        const totalQty = r.takaran * prodQty;
        const bahanInfo = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
        const hargaSatuan = bahanInfo?.hargaSatuan || 0;
        if (!needs[r.namaBahan]) {
          needs[r.namaBahan] = { total: 0, satuan: 'gr', hargaTotal: 0, perProduk: [] };
        }
        if (bahanInfo?.satuan) needs[r.namaBahan].satuan = bahanInfo.satuan;
        needs[r.namaBahan].total += totalQty;
        needs[r.namaBahan].hargaTotal += totalQty * hargaSatuan;
        needs[r.namaBahan].perProduk.push({ nama: prodName, qty: Math.round(totalQty * 10) / 10 });
      });
    });
    return needs;
  };

  // ─── WASTE ───
  const handleAddWaste = () => {
    if (!wasteBahan || !wasteQty) return;
    const qty = parseFloat(wasteQty) || 0;
    if (qty <= 0) return;
    const bahan = bahanBaku.find(b => b.nama === wasteBahan);
    onAddWasteLog({
      id: `waste-${Date.now()}`,
      bahanNama: wasteBahan,
      qtyWasted: qty,
      satuan: bahan?.satuan || 'kg',
      lossValue: qty * (bahan?.hargaSatuan || 0),
      location: `Cabang ${cabang.nama}` as any,
      reason: wasteAlasan || 'Tidak ada alasan',
      dateLogged: new Date().toISOString(),
    }, cabang.id);
    showLocalToast(`Waste ${wasteBahan} ${qty} dicatat!`, 'success');
    setWasteBahan('');
    setWasteQty('');
    setWasteAlasan('');
  };

  // ─── LOCAL TOAST ───
  const [localToast, setLocalToast] = useState<{ msg: string; type: string } | null>(null);
  const showLocalToast = (msg: string, type: string) => {
    setLocalToast({ msg, type });
    setTimeout(() => setLocalToast(null), 3000);
  };

  // ─── RENDER ───
  const modulBtn = (key: typeof activeModul, label: string, icon: React.ReactNode) => (
    <button onClick={() => setActiveModul(key)}
      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
        activeModul === key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}>
      {icon} {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">{cabang.nama}</h1>
            <p className="text-[10px] text-gray-400">Portal Cabang — Outlet Management</p>
          </div>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition cursor-pointer">
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </header>

      {/* MODULE NAV */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex flex-wrap gap-2">
        {modulBtn('pos', '🛒 POS Kasir', <ShoppingCart className="w-4 h-4" />)}
        {modulBtn('minta', '📦 Minta Barang', <Package className="w-4 h-4" />)}
        {modulBtn('so', '📋 Stock Opname', <ClipboardList className="w-4 h-4" />)}
        {modulBtn('waste', '🗑️ Waste', <Trash2 className="w-4 h-4" />)}
        {modulBtn('prodcenter', '🏭 Prod. Center', <Calendar className="w-4 h-4" />)}
        {modulBtn('planner', '📦 Prod. Planner', <ClipboardCheck className="w-4 h-4" />)}
        {modulBtn('laporan', '📊 Laporan', <BarChart3 className="w-4 h-4" />)}
      </div>

      {/* CONTENT */}
      <main className="p-6 max-w-5xl mx-auto">
        {/* LOCAL TOAST */}
        {localToast && (
          <div className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-bold text-center ${
            localToast.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
          }`}>{localToast.msg}</div>
        )}

        {/* ─── POS KASIR ─── */}
        {activeModul === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Daftar Produk</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {calculatedProducts.filter(p => p.hargaJualPerPorsi > 0).map(p => (
                  <div key={p.namaProduk}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                    <div>
                      <p className="text-xs font-bold text-gray-900">{p.namaProduk}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{formatCurrency(p.hargaJualPerPorsi)}</p>
                    </div>
                    <button onClick={() => handleAddToCart(p.namaProduk)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer">
                      <Plus className="w-3 h-3 inline" /> Tambah
                    </button>
                  </div>
                ))}
                {calculatedProducts.filter(p => p.hargaJualPerPorsi > 0).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">Belum ada produk dengan harga jual.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Keranjang</h3>
              {posCart.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Keranjang kosong</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {posCart.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{c.product}</p>
                        <p className="text-[10px] text-gray-500">{c.qty} x {formatCurrency(c.price)}</p>
                      </div>
                      <p className="text-xs font-bold font-mono text-emerald-700">{formatCurrency(c.qty * c.price)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm font-bold text-gray-900">Total</span>
                    <span className="text-lg font-black font-mono text-emerald-700">
                      {formatCurrency(posCart.reduce((acc, c) => acc + c.qty * c.price, 0))}
                    </span>
                  </div>
                </div>
              )}
              <button onClick={handleCheckout}
                disabled={posCart.length === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:cursor-not-allowed">
                Bayar ({posCart.length} item)
              </button>
            </div>
          </div>
        )}

        {/* ─── MINTA BARANG ─── */}
        {activeModul === 'minta' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">📦 Minta Barang ke Pusat</h3>
            {bahanBaku.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada bahan baku terdaftar.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
                {bahanBaku.map(b => {
                  const item = mintaItems.find(i => i.bahanNama === b.nama);
                  return (
                    <div key={b.nama} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-xl">
                      <span className="text-xs font-medium text-gray-700">{b.nama}</span>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" step="0.1" placeholder="0"
                          value={item?.qty || ''}
                          onChange={e => {
                            const qty = parseFloat(e.target.value) || 0;
                            const existing = mintaItems.findIndex(i => i.bahanNama === b.nama);
                            if (existing >= 0) {
                              const newItems = [...mintaItems];
                              newItems[existing] = { ...newItems[existing], qty };
                              setMintaItems(newItems);
                            } else {
                              setMintaItems(prev => [...prev, { bahanNama: b.nama, qty }]);
                            }
                          }}
                          className="w-20 border border-gray-200 rounded-lg p-1.5 text-xs text-right font-mono" />
                        <span className="text-[10px] text-gray-400 w-6">{b.satuan}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={handleMintaBarang}
              disabled={mintaItems.filter(i => i.qty > 0).length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:cursor-not-allowed">
              <Truck className="w-4 h-4 inline mr-1" /> Kirim Permintaan ke Pusat
            </button>
          </div>
        )}

        {/* ─── STOCK OPNAME ─── */}
        {activeModul === 'so' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">📋 Stock Opname</h3>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full">
                {Object.keys(stokOpname).length} bahan di-SO
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                    <th className="px-4 py-3">Bahan</th>
                    <th className="px-4 py-3 text-right">Teoritis</th>
                    <th className="px-4 py-3 text-right">Stok Fisik</th>
                    <th className="px-4 py-3 text-right">Selisih</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bahanBaku.map(b => {
                    const teoritis = getStokTeoritis(b.nama);
                    const fisik = stokOpname[b.nama] ?? teoritis;
                    const selisih = teoritis - fisik;
                    return (
                      <tr key={b.nama} className={`hover:bg-gray-50 ${selisih !== 0 ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3 font-semibold text-gray-900">{b.nama}</td>
                        <td className="px-4 py-3 text-right font-mono">{teoritis}</td>
                        <td className="px-4 py-3 text-right">
                          <input type="number" min="0" step="0.1"
                            defaultValue={stokOpname[b.nama] ?? teoritis}
                            onBlur={e => handleSaveStokOpname(b.nama, parseFloat(e.target.value) || 0)}
                            className="w-20 border border-gray-200 rounded-lg p-1 text-right font-mono text-xs" />
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${
                          selisih === 0 ? 'text-emerald-600' : selisih > 0 ? 'text-blue-600' : 'text-red-600'
                        }`}>{selisih > 0 ? `+${selisih}` : selisih}</td>
                        <td className="px-4 py-3 text-center">
                          {selisih === 0 ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✅ Aman</span>
                          ) : (
                            <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">❌ Selisih</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── WASTE ─── */}
        {activeModul === 'waste' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">🗑️ Catat Waste</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Bahan</label>
                  <select value={wasteBahan} onChange={e => setWasteBahan(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-xl p-2.5">
                    <option value="">-- Pilih Bahan --</option>
                    {bahanBaku.map(b => <option key={b.nama} value={b.nama}>{b.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Jumlah (Qty)</label>
                  <input type="number" min="0" step="0.1" placeholder="0"
                    value={wasteQty} onChange={e => setWasteQty(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-xl p-2.5" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Alasan</label>
                  <input type="text" placeholder="Basi, rusak, overproduksi, dll"
                    value={wasteAlasan} onChange={e => setWasteAlasan(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-xl p-2.5" />
                </div>
                <button onClick={handleAddWaste}
                  disabled={!wasteBahan || !wasteQty}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:cursor-not-allowed">
                  Catat Waste
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Riwayat Waste</h3>
              {branchWasteLogs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Belum ada waste.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {branchWasteLogs.map(w => (
                    <div key={w.id} className="flex items-center justify-between p-2.5 bg-red-50 rounded-xl border border-red-100">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{w.bahanNama}</p>
                        <p className="text-[10px] text-gray-500">{w.qtyWasted} {w.satuan} — {w.reason}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-red-700">{formatCurrency(w.lossValue)}</span>
                        <button onClick={() => onDeleteWasteLog(w.id)}
                          className="text-gray-400 hover:text-red-600 cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── PRODUCTION PLANNER ─── */}
        {activeModul === 'planner' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* KIRI: Input Target Produksi */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
                <ClipboardCheck className="w-4 h-4 inline text-emerald-600 mr-1" /> Target Produksi
              </h3>
              <p className="text-[10px] text-gray-400">Masukkan jumlah produksi yang direncanakan hari ini.</p>
              <div className="space-y-3">
                {productHpp.map(p => (
                  <div key={p.namaProduk} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{p.namaProduk}</span>
                    <input type="number" min="0"
                      value={plannerTargets[p.namaProduk] || ''}
                      onChange={e => setPlannerTargets(prev => ({ ...prev, [p.namaProduk]: parseInt(e.target.value) || 0 }))}
                      className="w-20 border border-gray-200 rounded-lg p-2 text-xs font-mono font-bold text-center"
                      placeholder="0" />
                    <span className="text-[10px] text-gray-400 w-8">pcs</span>
                  </div>
                ))}
                {productHpp.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Belum ada produk. Buat resep dulu.</p>
                )}
              </div>
              {(() => {
                const totalPcs = Object.values(plannerTargets).reduce((a, b) => a + b, 0);
                const plannerNeeds = calcPlannerNeeds();
                const totalPlannerHarga = Object.values(plannerNeeds).reduce((sum, n) => sum + n.hargaTotal, 0);
                return totalPcs > 0 ? (
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-emerald-800">
                      <span>Total Produk:</span>
                      <span>{totalPcs} pcs</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-800">
                      <span>Est. Biaya Bahan:</span>
                      <span className="font-mono">{formatCurrency(totalPlannerHarga)}</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* KANAN: Hasil Kebutuhan Bahan */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
                <Package className="w-4 h-4 text-emerald-600" /> Daftar Belanja Bahan
              </h3>
              {(() => {
                const plannerNeeds = calcPlannerNeeds();
                const totalPlannerHarga = Object.values(plannerNeeds).reduce((sum, n) => sum + n.hargaTotal, 0);
                if (Object.keys(plannerNeeds).length === 0) {
                  return <p className="text-xs text-gray-400 text-center py-8">Masukkan target produksi di samping.</p>;
                }
                return (
                  <div className="space-y-3">
                    {Object.entries(plannerNeeds).sort(([, a], [, b]) => b.total - a.total).map(([bahan, data]) => {
                      const dalamKg = data.total >= 1000;
                      return (
                        <div key={bahan} className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-bold text-gray-900 text-xs">{bahan}</span>
                              <span className="text-xs text-gray-400 ml-2">
                                {dalamKg ? `${(data.total / 1000).toFixed(1)} kg` : `${Math.round(data.total)} ${data.satuan}`}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-emerald-800 text-xs">{formatCurrency(data.hargaTotal)}</span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {data.perProduk.map((pp, i) => (
                              <span key={i} className="text-[9px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
                                {pp.nama}: {pp.qty}gr
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs">
                      <div className="flex justify-between font-bold text-emerald-800">
                        <span>Total Kebutuhan Bahan:</span>
                        <span className="font-mono">{formatCurrency(totalPlannerHarga)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ─── PRODUCTION CENTER (CABANG) ─── */}
        {activeModul === 'prodcenter' && (
          <div className="space-y-4">
            {/* MPS Sederhana */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-4">
                <Clock className="w-4 h-4 text-emerald-600" /> Jadwal Produksi Hari Ini
              </h3>
              <div className="space-y-2">
                {productHpp.slice(0, 5).map(p => {
                  const rec = Math.max(0, (preOrders[p.namaProduk] || 0) - (displayStock[p.namaProduk] || 0) + 10);
                  return (
                    <div key={p.namaProduk} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                      <span className="text-xs font-semibold text-gray-900">{p.namaProduk}</span>
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                        🔥 {rec} porsi
                      </span>
                    </div>
                  );
                })}
                {productHpp.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Belum ada produk.</p>}
              </div>
            </div>

            {/* Work Order Cepat */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" /> Work Order Cepat
                </h3>
              </div>
              {(() => {
                const [woProd, setWoProd] = useState('');
                const [woBatch, setWoBatch] = useState(1);
                const [woNotes, setWoNotes] = useState('');
                const resep = detailResep.filter(r => r.namaProduk === woProd);
                const calc = calculatedProducts.find(c => c.namaProduk === woProd);
                const totalCost = resep.reduce((s, r) => {
                  const b = bahanBaku.find(x => x.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
                  return s + (r.takaran * woBatch * (b?.hargaSatuan || 0));
                }, 0);
                return (
                  <div className="space-y-3 text-xs">
                    <select value={woProd} onChange={e => setWoProd(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2.5">
                      <option value="">-- Pilih Produk --</option>
                      {productHpp.map(p => <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk}</option>)}
                    </select>
                    {woProd && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Batch:</span>
                          <input type="range" min="0.5" max="20" step="0.5" value={woBatch}
                            onChange={e => setWoBatch(parseFloat(e.target.value))}
                            className="flex-1 accent-emerald-600" />
                          <span className="font-mono font-bold text-emerald-700 w-8 text-right">{woBatch}x</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          {resep.map((r, i) => {
                            const b = bahanBaku.find(x => x.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
                            return <div key={i} className="flex justify-between py-0.5"><span>{r.namaBahan}</span><span className="font-mono font-bold">{(r.takaran * woBatch).toFixed(0)} {b?.satuan||'gr'}</span></div>;
                          })}
                          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-emerald-700">
                            <span>Est. Biaya Batch:</span>
                            <span className="font-mono">{formatCurrency(totalCost)}</span>
                          </div>
                        </div>
                        <textarea value={woNotes} onChange={e => setWoNotes(e.target.value)}
                          placeholder="Catatan dapur..."
                          className="w-full border border-gray-200 rounded-lg p-2.5 text-xs h-16 resize-none" />
                        <button onClick={() => {
                          const pw = window.open('', '_blank');
                          if (!pw) return;
                          const rows = resep.map(r => {
                            const b = bahanBaku.find(x => x.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
                            return `<tr><td style="padding:6px;border-bottom:1px solid #eee;">${r.namaBahan}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${(r.takaran * woBatch).toFixed(0)}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:center;">${b?.satuan||'gr'}</td></tr>`;
                          }).join('');
                          pw.document.write(`<html><head><title>WO - ${woProd}</title><style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;}table{width:100%;border-collapse:collapse;}th{background:#f3f4f6;padding:8px;text-align:left;font-size:11px;}@media print{body{padding:10px;}}</style></head><body><h1>🧾 Work Order</h1><p><strong>${woProd}</strong> &nbsp;|&nbsp; Batch: ${woBatch}x &nbsp;|&nbsp; ${new Date().toLocaleDateString('id-ID')}</p><table><thead><tr><th>Bahan</th><th style="text-align:right;">Jumlah</th><th style="text-align:center;">Satuan</th></tr></thead><tbody>${rows}</tbody></table><p style="margin-top:20px;font-weight:bold;">Total Biaya: ${formatCurrency(totalCost)}</p>${woNotes ? `<p style="background:#fffbeb;padding:8px;border-radius:6px;"><strong>Catatan:</strong> ${woNotes}</p>` : ''}<script>window.print();<\/script></body></html>`);
                          pw.document.close();
                        }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer">
                          <Printer className="w-4 h-4 inline mr-1" /> Cetak Work Order
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ─── LAPORAN ─── */}
        {activeModul === 'laporan' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">📊 Ringkasan {cabang.nama}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">SO Diterima</p>
                  <p className="text-xl font-black text-emerald-800 font-mono mt-1">{branchSOs.filter(s => s.status === 'diterima').length}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-[10px] uppercase font-bold text-blue-700">SO Dikirim</p>
                  <p className="text-xl font-black text-blue-800 font-mono mt-1">{branchSOs.filter(s => s.status === 'dikirim').length}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[10px] uppercase font-bold text-amber-700">Total Waste</p>
                  <p className="text-xl font-black text-amber-800 font-mono mt-1">{formatCurrency(branchWasteLogs.reduce((a, w) => a + w.lossValue, 0))}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="text-[10px] uppercase font-bold text-purple-700">Bahan SO</p>
                  <p className="text-xl font-black text-purple-800 font-mono mt-1">
                    {branchSOs.reduce((acc, s) => acc + s.items.reduce((a, i) => a + i.qty, 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Riwayat Surat Order</h3>
              {branchSOs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Belum ada SO.</p>
              ) : (
                <div className="space-y-2">
                  {branchSOs.map(so => (
                    <div key={so.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          {new Date(so.tanggalKirim).toLocaleDateString('id-ID')}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {so.items.map(i => `${i.bahanNama}: ${i.qty}`).join(', ')}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        so.status === 'diterima' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>{so.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
