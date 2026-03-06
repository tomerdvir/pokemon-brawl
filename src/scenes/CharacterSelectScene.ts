import Phaser from 'phaser';
import { CHARACTERS } from '../characters/CharacterData';
import type { CharacterDef } from '../characters/CharacterData';
import { UI_FONT_FAMILY } from '../ui/Typography';

export class CharacterSelectScene extends Phaser.Scene {
  private selectingPlayer: 1 | 2 = 1;
  private playerLabel!: Phaser.GameObjects.Text;
  private cardContainer!: Phaser.GameObjects.Container;
  private scrollViewportTop = 0;
  private scrollViewportHeight = 0;
  private scrollOffset = 0;
  private maxScrollOffset = 0;
  private pointerScrollActive = false;
  private dragStartY = 0;
  private dragStartOffset = 0;
  private scrollListeners: (() => void) | null = null;
  private readonly handleResize = () => {
    this.rebuildUI();
  };

  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  create(): void {
    this.selectingPlayer = 1;
    this.scrollOffset = 0;
    this.maxScrollOffset = 0;

    this.rebuildUI();

    this.scale.on('resize', this.handleResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize);
    });
  }

  private rebuildUI(): void {
    const savedPlayer = this.selectingPlayer;

    // Clean up old scroll listeners
    if (this.scrollListeners) {
      this.scrollListeners();
      this.scrollListeners = null;
    }

    this.children.removeAll(true);
    this.tweens.killAll();
    this.scrollOffset = 0;
    this.maxScrollOffset = 0;

    this.selectingPlayer = savedPlayer;

    const { width, height } = this.scale;
    const isLandscape = width > height && height < 500;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f3460, 0x0f3460, 0x1a1a2e, 0x1a1a2e);
    bg.fillRect(0, 0, width, height);

    // Header
    const headerY = isLandscape ? 22 : 40;
    const headerSize = isLandscape ? '24px' : (width < 420 ? '30px' : '36px');
    this.add.text(width / 2, headerY, 'Pick Your Fighter!', {
      fontFamily: UI_FONT_FAMILY,
      fontSize: headerSize,
      color: '#f5d442',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Player indicator
    const labelY = isLandscape ? 50 : 82;
    const labelSize = isLandscape ? '18px' : '22px';
    const labelColor = savedPlayer === 2 ? '#3498db' : '#2ecc71';
    const labelStr = savedPlayer === 2 ? 'Player 2 — Choose!' : 'Player 1 — Choose!';
    this.playerLabel = this.add.text(width / 2, labelY, labelStr, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: labelSize,
      color: labelColor,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.scrollViewportTop = isLandscape ? 68 : 118;
    const footerSpace = isLandscape ? 48 : 92;
    this.scrollViewportHeight = Math.max(120, height - this.scrollViewportTop - footerSpace);

    const viewportBg = this.add.graphics();
    viewportBg.fillStyle(0x081320, 0.2);
    viewportBg.fillRoundedRect(12, this.scrollViewportTop, width - 24, this.scrollViewportHeight, 18);
    viewportBg.lineStyle(1.5, 0xffffff, 0.08);
    viewportBg.strokeRoundedRect(12, this.scrollViewportTop, width - 24, this.scrollViewportHeight, 18);

    const scrollContainer = this.add.container(0, 0);
    this.cardContainer = this.add.container(0, this.scrollViewportTop);
    scrollContainer.add(this.cardContainer);

    const maskGraphics = this.add.graphics();
    maskGraphics.setVisible(false);
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRoundedRect(12, this.scrollViewportTop, width - 24, this.scrollViewportHeight, 18);
    scrollContainer.setMask(maskGraphics.createGeometryMask());

    this.layoutCards(width);

    this.add.text(width / 2, height - (isLandscape ? 30 : 72), 'Swipe to scroll', {
      fontFamily: UI_FONT_FAMILY,
      fontSize: isLandscape ? '13px' : '16px',
      color: '#dfe9ff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setVisible(this.maxScrollOffset > 0);

    this.setupScrollInput();

    // Back button
    this.createSmallButton(80, height - (isLandscape ? 26 : 50), '← Back', () => {
      this.scene.start('TitleScene');
    });
  }

  private layoutCards(width: number): void {
    const { height } = this.scale;
    const isLandscape = width > height && height < 500;
    const sidePadding = 22;
    const gap = Phaser.Math.Clamp(Math.round(width * 0.025), 12, 18);
    const availableWidth = width - sidePadding * 2;
    const minCardWidth = isLandscape ? 110 : (width < 420 ? 132 : 140);
    const cols = Phaser.Math.Clamp(
      Math.floor((availableWidth + gap) / (minCardWidth + gap)),
      2,
      isLandscape ? 6 : 5,
    );
    const cardW = Math.floor((availableWidth - gap * (cols - 1)) / cols);
    const cardH = isLandscape
      ? Phaser.Math.Clamp(Math.round(cardW * 1.2), 130, 170)
      : Phaser.Math.Clamp(Math.round(cardW * 1.38), 176, 210);
    const rowGap = 16;
    const topPadding = 10;
    const bottomPadding = 18;
    const rows = Math.ceil(CHARACTERS.length / cols);
    const gridWidth = cols * cardW + (cols - 1) * gap;
    const startX = (width - gridWidth) / 2 + cardW / 2;
    const startY = topPadding + cardH / 2;

    CHARACTERS.forEach((charDef, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gap);
      const cy = startY + row * (cardH + rowGap);
      this.createCharCard(cx, cy, cardW, cardH, charDef, this.playerLabel);
    });

    const contentHeight = topPadding + rows * cardH + (rows - 1) * rowGap + bottomPadding;
    this.maxScrollOffset = Math.max(0, contentHeight - this.scrollViewportHeight);
    this.setScrollOffset(0);
  }

  private setupScrollInput(): void {
    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (!this.maxScrollOffset || !this.isInScrollViewport(pointer.x, pointer.y)) {
        return;
      }

      this.pointerScrollActive = true;
      this.dragStartY = pointer.y;
      this.dragStartOffset = this.scrollOffset;
    };

    const onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerScrollActive || !pointer.isDown) {
        return;
      }

      const deltaY = pointer.y - this.dragStartY;
      this.setScrollOffset(this.dragStartOffset - deltaY);
    };

    const stopScroll = () => {
      this.pointerScrollActive = false;
    };

    const onWheel = (
      pointer: Phaser.Input.Pointer,
      _gameObjects: Phaser.GameObjects.GameObject[],
      _deltaX: number,
      deltaY: number,
    ) => {
      if (!this.maxScrollOffset || !this.isInScrollViewport(pointer.x, pointer.y)) {
        return;
      }

      this.setScrollOffset(this.scrollOffset + deltaY * 0.8);
    };

    this.input.on('pointerdown', onPointerDown);
    this.input.on('pointermove', onPointerMove);
    this.input.on('pointerup', stopScroll);
    this.input.on('gameout', stopScroll);
    this.input.on('wheel', onWheel);

    const cleanup = () => {
      this.input.off('pointerdown', onPointerDown);
      this.input.off('pointermove', onPointerMove);
      this.input.off('pointerup', stopScroll);
      this.input.off('gameout', stopScroll);
      this.input.off('wheel', onWheel);
    };

    this.scrollListeners = cleanup;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  }

  private isInScrollViewport(x: number, y: number): boolean {
    return x >= 12
      && x <= this.scale.width - 12
      && y >= this.scrollViewportTop
      && y <= this.scrollViewportTop + this.scrollViewportHeight;
  }

  private setScrollOffset(offset: number): void {
    this.scrollOffset = Phaser.Math.Clamp(offset, 0, this.maxScrollOffset);
    this.cardContainer.y = this.scrollViewportTop - this.scrollOffset;
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
    this.cardContainer.add(g);

    // Character sprite from loaded SVG
    const sprite = this.add.image(x, y - 28, charDef.spriteKey);
    sprite.setDisplaySize(Math.round(w * 0.55), Math.round(h * 0.42));
    this.cardContainer.add(sprite);

    // Name
    const nameText = this.add.text(x, y + h * 0.14, charDef.name, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: w < 150 ? '18px' : '20px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.cardContainer.add(nameText);

    // Stats preview
    const statsText = this.add.text(x, y + h * 0.3, `HP ${charDef.hp}   ⚔ ${charDef.attackPower}   ✨ ${charDef.specialPower}`, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: w < 150 ? '12px' : '13px',
      color: '#aaaacc',
      align: 'center',
    }).setOrigin(0.5);
    this.cardContainer.add(statsText);

    // Hit area
    const hitArea = this.add.rectangle(x, y, w, h)
      .setInteractive({ useHandCursor: true })
      .setOrigin(0.5)
      .setAlpha(0.001);
    this.cardContainer.add(hitArea);

    hitArea.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() > 10) {
        return;
      }

      // Bounce
      this.tweens.add({
        targets: [g, sprite, nameText, statsText],
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
      fontFamily: UI_FONT_FAMILY,
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
