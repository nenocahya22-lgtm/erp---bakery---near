/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  createdAt?: any; // Firestore Timestamp
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface StatusHistoryItem {
  status: OrderStatus;
  updatedAt: any; // Firestore Timestamp
  note: string;
}

export type OrderStatus = 'Menunggu Pembayaran' | 'Diproses' | 'Dikirim' | 'Selesai' | 'Dibatalkan';

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus: 'Belum Bayar' | 'Lunas';
  trackingNumber?: string;
  statusHistory: StatusHistoryItem[];
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: any; // Firestore Timestamp
}

export interface ChatRoom {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  lastMessage?: string;
  lastMessageTime?: any; // HTML/Firestore Timestamp
  unreadBySeller?: boolean;
  unreadByBuyer?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: 'buyer' | 'seller';
  message: string;
  createdAt: any; // Firestore Timestamp
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  orderId?: string;
  createdAt: any; // Firestore Timestamp
}
