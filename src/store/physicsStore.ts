'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Formula, ChapterInfo } from '@/utils/formulaEngine';

// --- Memory Entry ---
export interface MemoryEntry {
  variable: string;
  value: number;
  unit: string;
  label: string;
  formulaId: string;
  formulaName: string;
  chapterId: string;
  timestamp: number;
}

// --- Calculation History ---
export interface HistoryEntry {
  id: string;
  formulaId: string;
  formulaName: string;
  chapterId: string;
  unknownVar: string;
  result: number;
  unit: string;
  inputs: Record<string, number>;
  timestamp: number;
}

// --- Favorites ---
export interface FavoriteEntry {
  formulaId: string;
  timestamp: number;
}

// --- Navigation State ---
export type NavView = 'chapters' | 'types' | 'formulas' | 'solver';

export interface PhysicsStore {
  // Navigation
  currentView: NavView;
  selectedChapter: ChapterInfo | null;
  selectedTypeId: string | null;
  selectedFormula: Formula | null;

  // Memory System
  memory: Record<string, MemoryEntry>; // keyed by variable name

  // History
  history: HistoryEntry[];

  // Favorites
  favorites: FavoriteEntry[];

  // Search
  searchQuery: string;

  // Actions - Navigation
  setCurrentView: (view: NavView) => void;
  setSelectedChapter: (chapter: ChapterInfo | null) => void;
  setSelectedTypeId: (typeId: string | null) => void;
  setSelectedFormula: (formula: Formula | null) => void;
  navigateToChapter: (chapter: ChapterInfo) => void;
  navigateToType: (chapter: ChapterInfo, typeId: string) => void;
  navigateToFormula: (formula: Formula) => void;
  navigateBack: () => void;

  // Actions - Memory
  saveToMemory: (entry: Omit<MemoryEntry, 'timestamp'>) => void;
  getFromMemory: (variable: string) => MemoryEntry | null;
  clearMemory: () => void;

  // Actions - History
  addToHistory: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;

  // Actions - Favorites
  toggleFavorite: (formulaId: string) => void;
  isFavorite: (formulaId: string) => boolean;

  // Actions - Search
  setSearchQuery: (query: string) => void;
}

export const usePhysicsStore = create<PhysicsStore>()(
  persist(
    (set, get) => ({
      // Navigation
      currentView: 'chapters',
      selectedChapter: null,
      selectedTypeId: null,
      selectedFormula: null,

      // Memory
      memory: {},

      // History
      history: [],

      // Favorites
      favorites: [],

      // Search
      searchQuery: '',

      // Navigation Actions
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedChapter: (chapter) => set({ selectedChapter: chapter }),
      setSelectedTypeId: (typeId) => set({ selectedTypeId: typeId }),
      setSelectedFormula: (formula) => set({ selectedFormula: formula }),

      navigateToChapter: (chapter) =>
        set({
          selectedChapter: chapter,
          currentView: 'types',
          selectedTypeId: null,
          selectedFormula: null,
        }),

      navigateToType: (chapter, typeId) =>
        set({
          selectedChapter: chapter,
          selectedTypeId: typeId,
          currentView: 'formulas',
          selectedFormula: null,
        }),

      navigateToFormula: (formula) =>
        set({
          selectedFormula: formula,
          currentView: 'solver',
        }),

      navigateBack: () => {
        const { currentView } = get();
        switch (currentView) {
          case 'solver':
            set({ currentView: 'formulas', selectedFormula: null });
            break;
          case 'formulas':
            set({ currentView: 'types', selectedTypeId: null });
            break;
          case 'types':
            set({ currentView: 'chapters', selectedChapter: null });
            break;
          default:
            break;
        }
      },

      // Memory Actions
      saveToMemory: (entry) =>
        set((state) => ({
          memory: {
            ...state.memory,
            [entry.variable]: {
              ...entry,
              timestamp: Date.now(),
            },
          },
        })),

      getFromMemory: (variable) => {
        return get().memory[variable] || null;
      },

      clearMemory: () => set({ memory: {} }),

      // History Actions
      addToHistory: (entry) =>
        set((state) => ({
          history: [
            {
              ...entry,
              id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
            },
            ...state.history,
          ].slice(0, 100), // Keep last 100 entries
        })),

      clearHistory: () => set({ history: [] }),

      // Favorites Actions
      toggleFavorite: (formulaId) =>
        set((state) => {
          const exists = state.favorites.find((f) => f.formulaId === formulaId);
          if (exists) {
            return {
              favorites: state.favorites.filter((f) => f.formulaId !== formulaId),
            };
          }
          return {
            favorites: [
              ...state.favorites,
              { formulaId, timestamp: Date.now() },
            ],
          };
        }),

      isFavorite: (formulaId) => {
        return get().favorites.some((f) => f.formulaId === formulaId);
      },

      // Search Actions
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: 'physics-calculator-store',
      partialize: (state) => ({
        memory: state.memory,
        history: state.history,
        favorites: state.favorites,
      }),
    }
  )
);
