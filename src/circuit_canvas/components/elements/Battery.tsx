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
          shadowColor={props.selected ? "#000000" : undefined}
          shadowBlur={props.selected ? 10 : 0}
          shadowOffset={{ x: 15, y: -15 }}
          shadowOpacity={0}
        />
      )}
    </BaseElement>
  );
}
