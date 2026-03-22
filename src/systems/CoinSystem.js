// src/systems/CoinSystem.js — Coin drop, collection animation, and localStorage persistence

class CoinSystem {
  constructor(scene) {
    this._scene = scene;

    // Coins flying to HUD counter
    this._coins = [];

    // Persistent coin store (meta-progression)
    this._totalCoins = this._load();
    this._runCoins   = 0; // coins earned this run
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  _load() {
    try {
      return parseInt(localStorage.getItem('armyrunner_coins') || '0', 10) || 0;
    } catch (_) { return 0; }
  }

  save() {
    try {
      localStorage.setItem('armyrunner_coins', String(this._totalCoins));
    } catch (_) {}
  }

  get totalCoins() { return this._totalCoins; }
  get runCoins()   { return this._runCoins; }

  addCoins(amount) {
    this._runCoins   += amount;
    this._totalCoins += amount;
    this.save();
  }

  spendCoins(amount) {
    if (this._totalCoins < amount) return false;
    this._totalCoins -= amount;
    this.save();
    return true;
  }

  // ── Coin particle spawn ─────────────────────────────────────────────────────

  /** Spawn a coin that flies from (x,y) toward the HUD coin counter. */
  spawnCoin(x, y) {
    this._coins.push({
      x,
      y,
      startX: x,
      startY: y,
      life: 0.7,
      maxLife: 0.7,
      dead: false,
    });
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    const scene  = this._scene;
    const targetX = scene.W * 0.85; // HUD coin counter position
    const targetY = 36;

    for (const coin of this._coins) {
      if (coin.dead) continue;
      coin.life -= dt;
      if (coin.life <= 0) {
        coin.dead = true;
        // Collect: add 1 coin and update HUD
        this.addCoins(1);
        scene.notifyUI();
        continue;
      }
      const t = 1 - (coin.life / coin.maxLife); // 0→1 over lifetime
      coin.x = Phaser.Math.Linear(coin.startX, targetX, t * t);
      coin.y = Phaser.Math.Linear(coin.startY, targetY, t * t);
    }
    this._coins = this._coins.filter(c => !c.dead);
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  draw(gfx) {
    for (const coin of this._coins) {
      if (coin.dead) continue;
      const alpha = Math.min(1, coin.life / coin.maxLife * 2);
      const sz    = 4 * alpha + 2;
      gfx.fillStyle(0xffd700, alpha);
      gfx.fillCircle(coin.x, coin.y, sz);
      gfx.fillStyle(0xffee88, alpha * 0.8);
      gfx.fillCircle(coin.x - 1, coin.y - 1, sz * 0.5);
    }
  }

  clear() {
    this._coins = [];
    this._runCoins = 0;
  }
}
