import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RotateCcw, Trash2, Volume2 } from 'lucide-react';
import { audio } from '../audio/audioEngine';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { QUALITY_NOTES } from '../simulation/quality';
import { useProgressStore } from '../store/useProgressStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { TIMES_OF_DAY } from '../types/environment';
import { SENSITIVITY_RANGE, type GraphicsQuality, type ReducedMotionSetting } from '../types/settings';
import type { CameraMode } from '../types/flight';

const QUALITIES: { id: GraphicsQuality; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];
const CAMERAS: { id: CameraMode; label: string }[] = [
  { id: 'chase', label: 'Chase' },
  { id: 'basket', label: 'Basket' },
  { id: 'side', label: 'Side' },
  { id: 'cinematic', label: 'Cinematic' },
];
const MOTION: { id: ReducedMotionSetting; label: string; note: string }[] = [
  { id: 'system', label: 'Follow my device', note: 'Uses your operating system setting' },
  { id: 'on', label: 'Reduce motion', note: 'Slower camera, no hero animation or parallax' },
  { id: 'off', label: 'Full motion', note: 'Ignore the system setting' },
];
const CONTROLS: [string, string][] = [
  ['W / Space / ↑', 'Burner: climb (also starts the lift-off)'],
  ['S / ↓', 'Vent hot air: descend'],
  ['A / ← and D / →', 'Steer left and right'],
  ['Mouse or touch drag', 'Look around (speed set by Mouse sensitivity)'],
  ['C', 'Cycle camera view'],
  ['R', 'Reset the flight'],
  ['P or Esc', 'Pause / resume (opens the pause menu)'],
  ['M', 'Sound on / off'],
  ['H', 'Show / hide the HUD'],
];

export default function SettingsPage() {
  const s = useSettingsStore();
  const resetProgress = useProgressStore((p) => p.resetProgress);
  const flights = useProgressStore((p) => p.stats.totalFlights);
  const [confirm, setConfirm] = useState<'progress' | 'settings' | null>(null);
  const [message, setMessage] = useState('');

  const { hash } = useLocation();
  useEffect(() => {
    document.title = 'Settings — BalloonVerse 3D';
  }, []);
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <main className="settings container">
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Changes apply straight away and are saved in this browser.</p>
        </div>
      </header>

      <div className="settings-grid">
        <section id="graphics" className="settings-card" aria-labelledby="gfx-title">
          <h2 id="gfx-title">Graphics</h2>
          <div className="seg-group" role="radiogroup" aria-label="Graphics quality">
            {QUALITIES.map((q) => (
              <button key={q.id} type="button" role="radio" aria-checked={s.quality === q.id} className={`seg-btn ${s.quality === q.id ? 'is-active' : ''}`} onClick={() => s.set({ quality: q.id })}>
                {q.label}
              </button>
            ))}
          </div>
          <p className="settings-note">{QUALITY_NOTES[s.quality]}</p>
          <p className="settings-note">Affects pixel ratio, anti-aliasing, terrain detail, tree and prop density, cloud count and distant mountains. The 3D view restarts when you change it.</p>
        </section>

        <section className="settings-card" aria-labelledby="audio-title">
          <h2 id="audio-title">Audio</h2>
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" role="switch" id="sound" checked={s.soundOn} onChange={(e) => s.set({ soundOn: e.target.checked })} />
            <label className="form-check-label" htmlFor="sound">Sound effects</label>
          </div>
          <label className="settings-slider" htmlFor="volume">
            <span>Master volume <strong>{Math.round(s.volume * 100)}%</strong></span>
            <input id="volume" type="range" className="form-range" min={0} max={100} step={1} value={Math.round(s.volume * 100)} disabled={!s.soundOn} onChange={(e) => s.set({ volume: Number(e.target.value) / 100 })} />
          </label>
          <button type="button" className="btn btn-sm btn-ghost" disabled={!s.soundOn} onClick={() => { audio.unlock(); audio.play('test'); }}>
            <Volume2 size={14} aria-hidden /> Play test sound
          </button>
          <p className="settings-note">Burner, wind, takeoff, landing, mission and achievement sounds are generated in your browser. Audio starts after your first click or key press, as browsers require.</p>
        </section>

        <section className="settings-card" aria-labelledby="ctl-title">
          <h2 id="ctl-title">Controls</h2>
          <label className="settings-slider" htmlFor="sens">
            <span>Mouse sensitivity <strong>{s.sensitivity.toFixed(1)}×</strong></span>
            <input id="sens" type="range" className="form-range" min={SENSITIVITY_RANGE.min} max={SENSITIVITY_RANGE.max} step={0.1} value={s.sensitivity} onChange={(e) => s.set({ sensitivity: Number(e.target.value) })} />
          </label>
          <p className="settings-note">Sets how fast dragging turns the flight camera and the Studio preview.</p>
          <dl className="controls-table">
            {CONTROLS.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </section>

        <section className="settings-card" aria-labelledby="disp-title">
          <h2 id="disp-title">Display and flight</h2>
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" role="switch" id="hud" checked={s.hudVisible} onChange={(e) => s.set({ hudVisible: e.target.checked })} />
            <label className="form-check-label" htmlFor="hud">Show the flight HUD</label>
          </div>
          <label className="settings-field" htmlFor="cam">
            <span>Starting camera</span>
            <select id="cam" className="form-select form-select-sm" value={s.cameraPreference} onChange={(e) => s.set({ cameraPreference: e.target.value as CameraMode })}>
              {CAMERAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="settings-field" htmlFor="tod">
            <span>Time of day when choosing a world</span>
            <select id="tod" className="form-select form-select-sm" value={s.timeOfDay} onChange={(e) => s.set({ timeOfDay: e.target.value as typeof s.timeOfDay })}>
              <option value="auto">World’s own suggestion</option>
              {TIMES_OF_DAY.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <fieldset className="settings-field">
            <legend>Motion</legend>
            {MOTION.map((m) => (
              <div className="form-check" key={m.id}>
                <input className="form-check-input" type="radio" name="motion" id={`motion-${m.id}`} checked={s.reducedMotion === m.id} onChange={() => s.set({ reducedMotion: m.id })} />
                <label className="form-check-label" htmlFor={`motion-${m.id}`}>{m.label} <small>— {m.note}</small></label>
              </div>
            ))}
          </fieldset>
        </section>

        <section className="settings-card settings-card--danger" aria-labelledby="data-title">
          <h2 id="data-title">Your data</h2>
          <p>Flight history, statistics, missions and achievements are stored only in this browser. {flights > 0 ? `You have ${flights} logged flight${flights === 1 ? '' : 's'}.` : 'No flights logged yet.'}</p>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-danger-bv" onClick={() => setConfirm('progress')}><Trash2 size={16} aria-hidden /> Reset progress</button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirm('settings')}><RotateCcw size={16} aria-hidden /> Reset settings</button>
          </div>
          <p className="settings-note">Reset progress clears missions, points, achievements, flight history and statistics. Your balloon designs and settings are kept.</p>
          <p className="settings-message" role="status" aria-live="polite">{message}</p>
        </section>
      </div>

      <p className="settings-back"><Link to="/">Back to home</Link></p>

      {confirm === 'progress' && (
        <ConfirmDialog
          title="Reset all progress?"
          message="This permanently deletes your flight history, statistics, completed missions, Sky Points and achievements. Balloon designs and settings are not affected."
          confirmLabel="Reset progress"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => { resetProgress(); setConfirm(null); setMessage('Progress has been reset.'); }}
        />
      )}
      {confirm === 'settings' && (
        <ConfirmDialog
          title="Restore default settings?"
          message="Graphics, audio, controls and display options go back to their defaults. Your progress is not affected."
          confirmLabel="Restore defaults"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { s.resetSettings(); setConfirm(null); setMessage('Settings restored to defaults.'); }}
        />
      )}
    </main>
  );
}
