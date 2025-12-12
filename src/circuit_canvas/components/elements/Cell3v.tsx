"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Image } from "react-konva";

export default function Cell3v(props: BaseElementProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/cell3v.svg";
    image.onload = () => setImg(image);
    image.alt = "3V Cell";
  }, []);

  return (
    <BaseElement {...props}>
      {img && (
        <Image
          image={img}
          width={110}
          height={150}
          shadowColor={props.selected ? "#000000" : undefined}
          shadowBlur={props.selected ? 10 : 0}
          shadowOffset={{ x: 15, y: -15 }}
          shadowOpacity={0}
        />
      )}
    </BaseElement>
  );
}
