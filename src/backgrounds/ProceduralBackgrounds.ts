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

  const gfx = (): Phaser.GameObjects.Graphics => {
    const g = scene.add.graphics();
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
    const dot = scene.add.circle(fx, fy, rng.realInRange(1.5, 3), 0xffe566, 0.6);
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
  const g = scene.add.graphics();
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
