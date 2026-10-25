import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MOUNTAIN_VALLEY } from '../../simulation/worldDefinitions';
import { DEFAULT_BALLOON } from '../../types/balloon';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getQuality } from '../../simulation/quality';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Balloon } from '../simulator/Balloon';
import { WorldScene } from '../simulator/WorldScene';

const BALLOON_POS = new THREE.Vector3(0, 46, 0);

function HeroRig({ reduced }: { reduced: boolean }) {
  const balloon = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced]);

  useFrame(({ camera, clock, size }, dt) => {
    const t = reduced ? 0 : clock.elapsedTime;
    const portrait = size.width / size.height < 0.9;
    const k = 1 - Math.exp(-dt * 3);
    smooth.current.x += (pointer.current.x - smooth.current.x) * k;
    smooth.current.y += (pointer.current.y - smooth.current.y) * k;

    const a = -0.38 + Math.sin(t * 0.06) * 0.14;
    const dist = portrait ? 118 : 86;
    const height = BALLOON_POS.y + 10 + Math.sin(t * 0.11) * 2;
    camera.position.set(Math.sin(a) * dist + smooth.current.x * 7, height - smooth.current.y * 3, Math.cos(a) * dist);

    // look left of the balloon so it sits on the right of the frame beside the title
    const shift = portrait ? 0 : 20;
    camera.lookAt(BALLOON_POS.x - Math.cos(a) * shift, BALLOON_POS.y + 12, BALLOON_POS.z + Math.sin(a) * shift);

    if (balloon.current) {
      balloon.current.position.y = BALLOON_POS.y + Math.sin(t * 0.8) * 1.4;
      balloon.current.rotation.y = t * 0.08;
    }
  });

  return (
    <group ref={balloon} position={BALLOON_POS}>
      <Balloon config={DEFAULT_BALLOON} mode="demo" />
    </group>
  );
}

/** Decorative 3D home-screen scene: a slowly drifting balloon above the mountain valley. */
export function HeroScene() {
  const reduced = useReducedMotion();
  const world = MOUNTAIN_VALLEY;
  const quality = useSettingsStore((s) => s.quality);
  const q = getQuality(quality);
  return (
    <Canvas key={quality} dpr={[1, Math.min(1.5, q.maxDpr)]} camera={{ fov: 46, near: 1, far: 6000, position: [-30, 56, 90] }} gl={{ antialias: q.antialias }} aria-hidden>
      <WorldScene world={world} timeOfDay="morning" weather="clear" detail="hero" followWind={false} />
      <HeroRig reduced={reduced} />
    </Canvas>
  );
}
