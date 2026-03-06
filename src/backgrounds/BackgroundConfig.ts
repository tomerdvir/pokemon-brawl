/**
 * Background configuration registry.
 * To add a new background: drop an image in public/assets/backgrounds/
 * and add an entry here. The game will randomly pick one for each battle.
 */

export interface BattleBackground {
  /** Unique key used by Phaser to reference the loaded texture */
  key: string;
  /** File path relative to the public folder */
  path: string;
  /** Display name (shown optionally in UI) */
  label: string;
  /** Optional tint overlay colour (0xRRGGBB) applied on top of the image */
  tint?: number;
  /** If true, draw this background procedurally instead of loading an image */
  procedural?: boolean;
}

/** Master list of available battle backgrounds */
export const BATTLE_BACKGROUNDS: BattleBackground[] = [
  {
    key: 'bg_medieval_arena',
    path: '',
    label: 'Medieval Arena',
    procedural: true,
  },
  {
    key: 'bg_enchanted_forest',
    path: '',
    label: 'Enchanted Forest',
    procedural: true,
  },
  {
    key: 'bg_volcanic_crater',
    path: '',
    label: 'Volcanic Crater',
    procedural: true,
  },
  {
    key: 'bg_frozen_peaks',
    path: '',
    label: 'Frozen Peaks',
    procedural: true,
  },
  {
    key: 'bg_ocean_cliffs',
    path: '',
    label: 'Ocean Cliffs',
    procedural: true,
  },
];

/** Pick a random background from the registry */
export function randomBackground(): BattleBackground {
  return BATTLE_BACKGROUNDS[Math.floor(Math.random() * BATTLE_BACKGROUNDS.length)];
}
