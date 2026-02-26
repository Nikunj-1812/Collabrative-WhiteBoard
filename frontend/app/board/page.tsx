"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import { HiMenu, HiShare } from "react-icons/hi";

function BoardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [boardId, setBoardId] = useState<string | null>(null);
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  useHotkeys();
  const authUser = useMemo(() => getAuthUser(), []);

  useEffect(() => {
    if (!getAuthToken()) {
      setIsAuthed(false);
      router.replace("/login");
      return;
    }
    setIsAuthed(true);

    // Set board ID from search params
    const id = searchParams?.get("board");
    console.log("[BoardPage] Extracted board ID from URL:", id);
    if (id) {
      console.log("[BoardPage] Setting boardId state to:", id);
      setBoardId(id);
    } else {
      console.log("[BoardPage] No board ID in URL, redirecting to boards list");
      // If no board ID in URL, redirect back to boards list
      router.push("/boards");
    }
  }, [router, searchParams]);

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

  // Only initialize socket when boardId is available
  const socket = useSocket(boardId || "", user);

  console.log("[BoardPage] Current boardId state:", boardId);
  console.log("[BoardPage] Socket will join board:", boardId || "(none)");

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

  // Handle board deletion - redirect all collaborators to boards page
  useEffect(() => {
    const handleBoardDeleted = (payload: { boardId: string }) => {
      console.log("[BoardPage] Board deleted:", payload.boardId);
      alert("This board has been deleted by the owner. Redirecting to your boards...");
      router.push("/boards");
    };

    socket.on("board:deleted", handleBoardDeleted);
    return () => {
      socket.off("board:deleted", handleBoardDeleted);
    };
  }, [socket, router]);

  // Handle leader leaving - redirect all collaborators to boards page
  useEffect(() => {
    const handleLeaderLeft = (payload: { boardId: string; leaderId: string }) => {
      console.log("[BoardPage] Leader left board:", payload.boardId);
      alert("The board leader has left. Redirecting to your boards...");
      router.push("/boards");
    };

    socket.on("board:leader-left", handleLeaderLeft);
    return () => {
      socket.off("board:leader-left", handleLeaderLeft);
    };
  }, [socket, router]);

  // Handle board not found - redirect to boards page
  useEffect(() => {
    const handleBoardNotFound = (payload: { boardId: string }) => {
      console.log("[BoardPage] Board not found:", payload.boardId);
      alert("This board does not exist or has been deleted. Redirecting to your boards...");
      router.push("/boards");
    };

    socket.on("board:not-found", handleBoardNotFound);
    return () => {
      socket.off("board:not-found", handleBoardNotFound);
    };
  }, [socket, router]);

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

  // Show loading state while checking auth or waiting for boardId
  if (isAuthed === null || !boardId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
          <p className="text-base font-medium text-text">Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex h-screen w-screen overflow-hidden bg-bg text-text">
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 md:static md:z-auto md:w-64 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          onAddNote={handleAddNote}
          onClearAll={handleClearAll}
          onImageUpload={handleImageUpload}
          socket={socket}
          boardId={boardId}
          currentUserId={user.id}
          leaderId={leaderId || undefined}
          isMobile
          onClose={() => setIsSidebarOpen(false)}
          className="lg:border-r"
        />
      </div>
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <button
        type="button"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className="pointer-events-auto fixed left-3 top-3 z-[70] flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface/90 text-text shadow-md hover:bg-surface md:hidden"
        aria-label="Open sidebar"
        aria-expanded={isSidebarOpen}
      >
        <HiMenu size={20} />
      </button>
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
        <div className="pointer-events-none absolute left-1/2 bottom-3 z-50 w-[calc(100%-1.5rem)] -translate-x-1/2 sm:bottom-4 sm:w-auto md:top-4 md:bottom-auto">
          <div className="pointer-events-auto flex flex-nowrap items-center justify-start gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl overflow-x-auto sm:justify-center">
            <ToolbarWithClear
              onClearAll={handleClearAll}
              onUndo={handleUndo}
              onToggleFullscreen={handleToggleFullscreen}
              isFullscreen={isFullscreen}
            />
            <div className="mx-1 h-6 w-px bg-gray-300" />
            <button
              onClick={() => setShareDialogOpen(true)}
              className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-11 lg:w-11 rounded-lg flex items-center justify-center border-2 border-green-400 bg-gradient-to-br from-green-50 to-green-100 text-green-600 shadow-md hover:shadow-lg hover:border-green-500 hover:from-green-100 hover:to-green-150 active:scale-95 cursor-pointer transition-all duration-200"
              aria-label="Share board"
              title="Share Board"
            >
              <HiShare size={20} />
            </button>
          </div>
        </div>
        <div className="absolute right-3 top-3 z-40 sm:right-4 sm:top-4">
          <AvatarStack />
        </div>
        <ShareDialog
          boardId={boardId}
          isOpen={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
        />
      </div>
    </main>
  );
}

export default function BoardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-bg">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
            <p className="text-base font-medium text-text">Loading board...</p>
          </div>
        </div>
      }
    >
      <BoardPageContent />
    </Suspense>
  );
}
