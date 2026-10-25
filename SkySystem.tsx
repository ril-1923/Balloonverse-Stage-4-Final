import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Sky as SkyMesh } from 'three/examples/jsm/objects/Sky.js';
import { MOON, resolveAtmosphere } from '../../simulation/atmosphere';
import type { WorldDefinition } from '../../simulation/worldDefinitions';
import type { TimeOfDay, Weather } from '../../types/environment';
import { atmosphereState, directionFromAngles, stepAtmosphere } from './atmosphereState';
import { StarField } from './StarField';

interface Props {
  world: WorldDefinition;
  timeOfDay: TimeOfDay;
  weather: Weather;
}

/**
 * Sky dome, sun/moon lighting, ambient light, fog and exposure. Changing the time of day or
 * weather blends smoothly (about a second and a half) instead of jumping.
 */
export function SkySystem({ world, timeOfDay, weather }: Props) {
  const { scene, gl } = useThree();
  const target = useMemo(() => resolveAtmosphere(timeOfDay, weather, world.fog), [timeOfDay, weather, world]);
  const targetRef = useRef(target);
  targetRef.current = target;

  const sky = useMemo(() => {
    const s = new SkyMesh();
    s.scale.setScalar(450000);
    return s;
  }, []);
  const fog = useMemo(() => new THREE.Fog('#b9d6ee', 220, 1500), []);
  const sunLight = useRef<THREE.DirectionalLight>(null);
  const moonLight = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sunDir = useMemo(() => new THREE.Vector3(), []);
  const moonDir = useMemo(() => directionFromAngles(MOON.elevation, MOON.azimuth, new THREE.Vector3()), []);

  const apply = () => {
    const s = atmosphereState;
    const u = sky.material.uniforms;
    directionFromAngles(s.sunElevation, s.sunAzimuth, sunDir);
    u.sunPosition.value.copy(sunDir);
    u.turbidity.value = s.turbidity;
    u.rayleigh.value = s.rayleigh;
    u.mieCoefficient.value = s.mie;
    u.mieDirectionalG.value = s.mieG;
    fog.color.copy(s.fogColor);
    fog.near = s.fogNear;
    fog.far = s.fogFar;
    gl.toneMappingExposure = s.exposure;
    if (sunLight.current) {
      sunLight.current.position.copy(sunDir).multiplyScalar(400);
      sunLight.current.color.copy(s.sunColor);
      sunLight.current.intensity = s.sunIntensity * (sunDir.y > -0.05 ? 1 : 0);
    }
    if (moonLight.current) moonLight.current.intensity = s.moonIntensity;
    if (hemi.current) {
      hemi.current.color.copy(s.hemiSky);
      hemi.current.groundColor.copy(s.hemiGround);
      hemi.current.intensity = s.hemiIntensity;
    }
  };

  // First frame: jump straight to the target so the scene never starts in the wrong light.
  useLayoutEffect(() => {
    scene.fog = fog;
    stepAtmosphere(targetRef.current, 1);
    apply();
    return () => {
      scene.fog = null;
      gl.toneMappingExposure = 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, fog, gl]);

  useEffect(() => () => sky.material.dispose(), [sky]);

  useFrame((_, dt) => {
    stepAtmosphere(targetRef.current, 1 - Math.exp(-Math.min(dt, 0.1) * 1.6));
    apply();
  }, -1);

  return (
    <>
      <primitive object={sky} />
      <hemisphereLight ref={hemi} args={['#bcd9ff', '#6d8a4a', 1]} />
      <directionalLight ref={sunLight} position={[200, 200, 200]} intensity={2} />
      <directionalLight ref={moonLight} position={moonDir.clone().multiplyScalar(400).toArray()} color="#9bb8ff" intensity={0} />
      <StarField moonDir={moonDir} />
    </>
  );
}
