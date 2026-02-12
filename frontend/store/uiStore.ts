import { create } from "zustand";
import { TOOL_TYPES } from "../constants";

export type ToolType = keyof typeof TOOL_TYPES;

interface UIState {
  activeTool: ToolType;
  isDarkMode: boolean;
  stickyColor: string;
  shapeType: string;
  penStyle: string;
  penColor: string;
  shapeColor: string;
  setTool: (tool: ToolType) => void;
  toggleTheme: () => void;
  setStickyColor: (color: string) => void;
  setShapeType: (shape: string) => void;
  setPenStyle: (style: string) => void;
  setPenColor: (color: string) => void;
  setShapeColor: (color: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTool: "SELECT",
  isDarkMode: false,
  stickyColor: "#FEF3C7",
  shapeType: "rectangle",
  penStyle: "solid",
  penColor: "#0EA5E9",
  shapeColor: "#8B5CF6",
  setTool: (tool) => set({ activeTool: tool }),
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setStickyColor: (color) => set({ stickyColor: color }),
  setShapeType: (shape) => set({ shapeType: shape }),
  setPenStyle: (style) => set({ penStyle: style }),
  setPenColor: (color) => set({ penColor: color }),
  setShapeColor: (color) => set({ shapeColor: color })
}));
