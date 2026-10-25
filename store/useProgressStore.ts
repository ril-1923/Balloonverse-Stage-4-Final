import { create } from 'zustand';
import { audio } from '../audio/audioEngine';
import { ACHIEVEMENTS, satisfiedAchievements } from '../simulation/achievements';
import { getMission, MISSIONS } from '../simulation/missionEngine';
import { getWorld } from '../simulation/worldDefinitions';
import {
  emptyProgress, emptyStats, type FlightRecord, type LifetimeStats, type MissionId, type ProgressData,
} from '../types/progress';
import { finiteNumber, isIsoDate, isRecord, KEYS, readStored, removeStored, writeStored } from '../utils/storage';
import { useNotificationStore } from './useNotificationStore';

export const HISTORY_LIMIT = 100;
const MISSION_IDS = new Set<string>(MISSIONS.map((m) => m.id));
const ACHIEVEMENT_IDS = new Set<string>(ACHIEVEMENTS.map((a) => a.id));
const WORLD_IDS = new Set(['mountain-valley', 'green-countryside', 'desert-adventure', 'lake-paradise', 'sunset-horizon', 'night-sky']);

function numberMap(raw: unknown, allowed?: (k: string) => boolean): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (allowed && !allowed(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}

export function parseStats(raw: unknown): LifetimeStats {
  const base = emptyStats();
  if (!isRecord(raw)) return base;
  return {
    takeoffs: finiteNumber(raw.takeoffs),
    totalFlights: finiteNumber(raw.totalFlights),
    totalDuration: finiteNumber(raw.totalDuration),
    totalDistance: finiteNumber(raw.totalDistance),
    highestAltitude: finiteNumber(raw.highestAltitude),
    maxAltitudeGain: finiteNumber(raw.maxAltitudeGain),
    successfulLandings: finiteNumber(raw.successfulLandings),
    hardLandings: finiteNumber(raw.hardLandings),
    flightsByWorld: numberMap(raw.flightsByWorld, (k) => WORLD_IDS.has(k)),
    distanceByWorld: numberMap(raw.distanceByWorld, (k) => WORLD_IDS.has(k)),
    balloonUses: numberMap(raw.balloonUses),
    cloudsReached: raw.cloudsReached === true,
  };
}

export function parseHistory(raw: unknown): FlightRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: FlightRecord[] = [];
  for (const r of raw) {
    if (!isRecord(r) || typeof r.id !== 'string' || !isIsoDate(r.date)) continue;
    if (typeof r.worldId !== 'string' || !WORLD_IDS.has(r.worldId)) continue;
    if (r.result !== 'soft' && r.result !== 'hard' && r.result !== 'aborted') continue;
    out.push({
      id: r.id,
      date: r.date,
      worldId: r.worldId,
      duration: finiteNumber(r.duration),
      maxAltitude: finiteNumber(r.maxAltitude),
      distance: finiteNumber(r.distance),
      result: r.result,
      balloon: typeof r.balloon === 'string' ? r.balloon.slice(0, 40) : 'Balloon',
      missions: Array.isArray(r.missions) ? r.missions.filter((m): m is string => typeof m === 'string' && MISSION_IDS.has(m)) : [],
    });
  }
  return out.slice(-HISTORY_LIMIT);
}

/** Cleans stored progress. Anything invalid is dropped; points are recomputed from completed missions. */
export function parseProgress(raw: unknown): ProgressData | null {
  if (!isRecord(raw)) return null;
  const completed: Record<string, string> = {};
  if (isRecord(raw.completed)) {
    for (const [k, v] of Object.entries(raw.completed)) if (MISSION_IDS.has(k) && isIsoDate(v)) completed[k] = v;
  }
  const achievements: Record<string, string> = {};
  if (isRecord(raw.achievements)) {
    for (const [k, v] of Object.entries(raw.achievements)) if (ACHIEVEMENT_IDS.has(k) && isIsoDate(v)) achievements[k] = v;
  }
  const best = numberMap(raw.bestProgress, (k) => MISSION_IDS.has(k));
  for (const k of Object.keys(best)) best[k] = Math.min(1, best[k]);
  const points = Object.keys(completed).reduce((sum, id) => sum + getMission(id as MissionId).reward.points, 0);
  return {
    completed,
    bestProgress: best,
    points,
    achievements,
    tracked: typeof raw.tracked === 'string' && MISSION_IDS.has(raw.tracked) ? (raw.tracked as MissionId) : null,
    stats: parseStats(raw.stats),
    history: parseHistory(raw.history),
  };
}

interface ProgressState extends ProgressData {
  completeMission: (id: MissionId, when?: string) => boolean;
  setTracked: (id: MissionId | null) => void;
  markTakeoff: () => void;
  markCloudsReached: () => void;
  recordFlight: (rec: Omit<FlightRecord, 'id'>, best?: Partial<Record<MissionId, number>>) => void;
  resetProgress: () => void;
  hydrate: () => void;
}

const loadProgress = (): ProgressData => readStored(KEYS.progress, parseProgress, emptyProgress);
const pickData = (s: ProgressState): ProgressData => ({
  completed: s.completed, bestProgress: s.bestProgress, points: s.points, achievements: s.achievements,
  tracked: s.tracked, stats: s.stats, history: s.history,
});

let recordCounter = 0;

export const useProgressStore = create<ProgressState>((set, get) => {
  const persist = () => writeStored(KEYS.progress, pickData(get()));

  /** Unlocks any achievement whose condition is now true. Each is unlocked once and announced once. */
  const unlockNew = () => {
    const s = get();
    const fresh = satisfiedAchievements({ stats: s.stats, completed: new Set(Object.keys(s.completed) as MissionId[]) })
      .filter((id) => !s.achievements[id]);
    if (fresh.length === 0) return;
    const now = new Date().toISOString();
    set({ achievements: { ...s.achievements, ...Object.fromEntries(fresh.map((id) => [id, now])) } });
    for (const id of fresh) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) useNotificationStore.getState().push({ kind: 'achievement', title: `Achievement unlocked: ${def.name}`, body: def.description });
    }
    audio.play('achievement');
  };

  return {
    ...loadProgress(),

    completeMission: (id, when) => {
      const s = get();
      if (s.completed[id]) return false; // rewards can only be collected once
      const def = getMission(id);
      set({
        completed: { ...s.completed, [id]: when ?? new Date().toISOString() },
        points: s.points + def.reward.points,
        bestProgress: { ...s.bestProgress, [id]: 1 },
      });
      useNotificationStore.getState().push({ kind: 'mission', title: `Mission complete: ${def.name}`, body: `+${def.reward.label}` });
      audio.play('mission');
      unlockNew();
      persist();
      return true;
    },

    setTracked: (tracked) => {
      set({ tracked });
      persist();
    },

    markTakeoff: () => {
      set({ stats: { ...get().stats, takeoffs: get().stats.takeoffs + 1 } });
      unlockNew();
      persist();
    },

    markCloudsReached: () => {
      if (get().stats.cloudsReached) return;
      set({ stats: { ...get().stats, cloudsReached: true } });
      unlockNew();
      persist();
    },

    recordFlight: (rec, best) => {
      const s = get();
      const world = getWorld(rec.worldId as never);
      const gain = Math.max(0, rec.maxAltitude - world.launch.height);
      const st = s.stats;
      const stats: LifetimeStats = {
        ...st,
        totalFlights: st.totalFlights + 1,
        totalDuration: st.totalDuration + rec.duration,
        totalDistance: st.totalDistance + rec.distance,
        highestAltitude: Math.max(st.highestAltitude, rec.maxAltitude),
        maxAltitudeGain: Math.max(st.maxAltitudeGain, gain),
        successfulLandings: st.successfulLandings + (rec.result === 'soft' ? 1 : 0),
        hardLandings: st.hardLandings + (rec.result === 'hard' ? 1 : 0),
        flightsByWorld: { ...st.flightsByWorld, [rec.worldId]: (st.flightsByWorld[rec.worldId] ?? 0) + 1 },
        distanceByWorld: { ...st.distanceByWorld, [rec.worldId]: (st.distanceByWorld[rec.worldId] ?? 0) + rec.distance },
        balloonUses: { ...st.balloonUses, [rec.balloon]: (st.balloonUses[rec.balloon] ?? 0) + 1 },
      };
      const merged = { ...s.bestProgress };
      for (const [id, p] of Object.entries(best ?? {})) {
        if (typeof p === 'number' && !s.completed[id]) merged[id] = Math.max(merged[id] ?? 0, Math.min(1, p));
      }
      const record: FlightRecord = { ...rec, id: `f-${Date.now().toString(36)}-${(recordCounter++).toString(36)}` };
      set({ stats, bestProgress: merged, history: [...s.history, record].slice(-HISTORY_LIMIT) });
      unlockNew();
      persist();
    },

    resetProgress: () => {
      removeStored(KEYS.progress);
      set({ ...emptyProgress() });
    },

    hydrate: () => set(loadProgress()),
  };
});

/** The mission the HUD and 3D markers follow: the chosen one, else the first unfinished mission. */
export function effectiveTracked(s: Pick<ProgressData, 'tracked' | 'completed'>): MissionId | null {
  if (s.tracked) return s.tracked;
  return MISSIONS.find((m) => !s.completed[m.id])?.id ?? null;
}
