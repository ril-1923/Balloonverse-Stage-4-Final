import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Rocket, Wind } from 'lucide-react';
import { WorldPreview } from '../components/home/WorldPreview';
import { WORLDS } from '../simulation/worldDefinitions';
import { useEnvironmentStore } from '../store/useEnvironmentStore';
import { TIMES_OF_DAY } from '../types/environment';
import { compassLabel } from '../utils/formatters';

const DIFFICULTY = ['', 'Easy', 'Medium', 'Challenging'];

export default function WorldExplorerPage() {
  const worldId = useEnvironmentStore((s) => s.worldId);
  const selectWorld = useEnvironmentStore((s) => s.selectWorld);
  useEffect(() => {
    document.title = 'World Explorer — BalloonVerse 3D';
  }, []);
  const selected = WORLDS.find((w) => w.id === worldId) ?? WORLDS[0];

  return (
    <main className="explorer container">
      <header className="explorer__head">
        <div>
          <h1>World Explorer</h1>
          <p>Pick a world. Each one has its own terrain, props, light and wind, and you can change the time of day and weather in flight.</p>
        </div>
        <div className="explorer__launch" aria-live="polite">
          <span>Selected: <strong>{selected.name}</strong></span>
          <Link to="/simulator" className="btn btn-ember"><Rocket size={16} aria-hidden /> Launch Flight</Link>
        </div>
      </header>

      <div className="row g-4">
        {WORLDS.map((w) => {
          const isSel = w.id === worldId;
          const time = TIMES_OF_DAY.find((t) => t.id === w.defaults.timeOfDay)?.label;
          return (
            <div className="col-12 col-md-6 col-xl-4" key={w.id}>
              <article className={`world-card ${isSel ? 'is-selected' : ''}`} aria-labelledby={`w-${w.id}`}>
                <div className="world-card__art"><WorldPreview id={w.id} /></div>
                <div className="world-card__body">
                  <h2 id={`w-${w.id}`}>{w.name}</h2>
                  <p>{w.description}</p>
                  <ul className="world-card__meta">
                    <li>
                      <span className="meta-label">Difficulty</span>
                      <span className="dots" role="img" aria-label={`${DIFFICULTY[w.difficulty]} (${w.difficulty} of 3)`}>
                        {[1, 2, 3].map((n) => <i key={n} className={n <= w.difficulty ? 'on' : ''} />)}
                      </span>
                      <span>{DIFFICULTY[w.difficulty]}</span>
                    </li>
                    <li><Clock size={14} aria-hidden /><span className="meta-label">Best at</span><span>{time}</span></li>
                    <li>
                      <Wind size={14} aria-hidden /><span className="meta-label">Wind</span>
                      <span>{w.wind.strength} m/s toward {compassLabel(w.wind.direction)} · {w.windNote}</span>
                    </li>
                  </ul>
                  <button type="button" className={`btn w-100 ${isSel ? 'btn-selected' : 'btn-ember'}`} onClick={() => selectWorld(w.id)} aria-pressed={isSel}>
                    {isSel ? (<><Check size={16} aria-hidden /> Selected</>) : 'Select World'}
                  </button>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </main>
  );
}
