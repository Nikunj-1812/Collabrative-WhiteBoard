"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Canvas } from "@/components/canvas/Canvas";
import { ToolbarWithClear } from "@/components/toolbar/Toolbar";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { CursorLayer } from "@/components/collaboration/CursorLayer";
import { AvatarStack } from "@/components/collaboration/AvatarStack";
import { ShareDialog } from "@/components/collaboration/ShareDialog";
import { CollaboratorsPanel } from "@/components/collaboration/CollaboratorsPanel";
import { useSocket } from "@/hooks/useSocket";
import { useBoardStore } from "@/store/boardStore";
import { useUIStore } from "@/store/uiStore";
import { useHotkeys } from "@/hooks/useHotkeys";
import { randomColor } from "@/utils/randomColor";
import { getAuthToken, getAuthUser } from "@/utils/api";
import { HiShare } from "react-icons/hi";

export default function BoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boardId = searchParams?.get("board") || "default-board";
  const addNote = useBoardStore((state) => state.addNote);
  const clearNotes = useBoardStore((state) => state.clearNotes);
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const activeTool = useUIStore((state) => state.activeTool);
  const canvasClearRef = useRef<(() => void) | null>(null);
  const canvasUndoRef = useRef<(() => void) | null>(null);
  const canvasRegisterActionRef = useRef<((action: { type: string; id: string }) => void) | null>(null);
  const canvasImageUploadRef = useRef<((file: File) => void) | null>(null);
  const canvasStateRef = useRef<{
    setPaths: (paths: any[]) => void;
    setRects: (rects: any[]) => void;
    setTexts: (texts: any[]) => void;
    setImages: (images: any[]) => void;
  } | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  useHotkeys();
  const authUser = useMemo(() => getAuthUser(), []);
  const profileInitial = authUser?.name ? authUser.name[0]?.toUpperCase() : "U";

  useEffect(() => {
    if (!getAuthToken()) {
      setIsAuthed(false);
      router.replace("/login");
      return;
    }
    setIsAuthed(true);
  }, [router]);

  const user = useMemo(
    () => {
      // Use sessionStorage for unique tab identity (not shared across tabs)
      const stored = typeof window !== "undefined" ? sessionStorage.getItem("user_id") : null;
      const userId = authUser?.id || stored || crypto.randomUUID();
      if (typeof window !== "undefined" && !stored) {
        sessionStorage.setItem("user_id", userId);
      }

      // Get or generate a user name (use sessionStorage for per-tab names)
      const storedName = typeof window !== "undefined" ? sessionStorage.getItem("user_name") : null;
      let userName = authUser?.name || storedName;

      if (!userName) {
        // Generate a random user name like "User 1234"
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        userName = `User ${randomNum}`;
        if (typeof window !== "undefined") {
          sessionStorage.setItem("user_name", userName);
        }
      }

      return { id: userId, name: userName, color: randomColor() };
    },
    [authUser]
  );

  const socket = useSocket(boardId, user);

  // Add current user to cursors
  useEffect(() => {
    const upsertCursor = useBoardStore.getState().upsertCursor;
    upsertCursor({
      userId: user.id,
      name: user.name,
      color: user.color,
      position: { x: 0, y: 0 }
    });
  }, [user]);

  // Handle incoming board sync data and leader info
  useEffect(() => {
    const handleBoardSync = (payload: any) => {
      console.log("[BoardPage] Received board:sync with leaderId:", payload.leaderId);
      console.log("[BoardPage] Current user.id:", user.id);

      // Set the leader from server
      if (payload.leaderId) {
        setLeaderId(payload.leaderId);
        console.log("[BoardPage] Leader set to:", payload.leaderId, "Is current user leader?", payload.leaderId === user.id);
      }

      if (payload.paths && canvasStateRef.current) {
        canvasStateRef.current.setPaths(payload.paths);
      }
      if (payload.rects && canvasStateRef.current) {
        canvasStateRef.current.setRects(payload.rects);
      }
      if (payload.texts && canvasStateRef.current) {
        canvasStateRef.current.setTexts(payload.texts);
      }
      if (payload.images && canvasStateRef.current) {
        canvasStateRef.current.setImages(payload.images);
      }
    };

    socket.on("board:sync", handleBoardSync);
    return () => {
      socket.off("board:sync", handleBoardSync);
    };
  }, [socket, user.id]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleAddNote = (color: string) => {
    const note = { id: crypto.randomUUID(), x: 120, y: 120, text: "New note", color };
    addNote(note);
    canvasRegisterActionRef.current?.({ type: "note", id: note.id });
    socket.emit("board:note:create", { boardId, note });
  };

  const handleImageUpload = (file: File) => {
    canvasImageUploadRef.current?.(file);
  };

  const handleUndo = () => {
    canvasUndoRef.current?.();
  };

  const handleToggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    document.documentElement.requestFullscreen?.();
  };

  const handleClearAll = () => {
    console.log("handleClearAll called");
    if (window.confirm("Are you sure you want to clear all notes and drawings?")) {
      console.log("Clearing all notes and drawings");
      clearNotes();
      if (canvasClearRef.current) {
        canvasClearRef.current();
      }
      socket.emit("board:clear", { boardId });
    }
  };

  if (isAuthed === false) {
    return null;
  }

  return (
    <main className="relative flex h-screen w-screen overflow-hidden bg-bg text-text">
      <Sidebar onAddNote={handleAddNote} onClearAll={handleClearAll} onImageUpload={handleImageUpload} />
      <div className="relative flex flex-1">
        <Canvas
          socket={socket}
          boardId={boardId}
          userId={user.id}
          activeTool={activeTool}
          onClearAllRef={canvasClearRef}
          onUndoRef={canvasUndoRef}
          onRegisterActionRef={canvasRegisterActionRef}
          onImageUploadRef={canvasImageUploadRef}
          canvasStateRef={canvasStateRef}
        />
        <CursorLayer />
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 z-50">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl">
            <ToolbarWithClear
              onClearAll={handleClearAll}
              onUndo={handleUndo}
              onToggleFullscreen={handleToggleFullscreen}
              isFullscreen={isFullscreen}
            />
            <div className="mx-1 h-6 w-px bg-gray-300" />
            <button
              onClick={() => setShareDialogOpen(true)}
              className="h-11 w-11 rounded-lg flex items-center justify-center border-2 border-green-400 bg-gradient-to-br from-green-50 to-green-100 text-green-600 shadow-md hover:shadow-lg hover:border-green-500 hover:from-green-100 hover:to-green-150 active:scale-95 cursor-pointer transition-all duration-200"
              aria-label="Share board"
              title="Share Board"
            >
              <HiShare size={20} />
            </button>
          </div>
        </div>
        <div className="absolute right-4 top-4 z-40">
          <AvatarStack />
        </div>
        {authUser && (
          <div className="pointer-events-auto absolute right-4 top-16 z-40 flex items-center gap-3 rounded-2xl border border-border bg-surface/90 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
              {profileInitial}
            </div>
            <div className="text-xs">
              <p className="font-semibold text-text">{authUser.name}</p>
              {authUser.email && <p className="text-muted">{authUser.email}</p>}
            </div>
          </div>
        )}
        <CollaboratorsPanel socket={socket} boardId={boardId} currentUserId={user.id} leaderId={leaderId || undefined} />
        <ShareDialog
          boardId={boardId}
          isOpen={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
        />
      </div>
    </main>
  );
}
