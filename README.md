# Pokémon Brawl

A turn-based Pokémon battle game built with Phaser 3 and TypeScript. Designed for kids with colorful visuals, polished animations, and simple mechanics. Supports 1-player (vs AI) and local 2-player modes.

## Play

Hosted on GitHub Pages or run locally:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Game Flow

1. **Title Screen** — Choose 1P (vs AI) or 2P (local multiplayer)
2. **Character Select** — Each player picks from 10 fighters in a scrollable grid
3. **Battle** — Turn-based combat until one fighter is KO'd

## Characters

| Fighter    | HP  | Type     | Special Move    |
|------------|-----|----------|-----------------|
| Pikachu    | 100 | ⚡ Electric | Thunder Bolt   |
| Charizard  | 120 | 🔥 Fire    | Fire Blast     |
| Bulbasaur  | 110 | 🌿 Grass   | Vine Whip      |
| Squirtle   | 105 | 💧 Water   | Hydro Pump     |
| Eevee      | 95  | 🌟 Normal  | Swift          |
| Jigglypuff | 115 | 🎤 Fairy   | Sing           |
| Meowth     | 90  | 💰 Normal  | Pay Day        |
| Psyduck    | 100 | 🌀 Psychic | Confusion      |
| Kai        | 115 | 🗡️ Custom  | Fire Strike    |
| Skylor     | 105 | 🏹 Custom  | Amber Barrage  |

## Battle Mechanics

Three actions per turn:

- **Attack** — Base damage + random variance (0–4)
- **Special** — Higher damage + random variance (0–5), 3-turn cooldown
- **Defend** — Heal 5 HP and halve incoming damage next turn

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run build:pages` | Build for GitHub Pages deployment |
| `npm run preview` | Preview production build locally |

## Tech Stack

- **Phaser 3** — Game engine
- **TypeScript** — Language (strict mode)
- **Vite** — Build tool
- **PWA** — Installable as a standalone app

## Project Structure

```
src/
├── main.ts                    # Game config and scene registration
├── scenes/
│   ├── PreloadScene.ts        # Asset loading with progress bar
│   ├── TitleScene.ts          # Title screen and mode selection
│   ├── CharacterSelectScene.ts # Fighter picker grid
│   └── BattleScene.ts         # Main battle scene with animations
├── battle/
│   ├── BattleManager.ts       # Turn logic and damage calculation
│   ├── AIController.ts        # AI move selection (weighted random)
│   └── AttackEffects.ts       # Per-character visual effects
├── characters/
│   └── CharacterData.ts       # Fighter definitions (stats, moves, colors)
├── ui/
│   ├── HPBar.ts               # Animated health bar with critical glow
│   ├── ActionButtons.ts       # 3-button action panel
│   └── Typography.ts          # Font family constant
└── backgrounds/
    ├── BackgroundConfig.ts    # Background registry and random picker
    └── ProceduralBackgrounds.ts # Procedural medieval arena renderer
```
