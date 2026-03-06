import Phaser from 'phaser';
import { UI_FONT_FAMILY } from './Typography';

export type ActionType = 'attack' | 'special' | 'defend' | 'item';

export interface ActionButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  emoji: string;
  color: number;
  action: ActionType;
  onPress: (action: ActionType) => void;
}

/* ── helpers ── */

/** Darken a 0xRRGGBB colour by a factor (0..1). */
function darken(color: number, factor: number): number {
  const r = Math.max(0, Math.min(255, Math.floor(((color >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.floor(((color >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.floor((color & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

/** Lighten towards white by a mix amount (0..1). */
function lighten(color: number, amount: number): number {
  const r = Math.min(255, Math.floor(((color >> 16) & 0xff) + (255 - ((color >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.floor(((color >> 8) & 0xff) + (255 - ((color >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.floor((color & 0xff) + (255 - (color & 0xff)) * amount));
  return (r << 16) | (g << 8) | b;
}

/**
 * A polished, layered action button with depth, glow, and hover effects.
 */
export class ActionButton {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private emojiText: Phaser.GameObjects.Text;
  private hitArea: Phaser.GameObjects.Rectangle;
  private config: ActionButtonConfig;
  private scene: Phaser.Scene;
  private _enabled = true;
  private cooldownOverlay: Phaser.GameObjects.Text | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private readonly cornerRadius: number;

  constructor(scene: Phaser.Scene, config: ActionButtonConfig) {
    this.scene = scene;
    this.config = config;

    const { x, y, width, height } = config;
    this.cornerRadius = Math.max(12, Math.min(18, Math.floor(Math.min(width, height) * 0.22)));
    const emojiSize = `${Phaser.Math.Clamp(Math.round(height * 0.42), 28, 40)}px`;
    const labelFontSize = `${Phaser.Math.Clamp(Math.round(Math.min(width * 0.12, height * 0.2)), 13, 17)}px`;
    const emojiY = -Math.round(height * 0.16);
    const labelY = Math.round(height * 0.28);

    // Container anchored at button centre – children use local coords
    this.container = scene.add.container(x, y);

    // Outer glow (pulsing)
    this.glowGraphics = scene.add.graphics();
    this.container.add(this.glowGraphics);

    // Main layered background
    this.bg = scene.add.graphics();
    this.container.add(this.bg);
    this.drawBg(config.color, 1);

    // Emoji icon
    this.emojiText = scene.add.text(0, emojiY, config.emoji, {
      fontSize: emojiSize,
    }).setOrigin(0.5);
    this.container.add(this.emojiText);

    // Label
    this.text = scene.add.text(0, labelY, config.label.toUpperCase(), {
      fontFamily: UI_FONT_FAMILY,
      fontSize: labelFontSize,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      letterSpacing: 2,
    }).setOrigin(0.5);
    this.container.add(this.text);

    // Invisible hit area (still in world space for input)
    this.hitArea = scene.add.rectangle(x, y, width, height)
      .setInteractive({ useHandCursor: true })
      .setOrigin(0.5)
      .setAlpha(0.001);

    // --- Hover ---
    this.hitArea.on('pointerover', () => {
      if (!this._enabled) return;
      scene.tweens.add({
        targets: this.container,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 120,
        ease: 'Back.easeOut',
      });
      this.drawBg(lighten(config.color, 0.15), 1);
    });

    this.hitArea.on('pointerout', () => {
      scene.tweens.add({
        targets: this.container,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
        ease: 'Sine.easeOut',
      });
      if (this._enabled) this.drawBg(config.color, 1);
    });

    // --- Press ---
    this.hitArea.on('pointerdown', () => {
      if (!this._enabled) return;
      // Quick punch-down + bounce back
      scene.tweens.add({
        targets: this.container,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 60,
        yoyo: true,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.container.setScale(1);
          config.onPress(config.action);
        },
      });
    });

    // Start idle glow pulse
    this.startGlowPulse();
  }

  /* ── draw layered background ── */

  private drawBg(color: number, alpha: number): void {
    const w = this.config.width;
    const h = this.config.height;
    const r = this.cornerRadius;
    const halfW = w / 2;
    const halfH = h / 2;
    const g = this.bg;
    g.clear();

    // 1) Drop shadow
    g.fillStyle(darken(color, 0.55), alpha * 0.22);
    g.fillRoundedRect(-halfW + 3, -halfH + 5, w, h, r);

    // 2) Main body
    g.fillStyle(color, alpha);
    g.fillRoundedRect(-halfW, -halfH, w, h, r);

    // 3) Darker bottom half for depth (drawn as full rect clipped conceptually)
    g.fillStyle(darken(color, 0.75), alpha * 0.45);
    g.fillRoundedRect(-halfW, -halfH + h * 0.5, w, h * 0.5, { tl: 0, tr: 0, bl: r, br: r });

    // 4) Glossy highlight stripe across the top
    g.fillStyle(0xffffff, alpha * 0.22);
    g.fillRoundedRect(-halfW + 4, -halfH + 3, w - 8, h * 0.38, { tl: r - 2, tr: r - 2, bl: 0, br: 0 });

    // 5) Border
    g.lineStyle(2.5, 0xffffff, alpha * 0.5);
    g.strokeRoundedRect(-halfW, -halfH, w, h, r);

    // 6) Inner top light border
    g.lineStyle(1, lighten(color, 0.5), alpha * 0.35);
    g.strokeRoundedRect(-halfW + 2, -halfH + 2, w - 4, h - 4, r - 2);
  }

  /* ── idle glow ── */

  private startGlowPulse(): void {
    // Animated alpha proxy
    const proxy = { alpha: 0 };
    this.glowTween = this.scene.tweens.add({
      targets: proxy,
      alpha: 0.6,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!this._enabled) {
          this.glowGraphics.clear();
          return;
        }
        this.drawGlow(proxy.alpha);
      },
    });
  }

  private drawGlow(a: number): void {
    const w = this.config.width;
    const h = this.config.height;
    const r = this.cornerRadius;
    const g = this.glowGraphics;
    g.clear();
    // Outer glow rings
    for (let i = 3; i >= 1; i--) {
      const expand = i * 4;
      g.lineStyle(2, this.config.color, a * (0.12 / i));
      g.strokeRoundedRect(
        -w / 2 - expand,
        -h / 2 - expand,
        w + expand * 2,
        h + expand * 2,
        r + expand,
      );
    }
  }

  /* ── public API ── */

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    const alpha = enabled ? 1 : 0.3;
    this.drawBg(this.config.color, alpha);
    this.text.setAlpha(alpha);
    this.emojiText.setAlpha(alpha);
    if (!enabled) this.glowGraphics.clear();
  }

  showCooldown(turnsLeft: number): void {
    if (!this.cooldownOverlay) {
      this.cooldownOverlay = this.scene.add.text(
        this.config.width / 2 - 18,
        -this.config.height / 2 + 2,
        '',
        {
          fontFamily: UI_FONT_FAMILY,
          fontSize: '15px',
          color: '#ff6666',
          backgroundColor: '#000000aa',
          padding: { x: 4, y: 2 },
          stroke: '#000',
          strokeThickness: 2,
        },
      ).setOrigin(0.5, 0);
      this.container.add(this.cooldownOverlay);
    }
    if (turnsLeft > 0) {
      this.cooldownOverlay.setText(`⏳${turnsLeft}`).setVisible(true);
    } else {
      this.cooldownOverlay.setVisible(false);
    }
  }

  destroy(): void {
    this.glowTween?.stop();
    this.container.destroy();
    this.hitArea.destroy();
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
    this.hitArea.setDepth(depth);
  }
}

/* ── Action bar panel (drawn behind the buttons) ── */

export function drawActionBarPanel(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const { width, height } = scene.scale;
  const isPortrait = height > width;
  const smallLandscape = !isPortrait && height < 450;
  const panelH = smallLandscape ? 80 : (width < 520 ? 96 : 130);
  const panelY = height - panelH;
  const g = scene.add.graphics();

  // Keep a light separator only so the buttons do not sit on a dark rectangle.
  g.lineStyle(2, 0xffffff, 0.14);
  g.lineBetween(28, panelY + 10, width - 28, panelY + 10);

  g.lineStyle(1, 0x67c1ff, 0.12);
  g.lineBetween(48, panelY + 16, width - 48, panelY + 16);

  // Decorative small diamonds on each side
  const diaY = panelY + 16;
  drawDiamond(g, 44, diaY, 5, 0xffffff, 0.15);
  drawDiamond(g, width - 44, diaY, 5, 0xffffff, 0.15);

  return g;
}

function drawDiamond(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, color: number, alpha: number): void {
  g.fillStyle(color, alpha);
  g.fillTriangle(cx, cy - size, cx + size, cy, cx, cy + size);
  g.fillTriangle(cx, cy - size, cx - size, cy, cx, cy + size);
}
