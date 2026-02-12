import React from "react";
import { Button } from "@/components/ui/Button";
import { useBoardStore } from "@/store/boardStore";
import { STICKY_COLORS } from "@/constants/index";
import { useUIStore } from "@/store/uiStore";
import { FaMousePointer, FaPen, FaShapes, FaFont, FaStickyNote, FaEraser, FaHandPaper, FaImage } from 'react-icons/fa';
import { HiTrash, HiMoon, HiSun } from 'react-icons/hi';
import { BsSquareFill, BsCircleFill, BsTriangleFill, BsDiamondFill, BsStarFill, BsArrowRightShort } from 'react-icons/bs';

interface SidebarProps {
  onAddNote: (color: string) => void;
  onClearAll?: () => void;
  onImageUpload?: (file: File) => void;
}

export const Sidebar = ({ onAddNote, onClearAll, onImageUpload }: SidebarProps) => {
  const notes = useBoardStore((state) => state.notes);
  const stickyColor = useUIStore((state) => state.stickyColor);
  const setStickyColor = useUIStore((state) => state.setStickyColor);
  const shapeType = useUIStore((state) => state.shapeType);
  const setShapeType = useUIStore((state) => state.setShapeType);
  const penStyle = useUIStore((state) => state.penStyle);
  const setPenStyle = useUIStore((state) => state.setPenStyle);
  const penColor = useUIStore((state) => state.penColor);
  const setPenColor = useUIStore((state) => state.setPenColor);
  const shapeColor = useUIStore((state) => state.shapeColor);
  const setShapeColor = useUIStore((state) => state.setShapeColor);
  const activeTool = useUIStore((state) => state.activeTool);
  const setTool = useUIStore((state) => state.setTool);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
      // Reset the input so the same file can be selected again
      event.target.value = '';
    }
  };

  const TOOLS = [
    { id: "SELECT", label: "Select", icon: <FaMousePointer size={16} />, key: "V" },
    { id: "PEN", label: "Pen", icon: <FaPen size={16} />, key: "P" },
    { id: "SHAPE", label: "Shape", icon: <FaShapes size={16} />, key: "R" },
    { id: "TEXT", label: "Text", icon: <FaFont size={16} />, key: "T" },
    { id: "STICKY", label: "Sticky Note", icon: <FaStickyNote size={16} />, key: "S" },
    { id: "IMAGE", label: "Image", icon: <FaImage size={16} />, key: "I" },
    { id: "ERASER", label: "Eraser", icon: <FaEraser size={16} />, key: "E" },
    { id: "PAN", label: "Hand", icon: <FaHandPaper size={16} />, key: "H" }
  ];

  const SHAPES = [
    { id: "rectangle", label: "Rectangle", icon: <BsSquareFill size={16} /> },
    { id: "circle", label: "Circle", icon: <BsCircleFill size={16} /> },
    { id: "triangle", label: "Triangle", icon: <BsTriangleFill size={16} /> },
    { id: "diamond", label: "Diamond", icon: <BsDiamondFill size={16} /> },
    { id: "star", label: "Star", icon: <BsStarFill size={16} /> },
    { id: "arrow", label: "Arrow", icon: <BsArrowRightShort size={20} /> }
  ];

  const PEN_STYLES = [
    { id: "solid", label: "Solid", preview: "━━━" },
    { id: "dashed", label: "Dashed", preview: "╍╍╍" },
    { id: "dotted", label: "Dotted", preview: "┄┄┄" },
    { id: "marker", label: "Marker", preview: "━━━", thick: true },
    { id: "highlighter", label: "Highlighter", preview: "▬▬▬", opacity: 0.5 },
    { id: "pencil", label: "Pencil", preview: "╌╌╌" },
    { id: "neon", label: "Neon", preview: "✨", neon: true }
  ];

  const DRAWING_COLORS = [
    { id: "#0EA5E9", label: "Sky Blue" },
    { id: "#8B5CF6", label: "Purple" },
    { id: "#EF4444", label: "Red" },
    { id: "#10B981", label: "Green" },
    { id: "#F59E0B", label: "Orange" },
    { id: "#EC4899", label: "Pink" },
    { id: "#000000", label: "Black" },
    { id: "#6B7280", label: "Gray" }
  ];

  const handleClearClick = () => {
    if (onClearAll) {
      onClearAll();
    }
  };

  return (
    <aside className="pointer-events-auto flex h-full w-64 flex-col gap-4 border-r border-border bg-surface/80 p-4 backdrop-blur overflow-y-auto">
      <div>
        <p className="text-sm font-semibold">Notes</p>
        <p className="text-xs text-muted">{notes.length} active</p>
      </div>

      {/* Drawing Tools */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted">Tools</p>
        <div className="grid grid-cols-2 gap-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setTool(tool.id as never)}
              className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition ${
                activeTool === tool.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-surface hover:bg-bg"
              }`}
            >
              <span className="text-base">{tool.icon}</span>
              <div className="flex flex-col">
                <span className="font-medium">{tool.label}</span>
                <span className="text-[10px] text-muted">{tool.key}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Shape Selector */}
      {activeTool === "SHAPE" && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted">Shape Type</p>
            <div className="grid grid-cols-3 gap-2">
              {SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => setShapeType(shape.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition ${
                    shapeType === shape.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface hover:bg-bg"
                  }`}
                >
                  <span className="text-xl">{shape.icon}</span>
                  <span className="text-[9px]">{shape.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted">Shape Color</p>
            <div className="grid grid-cols-4 gap-2">
              {DRAWING_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setShapeColor(color.id)}
                  className={`h-8 w-8 rounded-md border-2 transition ${
                    shapeColor === color.id
                      ? "border-accent scale-110"
                      : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.id }}
                  aria-label={color.label}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Pen Style Selector */}
      {activeTool === "PEN" && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted">Pen Style</p>
            <div className="grid grid-cols-2 gap-2">
              {PEN_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setPenStyle(style.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition ${
                    penStyle === style.id
                      ? style.neon 
                        ? "border-accent bg-accent/10 text-accent shadow-lg shadow-accent/50"
                        : "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface hover:bg-bg"
                  }`}
                >
                  <span 
                    className="text-lg tracking-wide"
                    style={{ 
                      fontWeight: style.thick ? 'bold' : 'normal',
                      opacity: style.opacity || 1,
                      textShadow: style.neon ? '0 0 8px currentColor' : 'none'
                    }}
                  >
                    {style.preview}
                  </span>
                  <span className="text-[9px]">{style.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted">Pen Color</p>
            <div className="grid grid-cols-4 gap-2">
              {DRAWING_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setPenColor(color.id)}
                  className={`h-8 w-8 rounded-md border-2 transition ${
                    penColor === color.id
                      ? "border-accent scale-110"
                      : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.id }}
                  aria-label={color.label}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Image Upload Section */}
      {activeTool === "IMAGE" && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">Upload Image</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border-2 border-dashed border-accent bg-accent/5 p-4 text-center transition hover:bg-accent/10"
          >
            <div className="flex justify-center mb-2">
              <FaImage size={24} color="currentColor" />
            </div>
            <p className="text-xs font-medium text-accent">Click to upload image</p>
            <p className="text-[10px] text-muted mt-1">All formats supported</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Sticky Colors</p>
        <div className="flex flex-wrap gap-2">
          {STICKY_COLORS.map((color) => (
            <button
              key={color}
              className={`h-8 w-8 rounded-lg shadow-md transition-all hover:scale-110 ${
                stickyColor === color ? "ring-2 ring-blue-500 ring-offset-1 scale-110" : "hover:shadow-lg"
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setStickyColor(color)}
              aria-label="Select sticky note color"
            />
          ))}
        </div>
      </div>
      <div className="mt-auto space-y-2">
        <div className="flex gap-2">
          <button
            onClick={toggleTheme}
            className="flex-1 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 border border-gray-300 shadow-md hover:shadow-lg hover:from-gray-200 hover:to-gray-300 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isDarkMode ? <HiSun size={16} /> : <HiMoon size={16} />} Theme
          </button>
          {onClearAll && (
            <button
              onClick={handleClearClick}
              className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <HiTrash size={16} /> Clear All
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
