"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Image } from "react-konva";

export default function Battery(props: BaseElementProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/battery.svg";
    image.onload = () => setImg(image);
    image.alt = "Battery";
  }, []);

  return (
    <BaseElement {...props}>
      {img && (
        <Image
          image={img}
          width={160}
          height={80}
          shadowColor={props.selected ? "blue" : undefined}
          shadowBlur={props.selected ? 15 : 0}
          shadowOffset={{ x: 0, y: 0 }}
          shadowOpacity={props.selected ? 0.6 : 0}
        />
      )}
    </BaseElement>
  );
}
