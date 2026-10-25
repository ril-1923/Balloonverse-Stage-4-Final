import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from './pages/HomePage';
import SimulatorPage from './pages/SimulatorPage';
import WorldExplorerPage from './pages/WorldExplorerPage';
import BalloonStudioPage from './pages/BalloonStudioPage';
import MissionsPage from './pages/MissionsPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { MISSIONS } from './simulation/missionEngine';
import { ACHIEVEMENTS } from './simulation/achievements';
import { WORLDS } from './simulation/worldDefinitions';
import { useProgressStore } from './store/useProgressStore';
import { createMemoryStorage, setStorageBackend } from './utils/storage';

/** Server-renders each route in Node. There is no WebGL here, so this also exercises the fallback screens. */
function render(path: string): string {
  return renderToString(
    <StaticRouter location={path}>
      <Navbar />
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
      <Footer />
    </StaticRouter>,
  );
}

beforeEach(() => {
  setStorageBackend(createMemoryStorage());
  useProgressStore.getState().resetProgress();
});

describe('every route renders without crashing', () => {
  it('home shows the title, subtitle and all main actions', () => {
    const html = render('/');
    expect(html).toContain('BALLOONVERSE 3D');
    expect(html).toContain('EXPLORE BEYOND THE HORIZON');
    for (const label of ['Start Flying', 'Explore Worlds', 'Customize Balloon']) expect(html).toContain(label);
    expect(html).toContain('Sound'); // sound toggle
    expect(html).toContain('Graphics:'); // graphics settings shortcut
    expect(html).toContain('Six worlds to explore');
    expect(html).toContain('Your flying log');
    expect(html).toContain('WebGL'); // the no-WebGL notice appears when 3D is unavailable
  });

  it('world explorer lists all six worlds with a Select World button each', () => {
    const html = render('/worlds');
    for (const w of WORLDS) expect(html).toContain(w.name);
    expect(html.match(/Select World|Selected/g)!.length).toBeGreaterThanOrEqual(6);
    expect(html).toContain('Launch Flight');
    expect(html).toContain('Difficulty');
  });

  it('balloon studio shows presets, options and the saved design library', () => {
    const html = render('/studio');
    for (const name of ['Sunrise Gold', 'Ocean Blue', 'Neon Adventure', 'Arctic Ice']) expect(html).toContain(name);
    for (const label of ['Solid', 'Checkerboard', 'Glossy', 'Dark wicker', 'Blue flame', 'Save design', 'Reset']) expect(html).toContain(label);
    expect(html).toContain('Saved designs');
    expect(html).toContain('Restore sample designs');
  });

  it('missions page lists all eight missions with objectives and rewards', () => {
    const html = render('/missions');
    for (const m of MISSIONS) {
      expect(html).toContain(m.name.replace('&', '&amp;'));
      expect(html).toContain(m.reward.label);
    }
    expect(html).toContain('Track mission');
  });

  it('dashboard shows the empty state and every achievement before any flight', () => {
    const html = render('/dashboard');
    expect(html).toContain('No flights logged yet');
    expect(html).toContain('Start First Flight');
    for (const a of ACHIEVEMENTS) expect(html).toContain(a.name);
    expect(html).toContain('Locked');
    expect(html).not.toContain('history-table');
  });

  it('a returning pilot with a saved flight sees the table, charts and real numbers', async () => {
    // Zustand renders its initial state on the server, so load the page the way a returning visitor would:
    // data already in storage, modules freshly loaded.
    const mem = createMemoryStorage();
    mem.setItem('balloonverse:v1:progress', JSON.stringify({
      history: [{ id: 'f1', date: '2025-02-01T10:00:00.000Z', worldId: 'desert-adventure', duration: 150, maxAltitude: 210, distance: 640, result: 'soft', balloon: 'Ocean Blue', missions: [] }],
      stats: { totalFlights: 1, totalDuration: 150, totalDistance: 640, highestAltitude: 210, successfulLandings: 1, flightsByWorld: { 'desert-adventure': 1 }, distanceByWorld: { 'desert-adventure': 640 }, balloonUses: { 'Ocean Blue': 1 } },
    }));
    vi.resetModules();
    const storage = await import('./utils/storage');
    storage.setStorageBackend(mem);
    const Dashboard = (await import('./pages/DashboardPage')).default;
    const html = renderToString(<StaticRouter location="/dashboard"><Dashboard /></StaticRouter>);
    expect(html).not.toContain('No flights logged yet');
    expect(html).toContain('history-table');
    expect(html).toContain('Desert Adventure');
    expect(html).toContain('Soft landing');
    expect(html).toContain('Ocean Blue');
    expect(html).toContain('Flight duration');
    expect(html).toContain('Mission completion');
    expect(html).toContain('640 m');
    expect(html).toContain('210 m');
  });

  it('settings page has every required control', () => {
    const html = render('/settings');
    for (const label of ['Graphics', 'Low', 'Medium', 'High', 'Sound effects', 'Master volume', 'Mouse sensitivity', 'Show the flight HUD', 'Starting camera', 'Time of day', 'Motion', 'Reset progress', 'Reset settings']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Burner');
  });

  it('simulator shows a helpful fallback instead of a blank page when WebGL is missing', () => {
    const html = render('/simulator');
    expect(html).toContain('3D view unavailable');
    expect(html).toContain('WebGL');
    expect(html).toContain('Back to home');
  });

  it('unknown addresses get the 404 page', () => {
    const html = render('/definitely/not/here');
    expect(html).toContain('This page drifted away');
  });

  it('navigation links point at every real route', () => {
    const html = render('/');
    for (const href of ['/worlds', '/studio', '/missions', '/dashboard', '/settings', '/simulator']) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});
