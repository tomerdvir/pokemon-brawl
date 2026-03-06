import Phaser from 'phaser';
import { UI_FONT_FAMILY } from '../ui/Typography';

export class TitleScene extends Phaser.Scene {
  private readonly handleResize = () => {
    this.rebuildUI();
  };

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.rebuildUI();
    this.scale.on('resize', this.handleResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize);
    });
  }

  private rebuildUI(): void {
    this.children.removeAll(true);
    this.tweens.killAll();

    const { width, height } = this.scale;
    const isLandscape = width > height && height < 500;

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x0f3460);
    bg.fillRect(0, 0, width, height);

    // Starfield
    for (let i = 0; i < 60; i++) {
      const sx = Phaser.Math.Between(0, width);
      const sy = Phaser.Math.Between(0, height * 0.6);
      const star = this.add.circle(sx, sy, Phaser.Math.Between(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.3, 0.9));
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: 0.1 },
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
      });
    }

    if (isLandscape) {
      // Landscape: title top-center, buttons side-by-side
      const titleSize = Phaser.Math.Clamp(Math.round(height * 0.13), 28, 44);
      const title = this.add.text(width / 2, height * 0.2, '⚔️ Pokémon Brawl ⚔️', {
        fontFamily: UI_FONT_FAMILY,
        fontSize: `${titleSize}px`,
        color: '#f5d442',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: title,
        y: title.y - 6,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.add.text(width / 2, height * 0.42, 'Choose your battle mode!', {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5);

      // Side-by-side buttons
      const btnW = Math.min(220, Math.floor(width * 0.24));
      const btnH = Math.min(66, Math.round(height * 0.18));
      const gap = 30;

      this.createButton(width / 2 - btnW / 2 - gap / 2, height * 0.72, btnW, btnH, '🎮  PLAY', 0x2ecc71, () => {
        this.registry.set('mode', '1p');
        this.scene.start('CharacterSelectScene');
      });

      this.createButton(width / 2 + btnW / 2 + gap / 2, height * 0.72, btnW, btnH, '👫  2 PLAYERS', 0x3498db, () => {
        this.registry.set('mode', '2p');
        this.scene.start('CharacterSelectScene');
      });
    } else {
      // Portrait layout
      const title = this.add.text(width / 2, height * 0.22, '⚔️ Pokémon Brawl ⚔️', {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '52px',
        color: '#f5d442',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: title,
        y: title.y - 10,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.add.text(width / 2, height * 0.36, 'Choose your battle mode!', {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5);

      this.createButton(width / 2, height * 0.55, 260, 80, '🎮  PLAY', 0x2ecc71, () => {
        this.registry.set('mode', '1p');
        this.scene.start('CharacterSelectScene');
      });

      this.createButton(width / 2, height * 0.73, 260, 80, '👫  2 PLAYERS', 0x3498db, () => {
        this.registry.set('mode', '2p');
        this.scene.start('CharacterSelectScene');
      });
    }
  }

  private createButton(
    x: number, y: number, w: number, h: number,
    label: string, color: number, onClick: () => void,
  ): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 20);
    g.lineStyle(3, 0xffffff, 0.5);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 20);

    const txt = this.add.text(x, y, label, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '30px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(x, y, w, h).setInteractive({ useHandCursor: true }).setOrigin(0.5).setAlpha(0.001);

    hitArea.on('pointerdown', () => {
      this.tweens.add({
        targets: [g, txt, hitArea],
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 80,
        yoyo: true,
        onComplete: onClick,
      });
    });
  }
}
