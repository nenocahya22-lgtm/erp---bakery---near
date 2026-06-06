/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, serverTimestamp, setDoc } from 'firebase/firestore';
import { formatRupiah, getStatusBadgeStyle } from '../utils';
import { Order, OrderStatus } from '../types';
import { Package, Truck, CheckCircle, Clock, ShoppingBag, MapPin, Eye, Star } from 'lucide-react';

export const OrderTracking: React.FC = () => {
  const { currentUser, setView, setSelectedProductId, triggerToast } = useStore();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Dynamic real-time sync with buyer's orders
  useEffect(() => {
    if (!currentUser) return;

    setIsLoading(true);
    const pathForOrders = 'orders';
    const ordersQuery = query(
      collection(db, pathForOrders),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          items: data.items,
          totalAmount: data.totalAmount,
          status: data.status,
          shippingAddress: data.shippingAddress,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentStatus,
          trackingNumber: data.trackingNumber,
          statusHistory: data.statusHistory || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      setOrders(list);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathForOrders);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Complete Order / Confirm Arrival
  const handleCompleteOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const noteStr = 'Pesanan hangat telah diterima dengan sukacita oleh Pembeli. Transaksi dinyatakan selesai.';
      
      await updateDoc(orderRef, {
        status: 'Selesai' as OrderStatus,
        paymentStatus: 'Lunas', // automatically mark COD as paid when completed
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({
          status: 'Selesai' as OrderStatus,
          updatedAt: new Date(),
          note: noteStr
        })
      });

      // Dispatch notification
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        userId: currentUser.uid,
        title: 'Sajian Tiba 🎉',
        body: `Kabar gembira! Sajian hangat Anda dari ID #${orderId} telah berhasil tiba & dinyatakan Selesai. Nikmati kelezatannya!`,
        read: false,
        orderId: orderId,
        createdAt: serverTimestamp()
      });

      triggerToast('Sajian Tiba', 'Terima kasih atas konfirmasi kedatangan sajian hangat kami!');
    } catch (e) {
      console.error(e);
      triggerToast('Gagal Proses', 'Terjadi kesalahan sistem saat memproses konfirmasi.');
    }
  };

  const getTimelineStatusIcon = (status: OrderStatus, activeStatus: OrderStatus) => {
    const statuses: OrderStatus[] = ['Menunggu Pembayaran', 'Diproses', 'Dikirim', 'Selesai'];
    const activeIndex = statuses.indexOf(activeStatus);
    const thisIndex = statuses.indexOf(status);

    let bgStyle = 'bg-stone-50 text-stone-300 border-stone-200';
    if (thisIndex <= activeIndex && activeStatus !== 'Dibatalkan') {
      bgStyle = 'bg-stone-900 text-stone-105 border-stone-900';
    }

    switch (status) {
      case 'Menunggu Pembayaran':
        return <div className={`h-8 w-8 rounded-none flex items-center justify-center border text-xs font-bold leading-none ${bgStyle}`}><Clock size={12} /></div>;
      case 'Diproses':
        return <div className={`h-8 w-8 rounded-none flex items-center justify-center border text-xs font-bold leading-none ${bgStyle}`}><Package size={12} /></div>;
      case 'Dikirim':
        return <div className={`h-8 w-8 rounded-none flex items-center justify-center border text-xs font-bold leading-none ${bgStyle}`}><Truck size={12} /></div>;
      case 'Selesai':
        return <div className={`h-8 w-8 rounded-none flex items-center justify-center border text-xs font-bold leading-none ${bgStyle}`}><CheckCircle size={12} /></div>;
      default:
        return null;
    }
  };

  // Human friendly baking status helper
  const getBakeStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'Menunggu Pembayaran': return 'Menunggu Pembayaran';
      case 'Diproses': return 'Sedang Dipanggang';
      case 'Dikirim': return 'Sedang Dikirim';
      case 'Selesai': return 'Selesai';
      case 'Dibatalkan': return 'Dibatalkan';
      default: return status;
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center flex flex-col items-center justify-center bg-white border border-stone-200/50 rounded-none my-6 font-sans">
        <div className="p-4 bg-stone-50 border border-stone-100 text-stone-700 mb-3 rounded-none">
          <Truck size={24} />
        </div>
        <h3 className="text-sm font-sans font-bold uppercase tracking-wider text-stone-900 mb-1.5">Masuk Akun Pelacakan</h3>
        <p className="text-xs text-stone-500 mb-4 px-6 leading-relaxed">
          Silakan masuk akun Anda terlebih dulu untuk melakukan pelacakan pesanan secara instan dan real-time langsung dari oven kami.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 flex flex-col items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-stone-900 border-r-2 border-r-transparent"></div>
        <p className="text-xs font-medium text-stone-500 mt-4 leading-none">Sinkronisasi dapur oven dipantau real-time...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 pb-20 font-sans">
      <h2 className="text-sm uppercase tracking-wider font-sans font-bold text-stone-900 mb-8 flex items-center gap-2 border-b border-stone-100 pb-3">
        <Truck className="text-stone-750" size={16} />
        <span>Pelacakan Antaran Roti Hangat Anda</span>
      </h2>

      {orders.length === 0 ? (
        <div className="text-center bg-white border border-stone-200/50 rounded-none py-14 p-6 flex flex-col items-center justify-center">
          <ShoppingBag className="text-stone-300 mb-3" size={28} />
          <h3 className="text-xs uppercase tracking-wider font-sans font-bold text-stone-900">Belum Ada Transaksi Hidangan</h3>
          <p className="text-xs text-stone-400 mt-2 max-w-sm leading-relaxed">
            Anda belum pernah memesan produk apa pun saat ini. Layangkan pesanan Anda dan pantau kematangan roti di ruko kurir real-time!
          </p>
          <button
            onClick={() => setView('home')}
            className="mt-5 bg-stone-900 hover:bg-black text-white text-xs font-medium px-5 py-3 rounded-none uppercase tracking-wider cursor-pointer"
          >
            Belanja Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => {
            const isExpanded = activeOrderId === ord.id;
            return (
              <div 
                key={ord.id}
                className="bg-white border border-stone-200/50 rounded-none overflow-hidden hover:border-stone-300"
              >
                {/* Header Summary Tab */}
                <div 
                  className={`p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer transition-colors ${isExpanded ? 'bg-stone-50/50 border-b border-stone-100' : ''}`}
                  onClick={() => setActiveOrderId(isExpanded ? null : ord.id)}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-stone-900 tracking-wider">#{ord.id}</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {ord.createdAt ? new Date(ord.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'Baru saja'}
                      </span>
                      <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-none border leading-tight ${getStatusBadgeStyle(ord.status)}`}>
                        {getBakeStatusText(ord.status)}
                      </span>
                    </div>
                    {/* Compact preview items */}
                    <p className="text-xs text-stone-500 mt-1.5 truncate max-w-md">
                      Sajian: {ord.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-right">
                      <span className="text-[9px] text-stone-400 block font-bold tracking-wider uppercase leading-none">TOTAL TRANSAKSI</span>
                      <strong className="text-xs font-bold text-stone-900 leading-normal block mt-0.5">{formatRupiah(ord.totalAmount)}</strong>
                    </div>
                    <button className="text-stone-800 p-2 bg-stone-50 hover:bg-stone-100 border border-stone-200/50 rounded-none cursor-pointer">
                      <Eye size={12} />
                    </button>
                  </div>
                </div>

                {/* Tracking Expanded view */}
                {isExpanded && (
                  <div className="p-5 md:p-6 border-t border-stone-100 bg-stone-50/30 text-xs text-stone-600">
                    
                    {/* Real-time Visual Timeline */}
                    <div className="mb-8 max-w-xl mx-auto py-2">
                      <h4 className="font-sans font-bold text-[9px] uppercase text-stone-400 tracking-[0.15em] text-center mb-6">Status Dapur & Distribusi</h4>
                      
                      <div className="relative flex justify-between items-center px-4">
                        {/* Progressive colored connection line */}
                        <div className="absolute left-10 right-10 h-[1px] bg-stone-200 top-4 -z-10" />
                        
                        {/* Timeline Points */}
                        {['Menunggu Pembayaran', 'Diproses', 'Dikirim', 'Selesai'].map((stName) => (
                          <div key={stName} className="flex flex-col items-center gap-2">
                            {getTimelineStatusIcon(stName as OrderStatus, ord.status)}
                            <span className="text-[9px] font-bold text-stone-500 max-w-[70px] text-center leading-tight">
                              {stName === 'Menunggu Pembayaran' ? 'Pembayaran' : stName === 'Diproses' ? 'Dipanggang' : stName === 'Dikirim' ? 'Kurir Antar' : 'Selesai Saji'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-stone-150">
                      {/* Delivery address details and tracking */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-sans font-bold text-stone-800 flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-wider">
                            <MapPin size={11} className="text-stone-400" />
                            <span>Tujuan Pengantaran</span>
                          </h4>
                          <div className="bg-white border border-stone-200/50 rounded-none p-3.5 space-y-1">
                            <strong className="text-stone-900">{ord.shippingAddress.name}</strong>
                            <p className="text-stone-500 leading-relaxed text-xs">{ord.shippingAddress.address}</p>
                            <p className="text-stone-400 font-mono text-[10px]">{ord.shippingAddress.city}, {ord.shippingAddress.postalCode}</p>
                            <p className="text-[10px] text-stone-400 font-bold mt-1 tracking-wider">Telp/WA: {ord.shippingAddress.phone}</p>
                          </div>
                        </div>

                        {/* Courier Resi section */}
                        {ord.trackingNumber && (
                          <div className="bg-stone-50/50 border border-stone-200/50 rounded-none p-3.5 flex justify-between items-center">
                            <div>
                              <span className="text-[9px] text-stone-400 block uppercase font-bold tracking-wider">RESI HANTARAN DAPUR</span>
                              <strong className="text-stone-900 tracking-wider text-xs font-mono">{ord.trackingNumber}</strong>
                            </div>
                            <span className="text-[9px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-none uppercase tracking-wide">
                              Transit Kurir
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Items details summary and action */}
                      <div className="flex flex-col justify-between">
                        <div>
                          <h4 className="font-sans font-bold text-stone-800 mb-2 uppercase tracking-wide text-[10px]">Rincian Menu Roti</h4>
                          <div className="bg-white border border-stone-200/50 rounded-none p-3.5 space-y-2 max-h-40 overflow-y-auto">
                            {ord.items.map((i) => (
                              <div key={i.productId} className="flex justify-between items-center text-xs">
                                <span className="text-stone-550 truncate max-w-[140px] hover:text-stone-900 cursor-pointer" onClick={() => {
                                  setSelectedProductId(i.productId);
                                  setView('product-detail');
                                }}>
                                  {i.name} (x{i.quantity})
                                </span>
                                <span className="font-bold text-stone-800 shrink-0 font-mono">{formatRupiah(i.price * i.quantity)}</span>
                              </div>
                            ))}
                            <div className="border-t border-stone-100 pt-2 flex justify-between font-bold text-stone-905">
                              <span>Total Pembayaran</span>
                              <span className="text-stone-900">{formatRupiah(ord.totalAmount)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action confirm arrived receipt if Dikirim */}
                        {ord.status === 'Dikirim' && (
                          <button
                            onClick={() => handleCompleteOrder(ord.id)}
                            className="mt-4 w-full bg-stone-900 hover:bg-black text-white font-sans font-medium py-3 rounded-none text-[10px] uppercase tracking-wider transition-colors text-center cursor-pointer"
                          >
                            Konfirmasi Sajian Hangat Tiba
                          </button>
                        )}

                        {/* Completed review recommendation */}
                        {ord.status === 'Selesai' && (
                          <div className="mt-4 bg-stone-100/50 border border-stone-200/30 rounded-none p-3 text-center text-stone-700">
                            <span className="font-medium text-[9px] uppercase tracking-wider flex items-center justify-center gap-1">
                              <Star size={10} className="text-amber-500" fill="currentColor"/>
                              <span>Hidangan Dinikmati! Silakan ulas kelezatannya di rincian menu.</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
