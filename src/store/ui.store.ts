"use client";
import { create } from "zustand";

interface UIState {
    sidebarOpen: boolean;
    mobileSidebarOpen: boolean;
    commandPaletteOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    toggleMobileSidebar: () => void;
    setMobileSidebarOpen: (open: boolean) => void;
    setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
    sidebarOpen: true,
    mobileSidebarOpen: false,
    commandPaletteOpen: false,
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
    setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
