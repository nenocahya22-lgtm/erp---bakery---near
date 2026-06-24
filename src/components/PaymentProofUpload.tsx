import React, { useState, useEffect, useRef } from 'react';
import { uploadPaymentProofCustomer, getPaymentProofStatus } from '../lib/payment-proof';

/**
 * PaymentProofUpload — Komponen upload bukti transfer untuk Web Store Frontend
 * =============================================================================
 * Komponen ini digunakan di halaman checkout / detail order aplikasi Web Store
 * agar customer bisa mengupload screenshot bukti transfer.
 *
 * Cara pakai di web store frontend:
 * ```tsx
 * import PaymentProofUpload from '../components/PaymentProofUpload';
 *
 * <PaymentProofUpload
 *   orderId={order.id}
 *   rekeningBank={[
 *     { bank: 'BCA', nomor: '1234567890', atasNama: 'Near Bakery & Co.' },
 *   ]}
 *   onProofSubmitted={(url) => {
 *     setPaymentProofUrl(url);
 *     setOrderConfirmed(true);
 *   }}
 * />
 * ```
 */

export interface BankAccount {
  bank: string;
  nomor: string;
  atasNama: string;
}

interface PaymentProofUploadProps {
  /** ID order dari Firestore */
  orderId: string;
  /** Daftar rekening untuk ditampilkan */
  rekeningBank?: BankAccount[];
  /** Callback setelah upload sukses */
  onProofSubmitted?: (proofUrl: string) => void;
  /** Custom className untuk styling */
  className?: string;
}

export default function PaymentProofUpload({
  orderId,
  rekeningBank = [
    { bank: 'BCA', nomor: '1234567890', atasNama: 'Near Bakery & Co.' },
    { bank: 'Mandiri', nomor: '0987654321', atasNama: 'Near Bakery & Co.' },
    { bank: 'DANA', nomor: '08123456789', atasNama: 'Near Bakery Store' },
  ],
  onProofSubmitted,
  className = '',
}: PaymentProofUploadProps) {
  // ─── STATE ───
  const [uploadState, setUploadState] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [existingProofUrl, setExistingProofUrl] = useState<string | null>(null);
  const [existingStatus, setExistingStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── CEK STATUS BUKTI YANG SUDAH ADA ───
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await getPaymentProofStatus(orderId);
        if (cancelled) return;
        if (status.hasProof && status.proofUrl) {
          setExistingProofUrl(status.proofUrl);
          setPreviewUrl(status.proofUrl);
          setExistingStatus(status.status);
          if (status.paymentStatus === 'Lunas') {
            setUploadState('success');
            setMessage({ text: '✅ Pembayaran sudah dikonfirmasi dan LUNAS!', type: 'success' });
          } else {
            setMessage({ text: '📤 Bukti sudah diupload. Menunggu verifikasi admin.', type: 'info' });
          }
        }
      } catch (e) {
        // Silent — load existing proof
      }
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  // ─── HANDLE FILE SELECTION ───
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setMessage(null);
    setExistingProofUrl(null);

    // Validasi client-side
    if (!file.type.startsWith('image/')) {
      setMessage({ text: '❌ Hanya file gambar yang diperbolehkan (JPG/PNG)', type: 'error' });
      return;
    }
    // File besar (>600KB) akan otomatis dikompres oleh Canvas API di payment-proof.ts
    // Foto HP 3-5MB akan di-resize + turun kwalitas JPEG sampai <600KB

    // Preview lokal
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploadState('uploading');

    try {
      const result = await uploadPaymentProofCustomer(orderId, file);

      if (result.success && result.downloadUrl) {
        setUploadState('success');
        setPreviewUrl(result.downloadUrl);
        setMessage({ text: '✅ Bukti berhasil diupload! Kami akan verifikasi dalam 1×24 jam.', type: 'success' });
        onProofSubmitted?.(result.downloadUrl);
      } else {
        setUploadState('error');
        setMessage({ text: result.message, type: 'error' });
        setPreviewUrl(null);
      }
    } catch (err: any) {
      setUploadState('error');
      setMessage({ text: '❌ Gagal upload: ' + (err.message || 'Coba lagi'), type: 'error' });
      setPreviewUrl(null);
    } finally {
      // Reset input agar bisa pilih file yang sama lagi
      if (fileInputRef.current) fileInputRef.current.value = '';
      URL.revokeObjectURL(objectUrl);
    }
  };

  // ─── HANDLE RESET (upload ulang) ───
  const handleReset = () => {
    setUploadState('idle');
    setPreviewUrl(null);
    setMessage(null);
    setExistingProofUrl(null);
  };

  // ─── RENDER ───
  return (
    <div className={`space-y-5 ${className}`}>
      {/* ─── INFORMASI REKENING ─── */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <h3 className="text-sm font-bold text-gray-900">Pembayaran Transfer Bank</h3>
        </div>
        <p className="text-xs text-gray-600">
          Silakan transfer ke salah satu rekening di bawah ini, lalu upload bukti transfernya.
        </p>
        <div className="space-y-2.5">
          {rekeningBank.map((rek, i) => (
            <div key={i} className="bg-white rounded-xl p-3.5 border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-700">
                  {rek.bank}
                </span>
                <p className="font-mono font-bold text-gray-900 text-sm tracking-wider mt-0.5">
                  {rek.nomor}
                </p>
                <p className="text-[10px] text-gray-500">a.n. {rek.atasNama}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rek.nomor);
                  setMessage({ text: `✅ No. rekening ${rek.bank} disalin!`, type: 'success' });
                  setTimeout(() => setMessage(null), 2000);
                }}
                className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-bold rounded-lg transition cursor-pointer shrink-0"
              >
                Salin
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ─── AREA UPLOAD ─── */}
      <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
        uploadState === 'success'
          ? 'border-emerald-300 bg-emerald-50/30'
          : uploadState === 'error'
          ? 'border-red-300 bg-red-50/30'
          : 'border-gray-200 bg-gray-50/50 hover:border-emerald-300 hover:bg-emerald-50/20'
      }`}>
        {/* SUCCESS STATE */}
        {uploadState === 'success' && previewUrl && (
          <div className="space-y-4">
            <div className="w-28 h-28 mx-auto rounded-xl overflow-hidden border-2 border-emerald-200 shadow-sm">
              <img
                src={previewUrl}
                alt="Bukti Transfer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 
                    'data:image/svg+xml,' + encodeURIComponent(
                      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#f3f4f6" width="200" height="200"/><text x="100" y="105" text-anchor="middle" fill="#9ca3af" font-size="12" font-family="sans-serif">Gambar tidak tersedia</text></svg>'
                    );
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-emerald-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold text-sm">
                {existingStatus === 'Lunas' ? 'Pembayaran LUNAS' : 'Bukti Terupload!'}
              </span>
            </div>
            {existingStatus !== 'Lunas' && (
              <button
                onClick={handleReset}
                className="text-xs text-gray-400 hover:text-red-500 underline transition cursor-pointer"
              >
                Upload ulang bukti
              </button>
            )}
          </div>
        )}

        {/* UPLOADING STATE */}
        {uploadState === 'uploading' && (
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-700">
              Mengupload...
            </p>
            <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-[10px] text-gray-400">Mohon tunggu, jangan tutup halaman</p>
          </div>
        )}

        {/* IDLE / ERROR STATE */}
        {(uploadState === 'idle' || uploadState === 'error') && (
          <div className="space-y-4">
            {/* Preview jika ada bukti existing */}
            {existingProofUrl && (
              <div className="w-24 h-24 mx-auto rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm mb-2">
                <img
                  src={existingProofUrl}
                  alt="Bukti existing"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex justify-center">
              <label className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {existingProofUrl ? 'Upload Ulang Bukti' : 'Pilih File Bukti Transfer'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            <p className="text-[11px] text-gray-400">
              Format: JPG / PNG • Otomatis dikompres
            </p>
          </div>
        )}
      </div>

      {/* ─── MESSAGE ─── */}
      {message && (
        <div className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-100 text-emerald-800'
            : message.type === 'error'
            ? 'bg-red-100 text-red-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {message.type === 'success' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : message.type === 'error' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {message.text}
        </div>
      )}

      {/* ─── KETERANGAN ─── */}
      <div className="text-[10px] text-gray-400 space-y-1 leading-relaxed">
        <p>
          💡 Setelah upload, pesanan Anda akan diproses setelah admin mengkonfirmasi 
          pembayaran (1×24 jam).
        </p>
        <p>
          📩 Status pesanan bisa dicek di halaman <strong>Pesanan Saya</strong>.
        </p>
      </div>
    </div>
  );
}
