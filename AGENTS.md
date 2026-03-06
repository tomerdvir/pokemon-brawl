# Agents

Instructions for AI coding agents working on this project.

## Build & Validate

- Run `npm run build` to type-check and build. Always validate after changes.
- Dev server: `npm run dev`

## Tech Stack

- **Phaser 3** game engine with **TypeScript** (strict mode) and **Vite**.
- All game state flows through Phaser's scene system and registry.

## Architecture

### Scenes (src/scenes/)

Four scenes run in sequence: Preload → Title → CharacterSelect → Battle. Scene transitions pass data via `this.registry` (selected characters, game mode). BattleScene owns responsive layout and rebuilds UI on resize/orientation change.

### Battle System (src/battle/)

- **BattleManager** encapsulates all combat logic: turn order, damage calculation, defend state, special cooldowns, and win detection. BattleScene delegates to it and awaits results.
- **AIController** picks moves with weighted randomness (30% defend, 45% attack, 25% special if off cooldown). Keep AI simple and kid-friendly.
- **AttackEffects** maps each character to a unique visual effect function. When adding a new character, add a matching effect here.

### Characters (src/characters/CharacterData.ts)

Single source of truth for all fighters. Each entry defines: name, HP, attack, defense, speed, special stats, special move name, emoji, and color scheme. To add a new character, add an entry here and a corresponding effect in AttackEffects.ts.

### UI Components (src/ui/)

- **HPBar** — Animated health bar; changes color at low HP with a critical glow effect.
- **ActionButtons** — Three-button panel (Attack, Special, Defend) with hover/press states. Reconstructed on resize.
- **Typography** — Shared font family constant used across all text.

### Backgrounds (src/backgrounds/)

- **BackgroundConfig** — Registry of available backgrounds with a random picker.
- **ProceduralBackgrounds** — Draws a layered medieval arena procedurally (sky, stars, moon, clouds, mountains, hills, grass, arena, pillars, fires, trees, particles). No image assets needed.

## Patterns & Conventions

- Animations are Promise-based and sequenced with `await`.
- UI scales responsively — layout calculations use the current game dimensions, not fixed values.
- Reusable components (HPBar, ActionButtons) are classes instantiated by scenes.
- Keep the game kid-friendly: simple rules, colorful UI, fair AI.

## Adding a New Character

1. Add entry to `CharacterData.ts` with stats, special move, emoji, and colors.
2. Add a visual effect function in `AttackEffects.ts`.
3. Add a sprite SVG to `public/assets/sprites/` if needed.
4. Run `npm run build` to validate.
