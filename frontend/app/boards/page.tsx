"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, clearAuthSession, getAuthToken, getAuthUser } from "@/utils/api";
import { HiX } from "react-icons/hi";

interface Board {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
}

export default function BoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinBoardId, setJoinBoardId] = useState("");

  const user = useMemo(() => getAuthUser(), []);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }

    const loadBoards = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiFetch("/api/boards");
        setBoards(data as Board[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load boards";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadBoards();
  }, [router]);

  const handleDelete = async (boardId: string) => {
    if (!confirm("Delete this board?")) return;
    try {
      await apiFetch(`/api/boards/${boardId}`, { method: "DELETE" });
      setBoards((prev) => prev.filter((board) => board.id !== boardId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
  };

  const handleJoinBoard = () => {
    if (joinBoardId.trim()) {
      router.push(`/board?board=${joinBoardId.trim()}`);
    }
  };

  const profileInitial = user?.name ? user.name[0]?.toUpperCase() : "U";

  const filteredBoards = user
    ? boards.filter((board) => board.ownerId === user.id)
    : boards;

  return (
    <main className="min-h-screen bg-bg px-6 py-10 text-text">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your boards</h1>
            <p className="text-sm text-muted">Manage, open, and organize your workspaces.</p>
          </div>
          <div className="flex flex-col-reverse items-center gap-4 md:flex-row md:gap-3">
            {user && (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface/90 px-4 py-3 shadow-sm backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
                  {profileInitial}
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-text">{user.name}</p>
                  {user.email && <p className="text-muted">{user.email}</p>}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
            <Link
              href="/boards/new"
              className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-blue-600 hover:to-blue-700"
            >
              New board
            </Link>
            <button
              onClick={() => setJoinDialogOpen(true)}
              className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-purple-600 hover:to-purple-700"
            >
              Join Board
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface"
            >
              Logout
            </button>
            </div>
          </div>
        </header>

        {isLoading && <p className="text-sm text-muted">Loading boards...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isLoading && filteredBoards.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-10 text-center">
            <p className="text-lg font-semibold">No boards yet</p>
            <p className="mt-2 text-sm text-muted">Create a new board to start collaborating.</p>
            <Link
              href="/boards/new"
              className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-blue-600 hover:to-blue-700"
            >
              Create board
            </Link>
          </div>
        )}

        {filteredBoards.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredBoards.map((board) => (
              <div
                key={board.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm"
              >
                <div>
                  <h2 className="text-lg font-semibold">{board.title}</h2>
                  <p className="mt-1 text-xs text-muted">Created {new Date(board.createdAt).toLocaleString()}</p>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/board?board=${board.id}`}
                    className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => handleDelete(board.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join Board Dialog */}
      {joinDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl bg-white shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Join Board by ID</h2>
              <button
                onClick={() => {
                  setJoinDialogOpen(false);
                  setJoinBoardId("");
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
                aria-label="Close dialog"
              >
                <HiX size={24} className="text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board ID
                </label>
                <input
                  type="text"
                  placeholder="Paste board ID here..."
                  value={joinBoardId}
                  onChange={(e) => setJoinBoardId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinBoard()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setJoinDialogOpen(false);
                    setJoinBoardId("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinBoard}
                  disabled={!joinBoardId.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
