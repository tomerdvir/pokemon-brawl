import Phaser from 'phaser';
import type { CharacterDef } from '../characters/CharacterData';
import { BattleManager } from '../battle/BattleManager';
import type { TurnResult } from '../battle/BattleManager';
import { AIController } from '../battle/AIController';
import { HPBar } from '../ui/HPBar';
import { ActionButton, drawActionBarPanel } from '../ui/ActionButtons';
import type { ActionType } from '../ui/ActionButtons';
import { randomBackground } from '../backgrounds/BackgroundConfig';
import { drawMedievalArena } from '../backgrounds/ProceduralBackgrounds';
import { spawnAttackEffect } from '../battle/AttackEffects';

export class BattleScene extends Phaser.Scene {
  private bm!: BattleManager;
  private ai!: AIController;
  private mode!: string;

  // UI
  private p1HPBar!: HPBar;
  private p2HPBar!: HPBar;
  private p1Sprite!: Phaser.GameObjects.Container;
  private p2Sprite!: Phaser.GameObjects.Container;
  private turnText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private actionButtons: ActionButton[] = [];
  private busy = false;

  // 2P
  private waitingForP2 = false;
  private p1Action: ActionType | null = null;
  private currentPlayerLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.busy = false;
    this.waitingForP2 = false;
    this.p1Action = null;

    const p1Char = this.registry.get('p1Char') as CharacterDef;
    const p2Char = this.registry.get('p2Char') as CharacterDef;
    this.mode = this.registry.get('mode') as string;

    this.bm = new BattleManager(p1Char, p2Char);
    this.ai = new AIController();

    // -------- Background --------
    this.drawBackground(width, height);

    // -------- Character sprites (start offscreen for entrance) --------
    this.p1Sprite = this.createCharacterSprite(width * 0.25, height * 0.42, p1Char, false);
    this.p2Sprite = this.createCharacterSprite(width * 0.75, height * 0.42, p2Char, true);

    // Entrance animations — drop in from above
    this.playEntranceAnimation(this.p1Sprite, width * 0.25, height * 0.42, false);
    this.playEntranceAnimation(this.p2Sprite, width * 0.75, height * 0.42, true, 150);

    // -------- HP Bars --------
    this.p1HPBar = new HPBar(this, 40, 30, 200, 22, p1Char.hp, `${p1Char.emoji} ${p1Char.name}`);
    this.p2HPBar = new HPBar(this, width - 240, 30, 200, 22, p2Char.hp, `${p2Char.emoji} ${p2Char.name}`);

    // -------- Turn indicator --------
    this.turnText = this.add.text(width / 2, 38, 'Turn 1', {
      fontFamily: '"Fredoka", cursive',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // -------- Current player label --------
    this.currentPlayerLabel = this.add.text(width / 2, height * 0.6, 'Your Turn!', {
      fontFamily: '"Fredoka", "Comic Sans MS", cursive',
      fontSize: '26px',
      color: '#f5d442',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // -------- Message text --------
    this.messageText = this.add.text(width / 2, height * 0.67, '', {
      fontFamily: '"Fredoka", "Comic Sans MS", cursive',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5);

    // -------- Action bar panel --------
    drawActionBarPanel(this);

    // -------- Action buttons --------
    const btnY = height * 0.84;
    const btnW = 150;
    const btnH = 90;
    const btnGap = 24;
    const totalBtnW = 3 * btnW + 2 * btnGap;
    const btnStartX = (width - totalBtnW) / 2 + btnW / 2;

    const onAction = (action: ActionType) => this.onPlayerAction(action);

    this.actionButtons = [
      new ActionButton(this, {
        x: btnStartX, y: btnY, width: btnW, height: btnH,
        label: 'Attack', emoji: '⚔️', color: 0xe74c3c, action: 'attack', onPress: onAction,
      }),
      new ActionButton(this, {
        x: btnStartX + btnW + btnGap, y: btnY, width: btnW, height: btnH,
        label: 'Special', emoji: '✨', color: 0x9b59b6, action: 'special', onPress: onAction,
      }),
      new ActionButton(this, {
        x: btnStartX + 2 * (btnW + btnGap), y: btnY, width: btnW, height: btnH,
        label: 'Defend', emoji: '🛡️', color: 0x27ae60, action: 'defend', onPress: onAction,
      }),
    ];

    this.updateButtonStates();


  }

  /* ============ BACKGROUND ============ */

  private drawBackground(width: number, height: number): void {
    const bg = randomBackground();

    if (bg.procedural) {
      // Procedural medieval arena
      drawMedievalArena(this);
    } else {
      // Image background — scale to cover the full canvas
      const img = this.add.image(width / 2, height / 2, bg.key);
      img.setDisplaySize(width, height);

      if (bg.tint !== undefined) {
        img.setTint(bg.tint);
      }

      // Slight darkening overlay so UI stays readable
      const overlay = this.add.graphics();
      overlay.fillStyle(0x000000, 0.25);
      overlay.fillRect(0, 0, width, height);
    }

    // Arena circle (subtle, on top of any background)
    const arenaLine = this.add.graphics();
    arenaLine.lineStyle(2, 0xffffff, 0.12);
    arenaLine.strokeCircle(width / 2, height * 0.5, 180);
  }

  /* ============ CHARACTER SPRITE ============ */

  private createCharacterSprite(x: number, y: number, def: CharacterDef, flip: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Use the loaded SVG sprite
    const sprite = this.add.image(0, 0, def.spriteKey);
    sprite.setDisplaySize(120, 135);

    // Add a subtle drop shadow behind the sprite
    const shadow = this.add.ellipse(0, 70, 80, 18, 0x000000, 0.25);

    container.add([shadow, sprite]);

    if (flip) container.setScale(-1, 1);

    return container;
  }

  /* ============ PLAYER ACTION ============ */

  private onPlayerAction(action: ActionType): void {
    if (this.busy) return;

    if (this.mode === '2p' && !this.waitingForP2) {
      // Player 1 chose — smoothly transition to Player 2
      this.p1Action = action;
      this.waitingForP2 = true;
      this.smoothTransitionToP2();
      return;
    }

    if (this.mode === '2p' && this.waitingForP2) {
      // Player 2 chose
      this.busy = true;
      this.setButtonsEnabled(false);
      this.executeTurn2P(this.p1Action!, action);
      return;
    }

    // 1P mode
    this.busy = true;
    this.setButtonsEnabled(false);
    this.executeTurn1P(action);
  }

  /* ============ 1P TURN ============ */

  private async executeTurn1P(playerAction: ActionType): Promise<void> {
    const aiAction = this.ai.pickAction(this.bm.state.p2.specialCooldown);

    // Player attacks
    const p1Result = this.bm.executeAction('p1', playerAction);
    // If defender is defending, halve
    if (aiAction === 'defend') {
      this.applyDefendReduction(p1Result, 'p2');
    }

    await this.animateAction(p1Result, playerAction, this.p1Sprite, this.p2Sprite, this.p2HPBar, this.bm.state.p2.hp);

    if (p1Result.isKO) {
      this.showWinScreen('p1');
      return;
    }

    // AI attacks
    const p2Result = this.bm.executeAction('p2', aiAction);
    if (playerAction === 'defend') {
      this.applyDefendReduction(p2Result, 'p1');
    }

    await this.animateAction(p2Result, aiAction, this.p2Sprite, this.p1Sprite, this.p1HPBar, this.bm.state.p1.hp);

    if (p2Result.isKO) {
      this.showWinScreen('p2');
      return;
    }

    this.bm.endTurn();
    this.turnText.setText(`Turn ${this.bm.state.turn}`);
    this.updateButtonStates();
    this.busy = false;
    this.setButtonsEnabled(true);
  }

  /* ============ 2P TURN ============ */

  private async executeTurn2P(p1Action: ActionType, p2Action: ActionType): Promise<void> {
    // P1 acts
    const p1Result = this.bm.executeAction('p1', p1Action);
    if (p2Action === 'defend') this.applyDefendReduction(p1Result, 'p2');

    await this.animateAction(p1Result, p1Action, this.p1Sprite, this.p2Sprite, this.p2HPBar, this.bm.state.p2.hp);
    if (p1Result.isKO) { this.showWinScreen('p1'); return; }

    // P2 acts
    const p2Result = this.bm.executeAction('p2', p2Action);
    if (p1Action === 'defend') this.applyDefendReduction(p2Result, 'p1');

    await this.animateAction(p2Result, p2Action, this.p2Sprite, this.p1Sprite, this.p1HPBar, this.bm.state.p1.hp);
    if (p2Result.isKO) { this.showWinScreen('p2'); return; }

    this.bm.endTurn();
    this.turnText.setText(`Turn ${this.bm.state.turn}`);
    this.p1Action = null;
    this.waitingForP2 = false;
    this.currentPlayerLabel.setText('Player 1 — Your Turn!').setColor('#2ecc71');
    this.updateButtonStates();
    this.busy = false;
    this.setButtonsEnabled(true);
  }

  /* ============ DEFEND REDUCTION ============ */

  private applyDefendReduction(result: TurnResult, defenderKey: 'p1' | 'p2'): void {
    if (result.damage > 0) {
      const halfDmg = Math.floor(result.damage / 2);
      // Heal defender by the reduced amount (it was already subtracted)
      this.bm.state[defenderKey].hp = Math.min(
        this.bm.state[defenderKey].def.hp,
        this.bm.state[defenderKey].hp + halfDmg,
      );
      result.damage -= halfDmg;
      result.defenderHP = this.bm.state[defenderKey].hp;
    }
  }

  /* ============ ANIMATION ============ */

  private async animateAction(
    result: TurnResult,
    action: ActionType,
    attackerSprite: Phaser.GameObjects.Container,
    defenderSprite: Phaser.GameObjects.Container,
    defenderBar: HPBar,
    newHP: number,
  ): Promise<void> {
    const attackerChar = result.attacker === 'p1'
      ? (this.registry.get('p1Char') as CharacterDef)
      : (this.registry.get('p2Char') as CharacterDef);
    const attackerName = attackerChar.name;

    if (action === 'defend') {
      this.messageText.setText(`${attackerName} defends! 🛡️`);
      await this.flashSprite(attackerSprite, 0x27ae60);
      await this.wait(400);
    } else {
      const label = action === 'special'
        ? attackerChar.specialName
        : 'ATTACK';
      this.messageText.setText(`${attackerName} uses ${label}! -${result.damage} HP`);

      // Lunge forward
      const dir = result.attacker === 'p1' ? 1 : -1;
      await this.moveSprite(attackerSprite, dir * 60, 0, 150);

      // Type-specific projectile VFX (travels from attacker → defender)
      await spawnAttackEffect(
        this,
        attackerChar.id,
        attackerSprite.x,
        attackerSprite.y,
        defenderSprite.x,
        defenderSprite.y,
        action === 'special',
      );

      // Screen flash on impact
      this.screenFlash(action === 'special' ? 0xffff00 : 0xffffff);

      // Shake defender on impact
      this.cameras.main.shake(120, 0.01);
      await this.shakeSprite(defenderSprite);

      // Floating damage number
      if (result.damage > 0) {
        this.spawnDamageNumber(defenderSprite.x, defenderSprite.y - 80, result.damage, action === 'special');
      }

      // Move back
      await this.moveSprite(attackerSprite, -dir * 60, 0, 150);

      // Animate HP
      await defenderBar.animateHP(this, newHP);
    }
    await this.wait(300);
  }

  private moveSprite(sprite: Phaser.GameObjects.Container, dx: number, dy: number, dur: number): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        targets: sprite,
        x: sprite.x + dx,
        y: sprite.y + dy,
        duration: dur,
        ease: 'Power2',
        onComplete: () => resolve(),
      });
    });
  }

  private shakeSprite(sprite: Phaser.GameObjects.Container): Promise<void> {
    return new Promise((resolve) => {
      const origX = sprite.x;
      this.tweens.add({
        targets: sprite,
        x: origX + 10,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          sprite.x = origX;
          resolve();
        },
      });
    });
  }

  private flashSprite(sprite: Phaser.GameObjects.Container, _color: number): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        targets: sprite,
        alpha: 0.4,
        duration: 150,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          sprite.alpha = 1;
          resolve();
        },
      });
    });
  }

  /* ============ ENTRANCE ANIMATION ============ */

  private playEntranceAnimation(sprite: Phaser.GameObjects.Container, targetX: number, targetY: number, flip = false, delay = 0): void {
    // Start above the screen
    const finalScaleX = flip ? -1 : 1;
    sprite.setPosition(targetX, -120);
    sprite.setAlpha(0);
    sprite.setScale(finalScaleX * 0.5, 0.5);

    this.tweens.add({
      targets: sprite,
      y: targetY,
      alpha: 1,
      scaleX: finalScaleX,
      scaleY: 1,
      duration: 600,
      delay,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Landing dust puff
        this.spawnLandingDust(targetX, targetY + 60);
        // Start idle bob after landing
        this.tweens.add({
          targets: sprite,
          y: targetY - 6,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });
  }

  private spawnLandingDust(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 8) + (Math.PI * 6 / 8) * (i / 7);
      const dist = Phaser.Math.Between(20, 50);
      const dust = this.add.circle(x, y, Phaser.Math.Between(4, 8), 0xd4c5a9, 0.7)
        .setDepth(10);
      this.tweens.add({
        targets: dust,
        x: x + Math.cos(angle) * dist,
        y: y - Math.sin(angle) * dist * 0.4,
        alpha: 0,
        scale: 0.3,
        duration: 400,
        ease: 'Power2',
        onComplete: () => dust.destroy(),
      });
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  /* ============ FLOATING DAMAGE NUMBER ============ */

  private spawnDamageNumber(x: number, y: number, damage: number, isSpecial: boolean): void {
    const color = isSpecial ? '#ffdd00' : '#ff4444';
    const size = isSpecial ? '38px' : '30px';
    const prefix = isSpecial ? '💥 ' : '';
    const txt = this.add.text(x, y, `${prefix}-${damage}`, {
      fontFamily: '"Fredoka", "Comic Sans MS", cursive',
      fontSize: size,
      color,
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5).setDepth(55);

    this.tweens.add({
      targets: txt,
      y: y - 80,
      alpha: 0,
      scale: isSpecial ? 1.5 : 1.2,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  /* ============ SCREEN FLASH ============ */

  private screenFlash(color: number = 0xffffff): void {
    const { width, height } = this.scale;
    const flash = this.add.rectangle(width / 2, height / 2, width, height, color, 0.35)
      .setDepth(60);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
  }

  /* ============ BUTTON STATE ============ */

  private setButtonsEnabled(enabled: boolean): void {
    this.actionButtons.forEach((b) => b.setEnabled(enabled));
  }

  private updateButtonStates(): void {
    // Determine whose cooldown to show
    const isP2Turn = this.mode === '2p' && this.waitingForP2;
    const fighter = isP2Turn ? this.bm.state.p2 : this.bm.state.p1;

    // Special button is index 1
    const specialBtn = this.actionButtons[1];
    specialBtn.showCooldown(fighter.specialCooldown);
    specialBtn.setEnabled(fighter.specialCooldown <= 0);

    // Others always enabled
    this.actionButtons[0].setEnabled(true);
    this.actionButtons[2].setEnabled(true);
  }

  /* ============ PASS OVERLAY (2P) ============ */

  /**
   * Smooth auto-transition from Player 1 to Player 2.
   * Briefly flashes a label, then enables P2's buttons — no extra tap needed.
   */
  private smoothTransitionToP2(): void {
    this.setButtonsEnabled(false);

    // Quick pulse on the label to signal the switch
    this.currentPlayerLabel.setText('Player 2 — Your Turn!').setColor('#3498db');
    this.currentPlayerLabel.setScale(1.4);
    this.currentPlayerLabel.setAlpha(0);

    this.tweens.add({
      targets: this.currentPlayerLabel,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 350,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.updateButtonStates();
        this.setButtonsEnabled(true);
      },
    });
  }

  /* ============ WIN SCREEN ============ */

  private showWinScreen(winner: 'p1' | 'p2'): void {
    const { width, height } = this.scale;
    const winnerChar = this.registry.get(winner === 'p1' ? 'p1Char' : 'p2Char') as CharacterDef;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(200);

    // Confetti!
    for (let i = 0; i < 40; i++) {
      const colors = [0xf5d442, 0xe74c3c, 0x2ecc71, 0x3498db, 0x9b59b6, 0xff69b4];
      const c = this.add.rectangle(
        Phaser.Math.Between(0, width),
        -20,
        Phaser.Math.Between(8, 16),
        Phaser.Math.Between(8, 16),
        Phaser.Utils.Array.GetRandom(colors),
      ).setDepth(201);

      this.tweens.add({
        targets: c,
        y: height + 40,
        x: c.x + Phaser.Math.Between(-100, 100),
        angle: Phaser.Math.Between(0, 720),
        duration: Phaser.Math.Between(1500, 3000),
        ease: 'Cubic.easeIn',
      });
    }

    const winnerLabel = this.mode === '2p'
      ? (winner === 'p1' ? 'Player 1' : 'Player 2')
      : (winner === 'p1' ? 'You' : winnerChar.name);

    const emoji = winner === 'p1' || this.mode === '2p' ? '🏆' : '😢';

    const winText = this.add.text(width / 2, height * 0.3, `${emoji} ${winnerLabel} Wins! ${emoji}`, {
      fontFamily: '"Fredoka", "Comic Sans MS", cursive',
      fontSize: '44px',
      color: '#f5d442',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(202);

    this.tweens.add({
      targets: winText,
      scale: { from: 0.5, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Character showcase
    this.add.text(width / 2, height * 0.48, `${winnerChar.emoji} ${winnerChar.name} ${winnerChar.emoji}`, {
      fontFamily: '"Fredoka", cursive',
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(202);

    // Play Again button
    const btnG = this.add.graphics().setDepth(202);
    const btnW = 240;
    const btnH = 70;
    const btnX = width / 2;
    const btnY = height * 0.68;
    btnG.fillStyle(0x2ecc71, 1);
    btnG.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 18);
    btnG.lineStyle(3, 0xffffff, 0.5);
    btnG.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 18);

    this.add.text(btnX, btnY, '🔄  Play Again', {
      fontFamily: '"Fredoka", "Comic Sans MS", cursive',
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(202);

    const btnHit = this.add.rectangle(btnX, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true })
      .setOrigin(0.5)
      .setAlpha(0.001)
      .setDepth(203);

    btnHit.on('pointerdown', () => {
      this.scene.start('CharacterSelectScene');
    });

    // Home button
    const homeTxt = this.add.text(width / 2, height * 0.82, '🏠 Home', {
      fontFamily: '"Fredoka", cursive',
      fontSize: '20px',
      color: '#aaaaaa',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });

    homeTxt.on('pointerdown', () => {
      this.scene.start('TitleScene');
    });
  }
}
