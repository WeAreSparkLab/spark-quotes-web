// components/sparks/SparkGarden.web.tsx
//
// The 3D Garden of Saved Sparks. three.js and the scene load lazily, only
// when this view is opened. If WebGL is unavailable the screen falls back to
// the list view via onUnavailable.

import React, { useEffect, useRef } from "react";
import type { SparkGarden as Garden } from "../../worlds/engine";
import type { SparkGardenProps } from "./SparkGarden";

export type { SparkGardenProps } from "./SparkGarden";

export default function SparkGarden({ sparks, selectedId, onSelect, onUnavailable }: SparkGardenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gardenRef = useRef<Garden | null>(null);
  const latest = useRef({ sparks, selectedId, onSelect });
  latest.current = { sparks, selectedId, onSelect };

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const compact = Math.min(window.innerWidth, window.innerHeight) < 700 || (window.matchMedia?.("(pointer: coarse)").matches ?? false);

    (async () => {
      try {
        const { createSparkGarden } = await import("../../worlds/engine");
        if (cancelled) return;
        const g = createSparkGarden(canvas, {
          reduceMotion,
          compact,
          onPick: (id) => latest.current.onSelect(id),
        });
        gardenRef.current = g;
        g.setSparks(latest.current.sparks);
        g.select(latest.current.selectedId);
        requestAnimationFrame(() => { canvas.style.opacity = "1"; });
      } catch (e) {
        console.log("[sparks] 3D unavailable, showing the list", e);
        onUnavailable?.();
      }
    })();

    const onLost = (e: Event) => { e.preventDefault(); onUnavailable?.(); };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", onLost);
      gardenRef.current?.dispose();
      gardenRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { gardenRef.current?.setSparks(sparks); }, [sparks]);
  useEffect(() => { gardenRef.current?.select(selectedId); }, [selectedId]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: "100%", height: "100%", display: "block", opacity: 0, transition: "opacity 600ms ease", borderRadius: 22 }}
    />
  );
}
