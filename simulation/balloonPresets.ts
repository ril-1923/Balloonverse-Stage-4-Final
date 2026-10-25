import type { BalloonConfig, BalloonMaterial, BurnerEffect } from '../types/balloon';

export const BALLOON_PRESETS: BalloonConfig[] = [
  { name: 'Sunrise Gold', colors: ['#f6b73c', '#e8590c', '#fff1d0'], pattern: 'vertical', material: 'fabric', basket: 'lightWicker', burner: 'classic' },
  { name: 'Ocean Blue', colors: ['#0a6fb5', '#74d0ff', '#ffffff'], pattern: 'alternating', material: 'satin', basket: 'lightWicker', burner: 'blue' },
  { name: 'Sunset Orange', colors: ['#ff7a2f', '#c7311c', '#ffd27a'], pattern: 'horizontal', material: 'fabric', basket: 'darkWicker', burner: 'golden' },
  { name: 'Forest Green', colors: ['#1f7a3d', '#0e4d28', '#c8e6b0'], pattern: 'vertical', material: 'matte', basket: 'darkWicker', burner: 'emerald' },
  { name: 'Royal Purple', colors: ['#6a2fb3', '#ffd166', '#f3e8ff'], pattern: 'alternating', material: 'satin', basket: 'premium', burner: 'golden' },
  { name: 'Candy Rainbow', colors: ['#ff5d8f', '#ffd166', '#5cc8ff'], pattern: 'rainbow', material: 'fabric', basket: 'lightWicker', burner: 'classic' },
  { name: 'Midnight Star', colors: ['#0b1f3a', '#ffd166', '#3b5b9a'], pattern: 'checkerboard', material: 'glossy', basket: 'premium', burner: 'blue' },
  { name: 'Arctic Ice', colors: ['#bfe9ff', '#ffffff', '#5cc8ff'], pattern: 'vertical', material: 'glossy', basket: 'lightWicker', burner: 'blue' },
  { name: 'Desert Sand', colors: ['#d9ac6b', '#a8603a', '#f5e3bd'], pattern: 'horizontal', material: 'matte', basket: 'darkWicker', burner: 'classic' },
  { name: 'Neon Adventure', colors: ['#39ff88', '#ff2fd2', '#00e5ff'], pattern: 'vertical', material: 'glossy', basket: 'premium', burner: 'emerald' },
];

/** Names of the presets that are saved as example designs the first time the app runs. */
export const SAMPLE_DESIGN_NAMES = ['Sunrise Gold', 'Ocean Blue', 'Sunset Orange', 'Candy Rainbow', 'Midnight Star'];

/** 12 quick-pick colours for the colour picker. */
export const SWATCHES = [
  '#f6b73c', '#e8590c', '#c7311c', '#ff5d8f', '#6a2fb3', '#0a6fb5',
  '#5cc8ff', '#1f7a3d', '#39ff88', '#fff1d0', '#0b1f3a', '#8c929a',
];

export const BURNER_PALETTES: Record<BurnerEffect, { outer: string; mid: string; core: string; light: string }> = {
  classic: { outer: '#ff6a1a', mid: '#ffc23a', core: '#fff4d6', light: '#ff9a3c' },
  blue: { outer: '#2a6bff', mid: '#6fb6ff', core: '#e6f4ff', light: '#6aa6ff' },
  golden: { outer: '#ffb000', mid: '#ffe066', core: '#fffbe0', light: '#ffd24a' },
  emerald: { outer: '#17c964', mid: '#7dffb0', core: '#eafff2', light: '#5dffa0' },
};

export const MATERIAL_PROPS: Record<BalloonMaterial, { roughness: number; metalness: number }> = {
  fabric: { roughness: 0.78, metalness: 0 },
  satin: { roughness: 0.38, metalness: 0.08 },
  matte: { roughness: 1, metalness: 0 },
  glossy: { roughness: 0.12, metalness: 0.15 },
};
