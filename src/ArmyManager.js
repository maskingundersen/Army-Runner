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
    
    // Gun - dark metal
    const gunGeo = new THREE.BoxGeometry(0.07, 0.07, 0.5);
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    this.gunInst = new THREE.InstancedMesh(gunGeo, gunMat, this.MAX);
    this.gunInst.castShadow = true;
    this.scene.add(this.gunInst);
    
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
  
  // Available formation width (can be narrowed by obstacles)
  formationWidth = 7.0;
  
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
    
    for (let i = 0; i < this.MAX; i++) {
      const soldier = this._soldiers[i];
      
      if (!soldier.active) {
        // Hide this soldier
        this._hideInstance(i);
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
      
      // Death animation
      if (soldier.deathTimer >= 0) {
        soldier.deathTimer += dt;
        if (soldier.deathTimer > 1.2) {
          // Fully dead - deactivate
          soldier.active = false;
          this._hideInstance(i);
          continue;
        }
      }
      
      // Update visual transforms
      this._updateSoldierParts(i, soldier);
      activeIdx++;
    }
    
    this._markNeedsUpdate();
    
    if (upgrades) {
      this.updateCompanions(dt, armyX, upgrades);
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
      const t = Math.min(soldier.deathTimer / 0.8, 1);
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
    const maxPos = Math.min(count, 12);
    
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
