import { useEffect } from 'react';
import { audio } from '../audio/audioEngine';
import { useSettingsStore } from '../store/useSettingsStore';
import { useReducedMotion } from './useReducedMotion';

/** Applies settings that live outside React: audio, the reduced-motion class and the first-gesture audio unlock. */
export function useApplySettings(): void {
  const reduced = useReducedMotion();

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduced);
  }, [reduced]);

  useEffect(() => {
    const apply = (s: { soundOn: boolean; volume: number }) => {
      audio.setVolume(s.volume);
      audio.setEnabled(s.soundOn);
    };
    apply(useSettingsStore.getState());
    const unsub = useSettingsStore.subscribe(apply);

    // Browsers only allow audio after a user gesture, so the engine starts on the first click, tap or key press.
    const unlock = () => {
      audio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    const onVisibility = () => (document.hidden ? audio.suspend() : audio.resume());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsub();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
