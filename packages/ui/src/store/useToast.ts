import { create } from "zustand";

interface ToastState {
  message: string | null;
  type: "success" | "error";
  show: (message: string, type?: "success" | "error") => void;
  dismiss: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  type: "success",
  show: (message, type = "success") => {
    set({ message, type });
    setTimeout(() => set({ message: null }), 4000);
  },
  dismiss: () => set({ message: null }),
}));
