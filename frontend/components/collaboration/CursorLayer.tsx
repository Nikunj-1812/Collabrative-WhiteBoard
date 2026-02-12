import React from "react";
import { useBoardStore } from "@/store/boardStore";

export const CursorLayer = () => {
  const cursors = useBoardStore((state) => Object.values(state.cursors));

  return (
    <div className="pointer-events-none absolute inset-0">
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute flex items-center gap-2 text-xs"
          style={{ transform: `translate(${cursor.position.x}px, ${cursor.position.y}px)` }}
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: cursor.color }}
          />
          <span className="rounded-md bg-surface/90 px-2 py-1 text-[10px] text-text shadow-sm">
            {cursor.name}
          </span>
        </div>
      ))}
    </div>
  );
};
