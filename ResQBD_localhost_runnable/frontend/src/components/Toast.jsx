// frontend/src/components/Toast.jsx
import React, { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((msg) => {
    setMessage(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          style={{
            position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)",
            background: "var(--surface-dark)", color: "#fff", padding: "12px 20px",
            borderRadius: 8, fontSize: 13.5, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 100, maxWidth: 420, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
