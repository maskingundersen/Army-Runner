// src/game.js — Three.js 3D Army Runner game (9-segment endless loop)
// Slim orchestrator — delegates to WorldBuilder, SegmentManager, BarrelSystem,
// MilestoneSystem, and HUDController.

// Base game constants — high-intensity pacing
const BASE_SCROLL_SPEED = 20;
const MAX_SCROLL_SPEED = 28;
const SCROLL_SPEED_PER_CYCLE = 1.0;
const OBSTACLE_CLEANUP_THRESHOLD = 50;

// Army size control
const ARMY_SOFT_CAP = 40;
const ARMY_HARD_CAP = 80;
const ARMY_BOSS_CAP = 150;
const ARMY_DECAY_THRESHOLD = 70;
const ARMY_DECAY_INTERVAL = 4.0; // seconds between decay ticks

class ArmyRunnerGame {
  constructor() {
    // THREE.js setup
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();

    // Camera: portrait mobile aspect
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000);

    // Resize handling
    window.addEventListener('resize', () => this._onResize());
    this._onResize();

    // World builder — lights, road, trees, env palette
    this.world = new WorldBuilder(this.scene);
    this.world.setupLights();

    // Background / sky
    this.scene.background = new THREE.Color(ENV_PALETTES[0].skyColor);
    this.scene.fog = new THREE.Fog(ENV_PALETTES[0].skyColor, ENV_PALETTES[0].fogNear, ENV_PALETTES[0].fogFar);

    this.world.buildRoad();
    this.world.buildTrees();

    // Initialize systems
    this.camCtrl = new CameraController(this.camera);
    this.effects = new EffectsManager(this.scene, this.camCtrl);
    this.armyMgr = new ArmyManager(this.scene);
    this.enemyMgr = new EnemyManager(this.scene, this.effects);
    this.projSys = new ProjectileSystem(this.scene, this.effects);
    this.gateSys = new GateSystem(this.scene, this.effects);

    // Subsystems
    this.milestoneSys = new MilestoneSystem(this);
    this.segMgr = new SegmentManager(this);
    this.barrelSys = new BarrelSystem(this);
    this.hud = new HUDController(this);

    // Game state
    this.state = 'boot';
    this.soldierCount = 1;
    this.upgrades = {};
    this.cameraZ = 0;
    this.scrollSpeed = BASE_SCROLL_SPEED;
    this.armyX = 0;
    this.armyTargetX = 0;
    this.score = 0;
    this.coins = 0;
    this.shopMeta = UpgradeSystem.loadShopMeta ? UpgradeSystem.loadShopMeta() : {};

    // Segment tracking (9-segment endless loop)
    this.currentSegment = 0;
    this.segmentCycle = 0;
    this.difficultyMult = 1.0;
    this.milestone = '';
    this.bestMilestone = this.milestoneSys.loadBestMilestone();
    this.currentBoss = null;
    this.internalSegments = [];
    this.internalSegIdx = 0;
    this.inCombat = false;
    this.nextSegmentDist = 80;

    // Active ability cooldown timers
    this._grenadeCooldown = 0;
    this._airstrikeCooldown = 0;
    this._shockwaveCooldown = 0;
    this._medicTimer = 0;

    // Continuous enemy pressure timer
    this._continuousSpawnTimer = 0;
    this._continuousSpawnInterval = 2.0;

    // Path obstacle tracking
    this._pathObstacles = [];

    // Input state
    this.isDragging = false;
    this.dragStartX = 0;
    this._setupInput();

    // UI references
    this.hud.setupUI();

    // Clock for delta time
    this.clock = new THREE.Clock();

    // Reusable cycle-message overlay (avoids DOM element leaks)
    this._cycleMsg = document.createElement('div');
    this._cycleMsg.style.cssText =
      'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);' +
      'font-size:48px;font-weight:bold;color:#44aaff;' +
      'text-shadow:2px 2px 8px rgba(0,0,0,0.8),0 0 30px rgba(68,170,255,0.5);' +
      'z-index:150;pointer-events:none;opacity:0;transition:opacity 1.5s ease-out;';
    document.body.appendChild(this._cycleMsg);

    // Hide HUD initially
    document.getElementById('hud').style.opacity = '0';

    // Start the game loop
    this._loop();
  }

  _setupInput() {
    const canvas = this.canvas;

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.state === 'boot') return;
      this.isDragging = true;
      this.dragStartX = e.clientX;
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = (e.clientX - this.dragStartX) * 0.018;
      this.armyTargetX = Math.max(-8.5, Math.min(8.5, this.armyTargetX + dx));
      this.dragStartX = e.clientX;
    });

    canvas.addEventListener('pointerup', () => { this.isDragging = false; });
    canvas.addEventListener('pointerleave', () => { this.isDragging = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  startGame() {
    this.soldierCount = 5;
    this.upgrades = {};
    this.cameraZ = 0;
    this.armyX = 0;
    this.armyTargetX = 0;
    this.coins = 0;
    this.currentSegment = 0;
    this.segmentCycle = 0;
    this.difficultyMult = 1.0;
    this.milestone = '';
    this.currentBoss = null;
    this.inCombat = false;

    // Weapon system
    this.currentWeapon = 'handgun';

    // Map layout
    this.mapLayout = Math.floor(Math.random() * MAP_LAYOUTS.length);

    // Reset ability cooldowns
    this._grenadeCooldown = 0;
    this._airstrikeCooldown = 0;
    this._shockwaveCooldown = 0;
    this._medicTimer = 0;
    this._decayTimer = 0;

    // Continuous enemy pressure timer
    this._continuousSpawnTimer = 0;
    this._continuousSpawnInterval = 2.0;

    // Companion attack timers
    this._dragonAttackTimer = 0;
    this._turretAttackTimer = 0;
    this._droneAttackTimer = 0;

    // Build internal segment sequence
    this.segMgr.buildInternalSegments();
    this.internalSegIdx = 0;
    this.nextSegmentDist = 80;

    // Apply initial environment palette
    this.world.applyEnvPalette(this.segmentCycle);

    // Clear systems
    this.enemyMgr.clear();
    this.projSys.clear();
    this.gateSys.clear();
    this.effects.clear();
    this._clearPathObstacles();
    this.barrelSys.clearBarrels();

    // Initialize army
    this.armyMgr.setCount(this.soldierCount, this.armyX);

    // Hide boot screen, show HUD
    document.getElementById('screen-boot').classList.remove('active');
    document.getElementById('hud').style.opacity = '1';

    this.state = 'running';
    this.hud.updateHUD();

    // Reset camera
    this.camCtrl.follow(this.armyX, this.soldierCount);
  }

  // ── Path obstacles (walls/barriers between SAFE and RISK paths) ──

  _spawnPathObstacles(worldZ, riskNarrow) {
    const wallHeight = 3.5;
    const wallLength = 55;
    const wallGeo = new THREE.BoxGeometry(0.6, wallHeight, wallLength);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.2 });

    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this._pathObstacles.push({ mesh: wall, worldZ: worldZ, localY: wallHeight / 2, localZ: wallLength / 2 - 10, localX: 0 });

    const rockGeo = new THREE.BoxGeometry(0.8, 1.2, 1.5);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.85, metalness: 0.1 });
    for (let i = 0; i < 4; i++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const lz = 5 + i * 4.5 + (Math.random() - 0.5) * 1.5;
      const lx = (Math.random() - 0.5) * 0.4;
      rock.rotation.y = Math.random() * 0.5;
      rock.castShadow = true;
      this.scene.add(rock);
      this._pathObstacles.push({ mesh: rock, worldZ: worldZ, localY: 0.6, localZ: lz, localX: lx });
    }

    if (riskNarrow) {
      const barrierGeo = new THREE.BoxGeometry(0.5, 2.0, 2.0);
      const barrierMat = new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.8, metalness: 0.1 });
      for (let i = 0; i < 3; i++) {
        const barrier = new THREE.Mesh(barrierGeo, barrierMat);
        const lz = 6 + i * 5;
        const lx = 3.2 + Math.random() * 0.5;
        barrier.castShadow = true;
        this.scene.add(barrier);
        this._pathObstacles.push({ mesh: barrier, worldZ: worldZ, localY: 1.0, localZ: lz, localX: lx });
      }
    }
  }

  _updatePathObstacles() {
    for (const obs of this._pathObstacles) {
      obs.mesh.position.set(obs.localX, obs.localY, obs.worldZ + obs.localZ - this.cameraZ);
    }
  }

  _clearPathObstacles() {
    for (const obs of this._pathObstacles) {
      this.scene.remove(obs.mesh);
      if (obs.mesh.geometry) obs.mesh.geometry.dispose();
      if (obs.mesh.material) obs.mesh.material.dispose();
    }
    this._pathObstacles.length = 0;
  }

  _cleanupPathObstacles() {
    for (let i = this._pathObstacles.length - 1; i >= 0; i--) {
      const obs = this._pathObstacles[i];
      if (obs.mesh.position.z > OBSTACLE_CLEANUP_THRESHOLD) {
        this.scene.remove(obs.mesh);
        if (obs.mesh.geometry) obs.mesh.geometry.dispose();
        if (obs.mesh.material) obs.mesh.material.dispose();
        this._pathObstacles.splice(i, 1);
      }
    }
  }

  _clampArmyToPath() {
    for (const obs of this._pathObstacles) {
      if (obs.localX !== 0) continue;
      const visualZ = obs.mesh.position.z;
      if (visualZ > -5 && visualZ < 25) {
        const wallHalfW = 0.7;
        if (this.armyX < -wallHalfW) {
          this.armyTargetX = Math.min(this.armyTargetX, -wallHalfW);
          this.armyX = Math.min(this.armyX, -wallHalfW);
        } else if (this.armyX > wallHalfW) {
          this.armyTargetX = Math.max(this.armyTargetX, wallHalfW);
          this.armyX = Math.max(this.armyX, wallHalfW);
        }
        break;
      }
    }
  }

  _loop() {
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state === 'running' || this.state === 'combat') {
      this._update(dt);
    }

    // Always update effects and camera
    this.effects.update(dt);
    this.camCtrl.update(dt);

    // Update screen flash overlay
    this.hud.updateScreenFlash();

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  _update(dt) {
    // 1. Scroll world
    this.cameraZ -= this.scrollSpeed * dt;

    // 2. Steer army
    this.armyX += (this.armyTargetX - this.armyX) * Math.min(1, dt * 8);
    this._clampArmyToPath();

    // 3. Update army formation
    this.armyMgr.update(dt, this.armyX, this.clock.elapsedTime, this.upgrades);
    this.armyMgr.setWeaponType(this.currentWeapon);
    this.camCtrl.follow(this.armyX, this.soldierCount);

    // 4. Update road scrolling
    this.world.updateDashes(this.cameraZ);
    this.world.updateTrees(this.cameraZ);
    this._updatePathObstacles();

    // 4b. Obstacle collision
    this.armyMgr.applyObstacleCollision(this._pathObstacles);

    // 4c. Update weapon barrels
    this.barrelSys.updateBarrels(this.cameraZ);

    // 6. Compute stats
    const stats = this._getStats();

    // 7. Enemy update
    if (this.enemyMgr.enemies.length > 0) {
      const { soldierLosses, killedEnemies } = this.enemyMgr.update(dt, this.armyX);

      if (soldierLosses > 0) {
        const armySizeMultiplier = 1 + Math.max(0, (this.soldierCount - ARMY_SOFT_CAP) / (ARMY_SOFT_CAP * 1.5));
        const effectiveLosses = Math.ceil(soldierLosses * armySizeMultiplier);
        this.soldierCount = Math.max(0, this.soldierCount - effectiveLosses);
        for (let i = 0; i < effectiveLosses; i++) {
          this.armyMgr.killSoldier();
        }
        this.armyMgr.setCount(this.soldierCount, this.armyX);
        this.camCtrl.shake(soldierLosses * 0.8);

        if (this.soldierCount <= 0) {
          this._triggerLose();
          return;
        }
        this.hud.updateHUD();
      }

      this.projSys.checkHits(this.enemyMgr, stats);
      this.barrelSys.checkBarrelBulletHitsFromProjectiles();
      this._updateAbilities(dt, stats);

      if (this.inCombat && this.enemyMgr.count === 0) {
        this.inCombat = false;
        this.world.combatLight.intensity = 0;

        if (this.currentBoss) {
          if (this.currentBoss === 'ogre') this.milestone = 'Defeated Ogre';
          else if (this.currentBoss === 'giant') this.milestone = 'Defeated Giant';
          else if (this.currentBoss === 'fireDragon') this.milestone = 'Defeated Fire Dragon';
          this.currentBoss = null;
        }

        this.segMgr.triggerNextSegment();
      }
    }

    // 7b. Medic regen
    if (stats.hasMedic) {
      this._medicTimer += dt;
      if (this._medicTimer >= 8.0) {
        this._medicTimer = 0;
        if (this.soldierCount < ARMY_SOFT_CAP) {
          this.soldierCount = Math.min(ARMY_SOFT_CAP, this.soldierCount + 1);
          this.armyMgr.setCount(this.soldierCount, this.armyX);
          this.effects.gateEffect(this.armyX, 0.5, 0, 0x44ff88);
          this.hud.updateHUD();
        }
      }
    }

    // 7c. Army decay
    if (this.soldierCount > ARMY_DECAY_THRESHOLD) {
      this._decayTimer += dt;
      if (this._decayTimer >= ARMY_DECAY_INTERVAL) {
        this._decayTimer = 0;
        this.soldierCount = Math.max(ARMY_DECAY_THRESHOLD, this.soldierCount - 1);
        this.armyMgr.killSoldier();
        this.armyMgr.setCount(this.soldierCount, this.armyX);
        this.hud.updateHUD();
      }
    }

    // 8. Update projectiles
    this.projSys.update(dt, this.armyX, 0, this.soldierCount,
      this.enemyMgr.enemies, this.upgrades, stats, null, this.armyMgr);

    // 8b. Barrel hits outside combat
    if (this.enemyMgr.enemies.length === 0) {
      this.barrelSys.checkBarrelBulletHitsFromProjectiles();
    }

    // 8c. Gates
    this.gateSys.update(this.cameraZ);
    const gateHit = this.gateSys.checkCollision(this.armyX);
    if (gateHit) {
      this._onGateHit(gateHit);
    }

    // 9. Cleanup
    this.gateSys.cleanup(this.cameraZ);
    this._cleanupPathObstacles();

    // 9b. Continuous enemy pressure
    this._continuousSpawnTimer += dt;
    if (this._continuousSpawnTimer >= this._continuousSpawnInterval) {
      this._continuousSpawnTimer = 0;
      this._continuousSpawnInterval = Math.max(1.2, 2.0 - Math.min(this.segmentCycle, 7) * 0.1);
      const spawnTypes = ['zombie', 'fast', 'zombie', 'fast', 'exploding'];
      const type = spawnTypes[Math.floor(Math.random() * spawnTypes.length)];
      const count = 1 + Math.floor(Math.random() * 3);
      const hpScale = 1 + this.segmentCycle * 0.3;
      const baseHp = type === 'fast' ? 4 : type === 'exploding' ? 6 : 10;
      const xOff = (Math.random() - 0.5) * 12;
      this.enemyMgr.spawnWave(
        [{ count, enemyType: type, hp: Math.ceil(baseHp * hpScale), xOffset: xOff }],
        -100 - Math.random() * 40,
        this.armyX,
        this.difficultyMult
      );
    }

    // 10. Trigger next segment
    if (-this.cameraZ > this.nextSegmentDist && !this.inCombat) {
      this.segMgr.triggerNextSegment();
    }

    // Update combat light position
    this.world.combatLight.position.x = this.armyX;
  }

  _getStats() {
    const us = new UpgradeSystem(null);
    return us.getStats(this.upgrades, this.shopMeta, this.currentWeapon);
  }

  // ── Active ability system (grenade, airstrike, shockwave) ──

  _updateAbilities(dt, stats) {
    const enemies = this.enemyMgr.enemies;
    const aliveEnemies = enemies.filter(e => !e.dead);
    if (aliveEnemies.length === 0) return;

    if (stats.hasGrenade) {
      this._grenadeCooldown -= dt;
      if (this._grenadeCooldown <= 0) {
        this._grenadeCooldown = 4.0;
        const target = aliveEnemies[Math.floor(aliveEnemies.length / 2)];
        if (target) {
          this.effects.explode(target.worldX, 2, target.worldZ, 0xff4400, 20, 6);
          this.effects.screenFlash(0xff4400, 0.3);
          this.camCtrl.shake(0.6);
          for (const e of aliveEnemies) {
            const dx = e.worldX - target.worldX;
            const dz = e.worldZ - target.worldZ;
            if (dx * dx + dz * dz < stats.grenadeRadius * stats.grenadeRadius) {
              this.enemyMgr.damageEnemy(e, stats.grenadeDamage);
            }
          }
          if (window.audioManager) window.audioManager.shoot();
        }
      }
    }

    if (stats.hasAirstrike) {
      this._airstrikeCooldown -= dt;
      if (this._airstrikeCooldown <= 0) {
        this._airstrikeCooldown = 8.0;
        this.effects.screenFlash(0xcc2200, 0.4);
        this.camCtrl.shake(1.0);
        for (const e of aliveEnemies) {
          this.enemyMgr.damageEnemy(e, stats.airstrikeDamage);
          this.effects.explode(e.worldX, 2, e.worldZ, 0xff6600, 5, 3);
        }
        if (window.audioManager) window.audioManager.bossRoar();
      }
    }

    if (stats.hasShockwave) {
      this._shockwaveCooldown -= dt;
      if (this._shockwaveCooldown <= 0) {
        this._shockwaveCooldown = 6.0;
        this.effects.gateEffect(this.armyX, 0.5, 0, 0x8844ff);
        this.effects.screenFlash(0x8844ff, 0.3);
        this.camCtrl.shake(0.8);
        for (const e of aliveEnemies) {
          const dx = e.worldX - this.armyX;
          const dz = e.worldZ;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < stats.shockwaveRadius) {
            this.enemyMgr.damageEnemy(e, stats.shockwaveDamage);
            if (dist > 0.5) {
              e.worldZ -= (stats.shockwaveRadius - dist) * 0.5;
              e.group.position.z = e.worldZ;
            }
          }
        }
        if (window.audioManager) window.audioManager.shoot();
      }
    }

    // Companion damage
    if (stats.hasDragon) {
      this._dragonAttackTimer += dt;
      if (this._dragonAttackTimer >= 2.0) {
        this._dragonAttackTimer = 0;
        const dragonDamage = 5 * stats.dragonCount;
        for (let d = 0; d < stats.dragonCount && d < aliveEnemies.length; d++) {
          const target = aliveEnemies[d];
          this.enemyMgr.damageEnemy(target, dragonDamage);
          this.effects.explode(target.worldX, 2, target.worldZ, 0xff4400, 10, 4);
        }
      }
    }

    if (stats.hasAutoTurret) {
      this._turretAttackTimer += dt;
      if (this._turretAttackTimer >= 1.0) {
        this._turretAttackTimer = 0;
        const turretDamage = 3;
        for (let t = 0; t < stats.autoTurretCount && t < aliveEnemies.length; t++) {
          const target = aliveEnemies[t];
          this.enemyMgr.damageEnemy(target, turretDamage);
          this.effects.explode(target.worldX, 1, target.worldZ, 0xaabb44, 5, 2);
        }
      }
    }

    if (stats.hasSideCannons) {
      this._droneAttackTimer += dt;
      if (this._droneAttackTimer >= 1.5) {
        this._droneAttackTimer = 0;
        const droneDamage = 2;
        if (aliveEnemies.length > 0) {
          const fastestEnemy = aliveEnemies.reduce((a, b) => b.worldZ > a.worldZ ? b : a);
          this.enemyMgr.damageEnemy(fastestEnemy, droneDamage);
          this.effects.explode(fastestEnemy.worldX, 2, fastestEnemy.worldZ, 0x888899, 5, 2);
        }
      }
    }
  }

  _onGateHit(gateHit) {
    const { gate, side } = gateHit;
    if (gate.passed) return;
    gate.passed = true;

    const chosen = side === 'left' ? gate.left : gate.right;
    const reward = chosen.reward;

    if (reward && reward.type === 'upgrade') {
      this.upgrades[reward.id] = (this.upgrades[reward.id] || 0) + 1;

      const segDef = this.segMgr.getSegDef(this.currentSegment);
      if (segDef && segDef.riskBonus && side === 'right') {
        const bonus = segDef.riskBonus;
        this.upgrades[bonus.id] = (this.upgrades[bonus.id] || 0) + 1;
      }
    } else {
      const effectiveCap = this.segMgr.isBossNearby() ? ARMY_BOSS_CAP : ARMY_HARD_CAP;
      const oldCount = this.soldierCount;
      let newCount = Math.max(1, chosen.mod.apply(this.soldierCount));
      if (newCount > ARMY_SOFT_CAP) {
        const excess = newCount - ARMY_SOFT_CAP;
        newCount = ARMY_SOFT_CAP + Math.floor(excess * 0.5);
      }
      newCount = Math.min(newCount, effectiveCap);
      this.soldierCount = newCount;

      const delta = this.soldierCount - oldCount;
      if (delta !== 0) {
        this.effects.soldierCountFeedback(this.armyX, delta);
      }
    }

    const color = (reward && reward.type === 'upgrade') ? 0xffaa00 : 0x00ff88;
    this.gateSys.triggerEffect(gate, side);
    this.effects.gateEffect(this.armyX, 1, 0, color);
    this.effects.screenFlash(color, 0.5);
    this.camCtrl.shake(0.4);

    this.armyMgr.setCount(this.soldierCount, this.armyX);

    if (window.audioManager) window.audioManager.gatGood();

    this.hud.updateHUD();
  }

  _triggerWin() {
    this.state = 'win';
    this.milestoneSys.saveBestMilestone();
    if (window.audioManager) window.audioManager.win();

    const screen = document.getElementById('screen-win');
    screen.classList.add('active');

    document.getElementById('win-title').textContent = this.milestone || 'VICTORY!';
    document.getElementById('win-next-btn').textContent = '\u{1F504}  PLAY AGAIN';
  }

  _triggerLose() {
    this.state = 'lose';
    if (window.audioManager) window.audioManager.lose();

    this.milestoneSys.saveBestMilestone();

    const screen = document.getElementById('screen-lose');
    screen.classList.add('active');

    const segDef = this.segMgr.getSegDef(this.currentSegment) || SEGMENT_DEFS[0];
    document.getElementById('lose-level').textContent =
      (this.milestone || ('Segment ' + segDef.id)) + this.hud.formatCycleLabel();

    const bestEl = document.getElementById('lose-best');
    if (bestEl && this.bestMilestone) {
      bestEl.textContent = '\u2B50 Best Run: ' + this.bestMilestone;
      bestEl.style.display = '';
    }
  }

  _onResize() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.renderer.setSize(W, H);
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
  }
}

// Start the game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new ArmyRunnerGame();
});
