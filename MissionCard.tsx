import { Link } from 'react-router-dom';
import { Check, Crosshair, Gift, Rocket } from 'lucide-react';
import type { MissionDef } from '../../simulation/missionEngine';
import { MissionProgress } from './MissionProgress';

interface Props {
  mission: MissionDef;
  completedAt?: string;
  best: number;
  tracked: boolean;
  onTrack: () => void;
}

export function MissionCard({ mission, completedAt, best, tracked, onTrack }: Props) {
  const done = !!completedAt;
  const state = done ? 'Completed' : best > 0 ? 'In progress' : 'Not started';
  return (
    <article className={`mission-card ${done ? 'is-done' : ''} ${tracked ? 'is-tracked' : ''}`} aria-labelledby={`m-${mission.id}`}>
      <header>
        <h2 id={`m-${mission.id}`}>{mission.name}</h2>
        <span className={`badge-state badge-state--${done ? 'done' : best > 0 ? 'progress' : 'new'}`}>
          {done && <Check size={13} aria-hidden />} {state}
        </span>
      </header>
      <p>{mission.description}</p>
      <dl className="mission-meta">
        <div><dt><Crosshair size={14} aria-hidden /> Objective</dt><dd>{mission.objective}</dd></div>
        <div><dt><Gift size={14} aria-hidden /> Reward</dt><dd>{mission.reward.label}{done && ' · collected'}</dd></div>
      </dl>
      <MissionProgress value={done ? 1 : best} label={`${mission.name} progress`} />
      {done && completedAt && <small className="mission-date">Completed {new Date(completedAt).toLocaleDateString()}</small>}
      {mission.spatial && <small className="mission-note">Markers appear in flight while this mission is tracked.</small>}
      <footer>
        <button type="button" className={`btn btn-sm ${tracked ? 'btn-selected' : 'btn-ghost'}`} aria-pressed={tracked} onClick={onTrack}>
          {tracked ? 'Tracking' : 'Track mission'}
        </button>
        <Link to="/simulator" className="btn btn-sm btn-ember" onClick={onTrack}><Rocket size={14} aria-hidden /> Fly it</Link>
      </footer>
    </article>
  );
}
