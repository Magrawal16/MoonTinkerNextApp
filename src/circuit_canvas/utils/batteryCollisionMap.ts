export type BatteryType = 'AA' | 'AAA';

interface BatteryCollisionRect { x: number; y: number; width: number; height: number }


// AA battery collision boxes by count
const AA_COLLISION: Record<number, BatteryCollisionRect> = {
  1: { x: 134, y: 104, width: 51, height: 178 },   // single AA
  2: { x: 118, y: 102, width: 116, height: 184 },   // 2x AA
  3: { x: 84, y: 100, width: 134, height: 186 },   // 3x AA
  4: { x: 63, y: 100, width: 194, height: 187 },   // 4x AA
};

// AAA battery collision boxes by count
const AAA_COLLISION: Record<number, BatteryCollisionRect> = {
  1: { x: 122, y: 100, width: 48.5, height: 166 },
  2: { x: 108, y: 100, width: 84, height: 165 },
  3: { x: 94, y: 100, width: 132, height: 166 },
  4: { x: 76, y: 100, width: 169, height: 167 },
};


export function getBatteryCollisionRect(type: BatteryType, count: number): BatteryCollisionRect {
  const safeCount = count < 1 ? 1 : count > 4 ? 4 : count;
  if (type === 'AAA') {
    return AAA_COLLISION[safeCount] || AAA_COLLISION[1];
  }
  return AA_COLLISION[safeCount] || AA_COLLISION[1];
}
