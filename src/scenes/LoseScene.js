// src/scenes/LoseScene.js — Game Over screen

class LoseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoseScene' });
  }

  init(data) {
    this.levelFailed = data.level || 1;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Dark background
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d1a);
    this.add.rectangle(W / 2, H / 2, 260, H, 0x1a1a2e).setAlpha(0.5);

    // Skull emoji
    this.add.text(W / 2, H * 0.28, '💀', { fontSize: '72px' }).setOrigin(0.5);

    // Heading
    this.add.text(W / 2, H * 0.42, 'GAME OVER', {
      fontSize: '36px',
      fontStyle: 'bold',
      fill: '#e74c3c',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.52, `Your army was defeated\non Level ${this.levelFailed}.\nTry again!`, {
      fontSize: '16px',
      fill: '#aaaacc',
      align: 'center',
    }).setOrigin(0.5);

    // Retry button
    const retryBg = this.add.rectangle(W / 2, H * 0.65, 230, 68, 0xe74c3c)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0xff6b6b);

    this.add.text(W / 2, H * 0.65, '🔄  RETRY LEVEL', {
      fontSize: '22px',
      fontStyle: 'bold',
      fill: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: retryBg,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    retryBg.on('pointerdown', () => {
      this.scene.launch('UIScene');
      this.scene.start('GameScene', { level: this.levelFailed });
    });

    // Main menu button
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

    // Floating skulls effect
    for (let i = 0; i < 6; i++) {
      const x = Phaser.Math.Between(40, W - 40);
      const startY = H + 20;
      const skull = this.add.text(x, startY, '💀', {
        fontSize: `${Phaser.Math.Between(14, 22)}px`,
      }).setOrigin(0.5).setAlpha(0.3);

      this.tweens.add({
        targets: skull,
        y: -30,
        alpha: 0,
        duration: Phaser.Math.Between(2500, 5000),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
        ease: 'Linear',
      });
    }
  }
}
