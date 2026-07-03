import { create } from 'zustand';

/**
 * Ephemeral UI state only (Zustand). Durable presentation lives in the user DB
 * as rules (ADR-0004); this store holds transient view state — what the user is
 * looking at right now, panel open/closed, etc. Seeded minimally for #5.
 */
interface UiState {
  adjustPanelOpen: boolean;
  setAdjustPanelOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  adjustPanelOpen: false,
  setAdjustPanelOpen: (open) => set({ adjustPanelOpen: open }),
}));
