/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ChatMessage, ChatRoom } from '../types';
import { Send, X, MessageSquare, ShieldCheck, Minimize2 } from 'lucide-react';

export const LiveChat: React.FC = () => {
  const { currentUser, setView, triggerToast } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = currentUser ? `${currentUser.uid}_admin` : null;

  // Listen to product chat triggers (via App hidden trigger click)
  useEffect(() => {
    const triggerBtn = document.getElementById('chat-tab-trigger');
    if (triggerBtn) {
      const handleTrigger = () => {
        setIsOpen(true);
        setIsMinimized(false);
      };
      triggerBtn.addEventListener('click', handleTrigger);
      return () => triggerBtn.removeEventListener('click', handleTrigger);
    }
  }, []);

  // Listen to message logs inside the chat room
  useEffect(() => {
    if (!currentUser || !chatId || !isOpen) return;

    const messagesColPath = `chats/${chatId}/messages`;
    const messagesQuery = query(
      collection(db, messagesColPath),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
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
      setMessages(list);
      
      // Auto-mark room as read by buyer when chatting
      const chatRoomRef = doc(db, 'chats', chatId);
      try {
        updateDoc(chatRoomRef, { unreadByBuyer: false });
      } catch (e) {
        console.error(e);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, messagesColPath);
    });

    // Also fetch chat room info
    const chatRoomRef = doc(db, 'chats', chatId);
    const unsubscribeRoom = onSnapshot(chatRoomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveRoom({
          id: docSnap.id,
          buyerId: data.buyerId,
          buyerName: data.buyerName,
          buyerEmail: data.buyerEmail,
          unreadByBuyer: data.unreadByBuyer,
          unreadBySeller: data.unreadBySeller,
          unreadByBuyerCount: data.unreadByBuyerCount || 0,
          lastMessage: data.lastMessage,
          lastMessageTime: data.lastMessageTime
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}`);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeRoom();
    };
  }, [currentUser, chatId, isOpen]);

  // Scroll to bottom on message updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !chatId) {
      triggerToast('Akses Tersisa', 'Harap masuk akun untuk memulai chat dengan Penjual.');
      return;
    }
    if (!newMessage.trim()) return;

    const chatRoomRef = doc(db, 'chats', chatId);
    const messagesCol = collection(db, 'chats', chatId, 'messages');

    try {
      const messageText = newMessage.trim();
      setNewMessage('');

      // Add to messages subcollection
      await addDoc(messagesCol, {
        senderId: currentUser.uid,
        senderRole: 'buyer',
        message: messageText,
        createdAt: serverTimestamp()
      });

      // Update parent Chat discussion meta
      await setDoc(chatRoomRef, {
        id: chatId,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || 'Akun Uji Coba',
        buyerEmail: currentUser.email || 'customer@webstore.com',
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        unreadBySeller: true,
        unreadByBuyer: false
      }, { merge: true });

    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `chats/${chatId}`);
    }
  };

  if (!currentUser) return null;

  if (!isOpen) {
    return (
      <button
        id="chat-floating-balloon"
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className="fixed bottom-6 right-6 z-50 bg-[#2A1D13] border border-amber-900/30 hover:bg-black text-amber-50 p-4 rounded-full shadow-2xl transition-transform hover:scale-105 flex items-center justify-center animate-bounce cursor-pointer"
        title="Konsultasi Rasa & Ragi"
      >
        <MessageSquare size={20} />
        {activeRoom?.unreadByBuyer && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-amber-500 rounded-full border-2 border-[#2A1D13]" />
        )}
      </button>
    );
  }

  return (
    <div 
      className={`fixed right-6 z-50 bg-white border border-[#EAE1D4] rounded-xs shadow-xl flex flex-col transition-all duration-350 w-80 md:w-85 ${
        isMinimized ? 'h-14 bottom-6' : 'h-[440px] bottom-6'
      } font-sans`}
      ref={containerRef}
    >
      {/* Dynamic Header Tab */}
      <div 
        className="px-4 py-3 bg-[#2A1D13] rounded-t-xs text-stone-100 flex justify-between items-center cursor-pointer border-b border-[#EAE1D4]/10"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-emerald-505 animate-pulse" />
          <div className="leading-tight">
            <h4 className="text-xs font-serif font-bold text-stone-50 tracking-wide">Konsultasi Rasa & Ragi</h4>
            <span className="text-[9px] text-[#FAF1E3] font-mono tracking-widest block mt-0.5">ARTISAN BAKER OFFLINE</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="p-1 hover:bg-white/10 rounded-xs text-stone-300 hover:text-white"
            title="Sembunyikan"
          >
            <Minimize2 size={12} />
          </button>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-1 hover:bg-white/10 rounded-xs text-stone-300 hover:text-white"
            title="Tutup Obrolan"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expanded Message area */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FCFAF7]">
            {messages.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                <MessageSquare size={24} className="text-stone-300 mb-2.5" />
                <p className="text-[11px] text-stone-400 italic max-w-[180px] leading-relaxed text-center font-serif">
                  Mulai obrolan ragi & resep dengan baker kami...
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderRole === 'buyer';
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isMe ? 'items-end animate-fade-in' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-xs px-3 py-2 text-xs leading-relaxed ${
                        isMe 
                          ? 'bg-amber-900 text-amber-50 rounded-br-none' 
                          : 'bg-white border border-[#EAE1D4] text-stone-850 rounded-bl-none'
                      }`}
                    >
                      {msg.message}
                    </div>
                    <span className="text-[8px] text-stone-400 font-mono mt-0.5 px-0.5 block">
                      {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}) : 'Baru saja'}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input footer */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[#FAF6F0] flex gap-2 bg-white rounded-b-xs">
            <input
              type="text"
              placeholder="Tulis pesan Anda..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 text-xs px-3 py-2 border border-[#EAE1D4] rounded-xs bg-stone-50/50 focus:bg-white text-stone-850 focus:outline-hidden font-sans"
            />
            <button
              type="submit"
              className="bg-[#2A1D13] hover:bg-black text-white p-2.5 rounded-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              <Send size={12} />
            </button>
          </form>
        </>
      )}

      {/* Trigger item context element for app simulation */}
      <button id="chat-tab-trigger" className="hidden">Open Chat</button>
    </div>
  );
};
