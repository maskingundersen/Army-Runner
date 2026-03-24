// src/EffectsManager.js — Manages particles, flashes, shockwaves using THREE.InstancedMesh

class EffectsManager {
  constructor(threeScene, cameraController) {
    this.scene = threeScene;
    this.camCtrl = cameraController;
    
    // Particle system using InstancedMesh
    this.MAX_PARTICLES = 600;
    this._particles = [];
    this._particlePool = [];
    
    // Create instanced mesh for particles
    const particleGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const particleMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 1.0
    });
    this.particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, this.MAX_PARTICLES);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    
    // Initialize instanceColor for per-particle coloring
    const colors = new Float32Array(this.MAX_PARTICLES * 3);
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      colors[i * 3] = 1;     // R
      colors[i * 3 + 1] = 1; // G
      colors[i * 3 + 2] = 1; // B
    }
    this.particleMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    
    // Initialize all particles to hidden (scale 0)
    const hideMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particleMesh.setMatrixAt(i, hideMatrix);
      this._particlePool.push(i);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    
    // Per-particle data
    this._particleData = new Array(this.MAX_PARTICLES).fill(null).map(() => ({
      active: false,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      life: 0,
      maxLife: 1,
      scale: 1,
      color: 0xffffff
    }));
    
    // Gate shockwave effects
    this._shockwaves = [];
    this._shockwavePool = [];
    
    // Create shockwave ring geometry (reused)
    const ringGeo = new THREE.RingGeometry(0.5, 1.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ff88, 
      transparent: true, 
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    // Pre-create shockwave meshes
    for (let i = 0; i < 10; i++) {
      const ring = new THREE.Mesh(ringGeo.clone(), ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this.scene.add(ring);
      this._shockwavePool.push(ring);
    }
    
    // Muzzle flash list
    this._muzzleFlashes = [];
    this._muzzleFlashPool = [];
    
    // Create muzzle flash sprites
    const flashGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ 
      color: 0xffff00, 
      transparent: true,
      opacity: 1.0
    });
    
    for (let i = 0; i < 30; i++) {
      const flash = new THREE.Mesh(flashGeo, flashMat.clone());
      flash.visible = false;
      this.scene.add(flash);
      this._muzzleFlashPool.push(flash);
    }
    
    // Screen flash state
    this._screenFlashAlpha = 0;
    this._screenFlashColor = 0x00ff88;
    this._screenFlashDecay = 5;
    
    // Floating text sprites
    this._floatingTexts = [];
    
    // Temp objects for calculations
    this._tempMatrix = new THREE.Matrix4();
    this._tempColor = new THREE.Color();
  }
  
  /**
   * Spawn explosion burst particles
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @param {number} z - World Z position
   * @param {number} color - Hex color
   * @param {number} count - Number of particles
   * @param {number} speed - Initial velocity magnitude
   */
  explode(x, y, z, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const idx = this._particlePool.pop();
      if (idx === undefined) break;
      
      const particle = this._particleData[idx];
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.z = z;
      
      // Random spherical velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const v = speed * (0.5 + Math.random() * 0.5);
      particle.vx = Math.sin(phi) * Math.cos(theta) * v;
      particle.vy = Math.cos(phi) * v * 0.5 + 2; // Bias upward
      particle.vz = Math.sin(phi) * Math.sin(theta) * v;
      
      particle.life = 0.6 + Math.random() * 0.4;
      particle.maxLife = particle.life;
      particle.scale = 0.8 + Math.random() * 0.4;
      particle.color = color;
      
      this._particles.push(idx);
    }
  }
  
  /**
   * Spawn gate shockwave effect
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @param {number} z - World Z position
   * @param {number} color - Hex color
   */
  gateEffect(x, y, z, color) {
    const ring = this._shockwavePool.pop();
    if (!ring) return;
    
    ring.visible = true;
    ring.position.set(x, y + 0.1, z);
    ring.scale.set(0.5, 0.5, 0.5);
    ring.material.color.setHex(color);
    ring.material.opacity = 0.9;
    
    this._shockwaves.push({
      mesh: ring,
      life: 0,
      maxLife: 0.6,
      color: color
    });
    
    // Also spawn more particles for enhanced gate pass burst
    this.explode(x, y + 1, z, color, 50, 6);
  }
  
  /**
   * Spawn muzzle flash at position
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @param {number} z - World Z position
   */
  muzzleFlash(x, y, z) {
    const flash = this._muzzleFlashPool.pop();
    if (!flash) return;
    
    flash.visible = true;
    flash.position.set(x, y, z);
    flash.scale.set(1, 1, 1);
    flash.material.opacity = 1.0;
    
    this._muzzleFlashes.push({
      mesh: flash,
      life: 0,
      maxLife: 0.08
    });
  }
  
  /**
   * Spawn hit sparks at position (for enemy damage feedback)
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @param {number} z - World Z position
   */
  hitSpark(x, y, z) {
    this.explode(x, y, z, 0xffaa00, 4, 3);
  }
  
  /**
   * Spawn floating damage number (burst of red particles upward)
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @param {number} z - World Z position
   * @param {number} damage - Damage dealt (more = more particles)
   */
  damageNumber(x, y, z, damage) {
    const count = Math.min(8, Math.max(2, Math.ceil(damage / 3)));
    this.explode(x, y + 1.5, z, 0xff2200, count, 2);
  }
  
  /**
   * Spawn soldier count change feedback
   * @param {number} x - World X position
   * @param {number} count - Soldiers gained (positive) or lost (negative)
   */
  soldierCountFeedback(x, count) {
    const color = count > 0 ? 0x44ff88 : 0xff4444;
    const particles = Math.min(15, Math.abs(count));
    this.explode(x, 2, 0, color, particles, 4);
  }
  
  /**
   * Spawn floating text showing soldier count change (e.g. "+20" or "-5")
   * @param {number} x - World X position
   * @param {number} count - Soldiers gained (positive) or lost (negative)
   */
  soldierCountText(x, count) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 64);
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = count > 0 ? '#44ff88' : '#ff4444';
    ctx.fillText((count > 0 ? '+' : '') + count, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1.0 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, 3, 0);
    sprite.scale.set(2, 1, 1);
    this.scene.add(sprite);

    this._floatingTexts.push({ sprite, life: 0, maxLife: 1.0, texture });
  }
  
  /**
   * Spawn boss stomp shockwave on the ground
   * @param {number} x - World X position
   * @param {number} z - World Z position
   */
  bossStompShockwave(x, z) {
    const ring = this._shockwavePool.pop();
    if (!ring) return;
    
    ring.visible = true;
    ring.position.set(x, 0.1, z);
    ring.scale.set(1, 1, 1);
    ring.material.color.setHex(0xff4400);
    ring.material.opacity = 0.8;
    
    this._shockwaves.push({
      mesh: ring,
      life: 0,
      maxLife: 0.5,
      color: 0xff4400,
      targetScale: 8
    });
  }
  
  /**
   * Spawn dust trail particles behind the army
   * @param {number} x - World X position
   * @param {number} z - World Z position
   */
  dustTrail(x, z) {
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const idx = this._particlePool.pop();
      if (idx === undefined) break;
      
      const p = this._particleData[idx];
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.5;
      p.y = 0.1 + Math.random() * 0.2;
      p.z = z + (Math.random() - 0.5) * 0.3;
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vy = 0.5 + Math.random() * 0.5;
      p.vz = 1.0 + Math.random() * 0.5; // backward (positive z = behind)
      p.life = 0.3;
      p.maxLife = 0.3;
      p.scale = 0.4 + Math.random() * 0.3;
      p.color = 0xccbbaa;
      
      this._particles.push(idx);
    }
  }
  
  /**
   * Trigger screen flash overlay
   * @param {number} color - Hex color
   * @param {number} intensity - Flash intensity (0-1)
   */
  screenFlash(color, intensity) {
    this._screenFlashAlpha = Math.min(1, intensity);
    this._screenFlashColor = color;
  }
  
  /**
   * Update all effects each frame
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Update particles
    const deadParticles = [];
    
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const idx = this._particles[i];
      const p = this._particleData[idx];
      
      if (!p.active) continue;
      
      // Physics
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 9.8 * dt; // Gravity
      
      // Decay
      p.life -= dt;
      
      if (p.life <= 0 || p.y < -1) {
        p.active = false;
        deadParticles.push(i);
        continue;
      }
      
      // Update instanced matrix
      const lifeRatio = p.life / p.maxLife;
      const scale = p.scale * lifeRatio;
      
      this._tempMatrix.makeTranslation(p.x, p.y, p.z);
      this._tempMatrix.scale(new THREE.Vector3(scale, scale, scale));
      this.particleMesh.setMatrixAt(idx, this._tempMatrix);
      
      // Update color
      this._tempColor.setHex(p.color);
      this.particleMesh.setColorAt(idx, this._tempColor);
    }
    
    // Remove dead particles
    for (let i = deadParticles.length - 1; i >= 0; i--) {
      const arrayIdx = deadParticles[i];
      const particleIdx = this._particles[arrayIdx];
      
      // Hide particle
      this._tempMatrix.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(particleIdx, this._tempMatrix);
      
      // Return to pool
      this._particlePool.push(particleIdx);
      this._particles.splice(arrayIdx, 1);
    }
    
    if (this._particles.length > 0 || deadParticles.length > 0) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }
    
    // Update shockwaves
    for (let i = this._shockwaves.length - 1; i >= 0; i--) {
      const sw = this._shockwaves[i];
      sw.life += dt;
      
      const t = sw.life / sw.maxLife;
      
      if (t >= 1) {
        sw.mesh.visible = false;
        this._shockwavePool.push(sw.mesh);
        this._shockwaves.splice(i, 1);
        continue;
      }
      
      // Expand and fade
      const maxScale = sw.targetScale || 7;
      const scale = 1 + t * (maxScale - 1);
      sw.mesh.scale.set(scale, scale, scale);
      sw.mesh.material.opacity = (1 - t) * 0.8;
    }
    
    // Update muzzle flashes
    for (let i = this._muzzleFlashes.length - 1; i >= 0; i--) {
      const mf = this._muzzleFlashes[i];
      mf.life += dt;
      
      const t = mf.life / mf.maxLife;
      
      if (t >= 1) {
        mf.mesh.visible = false;
        this._muzzleFlashPool.push(mf.mesh);
        this._muzzleFlashes.splice(i, 1);
        continue;
      }
      
      // Shrink and fade
      const scale = 1 - t * 0.5;
      mf.mesh.scale.set(scale, scale, scale);
      mf.mesh.material.opacity = 1 - t;
    }
    
    // Update floating texts
    for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
      const ft = this._floatingTexts[i];
      ft.life += dt;
      const t = ft.life / ft.maxLife;
      
      if (t >= 1) {
        this.scene.remove(ft.sprite);
        ft.sprite.material.map.dispose();
        ft.sprite.material.dispose();
        this._floatingTexts.splice(i, 1);
        continue;
      }
      
      ft.sprite.position.y += dt * 2;
      ft.sprite.material.opacity = 1 - t;
    }
    
    // Update screen flash
    if (this._screenFlashAlpha > 0) {
      this._screenFlashAlpha -= dt * this._screenFlashDecay;
      if (this._screenFlashAlpha < 0) this._screenFlashAlpha = 0;
    }
  }
  
  /**
   * Get current screen flash alpha for overlay
   */
  get screenFlashAlpha() {
    return this._screenFlashAlpha;
  }
  
  /**
   * Get current screen flash color
   */
  get screenFlashColor() {
    return this._screenFlashColor;
  }
  
  /**
   * Clear all effects
   */
  clear() {
    // Clear particles
    for (const idx of this._particles) {
      this._particleData[idx].active = false;
      this._tempMatrix.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(idx, this._tempMatrix);
      this._particlePool.push(idx);
    }
    this._particles.length = 0;
    this.particleMesh.instanceMatrix.needsUpdate = true;
    
    // Clear shockwaves
    for (const sw of this._shockwaves) {
      sw.mesh.visible = false;
      this._shockwavePool.push(sw.mesh);
    }
    this._shockwaves.length = 0;
    
    // Clear muzzle flashes
    for (const mf of this._muzzleFlashes) {
      mf.mesh.visible = false;
      this._muzzleFlashPool.push(mf.mesh);
    }
    this._muzzleFlashes.length = 0;
    
    // Clear screen flash
    this._screenFlashAlpha = 0;
    
    // Clear floating texts
    for (const ft of this._floatingTexts) {
      this.scene.remove(ft.sprite);
      ft.sprite.material.map.dispose();
      ft.sprite.material.dispose();
    }
    this._floatingTexts.length = 0;
  }
}
