// src/EnemyManager.js — Manages enemies with different types

// Boss attack tuning constants
const BOSS_STOP_DISTANCE = -12;
const BOSS_ROCK_INTERVAL = 5.0;
const BOSS_ROCK_DAMAGE = 1;
const BOSS_ROCK_DAMAGE_ENRAGED = 2;
const BOSS_PROJ_INTERVAL = 3.5;
const BOSS_PROJ_DAMAGE = 1;
const BOSS_PROJ_DAMAGE_ENRAGED = 1;
const BOSS_CHARGE_INTERVAL = 12.0;
const BOSS_CHARGE_SPEED = 12;
const BOSS_CHARGE_RETREAT_SPEED = -8;
const BOSS_CHARGE_DAMAGE = 1;
const BOSS_CHARGE_DAMAGE_ENRAGED = 2;
const BOSS_PROJ_HIT_ZONE_Z = 1.5;
const BOSS_PROJ_HIT_ZONE_X = 3.0;

// Road boundary for enemy spawning (road half-width with inward padding)
const ENEMY_ROAD_HALF = 8.5;

const ENEMY_DEFS_3D = {
  ogre: {
    walkSpeed: 1.5,
    hp: 280,
    maxHp: 280,
    scale: 2.0,
    color: 0x7a5a2a,
    hitColor: 0xffffff,
    coinValue: 10,
    size: { body: [1.2, 1.8, 0.7], head: [0.9, 0.9, 0.9] },
    isBoss: true,
  },
  fireDragon: {
    walkSpeed: 1.0,
    hp: 850,
    maxHp: 850,
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
    hp: 10,
    maxHp: 10,
    scale: 1.0,
    color: 0x5a8a3a,     // sickly green
    hitColor: 0xffffff,
    coinValue: 1,
    size: { body: [0.55, 0.85, 0.3], head: [0.4, 0.4, 0.4] },
  },
  fast: {
    walkSpeed: 7.0,
    hp: 4,
    maxHp: 4,
    scale: 0.8,
    color: 0x8a3a8a,     // purple
    hitColor: 0xffffff,
    coinValue: 1,
    size: { body: [0.45, 0.7, 0.25], head: [0.32, 0.32, 0.32] },
  },
  tank: {
    walkSpeed: 2.0,
    hp: 40,
    maxHp: 40,
    scale: 1.4,
    color: 0x8a4a2a,     // brown/rust
    hitColor: 0xffffff,
    coinValue: 3,
    size: { body: [0.9, 1.2, 0.5], head: [0.55, 0.5, 0.5] },
  },
  exploding: {
    walkSpeed: 5.0,
    hp: 6,
    maxHp: 6,
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
    hp: 600,
    maxHp: 600,
    scale: 2.4,
    color: 0x556655,     // dark stone green
    hitColor: 0xffffff,
    coinValue: 25,
    size: { body: [1.5, 2.2, 0.8], head: [1.0, 1.0, 1.0] },
    isBoss: true,
  },
  shield: {
    walkSpeed: 2.5,
    hp: 32,
    maxHp: 32,
    scale: 1.2,
    color: 0x4466aa,
    hitColor: 0xffffff,
    coinValue: 3,
    size: { body: [0.7, 1.0, 0.4], head: [0.45, 0.45, 0.45] },
    hasShield: true,
    shieldHp: 15,
  },
  jumping: {
    walkSpeed: 4.0,
    hp: 6,
    maxHp: 6,
    scale: 0.9,
    color: 0x44aa44,
    hitColor: 0xffffff,
    coinValue: 2,
    size: { body: [0.5, 0.7, 0.3], head: [0.35, 0.35, 0.35] },
    jumps: true,
  },
  ranged: {
    walkSpeed: 1.5,
    hp: 16,
    maxHp: 16,
    scale: 1.0,
    color: 0xaa4444,
    hitColor: 0xffffff,
    coinValue: 3,
    size: { body: [0.55, 0.85, 0.3], head: [0.4, 0.4, 0.4] },
    isRanged: true,
  },
  charger: {
    walkSpeed: 2.0,
    hp: 15,
    maxHp: 15,
    scale: 1.1,
    color: 0xcc8800,
    hitColor: 0xffffff,
    coinValue: 2,
    size: { body: [0.65, 0.9, 0.35], head: [0.42, 0.42, 0.42] },
    charges: true,
    chargeSpeed: 12.0,
    chargeDistance: 8.0,
  },
  splitter: {
    walkSpeed: 3.0,
    hp: 18,
    maxHp: 18,
    scale: 1.1,
    color: 0x8844cc,
    hitColor: 0xffffff,
    coinValue: 3,
    size: { body: [0.65, 0.8, 0.35], head: [0.5, 0.5, 0.5] },
    splits: true,
    splitCount: 2,
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
        // Clamp to road boundaries so enemies stay on the playable road
        enemy.worldX = Math.max(-ENEMY_ROAD_HALF, Math.min(ENEMY_ROAD_HALF, enemy.worldX));
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
    enemy.hitScale = 1.0;
    enemy.dead = false;
    enemy.deathTimer = -1;
    enemy.worldX = 0;
    enemy.worldZ = 0;
    // New enemy type state
    enemy.shieldHp = def.shieldHp || 0;
    enemy.jumpTimer = 0;
    enemy.jumpY = 0;
    enemy.charging = false;
    
    // Boss attack state
    enemy.bossAttackTimer = 0;
    enemy.bossRockTimer = 0;
    enemy.bossProjectiles = [];
    enemy.bossChargeTimer = 0;
    enemy.bossCharging = false;
    enemy.bossChargeSpeed = 0;
    enemy.bossEnraged = false;
    
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
    const s = def.size;

    // Body — rounded cylinder torso
    const bodyRadX = s.body[0] / 2;
    const bodyRadZ = s.body[2] / 2;
    const bodyRad = (bodyRadX + bodyRadZ) / 2;
    const bodyGeo = new THREE.CylinderGeometry(bodyRad * 0.85, bodyRad, s.body[1], 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: def.color, roughness: 0.7, metalness: 0.15
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = s.body[1] / 2 + 0.3;
    body.castShadow = true;
    group.add(body);

    // Head — sphere
    const headRad = Math.max(s.head[0], s.head[1], s.head[2]) / 2;
    const headGeo = new THREE.SphereGeometry(headRad, 14, 12);
    const headMat = new THREE.MeshStandardMaterial({
      color: def.color, roughness: 0.6, metalness: 0.1
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = body.position.y + s.body[1] / 2 + headRad * 0.85;
    head.castShadow = true;
    group.add(head);

    // Arms — cylinders
    const armRad = s.body[0] * 0.12;
    const armH = s.body[1] * 0.6;
    const armGeo = new THREE.CylinderGeometry(armRad, armRad * 0.85, armH, 8);
    const armMat = new THREE.MeshStandardMaterial({
      color: def.color, roughness: 0.7, metalness: 0.15
    });

    const lArm = new THREE.Mesh(armGeo, armMat);
    lArm.position.set(-bodyRad - armRad * 1.2, body.position.y - 0.1, 0);
    lArm.castShadow = true;
    lArm.userData.isArm = true;
    group.add(lArm);

    const rArm = new THREE.Mesh(armGeo, armMat.clone());
    rArm.position.set(bodyRad + armRad * 1.2, body.position.y - 0.1, 0);
    rArm.castShadow = true;
    rArm.userData.isArm = true;
    group.add(rArm);

    // Legs — cylinders
    const legRad = s.body[0] * 0.14;
    const legH = 0.5;
    const legGeo = new THREE.CylinderGeometry(legRad, legRad * 1.1, legH, 8);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x333333, roughness: 0.8, metalness: 0.1
    });

    const lLeg = new THREE.Mesh(legGeo, legMat);
    lLeg.position.set(-s.body[0] * 0.25, 0.25, 0);
    lLeg.castShadow = true;
    group.add(lLeg);

    const rLeg = new THREE.Mesh(legGeo, legMat.clone());
    rLeg.position.set(s.body[0] * 0.25, 0.25, 0);
    rLeg.castShadow = true;
    group.add(rLeg);

    // Eyes — glowing spheres (red for normal, yellow for bosses)
    const eyeColor = def.isBoss ? 0xffcc00 : 0xff0000;
    const eyeRad = headRad * 0.18;
    const eyeGeo = new THREE.SphereGeometry(eyeRad, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });

    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-headRad * 0.4, head.position.y + headRad * 0.1, headRad * 0.85);
    group.add(lEye);

    const rEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    rEye.position.set(headRad * 0.4, head.position.y + headRad * 0.1, headRad * 0.85);
    group.add(rEye);

    // --- Type-specific visual features ---
    this._addTypeFeatures(type, def, group, body, head);

    // --- HP bar (always-face-camera sprite) ---
    const hpBar = this._createHPBar(def);
    const hpBarY = head.position.y + headRad + 0.5;
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
      hitScale: 1.0,
      dead: false,
      deathTimer: -1,
      worldX: 0,
      worldZ: 0,
      shieldHp: def.shieldHp || 0,
      jumpTimer: 0,
      jumpY: 0,
      charging: false,
      bossAttackTimer: 0,
      bossRockTimer: 0,
      bossProjectiles: [],
      bossChargeTimer: 0,
      bossCharging: false,
      bossChargeSpeed: 0,
      bossEnraged: false
    };
  }
  
  /**
   * Add type-specific visual features for distinct silhouettes
   */
  _addTypeFeatures(type, def, group, body, head) {
    const s = def.size;
    const bY = body.position.y;
    const hY = head.position.y;
    const headRad = Math.max(s.head[0], s.head[1], s.head[2]) / 2;
    const bodyRad = (s.body[0] / 2 + s.body[2] / 2) / 2;
    const armXOffset = bodyRad + s.body[0] * 0.12 * 1.2;

    switch (type) {

      case 'zombie': {
        // Hunched posture
        body.rotation.x = 0.15;
        head.position.z = headRad * 0.3;

        // Asymmetric head (squished)
        head.scale.set(1.1, 0.85, 0.95);

        // Bone protrusions
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.5, metalness: 0.05 });
        for (let i = 0; i < 3; i++) {
          const boneGeo = new THREE.ConeGeometry(0.04 * (1 + i * 0.2), 0.18 + i * 0.06, 5);
          const bone = new THREE.Mesh(boneGeo, boneMat);
          const angle = (i / 3) * Math.PI * 1.5 - 0.5;
          bone.position.set(
            Math.cos(angle) * bodyRad * 0.9,
            bY + (i - 1) * s.body[1] * 0.2,
            Math.sin(angle) * bodyRad * 0.9
          );
          bone.rotation.z = Math.cos(angle) * 0.6;
          bone.rotation.x = -Math.sin(angle) * 0.6;
          group.add(bone);
        }

        // Torn flesh patches
        const fleshMat = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 0.9, metalness: 0.0 });
        for (let i = 0; i < 4; i++) {
          const pw = 0.08 + Math.random() * 0.1;
          const patchGeo = new THREE.BoxGeometry(pw, pw, 0.02);
          const patch = new THREE.Mesh(patchGeo, fleshMat);
          patch.position.set(
            (Math.random() - 0.5) * s.body[0] * 0.8,
            bY + (Math.random() - 0.5) * s.body[1] * 0.6,
            bodyRad + 0.02
          );
          patch.rotation.z = Math.random() * 0.5;
          group.add(patch);
        }

        // Hanging jaw piece
        const jawGeo = new THREE.BoxGeometry(headRad * 0.6, headRad * 0.25, headRad * 0.4);
        const jawMat = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, roughness: 0.8, metalness: 0.0 });
        const jaw = new THREE.Mesh(jawGeo, jawMat);
        jaw.position.set(0, hY - headRad * 0.85, headRad * 0.3);
        group.add(jaw);
        break;
      }

      case 'fast': {
        // Lean forward tilt
        body.rotation.x = 0.2;
        head.position.z = headRad * 0.4;

        // Arms trail back
        group.children.forEach(c => {
          if (c.userData && c.userData.isArm) {
            c.rotation.x = 0.5;
            c.position.z = -s.body[2] * 0.3;
          }
        });

        // Fin crest on head
        const finMat = new THREE.MeshStandardMaterial({ color: 0xcc55cc, roughness: 0.4, metalness: 0.3 });
        const finGeo = new THREE.ConeGeometry(headRad * 0.35, headRad * 1.8, 4);
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.position.set(0, hY + headRad * 0.9, -headRad * 0.3);
        fin.rotation.x = -0.15;
        group.add(fin);

        // Swept-back shoulder spikes
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0xaa44aa, roughness: 0.3, metalness: 0.4 });
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 2; i++) {
            const spikeGeo = new THREE.ConeGeometry(0.04, 0.2 + i * 0.08, 4);
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.set(
              side * (bodyRad + 0.06),
              bY + s.body[1] * 0.25 - i * 0.1,
              -s.body[2] * 0.2 - i * 0.1
            );
            spike.rotation.x = -0.8;
            group.add(spike);
          }
        }
        break;
      }

      case 'tank': {
        const armorCol = 0x665533;
        const armorMat = new THREE.MeshStandardMaterial({ color: armorCol, roughness: 0.4, metalness: 0.5 });

        // Shoulder pauldrons (half-sphere look via short cylinders)
        for (let side = -1; side <= 1; side += 2) {
          const pauldronGeo = new THREE.CylinderGeometry(0.05, s.body[0] * 0.3, s.body[1] * 0.22, 10);
          const pauldron = new THREE.Mesh(pauldronGeo, armorMat);
          pauldron.position.set(side * (bodyRad + s.body[0] * 0.18), bY + s.body[1] * 0.32, 0);
          group.add(pauldron);
        }

        // Front chest plate
        const chestGeo = new THREE.BoxGeometry(s.body[0] * 0.7, s.body[1] * 0.5, 0.08);
        const chestMat = new THREE.MeshStandardMaterial({ color: 0x554422, roughness: 0.35, metalness: 0.55 });
        const chest = new THREE.Mesh(chestGeo, chestMat);
        chest.position.set(0, bY + s.body[1] * 0.05, bodyRad + 0.04);
        group.add(chest);

        // Rivets
        const rivetMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.8 });
        const rivetGeo = new THREE.SphereGeometry(0.035, 6, 6);
        const rivetPositions = [
          [-0.15, 0.12], [0.15, 0.12], [-0.15, -0.12], [0.15, -0.12], [0, 0]
        ];
        rivetPositions.forEach(([rx, ry]) => {
          const rivet = new THREE.Mesh(rivetGeo, rivetMat);
          rivet.position.set(rx, bY + s.body[1] * 0.05 + ry, bodyRad + 0.09);
          group.add(rivet);
        });

        // Belt
        const beltGeo = new THREE.TorusGeometry(bodyRad * 1.05, 0.04, 6, 16);
        const beltMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.5, metalness: 0.4 });
        const belt = new THREE.Mesh(beltGeo, beltMat);
        belt.position.set(0, bY - s.body[1] * 0.35, 0);
        belt.rotation.x = Math.PI / 2;
        group.add(belt);
        break;
      }

      case 'exploding': {
        // Glowing body material
        body.material = new THREE.MeshStandardMaterial({
          color: 0xff6600, roughness: 0.3, metalness: 0.2,
          emissive: 0xff4400, emissiveIntensity: 0.6
        });

        // Fuse on top
        const fuseGeo = new THREE.CylinderGeometry(0.025, 0.025, headRad * 1.5, 6);
        const fuseMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8, metalness: 0.1 });
        const fuse = new THREE.Mesh(fuseGeo, fuseMat);
        fuse.position.set(0, hY + headRad * 0.8, 0);
        group.add(fuse);

        // Fuse tip spark
        const sparkGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffff44 });
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        spark.position.set(0, hY + headRad * 1.5, 0);
        group.add(spark);

        // Glowing cracks on body
        const crackMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
        for (let i = 0; i < 5; i++) {
          const crackGeo = new THREE.BoxGeometry(0.015, s.body[1] * (0.2 + Math.random() * 0.3), 0.015);
          const crack = new THREE.Mesh(crackGeo, crackMat);
          const angle = (i / 5) * Math.PI * 2;
          crack.position.set(
            Math.cos(angle) * bodyRad * 0.95,
            bY + (Math.random() - 0.5) * s.body[1] * 0.3,
            Math.sin(angle) * bodyRad * 0.95
          );
          crack.rotation.z = (Math.random() - 0.5) * 0.6;
          crack.rotation.y = angle;
          group.add(crack);
        }

        // Pulsing inner core (transparent)
        const coreGeo = new THREE.SphereGeometry(bodyRad * 0.55, 10, 10);
        const coreMat = new THREE.MeshBasicMaterial({
          color: 0xffcc00, transparent: true, opacity: 0.35
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(0, bY, 0);
        group.add(core);
        break;
      }

      case 'ogre': {
        // Tusks curving from jaw
        const tuskMat = new THREE.MeshStandardMaterial({ color: 0xeeddbb, roughness: 0.3, metalness: 0.2 });
        for (let side = -1; side <= 1; side += 2) {
          const tuskGeo = new THREE.ConeGeometry(headRad * 0.14, headRad * 1.2, 6);
          const tusk = new THREE.Mesh(tuskGeo, tuskMat);
          tusk.position.set(side * headRad * 0.55, hY - headRad * 0.5, headRad * 0.6);
          tusk.rotation.x = -0.4;
          tusk.rotation.z = side * 0.3;
          group.add(tusk);
        }

        // Heavy brow ridge
        const browGeo = new THREE.BoxGeometry(headRad * 1.8, headRad * 0.2, headRad * 0.35);
        const browMat = new THREE.MeshStandardMaterial({ color: 0x6a4a1a, roughness: 0.8, metalness: 0.1 });
        const brow = new THREE.Mesh(browGeo, browMat);
        brow.position.set(0, hY + headRad * 0.45, headRad * 0.6);
        group.add(brow);

        // Chain around neck
        const chainGeo = new THREE.TorusGeometry(headRad * 0.85, 0.04, 6, 18);
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.3, metalness: 0.8 });
        const chain = new THREE.Mesh(chainGeo, chainMat);
        chain.position.set(0, hY - headRad * 0.7, 0);
        chain.rotation.x = Math.PI / 2;
        group.add(chain);

        // Battle scars
        const scarMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9, metalness: 0.0 });
        for (let i = 0; i < 3; i++) {
          const scarGeo = new THREE.BoxGeometry(0.04, s.body[1] * (0.15 + i * 0.05), 0.02);
          const scar = new THREE.Mesh(scarGeo, scarMat);
          scar.position.set(
            (i - 1) * bodyRad * 0.5,
            bY + (i - 1) * 0.15,
            bodyRad + 0.02
          );
          scar.rotation.z = (i - 1) * 0.3;
          group.add(scar);
        }

        // Spiked club in right hand
        const clubMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.6, metalness: 0.3 });
        const clubGeo = new THREE.CylinderGeometry(0.06, 0.08, s.body[1] * 0.7, 6);
        const club = new THREE.Mesh(clubGeo, clubMat);
        club.position.set(armXOffset, bY - s.body[1] * 0.35, 0);
        group.add(club);

        // Club spikes
        const cSpikeMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.6 });
        for (let i = 0; i < 4; i++) {
          const csGeo = new THREE.ConeGeometry(0.04, 0.15, 4);
          const cs = new THREE.Mesh(csGeo, cSpikeMat);
          const a = (i / 4) * Math.PI * 2;
          cs.position.set(
            armXOffset + Math.cos(a) * 0.1,
            bY - s.body[1] * 0.45 + (i % 2) * 0.1,
            Math.sin(a) * 0.1
          );
          cs.rotation.z = -Math.cos(a) * 1.2;
          cs.rotation.x = Math.sin(a) * 1.2;
          group.add(cs);
        }
        break;
      }

      case 'fireDragon': {
        // Long snout extending from head
        const snoutGeo = new THREE.ConeGeometry(headRad * 0.35, headRad * 1.4, 6);
        const snoutMat = new THREE.MeshStandardMaterial({ color: 0xcc3300, roughness: 0.6, metalness: 0.15 });
        const snout = new THREE.Mesh(snoutGeo, snoutMat);
        snout.position.set(0, hY - headRad * 0.15, headRad * 1.1);
        snout.rotation.x = Math.PI / 2;
        group.add(snout);

        // Wings (bone frame + membrane)
        const wingBoneMat = new THREE.MeshStandardMaterial({ color: 0x882200, roughness: 0.5, metalness: 0.3 });
        const wingMemMat = new THREE.MeshStandardMaterial({
          color: 0xff4400, roughness: 0.6, metalness: 0.1,
          transparent: true, opacity: 0.7, side: THREE.DoubleSide
        });
        for (let side = -1; side <= 1; side += 2) {
          // Wing bone
          const boneLen = s.body[0] * 1.2;
          const wBoneGeo = new THREE.CylinderGeometry(0.04, 0.02, boneLen, 5);
          const wBone = new THREE.Mesh(wBoneGeo, wingBoneMat);
          wBone.position.set(side * (bodyRad + boneLen * 0.35), bY + s.body[1] * 0.3, -s.body[2] * 0.1);
          wBone.rotation.z = side * 1.1;
          group.add(wBone);

          // Secondary bone
          const wBone2Geo = new THREE.CylinderGeometry(0.03, 0.015, boneLen * 0.7, 5);
          const wBone2 = new THREE.Mesh(wBone2Geo, wingBoneMat);
          wBone2.position.set(side * (bodyRad + boneLen * 0.6), bY + s.body[1] * 0.1, -s.body[2] * 0.1);
          wBone2.rotation.z = side * 0.7;
          group.add(wBone2);

          // Membrane
          const memGeo = new THREE.BoxGeometry(boneLen * 0.9, s.body[1] * 0.55, 0.02);
          const mem = new THREE.Mesh(memGeo, wingMemMat);
          mem.position.set(side * (bodyRad + boneLen * 0.45), bY + s.body[1] * 0.18, -s.body[2] * 0.12);
          mem.rotation.z = side * 0.25;
          group.add(mem);
        }

        // Dorsal spines along back
        const spineMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.4, metalness: 0.3 });
        for (let i = 0; i < 6; i++) {
          const spH = 0.15 + 0.1 * Math.sin(i * 0.8);
          const spGeo = new THREE.ConeGeometry(0.05, spH, 4);
          const sp = new THREE.Mesh(spGeo, spineMat);
          sp.position.set(0, bY + s.body[1] * (0.1 + i * 0.12), -bodyRad - 0.03);
          group.add(sp);
        }

        // Tail (diminishing spheres)
        const tailMat = new THREE.MeshStandardMaterial({ color: 0xbb3300, roughness: 0.6, metalness: 0.15 });
        for (let i = 0; i < 5; i++) {
          const tRad = bodyRad * (0.35 - i * 0.05);
          const tGeo = new THREE.SphereGeometry(Math.max(tRad, 0.04), 8, 6);
          const t = new THREE.Mesh(tGeo, tailMat);
          t.position.set(0, bY - s.body[1] * 0.15 - i * 0.08, -bodyRad - 0.15 - i * 0.25);
          group.add(t);
        }

        // Glowing belly
        const bellyGeo = new THREE.CylinderGeometry(bodyRad * 0.7, bodyRad * 0.8, s.body[1] * 0.4, 10);
        const bellyMat = new THREE.MeshStandardMaterial({
          color: 0xff6600, roughness: 0.5, metalness: 0.1,
          emissive: 0xff4400, emissiveIntensity: 0.5
        });
        const belly = new THREE.Mesh(bellyGeo, bellyMat);
        belly.position.set(0, bY - s.body[1] * 0.2, bodyRad * 0.2);
        group.add(belly);
        break;
      }

      case 'giant': {
        // Crystal crown
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0x44dddd, roughness: 0.2, metalness: 0.5,
          emissive: 0x22aaaa, emissiveIntensity: 0.4
        });
        for (let i = 0; i < 5; i++) {
          const cH = 0.2 + Math.random() * 0.25;
          const cGeo = new THREE.ConeGeometry(0.05 + Math.random() * 0.03, cH, 5);
          const crystal = new THREE.Mesh(cGeo, crystalMat);
          const a = (i / 5) * Math.PI * 2;
          crystal.position.set(
            Math.cos(a) * headRad * 0.55,
            hY + headRad * 0.7 + cH * 0.3,
            Math.sin(a) * headRad * 0.55
          );
          crystal.rotation.z = Math.cos(a) * 0.2;
          crystal.rotation.x = -Math.sin(a) * 0.2;
          group.add(crystal);
        }

        // Rocky texture patches on body/arms
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x445544, roughness: 0.95, metalness: 0.05 });
        for (let i = 0; i < 6; i++) {
          const rw = 0.1 + Math.random() * 0.12;
          const rGeo = new THREE.BoxGeometry(rw, rw * 0.7, rw * 0.5);
          const rock = new THREE.Mesh(rGeo, rockMat);
          const a = (i / 6) * Math.PI * 2;
          rock.position.set(
            Math.cos(a) * bodyRad * 1.02,
            bY + (Math.random() - 0.5) * s.body[1] * 0.7,
            Math.sin(a) * bodyRad * 1.02
          );
          rock.rotation.y = a;
          group.add(rock);
        }

        // Glowing rune lines on chest
        const runeMat = new THREE.MeshBasicMaterial({ color: 0x66ffff });
        const runePatterns = [
          { w: 0.03, h: s.body[1] * 0.4, oX: 0, oY: 0 },
          { w: s.body[0] * 0.3, h: 0.03, oX: 0, oY: s.body[1] * 0.1 },
          { w: s.body[0] * 0.2, h: 0.03, oX: 0, oY: -s.body[1] * 0.1 },
        ];
        runePatterns.forEach(({ w, h, oX, oY }) => {
          const rGeo = new THREE.BoxGeometry(w, h, 0.02);
          const rune = new THREE.Mesh(rGeo, runeMat);
          rune.position.set(oX, bY + oY, bodyRad + 0.03);
          group.add(rune);
        });

        // Massive fists (oversized spheres on arm ends)
        const fistMat = new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.8, metalness: 0.15 });
        const fistRad = s.body[0] * 0.22;
        const fistGeo = new THREE.SphereGeometry(fistRad, 10, 8);
        for (let side = -1; side <= 1; side += 2) {
          const fist = new THREE.Mesh(fistGeo, fistMat);
          fist.position.set(side * armXOffset, bY - s.body[1] * 0.6 * 0.45, 0);
          group.add(fist);
        }
        break;
      }

      case 'shield': {
        // Round shield (cylinder disc with metallic material)
        const shieldRad = Math.max(s.body[0], s.body[1]) * 0.65;
        const shieldGeo = new THREE.CylinderGeometry(shieldRad, shieldRad, 0.06, 20);
        const shieldMat = new THREE.MeshStandardMaterial({
          color: 0x5588cc, roughness: 0.25, metalness: 0.7,
          transparent: true, opacity: 0.9
        });
        const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        shieldMesh.position.set(0, bY, bodyRad + 0.12);
        shieldMesh.rotation.x = Math.PI / 2;
        shieldMesh.userData.isShield = true;
        group.add(shieldMesh);

        // Shield boss/emblem in center
        const bossGeo = new THREE.SphereGeometry(shieldRad * 0.25, 8, 8);
        const bossMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.15, metalness: 0.85 });
        const bossMesh = new THREE.Mesh(bossGeo, bossMat);
        bossMesh.position.set(0, bY, bodyRad + 0.16);
        group.add(bossMesh);

        // Helmet visor
        const visorGeo = new THREE.BoxGeometry(headRad * 1.6, headRad * 0.25, 0.03);
        const visorMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.3, metalness: 0.7 });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, hY + headRad * 0.05, headRad + 0.02);
        group.add(visor);

        // Armor trim at waist and shoulders
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.6 });
        const waistTrim = new THREE.Mesh(
          new THREE.TorusGeometry(bodyRad * 1.05, 0.025, 6, 16), trimMat
        );
        waistTrim.position.set(0, bY - s.body[1] * 0.35, 0);
        waistTrim.rotation.x = Math.PI / 2;
        group.add(waistTrim);

        const shoulderTrim = new THREE.Mesh(
          new THREE.TorusGeometry(bodyRad * 1.0, 0.02, 6, 16), trimMat
        );
        shoulderTrim.position.set(0, bY + s.body[1] * 0.35, 0);
        shoulderTrim.rotation.x = Math.PI / 2;
        group.add(shoulderTrim);
        break;
      }

      case 'jumping': {
        // Large bulging eyes (green glow)
        const bigEyeMat = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
        const bigEyeRad = headRad * 0.35;
        const bigEyeGeo = new THREE.SphereGeometry(bigEyeRad, 10, 10);
        for (let side = -1; side <= 1; side += 2) {
          const bigEye = new THREE.Mesh(bigEyeGeo, bigEyeMat);
          bigEye.position.set(side * headRad * 0.45, hY + headRad * 0.2, headRad * 0.7);
          group.add(bigEye);
        }

        // Spring-coil legs (torus rings stacked)
        const coilMat = new THREE.MeshStandardMaterial({ color: 0x33cc33, roughness: 0.4, metalness: 0.5 });
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 3; i++) {
            const coilGeo = new THREE.TorusGeometry(s.body[0] * 0.16, 0.02, 6, 12);
            const coil = new THREE.Mesh(coilGeo, coilMat);
            coil.position.set(side * s.body[0] * 0.25, 0.1 + i * 0.12, 0);
            coil.rotation.x = Math.PI / 2;
            group.add(coil);
          }
        }

        // Webbed feet
        const footMat = new THREE.MeshStandardMaterial({ color: 0x228822, roughness: 0.7, metalness: 0.1 });
        for (let side = -1; side <= 1; side += 2) {
          const footGeo = new THREE.BoxGeometry(s.body[0] * 0.45, 0.04, s.body[2] * 0.8);
          const foot = new THREE.Mesh(footGeo, footMat);
          foot.position.set(side * s.body[0] * 0.25, 0.02, s.body[2] * 0.15);
          group.add(foot);
        }
        break;
      }

      case 'ranged': {
        // Hood/cloak shape over head
        const hoodGeo = new THREE.ConeGeometry(headRad * 1.4, headRad * 2.2, 8);
        const hoodMat = new THREE.MeshStandardMaterial({
          color: 0x221122, roughness: 0.9, metalness: 0.0,
          transparent: true, opacity: 0.85
        });
        const hood = new THREE.Mesh(hoodGeo, hoodMat);
        hood.position.set(0, hY + headRad * 0.3, -headRad * 0.15);
        group.add(hood);

        // Staff in right hand
        const staffMat = new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.5, metalness: 0.2 });
        const staffLen = s.body[1] * 1.3;
        const staffGeo = new THREE.CylinderGeometry(0.025, 0.03, staffLen, 6);
        const staff = new THREE.Mesh(staffGeo, staffMat);
        const staffX = bodyRad + s.body[0] * 0.2;
        staff.position.set(staffX, bY - 0.1, 0);
        group.add(staff);

        // Glowing orb on top of staff
        const orbGeo = new THREE.SphereGeometry(0.1, 10, 10);
        const orbMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(staffX, bY + staffLen * 0.45, 0);
        group.add(orb);

        // Floating runes around
        const runeMat2 = new THREE.MeshBasicMaterial({ color: 0xff6666 });
        for (let i = 0; i < 3; i++) {
          const runeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.015);
          const rune = new THREE.Mesh(runeGeo, runeMat2);
          const a = (i / 3) * Math.PI * 2 + 0.5;
          rune.position.set(
            Math.cos(a) * (bodyRad + 0.35),
            bY + s.body[1] * 0.2 + i * 0.1,
            Math.sin(a) * (bodyRad + 0.35)
          );
          rune.rotation.y = a;
          rune.rotation.z = 0.4;
          group.add(rune);
        }
        break;
      }

      case 'charger': {
        // Large forward-facing horns
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xeeddaa, roughness: 0.3, metalness: 0.3 });
        for (let side = -1; side <= 1; side += 2) {
          const hornGeo = new THREE.ConeGeometry(headRad * 0.18, headRad * 1.5, 6);
          const horn = new THREE.Mesh(hornGeo, hornMat);
          horn.position.set(side * headRad * 0.5, hY + headRad * 0.3, headRad * 0.7);
          horn.rotation.x = Math.PI / 2;
          horn.rotation.z = side * -0.15;
          group.add(horn);
        }

        // Nose ring
        const ringGeo = new THREE.TorusGeometry(headRad * 0.2, 0.02, 6, 12);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.2, metalness: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, hY - headRad * 0.35, headRad * 0.9);
        group.add(ring);

        // Armored hide plates on shoulders
        const plateMat = new THREE.MeshStandardMaterial({ color: 0xbb7700, roughness: 0.5, metalness: 0.4 });
        for (let side = -1; side <= 1; side += 2) {
          const plateGeo = new THREE.BoxGeometry(s.body[0] * 0.3, s.body[1] * 0.25, s.body[2] * 0.5);
          const plate = new THREE.Mesh(plateGeo, plateMat);
          plate.position.set(side * (bodyRad + s.body[0] * 0.18), bY + s.body[1] * 0.3, 0);
          group.add(plate);
        }

        // Hoofed feet (wider at base cylinders)
        const hoofMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7, metalness: 0.2 });
        for (let side = -1; side <= 1; side += 2) {
          const hoofGeo = new THREE.CylinderGeometry(s.body[0] * 0.12, s.body[0] * 0.2, 0.15, 8);
          const hoof = new THREE.Mesh(hoofGeo, hoofMat);
          hoof.position.set(side * s.body[0] * 0.25, 0.07, 0);
          group.add(hoof);
        }
        break;
      }

      case 'splitter': {
        // Make body blobby (sphere)
        const blobRad = Math.max(s.body[0], s.body[1], s.body[2]) / 2;
        const blobGeo = new THREE.SphereGeometry(blobRad, 12, 10);
        const blobMat = new THREE.MeshStandardMaterial({
          color: def.color, roughness: 0.5, metalness: 0.15,
          transparent: true, opacity: 0.85
        });
        const blob = new THREE.Mesh(blobGeo, blobMat);
        blob.position.set(0, bY, 0);
        group.add(blob);

        // Internal bubbles
        const bubbleMat = new THREE.MeshStandardMaterial({
          color: 0xbb77ee, roughness: 0.3, metalness: 0.1,
          transparent: true, opacity: 0.3
        });
        for (let i = 0; i < 4; i++) {
          const bRad = 0.04 + Math.random() * 0.05;
          const bGeo = new THREE.SphereGeometry(bRad, 6, 6);
          const bubble = new THREE.Mesh(bGeo, bubbleMat);
          bubble.position.set(
            (Math.random() - 0.5) * blobRad * 0.8,
            bY + (Math.random() - 0.5) * blobRad * 0.8,
            (Math.random() - 0.5) * blobRad * 0.8
          );
          group.add(bubble);
        }

        // Nucleus glow
        const nucleusGeo = new THREE.SphereGeometry(blobRad * 0.3, 8, 8);
        const nucleusMat = new THREE.MeshBasicMaterial({ color: 0xdd88ff });
        const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
        nucleus.position.set(0, bY, 0);
        group.add(nucleus);

        // Drip tendrils below
        const dripMat = new THREE.MeshStandardMaterial({
          color: 0x7733aa, roughness: 0.6, metalness: 0.1,
          transparent: true, opacity: 0.7
        });
        for (let i = 0; i < 3; i++) {
          const dH = 0.15 + Math.random() * 0.15;
          const dGeo = new THREE.ConeGeometry(0.035, dH, 5);
          const drip = new THREE.Mesh(dGeo, dripMat);
          drip.position.set(
            (i - 1) * blobRad * 0.4,
            bY - blobRad - dH * 0.3,
            (Math.random() - 0.5) * blobRad * 0.3
          );
          drip.rotation.x = Math.PI;
          group.add(drip);
        }
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
      // Charger: use charge speed when close to army
      // Bosses: stop at a distance and fight (don't walk past army)
      let moveSpeed = def.walkSpeed;
      if (def.isBoss && !enemy.bossCharging) {
        if (enemy.worldZ > BOSS_STOP_DISTANCE) {
          moveSpeed = 0;
          enemy.worldZ = Math.min(enemy.worldZ, BOSS_STOP_DISTANCE);
        }
      } else if (def.charges && enemy.worldZ > -(def.chargeDistance || 8)) {
        enemy.charging = true;
        moveSpeed = def.chargeSpeed;
      }
      if (!enemy.bossCharging) {
        enemy.worldZ += moveSpeed * dt;
      }
      enemy.group.position.z = enemy.worldZ;
      
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
      
      // Boss attack patterns — bosses actively fight back
      if (def.isBoss) {
        soldierLosses += this._updateBossAttacks(enemy, dt, armyX);
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
      
      // Hit scale pulse decay
      if (enemy.hitScale && enemy.hitScale > 1.0) {
        enemy.hitScale -= dt * 4;
        if (enemy.hitScale < 1.0) enemy.hitScale = 1.0;
        const s = enemy.hitScale * (def.scale || 1);
        enemy.group.scale.set(s, s, s);
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
        // Jumping enemies: bullets miss during jump (check bullet Y vs enemy total Y position)
        if (def.jumps && enemy.jumpY > 1.0 && by < (enemy.jumpY + 2.5 * scale)) {
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
    
    // Hit reaction: brief scale pulse
    enemy.hitScale = 1.2;
    
    // Hit spark + damage number visual feedback
    this.effects.hitSpark(enemy.worldX, 1.5, enemy.worldZ);
    this.effects.damageNumber(enemy.worldX, 2, enemy.worldZ, damage);
    
    // Immediately update HP bar visual
    this._updateHPBar(enemy);
    
    if (window.audioManager) window.audioManager.enemyHit();
    
    if (enemy.hp <= 0) {
      enemy.dead = true;
      enemy.deathTimer = 0;
      
      if (window.audioManager) window.audioManager.enemyDeath();
      
      // Death particles — enhanced for visual impact
      this.effects.explode(enemy.worldX, 1, enemy.worldZ, enemy.def.color, 25, 5);
      this.effects.explode(enemy.worldX, 1.5, enemy.worldZ, 0xff4400, 10, 3);
      
      // Check for explosion
      let exploded = false;
      if (enemy.def.explodes) {
        exploded = true;
        this._doExplosion(enemy);
      }
      
      // Splitter: spawn smaller units on death
      if (enemy.def.splits) {
        this._doSplit(enemy);
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

  _doSplit(enemy) {
    const splitCount = enemy.def.splitCount || 2;
    for (let s = 0; s < splitCount; s++) {
      const child = this._getEnemy(enemy.type);
      child.hp = Math.ceil(enemy.def.hp * 0.3);
      child.maxHp = child.hp;
      child.worldX = enemy.worldX + (s - (splitCount - 1) / 2) * 1.5;
      // Clamp to road boundaries
      child.worldX = Math.max(-ENEMY_ROAD_HALF, Math.min(ENEMY_ROAD_HALF, child.worldX));
      child.worldZ = enemy.worldZ - 1;
      child.group.position.set(child.worldX, 0, child.worldZ);
      // Make children smaller
      const childScale = enemy.def.scale * 0.65;
      child.group.scale.set(childScale, childScale, childScale);
      // Prevent infinite splitting - children don't split again
      child.def = Object.assign({}, enemy.def, { splits: false });
      this.enemies.push(child);
    }
    this.effects.explode(enemy.worldX, 1, enemy.worldZ, 0xcc66ff, 12, 4);
  }
  
  /**
   * Boss attack patterns — rock throw, projectile, charge
   * @returns {number} soldier losses from boss attacks this frame
   */
  _updateBossAttacks(boss, dt, armyX) {
    let soldierLosses = 0;
    
    // Enrage at 50% HP — faster attacks
    if (!boss.bossEnraged && boss.hp <= boss.maxHp * 0.5) {
      boss.bossEnraged = true;
      this.effects.explode(boss.worldX, 2, boss.worldZ, 0xff0000, 30, 6);
      this.effects.screenFlash(0xff0000, 0.6);
    }
    
    const attackSpeedMult = boss.bossEnraged ? 1.5 : 1.0;
    
    // 1. Rock throw — boss hurls rocks at army on interval
    boss.bossRockTimer += dt * attackSpeedMult;
    if (boss.bossRockTimer >= BOSS_ROCK_INTERVAL) {
      boss.bossRockTimer = 0;
      
      const rockCount = boss.bossEnraged ? 3 : 1;
      for (let r = 0; r < rockCount; r++) {
        const spreadX = (r - (rockCount - 1) / 2) * 2.5;
        const speed = 10 + Math.random() * 3;
        const dx = armyX - boss.worldX + spreadX;
        const dz = 0 - boss.worldZ;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        
        boss.bossProjectiles.push({
          x: boss.worldX,
          y: 2.0,
          z: boss.worldZ,
          vx: (dx / dist) * speed,
          vz: (dz / dist) * speed,
          life: 3.0,
          active: true,
          isRock: true
        });
      }
      
      // Visual feedback — rock throw effect
      this.effects.explode(boss.worldX, 2, boss.worldZ, 0x886644, 12, 4);
      if (window.audioManager) window.audioManager.bossAttack();
    }
    
    // 2. Projectile attack — boss shoots at army on interval
    boss.bossAttackTimer += dt * attackSpeedMult;
    if (boss.bossAttackTimer >= BOSS_PROJ_INTERVAL) {
      boss.bossAttackTimer = 0;
      
      const projCount = boss.bossEnraged ? 3 : 1;
      for (let p = 0; p < projCount; p++) {
        const spreadAngle = (p - (projCount - 1) / 2) * 0.3;
        const speed = 12 + Math.random() * 4;
        const dx = armyX - boss.worldX + Math.sin(spreadAngle) * 3;
        const dz = 0 - boss.worldZ;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        
        boss.bossProjectiles.push({
          x: boss.worldX,
          y: 1.5,
          z: boss.worldZ,
          vx: (dx / dist) * speed,
          vz: (dz / dist) * speed,
          life: 3.0,
          active: true
        });
      }
      
      this.effects.explode(boss.worldX, 2, boss.worldZ, boss.def.color, 8, 3);
      if (window.audioManager) window.audioManager.shoot();
    }
    
    // Update boss projectiles
    for (let p = boss.bossProjectiles.length - 1; p >= 0; p--) {
      const proj = boss.bossProjectiles[p];
      if (!proj.active) { boss.bossProjectiles.splice(p, 1); continue; }
      
      proj.x += proj.vx * dt;
      proj.z += proj.vz * dt;
      proj.life -= dt;
      
      if (proj.life <= 0 || Math.abs(proj.x) > 20 || proj.z > 5) {
        proj.active = false;
        boss.bossProjectiles.splice(p, 1);
        continue;
      }
      
      // Check hit against army position (near Z=0)
      if (proj.z > -BOSS_PROJ_HIT_ZONE_Z && proj.z < BOSS_PROJ_HIT_ZONE_Z && Math.abs(proj.x - armyX) < BOSS_PROJ_HIT_ZONE_X) {
        if (proj.isRock) {
          soldierLosses += boss.bossEnraged ? BOSS_ROCK_DAMAGE_ENRAGED : BOSS_ROCK_DAMAGE;
          this.effects.explode(proj.x, 1, proj.z, 0x886644, 15, 4);
        } else {
          soldierLosses += boss.bossEnraged ? BOSS_PROJ_DAMAGE_ENRAGED : BOSS_PROJ_DAMAGE;
          this.effects.explode(proj.x, 1, proj.z, 0xff4400, 10, 3);
        }
        proj.active = false;
        boss.bossProjectiles.splice(p, 1);
      } else {
        const trailColor = proj.isRock ? 0x886644 : 0xff6600;
        this.effects.explode(proj.x, proj.y, proj.z, trailColor, 1, 1);
      }
    }
    
    // 3. Charge attack — rush forward then retreat on interval
    boss.bossChargeTimer += dt * attackSpeedMult;
    if (boss.bossChargeTimer >= BOSS_CHARGE_INTERVAL && !boss.bossCharging) {
      boss.bossCharging = true;
      boss.bossChargeSpeed = BOSS_CHARGE_SPEED;
      boss.bossChargeTimer = 0;
      
      // Warning effect
      this.effects.explode(boss.worldX, 1, boss.worldZ, 0xffaa00, 15, 4);
    }
    
    if (boss.bossCharging) {
      boss.worldZ += boss.bossChargeSpeed * dt;
      boss.group.position.z = boss.worldZ;
      
      // Check contact with army — kills soldiers on contact
      if (boss.worldZ > -2 && boss.worldZ < 2) {
        soldierLosses += boss.bossEnraged ? BOSS_CHARGE_DAMAGE_ENRAGED : BOSS_CHARGE_DAMAGE;
        this.effects.explode(boss.worldX, 1, 0, 0xff0000, 15, 4);
        if (this.effects.camCtrl) this.effects.camCtrl.shake(1.2);
      }
      
      // Retreat after reaching past army
      if (boss.worldZ > 0) {
        boss.bossChargeSpeed = BOSS_CHARGE_RETREAT_SPEED;
      }
      
      // End charge when returned past stop distance
      if (boss.worldZ < BOSS_STOP_DISTANCE - 3) {
        boss.bossCharging = false;
        boss.bossChargeSpeed = 0;
      }
    }
    
    return soldierLosses;
  }
  
  /**
   * Release enemy back to pool
   */
  _releaseEnemy(enemy) {
    // Clean up boss projectiles
    if (enemy.bossProjectiles) enemy.bossProjectiles.length = 0;
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
