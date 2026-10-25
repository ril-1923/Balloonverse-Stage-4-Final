import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getSnapshot, runtime, updateFlight, windAt } from '../../simulation/flightController';
import { getLiveMission, tickSession } from '../../simulation/sessionRuntime';
import { audio } from '../../audio/audioEngine';
import { soundForPhaseChange } from '../../audio/audioMixing';
import { getQuality } from '../../simulation/quality';
import { getWorld } from '../../simulation/worldDefinitions';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useBalloonStore } from '../../store/useBalloonStore';
import { useEnvironmentStore } from '../../store/useEnvironmentStore';
import { useFlightStore } from '../../store/useFlightStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Balloon } from './Balloon';
import { CameraController } from './CameraController';
import { LaunchPad } from './LaunchPad';
import { MissionMarkers } from './MissionMarkers';
import { WorldScene } from './WorldScene';

/** Advances the simulation with the render loop and publishes a ~10 Hz HUD snapshot. */
function SimulationLoop() {
  const acc = useRef(0);
  const prevPhase = useRef(runtime.state.phase);
  useFrame((_, dt) => {
    const paused = useFlightStore.getState().paused;
    if (!paused) {
      updateFlight(dt);
      tickSession(Math.min(dt, 0.05));
    }
    const s = runtime.state;
    const shot = soundForPhaseChange(prevPhase.current, s.phase, s.landingResult);
    prevPhase.current = s.phase;
    if (shot) audio.play(shot);
    const w = windAt(runtime.world, runtime.time);
    audio.update({
      burnerOn: s.burnerOn,
      windStrength: w.strength,
      agl: Math.max(0, s.y - s.groundHeight),
      paused,
      active: s.phase !== 'grounded' && s.phase !== 'landed',
    });
    acc.current += dt;
    if (acc.current >= 0.1) {
      acc.current = 0;
      useFlightStore.getState().setSnapshot(getSnapshot());
      useFlightStore.getState().setMission(getLiveMission());
    }
  }, -2);
  return null;
}

/** Positions the balloon group from simulation state each frame (no React re-render). */
function SimulatedBalloon() {
  const config = useBalloonStore((s) => s.current);
  const group = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const s = runtime.state;
    if (group.current) {
      group.current.position.set(s.x, s.y, s.z);
      group.current.rotation.y = -s.heading;
    }
    if (shadow.current) {
      const agl = Math.max(0, s.y - s.groundHeight);
      shadow.current.position.set(s.x, s.groundHeight + 0.15, s.z);
      const size = 7 + agl * 0.03;
      shadow.current.scale.set(size, size, 1);
      (shadow.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0.05, 0.38 - agl * 0.0012) * s.inflation;
    }
  });
  return (
    <>
      <group ref={group}>
        <Balloon config={config} mode="live" />
      </group>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#10230f" transparent opacity={0.3} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </>
  );
}

export function FlightScene({ onContextLost }: { onContextLost?: () => void }) {
  const worldId = useEnvironmentStore((s) => s.worldId);
  const timeOfDay = useEnvironmentStore((s) => s.timeOfDay);
  const weather = useEnvironmentStore((s) => s.weather);
  const world = useMemo(() => getWorld(worldId), [worldId]);
  const reduced = useReducedMotion();
  const quality = useSettingsStore((s) => s.quality);
  const q = getQuality(quality);
  const dpr = useMemo<[number, number]>(() => [1, Math.max(1, Math.min(window.devicePixelRatio || 1, q.maxDpr))], [q.maxDpr]);
  return (
    <Canvas
      key={quality}
      dpr={dpr}
      camera={{ fov: 58, near: 0.5, far: 6000, position: [0, 40, 60] }}
      gl={{ antialias: q.antialias, powerPreference: quality === 'low' ? 'default' : 'high-performance' }}
      aria-label="3D hot air balloon flight view"
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          onContextLost?.();
        });
      }}
    >
      <SimulationLoop />
      <WorldScene key={world.id} world={world} timeOfDay={timeOfDay} weather={weather} />
      <LaunchPad key={`pad-${world.id}`} world={world} />
      <MissionMarkers world={world} />
      <SimulatedBalloon />
      <CameraController reducedMotion={reduced} />
    </Canvas>
  );
}
