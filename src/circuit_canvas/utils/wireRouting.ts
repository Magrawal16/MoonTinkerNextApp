/**
 * Utility functions for automatic wire routing and path optimization
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Calculate orthogonal (right-angle) wire routing between two points
 * Creates a cleaner, more organized appearance for wires
 * Wires extend straight from nodes before routing to prevent overlap
 */
export function calculateOrthogonalPath(
  start: Point,
  end: Point,
  existingJoints?: Point[],
  wireOffset: number = 0
): Point[] {
  // If user has manually placed joints, respect them
  if (existingJoints && existingJoints.length > 0) {
    return existingJoints;
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Minimum extension distance from nodes to prevent overlap
  const minExtension = 20;

  // If points are very close, create simple straight extension
  if (Math.abs(dx) < minExtension * 2 && Math.abs(dy) < minExtension * 2) {
    return [];
  }

  const joints: Point[] = [];

  // Determine primary direction (horizontal or vertical)
  const isHorizontalDominant = Math.abs(dx) > Math.abs(dy);

  // Use wire offset to prevent parallel wire overlap
  const offsetAmount = wireOffset * 8; // 8 pixels per wire offset level

  if (isHorizontalDominant) {
    // Horizontal dominant routing
    const horizontalDirection = dx > 0 ? 1 : -1;

    // Extend straight from start node horizontally
    const startExtension = {
      x: start.x + minExtension * horizontalDirection,
      y: start.y,
    };
    joints.push(startExtension);

    // Create vertical segment with offset
    const midX = start.x + dx * 0.5;
    
    if (Math.abs(dy) > minExtension) {
      joints.push({
        x: midX,
        y: start.y + offsetAmount,
      });
      joints.push({
        x: midX,
        y: end.y - offsetAmount,
      });
    } else {
      joints.push({
        x: midX,
        y: start.y,
      });
      joints.push({
        x: midX,
        y: end.y,
      });
    }

    // Extend straight to end node horizontally
    const endExtension = {
      x: end.x - minExtension * horizontalDirection,
      y: end.y,
    };
    joints.push(endExtension);
  } else {
    // Vertical dominant routing
    const verticalDirection = dy > 0 ? 1 : -1;

    // Extend straight from start node vertically
    const startExtension = {
      x: start.x,
      y: start.y + minExtension * verticalDirection,
    };
    joints.push(startExtension);

    // Create horizontal segment with offset
    const midY = start.y + dy * 0.5;
    
    if (Math.abs(dx) > minExtension) {
      joints.push({
        x: start.x + offsetAmount,
        y: midY,
      });
      joints.push({
        x: end.x - offsetAmount,
        y: midY,
      });
    } else {
      joints.push({
        x: start.x,
        y: midY,
      });
      joints.push({
        x: end.x,
        y: midY,
      });
    }

    // Extend straight to end node vertically
    const endExtension = {
      x: end.x,
      y: end.y - minExtension * verticalDirection,
    };
    joints.push(endExtension);
  }

  return joints;
}

/**
 * Simplify wire path by removing redundant joints
 * (joints that lie on a straight line between neighbors)
 */
export function simplifyWirePath(points: Point[]): Point[] {
  if (points.length <= 2) return points;

  const simplified: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Check if current point is collinear with neighbors
    const isHorizontal =
      Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;
    const isVertical =
      Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;

    // Only keep the point if it's not collinear (i.e., it's a corner)
    if (!isHorizontal && !isVertical) {
      simplified.push(curr);
    }
  }

  simplified.push(points[points.length - 1]);
  return simplified;
}

/**
 * Snap a point to grid for cleaner alignment
 */
export function snapToGrid(point: Point, gridSize: number = 25): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the closest point on a wire path to a given point
 * Returns the index of the closest joint, or -1 if clicking on start/end segments
 */
export function findClosestJoint(
  clickPoint: Point,
  wirePoints: Point[],
  threshold: number = 10
): number {
  let closestIndex = -1;
  let minDistance = threshold;

  // Check each joint (skip first and last which are node connections)
  for (let i = 1; i < wirePoints.length - 1; i++) {
    const dist = distance(clickPoint, wirePoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  return closestIndex;
}
