import { useEffect, useRef, useState } from "react";
import { Group, Image, Text } from "react-konva";
import { BaseElement, BaseElementProps } from "@/circuit_canvas/components/core/BaseElement";
import { motorOmegaToRpm } from "@/circuit_canvas/utils/dcMotorBehavior";

interface DCMotorProps extends BaseElementProps {
  electrical?: {
    voltage?: number;
    current?: number;
    power?: number;
  };
  runtime?: {
    angularSpeed?: number;
  };
}

export default function DCMotor(props: DCMotorProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/DC_Motor.svg";
    image.onload = () => setImg(image);
    image.alt = "DC Motor";
    return () => setImg(null);
  }, []);

  const omega = props.runtime?.angularSpeed ?? 0;
  const rpm = motorOmegaToRpm(omega);
  const rpmDisplay = Math.round(rpm);

  return (
    <BaseElement {...props}>
      <Group>
        {img && (
          <Image
            image={img}
            x={0}
            y={0}
            width={120}
            height={100}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 8 : 0}
            shadowOffset={{ x: 12, y: -12 }}
            shadowOpacity={0}
          />
        )}
        <Text
          x={60}
          y={75}
          text={`${rpmDisplay} rpm`}
          fontSize={10}
          fill="#000000"
          align="center"
          width={100}
          offsetX={50}
        />
      </Group>
    </BaseElement>
  );
}
