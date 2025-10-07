export type LedNodePositions = { cathode: { x: number; y: number }; anode: { x: number; y: number } };

// Single source of truth for LED node positions per color
export function getLedNodePositions(color?: string): LedNodePositions {
  const c = (color || 'red').toLowerCase();
  const map: Record<string, LedNodePositions> = {
    red:    { cathode: { x: 14, y: 62 }, anode: { x: 33, y: 62 } },
    green:  { cathode: { x: 15, y: 62 }, anode: { x: 34, y: 61 } },
    blue:   { cathode: { x: 15, y: 62 }, anode: { x: 34, y: 62 } },
    yellow: { cathode: { x: 14, y: 63 }, anode: { x: 33, y: 63 } },
    white:  { cathode: { x: 14.5, y: 62 }, anode: { x: 33.5, y: 62 } },
    orange: { cathode: { x: 14.5, y: 62 }, anode: { x: 33.5, y: 62 } },
  };
  return map[c] || map.red;
}
