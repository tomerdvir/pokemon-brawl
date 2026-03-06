import Phaser from 'phaser';
import { CHARACTERS } from '../characters/CharacterData';
import type { CharacterDef } from '../characters/CharacterData';

export class CharacterSelectScene extends Phaser.Scene {
  private selectingPlayer: 1 | 2 = 1;

  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.selectingPlayer = 1;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f3460, 0x0f3460, 0x1a1a2e, 0x1a1a2e);
    bg.fillRect(0, 0, width, height);

    // Header
    this.add.text(width / 2, 40, 'Pick Your Fighter!', {
      fontFamily: '"Fredoka", "Comic Sans MS", cursive',
      fontSize: '36px',
      color: '#f5d442',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Player indicator
    const playerLabel = this.add.text(width / 2, 80, 'Player 1 — Choose!', {
      fontFamily: '"Fredoka", "Comic Sans MS", cursive',
      fontSize: '22px',
      color: '#2ecc71',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Character cards — lay out in a grid for all characters
    const cardW = 120;
    const cardH = 180;
    const gap = 14;
    const cols = 5;
    const totalGridW = cols * cardW + (cols - 1) * gap;
    const startX = (width - totalGridW) / 2 + cardW / 2;
    const startY = height * 0.35;
    const rowGap = 16;

    CHARACTERS.forEach((charDef, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gap);
      const cy = startY + row * (cardH + rowGap);
      this.createCharCard(cx, cy, cardW, cardH, charDef, playerLabel);
    });

    // Back button
    this.createSmallButton(80, height - 50, '← Back', () => {
      this.scene.start('TitleScene');
    });
  }

  private createCharCard(
    x: number, y: number, w: number, h: number,
    charDef: CharacterDef,
    playerLabel: Phaser.GameObjects.Text,
  ): void {
    const g = this.add.graphics();
    g.fillStyle(0x222244, 0.9);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    g.lineStyle(2, charDef.color, 0.8);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);

    // Character sprite from loaded SVG
    const sprite = this.add.image(x, y - 28, charDef.spriteKey);
    sprite.setDisplaySize(70, 78);

    // Name
    this.add.text(x, y + 25, charDef.name, {
      fontFamily: '"Fredoka", "Comic Sans MS", cursive',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Stats preview
    this.add.text(x, y + 52, `HP ${charDef.hp}  ⚔${charDef.attackPower}  ✨${charDef.specialPower}`, {
      fontFamily: '"Fredoka", cursive',
      fontSize: '11px',
      color: '#aaaacc',
    }).setOrigin(0.5);

    // Hit area
    const hitArea = this.add.rectangle(x, y, w, h)
      .setInteractive({ useHandCursor: true })
      .setOrigin(0.5)
      .setAlpha(0.001);

    hitArea.on('pointerdown', () => {
      // Bounce
      this.tweens.add({
        targets: [g, sprite],
        scaleX: 0.93,
        scaleY: 0.93,
        duration: 80,
        yoyo: true,
      });

      this.onCharacterSelected(charDef, playerLabel);
    });
  }

  private onCharacterSelected(charDef: CharacterDef, playerLabel: Phaser.GameObjects.Text): void {
    const mode = this.registry.get('mode') as string;

    if (this.selectingPlayer === 1) {
      this.registry.set('p1Char', charDef);

      if (mode === '2p') {
        this.selectingPlayer = 2;
        playerLabel.setText('Player 2 — Choose!');
        playerLabel.setColor('#3498db');
        return; // wait for Player 2
      }

      // 1P mode — pick a random opponent
      const opponents = CHARACTERS.filter((c) => c.id !== charDef.id);
      const aiChar = Phaser.Utils.Array.GetRandom(opponents);
      this.registry.set('p2Char', aiChar);
      this.scene.start('BattleScene');
    } else {
      // Player 2 selected
      this.registry.set('p2Char', charDef);
      this.scene.start('BattleScene');
    }
  }

  private createSmallButton(x: number, y: number, label: string, onClick: () => void): void {
    const txt = this.add.text(x, y, label, {
      fontFamily: '"Fredoka", "Comic Sans MS", cursive',
      fontSize: '20px',
      color: '#aaaaaa',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    txt.on('pointerdown', () => {
      this.tweens.add({
        targets: txt,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 80,
        yoyo: true,
        onComplete: onClick,
      });
    });
  }
}
