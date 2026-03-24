// src/EffectsManager.js — Manages particles, flashes, shockwaves using THREE.InstancedMesh

class EffectsManager {
  constructor(threeScene, cameraController) {
    this.scene = threeScene;
    this.camCtrl = cameraController;

    // Particle system using InstancedMesh
    this.MAX_PARTICLES = 40;
    this.MAX_FLOATING_TEXTS = 3;
    this._particles = [];
    this._particlePool = [];

    const particleGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0
    });
    this.particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, this.MAX_PARTICLES);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);

    const colors = new Float32Array(this.MAX_PARTICLES * 3);
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }
    this.particleMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

    const hideMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particleMesh.setMatrixAt(i, hideMatrix);
      this._particlePool.push(i);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;

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

    const ringGeo = new THREE.RingGeometry(0.5, 1.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

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

    // Crate shatter fragments tracked separately
    this._crateFragments = [];

    // Temp objects for calculations
    this._tempMatrix = new THREE.Matrix4();
    this._tempColor = new THREE.Color();
  }

  // ───────────── Particle burst ─────────────

  explode(x, y, z, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const idx = this._particlePool.pop();
      if (idx === undefined) break;

      const particle = this._particleData[idx];
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.z = z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const v = speed * (0.5 + Math.random() * 0.5);
      particle.vx = Math.sin(phi) * Math.cos(theta) * v;
      particle.vy = Math.cos(phi) * v * 0.5 + 2;
      particle.vz = Math.sin(phi) * Math.sin(theta) * v;

      particle.life = 0.6 + Math.random() * 0.4;
      particle.maxLife = particle.life;
      particle.scale = 0.8 + Math.random() * 0.4;
      particle.color = color;

      this._particles.push(idx);
    }
  }

  // ───────────── Gate shockwave ─────────────

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

    this.explode(x, y + 1, z, color, 50, 6);
  }

  // ───────────── Muzzle flash ─────────────

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

  // ───────────── Hit spark ─────────────

  hitSpark(x, y, z) {
    this.explode(x, y, z, 0xffaa00, 4, 3);
  }

  // ───────────── Damage number (particle burst) ─────────────

  damageNumber(x, y, z, damage) {
    const count = Math.min(8, Math.max(2, Math.ceil(damage / 3)));
    this.explode(x, y + 1.5, z, 0xff2200, count, 2);
  }

  // ───────────── Soldier count feedback ─────────────

  soldierCountFeedback(x, count) {
    const color = count > 0 ? 0x44ff88 : 0xff4444;
    const particles = Math.min(15, Math.abs(count));
    this.explode(x, 2, 0, color, particles, 4);
  }

  // ───────────── Soldier count floating text ─────────────

  soldierCountText(x, count) {
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

  // ───────────── Spawn count number ─────────────

  spawnCountNumber(value, armyX, armyZ) {
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

  // ───────────── Boss stomp shockwave ─────────────

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

  // ───────────── Dust trail (single particle) ─────────────

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
    p.vz = 1.0 + Math.random() * 0.5;
    p.life = 0.3;
    p.maxLife = 0.3;
    p.scale = 0.4 + Math.random() * 0.3;
    p.color = 0xccbbaa;

    this._particles.push(idx);
  }

  // ───────────── Generic shockwave ─────────────

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

  // ───────────── Gate ambient light ─────────────

  updateGateAmbient(distance, gateColor) {
    if (distance <= 20) {
      this._gateAmbientLight.color.setHex(gateColor);
      this._gateAmbientLight.intensity = 0.15 * Math.max(0, 1 - distance / 20);
    } else {
      this._gateAmbientLight.intensity = Math.max(0, this._gateAmbientLight.intensity - 0.05);
    }
  }

  // ───────────── Dust trail system (per-frame) ─────────────

  updateDustTrail(dt, armyX, armyZ, formationWidth, formationDepth) {
    if (this.marchDust) {
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
      const s = 1 + 0.8 * t;
      d.mesh.scale.set(s, s, s);
    }
  }

  // ───────────── Camera shake ─────────────

  cameraShake(intensity) {
    if (this.camCtrl && this.camCtrl.shake) {
      this.camCtrl.shake(intensity);
    }
  }

  // ───────────── Screen flash ─────────────

  screenFlash(color, intensity) {
    this._screenFlashAlpha = Math.min(1, intensity);
    this._screenFlashColor = color;
  }

  // ───────────── NEW: Spawn damage number sprite ─────────────

  spawnDamageNumber(damage, worldX, worldZ) {
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
    ctx.fillStyle = '#ffffff';
    ctx.fillText('-' + damage, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1.0 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(worldX, 2.0, worldZ);
    sprite.scale.set(1.5, 0.75, 1);
    this.scene.add(sprite);

    // +0.02 Y per frame at 60fps ≈ speed 1.2/s; 0.8s lifetime
    this._floatingTexts.push({ sprite, life: 0, maxLife: 0.8, texture, speed: 1.2 });
  }

  // ───────────── NEW: Death poof (reuses explode) ─────────────

  spawnDeathPoof(worldX, worldZ, color) {
    const count = 4 + Math.floor(Math.random() * 3); // 4-6
    this.explode(worldX, 1.0, worldZ, color || 0xCC0000, count, 3);
  }

  // ───────────── NEW: Crate shatter fragments ─────────────

  spawnCrateShatter(worldX, worldZ) {
    const fragCount = 6 + Math.floor(Math.random() * 3); // 6-8
    const fragGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);

    for (let i = 0; i < fragCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x8B4513,
        transparent: true,
        opacity: 1.0
      });
      const mesh = new THREE.Mesh(fragGeo, mat);
      mesh.position.set(worldX, 0.5, worldZ);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      mesh.userData._vx = Math.cos(angle) * speed;
      mesh.userData._vy = 2 + Math.random() * 3;
      mesh.userData._vz = Math.sin(angle) * speed;

      this.scene.add(mesh);
      this._crateFragments.push({ mesh, life: 0, maxLife: 0.6 });
    }
  }

  // ───────────── Update all effects ─────────────

  update(dt) {
    // --- Particles (InstancedMesh) ---
    const deadParticles = [];

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const idx = this._particles[i];
      const p = this._particleData[idx];

      if (!p.active) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 9.8 * dt;

      p.life -= dt;

      if (p.life <= 0 || p.y < -1) {
        p.active = false;
        deadParticles.push(i);
        continue;
      }

      const lifeRatio = p.life / p.maxLife;
      const scale = p.scale * lifeRatio;

      this._tempMatrix.makeTranslation(p.x, p.y, p.z);
      this._tempMatrix.scale(new THREE.Vector3(scale, scale, scale));
      this.particleMesh.setMatrixAt(idx, this._tempMatrix);

      this._tempColor.setHex(p.color);
      this.particleMesh.setColorAt(idx, this._tempColor);
    }

    for (let i = deadParticles.length - 1; i >= 0; i--) {
      const arrayIdx = deadParticles[i];
      const particleIdx = this._particles[arrayIdx];

      this._tempMatrix.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(particleIdx, this._tempMatrix);

      this._particlePool.push(particleIdx);
      this._particles.splice(arrayIdx, 1);
    }

    if (this._particles.length > 0 || deadParticles.length > 0) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }

    // --- Shockwaves ---
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

      const maxScale = sw.targetScale || 7;
      const scale = 1 + t * (maxScale - 1);
      sw.mesh.scale.set(scale, scale, scale);
      sw.mesh.material.opacity = (1 - t) * 0.8;
    }

    // --- Muzzle flashes ---
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

      const scale = 1 - t * 0.5;
      mf.mesh.scale.set(scale, scale, scale);
      mf.mesh.material.opacity = 1 - t;
    }

    // --- Floating texts (shared by spawnCountNumber, soldierCountText, spawnDamageNumber) ---
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

    // --- Crate shatter fragments ---
    for (let i = this._crateFragments.length - 1; i >= 0; i--) {
      const frag = this._crateFragments[i];
      frag.life += dt;
      const t = frag.life / frag.maxLife;

      if (t >= 1) {
        this.scene.remove(frag.mesh);
        frag.mesh.geometry.dispose();
        frag.mesh.material.dispose();
        this._crateFragments.splice(i, 1);
        continue;
      }

      const m = frag.mesh;
      m.position.x += m.userData._vx * dt;
      m.position.y += m.userData._vy * dt;
      m.position.z += m.userData._vz * dt;
      m.userData._vy -= 9.8 * dt;

      m.rotation.x += dt * 5;
      m.rotation.z += dt * 3;

      m.material.opacity = 1 - t;
    }

    // --- Screen flash ---
    if (this._screenFlashAlpha > 0) {
      this._screenFlashAlpha -= dt * this._screenFlashDecay;
      if (this._screenFlashAlpha < 0) this._screenFlashAlpha = 0;
    }
  }

  // ───────────── Getters ─────────────

  get screenFlashAlpha() {
    return this._screenFlashAlpha;
  }

  get screenFlashColor() {
    return this._screenFlashColor;
  }

  // ───────────── Clear all effects ─────────────

  clear() {
    // Particles
    for (const idx of this._particles) {
      this._particleData[idx].active = false;
      this._tempMatrix.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(idx, this._tempMatrix);
      this._particlePool.push(idx);
    }
    this._particles.length = 0;
    this.particleMesh.instanceMatrix.needsUpdate = true;

    // Shockwaves
    for (const sw of this._shockwaves) {
      sw.mesh.visible = false;
      this._shockwavePool.push(sw.mesh);
    }
    this._shockwaves.length = 0;

    // Muzzle flashes
    for (const mf of this._muzzleFlashes) {
      mf.mesh.visible = false;
      this._muzzleFlashPool.push(mf.mesh);
    }
    this._muzzleFlashes.length = 0;

    // Screen flash
    this._screenFlashAlpha = 0;

    // Floating texts
    for (const ft of this._floatingTexts) {
      this.scene.remove(ft.sprite);
      ft.sprite.material.map.dispose();
      ft.sprite.material.dispose();
    }
    this._floatingTexts.length = 0;

    // Dust particles
    for (const d of this._activeDust) {
      d.mesh.visible = false;
      this._dustPool.push(d.mesh);
    }
    this._activeDust.length = 0;
    this.marchDust = false;

    // Crate fragments
    for (const frag of this._crateFragments) {
      this.scene.remove(frag.mesh);
      frag.mesh.geometry.dispose();
      frag.mesh.material.dispose();
    }
    this._crateFragments.length = 0;

    // Gate ambient light
    this._gateAmbientLight.intensity = 0;
  }
}
