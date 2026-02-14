import { useEffect } from "react";
import { useUIStore } from "@/store/uiStore";

const HOTKEYS: Record<string, string> = {
  v: "SELECT",
  p: "PEN",
  a: "ARROW",
  r: "SHAPE",
  t: "TEXT",
  s: "STICKY",
  i: "IMAGE",
  e: "ERASER",
  h: "PAN",
  c: "REGION_CAPTURE"
};

export const useHotkeys = () => {
  const setTool = useUIStore((state) => state.setTool);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Ignore hotkeys when typing in input fields or textareas
      const target = event.target as HTMLElement;
      const activeElement = document.activeElement as HTMLElement;
      
      // Check if currently focused element is an input or textarea
      if (
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const tool = HOTKEYS[key];
      if (tool) {
        event.preventDefault();
        console.log(`Hotkey pressed: ${key} -> ${tool}`);
        setTool(tool as never);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setTool]);
};
