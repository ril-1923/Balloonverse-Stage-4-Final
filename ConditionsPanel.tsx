import type { ChangeEvent, PointerEvent } from 'react';
import { WORLDS } from '../../simulation/worldDefinitions';
import { useEnvironmentStore } from '../../store/useEnvironmentStore';
import { useFlightStore } from '../../store/useFlightStore';
import { TIMES_OF_DAY, WEATHERS, type WorldId } from '../../types/environment';
import { compassLabel, degrees } from '../../utils/formatters';

const blurOnRelease = (e: PointerEvent<HTMLElement>) => e.currentTarget.blur();

/** World, time of day, weather and wind controls. Changing them updates the live scene without a reload. */
export function ConditionsPanel() {
  const env = useEnvironmentStore();
  const snap = useFlightStore((s) => s.snapshot);
  const manual = env.windStrength !== null || env.windDirectionDeg !== null;

  const setManual = (on: boolean) => {
    if (!on) {
      env.setWindDirection(null);
      env.setWindStrength(null);
      return;
    }
    env.setWindDirection(degrees(snap?.windDirection ?? 0));
    env.setWindStrength(Math.round((snap?.windSpeed ?? 3) * 2) / 2);
  };

  const dir = env.windDirectionDeg ?? degrees(snap?.windDirection ?? 0);
  const strength = env.windStrength ?? snap?.windSpeed ?? 0;

  return (
    <div className="hud-panel hud-conditions" role="region" aria-label="World and conditions">
      <label className="cond-row">
        <span className="cond-label">World</span>
        <select
          className="form-select form-select-sm cond-select"
          value={env.worldId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            env.selectWorld(e.target.value as WorldId);
            e.target.blur();
          }}
        >
          {WORLDS.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </label>

      <div className="cond-row cond-row--wrap" role="group" aria-label="Time of day">
        <span className="cond-label">Time</span>
        <div className="cond-chips">
          {TIMES_OF_DAY.map((t) => (
            <button key={t.id} type="button" className={`chip ${env.timeOfDay === t.id ? 'is-active' : ''}`} aria-pressed={env.timeOfDay === t.id} onClick={(e) => { env.setTimeOfDay(t.id); e.currentTarget.blur(); }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cond-row cond-row--wrap" role="group" aria-label="Weather">
        <span className="cond-label">Weather</span>
        <div className="cond-chips">
          {WEATHERS.map((w) => (
            <button key={w.id} type="button" className={`chip ${env.weather === w.id ? 'is-active' : ''}`} aria-pressed={env.weather === w.id} onClick={(e) => { env.setWeather(w.id); e.currentTarget.blur(); }}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cond-row cond-row--wrap" role="group" aria-label="Wind">
        <span className="cond-label">Wind</span>
        <div className="cond-chips">
          <button type="button" className={`chip ${!manual ? 'is-active' : ''}`} aria-pressed={!manual} onClick={(e) => { setManual(false); e.currentTarget.blur(); }}>Auto</button>
          <button type="button" className={`chip ${manual ? 'is-active' : ''}`} aria-pressed={manual} onClick={(e) => { setManual(true); e.currentTarget.blur(); }}>Manual</button>
        </div>
      </div>
      <label className="cond-slider">
        <span>Blowing toward {compassLabel((dir * Math.PI) / 180)} ({dir}°)</span>
        <input type="range" min={0} max={359} step={1} value={dir} disabled={!manual} className="form-range" onChange={(e) => { env.setWindDirection(Number(e.target.value)); }} onPointerUp={blurOnRelease} />
      </label>
      <label className="cond-slider">
        <span>Strength {strength.toFixed(1)} m/s</span>
        <input type="range" min={0} max={12} step={0.5} value={Math.min(12, strength)} disabled={!manual} className="form-range" onChange={(e) => { env.setWindStrength(Number(e.target.value)); }} onPointerUp={blurOnRelease} />
      </label>
      <p className="cond-note">Weather scales the wind in Auto mode. Climb to feel it more.</p>
    </div>
  );
}

