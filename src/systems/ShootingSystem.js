// src/systems/ShootingSystem.js — Auto-fire with spread, explosive, homing, ricochet bullets

class ShootingSystem {
  constructor(scene) {
    this._scene = scene;

    this._bulletPool = new Pool(
      () => ({
        x: 0, y: 0, vx: 0, vy: 0,
        damage: 1,
        dead: false,
        isBoss: false,
        type: 'straight',  // 'straight' | 'homing' | 'ricochet'
        targetEnemy: null,
        ricochets: 0,
        explodes: false,
        explodeRadius: 40,
        age: 0,
      }),
      (obj, ov) => {
        obj.x             = ov.x             || 0;
        obj.y             = ov.y             || 0;
        obj.vx            = ov.vx            || 0;
        obj.vy            = ov.vy            || 0;
        obj.damage        = ov.damage        || 1;
        obj.dead          = false;
        obj.isBoss        = ov.isBoss        || false;
        obj.type          = ov.type          || 'straight';
        obj.targetEnemy   = ov.targetEnemy   || null;
        obj.ricochets     = ov.ricochets     || 0;
        obj.explodes      = ov.explodes      || false;
        obj.explodeRadius = ov.explodeRadius || 40;
        obj.age           = 0;
      },
      400
    );

    this._fireTimer   = 0;
    this._muzzleFlashes = [];
  }

  get bullets() { return this._bulletPool._active; }

  /** Called each frame — fires at targets if interval has elapsed.
   * @param {number}  dt
   * @param {{x,y}}   armyCenter
   * @param {number}  soldierCount
   * @param {Array}   enemies  — from EnemyManager
   * @param {boolean} aimAtBoss
   * @param {{x,y}}   bossPos
   * @param {object}  stats  — from UpgradeSystem.getStats()
   */
  update(dt, armyCenter, soldierCount, enemies, aimAtBoss, bossPos, stats) {
    this._fireTimer += dt;

    // Update muzzle flashes
    this._muzzleFlashes = this._muzzleFlashes.filter(f => {
      f.life -= dt;
      return f.life > 0;
    });

    if (this._fireTimer >= stats.fireInterval) {
      this._fireTimer = 0;

      let targets;
      if (aimAtBoss && bossPos) {
        targets = [{ x: bossPos.x, y: bossPos.y, isBoss: true, isEnemy: false }];
      } else {
        const alive = enemies.filter(e => !e.dead);
        if (alive.length === 0) return;
        targets = alive.map(e => ({ x: e.x, y: e.y, isBoss: false, isEnemy: true, ref: e }));
      }

      // Shots per tick scales with army size
      const directShots = Math.min(4, 1 + Math.ceil(soldierCount / 12));

      for (let s = 0; s < directShots; s++) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        this._fireAtTarget(target, armyCenter, stats, enemies);
      }

      // Side cannons fire independently at random targets
      if (stats.hasSideCannons && targets.length > 0) {
        const cCount = stats.sideCannons;
        const offsets = [[-40, -15], [40, -15]].slice(0, cCount);
        for (const [ox, oy] of offsets) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          this._spawnBullet(
            armyCenter.x + ox, armyCenter.y + oy,
            t.x, t.y,
            stats, t.isBoss, t.ref || null, 480
          );
        }
      }
    }

    // Move and resolve bullets
    this._bulletPool.forEach((b) => {
      if (b.dead) return;
      b.age += dt;

      // Homing: steer towards target
      if (b.type === 'homing' && !b.isBoss) {
        const nearestAlive = enemies.filter(e => !e.dead);
        if (nearestAlive.length > 0) {
          let best = nearestAlive[0], bestD = Infinity;
          for (const e of nearestAlive) {
            const dx = e.x - b.x, dy = e.y - b.y;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = e; }
          }
          const dx  = best.x - b.x;
          const dy  = best.y - b.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          const turnRate = 6 * dt; // steering factor per frame (0..1 scale)
          b.vx = Phaser.Math.Linear(b.vx, (dx / len) * spd, turnRate);
          b.vy = Phaser.Math.Linear(b.vy, (dy / len) * spd, turnRate);
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      const W = this._scene.W || 390;
      const H = this._scene.H || 844;
      if (b.x < -10 || b.x > W + 10 || b.y < -30 || b.y > H + 30 || b.age > 3) {
        b.dead = true;
        this._bulletPool.release(b);
      }
    });

    // Clean up bullets that were marked dead externally (hit detection in GameScene)
    const toRelease = this._bulletPool._active.filter(b => b.dead);
    toRelease.forEach(b => this._bulletPool.release(b));
  }

  _fireAtTarget(target, armyCenter, stats, enemies) {
    const ox = armyCenter.x + (Math.random() - 0.5) * 40;
    const oy = armyCenter.y - 10 + (Math.random() - 0.5) * 16;

    // Muzzle flash
    this._muzzleFlashes.push({ x: ox + 10, y: oy - 4, life: 0.08, maxLife: 0.08 });

    for (const angleOffset of stats.spreadAngles) {
      this._spawnBulletAngled(ox, oy, target, angleOffset, stats, enemies);
    }
  }

  _spawnBulletAngled(ox, oy, target, angleOffset, stats, enemies) {
    const dx  = target.x - ox;
    const dy  = target.y - oy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const baseAngle = Math.atan2(dy, dx);
    const angle     = baseAngle + angleOffset;
    const spd       = 460;

    const bulletType = stats.hasHoming ? 'homing' : (stats.hasRicochet ? 'ricochet' : 'straight');

    this._bulletPool.get({
      x:             ox,
      y:             oy,
      vx:            Math.cos(angle) * spd,
      vy:            Math.sin(angle) * spd,
      damage:        stats.damage,
      isBoss:        target.isBoss || false,
      type:          bulletType,
      targetEnemy:   target.ref || null,
      ricochets:     stats.ricochetCount,
      explodes:      stats.hasExplosive,
      explodeRadius: stats.explosiveRadius,
    });
  }

  _spawnBullet(ox, oy, tx, ty, stats, isBoss, ref, spd) {
    const dx = tx - ox, dy = ty - oy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this._bulletPool.get({
      x: ox, y: oy,
      vx: (dx / len) * (spd || 460),
      vy: (dy / len) * (spd || 460),
      damage: stats.damage,
      isBoss: isBoss || false,
      type: 'straight',
      targetEnemy: ref || null,
      ricochets: 0,
      explodes: stats.hasExplosive,
      explodeRadius: stats.explosiveRadius,
    });
  }

  /** Draw all bullets (called each frame). */
  draw(gfx) {
    this._bulletPool.forEach((b) => {
      if (b.dead) return;

      if (b.type === 'homing') {
        gfx.fillStyle(0x44ffcc, 1);
        gfx.fillRect(b.x - 2, b.y - 6, 5, 10);
        gfx.fillStyle(0x00ffaa, 0.5);
        gfx.fillRect(b.x - 1, b.y, 3, 8);
      } else if (b.type === 'ricochet') {
        gfx.fillStyle(0xaaddff, 1);
        gfx.fillRect(b.x - 2, b.y - 5, 4, 9);
        gfx.fillStyle(0x88bbff, 0.5);
        gfx.fillRect(b.x - 1, b.y, 3, 7);
      } else {
        // Straight / spread
        gfx.fillStyle(0xffee44, 1);
        gfx.fillRect(b.x - 2, b.y - 5, 5, 10);
        // Trail
        gfx.fillStyle(0xff8800, 0.5);
        gfx.fillRect(b.x - 1, b.y, 3, 8);
      }
    });

    // Muzzle flashes
    for (const f of this._muzzleFlashes) {
      const a = f.life / f.maxLife;
      gfx.fillStyle(0xffffff, a);
      gfx.fillCircle(f.x, f.y, 5 * a);
      gfx.fillStyle(0xffff44, a * 0.8);
      gfx.fillCircle(f.x, f.y, 3 * a);
    }
  }

  clear() {
    this._bulletPool.releaseAll();
    this._muzzleFlashes = [];
    this._fireTimer = 0;
  }
}
