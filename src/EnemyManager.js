// src/EnemyManager.js — Manages enemies with different types

const ENEMY_DEFS_3D = {
  ogre: {
    walkSpeed: 1.5,
    hp: 80,
    maxHp: 80,
    scale: 2.0,
    color: 0x7a5a2a,
    hitColor: 0xffffff,
    coinValue: 10,
    size: { body: [1.2, 1.8, 0.7], head: [0.9, 0.9, 0.9] },
    isBoss: true,
  },
  fireDragon: {
    walkSpeed: 1.0,
    hp: 200,
    maxHp: 200,
    scale: 2.8,
    color: 0xcc3300,
    hitColor: 0xffff00,
    coinValue: 50,
    size: { body: [1.8, 2.0, 1.0], head: [1.2, 1.0, 1.2] },
    isBoss: true,
    isFireDragon: true,
  },
  zombie: {
    walkSpeed: 3.5,
    hp: 3,
    maxHp: 3,
    scale: 1.0,
    color: 0x5a8a3a,     // sickly green
    hitColor: 0xffffff,
    coinValue: 1,
    size: { body: [0.55, 0.85, 0.3], head: [0.4, 0.4, 0.4] },
  },
  fast: {
    walkSpeed: 7.0,
    hp: 1,
    maxHp: 1,
    scale: 0.8,
    color: 0x8a3a8a,     // purple
    hitColor: 0xffffff,
    coinValue: 1,
    size: { body: [0.45, 0.7, 0.25], head: [0.32, 0.32, 0.32] },
  },
  tank: {
    walkSpeed: 2.0,
    hp: 10,
    maxHp: 10,
    scale: 1.4,
    color: 0x8a4a2a,     // brown/rust
    hitColor: 0xffffff,
    coinValue: 3,
    size: { body: [0.9, 1.2, 0.5], head: [0.55, 0.5, 0.5] },
  },
  exploding: {
    walkSpeed: 5.0,
    hp: 2,
    maxHp: 2,
    scale: 0.9,
    color: 0xff6600,     // orange
    hitColor: 0xffffff,
    coinValue: 2,
    size: { body: [0.6, 0.6, 0.6], head: [0.5, 0.5, 0.5] },
    explodes: true,
    explodeRadius: 4.0,
  },
  giant: {
    walkSpeed: 1.2,
    hp: 150,
    maxHp: 150,
    scale: 2.4,
    color: 0x556655,     // dark stone green
    hitColor: 0xffffff,
    coinValue: 25,
    size: { body: [1.5, 2.2, 0.8], head: [1.0, 1.0, 1.0] },
    isBoss: true,
  },
  shield: {
    walkSpeed: 2.5,
    hp: 8,
    maxHp: 8,
    scale: 1.2,
    color: 0x4466aa,
    hitColor: 0xffffff,
    coinValue: 3,
    size: { body: [0.7, 1.0, 0.4], head: [0.45, 0.45, 0.45] },
    hasShield: true,
    shieldHp: 5,
  },
  jumping: {
    walkSpeed: 4.0,
    hp: 2,
    maxHp: 2,
    scale: 0.9,
    color: 0x44aa44,
    hitColor: 0xffffff,
    coinValue: 2,
    size: { body: [0.5, 0.7, 0.3], head: [0.35, 0.35, 0.35] },
    jumps: true,
  },
  ranged: {
    walkSpeed: 1.5,
    hp: 4,
    maxHp: 4,
    scale: 1.0,
    color: 0xaa4444,
    hitColor: 0xffffff,
    coinValue: 3,
    size: { body: [0.55, 0.85, 0.3], head: [0.4, 0.4, 0.4] },
    isRanged: true,
  },
  charger: {
    walkSpeed: 2.0,
    hp: 5,
    maxHp: 5,
    scale: 1.1,
    color: 0xcc8800,
    hitColor: 0xffffff,
    coinValue: 2,
    size: { body: [0.65, 0.9, 0.35], head: [0.42, 0.42, 0.42] },
    charges: true,
    chargeSpeed: 12.0,
    chargeDistance: 8.0,
  },
};

class EnemyManager {
  constructor(threeScene, effectsMgr) {
    this.scene = threeScene;
    this.effects = effectsMgr;
    this.enemies = [];     // Active enemy objects
    this._pool = [];       // Inactive THREE.Group objects for reuse
    
    // Temp objects
    this._tempV3 = new THREE.Vector3();
  }
  
  /**
   * Spawn a wave of enemies
   * @param {Array} waveDefs - Array of {count, enemyType, hp}
   * @param {number} spawnZ - World Z position to spawn at
   * @param {number} armyX - Army center X for spacing
   * @param {number} difficultyMult - HP multiplier
   */
  spawnWave(waveDefs, spawnZ, armyX, difficultyMult) {
    let totalIdx = 0;
    
    for (const wave of waveDefs) {
      const { count, enemyType, hp, xOffset } = wave;
      const def = ENEMY_DEFS_3D[enemyType] || ENEMY_DEFS_3D.zombie;
      
      // Grid layout
      const cols = Math.min(count, 5);
      const spacing = 1.8 * def.scale;
      // Flanking offset: shifts enemy group left/right
      const flankOffset = xOffset || 0;
      
      for (let i = 0; i < count; i++) {
        const enemy = this._getEnemy(enemyType);
        
        // Position in grid
        const row = Math.floor(i / cols);
        const col = i % cols;
        const rowWidth = Math.min(cols, count - row * cols);
        const xOff = (col - (rowWidth - 1) / 2) * spacing;
        const zOff = row * spacing * 1.2;
        
        // Randomize position slightly
        const rx = (Math.random() - 0.5) * 0.5;
        const rz = (Math.random() - 0.5) * 0.5;
        
        enemy.worldX = armyX + xOff + flankOffset + rx;
        enemy.worldZ = spawnZ - zOff + rz - totalIdx * 2;
        enemy.group.position.set(enemy.worldX, 0, enemy.worldZ);
        
        // Set HP with difficulty multiplier
        enemy.hp = Math.ceil((hp || def.hp) * difficultyMult);
        enemy.maxHp = enemy.hp;
        
        this.enemies.push(enemy);
        totalIdx++;
      }
    }
  }
  
  /**
   * Get an enemy from pool or create new
   */
  _getEnemy(type) {
    const def = ENEMY_DEFS_3D[type] || ENEMY_DEFS_3D.zombie;
    
    // Check pool for matching type
    let enemy = null;
    for (let i = 0; i < this._pool.length; i++) {
      if (this._pool[i].type === type) {
        enemy = this._pool.splice(i, 1)[0];
        break;
      }
    }
    
    if (!enemy) {
      // Create new enemy group
      enemy = this._createEnemy(type, def);
    }
    
    // Reset state
    enemy.hp = def.hp;
    enemy.maxHp = def.maxHp;
    enemy.walkPhase = Math.random() * Math.PI * 2;
    enemy.hitFlash = 0;
    enemy.dead = false;
    enemy.deathTimer = -1;
    enemy.worldX = 0;
    enemy.worldZ = 0;
    // New enemy type state
    enemy.shieldHp = def.shieldHp || 0;
    enemy.jumpTimer = 0;
    enemy.jumpY = 0;
    enemy.charging = false;
    
    enemy.group.visible = true;
    enemy.group.rotation.set(0, 0, 0);
    enemy.group.scale.set(def.scale, def.scale, def.scale);
    
    // Reset materials to base color
    enemy.bodyMesh.material.color.setHex(def.color);
    enemy.headMesh.material.color.setHex(def.color);
    
    // Reset HP bar
    if (enemy.hpBar) {
      enemy.hpBar.visible = false; // hidden at full HP
    }
    
    this.scene.add(enemy.group);
    
    return enemy;
  }
  
  /**
   * Create a new enemy THREE.Group
   */
  _createEnemy(type, def) {
    const group = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.BoxGeometry(...def.size.body);
    const bodyMat = new THREE.MeshLambertMaterial({ color: def.color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = def.size.body[1] / 2 + 0.3;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeo = new THREE.BoxGeometry(...def.size.head);
    const headMat = new THREE.MeshLambertMaterial({ color: def.color });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = body.position.y + def.size.body[1] / 2 + def.size.head[1] / 2;
    head.castShadow = true;
    group.add(head);
    
    // Arms
    const armW = def.size.body[0] * 0.3;
    const armH = def.size.body[1] * 0.6;
    const armGeo = new THREE.BoxGeometry(armW, armH, armW);
    const armMat = new THREE.MeshLambertMaterial({ color: def.color });
    
    const lArm = new THREE.Mesh(armGeo, armMat);
    lArm.position.set(-def.size.body[0] / 2 - armW / 2, body.position.y - 0.1, 0);
    lArm.castShadow = true;
    group.add(lArm);
    
    const rArm = new THREE.Mesh(armGeo, armMat.clone());
    rArm.position.set(def.size.body[0] / 2 + armW / 2, body.position.y - 0.1, 0);
    rArm.castShadow = true;
    group.add(rArm);
    
    // Legs
    const legW = def.size.body[0] * 0.35;
    const legH = 0.5;
    const legGeo = new THREE.BoxGeometry(legW, legH, legW);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    
    const lLeg = new THREE.Mesh(legGeo, legMat);
    lLeg.position.set(-def.size.body[0] * 0.25, 0.25, 0);
    lLeg.castShadow = true;
    group.add(lLeg);
    
    const rLeg = new THREE.Mesh(legGeo, legMat.clone());
    rLeg.position.set(def.size.body[0] * 0.25, 0.25, 0);
    rLeg.castShadow = true;
    group.add(rLeg);
    
    // Eyes (small emissive spheres)
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-def.size.head[0] * 0.25, head.position.y, def.size.head[2] / 2 + 0.02);
    group.add(lEye);
    
    const rEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    rEye.position.set(def.size.head[0] * 0.25, head.position.y, def.size.head[2] / 2 + 0.02);
    group.add(rEye);
    
    // --- Type-specific visual features ---
    this._addTypeFeatures(type, def, group, body, head);
    
    // --- HP bar (always-face-camera sprite) ---
    const hpBar = this._createHPBar(def);
    const hpBarY = head.position.y + def.size.head[1] / 2 + 0.5;
    hpBar.position.set(0, hpBarY, 0);
    group.add(hpBar);
    
    return {
      type,
      def,
      group,
      bodyMesh: body,
      headMesh: head,
      lArm,
      rArm,
      lLeg,
      rLeg,
      hpBar,
      hp: def.hp,
      maxHp: def.maxHp,
      walkPhase: 0,
      hitFlash: 0,
      dead: false,
      deathTimer: -1,
      worldX: 0,
      worldZ: 0,
      shieldHp: def.shieldHp || 0,
      jumpTimer: 0,
      jumpY: 0,
      charging: false
    };
  }
  
  /**
   * Add type-specific visual features for distinct silhouettes
   */
  _addTypeFeatures(type, def, group, body, head) {
    switch (type) {
      case 'zombie': {
        // Zombie: hunched posture with torn patches
        const patchGeo = new THREE.BoxGeometry(0.15, 0.15, 0.02);
        const patchMat = new THREE.MeshLambertMaterial({ color: 0x3a5a2a });
        for (let i = 0; i < 3; i++) {
          const patch = new THREE.Mesh(patchGeo, patchMat);
          patch.position.set(
            (Math.random() - 0.5) * def.size.body[0] * 0.8,
            body.position.y + (Math.random() - 0.5) * def.size.body[1] * 0.6,
            def.size.body[2] / 2 + 0.02
          );
          group.add(patch);
        }
        break;
      }
      case 'fast': {
        // Runner: spiky crest on head for speed look
        const crestGeo = new THREE.ConeGeometry(0.12, 0.3, 4);
        const crestMat = new THREE.MeshLambertMaterial({ color: 0xaa44aa });
        const crest = new THREE.Mesh(crestGeo, crestMat);
        crest.position.set(0, head.position.y + def.size.head[1] / 2 + 0.15, 0);
        group.add(crest);
        break;
      }
      case 'tank': {
        // Tank: shoulder armor plates
        const plateGeo = new THREE.BoxGeometry(0.25, 0.2, 0.35);
        const plateMat = new THREE.MeshLambertMaterial({ color: 0x665533 });
        const lPlate = new THREE.Mesh(plateGeo, plateMat);
        lPlate.position.set(-def.size.body[0] / 2 - 0.15, body.position.y + def.size.body[1] * 0.3, 0);
        group.add(lPlate);
        const rPlate = new THREE.Mesh(plateGeo, plateMat.clone());
        rPlate.position.set(def.size.body[0] / 2 + 0.15, body.position.y + def.size.body[1] * 0.3, 0);
        group.add(rPlate);
        // Belly plate
        const bellyGeo = new THREE.BoxGeometry(def.size.body[0] * 0.8, def.size.body[1] * 0.4, 0.1);
        const bellyMat = new THREE.MeshLambertMaterial({ color: 0x554422 });
        const belly = new THREE.Mesh(bellyGeo, bellyMat);
        belly.position.set(0, body.position.y - 0.1, def.size.body[2] / 2 + 0.06);
        group.add(belly);
        break;
      }
      case 'exploding': {
        // Exploder: glowing spikes around body
        const spikeMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
        for (let i = 0; i < 6; i++) {
          const spikeGeo = new THREE.ConeGeometry(0.06, 0.25, 4);
          const spike = new THREE.Mesh(spikeGeo, spikeMat);
          const angle = (i / 6) * Math.PI * 2;
          const r = def.size.body[0] * 0.5 + 0.08;
          spike.position.set(
            Math.cos(angle) * r,
            body.position.y,
            Math.sin(angle) * r
          );
          spike.rotation.z = -Math.cos(angle) * 0.8;
          spike.rotation.x = Math.sin(angle) * 0.8;
          group.add(spike);
        }
        break;
      }
      // Boss types: ogre, giant, fireDragon — already have large distinctive scale
      case 'ogre': {
        // Horns
        const hornGeo = new THREE.ConeGeometry(0.12, 0.5, 5);
        const hornMat = new THREE.MeshLambertMaterial({ color: 0x554422 });
        const lHorn = new THREE.Mesh(hornGeo, hornMat);
        lHorn.position.set(-0.3, head.position.y + def.size.head[1] * 0.4, 0);
        lHorn.rotation.z = 0.4;
        group.add(lHorn);
        const rHorn = new THREE.Mesh(hornGeo, hornMat);
        rHorn.position.set(0.3, head.position.y + def.size.head[1] * 0.4, 0);
        rHorn.rotation.z = -0.4;
        group.add(rHorn);
        break;
      }
      case 'fireDragon': {
        // Wings
        const wingGeo = new THREE.BoxGeometry(1.0, 0.05, 0.6);
        const wingMat = new THREE.MeshLambertMaterial({ color: 0xff4400 });
        const lWing = new THREE.Mesh(wingGeo, wingMat);
        lWing.position.set(-def.size.body[0] * 0.6, body.position.y + def.size.body[1] * 0.3, 0);
        lWing.rotation.z = 0.3;
        group.add(lWing);
        const rWing = new THREE.Mesh(wingGeo, wingMat);
        rWing.position.set(def.size.body[0] * 0.6, body.position.y + def.size.body[1] * 0.3, 0);
        rWing.rotation.z = -0.3;
        group.add(rWing);
        break;
      }
      case 'shield': {
        // Blue flat shield plane in front of body
        const shieldGeo = new THREE.BoxGeometry(def.size.body[0] * 1.4, def.size.body[1] * 1.1, 0.08);
        const shieldMat = new THREE.MeshLambertMaterial({ color: 0x5588cc, transparent: true, opacity: 0.8 });
        const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        shieldMesh.position.set(0, body.position.y, def.size.body[2] / 2 + 0.15);
        shieldMesh.userData.isShield = true;
        group.add(shieldMesh);
        break;
      }
      case 'jumping': {
        // Green longer legs (taller leg geometry) and crest
        const jumpCrestGeo = new THREE.ConeGeometry(0.1, 0.25, 4);
        const jumpCrestMat = new THREE.MeshLambertMaterial({ color: 0x22cc22 });
        const jumpCrest = new THREE.Mesh(jumpCrestGeo, jumpCrestMat);
        jumpCrest.position.set(0, head.position.y + def.size.head[1] / 2 + 0.12, 0);
        group.add(jumpCrest);
        break;
      }
      case 'ranged': {
        // Red arm pointing forward
        const bowGeo = new THREE.BoxGeometry(0.06, 0.06, 0.6);
        const bowMat = new THREE.MeshLambertMaterial({ color: 0xff2222 });
        const bow = new THREE.Mesh(bowGeo, bowMat);
        bow.position.set(def.size.body[0] / 2 + 0.15, body.position.y, -0.3);
        group.add(bow);
        break;
      }
      case 'charger': {
        // Orange shoulder pads (larger)
        const padGeo = new THREE.BoxGeometry(0.3, 0.25, 0.3);
        const padMat = new THREE.MeshLambertMaterial({ color: 0xff9900 });
        const lPad = new THREE.Mesh(padGeo, padMat);
        lPad.position.set(-def.size.body[0] / 2 - 0.18, body.position.y + def.size.body[1] * 0.35, 0);
        group.add(lPad);
        const rPad = new THREE.Mesh(padGeo, padMat.clone());
        rPad.position.set(def.size.body[0] / 2 + 0.18, body.position.y + def.size.body[1] * 0.35, 0);
        group.add(rPad);
        break;
      }
    }
  }
  
  /**
   * Create an HP bar using a Sprite (always faces camera)
   */
  _createHPBar(def) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    
    // Draw full green bar
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, 64, 8);
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(1, 1, 62, 6);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(mat);
    
    // Scale based on max HP (bigger enemies get wider bar)
    const barWidth = Math.max(0.8, Math.min(2.5, def.maxHp / 10));
    sprite.scale.set(barWidth, barWidth * 0.12, 1);
    
    return sprite;
  }
  
  /**
   * Update the HP bar visual for an enemy
   */
  _updateHPBar(enemy) {
    if (!enemy.hpBar) return;
    
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    
    const canvas = enemy.hpBar.material.map.image;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, 64, 8);
    
    // HP fill (green → yellow → red)
    let color;
    if (ratio > 0.6) color = '#44ff44';
    else if (ratio > 0.3) color = '#ffcc00';
    else color = '#ff3333';
    
    ctx.fillStyle = color;
    ctx.fillRect(1, 1, Math.max(0, 62 * ratio), 6);
    
    enemy.hpBar.material.map.needsUpdate = true;
    
    // Hide bar at full HP to reduce visual clutter
    enemy.hpBar.visible = ratio < 0.999;
  }
  
  /**
   * Update all enemies
   * @param {number} dt - Delta time
   * @param {number} armyX - Army X position
   * @returns {Object} { soldierLosses, killedEnemies }
   */
  update(dt, armyX) {
    let soldierLosses = 0;
    const killedEnemies = [];
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const def = enemy.def;
      
      // Death animation
      if (enemy.dead) {
        enemy.deathTimer += dt;
        
        // Fall animation (completes by 0.3s)
        const fallT = Math.min(enemy.deathTimer / 0.3, 1);
        enemy.group.rotation.x = fallT * Math.PI / 2;
        enemy.group.position.y = -fallT * 0.5;
        
        // Fade out (starts immediately, completes by 0.5s)
        const fadeT = Math.max(0, enemy.deathTimer / 0.5);
        const scale = def.scale * (1 - fadeT);
        enemy.group.scale.set(scale, scale, scale);
        
        if (enemy.deathTimer > 0.5) {
          // Remove enemy
          this._releaseEnemy(enemy);
          this.enemies.splice(i, 1);
        }
        continue;
      }
      
      // Walk toward army (positive Z direction)
      enemy.worldZ += def.walkSpeed * dt;
      enemy.group.position.z = enemy.worldZ;
      
      // Charger: speed up when close to army
      if (def.charges && enemy.worldZ > -(def.chargeDistance || 8)) {
        enemy.charging = true;
        enemy.worldZ += (def.chargeSpeed - def.walkSpeed) * dt;
        enemy.group.position.z = enemy.worldZ;
      }
      
      // Jumping: periodically jump
      if (def.jumps) {
        enemy.jumpTimer += dt;
        if (enemy.jumpTimer >= 3.0) {
          enemy.jumpTimer = 0;
        }
        // Jump during first 0.5s of cycle
        if (enemy.jumpTimer < 0.5) {
          enemy.jumpY = Math.sin((enemy.jumpTimer / 0.5) * Math.PI) * 2.0;
        } else {
          enemy.jumpY = 0;
        }
        enemy.group.position.y = enemy.jumpY;
      }
      
      // Walk animation
      enemy.walkPhase += dt * 6;
      const armSwing = Math.sin(enemy.walkPhase) * 0.6;
      const legSwing = Math.sin(enemy.walkPhase) * 0.5;
      const bounce = Math.abs(Math.sin(enemy.walkPhase)) * 0.08;
      
      enemy.lArm.rotation.x = armSwing;
      enemy.rArm.rotation.x = -armSwing;
      enemy.lLeg.rotation.x = -legSwing;
      enemy.rLeg.rotation.x = legSwing;
      enemy.bodyMesh.position.y = def.size.body[1] / 2 + 0.3 + bounce;
      enemy.headMesh.position.y = enemy.bodyMesh.position.y + def.size.body[1] / 2 + def.size.head[1] / 2;
      
      // Hit flash decay
      if (enemy.hitFlash > 0) {
        enemy.hitFlash -= dt * 8;
        if (enemy.hitFlash < 0) enemy.hitFlash = 0;
        
        const flashColor = new THREE.Color().lerpColors(
          new THREE.Color(def.color),
          new THREE.Color(0xffffff),
          enemy.hitFlash
        );
        enemy.bodyMesh.material.color.copy(flashColor);
        enemy.headMesh.material.color.copy(flashColor);
      }
      
      // Update HP bar
      this._updateHPBar(enemy);
      
      // Check if reached army
      if (enemy.worldZ > 1.5) {
        soldierLosses++;
        
        // Death effect
        this.effects.explode(enemy.worldX, 1, enemy.worldZ, 0xff0000, 8, 3);
        
        // Remove enemy
        this._releaseEnemy(enemy);
        this.enemies.splice(i, 1);
      }
    }
    
    return { soldierLosses, killedEnemies };
  }
  
  /**
   * Check if bullet hits any enemy
   * @param {number} bx - Bullet X
   * @param {number} by - Bullet Y
   * @param {number} bz - Bullet Z
   * @returns {Object|null} Enemy data or null
   */
  checkBulletHit(bx, by, bz) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      
      const def = enemy.def;
      const scale = def.scale;
      
      // Simple box collision
      const dx = Math.abs(bx - enemy.worldX);
      const dz = Math.abs(bz - enemy.worldZ);
      const hitW = (def.size.body[0] / 2 + 0.3) * scale;
      const hitD = (def.size.body[2] / 2 + 0.4) * scale;
      
      if (dx < hitW && dz < hitD && by > 0 && by < 2.5 * scale) {
        // Jumping enemies: bullets miss during jump
        if (def.jumps && enemy.jumpY > 1.0 && by < enemy.jumpY) {
          continue;
        }
        return enemy;
      }
    }
    return null;
  }
  
  /**
   * Apply damage to enemy
   * @param {Object} enemy - Enemy object
   * @param {number} damage - Damage amount
   * @returns {Object} { died, exploded }
   */
  damageEnemy(enemy, damage) {
    if (enemy.dead) return { died: false, exploded: false };
    
    // Shield absorbs damage first
    if (enemy.def.hasShield && enemy.shieldHp > 0) {
      enemy.shieldHp -= damage;
      enemy.hitFlash = 1.0;
      if (enemy.shieldHp <= 0) {
        enemy.shieldHp = 0;
        // Remove shield visual
        for (let c = enemy.group.children.length - 1; c >= 0; c--) {
          const child = enemy.group.children[c];
          if (child.userData && child.userData.isShield) {
            enemy.group.remove(child);
            break;
          }
        }
      }
      this._updateHPBar(enemy);
      if (window.audioManager) window.audioManager.enemyHit();
      return { died: false, exploded: false };
    }
    
    enemy.hp -= damage;
    enemy.hitFlash = 1.0;
    
    // Immediately update HP bar visual
    this._updateHPBar(enemy);
    
    if (window.audioManager) window.audioManager.enemyHit();
    
    if (enemy.hp <= 0) {
      enemy.dead = true;
      enemy.deathTimer = 0;
      
      if (window.audioManager) window.audioManager.enemyDeath();
      
      // Death particles
      this.effects.explode(enemy.worldX, 1, enemy.worldZ, enemy.def.color, 15, 4);
      
      // Check for explosion
      let exploded = false;
      if (enemy.def.explodes) {
        exploded = true;
        this._doExplosion(enemy);
      }
      
      return { died: true, exploded };
    }
    
    return { died: false, exploded: false };
  }
  
  /**
   * Handle exploding enemy AOE
   */
  _doExplosion(enemy) {
    const radius = enemy.def.explodeRadius || 4.0;
    
    // Big explosion effect
    this.effects.explode(enemy.worldX, 1.5, enemy.worldZ, 0xff6600, 30, 6);
    this.effects.screenFlash(0xff6600, 0.5);
    
    // Damage nearby enemies
    for (const other of this.enemies) {
      if (other === enemy || other.dead) continue;
      
      const dx = other.worldX - enemy.worldX;
      const dz = other.worldZ - enemy.worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < radius) {
        // Base explosion damage (defined in enemy def or default to 3)
        const baseExplosionDamage = enemy.def.explosionDamage || 3;
        const dmg = Math.ceil(baseExplosionDamage * (1 - dist / radius));
        this.damageEnemy(other, dmg);
      }
    }
  }
  
  /**
   * Release enemy back to pool
   */
  _releaseEnemy(enemy) {
    enemy.group.visible = false;
    this.scene.remove(enemy.group);
    this._pool.push(enemy);
  }
  
  /**
   * Clear all enemies
   */
  clear() {
    for (const enemy of this.enemies) {
      this._releaseEnemy(enemy);
    }
    this.enemies.length = 0;
  }
  
  /**
   * Get count of alive enemies
   */
  get count() {
    return this.enemies.filter(e => !e.dead).length;
  }
}
