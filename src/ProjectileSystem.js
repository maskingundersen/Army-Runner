// src/ProjectileSystem.js — Manages bullets using InstancedMesh

class ProjectileSystem {
  constructor(threeScene, effectsMgr) {
    this.scene = threeScene;
    this.effects = effectsMgr;
    this.MAX_BULLETS = 500;

    // Bright yellow/white glowing rectangular tracers
    const bulletGeo = new THREE.BoxGeometry(0.08, 0.08, 0.4);
    const bulletMat = new THREE.MeshStandardMaterial({
      color: 0xFFFF88,
      emissive: 0xFFFF00,
      emissiveIntensity: 1.5
    });
    this.bulletMesh = new THREE.InstancedMesh(bulletGeo, bulletMat, this.MAX_BULLETS);
    this.bulletMesh.frustumCulled = false;
    this.scene.add(this.bulletMesh);

    // Orange trail mesh
    const trailGeo = new THREE.BoxGeometry(0.03, 0.03, 0.4);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.6
    });
    this.trailMesh = new THREE.InstancedMesh(trailGeo, trailMat, this.MAX_BULLETS);
    this.trailMesh.frustumCulled = false;
    this.scene.add(this.trailMesh);

    // Hide all instances
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.MAX_BULLETS; i++) {
      this.bulletMesh.setMatrixAt(i, hide);
      this.trailMesh.setMatrixAt(i, hide);
    }
    this.bulletMesh.instanceMatrix.needsUpdate = true;
    this.trailMesh.instanceMatrix.needsUpdate = true;

    // Pool
    this._bullets = [];
    this._bulletPool = [];
    for (let i = 0; i < this.MAX_BULLETS; i++) this._bulletPool.push(i);

    this._bulletData = new Array(this.MAX_BULLETS).fill(null).map(() => ({
      active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, damage: 1
    }));

    this._fireTimer = 0;
    this._tempM4 = new THREE.Matrix4();
    this._tempV3 = new THREE.Vector3();
    this._tempQ = new THREE.Quaternion();
    this._yAxis = new THREE.Vector3(0, 1, 0);
    this._oneScale = new THREE.Vector3(1, 1, 1);
  }

  update(dt, armyX, armyZ, soldierCount, enemies, upgrades, stats, bossPos, armyMgr) {
    this._fireTimer += dt;

    if (this._fireTimer >= stats.fireInterval && soldierCount > 0) {
      this._fireTimer = 0;
      const muzzles = armyMgr ? armyMgr.getMuzzlePositions(soldierCount) : [];
      this._fire(muzzles, armyX, stats);
      if (armyMgr) armyMgr.applyRecoil();
    }

    // Move bullets
    for (let i = this._bullets.length - 1; i >= 0; i--) {
      const idx = this._bullets[i];
      const b = this._bulletData[idx];
      if (!b.active) continue;

      b.x += b.vx * dt;
      b.z += b.vz * dt;

      if (b.z < -200) {
        this._deactivate(i, idx);
        continue;
      }

      // Update visual
      const angle = Math.atan2(b.vx, b.vz);
      this._tempQ.setFromAxisAngle(this._yAxis, angle);
      this._tempV3.set(b.x, b.y, b.z);
      this._tempM4.compose(this._tempV3, this._tempQ, this._oneScale);
      this.bulletMesh.setMatrixAt(idx, this._tempM4);

      // Trail behind
      this._tempV3.set(b.x - b.vx * 0.015, b.y, b.z - b.vz * 0.015);
      this._tempM4.compose(this._tempV3, this._tempQ, this._oneScale);
      this.trailMesh.setMatrixAt(idx, this._tempM4);
    }

    this.bulletMesh.instanceMatrix.needsUpdate = true;
    this.trailMesh.instanceMatrix.needsUpdate = true;
  }

  _fire(muzzles, armyX, stats) {
    const speed = 35;
    const count = Math.max(muzzles.length, 1);

    for (let p = 0; p < count; p++) {
      let px, py, pz;
      if (p < muzzles.length) {
        px = muzzles[p].x; py = muzzles[p].y; pz = muzzles[p].z;
      } else {
        px = armyX; py = 0.9; pz = -0.3;
      }

      this.effects.muzzleFlash(px, py, pz);

      const idx = this._bulletPool.pop();
      if (idx === undefined) break;

      const b = this._bulletData[idx];
      b.active = true;
      b.x = px; b.y = py; b.z = pz;
      b.vx = 0; b.vy = 0; b.vz = -speed;
      b.damage = stats.damage || 1;
      this._bullets.push(idx);
    }

    if (window.audioManager) window.audioManager.shoot();
  }

  _deactivate(arrayIdx, bulletIdx) {
    this._bulletData[bulletIdx].active = false;
    this._tempM4.makeScale(0, 0, 0);
    this.bulletMesh.setMatrixAt(bulletIdx, this._tempM4);
    this.trailMesh.setMatrixAt(bulletIdx, this._tempM4);
    this._bullets.splice(arrayIdx, 1);
    this._bulletPool.push(bulletIdx);
  }

  checkHits(enemyManager, stats) {
    const hits = [];

    for (let i = this._bullets.length - 1; i >= 0; i--) {
      const idx = this._bullets[i];
      const b = this._bulletData[idx];
      if (!b.active) continue;

      const enemy = enemyManager.checkBulletHit(b.x, b.y, b.z);
      if (enemy) {
        const result = enemyManager.damageEnemy(enemy, b.damage);
        hits.push({ enemy, x: b.x, y: b.y, z: b.z, died: result.died });
        this.effects.explode(b.x, b.y, b.z, 0xffee00, 4, 2.5);
        this._deactivate(i, idx);
      }
    }

    return hits;
  }

  clear() {
    for (const idx of this._bullets) {
      this._bulletData[idx].active = false;
      this._tempM4.makeScale(0, 0, 0);
      this.bulletMesh.setMatrixAt(idx, this._tempM4);
      this.trailMesh.setMatrixAt(idx, this._tempM4);
      this._bulletPool.push(idx);
    }
    this._bullets.length = 0;
    this._fireTimer = 0;
    this.bulletMesh.instanceMatrix.needsUpdate = true;
    this.trailMesh.instanceMatrix.needsUpdate = true;
  }
}
