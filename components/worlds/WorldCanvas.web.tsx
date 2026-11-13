// components/worlds/WorldCanvas.web.tsx
//
// The living scene behind the words.
//
// Loading order matters here: the quote and the painted 2D backdrop are on
// screen first. Only then — when the browser is idle — do we fetch three.js
// and the world code, build the scene, and fade it in over the backdrop.
// If WebGL is missing or fails, nothing visible breaks: the backdrop stays.

import React, { useEffect, useRef } from "react";
import type { WorldId } from "../../worlds/config";
import type { Engine } from "../../worlds/engine";
import type { WorldCanvasProps } from "./WorldCanvas";

export type { WorldCanvasHandle, WorldCanvasProps } from "./WorldCanvas";

const FADE_MS = 520;

export default function WorldCanvas({ world, active = true, onUnavailable, handleRef }: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const worldRef = useRef<WorldId>(world);
  const shownRef = useRef<WorldId | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Travel: let the scene fade to the backdrop of the new world, swap, return.
  const travel = (to: WorldId) => {
    const canvas = canvasRef.current, engine = engineRef.current;
    if (!canvas || !engine || shownRef.current === to) return;
    if (timer.current) clearTimeout(timer.current);
    const first = shownRef.current === null;
    canvas.style.opacity = "0";
    timer.current = setTimeout(
      () => {
        try {
          engine.setWorld(to);
          shownRef.current = to;
          // one frame to draw before revealing
          requestAnimationFrame(() => requestAnimationFrame(() => { canvas.style.opacity = "1"; }));
        } catch (e) {
          console.log("[worlds] could not build world", e);
          onUnavailable?.();
        }
      },
      first ? 0 : FADE_MS
    );
  };

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const compact = Math.min(window.innerWidth, window.innerHeight) < 700 || (window.matchMedia?.("(pointer: coarse)").matches ?? false);

    const start = async () => {
      try {
        const { createEngine } = await import("../../worlds/engine");
        if (cancelled) return;
        engineRef.current = createEngine(canvas, { reduceMotion, compact });
        travel(worldRef.current);
      } catch (e) {
        console.log("[worlds] 3D unavailable, staying with the 2D backdrop", e);
        onUnavailable?.();
      }
    };

    // Wait for an idle moment so the first paint and the quote are never held up.
    const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: { timeout: number }) => number);
    const idle = ric ? ric(() => start(), { timeout: 1200 }) : window.setTimeout(start, 250);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      engineRef.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const onLost = (e: Event) => { e.preventDefault(); onUnavailable?.(); };
    canvas.addEventListener("webglcontextlost", onLost);

    if (handleRef) handleRef.current = { pulse: () => engineRef.current?.pulse() };

    return () => {
      cancelled = true;
      if (ric) (window as any).cancelIdleCallback?.(idle);
      else clearTimeout(idle);
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("webglcontextlost", onLost);
      if (handleRef) handleRef.current = null;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    worldRef.current = world;
    travel(world);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  useEffect(() => {
    engineRef.current?.setActive(active);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        opacity: 0,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: "none",
      }}
    />
  );
}
