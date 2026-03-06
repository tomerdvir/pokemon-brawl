import Phaser from 'phaser';
import { UI_FONT_FAMILY } from './Typography';

/**
 * Animated HP bar drawn with Phaser Graphics.
 */
export class HPBar {
  private scene: Phaser.Scene;
  private bar: Phaser.GameObjects.Graphics;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private maxHP: number;
  private currentHP: number;
  private label: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private isShaking = false;
  private labelAlign: 'left' | 'right';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    maxHP: number,
    name: string,
    labelAlign: 'left' | 'right' = 'left',
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.maxHP = maxHP;
    this.currentHP = maxHP;
    this.scene = scene;
    this.labelAlign = labelAlign;

    this.bar = scene.add.graphics();
    this.label = scene.add.text(x, y - 28, name, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    });

    // Numeric HP display
    this.hpText = scene.add.text(x + width / 2, y + height / 2, `${maxHP}/${maxHP}`, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.updateTextPositions();
    this.draw();
  }

  setLayout(x: number, y: number, width: number, height: number, labelAlign = this.labelAlign): void {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.labelAlign = labelAlign;
    this.updateTextPositions();
    this.draw();
  }

  setHP(hp: number): void {
    this.currentHP = Phaser.Math.Clamp(hp, 0, this.maxHP);
    this.draw();
  }

  animateHP(scene: Phaser.Scene, newHP: number, duration = 400): Promise<void> {
    return new Promise((resolve) => {
      const startHP = this.currentHP;
      const target = Phaser.Math.Clamp(newHP, 0, this.maxHP);
      scene.tweens.addCounter({
        from: startHP,
        to: target,
        duration,
        onUpdate: (tween) => {
          this.currentHP = tween.getValue() as number;
          this.draw();
        },
        onComplete: () => {
          this.currentHP = target;
          this.draw();
          // Shake when HP is critically low
          if (target / this.maxHP <= 0.2 && target > 0 && !this.isShaking) {
            this.shakeBar();
          }
          resolve();
        },
      });
    });
  }

  private shakeBar(): void {
    this.isShaking = true;
    // Shake the label and HP text
    const origLabelX = this.label.x;
    const origHpX = this.hpText.x;
    let shakeCount = 0;
    const maxShakes = 6;
    const shakeOffset = 4;

    const doShake = () => {
      if (shakeCount >= maxShakes) {
        this.label.x = origLabelX;
        this.hpText.x = origHpX;
        this.isShaking = false;
        return;
      }
      const dir = shakeCount % 2 === 0 ? 1 : -1;
      this.label.x = origLabelX + dir * shakeOffset;
      this.hpText.x = origHpX + dir * shakeOffset;
      shakeCount++;
      this.scene.time.delayedCall(40, doShake);
    };

    // Also flash the bar red briefly
    this.bar.clear();
    this.bar.fillStyle(0xe74c3c, 0.5);
    this.bar.fillRoundedRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4, 8);
    this.scene.time.delayedCall(150, () => this.draw());

    doShake();
  }

  private draw(): void {
    this.bar.clear();

    // Background
    this.bar.fillStyle(0x222222, 0.8);
    this.bar.fillRoundedRect(this.x, this.y, this.width, this.height, 6);

    // HP fill
    const pct = this.currentHP / this.maxHP;
    const fillColor = pct > 0.5 ? 0x2ecc71 : pct > 0.2 ? 0xf39c12 : 0xe74c3c;
    const fillWidth = Math.max(0, (this.width - 4) * pct);
    this.bar.fillStyle(fillColor, 1);
    this.bar.fillRoundedRect(this.x + 2, this.y + 2, fillWidth, this.height - 4, 4);

    // Border
    this.bar.lineStyle(2, 0xffffff, 0.8);
    this.bar.strokeRoundedRect(this.x, this.y, this.width, this.height, 6);

    // Update numeric display
    const hpRound = Math.round(this.currentHP);
    this.hpText.setText(`${hpRound}/${this.maxHP}`);
  }

  private updateTextPositions(): void {
    const labelX = this.labelAlign === 'right' ? this.x + this.width : this.x;
    this.label
      .setPosition(labelX, this.y - 28)
      .setOrigin(this.labelAlign === 'right' ? 1 : 0, 0);

    this.hpText.setPosition(this.x + this.width / 2, this.y + this.height / 2);
  }

  destroy(): void {
    this.bar.destroy();
    this.label.destroy();
    this.hpText.destroy();
  }

  setDepth(depth: number): void {
    this.bar.setDepth(depth);
    this.label.setDepth(depth);
    this.hpText.setDepth(depth);
  }
}
