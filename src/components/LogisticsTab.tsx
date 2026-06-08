import React, { useState, useEffect } from 'react';
import { Truck, QrCode, Move, ShoppingCart, CheckCircle, RefreshCw, FolderSearch, FileText, Printer, Plus, X, Trash2 } from 'lucide-react';
import { SATUAN_OPTIONS } from '../types';

interface RequisitionItem {
  reqNo: string;
  sourceBranch: string;
  targetWH: string;
  itemName: string;
  qtyNeeded: number;
  qtyPredicted: number; // based on AI predictive forecast
  status: 'Draft' | 'Sent' | 'Processing' | 'Shipped' | 'Received';
  dateCreated: string;
}

interface PurchaseOrder {
  poNo: string;
  vendorName: string;
  itemName: string;
  qty: number;
  unit: string;
  pricePerUnit: number;
  totalCost: number;
  dateOrdered: string;
  status: 'Draft' | 'Approved' | 'Sent to Vendor' | 'Received';
}

export default function LogisticsTab() {
  // Store requisitions list simulation state
  const [requisitions, setRequisitions] = useState<RequisitionItem[]>(() => {
    const saved = localStorage.getItem('logistics_requisitions_data');
    return saved ? JSON.parse(saved) : [];
  });

  // Supplier purchase orders simulation data
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('logistics_purchase_orders_data');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('logistics_requisitions_data', JSON.stringify(requisitions));
  }, [requisitions]);

  useEffect(() => {
    localStorage.setItem('logistics_purchase_orders_data', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  const handleDeleteRequisition = (reqNo: string) => {
    if (window.confirm(`Hapus permintaan sediaan "${reqNo}"?`)) {
      setRequisitions(prev => prev.filter(r => r.reqNo !== reqNo));
    }
  };

  const [activePO, setActivePO] = useState<PurchaseOrder | null>(null);

  // New purchase order form inputs
  const [poVendor, setPoVendor] = useState('');
  const [poItem, setPoItem] = useState('');
  const [poQty, setPoQty] = useState('');
  const [poUnit, setPoUnit] = useState('');
  const [poPrice, setPoPrice] = useState('');

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(poQty) || 1;
    const price = parseFloat(poPrice) || 0;
    const newPO: PurchaseOrder = {
      poNo: `PO-2026-00${purchaseOrders.length + 3}`,
      vendorName: poVendor,
      itemName: poItem,
      qty: qty,
      unit: poUnit,
      pricePerUnit: price,
      totalCost: qty * price,
      dateOrdered: new Date().toISOString().substring(0, 10),
      status: 'Draft'
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
    setPoQty('');
    setPoItem('');
  };

  const handleApprovePO = (poNo: string) => {
    setPurchaseOrders(prev => prev.map(p => p.poNo === poNo ? { ...p, status: 'Approved' } : p));
  };

  const handleDeletePO = (poNo: string) => {
    setPurchaseOrders(prev => prev.filter(p => p.poNo !== poNo));
  };

  // QR Code Simulator
  const [selectedQRTransfer, setSelectedQRTransfer] = useState<string | null>(null);
  const [scannedMessage, setScannedMessage] = useState<string | null>(null);

  // New Requisition Form state
  const [reqBranch, setReqBranch] = useState('');
  const [reqItem, setReqItem] = useState('');
  const [reqQty, setReqQty] = useState('');

  const handleCreateRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(reqQty) || 10;
    const item: RequisitionItem = {
      reqNo: `REQ-0${requisitions.length + 11}`,
      sourceBranch: reqBranch,
      targetWH: 'Dapur Pusat (Central Kitchen)',
      itemName: reqItem,
      qtyNeeded: qty,
      qtyPredicted: Math.round(qty * 1.15), // Predicted quantity based on AI forecast
      status: 'Draft',
      dateCreated: new Date().toISOString().substring(0, 10),
    };

    setRequisitions(prev => [item, ...prev]);
    setReqQty('');
  };

  const handleUpdateStatus = (reqNo: string, newStatus: RequisitionItem['status']) => {
    setRequisitions(prev =>
      prev.map(r => r.reqNo === reqNo ? { ...r, status: newStatus } : r)
    );
  };

  const handleScanSimulation = (r: RequisitionItem) => {
    setSelectedQRTransfer(r.reqNo);
    setScannedMessage(null);
  };

  const confirmQRAction = (req: RequisitionItem) => {
    handleUpdateStatus(req.reqNo, 'Received');
    setScannedMessage(`QR Code Scan Sukses! Mutasi internal tercatat: adonan dipotong dari Dapur Pusat dan ditambahkan ke stok ${req.sourceBranch}.`);
    // Close QR modal after a delay
    setTimeout(() => {
      setSelectedQRTransfer(null);
      setScannedMessage(null);
    }, 3500);
  };

  return (
    <div id="logistics-tab-container" className="space-y-6">
      
      {/* HEADER SECTION PANEL */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            Central Kitchen & Logistik Distribusi Internal
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Kelola pengiriman adonan beku (frozen dough) dari Dapur Pusat ke cabang-cabang retail dengan fitur mutasi QR Code penerimaan scan otomatis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE REQUISITIONS & TRANSFERS LIST */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart className="w-4.5 h-4.5 text-emerald-600" />
              Store Requisitions (Daftar Permintaan Cabang Toko)
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">
              Predictive Logistics Live
            </span>
          </div>

          <div className="overflow-x-auto text-xs sm:text-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/20 text-[10px] uppercase font-bold text-gray-500">
                  <th className="px-5 py-3.5">Kode Permintaan</th>
                  <th className="px-4 py-3.5">Cabang Peminta</th>
                  <th className="px-4 py-3.5">Nama Produk/Adonan</th>
                  <th className="px-4 py-3.5 text-center">Permintaan Staff</th>
                  <th className="px-4 py-3.5 text-center">Prediksi Kebiasaan Hari Ini</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Aksi Scan / Logistik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {requisitions.map((r) => (
                  <tr key={r.reqNo} className="hover:bg-slate-55 hover:bg-emerald-50/10">
                    <td className="px-5 py-4 font-mono font-bold text-gray-950">{r.reqNo}</td>
                    <td className="px-4 py-4 font-medium">{r.sourceBranch}</td>
                    <td className="px-4 py-4 font-semibold text-emerald-800">{r.itemName}</td>
                    <td className="px-4 py-4 text-center font-mono font-bold">{r.qtyNeeded} pcs</td>
                    <td className="px-4 py-4 text-center font-mono text-gray-500 font-bold bg-amber-50/40">
                      {r.qtyPredicted} pcs
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        r.status === 'Draft' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                        r.status === 'Sent' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        r.status === 'Shipped' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        {r.status === 'Draft' && (
                          <button
                            onClick={() => handleUpdateStatus(r.reqNo, 'Sent')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-2 py-1 rounded-md transition-colors"
                          >
                            Kirim Requisition
                          </button>
                        )}
                        {r.status === 'Sent' && (
                          <button
                            onClick={() => handleUpdateStatus(r.reqNo, 'Shipped')}
                            className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-[10px] px-2 py-1 rounded-md transition-colors"
                          >
                            Kirim Armada
                          </button>
                        )}
                        {r.status === 'Shipped' && (
                          <button
                            onClick={() => handleScanSimulation(r)}
                            className="bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-[10px] px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
                          >
                            <QrCode className="w-3 h-3" /> Scan QR Penerimaan
                          </button>
                        )}
                        {r.status === 'Received' && (
                          <span className="text-gray-400 font-medium text-xs flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Selesai Terkirim
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteRequisition(r.reqNo)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer inline-flex"
                          title="Hapus Permintaan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: REQUISITION CREATOR FORM */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="pb-2 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Move className="w-4 h-4 text-emerald-600" />
              Cabang Store Requisition
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Minta stok adonan dari Dapur Pusat untuk kesiapan besok pagi.</p>
          </div>

          <form onSubmit={handleCreateRequisition} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Pilih Toko Cabang</label>
              <select
                value={reqBranch}
                onChange={(e) => setReqBranch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white text-xs"
              >
                <option value="Cabang Kota Kasablanka (Cabang A)">Kota Kasablanka (Cabang A)</option>
                <option value="Cabang Grand Indonesia (Cabang B)">Grand Indonesia (Cabang B)</option>
                <option value="Cabang Mall Kelapa Gading (Cabang C)">Mall Kelapa Gading (Cabang C)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Adonan Beku (Frozen Dough) / Kue Selesai</label>
              <select
                value={reqItem}
                onChange={(e) => setReqItem(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white text-xs"
              >
                <option value="Adonan Beku Croissant (Frozen Dough)">Adonan Beku Croissant (Frozen Dough)</option>
                <option value="Adonan Roti Manis Kalis">Adonan Roti Manis Kalis</option>
                <option value="Adonan Donat Beku Premium">Adonan Donat Beku Premium</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kuantitas Permintaan (pcs/biji)</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  value={reqQty}
                  onChange={(e) => setReqQty(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm font-mono font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">PCS</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full text-center bg-gray-950 hover:bg-gray-900 border border-black text-white font-bold text-xs py-2.5 rounded-lg transition-transform active:scale-[0.98] cursor-pointer"
            >
              + Rilis Permintaan Cabang (Requisition)
            </button>
          </form>
        </div>

      </div>

      {/* SECTION 2: SUPPLIER PROCUREMENT & PURCHASING PROCESS (KASIR & PURCHASING CETAK) */}
      <div className="border-t border-gray-150 pt-8 mt-4 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            Pengadaan Bahan & PO Supplier (Purchasing)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Catat pesanan bahan baku ke vendor supplier utama, setujui anggaran pengeluaran, dan cetak dokumen Purchase Order (PO) PDF komersial.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: LIST OF PURCHASE ORDERS */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <FileText className="w-4 h-4 text-indigo-600" />
                Daftar Dokumen Purchase Order (PO)
              </h3>
              <span className="text-[10px] bg-indigo-100 text-indigo-750 font-black px-2.5 py-0.5 rounded-full uppercase">
                Procurement Stream
              </span>
            </div>

            <div className="overflow-x-auto text-xs sm:text-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/20 text-[10px] uppercase font-bold text-gray-500 font-sans">
                    <th className="px-5 py-3">No PO</th>
                    <th className="px-4 py-3">Supplier/Vendor</th>
                    <th className="px-4 py-3">Detail Item</th>
                    <th className="px-4 py-3 text-right">Kuantitas</th>
                    <th className="px-4 py-3 text-right">Total Anggaran</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Aksi / Cetak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-gray-700">
                  {purchaseOrders.map((p) => (
                    <tr key={p.poNo} className="hover:bg-slate-50/40 text-xs">
                      <td className="px-5 py-4 font-mono font-bold text-gray-950">{p.poNo}</td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-gray-900 block">{p.vendorName}</span>
                        <span className="text-[9px] text-gray-400 font-bold block mt-0.5">Dikirim: {p.dateOrdered}</span>
                      </td>
                      <td className="px-4 py-4 text-gray-800 font-semibold">{p.itemName}</td>
                      <td className="px-4 py-4 text-right font-mono text-gray-600 font-bold">
                        {p.qty} <span className="text-[10px] font-normal text-gray-400">{p.unit}</span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-black text-rose-800">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.totalCost)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-25 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          p.status === 'Draft' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-105 text-emerald-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => {
                              const printWin = window.open('', '_blank');
                              if (!printWin) return;
                              printWin.document.write(`
                                <html><head>
                                  <title>Surat Jalan - ${p.poNo}</title>
                                  <style>
                                    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #1f2937; }
                                    h1 { font-size: 22px; color: #065f46; margin-bottom: 4px; }
                                    .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px; }
                                    .box { border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 12px; }
                                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                    th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
                                    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
                                    .meta { color: #6b7280; font-size: 12px; }
                                    .footer { margin-top: 30px; border-top: 2px solid #d1d5db; padding-top: 16px; font-size: 12px; }
                                    .sign { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; }
                                    @media print { body { padding: 20px; } @page { margin: 15mm; } }
                                  </style>
                                </head><body>
                                  <div class="header">
                                    <div>
                                      <h1>🚚 SURAT JALAN</h1>
                                      <p class="meta">No: ${p.poNo}</p>
                                    </div>
                                    <div style="text-align:right;">
                                      <p class="meta">Tanggal: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                  </div>
                                  <div class="box">
                                    <strong>Supplier / Vendor:</strong> ${p.vendorName}<br>
                                    <strong>Alamat:</strong> Dikirim ke Dapur Pusat Near Bakery & Co.<br>
                                    <strong>Status:</strong> ${p.status}
                                  </div>
                                  <table>
                                    <thead><tr><th>No</th><th>Nama Barang</th><th style="text-align:right;">Qty</th><th style="text-align:center;">Satuan</th><th style="text-align:right;">Harga</th><th style="text-align:right;">Total</th></tr></thead>
                                    <tbody>
                                      <tr>
                                        <td>1</td>
                                        <td>${p.itemName}</td>
                                        <td style="text-align:right;font-family:monospace;">${p.qty}</td>
                                        <td style="text-align:center;">${p.unit || '-'}</td>
                                        <td style="text-align:right;font-family:monospace;">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.pricePerUnit)}</td>
                                        <td style="text-align:right;font-family:monospace;font-weight:bold;">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.totalCost)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <div class="footer">
                                    <p><strong>Total Tagihan:</strong> ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.totalCost)}</p>
                                    <p style="color:#6b7280;margin-top:4px;">Barang yang sudah diterima tidak dapat dikembalikan kecuali ada cacat produksi.</p>
                                  </div>
                                  <div class="sign">
                                    <div>_____________<br>Penerima<br>(Nama & Tanda Tangan)</div>
                                    <div>_____________<br>Pengirim<br>(Nama & Tanda Tangan)</div>
                                    <div>_____________<br>Mengetahui<br>(Supervisor)</div>
                                  </div>
                                  <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:10px;">Near Bakery & Co. ERP — Logistik & Distribusi Internal</p>
                                  <script>window.print();<\/script>
                                </body></html>
                              `);
                              printWin.document.close();
                            }}
                            className="bg-gray-100 hover:bg-gray-200 text-slate-900 font-semibold font-sans text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer border border-gray-300"
                            title="Cetak Surat Jalan"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-650" /> Cetak
                          </button>
                          {p.status === 'Draft' && (
                            <button
                              onClick={() => handleApprovePO(p.poNo)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded-md transition"
                            >
                              Setujui
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePO(p.poNo)}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Hapus PO"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT COLUMN: REQUISITION CREATOR FORM */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div className="pb-2 border-b border-gray-50">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Plus className="w-4 h-4 text-indigo-650" />
                Buat Formulir PO Baru
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Ajukan permohonan belanja ke supplier pemasok bahan.</p>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Pilih Vendor Supplier</label>
                <select
                  value={poVendor}
                  onChange={(e) => setPoVendor(e.target.value)}
                  className="w-full border border-gray-205 rounded-lg p-2.5 bg-white text-xs"
                >
                  <option value="PT Bogasari Flour Mills">PT Bogasari Flour Mills</option>
                  <option value="PT Fonterra Dairy Indonesia">PT Fonterra Dairy Indonesia</option>
                  <option value="Distributor Gula Sinar Mulia">Distributor Gula Sinar Mulia</option>
                  <option value="Supplier Telur Ayam Central">Supplier Telur Ayam Central</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Item Bahan Baku</label>
                <input
                  type="text"
                  required
                  value={poItem}
                  onChange={(e) => setPoItem(e.target.value)}
                  placeholder="Misal: Ragi Instan Saf Instant"
                  className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kuantitas Qty</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={poQty}
                    onChange={(e) => setPoQty(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs text-center font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Jenis Satuan</label>
                  <select
                    required
                    value={poUnit}
                    onChange={(e) => setPoUnit(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs"
                  >
                    <option value="">-- Pilih Satuan --</option>
                    {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Harga Satuan (IDR)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={poPrice}
                  onChange={(e) => setPoPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs font-mono font-bold"
                />
              </div>

              <div className="bg-indigo-50 p-3 rounded-xl text-[11px] text-indigo-900 border border-indigo-100 flex justify-between items-center">
                <span>Estimasi Tagihan:</span>
                <span className="font-mono font-extrabold text-xs">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format((parseFloat(poQty) || 0) * (parseFloat(poPrice) || 0))}
                </span>
              </div>

              <button
                type="submit"
                className="w-full text-center bg-indigo-650 hover:bg-slate-900 border border-indigo-600 hover:border-black text-white font-bold text-xs py-2.5 rounded-lg transition-transform active:scale-[0.98] cursor-pointer shadow-xs"
              >
                + Terbitkan Draft PO Baru
              </button>
            </form>
          </div>

        </div>
      </div>


      {/* QR SCREEN RECEIVAL SCANNER MODAL GRAPHIC */}
      {selectedQRTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          {(() => {
            const reqObj = requisitions.find(r => r.reqNo === selectedQRTransfer);
            if (!reqObj) return null;
            return (
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl space-y-4 text-center">
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <QrCode className="w-8 h-8" />
                </div>
                
                <div>
                  <h3 className="text-base font-bold text-gray-900">QR CODE INTERNAL TRANSFER</h3>
                  <p className="text-xs text-gray-500 font-semibold uppercase font-mono mt-0.5">{reqObj.reqNo}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-gray-150 space-y-1.5 text-xs text-left">
                  <p className="text-gray-500 flex justify-between">Dari WH: <span className="font-bold text-gray-900">{reqObj.targetWH}</span></p>
                  <p className="text-gray-500 flex justify-between">Cabang: <span className="font-bold text-emerald-800">{reqObj.sourceBranch}</span></p>
                  <p className="text-gray-500 flex justify-between">Adonan: <span className="font-bold text-emerald-800">{reqObj.itemName}</span></p>
                  <p className="text-gray-500 flex justify-between">Kuantitas: <span className="font-bold text-emerald-800 font-mono">{reqObj.qtyNeeded} pcs</span></p>
                </div>

                {scannedMessage ? (
                  <div className="p-3.5 bg-emerald-950 border border-emerald-800 rounded-xl text-center text-emerald-300 font-bold text-xs leading-relaxed animate-pulse">
                    {scannedMessage}
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {/* Simulated visual QR graphic */}
                    <div className="w-36 h-36 bg-gray-100 border border-gray-300 rounded-xl mx-auto flex items-center justify-center p-2 relative">
                      {/* Fake lines of QR */}
                      <svg className="w-full h-full text-slate-800 stroke-2" fill="none" viewBox="0 0 24 24">
                        <path d="M3 3h4v4H3zM17 3h4v4h-4zM3 17h4v4H3zM9 9h6v6H9z" />
                        <path strokeLinecap="round" d="M12 3v4M3 12h4M17 12h4M12 17v4" />
                      </svg>
                    </div>
                    <p className="text-[11px] text-gray-400">Staf Cabang men-scan kode pengiriman pada truk box logistik pendingin.</p>
                    
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setSelectedQRTransfer(null)}
                        className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => confirmQRAction(reqObj)}
                        className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
                      >
                        Simulasikan Scan Sukses
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}
