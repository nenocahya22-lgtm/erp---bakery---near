import React, { useState, useEffect } from 'react';
import { BahanBaku, PurchaseOrder, SATUAN_OPTIONS } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import { Star, Plus, Trash2, FileText, Printer, Search, CheckCircle2, Package, X } from 'lucide-react';
import { showToast } from '../lib/toast';

interface DataPusatSupplierSectionProps {
  bahanBaku: BahanBaku[];
  onEditMaterial: (oldName: string, m: BahanBaku) => void;
  showConfirm: (opts: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: string; onConfirm: () => void; onCancel: () => void }) => void;
}

export default function DataPusatSupplierSection({ bahanBaku, onEditMaterial, showConfirm }: DataPusatSupplierSectionProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() =>
    (safeGetLocalStorage<any[]>('pusat_purchase_orders', [])).map(po => ({
      ...po,
      satuanBeli: po.satuanBeli || po.satuan || 'pcs',
      konversi: po.konversi || 1,
    }))
  );
  const [suppliers, setSuppliers] = useState<{ name: string; kontak: string; bahan: string[] }[]>(() =>
    safeGetLocalStorage<{ name: string; kontak: string; bahan: string[] }[]>('pusat_suppliers', [])
  );
  const [newSupName, setNewSupName] = useState('');
  const [newSupKontak, setNewSupKontak] = useState('');
  const [newSupBahan, setNewSupBahan] = useState<string[]>([]);
  const [poVendor, setPoVendor] = useState('');
  const [poBahan, setPoBahan] = useState('');
  const [poQty, setPoQty] = useState('');
  const [poHarga, setPoHarga] = useState('');
  const [poSatuan, setPoSatuan] = useState('');
  const [poKonversi, setPoKonversi] = useState('1');
  const [poSearch, setPoSearch] = useState('');

  // State untuk proses penerimaan PO dengan input harga riil
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [actualPrice, setActualPrice] = useState('');

  useEffect(() => { localStorage.setItem('pusat_purchase_orders', JSON.stringify(purchaseOrders)); }, [purchaseOrders]);
  useEffect(() => { localStorage.setItem('pusat_suppliers', JSON.stringify(suppliers)); }, [suppliers]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const handleAddSupplier = () => {
    if (!newSupName.trim()) return;
    setSuppliers(prev => [...prev, { name: newSupName.trim(), kontak: newSupKontak.trim(), bahan: newSupBahan }]);
    setNewSupName(''); setNewSupKontak(''); setNewSupBahan([]);
  };

  const handleDeleteSupplier = async (name: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: `Hapus supplier "${name}"?`,
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (confirmed) setSuppliers(prev => prev.filter(s => s.name !== name));
  };

  const toggleSupBahan = (bahan: string) => {
    setNewSupBahan(prev => prev.includes(bahan) ? prev.filter(b => b !== bahan) : [...prev, bahan]);
  };

  const handleCreatePO = () => {
    if (!poVendor || !poBahan || !poQty || !poHarga || !poSatuan) return;
    const qty = parseFloat(poQty) || 0;
    const harga = parseFloat(poHarga) || 0;
    const konversi = parseFloat(poKonversi) || 1;
    if (qty <= 0 || harga <= 0 || konversi <= 0) return;
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNo: `PO-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      vendorName: poVendor,
      bahanNama: poBahan,
      qty,
      satuan: bahanBaku.find(b => b.nama === poBahan)?.satuan || 'pcs',
      satuanBeli: poSatuan,
      konversi,
      hargaSatuan: harga,
      totalCost: qty * harga,
      tanggalOrder: new Date().toISOString().substring(0, 10),
      status: 'Draft',
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
    setPoQty(''); setPoHarga(''); setPoSatuan(''); setPoKonversi('1');
  };

  const handleApprovePO = (id: string) => {
    setPurchaseOrders(prev => prev.map(p => p.id === id ? { ...p, status: 'Disetujui' as const } : p));
  };

  const handleTerimaPO = (id: string) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (po) {
      setReceivingPo(po);
      setActualPrice(po.hargaSatuan.toString());
    }
  };

  const handleConfirmTerima = () => {
    if (!receivingPo) return;
    const finalPrice = parseFloat(actualPrice) || receivingPo.hargaSatuan;

    setPurchaseOrders(prev => prev.map(p => {
      if (p.id !== receivingPo.id) return p;
      const bahan = bahanBaku.find(b => b.nama === p.bahanNama);
      if (bahan) {
        const tambahanStok = p.qty * (p.konversi || 1);
        const hargaPerUnit = p.konversi > 0 ? finalPrice / p.konversi : finalPrice;
        
        // Update master data bahan baku dengan harga asli dari nota
        const qtyLama = bahan.isiKemasan;
        const qtyBaru = qtyLama + tambahanStok;
        const nilaiLama = bahan.hargaBeli;
        const nilaiBaru = hargaPerUnit * tambahanStok;
        const hargaRata = qtyBaru > 0 ? (nilaiLama + nilaiBaru) / qtyBaru : hargaPerUnit;

        onEditMaterial(bahan.nama, {
          ...bahan,
          isiKemasan: qtyBaru,
          stok: qtyBaru,
          hargaBeli: nilaiLama + nilaiBaru,
          hargaSatuan: hargaRata,
          hargaBeliReal: nilaiLama + nilaiBaru,
          hargaSatuanReal: hargaRata,
        });
      }
      return { ...p, status: 'Diterima' as const, hargaSatuan: finalPrice, totalCost: p.qty * finalPrice };
    }));
    setReceivingPo(null);
  };

  const handleDeletePO = (id: string) => {
    showConfirm({ title: "Hapus PO", message: "Hapus PO ini?", confirmLabel: "Hapus", cancelLabel: "Batal", variant: "danger", onConfirm: () => setPurchaseOrders(prev => prev.filter(p => p.id !== id)), onCancel: () => {} });
  };

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

  const exportPdfLaporan = async (judul: string, headers: string[], rows: string[][], footer?: string) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p','mm','a4');
      doc.setFont('Helvetica','bold');
      doc.setFontSize(14);
      doc.text(judul,14,20);
      doc.setFont('Helvetica','normal');
      doc.setFontSize(8);
      doc.text(`Near Bakery & Co. — ${new Date().toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'})}`,14,26);
      doc.setDrawColor(6,95,70);
      doc.line(14,28,196,28);
      let y=34;
      const colW = (180-((headers.length-1)*2))/headers.length;
      doc.setFont('Helvetica','bold');
      doc.setFontSize(7);
      doc.setFillColor(243,244,246);
      headers.forEach((h,i)=>{
        const x=14+i*(colW+2);
        doc.rect(x,y-2,colW,6,'F');
        doc.text(h,x+1,y+1.5);
      });
      y+=7;
      doc.setFont('Helvetica','normal');
      doc.setFontSize(7);
      for(const row of rows){
        if(y>280){doc.addPage();y=14;}
        row.forEach((c,i)=>{
          const x=14+i*(colW+2);
          doc.text(c.substring(0,Math.floor(colW/1.5)),x+1,y);
        });
        y+=5;
      }
      if(footer){
        y+=5;
        doc.setFontSize(7);
        doc.text(footer,14,y);
      }
      doc.save(`${judul.replace(/[^a-zA-Z0-9]/g,'_')}.pdf`);
      showToast('✅ PDF berhasil didownload!', 'success');
    }catch(e:any){
      showToast('Gagal export PDF: '+e.message+' — Gunakan Cetak (Ctrl+P) sebagai alternatif.', 'error');
    }
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
      showToast('📄 Popup terblokir! File HTML di-download — buka file lalu Ctrl+P untuk print.', 'info');
      return;
    }
    pw.document.write(html);
    pw.document.close();
  };

  const handleCetakLaporanPO = () => {
    const filtered = purchaseOrders.filter(po =>
      poSearch===''||po.poNo.toLowerCase().includes(poSearch.toLowerCase())||po.vendorName.toLowerCase().includes(poSearch.toLowerCase())
    );
    const headers = ['No PO','Tanggal','Supplier','Bahan','Qty Beli','Isi/Satuan','Total Stok','Total','Status'];
    const rows = filtered.map(po => [po.poNo, po.tanggalOrder, po.vendorName, po.bahanNama, `${po.qty} ${po.satuanBeli || po.satuan}`, `${(po.konversi || 1)} ${po.satuan}`, `${po.qty * (po.konversi || 1)} ${po.satuan}`, formatCurrency(po.totalCost), po.status]);
    cetakDokumen('Laporan_PO', cetakLaporanHtml('LAPORAN PURCHASE ORDER', headers, rows,
      `Total PO: ${filtered.length} | Total Nilai: ${formatCurrency(filtered.reduce((s,p)=>s+p.totalCost,0))}`
    ));
  };

  const handleExportPDFPO = () => {
    const filtered = purchaseOrders.filter(po =>
      poSearch===''||po.poNo.toLowerCase().includes(poSearch.toLowerCase())||po.vendorName.toLowerCase().includes(poSearch.toLowerCase())
    );
    const headers = ['No PO','Tanggal','Supplier','Bahan','Qty Beli','Isi/Satuan','Total Stok','Total','Status'];
    const rows = filtered.map(po => [po.poNo, po.tanggalOrder, po.vendorName, po.bahanNama, `${po.qty} ${po.satuanBeli || po.satuan}`, `${(po.konversi || 1)} ${po.satuan}`, `${po.qty * (po.konversi || 1)} ${po.satuan}`, formatCurrency(po.totalCost), po.status]);
    exportPdfLaporan('LAPORAN PURCHASE ORDER', headers, rows,
      `Total PO: ${filtered.length} | Total Nilai: ${formatCurrency(filtered.reduce((s,p)=>s+p.totalCost,0))}`
    );
  };

  const handleCetakPO = (po: PurchaseOrder) => {
    const html = `
      <html><head>
        <title>PO - ${po.poNo}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #1f2937; }
          h1 { font-size: 22px; color: #065f46; }
          .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px; }
          .box { border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
          .footer { margin-top: 30px; border-top: 2px solid #d1d5db; padding-top: 16px; font-size: 12px; }
          .sign { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; }
          @media print { body { padding: 20px; } @page { margin: 15mm; } }
        </style>
      </head><body>
        <div class="header">
          <div><h1>📋 PURCHASE ORDER</h1><p style="color:#6b7280;font-size:12px;">No: ${po.poNo}</p></div>
          <div style="text-align:right;"><p style="color:#6b7280;font-size:12px;">Tanggal: ${po.tanggalOrder}</p></div>
        </div>
        <div class="box">
          <strong>Supplier:</strong> ${po.vendorName}<br>
          <strong>Status:</strong> ${po.status}
        </div>
        <table>
          <thead><tr><th>No</th><th>Barang</th><th style="text-align:right;">Qty</th><th style="text-align:center;">Satuan Beli</th><th style="text-align:center;">Konversi</th><th style="text-align:right;">Harga</th><th style="text-align:right;">Total</th></tr></thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>${po.bahanNama}</td>
              <td style="text-align:right;font-family:monospace;">${po.qty}</td>
              <td style="text-align:center;">${po.satuanBeli || po.satuan}</td>
              <td style="text-align:center;font-size:11px;">1 ${po.satuanBeli || po.satuan} = ${po.konversi || 1} ${po.satuan}</td>
              <td style="text-align:right;font-family:monospace;">${formatCurrency(po.hargaSatuan)}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;">${formatCurrency(po.totalCost)}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <p><strong>Total Tagihan:</strong> ${formatCurrency(po.totalCost)}</p>
          <p style="font-size:11px;color:#6b7280;">Total Stok Masuk: ${po.qty * (po.konversi || 1)} ${po.satuan}</p>
        </div>
        <div class="sign">
          <div>_____________<br>Pembeli</div>
          <div>_____________<br>Supplier</div>
        </div>
        <script>window.print(); setTimeout(() => window.close(), 1000);</script>
      </body></html>
    `;
    cetakDokumen('PO_' + po.poNo, html);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Daftar Supplier */}
      <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1.5">
          <Star className="w-4 h-4 text-emerald-600" /> Daftar Supplier
        </h3>

        {suppliers.length > 0 ? (
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {suppliers.map((s, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs border border-gray-100 rounded-xl p-3 group">
                <div className="flex-1">
                  <span className="font-bold text-gray-900 block">{s.name}</span>
                  {s.kontak && <span className="text-[10px] text-gray-500">{s.kontak}</span>}
                  {s.bahan.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.bahan.map(b => (
                        <span key={b} className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{b}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDeleteSupplier(s.name)}
                  className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition cursor-pointer p-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-6">Belum ada supplier.</p>
        )}

        <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-dashed border-gray-200">
          <h4 className="text-xs font-bold text-gray-700">Tambah Supplier</h4>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Nama Supplier" value={newSupName}
              onChange={e => setNewSupName(e.target.value)}
              className="border border-gray-200 rounded-lg p-2 text-xs" />
            <input type="text" placeholder="Kontak" value={newSupKontak}
              onChange={e => setNewSupKontak(e.target.value)}
              className="border border-gray-200 rounded-lg p-2 text-xs" />
          </div>
          {bahanBaku.length > 0 && (
            <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
              {bahanBaku.map(b => (
                <button key={b.nama} onClick={() => toggleSupBahan(b.nama)}
                  className={`text-[9px] px-2 py-0.5 rounded-full border cursor-pointer transition ${
                    newSupBahan.includes(b.nama) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-500 border-gray-200'
                  }`}>{b.nama}</button>
              ))}
            </div>
          )}
          <button onClick={handleAddSupplier} disabled={!newSupName.trim()}
            className="w-full bg-gray-950 hover:bg-gray-900 disabled:bg-gray-300 text-white font-bold text-xs py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed">
            <Plus className="w-3 h-3 inline mr-1" /> Tambah Supplier
          </button>
        </div>
      </div>

      {/* RIGHT: PO Form & List */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <FileText className="w-4 h-4 text-emerald-600" /> Buat Purchase Order
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Supplier</label>
              <select value={poVendor} onChange={e => setPoVendor(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5">
                <option value="">— Pilih —</option>
                {suppliers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Bahan</label>
              <select value={poBahan} onChange={e => { setPoBahan(e.target.value); const b = bahanBaku.find(b => b.nama === e.target.value); if (b) { setPoSatuan(b.satuan); } }}
                className="w-full border border-gray-200 rounded-lg p-2.5">
                <option value="">— Pilih —</option>
                {bahanBaku.map(b => <option key={b.nama} value={b.nama}>{b.nama} ({b.satuan})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Qty</label>
              <div className="flex items-center gap-1">
                <input type="number" min="0" placeholder="0" value={poQty}
                  onChange={e => setPoQty(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg p-2.5 font-mono" />
                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-2 rounded-lg min-w-[40px] text-center">
                  {poBahan ? (bahanBaku.find(b => b.nama === poBahan)?.satuan || 'pcs') : '—'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Satuan Beli</label>
              <select value={poSatuan} onChange={e => setPoSatuan(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5">
                <option value="">— Pilih —</option>
                {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Isi per Satuan (Konversi)</label>
              <input type="number" min="0" placeholder="1 (default)" value={poKonversi}
                onChange={e => setPoKonversi(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 font-mono" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Estimasi Harga Satuan</label>
              <div className="flex items-center gap-1">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">Rp</span>
                  <input type="number" min="0" placeholder="0" value={poHarga}
                    onChange={e => setPoHarga(e.target.value)}
                    className="w-full pl-8 border border-gray-200 rounded-lg p-2.5 font-mono" />
                </div>
                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-2 rounded-lg min-w-[40px] text-center whitespace-nowrap">
                  /{poSatuan || (poBahan ? (bahanBaku.find(b => b.nama === poBahan)?.satuan || '—') : '—')}
                </span>
              </div>
            </div>
          </div>
          {poQty && poSatuan && poKonversi && (
            <p className="text-[10px] text-gray-500 -mt-2 text-right">
              Stok masuk: <strong>{parseFloat(poQty || '0') * parseFloat(poKonversi || '1')}</strong> {poBahan ? (bahanBaku.find(b => b.nama === poBahan)?.satuan || '') : ''}
            </p>
          )}
          <button onClick={handleCreatePO}
            disabled={!poVendor || !poBahan || !poQty || !poHarga || !poSatuan}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed">
            <Plus className="w-3.5 h-3.5 inline mr-1" /> Terbitkan PO
          </button>
        </div>

        {/* PO List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Daftar PO ({purchaseOrders.length})
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={handleCetakLaporanPO}
                className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
                <Printer className="w-3 h-3" /> Cetak Laporan
              </button>
              <button onClick={handleExportPDFPO}
                className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
                <FileText className="w-3 h-3" /> Export PDF
              </button>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input type="text" placeholder="Cari PO..." value={poSearch}
                  onChange={e => setPoSearch(e.target.value)}
                  className="w-36 pl-8 pr-3 py-1.5 text-[10px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
            </div>
          </div>
          {(purchaseOrders.filter(po =>
            poSearch === '' ||
            po.poNo.toLowerCase().includes(poSearch.toLowerCase()) ||
            po.vendorName.toLowerCase().includes(poSearch.toLowerCase()) ||
            po.bahanNama.toLowerCase().includes(poSearch.toLowerCase()) ||
            po.status.toLowerCase().includes(poSearch.toLowerCase())
          ).length === 0) ? (
            <p className="text-xs text-gray-400 text-center py-6">{poSearch ? 'Tidak ada PO yang cocok.' : 'Belum ada PO.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                    <th className="px-3 py-2">No PO</th>
                    <th className="px-3 py-2">Supplier</th>
                    <th className="px-3 py-2">Bahan</th>
                    <th className="px-3 py-2 text-right">Qty Beli</th>
                    <th className="px-3 py-2 text-right">Total Stok</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchaseOrders.filter(po =>
                    poSearch === '' ||
                    po.poNo.toLowerCase().includes(poSearch.toLowerCase()) ||
                    po.vendorName.toLowerCase().includes(poSearch.toLowerCase()) ||
                    po.bahanNama.toLowerCase().includes(poSearch.toLowerCase()) ||
                    po.status.toLowerCase().includes(poSearch.toLowerCase())
                  ).map(po => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-mono font-bold text-gray-800">{po.poNo}</td>
                      <td className="px-3 py-2.5 text-gray-700">{po.vendorName}</td>
                      <td className="px-3 py-2.5 font-semibold">{po.bahanNama}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{po.qty} {po.satuanBeli || po.satuan} <span className="text-gray-400 text-[9px]">({(po.konversi || 1)} {po.satuan}/{po.satuanBeli || po.satuan})</span></td>
                      <td className="px-3 py-2.5 text-right font-mono">{po.qty * (po.konversi || 1)} {po.satuan}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-700">{formatCurrency(po.totalCost)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                          po.status === 'Draft' ? 'bg-amber-100 text-amber-800' :
                          po.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>{po.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleCetakPO(po)}
                            className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[9px] font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                            title="Cetak PO">
                            <Printer className="w-3 h-3" /> Cetak PO
                          </button>
                          {po.status === 'Draft' && (
                            <button onClick={() => handleApprovePO(po.id)}
                              className="p-1 text-gray-400 hover:text-emerald-600 cursor-pointer" title="Setujui">
                              <CheckCircle2 className="w-3 h-3" />
                            </button>
                          )}
                          {po.status === 'Disetujui' && (
                            <button onClick={() => handleTerimaPO(po.id)}
                              className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[9px] font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                              title="Barang Diterima">
                              <Package className="w-3 h-3" /> Terima
                            </button>
                          )}
                          <button onClick={() => handleDeletePO(po.id)}
                            className="p-1 text-gray-400 hover:text-red-600 cursor-pointer" title="Hapus">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL TERIMA BARANG — INPUT HARGA RIIL */}
      {receivingPo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase">Terima Barang PO</h3>
                <p className="text-[10px] text-gray-500 font-mono">{receivingPo.poNo} — {receivingPo.bahanNama}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                Konfirmasi harga beli riil per <strong>{receivingPo.satuanBeli}</strong> sesuai nota/faktur supplier untuk mengupdate modal bahan baku.
              </p>
              
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Harga Satuan Riil (Sesuai Nota)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rp</span>
                  <input
                    type="number"
                    autoFocus
                    value={actualPrice}
                    onChange={e => setActualPrice(e.target.value)}
                    className="w-full pl-10 border border-gray-200 rounded-xl p-3 font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <p className="text-[9px] text-gray-400 mt-1 italic">
                  * Estimasi awal: {formatCurrency(receivingPo.hargaSatuan)}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setReceivingPo(null)}
                className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmTerima}
                className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Konfirmasi & Masuk Stok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
