import React, { useState } from 'react';
import { Star, FileText, Printer, Download, Trash2 } from 'lucide-react';

interface SupplierRating {
  name: string;
  contractPrice: string;
  complianceRatio: number;
  rating: number;
}

export default function SupplierTab() {
  const [suppliers, setSuppliers] = useState<SupplierRating[]>([]);
  const [poVisible, setPoVisible] = useState(false);
  const [poSupplier, setPoSupplier] = useState('');
  const [poMaterial, setPoMaterial] = useState('');
  const [poQty, setPoQty] = useState('');
  const [poUnit, setPoUnit] = useState('');
  const [newSup, setNewSup] = useState({ name: '', contractPrice: '', complianceRatio: 90, rating: 4 });

  const handleAddSupplier = () => {
    if (!newSup.name) return;
    setSuppliers(prev => [...prev, { ...newSup, name: newSup.name.trim(), contractPrice: newSup.contractPrice.trim() }]);
    setNewSup({ name: '', contractPrice: '', complianceRatio: 90, rating: 4 });
  };

  const handleDeleteSupplier = (name: string) => {
    if (!window.confirm(`Hapus supplier "${name}"?`)) return;
    setSuppliers(prev => prev.filter(s => s.name !== name));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="w-6 h-6 text-emerald-600" /> Supplier & Purchase Order
        </h2>
        <p className="text-xs text-gray-500 mt-1">Kelola vendor supplier dan buat draft purchase order.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SUPPLIER LIST */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Daftar Supplier</h3>

          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            {suppliers.map((s, idx) => (                  <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-50 pb-2 group">
                <div>
                  <span className="font-bold text-gray-950 block">{s.name}</span>
                  <span className="text-[10px] text-gray-400">{s.contractPrice}</span>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <span className="font-bold text-emerald-800 text-sm block">★ {s.rating.toFixed(1)}</span>
                    <span className="text-[9px] text-gray-400">Ontime: {s.complianceRatio}%</span>
                  </div>
                  <button onClick={() => handleDeleteSupplier(s.name)}
                    className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Hapus Supplier">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {suppliers.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Belum ada supplier terdaftar.</p>}
          </div>

          <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-dashed border-gray-200">
            <h4 className="text-xs font-bold text-gray-700">Tambah Supplier Baru</h4>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Nama" value={newSup.name}
                onChange={(e) => setNewSup(p => ({ ...p, name: e.target.value }))}
                className="border border-gray-200 rounded-lg p-2 text-xs" />
              <input type="text" placeholder="Harga kontrak" value={newSup.contractPrice}
                onChange={(e) => setNewSup(p => ({ ...p, contractPrice: e.target.value }))}
                className="border border-gray-200 rounded-lg p-2 text-xs" />
            </div>
            <button onClick={handleAddSupplier}
              className="w-full bg-gray-950 text-white font-bold text-xs py-2 rounded-lg hover:bg-gray-900 transition cursor-pointer">
              + Tambah Supplier
            </button>
          </div>
        </div>

        {/* PO DRAFT */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <FileText className="w-4 h-4 text-emerald-600" /> Draft Purchase Order
          </h3>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Supplier</label>
              <select value={poSupplier} onChange={(e) => setPoSupplier(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white"
                onClick={() => { if (suppliers.length === 0) alert('Belum ada supplier. Tambah dulu!'); }}>
                {suppliers.length === 0
                  ? <option value="">-- Belum ada supplier --</option>
                  : suppliers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)
                }
              </select>
            </div>              <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Bahan</label>
                <input type="text" value={poMaterial} onChange={(e) => setPoMaterial(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Qty</label>
                <input type="number" value={poQty} onChange={(e) => setPoQty(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Satuan</label>
              <input type="text" value={poUnit} onChange={(e) => setPoUnit(e.target.value)}
                placeholder="Misal: Karton, Sack, Kg"
                className="w-full border border-gray-200 rounded-lg p-2" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                if (!poSupplier || !poMaterial || !poQty) {
                  alert('Lengkapi semua field PO terlebih dahulu!');
                  return;
                }
                const total = parseFloat(poQty) * 0;
                const printWin = window.open('', '_blank');
                if (!printWin) return;
                printWin.document.write(`
                  <html><head>
                    <title>PO - ${poSupplier}</title>
                    <style>
                      body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #1f2937; }
                      h1 { font-size: 22px; color: #065f46; margin-bottom: 4px; }
                      .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
                      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                      th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
                      td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
                      .footer { margin-top: 30px; border-top: 2px solid #d1d5db; padding-top: 16px; font-size: 12px; }
                      .sign { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
                      @media print { body { padding: 0; } }
                    </style>
                  </head><body>
                    <h1>📄 PURCHASE ORDER</h1>
                    <div class="meta">
                      <strong>No PO:</strong> PO-2026-${Date.now().toString().slice(-4)}<br>
                      <strong>Supplier:</strong> ${poSupplier}<br>
                      <strong>Tanggal:</strong> ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
                      <strong>Status:</strong> Draft
                    </div>
                    <table>
                      <thead><tr><th>Item Bahan</th><th style="text-align:right;">Qty</th><th>Satuan</th></tr></thead>
                      <tbody>
                        <tr><td>${poMaterial}</td><td style="text-align:right;font-family:monospace;">${poQty}</td><td>${poUnit || '-'}</td></tr>
                      </tbody>
                    </table>
                    <div class="footer">
                      <p><strong>Catatan:</strong> PO ini diterbitkan secara digital melalui Near Bakery & Co. ERP.</p>
                      <p>Mohon konfirmasi ketersediaan stok dan jadwal pengiriman.</p>
                    </div>
                    <div class="sign">
                      <div>_____________<br>Pembeli</div>
                      <div>_____________<br>Supplier</div>
                    </div>
                    <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:11px;">Near Bakery & Co. ERP — Purchase Order System</p>
                    <script>window.print();<\/script>
                  </body></html>
                `);
                printWin.document.close();
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Cetak PO
            </button>
            <button onClick={() => alert(`PO untuk ${poMaterial} sebanyak ${poQty} ke ${poSupplier} siap dikirim!`)}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer">
              Kirim PO via Email
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
