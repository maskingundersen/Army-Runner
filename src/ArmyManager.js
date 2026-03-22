// src/ArmyManager.js — Manages soldier army using THREE.InstancedMesh for performance

class ArmyManager {
  constructor(threeScene) {
    this.scene = threeScene;
    this.MAX = 200;
    
    // Create instanced meshes for soldier body parts
    // Body - green torso
    const bodyGeo = new THREE.BoxGeometry(0.55, 0.85, 0.3);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4a7c45 });
    this.bodyInst = new THREE.InstancedMesh(bodyGeo, bodyMat, this.MAX);
    this.bodyInst.castShadow = true;
    this.bodyInst.receiveShadow = true;
    this.scene.add(this.bodyInst);
    
    // Head - skin color
    const headGeo = new THREE.BoxGeometry(0.36, 0.36, 0.36);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xe8b89a });
    this.headInst = new THREE.InstancedMesh(headGeo, headMat, this.MAX);
    this.headInst.castShadow = true;
    this.scene.add(this.headInst);
    
    // Helmet - dark green
    const helmetGeo = new THREE.BoxGeometry(0.42, 0.18, 0.42);
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0x1f3d1f });
    this.helmetInst = new THREE.InstancedMesh(helmetGeo, helmetMat, this.MAX);
    this.helmetInst.castShadow = true;
    this.scene.add(this.helmetInst);
    
    // Left Arm - green
    const armGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x4a7c45 });
    this.lArmInst = new THREE.InstancedMesh(armGeo, armMat, this.MAX);
    this.lArmInst.castShadow = true;
    this.scene.add(this.lArmInst);
    
    // Right Arm - green
    this.rArmInst = new THREE.InstancedMesh(armGeo, armMat.clone(), this.MAX);
    this.rArmInst.castShadow = true;
    this.scene.add(this.rArmInst);
    
    // Left Leg - dark pants
    const legGeo = new THREE.BoxGeometry(0.22, 0.5, 0.22);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2a3a5a });
    this.lLegInst = new THREE.InstancedMesh(legGeo, legMat, this.MAX);
    this.lLegInst.castShadow = true;
    this.scene.add(this.lLegInst);
    
    // Right Leg - dark pants
    this.rLegInst = new THREE.InstancedMesh(legGeo, legMat.clone(), this.MAX);
    this.rLegInst.castShadow = true;
    this.scene.add(this.rLegInst);
    
    // Gun - dark metal (default handgun)
    this._weaponGeos = {
      handgun:  new THREE.BoxGeometry(0.07, 0.07, 0.35),
      assault:  new THREE.BoxGeometry(0.06, 0.06, 0.6),
      shotgun:  new THREE.BoxGeometry(0.09, 0.09, 0.45),
      minigun:  new THREE.BoxGeometry(0.10, 0.10, 0.7),
      rocket:   new THREE.BoxGeometry(0.12, 0.12, 0.55),
      sniper:   new THREE.BoxGeometry(0.05, 0.05, 0.8),
    };
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    this.gunInst = new THREE.InstancedMesh(this._weaponGeos.handgun, gunMat, this.MAX);
    this.gunInst.castShadow = true;
    this.scene.add(this.gunInst);
    this._currentWeaponType = 'handgun';
    
    // Initialize all instances to scale(0,0,0)
    const hideMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.MAX; i++) {
      this.bodyInst.setMatrixAt(i, hideMatrix);
      this.headInst.setMatrixAt(i, hideMatrix);
      this.helmetInst.setMatrixAt(i, hideMatrix);
      this.lArmInst.setMatrixAt(i, hideMatrix);
      this.rArmInst.setMatrixAt(i, hideMatrix);
      this.lLegInst.setMatrixAt(i, hideMatrix);
      this.rLegInst.setMatrixAt(i, hideMatrix);
      this.gunInst.setMatrixAt(i, hideMatrix);
    }
    this._markNeedsUpdate();
    
    // Per-soldier data
    this._soldiers = [];
    for (let i = 0; i < this.MAX; i++) {
      this._soldiers.push({
        active: false,
        x: 0,
        z: 0,
        targetX: 0,
        targetZ: 0,
        phase: Math.random() * Math.PI * 2, // Walk animation phase
        spawnScale: 0,
        deathTimer: -1, // -1 = alive, >=0 = dying
        deathAngle: 0,
        offsetX: (Math.random() - 0.5) * 0.3, // Slight random formation offset
        offsetZ: (Math.random() - 0.5) * 0.3
      });
    }
    
    // Pre-allocate temp objects to avoid GC
    this._tempM4 = new THREE.Matrix4();
    this._tempQ = new THREE.Quaternion();
    this._tempV3 = new THREE.Vector3();
    this._tempE = new THREE.Euler();
    this._tempM4b = new THREE.Matrix4();
    this._tempM4c = new THREE.Matrix4();
    
    this._activeCount = 0;
    
    this._createCompanions();
  }

  setWeaponType(type) {
    if (type === this._currentWeaponType) return;
    if (!this._weaponGeos[type]) return;
    this._currentWeaponType = type;
    // Swap geometry on gun instanced mesh
    this.gunInst.geometry.dispose();
    this.gunInst.geometry = this._weaponGeos[type];
    this._markNeedsUpdate();
  }

  _createCompanions() {
    // Drone - small metallic box with propellers
    const droneGroup = new THREE.Group();
    const droneBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.15, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x888899 })
    );
    droneBody.position.y = 3.5;
    droneGroup.add(droneBody);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.03, 0.06),
        new THREE.MeshLambertMaterial({ color: 0x444455 })
      );
      arm.position.y = 3.6;
      arm.rotation.y = (i / 4) * Math.PI * 2;
      arm.position.x = Math.cos((i / 4) * Math.PI * 2) * 0.3;
      arm.position.z = Math.sin((i / 4) * Math.PI * 2) * 0.3;
      droneGroup.add(arm);
    }
    droneGroup.visible = false;
    this.scene.add(droneGroup);
    this._drone = droneGroup;
    
    // Dragon - larger flying creature (stackable up to 3)
    this._dragons = [];
    for (let d = 0; d < 3; d++) {
      const dragonGroup = new THREE.Group();
      const dragonBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.4, 1.2),
        new THREE.MeshLambertMaterial({ color: 0xcc3300 })
      );
      dragonBody.position.y = 5;
      dragonGroup.add(dragonBody);
      const wingGeo = new THREE.BoxGeometry(1.5, 0.05, 0.8);
      const wingMat = new THREE.MeshLambertMaterial({ color: 0xff4400 });
      const lWing = new THREE.Mesh(wingGeo, wingMat);
      lWing.position.set(-0.9, 5, 0);
      lWing.rotation.z = 0.2;
      dragonGroup.add(lWing);
      const rWing = new THREE.Mesh(wingGeo, wingMat);
      rWing.position.set(0.9, 5, 0);
      rWing.rotation.z = -0.2;
      dragonGroup.add(rWing);
      const dragonHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.4),
        new THREE.MeshLambertMaterial({ color: 0xcc3300 })
      );
      dragonHead.position.set(0, 5.2, -0.7);
      dragonGroup.add(dragonHead);
      dragonGroup.visible = false;
      this.scene.add(dragonGroup);
      this._dragons.push(dragonGroup);
    }
    
    // Auto-turret - small rotating gun platform
    this._turrets = [];
    for (let t = 0; t < 2; t++) {
      const turretGroup = new THREE.Group();
      // Base
      const turretBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.3, 8),
        new THREE.MeshLambertMaterial({ color: 0x556655 })
      );
      turretBase.position.y = 0.15;
      turretGroup.add(turretBase);
      // Gun barrel
      const turretBarrel = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.5),
        new THREE.MeshLambertMaterial({ color: 0x333333 })
      );
      turretBarrel.position.set(0, 0.35, -0.2);
      turretGroup.add(turretBarrel);
      // Top dome
      const turretDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x778877 })
      );
      turretDome.position.y = 0.4;
      turretGroup.add(turretDome);
      turretGroup.visible = false;
      this.scene.add(turretGroup);
      this._turrets.push(turretGroup);
    }
    
    this._companionPhase = 0;
  }
  
  updateCompanions(dt, armyX, upgrades) {
    this._companionPhase += dt * 2;
    
    // Drone
    const hasDrone = (upgrades.sideCannons || 0) > 0;
    this._drone.visible = hasDrone;
    if (hasDrone) {
      const dx = Math.cos(this._companionPhase * 1.5) * 2;
      const dz = Math.sin(this._companionPhase * 1.5) * 2;
      this._drone.position.set(armyX + dx, 0, dz);
      this._drone.children[0].position.y = 3.5 + Math.sin(this._companionPhase * 3) * 0.15;
    }
    
    // Dragons (stackable, up to 3)
    const dragonCount = Math.min(upgrades.dragon || 0, MAX_DRAGON_COUNT);
    for (let d = 0; d < this._dragons.length; d++) {
      const hasDragon = d < dragonCount;
      this._dragons[d].visible = hasDragon;
      if (hasDragon) {
        const offset = (d * Math.PI * 2) / Math.max(dragonCount, 1);
        const dx = Math.cos(this._companionPhase + offset) * (3 + d * 0.8);
        const dz = Math.sin(this._companionPhase + offset) * (3 + d * 0.8) - 2;
        this._dragons[d].position.set(armyX + dx, 0, dz);
        const flapAngle = Math.sin(this._companionPhase * 4 + offset) * 0.3;
        this._dragons[d].children[1].rotation.z = 0.2 + flapAngle;
        this._dragons[d].children[2].rotation.z = -0.2 - flapAngle;
      }
    }
    
    // Auto-turrets
    const turretCount = Math.min(upgrades.autoTurret || 0, 2);
    for (let t = 0; t < this._turrets.length; t++) {
      const hasTurret = t < turretCount;
      this._turrets[t].visible = hasTurret;
      if (hasTurret) {
        const side = t === 0 ? -1.5 : 1.5;
        this._turrets[t].position.set(armyX + side, 0, 0.5);
        // Rotate turret barrel to point forward
        this._turrets[t].rotation.y = Math.sin(this._companionPhase * 3 + t) * 0.3;
      }
    }
  }
  
  /**
   * Set soldier count and reset positions
   * @param {number} count - Desired soldier count
   * @param {number} armyX - Army center X position
   */
  // Flow formation constants
  static BASE_SPREAD = 1.1;       // Base spacing between soldiers
  static ROW_STAGGER = 0.35;      // Horizontal offset for odd rows
  static DEPTH_COMPRESSION = 0.9; // Tighter depth spacing
  
  // Steering / physics constants
  static SEP_RADIUS = 0.75;   // Minimum desired distance between soldiers (units)
  static SEP_STRENGTH = 6.0;  // Separation push force magnitude
  static ROAD_HALF = 9.5;     // Half-width of the playable road (units)
  static DEATH_DURATION = 0.5; // Seconds before a dead soldier is removed
  static DEATH_ANIM_END = 0.4; // Seconds at which the fall animation completes
  
  // Available formation width (can be narrowed by obstacles)
  formationWidth = 18.0;
  
  setCount(count, armyX) {
    count = Math.min(count, this.MAX);
    
    // Flow formation: wider front, organic depth
    const width = this.formationWidth;
    const spacing = ArmyManager.BASE_SPREAD;
    // Max soldiers per row based on available width
    const maxCols = Math.max(2, Math.floor(width / spacing));
    const cols = Math.min(maxCols, Math.ceil(Math.sqrt(count * 1.5)));
    
    // Activate/deactivate soldiers
    for (let i = 0; i < this.MAX; i++) {
      const soldier = this._soldiers[i];
      const wasActive = soldier.active;
      soldier.active = i < count;
      
      if (soldier.active) {
        // Flow formation: stagger rows, vary spacing
        const row = Math.floor(i / cols);
        const col = i % cols;
        const rowWidth = Math.min(cols, count - row * cols);
        const rowStagger = (row % 2) * ArmyManager.ROW_STAGGER;
        const xOff = (col - (rowWidth - 1) / 2) * spacing + rowStagger;
        const zOff = row * spacing * ArmyManager.DEPTH_COMPRESSION;
        
        soldier.targetX = armyX + xOff + soldier.offsetX;
        soldier.targetZ = -zOff + soldier.offsetZ;
        
        if (!wasActive) {
          // Newly spawned soldier
          soldier.x = soldier.targetX;
          soldier.z = soldier.targetZ + 2; // Start slightly behind
          soldier.spawnScale = 0;
          soldier.deathTimer = -1;
          soldier.phase = Math.random() * Math.PI * 2;
        }
      } else if (wasActive && soldier.deathTimer < 0) {
        // Deactivated without death animation - just hide
        soldier.deathTimer = -1;
      }
    }
    
    this._activeCount = count;
  }
  
  /**
   * Kill one random active soldier (death animation)
   */
  killSoldier() {
    // Find an active soldier that isn't already dying
    const alive = [];
    for (let i = 0; i < this.MAX; i++) {
      if (this._soldiers[i].active && this._soldiers[i].deathTimer < 0) {
        alive.push(i);
      }
    }
    
    if (alive.length > 0) {
      const idx = alive[Math.floor(Math.random() * alive.length)];
      const soldier = this._soldiers[idx];
      soldier.deathTimer = 0;
      soldier.deathAngle = (Math.random() - 0.5) * 0.5;
    }
  }
  
  /**
   * Update all soldiers each frame
   * @param {number} dt - Delta time in seconds
   * @param {number} armyX - Current army center X
   * @param {number} time - Total elapsed time
   */
  update(dt, armyX, time, upgrades) {
    // Recalculate formation targets
    const count = this._activeCount;
    const width = this.formationWidth;
    const spacing = ArmyManager.BASE_SPREAD;
    const maxCols = Math.max(2, Math.floor(width / spacing));
    const cols = Math.min(maxCols, Math.ceil(Math.sqrt(count * 1.5)));
    
    let activeIdx = 0;
    
    // Pass 1: Update targets, movement, and animation state
    for (let i = 0; i < this.MAX; i++) {
      const soldier = this._soldiers[i];
      
      if (!soldier.active) {
        // Hide this soldier
        this._hideInstance(i);
        continue;
      }
      
      // Death animation — keep position fixed, just advance timer
      if (soldier.deathTimer >= 0) {
        soldier.deathTimer += dt;
        if (soldier.deathTimer > ArmyManager.DEATH_DURATION) {
          // Fully dead - deactivate
          soldier.active = false;
          this._hideInstance(i);
        }
        activeIdx++;
        continue;
      }
      
      // Update target position (flow formation with staggered rows)
      const row = Math.floor(activeIdx / cols);
      const col = activeIdx % cols;
      const rowWidth = Math.min(cols, count - row * cols);
      const rowStagger = (row % 2) * ArmyManager.ROW_STAGGER;
      const xOff = (col - (rowWidth - 1) / 2) * spacing + rowStagger;
      const zOff = row * spacing * ArmyManager.DEPTH_COMPRESSION;
      
      soldier.targetX = armyX + xOff + soldier.offsetX;
      soldier.targetZ = -zOff + soldier.offsetZ;
      
      // Smooth movement toward target
      const moveSpeed = 8;
      soldier.x += (soldier.targetX - soldier.x) * Math.min(1, dt * moveSpeed);
      soldier.z += (soldier.targetZ - soldier.z) * Math.min(1, dt * moveSpeed);
      
      // Animate spawn scale
      if (soldier.spawnScale < 1) {
        soldier.spawnScale += dt * 5;
        if (soldier.spawnScale > 1) soldier.spawnScale = 1;
      }
      
      // Walk animation phase
      soldier.phase += dt * 5;
      
      activeIdx++;
    }
    
    // Pass 2: Apply separation forces so soldiers don't overlap (steering behavior)
    this._applySeparation(dt);
    
    // Pass 3: Update visual transforms for all still-active soldiers
    for (let i = 0; i < this.MAX; i++) {
      const soldier = this._soldiers[i];
      if (soldier.active) {
        this._updateSoldierParts(i, soldier);
      }
    }
    
    this._markNeedsUpdate();
    
    if (upgrades) {
      this.updateCompanions(dt, armyX, upgrades);
    }
  }
  
  /**
   * Apply pairwise separation forces and road-boundary clamping.
   * Prevents soldiers from overlapping each other and clipping off road.
   * O(n²) over active alive soldiers — acceptable for n ≤ MAX (200).
   */
  _applySeparation(dt) {
    // Pairwise separation
    for (let i = 0; i < this.MAX; i++) {
      const s1 = this._soldiers[i];
      if (!s1.active || s1.deathTimer >= 0) continue;
      
      for (let j = i + 1; j < this.MAX; j++) {
        const s2 = this._soldiers[j];
        if (!s2.active || s2.deathTimer >= 0) continue;
        
        const dx = s1.x - s2.x;
        const dz = s1.z - s2.z;
        const distSq = dx * dx + dz * dz;
        const sep = ArmyManager.SEP_RADIUS;
        
        if (distSq < sep * sep && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = sep - dist;
          const push = overlap * ArmyManager.SEP_STRENGTH * dt;
          const nx = dx / dist;
          const nz = dz / dist;
          s1.x += nx * push;
          s1.z += nz * push;
          s2.x -= nx * push;
          s2.z -= nz * push;
        }
      }
    }
    
    // Clamp every alive soldier to road bounds
    for (let i = 0; i < this.MAX; i++) {
      const s = this._soldiers[i];
      if (!s.active || s.deathTimer >= 0) continue;
      s.x = Math.max(-ArmyManager.ROAD_HALF, Math.min(ArmyManager.ROAD_HALF, s.x));
    }
  }
  
  /**
   * Push soldiers out of obstacles (walls/barriers).
   * @param {Array} obstacles - Array of { mesh } with position set in scene space
   */
  applyObstacleCollision(obstacles) {
    if (!obstacles || obstacles.length === 0) return;
    
    for (const obs of obstacles) {
      const mesh = obs.mesh;
      if (!mesh || !mesh.geometry) continue;
      
      // Get obstacle bounding box in scene space
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      const pos = mesh.position;
      const halfW = (bb.max.x - bb.min.x) / 2 + 0.3; // padding for soldier radius
      const halfD = (bb.max.z - bb.min.z) / 2 + 0.3;
      
      for (let i = 0; i < this.MAX; i++) {
        const s = this._soldiers[i];
        if (!s.active || s.deathTimer >= 0) continue;
        
        const dx = s.x - pos.x;
        const dz = s.z - pos.z;
        
        // AABB collision check
        if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
          // Find shortest push-out direction
          const overlapX = halfW - Math.abs(dx);
          const overlapZ = halfD - Math.abs(dz);
          
          if (overlapX < overlapZ) {
            s.x += dx > 0 ? overlapX : -overlapX;
          } else {
            s.z += dz > 0 ? overlapZ : -overlapZ;
          }
        }
      }
    }
  }
  
  /**
   * Update instanced mesh matrices for a single soldier
   */
  _updateSoldierParts(index, soldier) {
    const scale = soldier.spawnScale;
    if (scale <= 0) {
      this._hideInstance(index);
      return;
    }
    
    const phase = soldier.phase;
    const x = soldier.x;
    const z = soldier.z;
    
    // Death animation
    let deathLean = 0;
    let deathDrop = 0;
    if (soldier.deathTimer >= 0) {
      const t = Math.min(soldier.deathTimer / ArmyManager.DEATH_ANIM_END, 1);
      deathLean = t * (Math.PI / 2 + 0.2); // Fall forward
      deathDrop = t * 0.6; // Drop to ground
    }
    
    // Body bounce
    const bounce = Math.abs(Math.sin(phase)) * 0.07;
    const bodyY = 0.85 + bounce - deathDrop;
    
    // Body transform
    this._tempE.set(deathLean, soldier.deathAngle, 0);
    this._tempQ.setFromEuler(this._tempE);
    this._tempV3.set(x, bodyY, z);
    this._tempM4.compose(this._tempV3, this._tempQ, new THREE.Vector3(scale, scale, scale));
    this.bodyInst.setMatrixAt(index, this._tempM4);
    
    // Head (above body)
    const headY = bodyY + 0.61;
    this._tempV3.set(x, headY, z);
    this._tempM4.compose(this._tempV3, this._tempQ, new THREE.Vector3(scale, scale, scale));
    this.headInst.setMatrixAt(index, this._tempM4);
    
    // Helmet (above head)
    const helmetY = headY + 0.20;
    this._tempV3.set(x, helmetY, z);
    this._tempM4.compose(this._tempV3, this._tempQ, new THREE.Vector3(scale, scale, scale));
    this.helmetInst.setMatrixAt(index, this._tempM4);
    
    // Arm swing angles
    const armSwing = Math.sin(phase) * 0.65;
    const lArmAngle = armSwing;
    const rArmAngle = -armSwing;
    
    // Left Arm
    this._tempE.set(lArmAngle + deathLean, soldier.deathAngle, 0);
    this._tempQ.setFromEuler(this._tempE);
    const lArmX = x - 0.38 * scale;
    const lArmY = bodyY + 0.1 - deathDrop * 0.3;
    this._tempV3.set(lArmX, lArmY, z);
    this._tempM4.compose(this._tempV3, this._tempQ, new THREE.Vector3(scale, scale, scale));
    this.lArmInst.setMatrixAt(index, this._tempM4);
    
    // Right Arm (holds gun)
    this._tempE.set(rArmAngle + deathLean - 0.3, soldier.deathAngle, 0);
    this._tempQ.setFromEuler(this._tempE);
    const rArmX = x + 0.38 * scale;
    const rArmY = bodyY + 0.1 - deathDrop * 0.3;
    this._tempV3.set(rArmX, rArmY, z);
    this._tempM4.compose(this._tempV3, this._tempQ, new THREE.Vector3(scale, scale, scale));
    this.rArmInst.setMatrixAt(index, this._tempM4);
    
    // Leg swing
    const legSwing = Math.sin(phase) * 0.65;
    
    // Left Leg
    this._tempE.set(-legSwing + deathLean, soldier.deathAngle, 0);
    this._tempQ.setFromEuler(this._tempE);
    const lLegY = 0.35 - deathDrop * 0.7;
    this._tempV3.set(x - 0.14 * scale, lLegY, z);
    this._tempM4.compose(this._tempV3, this._tempQ, new THREE.Vector3(scale, scale, scale));
    this.lLegInst.setMatrixAt(index, this._tempM4);
    
    // Right Leg
    this._tempE.set(legSwing + deathLean, soldier.deathAngle, 0);
    this._tempQ.setFromEuler(this._tempE);
    this._tempV3.set(x + 0.14 * scale, lLegY, z);
    this._tempM4.compose(this._tempV3, this._tempQ, new THREE.Vector3(scale, scale, scale));
    this.rLegInst.setMatrixAt(index, this._tempM4);
    
    // Gun (follows right arm, points forward)
    this._tempE.set(rArmAngle + deathLean - 0.3, soldier.deathAngle, 0);
    this._tempQ.setFromEuler(this._tempE);
    const gunY = rArmY - 0.15;
    const gunZ = z - 0.25 * scale;
    this._tempV3.set(rArmX, gunY, gunZ);
    this._tempM4.compose(this._tempV3, this._tempQ, new THREE.Vector3(scale, scale, scale));
    this.gunInst.setMatrixAt(index, this._tempM4);
  }
  
  /**
   * Hide a soldier instance (scale 0)
   */
  _hideInstance(index) {
    this._tempM4.makeScale(0, 0, 0);
    this.bodyInst.setMatrixAt(index, this._tempM4);
    this.headInst.setMatrixAt(index, this._tempM4);
    this.helmetInst.setMatrixAt(index, this._tempM4);
    this.lArmInst.setMatrixAt(index, this._tempM4);
    this.rArmInst.setMatrixAt(index, this._tempM4);
    this.lLegInst.setMatrixAt(index, this._tempM4);
    this.rLegInst.setMatrixAt(index, this._tempM4);
    this.gunInst.setMatrixAt(index, this._tempM4);
  }
  
  /**
   * Mark all instance matrices as needing update
   */
  _markNeedsUpdate() {
    this.bodyInst.instanceMatrix.needsUpdate = true;
    this.headInst.instanceMatrix.needsUpdate = true;
    this.helmetInst.instanceMatrix.needsUpdate = true;
    this.lArmInst.instanceMatrix.needsUpdate = true;
    this.rArmInst.instanceMatrix.needsUpdate = true;
    this.lLegInst.instanceMatrix.needsUpdate = true;
    this.rLegInst.instanceMatrix.needsUpdate = true;
    this.gunInst.instanceMatrix.needsUpdate = true;
  }
  
  /**
   * Get muzzle positions for shooting
   * @param {number} count - Max positions to return
   * @returns {Array} Array of {x, y, z} world positions
   */
  getMuzzlePositions(count) {
    const positions = [];
    // Return up to 'count' positions — one per living soldier
    const maxPos = Math.min(count, this.MAX);
    
    for (let i = 0; i < this.MAX && positions.length < maxPos; i++) {
      const soldier = this._soldiers[i];
      if (soldier.active && soldier.deathTimer < 0 && soldier.spawnScale > 0.8) {
        // Gun muzzle position (end of gun barrel)
        const scale = soldier.spawnScale;
        const phase = soldier.phase;
        const rArmAngle = -Math.sin(phase) * 0.65;
        
        // Approximate muzzle position
        const muzzleX = soldier.x + 0.38 * scale;
        const muzzleY = 0.85 + Math.abs(Math.sin(phase)) * 0.07 - 0.05;
        const muzzleZ = soldier.z - 0.5 * scale;
        
        positions.push({ x: muzzleX, y: muzzleY, z: muzzleZ });
      }
    }
    
    return positions;
  }
  
  /**
   * Get active soldier count
   */
  get count() {
    return this._activeCount;
  }
}
