import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, Flame, MonitorCog, Navigation, Volume2, VolumeX, Wind } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { BalloonMark } from '../components/common/BalloonMark';
import { FeaturedWorlds } from '../components/home/FeaturedWorlds';
import { MissionPreview } from '../components/home/MissionPreview';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { isWebGLAvailable } from '../utils/webgl';

const HeroScene = lazy(() => import('../components/home/HeroScene').then((m) => ({ default: m.HeroScene })));

function StaticHero() {
  return (
    <div className="hero-static" aria-hidden>
      <BalloonMark size={220} />
    </div>
  );
}

const LESSONS = [
  { icon: Flame, title: 'Burner', text: 'Hold W or Space to heat the air. The envelope rises while it is warmer than neutral.' },
  { icon: ArrowDownToLine, title: 'Vent', text: 'Hold S to let hot air out. Short bursts of venting give you a controlled descent.' },
  { icon: Wind, title: 'Wind', text: 'Wind gets stronger the higher you go. Climb to catch it, drop low to slow down.' },
  { icon: Navigation, title: 'Steer', text: 'Use A and D to push left and right of your heading, then let the wind carry you.' },
];

export default function HomePage() {
  const webgl = useMemo(isWebGLAvailable, []);
  const soundOn = useSettingsStore((s) => s.soundOn);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const quality = useSettingsStore((s) => s.quality);
  useEffect(() => {
    document.title = 'BalloonVerse 3D — Explore Beyond the Horizon';
  }, []);

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__scene">
          {webgl ? (
            <ErrorBoundary fallback={() => <StaticHero />}>
              <Suspense fallback={<StaticHero />}>
                <HeroScene />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <StaticHero />
          )}
        </div>
        <div className="hero__shade" aria-hidden />
        <div className="hero__copy">
          <h1 id="hero-title" className="hero__title">BALLOONVERSE 3D</h1>
          <p className="hero__subtitle">EXPLORE BEYOND THE HORIZON</p>
          <p className="hero__lead">
            Lift off from a launch pad, ride the wind over mountains, farmland, dunes and lakes by day or by starlight, and bring the basket down gently.
          </p>
          <div className="d-flex flex-wrap gap-3">
            <Link to="/simulator" className="btn btn-ember btn-lg">Start Flying</Link>
            <Link to="/worlds" className="btn btn-ghost btn-lg">Explore Worlds</Link>
            <Link to="/studio" className="btn btn-ghost btn-lg">Customize Balloon</Link>
          </div>
          <div className="hero__tools">
            <button type="button" className="btn btn-sm btn-ghost" aria-pressed={soundOn} onClick={toggleSound}>
              {soundOn ? <Volume2 size={15} aria-hidden /> : <VolumeX size={15} aria-hidden />} Sound {soundOn ? 'on' : 'off'}
            </button>
            <Link to="/settings#graphics" className="btn btn-sm btn-ghost"><MonitorCog size={15} aria-hidden /> Graphics: {quality}</Link>
          </div>
          {!webgl && (
            <p className="hero__warn" role="status">
              Your browser could not start WebGL, so the 3D scene is off. The simulator needs WebGL to run.
            </p>
          )}
        </div>
      </section>

      <FeaturedWorlds />
      <MissionPreview />

      <section className="lessons container" aria-labelledby="lessons-title">
        <h2 id="lessons-title" className="lessons__title">How a balloon flight works here</h2>
        <div className="row g-3">
          {LESSONS.map(({ icon: Icon, title, text }) => (
            <div className="col-12 col-sm-6 col-lg-3" key={title}>
              <article className="lesson">
                <Icon size={22} aria-hidden />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
