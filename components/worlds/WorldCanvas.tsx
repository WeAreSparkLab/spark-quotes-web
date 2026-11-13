// components/worlds/WorldCanvas.tsx
//
// Native placeholder. The 3D worlds are web-only for now (see
// WorldCanvas.web.tsx); on native the painted 2D backdrop is the experience.

import type { WorldId } from "../../worlds/config";

export interface WorldCanvasHandle {
  pulse(): void;
}

export interface WorldCanvasProps {
  world: WorldId;
  /** Stop rendering while something covers the scene. */
  active?: boolean;
  onUnavailable?: () => void;
  handleRef?: React.MutableRefObject<WorldCanvasHandle | null>;
}

export default function WorldCanvas(_props: WorldCanvasProps) {
  return null;
}
