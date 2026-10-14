import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext } from './toast-context.js';
import ToastStack from '../components/ToastStack.jsx';

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));

    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message, type = 'success', duration = 4000) => {
      const id = ++nextId;
      setToasts((current) => [...current, { id, message, type }]);

      const timer = setTimeout(() => dismissToast(id), duration);
      timers.current.set(id, timer);

      return id;
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
