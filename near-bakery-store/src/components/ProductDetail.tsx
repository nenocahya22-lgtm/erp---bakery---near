/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, MessageSquare, Star, Plus, Minus, Send, User, Edit2, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product, Review } from '../types';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  setDoc,
  doc, 
  serverTimestamp, 
  query, 
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatRupiah } from '../utils';

export const ProductDetail: React.FC = () => {
  const { 
    selectedProductId, 
    setView, 
    addToCart, 
    currentUser, 
    triggerToast 
  } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  // Review Form States
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingOldRating, setEditingOldRating] = useState<number>(5);

  // Load product & lookups from Firestore
  useEffect(() => {
    if (!selectedProductId) return;

    setIsLoading(true);
    const productRef = doc(db, 'products', selectedProductId);

    // Dynamic snapshot for general product updates
    const unsubscribeProduct = onSnapshot(productRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProduct({
          id: snapshot.id,
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
      } else {
        triggerToast('Produk Tidak Ditemukan', 'Maaf, produk tidak lagi tersedia.');
        setView('home');
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `products/${selectedProductId}`);
    });

    // Dynamic snapshot for reviews subcollection
    const reviewsPath = `products/${selectedProductId}/reviews`;
    const reviewsQuery = query(
      collection(db, reviewsPath),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
      const list: Review[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          productId: selectedProductId,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          rating: data.rating,
          comment: data.comment,
          createdAt: data.createdAt
        });
      });
      setReviews(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, reviewsPath);
    });

    return () => {
      unsubscribeProduct();
      unsubscribeReviews();
    };
  }, [selectedProductId]);

  if (isLoading || !product) {
    return (
      <div className="max-w-7xl mx-auto px-[#FAF7F2] py-20 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-amber-800 border-r-4 border-r-transparent"></div>
        <p className="text-stone-500 mt-4 font-semibold text-sm font-sans">Sedang memuat rincian kelezatan dapur...</p>
      </div>
    );
  }

  const handleQtyIncrease = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const handleQtyDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // Chat/Diskusi directly with seller
  const handleStartChat = async () => {
    if (!currentUser) {
      triggerToast('Akses Terbatas', 'Silakan masuk akun terlebih dahulu untuk berdiskusi langsung dengan Penjual.');
      return;
    }

    const chatId = `${currentUser.uid}_admin`;
    const chatDocRef = doc(db, 'chats', chatId);

    try {
      // Create or activate the chat room
      await setDoc(chatDocRef, {
        id: chatId,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || 'Akun Pembeli',
        buyerEmail: currentUser.email || 'buyer@example.com',
        lastMessage: `Menanyakan tentang produk: ${product.name}`,
        lastMessageTime: serverTimestamp(),
        unreadBySeller: true,
        unreadByBuyer: false
      }, { merge: true });

      // Add default introduction chat message
      const messagesCol = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesCol, {
        senderId: currentUser.uid,
        senderRole: 'buyer',
        message: `Halo, saya tertarik dengan produk ini: "${product.name}". Apakah stok nya masih ada?`,
        createdAt: serverTimestamp()
      });

      triggerToast('Chat Terbuka', 'Terhubung langsung dengan Penjual. Chat diaktifkan!');
      
      // Navigate to home and let App trigger Chat View
      setView('home');
      setTimeout(() => {
        const chatTab = document.getElementById('chat-tab-trigger');
        if (chatTab) chatTab.click();
      }, 200);

    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `chats/${chatId}`);
    }
  };

  // Submit localized review (create or update)
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      triggerToast('Gagal Mengulas', 'Silakan masuk akun terlebih dahulu untuk memberikan ulasan produk.');
      return;
    }
    if (!newComment.trim()) {
      triggerToast('Komentar Kosong', 'Silakan ketik komentar ulasan Anda terlebih dahulu.');
      return;
    }

    setIsSubmittingReview(true);
    const productDocRef = doc(db, 'products', product.id);

    try {
      if (editingReviewId) {
        // UPDATE EXISTING REVIEW
        await runTransaction(db, async (transaction) => {
          const prodSnapshot = await transaction.get(productDocRef);
          if (!prodSnapshot.exists()) {
            throw new Error('Produk tidak ditemukan!');
          }

          const prodData = prodSnapshot.data();
          const currentCount = prodData.reviewCount || 0;
          const currentRating = prodData.rating || 5.0;

          let newRatingAverage = currentRating;
          if (currentCount > 0) {
            newRatingAverage = ((currentRating * currentCount) - editingOldRating + newRating) / currentCount;
          } else {
            newRatingAverage = newRating;
          }

          const reviewRef = doc(db, 'products', product.id, 'reviews', editingReviewId);
          transaction.update(reviewRef, {
            rating: newRating,
            comment: newComment.trim(),
            updatedAt: serverTimestamp()
          });

          transaction.update(productDocRef, {
            rating: Number(newRatingAverage.toFixed(1))
          });
        });

        triggerToast('Ulasan Diperbarui', 'Ulasan Anda berhasil diperbarui!');
        setEditingReviewId(null);
      } else {
        // CREATE NEW REVIEW
        await runTransaction(db, async (transaction) => {
          const prodSnapshot = await transaction.get(productDocRef);
          if (!prodSnapshot.exists()) {
            throw new Error('Produk tidak ditemukan!');
          }

          const prodData = prodSnapshot.data();
          const currentCount = prodData.reviewCount || 0;
          const currentRating = prodData.rating || 5.0;

          const newCount = currentCount + 1;
          const newRatingAverage = ((currentRating * currentCount) + newRating) / newCount;

          const newReviewRef = doc(collection(db, 'products', product.id, 'reviews'));
          transaction.set(newReviewRef, {
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Pembeli Rahasia',
            rating: newRating,
            comment: newComment.trim(),
            createdAt: serverTimestamp()
          });

          transaction.update(productDocRef, {
            reviewCount: newCount,
            rating: Number(newRatingAverage.toFixed(1))
          });
        });

        triggerToast('Ulasan Dikirim', 'Terima kasih atas ulasan produk yang Anda berikan!');
      }

      setNewComment('');
      setNewRating(5);
    } catch (error) {
      console.error(error);
      triggerToast('Error', 'Gagal membagikan ulasan saat ini.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Delete localized review and sync ratings
  const handleDeleteReview = async (reviewId: string, oldRating: number) => {
    if (!currentUser) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus ulasan ini?')) return;

    try {
      const productDocRef = doc(db, 'products', product.id);
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

        const reviewRef = doc(db, 'products', product.id, 'reviews', reviewId);
        transaction.delete(reviewRef);

        transaction.update(productDocRef, {
          reviewCount: newCount,
          rating: Number(newRatingAverage.toFixed(1))
        });
      });

      if (editingReviewId === reviewId) {
        setEditingReviewId(null);
        setNewComment('');
        setNewRating(5);
      }

      triggerToast('Ulasan Dihapus', 'Ulasan Anda berhasil dihapus.');
    } catch (e) {
      console.error(e);
      triggerToast('Gagal Menghapus', 'Terjadi kesalahan saat menghapus ulasan.');
    }
  };

  const getStarColor = (starIndex: number, currentRating: number) => {
    return starIndex <= currentRating ? 'text-[#D4AF37]' : 'text-stone-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 pb-20 font-sans">
      {/* Navigation breadcrumb */}
      <button 
        onClick={() => setView('home')} 
        className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-[0.2em] mb-6 focus:outline-hidden cursor-pointer"
      >
        <ArrowLeft size={12} />
        <span className="font-sans">Koleksi Dapur Utama</span>
      </button>

      {/* Product Information Canvas Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white border border-stone-200/80 rounded-2xl p-6 md:p-12 shadow-xs">
        {/* Left Side: Photo frame with warm border */}
        <div className="lg:col-span-5 flex justify-center items-start">
          <div className="w-full aspect-square border border-stone-100 rounded-2xl overflow-hidden bg-stone-50">
            <img 
              src={product.imageUrl} 
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.01]"
            />
          </div>
        </div>

        {/* Right Side: Descriptions and call-to-actions */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1.5 rounded-full inline-block mb-4 leading-none">
              {product.category}
            </span>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-905 leading-tight mb-4">
              {product.name}
            </h2>

            {/* Ratings and reviews bar */}
            <div className="flex flex-wrap items-center gap-3.5 mb-6 border-b border-stone-100 pb-4">
              <div className="flex text-amber-500 gap-0.5">
                {[1, 2, 3, 4, 5].map((index) => (
                  <Star 
                    key={index} 
                    size={12} 
                    fill={index <= (product.rating || 5.0) ? 'currentColor' : 'none'} 
                    className={index <= (product.rating || 5.0) ? 'text-amber-500' : 'text-stone-200'} 
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-stone-700 font-mono">
                {(product.rating || 5.0).toFixed(1)} / 5.0
              </span>
              <span className="h-3 w-[1px] bg-stone-200" />
              <span className="text-xs text-stone-500 font-sans">
                <strong>{product.reviewCount || 0}</strong> Penilaian Pelanggan
              </span>
              <span className="h-3 w-[1px] bg-stone-200" />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${product.stock > 0 ? 'text-stone-500' : 'text-red-500'}`}>
                {product.stock > 0 ? `Sedia ${product.stock} pcs` : 'Stok Kosong'}
              </span>
            </div>

            {/* Display Price with Indonesia Rupiah format */}
            <div className="bg-amber-50/40 border border-amber-200/40 rounded-2xl p-5 mb-6">
              <span className="text-[10px] text-amber-800 tracking-wider block mb-1 uppercase font-bold">Harga Cita Rasa</span>
              <span className="text-2xl md:text-3xl font-serif font-black text-stone-900 tracking-tight">
                {formatRupiah(product.price)}
              </span>
            </div>

            {/* Product description segment */}
            <div className="mb-8">
              <h4 className="text-[10px] uppercase font-extrabold text-stone-400 tracking-wider mb-2">Karakter & Cita Rasa Roti</h4>
              <p className="text-xs md:text-sm text-stone-600 leading-relaxed whitespace-pre-line font-sans font-light">
                {product.description}
              </p>
            </div>
          </div>

          {/* Checkout controls */}
          <div className="pt-6 border-t border-stone-100">
            {product.stock > 0 ? (
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Quantity adjuster with nice retro border */}
                <div className="flex items-center gap-1.5 border border-stone-200 rounded-full p-1 bg-white shadow-inner">
                  <button 
                    onClick={handleQtyDecrease}
                    className="p-2 text-stone-400 hover:text-stone-900 rounded-full cursor-pointer hover:bg-stone-50 transition-colors"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="w-10 text-center text-xs font-bold text-stone-850 font-mono">
                    {quantity}
                  </span>
                  <button 
                    onClick={handleQtyIncrease}
                    className="p-2 text-stone-400 hover:text-stone-900 rounded-full cursor-pointer hover:bg-stone-50 transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </div>

                {/* Main purchase buttons */}
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => handleStartChat()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-full font-sans font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                    title="Diskusikan dengan baker"
                  >
                    <MessageSquare size={13} />
                    <span>Tanya Baker</span>
                  </button>

                  <button 
                    onClick={() => addToCart(product, quantity)}
                    className="flex-3 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-sans font-bold text-xs tracking-wide transition-all cursor-pointer shadow-md hover:shadow-lg"
                  >
                    <ShoppingCart size={13} />
                    <span>Masukkan Keranjang</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => handleStartChat()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-full font-sans font-bold text-xs uppercase cursor-pointer"
                >
                  <MessageSquare size={13} />
                  <span>Tanya Baker</span>
                </button>
                <div className="flex-2 bg-stone-50 text-stone-405 border border-stone-100 py-3 rounded-full font-sans font-bold text-xs text-center uppercase tracking-wider select-none leading-none flex items-center justify-center">
                  Rak Belum Siap / Habis
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review & Feedbacks Block */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
        {/* Left column: Review Submission Panel */}
        <div className="lg:col-span-4 bg-white border border-stone-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex justify-between items-center border-b border-stone-100 pb-2.5 mb-4">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-sans">
              {editingReviewId ? 'Edit Ulasan Anda' : 'Sampaikan Penilaian'}
            </h3>
            {editingReviewId && (
              <button
                type="button"
                onClick={() => {
                  setEditingReviewId(null);
                  setNewComment('');
                  setNewRating(5);
                }}
                className="text-stone-400 hover:text-red-500 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
              >
                <X size={12} />
                <span>Batal</span>
              </button>
            )}
          </div>
          
          {currentUser ? (
            <form onSubmit={handleAddReview} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">Tingkat Kepuasan</label>
                <div className="flex text-amber-500 gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="hover:scale-110 transition-transform cursor-pointer text-amber-500 font-sans"
                    >
                      <Star size={20} fill={star <= newRating ? 'currentColor' : 'none'} className={star <= newRating ? 'text-amber-500' : 'text-stone-200'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 block mb-1.5 uppercase tracking-wider">Ceritakan Cita Rasa</label>
                <textarea
                  placeholder="Ceritakan cita rasa, kerenyahan crust, tekstur di dalam..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full text-xs p-3 border border-stone-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-hidden min-h-[95px] text-stone-800 font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold py-3 px-4 rounded-full text-xs tracking-wide uppercase transition-colors cursor-pointer shadow-xs"
              >
                {isSubmittingReview ? 'Menerbitkan...' : (editingReviewId ? 'Simpan Perubahan' : 'Kirim Ulasan')}
              </button>
            </form>
          ) : (
            <div className="text-center py-8 bg-stone-50/50 border border-stone-200/50 rounded-none">
              <User className="mx-auto text-stone-350 mb-2" size={20} />
              <p className="text-xs text-stone-500 font-sans italic px-4 leading-relaxed">
                Silakan masuk akun terlebih dahulu untuk berbagi kesaksian rasa hidangan ini.
              </p>
            </div>
          )}
        </div>

        {/* Right column: Review Log Feeds with premium ivory boxes */}
        <div className="lg:col-span-8 bg-white border border-stone-200/50 rounded-none p-6">
          <h3 className="text-xs font-bold text-stone-900 mb-4 uppercase tracking-[0.15em] font-sans border-b border-stone-100 pb-2.5 flex justify-between items-center">
            <span>Ulasan Rekan Rasa ({reviews.length})</span>
            {reviews.length > 0 && (
              <span className="text-[8px] bg-stone-950 text-[#FCFAF7] font-bold px-2.5 py-1 rounded-none tracking-widest uppercase">
                Terverifikasi
              </span>
            )}
          </h3>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {reviews.length === 0 ? (
              <div className="text-center py-12 bg-stone-50/30 rounded-none border border-dashed border-stone-200/50">
                <Star className="mx-auto text-stone-300 mb-2" size={24} />
                <p className="text-xs text-stone-400 font-serif italic">Belum ada ulasan rasa di sini. Bagikan pengalaman pemanggangan pertama Anda!</p>
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="border-b border-stone-150 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-850 leading-none">{rev.userName}</span>
                        {currentUser && rev.userId === currentUser.uid && (
                          <span className="text-[9px] bg-emerald-550 bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded">
                            Ulasan Anda
                          </span>
                        )}
                        <span className="text-[9px] text-stone-400 font-mono">
                          {rev.createdAt ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'Baru saja'}
                        </span>
                      </div>
                      <div className="flex text-amber-500 gap-0.5 mt-1.5">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <Star 
                            key={st} 
                            size={10} 
                            fill={st <= rev.rating ? 'currentColor' : 'none'} 
                            className={st <= rev.rating ? 'text-amber-500' : 'text-stone-250'} 
                          />
                        ))}
                      </div>
                    </div>

                    {/* Authenticated Owner/Admin Buttons */}
                    {currentUser && rev.userId === currentUser.uid && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingReviewId(rev.id);
                            setEditingOldRating(rev.rating);
                            setNewComment(rev.comment);
                            setNewRating(rev.rating);
                            // Scroll to form smoothly
                            const formHeader = document.querySelector('.lg\\:col-span-4');
                            if (formHeader) {
                              formHeader.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="p-1 text-stone-400 hover:text-amber-600 hover:bg-stone-50 rounded transition-colors"
                          title="Ubah Ulasan"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(rev.id, rev.rating)}
                          className="p-1 text-stone-400 hover:text-red-600 hover:bg-stone-50 rounded transition-colors"
                          title="Hapus Ulasan"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed bg-stone-50/50 p-3 rounded-none mt-1.5 border border-stone-100 font-sans">
                    {rev.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
