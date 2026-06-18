import React from 'react';
import { BahanBaku, Cabang, SuratOrder, BranchStock, BranchTransaction, WasteLog } from '../types';
import { BarChart3, Building2, Package } from 'lucide-react';

interface DataPusatStokCabangSectionProps {
  cabangList: Cabang[];
  cabangStok: BranchStock[];
  branchTransactions: BranchTransaction[];
  suratOrders: SuratOrder[];
  bahanBaku: BahanBaku[];
  wasteLogs: WasteLog[];
}

export default function DataPusatStokCabangSection({
  cabangList, cabangStok, branchTransactions, suratOrders, bahanBaku, wasteLogs,
}: DataPusatStokCabangSectionProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
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
                    <table className="w-full text-left text-xs border-collapse table-fixed">
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
  );
}
