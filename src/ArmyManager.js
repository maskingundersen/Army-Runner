// src/ArmyManager.js — Manages soldier army using THREE.Group per soldier

class ArmyManager {
  constructor(threeScene) {
    this.scene = threeScene;
    this.MAX = 200;
    this.MAX_VISIBLE = 60;

    this._sharedGeo = {
      body:       new THREE.CapsuleGeometry(0.28, 0.6, 4, 8),
      head:       new THREE.SphereGeometry(0.18, 6, 5),
      helmet:     new THREE.ConeGeometry(0.22, 0.3, 6),
      helmetBrim: new THREE.CylinderGeometry(0.26, 0.26, 0.06, 6),
      arm:        new THREE.CylinderGeometry(0.07, 0.07, 0.45, 5),
      shield:     new THREE.BoxGeometry(0.35, 0.5, 0.06),
      spearShaft: new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5),
      spearTip:   new THREE.ConeGeometry(0.06, 0.2, 5),
      cape:       new THREE.BoxGeometry(0.4, 0.55, 0.05),
      leg:        new THREE.CylinderGeometry(0.09, 0.08, 0.5, 5)
    };

    this._currentWeaponType = 'handgun';
    this._weaponGeos = {
      handgun: null, assault: null, shotgun: null,
      minigun: null, rocket: null, sniper: null
    };

    this._soldierGroups = [];
    for (let i = 0; i < this.MAX_VISIBLE; i++) {
      this._soldierGroups.push(this._createSoldierGroup());
    }

    this._soldiers = [];
    for (let i = 0; i < this.MAX; i++) {
      this._soldiers.push({
        active: false,
        x: 0, z: 0, prevX: 0,
        targetX: 0, targetZ: 0,
        phase: Math.random() * Math.PI * 2,
        spawnScale: 0,
        deathTimer: -1,
        deathAngle: 0,
        offsetX: (Math.random() - 0.5) * 0.3,
        offsetZ: (Math.random() - 0.5) * 0.3
      });
    }

    this._activeCount = 0;
    this._createCompanions();
  }

  _createSoldierGroup() {
    const group = new THREE.Group();

    const armorColor = new THREE.Color();
    armorColor.setHSL(210 / 360, 0.2 + Math.random() * 0.1, 0.55 + Math.random() * 0.1);
    const helmetColor = new THREE.Color();
    helmetColor.setHSL(210 / 360, 0.15 + Math.random() * 0.1, 0.4 + Math.random() * 0.1);

    const armorMat = new THREE.MeshStandardMaterial({ color: armorColor, metalness: 0.6, roughness: 0.3 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: helmetColor });

    const body = new THREE.Mesh(this._sharedGeo.body, armorMat);
    body.position.y = 0.7;
    body.castShadow = true; body.receiveShadow = true;
    group.add(body);

    const head = new THREE.Mesh(this._sharedGeo.head,
      new THREE.MeshStandardMaterial({ color: 0xddbb99 }));
    head.position.y = 1.38;
    head.castShadow = true; head.receiveShadow = true;
    group.add(head);

    const helmet = new THREE.Mesh(this._sharedGeo.helmet, helmetMat);
    helmet.position.y = 1.62;
    helmet.castShadow = true; helmet.receiveShadow = true;
    group.add(helmet);

    const helmetBrim = new THREE.Mesh(this._sharedGeo.helmetBrim, helmetMat.clone());
    helmetBrim.position.y = 1.5;
    helmetBrim.castShadow = true; helmetBrim.receiveShadow = true;
    group.add(helmetBrim);

    const lArm = new THREE.Mesh(this._sharedGeo.arm, armorMat.clone());
    lArm.position.set(-0.32, 1.0, 0);
    lArm.rotation.z = 0.6;
    lArm.castShadow = true; lArm.receiveShadow = true;
    group.add(lArm);

    const rArm = new THREE.Mesh(this._sharedGeo.arm, armorMat.clone());
    rArm.position.set(0.32, 1.0, 0);
    rArm.rotation.z = -0.6;
    rArm.castShadow = true; rArm.receiveShadow = true;
    group.add(rArm);

    const shield = new THREE.Mesh(this._sharedGeo.shield,
      new THREE.MeshStandardMaterial({ color: 0xcc3322, metalness: 0.3 }));
    shield.position.set(-0.45, 0.95, 0.1);
    shield.castShadow = true; shield.receiveShadow = true;
    group.add(shield);

    const spearShaft = new THREE.Mesh(this._sharedGeo.spearShaft,
      new THREE.MeshStandardMaterial({ color: 0x885533 }));
    spearShaft.position.set(0.38, 1.35, 0);
    spearShaft.castShadow = true; spearShaft.receiveShadow = true;
    group.add(spearShaft);

    const spearTip = new THREE.Mesh(this._sharedGeo.spearTip,
      new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.8 }));
    spearTip.position.set(0.38, 2.1, 0);
    spearTip.castShadow = true; spearTip.receiveShadow = true;
    group.add(spearTip);

    const cape = new THREE.Mesh(this._sharedGeo.cape,
      new THREE.MeshStandardMaterial({ color: 0xaa2222 }));
    cape.position.set(0, 0.9, -0.18);
    cape.castShadow = true; cape.receiveShadow = true;
    group.add(cape);

    const lLeg = new THREE.Mesh(this._sharedGeo.leg, armorMat.clone());
    lLeg.position.set(-0.13, 0.2, 0);
    lLeg.castShadow = true; lLeg.receiveShadow = true;
    group.add(lLeg);

    const rLeg = new THREE.Mesh(this._sharedGeo.leg, armorMat.clone());
    rLeg.position.set(0.13, 0.2, 0);
    rLeg.castShadow = true; rLeg.receiveShadow = true;
    group.add(rLeg);

    group.visible = false;
    this.scene.add(group);

    return { group, body, head, helmet, lArm, rArm, lLeg, rLeg, cape };
  }

  setWeaponType(type) {
    if (this._weaponGeos[type] !== undefined) {
      this._currentWeaponType = type;
    }
  }

  _createCompanions() {
    const droneGroup = new THREE.Group();
    const droneBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.15, 0.15, 8),
      new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.3, metalness: 0.7 })
    );
    droneBody.position.y = 3.5;
    droneGroup.add(droneBody);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4),
        new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.4, metalness: 0.6 })
      );
      arm.position.y = 3.6;
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = (i / 4) * Math.PI * 2;
      arm.position.x = Math.cos((i / 4) * Math.PI * 2) * 0.3;
      arm.position.z = Math.sin((i / 4) * Math.PI * 2) * 0.3;
      droneGroup.add(arm);
      const rotor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.01, 12),
        new THREE.MeshStandardMaterial({ color: 0x99aacc, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.6 })
      );
      rotor.position.set(
        Math.cos((i / 4) * Math.PI * 2) * 0.35,
        3.65,
        Math.sin((i / 4) * Math.PI * 2) * 0.35
      );
      droneGroup.add(rotor);
    }
    droneGroup.visible = false;
    this.scene.add(droneGroup);
    this._drone = droneGroup;

    this._dragons = [];
    for (let d = 0; d < 3; d++) {
      const dg = new THREE.Group();
      const db = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xcc3300, roughness: 0.5, metalness: 0.2 })
      );
      db.position.y = 5; db.rotation.x = Math.PI / 2;
      dg.add(db);
      const wg = new THREE.BoxGeometry(1.5, 0.03, 0.8);
      const wm = new THREE.MeshStandardMaterial({ color: 0xff4400, roughness: 0.6, metalness: 0.1, transparent: true, opacity: 0.85 });
      const lW = new THREE.Mesh(wg, wm);
      lW.position.set(-0.9, 5, 0); lW.rotation.z = 0.2;
      dg.add(lW);
      const rW = new THREE.Mesh(wg, wm.clone());
      rW.position.set(0.9, 5, 0); rW.rotation.z = -0.2;
      dg.add(rW);
      const dh = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xcc3300, roughness: 0.5, metalness: 0.2 })
      );
      dh.position.set(0, 5.1, -0.7);
      dg.add(dh);
      const sn = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.25, 6),
        new THREE.MeshStandardMaterial({ color: 0xdd4400, roughness: 0.5, metalness: 0.2 })
      );
      sn.position.set(0, 5.05, -0.95); sn.rotation.x = -Math.PI / 2;
      dg.add(sn);
      dg.visible = false;
      this.scene.add(dg);
      this._dragons.push(dg);
    }

    this._turrets = [];
    for (let t = 0; t < 2; t++) {
      const tg = new THREE.Group();
      const tb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.4, metalness: 0.5 })
      );
      tb.position.y = 0.15;
      tg.add(tb);
      const tbar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.035, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.8 })
      );
      tbar.position.set(0, 0.35, -0.2); tbar.rotation.x = Math.PI / 2;
      tg.add(tbar);
      const tdome = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x778877, roughness: 0.4, metalness: 0.4 })
      );
      tdome.position.y = 0.4;
      tg.add(tdome);
      tg.visible = false;
      this.scene.add(tg);
      this._turrets.push(tg);
    }

    this._companionPhase = 0;
  }

  updateCompanions(dt, armyX, upgrades) {
    this._companionPhase += dt * 2;

    const hasDrone = (upgrades.sideCannons || 0) > 0;
    this._drone.visible = hasDrone;
    if (hasDrone) {
      const dx = Math.cos(this._companionPhase * 1.5) * 2;
      const dz = Math.sin(this._companionPhase * 1.5) * 2;
      this._drone.position.set(armyX + dx, 0, dz);
      this._drone.children[0].position.y = 3.5 + Math.sin(this._companionPhase * 3) * 0.15;
    }

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

    const turretCount = Math.min(upgrades.autoTurret || 0, 2);
    for (let t = 0; t < this._turrets.length; t++) {
      const hasTurret = t < turretCount;
      this._turrets[t].visible = hasTurret;
      if (hasTurret) {
        const side = t === 0 ? -1.5 : 1.5;
        this._turrets[t].position.set(armyX + side, 0, 0.5);
        this._turrets[t].rotation.y = Math.sin(this._companionPhase * 3 + t) * 0.3;
      }
    }
  }

  static BASE_SPREAD = 1.1;
  static ROW_STAGGER = 0.35;
  static DEPTH_COMPRESSION = 0.9;
  static SEP_RADIUS = 0.75;
  static SEP_STRENGTH = 6.0;
  static ROAD_HALF = 9.5;
  static DEATH_DURATION = 0.5;
  static DEATH_ANIM_END = 0.4;

  formationWidth = 18.0;

  setCount(count, armyX) {
    count = Math.min(count, this.MAX);

    const width = this.formationWidth;
    const spacing = ArmyManager.BASE_SPREAD;
    const maxCols = Math.max(2, Math.floor(width / spacing));
    const cols = Math.min(maxCols, Math.ceil(Math.sqrt(count * 1.5)));

    for (let i = 0; i < this.MAX; i++) {
      const soldier = this._soldiers[i];
      const wasActive = soldier.active;
      soldier.active = i < count;

      if (soldier.active) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const rowWidth = Math.min(cols, count - row * cols);
        const rowStagger = (row % 2) * ArmyManager.ROW_STAGGER;
        const xOff = (col - (rowWidth - 1) / 2) * spacing + rowStagger;
        const zOff = row * spacing * ArmyManager.DEPTH_COMPRESSION;

        soldier.targetX = armyX + xOff + soldier.offsetX;
        soldier.targetZ = -zOff + soldier.offsetZ;

        if (!wasActive) {
          soldier.x = soldier.targetX;
          soldier.z = soldier.targetZ + 2;
          soldier.spawnScale = 0;
          soldier.deathTimer = -1;
          soldier.phase = Math.random() * Math.PI * 2;
        }
      } else if (wasActive && soldier.deathTimer < 0) {
        soldier.deathTimer = -1;
      }
    }

    this._activeCount = count;
  }

  killSoldier() {
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

  update(dt, armyX, time, upgrades) {
    const count = this._activeCount;
    const width = this.formationWidth;
    const spacing = ArmyManager.BASE_SPREAD;
    const maxCols = Math.max(2, Math.floor(width / spacing));
    const cols = Math.min(maxCols, Math.ceil(Math.sqrt(count * 1.5)));

    let activeIdx = 0;

    for (let i = 0; i < this.MAX; i++) {
      const soldier = this._soldiers[i];
      if (!soldier.active) continue;

      soldier.prevX = soldier.x;

      if (soldier.deathTimer >= 0) {
        soldier.deathTimer += dt;
        if (soldier.deathTimer > ArmyManager.DEATH_DURATION) {
          soldier.active = false;
        }
        activeIdx++;
        continue;
      }

      const row = Math.floor(activeIdx / cols);
      const col = activeIdx % cols;
      const rowWidth = Math.min(cols, count - row * cols);
      const rowStagger = (row % 2) * ArmyManager.ROW_STAGGER;
      const xOff = (col - (rowWidth - 1) / 2) * spacing + rowStagger;
      const zOff = row * spacing * ArmyManager.DEPTH_COMPRESSION;

      soldier.targetX = armyX + xOff + soldier.offsetX;
      soldier.targetZ = -zOff + soldier.offsetZ;

      const moveSpeed = 8;
      soldier.x += (soldier.targetX - soldier.x) * Math.min(1, dt * moveSpeed);
      soldier.z += (soldier.targetZ - soldier.z) * Math.min(1, dt * moveSpeed);

      if (soldier.spawnScale < 1) {
        soldier.spawnScale += dt * 5;
        if (soldier.spawnScale > 1) soldier.spawnScale = 1;
      }

      activeIdx++;
    }

    this._applySeparation(dt);

    let visibleIdx = 0;
    for (let i = 0; i < this.MAX; i++) {
      const soldier = this._soldiers[i];
      if (!soldier.active) continue;
      if (soldier.spawnScale <= 0) { visibleIdx++; continue; }

      if (visibleIdx < this.MAX_VISIBLE) {
        const sg = this._soldierGroups[visibleIdx];
        sg.group.visible = true;

        const scale = soldier.spawnScale;
        const phase = soldier.phase;

        if (soldier.deathTimer >= 0) {
          const t = Math.min(soldier.deathTimer / ArmyManager.DEATH_ANIM_END, 1);
          const deathLean = t * (Math.PI / 2 + 0.2);
          const deathDrop = t * 0.6;
          sg.group.position.set(soldier.x, -deathDrop, soldier.z);
          sg.group.rotation.set(deathLean, soldier.deathAngle, 0);
          sg.group.scale.set(scale, scale, scale);
          sg.lLeg.rotation.x = 0;
          sg.rLeg.rotation.x = 0;
          sg.lArm.rotation.x = 0;
          sg.rArm.rotation.x = 0;
          sg.cape.rotation.x = 0;
        } else {
          const marchBob = Math.sin(time * 8 + phase) * 0.05;
          sg.group.position.set(soldier.x, marchBob, soldier.z);
          sg.group.rotation.set(0, 0, 0);
          sg.group.scale.set(scale, scale, scale);

          sg.lLeg.rotation.x = Math.sin(time * 8 + phase) * 0.4;
          sg.rLeg.rotation.x = Math.sin(time * 8 + phase + Math.PI) * 0.4;
          sg.lArm.rotation.x = Math.sin(time * 8 + phase + Math.PI) * 0.3;
          sg.rArm.rotation.x = Math.sin(time * 8 + phase) * 0.3;
          sg.cape.rotation.x = Math.sin(time * 8 + phase) * 0.08;
        }
      }

      visibleIdx++;
    }

    for (let i = visibleIdx; i < this.MAX_VISIBLE; i++) {
      this._soldierGroups[i].group.visible = false;
    }

    if (upgrades) {
      this.updateCompanions(dt, armyX, upgrades);
    }
  }

  _applySeparation(dt) {
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

    for (let i = 0; i < this.MAX; i++) {
      const s = this._soldiers[i];
      if (!s.active || s.deathTimer >= 0) continue;
      s.x = Math.max(-ArmyManager.ROAD_HALF, Math.min(ArmyManager.ROAD_HALF, s.x));
    }
  }

  applyObstacleCollision(obstacles) {
    if (!obstacles || obstacles.length === 0) return;

    for (const obs of obstacles) {
      const mesh = obs.mesh;
      if (!mesh || !mesh.geometry) continue;

      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      const pos = mesh.position;
      const halfW = (bb.max.x - bb.min.x) / 2 + 0.3;
      const halfD = (bb.max.z - bb.min.z) / 2 + 0.3;

      for (let i = 0; i < this.MAX; i++) {
        const s = this._soldiers[i];
        if (!s.active || s.deathTimer >= 0) continue;

        const dx = s.x - pos.x;
        const dz = s.z - pos.z;

        if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
          const overlapX = halfW - Math.abs(dx);
          const overlapZ = halfD - Math.abs(dz);
          const prevDx = s.prevX - pos.x;

          if (overlapX < overlapZ) {
            if (Math.abs(prevDx) >= halfW) {
              s.x = pos.x + (prevDx > 0 ? halfW : -halfW);
            } else {
              s.x += dx > 0 ? overlapX : -overlapX;
            }
          } else {
            s.z += dz > 0 ? overlapZ : -overlapZ;
          }
        }
      }
    }

    for (let i = 0; i < this.MAX; i++) {
      const s = this._soldiers[i];
      if (!s.active || s.deathTimer >= 0) continue;
      s.x = Math.max(-ArmyManager.ROAD_HALF, Math.min(ArmyManager.ROAD_HALF, s.x));
    }
  }

  getMuzzlePositions(count) {
    const positions = [];
    const maxPos = Math.min(count, this.MAX);

    for (let i = 0; i < this.MAX && positions.length < maxPos; i++) {
      const soldier = this._soldiers[i];
      if (soldier.active && soldier.deathTimer < 0 && soldier.spawnScale > 0.8) {
        positions.push({
          x: soldier.x + 0.38 * soldier.spawnScale,
          y: 2.1,
          z: soldier.z - 0.3 * soldier.spawnScale
        });
      }
    }

    return positions;
  }

  get count() {
    return this._activeCount;
  }
}
