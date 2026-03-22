// src/ProjectileSystem.js — Manages bullets using InstancedMesh

class ProjectileSystem {
  constructor(threeScene, effectsMgr) {
    this.scene = threeScene;
    this.effects = effectsMgr;
    this.MAX_BULLETS = 500;
    
    // Create instanced mesh for bullets
    const bulletGeo = new THREE.BoxGeometry(0.06, 0.06, 0.25);
    const bulletMat = new THREE.MeshBasicMaterial({ 
      color: 0xffee00,
      transparent: true,
      opacity: 1.0
    });
    this.bulletMesh = new THREE.InstancedMesh(bulletGeo, bulletMat, this.MAX_BULLETS);
    this.bulletMesh.frustumCulled = false;
    this.scene.add(this.bulletMesh);
    
    // Create instanced mesh for bullet trails
    const trailGeo = new THREE.BoxGeometry(0.03, 0.03, 0.4);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.6
    });
    this.trailMesh = new THREE.InstancedMesh(trailGeo, trailMat, this.MAX_BULLETS);
    this.trailMesh.frustumCulled = false;
    this.scene.add(this.trailMesh);
    
    // Initialize all bullets hidden
    const hideMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.MAX_BULLETS; i++) {
      this.bulletMesh.setMatrixAt(i, hideMatrix);
      this.trailMesh.setMatrixAt(i, hideMatrix);
    }
    this.bulletMesh.instanceMatrix.needsUpdate = true;
    this.trailMesh.instanceMatrix.needsUpdate = true;
    
    // Bullet data
    this._bullets = [];
    this._bulletPool = [];
    for (let i = 0; i < this.MAX_BULLETS; i++) {
      this._bulletPool.push(i);
    }
    
    this._bulletData = new Array(this.MAX_BULLETS).fill(null).map(() => ({
      active: false,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      life: 0,
      damage: 1,
      homing: false,
      targetEnemy: null,
      pierceHits: 0,
      piercedEnemies: null
    }));
    
    // Fire timer
    this._fireTimer = 0;
    
    // Temp objects
    this._tempM4 = new THREE.Matrix4();
    this._tempV3 = new THREE.Vector3();
    this._tempQ = new THREE.Quaternion();
  }
  
  /**
   * Update projectile system
   * @param {number} dt - Delta time
   * @param {number} armyX - Army X position
   * @param {number} armyZ - Army Z position (usually 0)
   * @param {number} soldierCount - Number of soldiers
   * @param {Array} enemies - Enemy array from EnemyManager
   * @param {Object} upgrades - Current upgrades
   * @param {Object} stats - Computed stats from UpgradeSystem
   * @param {Object|null} bossPos - Boss position if applicable
   */
  update(dt, armyX, armyZ, soldierCount, enemies, upgrades, stats, bossPos) {
    // Fire interval
    this._fireTimer += dt;
    
    if (this._fireTimer >= stats.fireInterval && soldierCount > 0) {
      this._fireTimer = 0;
      this._fireBullets(armyX, enemies, stats);
    }
    
    // Update active bullets
    const bulletSpeed = 35; // units per second
    
    for (let i = this._bullets.length - 1; i >= 0; i--) {
      const idx = this._bullets[i];
      const bullet = this._bulletData[idx];
      
      if (!bullet.active) continue;
      
      // Homing behavior
      if (bullet.homing && bullet.targetEnemy && !bullet.targetEnemy.dead) {
        const target = bullet.targetEnemy;
        const dx = target.worldX - bullet.x;
        const dz = target.worldZ - bullet.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist > 0.5) {
          const turnSpeed = 8;
          bullet.vx += (dx / dist) * turnSpeed * dt;
          bullet.vz += (dz / dist) * turnSpeed * dt;
          
          // Normalize and scale to speed
          const vMag = Math.sqrt(bullet.vx * bullet.vx + bullet.vz * bullet.vz);
          if (vMag > 0) {
            bullet.vx = (bullet.vx / vMag) * bulletSpeed;
            bullet.vz = (bullet.vz / vMag) * bulletSpeed;
          }
        }
      }
      
      // Move bullet
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.z += bullet.vz * dt;
      bullet.life -= dt;
      
      // Check bounds and life
      if (bullet.life <= 0 || bullet.z < -100 || Math.abs(bullet.x) > 20) {
        this._deactivateBullet(i, idx);
        continue;
      }
      
      // Update visual
      this._updateBulletVisual(idx, bullet);
    }
    
    this.bulletMesh.instanceMatrix.needsUpdate = true;
    this.trailMesh.instanceMatrix.needsUpdate = true;
  }
  
  /**
   * Fire bullets from army
   */
  _fireBullets(armyX, enemies, stats) {
    // Find targets
    const aliveEnemies = enemies.filter(e => !e.dead);
    if (aliveEnemies.length === 0) return;
    
    // Sort by distance (closest first: highest worldZ = closest to army at Z=0)
    aliveEnemies.sort((a, b) => b.worldZ - a.worldZ);
    
    // Get number of shots based on stats
    const shotsPerFire = Math.min(stats.bulletCount, 8);
    const spreadAngles = stats.spreadAngles || [0];
    
    // Fire from multiple positions
    const firePositions = Math.min(shotsPerFire, 6);
    const posSpacing = 0.8;
    
    for (let p = 0; p < firePositions; p++) {
      const posX = armyX + (p - (firePositions - 1) / 2) * posSpacing * 0.5;
      const posY = 0.9;
      const posZ = -0.3;
      
      // Muzzle flash
      this.effects.muzzleFlash(posX, posY, posZ);
      
      // Fire for each spread angle
      for (const angle of spreadAngles) {
        const idx = this._bulletPool.pop();
        if (idx === undefined) break;
        
        const bullet = this._bulletData[idx];
        bullet.active = true;
        bullet.x = posX;
        bullet.y = posY;
        bullet.z = posZ;
        
        // Target nearest enemy
        const target = aliveEnemies[p % aliveEnemies.length];
        const dx = target.worldX - posX;
        const dz = target.worldZ - posZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        // Base velocity toward target
        const speed = 35;
        let vx = (dx / dist) * speed;
        let vz = (dz / dist) * speed;
        
        // Apply spread angle
        if (angle !== 0) {
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const newVx = vx * cos - vz * sin;
          const newVz = vx * sin + vz * cos;
          vx = newVx;
          vz = newVz;
        }
        
        bullet.vx = vx;
        bullet.vy = 0;
        bullet.vz = vz;
        bullet.life = 3;
        bullet.damage = stats.damage || 1;
        bullet.homing = stats.hasHoming;
        // Only assign target if homing and target is alive
        bullet.targetEnemy = (stats.hasHoming && target && !target.dead) ? target : null;
        bullet.pierceHits = 0;
        bullet.piercedEnemies = stats.hasPiercing ? new Set() : null;
        
        this._bullets.push(idx);
      }
    }
    
    // Play shoot sound
    if (window.audioManager) window.audioManager.shoot();
  }
  
  /**
   * Update bullet visual (instanced mesh)
   */
  _updateBulletVisual(idx, bullet) {
    // Calculate rotation from velocity
    const angle = Math.atan2(bullet.vx, bullet.vz);
    
    this._tempQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    this._tempV3.set(bullet.x, bullet.y, bullet.z);
    this._tempM4.compose(this._tempV3, this._tempQ, new THREE.Vector3(1, 1, 1));
    this.bulletMesh.setMatrixAt(idx, this._tempM4);
    
    // Trail slightly behind
    const trailX = bullet.x - bullet.vx * 0.015;
    const trailZ = bullet.z - bullet.vz * 0.015;
    this._tempV3.set(trailX, bullet.y, trailZ);
    this._tempM4.compose(this._tempV3, this._tempQ, new THREE.Vector3(1, 1, 1));
    this.trailMesh.setMatrixAt(idx, this._tempM4);
  }
  
  /**
   * Deactivate bullet and return to pool
   */
  _deactivateBullet(arrayIdx, bulletIdx) {
    const bullet = this._bulletData[bulletIdx];
    bullet.active = false;
    
    // Hide
    this._tempM4.makeScale(0, 0, 0);
    this.bulletMesh.setMatrixAt(bulletIdx, this._tempM4);
    this.trailMesh.setMatrixAt(bulletIdx, this._tempM4);
    
    this._bullets.splice(arrayIdx, 1);
    this._bulletPool.push(bulletIdx);
  }
  
  /**
   * Check bullet hits against enemies
   * @param {Object} enemyManager - EnemyManager instance
   * @param {Object} [stats] - Computed stats for explosive/piercing
   * @returns {Array} Array of hit events
   */
  checkHits(enemyManager, stats) {
    const hits = [];
    
    for (let i = this._bullets.length - 1; i >= 0; i--) {
      const idx = this._bullets[i];
      const bullet = this._bulletData[idx];
      
      if (!bullet.active) continue;
      
      const enemy = enemyManager.checkBulletHit(bullet.x, bullet.y, bullet.z);
      
      if (enemy) {
        // Skip enemies already pierced by this bullet
        if (bullet.piercedEnemies && bullet.piercedEnemies.has(enemy)) continue;
        
        // Hit enemy
        const result = enemyManager.damageEnemy(enemy, bullet.damage);
        
        hits.push({
          enemy,
          x: bullet.x,
          y: bullet.y,
          z: bullet.z,
          died: result.died
        });
        
        // Explosive AOE
        if (stats && stats.hasExplosive) {
          const radius = stats.explosiveRadius || 4.0;
          this.effects.explode(bullet.x, bullet.y, bullet.z, 0xff6600, 12, 5);
          if (this.effects.camCtrl) this.effects.camCtrl.shake(0.5);
          
          for (const other of enemyManager.enemies) {
            if (other === enemy || other.dead) continue;
            const dx = other.worldX - bullet.x;
            const dz = other.worldZ - bullet.z;
            if (dx * dx + dz * dz < radius * radius) {
              enemyManager.damageEnemy(other, bullet.damage);
              this.effects.explode(other.worldX, 1, other.worldZ, 0xff4400, 4, 3);
            }
          }
        } else {
          // Small hit particle
          this.effects.explode(bullet.x, bullet.y, bullet.z, 0xffee00, 3, 2);
        }
        
        // Piercing: continue through enemies instead of deactivating
        if (bullet.piercedEnemies && stats && stats.hasPiercing) {
          bullet.piercedEnemies.add(enemy);
          bullet.pierceHits++;
          if (bullet.pierceHits >= (stats.pierceCount || 1)) {
            this._deactivateBullet(i, idx);
          }
        } else {
          this._deactivateBullet(i, idx);
        }
      }
    }
    
    return hits;
  }
  
  /**
   * Clear all bullets
   */
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
