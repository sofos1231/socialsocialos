// FILE: socialsocial/src/store/appState.ts

import create from 'zustand';
import { AppState, getAppState } from '../api/meService';

type AppStateStore = {
  appState: AppState | null;
  isLoading: boolean;
  setAppState: (state: AppState | null) => void;
  fetchAppState: () => Promise<AppState | null>;
  clearAppState: () => void;
};

export const useAppState = create<AppStateStore>((set) => ({
  appState: null,
  isLoading: false,
  setAppState: (state) => set({ appState: state }),
  fetchAppState: async () => {
    set({ isLoading: true });
    try {
      const state = await getAppState();
      set({ appState: state, isLoading: false });
      return state;
    } catch (e) {
      console.log('[appState] fetchAppState error', e);
      set({ appState: null, isLoading: false });
      return null;
    }
  },
  clearAppState: () => set({ appState: null }),
}));

