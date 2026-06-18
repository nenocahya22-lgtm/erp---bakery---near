import React, { useState } from 'react';
import { Cabang, BranchStock, OpnameDraft } from '../types';
import { ClipboardCheck, Clock, ThumbsUp, ThumbsDown, AlertTriangle, Building2 } from 'lucide-react';

interface DataPusatStokOpnameSectionProps {
  cabangList: Cabang[];
  cabangStok: BranchStock[];
  opnameDrafts: OpnameDraft[];
  onApproveOpname: (draftId: string) => void;
  onRejectOpname: (draftId: string, note?: string) => void;
}

export default function DataPusatStokOpnameSection({
  cabangList, cabangStok, opnameDrafts, onApproveOpname, onRejectOpname,
}: DataPusatStokOpnameSectionProps) {
  const [stokOpnameFilter, setStokOpnameFilter] = useState<string>('all');
  const [showApproval, setShowApproval] = useState(true);
  const pendingDrafts = opnameDrafts.filter(d => d.status === 'pending');

  return (
    <div className="space-y-4">
      {/* ─── PENDING APPROVAL PANEL ─── */}
      {pendingDrafts.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">⏳ Persetujuan Stok Opname</h3>
                <p className="text-[10px] text-amber-700">{pendingDrafts.length} draft menunggu persetujuan Anda</p>
              </div>
            </div>
            <button onClick={() => setShowApproval(!showApproval)}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 px-2 py-1 bg-amber-100 rounded-lg cursor-pointer">
              {showApproval ? 'Sembunyikan' : 'Lihat'}
            </button>
          </div>
          {showApproval && (
            <div className="divide-y divide-amber-100 max-h-[400px] overflow-y-auto">
              {pendingDrafts.map(draft => (
                <div key={draft.id} className="p-4 flex items-start gap-3 hover:bg-amber-100/50">
                  <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-800">{draft.bahanNama}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">{draft.cabangNama}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px]">
                      <span className="text-gray-500">Teoritis: <strong>{draft.stokTeoritis}</strong></span>
                      <span className="text-emerald-700 font-bold">→ Fisik: <strong>{draft.stokFisik}</strong></span>
                      <span className="text-gray-400">{draft.satuan}</span>
                      <span className="text-gray-400">• {new Date(draft.tanggal).toLocaleDateString('id-ID')}</span>
                    </div>
                    {draft.stokTeoritis !== draft.stokFisik && (
                      <div className={`mt-1 text-[10px] font-bold ${draft.stokFisik > draft.stokTeoritis ? 'text-blue-600' : 'text-red-600'}`}>
                        {draft.stokFisik > draft.stokTeoritis
                          ? `🔵 Plus ${(draft.stokFisik - draft.stokTeoritis).toFixed(1)} ${draft.satuan}`
                          : `🔴 Minus ${(draft.stokTeoritis - draft.stokFisik).toFixed(1)} ${draft.satuan}`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => onApproveOpname(draft.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> Setujui
                    </button>
                    <button onClick={() => {
                      const note = window.prompt('Alasan penolakan (opsional):', '');
                      onRejectOpname(draft.id, note || undefined);
                    }}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3" /> Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── INTEGRITAS STOK ALERT ─── */}
      {cabangList.filter(c => c.isActive).map(cabang => {
        const items = cabangStok.filter(s => s.cabangId === cabang.id);
        const selisihTotal = items.reduce((sum, s) => sum + Math.abs(s.stokFisik - s.stokTeoritis), 0);
        const masalahCount = items.filter(s => Math.abs(s.stokFisik - s.stokTeoritis) > 0).length;
        if (masalahCount === 0) return null;
        return (
          <div key={cabang.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-[11px]">
              <span className="font-bold text-amber-900">⚠️ {cabang.nama}:</span>
              {' '}{masalahCount} bahan dengan selisih stok (total {selisihTotal.toFixed(0)} unit).
              {' '}<span className="text-amber-700">Cek opname dan pastikan produksi tercatat.</span>
            </div>
          </div>
        );
      })}

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
                      <table className="w-full text-left text-xs border-collapse table-fixed">
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
  );
}
