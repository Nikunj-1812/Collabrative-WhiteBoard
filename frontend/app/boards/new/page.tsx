"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, getAuthToken } from "@/utils/api";

export default function NewBoardPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }

    const trimmed = title.trim();
    if (!trimmed) {
      setError("Please enter a board title.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const board = await apiFetch("/api/boards", {
        method: "POST",
        body: JSON.stringify({ title: trimmed })
      });
      router.push(`/board?board=${board.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create board";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg px-6 py-10 text-text">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create new board</h1>
          <p className="text-sm text-muted">Give your board a name so others can recognize it.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <label className="block text-sm font-medium text-muted" htmlFor="title">
            Board title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder="Project kickoff"
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create board"}
            </button>
            <Link href="/boards" className="text-sm font-semibold text-muted hover:text-text">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
