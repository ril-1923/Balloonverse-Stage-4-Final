import { Link } from 'react-router-dom';
import { WORLDS } from '../../simulation/worldDefinitions';
import { useEnvironmentStore } from '../../store/useEnvironmentStore';
import { WorldPreview } from './WorldPreview';

export function FeaturedWorlds() {
  const selectWorld = useEnvironmentStore((s) => s.selectWorld);
  return (
    <section className="featured container" aria-labelledby="featured-title">
      <div className="featured__head">
        <h2 id="featured-title" className="lessons__title">Six worlds to explore</h2>
        <Link to="/worlds" className="btn btn-ghost">See all worlds</Link>
      </div>
      <ul className="featured__grid">
        {WORLDS.map((w) => (
          <li key={w.id}>
            <Link to="/simulator" className="featured__card" onClick={() => selectWorld(w.id)} aria-label={`Fly ${w.name}`}>
              <WorldPreview id={w.id} />
              <span>{w.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
