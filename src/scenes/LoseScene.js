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
    this.add.rectangle(W / 2, H / 2, 260, H, 0x1a0a0a).setAlpha(0.5);

    // Skull
    const skull = this.add.text(W / 2, H * 0.27, '💀', { fontSize: '72px' }).setOrigin(0.5).setScale(0);
    this.tweens.add({
      targets: skull, scaleX: 1, scaleY: 1, duration: 500, ease: 'Back.easeOut', delay: 150,
    });

    // Heading
    this.add.text(W / 2, H * 0.42, 'GAME OVER', {
      fontSize: '36px', fontStyle: 'bold',
      fill: '#e74c3c', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.52, `Your army fell on Level ${this.levelFailed}.\nReinforce and try again!`, {
      fontSize: '15px', fill: '#aaaacc', align: 'center',
    }).setOrigin(0.5);

    // Retry button
    const retryGfx = this.add.graphics();
    retryGfx.fillStyle(0xe74c3c, 1);
    retryGfx.fillRoundedRect(W / 2 - 115, H * 0.63 - 33, 230, 66, 14);
    retryGfx.lineStyle(3, 0xff6b6b, 1);
    retryGfx.strokeRoundedRect(W / 2 - 115, H * 0.63 - 33, 230, 66, 14);

    const retryText = this.add.text(W / 2, H * 0.63, '🔄  RETRY LEVEL', {
      fontSize: '21px', fontStyle: 'bold', fill: '#ffffff',
    }).setOrigin(0.5);

    const retryHit = this.add.rectangle(W / 2, H * 0.63, 230, 66, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: [retryGfx, retryText], scaleX: 1.04, scaleY: 1.04,
      duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    retryHit.on('pointerdown', () => {
      this.scene.launch('UIScene');
      this.scene.start('GameScene', { level: this.levelFailed });
    });

    // Main menu button
    const menuBg = this.add.rectangle(W / 2, H * 0.76, 180, 50, 0x1a1a2a, 1)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x555577);
    this.add.text(W / 2, H * 0.76, '🏠  MAIN MENU', {
      fontSize: '16px', fill: '#ccccdd',
    }).setOrigin(0.5);
    menuBg.on('pointerdown', () => this.scene.start('BootScene'));

    // Floating skull particles
    for (let i = 0; i < 7; i++) {
      const sx = Phaser.Math.Between(40, W - 40);
      const skull2 = this.add.text(sx, H + 20, '💀', {
        fontSize: `${Phaser.Math.Between(12, 20)}px`,
      }).setOrigin(0.5).setAlpha(0.25).setDepth(2);
      this.tweens.add({
        targets: skull2, y: -30, alpha: 0,
        duration: Phaser.Math.Between(2500, 5000),
        delay: Phaser.Math.Between(0, 2500),
        repeat: -1, ease: 'Linear',
        onRepeat: () => { skull2.x = Phaser.Math.Between(40, W - 40); skull2.y = H + 20; skull2.alpha = 0.25; },
      });
    }
  }
}
