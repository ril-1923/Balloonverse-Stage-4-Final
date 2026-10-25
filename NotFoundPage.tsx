import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BalloonMark } from '../components/common/BalloonMark';

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page not found — BalloonVerse 3D';
  }, []);
  return (
    <main className="fallback-screen">
      <BalloonMark size={96} />
      <h1>This page drifted away</h1>
      <p>There is nothing at this address. Head back to the launch pad.</p>
      <div className="d-flex gap-2">
        <Link to="/" className="btn btn-ember">Home</Link>
        <Link to="/simulator" className="btn btn-ghost">Start flying</Link>
      </div>
    </main>
  );
}
