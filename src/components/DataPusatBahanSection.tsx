import React, { useState, useEffect } from 'react';
import { BahanBaku, Cabang, SuratOrder } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import { Package, Search, Plus, Trash2, Edit2, Printer, FileText, X, Building2, Truck } from 'lucide-react';

interface DataPusatBahanSectionProps {
  bahanBaku: BahanBaku[];
  onAddMaterial: (m: BahanBaku) => void;
  onEditMaterial: (oldName: string, m: BahanBaku) => void;
  onDeleteMaterial: (name: string) => void;
  showConfirm: (opts: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: string; onConfirm: () => void; onCancel?: () => void }) => void;
  cabangList?: Cabang[];
  suratOrders?: SuratOrder[];
}

export default function DataPusatBahanSection({
  bahanBaku, onAddMaterial, onEditMaterial, onDeleteMaterial, showConfirm,
  cabangList = [], suratOrders = [],
}: DataPusatBahanSectionProps) {
  const [bahanSearch, setBahanSearch] = useState('');
  const [showBahanModal, setShowBahanModal] = useState(false);
  const [editingBahan, setEditingBahan] = useState<BahanBaku | null>(null);
  const [bahanForm, setBahanForm] = useState({kode:'',nama:'',satuan:'gr',isiKemasan:1000,hargaBeliReal:0,markupPercent:25,kategori:'Produk',konversiGram:0});

  const [bahanKategoriList, setBahanKategoriList] = useState<string[]>(() => {
    const saved = safeGetLocalStorage<string[]>('bahan_kategori_list', []);
    if (saved && saved.length > 0) {
      return ['Semua', ...saved];
    }
    return ['Semua', 'Produk', 'Minuman', 'Alat'];
  });
  const [bahanKategoriFilter, setBahanKategoriFilter] = useState<string>('Semua');
  const [showKategoriManager, setShowKategoriManager] = useState(false);
  const [editingKategori, setEditingKategori] = useState('');
  const [newKategoriName, setNewKategoriName] = useState('');

  useEffect(() => {
    const catsForStorage = bahanKategoriList.filter(c => c !== 'Semua');
    localStorage.setItem('bahan_kategori_list', JSON.stringify(catsForStorage));
  }, [bahanKategoriList]);

  const handleAddKategori = () => {
    const name = newKategoriName.trim();
    if (!name) return;
    if (bahanKategoriList.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert(`Kategori "${name}" sudah ada!`);
      return;
    }
    setBahanKategoriList(prev => {
      const withoutSemua = prev.filter(c => c !== 'Semua');
      return ['Semua', ...withoutSemua, name].sort((a, b) => {
        if (a === 'Semua') return -1;
        if (b === 'Semua') return 1;
        return a.localeCompare(b);
      });
    });
    setNewKategoriName('');
  };

  const handleDeleteKategori = async (cat: string) => {
    if (cat === 'Semua') return;
    const confirmed = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: `Hapus kategori "${cat}"? Bahan dengan kategori ini akan tetap ada — ubah kategorinya secara manual.`,
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;
    setBahanKategoriList(prev => prev.filter(c => c !== cat));
    if (bahanKategoriFilter === cat) setBahanKategoriFilter('Semua');
  };

  const handleRenameKategori = (oldName: string) => {
    const newName = editingKategori.trim();
    if (!newName || oldName === 'Semua') return;
    if (bahanKategoriList.some(c => c.toLowerCase() === newName.toLowerCase() && c !== oldName)) {
      alert(`Kategori "${newName}" sudah ada!`);
      return;
    }
    setBahanKategoriList(prev => prev.map(c => c === oldName ? newName : c));
    bahanBaku.forEach(b => {
      if ((b.kategori || 'Produk') === oldName) {
        onEditMaterial(b.nama, { ...b, kategori: newName });
      }
    });
    if (bahanKategoriFilter === oldName) setBahanKategoriFilter(newName);
    setEditingKategori('');
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const cetakLaporanHtml = (judul: string, headers: string[], rows: string[][], footer?: string): string => {
    return `
      <html><head>
        <title>${judul} - Near Bakery</title>
        <style>
          body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1f2937;}
          h1{font-size:20px;color:#065f46;border-bottom:2px solid #065f46;padding-bottom:8px;}
          .meta{font-size:11px;color:#6b7280;margin-bottom:20px;}
          table{width:100%;border-collapse:collapse;margin:16px 0;}
          th{background:#f3f4f6;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;}
          td{padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;}
          tr:hover{background:#f9fafb;}
          .footer{margin-top:30px;border-top:2px solid #d1d5db;padding-top:16px;font-size:11px;}
          .sign{margin-top:50px;display:flex;justify-content:space-between;font-size:10px;}
          @media print{body{padding:20px;}@page{margin:15mm;}}
        </style>
      </head><body>
        <h1>📋 ${judul}</h1>
        <div class="meta">Near Bakery & Co. — Dicetak: ${new Date().toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
        ${footer ? `<div class="footer">${footer}</div>` : ''}
        <div class="sign"><div>_____________<br>Pembuat</div><div>_____________<br>Mengetahui</div></div>
        <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:9px;">Near Bakery & Co. ERP — ${judul}</p>
        <script>window.print();setTimeout(()=>window.close(),500);<\/script>
      </body></html>`;
  };

  const cetakDokumen = (judul: string, html: string) => {
    const pw = window.open('', '_blank');
    if (!pw) {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${judul.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('📄 Popup terblokir! File HTML berhasil di-download.\n\n🔹 Buka file tersebut di browser\n🔹 Tekan Ctrl+P atau klik menu File → Print\n🔹 Pilih "Save as PDF" sebagai printer\n🔹 Klik Simpan untuk menyimpan sebagai PDF.');
      return;
    }
    pw.document.write(html);
    pw.document.close();
  };

  const handleCetakRekapBahan = () => {
    const headers = ['Kode','Nama Bahan','Stok','Satuan','Harga Satuan','Total Nilai'];
    const sorted = [...bahanBaku].sort((a, b) => a.nama.localeCompare(b.nama));
    const rows = sorted.map(b => [
      b.kode||'-', b.nama, b.isiKemasan.toString(), b.satuan, formatCurrency(b.hargaSatuan), formatCurrency(b.isiKemasan * b.hargaSatuan)
    ]);
    cetakDokumen('Rekap_Bahan', cetakLaporanHtml('REKAP BAHAN BAKU', headers, rows,
      `Total: ${sorted.length} item | Nilai: ${formatCurrency(sorted.reduce((s,b) => s + (b.isiKemasan * b.hargaSatuan), 0))}`
    ));
  };

  const handleExportCSVRekap = () => {
    const headers = ['Kode','Nama Bahan','Stok','Satuan','Harga Satuan','Total Nilai'];
    const sorted = [...bahanBaku].sort((a, b) => a.nama.localeCompare(b.nama));
    const rows = sorted.map(b => [b.kode||'', b.nama, b.isiKemasan.toString(), b.satuan, b.hargaSatuan.toString(), (b.isiKemasan * b.hargaSatuan).toString()]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap_bahan_${new Date().toISOString().substring(0,10)}.csv`;
    a.click();
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">            <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Cari bahan..." value={bahanSearch}
            onChange={e => setBahanSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>              <div className="flex items-center gap-2">
          <button onClick={handleCetakRekapBahan}
            className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
            <Printer className="w-3 h-3" /> Cetak Rekap
          </button>
          <button onClick={handleExportCSVRekap}
            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
            <FileText className="w-3 h-3" /> CSV
          </button>
          <button onClick={() => {
          const autoKode = `BB-${Date.now().toString(36).toUpperCase()}`;
          setEditingBahan(null);
          const defaultKategori = bahanKategoriFilter !== 'Semua' ? bahanKategoriFilter : 'Produk';
          const defaultSatuan = defaultKategori === 'Minuman' ? 'ml' : defaultKategori === 'Alat' ? 'pcs' : 'gr';
          const defaultIsi = defaultKategori === 'Alat' ? 1 : 1000;
          const defaultMarkup = defaultKategori === 'Alat' ? 0 : 25;
          setBahanForm({kode: autoKode, nama: '', satuan: defaultSatuan, isiKemasan: defaultIsi, hargaBeliReal: 0, markupPercent: defaultMarkup, kategori: defaultKategori, konversiGram: 0});
          setShowBahanModal(true);
        }}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Tambah Bahan Baru
        </button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {bahanKategoriList.map(cat => {
              const count = cat === 'Semua' ? bahanBaku.length : bahanBaku.filter(b => (b.kategori || 'Produk') === cat).length;
              return (
                <div key={cat} className="group relative flex items-center">
                  <button onClick={() => setBahanKategoriFilter(cat)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                      bahanKategoriFilter === cat ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {cat} ({count})
                  </button>
                  {showKategoriManager && cat !== 'Semua' && (
                    <div className="flex items-center gap-0.5 ml-0.5">
                      {editingKategori === cat ? (
                        <>
                          <input
                            type="text"
                            value={editingKategori}
                            onChange={(e) => setEditingKategori(e.target.value)}
                            className="w-16 p-0.5 text-[9px] border border-emerald-500 rounded bg-white text-black"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameKategori(cat); if (e.key === 'Escape') setEditingKategori(''); }}
                          />
                          <button onClick={() => handleRenameKategori(cat)} className="text-emerald-600 hover:text-emerald-500 p-0.5 cursor-pointer text-[9px]">✓</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingKategori(cat); }} className="text-gray-400 hover:text-emerald-600 text-[9px] p-0.5 opacity-0 group-hover:opacity-100 transition cursor-pointer">✏️</button>
                          <button onClick={() => handleDeleteKategori(cat)} className="text-gray-400 hover:text-red-500 text-[9px] p-0.5 opacity-0 group-hover:opacity-100 transition cursor-pointer">🗑️</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowKategoriManager(!showKategoriManager); setEditingKategori(''); }}
              className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg transition cursor-pointer ${
                showKategoriManager ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}>
              {showKategoriManager ? 'Selesai' : '✏️ Kelola Kategori'}
            </button>
            {showKategoriManager && (
              <div className="flex items-center gap-1 flex-1">
                <input type="text" placeholder="Nama kategori baru" value={newKategoriName}
                  onChange={(e) => setNewKategoriName(e.target.value)}
                  className="flex-1 p-1.5 text-[10px] border border-gray-200 rounded-lg bg-white"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddKategori(); }} />
                <button onClick={handleAddKategori} className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer">+ Tambah</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── STOK STATS CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 px-4 pb-4">
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

      {bahanBaku.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-8">Belum ada bahan terdaftar.</p>
      ) : (
        <div className="overflow-x-auto">
<table className="w-full text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Nama Bahan</th>
                <th className="px-4 py-3 text-right">Stok Gudang</th>
                <th className="px-4 py-3 text-right">Total Dikirim</th>
                <th className="px-4 py-3 text-right">Sisa Stok</th>
                <th className="px-4 py-3">Satuan</th>
                <th className="px-4 py-3 text-right">Harga Satuan</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bahanBaku.filter(b => {
                const matchSearch = b.nama.toLowerCase().includes(bahanSearch.toLowerCase());
                const matchKategori = bahanKategoriFilter === 'Semua' || (b.kategori || 'Produk') === bahanKategoriFilter;
                return matchSearch && matchKategori;
              }).map((b, idx) => {
                const markPct = b.markupPercent ?? 25;
                const hargaMarkup = b.hargaBeliReal > 0 ? b.hargaBeliReal * (1 + markPct/100) : b.hargaBeli;
                const totalDikirim = suratOrders
                  .filter(s => s.status === 'dikirim' || s.status === 'diterima')
                  .flatMap(s => s.items)
                  .filter(i => i.bahanNama === b.nama)
                  .reduce((acc, i) => acc + i.qty, 0);
                const sisaStok = b.isiKemasan;
                return (
                  <tr key={b.nama} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-500">{b.kode || `BB-${String(idx + 1).padStart(3, '0')}`}</td>
                    <td className="px-4 py-3"><span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">{b.kategori || 'Produk'}</span></td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{b.nama}</td>
                    <td className="px-4 py-3 text-right font-mono">{b.isiKemasan}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">{totalDikirim > 0 ? `-${totalDikirim}` : '-'}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${sisaStok < 10 ? 'text-red-700' : 'text-emerald-700'}`}>{sisaStok}</td>
                    <td className="px-4 py-3">{b.satuan}</td>
                    <td className="px-4 py-3 text-right font-mono">{b.hargaBeliReal > 0 ? formatCurrency(b.hargaBeliReal) : formatCurrency(b.hargaBeli)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{markPct}%</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(Math.round(hargaMarkup))}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{formatCurrency(b.hargaSatuan)}/{b.satuan}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditingBahan(b); setBahanForm({kode:b.kode||'',nama:b.nama,satuan:b.satuan,isiKemasan:b.isiKemasan,hargaBeliReal:b.hargaBeliReal||b.hargaBeli,markupPercent:markPct,kategori:b.kategori||'Produk',konversiGram:b.konversiGram||0}); setShowBahanModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 cursor-pointer" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { showConfirm({ title: "Hapus Bahan", message: `Hapus bahan "${b.nama}"?`, confirmLabel: "Hapus", cancelLabel: "Batal", variant: "danger", onConfirm: () => onDeleteMaterial(b.nama), }); }}
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
      <div className="p-3 bg-blue-50 border-t border-blue-100 text-[10px] text-blue-800">
        <strong>💡 Markup Harga:</strong> Harga Beli (Real) × (1 + Markup%) = Harga Jual per Kemasan. <strong>Contoh:</strong> Rp10.000 × 25% markup = Rp12.500/kemasan.
      </div>

      {/* ─── STOK FLOW INFO ─── */}
      <div className="mx-4 mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-indigo-800">
        <strong>Alur Stok Pusat → Cabang:</strong><br />
        1. Cabang minta barang → Status <strong>"🕐 Minta"</strong> (pending)<br />
        2. Owner setujui → Status <strong>"Dikirim"</strong> → <strong>Stok Pusat berkurang</strong> ✅<br />
        3. Cabang terima → Status <strong>"Diterima"</strong> → <strong>Stok Cabang bertambah</strong> ✅<br />
        Stok pusat otomatis ter-update dari setiap pengiriman.
      </div>
    </div>

    {/* ─── MODAL BAHAN (ADD/EDIT) ─── */}
    {showBahanModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" /> {editingBahan ? 'Edit Bahan' : 'Tambah Bahan Baru'}
            </h3>
            <button onClick={() => setShowBahanModal(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kode (opsional)</label>
                <input type="text" placeholder="BB-001" value={bahanForm.kode}
                  onChange={e => setBahanForm(f => ({...f, kode: e.target.value}))}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kategori *</label>
                <select value={bahanForm.kategori}
                  onChange={e => setBahanForm(f => ({...f, kategori: e.target.value}))}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5">
                  {bahanKategoriList.filter(c => c !== 'Semua').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Bahan *</label>
              <input type="text" required placeholder="Contoh: Tepung Terigu Protein Tinggi" value={bahanForm.nama}
                onChange={e => setBahanForm(f => ({...f, nama: e.target.value}))}
                className="w-full text-xs border border-gray-200 rounded-xl p-2.5" />
            </div>
            {bahanForm.kategori !== 'Alat' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Stok Saat Ini</label>
                    <input type="number" min="1" value={bahanForm.isiKemasan}
                      onChange={e => setBahanForm(f => ({...f, isiKemasan: parseInt(e.target.value)||0}))}
                      className="w-full text-xs border border-gray-200 rounded-xl p-2.5 font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Satuan</label>
                    <select value={bahanForm.satuan}
                      onChange={e => setBahanForm(f => ({...f, satuan: e.target.value}))}
                      className="w-full text-xs border border-gray-200 rounded-xl p-2.5">
                      <option value="gr">gr (gram)</option>
                      <option value="kg">kg (kilogram)</option>
                      <option value="ml">ml (mililiter)</option>
                      <option value="liter">liter</option>
                      <option value="pcs">pcs (pieces)</option>
                      <option value="pack">pack</option>
                      <option value="sdt">sdt (sendok teh)</option>
                      <option value="sdm">sdm (sendok makan)</option>
                    </select>
                  </div>
                </div>
                {['pcs','pack','bungkus','box','krat','ikat','ekor','karung','dus'].includes(bahanForm.satuan) && (
                <div className="mb-3">
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Berat per Unit (gram) — untuk konversi takaran resep</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" step="0.1" placeholder="0" value={bahanForm.konversiGram}
                      onChange={e => setBahanForm(f => ({...f, konversiGram: parseFloat(e.target.value)||0}))}
                      className="w-24 text-xs border border-gray-200 rounded-xl p-2.5 font-mono" />
                    <span className="text-[10px] text-gray-400">gr / {bahanForm.satuan}</span>
                    {bahanForm.konversiGram > 0 && (
                      <span className="text-[10px] text-emerald-600 font-semibold ml-2">1 {bahanForm.satuan} = {bahanForm.konversiGram} gr</span>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">Contoh: 1 telur = 50gr. Isi 50 agar resep dalam gram otomatis dikonversi ke {bahanForm.satuan}.</p>
                </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Harga Beli (Real) *</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">Rp</span>
                      <input type="number" min="0" placeholder="10000" value={bahanForm.hargaBeliReal}
                        onChange={e => setBahanForm(f => ({...f, hargaBeliReal: parseInt(e.target.value)||0}))}
                        className="w-full pl-8 text-xs border border-gray-200 rounded-xl p-2.5 font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Markup (%)</label>
                    <div className="relative">
                      <input type="number" min="0" max="1000" value={bahanForm.markupPercent}
                        onChange={e => setBahanForm(f => ({...f, markupPercent: parseInt(e.target.value)||0}))}
                        className="w-full text-xs border border-gray-200 rounded-xl p-2.5 font-mono font-bold text-emerald-700" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-bold">%</span>
                    </div>
                  </div>
                </div>
                {bahanForm.hargaBeliReal > 0 && (
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Harga Beli (Real):</span>
                      <span className="font-mono font-bold">{formatCurrency(bahanForm.hargaBeliReal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Markup {bahanForm.markupPercent}%:</span>
                      <span className="font-mono font-bold text-amber-700">+{formatCurrency(Math.round(bahanForm.hargaBeliReal * bahanForm.markupPercent / 100))}</span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200 pt-1">
                      <span className="font-bold text-emerald-800">Harga Jual per Kemasan:</span>
                      <span className="font-mono font-black text-emerald-800">{formatCurrency(Math.round(bahanForm.hargaBeliReal * (1 + bahanForm.markupPercent/100)))}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">Harga Satuan per {bahanForm.satuan}:</span>
                      <span className="font-mono text-gray-600">{formatCurrency(Math.round(bahanForm.hargaBeliReal * (1 + bahanForm.markupPercent/100) / bahanForm.isiKemasan))}/{bahanForm.satuan}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800 mb-2">
                  🔧 <strong>Kategori Alat</strong> — isi dengan data alat/perlengkapan. Tidak menggunakan markup harga.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Jumlah Unit</label>
                    <input type="number" min="1" value={bahanForm.isiKemasan}
                      onChange={e => setBahanForm(f => ({...f, isiKemasan: parseInt(e.target.value)||1, satuan: 'pcs'}))}
                      className="w-full text-xs border border-gray-200 rounded-xl p-2.5 font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Satuan</label>
                    <div className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-gray-50 text-gray-500 font-bold">
                      pcs
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Harga Beli (per unit) *</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">Rp</span>
                    <input type="number" min="0" placeholder="500000" value={bahanForm.hargaBeliReal}
                      onChange={e => setBahanForm(f => ({...f, hargaBeliReal: parseInt(e.target.value)||0, markupPercent: 0}))}
                      className="w-full pl-8 text-xs border border-gray-200 rounded-xl p-2.5 font-mono" />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">Harga beli alat per unit. Tidak ada markup.</p>
                </div>
                {bahanForm.hargaBeliReal > 0 && (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Harga Beli:</span>
                      <span className="font-mono font-bold">{formatCurrency(bahanForm.hargaBeliReal)}</span>
                    </div>
                    <div className="flex justify-between border-t border-amber-200 pt-1 mt-1">
                      <span className="font-bold text-amber-800">Total Nilai ({bahanForm.isiKemasan} pcs):</span>
                      <span className="font-mono font-black text-amber-800">{formatCurrency(bahanForm.hargaBeliReal * bahanForm.isiKemasan)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setShowBahanModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer">Batal</button>
              <button onClick={() => {
                if (!bahanForm.nama.trim()) return;
                const isAlat = bahanForm.kategori === 'Alat';
                const hargaJual = isAlat ? bahanForm.hargaBeliReal : Math.round(bahanForm.hargaBeliReal * (1 + bahanForm.markupPercent/100));
                const hargaSatuan = isAlat ? bahanForm.hargaBeliReal : (bahanForm.isiKemasan > 0 ? Math.round(hargaJual / bahanForm.isiKemasan) : 0);
                const finalIsiKemasan = isAlat ? (bahanForm.isiKemasan || 1) : bahanForm.isiKemasan;
                const newBahan: BahanBaku = {
                  kode: bahanForm.kode || undefined,
                  nama: bahanForm.nama.trim(),
                  kategori: bahanForm.kategori || undefined,
                  satuan: isAlat ? 'pcs' : bahanForm.satuan,
                  isiKemasan: finalIsiKemasan,
                  stok: finalIsiKemasan,
                  hargaBeli: hargaJual,
                  hargaSatuan: hargaSatuan,
                  hargaBeliReal: bahanForm.hargaBeliReal,
                  hargaSatuanReal: isAlat ? bahanForm.hargaBeliReal : (bahanForm.isiKemasan > 0 ? Math.round(bahanForm.hargaBeliReal / bahanForm.isiKemasan) : 0),
                  markupPercent: isAlat ? 0 : bahanForm.markupPercent,
                  konversiGram: bahanForm.konversiGram > 0 ? bahanForm.konversiGram : undefined,
                };
                if (editingBahan) {
                  onEditMaterial(editingBahan.nama, newBahan);
                } else {
                  onAddMaterial(newBahan);
                }
                setShowBahanModal(false);
              }}
                disabled={!bahanForm.nama.trim() || bahanForm.hargaBeliReal <= 0 || (bahanForm.kategori !== 'Alat' && bahanForm.isiKemasan <= 0)}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl cursor-pointer disabled:cursor-not-allowed">
                {editingBahan ? 'Simpan Perubahan' : 'Tambah Bahan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
