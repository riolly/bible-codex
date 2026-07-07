import { create } from 'zustand';

/**
 * Ephemeral UI state only (Zustand). Durable presentation lives in the user DB
 * as rules (ADR-0004); this store holds transient view state — what the user is
 * looking at right now, panel open/closed, etc. Seeded minimally for #5.
 */
interface UiState {
  settingsSurfaceOpen: boolean;
  setSettingsSurfaceOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  settingsSurfaceOpen: false,
  setSettingsSurfaceOpen: (open) => set({ settingsSurfaceOpen: open }),
}));
