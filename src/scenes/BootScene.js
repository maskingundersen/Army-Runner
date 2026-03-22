// src/scenes/BootScene.js — Title / Start screen

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background gradient feel — dark road
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e);

    // Road
    this.add.rectangle(W / 2, H / 2, 260, H, 0x2d2d44);
    // Lane markings
    for (let y = 0; y < H; y += 60) {
      this.add.rectangle(W / 2, y, 6, 30, 0xffffff).setAlpha(0.3);
    }

    // Title
    this.add.text(W / 2, H * 0.28, '🪖', { fontSize: '64px' }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.38, 'ARMY RUNNER', {
      fontSize: '36px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.47, 'Guide your army through gates\nand defeat the enemy!', {
      fontSize: '16px',
      fill: '#aaaacc',
      align: 'center',
    }).setOrigin(0.5);

    // Start button
    const btnBg = this.add.rectangle(W / 2, H * 0.62, 220, 70, 0x27ae60, 1)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0x2ecc71);

    const btnText = this.add.text(W / 2, H * 0.62, '▶  TAP TO PLAY', {
      fontSize: '22px',
      fontStyle: 'bold',
      fill: '#ffffff',
    }).setOrigin(0.5);

    // Pulsing animation on button
    this.tweens.add({
      targets: [btnBg, btnText],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    btnBg.on('pointerdown', () => this.startGame());

    // How to play hint
    this.add.text(W / 2, H * 0.78, 'Swipe LEFT / RIGHT to steer', {
      fontSize: '14px',
      fill: '#888899',
      align: 'center',
    }).setOrigin(0.5);

    // Floating soldiers preview
    this.createFloatingSoldiers(W, H);
  }

  createFloatingSoldiers(W, H) {
    const colors = [0x3498db, 0x2980b9, 0x5dade2];
    for (let i = 0; i < 6; i++) {
      const x = Phaser.Math.Between(W * 0.25, W * 0.75);
      const y = Phaser.Math.Between(H * 0.55, H * 0.95);
      const c = this.add.circle(x, y, 8, colors[i % colors.length]).setAlpha(0.5);
      this.tweens.add({
        targets: c,
        y: y - Phaser.Math.Between(20, 50),
        alpha: 0,
        duration: Phaser.Math.Between(1500, 3000),
        repeat: -1,
        yoyo: false,
        delay: Phaser.Math.Between(0, 1500),
      });
    }
  }

  startGame() {
    this.scene.launch('UIScene');
    this.scene.start('GameScene', { level: 1 });
  }
}
