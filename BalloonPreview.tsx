import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { BalloonConfig } from '../../types/balloon';
import { Balloon } from '../simulator/Balloon';
import { useSettingsStore } from '../../store/useSettingsStore';

interface Props {
  config: BalloonConfig;
  autoRotate: boolean;
}

/** Large live 3D preview. Any change to the config rebuilds the balloon straight away. */
export function BalloonPreview({ config, autoRotate }: Props) {
  const sensitivity = useSettingsStore((s) => s.sensitivity);
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 17, 50], fov: 40, near: 0.5, far: 400 }} gl={{ antialias: true }} aria-label="3D balloon preview">
      <color attach="background" args={['#143560']} />
      <fog attach="fog" args={['#143560', 90, 260]} />
      <hemisphereLight args={['#cfe6ff', '#4a6a52', 1.1]} />
      <directionalLight position={[30, 55, 25]} intensity={2.6} color="#fff1d6" />
      <directionalLight position={[-35, 15, -30]} intensity={0.7} color="#7fb2ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <circleGeometry args={[70, 48]} />
        <meshStandardMaterial color="#2d5d4a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[8, 9, 48]} />
        <meshStandardMaterial color="#ff8a3d" roughness={0.8} />
      </mesh>
      <Balloon config={config} mode="demo" />
      <OrbitControls target={[0, 13, 0]} enablePan={false} minDistance={24} maxDistance={90} maxPolarAngle={Math.PI * 0.52} autoRotate={autoRotate} autoRotateSpeed={1.4} rotateSpeed={sensitivity} zoomSpeed={Math.max(0.5, sensitivity)} />
    </Canvas>
  );
}
