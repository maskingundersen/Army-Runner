// src/scenes/UpgradeScene.js — Between-run meta upgrade shop (localStorage persistence)

class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' });
  }

  init(data) {
    this.levelCompleted = data.level      || 1;
    this.runCoins       = data.runCoins   || 0;
    this.won            = data.won        !== false;
    this.nextLevel      = data.nextLevel  || 1;
    this.difficultyMult = data.difficultyMult || 1;
    this.allDone        = data.allDone    || false;

    // Load persistent shop state
    this._shopMeta = UpgradeSystem.loadShopMeta();
    this._totalCoins = this._loadCoins();
  }

  _loadCoins() {
    try { return parseInt(localStorage.getItem('armyrunner_coins') || '0', 10) || 0; } catch (_) { return 0; }
  }
  _saveCoins(n) {
    try { localStorage.setItem('armyrunner_coins', String(n)); } catch (_) {}
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;

    // Dark gradient background
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0f1a);
    this.add.rectangle(W / 2, H * 0.3, W, H * 0.6, 0x111828).setAlpha(0.7);

    // Header
    const header = this.won ? '🏆 LEVEL CLEAR!' : '💀 GAME OVER';
    const headerColor = this.won ? '#ffd700' : '#e74c3c';
    this.add.text(W / 2, H * 0.07, header, {
      fontSize: '30px', fontStyle: 'bold',
      fill: headerColor, stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    // Coins earned this run
    this.add.text(W / 2, H * 0.135, `+${this.runCoins} 🪙  coins earned`, {
      fontSize: '16px', fill: '#ffd700',
    }).setOrigin(0.5);

    // Total coins
    this._coinText = this.add.text(W / 2, H * 0.18, `Total: ${this._totalCoins} 🪙`, {
      fontSize: '14px', fill: '#aaaacc',
    }).setOrigin(0.5);

    // Shop title
    this.add.text(W / 2, H * 0.235, '🛒  UPGRADE SHOP', {
      fontSize: '18px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Shop items
    const items = UpgradeSystem.SHOP_UPGRADES;
    const itemH = H * 0.105;
    const startY = H * 0.29;

    this._itemObjects = [];
    items.forEach((item, i) => {
      const cy     = startY + i * (itemH + 6);
      const level  = this._shopMeta[item.id] || 0;
      const cost   = item.baseCost + level * Math.floor(item.baseCost * 0.7);
      const maxed  = level >= item.maxLevel;

      this._buildShopItem(item, i, W, cy, itemH, level, cost, maxed);
    });

    // Continue button
    const btnLabel = this.won ? (this.allDone ? '🔄 PLAY AGAIN' : '▶ NEXT LEVEL') : '🔄 RETRY';
    const btnY     = H * 0.895;

    const btnGfx = this.add.graphics();
    btnGfx.fillStyle(this.won ? 0x27ae60 : 0xe74c3c, 1);
    btnGfx.fillRoundedRect(W * 0.15, btnY - 32, W * 0.7, 60, 14);
    btnGfx.lineStyle(3, this.won ? 0x2ecc71 : 0xff6b6b, 1);
    btnGfx.strokeRoundedRect(W * 0.15, btnY - 32, W * 0.7, 60, 14);

    const btnTxt = this.add.text(W / 2, btnY, btnLabel, {
      fontSize: '22px', fontStyle: 'bold', fill: '#fff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    const btnHit = this.add.rectangle(W / 2, btnY, W * 0.7, 60, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: [btnGfx, btnTxt], scaleX: 1.04, scaleY: 1.04,
      duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    btnHit.on('pointerdown', () => this._continue());

    // Main menu
    const menuBg = this.add.rectangle(W / 2, H * 0.964, W * 0.5, 38, 0x1a1a2a, 1)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x444466);
    this.add.text(W / 2, H * 0.964, '🏠 MAIN MENU', {
      fontSize: '14px', fill: '#aaaacc',
    }).setOrigin(0.5);
    menuBg.on('pointerdown', () => {
      this.scene.stop('UIScene');
      this.scene.start('BootScene');
    });
  }

  _buildShopItem(item, index, W, cy, itemH, level, cost, maxed) {
    const cx = W / 2;

    const bg = this.add.graphics();
    const drawBg = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x1a2a3a : 0x141e2e, 1);
      bg.fillRoundedRect(W * 0.05, cy - itemH / 2, W * 0.9, itemH, 10);
      bg.lineStyle(2, maxed ? 0x2ecc71 : 0x334466, 1);
      bg.strokeRoundedRect(W * 0.05, cy - itemH / 2, W * 0.9, itemH, 10);
    };
    drawBg(false);

    // Icon + name
    this.add.text(W * 0.1, cy - 12, item.icon, { fontSize: '22px' }).setOrigin(0.5);
    this.add.text(W * 0.18, cy - 12, item.name, {
      fontSize: '14px', fontStyle: 'bold', fill: '#ffffff',
    }).setOrigin(0, 0.5);
    this.add.text(W * 0.18, cy + 8, item.desc, {
      fontSize: '11px', fill: '#8899bb',
    }).setOrigin(0, 0.5);

    // Level pips
    const pipX = W * 0.62;
    for (let p = 0; p < item.maxLevel; p++) {
      const filled = p < level;
      const pip = this.add.circle(pipX + p * 14, cy, 5, filled ? 0x2ecc71 : 0x334466, 1);
    }

    // Buy button or MAXED badge
    if (maxed) {
      this.add.text(W * 0.87, cy, 'MAXED', {
        fontSize: '11px', fontStyle: 'bold', fill: '#2ecc71',
      }).setOrigin(0.5);
    } else {
      const btnGfx = this.add.graphics();
      const canAfford = this._totalCoins >= cost;
      const btnColor  = canAfford ? 0xf39c12 : 0x555555;
      const btnW = W * 0.22, btnH = itemH * 0.7;
      const btnCX = W * 0.87, btnCY = cy;

      const drawBtn = (hov) => {
        btnGfx.clear();
        btnGfx.fillStyle(hov && canAfford ? 0xffa500 : btnColor, 1);
        btnGfx.fillRoundedRect(btnCX - btnW / 2, btnCY - btnH / 2, btnW, btnH, 6);
      };
      drawBtn(false);

      this.add.text(btnCX, btnCY - 6, `🪙 ${cost}`, {
        fontSize: '12px', fontStyle: 'bold', fill: canAfford ? '#ffffff' : '#777777',
      }).setOrigin(0.5);
      this.add.text(btnCX, btnCY + 8, 'BUY', {
        fontSize: '10px', fill: canAfford ? '#ffffff' : '#555555',
      }).setOrigin(0.5);

      const hit = this.add.rectangle(btnCX, btnCY, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor: canAfford });
      hit.on('pointerover',  () => { drawBg(true);  drawBtn(true);  });
      hit.on('pointerout',   () => { drawBg(false); drawBtn(false); });
      hit.on('pointerdown',  () => {
        if (!canAfford) return;
        this._purchase(item, cost, level);
      });
    }
  }

  _purchase(item, cost, currentLevel) {
    if (this._totalCoins < cost) return;
    this._totalCoins -= cost;
    this._saveCoins(this._totalCoins);

    this._shopMeta[item.id] = (this._shopMeta[item.id] || 0) + 1;
    UpgradeSystem.saveShopMeta(this._shopMeta);

    // Refresh the scene to reflect new state
    this.scene.restart({
      level:           this.levelCompleted,
      runCoins:        0, // don't show run coins again
      won:             this.won,
      nextLevel:       this.nextLevel,
      difficultyMult:  this.difficultyMult,
      allDone:         this.allDone,
    });
  }

  _continue() {
    this.scene.launch('UIScene');
    if (this.won && this.allDone) {
      this.scene.start('GameScene', { level: 1, difficultyMult: this.difficultyMult });
    } else {
      this.scene.start('GameScene', {
        level: this.nextLevel,
        difficultyMult: this.difficultyMult,
      });
    }
  }
}
