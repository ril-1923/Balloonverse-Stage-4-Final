import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BalloonConfig } from '../../types/balloon';
import { runtime } from '../../simulation/flightController';
import { BalloonEnvelope } from './BalloonEnvelope';
import { BalloonBasket, BASKET } from './BalloonBasket';
import { Burner } from './Burner';
import { atmosphereState } from './atmosphereState';

const ROPE_BASE_Y = BASKET.postTop;
const SKIRT_Y = 7.2;
const SKIRT_R = 1.75;

interface RopeProps {
  from: THREE.Vector3;
  to: THREE.Vector3;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function Rope({ from, to }: RopeProps) {
  const { position, length, quaternion } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    return {
      position: new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5),
      length: len,
      quaternion: new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir.normalize()),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.022, 0.022, length, 5]} />
      <meshStandardMaterial color="#d9cfb8" roughness={0.9} />
    </mesh>
  );
}

interface BalloonProps {
  config: BalloonConfig;
  /** 'live' follows the flight simulation; 'demo' is a decorative idle balloon. */
  mode: 'live' | 'demo';
}

/**
 * Complete balloon. Origin sits at the basket floor, +y up. In live mode the
 * envelope inflates and the whole assembly leans with the simulated velocity.
 */
export function Balloon({ config, mode }: BalloonProps) {
  const sway = useRef<THREE.Group>(null);
  const envelope = useRef<THREE.Group>(null);
  const lanterns = useRef<THREE.Group>(null);

  const ropes = useMemo(() => {
    const list: { from: THREE.Vector3; to: THREE.Vector3 }[] = [];
    const h = BASKET.half - 0.05;
    const posts: [number, number][] = [
      [h, h], [-h, h], [h, -h], [-h, -h],
    ];
    posts.forEach(([px, pz]) => {
      const baseAngle = Math.atan2(px, pz);
      [-0.28, 0.28].forEach((off) => {
        const a = baseAngle + off;
        list.push({
          from: new THREE.Vector3(px, ROPE_BASE_Y, pz),
          to: new THREE.Vector3(Math.sin(a) * SKIRT_R, SKIRT_Y, Math.cos(a) * SKIRT_R),
        });
      });
    });
    return list;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = sway.current;
    const env = envelope.current;
    if (!g || !env) return;
    let inflation = 1;
    let leanX = 0;
    let leanZ = 0;
    if (mode === 'live') {
      const s = runtime.state;
      inflation = s.inflation;
      const airborne = s.y - s.groundHeight > 1;
      if (airborne) {
        // lean against the direction of travel, in the balloon's local frame
        const c = Math.cos(-s.heading);
        const si = Math.sin(-s.heading);
        const lx = s.vx * c - s.vz * si;
        const lz = s.vx * si + s.vz * c;
        leanZ = THREE.MathUtils.clamp(-lx * 0.006, -0.08, 0.08);
        leanX = THREE.MathUtils.clamp(lz * 0.006, -0.08, 0.08);
      }
    }
    const k = 0.2 + 0.8 * inflation;
    env.scale.set(k, 0.12 + 0.88 * inflation, k);
    g.rotation.z = leanZ + Math.sin(t * 0.7) * 0.012 * inflation;
    g.rotation.x = leanX + Math.sin(t * 0.55 + 1) * 0.01 * inflation;
    g.rotation.y = Math.sin(t * 0.21) * 0.05;
    if (lanterns.current) lanterns.current.visible = mode === 'live' && atmosphereState.night > 0.35 && inflation > 0.8;
  });

  return (
    <group ref={sway}>
      <BalloonBasket style={config.basket} />
      <Burner mode={mode} effect={config.burner} />
      {ropes.map((r, i) => (
        <Rope key={i} from={r.from} to={r.to} />
      ))}
      <group ref={envelope} position={[0, SKIRT_Y, 0]}>
        <BalloonEnvelope config={config} />
        {/* glowing lanterns around the envelope, shown only when it is dark */}
        <group ref={lanterns} visible={false}>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.sin(a) * 8.75, 11, Math.cos(a) * 8.75]}>
                <sphereGeometry args={[0.28, 8, 6]} />
                <meshBasicMaterial color="#ffd27a" toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}
