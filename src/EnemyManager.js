// src/EnemyManager.js — Simplified enemy manager with grunt and boss types

const _ENEMY_WHITE = new THREE.Color(0xffffff);
const ENEMY_ROAD_HALF = 8.5;
const BOSS_STOP_DISTANCE = -12;
const DEATH_ANIM_DURATION = 0.5;
const SOLDIER_LOSS_Z = 5;

// ── Enemy type definitions ──────────────────────────────────────────────────

const ENEMY_DEFS = {
  grunt: {
    walkSpeed: 3.5,
    hp: 10,
    scale: 1.0,
    color: 0xcc0000,
    coinValue: 1,
    boss: false,
  },
  boss: {
    walkSpeed: 1.5,
    hp: 500,
    scale: 2.0,
    color: 0xff0000,
    coinValue: 10,
    boss: true,
  },
};

// Map old enemy type names to the two simplified types
const TYPE_MAP = {
  zombie:     'grunt',
  fast:       'grunt',
  tank:       'grunt',
  exploding:  'grunt',
  shield:     'grunt',
  jumping:    'grunt',
  ranged:     'grunt',
  charger:    'grunt',
  splitter:   'grunt',
  grunt:      'grunt',
  ogre:       'boss',
  giant:      'boss',
  fireDragon: 'boss',
  boss:       'boss',
};

// ── EnemyManager class ──────────────────────────────────────────────────────

class EnemyManager {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.enemies = [];
    this._pool = [];
  }

  // ── Public API ──────────────────────────────────────────────────────────

  get count() {
    let n = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      if (!this.enemies[i].dead) n++;
    }
    return n;
  }

  spawnWave(waveDefs, spawnZ, armyX, difficultyMult) {
    let totalIdx = 0;
    for (const wave of waveDefs) {
      const { count, enemyType, hp, xOffset } = wave;
      const resolvedType = TYPE_MAP[enemyType] || 'grunt';
      const def = ENEMY_DEFS[resolvedType];
      const spacing = 1.8 * def.scale;
      const cols = Math.min(5, count);

      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const rowWidth = Math.min(cols, count - row * cols);
        const xOff = (col - (rowWidth - 1) / 2) * spacing;
        const zOff = row * spacing * 1.2;
        const flank = xOffset || 0;
        const randX = (Math.random() - 0.5) * 0.6;
        const randZ = (Math.random() - 0.5) * 0.6;

        const worldX = Math.max(-ENEMY_ROAD_HALF,
          Math.min(ENEMY_ROAD_HALF, armyX + xOff + flank + randX));
        const worldZ = spawnZ - zOff + randZ - totalIdx * 2;

        const baseHp = hp || def.hp;
        const finalHp = Math.ceil(baseHp * difficultyMult);

        const enemy = this._acquire(resolvedType, def);
        enemy.worldX = worldX;
        enemy.worldZ = worldZ;
        enemy.hp = finalHp;
        enemy.maxHp = finalHp;
        enemy.dead = false;
        enemy.deathTimer = 0;
        enemy.hitFlash = 0;
        enemy.hitScale = 1.0;
        enemy.walkPhase = Math.random() * Math.PI * 2;

        // Reset visual state
        enemy.group.position.set(worldX, 0, worldZ);
        enemy.group.rotation.set(0, 0, 0);
        enemy.group.scale.setScalar(def.scale);
        enemy.group.visible = true;
        this._restoreColors(enemy);

        if (enemy.hpBar) {
          this._updateHPBar(enemy);
          enemy.hpBar.visible = false;
        }

        this.scene.add(enemy.group);
        this.enemies.push(enemy);
        totalIdx++;
      }
    }
  }

  update(dt, armyX) {
    let soldierLosses = 0;
    const killedEnemies = [];

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // ── Death animation ──
      if (enemy.dead) {
        enemy.deathTimer += dt;
        if (enemy.deathTimer < 0.3) {
          // Fall over
          enemy.group.rotation.x = (enemy.deathTimer / 0.3) * (Math.PI / 2);
          enemy.group.position.y -= dt * 1.5;
        }
        if (enemy.deathTimer >= DEATH_ANIM_DURATION) {
          this._release(enemy);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // ── Movement ──
      const isBoss = enemy.def.boss;
      if (isBoss && enemy.worldZ >= BOSS_STOP_DISTANCE) {
        // Boss stops and acts as bullet sponge
      } else {
        enemy.worldZ += enemy.def.walkSpeed * dt;
      }
      enemy.group.position.set(enemy.worldX, 0, enemy.worldZ);

      // ── Walk animation ──
      enemy.walkPhase += dt * 6;
      const phase = enemy.walkPhase;
      const legSwing = Math.sin(phase) * 0.5;
      const bounce = Math.abs(Math.sin(phase)) * 0.08;

      if (enemy.lLeg) enemy.lLeg.rotation.x = legSwing;
      if (enemy.rLeg) enemy.rLeg.rotation.x = -legSwing;
      if (enemy.bodyMesh) enemy.bodyMesh.position.y = 0.6 + bounce;

      // ── Hit flash system ──
      this._updateHitFlash(enemy, dt);

      // ── Hit scale pulse ──
      if (enemy.hitScale > 1.001) {
        enemy.hitScale = Math.max(1.0, enemy.hitScale - dt * 4);
        const s = enemy.def.scale * enemy.hitScale;
        enemy.group.scale.setScalar(s);
      }

      // ── Collision with army ──
      if (enemy.worldZ > SOLDIER_LOSS_Z) {
        soldierLosses++;
        killedEnemies.push(enemy);
        this.effects.explode(enemy.worldX, 1, enemy.worldZ, 0xff0000, 8, 3);
        enemy.dead = true;
        enemy.deathTimer = DEATH_ANIM_DURATION; // instant removal next frame
      }
    }

    return { soldierLosses, killedEnemies };
  }

  damageEnemy(enemy, damage) {
    if (enemy.dead) return { died: false, exploded: false };

    enemy.hp -= damage;
    enemy.hitFlash = 0.15;
    enemy.hitScale = 1.2;

    // Hit effects
    this.effects.hitSpark(enemy.worldX, 1.5, enemy.worldZ);
    this.effects.damageNumber(enemy.worldX, 2, enemy.worldZ, damage);

    // Update HP bar
    if (enemy.hpBar) this._updateHPBar(enemy);

    // Death check
    if (enemy.hp <= 0) {
      enemy.dead = true;
      enemy.deathTimer = 0;
      // Death effects
      this.effects.explode(enemy.worldX, 1, enemy.worldZ, enemy.def.color, 25, 5);
      this.effects.explode(enemy.worldX, 1.5, enemy.worldZ, 0xff4400, 10, 3);
      return { died: true, exploded: false };
    }

    return { died: false, exploded: false };
  }

  checkBulletHit(bx, by, bz) {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.dead) continue;

      const scale = enemy.def.scale;
      const hitW = (0.4 + 0.3) * scale; // body half-width + padding
      const hitD = (0.3 + 0.4) * scale; // body half-depth + padding

      const dx = Math.abs(bx - enemy.worldX);
      const dz = Math.abs(bz - enemy.worldZ);

      if (dx < hitW && dz < hitD && by > 0 && by < 2.5 * scale) {
        return enemy;
      }
    }
    return null;
  }

  clear() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this._release(this.enemies[i]);
    }
    this.enemies.length = 0;
  }

  // ── Pooling ─────────────────────────────────────────────────────────────

  _acquire(type, def) {
    // Try to reuse from pool
    for (let i = 0; i < this._pool.length; i++) {
      if (this._pool[i].type === type) {
        return this._pool.splice(i, 1)[0];
      }
    }
    // Create new
    return this._createEnemy(type, def);
  }

  _release(enemy) {
    enemy.group.visible = false;
    this.scene.remove(enemy.group);
    this._pool.push(enemy);
  }

  // ── Enemy creation ──────────────────────────────────────────────────────

  _createEnemy(type, def) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.5,
      metalness: 0.1,
    });

    // Body (hunched posture)
    const bodyGeo = new THREE.BoxGeometry(0.4, 0.6, 0.3);
    const bodyMesh = new THREE.Mesh(bodyGeo, mat.clone());
    bodyMesh.position.y = 0.6;
    bodyMesh.rotation.x = 0.2;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.18, 8, 6);
    const headMesh = new THREE.Mesh(headGeo, mat.clone());
    headMesh.position.y = 1.1;
    headMesh.castShadow = true;
    group.add(headMesh);

    // Horns
    const hornGeo = new THREE.ConeGeometry(0.05, 0.15, 4);
    const hornMat = mat.clone();
    const leftHorn = new THREE.Mesh(hornGeo, hornMat);
    leftHorn.position.set(-0.1, 1.3, 0);
    group.add(leftHorn);

    const rightHorn = new THREE.Mesh(hornGeo, hornMat.clone());
    rightHorn.position.set(0.1, 1.3, 0);
    group.add(rightHorn);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 6);
    const legMat = mat.clone();

    const lLeg = new THREE.Mesh(legGeo, legMat);
    lLeg.position.set(-0.1, 0.18, 0);
    group.add(lLeg);

    const rLeg = new THREE.Mesh(legGeo, legMat.clone());
    rLeg.position.set(0.1, 0.18, 0);
    group.add(rLeg);

    // Collect original colors for hit flash
    const origColors = [];
    group.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        origColors.push({
          mesh: child,
          color: child.material.color.clone(),
        });
      }
    });

    // HP bar for bosses
    let hpBar = null;
    if (def.boss) {
      hpBar = this._createHPBar();
      hpBar.position.y = 1.6;
      group.add(hpBar);
    }

    group.scale.setScalar(def.scale);

    return {
      type,
      def,
      group,
      bodyMesh,
      headMesh,
      lLeg,
      rLeg,
      hpBar,
      _origColors: origColors,
      worldX: 0,
      worldZ: 0,
      hp: def.hp,
      maxHp: def.hp,
      dead: false,
      deathTimer: 0,
      hitFlash: 0,
      hitScale: 1.0,
      walkPhase: 0,
    };
  }

  // ── HP bar ──────────────────────────────────────────────────────────────

  _createHPBar() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#220000';
    ctx.fillRect(0, 0, 64, 8);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(1, 1, 62, 6);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.5, 0.3, 1);
    sprite._canvas = canvas;
    sprite._ctx = ctx;
    sprite._tex = tex;
    return sprite;
  }

  _updateHPBar(enemy) {
    const bar = enemy.hpBar;
    if (!bar) return;

    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    bar.visible = ratio < 0.999;

    const ctx = bar._ctx;
    const canvas = bar._canvas;
    ctx.fillStyle = '#220000';
    ctx.fillRect(0, 0, 64, 8);

    let barColor;
    if (ratio > 0.6) barColor = '#00cc00';
    else if (ratio > 0.3) barColor = '#cccc00';
    else barColor = '#ff0000';

    ctx.fillStyle = barColor;
    ctx.fillRect(1, 1, Math.max(0, 62 * ratio), 6);
    bar._tex.needsUpdate = true;
  }

  // ── Hit flash ───────────────────────────────────────────────────────────

  _updateHitFlash(enemy, dt) {
    if (enemy.hitFlash <= 0) return;

    const elapsed = 0.15 - enemy.hitFlash;
    let intensity;
    if (elapsed < 0.05) {
      intensity = elapsed / 0.05; // ramp to white
    } else {
      intensity = 1 - (elapsed - 0.05) / 0.1; // fade back
    }
    intensity = Math.max(0, Math.min(1, intensity));

    const origColors = enemy._origColors;
    for (let j = 0; j < origColors.length; j++) {
      const entry = origColors[j];
      entry.mesh.material.color.lerpColors(entry.color, _ENEMY_WHITE, intensity);
    }

    enemy.hitFlash -= dt;

    // Restore originals when flash ends
    if (enemy.hitFlash <= 0) {
      this._restoreColors(enemy);
    }
  }

  _restoreColors(enemy) {
    const origColors = enemy._origColors;
    for (let j = 0; j < origColors.length; j++) {
      const entry = origColors[j];
      entry.mesh.material.color.copy(entry.color);
    }
  }
}