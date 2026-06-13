import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firestore-bridge';
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { MessageSquare, Send, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ChatRoom {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  lastMessage?: string;
  lastMessageTime?: any;
  unreadBySeller?: boolean;
  unreadByBuyer?: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: 'buyer' | 'seller';
  message: string;
  createdAt: any;
}

const formatTime = (t: any) => {
  if (!t) return '';
  const d = t.toDate ? t.toDate() : new Date(t);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

export default function ChatTab() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Listen to all chat rooms
  useEffect(() => {
    const q = query(collection(db, 'chats'), orderBy('lastMessageTime', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const rooms: ChatRoom[] = [];
      snap.forEach((d) => {
        const data = d.data();
        rooms.push({
          id: d.id,
          buyerId: data.buyerId || '',
          buyerName: data.buyerName || 'Unknown',
          buyerEmail: data.buyerEmail || '',
          lastMessage: data.lastMessage || '',
          lastMessageTime: data.lastMessageTime || null,
          unreadBySeller: data.unreadBySeller || false,
          unreadByBuyer: data.unreadByBuyer || false,
        });
      });
      setChatRooms(rooms);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Listen to messages in active room
  useEffect(() => {
    if (!activeChatId) { setMessages([]); return; }
    const q = query(collection(db, 'chats', activeChatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = [];
      snap.forEach((d) => {
        const data = d.data();
        msgs.push({
          id: d.id,
          senderId: data.senderId || '',
          senderRole: data.senderRole || 'buyer',
          message: data.message || '',
          createdAt: data.createdAt || null,
        });
      });
      setMessages(msgs);
    });
    // Mark room as read
    const markRead = async () => {
      try {
        await updateDoc(doc(db, 'chats', activeChatId), { unreadBySeller: false });
      } catch (_) {}
    };
    markRead();
    return () => unsub();
  }, [activeChatId]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!text || !activeChatId) return;
    try {
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
        senderId: 'admin-erp',
        senderRole: 'seller',
        message: text,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        unreadByBuyer: true,
        unreadBySeller: false,
      });
      setReplyText('');
    } catch (e) {
      console.warn('Failed to send reply:', e);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Hapus seluruh percakapan ini?')) return;
    try {
      const msgsSnap = await getDoc(doc(db, 'chats', roomId));
      if (msgsSnap.exists()) {
        await updateDoc(doc(db, 'chats', roomId), {
          lastMessage: '[Percakapan dihapus]',
          unreadBySeller: false,
          unreadByBuyer: false,
        });
      }
    } catch (_) {}
  };

  const unreadCount = chatRooms.filter(r => r.unreadBySeller).length;

  return (
    <div className="p-3 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-800">Chat Pembeli</h2>
            <p className="text-[10px] text-gray-400">
              {chatRooms.length} percakapan{unreadCount > 0 ? ` · ${unreadCount} belum dibaca` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Room List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Daftar Percakapan</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : chatRooms.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-8">Belum ada percakapan.</p>
            ) : (
              chatRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setActiveChatId(room.id)}
                  className={`w-full text-left p-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                    activeChatId === room.id ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-emerald-700">
                        {(room.buyerName || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-800 truncate">{room.buyerName}</span>
                        {room.unreadBySeller && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{room.lastMessage || 'Belum ada pesan'}</p>
                    </div>
                    <div className="text-[9px] text-gray-400 shrink-0">
                      {formatTime(room.lastMessageTime)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          {activeChatId ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-emerald-700">
                      {chatRooms.find(r => r.id === activeChatId)?.buyerName?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800">
                      {chatRooms.find(r => r.id === activeChatId)?.buyerName || 'Unknown'}
                    </span>
                    <p className="text-[9px] text-gray-400">
                      {chatRooms.find(r => r.id === activeChatId)?.buyerEmail || ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteRoom(activeChatId)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[400px] min-h-[300px]">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[11px] text-gray-400">Belum ada pesan. Kirim sapaan untuk memulai.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderRole === 'seller' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
                          msg.senderRole === 'seller'
                            ? 'bg-emerald-500 text-white rounded-br-md'
                            : 'bg-slate-100 text-gray-800 rounded-bl-md'
                        }`}
                      >
                        <p className="text-[11px] leading-relaxed">{msg.message}</p>
                        <p className={`text-[8px] mt-1 ${msg.senderRole === 'seller' ? 'text-emerald-200' : 'text-gray-400'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Reply Input */}
              <div className="p-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                    placeholder="Ketik balasan..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Pilih percakapan untuk mulai membalas</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
