import React from 'react';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'default';
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface ConfirmModalProps {
  state: ConfirmState;
  setState: React.Dispatch<React.SetStateAction<ConfirmState>>;
  portalRef?: React.RefObject<HTMLDivElement | null>;
}

export function ConfirmModal({ state, setState }: ConfirmModalProps) {
  const { isOpen, title, message, confirmLabel = 'OK', cancelLabel = 'Batal', variant = 'default', onConfirm, onCancel } = state;

  const handleClose = () => {
    onCancel?.();
    setState(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    onConfirm();
    setState(prev => ({ ...prev, isOpen: false }));
  };

  if (!isOpen) return null;

  const variantStyles: Record<string, string> = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    info: 'bg-blue-600 hover:bg-blue-700',
    default: 'bg-emerald-600 hover:bg-emerald-700',
  };

  const iconMap: Record<string, React.ReactNode> = {
    danger: <AlertTriangle className="w-6 h-6 text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
    default: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {iconMap[variant] || iconMap.default}
            <h3 className="font-black text-gray-800 text-base">{title}</h3>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{message}</p>
        </div>
        <div className="flex gap-2 justify-end p-4 border-t border-gray-100 bg-gray-50">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            {cancelLabel}
          </button>
          <button onClick={handleConfirm} className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors cursor-pointer ${variantStyles[variant] || variantStyles.default}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
