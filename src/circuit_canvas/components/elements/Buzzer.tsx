import { useEffect, useRef, useState } from "react";
import { Group, Image } from "react-konva";
import { BaseElement, BaseElementProps } from "@/circuit_canvas/components/core/BaseElement";
import { createBuzzerPlayer } from "@/circuit_canvas/utils/buzzerAudio";

interface BuzzerProps extends BaseElementProps {
  electrical?: {
    voltage?: number; // voltage across buzzer
    current?: number;
    power?: number;
  };
}

// Map voltage (0..5V) to audible frequency and volume
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const voltageToFrequency = (v: number) => {
  // map 0..5 -> 200..2000 Hz (log-like mapping gives good perception)
  const vNorm = clamp(v / 5, 0, 1);
  // exponential interpolation
  const minF = 200;
  const maxF = 2000;
  return minF * Math.pow(maxF / minF, vNorm);
};
// Map voltage to perceived volume. Use 9V as full-scale so 9V is the loudest.
// Reduce mid-range loudness so voltages just above 1.5V are noticeably quieter.
const voltageToVolume = (v: number) => {
  const vClamped = clamp(v, 0, 9);
  if (vClamped <= 1.5) {
    // Very quiet on small single-cell batteries
    return 0.03;
  }
  if (vClamped <= 4.5) {
    // Interpolate from quiet (1.5V) up to a modest medium at 4.5V
    const t = (vClamped - 1.5) / (4.5 - 1.5);
    // 0.03 -> 0.25 across this band
    return 0.03 + t * (0.25 - 0.03);
  }
  // Upper region: 4.5V -> 9V maps from medium to near-full
  const t = (vClamped - 4.5) / (9 - 4.5);
  return 0.25 + t * (0.95 - 0.25);
};

export default function Buzzer(props: BuzzerProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const playerRef = useRef<any>(null);
  const lastPlayingRef = useRef(false);
  const lastFreqRef = useRef<number | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/buzzer.svg";
    image.onload = () => setImg(image);
    image.alt = "Buzzer";
    return () => setImg(null);
  }, []);

  useEffect(() => {
    playerRef.current = createBuzzerPlayer();
    return () => {
      playerRef.current?.dispose?.();
      playerRef.current = null;
    };
  }, []);

  // React to electrical changes
  useEffect(() => {
    const v = Math.max(0, props.electrical?.voltage ?? 0);
    const isOn = v > 0.02; // consider >20mV as on
    const player = playerRef.current;
    if (!player) return;

    if (!isOn) {
      if (lastPlayingRef.current) {
        player.stop();
        lastPlayingRef.current = false;
        lastFreqRef.current = null;
      }
      return;
    }

    // Choose frequency/volume based on voltage; for boolean digital high keep steady tone
    const frequency = voltageToFrequency(v);
    const volume = voltageToVolume(v);

    if (!lastPlayingRef.current) {
      player.start(frequency, volume);
      lastPlayingRef.current = true;
      lastFreqRef.current = frequency;
      return;
    }

    // Update if frequency/volume changed significantly
    if (Math.abs((lastFreqRef.current ?? 0) - frequency) > 1) {
      player.update(frequency, volume);
      lastFreqRef.current = frequency;
    }
  }, [props.electrical?.voltage]);

  // Stop on unmount / when simulation is turned off via prop
  useEffect(() => {
    if (!props.isSimulationOn) {
      // ensure buzzer stops when simulation is off
      playerRef.current?.stop?.();
      lastPlayingRef.current = false;
      lastFreqRef.current = null;
    }
  }, [props.isSimulationOn]);

  return (
    <BaseElement {...props}>
      <Group>
        {img && (
          <Image
            image={img}
            x={0}
            y={0}
            width={110}
            height={96}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 8 : 0}
            shadowOffset={{ x: 12, y: -12 }}
            shadowOpacity={0}
          />
        )}
      </Group>
    </BaseElement>
  );
}
