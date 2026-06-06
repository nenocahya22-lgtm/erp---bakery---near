/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowLeft, MapPin, CreditCard, ShieldCheck, CheckCircle2, Copy } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { formatRupiah } from '../utils';
import { ShippingAddress, OrderItem, StatusHistoryItem, OrderStatus } from '../types';

export const Checkout: React.FC = () => {
  const { cart, clearCart, setView, currentUser, triggerToast } = useStore();

  const [address, setAddress] = useState<ShippingAddress>({
    name: currentUser?.displayName || '',
    phone: '',
    address: '',
    city: '',
    postalCode: ''
  });

  const [paymentMethod, setPaymentMethod] = useState<string>('Transfer Bank (BCA)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);
  const [placedOrderId, setPlacedOrderId] = useState<string>('');

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      triggerToast('Gagal Proses', 'Silakan masuk akun terlebih dahulu untuk memproses pesanan.');
      return;
    }
    if (!address.name.trim() || !address.phone.trim() || !address.address.trim() || !address.city.trim()) {
      triggerToast('Data Alamat', 'Mohon lengkapi seluruh rincian informasi pengiriman Anda.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Generate unique Order ID
      const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const orderRef = doc(db, 'orders', orderId);

      // Map cart items to Order Items format
      const orderItems: OrderItem[] = cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.imageUrl
      }));

      // History log setup
      const initialHistory: StatusHistoryItem[] = [
        {
          status: 'Menunggu Pembayaran',
          updatedAt: new Date(),
          note: 'Pesanan berhasil dibuat. Mengetahui instruksi pelunasan pembayaran.'
        }
      ];

      // 2. Execute a transaction to record order and immediately deduct product stocks
      await runTransaction(db, async (transaction) => {
        // Stock checker loop
        for (const item of cart) {
          const productRef = doc(db, 'products', item.product.id);
          const prodDoc = await transaction.get(productRef);
          
          if (!prodDoc.exists()) {
            throw new Error(`Produk "${item.product.name}" tidak ditemukan.`);
          }
          
          const currentStock = prodDoc.data().stock || 0;
          if (currentStock < item.quantity) {
            throw new Error(`Maaf, produk "${item.product.name}" kehabisan stok. Tersisa hanya ${currentStock} pcs.`);
          }

          // Deduct stock atomic
          transaction.update(productRef, {
            stock: currentStock - item.quantity
          });
        }

        // Write the Order database
        transaction.set(orderRef, {
          id: orderId,
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Pembeli Giras',
          userEmail: currentUser.email || 'buyer@example.com',
          items: orderItems,
          totalAmount: subtotal,
          status: 'Menunggu Pembayaran' as OrderStatus,
          shippingAddress: address,
          paymentMethod: paymentMethod,
          paymentStatus: 'Belum Bayar',
          trackingNumber: '',
          statusHistory: initialHistory,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Write user notification in-app database
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          id: notifRef.id,
          userId: currentUser.uid,
          title: 'Pesanan Dibuat',
          body: `Pesanan ${orderId} Anda telah diajukan ke dapur. Silakan pelajari sistem pembayaran terpilih.`,
          read: false,
          orderId: orderId,
          createdAt: serverTimestamp()
        });
      });

      // Clear general cart items state
      clearCart();
      setPlacedOrderId(orderId);
      setOrderSuccess(true);
      triggerToast('Pesanan Dikirim', `Pesanan ${orderId} Anda siap diproses ragi harian!`);

    } catch (err: any) {
      console.error(err);
      triggerToast('Kelebihan Kapasitas', err.message || 'Gagal mengirim order harian Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast('Disalin', 'Nomor rekening bank berhasil disalin ke papan klip.');
  };

  if (orderSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center font-sans animate-fade-in">
        <div className="bg-white border border-stone-200/50 rounded-none p-8 md:p-12">
          <div className="mx-auto w-12 h-12 bg-stone-50 border border-stone-200/65 flex items-center justify-center text-stone-900 mb-6">
            <CheckCircle2 size={24} />
          </div>

          <h2 className="text-sm uppercase tracking-widest font-sans font-bold text-stone-900 mb-2">Pemesanan Diajukan</h2>
          <p className="text-xs text-stone-550 mb-6">Kode Pesanan Resmi: <strong>{placedOrderId}</strong></p>

          {paymentMethod.includes('BCA') && (
            <div className="bg-stone-50/50 border border-stone-200/50 p-6 mb-8 text-left rounded-none">
              <h4 className="text-[9px] uppercase tracking-[0.15em] font-bold text-stone-405 mb-3 border-b border-stone-200/30 pb-2">Instruksi Transfer Manual</h4>
              <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                Silakan melakukan transfer senilai <strong className="text-stone-900">{formatRupiah(subtotal)}</strong> tepat untuk mempercepat verifikasi otomatis dapur Near Bakery & Co:
              </p>
              
              <div className="space-y-3.5 text-xs text-stone-605">
                <div className="flex justify-between items-center bg-white p-3 border border-stone-205/30">
                  <div>
                    <span className="text-[9px] text-stone-400 block uppercase font-mono leading-none mb-1">Bank Pengirim</span>
                    <strong className="text-stone-850">Bank BCA (Kantor Cabang Utama)</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-white p-3 border border-stone-205/30">
                  <div>
                    <span className="text-[9px] text-stone-400 block uppercase font-mono leading-none mb-1">No. Rekening BCA</span>
                    <strong className="text-stone-900 tracking-wider">7735 9182 301</strong>
                  </div>
                  <button 
                    onClick={() => copyToClipboard('77359182301')}
                    className="p-1 px-3 bg-stone-905 text-stone-900 hover:text-black hover:bg-stone-100 border border-stone-200 rounded-none text-[10px] leading-tight font-sans tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={11} />
                    <span>Salin</span>
                  </button>
                </div>

                <div className="flex justify-between items-center bg-white p-3 border border-stone-205/30">
                  <div>
                    <span className="text-[9px] text-stone-400 block uppercase font-mono leading-none mb-1">Penerima Manfaat</span>
                    <strong className="text-stone-900">Near Bakery & Co. PT</strong>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center text-[10px] text-stone-400 italic">
                Setelah transfer sukses, silakan gunakan menu utama "Order Tracker" untuk mengunggah bukti/aktivitas.
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setView('orders')}
              className="flex-1 bg-stone-900 hover:bg-black text-white py-3.5 px-4 font-sans font-medium text-xs tracking-wider uppercase transition-colors rounded-none cursor-pointer"
            >
              Lacak Pesanan Roti
            </button>
            <button
              onClick={() => setView('home')}
              className="flex-1 border border-stone-200 hover:bg-stone-50 text-stone-700 py-3.5 px-4 font-sans font-medium text-xs tracking-wider uppercase transition-colors rounded-none cursor-pointer"
            >
              Belanja Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-20 font-sans">
      <div className="mb-6">
        <button 
          onClick={() => setView('cart')} 
          className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-[0.15em] focus:outline-hidden cursor-pointer"
        >
          <ArrowLeft size={12} />
          <span>Kembali Ke Keranjang</span>
        </button>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Address Details and Payment Setup options */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-stone-200/50 rounded-none p-5 md:p-8">
            <h3 className="text-xs uppercase tracking-[0.15em] font-sans font-bold text-stone-900 mb-5 flex items-center gap-2 border-b border-stone-100 pb-3">
              <MapPin size={15} className="text-stone-700" />
              <span>Alamat Pengantaran</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] tracking-wider uppercase font-bold text-stone-400 block mb-1">Nama Penerima Paket</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Nama lengkap..."
                  value={address.name}
                  onChange={handleInputChange}
                  className="w-full text-xs p-3 border border-stone-200 rounded-none bg-stone-50/50 focus:bg-white focus:outline-hidden text-stone-800 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] tracking-wider uppercase font-bold text-stone-400 block mb-1">No. WhatsApp Aktif</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="Contoh: 081234567890..."
                    value={address.phone}
                    onChange={handleInputChange}
                    className="w-full text-xs p-3 border border-stone-200 rounded-none bg-stone-50/50 focus:bg-white focus:outline-hidden text-stone-800 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] tracking-wider uppercase font-bold text-stone-400 block mb-1">Alamat Lengkap Ruko/Lantai</label>
                <textarea
                  name="address"
                  required
                  rows={3}
                  value={address.address}
                  onChange={handleInputChange}
                  placeholder="Nama jalan, nomor ruko/rumah, RT/RW, kelurahan & kecamatan..."
                  className="w-full text-xs p-3 border border-stone-200 rounded-none bg-stone-50/50 focus:bg-white focus:outline-hidden text-stone-800 leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] tracking-wider uppercase font-bold text-stone-400 block mb-1">Kota / Kabupaten</label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={address.city}
                    onChange={handleInputChange}
                    placeholder="Contoh: Surabaya, Jakarta..."
                    className="w-full text-xs p-3 border border-stone-200 rounded-none bg-stone-50/50 focus:bg-white focus:outline-hidden text-stone-800 font-sans"
                  />
                </div>
                <div>
                  <label className="text-[9px] tracking-wider uppercase font-bold text-stone-400 block mb-1">Kode Pos</label>
                  <input
                    type="text"
                    name="postalCode"
                    placeholder="Contoh: 12345..."
                    value={address.postalCode}
                    onChange={handleInputChange}
                    className="w-full text-xs p-3 border border-stone-200 rounded-none bg-stone-50/50 focus:bg-white focus:outline-hidden text-stone-800 font-sans"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method section */}
          <div className="bg-white border border-stone-200/50 rounded-none p-5 md:p-8 font-sans">
            <h3 className="text-xs uppercase tracking-[0.15em] font-sans font-bold text-stone-900 mb-5 flex items-center gap-2 border-b border-stone-100 pb-3">
              <CreditCard size={15} className="text-stone-700" />
              <span>Metode Pembayaran Aman</span>
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {[
                { name: 'Transfer Bank (BCA)', label: 'Transfer Bank BCA (Verifikasi Otomatis Admin)' },
                { name: 'COD (Cash On Delivery)', label: 'COD - Pembayaran Cash saat Roti Diantarkan Kurir' },
                { name: 'E-Wallet (Gopay/OVO)', label: 'Dompet Digital Gopay, OVO, atau ShopeePay' }
              ].map((pm) => (
                <label 
                  key={pm.name}
                  className={`border p-3.5 flex items-center gap-3 cursor-pointer transition-colors rounded-none ${
                    paymentMethod === pm.name 
                      ? 'border-stone-900 bg-stone-50/55 text-stone-900 font-bold' 
                      : 'border-stone-100 hover:bg-stone-50 text-stone-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={pm.name}
                    checked={paymentMethod === pm.name}
                    onChange={() => setPaymentMethod(pm.name)}
                    className="accent-stone-900 h-4 w-4"
                  />
                  <div className="flex flex-col text-xs font-sans">
                    <span>{pm.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: summary card */}
        <div className="lg:col-span-5 bg-white border border-stone-200/50 rounded-none p-6 sticky top-24">
          <h3 className="text-xs uppercase tracking-[0.15em] font-sans font-bold text-stone-900 mb-4 border-b border-stone-100 pb-2.5">Sajian Diproses</h3>

          {/* Purchase items overview list */}
          <div className="max-h-56 overflow-y-auto mb-4 border-b border-stone-150 space-y-3.5 pb-4 pr-1 font-sans">
            {cart.map((item) => (
              <div key={item.product.id} className="flex gap-3 justify-between items-center text-xs text-stone-600">
                <div className="flex gap-2.5 items-center truncate">
                  <div className="w-9 h-9 border border-stone-100 rounded-none bg-stone-50 overflow-hidden shrink-0">
                    <img src={item.product.imageUrl} alt={item.product.name} referrerPolicy="no-referrer" className="w-full h-full object-cover"/>
                  </div>
                  <span className="truncate max-w-[150px] font-medium text-stone-800">{item.product.name}</span>
                </div>
                <div className="shrink-0 flex gap-4 text-right">
                  <span className="text-stone-400 font-mono">x{item.quantity}</span>
                  <span className="font-serif font-bold text-stone-700">{formatRupiah(item.product.price * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 text-xs pb-4 border-b border-stone-150 font-sans">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal Sajian</span>
              <span className="font-bold text-stone-805">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>Biaya Penghantaran</span>
              <span className="text-[#A68A77] font-semibold uppercase text-[9px] tracking-wider">Rp 0 (Bebas Ongkir)</span>
            </div>
          </div>

          <div className="flex justify-between items-center py-4 text-sm font-bold text-stone-950 font-serif">
            <span>Total Pembayaran</span>
            <span className="text-stone-900 text-lg font-bold font-serif">{formatRupiah(subtotal)}</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-stone-900 hover:bg-black text-white font-sans font-medium py-3.5 px-4 rounded-none text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-2 border-t-transparent"></div>
                <span>Menghubungi Dapur Penjamin...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={13} />
                <span>Kirim Permintaan & Bayar</span>
              </>
            )}
          </button>

          <p className="text-[9px] text-stone-400 text-center leading-relaxed mt-4 px-3 font-sans">
            Kemurnian ragi hangat & kualitas roti Near Bakery & Co dijamin penuh. Pesanan Anda diproses seketika setelah pembayaran diajukan.
          </p>
        </div>
      </form>
    </div>
  );
};
