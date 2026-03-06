import Phaser from 'phaser';

/** Tracks all objects created by the arena so they can be cleaned up on resize. */
interface ArenaHandle {
  destroy: () => void;
}

/** Active handle so we can tear‑down before redrawing. */
let activeHandle: ArenaHandle | null = null;

/**
 * Draw a rich procedural fantasy arena background.
 *
 * Layers (back → front):
 *  1. Multi-band sunset / twilight sky
 *  2. Stars + crescent moon
 *  3. Clouds with drift animation
 *  4. Distant mountain silhouettes with snow caps
 *  5. Mid-ground rolling hills
 *  6. Ground with grass gradient
 *  7. Stone colosseum arena ring
 *  8. Ornamental pillars with fire braziers
 *  9. Foreground trees
 * 10. Animated firefly particles
 * 11. Atmospheric fog wisps
 * 12. Radial vignette overlay
 */
export function drawMedievalArena(scene: Phaser.Scene): void {
  if (activeHandle) {
    activeHandle.destroy();
    activeHandle = null;
  }

  const objs: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];

  const BG_DEPTH = -10;

  const gfx = (): Phaser.GameObjects.Graphics => {
    const g = scene.add.graphics().setDepth(BG_DEPTH);
    objs.push(g);
    return g;
  };

  const W = scene.scale.width;
  const H = scene.scale.height;

  /* ───── 1. Sky ───── */
  const sky = gfx();
  // Upper deep indigo → mid purple → horizon warm orange/pink
  const bands: [number, number, number, number][] = [
    [0x0b0e2d, 0.00, 0x0b0e2d, 0.18],
    [0x162052, 0.18, 0x2d3a80, 0.34],
    [0x4a3080, 0.34, 0x8e4585, 0.44],
    [0xc75b39, 0.44, 0xe8985a, 0.50],
    [0xf0c27f, 0.50, 0xf4d9a0, 0.52],
  ];
  for (const [c1, y1, c2, y2] of bands) {
    sky.fillGradientStyle(c1, c1, c2, c2);
    sky.fillRect(0, H * y1, W, H * (y2 - y1) + 1);
  }

  /* ───── 2. Stars + moon ───── */
  const starGfx = gfx();
  const rng = new Phaser.Math.RandomDataGenerator([String(42)]);
  for (let i = 0; i < 60; i++) {
    const sx = rng.between(0, W);
    const sy = rng.between(0, Math.floor(H * 0.38));
    const sr = rng.realInRange(0.6, 1.8);
    const sa = rng.realInRange(0.3, 0.9);
    starGfx.fillStyle(0xffffff, sa);
    starGfx.fillCircle(sx, sy, sr);
  }
  // Crescent moon
  const moonX = W * 0.82;
  const moonY = H * 0.1;
  starGfx.fillStyle(0xf4e8c1, 0.95);
  starGfx.fillCircle(moonX, moonY, 18);
  starGfx.fillStyle(0x0b0e2d, 1);
  starGfx.fillCircle(moonX + 7, moonY - 4, 15);
  // Moon glow
  starGfx.fillStyle(0xf4e8c1, 0.06);
  starGfx.fillCircle(moonX, moonY, 50);

  /* ───── 3. Clouds ───── */
  drawProceduralCloud(scene, objs, tweens, W * 0.10, H * 0.12, 1.1, 0.20);
  drawProceduralCloud(scene, objs, tweens, W * 0.40, H * 0.08, 1.3, 0.16);
  drawProceduralCloud(scene, objs, tweens, W * 0.72, H * 0.15, 0.9, 0.18);
  drawProceduralCloud(scene, objs, tweens, W * 0.55, H * 0.22, 0.7, 0.12);

  /* ───── 4. Distant mountains ───── */
  const mtn1 = gfx();
  // Far range (dark silhouette)
  mtn1.fillStyle(0x1a1a3a, 0.85);
  mtn1.beginPath();
  mtn1.moveTo(-10, H * 0.50);
  mtn1.lineTo(W * 0.05, H * 0.36);
  mtn1.lineTo(W * 0.15, H * 0.42);
  mtn1.lineTo(W * 0.25, H * 0.30);
  mtn1.lineTo(W * 0.38, H * 0.40);
  mtn1.lineTo(W * 0.48, H * 0.28);
  mtn1.lineTo(W * 0.56, H * 0.35);
  mtn1.lineTo(W * 0.65, H * 0.25);
  mtn1.lineTo(W * 0.78, H * 0.34);
  mtn1.lineTo(W * 0.88, H * 0.22);
  mtn1.lineTo(W * 0.95, H * 0.32);
  mtn1.lineTo(W + 10, H * 0.38);
  mtn1.lineTo(W + 10, H * 0.52);
  mtn1.lineTo(-10, H * 0.52);
  mtn1.closePath();
  mtn1.fillPath();

  // Snow caps on tallest peaks
  const snowGfx = gfx();
  snowGfx.fillStyle(0xdce6f0, 0.5);
  drawSnowCap(snowGfx, W * 0.25, H * 0.30, 14);
  drawSnowCap(snowGfx, W * 0.48, H * 0.28, 12);
  drawSnowCap(snowGfx, W * 0.65, H * 0.25, 16);
  drawSnowCap(snowGfx, W * 0.88, H * 0.22, 13);

  // Near range (slightly lighter)
  const mtn2 = gfx();
  mtn2.fillStyle(0x252848, 0.75);
  mtn2.beginPath();
  mtn2.moveTo(-10, H * 0.52);
  mtn2.lineTo(W * 0.08, H * 0.42);
  mtn2.lineTo(W * 0.20, H * 0.46);
  mtn2.lineTo(W * 0.32, H * 0.38);
  mtn2.lineTo(W * 0.45, H * 0.44);
  mtn2.lineTo(W * 0.60, H * 0.40);
  mtn2.lineTo(W * 0.75, H * 0.45);
  mtn2.lineTo(W * 0.90, H * 0.39);
  mtn2.lineTo(W + 10, H * 0.44);
  mtn2.lineTo(W + 10, H * 0.55);
  mtn2.lineTo(-10, H * 0.55);
  mtn2.closePath();
  mtn2.fillPath();

  /* ───── 5. Rolling hills ───── */
  const hills = gfx();
  hills.fillStyle(0x2a4a28, 0.9);
  hills.beginPath();
  hills.moveTo(-10, H * 0.55);
  for (let i = 0; i <= 20; i++) {
    const hx = (W / 20) * i;
    const hy = H * 0.52 + Math.sin(i * 0.8) * H * 0.02 + Math.cos(i * 1.3) * H * 0.015;
    hills.lineTo(hx, hy);
  }
  hills.lineTo(W + 10, H * 0.56);
  hills.lineTo(W + 10, H * 0.56);
  hills.lineTo(-10, H * 0.56);
  hills.closePath();
  hills.fillPath();

  /* ───── 6. Ground ───── */
  const ground = gfx();
  // Rich grass gradient
  ground.fillGradientStyle(0x3d6b30, 0x3d6b30, 0x2a4a20, 0x2a4a20);
  ground.fillRect(0, H * 0.54, W, H * 0.14);
  // Darker earth lower half
  ground.fillGradientStyle(0x2a4a20, 0x2a4a20, 0x1e3518, 0x1e3518);
  ground.fillRect(0, H * 0.68, W, H * 0.32);

  // Subtle grass highlights
  const grassGfx = gfx();
  for (let i = 0; i < 40; i++) {
    const gx = rng.between(10, W - 10);
    const gy = rng.between(Math.floor(H * 0.56), Math.floor(H * 0.95));
    const gh = rng.between(6, 16);
    grassGfx.lineStyle(1.5, rng.pick([0x4a8a3a, 0x5a9a4a, 0x3d7a2d]), 0.4);
    grassGfx.beginPath();
    grassGfx.moveTo(gx, gy);
    grassGfx.lineTo(gx - 2, gy - gh);
    grassGfx.strokePath();
    grassGfx.beginPath();
    grassGfx.moveTo(gx + 4, gy);
    grassGfx.lineTo(gx + 5, gy - gh * 0.8);
    grassGfx.strokePath();
  }

  /* ───── 7. Arena ring ───── */
  const arena = gfx();
  // Shadow beneath arena ring
  arena.fillStyle(0x000000, 0.15);
  arena.fillEllipse(W / 2, H * 0.63 + 4, W * 0.58, H * 0.18);
  // Outer stone ring
  arena.fillStyle(0x7a7568, 0.4);
  arena.fillEllipse(W / 2, H * 0.63, W * 0.58, H * 0.18);
  // Inner sandy floor
  arena.fillStyle(0x9e9478, 0.3);
  arena.fillEllipse(W / 2, H * 0.63, W * 0.50, H * 0.14);
  // Ring borders
  arena.lineStyle(3, 0xc8ba8a, 0.35);
  arena.strokeEllipse(W / 2, H * 0.63, W * 0.58, H * 0.18);
  arena.lineStyle(2, 0xc8ba8a, 0.2);
  arena.strokeEllipse(W / 2, H * 0.63, W * 0.50, H * 0.14);
  // Center mark
  arena.lineStyle(1, 0xffffff, 0.08);
  arena.strokeEllipse(W / 2, H * 0.63, W * 0.12, H * 0.035);

  /* ───── 8. Pillars with braziers ───── */
  const pillarGfx = gfx();
  drawPillar(pillarGfx, W * 0.18, H * 0.38, H * 0.20);
  drawPillar(pillarGfx, W * 0.82, H * 0.38, H * 0.20);

  // Brazier fires
  const brazierL = gfx();
  drawBrazierFire(brazierL, W * 0.18, H * 0.35);
  const flickL = scene.tweens.add({
    targets: brazierL,
    alpha: { from: 0.7, to: 1 },
    scaleY: { from: 0.95, to: 1.05 },
    duration: 200 + Math.random() * 200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  tweens.push(flickL);

  const brazierR = gfx();
  drawBrazierFire(brazierR, W * 0.82, H * 0.35);
  const flickR = scene.tweens.add({
    targets: brazierR,
    alpha: { from: 0.7, to: 1 },
    scaleY: { from: 0.95, to: 1.05 },
    duration: 180 + Math.random() * 200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  tweens.push(flickR);

  // Warm glow circles around braziers
  const glowGfx = gfx();
  glowGfx.fillStyle(0xff8c00, 0.04);
  glowGfx.fillCircle(W * 0.18, H * 0.37, 55);
  glowGfx.fillCircle(W * 0.82, H * 0.37, 55);
  glowGfx.fillStyle(0xffaa00, 0.03);
  glowGfx.fillCircle(W * 0.18, H * 0.37, 80);
  glowGfx.fillCircle(W * 0.82, H * 0.37, 80);

  /* ───── 9. Trees ───── */
  const treeFx = gfx();
  drawFancyTree(treeFx, W * 0.04, H * 0.50, 0.9);
  drawFancyTree(treeFx, W * 0.12, H * 0.52, 0.6);
  drawFancyTree(treeFx, W * 0.88, H * 0.49, 0.85);
  drawFancyTree(treeFx, W * 0.95, H * 0.51, 0.65);

  /* ───── 10. Fireflies ───── */
  for (let i = 0; i < 12; i++) {
    const fx = rng.between(Math.floor(W * 0.05), Math.floor(W * 0.95));
    const fy = rng.between(Math.floor(H * 0.35), Math.floor(H * 0.65));
    const dot = scene.add.circle(fx, fy, rng.realInRange(1.5, 3), 0xffe566, 0.6).setDepth(BG_DEPTH);
    objs.push(dot);
    const t = scene.tweens.add({
      targets: dot,
      alpha: { from: 0.15, to: 0.7 },
      x: fx + rng.between(-30, 30),
      y: fy + rng.between(-20, 20),
      duration: 2000 + rng.between(0, 3000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: rng.between(0, 2000),
    });
    tweens.push(t);
  }

  /* ───── 11. Fog wisps ───── */
  const fogGfx = gfx();
  fogGfx.fillStyle(0xc8c8d0, 0.04);
  fogGfx.fillEllipse(W * 0.3, H * 0.54, W * 0.35, H * 0.06);
  fogGfx.fillEllipse(W * 0.7, H * 0.56, W * 0.30, H * 0.05);
  fogGfx.fillStyle(0xc8c8d0, 0.03);
  fogGfx.fillEllipse(W * 0.5, H * 0.52, W * 0.50, H * 0.04);

  const fogDrift = scene.tweens.add({
    targets: fogGfx,
    x: { from: -8, to: 8 },
    alpha: { from: 0.85, to: 1 },
    duration: 5000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  tweens.push(fogDrift);

  /* ───── 12. Vignette ───── */
  const vig = gfx();
  // Top
  for (let i = 0; i < 6; i++) {
    vig.fillStyle(0x000000, 0.12 - i * 0.02);
    vig.fillRect(0, i * 8, W, 8);
  }
  // Bottom
  for (let i = 0; i < 8; i++) {
    vig.fillStyle(0x000000, 0.18 - i * 0.022);
    vig.fillRect(0, H - (i + 1) * 8, W, 8);
  }
  // Sides
  for (let i = 0; i < 5; i++) {
    vig.fillStyle(0x000000, 0.10 - i * 0.02);
    vig.fillRect(i * 8, 0, 8, H);
    vig.fillRect(W - (i + 1) * 8, 0, 8, H);
  }

  /* ───── Resize + cleanup ───── */
  const onResize = () => drawMedievalArena(scene);
  scene.scale.on('resize', onResize);

  activeHandle = {
    destroy() {
      scene.scale.off('resize', onResize);
      tweens.forEach((t) => t.destroy());
      objs.forEach((o) => o.destroy());
      tweens.length = 0;
      objs.length = 0;
    },
  };
}

/* ══════════════════════════════════════════════
 *  Helper draw functions
 * ══════════════════════════════════════════════ */

/** Draw a procedural cloud (no texture needed). */
function drawProceduralCloud(
  scene: Phaser.Scene,
  objs: Phaser.GameObjects.GameObject[],
  tweens: Phaser.Tweens.Tween[],
  x: number,
  y: number,
  scale: number,
  alpha: number,
): void {
  const g = scene.add.graphics().setDepth(-10);
  objs.push(g);
  g.fillStyle(0xd8c8e8, alpha);
  g.fillEllipse(x, y, 80 * scale, 24 * scale);
  g.fillEllipse(x - 28 * scale, y + 4 * scale, 50 * scale, 18 * scale);
  g.fillEllipse(x + 30 * scale, y + 3 * scale, 55 * scale, 20 * scale);
  g.fillStyle(0xf0e0f8, alpha * 0.5);
  g.fillEllipse(x + 5 * scale, y - 4 * scale, 60 * scale, 16 * scale);

  const drift = scene.tweens.add({
    targets: g,
    x: { from: 0, to: 25 + Math.random() * 25 },
    duration: 8000 + Math.random() * 6000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  tweens.push(drift);
}

/** Snow cap triangle on a mountain peak. */
function drawSnowCap(g: Phaser.GameObjects.Graphics, px: number, py: number, size: number): void {
  g.beginPath();
  g.moveTo(px, py);
  g.lineTo(px - size, py + size * 0.7);
  g.lineTo(px + size, py + size * 0.7);
  g.closePath();
  g.fillPath();
}

/** Draw a stone pillar. */
function drawPillar(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number): void {
  const w = 14;
  // Shadow
  g.fillStyle(0x000000, 0.15);
  g.fillRect(x - w / 2 + 3, y + 2, w, h);
  // Stone body
  g.fillGradientStyle(0x8a8478, 0x9a9488, 0x6a6458, 0x7a7468);
  g.fillRect(x - w / 2, y, w, h);
  // Capital (top block)
  g.fillStyle(0xa09888, 1);
  g.fillRect(x - w / 2 - 4, y - 4, w + 8, 8);
  // Base block
  g.fillStyle(0x7a7468, 1);
  g.fillRect(x - w / 2 - 3, y + h - 4, w + 6, 8);
  // Light edge
  g.lineStyle(1, 0xc0b8a0, 0.3);
  g.lineBetween(x - w / 2, y, x - w / 2, y + h);
}

/** Brazier fire drawn with overlapping circles. */
function drawBrazierFire(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  // Outer warm glow
  g.fillStyle(0xff6600, 0.25);
  g.fillCircle(x, y, 14);
  // Flame base
  g.fillStyle(0xff8c00, 0.8);
  g.fillCircle(x, y, 8);
  g.fillStyle(0xffbb33, 0.7);
  g.fillCircle(x, y - 4, 6);
  // Flame tip
  g.fillStyle(0xffee66, 0.6);
  g.fillCircle(x, y - 8, 4);
  // Bright core
  g.fillStyle(0xffffff, 0.3);
  g.fillCircle(x, y - 4, 2.5);
}

/** A more detailed tree with layered foliage. */
function drawFancyTree(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  // Trunk
  g.fillStyle(0x4a3020, 0.9);
  g.fillRect(x - 5 * s, y - 8 * s, 10 * s, 35 * s);
  // Branch stubs
  g.fillStyle(0x3d2818, 0.7);
  g.fillRect(x - 12 * s, y - 2 * s, 10 * s, 3 * s);
  g.fillRect(x + 4 * s, y + 4 * s, 9 * s, 3 * s);
  // Foliage layers (back → front, different greens)
  g.fillStyle(0x1a5020, 0.85);
  g.fillCircle(x - 6 * s, y - 14 * s, 20 * s);
  g.fillStyle(0x226628, 0.8);
  g.fillCircle(x + 8 * s, y - 18 * s, 18 * s);
  g.fillStyle(0x2d7a30, 0.85);
  g.fillCircle(x, y - 22 * s, 22 * s);
  g.fillStyle(0x3a8a3a, 0.6);
  g.fillCircle(x - 10 * s, y - 26 * s, 14 * s);
  g.fillCircle(x + 12 * s, y - 24 * s, 12 * s);
  // Highlight spots
  g.fillStyle(0x5aaa55, 0.3);
  g.fillCircle(x + 4 * s, y - 28 * s, 8 * s);
}

/* ══════════════════════════════════════════════
 *  Dispatcher
 * ══════════════════════════════════════════════ */

const PROCEDURAL_MAP: Record<string, (scene: Phaser.Scene) => void> = {
  bg_medieval_arena: drawMedievalArena,
  bg_enchanted_forest: drawEnchantedForest,
  bg_volcanic_crater: drawVolcanicCrater,
  bg_frozen_peaks: drawFrozenPeaks,
  bg_ocean_cliffs: drawOceanCliffs,
};

export function drawProceduralBackground(scene: Phaser.Scene, key: string): void {
  const fn = PROCEDURAL_MAP[key] ?? drawMedievalArena;
  fn(scene);
}

/* ══════════════════════════════════════════════
 *  Shared helpers for new backgrounds
 * ══════════════════════════════════════════════ */

interface BgHandle { destroy: () => void; }
const handles: Record<string, BgHandle | null> = {};

function setupBg(scene: Phaser.Scene, id: string) {
  if (handles[id]) { handles[id]!.destroy(); handles[id] = null; }
  const objs: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  const D = -10;
  const W = scene.scale.width;
  const H = scene.scale.height;
  const gfx = () => { const g = scene.add.graphics().setDepth(D); objs.push(g); return g; };
  const rng = new Phaser.Math.RandomDataGenerator([id]);
  const cleanup = (resizeFn: () => void) => {
    scene.scale.on('resize', resizeFn);
    handles[id] = {
      destroy() {
        scene.scale.off('resize', resizeFn);
        tweens.forEach(t => t.destroy());
        objs.forEach(o => o.destroy());
        tweens.length = 0; objs.length = 0;
      },
    };
  };
  return { objs, tweens, D, W, H, gfx, rng, cleanup };
}

function drawVignette(g: Phaser.GameObjects.Graphics, W: number, H: number): void {
  for (let i = 0; i < 6; i++) { g.fillStyle(0x000000, 0.12 - i * 0.02); g.fillRect(0, i * 8, W, 8); }
  for (let i = 0; i < 8; i++) { g.fillStyle(0x000000, 0.18 - i * 0.022); g.fillRect(0, H - (i + 1) * 8, W, 8); }
  for (let i = 0; i < 5; i++) { g.fillStyle(0x000000, 0.10 - i * 0.02); g.fillRect(i * 8, 0, 8, H); g.fillRect(W - (i + 1) * 8, 0, 8, H); }
}

/* ══════════════════════════════════════════════
 *  Enchanted Forest
 *  Deep magical forest clearing with towering trees,
 *  glowing mushrooms, fireflies, misty canopy.
 * ══════════════════════════════════════════════ */

function drawEnchantedForest(scene: Phaser.Scene): void {
  const { objs, tweens, D, W, H, gfx, rng, cleanup } = setupBg(scene, 'enchanted_forest');

  /* Sky — very dark blue-green canopy overhead, lighter below */
  const sky = gfx();
  const bands: [number, number, number, number][] = [
    [0x050e12, 0.00, 0x081818, 0.25],
    [0x0c2220, 0.25, 0x143830, 0.45],
    [0x1a4a3a, 0.45, 0x2a6848, 0.55],
  ];
  for (const [c1, y1, c2, y2] of bands) {
    sky.fillGradientStyle(c1, c1, c2, c2);
    sky.fillRect(0, H * y1, W, H * (y2 - y1) + 1);
  }

  /* Filtered light beams */
  const beams = gfx();
  for (let i = 0; i < 5; i++) {
    const bx = W * (0.15 + i * 0.18);
    beams.fillStyle(0xaaddaa, 0.04);
    beams.beginPath();
    beams.moveTo(bx - 15, 0);
    beams.lineTo(bx + 15, 0);
    beams.lineTo(bx + 50, H * 0.6);
    beams.lineTo(bx - 20, H * 0.6);
    beams.closePath();
    beams.fillPath();
  }

  /* Distant trees (back layer) */
  const farTrees = gfx();
  farTrees.fillStyle(0x0e2818, 0.9);
  farTrees.beginPath();
  farTrees.moveTo(-10, H * 0.55);
  for (let i = 0; i <= 30; i++) {
    const tx = (W / 30) * i;
    const peak = H * (0.15 + Math.abs(Math.sin(i * 0.9)) * 0.25 + Math.sin(i * 2.3) * 0.04);
    farTrees.lineTo(tx, peak);
  }
  farTrees.lineTo(W + 10, H * 0.55);
  farTrees.closePath();
  farTrees.fillPath();

  /* Mid trees */
  const midTrees = gfx();
  midTrees.fillStyle(0x14381e, 0.85);
  midTrees.beginPath();
  midTrees.moveTo(-10, H * 0.55);
  for (let i = 0; i <= 20; i++) {
    const tx = (W / 20) * i;
    const peak = H * (0.28 + Math.abs(Math.sin(i * 1.4 + 0.5)) * 0.2);
    midTrees.lineTo(tx, peak);
  }
  midTrees.lineTo(W + 10, H * 0.55);
  midTrees.closePath();
  midTrees.fillPath();

  /* Ground */
  const ground = gfx();
  ground.fillGradientStyle(0x1a4020, 0x1a4020, 0x0e2810, 0x0e2810);
  ground.fillRect(0, H * 0.53, W, H * 0.50);

  /* Moss / grass patches */
  const moss = gfx();
  for (let i = 0; i < 50; i++) {
    const mx = rng.between(0, W);
    const my = rng.between(Math.floor(H * 0.55), Math.floor(H * 0.95));
    moss.fillStyle(rng.pick([0x2a6a30, 0x3a8a40, 0x1a5a25]), 0.3);
    moss.fillCircle(mx, my, rng.between(3, 12));
  }

  /* Big foreground trees (left & right pillars) */
  const trunks = gfx();
  // Left trunk
  trunks.fillGradientStyle(0x2a1a10, 0x3a2818, 0x1a1008, 0x2a1a10);
  trunks.fillRect(-5, H * 0.1, 40, H * 0.9);
  trunks.fillRect(15, H * 0.1, 25, H * 0.9);
  // Right trunk
  trunks.fillGradientStyle(0x3a2818, 0x2a1a10, 0x2a1a10, 0x1a1008);
  trunks.fillRect(W - 35, H * 0.08, 45, H * 0.92);

  /* Canopy overhead */
  const canopy = gfx();
  canopy.fillStyle(0x0a1e0e, 0.7);
  canopy.fillEllipse(W * 0.15, H * 0.02, W * 0.5, H * 0.15);
  canopy.fillEllipse(W * 0.75, H * 0.0, W * 0.6, H * 0.12);
  canopy.fillStyle(0x143820, 0.5);
  canopy.fillEllipse(W * 0.5, H * 0.05, W * 0.7, H * 0.1);

  /* Arena clearing — mossy stone circle */
  const arena = gfx();
  arena.fillStyle(0x000000, 0.12);
  arena.fillEllipse(W / 2, H * 0.63 + 4, W * 0.55, H * 0.17);
  arena.fillStyle(0x3a5a38, 0.35);
  arena.fillEllipse(W / 2, H * 0.63, W * 0.55, H * 0.17);
  arena.fillStyle(0x4a6a44, 0.25);
  arena.fillEllipse(W / 2, H * 0.63, W * 0.46, H * 0.13);
  arena.lineStyle(2, 0x6a8a60, 0.3);
  arena.strokeEllipse(W / 2, H * 0.63, W * 0.55, H * 0.17);

  /* Glowing mushrooms */
  const mushColors = [0x44ddaa, 0x66eebb, 0x22ccaa, 0x88ffcc];
  const mushPositions = [
    [W * 0.08, H * 0.62], [W * 0.15, H * 0.70], [W * 0.85, H * 0.65],
    [W * 0.92, H * 0.68], [W * 0.45, H * 0.72], [W * 0.6, H * 0.75],
  ];
  for (const [mx, my] of mushPositions) {
    const mg = gfx();
    const mc = rng.pick(mushColors);
    // Glow
    mg.fillStyle(mc, 0.08);
    mg.fillCircle(mx, my - 4, 18);
    // Cap
    mg.fillStyle(mc, 0.6);
    mg.fillEllipse(mx, my - 5, 10, 7);
    // Stem
    mg.fillStyle(0xccddcc, 0.5);
    mg.fillRect(mx - 2, my - 3, 4, 8);
    // Glow pulse
    const t = scene.tweens.add({
      targets: mg,
      alpha: { from: 0.6, to: 1.0 },
      duration: 1500 + rng.between(0, 1500),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: rng.between(0, 1000),
    });
    tweens.push(t);
  }

  /* Fireflies */
  for (let i = 0; i < 18; i++) {
    const fx = rng.between(Math.floor(W * 0.05), Math.floor(W * 0.95));
    const fy = rng.between(Math.floor(H * 0.20), Math.floor(H * 0.70));
    const dot = scene.add.circle(fx, fy, rng.realInRange(1.5, 3), 0x88ffaa, 0.5).setDepth(D);
    objs.push(dot);
    const t = scene.tweens.add({
      targets: dot, alpha: { from: 0.1, to: 0.8 },
      x: fx + rng.between(-40, 40), y: fy + rng.between(-30, 30),
      duration: 2500 + rng.between(0, 3000), yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: rng.between(0, 2000),
    });
    tweens.push(t);
  }

  /* Mist */
  const mist = gfx();
  mist.fillStyle(0x88aa88, 0.06);
  mist.fillEllipse(W * 0.3, H * 0.55, W * 0.4, H * 0.08);
  mist.fillEllipse(W * 0.7, H * 0.52, W * 0.35, H * 0.06);
  const mistDrift = scene.tweens.add({
    targets: mist, x: { from: -10, to: 10 }, duration: 6000,
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
  tweens.push(mistDrift);

  /* Vignette */
  drawVignette(gfx(), W, H);

  cleanup(() => drawEnchantedForest(scene));
}

/* ══════════════════════════════════════════════
 *  Volcanic Crater
 *  Dark sky, jagged volcanic peaks, lava rivers,
 *  floating embers, smoky atmosphere.
 * ══════════════════════════════════════════════ */

function drawVolcanicCrater(scene: Phaser.Scene): void {
  const { objs, tweens, D, W, H, gfx, rng, cleanup } = setupBg(scene, 'volcanic_crater');

  /* Sky — deep red/orange glow */
  const sky = gfx();
  const bands: [number, number, number, number][] = [
    [0x0a0505, 0.00, 0x1a0808, 0.20],
    [0x2a0e0a, 0.20, 0x4a1810, 0.38],
    [0x6a2a14, 0.38, 0x8a3818, 0.48],
    [0xa04820, 0.48, 0xc06030, 0.52],
  ];
  for (const [c1, y1, c2, y2] of bands) {
    sky.fillGradientStyle(c1, c1, c2, c2);
    sky.fillRect(0, H * y1, W, H * (y2 - y1) + 1);
  }

  /* Smoke clouds */
  const smoke = gfx();
  smoke.fillStyle(0x3a2020, 0.3);
  smoke.fillEllipse(W * 0.2, H * 0.12, W * 0.3, H * 0.1);
  smoke.fillEllipse(W * 0.6, H * 0.08, W * 0.35, H * 0.08);
  smoke.fillEllipse(W * 0.85, H * 0.15, W * 0.25, H * 0.09);
  smoke.fillStyle(0x2a1515, 0.2);
  smoke.fillEllipse(W * 0.4, H * 0.18, W * 0.5, H * 0.07);
  const smokeDrift = scene.tweens.add({
    targets: smoke, x: { from: -5, to: 12 }, duration: 7000,
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
  tweens.push(smokeDrift);

  /* Volcanic mountains */
  const mtn = gfx();
  mtn.fillStyle(0x1a0a08, 0.95);
  mtn.beginPath();
  mtn.moveTo(-10, H * 0.52);
  mtn.lineTo(W * 0.05, H * 0.35);
  mtn.lineTo(W * 0.12, H * 0.40);
  mtn.lineTo(W * 0.22, H * 0.24);
  mtn.lineTo(W * 0.30, H * 0.38);
  mtn.lineTo(W * 0.40, H * 0.28);
  mtn.lineTo(W * 0.50, H * 0.18);  // main volcano peak
  mtn.lineTo(W * 0.60, H * 0.30);
  mtn.lineTo(W * 0.70, H * 0.26);
  mtn.lineTo(W * 0.80, H * 0.34);
  mtn.lineTo(W * 0.90, H * 0.22);
  mtn.lineTo(W + 10, H * 0.36);
  mtn.lineTo(W + 10, H * 0.55);
  mtn.lineTo(-10, H * 0.55);
  mtn.closePath();
  mtn.fillPath();

  /* Lava glow on peaks */
  const lavaGlow = gfx();
  lavaGlow.fillStyle(0xff4400, 0.15);
  lavaGlow.fillCircle(W * 0.50, H * 0.18, 20);
  lavaGlow.fillStyle(0xff6600, 0.10);
  lavaGlow.fillCircle(W * 0.50, H * 0.18, 35);
  lavaGlow.fillStyle(0xff4400, 0.08);
  lavaGlow.fillCircle(W * 0.22, H * 0.24, 15);
  lavaGlow.fillCircle(W * 0.90, H * 0.22, 15);

  /* Near rocky ridge */
  const ridge = gfx();
  ridge.fillStyle(0x2a1510, 0.9);
  ridge.beginPath();
  ridge.moveTo(-10, H * 0.55);
  ridge.lineTo(W * 0.10, H * 0.46);
  ridge.lineTo(W * 0.25, H * 0.50);
  ridge.lineTo(W * 0.40, H * 0.44);
  ridge.lineTo(W * 0.55, H * 0.48);
  ridge.lineTo(W * 0.70, H * 0.43);
  ridge.lineTo(W * 0.85, H * 0.47);
  ridge.lineTo(W + 10, H * 0.45);
  ridge.lineTo(W + 10, H * 0.56);
  ridge.lineTo(-10, H * 0.56);
  ridge.closePath();
  ridge.fillPath();

  /* Ground — dark volcanic rock */
  const ground = gfx();
  ground.fillGradientStyle(0x1a1010, 0x1a1010, 0x0e0808, 0x0e0808);
  ground.fillRect(0, H * 0.54, W, H * 0.50);

  /* Lava cracks on ground */
  const cracks = gfx();
  const crackPaths = [
    [[0.25, 0.60], [0.30, 0.65], [0.28, 0.72], [0.32, 0.80]],
    [[0.55, 0.58], [0.58, 0.64], [0.62, 0.70], [0.60, 0.78]],
    [[0.75, 0.62], [0.72, 0.68], [0.76, 0.75], [0.73, 0.82]],
  ];
  for (const path of crackPaths) {
    cracks.lineStyle(3, 0xff4400, 0.4);
    cracks.beginPath();
    cracks.moveTo(W * path[0][0], H * path[0][1]);
    for (let i = 1; i < path.length; i++) {
      cracks.lineTo(W * path[i][0], H * path[i][1]);
    }
    cracks.strokePath();
    // Inner brighter line
    cracks.lineStyle(1.5, 0xff8833, 0.5);
    cracks.beginPath();
    cracks.moveTo(W * path[0][0], H * path[0][1]);
    for (let i = 1; i < path.length; i++) {
      cracks.lineTo(W * path[i][0], H * path[i][1]);
    }
    cracks.strokePath();
  }
  const crackPulse = scene.tweens.add({
    targets: cracks, alpha: { from: 0.7, to: 1 }, duration: 1200,
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
  tweens.push(crackPulse);

  /* Arena — scorched circle */
  const arena = gfx();
  arena.fillStyle(0x000000, 0.15);
  arena.fillEllipse(W / 2, H * 0.63 + 4, W * 0.55, H * 0.17);
  arena.fillStyle(0x3a2018, 0.4);
  arena.fillEllipse(W / 2, H * 0.63, W * 0.55, H * 0.17);
  arena.fillStyle(0x4a2a1a, 0.3);
  arena.fillEllipse(W / 2, H * 0.63, W * 0.46, H * 0.13);
  arena.lineStyle(2, 0x884422, 0.3);
  arena.strokeEllipse(W / 2, H * 0.63, W * 0.55, H * 0.17);

  /* Floating embers */
  for (let i = 0; i < 20; i++) {
    const ex = rng.between(Math.floor(W * 0.05), Math.floor(W * 0.95));
    const ey = rng.between(Math.floor(H * 0.20), Math.floor(H * 0.70));
    const dot = scene.add.circle(ex, ey, rng.realInRange(1, 2.5),
      rng.pick([0xff6600, 0xff4400, 0xffaa00]), 0.6).setDepth(D);
    objs.push(dot);
    const t = scene.tweens.add({
      targets: dot, alpha: { from: 0.2, to: 0.9 },
      y: ey - rng.between(40, 100), x: ex + rng.between(-20, 20),
      duration: 3000 + rng.between(0, 3000), yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: rng.between(0, 2500),
    });
    tweens.push(t);
  }

  /* Vignette */
  drawVignette(gfx(), W, H);

  cleanup(() => drawVolcanicCrater(scene));
}

/* ══════════════════════════════════════════════
 *  Frozen Peaks
 *  Aurora borealis, ice mountains, snow-covered
 *  ground, crystalline trees, falling snow.
 * ══════════════════════════════════════════════ */

function drawFrozenPeaks(scene: Phaser.Scene): void {
  const { objs, tweens, D, W, H, gfx, rng, cleanup } = setupBg(scene, 'frozen_peaks');

  /* Sky — deep dark blue to lighter blue */
  const sky = gfx();
  const bands: [number, number, number, number][] = [
    [0x050818, 0.00, 0x0a1030, 0.25],
    [0x0e1848, 0.25, 0x182860, 0.42],
    [0x203870, 0.42, 0x305090, 0.52],
  ];
  for (const [c1, y1, c2, y2] of bands) {
    sky.fillGradientStyle(c1, c1, c2, c2);
    sky.fillRect(0, H * y1, W, H * (y2 - y1) + 1);
  }

  /* Stars */
  const stars = gfx();
  for (let i = 0; i < 50; i++) {
    const sx = rng.between(0, W);
    const sy = rng.between(0, Math.floor(H * 0.4));
    stars.fillStyle(0xffffff, rng.realInRange(0.3, 0.8));
    stars.fillCircle(sx, sy, rng.realInRange(0.5, 1.5));
  }

  /* Aurora borealis */
  const aurora = gfx();
  const auroraColors = [0x44ff88, 0x22ddaa, 0x44aaff, 0x8866ff, 0x22ff66];
  for (let band = 0; band < 5; band++) {
    aurora.fillStyle(auroraColors[band], 0.06);
    aurora.beginPath();
    const baseY = H * (0.08 + band * 0.04);
    aurora.moveTo(-10, baseY + 20);
    for (let i = 0; i <= 20; i++) {
      const x = (W / 20) * i;
      const y = baseY + Math.sin(i * 0.6 + band * 1.2) * 18 + Math.cos(i * 1.1) * 8;
      aurora.lineTo(x, y);
    }
    aurora.lineTo(W + 10, baseY + 20);
    aurora.closePath();
    aurora.fillPath();
  }
  const auroraPulse = scene.tweens.add({
    targets: aurora, alpha: { from: 0.5, to: 1.0 }, duration: 4000,
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
  tweens.push(auroraPulse);

  /* Ice mountains */
  const mtn = gfx();
  mtn.fillStyle(0x2a3a5a, 0.9);
  mtn.beginPath();
  mtn.moveTo(-10, H * 0.52);
  mtn.lineTo(W * 0.06, H * 0.34);
  mtn.lineTo(W * 0.15, H * 0.40);
  mtn.lineTo(W * 0.28, H * 0.26);
  mtn.lineTo(W * 0.38, H * 0.38);
  mtn.lineTo(W * 0.50, H * 0.22);
  mtn.lineTo(W * 0.62, H * 0.36);
  mtn.lineTo(W * 0.72, H * 0.28);
  mtn.lineTo(W * 0.82, H * 0.35);
  mtn.lineTo(W * 0.92, H * 0.24);
  mtn.lineTo(W + 10, H * 0.38);
  mtn.lineTo(W + 10, H * 0.55);
  mtn.lineTo(-10, H * 0.55);
  mtn.closePath();
  mtn.fillPath();

  /* Snow caps */
  const snow = gfx();
  snow.fillStyle(0xddeeff, 0.7);
  const peaks = [[0.28, 0.26], [0.50, 0.22], [0.72, 0.28], [0.92, 0.24]];
  for (const [px, py] of peaks) {
    drawSnowCap(snow, W * px, H * py, 18);
  }

  /* Near hills — snowy */
  const hills = gfx();
  hills.fillStyle(0x3a4a6a, 0.8);
  hills.beginPath();
  hills.moveTo(-10, H * 0.56);
  for (let i = 0; i <= 20; i++) {
    const hx = (W / 20) * i;
    const hy = H * 0.50 + Math.sin(i * 0.7) * H * 0.02;
    hills.lineTo(hx, hy);
  }
  hills.lineTo(W + 10, H * 0.56);
  hills.closePath();
  hills.fillPath();

  /* Snow-covered ground */
  const ground = gfx();
  ground.fillGradientStyle(0x8899aa, 0x8899aa, 0x667788, 0x667788);
  ground.fillRect(0, H * 0.54, W, H * 0.14);
  ground.fillGradientStyle(0x667788, 0x667788, 0x556678, 0x556678);
  ground.fillRect(0, H * 0.68, W, H * 0.32);

  /* Snow drifts */
  const drifts = gfx();
  drifts.fillStyle(0xc8d8e8, 0.3);
  drifts.fillEllipse(W * 0.15, H * 0.62, 60, 15);
  drifts.fillEllipse(W * 0.55, H * 0.70, 80, 12);
  drifts.fillEllipse(W * 0.80, H * 0.66, 50, 14);

  /* Crystalline trees */
  const treeCols = [0x88aacc, 0x6688aa, 0x99bbdd];
  const treePos = [[0.06, 0.52], [0.14, 0.54], [0.86, 0.51], [0.94, 0.53]];
  const treeGfx = gfx();
  for (const [tx, ty] of treePos) {
    const x = W * tx, y = H * ty, s = 0.7 + rng.realInRange(0, 0.4);
    // Trunk
    treeGfx.fillStyle(0x556688, 0.7);
    treeGfx.fillRect(x - 3 * s, y, 6 * s, 25 * s);
    // Crystal layers
    for (let l = 0; l < 3; l++) {
      treeGfx.fillStyle(treeCols[l], 0.5);
      treeGfx.beginPath();
      const lw = (18 - l * 5) * s, lh = (14 - l * 2) * s, ly = y - l * 12 * s;
      treeGfx.moveTo(x, ly - lh);
      treeGfx.lineTo(x - lw, ly);
      treeGfx.lineTo(x + lw, ly);
      treeGfx.closePath();
      treeGfx.fillPath();
    }
  }

  /* Arena — icy circle */
  const arena = gfx();
  arena.fillStyle(0x000000, 0.1);
  arena.fillEllipse(W / 2, H * 0.63 + 4, W * 0.55, H * 0.17);
  arena.fillStyle(0x6688aa, 0.3);
  arena.fillEllipse(W / 2, H * 0.63, W * 0.55, H * 0.17);
  arena.fillStyle(0x88aacc, 0.2);
  arena.fillEllipse(W / 2, H * 0.63, W * 0.46, H * 0.13);
  arena.lineStyle(2, 0xaaccee, 0.3);
  arena.strokeEllipse(W / 2, H * 0.63, W * 0.55, H * 0.17);

  /* Falling snow particles */
  for (let i = 0; i < 25; i++) {
    const sx = rng.between(0, W);
    const sy = rng.between(0, Math.floor(H * 0.5));
    const dot = scene.add.circle(sx, sy, rng.realInRange(1, 3), 0xffffff, 0.5).setDepth(D);
    objs.push(dot);
    const t = scene.tweens.add({
      targets: dot, y: H + 10,
      x: sx + rng.between(-60, 60),
      alpha: { from: 0.5, to: 0.15 },
      duration: 5000 + rng.between(0, 5000),
      repeat: -1, ease: 'Linear',
      delay: rng.between(0, 4000),
      onRepeat: () => { dot.y = rng.between(-20, 0); dot.x = rng.between(0, W); dot.alpha = 0.5; },
    });
    tweens.push(t);
  }

  /* Vignette */
  drawVignette(gfx(), W, H);

  cleanup(() => drawFrozenPeaks(scene));
}

/* ══════════════════════════════════════════════
 *  Ocean Cliffs
 *  Warm sunset over the ocean, dramatic cliff edges,
 *  rolling waves, birds silhouettes.
 * ══════════════════════════════════════════════ */

function drawOceanCliffs(scene: Phaser.Scene): void {
  const { tweens, W, H, gfx, rng, cleanup } = setupBg(scene, 'ocean_cliffs');

  /* Sky — warm sunset gradient */
  const sky = gfx();
  const bands: [number, number, number, number][] = [
    [0x1a1040, 0.00, 0x2a1860, 0.15],
    [0x4a2070, 0.15, 0x8a3060, 0.30],
    [0xc04840, 0.30, 0xe07030, 0.42],
    [0xf0a040, 0.42, 0xf8c868, 0.50],
  ];
  for (const [c1, y1, c2, y2] of bands) {
    sky.fillGradientStyle(c1, c1, c2, c2);
    sky.fillRect(0, H * y1, W, H * (y2 - y1) + 1);
  }

  /* Sun (half-set) */
  const sun = gfx();
  sun.fillStyle(0xf8d868, 0.3);
  sun.fillCircle(W * 0.65, H * 0.44, 45);
  sun.fillStyle(0xf8c040, 0.5);
  sun.fillCircle(W * 0.65, H * 0.44, 28);
  sun.fillStyle(0xffe880, 0.6);
  sun.fillCircle(W * 0.65, H * 0.44, 16);

  /* Horizon reflection line */
  const hLine = gfx();
  hLine.fillGradientStyle(0xf8c868, 0xf0a040, 0xe07030, 0xc04840);
  hLine.fillRect(0, H * 0.49, W, H * 0.02);

  /* Ocean */
  const ocean = gfx();
  ocean.fillGradientStyle(0x1a3060, 0x1a3060, 0x0e1830, 0x0e1830);
  ocean.fillRect(0, H * 0.50, W, H * 0.20);

  /* Water reflections / sun path */
  const refl = gfx();
  for (let i = 0; i < 12; i++) {
    const ry = H * (0.50 + i * 0.015);
    const rw = 60 - i * 3;
    refl.fillStyle(0xf8c868, 0.08 - i * 0.005);
    refl.fillRect(W * 0.65 - rw / 2 + rng.between(-10, 10), ry, rw, 3);
  }

  /* Waves */
  const waves = gfx();
  for (let row = 0; row < 6; row++) {
    const wy = H * (0.51 + row * 0.025);
    waves.lineStyle(1.5, 0x4488aa, 0.15);
    waves.beginPath();
    waves.moveTo(-10, wy);
    for (let i = 0; i <= 30; i++) {
      const wx = (W / 30) * i;
      const wvy = wy + Math.sin(i * 1.2 + row * 2) * 3;
      waves.lineTo(wx, wvy);
    }
    waves.strokePath();
  }
  const waveDrift = scene.tweens.add({
    targets: waves, x: { from: -8, to: 8 }, duration: 3000,
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
  tweens.push(waveDrift);

  /* Cliff (left) */
  const cliffL = gfx();
  cliffL.fillStyle(0x4a3a28, 0.95);
  cliffL.beginPath();
  cliffL.moveTo(-10, H * 0.38);
  cliffL.lineTo(W * 0.02, H * 0.36);
  cliffL.lineTo(W * 0.08, H * 0.42);
  cliffL.lineTo(W * 0.12, H * 0.40);
  cliffL.lineTo(W * 0.18, H * 0.48);
  cliffL.lineTo(W * 0.22, H * 0.50);
  cliffL.lineTo(W * 0.22, H); // straight down
  cliffL.lineTo(-10, H);
  cliffL.closePath();
  cliffL.fillPath();
  // Cliff face detail
  cliffL.fillStyle(0x5a4a38, 0.3);
  cliffL.fillRect(W * 0.02, H * 0.42, 8, H * 0.3);
  cliffL.fillRect(W * 0.10, H * 0.45, 6, H * 0.25);

  /* Cliff (right) */
  const cliffR = gfx();
  cliffR.fillStyle(0x4a3a28, 0.95);
  cliffR.beginPath();
  cliffR.moveTo(W + 10, H * 0.36);
  cliffR.lineTo(W * 0.96, H * 0.38);
  cliffR.lineTo(W * 0.92, H * 0.44);
  cliffR.lineTo(W * 0.86, H * 0.42);
  cliffR.lineTo(W * 0.80, H * 0.50);
  cliffR.lineTo(W * 0.78, H * 0.52);
  cliffR.lineTo(W * 0.78, H);
  cliffR.lineTo(W + 10, H);
  cliffR.closePath();
  cliffR.fillPath();
  cliffR.fillStyle(0x5a4a38, 0.3);
  cliffR.fillRect(W * 0.90, H * 0.44, 8, H * 0.3);

  /* Grass on cliff tops */
  const grass = gfx();
  for (let i = 0; i < 20; i++) {
    const gx = rng.between(0, Math.floor(W * 0.20));
    const gy = H * (0.36 + (gx / (W * 0.22)) * 0.14) - 4;
    grass.lineStyle(1.5, rng.pick([0x4a8a3a, 0x5a9a4a]), 0.5);
    grass.beginPath(); grass.moveTo(gx, gy); grass.lineTo(gx - 2, gy - 10); grass.strokePath();
  }
  for (let i = 0; i < 20; i++) {
    const gx = rng.between(Math.floor(W * 0.80), W);
    const gy = H * (0.52 - ((W - gx) / (W * 0.22)) * 0.16) - 4;
    grass.lineStyle(1.5, rng.pick([0x4a8a3a, 0x5a9a4a]), 0.5);
    grass.beginPath(); grass.moveTo(gx, gy); grass.lineTo(gx + 2, gy - 10); grass.strokePath();
  }

  /* Ground below cliffs */
  const ground = gfx();
  ground.fillGradientStyle(0x3a5a30, 0x3a5a30, 0x2a4020, 0x2a4020);
  ground.fillRect(0, H * 0.54, W * 0.22, H * 0.50);
  ground.fillRect(W * 0.78, H * 0.54, W * 0.22, H * 0.50);
  // Center arena area — sandy beach
  ground.fillGradientStyle(0xc8b888, 0xc8b888, 0xa89868, 0xa89868);
  ground.fillRect(W * 0.22, H * 0.60, W * 0.56, H * 0.40);

  /* Arena circle */
  const arena = gfx();
  arena.fillStyle(0x000000, 0.1);
  arena.fillEllipse(W / 2, H * 0.67 + 4, W * 0.45, H * 0.17);
  arena.fillStyle(0xb8a878, 0.3);
  arena.fillEllipse(W / 2, H * 0.67, W * 0.45, H * 0.17);
  arena.fillStyle(0xc8b888, 0.2);
  arena.fillEllipse(W / 2, H * 0.67, W * 0.38, H * 0.13);
  arena.lineStyle(2, 0xd8c898, 0.3);
  arena.strokeEllipse(W / 2, H * 0.67, W * 0.45, H * 0.17);

  /* Birds */
  const birds = gfx();
  const birdY = H * 0.18;
  for (let i = 0; i < 5; i++) {
    const bx = W * (0.35 + i * 0.06) + rng.between(-10, 10);
    const by = birdY + rng.between(-15, 15);
    birds.lineStyle(1.5, 0x1a1020, 0.6);
    birds.beginPath();
    birds.moveTo(bx - 6, by + 3);
    birds.lineTo(bx, by);
    birds.lineTo(bx + 6, by + 3);
    birds.strokePath();
  }

  /* Clouds */
  const clouds = gfx();
  clouds.fillStyle(0xe8a060, 0.15);
  clouds.fillEllipse(W * 0.20, H * 0.10, 90, 20);
  clouds.fillEllipse(W * 0.80, H * 0.14, 70, 16);
  clouds.fillStyle(0xd08050, 0.10);
  clouds.fillEllipse(W * 0.50, H * 0.08, 110, 22);
  const cloudDrift = scene.tweens.add({
    targets: clouds, x: { from: -6, to: 6 }, duration: 8000,
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
  tweens.push(cloudDrift);

  /* Vignette */
  drawVignette(gfx(), W, H);

  cleanup(() => drawOceanCliffs(scene));
}
