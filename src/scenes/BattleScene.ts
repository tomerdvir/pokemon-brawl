import Phaser from 'phaser';
import type { CharacterDef } from '../characters/CharacterData';
import { BattleManager } from '../battle/BattleManager';
import type { TurnResult } from '../battle/BattleManager';
import { AIController } from '../battle/AIController';
import { HPBar } from '../ui/HPBar';
import { ActionButton, drawActionBarPanel } from '../ui/ActionButtons';
import type { ActionType } from '../ui/ActionButtons';
import { UI_FONT_FAMILY } from '../ui/Typography';
import { randomBackground } from '../backgrounds/BackgroundConfig';
import type { BattleBackground } from '../backgrounds/BackgroundConfig';
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
  private actionPanel?: Phaser.GameObjects.Graphics;
  private busy = false;
  private backgroundChoice!: BattleBackground;
  private backgroundImage?: Phaser.GameObjects.Image;
  private backgroundOverlay?: Phaser.GameObjects.Graphics;
  private arenaLine?: Phaser.GameObjects.Graphics;
  private p1IdleTween?: Phaser.Tweens.Tween;
  private p2IdleTween?: Phaser.Tweens.Tween;

  // 2P
  private waitingForP2 = false;
  private p1Action: ActionType | null = null;
  private currentPlayerLabel!: Phaser.GameObjects.Text;
  private readonly handleResize = (gameSize: Phaser.Structs.Size) => {
    this.layoutBattleScene(gameSize.width, gameSize.height);
  };

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
    this.backgroundChoice = randomBackground();

    const characterLayout = this.getCharacterLayout(width, height);

    // -------- Background --------
    this.drawBackground(width, height);

    // -------- Character sprites (start offscreen for entrance) --------
    this.p1Sprite = this.createCharacterSprite(characterLayout.p1.x, characterLayout.p1.y, p1Char, false);
    this.p2Sprite = this.createCharacterSprite(characterLayout.p2.x, characterLayout.p2.y, p2Char, true);
    this.p1Sprite.setDepth(5);
    this.p2Sprite.setDepth(5);

    // Entrance animations — drop in from above
    this.playEntranceAnimation(this.p1Sprite, characterLayout.p1.x, characterLayout.p1.y, false, 0, characterLayout.scale);
    this.playEntranceAnimation(this.p2Sprite, characterLayout.p2.x, characterLayout.p2.y, true, 150, characterLayout.scale);

    // -------- HP Bars --------
    this.p1HPBar = new HPBar(this, 40, 30, 200, 22, p1Char.hp, `${p1Char.emoji} ${p1Char.name}`, 'left');
    this.p2HPBar = new HPBar(this, width - 240, 30, 200, 22, p2Char.hp, `${p2Char.emoji} ${p2Char.name}`, 'right');
    this.p1HPBar.setDepth(10);
    this.p2HPBar.setDepth(10);

    // -------- Turn indicator --------
    this.turnText = this.add.text(width / 2, 38, 'Turn 1', {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.turnText.setDepth(10);

    // -------- Current player label --------
    this.currentPlayerLabel = this.add.text(width / 2, height * 0.6, 'Your Turn!', {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '26px',
      color: '#f5d442',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.currentPlayerLabel.setDepth(10);

    // -------- Message text --------
    this.messageText = this.add.text(width / 2, height * 0.67, '', {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5);
    this.messageText.setDepth(10);

    // -------- Action bar panel --------
    this.layoutBattleScene(width, height);
    this.updateButtonStates();

    this.scale.on('resize', this.handleResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize);
    });


  }

  /* ============ BACKGROUND ============ */

  private drawBackground(width: number, height: number): void {
    const bg = this.backgroundChoice;

    if (bg.procedural) {
      // Procedural medieval arena
      drawMedievalArena(this);
    } else {
      // Image background — scale to cover the full canvas
      const img = this.add.image(width / 2, height / 2, bg.key);
      img.setDisplaySize(width, height);
      this.backgroundImage = img;

      if (bg.tint !== undefined) {
        img.setTint(bg.tint);
      }

      // Slight darkening overlay so UI stays readable
      this.backgroundOverlay = this.add.graphics();
      this.backgroundOverlay.fillStyle(0x000000, 0.25);
      this.backgroundOverlay.fillRect(0, 0, width, height);
    }

    // Arena circle (subtle, on top of any background)
    this.arenaLine = this.add.graphics();
    this.redrawStaticBackground(width, height);
  }

  private redrawStaticBackground(width: number, height: number): void {
    this.backgroundImage?.setPosition(width / 2, height / 2).setDisplaySize(width, height);

    if (this.backgroundOverlay) {
      this.backgroundOverlay.clear();
      this.backgroundOverlay.fillStyle(0x000000, 0.25);
      this.backgroundOverlay.fillRect(0, 0, width, height);
    }

    if (this.arenaLine) {
      this.arenaLine.clear();
      this.arenaLine.lineStyle(2, 0xffffff, 0.12);
      const charLayout = this.getCharacterLayout(width, height);
      this.arenaLine.strokeCircle(width / 2, charLayout.p1.y, Math.min(width, height) * 0.22);
    }
  }

  private getCharacterLayout(width: number, height: number): {
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    scale: number;
  } {
    const isPortrait = height > width;
    const compact = width < 520;
    const panelHeight = compact ? 96 : 130;
    const smallLandscape = !isPortrait && height < 450;

    let arenaTop: number;
    let arenaBottom: number;

    if (isPortrait) {
      // Derive arenaTop from actual UI: HP bars + turn text
      const hpY = compact ? 24 : 30;
      const hpHeight = compact ? 20 : 22;
      const secondBarY = hpY + hpHeight + 42;
      const turnTextBottom = secondBarY + hpHeight + 28 + 24; // turn text y + font height
      arenaTop = turnTextBottom + 12;

      // Derive arenaBottom from status label position
      const statusBaseY = height - (compact ? 160 : 205);
      arenaBottom = statusBaseY - 12;
    } else if (smallLandscape) {
      // Phone landscape: compact top, tight bottom
      arenaTop = 72;
      arenaBottom = height - panelHeight - 10;
    } else {
      arenaTop = 132;
      arenaBottom = height - panelHeight - 98;
    }

    const fallbackCenterY = height * (isPortrait ? 0.48 : 0.36);
    const centerY = arenaBottom > arenaTop
      ? (arenaTop + arenaBottom) / 2
      : fallbackCenterY;

    let scale: number;
    if (isPortrait) {
      scale = 0.88;
    } else if (smallLandscape) {
      scale = Phaser.Math.Clamp(height / 520, 0.52, 0.78);
    } else {
      scale = 1;
    }

    return {
      p1: { x: width * (isPortrait ? 0.28 : 0.25), y: centerY },
      p2: { x: width * (isPortrait ? 0.72 : 0.75), y: centerY },
      scale,
    };
  }

  private layoutBattleScene(width: number, height: number): void {
    const isPortrait = height > width;
    const compact = width < 520;
    const hpHeight = compact ? 20 : 22;
    const sideMargin = compact ? 16 : 28;
    const portraitBarWidth = Math.min(width - sideMargin * 2, 320);
    const landscapeBarWidth = Phaser.Math.Clamp(Math.floor(width * 0.24), 180, 280);
    const hpY = compact ? 24 : 30;
    const secondBarY = hpY + hpHeight + 42;
    const characterLayout = this.getCharacterLayout(width, height);

    if (!this.backgroundChoice.procedural) {
      this.redrawStaticBackground(width, height);
    }

    if (isPortrait) {
      const barX = Math.floor((width - portraitBarWidth) / 2);
      this.p1HPBar.setLayout(barX, hpY, portraitBarWidth, hpHeight, 'left');
      this.p2HPBar.setLayout(barX, secondBarY, portraitBarWidth, hpHeight, 'left');
      this.turnText.setPosition(width / 2, secondBarY + hpHeight + 28);
    } else {
      this.p1HPBar.setLayout(sideMargin, hpY, landscapeBarWidth, hpHeight, 'left');
      this.p2HPBar.setLayout(width - sideMargin - landscapeBarWidth, hpY, landscapeBarWidth, hpHeight, 'right');
      this.turnText.setPosition(width / 2, hpY + hpHeight + 22);
    }

    // Stop old idle bobs before repositioning
    this.p1IdleTween?.stop();
    this.p2IdleTween?.stop();

    this.p1Sprite.setPosition(characterLayout.p1.x, characterLayout.p1.y);
    this.p1Sprite.setScale(characterLayout.scale, characterLayout.scale);
    this.p2Sprite.setPosition(characterLayout.p2.x, characterLayout.p2.y);
    this.p2Sprite.setScale(-characterLayout.scale, characterLayout.scale);

    // Restart idle bobs at the new positions
    this.p1IdleTween = this.tweens.add({
      targets: this.p1Sprite,
      y: characterLayout.p1.y - 6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.p2IdleTween = this.tweens.add({
      targets: this.p2Sprite,
      y: characterLayout.p2.y - 6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const smallLandscape = !isPortrait && height < 450;
    let statusBaseY: number;
    if (smallLandscape) {
      // Place status text between characters and action buttons
      statusBaseY = characterLayout.p1.y + characterLayout.scale * 82;
    } else {
      statusBaseY = height - (compact ? 160 : 205);
    }
    this.currentPlayerLabel.setPosition(width / 2, statusBaseY);
    this.messageText.setPosition(width / 2, statusBaseY + (smallLandscape ? 24 : isPortrait ? 52 : 46));
    this.messageText.setWordWrapWidth(Math.max(220, width - 40), true);

    this.rebuildActionButtons(width, height);
  }

  private rebuildActionButtons(width: number, height: number): void {
    this.actionPanel?.destroy();
    this.actionButtons.forEach((button) => button.destroy());

    this.actionPanel = drawActionBarPanel(this);
    this.actionPanel.setDepth(15);

    const isPortrait = height > width;
    const smallLandscape = !isPortrait && height < 450;
    const compactButtons = width < 520;
    const sidePadding = compactButtons ? 14 : 28;
    const btnGap = compactButtons ? 10 : 24;
    const maxButtonWidth = compactButtons ? 116 : 150;
    const btnW = Math.min(
      maxButtonWidth,
      Math.floor((width - sidePadding * 2 - btnGap * 2) / 3),
    );
    let btnH: number;
    let bottomPad: number;
    if (smallLandscape) {
      btnH = Phaser.Math.Clamp(Math.round(height * 0.18), 52, 72);
      bottomPad = 10;
    } else if (compactButtons) {
      btnH = Phaser.Math.Clamp(Math.round(btnW * 0.72), 70, 82);
      bottomPad = 18;
    } else {
      btnH = 90;
      bottomPad = 26;
    }
    const btnY = height - btnH / 2 - bottomPad;
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
    this.actionButtons.forEach((b) => b.setDepth(15));

    this.updateButtonStates();
    if (this.busy) {
      this.setButtonsEnabled(false);
    }
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

  private playEntranceAnimation(
    sprite: Phaser.GameObjects.Container,
    targetX: number,
    targetY: number,
    flip = false,
    delay = 0,
    finalScale = 1,
  ): void {
    // Start above the screen
    const finalScaleX = flip ? -finalScale : finalScale;
    sprite.setPosition(targetX, -120);
    sprite.setAlpha(0);
    sprite.setScale(finalScaleX * 0.5, finalScale * 0.5);

    this.tweens.add({
      targets: sprite,
      y: targetY,
      alpha: 1,
      scaleX: finalScaleX,
      scaleY: finalScale,
      duration: 600,
      delay,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Landing dust puff
        this.spawnLandingDust(targetX, targetY + 60);
        // Start idle bob after landing
        const idleTween = this.tweens.add({
          targets: sprite,
          y: targetY - 6,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        // Track so resize can stop/restart it
        if (sprite === this.p1Sprite) this.p1IdleTween = idleTween;
        if (sprite === this.p2Sprite) this.p2IdleTween = idleTween;
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
      fontFamily: UI_FONT_FAMILY,
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
      fontFamily: UI_FONT_FAMILY,
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
      fontFamily: UI_FONT_FAMILY,
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
      fontFamily: UI_FONT_FAMILY,
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
      fontFamily: UI_FONT_FAMILY,
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
