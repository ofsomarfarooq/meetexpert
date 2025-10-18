import { create } from "zustand";


export const useAuth = create((set) => ({
  user: null,
  token: localStorage.getItem("token") || null,
  setAuth: ({ user, token }) => {
    if (token) localStorage.setItem("token", token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },
}));

