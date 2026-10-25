import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from '../../simulation/flightController';
import { dragLook, easeLookBack, type LookOffset } from '../../simulation/cameraLook';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useFlightStore } from '../../store/useFlightStore';
import type { CameraMode } from '../../types/flight';

const FOV: Record<CameraMode, number> = { chase: 58, basket: 74, side: 50, cinematic: 46 };
const POS_RATE: Record<CameraMode, number> = { chase: 3.2, basket: 9, side: 3, cinematic: 2.2 };

interface Props {
  reducedMotion?: boolean;
}

/** Custom follow camera with four modes, smooth blending between them, and ground clamping. */
export function CameraController({ reducedMotion = false }: Props) {
  const lookAt = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  const initialised = useRef(false);
  const look3 = useRef<LookOffset>({ yaw: 0, pitch: 0 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const sph = useRef(new THREE.Spherical());
  const tmpV = useRef(new THREE.Vector3());
  const gl = useThree((s) => s.gl);

  // Drag (mouse or touch) on the 3D view to look around. Speed follows the sensitivity setting.
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      look3.current = dragLook(look3.current, e.clientX - d.x, e.clientY - d.y, useSettingsStore.getState().sensitivity);
      d.x = e.clientX;
      d.y = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (drag.current?.id === e.pointerId) drag.current = null;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [gl]);

  useFrame(({ camera, clock, size }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const mode = useFlightStore.getState().cameraMode;
    const s = runtime.state;
    const portrait = size.width / size.height < 1;
    const zoom = portrait ? 1.35 : 1;
    const f = new THREE.Vector3(Math.sin(s.heading), 0, -Math.cos(s.heading));
    const r = new THREE.Vector3(Math.cos(s.heading), 0, Math.sin(s.heading));
    const base = new THREE.Vector3(s.x, s.y, s.z);
    const bodyCentre = base.clone().add(new THREE.Vector3(0, 14, 0));
    const d = desired.current;
    const look = target.current;

    switch (mode) {
      case 'basket':
        d.copy(base).addScaledVector(f, 0.7).add(new THREE.Vector3(0, 2.4, 0));
        look.copy(d).addScaledVector(f, 70).add(new THREE.Vector3(0, -7, 0));
        break;
      case 'side':
        d.copy(bodyCentre).addScaledVector(r, 58 * zoom).add(new THREE.Vector3(0, -2, 0));
        look.copy(bodyCentre);
        break;
      case 'cinematic': {
        const speed = reducedMotion ? 0.03 : 0.13;
        const a = clock.elapsedTime * speed + s.heading + 2.2;
        d.set(
          bodyCentre.x + Math.sin(a) * 54 * zoom,
          bodyCentre.y + 4 + Math.sin(clock.elapsedTime * 0.19) * 7,
          bodyCentre.z + Math.cos(a) * 54 * zoom,
        );
        look.copy(bodyCentre);
        break;
      }
      case 'chase':
      default:
        d.copy(base).addScaledVector(f, -40 * zoom).add(new THREE.Vector3(0, 17 * zoom, 0));
        look.copy(bodyCentre);
        break;
    }

    // drag-to-look: orbit the camera around its target (or turn the head in basket view)
    if (!drag.current) look3.current = easeLookBack(look3.current, dt);
    const lk = look3.current;
    if (lk.yaw !== 0 || lk.pitch !== 0) {
      if (mode === 'basket') {
        const dir = tmpV.current.copy(look).sub(d);
        sph.current.setFromVector3(dir);
        sph.current.theta += lk.yaw;
        sph.current.phi = THREE.MathUtils.clamp(sph.current.phi - lk.pitch * 0.8, 0.35, Math.PI - 0.35);
        look.copy(d).add(dir.setFromSpherical(sph.current));
      } else {
        const rel = tmpV.current.copy(d).sub(look);
        sph.current.setFromVector3(rel);
        sph.current.theta += lk.yaw;
        sph.current.phi = THREE.MathUtils.clamp(sph.current.phi - lk.pitch, 0.25, Math.PI * 0.62);
        d.copy(look).add(rel.setFromSpherical(sph.current));
      }
    }

    // keep the camera above the terrain
    const minAbove = mode === 'basket' ? 1.2 : 4;
    d.y = Math.max(d.y, runtime.world.groundAt(d.x, d.z) + minAbove);

    if (!initialised.current) {
      camera.position.copy(d);
      lookAt.current.copy(look);
      initialised.current = true;
    }
    const kPos = 1 - Math.exp(-dt * POS_RATE[mode]);
    const kLook = 1 - Math.exp(-dt * (mode === 'basket' ? 8 : 5));
    camera.position.lerp(d, kPos);
    camera.position.y = Math.max(camera.position.y, runtime.world.groundAt(camera.position.x, camera.position.z) + minAbove);
    lookAt.current.lerp(look, kLook);
    camera.lookAt(lookAt.current);

    const persp = camera as THREE.PerspectiveCamera;
    const fov = FOV[mode] * (portrait ? 1.12 : 1);
    if (Math.abs(persp.fov - fov) > 0.01) {
      persp.fov += (fov - persp.fov) * (1 - Math.exp(-dt * 4));
      persp.updateProjectionMatrix();
    }
  });
  return null;
}
