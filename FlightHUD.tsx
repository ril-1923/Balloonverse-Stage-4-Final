import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, Target, ChevronsDownUp, ChevronsUpDown, Eye, EyeOff, Home, Keyboard, Pause, Play, RotateCcw, SlidersHorizontal, Undo2, Volume2, VolumeX, X,
} from 'lucide-react';
import { resetFlight, runtime, startFlight, toggleReturnToLaunch } from '../../simulation/flightController';
import { releaseAll } from '../../hooks/useKeyboardControls';
import { CAMERA_ORDER, useFlightStore } from '../../store/useFlightStore';
import type { CameraMode, FlightPhase } from '../../types/flight';
import { compassLabel, formatDistance, formatDuration } from '../../utils/formatters';
import { AltitudeLadder, Compass, WindDial } from './Instruments';
import { getWorld } from '../../simulation/worldDefinitions';
import { useEnvironmentStore } from '../../store/useEnvironmentStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { TIMES_OF_DAY, WEATHERS } from '../../types/environment';
import { ConditionsPanel } from './ConditionsPanel';

const PHASE_LABEL: Record<FlightPhase, string> = {
  grounded: 'Grounded',
  inflating: 'Inflating',
  takingOff: 'Taking off',
  flying: 'Flying',
  descending: 'Descending',
  landing: 'Landing',
  landed: 'Landed',
};

const CAMERA_LABEL: Record<CameraMode, string> = {
  chase: 'Chase',
  basket: 'Basket',
  side: 'Side',
  cinematic: 'Cinematic',
};

/** Blur after a mouse click so the Space key keeps controlling the burner instead of re-pressing the button. */
const mouseBlur = (e: MouseEvent<HTMLButtonElement>) => {
  if (e.detail > 0) e.currentTarget.blur();
};

function doReset() {
  releaseAll();
  resetFlight();
  useFlightStore.getState().setPaused(false);
}

function MissionStrip() {
  const m = useFlightStore((s) => s.mission);
  if (!m) return null;
  const pct = Math.round(m.progress * 100);
  return (
    <div className="hud-panel hud-mission" aria-label="Tracked mission">
      <div className="hud-mission__head">
        <Target size={14} aria-hidden />
        <strong>{m.name}</strong>
        <span className={m.complete || m.alreadyDone ? 'is-done' : ''}>{m.alreadyDone ? 'Done' : `${pct}%`}</span>
      </div>
      <div className="meter" role="progressbar" aria-label={`${m.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p>{m.objective}</p>
      {m.target && (
        <p className="hud-mission__target">
          {m.target.label} · {Math.round(m.target.distance)} m {compassLabel(m.target.bearing)}
        </p>
      )}
    </div>
  );
}

function Prompt({ phase, countdown, result }: { phase: FlightPhase; countdown: number; result: string }) {
  let text: string | null = null;
  let tone = '';
  if (phase === 'grounded') text = 'Press W or Space — or hold Burner — to start the lift-off.';
  else if (phase === 'inflating') text = `Inflating the envelope… ${Math.ceil(countdown)}`;
  else if (phase === 'landed') {
    tone = result === 'soft' ? 'is-good' : 'is-bad';
    text = result === 'soft' ? 'Soft landing. Nicely done.' : 'Hard landing. Reset to try again — ease off the descent with short burner bursts.';
  }
  if (!text) return null;
  return (
    <div className={`hud-prompt ${tone}`} role="status" aria-live="polite">
      <span>{text}</span>
      {phase === 'landed' && (
        <button type="button" className="btn btn-sm hud-btn-accent" onClick={(e) => { mouseBlur(e); doReset(); }}>
          Fly again
        </button>
      )}
      {phase === 'grounded' && (
        <button type="button" className="btn btn-sm hud-btn-accent" onClick={(e) => { mouseBlur(e); startFlight(); }}>
          Start lift-off
        </button>
      )}
    </div>
  );
}

const GUIDE: [string, string][] = [
  ['W / Space / ↑', 'Burner: climb'],
  ['S / ↓', 'Vent hot air: descend'],
  ['A / ← and D / →', 'Steer left and right'],
  ['C', 'Change camera'],
  ['R', 'Reset flight'],
  ['P or Esc', 'Pause / resume'],
  ['M', 'Sound on / off'],
  ['H', 'Show / hide HUD'],
  ['Drag', 'Look around'],
];

function PauseMenu() {
  return (
        <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Paused">
          <div className="pause-card">
            <h2>Paused</h2>
            <div className="pause-actions">
              <button type="button" className="btn hud-btn-accent" autoFocus onClick={(e) => { mouseBlur(e); useFlightStore.getState().setPaused(false); }}>
                <Play size={16} /> Resume
              </button>
              <button type="button" className="btn hud-btn-ghost" onClick={(e) => { mouseBlur(e); doReset(); }}>
                <RotateCcw size={16} /> Reset flight
              </button>
              <Link to="/" className="btn hud-btn-ghost"><Home size={16} /> Home</Link>
            </div>
            <dl className="pause-guide">
              {GUIDE.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            <button type="button" className="pause-close" aria-label="Close pause menu" onClick={() => useFlightStore.getState().setPaused(false)}>
              <X size={18} />
            </button>
          </div>
        </div>
  );
}

export function FlightHUD() {
  const snap = useFlightStore((s) => s.snapshot);
  const camera = useFlightStore((s) => s.cameraMode);
  const paused = useFlightStore((s) => s.paused);
  const collapsed = useFlightStore((s) => s.hudCollapsed);
  const guideOpen = useFlightStore((s) => s.guideOpen);
  const conditionsOpen = useFlightStore((s) => s.conditionsOpen);
  const toggleConditions = useFlightStore((s) => s.toggleConditions);
  const hudVisible = useSettingsStore((s) => s.hudVisible);
  const soundOn = useSettingsStore((s) => s.soundOn);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleHudSetting = useSettingsStore((s) => s.toggleHud);
  const worldId = useEnvironmentStore((s) => s.worldId);
  const timeOfDay = useEnvironmentStore((s) => s.timeOfDay);
  const weather = useEnvironmentStore((s) => s.weather);
  const setCamera = useFlightStore((s) => s.setCameraMode);
  const togglePaused = useFlightStore((s) => s.togglePaused);
  const toggleHud = useFlightStore((s) => s.toggleHud);
  const toggleGuide = useFlightStore((s) => s.toggleGuide);

  const phase = snap?.phase ?? runtime.state.phase;
  const alt = snap?.altitude ?? runtime.state.y;
  const returning = snap?.returning ?? false;

  if (!hudVisible) {
    return (
      <div className="hud" aria-label="Flight heads-up display (hidden)">
        <div className="hud-top hud-top--min">
          <div className="hud-panel hud-buttons">
            <button type="button" className="icon-btn" aria-label={paused ? 'Resume' : 'Pause'} onClick={(e) => { mouseBlur(e); togglePaused(); }}>
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button type="button" className="icon-btn" aria-pressed={soundOn} aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'} onClick={(e) => { mouseBlur(e); toggleSound(); }}>
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button type="button" className="icon-btn" aria-label="Show HUD" title="Show HUD (H)" onClick={(e) => { mouseBlur(e); toggleHudSetting(); }}>
              <Eye size={18} />
            </button>
          </div>
        </div>
        <Prompt phase={phase} countdown={snap?.countdown ?? 0} result={snap?.landingResult ?? 'none'} />
        {paused && <PauseMenu />}
      </div>
    );
  }

  return (
    <div className="hud" aria-label="Flight heads-up display">
      {/* top bar */}
      <div className="hud-top">
        <div className="hud-col">
        <div className="hud-panel hud-status">
          <div className="hud-world">{getWorld(worldId).name}</div>
          <div className="hud-env">{TIMES_OF_DAY.find((x) => x.id === timeOfDay)?.label} · {WEATHERS.find((x) => x.id === weather)?.label}</div>
          <div className="hud-state" data-phase={phase}>{PHASE_LABEL[phase]}</div>
          {collapsed && <div className="hud-mini">{Math.round(alt)} m</div>}
        </div>
        <MissionStrip />
        </div>

        <div className="hud-actions">
          <div className="hud-panel hud-camera" role="group" aria-label="Camera view">
            <Camera size={16} aria-hidden />
            {CAMERA_ORDER.map((m) => (
              <button key={m} type="button" className={`seg ${camera === m ? 'is-active' : ''}`} aria-pressed={camera === m} onClick={(e) => { mouseBlur(e); setCamera(m); }}>
                {CAMERA_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="hud-panel hud-buttons">
            <Link to="/" className="icon-btn" aria-label="Back to home" title="Home">
              <Home size={18} />
            </Link>
            <button type="button" className="icon-btn" aria-label={paused ? 'Resume' : 'Pause'} title={paused ? 'Resume (P)' : 'Pause (P)'} onClick={(e) => { mouseBlur(e); togglePaused(); }}>
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button type="button" className="icon-btn" aria-label="Reset flight" title="Reset flight (R)" onClick={(e) => { mouseBlur(e); doReset(); }}>
              <RotateCcw size={18} />
            </button>
            <button type="button" className={`icon-btn ${returning ? 'is-active' : ''}`} aria-pressed={returning} aria-label={returning ? 'Cancel return to launch' : 'Return to launch'} title={returning ? 'Cancel return to launch' : 'Return to launch'} onClick={(e) => { mouseBlur(e); toggleReturnToLaunch(); }}>
              <Undo2 size={18} />
            </button>
            <button type="button" className={`icon-btn ${conditionsOpen ? 'is-active' : ''}`} aria-expanded={conditionsOpen} aria-label="World, time and weather" title="World, time and weather" onClick={(e) => { mouseBlur(e); toggleConditions(); }}>
              <SlidersHorizontal size={18} />
            </button>
            <button type="button" className="icon-btn" aria-pressed={soundOn} aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'} title="Sound (M)" onClick={(e) => { mouseBlur(e); toggleSound(); }}>
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button type="button" className="icon-btn" aria-label="Hide HUD" title="Hide HUD (H)" onClick={(e) => { mouseBlur(e); toggleHudSetting(); }}>
              <EyeOff size={18} />
            </button>
            <button type="button" className={`icon-btn ${guideOpen ? 'is-active' : ''}`} aria-expanded={guideOpen} aria-label="Control guide" title="Control guide" onClick={(e) => { mouseBlur(e); toggleGuide(); }}>
              <Keyboard size={18} />
            </button>
            <button type="button" className="icon-btn" aria-expanded={!collapsed} aria-label={collapsed ? 'Expand instruments' : 'Collapse instruments'} title={collapsed ? 'Show instruments' : 'Hide instruments'} onClick={(e) => { mouseBlur(e); toggleHud(); }}>
              {collapsed ? <ChevronsUpDown size={18} /> : <ChevronsDownUp size={18} />}
            </button>
          </div>
        </div>
      </div>

      {conditionsOpen && <ConditionsPanel />}

      {guideOpen && (
        <div className="hud-panel hud-guide" role="region" aria-label="Control guide">
          <dl>
            {GUIDE.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="hud-guide__tip">Land softly: keep the sink rate under about 2.5 m/s with short burner bursts.</p>
        </div>
      )}

      {/* instruments */}
      {!collapsed && snap && (
        <div className="hud-mid">
          <div className="hud-panel hud-left">
            <AltitudeLadder altitude={snap.altitude} max={snap.maxAltitude} />
            <dl className="readouts">
              <div><dt>Altitude</dt><dd>{Math.round(snap.altitude)} m</dd></div>
              <div><dt>Above ground</dt><dd>{Math.round(snap.agl)} m</dd></div>
              <div>
                <dt>Vertical speed</dt>
                <dd className={snap.verticalSpeed > 0.3 ? 'up' : snap.verticalSpeed < -0.3 ? 'down' : ''}>
                  {snap.verticalSpeed > 0 ? '+' : ''}{snap.verticalSpeed.toFixed(1)} m/s
                </dd>
              </div>
              <div><dt>Ground speed</dt><dd>{snap.groundSpeed.toFixed(1)} m/s</dd></div>
            </dl>
          </div>

          <div className="hud-panel hud-right">
            <div className="dials">
              <figure><Compass heading={snap.heading} /><figcaption>Heading</figcaption></figure>
              <figure><WindDial heading={snap.heading} windDirection={snap.windDirection} speed={snap.windSpeed} /><figcaption>Wind</figcaption></figure>
            </div>
            <dl className="readouts">
              <div><dt>Wind</dt><dd>{snap.windSpeed.toFixed(1)} m/s to {compassLabel(snap.windDirection)}</dd></div>
              <div><dt>Flight time</dt><dd>{formatDuration(snap.elapsed)}</dd></div>
              <div><dt>Distance</dt><dd>{formatDistance(snap.distance)}</dd></div>
              <div><dt>Best altitude</dt><dd>{Math.round(snap.maxAltitude)} m</dd></div>
              <div>
                <dt>Burner</dt>
                <dd>
                  <span className={`burner-dot ${snap.burnerOn ? 'is-on' : ''}`} aria-hidden /> {snap.burnerOn ? 'On' : 'Off'}
                </dd>
              </div>
              <div>
                <dt>Air heat</dt>
                <dd>
                  <span className="heat" aria-label={`Air heat ${Math.round(snap.heat * 100)} percent`}>
                    <span className="heat__fill" style={{ width: `${snap.heat * 100}%` }} />
                    <span className="heat__neutral" />
                  </span>
                </dd>
              </div>
            </dl>
            {returning && <div className="hud-note">Returning to launch… steer to take over.</div>}
          </div>
        </div>
      )}

      <Prompt phase={phase} countdown={snap?.countdown ?? 0} result={snap?.landingResult ?? 'none'} />

      {paused && <PauseMenu />}
    </div>
  );
}
