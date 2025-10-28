export interface MicrobitImage {
  width: number;
  height: number;
  pixels: number[][];
}


/**
 * Rotate a 5x5 pixel matrix 90° clockwise.
 * old[r][c] -> new[c][4 - r]
 */
function rotate90CW(pixels: number[][]): number[][] {
  const out = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      out[c][4 - r] = pixels[r][c];
    }
  }
  return out;
}

function rotate90CCW(pixels: number[][]): number[][] {
  const out = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      out[4 - c][r] = pixels[r][c];
    }
  }
  return out;
}

// We'll create a helper function to generate images using set_pixel calls
export function createImageFromSetPixel(
  setPixelCalls: Array<[number, number, number]>,
  rotateToVertical: boolean = true // default: produce vertically-oriented image
): MicrobitImage {
  const pixels: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (const [x, y, value] of setPixelCalls) {
    if (x >= 0 && x < 5 && y >= 0 && y < 5) {
      pixels[y][x] = value;
    }
  }
  const finalPixels = rotateToVertical ? rotate90CCW(pixels) : pixels;
  return { width: 5, height: 5, pixels: finalPixels };
}

// Predefined images using set_pixel approach (now vertically oriented)
export const STANDARD_IMAGES: Record<string, MicrobitImage> = {
  HEART: createImageFromSetPixel(
    [
      [2, 0, 9],
      [1, 1, 9],
      [3, 1, 9],
      [0, 2, 9],
      [1, 2, 9],
      [2, 2, 9],
      [3, 2, 9],
      [4, 2, 9],
      [1, 3, 9],
      [2, 3, 9],
      [3, 3, 9],
      [2, 4, 9],
    ],
    true
  ),
  HAPPY: createImageFromSetPixel(
    [
      [0, 0, 9],
      [1, 0, 9],
      [2, 0, 9],
      [3, 0, 9],
      [4, 0, 9],
      [0, 1, 9],
      [4, 1, 9],
      [0, 2, 9],
      [4, 2, 9],
      [1, 3, 9],
      [3, 3, 9],
      [2, 4, 9],
    ],
    true
  ),
  SAD: createImageFromSetPixel(
    [
      [0, 0, 9],
      [1, 0, 9],
      [2, 0, 9],
      [3, 0, 9],
      [4, 0, 9],
      [0, 1, 9],
      [4, 1, 9],
      [0, 2, 9],
      [4, 2, 9],
      [2, 3, 9],
      [1, 4, 9],
      [3, 4, 9],
    ],
    true
  ),
  YES: createImageFromSetPixel(
    [
      [2, 0, 9],
      [1, 1, 9],
      [2, 1, 9],
      [0, 2, 9],
      [1, 2, 9],
      [2, 2, 9],
      [3, 2, 9],
      [4, 2, 9],
      [3, 3, 9],
      [4, 4, 9],
    ],
    true
  ),
  NO: createImageFromSetPixel(
    [
      [0, 0, 9],
      [4, 0, 9],
      [1, 1, 9],
      [3, 1, 9],
      [2, 2, 9],
      [1, 3, 9],
      [3, 3, 9],
      [0, 4, 9],
      [4, 4, 9],
    ],
    true
  ),
  CONFUSED: createImageFromSetPixel(
    [
      [0, 0, 9],
      [1, 0, 9],
      [2, 0, 9],
      [3, 0, 9],
      [4, 0, 9],
      [0, 1, 9],
      [4, 1, 9],
      [2, 2, 9],
      [0, 3, 9],
      [4, 3, 9],
      [0, 4, 9],
      [1, 4, 9],
      [2, 4, 9],
      [3, 4, 9],
      [4, 4, 9],
    ],
    true
  ),
  ANGRY: createImageFromSetPixel(
    [
      [0, 0, 9],
      [4, 0, 9],
      [0, 1, 9],
      [4, 1, 9],
      [1, 2, 9],
      [2, 2, 9],
      [3, 2, 9],
      [0, 3, 9],
      [4, 3, 9],
      [1, 4, 9],
      [3, 4, 9],
    ],
    true
  ),
  SURPRISED: createImageFromSetPixel(
    [
      [0, 0, 9],
      [1, 0, 9],
      [2, 0, 9],
      [3, 0, 9],
      [4, 0, 9],
      [0, 1, 9],
      [4, 1, 9],
      [0, 2, 9],
      [2, 2, 9],
      [4, 2, 9],
      [0, 3, 9],
      [4, 3, 9],
      [1, 4, 9],
      [2, 4, 9],
      [3, 4, 9],
    ],
    true
  ),
  ASLEEP: createImageFromSetPixel(
    [
      [0, 0, 9],
      [4, 0, 9],
      [0, 1, 9],
      [4, 1, 9],
      [1, 2, 9],
      [2, 2, 9],
      [3, 2, 9],
      [0, 3, 9],
      [4, 3, 9],
      [2, 4, 9],
    ],
    true
  ),
  TRIANGLE: createImageFromSetPixel(
    [
      [2, 0, 9],
      [1, 1, 9],
      [2, 1, 9],
      [3, 1, 9],
      [0, 2, 9],
      [1, 2, 9],
      [2, 2, 9],
      [3, 2, 9],
      [4, 2, 9],
    ],
    true
  ),
  CHESSBOARD: createImageFromSetPixel(
    [
      [0, 0, 9],
      [2, 0, 9],
      [4, 0, 9],
      [1, 1, 9],
      [3, 1, 9],
      [0, 2, 9],
      [2, 2, 9],
      [4, 2, 9],
      [1, 3, 9],
      [3, 3, 9],
      [0, 4, 9],
      [2, 4, 9],
      [4, 4, 9],
    ],
    true
  ),
};

// Create image from colon-separated rows like "09090:99999:09990:00900:00090"
export function createImageFromString(str: string, rotateToVertical: boolean = true): MicrobitImage {
  const rows = str.split(":");
  const pixels: number[][] = [];
  for (let y = 0; y < 5; y++) {
    pixels[y] = [];
    const row = rows[y] || "";
    for (let x = 0; x < 5; x++) {
      const ch = row[x] ?? "0";
      const v = parseInt(ch, 10);
      pixels[y][x] = Number.isNaN(v) ? 0 : v;
    }
  }
  const finalPixels = rotateToVertical ? rotate90CCW(pixels) : pixels;
  return { width: 5, height: 5, pixels: finalPixels };
}

export function isValidImage(image: any): boolean {
  return (
    image &&
    typeof image === "object" &&
    image.width === 5 &&
    image.height === 5 &&
    Array.isArray(image.pixels) &&
    image.pixels.length === 5 &&
    image.pixels.every((r: any) => Array.isArray(r) && r.length === 5)
  );
}
