/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  setDoc,
  doc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  arrayUnion,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { Product, Order, ChatRoom, ChatMessage, OrderStatus } from '../types';
import { PRESET_IMAGES, CATEGORIES, SAMPLE_PRODUCTS } from '../data/presets';
import { formatRupiah, getStatusBadgeStyle } from '../utils';
import { 
  Plus, Trash2, Edit2, ShieldAlert, ShoppingBag, 
  ClipboardList, MessageSquare, Send, CheckCircle, Truck, 
  Database, RefreshCcw, X, Star, BarChart3, Package
} from 'lucide-react';

export const SellerDashboard: React.FC = () => {
  const { currentUser, userRole, triggerToast } = useStore();

  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'chats' | 'stats' | 'reviews'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [adminReply, setAdminReply] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);

  // Reviews Feed states
  const [selectedProductIdForReviews, setSelectedProductIdForReviews] = useState<string>('');
  const [sellerReviews, setSellerReviews] = useState<any[]>([]);
  const [loadingSellerReviews, setLoadingSellerReviews] = useState(false);

  // New Product Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState(CATEGORIES[0]);
  const [newProdPrice, setNewProdPrice] = useState(150000);
  const [newProdStock, setNewProdStock] = useState(10);
  const [newProdDescription, setNewProdDescription] = useState('');
  const [newProdImgUrl, setNewProdImgUrl] = useState(PRESET_IMAGES[0].url);

  // Order updates states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [courierResi, setCourierResi] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Listen to Products
  useEffect(() => {
    if (!currentUser || userRole !== 'penjual') {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          price: data.price,
          stock: data.stock,
          imageUrl: data.imageUrl,
          category: data.category,
          rating: data.rating,
          reviewCount: data.reviewCount,
          createdAt: data.createdAt
        });
      });
      setProducts(list);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return () => unsubscribe();
  }, [currentUser, userRole]);

  // 2. Listen to Orders
  useEffect(() => {
    if (!currentUser || userRole !== 'penjual') return;
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return () => unsubscribe();
  }, [currentUser, userRole]);

  // 3. Listen to Chats
  useEffect(() => {
    if (!currentUser || userRole !== 'penjual') return;
    const chatQuery = query(collection(db, 'chats'), orderBy('lastMessageTime', 'desc'));
    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const list: ChatRoom[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          buyerId: data.buyerId,
          buyerName: data.buyerName,
          buyerEmail: data.buyerEmail,
          unreadBySeller: data.unreadBySeller,
          unreadByBuyer: data.unreadByBuyer,
          lastMessage: data.lastMessage,
          lastMessageTime: data.lastMessageTime
        });
      });
      setChatRooms(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });
    return () => unsubscribe();
  }, [currentUser, userRole]);

  // 4. Listen to Messages for Selected Chat Room
  useEffect(() => {
    if (!activeChatId) {
      setChatMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          senderId: data.senderId,
          senderRole: data.senderRole,
          message: data.message,
          createdAt: data.createdAt
        });
      });
      setChatMessages(list);

      // Auto-clear unread state for seller
      const chatRoomRef = doc(db, 'chats', activeChatId);
      try {
        updateDoc(chatRoomRef, { unreadBySeller: false });
      } catch (e) {
        console.error(e);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${activeChatId}/messages`);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  // Scroll active seller chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // 5. Seed sample product helper removed
  const handleSeedSampleProducts = async () => {
    triggerToast('Fitur Dinonaktifkan', 'Fungsi seeding data contoh telah dinonaktifkan.');
  };

  // 6. Delete a single product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin mematikan/menghapus produk ini dari toko?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      triggerToast('Produk Dihapus', 'Barang belanja berhasil dihapus dari daftar katalog.');
    } catch (e) {
      console.error(e);
    }
  };

  // 7. Add completely new customize product
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProdName.trim() || !newProdDescription.trim()) {
      triggerToast('Isi Rincian', 'Harap isi nama produk dan deskripsi.');
      return;
    }

    try {
      const customId = 'PRD-' + Math.floor(100000 + Math.random() * 900000);
      const pathForNewProduct = `products/${customId}`;
      
      await setDoc(doc(db, 'products', customId), {
        id: customId,
        name: newProdName,
        description: newProdDescription,
        price: Number(newProdPrice),
        stock: Number(newProdStock),
        imageUrl: newProdImgUrl,
        category: newProdCategory,
        rating: 5.0,
        reviewCount: 0,
        createdAt: serverTimestamp()
      });

      // Clear Form states
      setNewProdName('');
      setNewProdDescription('');
      setNewProdPrice(150000);
      setNewProdStock(10);
      setShowAddForm(false);
      triggerToast('Berhasil Ditambahkan', `Produk baru "${newProdName}" telah diunggah.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `products`);
    }
  };

  // 8. Reply to buyer live messenger
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !adminReply.trim()) return;

    const chatRoomRef = doc(db, 'chats', activeChatId);
    const messagesCol = collection(db, 'chats', activeChatId, 'messages');

    try {
      const messageText = adminReply.trim();
      setAdminReply('');

      await addDoc(messagesCol, {
        senderId: 'admin-test-uid',
        senderRole: 'seller',
        message: messageText,
        createdAt: serverTimestamp()
      });

      await updateDoc(chatRoomRef, {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        unreadByBuyer: true,
        unreadBySeller: false
      });
    } catch (e) {
      console.error(e);
    }
  };

  // 9. Change order shipping status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const ordObj = orders.find(o => o.id === orderId);
    if (!ordObj) return;

    setIsUpdatingOrder(true);
    const orderDocRef = doc(db, 'orders', orderId);

    try {
      let logStr = `Pesanan diupdate oleh Penjual ke status: ${newStatus}.`;
      if (newStatus === 'Dikirim') {
        if (!courierResi.trim()) {
          triggerToast('Isi Resi', 'Silakan masukkan nomor resi paket untuk pelacakan pembeli.');
          setIsUpdatingOrder(false);
          return;
        }
        logStr = `Paket telah diserahkan ke JNE dengan Resi resmi: ${courierResi.trim()}.`;
      }

      await updateDoc(orderDocRef, {
        status: newStatus,
        trackingNumber: newStatus === 'Dikirim' ? courierResi.trim() : ordObj.trackingNumber || '',
        paymentStatus: newStatus === 'Selesai' ? 'Lunas' : ordObj.paymentStatus,
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({
          status: newStatus,
          updatedAt: new Date(),
          note: logStr
        })
      });

      // Dispatch alert notification to buyer
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        userId: ordObj.userId,
        title: `Update Pesanan ${ordObj.id} 📦`,
        body: `Status pesanan Anda telah berubah menjadi "${newStatus}". ${newStatus === 'Dikirim' ? `Nomor Resi JNE Anda: ${courierResi}` : ''}`,
        read: false,
        orderId: ordObj.id,
        createdAt: serverTimestamp()
      });

      setCourierResi('');
      setSelectedOrder(null);
      triggerToast('Status Diperbarui', `Pesanan ${orderId} sukses diubah ke "${newStatus}"!`);
    } catch (e) {
      console.error(e);
      triggerToast('Gagal Update', 'Kegagalan memperbarui rincian pengiriman.');
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // Sync reviews of chosen product to Seller Dashboard
  useEffect(() => {
    if (!selectedProductIdForReviews) {
      setSellerReviews([]);
      return;
    }
    setLoadingSellerReviews(true);
    const reviewsPath = `products/${selectedProductIdForReviews}/reviews`;
    const reviewsQuery = query(collection(db, reviewsPath), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setSellerReviews(list);
      setLoadingSellerReviews(false);
    }, (error) => {
      console.error(error);
      setLoadingSellerReviews(false);
    });
    return () => unsubscribe();
  }, [selectedProductIdForReviews]);

  // Handle auto-select first product ID
  useEffect(() => {
    if (products.length > 0 && !selectedProductIdForReviews) {
      setSelectedProductIdForReviews(products[0].id);
    }
  }, [products]);

  // Seller moderator deletion transaction
  const handleSellerDeleteReview = async (reviewId: string, oldRating: number) => {
    if (!selectedProductIdForReviews) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus ulasan pembeli ini secara permanen sebagai moderasi?')) return;

    try {
      const productDocRef = doc(db, 'products', selectedProductIdForReviews);
      await runTransaction(db, async (transaction) => {
        const prodSnapshot = await transaction.get(productDocRef);
        if (!prodSnapshot.exists()) {
          throw new Error('Produk tidak ditemukan!');
        }
        const prodData = prodSnapshot.data();
        const currentCount = prodData.reviewCount || 0;
        const currentRating = prodData.rating || 5.0;

        const newCount = Math.max(0, currentCount - 1);
        const newRatingAverage = newCount === 0 ? 5.0 : ((currentRating * currentCount) - oldRating) / newCount;

        const reviewRef = doc(db, 'products', selectedProductIdForReviews, 'reviews', reviewId);
        transaction.delete(reviewRef);

        transaction.update(productDocRef, {
          reviewCount: newCount,
          rating: Number(newRatingAverage.toFixed(1))
        });
      });
      triggerToast('Ulasan Dihapus', 'Ulasan pembeli telah berhasil dimoderasi & dihapus.');
    } catch (e) {
      console.error(e);
      triggerToast('Gagal Menghapus', 'Terjadi kesalahan saat menghapus ulasan.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-20">
      <div className="bg-white border border-gray-150 rounded-xl overflow-hidden p-6 shadow-xs">
        {/* Profile dashboard header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5 mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-1.5 leading-none">
              <span className="bg-amber-800 text-white rounded-sm px-2.5 py-1 text-xs">NEAR BAKERY & CO. ADMIN</span>
              <span>Dashboard Admin</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1.5 font-medium">
              Kelola stok, perbarui status order, dan koordinasikan pengiriman dengan pembeli secara real-time.
            </p>
          </div>

        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-gray-150 mb-6 gap-2 overflow-x-auto">
          {[
            { id: 'products', label: 'Kelola Produk', icon: <Package size={14} /> },
            { id: 'orders', label: 'Proses Pesanan', icon: <ClipboardList size={14} /> },
            { id: 'chats', label: 'Chat Pembeli', icon: <MessageSquare size={14} /> },
            { id: 'reviews', label: 'Ulasan Pelanggan', icon: <Star size={14} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold leading-none border-b-2 transition-colors focus:outline-hidden cursor-pointer ${
                activeTab === tab.id
                  ? 'border-amber-700 text-amber-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'orders' && orders.filter(o => o.status === 'Menunggu Pembayaran' || o.status === 'Diproses').length > 0 && (
                <span className="h-4 min-w-[16px] rounded-full bg-red-500 text-white font-bold text-[9px] flex items-center justify-center px-1 leading-none">
                  {orders.filter(o => o.status === 'Menunggu Pembayaran' || o.status === 'Diproses').length}
                </span>
              )}
              {tab.id === 'chats' && chatRooms.filter(r => r.unreadBySeller).length > 0 && (
                <span className="h-4 w-4 rounded-full bg-amber-800 text-white font-bold text-[9px] flex items-center justify-center animate-pulse leading-none">
                  {chatRooms.filter(r => r.unreadBySeller).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content body based on active tab */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-800 mx-auto"></div>
            <p className="text-xs text-gray-400 mt-2">Menghubungkan ke pusat server database...</p>
          </div>
        ) : (
          <>
            {/* TAB: PRODUCTS */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-600 font-semibold">Terdapat <strong className="text-gray-800">{products.length}</strong> produk aktif di toko Anda.</span>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-md flex items-center gap-1 tracking-wider uppercase shadow-xs transition-colors"
                  >
                    <Plus size={14} />
                    <span>Maju / Tambah Produk</span>
                  </button>
                </div>

                {/* Create product Drawer */}
                {showAddForm && (
                  <form onSubmit={handleAddProductSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-5 md:p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                      <h3 className="font-extrabold text-sm text-gray-700">Formulir Tambah Produk Baru</h3>
                      <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-black">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase font-black text-gray-400 block mb-1">Nama Produk dagang</label>
                        <input
                          type="text"
                          required
                          value={newProdName}
                          onChange={(e) => setNewProdName(e.target.value)}
                          placeholder="Contoh: Sourdough Country Loaf Premium..."
                          className="w-full text-xs p-3 border border-gray-150 rounded bg-white text-gray-800 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-black text-gray-400 block mb-1">Kategori Belanja</label>
                        <select
                          value={newProdCategory}
                          onChange={(e) => setNewProdCategory(e.target.value)}
                          className="w-full text-xs p-3 border border-gray-150 rounded bg-white text-gray-800 focus:outline-hidden"
                        >
                          {CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase font-black text-gray-400 block mb-1">Harga Satuan (Rp)</label>
                        <input
                          type="number"
                          required
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(Number(e.target.value))}
                          className="w-full text-xs p-3 border border-gray-150 rounded bg-white text-gray-800 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-black text-gray-400 block mb-1">Stok Awal Tersedia</label>
                        <input
                          type="number"
                          required
                          value={newProdStock}
                          onChange={(e) => setNewProdStock(Number(e.target.value))}
                          className="w-full text-xs p-3 border border-gray-150 rounded bg-white text-gray-800 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Image Preset Picker */}
                    <div>
                      <label className="text-[10px] uppercase font-black text-gray-400 block mb-1.5">Pilih Foto Representatif (Presets)</label>
                      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-150 mb-3 scrollbar-none">
                        {PRESET_IMAGES.map((pi, index) => {
                          const isSelected = newProdImgUrl === pi.url;
                          return (
                            <div 
                              key={index}
                              onClick={() => setNewProdImgUrl(pi.url)}
                              className={`h-14 w-14 rounded border-2 cursor-pointer overflow-hidden shrink-0 transition-all ${
                                isSelected ? 'border-amber-700 scale-103 shadow-md' : 'border-gray-200 opacity-60'
                              }`}
                            >
                              <img src={pi.url} alt={pi.name} referrerPolicy="no-referrer" className="h-full w-full object-cover"/>
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-black text-gray-400 block mb-1">Atau Gunakan Custom URL Gambar Sendiri</label>
                        <input
                          type="text"
                          value={newProdImgUrl}
                          onChange={(e) => setNewProdImgUrl(e.target.value)}
                          placeholder="Masukkan tautan link http/https gambar..."
                          className="w-full text-xs p-3 border border-gray-150 rounded bg-white text-gray-800 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-black text-gray-400 block mb-1">Rincian Deskripsi Produk</label>
                      <textarea
                        required
                        rows={4}
                        value={newProdDescription}
                        onChange={(e) => setNewProdDescription(e.target.value)}
                        placeholder="Deskripsikan cita rasa roti culinary, tekstur renyah di luar lembut di dalam, petunjuk daya tahan roti, dll..."
                        className="w-full text-xs p-3 border border-gray-150 rounded bg-white text-gray-800 focus:outline-hidden leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-amber-800 hover:bg-amber-900 text-white font-bold py-3 px-6 rounded-md text-xs tracking-wider uppercase shadow-md cursor-pointer"
                    >
                      Unggah & Terbitkan Produk Ke Toko
                    </button>
                  </form>
                )}

                {products.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-lg">
                    <ShoppingBag size={48} className="mx-auto text-gray-200 mb-2" />
                    <h4 className="text-sm font-bold text-gray-700">Toko Masih Kosong</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Silakan tambahkan produk baru menggunakan tombol "<strong>Maju / Tambah Produk</strong>" di atas.
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-150 rounded-xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-150 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider leading-none">
                          <tr>
                            <th className="px-5 py-3">Barang info</th>
                            <th className="px-5 py-3">Kategori</th>
                            <th className="px-5 py-3 text-right">Harga</th>
                            <th className="px-5 py-3 text-center">Stok sisa</th>
                            <th className="px-5 py-3 text-center">Rating</th>
                            <th className="px-5 py-3 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {products.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50/50">
                              <td className="px-5 py-3.5 flex items-center gap-3 font-medium text-gray-800">
                                <div className="h-10 w-10 border border-gray-100 rounded-md overflow-hidden bg-gray-50 shrink-0">
                                  <img src={p.imageUrl} alt={p.name} referrerPolicy="no-referrer" className="h-full w-full object-cover"/>
                                </div>
                                <span className="line-clamp-1 max-w-[200px]">{p.name}</span>
                              </td>
                              <td className="px-5 py-3.5 text-gray-500">{p.category}</td>
                              <td className="px-5 py-3.5 text-right font-bold text-amber-800">{formatRupiah(p.price)}</td>
                              <td className="px-5 py-3.5 text-center font-bold">
                                <span className={p.stock > 0 ? 'text-gray-700' : 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded'}>
                                  {p.stock}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-center font-semibold text-yellow-600">
                                ⭐ {p.rating ? p.rating.toFixed(1) : '5.0'}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 bg-red-50 hover:bg-red-500 hover:text-white rounded border border-red-100 text-red-500 transition-all cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ORDERS */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-lg">
                    <ClipboardList size={48} className="mx-auto text-gray-200 mb-2" />
                    <h4 className="text-sm font-bold text-gray-700">Belum Ada Pembelian</h4>
                    <p className="text-xs text-gray-400 mt-1">Uji coba lakukan pembelian dahulu di menu Pembeli baru melacak statusnya di sini.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {orders.map((ord) => {
                      const isSelected = selectedOrder?.id === ord.id;
                      return (
                        <div key={ord.id} className="border border-gray-150 rounded-xl bg-white p-4 hover:shadow-xs transition-shadow">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-50 pb-3 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-gray-850">#{ord.id}</strong>
                              <span className="text-[10px] text-gray-400">{ord.userEmail}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full border leading-none ${getStatusBadgeStyle(ord.status)}`}>
                                {ord.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase">
                              {ord.createdAt ? new Date(ord.createdAt.seconds * 1000).toLocaleString('id-ID') : 'Baru saja'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start text-xs text-gray-600">
                            {/* Items bought layout */}
                            <div className="md:col-span-5 space-y-1">
                              <h4 className="font-bold text-gray-700 uppercase text-[10px] mb-1.5">Barang Belanjaan</h4>
                              {ord.items.map((i, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[11px] leading-tight text-gray-800">
                                  <span className="truncate max-w-[170px]">{i.name} (x{i.quantity})</span>
                                  <strong className="shrink-0">{formatRupiah(i.price * i.quantity)}</strong>
                                </div>
                              ))}
                              <div className="border-t border-gray-100 pt-1.5 flex justify-between font-extrabold text-amber-800 mt-2">
                                <span>Total Tagihan</span>
                                <span>{formatRupiah(ord.totalAmount)}</span>
                              </div>
                            </div>

                            {/* Shipping address info */}
                            <div className="md:col-span-4 bg-gray-50 p-3 rounded-lg text-[11px] leading-relaxed border border-gray-100">
                              <h4 className="font-bold text-gray-700 uppercase text-[9px] mb-1 leading-none">Alamat Kirim</h4>
                              <strong>{ord.shippingAddress.name} ({ord.shippingAddress.phone})</strong>
                              <p className="text-gray-500 mt-0.5">{ord.shippingAddress.address}, {ord.shippingAddress.city}, {ord.shippingAddress.postalCode}</p>
                              <div className="mt-2 text-[10px] border-t border-gray-200/60 pt-1">
                                <p>Bayar: <strong className="text-gray-755">{ord.paymentMethod}</strong></p>
                                <p>Status Transfer: <strong className={ord.paymentStatus === 'Lunas' ? 'text-green-600' : 'text-yellow-600'}>{ord.paymentStatus}</strong></p>
                              </div>
                            </div>

                            {/* Tracking updates buttons */}
                            <div className="md:col-span-3 flex flex-col gap-2.5 justify-center items-stretch pt-2 md:pt-0">
                              <h4 className="font-extrabold text-gray-700 uppercase text-[15px] mb-1 leading-none self-start">Integrasi Resi</h4>
                              
                              {ord.status !== 'Selesai' && ord.status !== 'Dibatalkan' ? (
                                <>
                                  {isSelected ? (
                                    <div className="space-y-2 bg-amber-50/20 border border-amber-100 p-2.5 rounded-lg animate-fade-in">
                                      {ord.status === 'Menunggu Pembayaran' && (
                                        <button
                                          onClick={() => handleUpdateOrderStatus(ord.id, 'Diproses')}
                                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded text-[10px] uppercase cursor-pointer"
                                        >
                                          Konfirmasi Pembayaran (Proses)
                                        </button>
                                      )}
                                      {ord.status === 'Diproses' && (
                                        <div className="space-y-1.5">
                                          <input
                                            type="text"
                                            placeholder="Masukkan No. Resi JNE..."
                                            value={courierResi}
                                            onChange={(e) => setCourierResi(e.target.value)}
                                            className="w-full p-2 border border-amber-300 rounded bg-white text-gray-800 text-[11px] focus:outline-hidden"
                                          />
                                          <button
                                            onClick={() => handleUpdateOrderStatus(ord.id, 'Dikirim')}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded text-[10px] uppercase cursor-pointer"
                                          >
                                            Serahkan Kurir & Kirim
                                          </button>
                                        </div>
                                      )}
                                      <button 
                                        type="button" 
                                        onClick={() => setSelectedOrder(null)} 
                                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-1 rounded text-[9px] font-bold"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedOrder(ord);
                                        if (ord.status === 'Dikirim') {
                                          setCourierResi(ord.trackingNumber || '');
                                        }
                                      }}
                                      className="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold py-2 rounded text-[10px] flex items-center justify-center gap-1 uppercase transition-colors shadow-xs"
                                    >
                                      <RefreshCcw size={12} />
                                      <span>Perbarui Status</span>
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={async () => {
                                      if (window.confirm('Batalkan order ini?')) {
                                        const ordRef = doc(db, 'orders', ord.id);
                                        await updateDoc(ordRef, { status: 'Dibatalkan' });
                                        triggerToast('Dibatalkan', `Order ${ord.id} dibatalkan.`);
                                      }
                                    }}
                                    className="w-full text-red-500 hover:text-red-700 text-[10px] font-bold underline leading-none py-1 block text-center"
                                  >
                                    Batalkan Transaksi
                                  </button>
                                </>
                              ) : (
                                <div className="text-center p-2.5 bg-gray-50 border border-dashed rounded-lg text-gray-400">
                                  Order terkunci ({ord.status})
                                  {ord.trackingNumber && <p className="text-[9px] mt-1">Resi: {ord.trackingNumber}</p>}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: CHATS */}
            {activeTab === 'chats' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[350px]">
                {/* Left Side: Rooms catalog */}
                <div className="md:col-span-4 border border-gray-150 rounded-xl bg-white p-3 space-y-2 overflow-y-auto max-h-[420px]">
                  <h3 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider mb-2 px-1">Percakapan Aktif</h3>
                  {chatRooms.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-xs leading-normal">
                      Belum ada pesan diskusi dari pembeli saat ini.
                    </div>
                  ) : (
                    chatRooms.map((room) => {
                      const isSelected = activeChatId === room.id;
                      return (
                        <div
                          key={room.id}
                          onClick={() => setActiveChatId(room.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-amber-700 bg-amber-50/20 shadow-xs ring-1 ring-amber-700'
                              : 'border-gray-150 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-xs font-black truncate max-w-[130px]">{room.buyerName}</h4>
                            {room.unreadBySeller && (
                              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{room.lastMessage || 'Kirim pesan...'}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Right Side: Message dialog window */}
                <div className="md:col-span-8 border border-gray-150 rounded-xl bg-gray-50/50 flex flex-col justify-between max-h-[420px] shadow-inner overflow-hidden">
                  {activeChatId ? (
                    <>
                      {/* Active header room */}
                      <div className="px-4 py-3 border-b border-gray-150 bg-white flex justify-between items-center">
                        <div>
                          <strong className="text-xs font-black text-gray-800">
                            {chatRooms.find(r => r.id === activeChatId)?.buyerName || 'Pembeli'}
                          </strong>
                          <span className="text-[9px] text-gray-400 block">
                            {chatRooms.find(r => r.id === activeChatId)?.buyerEmail}
                          </span>
                        </div>
                        <span className="text-[10px] bg-green-150 text-green-800 px-2.1 py-0.5 rounded leading-none">Konsumen</span>
                      </div>

                      {/* Msg records */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                        {chatMessages.map((msg) => {
                          const isSeller = msg.senderRole === 'seller';
                          return (
                            <div key={msg.id} className={`flex flex-col ${isSeller ? 'items-end' : 'items-start animate-fade-in'}`}>
                              <div className={`max-w-[80%] px-3 py-2 text-xs rounded-lg leading-relaxed ${
                                isSeller 
                                  ? 'bg-amber-805 text-white rounded-br-none'
                                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-xs'
                              }`}>
                                {msg.message}
                              </div>
                              <span className="text-[8px] text-gray-400 mt-0.5 px-1">
                                {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 'Baru saja'}
                              </span>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Msg submission footer */}
                      <form onSubmit={handleSendAdminReply} className="p-3 border-t border-gray-100 flex gap-2 bg-white">
                        <input
                          type="text"
                          placeholder="Balas koordinasi chat ke pembeli..."
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          className="flex-1 text-xs px-3 border border-gray-150 rounded bg-gray-50 focus:bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="submit"
                          className="bg-amber-800 hover:bg-amber-900 text-white p-2.5 rounded-md flex items-center justify-center transition-colors shadow-xs"
                        >
                          <Send size={13} />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                      <MessageSquare size={36} className="text-gray-200 mb-2 animate-bounce" />
                      <h4 className="text-xs font-semibold text-gray-500">Pilih Percakapan Pembeli</h4>
                      <p className="text-[10px] text-gray-400 px-10 mt-1">Silakan pilih salah satu nama pembeli di sebelah kiri untuk berdiskusi secara langsung.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-amber-50/15 border border-amber-200/50 rounded-xl p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-1">
                      Moderasi Ulasan Pembeli
                    </h3>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
                      Pilih hidangan di bawah ini untuk melihat detail kesaksian cita rasa, rating bintang, serta mengelola review pelanggan secara real-time.
                    </p>
                  </div>

                  {/* Dropdown product selector */}
                  <div className="w-full md:w-auto min-w-[250px]">
                    <label className="text-[9px] font-bold text-gray-400 block mb-1 uppercase tracking-widest">Pilih Menu Hidangan</label>
                    <select
                      value={selectedProductIdForReviews}
                      onChange={(e) => setSelectedProductIdForReviews(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-150 rounded bg-white text-gray-800 focus:outline-hidden font-medium"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (⭐{p.rating ? p.rating.toFixed(1) : '5.0'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedProductIdForReviews && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left aggregate stat panel */}
                    <div className="lg:col-span-4 bg-gray-50 border border-gray-150 rounded-xl p-5 text-center">
                      {products.find(p => p.id === selectedProductIdForReviews) && (
                        <>
                          <div className="h-16 w-16 mx-auto rounded-lg overflow-hidden border border-gray-200 shadow-sm mb-3 font-sans">
                            <img
                              src={products.find(p => p.id === selectedProductIdForReviews)?.imageUrl}
                              alt="Selected Product"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <h4 className="text-xs font-black text-gray-800 line-clamp-2 px-1 mb-1 leading-snug">
                            {products.find(p => p.id === selectedProductIdForReviews)?.name}
                          </h4>
                          <span className="inline-block text-[9px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider mb-4">
                            {products.find(p => p.id === selectedProductIdForReviews)?.category}
                          </span>

                          <div className="border-t border-gray-200/60 pt-4 mt-2">
                            <div className="text-3xl font-black text-yellow-600 leading-none mb-1 font-sans flex items-center justify-center gap-1">
                              <span>⭐</span>
                              <span>{products.find(p => p.id === selectedProductIdForReviews)?.rating?.toFixed(1) || '5.0'}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium font-sans">
                              Berdasarkan {products.find(p => p.id === selectedProductIdForReviews)?.reviewCount || 0} Ulasan Pelanggan
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right reviews log panel */}
                    <div className="lg:col-span-8 bg-white border border-gray-150 rounded-xl p-5">
                      <h4 className="text-xs font-extrabold text-gray-800 border-b border-gray-100 pb-3 mb-4 uppercase tracking-wider">
                        Daftar Testimoni ({sellerReviews.length})
                      </h4>

                      {loadingSellerReviews ? (
                        <div className="py-20 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-amber-800 mx-auto"></div>
                          <p className="text-[10px] text-gray-400 mt-2">Menyinkronkan ulasan...</p>
                        </div>
                      ) : sellerReviews.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-gray-150 rounded-lg">
                          <Star className="mx-auto text-gray-250 mb-2" size={24} />
                          <p className="text-xs text-gray-400 leading-none italic font-serif">Belum ada ulasan yang diterbitkan oleh pelanggan untuk menu ini.</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                          {sellerReviews.map((rev) => (
                            <div key={rev.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0 font-sans">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-gray-800">{rev.userName}</span>
                                    <span className="text-[9px] text-gray-350 font-mono">
                                      {rev.createdAt ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'Baru baru ini'}
                                    </span>
                                  </div>
                                  <div className="flex text-amber-500 gap-0.5 mt-1">
                                    {[1, 2, 3, 4, 5].map((st) => (
                                      <Star
                                        key={st}
                                        size={9}
                                        fill={st <= rev.rating ? 'currentColor' : 'none'}
                                        className={st <= rev.rating ? 'text-amber-500' : 'text-gray-200'}
                                      />
                                    ))}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleSellerDeleteReview(rev.id, rev.rating)}
                                  className="p-1 px-2 text-[9px] text-red-500 bg-red-100/60 hover:bg-red-500 hover:text-white rounded border border-red-200 hover:border-transparent transition-colors flex items-center gap-1 font-bold uppercase cursor-pointer"
                                  title="Moderasi Hapus"
                                >
                                  <Trash2 size={10} />
                                  <span>Hapus</span>
                                </button>
                              </div>
                              <p className="text-xs text-gray-600 bg-gray-50/70 p-3 border border-gray-105 rounded mt-1.5 font-sans leading-relaxed">
                                {rev.comment}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
