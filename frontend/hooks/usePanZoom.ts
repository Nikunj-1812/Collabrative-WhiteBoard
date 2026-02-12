import { useCallback, useMemo, useState } from "react";

export interface PanZoomState {
  x: number;
  y: number;
  scale: number;
}

export const usePanZoom = () => {
  const [state, setState] = useState<PanZoomState>({ x: 0, y: 0, scale: 1 });

  const pan = useCallback((dx: number, dy: number) => {
    setState((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const zoom = useCallback((delta: number, origin: { x: number; y: number }) => {
    setState((prev) => {
      const nextScale = Math.min(2, Math.max(0.4, prev.scale + delta));
      const scaleDelta = nextScale / prev.scale;
      return {
        scale: nextScale,
        x: origin.x - (origin.x - prev.x) * scaleDelta,
        y: origin.y - (origin.y - prev.y) * scaleDelta
      };
    });
  }, []);

  const transform = useMemo(
    () => `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
    [state.x, state.y, state.scale]
  );

  return { state, pan, zoom, transform };
};
