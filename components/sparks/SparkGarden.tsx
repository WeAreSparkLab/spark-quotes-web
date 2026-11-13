// components/sparks/SparkGarden.tsx
//
// Native placeholder: the 3D garden is web-only for now, and native shows
// the list view (which is always available on web too).

export interface SparkGardenProps {
  sparks: { id: string; category: string }[];
  selectedId: string | null;
  onSelect(id: string | null): void;
  onUnavailable?(): void;
}

export default function SparkGarden(_props: SparkGardenProps) {
  return null;
}
