import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import type { ReducedMotionSetting } from '../types/settings';

/** The user's setting wins; "system" follows the operating-system preference. */
export function resolveReducedMotion(setting: ReducedMotionSetting, systemPrefersReduced: boolean): boolean {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return systemPrefersReduced;
}

const query = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null);

export function useReducedMotion(): boolean {
  const setting = useSettingsStore((s) => s.reducedMotion);
  const [system, setSystem] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const mq = query();
    if (!mq) return;
    const onChange = () => setSystem(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return resolveReducedMotion(setting, system);
}
