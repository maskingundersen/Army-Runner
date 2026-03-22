// src/scenes/WinScene.js — Level complete screen

class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WinScene' });
  }

  init(data) {
    this.levelCompleted = data.level || 1;
    this.nextLevel = data.nextLevel || null;
    this.allDone = data.allDone || false;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e);
    // Road hint
    this.add.rectangle(W / 2, H / 2, 260, H, 0x2d2d44).setAlpha(0.4);

    // Confetti particles (simple colored rectangles)
    this.createConfetti(W, H);

    // Trophy / emoji
    this.add.text(W / 2, H * 0.3, this.allDone ? '🏆' : '🎉', {
      fontSize: '72px',
    }).setOrigin(0.5);

    // Win heading
    const heading = this.allDone ? 'YOU WON!' : `LEVEL ${this.levelCompleted}\nCOMPLETE!`;
    this.add.text(W / 2, H * 0.44, heading, {
      fontSize: '34px',
      fontStyle: 'bold',
      fill: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5);

    if (this.allDone) {
      this.add.text(W / 2, H * 0.57, 'You conquered all 5 levels!\nYou are a true General! 🫡', {
        fontSize: '16px',
        fill: '#aaaacc',
        align: 'center',
      }).setOrigin(0.5);
    }

    // Next level / play again button
    const btnLabel = this.allDone ? '🔄  PLAY AGAIN' : '▶  NEXT LEVEL';
    const btnY = this.allDone ? H * 0.7 : H * 0.65;
    const btnBg = this.add.rectangle(W / 2, btnY, 240, 68, 0x27ae60)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0x2ecc71);

    this.add.text(W / 2, btnY, btnLabel, {
      fontSize: '22px',
      fontStyle: 'bold',
      fill: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: btnBg,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    btnBg.on('pointerdown', () => {
      const target = this.allDone ? 1 : this.nextLevel;
      this.scene.launch('UIScene');
      this.scene.start('GameScene', { level: target });
    });

    // Retry from start button (if not all done, show a main menu button too)
    if (!this.allDone) {
      const menuBg = this.add.rectangle(W / 2, H * 0.76, 180, 52, 0x2c3e50)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0x7f8c8d);

      this.add.text(W / 2, H * 0.76, '🏠  MAIN MENU', {
        fontSize: '16px',
        fill: '#cccccc',
      }).setOrigin(0.5);

      menuBg.on('pointerdown', () => {
        this.scene.start('BootScene');
      });
    }
  }

  createConfetti(W, H) {
    const colors = [0xffd700, 0x2ecc71, 0x3498db, 0xe74c3c, 0x9b59b6, 0xf39c12];
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(20, W - 20);
      const y = Phaser.Math.Between(-20, H * 0.15);
      const c = this.add.rectangle(x, y, Phaser.Math.Between(6, 12), Phaser.Math.Between(6, 12),
        colors[i % colors.length]).setRotation(Math.random() * Math.PI);

      this.tweens.add({
        targets: c,
        y: y + H + 50,
        rotation: c.rotation + Phaser.Math.Between(3, 10),
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 1500),
        repeat: -1,
        ease: 'Linear',
      });
    }
  }
}
