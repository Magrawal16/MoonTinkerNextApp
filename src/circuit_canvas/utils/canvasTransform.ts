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

/**
 * Captures a snapshot of the entire canvas with all elements visible
 * Temporarily adjusts the stage scale and position to fit all content
 */
export function captureFullCircuitSnapshot(
    stage: Konva.Stage,
    padding: number = 50
): string {
    // Save current state
    const originalScale = stage.scaleX();
    const originalPosition = { x: stage.x(), y: stage.y() };

    try {
        // Get all nodes (elements) on the stage
        const layer = stage.getLayers()[0];
        if (!layer) return '';

        // Get the bounding box of all content
        const clientRect = layer.getClientRect({ skipTransform: true });
        
        // If no content, return empty string
        if (clientRect.width === 0 || clientRect.height === 0) {
            return stage.toDataURL() || '';
        }

        // Calculate the required scale to fit all content with padding
        const stageWidth = stage.width();
        const stageHeight = stage.height();
        
        const scaleX = (stageWidth - padding * 2) / clientRect.width;
        const scaleY = (stageHeight - padding * 2) / clientRect.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in, only zoom out if needed

        // Calculate position to center the content
        const scaledWidth = clientRect.width * scale;
        const scaledHeight = clientRect.height * scale;
        
        const x = (stageWidth - scaledWidth) / 2 - clientRect.x * scale;
        const y = (stageHeight - scaledHeight) / 2 - clientRect.y * scale;

        // Apply temporary transformation
        stage.scale({ x: scale, y: scale });
        stage.position({ x, y });
        stage.batchDraw();

        // Capture snapshot
        const snapshot = stage.toDataURL() || '';

        return snapshot;
    } finally {
        // Restore original state
        stage.scale({ x: originalScale, y: originalScale });
        stage.position(originalPosition);
        stage.batchDraw();
    }
}
