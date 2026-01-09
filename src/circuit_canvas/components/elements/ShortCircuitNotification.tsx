import { Group, Rect, Text } from "react-konva";
import { useEffect, useState } from "react";

// Optional: playful font
function useComicFont() {
    useEffect(() => {
        if (!document.getElementById('comic-font-sleek')) {
            const link = document.createElement('link');
            link.id = 'comic-font-sleek';
            link.href = 'https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    }, []);
}

// Utility for message sizing
function getBoxSize(message: string) {
    const minWidth = 160, maxWidth = 360, charsPerLine = 29;
    const lines = Math.ceil(message.length / charsPerLine);
    const width = Math.max(minWidth, Math.min(maxWidth, 8.1 * Math.max(17, Math.min(message.length, charsPerLine))));
    const height = 38 + 21 * lines;
    return { width, height, lines };
}

export function ShortCircuitNotification({
    show,
    message,
    offsetX = 0,
    offsetY = 0
}: { show: boolean; message: string; offsetX?: number; offsetY?: number }) {
    useComicFont();
    const [anim, setAnim] = useState({ opacity: show ? 1 : 0, scale: show ? 1 : 0.95 });
    useEffect(() => {
        if (show) setAnim({ opacity: 1, scale: 1 });
        else setAnim({ opacity: 0, scale: 0.95 });
    }, [show]);

    const { width, height } = getBoxSize(message);

    return show ? (
        <Group scaleX={anim.scale} scaleY={anim.scale} listening={false}>
            <Rect
                x={75 + offsetX}
                y={-85 + offsetY}
                width={width}
                height={height}
                fill="#fff"
                opacity={0.1}
                cornerRadius={height / 2.2}
                stroke="gray"
                strokeWidth={5}
                shadowColor="#111"
                shadowBlur={8}
                shadowOffset={{ x: 8, y: 6 }}
                shadowOpacity={0}
                listening={false}
            />
            <Text
                x={85 + offsetX}
                y={-62 + offsetY}
                width={width - 28}
                height={height - 20}
                fill="#161616"
                fontSize={14}
                fontFamily="'Comic Sans MS', cursive"
                align="center"
                text={message}
                opacity={anim.opacity}
                lineHeight={1.3}
                listening={false}
                shadowOpacity={0}
                shadowBlur={8}
                shadowOffset={{ x: 3, y: 4 }}
                shadowColor="#5C81A6"
            />
        </Group>
    ) : null;
}
