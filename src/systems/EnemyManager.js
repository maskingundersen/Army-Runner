// src/systems/EnemyManager.js — Enemy types, wave spawning, and scaling

/*
 * Enemy types:
 *   'normal'   — slow, 3 HP, many at once
 *   'fast'     — quick, 1 HP, swarms
 *   'tank'     — slow, 10 HP, large
 *   'ranged'   — shoots back at squad
 *   'miniboss' — high HP, HP bar always visible
 */

const ENEMY_DEFS = {
  normal: {
    walkSpeed:  55,
    baseHp:     3,
    scale:      0.75,
    type:       'normal',
    shootBack:  false,
    shootInterval: 0,
    coinValue:  1,
  },
  fast: {
    walkSpeed:  110,
    baseHp:     1,
    scale:      0.6,
    type:       'normal',
    shootBack:  false,
    shootInterval: 0,
    coinValue:  1,
  },
  tank: {
    walkSpeed:  30,
    baseHp:     10,
    scale:      1.1,
    type:       'heavy',
    shootBack:  false,
    shootInterval: 0,
    coinValue:  3,
  },
  ranged: {
    walkSpeed:  40,
    baseHp:     4,
    scale:      0.75,
    type:       'normal',
    shootBack:  true,
    shootInterval: 2.5,
    coinValue:  2,
  },
  miniboss: {
    walkSpeed:  25,
    baseHp:     20,
    scale:      1.2,
    type:       'heavy',
    shootBack:  true,
    shootInterval: 1.8,
    coinValue:  5,
  },
};

class EnemyManager {
  constructor(scene) {
    this._scene   = scene;
    this.enemies  = [];
    this._projPool = new Pool(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, dead: false }),
      (obj, ov) => {
        obj.x    = ov.x    || 0;
        obj.y    = ov.y    || 0;
        obj.vx   = ov.vx   || 0;
        obj.vy   = ov.vy   || 0;
        obj.dead = false;
      },
      80
    );
    this._projectiles = this._projPool._active; // shared reference for draw
  }

  /** Spawn enemies from an array of wave definitions.
   * @param {Array<{count, hp, enemyType}>} waveDefs
   * @param {number} difficultyMult
   */
  spawnWave(waveDefs, difficultyMult) {
    const GW   = this._scene.W;
    const VP_X = GW / 2;
    const VP_Y = this._scene.H * 0.25;

    let all = [];
    for (const wd of waveDefs) {
      const def = ENEMY_DEFS[wd.enemyType || wd.type] || ENEMY_DEFS.normal;
      for (let i = 0; i < wd.count; i++) {
        const scaledHp = Math.ceil((wd.hp || def.baseHp) * difficultyMult);
        all.push({
          def,
          hp: scaledHp,
          maxHp: scaledHp,
        });
      }
    }

    const cols = Math.min(all.length, 5);
    const rows = Math.ceil(all.length / cols);

    all.forEach((e, idx) => {
      const col   = idx % cols;
      const row   = Math.floor(idx / cols);
      const spd   = Math.min(cols - 1, 4) * 36;
      const ex    = cols === 1 ? VP_X : VP_X - spd / 2 + col * (spd / (cols - 1));
      const ey    = VP_Y + 30 + row * 52;

      this.enemies.push({
        id:           Math.random(),
        hp:           e.hp,
        maxHp:        e.maxHp,
        enemyType:    Object.keys(ENEMY_DEFS).find(k => ENEMY_DEFS[k] === e.def) || 'normal',
        drawType:     e.def.type,
        x:            ex,
        y:            ey,
        walkSpeed:    e.def.walkSpeed,
        scale:        e.def.scale,
        shootBack:    e.def.shootBack,
        shootTimer:   Math.random() * e.def.shootInterval,
        shootInterval: e.def.shootInterval,
        coinValue:    e.def.coinValue,
        legPhase:     Math.round(Math.random()),
        legTimer:     Math.random() * 0.3,
        hitFlash:     0,
        dead:         false,
        deathAnim:    0,
      });
    });
  }

  /** Update all enemies.
   * @param {number} dt
   * @param {number} armyX  army center X
   * @param {number} armyY  army Y
   * @returns {{soldierLosses: number, projectiles: Array}}
   */
  update(dt, armyX, armyY) {
    const ARMY_Y = armyY;
    let soldierLosses = 0;

    for (const e of this.enemies) {
      if (e.dead) {
        e.deathAnim += dt * 2;
        continue;
      }

      // Walk forward
      e.y += e.walkSpeed * dt;

      // Hit flash decay
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 8);

      // Leg animation
      e.legTimer += dt;
      if (e.legTimer >= 0.3) { e.legTimer = 0; e.legPhase = 1 - e.legPhase; }

      // Ranged enemy shoots back
      if (e.shootBack) {
        e.shootTimer += dt;
        if (e.shootTimer >= e.shootInterval) {
          e.shootTimer = 0;
          this._fireEnemyProjectile(e, armyX, ARMY_Y);
        }
      }

      // Reached army level — deal damage
      if (e.y >= ARMY_Y - 50) {
        e.dead = true;
        e.deathAnim = 0;
        soldierLosses++;
      }
    }

    // Update enemy projectiles
    this._projPool.forEach((p) => {
      if (p.dead) return;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 0 || p.x > (this._scene.W || 390) || p.y < -20 || p.y > (this._scene.H || 844) + 20) {
        p.dead = true;
        this._projPool.release(p);
      }
    });

    // Clean up dead
    this.enemies = this.enemies.filter(e => !(e.dead && e.deathAnim > 1));

    return { soldierLosses };
  }

  /** Check if a bullet at (bx, by) hits any live enemy. Returns the enemy or null. */
  checkBulletHit(bx, by) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = bx - e.x;
      const dy = by - e.y;
      const r  = 15 * e.scale;
      if (dx * dx + dy * dy < r * r) return e;
    }
    return null;
  }

  /** Check if any enemy projectile hits the army at (ax, ay, radius). */
  checkProjectileHit(ax, ay, radius) {
    let hits = 0;
    this._projPool.forEach((p) => {
      if (p.dead) return;
      const dx = p.x - ax;
      const dy = p.y - ay;
      if (dx * dx + dy * dy < radius * radius) {
        p.dead = true;
        this._projPool.release(p);
        hits++;
      }
    });
    return hits;
  }

  /** Apply AOE damage centered at (cx, cy) with given radius. */
  applyAOE(cx, cy, radius, damage, onHit) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - cx;
      const dy = e.y - cy;
      if (dx * dx + dy * dy < radius * radius) {
        if (onHit) onHit(e, damage);
      }
    }
  }

  /** Ricochet: find nearest live enemy not equal to 'exclude'. */
  findNearest(x, y, exclude) {
    let best = null, bestDist = Infinity;
    for (const e of this.enemies) {
      if (e.dead || e === exclude) continue;
      const dx = e.x - x, dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  /** Apply damage to a specific enemy.
   * Returns true if the enemy died.
   */
  damageEnemy(enemy, damage) {
    if (enemy.dead) return false;
    enemy.hp -= damage;
    enemy.hitFlash = 1;
    if (enemy.hp <= 0) {
      enemy.dead = true;
      enemy.deathAnim = 0;
      return true;
    }
    return false;
  }

  _fireEnemyProjectile(enemy, targetX, targetY) {
    const dx  = targetX - enemy.x;
    const dy  = targetY - enemy.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = 160;
    this._projPool.get({
      x:  enemy.x,
      y:  enemy.y,
      vx: (dx / len) * spd,
      vy: (dy / len) * spd,
    });
  }

  /** Draw all enemies and their projectiles. */
  draw(gfx) {
    for (const e of this.enemies) {
      const alpha     = e.dead ? Math.max(0, 1 - e.deathAnim) : 1;
      const scaleMod  = e.dead ? (1 - e.deathAnim * 0.5) : 1;

      if (e.hitFlash > 0 && Math.floor(e.hitFlash * 8) % 2 === 0) {
        gfx.fillStyle(0xffffff, 0.7);
        gfx.fillCircle(e.x, e.y - 10 * e.scale, 18 * e.scale);
      }

      gfx.setAlpha(alpha);
      drawEnemy(gfx, e.x, e.y, e.scale * scaleMod, e.legPhase, e.drawType);

      // HP bar — always show for miniboss, show when damaged otherwise
      if (!e.dead && (e.enemyType === 'miniboss' || e.hp < e.maxHp)) {
        const barW = (e.enemyType === 'miniboss' ? 40 : 28) * e.scale;
        const barH = (e.enemyType === 'miniboss' ? 6  : 4)  * e.scale;
        const barX = e.x - barW / 2;
        const barY = e.y - (e.enemyType === 'miniboss' ? 48 : 38) * e.scale;
        gfx.fillStyle(0x550000, 1);
        gfx.fillRect(barX, barY, barW, barH);
        const hpRatio = e.hp / e.maxHp;
        const hpColor = hpRatio > 0.5 ? 0x22cc22 : hpRatio > 0.25 ? 0xffa500 : 0xcc2222;
        gfx.fillStyle(hpColor, 1);
        gfx.fillRect(barX, barY, barW * hpRatio, barH);
      }

      gfx.setAlpha(1);
    }

    // Draw enemy projectiles (red orbs)
    this._projPool.forEach((p) => {
      if (p.dead) return;
      gfx.fillStyle(0xff2200, 0.9);
      gfx.fillCircle(p.x, p.y, 6);
      gfx.fillStyle(0xff6600, 0.5);
      gfx.fillCircle(p.x, p.y, 9);
    });
  }

  clear() {
    this.enemies = [];
    this._projPool.releaseAll();
  }

  get projectiles() {
    return this._projPool._active;
  }
}
