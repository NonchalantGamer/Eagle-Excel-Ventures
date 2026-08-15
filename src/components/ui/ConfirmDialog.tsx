import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, HelpCircle, X, RefreshCw } from 'lucide-react';
import { useModalFocusLock } from '../../hooks/useModalFocusLock';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'info';
  isLoading?: boolean;
  icon?: 'trash' | 'warning' | 'question' | 'alert' | 'info';
  impactDetails?: React.ReactNode;
  id?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  icon = 'trash',
  impactDetails,
  id = 'global-confirm-dialog'
}) => {
  const handleClose = () => {
    if (isLoading) return;
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  useModalFocusLock(isOpen, handleClose);

  if (!isOpen || typeof document === 'undefined') return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20',
          badgeText: 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          confirmBtn: 'bg-[#F27D26] hover:bg-[#e06d1a] text-black shadow-orange-950/20 font-extrabold',
          badgeText: 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-950/20 font-bold',
          badgeText: 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-[#F27D26]/10 text-[#F27D26] border-[#F27D26]/20',
          confirmBtn: 'bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold shadow-orange-950/20',
          badgeText: 'text-[#F27D26] bg-[#F27D26]/10'
        };
    }
  };

  const styles = getVariantStyles();

  return createPortal(
    <div
      id={id}
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white dark:bg-[#141414] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-md w-full p-6 sm:p-7 space-y-5 text-slate-900 dark:text-zinc-100 animate-scaleUp relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-40"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon Header */}
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${styles.iconBg}`}>
            {icon === 'trash' && <Trash2 className="w-6 h-6" />}
            {(icon === 'warning' || icon === 'alert') && <AlertTriangle className="w-6 h-6" />}
            {(icon === 'question' || icon === 'info') && <HelpCircle className="w-6 h-6" />}
          </div>
          <div>
            <h3 id={`${id}-title`} className="text-base sm:text-lg font-bold font-serif text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Please review before confirming this operation
            </p>
          </div>
        </div>

        {/* Message Body */}
        <div className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed space-y-2">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>

        {/* Optional Impact / Warning Box */}
        {impactDetails && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-zinc-300 space-y-1">
            {impactDetails}
          </div>
        )}

        {/* Action Buttons with Symmetric Padding and Single-line Text */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer text-center whitespace-nowrap disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 ${styles.confirmBtn}`}
          >
            {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />}
            <span className="whitespace-nowrap">{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
