// src/ArmyManager.js — Manages soldier army using THREE.Group per soldier

const ANIM_FRAME_SKIP = 2;
const MAX_DRAGON_COUNT = 3;

class ArmyManager {
  constructor(threeScene) {
    this.scene = threeScene;
    this.MAX = 200;
    this.MAX_RENDERED = 30;
    this.MAX_VISIBLE = this.MAX_RENDERED;
    this._animFrame = 0;
    this._recoilEnd = 0;

    // Shared geometries for performance
    this._sharedGeo = {
      body:    new THREE.BoxGeometry(0.4, 0.5, 0.25),
      head:    new THREE.SphereGeometry(0.15, 8, 6),
      helmet:  new THREE.BoxGeometry(0.2, 0.08, 0.2),
      leg:     new THREE.CylinderGeometry(0.06, 0.06, 0.35, 6),
      weapon:  new THREE.BoxGeometry(0.04, 0.04, 0.5)
    };

    // Shared materials
    this._sharedMat = {
      body:    new THREE.MeshStandardMaterial({ color: 0x1E90FF }),
      head:    new THREE.MeshStandardMaterial({ color: 0xFFD580 }),
      helmet:  new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.6 }),
      leg:     new THREE.MeshStandardMaterial({ color: 0xF0F0F0 }),
      weapon:  new THREE.MeshStandardMaterial({ color: 0x444444 })
    };

    this._soldierGroups = [];
    for (let i = 0; i < this.MAX_RENDERED; i++) {
      this._soldierGroups.push(this._createSoldierGroup());
    }

    // Fake shadow ellipse beneath the army
    const shadowGeo = new THREE.CircleGeometry(3.0, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x222222, transparent: true, opacity: 0.3,
      depthWrite: false
    });
    this._fakeShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this._fakeShadow.rotation.x = -Math.PI / 2;
    this._fakeShadow.position.y = 0.01;
    this._fakeShadow.renderOrder = -1;
    this.scene.add(this._fakeShadow);

    // Health bar sprite
    this._healthCanvas = document.createElement('canvas');
    this._healthCanvas.width = 256;
    this._healthCanvas.height = 32;
    this._healthCtx = this._healthCanvas.getContext('2d');
    this._healthTexture = new THREE.CanvasTexture(this._healthCanvas);
    const healthMat = new THREE.SpriteMaterial({
      map: this._healthTexture, transparent: true, depthTest: false
    });
    this._healthSprite = new THREE.Sprite(healthMat);
    this._healthSprite.scale.set(4, 0.4, 1);
    this._healthSprite.position.y = 2.2;
    this._healthSprite.renderOrder = 10;
    this.scene.add(this._healthSprite);
    this._maxCountSeen = 1;

    // Soldier data pool
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

    const body = new THREE.Mesh(this._sharedGeo.body, this._sharedMat.body);
    body.position.y = 0.6;
    group.add(body);

    const head = new THREE.Mesh(this._sharedGeo.head, this._sharedMat.head);
    head.position.y = 1.0;
    group.add(head);

    const helmet = new THREE.Mesh(this._sharedGeo.helmet, this._sharedMat.helmet);
    helmet.position.y = 1.19;
    group.add(helmet);

    const lLeg = new THREE.Mesh(this._sharedGeo.leg, this._sharedMat.leg);
    lLeg.position.set(-0.1, 0.175, 0);
    group.add(lLeg);

    const rLeg = new THREE.Mesh(this._sharedGeo.leg, this._sharedMat.leg);
    rLeg.position.set(0.1, 0.175, 0);
    group.add(rLeg);

    const weapon = new THREE.Mesh(this._sharedGeo.weapon, this._sharedMat.weapon);
    weapon.position.set(0.28, 0.7, -0.15);
    group.add(weapon);

    group.visible = false;
    this.scene.add(group);

    return { group, body, head, helmet, lLeg, rLeg, weapon };
  }

  setWeaponType(_type) {
    // no-op — visual weapon is fixed
  }

  // Companion stubs (dragons, turrets, drones removed)
  _createCompanions() {
    this._companionPhase = 0;
  }

  updateCompanions(_dt, _armyX, _upgrades) {
    // stub
  }

  static GRID_COLS_MAX = 6;
  static GRID_SPACING_X = 0.8;
  static GRID_SPACING_Z = 0.9;
  static SEP_RADIUS = 0.75;
  static SEP_STRENGTH = 6.0;
  static ROAD_HALF = 9.5;
  static DEATH_DURATION = 0.5;
  static DEATH_ANIM_END = 0.4;

  formationWidth = 18.0;

  _getFormationCols(count) {
    return Math.min(ArmyManager.GRID_COLS_MAX, count);
  }

  setCount(count, armyX) {
    count = Math.min(count, this.MAX);
    if (count > this._maxCountSeen) this._maxCountSeen = count;

    const cols = this._getFormationCols(count);

    for (let i = 0; i < this.MAX; i++) {
      const soldier = this._soldiers[i];
      const wasActive = soldier.active;
      soldier.active = i < count;

      if (soldier.active) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const rowWidth = Math.min(cols, count - row * cols);
        const xOff = (col - (rowWidth - 1) / 2) * ArmyManager.GRID_SPACING_X;
        const zOff = row * ArmyManager.GRID_SPACING_Z;

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
      const idx = alive[alive.length - 1]; // rearmost unit
      const soldier = this._soldiers[idx];
      soldier.deathTimer = 0;
      soldier.deathAngle = (Math.random() - 0.5) * 0.5;
    }
  }

  applyRecoil() {
    this._recoilEnd = performance.now() + 100;
  }

  _updateHealthBar(currentCount, maxCount) {
    const ctx = this._healthCtx;
    const w = this._healthCanvas.width;
    const h = this._healthCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const ratio = maxCount > 0 ? currentCount / maxCount : 0;
    const segments = maxCount;
    const segW = w / Math.max(segments, 1);

    for (let i = 0; i < segments; i++) {
      if (i < currentCount) {
        ctx.fillStyle = '#00FF44';
      } else {
        ctx.fillStyle = 'rgba(60,60,60,0.4)';
      }
      ctx.fillRect(i * segW + 1, 2, Math.max(segW - 2, 1), h - 4);
    }

    this._healthTexture.needsUpdate = true;
  }

  update(dt, armyX, time, upgrades) {
    const count = this._activeCount;
    const cols = this._getFormationCols(count);

    this._animFrame = (this._animFrame + 1) % ANIM_FRAME_SKIP;
    const doAnim = this._animFrame === 0;

    const recoilActive = performance.now() < this._recoilEnd;
    const recoilZ = recoilActive ? 0.05 : 0;

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
      const xOff = (col - (rowWidth - 1) / 2) * ArmyManager.GRID_SPACING_X;
      const zOff = row * ArmyManager.GRID_SPACING_Z;

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

    // Update fake shadow
    if (this._fakeShadow) {
      const shadowScale = 0.5 + Math.min(count, this.MAX_RENDERED) * 0.1;
      this._fakeShadow.position.set(armyX, 0.01, 0);
      this._fakeShadow.scale.set(shadowScale, shadowScale, 1);
    }

    // Update health bar
    const aliveCount = this._countAlive();
    this._updateHealthBar(aliveCount, this._maxCountSeen);
    this._healthSprite.position.set(armyX, 2.2, 0);
    this._healthSprite.visible = aliveCount > 0;

    // Update rendered soldier groups
    let visibleIdx = 0;
    for (let i = 0; i < this.MAX; i++) {
      const soldier = this._soldiers[i];
      if (!soldier.active) continue;
      if (soldier.spawnScale <= 0) continue;

      if (visibleIdx < this.MAX_RENDERED) {
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
          if (doAnim) {
            sg.lLeg.rotation.x = 0;
            sg.rLeg.rotation.x = 0;
          }
        } else {
          const marchBob = Math.sin(time * 12 + phase) * 0.05;
          sg.group.position.set(soldier.x, marchBob, soldier.z + recoilZ);
          sg.group.rotation.set(0, 0, 0);
          sg.group.scale.set(scale, scale, scale);

          if (doAnim) {
            sg.lLeg.rotation.x = Math.sin(time * 12 + phase) * 0.4;
            sg.rLeg.rotation.x = Math.sin(time * 12 + phase + Math.PI) * 0.4;
          }
        }
      }

      visibleIdx++;
    }

    for (let i = visibleIdx; i < this.MAX_RENDERED; i++) {
      this._soldierGroups[i].group.visible = false;
    }

    if (upgrades) {
      this.updateCompanions(dt, armyX, upgrades);
    }
  }

  _countAlive() {
    let n = 0;
    for (let i = 0; i < this.MAX; i++) {
      if (this._soldiers[i].active && this._soldiers[i].deathTimer < 0) n++;
    }
    return n;
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
          x: soldier.x + 0.28,
          y: 0.7,
          z: soldier.z - 0.4
        });
      }
    }

    return positions;
  }

  get count() {
    return this._activeCount;
  }
}
