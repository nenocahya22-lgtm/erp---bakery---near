import { useState, useCallback } from 'react';
import type { ConfirmState } from '../components/ConfirmModal';

export function useConfirmModal() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'OK',
    cancelLabel: 'Batal',
    variant: 'default',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showConfirm = useCallback((opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    setConfirmState({
      isOpen: true,
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel || 'OK',
      cancelLabel: opts.cancelLabel || 'Batal',
      variant: (opts.variant as ConfirmState['variant']) || 'default',
      onConfirm: opts.onConfirm,
      onCancel: opts.onCancel || (() => {}),
    });
  }, []);

  return { confirmState, setConfirmState, showConfirm };
}
