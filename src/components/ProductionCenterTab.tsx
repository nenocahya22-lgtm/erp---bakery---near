import React, { useState } from 'react';
import {
  Calendar, ClipboardList, ShoppingCart, FileText, Printer,
  Plus, X, Scale, Package, AlertTriangle, CheckCircle2, Thermometer,
  Clock, ChevronRight, Flame, Percent
} from 'lucide-react';
import { ProductHpp, DetailResep, CalculationResult, BahanBaku, ProductionCalendarEntry, SATUAN_OPTIONS } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import { getAllOrders } from '../lib/firestore-bridge';

interface ProductionCenterTabProps {
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  onProductionComplete?: (productName: string, batchQty: number) => void;
}

export default function ProductionCenterTab({
  productHpp, detailResep, calculatedProducts, bahanBaku,
  onProductionComplete
}: ProductionCenterTabProps) {
  const [activeSection, setActiveSection] = useState<'calendar' | 'baking_control' | 'planner' | 'workorder' | 'sop'>('calendar');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // ─── KALENDER PRODUKSI ───
  const [calendarEntries, setCalendarEntries] = useState<ProductionCalendarEntry[]>(() => {
    return safeGetLocalStorage<ProductionCalendarEntry[]>('production_calendar_entries', []);
  });
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calLabel, setCalLabel] = useState('');
  const [calDate, setCalDate] = useState(new Date().toISOString().substring(0, 10));
  const [calWarna, setCalWarna] = useState<'emerald' | 'amber' | 'blue' | 'red' | 'purple'>('emerald');
  const [calNotes, setCalNotes] = useState('');

  const handleAddCalendarEntry = () => {
    if (!calLabel.trim() || !calDate) return;
    const entry: ProductionCalendarEntry = {
      id: `cal-${Date.now()}`,
      tanggal: calDate,
      label: calLabel.trim(),
      warna: calWarna,
      notes: calNotes.trim() || undefined,
    };
    const updated = [...calendarEntries, entry];
    setCalendarEntries(updated);
    localStorage.setItem('production_calendar_entries', JSON.stringify(updated));
    setShowCalendarModal(false);
    setCalLabel(''); setCalNotes('');
  };

  const handleDeleteCalendarEntry = (id: string) => {
    const updated = calendarEntries.filter(e => e.id !== id);
    setCalendarEntries(updated);
    localStorage.setItem('production_calendar_entries', JSON.stringify(updated));
  };

  // Generate 7 days ahead for the calendar view
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().substring(0, 10);
  });
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const getEntriesForDate = (date: string) => calendarEntries.filter(e => e.tanggal === date);

  const warnaClasses: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  // ─── PLANNER STATE ───
  const [plannerTargets, setPlannerTargets] = useState<Record<string, number>>({});
  const [plannerSatuans, setPlannerSatuans] = useState<Record<string, string>>({});
  const [pendingOrders, setPendingOrders] = useState<{ productName: string; qty: number }[] | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const loadPendingOrders = async () => {
    setLoadingOrders(true);
    try {
      const orders = await getAllOrders();
      const active = orders.filter(o => o.status === 'Diproses');
      const tally: Record<string, number> = {};
      active.forEach(o => o.items.forEach(item => {
        tally[item.name] = (tally[item.name] || 0) + item.quantity;
      }));
      setPendingOrders(Object.entries(tally).map(([k, v]) => ({ productName: k, qty: v })));
    } catch {
      setPendingOrders([]);
    }
    setLoadingOrders(false);
  };

  const applyPendingOrders = () => {
    if (!pendingOrders) return;
    const updated = { ...plannerTargets };
    pendingOrders.forEach(po => {
      updated[po.productName] = (updated[po.productName] || 0) + po.qty;
    });
    setPlannerTargets(updated);
  };

  const calcPlannerNeeds = () => {
    const needs: Record<string, { total: number; satuan: string; hargaTotal: number; perProduk: { nama: string; qty: number }[] }> = {};
    Object.entries(plannerTargets).forEach(([prodName, val]) => {
      const prodQty = val as number;
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

  const plannerNeeds = calcPlannerNeeds();
  const totalPlannerHarga = Object.values(plannerNeeds).reduce((sum, n) => sum + n.hargaTotal, 0);
  const totalPlannerPcs = Object.values(plannerTargets).reduce((a, b) => (a as number) + (b as number), 0) as number;

  // ─── DAILY CHECKLIST STATE ───
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>(() => {
    return safeGetLocalStorage<Record<string, boolean>>('production_checklist_data', {});
  });

  const defaultChecklist = [
    { key: 'cek_bahan', label: 'Cek ketersediaan bahan baku' },
    { key: 'cek_suhu', label: 'Cek suhu ruang produksi' },
    { key: 'siapkan_alat', label: 'Siapkan peralatan & loyang bersih' },
    { key: 'timbang_bahan', label: 'Timbang bahan sesuai Work Order' },
    { key: 'preheat_oven', label: 'Preheat oven 15 menit sebelum mulai' },
    { key: 'catat_waktu', label: 'Catat waktu produksi & suhu aktual' },
    { key: 'cek_kebersihan', label: 'Pastikan area produksi bersih' },
    { key: 'record_temp', label: 'Catat suhu adonan akhir mixing' },
  ];

  const handleToggleChecklist = (key: string) => {
    const updated = { ...checklistItems, [key]: !checklistItems[key] };
    setChecklistItems(updated);
    localStorage.setItem('production_checklist_data', JSON.stringify(updated));
  };

  const handleResetChecklist = async () => {
    const confirmed_158 = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: 'Reset checklist harian? Semua centang akan dihapus.',
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed_158) return;
    setChecklistItems({});
    localStorage.setItem('production_checklist_data', JSON.stringify({}));
  };

  // ─── BAKING LOG STATE ───
  const [bakingLogs, setBakingLogs] = useState<{
    id: string; date: string; productName: string; batchQty: number;
    doughTemp: number; ovenTemp: number; startTime: string; endTime: string;
    notes: string; cabangId?: string;
  }[]>(() => {
    return safeGetLocalStorage<{
      id: string; date: string; productName: string; batchQty: number;
      doughTemp: number; ovenTemp: number; startTime: string; endTime: string;
      notes: string; cabangId?: string;
    }[]>('production_baking_logs', []);
  });
  const [showBakingLogModal, setShowBakingLogModal] = useState(false);
  const [blProduct, setBlProduct] = useState('');
  const [blBatch, setBlBatch] = useState(1);
  const [blDoughTemp, setBlDoughTemp] = useState('26');
  const [blOvenTemp, setBlOvenTemp] = useState('180');
  const [blStart, setBlStart] = useState(new Date().toTimeString().substring(0, 5));
  const [blEnd, setBlEnd] = useState('');
  const [blNotes, setBlNotes] = useState('');
  const [blSatuan, setBlSatuan] = useState('pcs');

  const handleAddBakingLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blProduct) return;
    const log = {
      id: `bl-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      productName: blProduct,
      batchQty: blBatch,
      satuan: blSatuan,
      doughTemp: parseFloat(blDoughTemp) || 0,
      ovenTemp: parseFloat(blOvenTemp) || 0,
      startTime: blStart,
      endTime: blEnd,
      notes: blNotes.trim(),
    };
    const updated = [log, ...bakingLogs].slice(0, 100);
    setBakingLogs(updated);
    localStorage.setItem('production_baking_logs', JSON.stringify(updated));
    // 🔧 Potong stok bahan baku sesuai resep produksi
    onProductionComplete?.(blProduct, blBatch);
    setShowBakingLogModal(false);
    setBlProduct('');
    setBlBatch(1);
    setBlDoughTemp('26');
    setBlOvenTemp('180');
    setBlStart(new Date().toTimeString().substring(0, 5));
    setBlEnd('');
    setBlNotes('');
    setBlSatuan('pcs');
  };

  const handleDeleteBakingLog = (id: string) => {
    const updated = bakingLogs.filter(l => l.id !== id);
    setBakingLogs(updated);
    localStorage.setItem('production_baking_logs', JSON.stringify(updated));
  };

  // ─── WORK ORDER STATE ───
  const [woProduct, setWoProduct] = useState('');
  const [woBatch, setWoBatch] = useState(1);
  const [woNotes, setWoNotes] = useState('');

  const woResep = detailResep.filter(r => r.namaProduk === woProduct);
  const woScaled = woResep.map(r => ({ ...r, scaleTakaran: r.takaran * woBatch }));
  const woProductInfo = productHpp.find(p => p.namaProduk === woProduct);
  const woTotalCost = woScaled.reduce((sum, r) => {
    const bahan = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
    return sum + (r.scaleTakaran * (bahan?.hargaSatuan || 0));
  }, 0);
  const woTotalHpp = woTotalCost;
  const woTotalOutput = (woProductInfo?.porsiJual || 1) * woBatch;

  const handlePrintWO = () => {
    const pw = window.open('', '_blank');
    if (!pw) return;
    const rows = woScaled.map(r => {
      const bahan = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
      const dalamKg = r.scaleTakaran >= 1000;
      return `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${r.namaBahan}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${dalamKg ? (r.scaleTakaran/1000).toFixed(2) : r.scaleTakaran.toFixed(0)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${dalamKg ? 'kg' : (bahan?.satuan||'gr')}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${formatCurrency(r.scaleTakaran * (bahan?.hargaSatuan||0))}</td></tr>`;
    }).join('');
    pw.document.write(`<html><head><title>WO - ${woProduct}</title><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;max-width:700px;margin:0 auto;padding:40px;color:#1f2937;font-size:13px;}
h1{font-size:22px;margin-bottom:4px;}h2{font-size:14px;color:#6b7280;font-weight:400;margin-bottom:20px;}
table{width:100%;border-collapse:collapse;margin-top:16px;}
th{background:#f3f4f6;padding:10px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#374151;}
td{padding:8px;border-bottom:1px solid #e5e7eb;}
tr:last-child td{border-bottom:2px solid #d1d5db;}
.footer{margin-top:20px;padding-top:16px;border-top:2px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;}
.badge{display:inline-block;background:#dbeafe;color:#1e40af;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;}
@media print{body{padding:20px;}th{background:#e5e7eb !important;}.no-print{display:none;}}
</style></head><body>
<h1>🧾 Kitchen Work Order</h1>
<h2>${woProduct} &mdash; Batch ${woBatch}x (${woTotalOutput} porsi) &bull; ${new Date().toLocaleDateString('id-ID')}</h2>
<table><thead><tr><th>Bahan</th><th style="text-align:right;">Jumlah</th><th style="text-align:center;">Satuan</th><th style="text-align:right;">Biaya</th></tr></thead><tbody>${rows}</tbody></table>
<div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;">
  <div style="padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;flex:1;"><strong>Total Batch:</strong> ${formatCurrency(woTotalHpp)}</div>
  <div style="padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;flex:1;"><strong>Cost / porsi:</strong> ${formatCurrency(woTotalHpp/woTotalOutput)}</div>
</div>
${woNotes ? `<div style="margin-top:12px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;"><strong>📝 Catatan:</strong> ${woNotes}</div>` : ''}
<p class="footer">Near Bakery & Co. ERP &mdash; Work Order &bull; Dicetak ${new Date().toLocaleString('id-ID')}</p>
<script>window.print();<\/script></body></html>`);
    pw.document.close();
  };

  // ─── SECTION NAV ───
  const sectionBtn = (key: typeof activeSection, label: string, icon: React.ReactNode) => (
    <button onClick={() => setActiveSection(key)}
      className={`px-3 py-2 text-xs font-bold uppercase rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
        activeSection === key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}>{icon} {label}</button>
  );

  // ─── DOUGH TEMPERATURE CALCULATOR (inline) ───
  function DoughTempCalculator() {
    const [roomTemp, setRoomTemp] = useState(28);
    const [flourTemp, setFlourTemp] = useState(26);
    const [mixerFriction, setMixerFriction] = useState(12);
    const [targetDoughTemp, setTargetDoughTemp] = useState(26);

    const desiredWaterTemp = (targetDoughTemp * 3) - (roomTemp + flourTemp + mixerFriction);
    const needsIce = desiredWaterTemp < 2;
    const needsWarmWater = desiredWaterTemp > 40;
    const totalLiquid = 1000;
    const icePercent = needsIce ? Math.min(0.5, Math.max(0, (2 - desiredWaterTemp) / 20)) : 0;
    const iceAmount = Math.round(totalLiquid * icePercent);
    const coldWaterAmount = totalLiquid - iceAmount;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            {l:'Suhu Ruangan', v:roomTemp, s:setRoomTemp, min:15, max:40, cls:'accent-blue-600'},
            {l:'Suhu Tepung', v:flourTemp, s:setFlourTemp, min:15, max:40, cls:'accent-amber-600'},
            {l:'Friction Mixer', v:mixerFriction, s:setMixerFriction, min:0, max:30, cls:'accent-purple-600'},
            {l:'Target Adonan', v:targetDoughTemp, s:setTargetDoughTemp, min:20, max:32, cls:'accent-emerald-600'},
          ].map((item,i) => (
            <div key={i} className="text-xs">
              <div className="flex justify-between font-semibold mb-0.5">
                <span className="text-gray-600">{item.l}</span>
                <span className="font-mono font-bold">{item.v}°C</span>
              </div>
              <input type="range" min={item.min} max={item.max} step="0.5" value={item.v}
                onChange={e => item.s(parseFloat(e.target.value))}
                className={`w-full ${item.cls}`} />
            </div>
          ))}
        </div>
        <div className={`p-3 rounded-lg border text-xs font-semibold ${
          needsIce ? 'bg-blue-50 border-blue-200 text-blue-800' :
          needsWarmWater ? 'bg-orange-50 border-orange-200 text-orange-800' :
          'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span className="font-bold">Suhu Air Ideal: {desiredWaterTemp.toFixed(1)}°C</span>
          {needsIce && <span className="block text-[10px] mt-1">❄️ Campur {iceAmount}g es + {coldWaterAmount}ml air</span>}
          {needsWarmWater && <span className="block text-[10px] mt-1">🔥 Hangatkan air hingga {desiredWaterTemp.toFixed(1)}°C</span>}
          {!needsIce && !needsWarmWater && <span className="block text-[10px] mt-1">✅ Air biasa tanpa es/pemanasan</span>}
        </div>
      </div>
    );
  }

  // ─── RENDER ───
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <ClipboardList className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">🏭 Production Center</h2>
            <p className="text-xs text-gray-500">Kalender produksi, jadwal MPS, planner bahan, work order & SOP resep — satu panel.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionBtn('calendar', 'Kalender', <Calendar className="w-3.5 h-3.5" />)}
          {sectionBtn('baking_control', 'Baking Control', <Flame className="w-3.5 h-3.5" />)}
          {sectionBtn('planner', 'Planner', <ShoppingCart className="w-3.5 h-3.5" />)}
          {sectionBtn('workorder', 'Work Order', <FileText className="w-3.5 h-3.5" />)}
          {sectionBtn('sop', 'SOP Resep', <CheckCircle2 className="w-3.5 h-3.5" />)}
        </div>
      </div>

      {/* ─── KALENDER PRODUKSI ─── */}
      {activeSection === 'calendar' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" /> Kalender Produksi 7 Hari
            </h3>
            <button onClick={() => setShowCalendarModal(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Tambah Event
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 divide-x divide-y sm:divide-y-0 border-gray-100">
            {weekDates.map((date, idx) => {
              const day = new Date(date).getDay();
              const entries = getEntriesForDate(date);
              const isToday = date === new Date().toISOString().substring(0, 10);
              return (
                <div key={date} className={`p-3 min-h-[140px] ${isToday ? 'bg-emerald-50/50' : ''}`}>
                  <div className={`text-[10px] font-bold mb-2 ${isToday ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {dayNames[day]}, {new Date(date).getDate()} {new Date(date).toLocaleDateString('id-ID', { month: 'short' })}
                  </div>
                  <div className="space-y-1">
                    {entries.map(e => (
                      <div key={e.id} className={`text-[9px] px-2 py-1 rounded-lg border font-semibold ${warnaClasses[e.warna]} flex justify-between items-center group`}>
                        <span className="truncate">{e.label}</span>
                        <button onClick={() => handleDeleteCalendarEntry(e.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 ml-1 cursor-pointer">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {calendarEntries.length === 0 && (
            <div className="text-center py-6">
              <p className="text-xs text-gray-400">Belum ada event produksi. Klik "Tambah Event" untuk mencatat jadwal penting.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── BAKING CONTROL (Baker% + Suhu Adonan) ─── */}
      {activeSection === 'baking_control' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Baker's Percentage */}
          <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-emerald-600" /> Baker's Percentage
            </h3>
            <p className="text-xs text-gray-500">
              Persentase setiap bahan terhadap total tepung. Tepung = 100%.
            </p>
            {productHpp.filter(p => p.status !== 'draft').length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada produk.</p>
            ) : (
              <div className="space-y-3">
                {productHpp.filter(p => p.status !== 'draft').map(p => {
                  const resep = detailResep.filter(r => r.namaProduk === p.namaProduk);
                  const tepungResep = resep.find(r => 
                    r.namaBahan.toLowerCase().includes('tepung') ||
                    r.namaBahan.toLowerCase().includes('terigu')
                  );
                  if (resep.length === 0) return null;
                  return (
                    <details key={p.namaProduk} className="border border-gray-200 rounded-xl overflow-hidden group">
                      <summary className="p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-xs font-bold text-gray-900 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-gray-400 group-open:rotate-90 transition-transform" />
                        {p.namaProduk}
                      </summary>
                      <div className="p-3 border-t border-gray-100 space-y-2">
                        {resep.map((r, i) => {
                          const pct = tepungResep && tepungResep.takaran > 0
                            ? ((r.takaran / tepungResep.takaran) * 100).toFixed(1)
                            : '—';
                          const bi = bahanBaku.find(b => b.nama === r.namaBahan);
                          return (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700">{r.namaBahan}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-gray-500 w-16 text-right">{r.takaran}{bi?.satuan||'gr'}</span>
                                <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, parseFloat(pct) || 0)}%` }} />
                                </div>
                                <span className="font-mono font-bold w-14 text-right text-emerald-700">{pct === '—' ? '—' : `${pct}%`}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Suhu & Waktu Adonan + Dough Temperature Calculator */}
          <div className="lg:col-span-6 space-y-4">
            {/* Suhu Adonan Reference */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-600" /> Suhu & Waktu Adonan
              </h3>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <h4 className="font-bold text-amber-800 mb-1">🌡️ Suhu Panggang</h4>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>Roti Sobek: 180°C — 25-30 menit (api atas-bawah)</li>
                    <li>Donat: 170°C — 15-20 menit (deep fry 170°C)</li>
                    <li>Kue: 160°C — 35-45 menit (api bawah)</li>
                    <li>Cookies: 165°C — 12-15 menit (api atas-bawah)</li>
                    <li>Croissant: 190°C — 18-22 menit</li>
                  </ul>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <h4 className="font-bold text-blue-800 mb-1">🧊 Suhu Adonan Ideal</h4>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                    <li>Adonan roti: 24-26°C (suhu akhir mixing)</li>
                    <li>Adonan donat: 24-26°C</li>
                    <li>Adonan Danish/Puff: 24°C (jangan terlalu panas)</li>
                    <li>Adonan Sponge: 22-24°C</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Dough Temperature Calculator (from DoughTemperatureTab) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-blue-600" /> Kalkulator Suhu Adonan
              </h3>
              <DoughTempCalculator />
            </div>

            {/* BAKING LOG */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" /> Baking Log
                </h3>
                <button onClick={() => setShowBakingLogModal(true)}
                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
                  <Plus className="w-3 h-3" /> Catat Baking
                </button>
              </div>

              {bakingLogs.length === 0 ? (
                <p className="text-[10px] text-gray-400 text-center py-4">Belum ada catatan baking. Klik "Catat Baking" untuk mencatat batch produksi.</p>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {bakingLogs.slice(0, 10).map(log => (
                    <div key={log.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{log.productName}</span>
                          <span className="text-[9px] text-gray-400 font-mono">×{log.batchQty}</span>
                        </div>
                        <button onClick={() => handleDeleteBakingLog(log.id)}
                          className="text-gray-400 hover:text-red-600 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex gap-3 mt-1 text-[10px] text-gray-500 font-mono">
                        <span>🔥 {log.ovenTemp}°C</span>
                        <span>🧊 {log.doughTemp}°C</span>
                        <span>⏱️ {log.startTime}{log.endTime ? `-${log.endTime}` : ''}</span>
                      </div>
                      {log.notes && <p className="text-[9px] text-gray-400 mt-0.5">📝 {log.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PRODUCTION PLANNER ─── */}
      {activeSection === 'planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
              <ShoppingCart className="w-4 h-4 inline text-emerald-600 mr-1" /> Target Produksi
            </h3>
            <div className="flex gap-2">
              <button onClick={loadPendingOrders} disabled={loadingOrders}
                className="text-[9px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" /> {loadingOrders ? 'Memuat...' : 'Ambil dari ✓ Pesanan Online'}
              </button>
              {pendingOrders && pendingOrders.length > 0 && (
                <button onClick={applyPendingOrders}
                  className="text-[9px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Terapkan ({pendingOrders.reduce((s, p) => s + p.qty, 0)} pcs)
                </button>
              )}
            </div>
            {pendingOrders && pendingOrders.length > 0 && (
              <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 text-[10px] space-y-1">
                <p className="font-bold text-indigo-800 mb-1">Pesanan Online Menunggu Produksi:</p>
                {pendingOrders.map(po => (
                  <div key={po.productName} className="flex justify-between text-indigo-700">
                    <span>{po.productName}</span>
                    <span className="font-mono font-bold">{po.qty} pcs</span>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-3">
              {productHpp.filter(p => p.status !== 'draft').map(p => (
                <div key={p.namaProduk} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{p.namaProduk}</span>
                  <input type="number" min="0" value={plannerTargets[p.namaProduk] || ''}
                    onChange={e => setPlannerTargets(prev => ({ ...prev, [p.namaProduk]: parseInt(e.target.value) || 0 }))}
                    className="w-20 border border-gray-200 rounded-lg p-2 text-xs font-mono font-bold text-center" placeholder="0" />
                  <select value={plannerSatuans[p.namaProduk] || 'pcs'}
                    onChange={e => setPlannerSatuans(prev => ({ ...prev, [p.namaProduk]: e.target.value }))}
                    className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-1.5 font-bold bg-white min-w-[55px] text-center">
                    {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
              {productHpp.filter(p => p.status !== 'draft').length === 0 && <p className="text-xs text-gray-400 text-center py-4">Belum ada produk.</p>}
            </div>
            {totalPlannerPcs > 0 && (
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs space-y-1">
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Total Produk:</span><span>{totalPlannerPcs} pcs</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Est. Biaya Bahan:</span><span className="font-mono">{formatCurrency(totalPlannerHarga)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
              <Package className="w-4 h-4 text-emerald-600" /> Daftar Belanja Bahan
            </h3>
            {Object.keys(plannerNeeds).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Masukkan target produksi untuk melihat kebutuhan bahan.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(plannerNeeds).sort(([, a], [, b]) => b.total - a.total).map(([bahan, data]) => {
                  const dalamKg = data.total >= 1000;
                  return (
                    <div key={bahan} className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-gray-900 text-xs">{bahan}</span>
                          <span className="text-xs text-gray-400 ml-2">
                            {dalamKg ? `${(data.total/1000).toFixed(1)} kg` : `${Math.round(data.total)} ${data.satuan}`}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-800 text-xs">{formatCurrency(data.hargaTotal)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
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
            )}
          </div>
        </div>
      )}

      {/* ─── WORK ORDER ─── */}
      {activeSection === 'workorder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-600" /> Batch Control
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Pilih Produk</label>
                <select value={woProduct} onChange={e => setWoProduct(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                  <option value="">-- Pilih Produk --</option>
                  {productHpp.filter(p => p.status !== 'draft').map(p => <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk}</option>)}
                </select>
              </div>
              {woProduct && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                      Multiplier Batch: <span className="text-emerald-700 font-mono font-bold">{woBatch}x</span>
                    </label>
                    <input type="range" min="0.5" max="50" step="0.5" value={woBatch}
                      onChange={e => setWoBatch(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Catatan Dapur</label>
                    <textarea value={woNotes} onChange={e => setWoNotes(e.target.value)}
                      placeholder="Suhu oven, waktu panggang, tips..."
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-xs h-20 resize-none" />
                  </div>
                  <button onClick={handlePrintWO}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5">
                    <Printer className="w-4 h-4" /> Cetak Work Order
                  </button>
                </>
              )}
            </div>
            {woProduct && (
              <div className="bg-slate-50 p-3 rounded-xl border border-gray-100 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Resep:</span><span className="font-bold">{woResep.length} bahan</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Output Standar:</span><span className="font-bold">{woProductInfo?.porsiJual||0} porsi</span></div>
                <div className="flex justify-between border-t border-gray-200/50 pt-1.5 text-emerald-800 font-bold">
                  <span>Output Batch:</span><span className="font-mono">{woTotalOutput} porsi</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Est. Biaya Batch:</span><span className="font-mono">{formatCurrency(woTotalHpp)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 space-y-4">
            {!woProduct ? (
              <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center">
                <ClipboardList className="w-12 h-12 text-gray-200 stroke-1 mb-3" />
                <p className="text-sm text-gray-500 font-semibold">Pilih Produk</p>
                <p className="text-xs text-gray-400 mt-1">Pilih produk dan atur multiplier batch untuk work order.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-950 to-slate-950 text-white p-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black tracking-wider uppercase flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-400" /> Work Order — {woProduct}
                      </h3>
                      <p className="text-[10px] text-emerald-300/70 mt-0.5 font-mono">
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <button onClick={handlePrintWO}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg border border-white/20 transition cursor-pointer">
                      <Printer className="w-3.5 h-3.5 inline" /> Cetak
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-[10px]">
                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                      <span className="text-emerald-300/60 block uppercase font-bold">Batch</span>
                      <span className="text-lg font-black font-mono text-white">{woBatch}x</span>
                    </div>
                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                      <span className="text-emerald-300/60 block uppercase font-bold">Output</span>
                      <span className="text-lg font-black font-mono text-white">{woTotalOutput} porsi</span>
                    </div>
                    <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                      <span className="text-emerald-300/60 block uppercase font-bold">Biaya Batch</span>
                      <span className="text-lg font-black font-mono text-white">{formatCurrency(woTotalHpp)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                    <Package className="w-3.5 h-3.5 inline text-emerald-600 mr-1" /> Takaran Bahan — {woBatch}x Resep
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                          <th className="px-4 py-2.5 rounded-l-lg">Bahan</th>
                          <th className="px-4 py-2.5 text-right">Standar</th>
                          <th className="px-4 py-2.5 text-right">×{woBatch}</th>
                          <th className="px-4 py-2.5 text-center">Satuan</th>
                          <th className="px-4 py-2.5 text-right rounded-r-lg">Biaya</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {woScaled.map((r, i) => {
                          const bahan = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
                          const dalamKg = r.scaleTakaran >= 1000;
                          return (
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-semibold text-gray-800">{r.namaBahan}</td>
                              <td className="px-4 py-3 text-right font-mono text-gray-500">{r.takaran} gr</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                                {dalamKg ? (r.scaleTakaran/1000).toFixed(2) : r.scaleTakaran.toFixed(0)}
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-gray-500">
                                {dalamKg ? 'kg' : (bahan?.satuan||'gr')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-gray-700">
                                {formatCurrency(r.scaleTakaran * (bahan?.hargaSatuan||0))}
                              </td>
                            </tr>
                          );
                        })}

                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div><span className="text-[10px] uppercase font-bold text-gray-500 block">Bahan</span><span className="font-mono font-black text-gray-900">{formatCurrency(woTotalCost)}</span></div>
                      <div><span className="text-[10px] uppercase font-bold text-gray-500 block">HPP / Porsi</span><span className="font-mono font-black text-emerald-800">{formatCurrency(woTotalHpp/woTotalOutput)}</span></div>
                    </div>
                  </div>
                  {woNotes && <div className="mt-3 bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs"><span className="font-bold text-amber-800">📝 Catatan:</span> {woNotes}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SOP RESEP ─── */}
      {activeSection === 'sop' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
              <CheckCircle2 className="w-4 h-4 inline text-emerald-600 mr-1" /> Standar Resep
            </h3>
            {productHpp.filter(p => p.status !== 'draft').length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada resep.</p>
            ) : (
              <div className="space-y-2">
                {productHpp.filter(p => p.status !== 'draft').map(p => {
                  const resep = detailResep.filter(r => r.namaProduk === p.namaProduk);
                  const calc = calculatedProducts.find(c => c.namaProduk === p.namaProduk);
                  return (
                    <details key={p.namaProduk} className="group border border-gray-200 rounded-xl overflow-hidden">
                      <summary className="p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-xs font-bold text-gray-900 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-gray-400 group-open:rotate-90 transition-transform" />
                        {p.kode && <span className="text-[9px] font-mono text-gray-400">{p.kode}</span>}
                        {p.namaProduk}
                        <span className="ml-auto text-[10px] text-gray-500 font-mono">{p.porsiJual} porsi</span>
                      </summary>
                      <div className="p-3 border-t border-gray-100 space-y-2 text-xs">
                        <div className="space-y-1">
                          {resep.map((r, i) => {
                            const bi = bahanBaku.find(b => b.nama === r.namaBahan);
                            return (
                              <div key={i} className="flex justify-between text-gray-700">
                                <span className="font-medium">{r.namaBahan}</span>
                                <span className="font-mono">{r.takaran} {bi?.satuan||'gr'}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t border-gray-100 pt-2 space-y-1">
                          <div className="flex justify-between text-gray-500">
                            <span>HPP per Porsi</span>
                            <span className="font-mono font-bold text-emerald-700">{calc ? formatCurrency(calc.hppPerPorsi) : '—'}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Harga Jual</span>
                            <span className="font-mono font-bold text-gray-900">{formatCurrency(p.hargaJual)}</span>
                          </div>
                          {calc && (
                            <div className="flex justify-between text-gray-500">
                              <span>Margin</span>
                              <span className={`font-mono font-bold ${calc.marginPersen >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {calc.marginPersen.toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Baker's Percentage */}
                        {resep.length > 0 && (
                          <div className="border-t border-gray-100 pt-2">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Baker's %</span>
                            <div className="flex flex-wrap gap-1">
                              {resep.map((r, i) => {
                                const tepungResep = resep.find(rr => rr.namaBahan.toLowerCase().includes('tepung'));
                                const pct = tepungResep && tepungResep.takaran > 0 ? ((r.takaran / tepungResep.takaran) * 100).toFixed(0) : '—';
                                return (
                                  <span key={i} className="text-[9px] bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">
                                    {r.namaBahan === tepungResep?.namaBahan ? '100%' : `${pct}%`}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
              <Thermometer className="w-4 h-4 inline text-amber-600 mr-1" /> SOP Produksi & Standar Mutu
            </h3>
            <div className="space-y-3 text-xs">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                <h4 className="font-bold text-amber-800 mb-1">🌡️ Suhu & Waktu Panggang</h4>
                <ul className="list-disc list-inside space-y-1 text-amber-700">
                  <li>Roti Sobek: 180°C — 25-30 menit (api atas-bawah)</li>
                  <li>Donat: 170°C — 15-20 menit (deep fry 170°C)</li>
                  <li>Kue: 160°C — 35-45 menit (api bawah)</li>
                  <li>Cookies: 165°C — 12-15 menit (api atas-bawah)</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-800 mb-1">🧊 Standar Suhu Adonan</h4>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Adonan roti: 24-26°C (suhu akhir mixing)</li>
                  <li>Adonan donat: 24-26°C</li>
                  <li>Adonan Danish: 24°C (jangan terlalu panas)</li>
                  <li>Gunakan metode Dough Temperature untuk presisi</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                <h4 className="font-bold text-purple-800 mb-1">📋 Prosedur Produksi</h4>
                <ol className="list-decimal list-inside space-y-1 text-purple-700">
                  <li>Persiapkan bahan — timbang sesuai Work Order</li>
                  <li>Mix dry ingredients — pastikan tercampur rata</li>
                  <li>Tambahkan wet ingredients — mix hingga kalis</li>
                  <li>Fermentasi — 60-90 menit (tergantung resep)</li>
                  <li>Scaling & rounding — bagi adonan sesuai berat</li>
                  <li>Bench rest — 15-20 menit</li>
                  <li>Moulding & panning — bentuk & masukkan loyang</li>
                  <li>Proofing — 45-60 menit (suhu ruang)</li>
                  <li>Baking — sesuai suhu & waktu di atas</li>
                  <li>Cooling — dinginkan di rak, jangan langsung di-packing</li>
                </ol>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-emerald-800 text-xs">✅ Checklist Produksi Harian</h4>
                  <button onClick={handleResetChecklist}
                    className="text-[9px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg transition cursor-pointer">
                    Reset
                  </button>
                </div>
                <ul className="space-y-1.5 text-emerald-700 text-xs">
                  {defaultChecklist.map(item => {
                    const checked = checklistItems[item.key] || false;
                    return (
                      <li key={item.key} className="flex items-center gap-2">
                        <input type="checkbox" checked={checked}
                          onChange={() => handleToggleChecklist(item.key)}
                          className="rounded border-emerald-300 accent-emerald-600 cursor-pointer w-3.5 h-3.5" />
                        <span className={`${checked ? 'line-through text-emerald-400' : ''} transition-all`}>
                          {item.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 pt-1.5 border-t border-emerald-200 flex justify-between text-[9px] text-emerald-600">
                  <span className="font-semibold">{defaultChecklist.filter(d => checklistItems[d.key]).length}/{defaultChecklist.length} selesai</span>
                  {(() => {
                    const done = defaultChecklist.filter(d => checklistItems[d.key]).length;
                    const pct = defaultChecklist.length > 0 ? Math.round((done / defaultChecklist.length) * 100) : 0;
                    return (
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-bold font-mono">{pct}%</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── BAKING LOG MODAL ─── */}
      {showBakingLogModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" /> Catat Baking Batch
              </h3>
              <button onClick={() => setShowBakingLogModal(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddBakingLog} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Produk</label>
                <select required value={blProduct} onChange={e => setBlProduct(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-white">
                  <option value="">-- Pilih Produk --</option>
                  {productHpp.filter(p => p.status !== 'draft').map(p => <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Batch Qty</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0.5" step="0.5" value={blBatch}
                      onChange={e => setBlBatch(parseFloat(e.target.value) || 1)}
                      className="flex-1 border border-gray-200 rounded-xl p-2.5 font-mono font-bold" />
                    <select value={blSatuan} onChange={e => setBlSatuan(e.target.value)}
                      className="border border-gray-200 rounded-xl p-2.5 font-bold bg-white min-w-[60px]">
                      {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Suhu Oven (°C)</label>
                  <input type="number" value={blOvenTemp}
                    onChange={e => setBlOvenTemp(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Suhu Adonan (°C)</label>
                  <input type="number" value={blDoughTemp}
                    onChange={e => setBlDoughTemp(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Mulai</label>
                  <input type="time" value={blStart}
                    onChange={e => setBlStart(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Selesai</label>
                  <input type="time" value={blEnd}
                    onChange={e => setBlEnd(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Catatan</label>
                <textarea value={blNotes} onChange={e => setBlNotes(e.target.value)}
                  placeholder="Waktu proofing, texture, catatan khusus..."
                  className="w-full border border-gray-200 rounded-xl p-2.5 h-16 resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowBakingLogModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer">Batal</button>
                <button type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer">
                  <Plus className="w-3.5 h-3.5 inline mr-1" /> Catat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL KALENDER ─── */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900"><Calendar className="w-4 h-4 inline text-emerald-600 mr-1" /> Tambah Event Produksi</h3>
              <button onClick={() => setShowCalendarModal(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Label Event</label>
                <input type="text" placeholder="Contoh: Produksi Donat Spesial" value={calLabel} onChange={e => setCalLabel(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Tanggal</label>
                  <input type="date" value={calDate} onChange={e => setCalDate(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-xl p-2.5" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Warna</label>
                  <select value={calWarna} onChange={e => setCalWarna(e.target.value as any)}
                    className="w-full text-xs border border-gray-200 rounded-xl p-2.5">
                    <option value="emerald">🟢 Hijau</option>
                    <option value="amber">🟡 Kuning</option>
                    <option value="blue">🔵 Biru</option>
                    <option value="red">🔴 Merah</option>
                    <option value="purple">🟣 Ungu</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Catatan (opsional)</label>
                <textarea value={calNotes} onChange={e => setCalNotes(e.target.value)}
                  placeholder="Detail event..."
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5 h-20 resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => setShowCalendarModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer">Batal</button>
                <button onClick={handleAddCalendarEntry}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
