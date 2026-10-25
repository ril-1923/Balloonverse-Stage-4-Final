import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { AchievementsGrid } from '../components/dashboard/AchievementsGrid';
import { FlightCharts } from '../components/dashboard/FlightCharts';
import { FlightHistory } from '../components/dashboard/FlightHistory';
import { StatisticsCards } from '../components/dashboard/StatisticsCards';
import { useProgressStore } from '../store/useProgressStore';

export default function DashboardPage() {
  const history = useProgressStore((s) => s.history);
  const achievements = useProgressStore((s) => s.achievements);
  useEffect(() => {
    document.title = 'Flight Dashboard — BalloonVerse 3D';
  }, []);

  return (
    <main className="dashboard container">
      <header className="page-head">
        <div>
          <h1>Flight Dashboard</h1>
          <p>Everything here comes from flights you have actually flown. It is saved in this browser only.</p>
        </div>
      </header>

      <StatisticsCards />

      {history.length === 0 ? (
        <section className="empty-state" aria-labelledby="empty-title">
          <Rocket size={34} aria-hidden />
          <h2 id="empty-title">No flights logged yet</h2>
          <p>Take off and land (or end a flight after a few seconds in the air) and it will show up here with charts and a flight log.</p>
          <Link to="/simulator" className="btn btn-ember btn-lg">Start First Flight</Link>
        </section>
      ) : (
        <>
          <section aria-labelledby="charts-title" className="dash-section">
            <h2 id="charts-title">Trends</h2>
            <FlightCharts />
          </section>
          <section aria-labelledby="history-title" className="dash-section">
            <h2 id="history-title">Flight history</h2>
            <FlightHistory />
          </section>
        </>
      )}

      <section aria-labelledby="ach-title" className="dash-section">
        <h2 id="ach-title">Achievements <small>{Object.keys(achievements).length} unlocked</small></h2>
        <AchievementsGrid unlocked={achievements} />
      </section>
    </main>
  );
}
