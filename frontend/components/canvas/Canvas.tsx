import React, { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { GridBackground } from "./GridBackground";
import { StickyNote } from "./StickyNote";
import { useBoardStore } from "@/store/boardStore";
import { usePanZoom } from "@/hooks/usePanZoom";
import { debounce } from "@/utils/debounce";
import { useUIStore } from "@/store/uiStore";
import type { Socket } from "socket.io-client";

interface CanvasProps {
  socket: Socket;
  boardId: string;
  userId: string;
  activeTool: string;
  onClearAllRef?: React.MutableRefObject<(() => void) | null>;
  onUndoRef?: React.MutableRefObject<(() => void) | null>;
  onRegisterActionRef?: React.MutableRefObject<((action: CanvasAction) => void) | null>;
  onImageUploadRef?: React.MutableRefObject<((file: File) => void) | null>;
  canvasStateRef?: React.MutableRefObject<{
    setPaths: (paths: DrawPath[]) => void;
    setRects: (rects: DrawRect[]) => void;
    setTexts: (texts: DrawText[]) => void;
    setImages: (images: DrawImage[]) => void;
  } | null>;
}

type CanvasAction =
  | { type: "path"; id: string }
  | { type: "rect"; id: string }
  | { type: "arrow"; id: string }
  | { type: "text"; id: string }
  | { type: "note"; id: string }
  | { type: "image"; id: string };

interface DrawPath {
  id: string;
  points: Array<{ x: number; y: number }>;
  penStyle?: string;
  color?: string;
  createdAt?: number; // Timestamp when path was created
  isNeon?: boolean; // Flag for neon effect
}

interface DrawRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shapeType?: string;
  color?: string;
  arrowAngle?: number;
}

interface DrawArrow {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
}

interface DrawText {
  id: string;
  x: number;
  y: number;
  text: string;
}

interface DrawImage {
  id: string;
  x: number;
  y: number;
  src: string;
  width: number;
  height: number;
}

export const Canvas = ({
  socket,
  boardId,
  userId,
  activeTool,
  onClearAllRef,
  onUndoRef,
  onRegisterActionRef,
  onImageUploadRef,
  canvasStateRef
}: CanvasProps) => {
  const BOARD_SIZE = 20000;
  const BOARD_CENTER = BOARD_SIZE / 2;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<DrawPath | null>(null);
  const isDrawingRectRef = useRef(false);
  const currentRectRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const isDrawingArrowRef = useRef(false);
  const currentArrowRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const isSelectingRef = useRef(false);
  const isMovingRef = useRef(false);
  const moveStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const originalNotePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const selectedNoteIdsRef = useRef<Set<string>>(new Set());
  const isDraggingImageRef = useRef(false);
  const draggedImageIdRef = useRef<string | null>(null);
  const imageDragStartRef = useRef<{ x: number; y: number; imageX: number; imageY: number } | null>(null);
  const isCapturingRef = useRef(false);
  const captureStartRef = useRef<{ x: number; y: number } | null>(null);
  const notes = useBoardStore((state) => state.notes);
  const addNote = useBoardStore((state) => state.addNote);
  const updateNote = useBoardStore((state) => state.updateNote);
  const deleteNote = useBoardStore((state) => state.deleteNote);
  const stickyColor = useUIStore((state) => state.stickyColor);
  const shapeType = useUIStore((state) => state.shapeType);
  const penStyle = useUIStore((state) => state.penStyle);
  const penColor = useUIStore((state) => state.penColor);
  const shapeColor = useUIStore((state) => state.shapeColor);
  const { state, transform, pan, zoom } = usePanZoom();

  // Expose clear/undo/register functions and state setters to parent
  React.useEffect(() => {
    if (onClearAllRef) {
      onClearAllRef.current = () => {
        console.log("[Canvas] Clearing all drawings");
        setPaths([]);
        setRects([]);
        setArrows([]);
        setTexts([]);
        setSelectedNoteIds(new Set());
        setAddingText(null);
        actionStackRef.current = [];
      };
    }
    if (onRegisterActionRef) {
      onRegisterActionRef.current = (action) => {
        actionStackRef.current.push(action);
      };
    }
    if (onUndoRef) {
      onUndoRef.current = () => {
        const action = actionStackRef.current.pop();
        if (!action) return;
        if (action.type === "path") {
          setPaths((prev) => prev.filter((p) => p.id !== action.id));
          socket.emit("board:path:delete", { boardId, id: action.id });
        } else if (action.type === "rect") {
          setRects((prev) => prev.filter((r) => r.id !== action.id));
          socket.emit("board:rect:delete", { boardId, id: action.id });
        } else if (action.type === "arrow") {
          setArrows((prev) => prev.filter((a) => a.id !== action.id));
        } else if (action.type === "text") {
          setTexts((prev) => prev.filter((t) => t.id !== action.id));
          socket.emit("board:text:delete", { boardId, id: action.id });
        } else if (action.type === "note") {
          deleteNote(action.id);
          socket.emit("board:note:delete", { boardId, id: action.id });
        } else if (action.type === "image") {
          setImages((prev) => prev.filter((img) => img.id !== action.id));
          socket.emit("board:image:delete", { boardId, id: action.id });
        }
      };
    }
    if (canvasStateRef) {
      canvasStateRef.current = {
        setPaths,
        setRects,
        setTexts,
        setImages
      };
    }
  }, [onClearAllRef, onUndoRef, onRegisterActionRef, canvasStateRef, boardId, deleteNote, socket]);

  React.useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      pan(rect.width / 2 - BOARD_CENTER, rect.height / 2 - BOARD_CENTER);
    }
  }, []);

  // Socket listeners for drawing deletions and updates
  React.useEffect(() => {
    console.log("[Canvas] Setting up socket listeners for socket:", socket.id);

    const handlePathCreated = ({ path }: any) => {
      console.log("[Canvas] Received path:created event", path.id);
      setPaths((prev) => {
        console.log("[Canvas] Current paths before add:", prev.length);
        const updated = [...prev, path];
        console.log("[Canvas] Updated paths after add:", updated.length);
        return updated;
      });
    };

    const handlePathUpdated = ({ path }: any) => {
      console.log("[Canvas] Received path:updated event", path.id);
      setPaths((prev) =>
        prev.map((p) => (p.id === path.id ? path : p))
      );
    };

    const handlePathDeleted = ({ id }: any) => {
      console.log("[Canvas] Received path:deleted event", id);
      setPaths((prev) => prev.filter((p) => p.id !== id));
    };

    const handleRectCreated = ({ rect }: any) => {
      console.log("[Canvas] Received rect:created event", rect.id);
      setRects((prev) => [...prev, rect]);
    };

    const handleRectUpdated = ({ rect }: any) => {
      console.log("[Canvas] Received rect:updated event", rect.id);
      setRects((prev) =>
        prev.map((r) => (r.id === rect.id ? rect : r))
      );
    };

    const handleRectDeleted = ({ id }: any) => {
      console.log("[Canvas] Received rect:deleted event", id);
      setRects((prev) => prev.filter((r) => r.id !== id));
    };

    const handleTextDeleted = ({ id }: any) => {
      console.log("[Canvas] Received text:deleted event", id);
      setTexts((prev) => prev.filter((t) => t.id !== id));
    };

    const handleImageCreated = ({ image }: any) => {
      console.log("[Canvas] Received image:created event", image.id);
      setImages((prev) => [...prev, image]);
    };

    const handleImageUpdated = ({ image }: any) => {
      console.log("[Canvas] Received image:updated event", image.id);
      setImages((prev) => prev.map((img) => (img.id === image.id ? image : img)));
    };

    const handleImageDeleted = ({ id }: any) => {
      console.log("[Canvas] Received image:deleted event", id);
      setImages((prev) => prev.filter((img) => img.id !== id));
    };

    const handleCleared = () => {
      console.log("[Canvas] Received board:cleared event");
      setPaths([]);
      setRects([]);
      setTexts([]);
      setArrows([]);
      setImages([]);
      actionStackRef.current = [];
    };

    socket.on("board:path:created", handlePathCreated);
    socket.on("board:path:updated", handlePathUpdated);
    socket.on("board:path:deleted", handlePathDeleted);
    socket.on("board:rect:created", handleRectCreated);
    socket.on("board:rect:updated", handleRectUpdated);
    socket.on("board:rect:deleted", handleRectDeleted);
    socket.on("board:text:deleted", handleTextDeleted);
    socket.on("board:image:created", handleImageCreated);
    socket.on("board:image:updated", handleImageUpdated);
    socket.on("board:image:deleted", handleImageDeleted);
    socket.on("board:cleared", handleCleared);

    console.log("[Canvas] Socket listeners attached");

    return () => {
      console.log("[Canvas] Cleaning up socket listeners");
      socket.off("board:path:created", handlePathCreated);
      socket.off("board:path:updated", handlePathUpdated);
      socket.off("board:path:deleted", handlePathDeleted);
      socket.off("board:rect:created", handleRectCreated);
      socket.off("board:rect:updated", handleRectUpdated);
      socket.off("board:rect:deleted", handleRectDeleted);
      socket.off("board:text:deleted", handleTextDeleted);
      socket.off("board:image:created", handleImageCreated);
      socket.off("board:image:updated", handleImageUpdated);
      socket.off("board:image:deleted", handleImageDeleted);
      socket.off("board:cleared", handleCleared);
    };
  }, [socket]);

  // Cleanup expired neon paths
  React.useEffect(() => {
    const fadeOutDuration = 1500; // 1.5 seconds
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setPaths((prev) => 
        prev.filter((path) => {
          if (!path.isNeon || !path.createdAt) return true;
          return (now - path.createdAt) <= fadeOutDuration;
        })
      );
    }, 100); // Check every 100ms

    return () => clearInterval(cleanupInterval);
  }, []);

  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [rects, setRects] = useState<DrawRect[]>([]);
  const [arrows, setArrows] = useState<DrawArrow[]>([]);
  const [texts, setTexts] = useState<DrawText[]>([]);
  const [images, setImages] = useState<DrawImage[]>([]);
  const [addingText, setAddingText] = useState<{ x: number; y: number } | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [captureRect, setCaptureRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const actionStackRef = useRef<CanvasAction[]>([]);

  const captureRegion = async (rect: { x: number; y: number; width: number; height: number }) => {
    if (!containerRef.current) return;
    const { x, y, width, height } = rect;
    if (width < 4 || height < 4) return;

    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
        x,
        y,
        width,
        height,
        ignoreElements: (el) => el.getAttribute("data-capture-overlay") === "true"
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const now = new Date();
        const stamp = now
          .toISOString()
          .replace(/[:.]/g, "-")
          .replace("T", "_")
          .slice(0, 19);
        link.href = url;
        link.download = `whiteboard-capture-${stamp}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (error) {
      console.error("[Canvas] Region capture failed", error);
    }
  };

  // Helper function to check if a point is within a note's bounds (note width is ~192px, height ~96px)
  const isPointInNote = (x: number, y: number, note: typeof notes[0]): boolean => {
    const noteWidth = 192; // w-48 = 12rem = 192px
    const noteHeight = 96; // h-24 = 6rem = 96px
    return x >= note.x && x <= note.x + noteWidth && y >= note.y && y <= note.y + noteHeight;
  };

  const registerAction = (action: CanvasAction) => {
    actionStackRef.current.push(action);
  };

  // Image upload handler
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return;

      // Create an image element to get dimensions
      const img = new Image();
      img.onload = () => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Calculate max dimensions (max 400px width or height)
        const maxSize = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        // Place image at center of viewport
        const viewportCenterX = (rect.width / 2 - state.x) / state.scale;
        const viewportCenterY = (rect.height / 2 - state.y) / state.scale;

        const newImage: DrawImage = {
          id: crypto.randomUUID(),
          x: viewportCenterX - width / 2,
          y: viewportCenterY - height / 2,
          src,
          width,
          height
        };

        setImages((prev) => [...prev, newImage]);
        registerAction({ type: 'image', id: newImage.id });
        socket.emit('board:image:create', { boardId, image: newImage });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Expose image upload handler
  React.useEffect(() => {
    if (onImageUploadRef) {
      onImageUploadRef.current = handleImageUpload;
    }
  }, [onImageUploadRef, state.x, state.y, state.scale]);


  // Check if point is near a path (within threshold distance)
  const isPointNearPath = (x: number, y: number, path: DrawPath, threshold = 10): boolean => {
    return path.points.some((point) => {
      const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
      return distance <= threshold;
    });
  };

  // Check if point is within a rectangle
  const isPointInRect = (x: number, y: number, rect: DrawRect): boolean => {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  };

  // Check if point is near text (within bounding box)
  const isPointNearText = (x: number, y: number, text: DrawText): boolean => {
    const textWidth = text.text.length * 10; // Approximate width
    const textHeight = 20; // Approximate height
    return x >= text.x && x <= text.x + textWidth && y >= text.y - textHeight && y <= text.y;
  };

  // Check if point is within an image
  const isPointInImage = (x: number, y: number, image: DrawImage): boolean => {
    return x >= image.x && x <= image.x + image.width && y >= image.y && y <= image.y + image.height;
  };

  // Handle image drag start
  const handleImagePointerDown = (event: React.PointerEvent, imageId: string) => {
    if (activeTool !== "SELECT") return;
    event.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left - state.x) / state.scale;
    const y = (event.clientY - rect.top - state.y) / state.scale;
    const image = images.find(img => img.id === imageId);
    if (!image) return;

    isDraggingImageRef.current = true;
    draggedImageIdRef.current = imageId;
    imageDragStartRef.current = { x, y, imageX: image.x, imageY: image.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  // Handle image drag move
  const handleImagePointerMove = (event: React.PointerEvent) => {
    if (!isDraggingImageRef.current || !imageDragStartRef.current || !draggedImageIdRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left - state.x) / state.scale;
    const y = (event.clientY - rect.top - state.y) / state.scale;
    
    const dx = x - imageDragStartRef.current.x;
    const dy = y - imageDragStartRef.current.y;
    const newX = imageDragStartRef.current.imageX + dx;
    const newY = imageDragStartRef.current.imageY + dy;

    setImages(prev => prev.map(img => 
      img.id === draggedImageIdRef.current 
        ? { ...img, x: newX, y: newY }
        : img
    ));

    socket.emit("board:image:update", { 
      boardId, 
      image: { 
        ...images.find(img => img.id === draggedImageIdRef.current),
        x: newX, 
        y: newY 
      } 
    });
  };

  // Handle image drag end
  const handleImagePointerUp = (event: React.PointerEvent) => {
    if (isDraggingImageRef.current) {
      isDraggingImageRef.current = false;
      draggedImageIdRef.current = null;
      imageDragStartRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const emitCursor = useMemo(
    () =>
      debounce((x: number, y: number) => {
        socket.emit("presence:cursor", { boardId, userId, position: { x, y } });
      }, 30),
    [boardId, socket, userId]
  );

  const handlePointerMove = (event: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    emitCursor(event.clientX - rect.left, event.clientY - rect.top);

    if (activeTool === "REGION_CAPTURE" && isCapturingRef.current && captureStartRef.current) {
      const x = Math.min(captureStartRef.current.x, event.clientX - rect.left);
      const y = Math.min(captureStartRef.current.y, event.clientY - rect.top);
      const width = Math.abs(event.clientX - rect.left - captureStartRef.current.x);
      const height = Math.abs(event.clientY - rect.top - captureStartRef.current.y);
      setCaptureRect({ x, y, width, height });
      return;
    }

    if (activeTool === "PAN" && isPanningRef.current && lastPointRef.current) {
      const dx = event.movementX || event.clientX - lastPointRef.current.x;
      const dy = event.movementY || event.clientY - lastPointRef.current.y;
      pan(dx, dy);
      lastPointRef.current = { x: event.clientX, y: event.clientY };
    }

    if (activeTool === "SELECT" && isMovingRef.current && moveStartPointRef.current) {
      const x = (event.clientX - rect.left - state.x) / state.scale;
      const y = (event.clientY - rect.top - state.y) / state.scale;
      const dx = x - moveStartPointRef.current.x;
      const dy = y - moveStartPointRef.current.y;

      // Update all selected notes from their original positions (use ref for immediate access)
      selectedNoteIdsRef.current.forEach((noteId) => {
        const originalPos = originalNotePositionsRef.current.get(noteId);
        if (originalPos) {
          const newX = Math.round(originalPos.x + dx);
          const newY = Math.round(originalPos.y + dy);
          updateNote(noteId, { x: newX, y: newY });
          socket.emit("board:note:update", { boardId, id: noteId, x: newX, y: newY });
        }
      });
      return;
    }

    if (activeTool === "PEN" && isDrawingRef.current && currentPathRef.current) {
      const x = (event.clientX - rect.left - state.x) / state.scale;
      const y = (event.clientY - rect.top - state.y) / state.scale;
      currentPathRef.current.points.push({ x, y });
      setPaths((prev) =>
        prev.map((p) => (p.id === currentPathRef.current?.id ? currentPathRef.current : p))
      );
      socket.emit("board:path:update", { boardId, path: currentPathRef.current });
    }

    if (activeTool === "SHAPE" && isDrawingRectRef.current && currentRectRef.current) {
      const x = (event.clientX - rect.left - state.x) / state.scale;
      const y = (event.clientY - rect.top - state.y) / state.scale;
      const startX = currentRectRef.current.startX;
      const startY = currentRectRef.current.startY;
      const arrowAngle = shapeType === "arrow" ? Math.atan2(y - startY, x - startX) : undefined;
      currentRectRef.current.endX = x;
      currentRectRef.current.endY = y;
      setRects((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            x: Math.min(startX, x),
            y: Math.min(startY, y),
            width: Math.abs(x - startX),
            height: Math.abs(y - startY),
            arrowAngle
          };
          socket.emit("board:rect:update", { boardId, rect: updated[lastIdx] });
        }
        return updated;
      });
    }

    if (activeTool === "ARROW" && isDrawingArrowRef.current && currentArrowRef.current) {
      const x = (event.clientX - rect.left - state.x) / state.scale;
      const y = (event.clientY - rect.top - state.y) / state.scale;
      currentArrowRef.current.x2 = x;
      currentArrowRef.current.y2 = y;
      setArrows((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            x2: x,
            y2: y
          };
        }
        return updated;
      });
    }

    if (activeTool === "SELECT" && isSelectingRef.current && currentRectRef.current) {
      const x = (event.clientX - rect.left - state.x) / state.scale;
      const y = (event.clientY - rect.top - state.y) / state.scale;
      const startX = currentRectRef.current.startX;
      const startY = currentRectRef.current.startY;
      currentRectRef.current.endX = x;
      currentRectRef.current.endY = y;
      setRects((prev) => {
        const filtered = prev.filter((r) => !r.id.startsWith("selection-"));
        return [
          ...filtered,
          {
            id: "selection-rect",
            x: Math.min(startX, x),
            y: Math.min(startY, y),
            width: Math.abs(x - startX),
            height: Math.abs(y - startY)
          }
        ];
      });
    }
  };

  const handleWheel = (event: React.WheelEvent) => {
    if (event.ctrlKey) {
      event.preventDefault();
      zoom(-event.deltaY / 500, { x: event.clientX, y: event.clientY });
    } else if (activeTool === "PAN") {
      pan(-event.deltaX, -event.deltaY);
    }
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (activeTool === "REGION_CAPTURE") {
      event.preventDefault();
      event.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      isCapturingRef.current = true;
      captureStartRef.current = { x, y };
      setCaptureRect({ x, y, width: 0, height: 0 });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (activeTool === "PAN") {
      event.preventDefault();
      event.stopPropagation();
      isPanningRef.current = true;
      lastPointRef.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (activeTool === "PEN") {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (event.clientX - rect.left - state.x) / state.scale;
      const y = (event.clientY - rect.top - state.y) / state.scale;

      const isNeon = penStyle === "neon";

      const path: DrawPath = {
        id: crypto.randomUUID(),
        points: [{ x, y }],
        penStyle,
        color: penColor,
        createdAt: isNeon ? Date.now() : undefined, // Add timestamp only for neon
        isNeon: isNeon // Flag for neon rendering
      };
      isDrawingRef.current = true;
      currentPathRef.current = path;
      setPaths((prev) => [...prev, path]);
      registerAction({ type: "path", id: path.id });
      console.log("[Canvas] Emitting path:create", path.id);
      socket.emit("board:path:create", { boardId, path });
      socket.emit("presence:drawing", { boardId, userId, isDrawing: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (activeTool === "SHAPE") {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (event.clientX - rect.left - state.x) / state.scale;
      const y = (event.clientY - rect.top - state.y) / state.scale;

      isDrawingRectRef.current = true;
      currentRectRef.current = { startX: x, startY: y, endX: x, endY: y };
      const arrowAngle: DrawRect["arrowAngle"] = shapeType === "arrow" ? 0 : undefined;
      const newRect: DrawRect = {
        id: crypto.randomUUID(),
        x,
        y,
        width: 0,
        height: 0,
        shapeType,
        color: shapeColor,
        arrowAngle
      };
      setRects((prev) => [...prev, newRect]);
      registerAction({ type: "rect", id: newRect.id });
      socket.emit("board:rect:create", { boardId, rect: newRect });
      socket.emit("presence:drawing", { boardId, userId, isDrawing: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (activeTool === "ARROW") {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (event.clientX - rect.left - state.x) / state.scale;
      const y = (event.clientY - rect.top - state.y) / state.scale;

      isDrawingArrowRef.current = true;
      currentArrowRef.current = { x1: x, y1: y, x2: x, y2: y };
      const newArrow: DrawArrow = {
        id: crypto.randomUUID(),
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        color: "#EF4444"
      };
      setArrows((prev) => [...prev, newArrow]);
      registerAction({ type: "arrow", id: newArrow.id });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (activeTool === "TEXT") {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (event.clientX - rect.left - state.x) / state.scale;
      const y = (event.clientY - rect.top - state.y) / state.scale;

      setAddingText({ x, y });
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 0);
      return;
    }
    if (activeTool === "SELECT") {
      event.preventDefault();
      event.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (event.clientX - rect.left - state.x) / state.scale;
      const y = (event.clientY - rect.top - state.y) / state.scale;

      // Check if clicking on any note (selected or not)
      const clickedNote = notes.find((n) => isPointInNote(x, y, n));

      if (clickedNote) {
        let currentSelection = selectedNoteIds;
        
        // If clicking on an unselected note, select only that note
        if (!selectedNoteIds.has(clickedNote.id)) {
          currentSelection = new Set([clickedNote.id]);
          setSelectedNoteIds(currentSelection);
          selectedNoteIdsRef.current = currentSelection;
        }

        // Start moving the selected note(s) - store original positions
        console.log("SELECT: Start moving notes");
        isMovingRef.current = true;
        moveStartPointRef.current = { x, y };
        
        // Store original positions of all selected notes
        originalNotePositionsRef.current.clear();
        currentSelection.forEach((noteId) => {
          const note = notes.find(n => n.id === noteId);
          if (note) {
            originalNotePositionsRef.current.set(noteId, { x: note.x, y: note.y });
          }
        });
        
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      // Otherwise, start selection rectangle
      console.log("SELECT: Start selection at", x, y);
      isSelectingRef.current = true;
      currentRectRef.current = { startX: x, startY: y, endX: x, endY: y };
      selectedNoteIdsRef.current.clear();
      setSelectedNoteIds(new Set());
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (activeTool === "ERASER") {
      event.preventDefault();
      event.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (event.clientX - rect.left - state.x) / state.scale;
      const y = (event.clientY - rect.top - state.y) / state.scale;

      // Check for sticky note to delete
      const noteToDelete = notes.find((n) => isPointInNote(x, y, n));
      if (noteToDelete) {
        console.log("Erasing note:", noteToDelete.id);
        deleteNote(noteToDelete.id);
        socket.emit("board:note:delete", { boardId, id: noteToDelete.id });
        return;
      }

      // Check for path to delete
      const pathToDelete = paths.find((p) => isPointNearPath(x, y, p));
      if (pathToDelete) {
        console.log("Erasing path:", pathToDelete.id);
        setPaths((prev) => prev.filter((p) => p.id !== pathToDelete.id));
        socket.emit("board:path:delete", { boardId, id: pathToDelete.id });
        return;
      }

      // Check for rectangle to delete
      const rectToDelete = rects.find((r) => !r.id.startsWith("selection-") && isPointInRect(x, y, r));
      if (rectToDelete) {
        console.log("Erasing rect:", rectToDelete.id);
        setRects((prev) => prev.filter((r) => r.id !== rectToDelete.id));
        socket.emit("board:rect:delete", { boardId, id: rectToDelete.id });
        return;
      }

      // Check for text to delete
      const textToDelete = texts.find((t) => isPointNearText(x, y, t));
      if (textToDelete) {
        console.log("Erasing text:", textToDelete.id);
        setTexts((prev) => prev.filter((t) => t.id !== textToDelete.id));
        socket.emit("board:text:delete", { boardId, id: textToDelete.id });
        return;
      }

      // Check for image to delete
      const imageToDelete = images.find((img) => isPointInImage(x, y, img));
      if (imageToDelete) {
        console.log("Erasing image:", imageToDelete.id);
        setImages((prev) => prev.filter((img) => img.id !== imageToDelete.id));
        socket.emit("board:image:delete", { boardId, id: imageToDelete.id });
        return;
      }
      return;
    }
    if (activeTool !== "STICKY") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (event.clientX - rect.left - state.x) / state.scale;
    const y = (event.clientY - rect.top - state.y) / state.scale;

    const note = {
      id: crypto.randomUUID(),
      x: Math.round(x),
      y: Math.round(y),
      text: "New note",
      color: stickyColor
    };

    addNote(note);
    registerAction({ type: "note", id: note.id });
    socket.emit("board:note:create", { boardId, note });
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (activeTool === "REGION_CAPTURE") {
      if (isCapturingRef.current) {
        const rect = containerRef.current?.getBoundingClientRect();
        const start = captureStartRef.current;
        isCapturingRef.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
        if (rect && start) {
          const endX = event.clientX - rect.left;
          const endY = event.clientY - rect.top;
          const nextRect = {
            x: Math.min(start.x, endX),
            y: Math.min(start.y, endY),
            width: Math.abs(endX - start.x),
            height: Math.abs(endY - start.y)
          };
          if (nextRect.width < 4 || nextRect.height < 4) {
            void captureRegion({ x: 0, y: 0, width: rect.width, height: rect.height });
          } else {
            void captureRegion(nextRect);
          }
        }
        captureStartRef.current = null;
        setCaptureRect(null);
      }
      return;
    }
    if (activeTool === "PAN") {
      event.preventDefault();
      event.stopPropagation();
      isPanningRef.current = false;
      lastPointRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (activeTool === "PEN") {
      isDrawingRef.current = false;
      currentPathRef.current = null;
      socket.emit("presence:drawing", { boardId, userId, isDrawing: false });
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (activeTool === "SHAPE") {
      isDrawingRectRef.current = false;
      currentRectRef.current = null;
      socket.emit("presence:drawing", { boardId, userId, isDrawing: false });
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (activeTool === "ARROW") {
      isDrawingArrowRef.current = false;
      currentArrowRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (activeTool === "SELECT") {
      console.log("SELECT: End");
      if (isMovingRef.current) {
        console.log("SELECT: End moving");
        isMovingRef.current = false;
        moveStartPointRef.current = null;
        originalNotePositionsRef.current.clear();
        event.currentTarget.releasePointerCapture(event.pointerId);
        return;
      }

      isSelectingRef.current = false;
      // Find notes within selection rectangle and select them
      const selectionRects = rects.filter((r) => r.id === "selection-rect");
      if (selectionRects.length > 0) {
        const selRect = selectionRects[0];
        const selectedNotes = notes.filter(
          (note) =>
            note.x >= selRect.x &&
            note.x <= selRect.x + selRect.width &&
            note.y >= selRect.y &&
            note.y <= selRect.y + selRect.height
        );
        console.log("Selected notes:", selectedNotes.length, selectedNotes);
        const newSelectedIds = new Set(selectedNotes.map((n) => n.id));
        setSelectedNoteIds(newSelectedIds);
        selectedNoteIdsRef.current = newSelectedIds;
      }
      currentRectRef.current = null;
      // Remove selection rectangle after a short delay so it's visible
      setTimeout(() => {
        setRects((prev) => prev.filter((r) => !r.id.startsWith("selection-")));
      }, 200);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleNoteUpdate = (id: string, text: string) => {
    console.log("[Canvas] handleNoteUpdate called for note:", id, "text:", text, "socket.connected:", socket?.connected);
    if (!socket?.connected) {
      console.warn("[Canvas] Socket not connected, cannot emit update");
      return;
    }
    socket.emit("board:note:update", { boardId, id, text });
  };

  const handleTextInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && addingText) {
      const text = e.currentTarget.value || "Text";
      const newText: DrawText = {
        id: crypto.randomUUID(),
        x: Math.round(addingText.x),
        y: Math.round(addingText.y),
        text
      };
      setTexts((prev) => [...prev, newText]);
      registerAction({ type: "text", id: newText.id });
      socket.emit("board:text:create", { boardId, text: newText });
      setAddingText(null);
    } else if (e.key === "Escape") {
      setAddingText(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden touch-none"
      style={{ cursor: activeTool === "ERASER" ? "not-allowed" : activeTool === "PAN" ? "grab" : "crosshair" }}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      {captureRect && (
        <div
          data-capture-overlay="true"
          className="pointer-events-none absolute border-2 border-dashed border-blue-500 bg-blue-400/10"
          style={{
            left: captureRect.x,
            top: captureRect.y,
            width: captureRect.width,
            height: captureRect.height
          }}
        />
      )}
      <div
        className="absolute left-0 top-0"
        style={{ width: BOARD_SIZE, height: BOARD_SIZE, transform, transformOrigin: "0 0" }}
      >
        <GridBackground size={BOARD_SIZE} />
        <svg className="absolute left-0 top-0" width={BOARD_SIZE} height={BOARD_SIZE}>
          <defs>
            {/* SVG Filters for Neon Glow */}
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlowIntense" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Render images FIRST so drawings appear on top */}
          {images.map((imageItem) => (
            <image
              key={imageItem.id}
              x={imageItem.x}
              y={imageItem.y}
              width={imageItem.width}
              height={imageItem.height}
              href={imageItem.src}
              preserveAspectRatio="xMidYMid meet"
              pointerEvents={activeTool === "SELECT" ? "auto" : "none"}
              style={{ 
                cursor: activeTool === "SELECT" ? 'move' : 'default'
              }}
              {...(activeTool === "SELECT" && {
                onPointerDown: (e) => handleImagePointerDown(e, imageItem.id),
                onPointerMove: handleImagePointerMove,
                onPointerUp: handleImagePointerUp
              })}
            />
          ))}
          {/* Now render paths/drawings on top of images */}
          {paths.map((path) => {
            const style = path.penStyle || "solid";
            const now = Date.now();
            const elapsed = path.createdAt ? now - path.createdAt : 0;
            const fadeOutDuration = 1500; // 1.5 seconds
            const isExpired = elapsed > fadeOutDuration;
            
            // Calculate fade out opacity
            const baseOpacity = style === "highlighter" ? 0.4 : 1;
            const fadeOpacity = path.isNeon 
              ? Math.max(0, 1 - (elapsed / fadeOutDuration))
              : 1;
            const finalOpacity = baseOpacity * fadeOpacity;

            if (isExpired) return null; // Don't render expired paths

            const strokeWidth = style === "marker" 
              ? 6 
              : style === "highlighter" 
              ? 12 
              : style === "neon"
              ? 3
              : style === "pencil" 
              ? 1.5 
              : 2;
            
            const strokeDasharray = style === "dashed" 
              ? "8,4" 
              : style === "dotted" 
              ? "2,4" 
              : "0";
            
            return (
              <path
                key={path.id}
                d={`M ${path.points.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
                fill="none"
                stroke={path.color || "#0EA5E9"}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={strokeDasharray}
                opacity={finalOpacity}
                filter={path.isNeon ? "url(#neonGlowIntense)" : "none"}
                style={{
                  transition: path.isNeon ? "opacity 0.05s linear" : "none"
                }}
              />
            );
          })}
          {arrows.map((arrow) => {
            const dx = arrow.x2 - arrow.x1;
            const dy = arrow.y2 - arrow.y1;
            const length = Math.hypot(dx, dy);
            const t = Math.min(1, Math.max(0, length / 300));
            const strokeWidth = 2 + t * 6;
            const headLength = 10 + t * 16;
            const headWidth = 6 + t * 12;
            const angle = Math.atan2(dy, dx);
            const ux = Math.cos(angle);
            const uy = Math.sin(angle);
            const px = -uy;
            const py = ux;
            const baseX = arrow.x2 - headLength * ux;
            const baseY = arrow.y2 - headLength * uy;
            const x3 = baseX + (headWidth / 2) * px;
            const y3 = baseY + (headWidth / 2) * py;
            const x4 = baseX - (headWidth / 2) * px;
            const y4 = baseY - (headWidth / 2) * py;
            const color = arrow.color || "#EF4444";

            return (
              <g key={arrow.id}>
                <line
                  x1={arrow.x1}
                  y1={arrow.y1}
                  x2={arrow.x2}
                  y2={arrow.y2}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
                <polygon
                  points={`${arrow.x2},${arrow.y2} ${x3},${y3} ${x4},${y4}`}
                  fill={color}
                />
              </g>
            );
          })}
          {rects.map((rect) => {
            const isSelection = rect.id.startsWith("selection-");
            const shapeType = rect.shapeType || "rectangle";
            const shapeColor = rect.color || "#8B5CF6";
            const cx = rect.x + rect.width / 2;
            const cy = rect.y + rect.height / 2;
            const r = Math.min(rect.width, rect.height) / 2;
            const arrowAngle = rect.arrowAngle ?? 0;
            const arrowLength = Math.max(rect.width, rect.height);
            const arrowHeadLength = Math.min(24, 10 + arrowLength * 0.2);
            const arrowHeadWidth = Math.min(18, 6 + arrowLength * 0.15);
            const ux = Math.cos(arrowAngle);
            const uy = Math.sin(arrowAngle);
            const px = -uy;
            const py = ux;
            const lineX1 = cx - (arrowLength / 2) * ux;
            const lineY1 = cy - (arrowLength / 2) * uy;
            const lineX2 = cx + (arrowLength / 2) * ux;
            const lineY2 = cy + (arrowLength / 2) * uy;
            const baseX = lineX2 - arrowHeadLength * ux;
            const baseY = lineY2 - arrowHeadLength * uy;
            const arrowPoints = `${lineX2},${lineY2} ${baseX + (arrowHeadWidth / 2) * px},${baseY + (arrowHeadWidth / 2) * py} ${baseX - (arrowHeadWidth / 2) * px},${baseY - (arrowHeadWidth / 2) * py}`;
            
            return (
              <g key={rect.id}>
                {shapeType === "rectangle" && (
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    fill={isSelection ? "rgba(96, 165, 250, 0.1)" : "none"}
                    stroke={isSelection ? "#0EA5E9" : shapeColor}
                    strokeWidth={isSelection ? "3" : "2"}
                    strokeDasharray={isSelection ? "8,4" : "0"}
                    pointerEvents="none"
                  />
                )}
                {shapeType === "circle" && (
                  <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rect.width / 2}
                    ry={rect.height / 2}
                    fill={isSelection ? "rgba(96, 165, 250, 0.1)" : "none"}
                    stroke={isSelection ? "#0EA5E9" : shapeColor}
                    strokeWidth={isSelection ? "3" : "2"}
                    strokeDasharray={isSelection ? "8,4" : "0"}
                    pointerEvents="none"
                  />
                )}
                {shapeType === "triangle" && (
                  <polygon
                    points={`${cx},${rect.y} ${rect.x + rect.width},${rect.y + rect.height} ${rect.x},${rect.y + rect.height}`}
                    fill={isSelection ? "rgba(96, 165, 250, 0.1)" : "none"}
                    stroke={isSelection ? "#0EA5E9" : shapeColor}
                    strokeWidth={isSelection ? "3" : "2"}
                    strokeDasharray={isSelection ? "8,4" : "0"}
                    pointerEvents="none"
                  />
                )}
                {shapeType === "diamond" && (
                  <polygon
                    points={`${cx},${rect.y} ${rect.x + rect.width},${cy} ${cx},${rect.y + rect.height} ${rect.x},${cy}`}
                    fill={isSelection ? "rgba(96, 165, 250, 0.1)" : "none"}
                    stroke={isSelection ? "#0EA5E9" : shapeColor}
                    strokeWidth={isSelection ? "3" : "2"}
                    strokeDasharray={isSelection ? "8,4" : "0"}
                    pointerEvents="none"
                  />
                )}
                {shapeType === "star" && (
                  <path
                    d={`M ${cx},${rect.y} L ${cx + r * 0.3},${cy - r * 0.3} L ${rect.x + rect.width},${cy} L ${cx + r * 0.3},${cy + r * 0.3} L ${cx},${rect.y + rect.height} L ${cx - r * 0.3},${cy + r * 0.3} L ${rect.x},${cy} L ${cx - r * 0.3},${cy - r * 0.3} Z`}
                    fill={isSelection ? "rgba(96, 165, 250, 0.1)" : "none"}
                    stroke={isSelection ? "#0EA5E9" : shapeColor}
                    strokeWidth={isSelection ? "3" : "2"}
                    strokeDasharray={isSelection ? "8,4" : "0"}
                    pointerEvents="none"
                  />
                )}
                {shapeType === "arrow" && (
                  <>
                    <line
                      x1={lineX1}
                      y1={lineY1}
                      x2={lineX2}
                      y2={lineY2}
                      stroke={isSelection ? "#0EA5E9" : shapeColor}
                      strokeWidth={isSelection ? "3" : "2"}
                      strokeDasharray={isSelection ? "8,4" : "0"}
                      pointerEvents="none"
                    />
                    <polygon
                      points={arrowPoints}
                      fill={isSelection ? "#0EA5E9" : shapeColor}
                      pointerEvents="none"
                    />
                  </>
                )}
                {isSelection && (
                  <>
                    <circle cx={rect.x} cy={rect.y} r="6" fill="#0EA5E9" pointerEvents="none" />
                    <circle cx={rect.x + rect.width} cy={rect.y} r="6" fill="#0EA5E9" pointerEvents="none" />
                    <circle cx={rect.x} cy={rect.y + rect.height} r="6" fill="#0EA5E9" pointerEvents="none" />
                    <circle cx={rect.x + rect.width} cy={rect.y + rect.height} r="6" fill="#0EA5E9" pointerEvents="none" />
                  </>
                )}
              </g>
            );
          })}
          {texts.map((textItem) => (
            <text
              key={textItem.id}
              x={textItem.x}
              y={textItem.y}
              fontSize="16"
              fill="#000"
              fontFamily="system-ui, sans-serif"
            >
              {textItem.text}
            </text>
          ))}
        </svg>
        {notes.map((note) => (
          <StickyNote key={note.id} note={note} onUpdate={handleNoteUpdate} isSelected={selectedNoteIds.has(note.id)} activeTool={activeTool} />
        ))}
      </div>
      {addingText && (
        <input
          ref={textInputRef}
          type="text"
          placeholder="Type text and press Enter..."
          onKeyDown={handleTextInput}
          onBlur={() => setAddingText(null)}
          className="absolute bg-white border-2 border-blue-500 rounded px-2 py-1 text-sm"
          style={{
            left: `${addingText.x * state.scale + state.x}px`,
            top: `${addingText.y * state.scale + state.y}px`
          }}
        />
      )}
    </div>
  );
};
