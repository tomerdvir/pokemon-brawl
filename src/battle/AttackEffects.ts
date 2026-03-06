import Phaser from 'phaser';

/* ------------------------------------------------------------------ */
/*  Travel duration (ms) for projectiles to cross the screen          */
/* ------------------------------------------------------------------ */
const TRAVEL_MS = 350;
const TRAIL_INTERVAL_MS = 30;

/**
 * Spawns a type-specific projectile that travels from the attacker
 * all the way to the defender, leaving a trail, then bursts on impact.
 *
 * Returns a Promise that resolves when the projectile arrives.
 */
export function spawnAttackEffect(
  scene: Phaser.Scene,
  pokemonId: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  isSpecial: boolean,
): Promise<void> {
  const cfg = EFFECT_MAP[pokemonId] ?? DEFAULT_CFG;
  return launchProjectile(scene, cfg, fromX, fromY, toX, toY, isSpecial);
}

/* ------------------------------------------------------------------ */
/*  Config per Pokémon                                                 */
/* ------------------------------------------------------------------ */

interface EffectConfig {
  /** Colours used for the main projectile & trail */
  colors: number[];
  /** Extra glow colour behind the projectile */
  glowColor: number;
  /** Function that creates the main projectile game-object */
  makeProjectile: (scene: Phaser.Scene, x: number, y: number, big: boolean) => Phaser.GameObjects.GameObject & { x: number; y: number; setDepth: (d: number) => any };
  /** Function that creates one trail particle at (x, y) */
  makeTrail: (scene: Phaser.Scene, x: number, y: number, big: boolean) => void;
  /** Function that creates the impact burst at the defender */
  makeImpact: (scene: Phaser.Scene, x: number, y: number, big: boolean) => void;
}

const EFFECT_MAP: Record<string, EffectConfig> = {
  pikachu: {
    colors: [0xffff44, 0xf5d442, 0xffffff],
    glowColor: 0xf5d442,
    makeProjectile: (scene, x, y, big) => {
      const g = scene.add.graphics().setDepth(52);
      const r = big ? 14 : 10;
      // Zigzag bolt shape
      g.fillStyle(0xffff44, 1);
      g.fillCircle(0, 0, r);
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(0, 0, r * 0.5);
      g.setPosition(x, y);
      return g as any;
    },
    makeTrail: (scene, x, y, big) => {
      // Mini lightning segment
      const g = scene.add.graphics().setDepth(50);
      g.lineStyle(big ? 3 : 2, 0xffff44, 0.8);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-14, 14));
      g.lineTo(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8));
      g.strokePath();

      const spark = scene.add.circle(x, y, Phaser.Math.Between(2, 5), 0xffff44, 0.9).setDepth(50);

      scene.tweens.add({
        targets: [g, spark],
        alpha: 0,
        duration: 250,
        onComplete: () => { g.destroy(); spark.destroy(); },
      });
    },
    makeImpact: (scene, x, y, big) => {
      // Lightning strike lines radiating out + flash
      const flash = scene.add.circle(x, y, big ? 35 : 22, 0xffff88, 0.8).setDepth(50);
      scene.tweens.add({ targets: flash, alpha: 0, scale: 2.5, duration: 350, onComplete: () => flash.destroy() });

      for (let i = 0; i < (big ? 6 : 4); i++) {
        const g = scene.add.graphics().setDepth(51);
        const angle = (i / (big ? 6 : 4)) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
        const len = big ? 60 : 40;
        g.lineStyle(big ? 4 : 3, 0xffff44, 1);
        g.beginPath();
        g.moveTo(x, y);
        let cx = x, cy = y;
        for (let s = 1; s <= 3; s++) {
          cx = x + Math.cos(angle) * len * (s / 3) + Phaser.Math.Between(-10, 10);
          cy = y + Math.sin(angle) * len * (s / 3) + Phaser.Math.Between(-10, 10);
          g.lineTo(cx, cy);
        }
        g.strokePath();
        scene.tweens.add({ targets: g, alpha: 0, duration: 300, delay: 50, onComplete: () => g.destroy() });
      }
      burstParticles(scene, x, y, big ? 12 : 7, [0xffff44, 0xf5d442, 0xffffff]);
    },
  },

  charizard: {
    colors: [0xff4500, 0xff6a00, 0xffaa00, 0xffdd44],
    glowColor: 0xff6a00,
    makeProjectile: (scene, x, y, big) => {
      const r = big ? 16 : 11;
      const c = scene.add.circle(x, y, r, 0xff4500, 1).setDepth(52);
      // Inner white-hot core
      const core = scene.add.circle(x, y, r * 0.4, 0xffdd44, 0.9).setDepth(53);
      // We only tween the outer circle; we'll move the core via trail
      (c as any)._core = core;
      return c as any;
    },
    makeTrail: (scene, x, y, big) => {
      const size = Phaser.Math.Between(big ? 6 : 4, big ? 16 : 10);
      const colors = [0xff4500, 0xff6a00, 0xffaa00, 0xffdd44];
      const flame = scene.add.triangle(
        x + Phaser.Math.Between(-6, 6), y + Phaser.Math.Between(-6, 6),
        0, size, size / 2, -size, -size / 2, -size,
        Phaser.Utils.Array.GetRandom(colors), 0.85,
      ).setDepth(50).setAngle(Phaser.Math.Between(0, 360));

      scene.tweens.add({
        targets: flame,
        y: flame.y - Phaser.Math.Between(20, 50),
        alpha: 0, scale: 0.2,
        angle: flame.angle + Phaser.Math.Between(-90, 90),
        duration: Phaser.Math.Between(250, 450),
        onComplete: () => flame.destroy(),
      });
    },
    makeImpact: (scene, x, y, big) => {
      const count = big ? 18 : 10;
      const colors = [0xff4500, 0xff6a00, 0xffaa00, 0xffdd44, 0xff2200];
      for (let i = 0; i < count; i++) {
        const size = Phaser.Math.Between(6, big ? 20 : 12);
        const flame = scene.add.triangle(
          x + Phaser.Math.Between(-15, 15), y + Phaser.Math.Between(-15, 15),
          0, size, size / 2, -size, -size / 2, -size,
          Phaser.Utils.Array.GetRandom(colors), 0.85,
        ).setDepth(50);
        scene.tweens.add({
          targets: flame,
          y: flame.y - Phaser.Math.Between(40, 100),
          x: flame.x + Phaser.Math.Between(-40, 40),
          alpha: 0, scale: 0.1, angle: Phaser.Math.Between(-180, 180),
          duration: Phaser.Math.Between(350, 700),
          onComplete: () => flame.destroy(),
        });
      }
      const flash = scene.add.circle(x, y, big ? 40 : 25, 0xff6a00, 0.6).setDepth(49);
      scene.tweens.add({ targets: flash, alpha: 0, scale: 2.5, duration: 400, onComplete: () => flash.destroy() });
    },
  },

  bulbasaur: {
    colors: [0x4caf50, 0x66bb6a, 0x81c784, 0x388e3c],
    glowColor: 0x388e3c,
    makeProjectile: (scene, x, y, big) => {
      const r = big ? 12 : 9;
      const leaf = scene.add.ellipse(x, y, r, r * 2.5, 0x4caf50, 0.9).setDepth(52);
      return leaf as any;
    },
    makeTrail: (scene, x, y, _big) => {
      const size = Phaser.Math.Between(5, 12);
      const colors = [0x4caf50, 0x66bb6a, 0x81c784, 0x388e3c, 0xa5d6a7];
      const leaf = scene.add.ellipse(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8),
        size, size * 2, Phaser.Utils.Array.GetRandom(colors), 0.7).setDepth(50);
      leaf.setAngle(Phaser.Math.Between(0, 360));
      scene.tweens.add({
        targets: leaf,
        x: leaf.x + Phaser.Math.Between(-30, 30),
        y: leaf.y + Phaser.Math.Between(-30, 30),
        alpha: 0, angle: leaf.angle + Phaser.Math.Between(-90, 90), scale: 0.3,
        duration: Phaser.Math.Between(300, 500),
        onComplete: () => leaf.destroy(),
      });
    },
    makeImpact: (scene, x, y, big) => {
      const count = big ? 14 : 8;
      const colors = [0x4caf50, 0x66bb6a, 0x81c784, 0x388e3c, 0xa5d6a7];
      for (let i = 0; i < count; i++) {
        const size = Phaser.Math.Between(6, 14);
        const leaf = scene.add.ellipse(x, y, size, size * 2.5,
          Phaser.Utils.Array.GetRandom(colors), 0.85).setDepth(50).setAngle(Phaser.Math.Between(0, 360));
        scene.tweens.add({
          targets: leaf,
          x: leaf.x + Phaser.Math.Between(-70, 70),
          y: leaf.y + Phaser.Math.Between(-70, 70),
          alpha: 0, angle: leaf.angle + Phaser.Math.Between(-180, 180), scale: 0.3,
          duration: Phaser.Math.Between(400, 800),
          onComplete: () => leaf.destroy(),
        });
      }
      // Vine whip lines for special
      if (big) {
        for (let v = 0; v < 3; v++) {
          const vine = scene.add.graphics().setDepth(48);
          vine.lineStyle(3, 0x388e3c, 0.7);
          vine.beginPath();
          vine.moveTo(x - 40, y);
          for (let s = 1; s <= 5; s++) vine.lineTo(x - 40 + s * 16, y + Math.sin(s + v) * 20);
          vine.strokePath();
          scene.tweens.add({ targets: vine, alpha: 0, duration: 500, delay: v * 80, onComplete: () => vine.destroy() });
        }
      }
    },
  },

  squirtle: {
    colors: [0x42a5f5, 0x64b5f6, 0x90caf9, 0x1e88e5],
    glowColor: 0x1e88e5,
    makeProjectile: (scene, x, y, big) => {
      const r = big ? 14 : 10;
      const drop = scene.add.circle(x, y, r, 0x42a5f5, 0.9).setDepth(52);
      const hl = scene.add.circle(x - r * 0.3, y - r * 0.3, r * 0.35, 0xffffff, 0.5).setDepth(53);
      (drop as any)._hl = hl;
      return drop as any;
    },
    makeTrail: (scene, x, y, big) => {
      const colors = [0x42a5f5, 0x64b5f6, 0x90caf9, 0xbbdefb];
      const r = Phaser.Math.Between(3, big ? 10 : 7);
      const bubble = scene.add.circle(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8),
        r, Phaser.Utils.Array.GetRandom(colors), 0.6).setDepth(50);
      const hl = scene.add.circle(bubble.x - r * 0.3, bubble.y - r * 0.3, r * 0.25, 0xffffff, 0.4).setDepth(51);
      scene.tweens.add({
        targets: [bubble, hl],
        y: bubble.y - Phaser.Math.Between(15, 35), alpha: 0, scale: 0.3,
        duration: Phaser.Math.Between(250, 450),
        onComplete: () => { bubble.destroy(); hl.destroy(); },
      });
    },
    makeImpact: (scene, x, y, big) => {
      // Splash ring
      const wave = scene.add.circle(x, y, 10, 0x42a5f5, 0).setDepth(49);
      wave.setStrokeStyle(big ? 4 : 3, 0x64b5f6, 0.8);
      scene.tweens.add({ targets: wave, scale: big ? 6 : 4, alpha: 0, duration: 500, onComplete: () => wave.destroy() });

      burstParticles(scene, x, y, big ? 14 : 8, [0x42a5f5, 0x64b5f6, 0x90caf9, 0xbbdefb]);
    },
  },

  eevee: {
    colors: [0xffd700, 0xffc107, 0xffeb3b, 0xffffff],
    glowColor: 0xffd700,
    makeProjectile: (scene, x, y, big) => {
      const star = scene.add.star(x, y, 5, big ? 6 : 4, big ? 14 : 10, 0xffd700, 1).setDepth(52);
      return star as any;
    },
    makeTrail: (scene, x, y, big) => {
      const colors = [0xffd700, 0xffc107, 0xffeb3b, 0xffe082];
      const star = scene.add.star(x + Phaser.Math.Between(-6, 6), y + Phaser.Math.Between(-6, 6),
        5, 3, big ? 8 : 6, Phaser.Utils.Array.GetRandom(colors), 0.8).setDepth(50);
      star.setAngle(Phaser.Math.Between(0, 72));
      scene.tweens.add({
        targets: star,
        alpha: 0, scale: 0.3, angle: star.angle + Phaser.Math.Between(-90, 90),
        duration: 300,
        onComplete: () => star.destroy(),
      });
    },
    makeImpact: (scene, x, y, big) => {
      for (let i = 0; i < (big ? 10 : 6); i++) {
        const star = scene.add.star(x, y, 5, 4, big ? 12 : 8,
          Phaser.Utils.Array.GetRandom([0xffd700, 0xffc107, 0xffeb3b, 0xffffff]), 0.9).setDepth(50);
        scene.tweens.add({
          targets: star,
          x: x + Phaser.Math.Between(-70, 70), y: y + Phaser.Math.Between(-70, 70),
          alpha: 0, angle: Phaser.Math.Between(0, 360), scale: big ? 2 : 1.5,
          duration: Phaser.Math.Between(350, 650), delay: i * 40,
          onComplete: () => star.destroy(),
        });
      }
      const burst = scene.add.star(x, y, 8, 5, big ? 25 : 15, 0xffd700, 0.6).setDepth(49);
      scene.tweens.add({ targets: burst, alpha: 0, scale: 3, angle: 45, duration: 400, onComplete: () => burst.destroy() });
    },
  },

  jigglypuff: {
    colors: [0xff69b4, 0xffb6c1, 0xff1493, 0xda70d6],
    glowColor: 0xff69b4,
    makeProjectile: (scene, x, y, big) => {
      const note = scene.add.text(x, y, '♪', {
        fontSize: big ? '30px' : '22px', color: '#ff69b4',
        fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(52);
      return note as any;
    },
    makeTrail: (scene, x, y, big) => {
      const notes = ['♪', '♫', '♬', '♩'];
      const noteColors = ['#ff69b4', '#ffb6c1', '#ff1493', '#da70d6'];
      const n = scene.add.text(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8),
        Phaser.Utils.Array.GetRandom(notes), {
          fontSize: big ? '18px' : '14px',
          color: Phaser.Utils.Array.GetRandom(noteColors),
          fontFamily: 'Arial', stroke: '#000', strokeThickness: 1,
        }).setOrigin(0.5).setDepth(50);
      scene.tweens.add({
        targets: n,
        y: n.y - Phaser.Math.Between(15, 35), alpha: 0, angle: Phaser.Math.Between(-30, 30),
        duration: 350,
        onComplete: () => n.destroy(),
      });
    },
    makeImpact: (scene, x, y, big) => {
      // Sound wave rings at impact
      const colors = [0xff69b4, 0xffb6c1, 0xff1493, 0xda70d6];
      for (let i = 0; i < (big ? 4 : 3); i++) {
        const ring = scene.add.circle(x, y, 10, 0x000000, 0).setDepth(49);
        ring.setStrokeStyle(3, colors[i % colors.length], 0.7);
        scene.tweens.add({
          targets: ring, scale: big ? 4 + i * 1.5 : 3 + i, alpha: 0,
          duration: 600, delay: i * 100,
          onComplete: () => ring.destroy(),
        });
      }
      // Burst of notes
      const notes = ['♪', '♫', '♬', '♩'];
      for (let i = 0; i < (big ? 6 : 4); i++) {
        const n = scene.add.text(x, y, Phaser.Utils.Array.GetRandom(notes), {
          fontSize: big ? '26px' : '18px',
          color: Phaser.Utils.Array.GetRandom(['#ff69b4', '#ffb6c1', '#ff1493', '#da70d6']),
          fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(50);
        scene.tweens.add({
          targets: n,
          x: x + Phaser.Math.Between(-60, 60), y: y + Phaser.Math.Between(-80, 20),
          alpha: 0, angle: Phaser.Math.Between(-40, 40), scale: big ? 1.4 : 1,
          duration: Phaser.Math.Between(500, 800), delay: i * 60,
          onComplete: () => n.destroy(),
        });
      }
    },
  },

  meowth: {
    colors: [0xffd700, 0xdaa520, 0xffc107],
    glowColor: 0xffd700,
    makeProjectile: (scene, x, y, big) => {
      const r = big ? 12 : 9;
      const coin = scene.add.circle(x, y, r, 0xffd700, 1).setDepth(52);
      coin.setStrokeStyle(2, 0xb8860b, 0.8);
      return coin as any;
    },
    makeTrail: (scene, x, y, big) => {
      const r = Phaser.Math.Between(4, big ? 10 : 7);
      const coin = scene.add.circle(x + Phaser.Math.Between(-6, 6), y + Phaser.Math.Between(-6, 6),
        r, Phaser.Utils.Array.GetRandom([0xffd700, 0xdaa520, 0xffc107]), 0.7).setDepth(50);
      coin.setStrokeStyle(1, 0xb8860b, 0.5);
      scene.tweens.add({
        targets: coin,
        y: coin.y + Phaser.Math.Between(10, 30), alpha: 0, scale: 0.3,
        angle: Phaser.Math.Between(-90, 90),
        duration: 350,
        onComplete: () => coin.destroy(),
      });
    },
    makeImpact: (scene, x, y, big) => {
      const count = big ? 12 : 7;
      for (let i = 0; i < count; i++) {
        const r = Phaser.Math.Between(5, big ? 12 : 9);
        const coin = scene.add.circle(x, y, r,
          Phaser.Utils.Array.GetRandom([0xffd700, 0xdaa520, 0xffc107]), 0.9).setDepth(50);
        coin.setStrokeStyle(2, 0xb8860b, 0.8);
        scene.tweens.add({
          targets: coin,
          x: x + Phaser.Math.Between(-60, 60), y: y - Phaser.Math.Between(30, 100),
          alpha: 0, angle: Phaser.Math.Between(-180, 180), scale: 0.3,
          duration: Phaser.Math.Between(400, 800), ease: 'Bounce.easeOut',
          onComplete: () => coin.destroy(),
        });
      }
      const bling = scene.add.star(x, y, 4, 5, big ? 30 : 20, 0xffd700, 0.6).setDepth(49);
      scene.tweens.add({ targets: bling, alpha: 0, scale: 2.5, angle: 45, duration: 350, onComplete: () => bling.destroy() });
    },
  },

  psyduck: {
    colors: [0x9b59b6, 0x8e44ad, 0xbb6bd9, 0xd4a5ff],
    glowColor: 0x7d3cec,
    makeProjectile: (scene, x, y, big) => {
      const r = big ? 14 : 10;
      const orb = scene.add.circle(x, y, r, 0x9b59b6, 0.85).setDepth(52);
      orb.setStrokeStyle(2, 0xd4a5ff, 0.6);
      return orb as any;
    },
    makeTrail: (scene, x, y, _big) => {
      const colors = [0x9b59b6, 0xbb6bd9, 0xd4a5ff, 0x7d3cec];
      const ring = scene.add.circle(x, y, Phaser.Math.Between(3, 8),
        Phaser.Utils.Array.GetRandom(colors), 0.4).setDepth(50);
      ring.setStrokeStyle(2, Phaser.Utils.Array.GetRandom(colors), 0.5);
      scene.tweens.add({
        targets: ring, scale: 2, alpha: 0, duration: 350,
        onComplete: () => ring.destroy(),
      });
    },
    makeImpact: (scene, x, y, big) => {
      const colors = [0x9b59b6, 0x8e44ad, 0xbb6bd9, 0x7d3cec, 0xd4a5ff];
      for (let i = 0; i < (big ? 5 : 3); i++) {
        const ring = scene.add.circle(x, y, 8, Phaser.Utils.Array.GetRandom(colors), 0.15).setDepth(49);
        ring.setStrokeStyle(big ? 4 : 3, Phaser.Utils.Array.GetRandom(colors), 0.6);
        scene.tweens.add({
          targets: ring, scale: big ? 5 + i : 3 + i, alpha: 0,
          duration: 600, delay: i * 100, ease: 'Sine.easeOut',
          onComplete: () => ring.destroy(),
        });
      }
      // Spiral burst
      const pc = big ? 10 : 6;
      for (let i = 0; i < pc; i++) {
        const a = (i / pc) * Math.PI * 2;
        const p = scene.add.circle(x, y, Phaser.Math.Between(3, 7),
          Phaser.Utils.Array.GetRandom(colors), 0.8).setDepth(50);
        scene.tweens.add({
          targets: p,
          x: x + Math.cos(a) * (big ? 70 : 50),
          y: y + Math.sin(a) * (big ? 70 : 50),
          alpha: 0, scale: 0.3, duration: 500, delay: i * 30,
          onComplete: () => p.destroy(),
        });
      }
      if (big) {
        for (let i = 0; i < 3; i++) {
          const q = scene.add.text(x + Phaser.Math.Between(-30, 30), y + Phaser.Math.Between(-20, 10), '?', {
            fontSize: '24px', color: '#d4a5ff', fontFamily: 'Arial Black', stroke: '#4a0080', strokeThickness: 3,
          }).setOrigin(0.5).setDepth(51);
          scene.tweens.add({
            targets: q, y: q.y - Phaser.Math.Between(40, 70), alpha: 0, angle: Phaser.Math.Between(-30, 30), scale: 1.3,
            duration: 600, delay: i * 80, onComplete: () => q.destroy(),
          });
        }
      }
    },
  },

  kai: {
    colors: [0xcc2222, 0xff4400, 0xffd700, 0xff6600],
    glowColor: 0xff4400,
    makeProjectile: (scene, x, y, big) => {
      const r = big ? 16 : 11;
      // Flaming sword slash projectile
      const g = scene.add.graphics().setDepth(52);
      g.fillStyle(0xffd700, 1);
      // Sword blade shape
      g.fillRect(-3, -r * 1.5, 6, r * 3);
      g.fillTriangle(0, -r * 1.5 - 8, -6, -r * 1.5, 6, -r * 1.5);
      // Fire glow around blade
      g.fillStyle(0xff4400, 0.5);
      g.fillCircle(0, 0, r);
      g.setPosition(x, y);
      return g as any;
    },
    makeTrail: (scene, x, y, big) => {
      const colors = [0xcc2222, 0xff4400, 0xff6600, 0xffd700];
      // Fire + slash trail
      const size = Phaser.Math.Between(big ? 8 : 5, big ? 18 : 12);
      const flame = scene.add.triangle(
        x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8),
        0, size, size / 2, -size, -size / 2, -size,
        Phaser.Utils.Array.GetRandom(colors), 0.8,
      ).setDepth(50).setAngle(Phaser.Math.Between(0, 360));
      scene.tweens.add({
        targets: flame,
        y: flame.y - Phaser.Math.Between(15, 40),
        alpha: 0, scale: 0.2, angle: flame.angle + Phaser.Math.Between(-90, 90),
        duration: Phaser.Math.Between(200, 400),
        onComplete: () => flame.destroy(),
      });
      // Sparks
      const spark = scene.add.circle(x + Phaser.Math.Between(-6, 6), y + Phaser.Math.Between(-6, 6),
        Phaser.Math.Between(1, 3), 0xffd700, 0.9).setDepth(50);
      scene.tweens.add({
        targets: spark, alpha: 0, scale: 0, duration: 250,
        onComplete: () => spark.destroy(),
      });
    },
    makeImpact: (scene, x, y, big) => {
      // Slash X marks
      const slashG = scene.add.graphics().setDepth(51);
      slashG.lineStyle(big ? 5 : 3, 0xffd700, 0.9);
      const len = big ? 50 : 35;
      slashG.beginPath();
      slashG.moveTo(x - len, y - len); slashG.lineTo(x + len, y + len);
      slashG.moveTo(x + len, y - len); slashG.lineTo(x - len, y + len);
      slashG.strokePath();
      scene.tweens.add({ targets: slashG, alpha: 0, duration: 400, onComplete: () => slashG.destroy() });

      // Fire burst
      const count = big ? 16 : 10;
      const fireColors = [0xcc2222, 0xff4400, 0xff6600, 0xffd700, 0xff2200];
      for (let i = 0; i < count; i++) {
        const size = Phaser.Math.Between(6, big ? 18 : 12);
        const flame = scene.add.triangle(
          x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12),
          0, size, size / 2, -size, -size / 2, -size,
          Phaser.Utils.Array.GetRandom(fireColors), 0.85,
        ).setDepth(50);
        scene.tweens.add({
          targets: flame,
          y: flame.y - Phaser.Math.Between(30, 80),
          x: flame.x + Phaser.Math.Between(-40, 40),
          alpha: 0, scale: 0.1, angle: Phaser.Math.Between(-180, 180),
          duration: Phaser.Math.Between(300, 600),
          onComplete: () => flame.destroy(),
        });
      }
      // Flash
      const flash = scene.add.circle(x, y, big ? 40 : 28, 0xff4400, 0.6).setDepth(49);
      scene.tweens.add({ targets: flash, alpha: 0, scale: 2.5, duration: 400, onComplete: () => flash.destroy() });
      burstParticles(scene, x, y, big ? 10 : 6, [0xffd700, 0xff4400, 0xcc2222]);
    },
  },

  skylor: {
    colors: [0xf5a623, 0xd48b0a, 0xffe0a0, 0x8B4513],
    glowColor: 0xf5a623,
    makeProjectile: (scene, x, y, big) => {
      // Arrow projectile
      const g = scene.add.graphics().setDepth(52);
      const len = big ? 28 : 20;
      // Shaft
      g.lineStyle(big ? 4 : 3, 0x8B6914, 1);
      g.beginPath();
      g.moveTo(-len, 0);
      g.lineTo(len * 0.6, 0);
      g.strokePath();
      // Arrowhead
      g.fillStyle(0x888888, 1);
      g.fillTriangle(len, 0, len * 0.5, -6, len * 0.5, 6);
      // Feather / fletching
      g.fillStyle(0xf5a623, 0.8);
      g.fillTriangle(-len, 0, -len + 8, -5, -len + 8, 0);
      g.fillTriangle(-len, 0, -len + 8, 5, -len + 8, 0);
      // Amber glow
      g.fillStyle(0xf5a623, 0.3);
      g.fillCircle(0, 0, big ? 12 : 8);
      g.setPosition(x, y);
      return g as any;
    },
    makeTrail: (scene, x, y, big) => {
      const colors = [0xf5a623, 0xd48b0a, 0xffe0a0, 0xff8c00];
      // Amber energy particles
      const r = Phaser.Math.Between(2, big ? 8 : 5);
      const p = scene.add.circle(x + Phaser.Math.Between(-6, 6), y + Phaser.Math.Between(-4, 4),
        r, Phaser.Utils.Array.GetRandom(colors), 0.7).setDepth(50);
      scene.tweens.add({
        targets: p,
        y: p.y + Phaser.Math.Between(-15, 15),
        alpha: 0, scale: 0.2,
        duration: Phaser.Math.Between(200, 350),
        onComplete: () => p.destroy(),
      });
      // Amber shimmer
      if (Phaser.Math.Between(0, 2) === 0) {
        const shimmer = scene.add.star(x, y, 4, 2, big ? 6 : 4, 0xffe0a0, 0.6).setDepth(50);
        scene.tweens.add({
          targets: shimmer, alpha: 0, scale: 0, angle: 45, duration: 300,
          onComplete: () => shimmer.destroy(),
        });
      }
    },
    makeImpact: (scene, x, y, big) => {
      // Multiple arrows pierce in (for special)
      if (big) {
        for (let i = 0; i < 5; i++) {
          const ag = scene.add.graphics().setDepth(51);
          const angle = Phaser.Math.FloatBetween(-0.6, 0.6);
          ag.lineStyle(3, 0x8B6914, 0.8);
          ag.beginPath();
          const ox = Phaser.Math.Between(-25, 25);
          const oy = Phaser.Math.Between(-25, 25);
          ag.moveTo(x + ox - Math.cos(angle) * 35, y + oy - Math.sin(angle) * 35);
          ag.lineTo(x + ox, y + oy);
          ag.strokePath();
          ag.fillStyle(0x888888, 0.8);
          ag.fillTriangle(x + ox, y + oy, x + ox - 6, y + oy - 4, x + ox - 6, y + oy + 4);
          scene.tweens.add({
            targets: ag, alpha: 0, duration: 500, delay: i * 60,
            onComplete: () => ag.destroy(),
          });
        }
      }
      // Amber energy burst
      const colors = [0xf5a623, 0xd48b0a, 0xffe0a0, 0xff8c00];
      for (let i = 0; i < (big ? 12 : 7); i++) {
        const a = (i / (big ? 12 : 7)) * Math.PI * 2;
        const dist = big ? 65 : 45;
        const p = scene.add.circle(x, y, Phaser.Math.Between(3, 7),
          Phaser.Utils.Array.GetRandom(colors), 0.8).setDepth(50);
        scene.tweens.add({
          targets: p,
          x: x + Math.cos(a) * dist,
          y: y + Math.sin(a) * dist,
          alpha: 0, scale: 0.2, duration: 450, delay: i * 25,
          onComplete: () => p.destroy(),
        });
      }
      // Central amber flash
      const flash = scene.add.circle(x, y, big ? 35 : 22, 0xf5a623, 0.6).setDepth(49);
      scene.tweens.add({ targets: flash, alpha: 0, scale: 2.2, duration: 380, onComplete: () => flash.destroy() });
      burstParticles(scene, x, y, big ? 10 : 6, colors);
    },
  },
};

const DEFAULT_CFG: EffectConfig = {
  colors: [0xffffff, 0xcccccc, 0xffdd44],
  glowColor: 0xffffff,
  makeProjectile: (scene, x, y, big) => {
    const r = big ? 10 : 7;
    return scene.add.circle(x, y, r, 0xffffff, 0.9).setDepth(52) as any;
  },
  makeTrail: (scene, x, y, _big) => {
    const p = scene.add.circle(x, y, Phaser.Math.Between(2, 5),
      Phaser.Utils.Array.GetRandom([0xffffff, 0xcccccc, 0xffdd44]), 0.7).setDepth(50);
    scene.tweens.add({ targets: p, alpha: 0, scale: 0, duration: 300, onComplete: () => p.destroy() });
  },
  makeImpact: (scene, x, y, big) => {
    burstParticles(scene, x, y, big ? 12 : 7, [0xffffff, 0xcccccc, 0xffdd44]);
  },
};

/* ------------------------------------------------------------------ */
/*  Core projectile launcher                                           */
/* ------------------------------------------------------------------ */

function launchProjectile(
  scene: Phaser.Scene,
  cfg: EffectConfig,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  big: boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const projectile = cfg.makeProjectile(scene, fromX, fromY, big);

    // Glow halo behind projectile
    const glow = scene.add.circle(fromX, fromY, big ? 22 : 16, cfg.glowColor, 0.25).setDepth(51);

    // Pulsing glow
    scene.tweens.add({
      targets: glow,
      scale: { from: 1, to: 1.5 },
      alpha: { from: 0.25, to: 0.1 },
      duration: 150,
      yoyo: true,
      repeat: -1,
    });

    // Spawn trail particles along the path
    const trailTimer = scene.time.addEvent({
      delay: TRAIL_INTERVAL_MS,
      repeat: Math.floor(TRAVEL_MS / TRAIL_INTERVAL_MS),
      callback: () => {
        cfg.makeTrail(scene, projectile.x, projectile.y, big);
      },
    });

    // Extra companion projectiles for special
    const companions: any[] = [];
    if (big) {
      for (let i = 0; i < 2; i++) {
        const offsetY = (i === 0 ? -1 : 1) * Phaser.Math.Between(18, 30);
        const comp = scene.add.circle(fromX, fromY + offsetY, big ? 7 : 5,
          Phaser.Utils.Array.GetRandom(cfg.colors), 0.6).setDepth(51);
        companions.push(comp);

        scene.tweens.add({
          targets: comp,
          x: toX,
          y: toY + offsetY * 0.3,
          duration: TRAVEL_MS + 40,
          ease: 'Sine.easeIn',
          onComplete: () => comp.destroy(),
        });
      }
    }

    // Main projectile tween
    scene.tweens.add({
      targets: projectile,
      x: toX,
      y: toY,
      duration: TRAVEL_MS,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        // Keep glow & any child objects attached
        glow.setPosition(projectile.x, projectile.y);
        if ((projectile as any)._core) {
          (projectile as any)._core.setPosition(projectile.x, projectile.y);
        }
        if ((projectile as any)._hl) {
          const r = (projectile as any)._hl;
          r.setPosition(projectile.x - 3, projectile.y - 3);
        }
      },
      onComplete: () => {
        // Cleanup
        trailTimer.destroy();
        glow.destroy();
        if ((projectile as any)._core) (projectile as any)._core.destroy();
        if ((projectile as any)._hl) (projectile as any)._hl.destroy();
        projectile.destroy();

        // Impact burst!
        cfg.makeImpact(scene, toX, toY, big);

        resolve();
      },
    });

    // Spin / rotate the projectile as it travels
    if ('angle' in projectile) {
      scene.tweens.add({
        targets: projectile,
        angle: 360,
        duration: TRAVEL_MS,
        ease: 'Linear',
      });
    }
  });
}

/* ===== Helper: generic particle burst ===== */

function burstParticles(scene: Phaser.Scene, x: number, y: number, count: number, colors: number[]): void {
  for (let i = 0; i < count; i++) {
    const color = Phaser.Utils.Array.GetRandom(colors);
    const p = scene.add.circle(
      x + Phaser.Math.Between(-10, 10),
      y + Phaser.Math.Between(-10, 10),
      Phaser.Math.Between(2, 6),
      color, 0.9,
    ).setDepth(50);

    scene.tweens.add({
      targets: p,
      x: x + Phaser.Math.Between(-60, 60),
      y: y + Phaser.Math.Between(-60, 40),
      alpha: 0, scale: 0,
      duration: Phaser.Math.Between(300, 600),
      ease: 'Power2',
      onComplete: () => p.destroy(),
    });
  }
}
