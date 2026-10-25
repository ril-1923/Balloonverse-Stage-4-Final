import { useEffect } from 'react';
import { resetFlight, runtime, startFlight } from '../simulation/flightController';
import { useFlightStore } from '../store/useFlightStore';
import { useSettingsStore } from '../store/useSettingsStore';

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyC', 'KeyR', 'KeyP', 'KeyM', 'KeyH', 'Escape',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
}

/** Held-key state. Touch buttons write into the same sets via `setHeld`. */
const held = { ascend: new Set<string>(), descend: new Set<string>(), left: new Set<string>(), right: new Set<string>() };

function syncInput(): void {
  runtime.input.ascend = held.ascend.size > 0;
  runtime.input.descend = held.descend.size > 0;
  runtime.input.steer = (held.right.size > 0 ? 1 : 0) - (held.left.size > 0 ? 1 : 0);
}

export type HeldControl = keyof typeof held;

/** Press or release a virtual control (used by on-screen buttons). `source` identifies the pointer. */
export function setHeld(control: HeldControl, source: string, down: boolean): void {
  if (down) held[control].add(source);
  else held[control].delete(source);
  syncInput();
}

export function releaseAll(): void {
  (Object.keys(held) as HeldControl[]).forEach((k) => held[k].clear());
  syncInput();
}

const KEY_MAP: Record<string, HeldControl> = {
  KeyW: 'ascend', Space: 'ascend', ArrowUp: 'ascend',
  KeyS: 'descend', ArrowDown: 'descend',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function useKeyboardControls(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!GAME_KEYS.has(e.code)) return;
      e.preventDefault();
      const ui = useFlightStore.getState();

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (!e.repeat) ui.togglePaused();
        return;
      }
      if (e.repeat && (e.code === 'KeyC' || e.code === 'KeyR' || e.code === 'KeyM' || e.code === 'KeyH')) return;
      if (e.code === 'KeyM') return useSettingsStore.getState().toggleSound();
      if (e.code === 'KeyH') return useSettingsStore.getState().toggleHud();
      if (e.code === 'KeyC') return ui.cycleCamera();
      if (e.code === 'KeyR') {
        releaseAll();
        resetFlight();
        ui.setPaused(false);
        return;
      }
      if (ui.paused) return;

      const control = KEY_MAP[e.code];
      if (!control) return;
      if (runtime.state.phase === 'grounded' && control === 'ascend') startFlight();
      setHeld(control, e.code, true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const control = KEY_MAP[e.code];
      if (control) setHeld(control, e.code, false);
    };

    const onBlur = () => releaseAll();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onBlur);
      releaseAll();
    };
  }, [enabled]);
}
