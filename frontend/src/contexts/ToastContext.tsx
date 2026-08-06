import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types';

interface ToastContextType {
  showToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, title, description };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl glass-panel border backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'border-[#42e09a]/40 bg-[#111318]/90 text-white'
                  : toast.type === 'error'
                  ? 'border-red-500/40 bg-[#111318]/90 text-white'
                  : 'border-[#f5b94d]/40 bg-[#111318]/90 text-white'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#42e09a]" />}
                {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-[#f5b94d]" />}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold font-headline text-white">{toast.title}</h4>
                {toast.description && (
                  <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{toast.description}</p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
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
