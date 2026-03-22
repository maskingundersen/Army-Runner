// src/scenes/BootScene.js — Title / Start screen with pseudo-3D road

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W;
    this.H = H;

    // Sky gradient feel
    this.add.rectangle(W / 2, H * 0.15, W, H * 0.3, 0x3a7bd5);
    this.add.rectangle(W / 2, H * 0.55, W, H * 0.7, 0x1a1a2e);

    // Horizon glow
    this.add.rectangle(W / 2, H * 0.3, W, 4, 0xff8c4a).setAlpha(0.4);

    // ---- Pseudo-3D Road ----
    const roadGfx = this.add.graphics();
    this.drawBootRoad(roadGfx, W, H);

    // ---- Soldier silhouettes using DrawHelpers ----
    const silhouetteGfx = this.add.graphics();
    this.drawBootSoldiers(silhouetteGfx, W, H);

    // ---- Scrolling road dashes (animated) ----
    this.dashGfx = this.add.graphics();
    this.dashOffset = 0;

    // ---- Title ----
    this.add.text(W / 2, H * 0.12, '🪖', { fontSize: '58px' }).setOrigin(0.5).setDepth(10);

    this.add.text(W / 2, H * 0.21, 'ARMY RUNNER', {
      fontSize: '38px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(W / 2, H * 0.3, 'Guide your squad through\ngates & defeat the enemy!', {
      fontSize: '15px',
      fill: '#ccddff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    // ---- Start button ----
    const btnBg = this.add.graphics();
    btnBg.setDepth(10);
    this.drawButton(btnBg, W / 2, H * 0.6, 230, 66, 0x27ae60, 0x2ecc71);

    const btnText = this.add.text(W / 2, H * 0.6, '▶  TAP TO PLAY', {
      fontSize: '23px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);

    // Hit area
    const btnHit = this.add.rectangle(W / 2, H * 0.6, 230, 66, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(12);
    btnHit.on('pointerdown', () => this.startGame());

    // Pulsing animation on button
    this.tweens.add({
      targets: [btnBg, btnText],
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ---- Hint text ----
    this.add.text(W / 2, H * 0.73, 'Swipe LEFT / RIGHT to steer', {
      fontSize: '14px',
      fill: '#8899bb',
      align: 'center',
    }).setOrigin(0.5).setDepth(10);

    // Best of 5 levels badge
    this.add.text(W / 2, H * 0.79, '5 LEVELS · BOSS FIGHTS · UPGRADES', {
      fontSize: '11px',
      fill: '#aaaacc',
      letterSpacing: 1,
    }).setOrigin(0.5).setDepth(10);

    // ---- Floating particles ----
    this.createFloatingParticles(W, H);

    // Init audio on first touch (browser autoplay policy)
    this.input.once('pointerdown', () => {
      if (window.audioManager) window.audioManager._init();
    });
  }

  drawBootRoad(gfx, W, H) {
    const VP_Y = H * 0.3;
    const VP_X = W / 2;
    const TOP_W = 110;
    const BOT_W = 380;

    // Grass / shoulders
    gfx.fillStyle(0x2d6a2d, 1);
    gfx.fillRect(0, VP_Y, W, H - VP_Y);

    // Road trapezoid
    gfx.fillStyle(0x282836, 1);
    gfx.fillPoints([
      { x: VP_X - TOP_W / 2, y: VP_Y },
      { x: VP_X + TOP_W / 2, y: VP_Y },
      { x: VP_X + BOT_W / 2, y: H },
      { x: VP_X - BOT_W / 2, y: H },
    ], true);

    // Road shoulders (lighter edge)
    gfx.fillStyle(0x887766, 1);
    gfx.fillPoints([
      { x: VP_X - TOP_W / 2 - 8, y: VP_Y },
      { x: VP_X - TOP_W / 2, y: VP_Y },
      { x: VP_X - BOT_W / 2, y: H },
      { x: VP_X - BOT_W / 2 - 12, y: H },
    ], true);
    gfx.fillPoints([
      { x: VP_X + TOP_W / 2, y: VP_Y },
      { x: VP_X + TOP_W / 2 + 8, y: VP_Y },
      { x: VP_X + BOT_W / 2 + 12, y: H },
      { x: VP_X + BOT_W / 2, y: H },
    ], true);

    // Some static trees on sides
    const treeGfx = this.add.graphics();
    drawTree(treeGfx, 30, H * 0.72, 0.7, 'pine');
    drawTree(treeGfx, 360, H * 0.68, 0.65, 'pine');
    drawTree(treeGfx, 20, H * 0.55, 0.5, 'pine');
    drawTree(treeGfx, 375, H * 0.6, 0.55, 'pine');
  }

  drawBootSoldiers(gfx, W, H) {
    // A row of soldier silhouettes walking on the road
    gfx.fillStyle(0x000000, 0.5);

    const soldierY = H * 0.87;
    const positions = [W / 2 - 50, W / 2 - 20, W / 2 + 10, W / 2 + 40, W / 2 - 80];
    positions.forEach((sx, i) => {
      const sc = 0.6 + i * 0.04;
      drawSoldier(gfx, sx, soldierY, sc, i % 2, {});
    });
  }

  drawButton(gfx, cx, cy, w, h, fillColor, strokeColor) {
    gfx.clear();
    const r = 14;
    gfx.fillStyle(fillColor, 1);
    gfx.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
    gfx.lineStyle(3, strokeColor, 1);
    gfx.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
  }

  createFloatingParticles(W, H) {
    const colors = [0x3498db, 0x2ecc71, 0xf39c12, 0xe74c3c, 0x9b59b6];
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(20, W - 20);
      const y = Phaser.Math.Between(H * 0.35, H);
      const color = colors[i % colors.length];
      const size = Phaser.Math.Between(3, 7);
      const c = this.add.circle(x, y, size, color).setAlpha(0.45).setDepth(5);
      this.tweens.add({
        targets: c,
        y: y - Phaser.Math.Between(60, 140),
        alpha: 0,
        duration: Phaser.Math.Between(1800, 3500),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
        ease: 'Power1',
        onRepeat: () => {
          c.x = Phaser.Math.Between(20, W - 20);
          c.y = y;
          c.alpha = 0.45;
        },
      });
    }
  }

  update(time, delta) {
    // Animate scrolling road dashes
    this.dashOffset = (this.dashOffset + (delta / 1000) * 160) % 60;
    this.drawDashes();
  }

  drawDashes() {
    const W = this.W;
    const H = this.H;
    const gfx = this.dashGfx;
    gfx.clear();

    const VP_Y = H * 0.3;
    const VP_X = W / 2;
    const TOP_W = 110;
    const BOT_W = 380;

    gfx.fillStyle(0xffffff, 0.35);
    const dashSpacing = 60;
    for (let y = VP_Y + (this.dashOffset % dashSpacing); y < H; y += dashSpacing) {
      const t = (y - VP_Y) / (H - VP_Y);
      const roadW = TOP_W + (BOT_W - TOP_W) * t;
      const dashW = 3 + t * 5;
      const dashH = 8 + t * 16;
      gfx.fillRect(VP_X - dashW / 2, y, dashW, dashH);
    }
  }

  startGame() {
    if (window.audioManager) window.audioManager._init();
    this.scene.launch('UIScene');
    this.scene.start('GameScene', { level: 1 });
  }
}
