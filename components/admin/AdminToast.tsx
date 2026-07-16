"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; message: string; kind: "error" | "success" };
type PushToast = (message: string, kind?: Toast["kind"]) => void;

const ToastContext = createContext<PushToast>(() => {});

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<PushToast>((message, kind = "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div dir="rtl" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-sm rounded-xl px-4 py-2.5 text-sm shadow-lg ${
              t.kind === "error"
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Call with an error string (or newline-joined string[].join("\n")) to
 *  show a dismissing-itself toast instead of a blocking alert(). */
export function useAdminToast() {
  return useContext(ToastContext);
}
