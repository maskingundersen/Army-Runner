// src/scenes/UIScene.js — HUD overlay (runs on top of GameScene)

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Top bar background
    this.barGfx = this.add.graphics();
    this.barGfx.fillStyle(0x000000, 0.55);
    this.barGfx.fillRect(0, 0, W, 70);
    this.barGfx.lineStyle(1, 0x333366, 1);
    this.barGfx.strokeRect(0, 0, W, 70);

    // Helmet icon
    this.add.text(34, 35, '🪖', { fontSize: '26px' }).setOrigin(0.5);

    // Soldier count — main large number
    this.countText = this.add.text(W / 2, 30, '20', {
      fontSize: '34px', fontStyle: 'bold',
      fill: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, 56, 'SOLDIERS', {
      fontSize: '10px', fill: '#8899cc', letterSpacing: 2,
    }).setOrigin(0.5);

    // Level indicator (left side)
    this.levelText = this.add.text(34, 56, 'LVL 1', {
      fontSize: '11px', fill: '#aaaacc',
    }).setOrigin(0.5);

    // Score (right side)
    this.scoreText = this.add.text(W - 60, 35, '0', {
      fontSize: '14px', fontStyle: 'bold', fill: '#ffd700', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.add.text(W - 60, 55, 'SCORE', {
      fontSize: '9px', fill: '#aaaacc',
    }).setOrigin(0.5);

    // Pause button
    const pauseHit = this.add.rectangle(W - 16, 16, 28, 28, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.pauseIcon = this.add.text(W - 16, 16, '⏸', { fontSize: '20px' }).setOrigin(0.5);

    pauseHit.on('pointerdown', () => this.togglePause());

    this.isPaused = false;
    this.pauseOverlay = null;
  }

  updateHUD(count, level, flashType, score) {
    if (!this.countText) return;

    this.countText.setText(count.toString());
    if (this.levelText) this.levelText.setText(`LVL ${level}`);
    if (this.scoreText && score !== undefined) this.scoreText.setText(score.toString());

    // Pop animation
    this.tweens.killTweensOf(this.countText);
    const color = flashType === 'good' ? '#2ecc71' : flashType === 'bad' ? '#e74c3c' : '#ffffff';
    this.countText.setStyle({ fill: color });
    this.tweens.add({
      targets: this.countText,
      scaleX: 1.4, scaleY: 1.4,
      duration: 130, yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (this.countText) {
          this.countText.setStyle({ fill: '#ffffff' });
          this.countText.setScale(1);
        }
      },
    });
  }

  // Backwards compatibility — old scenes call updateCount
  updateCount(count, level, flashType) {
    this.updateHUD(count, level, flashType, undefined);
  }

  togglePause() {
    const gameScene = this.scene.get('GameScene');
    if (!gameScene) return;

    if (this.isPaused) {
      this.isPaused = false;
      gameScene.scene.resume();
      if (this.pauseOverlay) { this.pauseOverlay.destroy(); this.pauseOverlay = null; }
      this.pauseIcon.setText('⏸');
    } else {
      this.isPaused = true;
      gameScene.scene.pause();
      this.pauseIcon.setText('▶');
      this.showPauseMenu();
    }
  }

  showPauseMenu() {
    const W = this.scale.width;
    const H = this.scale.height;
    const container = this.add.container(0, 0).setDepth(100);

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72);
    container.add(overlay);

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a3a, 1);
    panel.fillRoundedRect(W * 0.15, H * 0.32, W * 0.7, H * 0.34, 18);
    panel.lineStyle(2, 0x4444aa, 1);
    panel.strokeRoundedRect(W * 0.15, H * 0.32, W * 0.7, H * 0.34, 18);
    container.add(panel);

    const titleTxt = this.add.text(W / 2, H * 0.38, '⏸ PAUSED', {
      fontSize: '24px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    container.add(titleTxt);

    // Resume button
    const resumeBg = this.add.rectangle(W / 2, H * 0.48, 180, 48, 0x27ae60, 1)
      .setInteractive({ useHandCursor: true });
    const resumeTxt = this.add.text(W / 2, H * 0.48, '▶  RESUME', {
      fontSize: '18px', fontStyle: 'bold', fill: '#fff',
    }).setOrigin(0.5);
    container.add([resumeBg, resumeTxt]);
    resumeBg.on('pointerdown', () => this.togglePause());

    // Main menu button
    const menuBg = this.add.rectangle(W / 2, H * 0.57, 160, 40, 0x333355, 1)
      .setInteractive({ useHandCursor: true });
    const menuTxt = this.add.text(W / 2, H * 0.57, '🏠  MAIN MENU', {
      fontSize: '14px', fill: '#ccccdd',
    }).setOrigin(0.5);
    container.add([menuBg, menuTxt]);
    menuBg.on('pointerdown', () => {
      this.isPaused = false;
      const gs = this.scene.get('GameScene');
      if (gs) gs.scene.resume();
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('BootScene');
    });

    this.pauseOverlay = container;
  }
}
