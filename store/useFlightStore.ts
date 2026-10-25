import { create } from 'zustand';
import type { CameraMode, FlightSnapshot } from '../types/flight';

const CAMERA_ORDER: CameraMode[] = ['chase', 'basket', 'side', 'cinematic'];

export interface LiveMission {
  id: string;
  name: string;
  objective: string;
  progress: number;
  complete: boolean;
  alreadyDone: boolean;
  target: { label: string; distance: number; bearing: number } | null;
}

interface FlightUiState {
  snapshot: FlightSnapshot | null;
  mission: LiveMission | null;
  setMission: (m: LiveMission | null) => void;
  cameraMode: CameraMode;
  paused: boolean;
  hudCollapsed: boolean;
  guideOpen: boolean;
  conditionsOpen: boolean;
  toggleConditions: () => void;
  setSnapshot: (s: FlightSnapshot) => void;
  setCameraMode: (m: CameraMode) => void;
  cycleCamera: () => void;
  setPaused: (p: boolean) => void;
  togglePaused: () => void;
  toggleHud: () => void;
  toggleGuide: () => void;
}

/** Slow-changing UI state plus a throttled (≈10 Hz) snapshot of the simulation for the HUD. */
export const useFlightStore = create<FlightUiState>((set) => ({
  snapshot: null,
  mission: null,
  setMission: (mission) => set({ mission }),
  cameraMode: 'chase',
  paused: false,
  hudCollapsed: false,
  guideOpen: false,
  conditionsOpen: false,
  toggleConditions: () => set((st) => ({ conditionsOpen: !st.conditionsOpen })),
  setSnapshot: (snapshot) => set({ snapshot }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  cycleCamera: () =>
    set((st) => ({ cameraMode: CAMERA_ORDER[(CAMERA_ORDER.indexOf(st.cameraMode) + 1) % CAMERA_ORDER.length] })),
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((st) => ({ paused: !st.paused })),
  toggleHud: () => set((st) => ({ hudCollapsed: !st.hudCollapsed })),
  toggleGuide: () => set((st) => ({ guideOpen: !st.guideOpen })),
}));

export { CAMERA_ORDER };
