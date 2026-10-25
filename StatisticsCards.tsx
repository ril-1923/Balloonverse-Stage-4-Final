import { Award, Clock, Compass, Feather, Flag, Gauge, Map, Mountain, Rocket } from 'lucide-react';
import { ACHIEVEMENTS } from '../../simulation/achievements';
import { MISSIONS } from '../../simulation/missionEngine';
import { favoriteWorld, mostUsedBalloon } from '../../simulation/statsSummary';
import { getWorld } from '../../simulation/worldDefinitions';
import { useProgressStore } from '../../store/useProgressStore';
import { formatDistance, formatDuration } from '../../utils/formatters';
import type { WorldId } from '../../types/environment';

function Card({ icon: Icon, label, value, sub }: { icon: typeof Rocket; label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card">
      <Icon size={20} aria-hidden />
      <dt>{label}</dt>
      <dd>{value}</dd>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export function StatisticsCards() {
  const stats = useProgressStore((s) => s.stats);
  const completed = useProgressStore((s) => Object.keys(s.completed).length);
  const unlocked = useProgressStore((s) => Object.keys(s.achievements).length);
  const fav = favoriteWorld(stats);
  const balloon = mostUsedBalloon(stats);
  const hours = stats.totalDuration;
  return (
    <dl className="stat-grid">
      <Card icon={Rocket} label="Total flights" value={String(stats.totalFlights)} />
      <Card icon={Clock} label="Total flight time" value={hours >= 3600 ? `${(hours / 3600).toFixed(1)} h` : formatDuration(hours)} sub={hours >= 3600 ? undefined : 'min:sec'} />
      <Card icon={Compass} label="Distance travelled" value={formatDistance(stats.totalDistance)} />
      <Card icon={Mountain} label="Highest altitude" value={stats.highestAltitude > 0 ? `${Math.round(stats.highestAltitude)} m` : '—'} />
      <Card icon={Feather} label="Successful landings" value={String(stats.successfulLandings)} sub={stats.hardLandings ? `${stats.hardLandings} hard` : undefined} />
      <Card icon={Flag} label="Missions completed" value={`${completed} / ${MISSIONS.length}`} />
      <Card icon={Award} label="Achievements" value={`${unlocked} / ${ACHIEVEMENTS.length}`} />
      <Card icon={Map} label="Favourite world" value={fav ? getWorld(fav as WorldId).name : '—'} sub={fav ? `${stats.flightsByWorld[fav]} flight${stats.flightsByWorld[fav] === 1 ? '' : 's'}` : undefined} />
      <Card icon={Gauge} label="Most-used balloon" value={balloon ?? '—'} sub={balloon ? `${stats.balloonUses[balloon]} flight${stats.balloonUses[balloon] === 1 ? '' : 's'}` : undefined} />
    </dl>
  );
}
