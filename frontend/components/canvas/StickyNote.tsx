import React, { useState, useEffect } from "react";
import { StickyNote as StickyNoteType, useBoardStore } from "@/store/boardStore";

interface StickyNoteProps {
  note: StickyNoteType;
  onUpdate: (id: string, text: string) => void;
  isSelected?: boolean;
  activeTool?: string;
}

export const StickyNote = ({ note, onUpdate, isSelected, activeTool }: StickyNoteProps) => {
  const [value, setValue] = useState(note.text);
  const updateNote = useBoardStore((state) => state.updateNote);

  // Sync value when note changes from other collaborators
  useEffect(() => {
    console.log("[StickyNote] Note text updated from:", value, "to:", note.text);
    setValue(note.text);
  }, [note.text]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    updateNote(note.id, { text: newValue });
    // Emit update immediately on change
    onUpdate(note.id, newValue);
  };

  const handleBlur = () => {
    if (value !== note.text) {
      onUpdate(note.id, value);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Allow propagation if SELECT tool is active (for selecting/dragging)
    if (activeTool === "SELECT") {
      return;
    }
    // Otherwise stop propagation (for editing with other tools)
    e.stopPropagation();
  };

  return (
    <div
      className={`absolute w-48 rounded-lg p-3 text-sm shadow-md transition-all ${
        isSelected && activeTool === "SELECT" ? "border-2 border-blue-400 shadow-lg" : ""
      }`}
      style={{
        transform: `translate(${note.x}px, ${note.y}px)`,
        backgroundColor: note.color,
        cursor: isSelected && activeTool === "SELECT" ? "move" : "default"
      }}
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        className="h-24 w-full resize-none bg-transparent text-sm text-slate-900 outline-none"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
};
