import React from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useUIStore } from "@/store/uiStore";
import { FaMousePointer, FaPen, FaShapes, FaFont, FaStickyNote, FaEraser, FaHandPaper, FaArrowRight, FaCropAlt } from 'react-icons/fa';
import { HiTrash, HiMoon, HiSun, HiArrowLeft, HiArrowsExpand } from 'react-icons/hi';

const TOOLS: Array<{ id: string; label: string; icon: React.ReactNode }> = [
  { id: "SELECT", label: "Select (V)", icon: <FaMousePointer /> },
  { id: "PEN", label: "Pen (P)", icon: <FaPen /> },
  { id: "ARROW", label: "Arrow (A)", icon: <FaArrowRight /> },
  { id: "SHAPE", label: "Shape (R)", icon: <FaShapes /> },
  { id: "TEXT", label: "Text (T)", icon: <FaFont /> },
  { id: "STICKY", label: "Sticky (S)", icon: <FaStickyNote /> },
  { id: "REGION_CAPTURE", label: "Capture (C)", icon: <FaCropAlt /> },
  { id: "PAN", label: "Pan (H)", icon: <FaHandPaper /> }
];

export const Toolbar = () => {
  const activeTool = useUIStore((state) => state.activeTool);
  const setTool = useUIStore((state) => state.setTool);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border-2 border-gray-300 bg-white p-3 shadow-2xl">
      {TOOLS.map((tool) => (
        <IconButton
          key={tool.id}
          active={activeTool === tool.id}
          onClick={() => setTool(tool.id as never)}
          aria-label={`Select ${tool.id} tool`}
          title={tool.label}
        >
          <span className="text-lg">{tool.icon}</span>
        </IconButton>
      ))}
      <div className="mx-2 h-8 w-px bg-gray-400" />
      <IconButton onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
        <HiMoon size={20} />
      </IconButton>
    </div>
  );
};
interface ToolbarWithClearProps {
  onClearAll?: () => void;
  onUndo?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const ToolbarWithClear = ({
  onClearAll,
  onUndo,
  onToggleFullscreen,
  isFullscreen
}: ToolbarWithClearProps) => {
  const activeTool = useUIStore((state) => state.activeTool);
  const setTool = useUIStore((state) => state.setTool);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  const handleClearClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Clear all button clicked");
    if (onClearAll) {
      onClearAll();
    }
  };

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border bg-surface/90 p-2 shadow-toolbar backdrop-blur">
      {TOOLS.map((tool) => (
        <IconButton
          key={tool.id}
          active={activeTool === tool.id}
          onClick={() => setTool(tool.id as never)}
          aria-label={`Select ${tool.id} tool`}
          title={tool.label}
        >
          <span className="text-lg">{tool.icon}</span>
        </IconButton>
      ))}
      <div className="mx-1 h-6 w-px bg-gray-300" />
      {onUndo && (
        <IconButton onClick={onUndo} aria-label="Undo last action" title="Back (Undo)">
          <HiArrowLeft size={18} />
        </IconButton>
      )}
      {onToggleFullscreen && (
        <IconButton
          onClick={onToggleFullscreen}
          aria-label="Toggle fullscreen"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          <HiArrowsExpand size={18} />
        </IconButton>
      )}
      <IconButton onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
        <HiMoon size={20} />
      </IconButton>
      {onClearAll && (
        <>
          <div className="mx-1 h-6 w-px bg-gray-300" />
          <button
            onClick={handleClearClick}
            onPointerDown={(e) => e.stopPropagation()}
            type="button"
            aria-label="Clear all"
            title="Clear all drawings"
            className="pointer-events-auto h-11 w-11 rounded-lg flex items-center justify-center border-2 border-red-400 bg-gradient-to-br from-red-50 to-red-100 text-red-600 shadow-md hover:shadow-lg hover:border-red-500 hover:from-red-100 hover:to-red-150 active:scale-95 cursor-pointer transition-all duration-200"
          >
            <HiTrash size={20} />
          </button>
        </>
      )}
    </div>
  );
};