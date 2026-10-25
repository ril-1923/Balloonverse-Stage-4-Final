import { beforeEach, describe, expect, it } from 'vitest';
import { effectiveTracked, HISTORY_LIMIT, parseProgress, useProgressStore } from './useProgressStore';
import { useNotificationStore } from './useNotificationStore';
import { MISSIONS } from '../simulation/missionEngine';
import { WORLDS } from '../simulation/worldDefinitions';
import { favoriteWorld, mostUsedBalloon, topKey } from '../simulation/statsSummary';
import { createMemoryStorage, KEYS, setStorageBackend } from '../utils/storage';
import type { FlightRecord } from '../types/progress';

const s = () => useProgressStore.getState();
const notes = () => useNotificationStore.getState().items;
let mem: ReturnType<typeof createMemoryStorage>;

const rec = (over: Partial<Omit<FlightRecord, 'id'>> = {}): Omit<FlightRecord, 'id'> => ({
  date: '2025-02-01T10:00:00.000Z',
  worldId: 'mountain-valley',
  duration: 120,
  maxAltitude: 100,
  distance: 400,
  result: 'soft',
  balloon: 'Sunrise Gold',
  missions: [],
  ...over,
});

beforeEach(() => {
  mem = createMemoryStorage();
  setStorageBackend(mem);
  s().resetProgress();
  useNotificationStore.getState().clear();
});

describe('missions and rewards', () => {
  it('awards a mission once and never pays the reward twice', () => {
    expect(s().completeMission('sky-explorer')).toBe(true);
    const pts = s().points;
    expect(pts).toBe(100);
    expect(s().completeMission('sky-explorer')).toBe(false);
    expect(s().points).toBe(pts);
    expect(notes().filter((n) => n.kind === 'mission')).toHaveLength(1);
  });

  it('adds up rewards across missions', () => {
    for (const m of MISSIONS) s().completeMission(m.id);
    expect(s().points).toBe(MISSIONS.reduce((n, m) => n + m.reward.points, 0));
    expect(Object.keys(s().completed)).toHaveLength(8);
    expect(s().achievements['mission-master']).toBeTruthy();
  });

  it('tracks the first unfinished mission by default and respects a chosen one', () => {
    expect(effectiveTracked(s())).toBe('first-flight');
    s().completeMission('first-flight');
    expect(effectiveTracked(s())).toBe('sky-explorer');
    s().setTracked('precision-landing');
    expect(effectiveTracked(s())).toBe('precision-landing');
    for (const m of MISSIONS) s().completeMission(m.id);
    s().setTracked(null);
    expect(effectiveTracked(s())).toBeNull();
  });
});

describe('recording flights', () => {
  it('updates lifetime statistics and history from real records', () => {
    s().recordFlight(rec());
    s().recordFlight(rec({ worldId: 'desert-adventure', duration: 60, maxAltitude: 300, distance: 200, result: 'hard', balloon: 'Ocean Blue' }));
    s().recordFlight(rec({ result: 'aborted', duration: 20, distance: 50 }));
    const { stats, history } = s();
    expect(stats.totalFlights).toBe(3);
    expect(stats.totalDuration).toBe(200);
    expect(stats.totalDistance).toBe(650);
    expect(stats.highestAltitude).toBe(300);
    expect(stats.successfulLandings).toBe(1);
    expect(stats.hardLandings).toBe(1);
    expect(stats.flightsByWorld).toEqual({ 'mountain-valley': 2, 'desert-adventure': 1 });
    expect(stats.distanceByWorld['mountain-valley']).toBe(450);
    expect(stats.balloonUses).toEqual({ 'Sunrise Gold': 2, 'Ocean Blue': 1 });
    expect(history).toHaveLength(3);
    expect(history.map((h) => h.result)).toEqual(['soft', 'hard', 'aborted']);
    expect(new Set(history.map((h) => h.id)).size).toBe(3);
    expect(favoriteWorld(stats)).toBe('mountain-valley');
    expect(mostUsedBalloon(stats)).toBe('Sunrise Gold');
  });

  it('keeps only the most recent flights', () => {
    for (let i = 0; i < HISTORY_LIMIT + 15; i++) s().recordFlight(rec({ distance: i }));
    expect(s().history).toHaveLength(HISTORY_LIMIT);
    expect(s().history[HISTORY_LIMIT - 1].distance).toBe(HISTORY_LIMIT + 14);
    expect(s().stats.totalFlights).toBe(HISTORY_LIMIT + 15); // lifetime totals are not capped
  });

  it('remembers the best mission progress but never lowers it', () => {
    s().recordFlight(rec(), { 'sky-explorer': 0.6, 'cloud-chaser': 0.2 });
    s().recordFlight(rec(), { 'sky-explorer': 0.3, 'cloud-chaser': 0.4 });
    expect(s().bestProgress['sky-explorer']).toBeCloseTo(0.6);
    expect(s().bestProgress['cloud-chaser']).toBeCloseTo(0.4);
  });
});

describe('achievements', () => {
  it('unlock only when their conditions are met and are announced once', () => {
    expect(Object.keys(s().achievements)).toEqual([]);
    s().markTakeoff();
    expect(Object.keys(s().achievements)).toEqual(['first-takeoff']);
    s().recordFlight(rec({ result: 'hard' }));
    expect(s().achievements['first-landing']).toBeUndefined();
    s().recordFlight(rec({ result: 'soft' }));
    expect(s().achievements['first-landing']).toBeTruthy();
    s().recordFlight(rec({ result: 'soft' }));
    expect(notes().filter((n) => n.title.includes('First Landing'))).toHaveLength(1);
    expect(notes().every((n) => n.kind !== 'achievement' || n.title.startsWith('Achievement unlocked'))).toBe(true);
  });

  it('High Flyer needs a 250 m gain over the world\'s own launch height', () => {
    const w = WORLDS[2]; // desert launches at 34 m
    s().recordFlight(rec({ worldId: w.id, maxAltitude: w.launch.height + 249 }));
    expect(s().achievements['high-flyer']).toBeUndefined();
    s().recordFlight(rec({ worldId: w.id, maxAltitude: w.launch.height + 251 }));
    expect(s().achievements['high-flyer']).toBeTruthy();
  });

  it('World Explorer unlocks after flying in all six worlds', () => {
    WORLDS.slice(0, 5).forEach((w) => s().recordFlight(rec({ worldId: w.id })));
    expect(s().achievements['world-explorer']).toBeUndefined();
    s().recordFlight(rec({ worldId: WORLDS[5].id }));
    expect(s().achievements['world-explorer']).toBeTruthy();
  });

  it('Cloud Explorer unlocks when the cloud layer is reached, once', () => {
    s().markCloudsReached();
    s().markCloudsReached();
    expect(s().achievements['cloud-explorer']).toBeTruthy();
    expect(notes().filter((n) => n.title.includes('Cloud Explorer'))).toHaveLength(1);
  });
});

describe('persistence and recovery', () => {
  it('survives a reload', () => {
    s().completeMission('first-flight');
    s().markTakeoff();
    s().recordFlight(rec());
    s().setTracked('wind-rider');
    const before = { ...s() };
    s().hydrate();
    expect(s().completed).toEqual(before.completed);
    expect(s().points).toBe(50);
    expect(s().stats.totalFlights).toBe(1);
    expect(s().history).toHaveLength(1);
    expect(s().achievements).toEqual(before.achievements);
    expect(s().tracked).toBe('wind-rider');
  });

  it('recovers from corrupt JSON', () => {
    mem.setItem(KEYS.progress, '}{');
    s().hydrate();
    expect(s().points).toBe(0);
    expect(s().history).toEqual([]);
    expect(s().stats.totalFlights).toBe(0);
  });

  it('cleans bad fields and recomputes points instead of trusting them', () => {
    const cleaned = parseProgress({
      points: 999999,
      completed: { 'first-flight': '2025-01-01T00:00:00Z', 'fake-mission': '2025-01-01T00:00:00Z', 'sky-explorer': 'yesterday' },
      achievements: { 'first-takeoff': '2025-01-01T00:00:00Z', cheater: '2025-01-01T00:00:00Z' },
      bestProgress: { 'wind-rider': 7, 'cloud-chaser': -3, nope: 1 },
      tracked: 'not-a-mission',
      stats: { totalFlights: -4, totalDistance: 'lots', highestAltitude: 500, flightsByWorld: { 'night-sky': 2, atlantis: 9 }, cloudsReached: 'yes' },
      history: [
        { id: 'a', date: '2025-01-01T00:00:00Z', worldId: 'night-sky', result: 'soft', duration: 10, maxAltitude: 5, distance: 3, balloon: 'B', missions: ['first-flight', 'bogus'] },
        { id: 'b', date: 'nope', worldId: 'night-sky', result: 'soft' },
        { id: 'c', date: '2025-01-01T00:00:00Z', worldId: 'atlantis', result: 'soft' },
        { id: 'd', date: '2025-01-01T00:00:00Z', worldId: 'night-sky', result: 'exploded' },
        7,
      ],
    })!;
    expect(cleaned.points).toBe(50);
    expect(Object.keys(cleaned.completed)).toEqual(['first-flight']);
    expect(Object.keys(cleaned.achievements)).toEqual(['first-takeoff']);
    expect(cleaned.bestProgress).toEqual({ 'wind-rider': 1, 'cloud-chaser': undefined });
    expect(cleaned.tracked).toBeNull();
    expect(cleaned.stats).toMatchObject({ totalFlights: 0, totalDistance: 0, highestAltitude: 500, cloudsReached: false });
    expect(cleaned.stats.flightsByWorld).toEqual({ 'night-sky': 2 });
    expect(cleaned.history).toHaveLength(1);
    expect(cleaned.history[0].missions).toEqual(['first-flight']);
    expect(parseProgress('nope')).toBeNull();
  });

  it('reset clears everything including storage', () => {
    s().completeMission('first-flight');
    s().recordFlight(rec());
    s().resetProgress();
    expect(s().points).toBe(0);
    expect(s().history).toEqual([]);
    expect(mem.dump()[KEYS.progress]).toBeUndefined();
    s().hydrate();
    expect(s().stats.totalFlights).toBe(0);
  });
});

describe('summary helpers', () => {
  it('topKey picks the highest, ties alphabetical, empty is null', () => {
    expect(topKey({})).toBeNull();
    expect(topKey({ a: 0 })).toBeNull();
    expect(topKey({ b: 2, a: 2, c: 1 })).toBe('a');
  });
});
