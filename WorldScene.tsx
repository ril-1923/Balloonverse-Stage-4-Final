import type { WorldDefinition } from '../../simulation/worldDefinitions';
import { getQuality } from '../../simulation/quality';
import { useSettingsStore } from '../../store/useSettingsStore';
import type { TimeOfDay, Weather } from '../../types/environment';
import { Clouds } from './Clouds';
import { MountainRange } from './MountainRange';
import { Scatter } from './Scatter';
import { SkySystem } from './SkySystem';
import { Terrain } from './Terrain';
import { Water } from './Water';
import { WorldExtras } from './WorldExtras';
import { getVisuals } from './worldVisuals';

interface Props {
  world: WorldDefinition;
  timeOfDay: TimeOfDay;
  weather: Weather;
  /** 'hero' uses lighter terrain and fewer props for the home screen. */
  detail?: 'full' | 'hero';
  /** Clouds drift with the simulated wind (simulator) or at a fixed gentle speed (home). */
  followWind?: boolean;
}

/** Everything that makes up one world: sky, terrain, water, props, distant peaks, clouds and extras. */
export function WorldScene({ world, timeOfDay, weather, detail = 'full', followWind = true }: Props) {
  const v = getVisuals(world.id);
  const hero = detail === 'hero';
  const q = getQuality(useSettingsStore((s) => s.quality));
  const segments = Math.round(hero ? Math.min(120, q.terrainSegments * 0.75) : q.terrainSegments);
  const propScale = q.props * (hero ? 0.55 : 1);
  return (
    <>
      <SkySystem world={world} timeOfDay={timeOfDay} weather={weather} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, world.lake ? -12 : -3, 0]}>
        <circleGeometry args={[5000, 32]} />
        <meshStandardMaterial color={v.horizon} roughness={1} />
      </mesh>
      <Terrain world={world} segments={segments} />
      <Water world={world} />
      {v.scatter.map((spec, i) => (
        <Scatter key={`${world.id}-${i}`} world={world} spec={spec} countScale={propScale} />
      ))}
      <MountainRange {...v.ring} count={Math.max(12, Math.round(v.ring.count * q.ring))} />
      <Clouds {...v.clouds} count={Math.max(4, Math.round(v.clouds.count * q.clouds))} followWind={followWind} />
      <WorldExtras world={world} />
    </>
  );
}
