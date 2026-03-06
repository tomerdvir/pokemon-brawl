export type ElementType = 'electric' | 'fire' | 'grass' | 'water' | 'normal' | 'fairy' | 'psychic';

/** Type effectiveness multiplier: attacker type → defender type → multiplier */
const TYPE_CHART: Partial<Record<ElementType, Partial<Record<ElementType, number>>>> = {
  electric: { water: 1.5, grass: 0.75 },
  fire:     { grass: 1.5, water: 0.75, fire: 0.75 },
  grass:    { water: 1.5, fire: 0.75, grass: 0.75 },
  water:    { fire: 1.5, grass: 0.75, water: 0.75 },
  fairy:    { psychic: 1.5, fire: 0.75 },
  psychic:  { fairy: 0.75 },
};

export function getTypeMultiplier(attackerType: ElementType, defenderType: ElementType): number {
  return TYPE_CHART[attackerType]?.[defenderType] ?? 1;
}

export interface CharacterDef {
  id: string;
  name: string;
  hp: number;
  attackPower: number;
  defense: number;
  specialPower: number;
  type: ElementType;
  /** Colour used for UI accent / card border */
  color: number;
  /** Colour used for the outline / accent */
  accent: number;
  specialName: string;
  /** Short emoji shown on the select screen */
  emoji: string;
  /** Key used for the loaded sprite texture */
  spriteKey: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'pikachu',
    name: 'Pikachu',
    hp: 100,
    attackPower: 14,
    defense: 6,
    specialPower: 25,
    type: 'electric',
    color: 0xf5d442,
    accent: 0xe8a817,
    specialName: 'Thunder Bolt',
    emoji: '⚡',
    spriteKey: 'sprite-pikachu',
  },
  {
    id: 'charizard',
    name: 'Charizard',
    hp: 120,
    attackPower: 16,
    defense: 8,
    specialPower: 28,
    type: 'fire',
    color: 0xe85d2d,
    accent: 0xf5a623,
    specialName: 'Fire Blast',
    emoji: '🔥',
    spriteKey: 'sprite-charizard',
  },
  {
    id: 'bulbasaur',
    name: 'Bulbasaur',
    hp: 110,
    attackPower: 12,
    defense: 7,
    specialPower: 22,
    type: 'grass',
    color: 0x6bc568,
    accent: 0x3a8a37,
    specialName: 'Vine Whip',
    emoji: '🌿',
    spriteKey: 'sprite-bulbasaur',
  },
  {
    id: 'squirtle',
    name: 'Squirtle',
    hp: 105,
    attackPower: 13,
    defense: 9,
    specialPower: 23,
    type: 'water',
    color: 0x5db9e8,
    accent: 0x2980b9,
    specialName: 'Hydro Pump',
    emoji: '💧',
    spriteKey: 'sprite-squirtle',
  },
  {
    id: 'eevee',
    name: 'Eevee',
    hp: 95,
    attackPower: 13,
    defense: 5,
    specialPower: 24,
    type: 'normal',
    color: 0xd7b07f,
    accent: 0xa5845a,
    specialName: 'Swift',
    emoji: '🌟',
    spriteKey: 'sprite-eevee',
  },
  {
    id: 'jigglypuff',
    name: 'Jigglypuff',
    hp: 115,
    attackPower: 10,
    defense: 6,
    specialPower: 26,
    type: 'fairy',
    color: 0xfac8c9,
    accent: 0xe8a0a2,
    specialName: 'Sing',
    emoji: '🎤',
    spriteKey: 'sprite-jigglypuff',
  },
  {
    id: 'meowth',
    name: 'Meowth',
    hp: 90,
    attackPower: 15,
    defense: 4,
    specialPower: 22,
    type: 'normal',
    color: 0xffeba8,
    accent: 0xd4b56a,
    specialName: 'Pay Day',
    emoji: '💰',
    spriteKey: 'sprite-meowth',
  },
  {
    id: 'psyduck',
    name: 'Psyduck',
    hp: 100,
    attackPower: 12,
    defense: 5,
    specialPower: 28,
    type: 'psychic',
    color: 0xffe572,
    accent: 0xd4b840,
    specialName: 'Confusion',
    emoji: '🌀',
    spriteKey: 'sprite-psyduck',
  },
  {
    id: 'kai',
    name: 'Kai',
    hp: 115,
    attackPower: 17,
    defense: 7,
    specialPower: 30,
    type: 'fire',
    color: 0xcc2222,
    accent: 0x991111,
    specialName: 'Fire Strike',
    emoji: '🗡️',
    spriteKey: 'sprite-kai',
  },
  {
    id: 'skylor',
    name: 'Skylor',
    hp: 105,
    attackPower: 15,
    defense: 6,
    specialPower: 27,
    type: 'normal',
    color: 0xf5a623,
    accent: 0xd48b0a,
    specialName: 'Amber Barrage',
    emoji: '🏹',
    spriteKey: 'sprite-skylor',
  },
];
