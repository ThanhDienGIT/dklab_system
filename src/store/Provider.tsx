"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { makeStore } from "./store";

export function StoreProvider({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [{ store, persistor }] = useState(makeStore);
  // Ghi cache xuống localStorage ngay khi rời / tải lại trang (không chờ nhịp throttle)
  useEffect(() => {
    const flush = () => void persistor.flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [persistor]);
  return (
    <Provider store={store}>
      {/* Đợi đọc cache từ localStorage (vài ms) rồi mới render => có dữ liệu ngay khi F5 */}
      <PersistGate loading={fallback ?? null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}
