import { useEffect } from 'react';
import { Star } from 'lucide-react';
import { MissionCard } from '../components/missions/MissionCard';
import { MISSIONS } from '../simulation/missionEngine';
import { effectiveTracked, useProgressStore } from '../store/useProgressStore';

export default function MissionsPage() {
  const completed = useProgressStore((s) => s.completed);
  const best = useProgressStore((s) => s.bestProgress);
  const points = useProgressStore((s) => s.points);
  const tracked = useProgressStore((s) => effectiveTracked(s));
  const setTracked = useProgressStore((s) => s.setTracked);
  useEffect(() => {
    document.title = 'Flight Missions — BalloonVerse 3D';
  }, []);
  const done = Object.keys(completed).length;

  return (
    <main className="missions container">
      <header className="page-head">
        <div>
          <h1>Flight Missions</h1>
          <p>Eight challenges that run on the real flight simulation. Pick one to track it: its markers appear in the sky and its progress shows in your HUD.</p>
        </div>
        <div className="page-head__stat" aria-live="polite">
          <Star size={18} aria-hidden />
          <span><strong>{points}</strong> Sky Points</span>
          <span><strong>{done}</strong> of {MISSIONS.length} complete</span>
        </div>
      </header>
      <div className="row g-4">
        {MISSIONS.map((m) => (
          <div className="col-12 col-md-6 col-xl-4" key={m.id}>
            <MissionCard mission={m} completedAt={completed[m.id]} best={best[m.id] ?? 0} tracked={tracked === m.id} onTrack={() => setTracked(m.id)} />
          </div>
        ))}
      </div>
    </main>
  );
}
