import { create } from "zustand";
import { nanoid } from "nanoid";

export interface Point {
  x: number;
  y: number;
}

export interface CursorPresence {
  userId: string;
  name: string;
  color: string;
  position: Point;
  isDrawing?: boolean;
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface BoardState {
  notes: StickyNote[];
  cursors: Record<string, CursorPresence>;
  setNotes: (notes: StickyNote[]) => void;
  addNote: (note: Omit<StickyNote, "id"> & { id?: string }) => void;
  updateNote: (id: string, patch: Partial<StickyNote>) => void;
  deleteNote: (id: string) => void;
  clearNotes: () => void;
  setCursors: (cursors: Record<string, CursorPresence>) => void;
  upsertCursor: (cursor: CursorPresence) => void;
  removeCursor: (userId: string) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  notes: [],
  cursors: {},
  setNotes: (notes) => set({ notes }),
  addNote: (note) =>
    set((state) => ({
      notes: state.notes.some((existing) => existing.id === note.id)
        ? state.notes
        : [...state.notes, { ...note, id: note.id ?? nanoid() }]
    })),
  updateNote: (id, patch) =>
    set((state) => ({
      notes: state.notes.map((note) => (note.id === id ? { ...note, ...patch } : note))
    })),
  deleteNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id)
    })),
  clearNotes: () => set({ notes: [] }),
  setCursors: (cursors) => set({ cursors }),
  upsertCursor: (cursor) =>
    set((state) => ({
      cursors: { ...state.cursors, [cursor.userId]: cursor }
    })),
  removeCursor: (userId) =>
    set((state) => {
      const next = { ...state.cursors };
      delete next[userId];
      return { cursors: next };
    })
}));
