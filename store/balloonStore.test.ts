import { beforeEach, describe, expect, it } from 'vitest';
import { BALLOON_PRESETS, SAMPLE_DESIGN_NAMES } from '../simulation/balloonPresets';
import { cleanName, MAX_NAME, parseBalloonConfig, parseDesigns, uniqueName, useBalloonStore } from './useBalloonStore';
import { DEFAULT_BALLOON } from '../types/balloon';
import { createMemoryStorage, KEYS, setStorageBackend } from '../utils/storage';

const s = () => useBalloonStore.getState();
let mem: ReturnType<typeof createMemoryStorage>;

beforeEach(() => {
  mem = createMemoryStorage();
  setStorageBackend(mem);
  s().hydrate();
});

describe('presets', () => {
  it('has 10 distinct, valid presets with the required names', () => {
    expect(BALLOON_PRESETS).toHaveLength(10);
    expect(BALLOON_PRESETS.map((p) => p.name)).toEqual([
      'Sunrise Gold', 'Ocean Blue', 'Sunset Orange', 'Forest Green', 'Royal Purple',
      'Candy Rainbow', 'Midnight Star', 'Arctic Ice', 'Desert Sand', 'Neon Adventure',
    ]);
    for (const p of BALLOON_PRESETS) expect(parseBalloonConfig(p)).toEqual(p);
    expect(new Set(BALLOON_PRESETS.map((p) => p.colors.join())).size).toBe(10);
  });

  it('applying a preset changes the current balloon and persists it', () => {
    for (const p of BALLOON_PRESETS) {
      s().applyPreset(p.name);
      expect(s().current).toEqual(p);
    }
    s().applyPreset('Arctic Ice');
    s().hydrate();
    expect(s().current.name).toBe('Arctic Ice');
  });

  it('ignores unknown preset names', () => {
    s().applyPreset('Nope');
    expect(s().current).toEqual(DEFAULT_BALLOON);
  });
});

describe('saved designs', () => {
  it('seeds at least five example designs on first use', () => {
    expect(s().designs.length).toBeGreaterThanOrEqual(5);
    expect(s().designs.map((d) => d.name)).toEqual(SAMPLE_DESIGN_NAMES);
  });

  it('stores the actual configuration, not just the name', () => {
    s().update({ name: 'My Kite', pattern: 'checkerboard', material: 'glossy', basket: 'premium', burner: 'blue' });
    s().setColor(0, '#112233');
    s().setColor(1, '#aabbcc');
    const res = s().saveCurrent();
    expect(res).toEqual({ ok: true, name: 'My Kite', renamed: false });
    const saved = s().designs.find((d) => d.name === 'My Kite')!;
    expect(saved.config).toMatchObject({ pattern: 'checkerboard', material: 'glossy', basket: 'premium', burner: 'blue' });
    expect(saved.config.colors.slice(0, 2)).toEqual(['#112233', '#aabbcc']);

    s().applyPreset('Forest Green');
    expect(s().current.pattern).not.toBe('checkerboard');
    expect(s().loadDesign(saved.id)).toBe(true);
    expect(s().current).toEqual(saved.config);
  });

  it('saved designs are independent copies of the current balloon', () => {
    s().update({ name: 'Copy Test' });
    s().saveCurrent();
    const saved = s().designs.find((d) => d.name === 'Copy Test')!;
    s().setColor(0, '#ff0000');
    expect(saved.config.colors[0]).not.toBe('#ff0000');
    expect(s().designs.find((d) => d.id === saved.id)!.config.colors[0]).not.toBe('#ff0000');
  });

  it('handles duplicate names by numbering them', () => {
    s().update({ name: 'Ocean Blue' });
    const r = s().saveCurrent();
    expect(r).toEqual({ ok: true, name: 'Ocean Blue (2)', renamed: true });
    expect(s().current.name).toBe('Ocean Blue (2)');
    s().update({ name: 'ocean blue' });
    expect(s().saveCurrent()).toMatchObject({ ok: true, name: 'ocean blue (3)', renamed: true });
    const names = s().designs.map((d) => d.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('rejects empty names and trims messy ones', () => {
    s().update({ name: '   ' });
    expect(s().saveCurrent()).toMatchObject({ ok: false });
    const before = s().designs.length;
    expect(s().designs).toHaveLength(before);
    s().update({ name: '  Spaced    Out  ' });
    expect(s().saveCurrent()).toMatchObject({ ok: true, name: 'Spaced Out' });
    expect(cleanName('x'.repeat(100))!.length).toBe(MAX_NAME);
    expect(cleanName(42)).toBeNull();
  });

  it('renames designs, avoiding clashes with other designs but not with itself', () => {
    const [a, b] = s().designs;
    expect(s().renameDesign(a.id, 'Fresh Name')).toEqual({ ok: true, name: 'Fresh Name', renamed: false });
    expect(s().designs.find((d) => d.id === a.id)!.config.name).toBe('Fresh Name');
    expect(s().renameDesign(a.id, b.name)).toMatchObject({ ok: true, renamed: true, name: `${b.name} (2)` });
    expect(s().renameDesign(b.id, b.name)).toMatchObject({ ok: true, renamed: false });
    expect(s().renameDesign(a.id, '  ')).toMatchObject({ ok: false });
    expect(s().renameDesign('nope', 'x')).toMatchObject({ ok: false });
  });

  it('deletes designs and keeps the deletion across reloads (no re-seeding)', () => {
    for (const d of [...s().designs]) s().deleteDesign(d.id);
    expect(s().designs).toHaveLength(0);
    s().hydrate();
    expect(s().designs).toHaveLength(0);
    expect(s().restoreSamples()).toBe(5);
    expect(s().restoreSamples()).toBe(0);
  });

  it('persists designs and the current balloon across a reload', () => {
    s().update({ name: 'Persisted', pattern: 'rainbow' });
    s().saveCurrent();
    s().hydrate();
    expect(s().current).toMatchObject({ name: 'Persisted', pattern: 'rainbow' });
    expect(s().designs.some((d) => d.name === 'Persisted')).toBe(true);
  });

  it('reset restores the default balloon', () => {
    s().applyPreset('Neon Adventure');
    s().resetCurrent();
    expect(s().current).toEqual(DEFAULT_BALLOON);
  });

  it('ignores invalid colours', () => {
    s().setColor(0, 'not-a-colour');
    s().setColor(7, '#ffffff');
    expect(s().current.colors).toEqual(DEFAULT_BALLOON.colors);
  });
});

describe('recovering from bad stored data', () => {
  it('falls back to samples and the default when JSON is corrupt', () => {
    mem.setItem(KEYS.designs, '[[[');
    mem.setItem(KEYS.currentDesign, 'oops');
    s().hydrate();
    expect(s().designs).toHaveLength(5);
    expect(s().current).toEqual(DEFAULT_BALLOON);
  });

  it('repairs individual bad fields and drops unusable designs', () => {
    mem.setItem(KEYS.currentDesign, JSON.stringify({ name: 'Odd', colors: ['#112233', 'bad'], pattern: 'wavy', material: 5, basket: 'premium' }));
    mem.setItem(KEYS.designs, JSON.stringify([
      { id: 'a', name: 'Good', config: { colors: ['#111111', '#222222', '#333333'], pattern: 'solid' }, createdAt: '2024-01-01T00:00:00Z' },
      { id: 'a', name: 'Duplicate id', config: {} },
      { id: 'b', name: '', config: {} },
      'junk',
      { id: 'c', name: 'No config' },
    ]));
    s().hydrate();
    expect(s().current.colors).toEqual(['#112233', DEFAULT_BALLOON.colors[1], DEFAULT_BALLOON.colors[2]]);
    expect(s().current.pattern).toBe(DEFAULT_BALLOON.pattern);
    expect(s().current.basket).toBe('premium');
    expect(s().designs.map((d) => d.name)).toEqual(['Good']);
    expect(s().designs[0].config.material).toBe(DEFAULT_BALLOON.material);
  });

  it('parse helpers reject non-objects', () => {
    expect(parseBalloonConfig(null)).toBeNull();
    expect(parseBalloonConfig([])).toBeNull();
    expect(parseDesigns({})).toBeNull();
    expect(uniqueName('A', ['a'])).toBe('A (2)');
    expect(uniqueName('A', ['b'])).toBe('A');
  });
});
