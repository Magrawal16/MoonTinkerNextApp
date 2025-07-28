// utils/canvasTransform.ts
import Konva from "konva";

export function clampScale(scale: number, min = 0.5, max = 2.5): number {
    return Math.min(max, Math.max(min, scale));
}

export function getTransformedPointer(stage: Konva.Stage): { x: number; y: number } | null {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    const scale = stage.scaleX();
    const position = stage.position();

    return {
        x: (pointer.x - position.x) / scale,
        y: (pointer.y - position.y) / scale,
    };
}

export function applyZoom(
    stage: Konva.Stage,
    deltaY: number,
    scaleBy = 1.05,
    minScale = 0.5,
    maxScale = 2.5
): void {
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = deltaY > 0 ? 1 : -1;
    const newScale = clampScale(direction > 0 ? oldScale / scaleBy : oldScale * scaleBy, minScale, maxScale);

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
    };

    stage.position(newPos);
    stage.batchDraw();
}

export function getCanvasOffset(stage: Konva.Stage): { x: number; y: number } {
    return {
        x: stage.x(),
        y: stage.y(),
    };
}
