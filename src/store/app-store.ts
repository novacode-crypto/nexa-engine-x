import { create } from 'zustand';

interface AppState {
  activeTab: string;
  serverStatus: boolean;
  setActiveTab: (tab: string) => void;
  setServerStatus: (status: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  serverStatus: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setServerStatus: (status) => set({ serverStatus: status })
}));