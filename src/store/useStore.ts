import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MemoryEntry {
  value: number;
  unit: string;
  formulaName: string;
  timestamp: number;
}

export interface HistoryEntry {
  formulaId: string;
  formulaName: string;
  solveFor: string;
  result: number;
  unit: string;
  timestamp: number;
}

interface AppState {
  // Navigation
  currentView: "chapters" | "types" | "formulas" | "solver";
  selectedChapter: string | null;
  selectedType: string | null;
  selectedFormula: string | null;

  // Memory
  memory: Record<string, MemoryEntry>;

  // History
  history: HistoryEntry[];

  // Favorites
  favorites: string[];

  // Actions
  setView: (view: AppState["currentView"]) => void;
  selectChapter: (id: string) => void;
  selectType: (id: string) => void;
  selectFormula: (id: string) => void;
  goBack: () => void;
  saveToMemory: (key: string, value: number, unit: string, formulaName: string) => void;
  clearMemory: () => void;
  removeFromMemory: (key: string) => void;
  addToHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  toggleFavorite: (formulaId: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentView: "chapters",
      selectedChapter: null,
      selectedType: null,
      selectedFormula: null,
      memory: {},
      history: [],
      favorites: [],

      setView: (view) => set({ currentView: view }),

      selectChapter: (id) =>
        set({ selectedChapter: id, currentView: "types" }),

      selectType: (id) =>
        set({ selectedType: id, currentView: "formulas" }),

      selectFormula: (id) =>
        set({ selectedFormula: id, currentView: "solver" }),

      goBack: () => {
        const { currentView } = get();
        if (currentView === "solver") {
          set({ currentView: "formulas", selectedFormula: null });
        } else if (currentView === "formulas") {
          set({ currentView: "types", selectedType: null });
        } else if (currentView === "types") {
          set({ currentView: "chapters", selectedChapter: null });
        }
      },

      saveToMemory: (key, value, unit, formulaName) =>
        set((state) => ({
          memory: {
            ...state.memory,
            [key]: { value, unit, formulaName, timestamp: Date.now() },
          },
        })),

      clearMemory: () => set({ memory: {} }),

      removeFromMemory: (key) =>
        set((state) => {
          const { [key]: _, ...rest } = state.memory;
          return { memory: rest };
        }),

      addToHistory: (entry) =>
        set((state) => ({
          history: [entry, ...state.history].slice(0, 50),
        })),

      clearHistory: () => set({ history: [] }),

      toggleFavorite: (formulaId) =>
        set((state) => ({
          favorites: state.favorites.includes(formulaId)
            ? state.favorites.filter((id) => id !== formulaId)
            : [...state.favorites, formulaId],
        })),
    }),
    {
      name: "physics-calculator-storage",
      partialize: (state) => ({
        memory: state.memory,
        history: state.history,
        favorites: state.favorites,
      }),
    }
  )
);
