import { useEffect, useRef } from "react";
import { Circle } from "react-konva";
import Konva from "konva";

interface AnimatedCircleProps {
    x: number;
    y: number;
    scaleFactor?: number;
}

export default function AnimatedCircle({ x, y, scaleFactor = 1 }: AnimatedCircleProps) {
    const circleRef = useRef<Konva.Circle>(null);

    useEffect(() => {
        const anim = new Konva.Animation((frame) => {
            if (!circleRef.current || !frame) return;
            const scale = 1 + 0.2 * Math.sin(frame.time * 0.005);
            circleRef.current.scale({ x: scale, y: scale });
        }, circleRef.current?.getLayer());

        anim.start();
        return () => { anim.stop(); };
    }, []);

    return (
        <Circle
            ref={circleRef}
            x={x}
            y={y}
            radius={5}
            fill="yellow"
            shadowColor="red"
            shadowBlur={10}
            shadowOpacity={0}
            shadowForStrokeEnabled={true}
            stroke="orange"
            strokeWidth={3}
            opacity={100}
            listening={true}
        />
    );
}
