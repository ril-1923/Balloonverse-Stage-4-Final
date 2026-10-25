import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container d-flex flex-wrap justify-content-between gap-3">
        <span>BalloonVerse 3D · Explore Beyond the Horizon</span>
        <nav aria-label="Footer" className="d-flex flex-wrap gap-3">
          <Link to="/worlds">Worlds</Link>
          <Link to="/studio">Studio</Link>
          <Link to="/missions">Missions</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </div>
      <p className="container">A game-style simulation, not a physically accurate flight model. Progress and settings are saved only in this browser.</p>
    </footer>
  );
}
