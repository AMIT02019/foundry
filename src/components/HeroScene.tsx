"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/**
 * The hero is a stack of template panes suspended in space — the thing this
 * marketplace actually sells, rendered as the object it is. Panes drift on
 * their own, lean toward the pointer, and fan apart as the page scrolls.
 *
 * Deliberately small: no postprocessing, no loaded textures, no shadows.
 * Everything is generated geometry so the hero costs one draw call per pane.
 */

const PANE_COUNT = 6;

/** Cool spectrum — panes carry the colour so the rest of the page can stay quiet. */
const PALETTE = [
  "#1f4bff",
  "#3d6bff",
  "#6f8cff",
  "#8fa5ff",
  "#2b3a8f",
  "#4f7cff",
  "#a8b8ff",
];

interface PaneProps {
  index: number;
  scroll: React.MutableRefObject<number>;
  pointer: React.MutableRefObject<{ x: number; y: number }>;
}

function Pane({ index, scroll, pointer }: PaneProps) {
  const group = useRef<THREE.Group>(null);

  // Deterministic per-pane offsets — no randomness that would flicker on rerender.
  const seed = useMemo(() => {
    const t = index / PANE_COUNT;
    return {
      baseX: Math.sin(t * Math.PI * 2) * 1.5,
      baseY: (index - (PANE_COUNT - 1) / 2) * 0.3,
      baseZ: Math.cos(t * Math.PI * 2) * 1.6 - index * 0.3,
      drift: 0.35 + (index % 3) * 0.12,
      phase: t * Math.PI * 2,
      tilt: -0.18 + (index % 4) * 0.045,
    };
  }, [index]);

  useFrame((state) => {
    if (!group.current) return;
    const time = state.clock.elapsedTime;
    const s = scroll.current;

    // Panes fan outward and rotate as the hero scrolls away.
    group.current.position.x = seed.baseX * (1 + s * 0.55);
    // (group is offset into the right half by the parent <group> in the scene)
    group.current.position.y =
      seed.baseY + Math.sin(time * seed.drift + seed.phase) * 0.14 - s * 1.6;
    group.current.position.z = seed.baseZ + s * 2.2;

    // Lean toward the pointer, damped so it never feels twitchy.
    const targetRotY = seed.tilt + pointer.current.x * 0.28 + s * 0.5;
    const targetRotX = -pointer.current.y * 0.18 + Math.sin(time * 0.3) * 0.03;
    group.current.rotation.y +=
      (targetRotY - group.current.rotation.y) * 0.06;
    group.current.rotation.x +=
      (targetRotX - group.current.rotation.x) * 0.06;
  });

  const colour = PALETTE[index % PALETTE.length];

  return (
    <group ref={group}>
      {/* The pane itself */}
      <RoundedBox args={[2.4, 1.5, 0.045]} radius={0.05} smoothness={3}>
        <meshStandardMaterial
          color={colour}
          roughness={0.28}
          metalness={0.55}
          envMapIntensity={0.9}
        />
      </RoundedBox>

      {/* Chrome bar — reads as a browser window rather than an abstract slab */}
      <mesh position={[0, 0.62, 0.03]}>
        <planeGeometry args={[2.4, 0.24]} />
        <meshStandardMaterial
          color="#0b1020"
          roughness={0.6}
          metalness={0.2}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* Three window dots */}
      {[-1.02, -0.92, -0.82].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.045]}>
          <circleGeometry args={[0.028, 12]} />
          <meshBasicMaterial color="#8fa5ff" />
        </mesh>
      ))}

      {/* Content lines — suggest a laid-out page without loading anything */}
      {[0.22, 0.02, -0.18, -0.38].map((y, i) => (
        <mesh key={y} position={[-0.5 + i * 0.06, y, 0.03]}>
          <planeGeometry args={[1.2 - i * 0.22, 0.055]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.16 - i * 0.025}
          />
        </mesh>
      ))}
    </group>
  );
}

function Rig({
  scroll,
  pointer,
}: {
  scroll: React.MutableRefObject<number>;
  pointer: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    const targetZ = 7.5 + scroll.current * 2.5;
    camera.position.z += (targetZ - camera.position.z) * 0.05;
    camera.position.x += (pointer.current.x * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (pointer.current.y * 0.35 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function HeroScene({
  scroll,
  pointer,
}: {
  scroll: React.MutableRefObject<number>;
  pointer: React.MutableRefObject<{ x: number; y: number }>;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 7.5], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={2.1} color="#dfe6ff" />
      <directionalLight position={[-5, -2, 2]} intensity={1.1} color="#4f7cff" />
      <pointLight position={[0, 0, 4]} intensity={12} color="#8fa5ff" distance={14} />

      {/* Held to the right of frame so the headline never fights a pane. */}
      <group position={[2.15, 0.2, -0.4]}>
        {Array.from({ length: PANE_COUNT }, (_, i) => (
          <Pane key={i} index={i} scroll={scroll} pointer={pointer} />
        ))}
      </group>

      <Rig scroll={scroll} pointer={pointer} />
    </Canvas>
  );
}
