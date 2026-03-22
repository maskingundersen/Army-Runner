// src/systems/BossManager.js — Boss phases, attacks, death sequence

class BossManager {
  constructor(scene) {
    this._scene = scene;

    this.active   = false;
    this.hp       = 0;
    this.maxHp    = 0;
    this.enraged  = false;
    this.bossType = '';
    this.bossName = '';
    this.x        = 0;
    this.y        = 0;
    this.dead     = false;

    this._attackTimer    = 0;
    this._attackInterval = 2.0;
    this._projectiles    = [];
  }

  get projectiles() { return this._projectiles; }

  /** Begin a boss encounter.
   * @param {object} levelDef  — from LEVEL_DEFS
   * @param {number} diffMult
   * @param {number} bossX
   * @param {number} bossY
   */
  start(levelDef, diffMult, bossX, bossY) {
    this.active    = true;
    this.hp        = Math.ceil(levelDef.bossHp * diffMult);
    this.maxHp     = this.hp;
    this.enraged   = false;
    this.bossType  = levelDef.bossType;
    this.bossName  = levelDef.bossName;
    this.x         = bossX;
    this.y         = bossY;
    this.dead      = false;
    this._attackTimer    = 2.0; // first attack after 2s
    this._attackInterval = 2.0;
    this._projectiles    = [];
  }

  /** Update boss each frame.
   * @param {number} dt
   * @param {number} armyX
   * @param {number} armyY
   * @returns {number} soldier damage dealt this frame
   */
  update(dt, armyX, armyY) {
    if (!this.active || this.dead) return 0;

    this._attackTimer -= dt;
    if (this._attackTimer <= 0) {
      this._attackTimer = this._attackInterval;
      this._shoot(armyX, armyY);
    }

    let soldierDamage = 0;

    // Move projectiles
    for (const p of this._projectiles) {
      if (p.dead) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const W = this._scene.W || 390;
      const H = this._scene.H || 844;
      if (p.x < -20 || p.x > W + 20 || p.y > H + 20 || p.y < -20) {
        p.dead = true;
        continue;
      }

      // Hit army
      const dx = p.x - armyX;
      const dy = p.y - armyY;
      if (Math.sqrt(dx * dx + dy * dy) < 42) {
        p.dead = true;
        soldierDamage += this.enraged ? 3 : 2;
        if (window.audioManager) window.audioManager.bossAttack();
      }
    }

    this._projectiles = this._projectiles.filter(p => !p.dead);

    // Enrage at 50%
    if (!this.enraged && this.hp <= this.maxHp * 0.5) {
      this.enraged = true;
      this._attackInterval = 0.9;
      return soldierDamage | 0x10000; // flag for enrage event (upper bits)
    }

    return soldierDamage;
  }

  /** Check if a bullet at (bx,by) hits the boss. */
  checkBulletHit(bx, by) {
    if (!this.active || this.dead) return false;
    const dx = bx - this.x;
    const dy = by - (this.y + 30);
    return dx * dx + dy * dy < (40 * 1.5) * (40 * 1.5);
  }

  /** Apply damage to the boss.
   * @returns {boolean} true if boss just died
   */
  damage(dmg) {
    if (!this.active || this.dead) return false;
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  _shoot(armyX, armyY) {
    if (!window.audioManager) return;
    window.audioManager.bossAttack();

    const count = this.enraged ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / 2) + (i - (count - 1) / 2) * 0.35;
      const spd   = 180 + Math.random() * 60;
      this._projectiles.push({
        x:  this.x + (Math.random() - 0.5) * 30,
        y:  this.y + 80,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        dead: false,
      });
    }
  }

  /** Draw boss character and projectiles. */
  draw(gfx) {
    if (!this.active) return;
    drawBoss(gfx, this.x, this.y, 1, this.bossType, this.enraged);

    // Projectiles
    for (const p of this._projectiles) {
      if (p.dead) continue;
      gfx.fillStyle(0xff2200, 1);
      gfx.fillCircle(p.x, p.y, 7);
      gfx.fillStyle(0xff6600, 0.5);
      gfx.fillCircle(p.x, p.y, 11);
    }
  }

  end() {
    this.active = false;
    this._projectiles = [];
  }
}
