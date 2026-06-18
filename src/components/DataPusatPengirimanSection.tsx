import React, { useState } from 'react';
import { Cabang, BahanBaku, SuratOrder } from '../types';
import { Truck, Plus, CheckCircle2, AlertTriangle, Printer, FileText, X } from 'lucide-react';

interface DataPusatPengirimanSectionProps {
  cabangList: Cabang[];
  bahanBaku: BahanBaku[];
  suratOrders: SuratOrder[];
  onAddSuratOrder: (so: SuratOrder) => void;
  onUpdateSuratOrder: (id: string, so: SuratOrder) => void;
  onReturSuratOrder?: (id: string, returNote: string) => void;
  showConfirm: (opts: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: string; onConfirm: () => void; onCancel?: () => void }) => void;
}

export default function DataPusatPengirimanSection({
  cabangList, bahanBaku, suratOrders, onAddSuratOrder, onUpdateSuratOrder, onReturSuratOrder, showConfirm,
}: DataPusatPengirimanSectionProps) {
  const [showSOModal, setShowSOModal] = useState(false);
  const [soCabangId, setSoCabangId] = useState('');
  const [soItems, setSoItems] = useState<{ bahanNama: string; qty: number }[]>([]);
  const [soCabangFilter, setSoCabangFilter] = useState<string>('all');
  const [showExportHistory, setShowExportHistory] = useState(false);
  const [exportHistory, setExportHistory] = useState<{type:string;format:string;timestamp:string;count:number}[]>(() => {
    try {
      const saved = localStorage.getItem('pusat_export_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

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
    if (!so) return;
    const newItems = so.items.map(item => {
      const input = window.prompt(`Jumlah "${item.bahanNama}" yang diterima (dikirim: ${item.qty}):`, String(item.qty));
      if (input === null) return null;
      const qtyTerima = parseFloat(input) || 0;
      return { ...item, qtyTerima: Math.max(0, qtyTerima) };
    });
    if (newItems.some(i => i === null)) return;
    onUpdateSuratOrder(soId, {
      ...so,
      status: 'diterima',
      items: newItems as typeof so.items,
    });
  };

  const handleSetujuiSO = async (soId: string) => {
    const so = suratOrders.find(s => s.id === soId);
    if (so && so.status === 'minta') {
      const confirmed = await new Promise<boolean>((resolve) => {
        showConfirm({
          title: 'Konfirmasi',
          message: `Setujui permintaan barang dari "${so.cabangNama}"?\nStok pusat akan berkurang secara otomatis.`,
          confirmLabel: 'Ya',
          cancelLabel: 'Batal',
          variant: 'warning',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (confirmed) {
        onUpdateSuratOrder(soId, { ...so, status: 'dikirim' });
      }
    }
  };

  const handleExportHistoryAdd = (type: string, format: string, count: number) => {
    const newEntry = { type, format, timestamp: new Date().toISOString(), count };
    setExportHistory(prev => {
      const updated = [newEntry, ...prev].slice(0, 50);
      localStorage.setItem('pusat_export_history', JSON.stringify(updated));
      return updated;
    });
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
      alert('✅ PDF berhasil didownload!');
    }catch(e:any){
      alert('Gagal export PDF: '+e.message+'\nGunakan Cetak (Ctrl+P) sebagai alternatif.');
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

  return (
    <>
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

        {/* SO Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          {suratOrders.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-gray-200 mx-auto stroke-1 mb-3" />
              <p className="text-xs text-gray-500 font-semibold">Belum ada surat order.</p>
              <p className="text-[10px] text-gray-400 mt-1">Klik "Kirim Barang" untuk membuat SO baru, atau cabang bisa minta barang dari dashboard mereka.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse table-fixed">
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
                              <button onClick={() => {
                                const note = window.prompt('Alasan retur (barang rusak di jalan):', 'Barang rusak saat pengiriman');
                                if (note !== null && onReturSuratOrder) {
                                  onReturSuratOrder(so.id, note);
                                }
                              }}
                                className="inline-flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                                title="Retur barang rusak di jalan — stok dikembalikan ke pusat">
                                <AlertTriangle className="w-3 h-3" /> Retur
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
                          {so.status === 'diretur' && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                                🔄 Diretur
                              </span>
                              {so.returNote && (
                                <span className="text-[9px] text-red-500 italic max-w-[120px] truncate" title={so.returNote}>
                                  📝 {so.returNote}
                                </span>
                              )}
                            </div>
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
              <button onClick={async () => {
                const confirmed = await new Promise<boolean>((resolve) => {
                  showConfirm({
                    title: 'Konfirmasi',
                    message: 'Hapus semua history export?',
                    confirmLabel: 'Ya',
                    cancelLabel: 'Batal',
                    variant: 'warning',
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false),
                  });
                });
                if (confirmed) {
                  setExportHistory([]);
                  localStorage.removeItem('pusat_export_history');
                }
              }} className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer">Hapus Semua</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
