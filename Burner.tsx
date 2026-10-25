import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from '../../simulation/flightController';
import { BURNER_PALETTES } from '../../simulation/balloonPresets';
import type { BurnerEffect } from '../../types/balloon';

export const BURNER_Y = 2.55;

interface Props {
  /** 'live' reads the flight simulation; 'demo' pulses on its own (home screen). */
  mode: 'live' | 'demo';
  effect?: BurnerEffect;
}

/** Burner assembly with a layered, flickering flame and a warm point light. */
export function Burner({ mode, effect = 'classic' }: Props) {
  const pal = BURNER_PALETTES[effect];
  const flame = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const level = useRef(0);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const on =
      mode === 'live' ? runtime.state.burnerOn : Math.sin(t * 0.6) > 0.15; // demo: periodic bursts
    level.current += ((on ? 1 : 0) - level.current) * (1 - Math.exp(-dt * (on ? 12 : 6)));
    const l = level.current;
    const g = flame.current;
    if (g) {
      g.visible = l > 0.02;
      const flicker = 1 + 0.14 * Math.sin(t * 38) + 0.08 * Math.sin(t * 61 + 1.7);
      g.scale.set(0.85 + 0.15 * l + 0.05 * Math.sin(t * 47), l * flicker, 0.85 + 0.15 * l + 0.05 * Math.cos(t * 53));
    }
    if (light.current) light.current.intensity = l * (18 + 4 * Math.sin(t * 40));
  });

  return (
    <group position={[0, BURNER_Y, 0]}>
      {/* frame ring and pipes */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.035, 8, 20]} />
        <meshStandardMaterial color="#8c929a" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 0.3, 10]} />
        <meshStandardMaterial color="#4b5058" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* flame: wide orange shell, yellow body, white-hot core */}
      <group ref={flame} position={[0, 0.05, 0]} visible={false}>
        <mesh position={[0, 0.95, 0]}>
          <coneGeometry args={[0.3, 1.9, 10, 1, true]} />
          <meshBasicMaterial color={pal.outer} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <coneGeometry args={[0.2, 1.4, 10, 1, true]} />
          <meshBasicMaterial color={pal.mid} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <coneGeometry args={[0.1, 0.8, 8, 1, true]} />
          <meshBasicMaterial color={pal.core} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, 1.2, 0]} color={pal.light} intensity={0} distance={26} decay={2} />
    </group>
  );
}
