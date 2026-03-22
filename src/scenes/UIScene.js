// src/scenes/UIScene.js — HUD overlay (soldier count, level)

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Semi-transparent top bar background
    this.add.rectangle(W / 2, 38, W, 76, 0x000000, 0.45);

    // Soldier emoji icon
    this.add.text(28, 38, '🪖', { fontSize: '28px' }).setOrigin(0.5);

    // Soldier count label
    this.countText = this.add.text(W / 2, 38, '20', {
      fontSize: '32px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // "soldiers" subtitle
    this.add.text(W / 2, 62, 'SOLDIERS', {
      fontSize: '11px',
      fill: '#aaaacc',
      letterSpacing: 2,
    }).setOrigin(0.5);
  }

  updateCount(count, level, flashType) {
    if (!this.countText) return;
    this.countText.setText(count.toString());

    // Pop animation on count change
    this.tweens.killTweensOf(this.countText);
    const color = flashType === 'good' ? '#2ecc71' : flashType === 'bad' ? '#e74c3c' : '#ffffff';
    this.countText.setStyle({ fill: color });
    this.tweens.add({
      targets: this.countText,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 120,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (this.countText) {
          this.countText.setStyle({ fill: '#ffffff' });
          this.countText.setScale(1);
        }
      },
    });
  }
}
