import React, { useState } from "react";
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-2 text-sm font-bold text-text uppercase tracking-wider">
        <HiUserGroup size={16} /> Collaborators
      </div>
      
      {isLeader && cursors.length > 1 && (
        <div className="px-2 flex gap-2">
          <button
            onClick={selectAll}
            className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition dark:bg-blue-900 dark:text-blue-200"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition dark:bg-gray-700 dark:text-gray-200"
          >
            Deselect All
          </button>
        </div>
      )}
      
      <div className="px-2 space-y-2 max-h-32 overflow-y-auto">
        {cursors.map((cursor) => {
          const isCurrentUser = cursor.userId === currentUserId;
          const isCursorLeader = cursor.userId === leaderId;
          const isSelected = selectedUserIds.has(cursor.userId);
          
          return (
            <div
              key={cursor.userId}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition group text-xs ${
                isCurrentUser 
                  ? "bg-blue-50 border border-blue-200 dark:bg-blue-900 dark:border-blue-700" 
                  : isCursorLeader
                  ? "bg-yellow-50 border-2 border-yellow-300 shadow-md dark:bg-yellow-900 dark:border-yellow-600"
                  : isSelected
                  ? "bg-red-50 border border-red-300 dark:bg-red-900 dark:border-red-600"
                  : cursor.isDrawing
                  ? "bg-green-50 border-2 border-green-400 shadow-lg dark:bg-green-900 dark:border-green-600"
                  : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isLeader && !isCurrentUser && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(cursor.userId)}
                    className="w-3 h-3 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                )}
                <div
                  className={`h-2 w-2 rounded-full shadow-md flex-shrink-0 ${isCursorLeader ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
                  style={{ backgroundColor: cursor.color }}
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {cursor.name.split(' ')[0]}
                    {isCurrentUser && " *"}
                  </span>
                  {isCursorLeader && (
                    <span className="inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-yellow-400 text-white">
                      ♔
                    </span>
                  )}
                </div>
              </div>
              {!isCurrentUser && isLeader && !isSelected && (
                <button
                  onClick={() => handleRemoveCollaborator(cursor.userId, cursor.name)}
                  className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition opacity-0 group-hover:opacity-100 flex-shrink-0 dark:bg-red-900 dark:text-red-200"
                  title="Remove collaborator"
                >
                  <HiX size={12} />
                </button>
              )}
              {isCurrentUser && (
                <button
                  onClick={handleLeaveBoard}
                  className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-600 hover:bg-orange-200 transition opacity-0 group-hover:opacity-100 flex-shrink-0 dark:bg-orange-900 dark:text-orange-200"
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
        <div className="px-2 pt-1">
          <button
            onClick={removeSelected}
            className="w-full px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-md flex items-center justify-center gap-1"
          >
            <HiX size={14} />
            Delete {selectedUserIds.size}
          </button>
        </div>
      )}
      
      <div className="px-2 text-xs font-medium text-text/70">
        {cursors.length} online
      </div>
    </div>
  );
};
