import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    const t = { id, title: toast.title || '', desc: toast.desc || '', type: toast.type || 'info', timeout: toast.timeout ?? 3000 };
    setToasts((prev) => [...prev, t]);
    if (t.timeout > 0) {
      setTimeout(() => remove(id), t.timeout);
    }
    return id;
  }, [remove]);

  const value = useMemo(() => ({ toasts, push, remove }), [toasts, push, remove]);

  // Allow global toasts via window dispatchEvent(new CustomEvent('app:toast', { detail: { title, desc, type, timeout } }))
  useEffect(() => {
    const handler = (e) => {
      const d = e?.detail || {};
      push({ title: d.title, desc: d.desc, type: d.type, timeout: d.timeout });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('app:toast', handler);
      return () => window.removeEventListener('app:toast', handler);
    }
  }, [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 top-3 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-md px-3 space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={[
                'pointer-events-auto rounded-lg border shadow-lg px-4 py-3 text-sm backdrop-blur-md',
                'bg-white/90 border-indigo-200 text-gray-900',
                'dark:bg-zinc-900/90 dark:border-zinc-700 dark:text-zinc-100',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div className={[
                  'h-2 w-2 mt-1.5 rounded-full',
                  t.type === 'success' ? 'bg-emerald-500' : t.type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'
                ].join(' ')} />
                <div className="flex-1">
                  {t.title ? <div className="font-medium">{t.title}</div> : null}
                  {t.desc ? <div className="opacity-80">{t.desc}</div> : null}
                </div>
                <button className="opacity-60 hover:opacity-100" onClick={() => remove(t.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
