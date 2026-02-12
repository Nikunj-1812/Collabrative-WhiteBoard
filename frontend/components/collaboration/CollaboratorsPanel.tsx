import React, { useState, useRef } from "react";
import { useBoardStore } from "@/store/boardStore";
import { Socket } from "socket.io-client";
import { HiX, HiUserGroup } from 'react-icons/hi';

interface CollaboratorsPanelProps {
  socket: Socket;
  boardId: string;
  currentUserId?: string;
  leaderId?: string;
}

export const CollaboratorsPanel = ({ socket, boardId, currentUserId, leaderId }: CollaboratorsPanelProps) => {
  const cursors = useBoardStore((state) => Object.values(state.cursors));
  const isLeader = currentUserId === leaderId;
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: window.innerHeight - 300 });
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const newX = e.clientX - dragStartRef.current.offsetX;
    const newY = e.clientY - dragStartRef.current.offsetY;
    setPosition({ x: Math.max(0, newX), y: Math.max(0, newY) });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging]);

  const toggleSelection = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const selectAll = () => {
    const allUserIds = cursors
      .filter(c => c.userId !== currentUserId)
      .map(c => c.userId);
    setSelectedUserIds(new Set(allUserIds));
  };

  const deselectAll = () => {
    setSelectedUserIds(new Set());
  };

  const removeSelected = () => {
    if (selectedUserIds.size === 0) {
      alert("No collaborators selected.");
      return;
    }
    if (confirm(`Remove ${selectedUserIds.size} selected collaborator(s) from the board?`)) {
      selectedUserIds.forEach(userId => {
        console.log(`[CollaboratorsPanel] Removing user ${userId} from board ${boardId}`);
        socket.emit("board:kick-user", { boardId, userId });
      });
      setSelectedUserIds(new Set());
    }
  };

  const handleRemoveCollaborator = (userId: string, userName: string) => {
    if (!isLeader) {
      alert("Only the leader can remove collaborators.");
      return;
    }
    if (userId === currentUserId) {
      alert("You cannot remove yourself from the board.");
      return;
    }
    if (confirm(`Remove ${userName} from the board?`)) {
      console.log(`[CollaboratorsPanel] Removing user ${userId} from board ${boardId}`);
      socket.emit("board:kick-user", { boardId, userId });
    }
  };

  const handleLeaveBoard = () => {
    if (confirm("Are you sure you want to leave this board? You will need to rejoin via the share link.")) {
      console.log(`[CollaboratorsPanel] Leaving board ${boardId}`);
      
      // Emit leave event
      socket.emit("board:leave", { boardId, userId: currentUserId });
      
      // Disconnect the socket
      socket.disconnect();
      
      // Clear user presence
      const removeCursor = useBoardStore.getState().removeCursor;
      removeCursor(currentUserId || '');
      
      // Redirect to blank page
      window.location.href = "about:blank";
    }
  };

  if (cursors.length === 0) return null;

  return (
    <div 
      ref={panelRef}
      className="pointer-events-auto absolute z-40 rounded-2xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <div 
        className="mb-3 px-4 pt-4 pb-2 text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 cursor-grab active:cursor-grabbing bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all rounded-t-2xl border-b-2 border-gray-200 select-none"
        onMouseDown={handleDragStart}
        title="Drag to move"
      >
        <HiUserGroup size={16} /> Active Collaborators
      </div>
      
      {isLeader && cursors.length > 1 && (
        <div className="px-4 pb-2 flex gap-2">
          <button
            onClick={selectAll}
            className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
          >
            Deselect All
          </button>
        </div>
      )}
      
      <div className="px-4 space-y-2 max-h-48 overflow-y-auto">
        {cursors.map((cursor) => {
          const isCurrentUser = cursor.userId === currentUserId;
          const isCursorLeader = cursor.userId === leaderId;
          const isSelected = selectedUserIds.has(cursor.userId);
          
          return (
            <div
              key={cursor.userId}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition group ${
                isCurrentUser 
                  ? "bg-blue-50 border border-blue-200" 
                  : isCursorLeader
                  ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 shadow-md"
                  : isSelected
                  ? "bg-red-50 border border-red-300"
                  : cursor.isDrawing
                  ? "bg-green-50 border-2 border-green-400 shadow-lg shadow-green-300"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2 flex-1">
                {isLeader && !isCurrentUser && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(cursor.userId)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                )}
                <div
                  className={`h-3 w-3 rounded-full shadow-md ${isCursorLeader ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
                  style={{ backgroundColor: cursor.color }}
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-800">
                    {cursor.name}
                    {isCurrentUser && " (You)"}
                  </span>
                  {cursor.isDrawing && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500 text-white shadow-md animate-pulse">
                      ✏️ Drawing
                    </span>
                  )}
                  {isCursorLeader && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 text-white shadow-md border border-yellow-500">
                      LEADER
                    </span>
                  )}
                </div>
              </div>
              {!isCurrentUser && isLeader && !isSelected && (
                <button
                  onClick={() => handleRemoveCollaborator(cursor.userId, cursor.name)}
                  className="ml-2 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition opacity-0 group-hover:opacity-100 flex items-center gap-1"
                  title="Remove collaborator (Leader only)"
                >
                  <HiX size={12} />
                </button>
              )}
              {isCurrentUser && (
                <button
                  onClick={handleLeaveBoard}
                  className="ml-2 px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-600 hover:bg-orange-200 transition opacity-0 group-hover:opacity-100 flex items-center gap-1"
                  title="Leave board"
                >
                  <HiX size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      {isLeader && selectedUserIds.size > 0 && (
        <div className="px-4 pt-2 pb-3">
          <button
            onClick={removeSelected}
            className="w-full px-3 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-md flex items-center justify-center gap-2"
          >
            <HiX size={16} />
            Remove {selectedUserIds.size} Selected
          </button>
        </div>
      )}
      
      <div className="px-4 pb-4 border-t border-gray-200 pt-2 text-xs font-medium text-gray-600">
        {cursors.length} user{cursors.length !== 1 ? "s" : ""} online
      </div>
    </div>
  );
};
