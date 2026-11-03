"use client";
import { combineReducers, configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import { api } from "./api";

/** Trên server (SSR) không có localStorage => dùng storage rỗng */
const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };

const session = createSlice({
  name: "session",
  initialState: { userId: null as string | null, tenantId: null as string | null },
  reducers: {
    setSession: (s, a: PayloadAction<{ userId: string; tenantId: string }>) => ({ ...s, ...a.payload }),
  },
});
export const { setSession } = session.actions;

const ui = createSlice({
  name: "ui",
  initialState: { sidebarOpen: false, bookingFilter: "new" as string },
  reducers: {
    toggleSidebar: (s) => ({ ...s, sidebarOpen: !s.sidebarOpen }),
    closeSidebar: (s) => ({ ...s, sidebarOpen: false }),
    setBookingFilter: (s, a: PayloadAction<string>) => ({ ...s, bookingFilter: a.payload }),
  },
});
export const { toggleSidebar, closeSidebar, setBookingFilter } = ui.actions;

const root = combineReducers({ [api.reducerPath]: api.reducer, session: session.reducer, ui: ui.reducer });

/** Đăng xuất / hết phiên: xóa sạch cache (tránh lộ dữ liệu cho người dùng sau trên cùng máy) */
const rootWithReset: typeof root = (state, action) => {
  if (action.type === "session/logout" || action.type === "session/expired") {
    storage.removeItem("persist:dk-admin");
    return root(undefined, action);
  }
  return root(state, action);
};

const persisted = persistReducer(
  { key: "dk-admin", version: 1, storage, whitelist: [api.reducerPath, "session", "ui"], throttle: 300 },
  rootWithReset,
);

export function makeStore() {
  const store = configureStore({
    reducer: persisted,
    middleware: (gDM) =>
      gDM({ serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] } }).concat(api.middleware),
  });
  setupListeners(store.dispatch);
  return { store, persistor: persistStore(store) };
}

export type AppStore = ReturnType<typeof makeStore>["store"];
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
