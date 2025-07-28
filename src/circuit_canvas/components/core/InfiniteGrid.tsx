'use client'

import React from 'react'
import { Layer, Line, Rect } from 'react-konva';

type InfiniteGridProps = {
    virtualSize?: number;
    gridSize?: number;
}

const InfiniteGrid: React.FC<InfiniteGridProps> = ({ virtualSize = 10000, gridSize = 10 }) => {
    return (
        <Layer listening={false}>
            {/* Huge background */}
            <Rect
                x={-virtualSize / 2}
                y={-virtualSize / 2}
                width={virtualSize}
                height={virtualSize}
                fill="transparent"
            />

            {/* Vertical grid lines */}
            {Array.from({ length: virtualSize / gridSize }, (_, i) => {
                const x = -virtualSize / 2 + i * gridSize;
                return (
                    <Line
                        key={`v-${i}`}
                        points={[x, -virtualSize / 2, x, virtualSize / 2]}
                        stroke="#e5e7eb"
                        strokeWidth={1.3}
                        strokeDash={[2, 2]}
                    />
                );
            })}

            {/* Horizontal grid lines */}
            {Array.from({ length: virtualSize / gridSize }, (_, i) => {
                const y = -virtualSize / 2 + i * gridSize;
                return (
                    <Line
                        key={`h-${i}`}
                        points={[-virtualSize / 2, y, virtualSize / 2, y]}
                        stroke="#e5e7eb"
                        strokeWidth={1.3}
                        strokeDash={[2, 2]}
                    />
                );
            })}
        </Layer>
    )
}

export default InfiniteGrid