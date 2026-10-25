import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LoadingScreen } from './components/common/LoadingScreen';
import { Footer } from './components/common/Footer';
import { Navbar } from './components/common/Navbar';
import { Toasts } from './components/common/Toasts';
import { useApplySettings } from './hooks/useApplySettings';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

const SimulatorPage = lazy(() => import('./pages/SimulatorPage'));
const WorldExplorerPage = lazy(() => import('./pages/WorldExplorerPage'));
const BalloonStudioPage = lazy(() => import('./pages/BalloonStudioPage'));
const MissionsPage = lazy(() => import('./pages/MissionsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function Shell() {
  useApplySettings();
  const { pathname } = useLocation();
  const immersive = pathname.startsWith('/simulator');

  // Keyboard and screen-reader users land on the new page's content after navigating.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const main = document.querySelector('main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      }
    }, 60);
    return () => window.clearTimeout(id);
  }, [pathname]);

  const skip = () => {
    const main = document.querySelector('main');
    main?.setAttribute('tabindex', '-1');
    main?.focus();
  };

  return (
    <>
      <button type="button" className="skip-link" onClick={skip}>Skip to content</button>
      {!immersive && <Navbar />}
      <Suspense fallback={<LoadingScreen label="Preparing the launch pad" />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/worlds" element={<WorldExplorerPage />} />
          <Route path="/studio" element={<BalloonStudioPage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      {!immersive && <Footer />}
      <Toasts />
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
