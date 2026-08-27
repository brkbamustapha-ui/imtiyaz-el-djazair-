"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { DeviceTier } from "./useDeviceCapability";

/* -------------------------------------------------------------------------
 * An abstract academic campus: a low-poly skyline inside orbital rings, with a
 * light particle field. Deliberately cheap — no post-processing, no textures,
 * no shadow maps — so it stays smooth on mid-range phones.
 * ---------------------------------------------------------------------- */

type SceneProps = {
  tier: DeviceTier;
  intensity: number;
  primary: string;
  accent: string;
  /** Horizontal offset of the campus, in world units (0 recentres it). */
  offsetX: number;
};

function ParticleField({ count, color }: { count: number; color: string }) {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const radius = 6 + Math.random() * 16;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.45) * 14;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
      scales[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    return geo;
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.024;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.4;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.085}
        sizeAttenuation
        color={color}
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function OrbitRing({
  radius,
  tilt,
  speed,
  color,
  opacity,
}: {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  color: string;
  opacity: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * speed;
  });
  return (
    <mesh ref={ref} rotation={tilt}>
      <torusGeometry args={[radius, 0.014, 8, 128]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

/** Abstract campus: towers of varying height on a subtle plinth. */
function CampusCluster({ primary, accent }: { primary: string; accent: string }) {
  const group = useRef<THREE.Group>(null);

  const towers = useMemo(() => {
    // Deterministic layout — no random jitter between renders.
    const layout: { x: number; z: number; h: number; w: number; accent: boolean }[] = [];
    const spec = [
      [-2.6, -1.2, 2.6, 0.62], [-1.5, 0.6, 3.8, 0.54], [-0.4, -1.9, 2.0, 0.7],
      [0.5, 0.3, 4.6, 0.6], [1.7, -1.1, 2.9, 0.64], [2.7, 0.9, 2.2, 0.52],
      [-3.3, 1.4, 1.7, 0.5], [0.1, 2.1, 2.4, 0.56], [3.4, -0.6, 3.2, 0.48],
      [-2.1, 2.4, 1.4, 0.44], [1.2, 2.6, 1.9, 0.46],
    ];
    spec.forEach(([x, z, h, w], index) => {
      layout.push({ x, z, h, w, accent: index === 3 || index === 8 });
    });
    return layout;
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.055;
    group.current.position.y = -1.6 + Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
  });

  return (
    <group ref={group} position={[0, -1.6, 0]}>
      {towers.map((tower, index) => (
        <group key={index} position={[tower.x, tower.h / 2, tower.z]}>
          <mesh>
            <boxGeometry args={[tower.w, tower.h, tower.w]} />
            <meshStandardMaterial
              color={tower.accent ? accent : "#16233f"}
              metalness={0.72}
              roughness={0.28}
              emissive={tower.accent ? accent : primary}
              emissiveIntensity={tower.accent ? 0.22 : 0.08}
            />
          </mesh>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(tower.w, tower.h, tower.w)]} />
            <lineBasicMaterial
              color={tower.accent ? accent : primary}
              transparent
              opacity={tower.accent ? 0.6 : 0.3}
            />
          </lineSegments>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[4.4, 4.5, 96]} />
        <meshBasicMaterial color={accent} transparent opacity={0.28} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.9, 64]} />
        <meshStandardMaterial
          color="#0a1120"
          metalness={0.85}
          roughness={0.4}
          transparent
          opacity={0.55}
        />
      </mesh>
    </group>
  );
}

/** Camera drifts towards the pointer; also driven by touch on mobile. */
function PointerCamera({ strength }: { strength: number }) {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    const damping = Math.min(1, delta * 2.2);
    camera.position.x += (pointer.x * strength - camera.position.x) * damping;
    camera.position.y += (2.4 + pointer.y * strength * 0.6 - camera.position.y) * damping;
    camera.lookAt(target.current);
  });
  return null;
}

export default function HeroScene({ tier, intensity, primary, accent, offsetX }: SceneProps) {
  const particleCount = Math.round(
    (tier === "high" ? 1400 : tier === "medium" ? 620 : 260) * Math.max(0.25, intensity),
  );
  const dpr: [number, number] = tier === "high" ? [1, 1.75] : [1, 1.25];

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: tier === "high", powerPreference: "high-performance", alpha: true }}
      camera={{ position: [0, 2.6, 17], fov: 42 }}
      style={{ pointerEvents: "none" }}
      // Pause rendering when the canvas is off-screen or the tab is hidden.
      frameloop="always"
    >
      <fog attach="fog" args={["#070b14", 15, 38]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 10, 6]} intensity={0.95} color={primary} />
      <directionalLight position={[-8, 4, -6]} intensity={0.7} color={accent} />
      <pointLight position={[3, 6, 2]} intensity={16} distance={24} color={accent} />

      {/* The whole composition sits to one side so the headline keeps a clear
          field of view; on narrow screens it recentres (see `offsetX`). */}
      <group position={[offsetX, -0.35, -1.2]} scale={0.92}>
        <CampusCluster primary={primary} accent={accent} />
        <OrbitRing radius={7.4} tilt={[1.35, 0.2, 0]} speed={0.09} color={primary} opacity={0.32} />
        <OrbitRing radius={9.1} tilt={[1.15, -0.35, 0.4]} speed={-0.06} color={accent} opacity={0.26} />
        {tier !== "low" && (
          <OrbitRing radius={5.6} tilt={[1.5, 0.6, 0.2]} speed={0.13} color={accent} opacity={0.18} />
        )}
      </group>
      <ParticleField count={particleCount} color={primary} />

      <PointerCamera strength={tier === "high" ? 1.5 : 0.8} />
    </Canvas>
  );
}
