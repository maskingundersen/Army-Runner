// src/EffectsManager.js — Manages particles, flashes, shockwaves using THREE.InstancedMesh

class EffectsManager {
  constructor(threeScene, cameraController) {
    this.scene = threeScene;
    this.camCtrl = cameraController;
    
    // Particle system using InstancedMesh
    this.MAX_PARTICLES = 40;
    this.MAX_FLOATING_TEXTS = 3; // cap on concurrent floating count sprites
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
    
    // Dust trail particle pool (dedicated meshes, capped at 25)
    this._dustPool = [];
    this._activeDust = [];
    const dustGeo = new THREE.SphereGeometry(0.12, 4, 4);
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xccbbaa, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 25; i++) {
      const mesh = new THREE.Mesh(dustGeo, dustMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this._dustPool.push(mesh);
    }
    this.marchDust = false;
    
    // Gate approach ambient light
    this._gateAmbientLight = new THREE.AmbientLight(0x00ff44, 0);
    this.scene.add(this._gateAmbientLight);
    
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
    // Cap at MAX_FLOATING_TEXTS — evict oldest if over limit
    if (this._floatingTexts.length >= this.MAX_FLOATING_TEXTS) {
      const oldest = this._floatingTexts.shift();
      this.scene.remove(oldest.sprite);
      oldest.texture.dispose();
      oldest.sprite.material.dispose();
    }

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

    this._floatingTexts.push({ sprite, life: 0, maxLife: 1.0, texture, speed: 2 });
  }
  
  /**
   * Spawn floating count number above the army (e.g. "+20" or "-5")
   * White text with colored stroke
   * @param {number} value - Soldiers gained (positive) or lost (negative)
   * @param {number} armyX - Army X position
   * @param {number} armyZ - Army Z position
   */
  spawnCountNumber(value, armyX, armyZ) {
    // Cap at MAX_FLOATING_TEXTS — evict oldest if over limit
    if (this._floatingTexts.length >= this.MAX_FLOATING_TEXTS) {
      const oldest = this._floatingTexts.shift();
      this.scene.remove(oldest.sprite);
      oldest.texture.dispose();
      oldest.sprite.material.dispose();
    }

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 64);
    
    const text = (value > 0 ? '+' : '') + value;
    const strokeColor = value > 0 ? '#00ff44' : '#ff2222';
    
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 4;
    ctx.strokeText(text, 64, 32);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 64, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1.0 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(armyX, 4.5, armyZ - 2);
    sprite.scale.set(2, 1, 1);
    this.scene.add(sprite);
    
    this._floatingTexts.push({ sprite, life: 0, maxLife: 1.2, texture, speed: 1.5 });
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
    const idx = this._particlePool.pop();
    if (idx === undefined) return;

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
  
  /**
   * Spawn an expanding shockwave ring on the ground
   * @param {number} x - World X position
   * @param {number} z - World Z position
   * @param {number} color - Hex color (default 0xff6600)
   */
  spawnShockwave(x, z, color) {
    const ring = this._shockwavePool.pop();
    if (!ring) return;
    
    ring.visible = true;
    ring.position.set(x, 0.05, z);
    ring.scale.set(1, 1, 1);
    ring.material.color.setHex(color || 0xff6600);
    ring.material.opacity = 0.7;
    
    this._shockwaves.push({
      mesh: ring,
      life: 0,
      maxLife: 0.6,
      color: color || 0xff6600,
      targetScale: 8
    });
  }
  
  /**
   * Update gate approach ambient light
   * @param {number} distance - Distance to nearest gate
   * @param {number} gateColor - Hex color of the nearest gate
   */
  updateGateAmbient(distance, gateColor) {
    if (distance <= 20) {
      this._gateAmbientLight.color.setHex(gateColor);
      this._gateAmbientLight.intensity = 0.15 * Math.max(0, 1 - distance / 20);
    } else {
      this._gateAmbientLight.intensity = Math.max(0, this._gateAmbientLight.intensity - 0.05);
    }
  }
  
  /**
   * Update persistent dust trail system each frame while army is marching
   * @param {number} dt - Delta time
   * @param {number} armyX - Army X position
   * @param {number} armyZ - Army Z position
   * @param {number} formationWidth - Width of army formation
   * @param {number} formationDepth - Depth of army formation
   */
  updateDustTrail(dt, armyX, armyZ, formationWidth, formationDepth) {
    // Only emit when marchDust is enabled
    if (this.marchDust) {
      // Spawn 2-3 new particles per frame
      const spawnCount = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < spawnCount; i++) {
        if (this._dustPool.length === 0) break;
        const mesh = this._dustPool.pop();
        mesh.visible = true;
        mesh.position.set(
          armyX + (Math.random() - 0.5) * formationWidth,
          0.1,
          armyZ + (Math.random() - 0.5) * formationDepth
        );
        mesh.scale.set(1, 1, 1);
        mesh.material.opacity = 0.5;
        this._activeDust.push({
          mesh,
          vx: (Math.random() - 0.5) * 0.3,
          vy: Math.random() * 0.15 + 0.05,
          vz: 0.4 + Math.random() * 0.3,
          life: 0,
          maxLife: 0.8
        });
      }
    }
    
    // Always update active dust particles (even if not spawning new ones)
    for (let i = this._activeDust.length - 1; i >= 0; i--) {
      const d = this._activeDust[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        d.mesh.visible = false;
        this._dustPool.push(d.mesh);
        this._activeDust.splice(i, 1);
        continue;
      }
      const t = d.life / d.maxLife;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      d.mesh.material.opacity = 0.5 * (1 - t);
      const s = 1 + 0.8 * t; // scale 1 → 1.8
      d.mesh.scale.set(s, s, s);
    }
  }
  
  /**
   * Trigger camera shake (delegates to CameraController)
   * @param {number} intensity - Shake intensity
   */
  cameraShake(intensity) {
    if (this.camCtrl && this.camCtrl.shake) {
      this.camCtrl.shake(intensity);
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
      
      ft.sprite.position.y += dt * (ft.speed || 2);
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
    
    // Clear dust particles
    for (const d of this._activeDust) {
      d.mesh.visible = false;
      this._dustPool.push(d.mesh);
    }
    this._activeDust.length = 0;
    this.marchDust = false;
    
    // Reset gate ambient light
    this._gateAmbientLight.intensity = 0;
  }
}
