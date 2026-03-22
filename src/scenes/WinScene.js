// src/scenes/WinScene.js — Level complete screen

class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WinScene' });
  }

  init(data) {
    this.levelCompleted = data.level || 1;
    this.nextLevel      = data.nextLevel || null;
    this.allDone        = data.allDone || false;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d1a2e);
    this.add.rectangle(W / 2, H / 2, 280, H, 0x1a2a44).setAlpha(0.4);

    // Confetti
    this.createConfetti(W, H);

    // Explosion particles on win
    this.time.delayedCall(300, () => this.spawnWinExplosions(W, H));

    // Trophy / emoji
    const trophy = this.add.text(W / 2, H * 0.28, this.allDone ? '🏆' : '🎉', {
      fontSize: '72px',
    }).setOrigin(0.5).setScale(0);
    this.tweens.add({
      targets: trophy, scaleX: 1, scaleY: 1, duration: 500,
      ease: 'Back.easeOut', delay: 200,
    });

    // Win heading
    const heading = this.allDone ? 'YOU WON!' : `LEVEL ${this.levelCompleted}\nCOMPLETE!`;
    this.add.text(W / 2, H * 0.44, heading, {
      fontSize: '34px', fontStyle: 'bold',
      fill: '#ffd700', stroke: '#000', strokeThickness: 5, align: 'center',
    }).setOrigin(0.5);

    if (this.allDone) {
      this.add.text(W / 2, H * 0.57, 'You conquered all 5 levels!\nYou are a true General! 🫡', {
        fontSize: '16px', fill: '#aaaacc', align: 'center',
      }).setOrigin(0.5);
    }

    // Next / play-again button
    const btnLabel = this.allDone ? '🔄  PLAY AGAIN' : '▶  NEXT LEVEL';
    const btnY     = this.allDone ? H * 0.7 : H * 0.66;
    const btnGfx   = this.add.graphics();
    btnGfx.fillStyle(0x27ae60, 1);
    btnGfx.fillRoundedRect(W / 2 - 120, btnY - 33, 240, 66, 14);
    btnGfx.lineStyle(3, 0x2ecc71, 1);
    btnGfx.strokeRoundedRect(W / 2 - 120, btnY - 33, 240, 66, 14);

    const btnText = this.add.text(W / 2, btnY, btnLabel, {
      fontSize: '22px', fontStyle: 'bold', fill: '#ffffff',
    }).setOrigin(0.5);

    const btnHit = this.add.rectangle(W / 2, btnY, 240, 66, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: [btnGfx, btnText], scaleX: 1.05, scaleY: 1.05,
      duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    btnHit.on('pointerdown', () => {
      const target = this.allDone ? 1 : this.nextLevel;
      this.scene.launch('UIScene');
      this.scene.start('GameScene', { level: target });
    });

    if (!this.allDone) {
      const menuBg = this.add.rectangle(W / 2, H * 0.77, 180, 50, 0x1a2a44, 1)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0x4444aa);
      this.add.text(W / 2, H * 0.77, '🏠  MAIN MENU', {
        fontSize: '16px', fill: '#ccccdd',
      }).setOrigin(0.5);
      menuBg.on('pointerdown', () => this.scene.start('BootScene'));
    }
  }

  spawnWinExplosions(W, H) {
    const gfx = this.add.graphics().setDepth(5);
    let frame = 0;
    const positions = [
      { x: W * 0.3, y: H * 0.35 },
      { x: W * 0.7, y: H * 0.28 },
      { x: W * 0.5, y: H * 0.4 },
      { x: W * 0.2, y: H * 0.5 },
      { x: W * 0.8, y: H * 0.45 },
    ];
    const rings = [];
    for (const pos of positions) {
      this.time.delayedCall(Math.random() * 800, () => {
        rings.push({ x: pos.x, y: pos.y, r: 0, alpha: 1, color: [0xffd700, 0xff6600, 0x2ecc71][Math.floor(Math.random() * 3)] });
      });
    }

    this.time.addEvent({
      delay: 16, repeat: 80,
      callback: () => {
        gfx.clear();
        for (const ring of rings) {
          ring.r += 4;
          ring.alpha = Math.max(0, ring.alpha - 0.03);
          gfx.lineStyle(3, ring.color, ring.alpha);
          gfx.strokeCircle(ring.x, ring.y, ring.r);
        }
      },
    });
  }

  createConfetti(W, H) {
    const colors = [0xffd700, 0x2ecc71, 0x3498db, 0xe74c3c, 0x9b59b6, 0xf39c12];
    for (let i = 0; i < 35; i++) {
      const x = Phaser.Math.Between(10, W - 10);
      const y = Phaser.Math.Between(-30, H * 0.1);
      const c = this.add.rectangle(
        x, y,
        Phaser.Math.Between(5, 12), Phaser.Math.Between(5, 12),
        colors[i % colors.length]
      ).setRotation(Math.random() * Math.PI).setDepth(2);

      this.tweens.add({
        targets: c,
        y: y + H + 60,
        rotation: c.rotation + Phaser.Math.Between(4, 12),
        duration: Phaser.Math.Between(2000, 4500),
        delay: Phaser.Math.Between(0, 1200),
        repeat: -1, ease: 'Linear',
      });
    }
  }
}
