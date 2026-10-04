import { createContext, useCallback, useContext, useState } from 'react';
import { Check, X } from 'lucide-react';

const ToastContext = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((message, kind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, message, kind }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3600);
  }, []);
  return <ToastContext.Provider value={notify}>
    {children}
    <div className="toast-stack" aria-live="polite">{toasts.map((toast) =>
      <div className={`toast ${toast.kind}`} key={toast.id}><Check size={17} />{toast.message}<button aria-label="Dismiss notification" onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}><X size={16} /></button></div>
    )}</div>
  </ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
