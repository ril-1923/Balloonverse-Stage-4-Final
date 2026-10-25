import type { GraphicsQuality } from '../types/settings';

export interface QualityProfile {
  /** Upper limit for devicePixelRatio. */
  maxDpr: number;
  antialias: boolean;
  /** Terrain mesh subdivisions per side. */
  terrainSegments: number;
  /** Multiplier on the number of trees, rocks, houses and so on. */
  props: number;
  /** Multiplier on the number of cloud banks. */
  clouds: number;
  /** Multiplier on the number of distant peaks. */
  ring: number;
}

export const QUALITY: Record<GraphicsQuality, QualityProfile> = {
  low: { maxDpr: 1, antialias: false, terrainSegments: 90, props: 0.35, clouds: 0.5, ring: 0.6 },
  medium: { maxDpr: 1.25, antialias: true, terrainSegments: 130, props: 0.7, clouds: 0.75, ring: 0.85 },
  high: { maxDpr: 1.75, antialias: true, terrainSegments: 160, props: 1, clouds: 1, ring: 1 },
};

export const QUALITY_NOTES: Record<GraphicsQuality, string> = {
  low: 'Fewest trees and clouds, simpler terrain, no anti-aliasing, 1× resolution. Best for integrated graphics and older phones.',
  medium: 'About 70% of the trees, lighter terrain and clouds, up to 1.25× resolution.',
  high: 'Everything on: full forests and clouds, the most detailed terrain, anti-aliasing and up to 1.75× resolution.',
};

export const getQuality = (q: GraphicsQuality): QualityProfile => QUALITY[q];
