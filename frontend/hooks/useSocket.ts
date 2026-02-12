import { useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { useBoardStore } from "@/store/boardStore";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export interface SocketPayloads {
  boardSync: {
    notes: Array<{ id: string; x: number; y: number; text: string; color: string }>;
    paths?: Array<{ id: string; points: Array<{ x: number; y: number }>; penStyle?: string; color?: string }>;
    rects?: Array<{ id: string; x: number; y: number; width: number; height: number; shapeType?: string; color?: string }>;
    texts?: Array<{ id: string; x: number; y: number; text: string }>;
  };
}

export const useSocket = (
  boardId: string,
  user: { id: string; name: string; color: string }
) => {
  const setNotes = useBoardStore((state) => state.setNotes);
  const addNote = useBoardStore((state) => state.addNote);
  const updateNote = useBoardStore((state) => state.updateNote);
  const deleteNote = useBoardStore((state) => state.deleteNote);
  const clearNotes = useBoardStore((state) => state.clearNotes);
  const upsertCursor = useBoardStore((state) => state.upsertCursor);
  const removeCursor = useBoardStore((state) => state.removeCursor);

  const socket = useMemo<Socket>(
    () => {
      console.log("[useSocket] Creating new socket instance");
      const newSocket = io(SOCKET_URL, {
        transports: ["websocket"],
        auth: {
          token: "demo-token"
        }
      });

      newSocket.on("connect", () => {
        console.log("[useSocket] Connected! Socket ID:", newSocket.id);
      });

      newSocket.on("disconnect", () => {
        console.log("[useSocket] Disconnected!");
      });

      newSocket.on("connect_error", (error: any) => {
        console.error("[useSocket] Connection error:", error);
      });

      return newSocket;
    },
    []
  );

  useEffect(() => {
    console.log("[useSocket] Setting up event listeners for socket:", socket.id);

    const handleBoardSync = (payload: SocketPayloads["boardSync"]) => {
      console.log("[useSocket] Received board:sync with", payload.paths?.length || 0, "paths");
      setNotes(payload.notes);
    };

    const handleBoardNoteCreated = (note: any) => {
      console.log("[useSocket] Received board:note:created");
      addNote(note);
    };

    const handleBoardNoteUpdated = (note: any) => {
      console.log("[useSocket] Received board:note:updated for note:", note.id, "text:", note.text);
      updateNote(note.id, { text: note.text, x: note.x, y: note.y, color: note.color });
    };

    const handleBoardNoteDeleted = ({ id }: any) => {
      console.log("[useSocket] Received board:note:deleted");
      deleteNote(id);
    };

    const handleBoardCleared = () => {
      console.log("[useSocket] Received board:cleared");
      clearNotes();
    };

    const handlePresenceUpdate = (payload: any) => {
      console.log("[useSocket] Received presence:update");
      upsertCursor(payload);
    };

    const handlePresenceLeave = (payload: { userId: string }) => {
      console.log("[useSocket] Received presence:leave");
      removeCursor(payload.userId);
    };

    const handlePresenceDrawing = (payload: any) => {
      console.log("[useSocket] Received presence:drawing for user:", payload.userId, "isDrawing:", payload.isDrawing);
      const state = useBoardStore.getState();
      const cursor = state.cursors[payload.userId];
      if (cursor) {
        upsertCursor({ ...cursor, isDrawing: payload.isDrawing });
      }
    };

    const handleUserKicked = (payload: { userId: string }) => {
      console.log("[useSocket] Received board:user-kicked for userId:", payload.userId, "Current user:", user.id);
      
      // Only disconnect if this user was kicked
      if (payload.userId === user.id) {
        console.log("[useSocket] This user was kicked, disconnecting...");
        removeCursor(payload.userId);
        socket.disconnect();
        alert("You have been removed from the board by the leader.");
        window.location.href = "about:blank";
      } else {
        // Just remove the kicked user's cursor
        removeCursor(payload.userId);
      }
    };

    socket.on("board:sync", handleBoardSync);
    socket.on("board:note:created", handleBoardNoteCreated);
    socket.on("board:note:updated", handleBoardNoteUpdated);
    socket.on("board:note:deleted", handleBoardNoteDeleted);
    socket.on("board:cleared", handleBoardCleared);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("presence:leave", handlePresenceLeave);
    socket.on("presence:drawing", handlePresenceDrawing);
    socket.on("board:user-kicked", handleUserKicked);

    return () => {
      console.log("[useSocket] Removing event listeners");
      socket.off("board:sync", handleBoardSync);
      socket.off("board:note:created", handleBoardNoteCreated);
      socket.off("board:note:updated", handleBoardNoteUpdated);
      socket.off("board:note:deleted", handleBoardNoteDeleted);
      socket.off("board:cleared", handleBoardCleared);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("presence:leave", handlePresenceLeave);
      socket.off("presence:drawing", handlePresenceDrawing);
      socket.off("board:user-kicked", handleUserKicked);
    };
  }, [socket, setNotes, addNote, updateNote, deleteNote, clearNotes, upsertCursor, removeCursor]);

  useEffect(() => {
    console.log("[useSocket] Joining board:", boardId, "for user:", user.id);
    socket.emit("board:join", { boardId, user });

    return () => {
      console.log("[useSocket] Leaving board:", boardId);
      socket.emit("board:leave", { boardId, userId: user.id });
    };
  }, [socket, boardId, user]);

  return socket;
};
