// batteryNodeMap.ts
// Provides node positions for battery elements based on type (AA/AAA) and count.


export type BatteryType = 'AA' | 'AAA';

interface BatteryNodePos { x1: number; y1: number; x2: number; y2: number }


const AA_POSITIONS: Record<number, BatteryNodePos> = {
  1: { x1: 102.5, y1: 2, x2: 94.5, y2: 2 },
  2: { x1: 120, y1: 1, x2: 110.5, y2: 1 },
  3: { x1: 93.7, y1: 0, x2: 86, y2: 0 },
  4: { x1: 103.2, y1: 0, x2: 95, y2: 0 },
};


const AAA_POSITIONS: Record<number, BatteryNodePos> = {
  1: { x1: 89, y1: 0, x2: 81.5, y2: 0 },
  2: { x1: 93.5, y1: 0, x2: 85, y2: 0 },
  3: { x1: 104, y1: 0, x2: 95, y2: 0 },
  4: { x1: 104, y1: -1, x2: 95, y2: -1 },
};

export function getBatteryNodePositions(type: BatteryType, count: number): BatteryNodePos {
  const safeCount = count < 1 ? 1 : count > 4 ? 4 : count;
  if (type === 'AAA') {
    return AAA_POSITIONS[safeCount] || AAA_POSITIONS[1];
  }
  return AA_POSITIONS[safeCount] || AA_POSITIONS[1];
}
