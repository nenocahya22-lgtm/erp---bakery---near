import React, { useState, useEffect } from 'react';
import { BahanBaku, Cabang, SuratOrder, BranchStock, BranchTransaction, WasteLog, StockOpname, PurchaseOrder } from '../types';
import {
  Building2, Plus, Trash2, Edit2, X, Package, Truck, CheckCircle2,
  AlertTriangle, Search, Users, KeyRound, Eye, EyeOff, BarChart3,
  Printer, Star, FileText, ClipboardCheck, Save
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
  const [activeSection, setActiveSection] = useState<'cabang' | 'bahan' | 'stok' | 'stok_cabang' | 'supplier' | 'pengiriman' | 'stok_opname' | 'rekap'>('cabang');

  // ─── CABANG STATE ───
  const [showCabangModal, setShowCabangModal] = useState(false);
  const [editingCabang, setEditingCabang] = useState<Cabang | null>(null);
  const [cabangNama, setCabangNama] = useState('');
  const [cabangAlamat, setCabangAlamat] = useState('');
  const [cabangUsername, setCabangUsername] = useState('');
  const [cabangPassword, setCabangPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [cabangSearch, setCabangSearch] = useState('');

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

  // ─── SUPPLIER & PO STATE ───
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('pusat_purchase_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [suppliers, setSuppliers] = useState<{ name: string; kontak: string; bahan: string[] }[]>(() => {
    const saved = localStorage.getItem('pusat_suppliers');
    return saved ? JSON.parse(saved) : [];
  });
  const [newSupName, setNewSupName] = useState('');
  const [newSupKontak, setNewSupKontak] = useState('');
  const [newSupBahan, setNewSupBahan] = useState<string[]>([]);
  const [poVendor, setPoVendor] = useState('');
  const [poBahan, setPoBahan] = useState('');
  const [poQty, setPoQty] = useState('');
  const [poHarga, setPoHarga] = useState('');
  const [poSearch, setPoSearch] = useState('');
  const [stokOpnameFilter, setStokOpnameFilter] = useState<string>('all');
  const [soCabangFilter, setSoCabangFilter] = useState<string>('all');
  const [showExportHistory, setShowExportHistory] = useState(false);
  const [exportHistory, setExportHistory] = useState<{type:string;format:string;timestamp:string;count:number}[]>(() => {
    const saved = localStorage.getItem('pusat_export_history');
    return saved ? JSON.parse(saved) : [];
  });

  // ─── BAHAN MODAL STATE ───
  const [bahanSearch, setBahanSearch] = useState('');
  const [showBahanModal, setShowBahanModal] = useState(false);
  const [editingBahan, setEditingBahan] = useState<BahanBaku | null>(null);
  const [bahanForm, setBahanForm] = useState({kode:'',nama:'',satuan:'gr',isiKemasan:1000,hargaBeliReal:0,markupPercent:25,kategori:'Produk'});
  
  // ─── KATEGORI DINAMIS ───
  const [bahanKategoriList, setBahanKategoriList] = useState<string[]>(() => {
    const saved = localStorage.getItem('bahan_kategori_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      return ['Semua', ...parsed];
    }
    return ['Semua', 'Produk', 'Minuman', 'Alat'];
  });
  const [bahanKategoriFilter, setBahanKategoriFilter] = useState<string>('Semua');
  const [showKategoriManager, setShowKategoriManager] = useState(false);
  const [editingKategori, setEditingKategori] = useState('');
  const [newKategoriName, setNewKategoriName] = useState('');

  // Save kategori to localStorage
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

  const handleDeleteKategori = (cat: string) => {
    if (cat === 'Semua') return;
    if (!window.confirm(`Hapus kategori "${cat}"? Bahan dengan kategori ini akan tetap ada — ubah kategorinya secara manual.`)) return;
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
    // Rename in list
    setBahanKategoriList(prev => prev.map(c => c === oldName ? newName : c));
    // Also rename in bahanBaku items
    bahanBaku.forEach(b => {
      if ((b.kategori || 'Produk') === oldName) {
        onEditMaterial(b.nama, { ...b, kategori: newName });
      }
    });
    if (bahanKategoriFilter === oldName) setBahanKategoriFilter(newName);
    setEditingKategori('');
  };

  // ─── TEMPLATE CETAK ───
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
      alert('✅ PDF berhasil didownload!');
    }catch(e:any){
      alert('Gagal export PDF: '+e.message+'\nGunakan Cetak (Ctrl+P) sebagai alternatif.');
    }
  };

  const handleCetakLaporanPO = () => {
    const filtered = purchaseOrders.filter(po =>
      poSearch===''||po.poNo.toLowerCase().includes(poSearch.toLowerCase())||po.vendorName.toLowerCase().includes(poSearch.toLowerCase())
    );
    const headers = ['No PO','Tanggal','Supplier','Bahan','Qty','Total','Status'];
    const rows = filtered.map(po => [po.poNo, po.tanggalOrder, po.vendorName, po.bahanNama, `${po.qty} ${po.satuan}`, formatCurrency(po.totalCost), po.status]);
    cetakDokumen('Laporan_PO', cetakLaporanHtml('LAPORAN PURCHASE ORDER', headers, rows,
      `Total PO: ${filtered.length} | Total Nilai: ${formatCurrency(filtered.reduce((s,p)=>s+p.totalCost,0))}`
    ));
  };

  const handleExportPDFPO = () => {
    const filtered = purchaseOrders.filter(po =>
      poSearch===''||po.poNo.toLowerCase().includes(poSearch.toLowerCase())||po.vendorName.toLowerCase().includes(poSearch.toLowerCase())
    );
    const headers = ['No PO','Tanggal','Supplier','Bahan','Qty','Total','Status'];
    const rows = filtered.map(po => [po.poNo, po.tanggalOrder, po.vendorName, po.bahanNama, `${po.qty} ${po.satuan}`, formatCurrency(po.totalCost), po.status]);
    exportPdfLaporan('LAPORAN PURCHASE ORDER', headers, rows,
      `Total PO: ${filtered.length} | Total Nilai: ${formatCurrency(filtered.reduce((s,p)=>s+p.totalCost,0))}`
    );
  };

  // ─── REKAP BAHAN (Merged from RekapBahanTab) ───
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

  const handleExportHistoryAdd = (type: string, format: string, count: number) => {
    const newEntry = { type, format, timestamp: new Date().toISOString(), count };
    setExportHistory(prev => {
      const updated = [newEntry, ...prev].slice(0, 50);
      localStorage.setItem('pusat_export_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCetakLaporanLogistik = () => {
    const filtered = suratOrders.filter(so => soCabangFilter === 'all' || so.cabangId === soCabangFilter);
    const headers = ['Tanggal','No SO','Tujuan','Item','Status'];
    const rows = filtered.map(so => [
      new Date(so.tanggalKirim).toLocaleDateString('id-ID'),
      so.id.substring(0,10)+'...',
      so.cabangNama,
      so.items.map(i=>`${i.bahanNama}:${i.qty}`).join(', '),
      so.status==='diterima'?'✅ Sampai':so.status==='dikirim'?'📦 Dikirim':'🕐 Minta'
    ]);
    handleExportHistoryAdd('Pengiriman', 'Cetak', filtered.length);
    cetakDokumen('Laporan_Pengiriman', cetakLaporanHtml('LAPORAN PENGIRIMAN & SURAT ORDER', headers, rows,
      `Total Pengiriman: ${filtered.length} | Sampai: ${filtered.filter(s=>s.status==='diterima').length} | Dalam Perjalanan: ${filtered.filter(s=>s.status==='dikirim').length}`
    ));
  };

  const handleExportPDFLogistik = async () => {
    const filtered = suratOrders.filter(so => soCabangFilter === 'all' || so.cabangId === soCabangFilter);
    const headers = ['Tanggal','No SO','Tujuan','Item','Status'];
    const rows = filtered.map(so => [
      new Date(so.tanggalKirim).toLocaleDateString('id-ID'),
      so.id.substring(0,10)+'...',
      so.cabangNama,
      so.items.map(i=>`${i.bahanNama}:${i.qty}`).join(', '),
      so.status==='diterima'?'✅ Sampai':so.status==='dikirim'?'📦 Dikirim':'🕐 Minta'
    ]);
    handleExportHistoryAdd('Pengiriman', 'PDF', filtered.length);
    await exportPdfLaporan('LAPORAN PENGIRIMAN & SURAT ORDER', headers, rows,
      `Total Pengiriman: ${filtered.length} | Sampai: ${filtered.filter(s=>s.status==='diterima').length} | Dalam Perjalanan: ${filtered.filter(s=>s.status==='dikirim').length}`
    );
  };


  useEffect(() => { localStorage.setItem('pusat_purchase_orders', JSON.stringify(purchaseOrders)); }, [purchaseOrders]);
  useEffect(() => { localStorage.setItem('pusat_suppliers', JSON.stringify(suppliers)); }, [suppliers]);

  const handleAddSupplier = () => {
    if (!newSupName.trim()) return;
    setSuppliers(prev => [...prev, { name: newSupName.trim(), kontak: newSupKontak.trim(), bahan: newSupBahan }]);
    setNewSupName(''); setNewSupKontak(''); setNewSupBahan([]);
  };

  const handleDeleteSupplier = (name: string) => {
    if (window.confirm(`Hapus supplier "${name}"?`)) setSuppliers(prev => prev.filter(s => s.name !== name));
  };

  const toggleSupBahan = (bahan: string) => {
    setNewSupBahan(prev => prev.includes(bahan) ? prev.filter(b => b !== bahan) : [...prev, bahan]);
  };

  const handleCreatePO = () => {
    if (!poVendor || !poBahan || !poQty || !poHarga) return;
    const qty = parseFloat(poQty) || 0;
    const harga = parseFloat(poHarga) || 0;
    if (qty <= 0 || harga <= 0) return;
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNo: `PO-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      vendorName: poVendor,
      bahanNama: poBahan,
      qty,
      satuan: bahanBaku.find(b => b.nama === poBahan)?.satuan || 'pcs',
      hargaSatuan: harga,
      totalCost: qty * harga,
      tanggalOrder: new Date().toISOString().substring(0, 10),
      status: 'Draft',
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
    setPoQty(''); setPoHarga('');
  };

  const handleApprovePO = (id: string) => {
    setPurchaseOrders(prev => prev.map(p => p.id === id ? { ...p, status: 'Disetujui' as const } : p));
  };

  const handleTerimaPO = (id: string) => {
    setPurchaseOrders(prev => prev.map(p => {
      if (p.id !== id) return p;
      // PO diterima → tambah stok pusat
      const bahan = bahanBaku.find(b => b.nama === p.bahanNama);
      if (bahan) {
        onEditMaterial(bahan.nama, { ...bahan, isiKemasan: bahan.isiKemasan + p.qty });
      }
      return { ...p, status: 'Diterima' as const };
    }));
  };

  const handleDeletePO = (id: string) => {
    if (window.confirm('Hapus PO ini?')) setPurchaseOrders(prev => prev.filter(p => p.id !== id));
  };

  /** Helper: cetak dokumen ke window baru + fallback download HTML kalau popup diblokir */
  const cetakDokumen = (judul: string, html: string) => {
    const pw = window.open('', '_blank');
    if (!pw) {
      // Popup blocker terdeteksi — fallback: download file HTML
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

  const handleCetakSuratJalan = (so: SuratOrder) => {
    const html = `
      <html><head>
        <title>Surat Jalan - ${so.id}</title>
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
          <div>
            <h1>🚚 SURAT JALAN</h1>
            <p style="color:#6b7280;font-size:12px;">No: ${so.id}</p>
          </div>
          <div style="text-align:right;">
            <p style="color:#6b7280;font-size:12px;">Tanggal: ${new Date(so.tanggalKirim).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        <div class="box">
          <strong>Tujuan:</strong> ${so.cabangNama}<br>
          <strong>Pengirim:</strong> Dapur Pusat Near Bakery & Co.<br>
          <strong>Status:</strong> ${so.status === 'dikirim' ? 'Dalam Pengiriman' : so.status}
        </div>
        <table>
          <thead><tr><th>No</th><th>Nama Barang</th><th style="text-align:right;">Qty</th><th style="text-align:center;">Satuan</th></tr></thead>
          <tbody>
            ${so.items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.bahanNama}</td>
                <td style="text-align:right;font-family:monospace;">${item.qty}</td>
                <td style="text-align:center;">${bahanBaku.find(b => b.nama === item.bahanNama)?.satuan || 'pcs'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p style="color:#6b7280;">Barang yang sudah diterima tidak dapat dikembalikan kecuali ada cacat produksi.</p>
        </div>
        <div class="sign">
          <div>_____________<br>Penerima<br>(Nama & Tanda Tangan)</div>
          <div>_____________<br>Pengirim<br>(Nama & Tanda Tangan)</div>
          <div>_____________<br>Mengetahui<br>(Supervisor)</div>
        </div>
        <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:10px;">Near Bakery & Co. ERP — Logistik & Distribusi</p>
        <script>window.print(); setTimeout(() => window.close(), 1000);</script>
      </body></html>
    `;
    cetakDokumen('Surat_Jalan_' + so.id, html);
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
          <thead><tr><th>No</th><th>Barang</th><th style="text-align:right;">Qty</th><th style="text-align:center;">Satuan</th><th style="text-align:right;">Harga</th><th style="text-align:right;">Total</th></tr></thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>${po.bahanNama}</td>
              <td style="text-align:right;font-family:monospace;">${po.qty}</td>
              <td style="text-align:center;">${po.satuan}</td>
              <td style="text-align:right;font-family:monospace;">${formatCurrency(po.hargaSatuan)}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;">${formatCurrency(po.totalCost)}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer"><p><strong>Total Tagihan:</strong> ${formatCurrency(po.totalCost)}</p></div>
        <div class="sign">
          <div>_____________<br>Pembeli</div>
          <div>_____________<br>Supplier</div>
        </div>
        <script>window.print(); setTimeout(() => window.close(), 1000);</script>
      </body></html>
    `;
    cetakDokumen('PO_' + po.poNo, html);
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
          {sectionBtn('supplier', 'Supplier & PO', <Star className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('pengiriman', `Pengiriman (${suratOrders.length})`, <Truck className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('stok_opname', 'Stok Opname', <ClipboardCheck className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('rekap', '📋 Rekap', <FileText className="w-3.5 h-3.5 inline" />)}
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
              setBahanForm({kode: autoKode, nama: '', satuan: defaultSatuan, isiKemasan: defaultIsi, hargaBeliReal: 0, markupPercent: 25, kategori: defaultKategori});
              setShowBahanModal(true);
            }}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Tambah Bahan Baru
            </button>
              </div>
            </div>
            {/* Kategori Filter Tabs — Dinamis */}
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
          {bahanBaku.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada bahan terdaftar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Nama Bahan</th>
                    <th className="px-4 py-3">Kemasan</th>
                    <th className="px-4 py-3">Satuan</th>
                    <th className="px-4 py-3 text-right">Harga Beli (Real)</th>
                    <th className="px-4 py-3 text-right">Markup</th>
                    <th className="px-4 py-3 text-right">Harga Jual/Kemasan</th>
                    <th className="px-4 py-3 text-right">Harga Satuan</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bahanBaku.filter(b => {
                    const matchSearch = b.nama.toLowerCase().includes(bahanSearch.toLowerCase());
                    const matchKategori = bahanKategoriFilter === 'Semua' || (b.kategori || 'Produk') === bahanKategoriFilter;
                    return matchSearch && matchKategori;
                  }).map((b, idx) => {
                    const hargaMarkup = b.hargaBeliReal > 0 ? b.hargaBeliReal * (1 + (b.markupPercent||25)/100) : b.hargaBeli;
                    return (
                      <tr key={b.nama} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-500">{b.kode || `BB-${String(idx + 1).padStart(3, '0')}`}</td>
                        <td className="px-4 py-3"><span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">{b.kategori || 'Produk'}</span></td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{b.nama}</td>
                        <td className="px-4 py-3 font-mono">{b.isiKemasan}</td>
                        <td className="px-4 py-3">{b.satuan}</td>
                        <td className="px-4 py-3 text-right font-mono">{b.hargaBeliReal > 0 ? formatCurrency(b.hargaBeliReal) : formatCurrency(b.hargaBeli)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{b.markupPercent||25}%</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(Math.round(hargaMarkup))}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-500">{formatCurrency(b.hargaSatuan)}/{b.satuan}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => { setEditingBahan(b); setBahanForm({kode:b.kode||'',nama:b.nama,satuan:b.satuan,isiKemasan:b.isiKemasan,hargaBeliReal:b.hargaBeliReal||b.hargaBeli,markupPercent:b.markupPercent||25,kategori:b.kategori||'Produk'}); setShowBahanModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 cursor-pointer" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { if(window.confirm(`Hapus bahan "${b.nama}"?`)) onDeleteMaterial(b.nama); }}
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
                              const selisih = item.stokFisik - item.stokTeoritis;
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

      {/* ─── SECTION: SUPPLIER & PO ─── */}
      {activeSection === 'supplier' && (
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

            {/* Add supplier form */}
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
                  <select value={poBahan} onChange={e => setPoBahan(e.target.value)}
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
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Harga Satuan</label>
                  <div className="flex items-center gap-1">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">Rp</span>
                      <input type="number" min="0" placeholder="0" value={poHarga}
                        onChange={e => setPoHarga(e.target.value)}
                        className="w-full pl-8 border border-gray-200 rounded-lg p-2.5 font-mono" />
                    </div>
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-2 rounded-lg min-w-[40px] text-center">
                      /{poBahan ? (bahanBaku.find(b => b.nama === poBahan)?.satuan || 'pcs') : '—'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={handleCreatePO}
                disabled={!poVendor || !poBahan || !poQty || !poHarga}
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
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                        <th className="px-3 py-2">No PO</th>
                        <th className="px-3 py-2">Supplier</th>
                        <th className="px-3 py-2">Bahan</th>
                        <th className="px-3 py-2 text-right">Qty</th>
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
                          <td className="px-3 py-2.5 text-right font-mono">{po.qty} {po.satuan}</td>
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
        </div>
      )}

      {/* ─── SECTION: PENGIRIMAN (MERGED SO + LOGISTIK) ─── */}
      {activeSection === 'pengiriman' && (
        <div className="space-y-4">
          {/* HEADER: Buat SO + Action Buttons */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <Truck className="w-5 h-5 text-emerald-600" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900">🚚 Pengiriman & Surat Order</h3>
                <p className="text-[10px] text-gray-500">Buat SO, setujui permintaan cabang, cetak surat jalan, dan tracking pengiriman.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCetakLaporanLogistik}
                  className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
                  <Printer className="w-3 h-3" /> Cetak Laporan
                </button>
                <button onClick={handleExportPDFLogistik}
                  className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
                  <FileText className="w-3 h-3" /> Export PDF
                </button>
                <button onClick={openAddSO}
                  disabled={cabangList.length === 0 || bahanBaku.length === 0}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer disabled:cursor-not-allowed">
                  <Plus className="w-3.5 h-3.5" /> Kirim Barang
                </button>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-[9px] uppercase font-bold text-blue-800">Permintaan Pending</p>
                <p className="text-lg font-black text-blue-700 font-mono">{suratOrders.filter(s => s.status === 'minta').length}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-[9px] uppercase font-bold text-amber-800">Dikirim</p>
                <p className="text-lg font-black text-amber-700 font-mono">{suratOrders.filter(s => s.status === 'dikirim').length}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-[9px] uppercase font-bold text-emerald-800">Diterima</p>
                <p className="text-lg font-black text-emerald-700 font-mono">{suratOrders.filter(s => s.status === 'diterima').length}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-[9px] uppercase font-bold text-gray-600">Total SO</p>
                <p className="text-lg font-black text-gray-700 font-mono">{suratOrders.length}</p>
              </div>
            </div>
          </div>

          {/* Filter Cabang + History Toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Filter Cabang:</span>
                <button onClick={() => setSoCabangFilter('all')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                    soCabangFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>Semua ({suratOrders.length})</button>
                {cabangList.filter(c => c.isActive).map(cabang => {
                  const count = suratOrders.filter(so => so.cabangId === cabang.id).length;
                  return (
                    <button key={cabang.id} onClick={() => setSoCabangFilter(cabang.id)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                        soCabangFilter === cabang.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>{cabang.nama} ({count})</button>
                  );
                })}
              </div>
              <button onClick={() => setShowExportHistory(true)}
                className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
                <FileText className="w-3 h-3" /> History Export ({exportHistory.length})
              </button>
            </div>
          </div>

          {/* SO Table — Combined with actions: Setujui, Terima, Cetak Surat Jalan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            {suratOrders.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-12 h-12 text-gray-200 mx-auto stroke-1 mb-3" />
                <p className="text-xs text-gray-500 font-semibold">Belum ada surat order.</p>
                <p className="text-[10px] text-gray-400 mt-1">Klik "Kirim Barang" untuk membuat SO baru, atau cabang bisa minta barang dari dashboard mereka.</p>
              </div>
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
                    {suratOrders.filter(so => soCabangFilter === 'all' || so.cabangId === soCabangFilter).map(so => (
                      <tr key={so.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-500">
                          {new Date(so.tanggalKirim).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{so.cabangNama}</td>
                        <td className="px-4 py-3">
                          {so.items.map((item, idx) => {
                const satuan = bahanBaku.find(b => b.nama === item.bahanNama)?.satuan || 'pcs';
                return (
                  <span key={idx} className="inline-block bg-gray-100 rounded px-1.5 py-0.5 mr-1 mb-1 text-[10px]">
                    {item.bahanNama}: <strong>{item.qty} {satuan}</strong>
                  </span>
                );
              })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            so.status === 'diterima' ? 'bg-emerald-100 text-emerald-800' :
                            so.status === 'dikirim' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {so.status === 'diterima' ? '✅ Diterima' : so.status === 'dikirim' ? '📦 Dikirim' : '🕐 Minta'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {so.status === 'minta' && (
                              <button onClick={() => handleSetujuiSO(so.id)}
                                className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer">
                                <CheckCircle2 className="w-3 h-3" /> Setujui & Kirim
                              </button>
                            )}
                            {so.status === 'dikirim' && (
                              <>
                                <button onClick={() => handleTerimaSO(so.id)}
                                  className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer">
                                  <CheckCircle2 className="w-3 h-3" /> Terima
                                </button>
                                <button onClick={() => handleCetakSuratJalan(so)}
                                  className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer">
                                  <Printer className="w-3 h-3" /> Surat Jalan
                                </button>
                              </>
                            )}
                            {so.status === 'diterima' && (
                              <span className="text-[10px] text-gray-400 font-semibold">Selesai</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {suratOrders.filter(so => soCabangFilter === 'all' || so.cabangId === soCabangFilter).length === 0 && suratOrders.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-8 text-center">
              <Truck className="w-10 h-10 text-gray-200 mx-auto stroke-1 mb-2" />
              <p className="text-xs text-gray-500 font-semibold">Tidak ada SO untuk cabang ini.</p>
              <p className="text-[10px] text-gray-400 mt-1">Coba pilih cabang lain atau "Semua".</p>
            </div>
          )}

          {/* Info alur */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-[10px] text-blue-800">
            <strong>🚚 Alur Pengiriman:</strong><br />
            1. Cabang minta barang → Status <strong>"🕐 Minta"</strong> (pending)<br />
            2. Owner setujui → Status <strong>"📦 Dikirim"</strong> → <strong>Stok Pusat berkurang</strong> otomatis<br />
            3. Cetak <strong>Surat Jalan</strong> → serahkan ke kurir<br />
            4. Barang sampai → Klik <strong>"Terima"</strong> → Status <strong>"✅ Diterima"</strong> → <strong>Stok Cabang bertambah</strong>
          </div>
        </div>
      )}

      {/* ─── SECTION: REKAP BAHAN (MERGED FROM REKAPBAHANTAB) ─── */}
      {activeSection === 'rekap' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> 📋 Rekap Bahan Baku
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Seluruh data bahan baku — stok, harga, dan total nilai.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCetakRekapBahan}
                className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
                <Printer className="w-3 h-3" /> Cetak Laporan
              </button>
              <button onClick={handleExportCSVRekap}
                className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
                <FileText className="w-3 h-3" /> Export CSV
              </button>
            </div>
          </div>

          {bahanBaku.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada bahan baku terdaftar.</p>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50/50 border-b border-gray-100">
                <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-[9px] uppercase font-bold text-gray-500">Total Bahan</p>
                  <p className="text-lg font-black text-emerald-700 font-mono">{bahanBaku.length}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-[9px] uppercase font-bold text-gray-500">Total Nilai Stok</p>
                  <p className="text-lg font-black text-emerald-700 font-mono text-sm">{formatCurrency(bahanBaku.reduce((s,b) => s + (b.isiKemasan * b.hargaSatuan), 0))}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-[9px] uppercase font-bold text-gray-500">Kritis</p>
                  <p className="text-lg font-black text-red-700 font-mono">{bahanBaku.filter(b => b.isiKemasan < 50).length}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-[9px] uppercase font-bold text-gray-500">Stok Rendah</p>
                  <p className="text-lg font-black text-amber-700 font-mono">{bahanBaku.filter(b => b.isiKemasan >= 50 && b.isiKemasan < 200).length}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                      <th className="px-4 py-3">Kode</th>
                      <th className="px-4 py-3">Nama Bahan</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3 text-right">Stok</th>
                      <th className="px-4 py-3">Satuan</th>
                      <th className="px-4 py-3 text-right">Harga Satuan</th>
                      <th className="px-4 py-3 text-right">Total Nilai</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...bahanBaku].sort((a, b) => a.nama.localeCompare(b.nama)).map((b, idx) => {
                      const totalNilai = b.isiKemasan * b.hargaSatuan;
                      let status: { label: string; color: string };
                      if (b.isiKemasan < 50) {
                        status = { label: '🔴 Kritis', color: 'text-red-800 bg-red-100' };
                      } else if (b.isiKemasan < 200) {
                        status = { label: '🟡 Menipis', color: 'text-amber-800 bg-amber-100' };
                      } else {
                        status = { label: '✅ Aman', color: 'text-emerald-800 bg-emerald-100' };
                      }
                      return (
                        <tr key={b.nama} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-gray-500">{b.kode || `BB-${String(idx + 1).padStart(3, '0')}`}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{b.nama}</td>
                          <td className="px-4 py-3"><span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{b.kategori || 'Produk'}</span></td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{b.isiKemasan}</td>
                          <td className="px-4 py-3 font-semibold">{b.satuan}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatCurrency(b.hargaSatuan)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(totalNilai)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${status.color}`}>{status.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-600 text-right font-bold">
                Total Nilai Stok: <span className="font-mono font-black text-emerald-700">{formatCurrency(bahanBaku.reduce((s,b) => s + (b.isiKemasan * b.hargaSatuan), 0))}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── MODAL EXPORT HISTORY ─── */}
      {showExportHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 overflow-hidden max-h-[70vh] flex flex-col">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> History Export Laporan
              </h3>
              <button onClick={() => setShowExportHistory(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {exportHistory.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Belum ada export. Cetak laporan atau export PDF untuk mulai mencatat history.</p>
              ) : (
                <div className="space-y-2">
                  {exportHistory.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          entry.format === 'PDF' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>{entry.format}</span>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">Laporan {entry.type}</p>
                          <p className="text-[10px] text-gray-500">{entry.count} data • {new Date(entry.timestamp).toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-400 font-mono">{new Date(entry.timestamp).toLocaleTimeString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-[10px] text-gray-500">Menyimpan {exportHistory.length} record terakhir</span>
              <button onClick={() => {
                if (window.confirm('Hapus semua history export?')) {
                  setExportHistory([]);
                  localStorage.removeItem('pusat_export_history');
                }
              }} className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer">Hapus Semua</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION: STOK OPNAME PER CABANG ─── */}
      {activeSection === 'stok_opname' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-gray-900">📋 Stok Opname Cabang</h3>
                <p className="text-[10px] text-gray-500">Rekap stok opname per cabang — bandingkan stok teoritis vs fisik, lihat selisih minus/plus.</p>
              </div>
            </div>

            {/* Filter tabs per cabang */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setStokOpnameFilter('all')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                  stokOpnameFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>Semua Cabang</button>
              {cabangList.filter(c=>c.isActive).map(c => (
                <button key={c.id} onClick={() => setStokOpnameFilter(c.id)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                    stokOpnameFilter === c.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>{c.nama}</button>
              ))}
            </div>

            {cabangList.filter(c => c.isActive && (stokOpnameFilter === 'all' || stokOpnameFilter === c.id)).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada cabang aktif. Daftarkan cabang dulu.</p>
            ) : (
              <div className="space-y-4">
                {cabangList.filter(c => c.isActive && (stokOpnameFilter === 'all' || stokOpnameFilter === c.id)).map(cabang => {
                  const cabangStockItems = cabangStok.filter(s => s.cabangId === cabang.id);
                  const totalSelisih = cabangStockItems.reduce((sum, s) => sum + (s.stokFisik - s.stokTeoritis), 0);
                  return (
                    <div key={cabang.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-slate-50 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-bold text-gray-900">{cabang.nama}</span>
                          <span className="text-[10px] text-gray-500">{cabangStockItems.length} bahan</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded-full ${
                            totalSelisih === 0 ? 'bg-emerald-100 text-emerald-800' :
                            totalSelisih > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {totalSelisih === 0 ? '✅ Balance' : totalSelisih > 0 ? `🔵 Plus ${totalSelisih}` : `🔴 Minus ${Math.abs(totalSelisih)}`}
                          </span>
                        </div>
                      </div>

                      {cabangStockItems.length === 0 ? (
                        <div className="p-4">
                          <p className="text-xs text-gray-400">Belum ada data stok opname. Staff cabang bisa melakukan stok opname dari dashboard masing-masing.</p>
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-800">
                            <strong>Alur:</strong> SO → Dikirim dari Pusat → Cabang Terima → Stok Teoritis Otomatis → Cabang Lakukan Stok Opname (input fisik) → Data Tampil di Sini.
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                                <th className="px-3 py-2 rounded-l-lg">Bahan</th>
                                <th className="px-3 py-2 text-right">Stok Teoritis</th>
                                <th className="px-3 py-2 text-right">Stok Fisik</th>
                                <th className="px-3 py-2 text-right">Selisih</th>
                                <th className="px-3 py-2 text-center rounded-r-lg">Analisa</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {cabangStockItems.map(item => {
                                const selisih = item.stokFisik - item.stokTeoritis;
                                return (
                                  <tr key={`${item.cabangId}-${item.bahanNama}`} className={`hover:bg-gray-50 ${selisih !== 0 ? 'bg-amber-50/30' : ''}`}>
                                    <td className="px-3 py-2.5 font-semibold text-gray-900">{item.bahanNama}</td>
                                    <td className="px-3 py-2.5 text-right font-mono">{item.stokTeoritis} {item.satuan}</td>
                                    <td className="px-3 py-2.5 text-right font-mono">{item.stokFisik} {item.satuan}</td>
                                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${
                                      selisih === 0 ? 'text-emerald-600' : selisih > 0 ? 'text-blue-600' : 'text-red-600'
                                    }`}>{selisih > 0 ? `+${selisih}` : selisih}</td>
                                    <td className="px-3 py-2.5 text-center">
                                      {selisih === 0 ? (
                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✅ Aman</span>
                                      ) : selisih > 0 ? (
                                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold" title="Stok fisik > teoritis">🔵 Plus</span>
                                      ) : (
                                        <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold" title="Stok fisik < teoritis — kemungkinan waste atau salah catat">🔴 Minus</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-800">
              <strong>📊 Interpretasi:</strong><br />
              • <strong>✅ Aman</strong> = Stok fisik sesuai catatan (balance)<br />
              • <strong>🔵 Plus</strong> = Stok fisik lebih besar dari teoritis — kemungkinan kelebihan kiriman atau salah catat penerimaan<br />
              • <strong>🔴 Minus</strong> = Stok fisik kurang dari teoritis — cek waste, penjualan tak tercatat, atau kemungkinan pencurian<br />
              <span className="text-blue-600 font-semibold">Data stok opname berasal dari input staff cabang via form Stock Opname masing-masing.</span>
            </div>
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
              {/* ─── FORM UNTUK PRODUK/MINUMAN (dengan kemasan, markup) ─── */}
              {bahanForm.kategori !== 'Alat' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kemasan (isi)</label>
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
                  {/* Preview harga */}
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
                /* ─── FORM KHUSUS ALAT (tanpa kemasan/markup) ─── */
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
                  const newBahan: BahanBaku = {
                    kode: bahanForm.kode || undefined,
                    nama: bahanForm.nama.trim(),
                    kategori: bahanForm.kategori || undefined,
                    satuan: isAlat ? 'pcs' : bahanForm.satuan,
                    isiKemasan: isAlat ? (bahanForm.isiKemasan || 1) : bahanForm.isiKemasan,
                    hargaBeli: hargaJual,
                    hargaSatuan: hargaSatuan,
                    hargaBeliReal: bahanForm.hargaBeliReal,
                    hargaSatuanReal: isAlat ? bahanForm.hargaBeliReal : (bahanForm.isiKemasan > 0 ? Math.round(bahanForm.hargaBeliReal / bahanForm.isiKemasan) : 0),
                    markupPercent: isAlat ? 0 : bahanForm.markupPercent,
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
