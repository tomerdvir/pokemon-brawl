import Phaser from 'phaser';
import { BATTLE_BACKGROUNDS } from '../backgrounds/BackgroundConfig';
import { CHARACTERS } from '../characters/CharacterData';
import { UI_FONT_FAMILY } from '../ui/Typography';

/**
 * Loads all background images, character sprites, and other shared assets.
 * Transitions to TitleScene when complete.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const { width, height } = this.scale;

    // ── Simple loading bar ──
    const barW = 320;
    const barH = 28;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRect(0, 0, width, height);

    this.add.text(width / 2, barY - 40, 'Loading…', {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '24px',
      color: '#f5d442',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const border = this.add.graphics();
    border.lineStyle(2, 0xffffff, 0.6);
    border.strokeRect(barX, barY, barW, barH);

    const fill = this.add.graphics();

    this.load.on('progress', (value: number) => {
      fill.clear();
      fill.fillStyle(0x2ecc71, 1);
      fill.fillRect(barX + 2, barY + 2, (barW - 4) * value, barH - 4);
    });

    // ── Load all non-procedural backgrounds ──
    for (const bg of BATTLE_BACKGROUNDS) {
      if (!bg.procedural && bg.path) {
        this.load.image(bg.key, bg.path);
      }
    }

    // ── Load character sprites (SVGs) ──
    for (const char of CHARACTERS) {
      this.load.svg(char.spriteKey, `assets/sprites/${char.id}.svg`, { width: 160, height: 180 });
    }
  }

  create(): void {
    this.scene.start('TitleScene');
  }
}
