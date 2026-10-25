import { Link } from 'react-router-dom';
import { ACHIEVEMENTS } from '../../simulation/achievements';
import { MISSIONS } from '../../simulation/missionEngine';
import { useProgressStore } from '../../store/useProgressStore';
import { formatDistance } from '../../utils/formatters';
import { AchievementIcon } from '../dashboard/AchievementsGrid';

/** Real progress, shown on the home screen: lifetime stats, a few missions and achievement badges. */
export function MissionPreview() {
  const stats = useProgressStore((s) => s.stats);
  const completed = useProgressStore((s) => s.completed);
  const achievements = useProgressStore((s) => s.achievements);
  const best = useProgressStore((s) => s.bestProgress);
  const flights = stats.totalFlights;

  return (
    <section className="preview container" aria-labelledby="preview-title">
      <h2 id="preview-title" className="lessons__title">Your flying log</h2>

      <dl className="home-stats">
        <div><dt>Flights</dt><dd>{flights}</dd></div>
        <div><dt>Distance</dt><dd>{flights ? formatDistance(stats.totalDistance) : '—'}</dd></div>
        <div><dt>Best altitude</dt><dd>{stats.highestAltitude ? `${Math.round(stats.highestAltitude)} m` : '—'}</dd></div>
        <div><dt>Soft landings</dt><dd>{stats.successfulLandings}</dd></div>
      </dl>
      {flights === 0 && <p className="preview__empty">No flights yet. Your first takeoff starts the log.</p>}

      <div className="row g-4 mt-1">
        <div className="col-12 col-lg-7">
          <div className="preview__head"><h3>Missions</h3><Link to="/missions">All missions</Link></div>
          <ul className="mini-missions">
            {MISSIONS.slice(0, 4).map((m) => (
              <li key={m.id}>
                <span>{m.name}</span>
                <span className="mini-missions__state">{completed[m.id] ? 'Done' : best[m.id] ? `${Math.round(best[m.id] * 100)}%` : m.reward.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-12 col-lg-5">
          <div className="preview__head"><h3>Achievements</h3><Link to="/dashboard">Dashboard</Link></div>
          <ul className="badge-row" aria-label={`${Object.keys(achievements).length} of ${ACHIEVEMENTS.length} achievements unlocked`}>
            {ACHIEVEMENTS.map((a) => (
              <li key={a.id} className={achievements[a.id] ? 'is-unlocked' : ''} title={`${a.name}${achievements[a.id] ? '' : ' (locked)'}`}>
                <AchievementIcon def={a} unlocked={!!achievements[a.id]} />
                <span className="visually-hidden">{a.name}, {achievements[a.id] ? 'unlocked' : 'locked'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
