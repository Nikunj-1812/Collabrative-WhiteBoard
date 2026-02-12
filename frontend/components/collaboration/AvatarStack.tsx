import React from "react";
import { useBoardStore } from "@/store/boardStore";

export const AvatarStack = () => {
  const cursors = useBoardStore((state) => Object.values(state.cursors));

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
      {cursors.slice(0, 5).map((cursor) => (
        <div
          key={cursor.userId}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundColor: cursor.color }}
        >
          {cursor.name[0]?.toUpperCase()}
        </div>
      ))}
      <span className="text-muted">{cursors.length} online</span>
    </div>
  );
};
