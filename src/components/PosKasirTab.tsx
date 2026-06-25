import React, { useState, useEffect } from 'react';
import { ShoppingCart, ChefHat, Printer, X, Coins, RefreshCw, Calendar, Clock, TrendingUp, BarChart3, Image, Bluetooth } from 'lucide-react';
import { showToast } from '../lib/toast';
import { CalculationResult } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import { getSavedRecipeImage } from '../lib/image-generator';
import { cetakStrukThermal, generateHtmlStruk, isWebSerialSupported, isPrinterConnected, connectPrinter, disconnectPrinter } from '../lib/printer';

interface OrderItem {
  nama: string;
  variantLabel?: string;
  qty: number;
  satuan: string;
  harga: number;
  addOns?: { nama: string; harga: number }[];
}

interface RetailOrder {
  ordId: string;
  source: 'Walk-In' | 'WhatsApp Order' | 'GrabFood' | 'GoFood' | 'ShopeeFood' | 'Web Toko';
  customerName: string;
  items: string;
  itemsList: OrderItem[];
  totalSum: number;
  status: 'Queued' | 'Baking' | 'Completed' | 'Refunded';
  timeAgo: string;
  date: string;
  catatan: string;
  addOns: { nama: string; harga: number }[];
}

interface ShiftLog {
  id: string;
  type: 'end_shift' | 'end_day';
  date: string;
  time: string;
  totalRevenue: number;
  totalOrders: number;
  orders: RetailOrder[];
  cashierName?: string;
}

interface PosKasirTabProps {
  calculatedProducts: CalculationResult[];
  onCompletePOSSale: (productName: string, qty: number, totalRevenue: number, source?: string) => void;
  toppings?: { id: string; namaProduk: string; namaTopping: string; takaran: number; hargaJualTopping: number; }[];
  detailResep?: { namaProduk: string; namaBahan: string; takaran: number }[];
}

export default function PosKasirTab({ calculatedProducts, onCompletePOSSale, toppings, detailResep }: PosKasirTabProps) {
  const [printerConnected, setPrinterConnected] = useState(() => isPrinterConnected());
  const [activeReceipt, setActiveReceipt] = useState<RetailOrder | null>(null);
  const [showLaporan, setShowLaporan] = useState(false);
  const [showRekap, setShowRekap] = useState(false);
  const [newCustName, setNewCustName] = useState('');

  // Poll printer status setiap 3 detik
  useEffect(() => {
    const interval = setInterval(() => {
      setPrinterConnected(isPrinterConnected());
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<{ id: string; name: string; hargaJual: number } | null>(null);
  const [orderQty, setOrderQty] = useState(1);
  const [orderSource, setOrderSource] = useState<RetailOrder['source']>('Walk-In');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderAddOns, setOrderAddOns] = useState<{ nama: string; harga: number }[]>([]);
  const [showAddOnPicker, setShowAddOnPicker] = useState(false);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);

  const [orders, setOrders] = useState<RetailOrder[]>(() =>
    safeGetLocalStorage<RetailOrder[]>('pos_orders_data', [])
  );

  // Data topping dari modul Resep (global state)
  const availableAddOns = React.useMemo(() => {
    // Ambil dari props toppings, filter unique per produk untuk POS
    if (!toppings || toppings.length === 0) {
      return [];
    }
    // Deduplicate by namaTopping
    const seen = new Set<string>();
    return toppings.filter(t => {
      const key = t.namaTopping.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(t => ({
      nama: t.namaTopping,
      harga: t.hargaJualTopping,
    }));
  }, [toppings]);

  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>(() =>
    safeGetLocalStorage<ShiftLog[]>('pos_shift_logs', [])
  );

  // Sync dari localStorage — menangkap data baru dari App.tsx (Web Store orders)
  useEffect(() => {
    localStorage.setItem('pos_orders_data', JSON.stringify(orders));
  }, [orders]);

  // Sync balik dari localStorage saat window regain focus atau storage berubah dari tab lain
  useEffect(() => {
    const syncOrders = () => {
      const savedOrders = safeGetLocalStorage<RetailOrder[]>('pos_orders_data', []);
      if (savedOrders.length !== orders.length) {
        setOrders(savedOrders);
      }
    };
    window.addEventListener('focus', syncOrders);
    window.addEventListener('storage', syncOrders);
    return () => {
      window.removeEventListener('focus', syncOrders);
      window.removeEventListener('storage', syncOrders);
    };
  }, [orders.length]);

  useEffect(() => {
    localStorage.setItem('pos_shift_logs', JSON.stringify(shiftLogs));
  }, [shiftLogs]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const today = new Date().toISOString().substring(0, 10);

  // Filter orders today
  const todayOrders = orders.filter(o => o.date === today);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalSum, 0);
  const completedOrders = todayOrders.filter(o => o.status === 'Completed');

  const cartTotal = React.useMemo(() => {
    const itemsTotal = cartItems.reduce((s, i) => s + i.harga * i.qty, 0);
    const addOnsTotal = cartItems.reduce((s, i) => s + (i.addOns?.reduce((a, o) => a + o.harga, 0) || 0), 0);
    return { itemsTotal, addOnsTotal, grandTotal: itemsTotal + addOnsTotal };
  }, [cartItems]);

  const handleAddToCart = async () => {
    if (!selectedProduct) { showToast('Silakan pilih produk terlebih dahulu!', 'warning'); return; }

    const hasRecipe = detailResep && detailResep.some(
      r => r.namaProduk.toLowerCase().trim() === selectedProduct.toLowerCase().trim()
    );
    if (!hasRecipe) {
      const confirmNoRecipe = await new Promise<boolean>((resolve) => {
        showConfirm({
          title: 'Konfirmasi',
          message: `⚠️ "${selectedProduct}" BELUM punya resep (BOM)!\n\nStok bahan baku TIDAK akan terpotong secara otomatis.\nHPP dan laporan keuangan bisa menjadi tidak akurat.\n\nTetap jual produk ini?`,
          confirmLabel: 'Ya',
          cancelLabel: 'Batal',
          variant: 'warning',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmNoRecipe) return;
    }

    const prodInfo = calculatedProducts.find(p => p.namaProduk === selectedProduct);
    const variantPrice = selectedVariant?.hargaJual || 0;
    const price = variantPrice > 0 ? variantPrice : (prodInfo ? prodInfo.hargaJualPerPorsi : 0);
    
    if (price <= 0) {
      showToast(`❌ Harga jual "${selectedProduct}" belum diatur!`, 'error');
      return;
    }

    const variantLabel = selectedVariant ? selectedVariant.name : '';
    const existingIdx = cartItems.findIndex(i => i.nama === selectedProduct && i.variantLabel === variantLabel);

    if (existingIdx >= 0) {
      const updated = [...cartItems];
      updated[existingIdx] = { ...updated[existingIdx], qty: updated[existingIdx].qty + orderQty };
      setCartItems(updated);
    } else {
      setCartItems(prev => [...prev, {
        nama: selectedProduct,
        variantLabel,
        qty: orderQty,
        satuan: 'pcs',
        harga: price,
        addOns: orderAddOns.length > 0 ? [...orderAddOns] : undefined,
      }]);
    }

    setSelectedProduct('');
    setSelectedVariant(null);
    setOrderQty(1);
    setOrderAddOns([]);
    showToast(`✅ ${selectedProduct} × ${orderQty} ditambahkan ke pesanan`, 'success');
  };

  const handleRemoveCartItem = (idx: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) { showToast('Keranjang kosong!', 'warning'); return; }

    const txId = `TX-${Date.now().toString().slice(-6)}`;
    const itemsSummary = cartItems.map(i => `${i.qty} pcs ${i.nama}${i.variantLabel ? ' (' + i.variantLabel + ')' : ''}`).join(', ');
    const allAddOns = cartItems.flatMap(i => i.addOns || []);

    const newOrder: RetailOrder = {
      ordId: txId,
      source: orderSource,
      customerName: newCustName.trim() || 'Pelanggan POS',
      items: itemsSummary,
      itemsList: cartItems,
      totalSum: cartTotal.grandTotal,
      status: 'Queued',
      timeAgo: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      date: today,
      catatan: orderNotes.trim(),
      addOns: allAddOns,
    };

    setOrders(prev => [newOrder, ...prev]);
    cartItems.forEach(i => {
      if (onCompletePOSSale) onCompletePOSSale(i.nama, i.qty, i.harga * i.qty, orderSource);
    });

    if (isPrinterConnected()) {
      handlePrintThermalBill(newOrder).catch(console.warn);
    }

    setCartItems([]);
    setNewCustName('');
    setOrderNotes('');
    setSelectedProduct('');
    setSelectedVariant(null);
    showToast(`✅ Pesanan ${txId} selesai — ${formatCurrency(cartTotal.grandTotal)}`, 'success');
  };

  // Reset selectedVariant saat ganti produk
  const handleSelectProduct = (productName: string) => {
    setSelectedProduct(productName);
    setSelectedVariant(null);
  };

  const handleUpdateOrderStatus = (ordId: string, newStatus: RetailOrder['status']) => {
    setOrders(prev => prev.map(o => o.ordId === ordId ? { ...o, status: newStatus } : o));
  };

  const handleEndShift = () => {
    const name = window.prompt('Nama kasir untuk shift ini:', 'Kasir');
    if (!name) return;
    const todayActive = orders.filter(o => o.date === today);
    const log: ShiftLog = {
      id: `shift-${Date.now()}`,
      type: 'end_shift',
      date: today,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      totalRevenue: todayActive.reduce((s, o) => s + o.totalSum, 0),
      totalOrders: todayActive.length,
      orders: todayActive,
      cashierName: name,
    };
    setShiftLogs(prev => [log, ...prev]);
    showToast(`✅ End Shift — ${name} — Total: ${formatCurrency(log.totalRevenue)} — ${log.totalOrders} transaksi`, 'success');
  };

  const handleEndDay = async () => {
    const confirmed_195 = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: 'AKHIRI HARI? Semua transaksi hari ini akan diarsipkan. Stok tidak akan di-reset. Lanjutkan?',
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed_195) return;
    const todayActive = orders.filter(o => o.date === today);
    const log: ShiftLog = {
      id: `day-${Date.now()}`,
      type: 'end_day',
      date: today,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      totalRevenue: todayActive.reduce((s, o) => s + o.totalSum, 0),
      totalOrders: todayActive.length,
      orders: todayActive,
    };
    setShiftLogs(prev => [log, ...prev]);

    // Cetak laporan otomatis
    setTimeout(() => handlePrintLaporan(todayActive, today), 500);

    showToast(`✅ END DAY — ${today} — Total: ${formatCurrency(log.totalRevenue)} — ${log.totalOrders} transaksi`, 'success');
  };

  const handlePrintLaporan = (orderList: RetailOrder[], dateLabel: string) => {
    const total = orderList.reduce((s, o) => s + o.totalSum, 0);
    const rows = orderList.map(o => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;font-family:monospace;font-size:11px;">${o.ordId}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:11px;">${o.customerName}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:11px;">${o.items}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:11px;">${o.source}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:11px;">${formatCurrency(o.totalSum)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:center;font-size:11px;">${o.status}</td>
      </tr>
    `).join('');

    // Hitung per produk
    const productSummary: Record<string, { qty: number; revenue: number }> = {};
    orderList.forEach(o => {
      const match = o.items.match(/(\d+) pcs (.+)/);
      if (match) {
        const prod = match[2];
        if (!productSummary[prod]) productSummary[prod] = { qty: 0, revenue: 0 };
        productSummary[prod].qty += parseInt(match[1]);
        productSummary[prod].revenue += o.totalSum;
      }
    });

    const prodRows = Object.entries(productSummary).map(([prod, data]) => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:11px;">${prod}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:center;font-family:monospace;font-size:11px;">${data.qty}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:11px;">${formatCurrency(data.revenue)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:11px;">${data.qty > 0 ? formatCurrency(Math.round(data.revenue / data.qty)) : formatCurrency(0)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html><head>
        <title>Laporan Penjualan - ${dateLabel}</title>
        <style>
          body{font-family:'Courier New',monospace;max-width:800px;margin:0 auto;padding:40px;color:#1f2937;font-size:12px;}
          h1{font-size:20px;color:#065f46;text-align:center;}
          h2{font-size:14px;color:#374151;margin-top:24px;}
          .meta{color:#6b7280;font-size:11px;text-align:center;margin-bottom:20px;}
          table{width:100%;border-collapse:collapse;margin:8px 0;}
          th{background:#f3f4f6;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;}
          td{padding:6px;border-bottom:1px solid #e5e7eb;}
          .total{background:#f0fdf4;padding:12px;border-radius:8px;font-weight:bold;margin-top:16px;font-size:14px;}
          .footer{text-align:center;color:#9ca3af;font-size:10px;margin-top:30px;}
          @media print{body{padding:10px;}button{display:none;}}
        </style>
      </head><body>
        <h1>🧾 LAPORAN PENJUALAN</h1>
        <div class="meta">
          <strong>Near Bakery & Co. ERP</strong><br>
          Tanggal: ${new Date(dateLabel).toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}<br>
          Waktu Cetak: ${new Date().toLocaleString('id-ID')}<br>
          Total Transaksi: ${orderList.length} | Total Pendapatan: ${formatCurrency(total)}
        </div>

        <h2>📊 Rekap per Produk</h2>
        <table>
          <thead><tr><th>Produk</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Revenue</th><th style="text-align:right;">AOV</th></tr></thead>
          <tbody>${prodRows || '<tr><td colspan="4" style="text-align:center;color:#9ca3af;">Belum ada transaksi.</td></tr>'}</tbody>
        </table>

        <h2>📋 Detail Transaksi</h2>
        <table>
          <thead><tr><th>ID</th><th>Customer</th><th>Items</th><th>Sumber</th><th style="text-align:right;">Total</th><th style="text-align:center;">Status</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;">Belum ada transaksi.</td></tr>'}</tbody>
        </table>

        <div class="total">
          <div style="display:flex;justify-content:space-between;">
            <span>TOTAL PENDAPATAN:</span>
            <span>${formatCurrency(total)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px;color:#6b7280;">
            <span>Rata-rata per Transaksi:</span>
            <span>${orderList.length > 0 ? formatCurrency(Math.round(total / orderList.length)) : formatCurrency(0)}</span>
          </div>
        </div>

        <div class="footer">
          Near Bakery & Co. ERP — Laporan Penjualan<br>
          Dicetak dari Sistem POS Kasir
        </div>
        <script>window.print();</script>
      </body></html>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (doc) {
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 500);
    }
  };

  // ─── PRINT STRUK THERMAL ke Printer 58mm via API ───
  const handlePrintThermalBill = async (order: RetailOrder) => {
    let items: { nama: string; qty: number; satuan: string; harga: number }[];

    if (order.itemsList && order.itemsList.length > 0) {
      items = [];
      order.itemsList.forEach(oi => {
        const label = `${oi.nama}${oi.variantLabel ? ' (' + oi.variantLabel + ')' : ''}`;
        items.push({
          nama: label,
          qty: oi.qty,
          satuan: oi.satuan || 'pcs',
          harga: oi.harga * oi.qty,
        });
        if (oi.addOns && oi.addOns.length > 0) {
          oi.addOns.forEach(a => {
            items.push({ nama: `+ ${a.nama}`, qty: 1, satuan: 'pcs', harga: a.harga });
          });
        }
      });
    } else {
      const itemMatch = order.items.match(/(\d+)\s+(\w+)\s+(.+)/);
      const totalAddOns = order.addOns?.reduce((sum, a) => sum + a.harga, 0) || 0;
      const itemHarga = order.totalSum - totalAddOns;

      items = itemMatch
        ? [{
            nama: itemMatch[3],
            qty: parseInt(itemMatch[1]),
            satuan: itemMatch[2],
            harga: itemHarga,
          }]
        : [{ nama: order.items, qty: 1, satuan: 'pcs', harga: itemHarga }];

      if (order.addOns && order.addOns.length > 0) {
        order.addOns.forEach(a => {
          items.push({ nama: `+ ${a.nama}`, qty: 1, satuan: 'pcs', harga: a.harga });
        });
      }
    }

    const transaksi = {
      no_transaksi: order.ordId,
      kasir: 'POS',
      pelanggan: order.customerName,
      waktu: `${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      total_harga: order.totalSum,
      metode_bayar: order.source === 'Walk-In' ? 'Tunai' : order.source,
    };

    // Coba cetak via API thermal printer
    const result = await cetakStrukThermal(transaksi, items);

    if (!result.success) {
      console.warn('Thermal printer unavailable, using browser print fallback:', result.message);
      showToast(`⚠️ Printer thermal: ${result.message} — Fallback ke print browser.`, 'warning');

      // ─── FALLBACK: browser print (window.print via hidden iframe) ───
      const html = generateHtmlStruk(transaksi, items);
      
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (doc) {
        doc.write(html);
        doc.close();
        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        }, 500);
      }
    } else {
      showToast('✅ Struk berhasil dicetak!', 'success');
    }
  };

  // Toggle add-on
  const toggleAddOn = (item: { nama: string; harga: number }) => {
    setOrderAddOns(prev => {
      const exists = prev.find(a => a.nama === item.nama);
      if (exists) return prev.filter(a => a.nama !== item.nama);
      return [...prev, item];
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER with End Day/Shift buttons */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            POS Kasir Walk-in
          </h2>
          <p className="text-xs text-gray-500 mt-1">Checkout penjualan langsung di toko. Stok bahan baku otomatis terpotong.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Today's summary */}
          <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs text-right">
            <span className="text-[9px] text-gray-500 block uppercase font-bold">Hari Ini</span>
            <span className="font-bold font-mono text-emerald-800">{formatCurrency(todayRevenue)}</span>
            <span className="text-gray-400 ml-1">({todayOrders.length} tx)</span>
          </div>

          <button onClick={() => { setShowLaporan(true); }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5" /> Laporan
          </button>
          <button onClick={() => { setShowRekap(true); }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Rekap
          </button>
          {/* ─── PRINTER CONNECTION ─── */}
          {isWebSerialSupported() && (
            <>
              {printerConnected ? (
                <button onClick={async () => { await disconnectPrinter(); setPrinterConnected(false); showToast('Printer Bluetooth diputuskan.', 'info'); }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-red-600 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                  title="Putuskan koneksi printer">
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Printer ON</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse ml-0.5" />
                </button>
              ) : (
                <button onClick={async () => {
                  const result = await connectPrinter();
                  setPrinterConnected(isPrinterConnected());
                  showToast(result.message, result.success ? 'success' : 'error');
                }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-emerald-700 text-slate-300 hover:text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                  title="Hubungkan printer Bluetooth thermal">
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hubungkan Printer</span>
                </button>
              )}
            </>
          )}

          <button onClick={handleEndShift}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> End Shift
          </button>
          <button onClick={handleEndDay}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> End Day
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: FORM CHECKOUT KOMPAK */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
            <ShoppingCart className="w-4 h-4 text-emerald-600" /> Checkout
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Customer</label>
                <input type="text" placeholder="Nama pembeli" value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Sumber</label>
                <select value={orderSource} onChange={(e) => setOrderSource(e.target.value as RetailOrder['source'])}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-white">
                  <option value="Walk-In POS">Walk-In</option>
                  <option value="WhatsApp Order">WhatsApp</option>
                  <option value="Web Toko">Web Toko</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Catatan</label>
                <input type="text" placeholder="Req pelanggan..." value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <button type="button" onClick={() => setShowAddOnPicker(!showAddOnPicker)}
                className={`mt-5 px-3 py-2.5 rounded-xl text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  orderAddOns.length > 0 ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}>
                🧀 Topping {orderAddOns.length > 0 && `(${orderAddOns.length})`}
              </button>
            </div>

            {/* ADD-ON PICKER */}
            {showAddOnPicker && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-amber-800 mb-1">Pilih Topping / Add-on</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableAddOns.map(item => {
                    const selected = orderAddOns.some(a => a.nama === item.nama);
                    return (
                      <button key={item.nama} type="button" onClick={() => toggleAddOn(item)}
                        className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer flex justify-between items-center ${
                          selected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-100'
                        }`}>
                        <span>{item.nama}</span>
                        <span className="font-mono text-[9px]">+{formatCurrency(item.harga)}</span>
                      </button>
                    );
                  })}
                </div>
                {orderAddOns.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-amber-200 flex justify-between text-xs font-bold text-amber-900">
                    <span>Subtotal Add-on:</span>
                    <span className="font-mono">+{formatCurrency(orderAddOns.reduce((s, a) => s + a.harga, 0))}</span>
                  </div>
                )}
              </div>
            )}

            {/* SELECTED PRODUCT — compact card */}
            {selectedProduct ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Produk</span>
                    <span className="font-bold text-gray-900 text-sm">{selectedProduct}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-800 font-mono text-sm">
                      {selectedVariant 
                        ? formatCurrency(selectedVariant.hargaJual)
                        : formatCurrency(calculatedProducts.find(p => p.namaProduk === selectedProduct)?.hargaJualPerPorsi || 0)}
                    </span>
                  </div>
                </div>
                {/* ─── VARIAN PICKER ─── */}
                {(() => {
                  const cp = calculatedProducts.find(p => p.namaProduk === selectedProduct);
                  if (cp?.variants && cp.variants.length > 0) {
                    const activeVariants = cp.variants.filter(v => v.hargaJual > 0);
                    if (activeVariants.length > 0) {
                      return (
                        <div className="mt-2 pt-2 border-t border-emerald-200">
                          <span className="text-[9px] text-gray-500 block uppercase font-bold mb-1.5">Pilih Varian</span>
                          <div className="flex flex-wrap gap-1.5">
                            {activeVariants.map(v => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => setSelectedVariant({ id: v.id, name: v.name, hargaJual: v.hargaJual })}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                  selectedVariant?.id === v.id
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                                }`}
                              >
                                {v.name}
                                <span className="ml-1 font-mono">{formatCurrency(v.hargaJual)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-400">
                👆 Pilih produk dari katalog di sebelah kanan
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="w-1/3">
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Qty</label>
                <input type="number" min="1" required value={orderQty}
                  onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-200 rounded-xl p-2 font-mono font-bold text-center" />
              </div>
              <div className="flex-1 text-right bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Total</span>
                <span className="text-base font-black text-emerald-800 font-mono">
                  {selectedProduct ? formatCurrency(((() => {
                    const variantPrice = selectedVariant?.hargaJual || 0;
                    const basePrice = calculatedProducts.find(p => p.namaProduk === selectedProduct)?.hargaJualPerPorsi || 0;
                    return (variantPrice > 0 ? variantPrice : basePrice) * orderQty;
                  })()) + orderAddOns.reduce((s, a) => s + a.harga, 0)) : formatCurrency(0)}
                </span>
                {selectedVariant && (
                  <span className="text-[8px] text-purple-600 block font-normal">📐 {selectedVariant.name}</span>
                )}
                {orderAddOns.length > 0 && (
                  <span className="text-[8px] text-amber-600 block font-normal">(+{formatCurrency(orderAddOns.reduce((s, a) => s + a.harga, 0))} add-on)</span>
                )}
              </div>
            </div>

            <button onClick={handleAddToCart} disabled={!selectedProduct}
              className={`w-full font-bold text-xs py-3 rounded-xl transition cursor-pointer shadow-sm active:scale-[0.98] uppercase tracking-wide ${
                selectedProduct ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              <ShoppingCart className="w-4 h-4 inline mr-1" /> Tambah ke Pesanan
            </button>
          </div>

        {/* ─── KERANJANG ─── */}
        {cartItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Keranjang ({cartItems.length})</h4>
              <span className="text-xs font-bold text-amber-900">{formatCurrency(cartTotal.grandTotal)}</span>
            </div>
            <div className="max-h-[180px] overflow-y-auto space-y-1">
              {cartItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 text-[11px]">
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-800">{item.qty}x {item.nama}</span>
                    {item.variantLabel && <span className="text-purple-600 ml-1">({item.variantLabel})</span>}
                    {item.addOns && item.addOns.length > 0 && (
                      <span className="text-amber-600 block text-[10px]">
                        + {item.addOns.map(a => a.nama).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-gray-700">{formatCurrency(item.harga * item.qty)}</span>
                    <button onClick={() => handleRemoveCartItem(i)}
                      className="text-red-400 hover:text-red-600 transition cursor-pointer p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleCheckout}
              className="w-full font-bold text-xs py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer active:scale-[0.98] uppercase tracking-wide shadow-sm">
              <Coins className="w-4 h-4 inline mr-1" /> Bayar — {formatCurrency(cartTotal.grandTotal)}
            </button>
          </div>
        )}

        </div>

        {/* KANAN: KATALOG PRODUK + ANTREAN */}
        <div className="lg:col-span-8 space-y-4">
          {/* KATALOG PRODUK — gambar besar */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2.5 mb-3">
              <Image className="w-4 h-4 text-emerald-600" /> Pilih Produk
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto">
              {calculatedProducts.map(p => {
                const img = getSavedRecipeImage(p.namaProduk);
                const isSelected = selectedProduct === p.namaProduk;
                return (
                  <button key={p.namaProduk} type="button"
                    onClick={() => { handleSelectProduct(p.namaProduk); }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                        : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md'
                    }`}>
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <img src={img} alt={p.namaProduk}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f2f0eb"/><text x="100" y="105" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#006241" font-weight="600">Near Bakery</text></svg>'); }} />
                    </div>
                    <div className="w-full min-w-0">
                      <span className="block text-[11px] font-bold text-gray-900 truncate">{p.namaProduk}</span>
                      <span className="block text-[11px] font-mono font-bold text-emerald-700">{formatCurrency(p.hargaJualPerPorsi)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {calculatedProducts.length === 0 && (
              <p className="text-xs text-amber-600 font-medium text-center py-8">Belum ada produk aktif. Tambah produk di tab Formulasi Resep.</p>
            )}
          </div>

          {/* ANTREAN DAPUR */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-emerald-600" /> Antrean Dapur
              </h3>
              <span className="font-mono text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded text-[10px] font-bold">
                {todayOrders.length} order hari ini
              </span>
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {todayOrders.map((o) => (
                <div key={o.ordId} className="p-4 bg-gray-50 border border-gray-150 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-gray-400">#{o.ordId}</span>
                      {o.catatan && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">📝 {o.catatan}</span>}
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded font-mono ${
                        o.source === 'Walk-In' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>{o.source}</span>
                      <span className="text-[10px] text-gray-400">{o.timeAgo}</span>
                    </div>
                    <p className="font-bold text-gray-900">{o.customerName}</p>
                    <p className="text-[11px] text-gray-500">{o.items}</p>
                    {o.addOns && o.addOns.length > 0 && (
                      <p className="text-[9px] text-amber-700">
                        🧀 {o.addOns.map(a => `${a.nama}+${formatCurrency(a.harga)}`).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 border-t md:border-0 pt-2 md:pt-0 w-full md:w-auto justify-between">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Total</span>
                      <span className="font-black text-gray-900 font-mono text-xs">{formatCurrency(o.totalSum)}</span>
                    </div>
                    <select value={o.status}
                      onChange={(e) => handleUpdateOrderStatus(o.ordId, e.target.value as RetailOrder['status'])}
                      className="border border-gray-200 bg-white p-1.5 rounded-lg text-xs font-semibold cursor-pointer">
                      <option value="Queued">Antre</option>
                      <option value="Baking">Panggang</option>
                      <option value="Completed">Selesai</option>
                      <option value="Refunded">Refund</option>
                    </select>
                    <div className="flex gap-1">
                      <button onClick={() => setActiveReceipt(o)}
                        className="bg-slate-900 text-white font-bold text-[10px] uppercase px-2 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer">
                        <Printer className="w-3 h-3" />
                      </button>
                      <button onClick={() => handlePrintThermalBill(o)}
                        className="bg-emerald-700 text-white font-bold text-[10px] uppercase px-2 py-1.5 rounded-lg hover:bg-emerald-800 transition cursor-pointer" title="Cetak Bill Thermal">
                        Bill
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {todayOrders.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">Belum ada transaksi POS hari ini.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL LAPORAN PENJUALAN */}
      {showLaporan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" /> Laporan Penjualan
              </h3>
              <button onClick={() => setShowLaporan(false)} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Revenue Hari Ini</span>
                  <span className="text-lg font-black text-emerald-800 font-mono">{formatCurrency(todayRevenue)}</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Transaksi</span>
                  <span className="text-lg font-black text-blue-800 font-mono">{todayOrders.length}</span>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">AOV</span>
                  <span className="text-lg font-black text-amber-800 font-mono">{todayOrders.length > 0 ? formatCurrency(Math.round(todayRevenue / todayOrders.length)) : formatCurrency(0)}</span>
                </div>
              </div>

              {/* Per produk summary */}
              {(() => {
                const prodSummary: Record<string, { qty: number; revenue: number }> = {};
                todayOrders.forEach(o => {
                  const match = o.items.match(/(\d+) pcs (.+)/);
                  if (match) {
                    const prod = match[2];
                    if (!prodSummary[prod]) prodSummary[prod] = { qty: 0, revenue: 0 };
                    prodSummary[prod].qty += parseInt(match[1]);
                    prodSummary[prod].revenue += o.totalSum;
                  }
                });
                return Object.keys(prodSummary).length > 0 ? (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Rekap per Produk</h4>
                    <div className="space-y-2">
                      {Object.entries(prodSummary).map(([prod, data]) => (
                        <div key={prod} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg text-xs">
                          <span className="font-semibold text-gray-900">{prod}</span>
                          <div className="flex gap-4 text-right">
                            <span className="text-gray-500">{data.qty} pcs</span>
                            <span className="font-mono font-bold text-emerald-700">{formatCurrency(data.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Per source */}
              {(() => {
                const srcSummary: Record<string, number> = {};
                todayOrders.forEach(o => {
                  if (!srcSummary[o.source]) srcSummary[o.source] = 0;
                  srcSummary[o.source] += o.totalSum;
                });
                return Object.keys(srcSummary).length > 0 ? (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Per Sumber Transaksi</h4>
                    <div className="space-y-2">
                      {Object.entries(srcSummary).map(([src, amt]) => (
                        <div key={src} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg text-xs">
                          <span className="font-semibold text-gray-700">{src}</span>
                          <span className="font-mono font-bold text-gray-900">{formatCurrency(amt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Shift Logs */}
              {shiftLogs.filter(l => l.date === today).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Riwayat Shift Hari Ini</h4>
                  <div className="space-y-2">
                    {shiftLogs.filter(l => l.date === today).map(log => (
                      <div key={log.id} className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs flex justify-between">
                        <div>
                          <span className="font-bold text-gray-700">{log.type === 'end_shift' ? '🔄 End Shift' : '📅 End Day'}</span>
                          <span className="text-gray-400 ml-2">{log.time}</span>
                          {log.cashierName && <span className="text-gray-400 ml-2">Kasir: {log.cashierName}</span>}
                        </div>
                        <span className="font-mono font-bold text-gray-900">{formatCurrency(log.totalRevenue)} ({log.totalOrders} tx)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-gray-100">
                <button onClick={() => setShowLaporan(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition cursor-pointer">
                  Tutup
                </button>
                <button onClick={() => handlePrintLaporan(todayOrders, today)}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5" /> Cetak Laporan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REKAP */}
      {showRekap && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> Rekap Penjualan
              </h3>
              <button onClick={() => setShowRekap(false)} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Summary chart bars */}
              {(() => {
                const prodSummary: Record<string, number> = {};
                todayOrders.forEach(o => {
                  const match = o.items.match(/(\d+) pcs (.+)/);
                  if (match) {
                    const prod = match[2];
                    if (!prodSummary[prod]) prodSummary[prod] = 0;
                    prodSummary[prod] += o.totalSum;
                  }
                });
                const maxRev = Math.max(...Object.values(prodSummary), 1);
                return Object.entries(prodSummary).length > 0 ? (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-3">Grafik Penjualan per Produk</h4>
                    <div className="space-y-2">
                      {Object.entries(prodSummary).sort(([, a], [, b]) => b - a).map(([prod, rev]) => (
                        <div key={prod}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-semibold text-gray-700">{prod}</span>
                            <span className="font-mono font-bold text-gray-900">{formatCurrency(rev)}</span>
                          </div>
                          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(rev / maxRev) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4">Belum ada data penjualan hari ini.</p>
                );
              })()}

              {/* All time stats */}
              <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                <span className="font-bold text-gray-700 block">Statistik Semua Waktu</span>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">Total Transaksi:</span> <span className="font-bold font-mono">{orders.length}</span></div>
                  <div><span className="text-gray-500">Total Revenue:</span> <span className="font-bold font-mono">{formatCurrency(orders.reduce((s, o) => s + o.totalSum, 0))}</span></div>
                  <div><span className="text-gray-500">Completed:</span> <span className="font-bold font-mono text-emerald-700">{orders.filter(o => o.status === 'Completed').length}</span></div>
                  <div><span className="text-gray-500">Refund:</span> <span className="font-bold font-mono text-red-600">{orders.filter(o => o.status === 'Refunded').length}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL STRUK */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-400" /> Struk Kasir
              </span>
              <button onClick={() => setActiveReceipt(null)}
                className="p-1 hover:bg-slate-800 text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-amber-50/15 font-mono text-xs text-gray-800 space-y-4 leading-relaxed">
              <div className="text-center space-y-1">
                <h3 className="text-xs font-black uppercase text-gray-950 font-sans tracking-wide">NEAR BAKERY & CO.</h3>
                <p className="text-[9px] text-gray-500">Dapur Pusat Sektor 12, DKI Jakarta</p>
              </div>
              <div className="space-y-1 text-[10px] text-gray-600">
                <p className="flex justify-between">No Trans: <span className="font-bold text-gray-900">{activeReceipt.ordId}</span></p>
                <p className="flex justify-between">Customer: <span className="font-bold text-gray-900">{activeReceipt.customerName}</span></p>
                <p className="flex justify-between">Waktu: <span className="font-bold">{new Date().toLocaleString('id-ID')}</span></p>
              </div>
              <div className="border-b border-dashed border-gray-300"></div>
              <div className="space-y-1.5 font-bold">
                <div className="flex justify-between text-[11px] text-slate-900">
                  <span>{activeReceipt.items}</span>
                  <span className="font-mono">{formatCurrency(activeReceipt.totalSum)}</span>
                </div>
                {activeReceipt.addOns && activeReceipt.addOns.map(a => (
                  <div key={a.nama} className="flex justify-between text-[10px] text-amber-700">
                    <span className="ml-2">+ {a.nama}</span>
                    <span className="font-mono">{formatCurrency(a.harga)}</span>
                  </div>
                ))}
                {activeReceipt.catatan && (
                  <p className="text-[9px] text-gray-500 italic mt-1">📝 {activeReceipt.catatan}</p>
                )}
              </div>
              <div className="border-b border-dashed border-gray-300"></div>
              <p className="flex justify-between font-bold text-xs border-t border-dotted border-gray-200 pt-1.5 uppercase">
                TOTAL: <span className="text-emerald-800">{formatCurrency(activeReceipt.totalSum)}</span>
              </p>
              <div className="text-center pt-3 text-[8px] text-gray-400">
                Terima kasih atas kunjungan Anda!
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button onClick={() => setActiveReceipt(null)}
                className="flex-1 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition cursor-pointer">
                Tutup
              </button>
              <button onClick={() => handlePrintThermalBill(activeReceipt)}
                className="flex-1 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer shadow-sm">
                <Printer className="w-4 h-4 inline mr-1" /> Cetak Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
