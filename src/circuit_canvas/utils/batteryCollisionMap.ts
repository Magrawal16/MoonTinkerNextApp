export type BatteryType = 'AA' | 'AAA';

interface BatteryCollisionRect { x: number; y: number; width: number; height: number }


// AA battery collision boxes by count
const AA_COLLISION: Record<number, BatteryCollisionRect> = {
  1: { x: 74, y: 14, width: 50, height: 178 },   // single AA
  2: { x: 60, y: 12, width: 112, height: 182 },   // 2x AA
  3: { x: 25, y: 12, width: 132, height: 184 },   // 3x AA
  4: { x: 3, y: 10, width: 192, height: 186 },   // 4x AA
};

// AAA battery collision boxes by count
const AAA_COLLISION: Record<number, BatteryCollisionRect> = {
  1: { x: 62, y: 10, width: 48, height: 166 },
  2: { x: 50, y: 10, width: 80, height: 164 },
  3: { x: 35, y: 11, width: 131, height: 165 },
  4: { x: 16, y: 10, width: 169, height: 167 },
};


export function getBatteryCollisionRect(type: BatteryType, count: number): BatteryCollisionRect {
  const safeCount = count < 1 ? 1 : count > 4 ? 4 : count;
  if (type === 'AAA') {
    return AAA_COLLISION[safeCount] || AAA_COLLISION[1];
  }
  return AA_COLLISION[safeCount] || AA_COLLISION[1];
}
