import { NavLink, Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { BalloonMark } from './BalloonMark';

export function Navbar() {
  return (
    <header className="site-nav">
      <nav className="navbar navbar-expand px-3 px-md-4" aria-label="Main">
        <Link to="/" className="navbar-brand site-nav__brand">
          <BalloonMark size={26} />
          <span>BalloonVerse</span>
        </Link>
        <ul className="navbar-nav ms-auto gap-1">
          {[
            ['/', 'Home', true],
            ['/worlds', 'Worlds', false],
            ['/studio', 'Studio', false],
            ['/missions', 'Missions', false],
            ['/dashboard', 'Dashboard', false],
          ].map(([to, label, end]) => (
            <li className="nav-item" key={to as string}>
              <NavLink to={to as string} end={end as boolean} className="nav-link site-nav__link">{label as string}</NavLink>
            </li>
          ))}
          <li className="nav-item">
            <NavLink to="/settings" className="nav-link site-nav__link" aria-label="Settings" title="Settings"><Settings size={18} aria-hidden /></NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/simulator" className="nav-link site-nav__link site-nav__cta">Fly</NavLink>
          </li>
        </ul>
      </nav>
    </header>
  );
}
