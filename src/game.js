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
    // Mobile detection
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    // THREE.js setup
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = false;

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

    // Mobile: shorter draw distance
    if (isMobile) {
      this.scene.fog.near = 20;
      this.scene.fog.far = 60;
    }

    this._isMobile = isMobile;

    this.world.buildRoad();
    this.world.buildTrees();
    this.world.buildTorches();
    this.world.buildMountains();
    this.world._buildWallPool();
    this.world._buildBannerPool();
    this.world._buildFogPatches();

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

    // Continuous enemy pressure timer
    this._continuousSpawnTimer = 0;
    this._continuousSpawnInterval = 2.0;

    // Dust trail timer
    this._dustTimer = 0;

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
    this.currentSegment = 0;
    this.segmentCycle = 0;
    this.difficultyMult = 1.0;
    this.milestone = '';
    this.currentBoss = null;
    this.inCombat = false;
    this._decayTimer = 0;

    // Continuous enemy pressure timer
    this._continuousSpawnTimer = 0;
    this._continuousSpawnInterval = 2.0;

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
    this.hud.hideBossBar();
    this.hud.setCombatVignette(false);

    // Reset camera
    this.camCtrl.follow(this.armyX, this.soldierCount);
    this.camCtrl.setInCombat(false);
    this.camCtrl.setBossActive(false);

    // Audio
    if (window.audioManager && window.audioManager.marchLoop) window.audioManager.marchLoop();
  }

  // ── Path obstacles (walls/barriers between SAFE and RISK paths) ──

  _spawnPathObstacles(worldZ, riskNarrow) {
    const wallHeight = 3.5;
    const wallLength = 55;
    const wallGeo = new THREE.BoxGeometry(0.6, wallHeight, wallLength);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.2 });

    const wall = new THREE.Mesh(wallGeo, wallMat);
    this.scene.add(wall);
    this._pathObstacles.push({ mesh: wall, worldZ: worldZ, localY: wallHeight / 2, localZ: wallLength / 2 - 10, localX: 0 });

    const rockGeo = new THREE.BoxGeometry(0.8, 1.2, 1.5);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.85, metalness: 0.1 });
    for (let i = 0; i < 4; i++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const lz = 5 + i * 4.5 + (Math.random() - 0.5) * 1.5;
      const lx = (Math.random() - 0.5) * 0.4;
      rock.rotation.y = Math.random() * 0.5;
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
    this.camCtrl.follow(this.armyX, this.soldierCount);

    // 4. Update road scrolling
    this.world.updateDashes(this.cameraZ);
    this.world.updateTrees(this.cameraZ);
    this.world.updateTorches(this.cameraZ);
    this.world.updateParallax(this.cameraZ);
    this.world._updateWalls(this.cameraZ);
    this.world._updateBanners(this.clock.elapsedTime, this.cameraZ);
    this.world._updateFog(this.clock.elapsedTime, this.cameraZ);
    this._updatePathObstacles();

    // 4b. Obstacle collision
    this.armyMgr.applyObstacleCollision(this._pathObstacles);

    // 4c. Update weapon barrels
    this.barrelSys.updateBarrels(this.cameraZ);

    // 4d. Dust trail behind army
    this.effects.marchDust = (this.state === 'running');
    this.effects.updateDustTrail(dt, this.armyX, 0, this.armyMgr.formationWidth, 4);

    // 5. Camera combat/boss state
    this.camCtrl.setInCombat(this.inCombat);
    this.hud.setCombatVignette(this.inCombat);

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
        this.effects.spawnCountNumber(-effectiveLosses, this.armyX, 0);

        if (this.soldierCount <= 0) {
          this._triggerLose();
          return;
        }
        this.hud.updateHUD();
      }

      this.projSys.checkHits(this.enemyMgr, stats);
      this.barrelSys.checkBarrelBulletHitsFromProjectiles();

      // Update boss HP bar if a boss is active
      if (this.currentBoss) {
        const bossEnemy = this.enemyMgr.enemies.find(e => !e.dead && e.def && e.def.boss);
        if (bossEnemy) {
          this.hud.updateBossBar(bossEnemy.hp / bossEnemy.maxHp);
        }
      }

      if (this.inCombat && this.enemyMgr.count === 0) {
        this.inCombat = false;
        this.world.combatLight.intensity = 0;

        if (this.currentBoss) {
          if (this.currentBoss === 'ogre') this.milestone = 'Defeated Ogre';
          else if (this.currentBoss === 'giant') this.milestone = 'Defeated Giant';
          else if (this.currentBoss === 'fireDragon') this.milestone = 'Defeated Fire Dragon';
          this.currentBoss = null;
          this.camCtrl.setBossActive(false);
          this.hud.hideBossBar();
          if (window.audioManager && window.audioManager.victory) window.audioManager.victory();
        }

        if (window.audioManager && window.audioManager.stopCombatMusic) window.audioManager.stopCombatMusic();

        this.segMgr.triggerNextSegment();
      }
    }

    // 7b. Army decay
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

    // 8d. Gate approach indicator + ambient light
    let nearestGateDist = Infinity;
    let nearestGatePositive = true;
    for (const gate of this.gateSys.gates) {
      if (gate.passed) continue;
      const visualZ = gate.group.position.z;
      if (visualZ >= 0) continue;
      const dist = -visualZ;
      if (dist < nearestGateDist) {
        nearestGateDist = dist;
        const side = this.armyX < 0 ? 'left' : 'right';
        nearestGatePositive = gate[side].good;
      }
    }
    this.hud.updateGateArrow(nearestGateDist, nearestGatePositive);
    const gateAmbientColor = nearestGatePositive ? 0x00ff44 : 0xff2222;
    this.effects.updateGateAmbient(nearestGateDist, gateAmbientColor);

    // 9. Cleanup
    this.gateSys.cleanup(this.cameraZ);
    this._cleanupPathObstacles();

    // 9b. Continuous enemy pressure
    this._continuousSpawnTimer += dt;
    if (this._continuousSpawnTimer >= this._continuousSpawnInterval) {
      this._continuousSpawnTimer = 0;
      this._continuousSpawnInterval = Math.max(1.2, 2.0 - Math.min(this.segmentCycle, 7) * 0.1);
      const maxActive = this._isMobile ? 8 : 20;
      if (this.enemyMgr.enemies.length < maxActive) {
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
    }

    // 10. Trigger next segment
    if (-this.cameraZ > this.nextSegmentDist && !this.inCombat) {
      this.segMgr.triggerNextSegment();
    }

    // Update combat light position
    this.world.combatLight.position.x = this.armyX;
  }

  _getStats() {
    return {
      fireInterval: 0.5,
      damage: 2,
      bulletSpeedMult: 1,
      spreadAngles: [0],
      tripleAngles: [0],
      hasHoming: false,
      hasExplosive: false,
      hasPiercing: false,
      hasMedic: false,
      hasGrenade: false,
      hasAirstrike: false,
      hasShockwave: false,
      hasDragon: false,
      hasAutoTurret: false,
      hasSideCannons: false,
    };
  }

  _onGateHit(gateHit) {
    const { gate, side } = gateHit;
    if (gate.passed) return;
    gate.passed = true;

    const chosen = side === 'left' ? gate.left : gate.right;

    // Soldier count reward
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
      this.effects.spawnCountNumber(delta, this.armyX, 0);
    }

    this.gateSys.triggerEffect(gate, side);
    this.effects.gateEffect(this.armyX, 1, 0, 0x00ff88);
    this.effects.screenFlash(0x00ff88, 0.5);
    this.camCtrl.shake(0.4);

    this.armyMgr.setCount(this.soldierCount, this.armyX);

    if (window.audioManager) window.audioManager.gateGood();

    this.hud.updateHUD();
  }

  _triggerWin() {
    this.state = 'win';
    this.milestoneSys.saveBestMilestone();
    if (window.audioManager) {
      window.audioManager.win();
      if (window.audioManager.marchStop) window.audioManager.marchStop();
      if (window.audioManager.stopCombatMusic) window.audioManager.stopCombatMusic();
    }

    const screen = document.getElementById('screen-win');
    screen.classList.add('active');

    document.getElementById('win-title').textContent = this.milestone || 'VICTORY!';
    document.getElementById('win-next-btn').textContent = '\u{1F504}  PLAY AGAIN';
  }

  _triggerLose() {
    this.state = 'lose';
    if (window.audioManager) {
      window.audioManager.lose();
      if (window.audioManager.marchStop) window.audioManager.marchStop();
      if (window.audioManager.stopCombatMusic) window.audioManager.stopCombatMusic();
    }

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
