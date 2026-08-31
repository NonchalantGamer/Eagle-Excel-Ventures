import React, { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X, ArrowRight } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  type?: ToastType;
  action?: ToastAction;
  duration?: number;
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, typeOrOptions?: ToastType | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, typeOrOptions?: ToastType | ToastOptions) => {
    // Anti-spam deduplication: Don't show identical toast within 2.5s
    const now = Date.now();
    const lastTime = recentToastsRef.current.get(message);
    if (lastTime && now - lastTime < 2500) {
      return;
    }
    recentToastsRef.current.set(message, now);

    let type: ToastType = 'success';
    let action: ToastAction | undefined = undefined;
    let duration = 4000;

    if (typeof typeOrOptions === 'string') {
      type = typeOrOptions;
    } else if (typeOrOptions && typeof typeOrOptions === 'object') {
      if (typeOrOptions.type) type = typeOrOptions.type;
      if (typeOrOptions.action) action = typeOrOptions.action;
      if (typeOrOptions.duration) duration = typeOrOptions.duration;
    }

    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev.filter(t => t.message !== message), { id, message, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex flex-col gap-2 p-3.5 sm:p-4 rounded-2xl shadow-2xl border text-xs sm:text-sm backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-[#121212]/95 text-zinc-100 border-emerald-500/40 shadow-emerald-950/20'
                : toast.type === 'error'
                ? 'bg-[#121212]/95 text-zinc-100 border-rose-500/40 shadow-rose-950/20'
                : 'bg-[#121212]/95 text-zinc-100 border-[#F27D26]/40 shadow-orange-950/20'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 shrink-0 mt-0.5" />}
              {toast.type === 'info' && <Info className="w-4 h-4 sm:w-5 sm:h-5 text-[#F27D26] shrink-0 mt-0.5" />}
              
              <div className="flex-1 font-medium leading-relaxed">{toast.message}</div>
              
              <button
                onClick={() => removeToast(toast.id)}
                className="text-zinc-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {toast.action && (
              <div className="pl-7 sm:pl-7.5 flex items-center justify-start">
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    removeToast(toast.id);
                  }}
                  className="px-3 py-1 bg-[#F27D26] hover:bg-[#ff8c37] text-black font-extrabold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                >
                  <span>{toast.action.label}</span>
                  <ArrowRight className="w-3 h-3 text-black stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
