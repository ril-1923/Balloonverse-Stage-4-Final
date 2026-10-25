export type BalloonPattern = 'solid' | 'vertical' | 'horizontal' | 'alternating' | 'rainbow' | 'checkerboard';
export type BalloonMaterial = 'fabric' | 'satin' | 'matte' | 'glossy';
export type BasketStyle = 'lightWicker' | 'darkWicker' | 'premium';
export type BurnerEffect = 'classic' | 'blue' | 'golden' | 'emerald';

export interface BalloonConfig {
  name: string;
  /** Primary, secondary and accent colours (hex). */
  colors: string[];
  pattern: BalloonPattern;
  material: BalloonMaterial;
  basket: BasketStyle;
  burner: BurnerEffect;
}

export interface SavedDesign {
  id: string;
  name: string;
  config: BalloonConfig;
  createdAt: string;
}

export const PATTERNS: { id: BalloonPattern; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'vertical', label: 'Vertical stripes' },
  { id: 'horizontal', label: 'Horizontal stripes' },
  { id: 'alternating', label: 'Alternating panels' },
  { id: 'rainbow', label: 'Rainbow' },
  { id: 'checkerboard', label: 'Checkerboard' },
];
export const MATERIALS: { id: BalloonMaterial; label: string }[] = [
  { id: 'fabric', label: 'Fabric' },
  { id: 'satin', label: 'Satin' },
  { id: 'matte', label: 'Matte' },
  { id: 'glossy', label: 'Glossy' },
];
export const BASKETS: { id: BasketStyle; label: string }[] = [
  { id: 'lightWicker', label: 'Light wicker' },
  { id: 'darkWicker', label: 'Dark wicker' },
  { id: 'premium', label: 'Premium' },
];
export const BURNERS: { id: BurnerEffect; label: string }[] = [
  { id: 'classic', label: 'Classic fire' },
  { id: 'blue', label: 'Blue flame' },
  { id: 'golden', label: 'Golden blaze' },
  { id: 'emerald', label: 'Emerald glow' },
];

export const DEFAULT_BALLOON: BalloonConfig = {
  name: 'Sunrise Gold',
  colors: ['#f6b73c', '#e8590c', '#fff1d0'],
  pattern: 'vertical',
  material: 'fabric',
  basket: 'lightWicker',
  burner: 'classic',
};
