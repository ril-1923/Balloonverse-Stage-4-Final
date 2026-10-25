import type { TimeOfDay } from './environment';
import type { CameraMode } from './flight';

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type ReducedMotionSetting = 'system' | 'on' | 'off';

export interface Settings {
  quality: GraphicsQuality;
  soundOn: boolean;
  /** 0..1 master volume */
  volume: number;
  /** 0.3..2.5 multiplier for drag-to-look and orbit speed */
  sensitivity: number;
  hudVisible: boolean;
  cameraPreference: CameraMode;
  /** 'auto' = each world's own suggested time of day */
  timeOfDay: TimeOfDay | 'auto';
  reducedMotion: ReducedMotionSetting;
}

export const DEFAULT_SETTINGS: Settings = {
  quality: 'high',
  soundOn: true,
  volume: 0.6,
  sensitivity: 1,
  hudVisible: true,
  cameraPreference: 'chase',
  timeOfDay: 'auto',
  reducedMotion: 'system',
};

export const SENSITIVITY_RANGE = { min: 0.3, max: 2.5 } as const;
