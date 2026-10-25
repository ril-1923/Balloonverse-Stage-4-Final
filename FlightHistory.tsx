import { getWorld } from '../../simulation/worldDefinitions';
import { useProgressStore } from '../../store/useProgressStore';
import type { WorldId } from '../../types/environment';
import { formatDistance, formatDuration } from '../../utils/formatters';

const RESULT: Record<string, string> = { soft: 'Soft landing', hard: 'Hard landing', aborted: 'Ended early' };

export function FlightHistory() {
  const history = useProgressStore((s) => s.history);
  const rows = [...history].reverse();
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Flight history table, scrollable">
      <table className="table history-table">
        <caption className="visually-hidden">Your most recent flights, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Environment</th>
            <th scope="col">Duration</th>
            <th scope="col">Max altitude</th>
            <th scope="col">Distance</th>
            <th scope="col">Landing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.id}>
              <td>{new Date(f.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
              <td>{getWorld(f.worldId as WorldId).name}</td>
              <td>{formatDuration(f.duration)}</td>
              <td>{Math.round(f.maxAltitude)} m</td>
              <td>{formatDistance(f.distance)}</td>
              <td><span className={`result result--${f.result}`}>{RESULT[f.result]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
