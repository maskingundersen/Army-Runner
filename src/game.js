// src/game.js — Three.js 3D Army Runner game (9-segment endless loop)

// 9 segment definitions with fixed SAFE/RISK rewards
const SEGMENT_DEFS = [
  {
    id: 1,
    name: 'Intro',
    safeReward: { type: 'soldiers', count: 3, label: '+3' },
    riskReward: { type: 'soldiers', count: 10, label: '+10' },
    enemies: [
      { count: 3, enemyType: 'zombie', hp: 3 },
      { count: 1, enemyType: 'fast', hp: 1 },
    ],
    boss: null,
    duration: 50,
  },
  {
    id: 2,
    name: 'First Decision',
    safeReward: { type: 'soldiers', count: 5, label: '+5' },
    riskReward: { type: 'upgrade', id: 'betterGuns', label: '\u{1F525} Fire Rate' },
    enemies: [
      { count: 4, enemyType: 'zombie', hp: 3 },
      { count: 2, enemyType: 'fast', hp: 1 },
    ],
    boss: null,
    duration: 50,
  },
  {
    id: 3,
    name: 'Pressure Intro',
    safeReward: { type: 'soldiers', count: 8, label: '+8' },
    riskReward: { type: 'upgrade', id: 'spreadShot', label: '\u{1F52B} Spread Shot' },
    enemies: [
      { count: 5, enemyType: 'zombie', hp: 4 },
      { count: 3, enemyType: 'fast', hp: 2 },
    ],
    boss: null,
    duration: 60,
  },
  {
    id: 4,
    name: 'Skill Check',
    safeReward: { type: 'soldiers', count: 10, label: '+10' },
    riskReward: { type: 'upgrade', id: 'explosive', label: '\u{1F4A3} Grenade' },
    enemies: [
      { count: 4, enemyType: 'zombie', hp: 5 },
      { count: 3, enemyType: 'exploding', hp: 2 },
    ],
    boss: null,
    duration: 60,
  },
  {
    id: 5,
    name: 'Mini Boss',
    safeReward: { type: 'soldiers', count: 12, label: '+12' },
    riskReward: { type: 'upgrade', id: 'x2Bullets', label: '\u26A1 Double Shot' },
    enemies: [],
    boss: 'ogre',
    duration: 60,
  },
  {
    id: 6,
    name: 'Build Defining',
    safeReward: { type: 'soldiers', count: 10, label: '+10' },
    riskReward: { type: 'upgrade', id: 'sideCannons', label: '\u{1F6F8} Drone Companion' },
    enemies: [
      { count: 6, enemyType: 'zombie', hp: 5 },
      { count: 4, enemyType: 'fast', hp: 2 },
      { count: 2, enemyType: 'tank', hp: 10 },
    ],
    boss: null,
    duration: 80,
  },
  {
    id: 7,
    name: 'High Pressure',
    safeReward: { type: 'soldiers', count: 15, label: '+15' },
    riskReward: { type: 'upgrade', id: 'explosive', label: '\u{1F4A5} Explosive Rounds' },
    enemies: [
      { count: 8, enemyType: 'fast', hp: 3 },
      { count: 4, enemyType: 'exploding', hp: 3 },
      { count: 2, enemyType: 'tank', hp: 12 },
    ],
    boss: null,
    duration: 80,
  },
  {
    id: 8,
    name: 'Elite Path',
    safeReward: { type: 'soldiers', count: 8, label: '+8' },
    riskReward: { type: 'upgrade', id: 'homing', label: '\u{1F409} Dragon Companion' },
    enemies: [
      { count: 6, enemyType: 'tank', hp: 15 },
      { count: 6, enemyType: 'zombie', hp: 6 },
      { count: 3, enemyType: 'exploding', hp: 4 },
    ],
    boss: null,
    duration: 80,
  },
  {
    id: 9,
    name: 'Major Boss',
    safeReward: { type: 'soldiers', count: 15, label: '+15' },
    riskReward: { type: 'upgrade', id: 'damage25', label: '\u2694\uFE0F Power Up' },
    enemies: [],
    boss: 'fireDragon',
    duration: 60,
  },
];

// Environment palettes cycled per segment cycle (reused from original level themes)
const ENV_PALETTES = [
  { skyColor: 0x7dd5f0, groundColor: 0x3a7a2a, roadColor: 0x333344, fogNear: 40, fogFar: 90 },
  { skyColor: 0xf0d090, groundColor: 0xc4a55a, roadColor: 0x4a4035, fogNear: 50, fogFar: 100 },
  { skyColor: 0xd0e8f0, groundColor: 0xe8f0f0, roadColor: 0x5a6a70, fogNear: 35, fogFar: 80 },
  { skyColor: 0x6a3020, groundColor: 0x3a2a2a, roadColor: 0x2a1a1a, fogNear: 30, fogFar: 70 },
  { skyColor: 0x1a1a2a, groundColor: 0x2a2a3a, roadColor: 0x1a1a25, fogNear: 25, fogFar: 60 },
];

// Base boss HP — mirrors ENEMY_DEFS_3D in EnemyManager.js, scaled by difficultyMult each cycle
const BOSS_HP = { ogre: 80, fireDragon: 200 };

// Shared identity modifier for upgrade gates (no soldier count change)
const IDENTITY_MOD = { apply: (n) => n };

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
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
    
    // Resize handling
    window.addEventListener('resize', () => this._onResize());
    this._onResize();
    
    // Setup lights
    this._setupLights();
    
    // Background / sky
    this.scene.background = new THREE.Color(0x7dd5f0);
    this.scene.fog = new THREE.Fog(0x7dd5f0, 40, 90);
    
    // Build road and environment
    this._buildRoad();
    this._buildTrees();
    
    // Initialize systems
    this.camCtrl = new CameraController(this.camera);
    this.effects = new EffectsManager(this.scene, this.camCtrl);
    this.armyMgr = new ArmyManager(this.scene);
    this.enemyMgr = new EnemyManager(this.scene, this.effects);
    this.projSys = new ProjectileSystem(this.scene, this.effects);
    this.gateSys = new GateSystem(this.scene, this.effects);
    
    // Game state
    this.state = 'boot';
    this.soldierCount = 20;
    this.upgrades = {};
    this.cameraZ = 0;
    this.scrollSpeed = 14;
    this.armyX = 0;
    this.armyTargetX = 0;
    this.score = 0;
    this.coins = 0;
    this.shopMeta = UpgradeSystem.loadShopMeta ? UpgradeSystem.loadShopMeta() : {};
    
    // Segment tracking (9-segment endless loop)
    this.currentSegment = 0;        // 0-8 index into SEGMENT_DEFS
    this.segmentCycle = 0;          // Which loop iteration (0=first, 1=second, ...)
    this.difficultyMult = 1.0;      // HP multiplier, +0.4 per cycle
    this.milestone = '';            // Best milestone reached
    this.currentBoss = null;        // Boss type currently being fought
    this.internalSegments = [];     // Flat sequence of gate/enemy/boss sub-steps
    this.internalSegIdx = 0;        // Current position in internalSegments
    this.inCombat = false;
    this.nextSegmentDist = 50;
    
    // Input state
    this.isDragging = false;
    this.dragStartX = 0;
    this._setupInput();
    
    // UI references
    this._setupUI();
    
    // Clock for delta time
    this.clock = new THREE.Clock();
    
    // Hide HUD initially
    document.getElementById('hud').style.opacity = '0';
    
    // Start the game loop
    this._loop();
  }
  
  _setupLights() {
    // Ambient light - soft fill
    const ambient = new THREE.AmbientLight(0x9ab5d4, 0.8);
    this.scene.add(ambient);
    
    // Directional sun light
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.4);
    sun.position.set(8, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    this.sun = sun;
    
    // Combat point light (glows during combat)
    this.combatLight = new THREE.PointLight(0xff8844, 0, 15);
    this.combatLight.position.set(0, 2, 0);
    this.scene.add(this.combatLight);
  }
  
  _buildRoad() {
    // Ground plane - extends far
    const groundGeo = new THREE.PlaneGeometry(80, 400);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a7a2a });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.set(0, -0.02, -120);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
    
    // Road strip (darker, centered)
    const roadGeo = new THREE.PlaneGeometry(8, 400);
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x282836 });
    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.set(0, -0.01, -120);
    this.roadMesh.receiveShadow = true;
    this.scene.add(this.roadMesh);
    
    // Road dashes (white center line)
    const dashGeo = new THREE.BoxGeometry(0.12, 0.02, 1.2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.dashMesh = new THREE.InstancedMesh(dashGeo, dashMat, 50);
    this.dashMesh.position.y = 0.01;
    this.scene.add(this.dashMesh);
    this._updateDashes();
    
    // Road edge lines (yellow)
    const edgeGeo = new THREE.BoxGeometry(0.15, 0.02, 400);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
    const rightEdge = new THREE.Mesh(edgeGeo, edgeMat.clone());
    leftEdge.position.set(-3.9, 0.01, -120);
    rightEdge.position.set(3.9, 0.01, -120);
    this.scene.add(leftEdge, rightEdge);
    this.leftEdge = leftEdge;
    this.rightEdge = rightEdge;
  }
  
  _updateDashes() {
    const spacing = 3.5;
    const m = new THREE.Matrix4();
    const numDashes = 50;
    
    for (let i = 0; i < numDashes; i++) {
      const baseZ = i * spacing;
      // Wrap based on camera scroll
      let z = -((baseZ - ((-this.cameraZ) % (spacing * numDashes))) % (spacing * numDashes));
      if (z > 10) z -= spacing * numDashes;
      
      m.makeTranslation(0, 0.01, z);
      this.dashMesh.setMatrixAt(i, m);
    }
    this.dashMesh.instanceMatrix.needsUpdate = true;
  }
  
  _buildTrees() {
    // Create tree geometry (simple low-poly tree)
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a20 });
    
    const foliageGeo = new THREE.ConeGeometry(0.8, 2, 6);
    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x2a5a2a });
    
    // Create instanced meshes for trees
    const numTrees = 80;
    this.trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, numTrees);
    this.foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, numTrees);
    
    this.trunkMesh.castShadow = true;
    this.foliageMesh.castShadow = true;
    
    // Position trees along road sides
    const m = new THREE.Matrix4();
    const treeData = [];
    
    for (let i = 0; i < numTrees; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const baseX = side * (6 + Math.random() * 10);
      const baseZ = (i * 4) - 80 + (Math.random() - 0.5) * 2;
      const scale = 0.8 + Math.random() * 0.6;
      
      treeData.push({ x: baseX, z: baseZ, scale });
      
      // Trunk
      m.makeTranslation(baseX, 0.75 * scale, baseZ);
      m.scale(new THREE.Vector3(scale, scale, scale));
      this.trunkMesh.setMatrixAt(i, m);
      
      // Foliage
      m.makeTranslation(baseX, 2.2 * scale, baseZ);
      m.scale(new THREE.Vector3(scale, scale, scale));
      this.foliageMesh.setMatrixAt(i, m);
    }
    
    this.treeData = treeData;
    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.foliageMesh.instanceMatrix.needsUpdate = true;
    
    this.scene.add(this.trunkMesh);
    this.scene.add(this.foliageMesh);
  }
  
  _updateTrees() {
    // Update tree positions based on scroll
    const m = new THREE.Matrix4();
    const wrapDist = 320;
    
    for (let i = 0; i < this.treeData.length; i++) {
      const tree = this.treeData[i];
      
      // Calculate visual Z position
      let visualZ = tree.z - this.cameraZ;
      
      // Wrap trees that go behind camera
      while (visualZ > 40) visualZ -= wrapDist;
      while (visualZ < -280) visualZ += wrapDist;
      
      const scale = tree.scale;
      
      // Trunk
      m.makeTranslation(tree.x, 0.75 * scale, visualZ);
      m.scale(new THREE.Vector3(scale, scale, scale));
      this.trunkMesh.setMatrixAt(i, m);
      
      // Foliage
      m.makeTranslation(tree.x, 2.2 * scale, visualZ);
      m.scale(new THREE.Vector3(scale, scale, scale));
      this.foliageMesh.setMatrixAt(i, m);
    }
    
    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.foliageMesh.instanceMatrix.needsUpdate = true;
  }
  
  _setupInput() {
    const canvas = this.canvas;
    
    // Pointer down
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      
      if (this.state === 'boot') {
        return; // Boot screen handles its own clicks
      }
      
      this.isDragging = true;
      this.dragStartX = e.clientX;
    });
    
    // Pointer move
    canvas.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      
      const dx = (e.clientX - this.dragStartX) * 0.018;
      this.armyTargetX = Math.max(-3.5, Math.min(3.5, this.armyTargetX + dx));
      this.dragStartX = e.clientX;
    });
    
    // Pointer up
    canvas.addEventListener('pointerup', () => {
      this.isDragging = false;
    });
    
    canvas.addEventListener('pointerleave', () => {
      this.isDragging = false;
    });
    
    // Prevent context menu on long press
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  _setupUI() {
    this.hudSoldierCount = document.getElementById('hud-soldier-count');
    this.hudCoins = document.getElementById('hud-coins');
    this.hudLevel = document.getElementById('hud-level');
    
    // Boot screen play button
    document.getElementById('boot-play-btn').addEventListener('click', () => {
      this.startGame();
    });
    
    // Win screen buttons (kept as fallback, not normally triggered)
    document.getElementById('win-next-btn').addEventListener('click', () => {
      document.getElementById('screen-win').classList.remove('active');
      this.startGame();
    });
    
    document.getElementById('win-menu-btn').addEventListener('click', () => {
      document.getElementById('screen-win').classList.remove('active');
      document.getElementById('screen-boot').classList.add('active');
      document.getElementById('hud').style.opacity = '0';
      this.state = 'boot';
    });
    
    // Lose screen buttons
    document.getElementById('lose-retry-btn').addEventListener('click', () => {
      document.getElementById('screen-lose').classList.remove('active');
      this.startGame();
    });
    
    document.getElementById('lose-menu-btn').addEventListener('click', () => {
      document.getElementById('screen-lose').classList.remove('active');
      document.getElementById('screen-boot').classList.add('active');
      document.getElementById('hud').style.opacity = '0';
      this.state = 'boot';
    });
  }
  
  _formatCycleLabel() {
    return this.segmentCycle > 0 ? ` C${this.segmentCycle + 1}` : '';
  }
  
  _updateHUD() {
    if (this.hudSoldierCount) this.hudSoldierCount.textContent = this.soldierCount;
    if (this.hudCoins) this.hudCoins.textContent = this.coins;
    if (this.hudLevel) {
      const segDef = SEGMENT_DEFS[this.currentSegment] || SEGMENT_DEFS[0];
      this.hudLevel.textContent = `${segDef.id}/9: ${segDef.name}${this._formatCycleLabel()}`;
    }
    const milestoneEl = document.getElementById('hud-milestone');
    if (milestoneEl) {
      if (this.milestone) {
        milestoneEl.textContent = '🏆 ' + this.milestone;
        milestoneEl.style.display = '';
      } else {
        milestoneEl.style.display = 'none';
      }
    }
  }
  
  startGame() {
    this.soldierCount = 20 + (this.shopMeta.startSoldiers || 0) * 5;
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
    
    // Build internal segment sequence
    this._buildInternalSegments();
    this.internalSegIdx = 0;
    this.nextSegmentDist = 50;
    
    // Apply initial environment palette
    this._applyEnvPalette();
    
    // Clear systems
    this.enemyMgr.clear();
    this.projSys.clear();
    this.gateSys.clear();
    this.effects.clear();
    
    // Initialize army
    this.armyMgr.setCount(this.soldierCount, this.armyX);
    
    // Hide boot screen, show HUD
    document.getElementById('screen-boot').classList.remove('active');
    document.getElementById('hud').style.opacity = '1';
    
    this.state = 'running';
    this._updateHUD();
    
    // Reset camera
    this.camCtrl.follow(this.armyX, this.soldierCount);
  }
  
  _buildInternalSegments() {
    this.internalSegments = [];
    for (let i = 0; i < SEGMENT_DEFS.length; i++) {
      const def = SEGMENT_DEFS[i];
      if (def.boss) {
        // Boss segments: fight first, then recovery gate choice
        this.internalSegments.push({ type: 'boss', defIdx: i });
        this.internalSegments.push({ type: 'gates', defIdx: i });
      } else {
        // Normal segments: gate choice first, then enemy combat
        this.internalSegments.push({ type: 'gates', defIdx: i });
        this.internalSegments.push({ type: 'enemies', defIdx: i });
      }
    }
  }
  
  _applyEnvPalette() {
    const palette = ENV_PALETTES[this.segmentCycle % ENV_PALETTES.length];
    this.scene.background = new THREE.Color(palette.skyColor);
    this.scene.fog.color.set(palette.skyColor);
    this.scene.fog.near = palette.fogNear;
    this.scene.fog.far = palette.fogFar;
    this.groundMesh.material.color.setHex(palette.groundColor);
    this.roadMesh.material.color.setHex(palette.roadColor);
  }
  
  _startNewCycle() {
    this.segmentCycle++;
    // Increase difficulty: enemy HP is multiplied by difficultyMult in spawnWave/spawnBoss
    this.difficultyMult += 0.4;
    this.milestone = 'Cycle ' + (this.segmentCycle + 1);
    
    // Visual feedback
    this.effects.screenFlash(0x44aaff, 0.8);
    this.camCtrl.shake(1.0);
    this._showCycleMessage(`CYCLE ${this.segmentCycle + 1}`);
    
    // Update environment
    this._applyEnvPalette();
    
    // Reset segment tracking for new cycle
    this.currentSegment = 0;
    this._buildInternalSegments();
    this.internalSegIdx = 0;
    this.nextSegmentDist = -this.cameraZ + 40;
    this._updateHUD();
  }
  
  _showCycleMessage(text) {
    const msgEl = document.createElement('div');
    msgEl.textContent = text;
    msgEl.style.cssText =
      'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);' +
      'font-size:48px;font-weight:bold;color:#44aaff;' +
      'text-shadow:2px 2px 8px rgba(0,0,0,0.8),0 0 30px rgba(68,170,255,0.5);' +
      'z-index:150;pointer-events:none;opacity:1;transition:opacity 1.5s ease-out;';
    document.body.appendChild(msgEl);
    setTimeout(() => { msgEl.style.opacity = '0'; }, 500);
    setTimeout(() => { if (msgEl.parentNode) msgEl.parentNode.removeChild(msgEl); }, 2500);
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
    this._updateScreenFlash();
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }
  
  _update(dt) {
    // 1. Scroll world (cameraZ decreases = move forward)
    if (!this.inCombat) {
      this.cameraZ -= this.scrollSpeed * dt;
    }
    
    // 2. Steer army
    this.armyX += (this.armyTargetX - this.armyX) * Math.min(1, dt * 8);
    
    // 3. Update army formation
    this.armyMgr.update(dt, this.armyX, this.clock.elapsedTime, this.upgrades);
    this.camCtrl.follow(this.armyX, this.soldierCount);
    
    // 4. Update road scrolling
    this._updateDashes();
    this._updateTrees();
    
    // 5. Ground/road are fixed in Three.js space (camera never moves in Z)
    
    // 6. Compute stats (needed for combat and projectile updates)
    const stats = this._getStats();
    
    // 7. Combat update
    if (this.inCombat) {
      const { soldierLosses, killedEnemies } = this.enemyMgr.update(dt, this.armyX);
      
      // Handle soldier losses
      if (soldierLosses > 0) {
        this.soldierCount = Math.max(0, this.soldierCount - soldierLosses);
        for (let i = 0; i < soldierLosses; i++) {
          this.armyMgr.killSoldier();
        }
        this.armyMgr.setCount(this.soldierCount, this.armyX);
        this.camCtrl.shake(soldierLosses * 0.8);
        
        if (this.soldierCount <= 0) {
          this._triggerLose();
          return;
        }
        this._updateHUD();
      }
      
      // Bullet collision checks
      this.projSys.checkHits(this.enemyMgr, stats);
      
      // Check if combat wave is cleared
      if (this.enemyMgr.count === 0) {
        this.inCombat = false;
        this.combatLight.intensity = 0;
        
        // Track boss defeat milestones
        if (this.currentBoss) {
          if (this.currentBoss === 'ogre') this.milestone = 'Defeated Ogre';
          else if (this.currentBoss === 'fireDragon') this.milestone = 'Defeated Fire Dragon';
          this.currentBoss = null;
        }
        
        this._triggerNextSegment();
      }
    }
    
    // 8. Update projectiles
    this.projSys.update(dt, this.armyX, 0, this.soldierCount, 
      this.enemyMgr.enemies, this.upgrades, stats, null);
    
    // 8. Update gates and check collisions
    this.gateSys.update(this.cameraZ);
    const gateHit = this.gateSys.checkCollision(this.armyX);
    if (gateHit) {
      this._onGateHit(gateHit);
    }
    
    // 9. Clean up old gates
    this.gateSys.cleanup(this.cameraZ);
    
    // 10. Trigger next segment when distance reached
    if (!this.inCombat && -this.cameraZ > this.nextSegmentDist) {
      this._triggerNextSegment();
    }
    
    // Update combat light position
    this.combatLight.position.x = this.armyX;
  }
  
  _getStats() {
    // Compute stats from upgrades using UpgradeSystem
    const us = new UpgradeSystem(null);
    return us.getStats(this.upgrades, this.shopMeta);
  }
  
  _triggerNextSegment() {
    if (this.internalSegIdx >= this.internalSegments.length) {
      this._startNewCycle();
      return;
    }
    
    const seg = this.internalSegments[this.internalSegIdx++];
    const def = SEGMENT_DEFS[seg.defIdx];
    this.currentSegment = seg.defIdx;
    const spawnZ = this.cameraZ - 60;
    
    if (seg.type === 'gates') {
      this._spawnSegmentGates(def, spawnZ);
      this.nextSegmentDist = -this.cameraZ + 60 + 25;
    } else if (seg.type === 'enemies') {
      this._spawnEnemies(def);
      this.inCombat = true;
      this.combatLight.intensity = 1.5;
    } else if (seg.type === 'boss') {
      this._spawnBoss(def);
    }
    
    this._updateHUD();
  }
  
  _spawnSegmentGates(def, baseZ) {
    // Left = SAFE gate (green, soldier modifier)
    const safe = def.safeReward;
    const leftConfig = {
      label: safe.label,
      mod: { apply: (n) => n + safe.count },
      good: true,
      reward: safe,
    };
    
    // Right = RISK gate (upgrade or soldiers)
    const risk = def.riskReward;
    let rightConfig;
    if (risk.type === 'upgrade') {
      rightConfig = {
        label: risk.label,
        mod: IDENTITY_MOD,
        good: true,
        reward: risk,
      };
    } else {
      rightConfig = {
        label: risk.label,
        mod: { apply: (n) => n + risk.count },
        good: true,
        reward: risk,
      };
    }
    
    this.gateSys.createGate(baseZ, leftConfig, rightConfig);
  }
  
  _spawnEnemies(def) {
    this.enemyMgr.spawnWave(def.enemies, -60, this.armyX, this.difficultyMult);
  }
  
  _spawnBoss(def) {
    const bossType = def.boss;
    if (!BOSS_HP[bossType]) {
      console.warn(`Unknown boss type "${bossType}", using default HP 100`);
    }
    const baseHp = BOSS_HP[bossType] || 100;
    
    this.currentBoss = bossType;
    if (bossType === 'ogre') this.milestone = 'Reached Ogre';
    else if (bossType === 'fireDragon') this.milestone = 'Reached Fire Dragon';
    
    this.enemyMgr.spawnWave(
      [{ count: 1, enemyType: bossType, hp: baseHp }],
      -50,
      this.armyX,
      this.difficultyMult
    );
    this.inCombat = true;
    this.combatLight.intensity = 2.0;
    this.camCtrl.shake(0.5);
    
    if (window.audioManager) window.audioManager.bossRoar();
  }
  
  _onGateHit(gateHit) {
    const { gate, side } = gateHit;
    if (gate.passed) return;
    gate.passed = true;
    
    const chosen = side === 'left' ? gate.left : gate.right;
    const reward = chosen.reward;
    
    // Apply reward
    if (reward && reward.type === 'upgrade') {
      // Weapon/ability upgrade
      this.upgrades[reward.id] = (this.upgrades[reward.id] || 0) + 1;
    } else {
      // Soldier modifier (apply via mod function for compatibility)
      this.soldierCount = Math.max(1, chosen.mod.apply(this.soldierCount));
    }
    
    // Visual effects
    const color = (reward && reward.type === 'upgrade') ? 0xffaa00 : 0x00ff88;
    this.gateSys.triggerEffect(gate, side);
    this.effects.gateEffect(this.armyX, 1, 0, color);
    this.effects.screenFlash(color, 0.5);
    this.camCtrl.shake(0.4);
    
    // Update army
    this.armyMgr.setCount(this.soldierCount, this.armyX);
    
    if (window.audioManager) window.audioManager.gatGood();
    
    this._updateHUD();
  }
  
  _triggerWin() {
    // In the endless loop, win is not normally triggered.
    // Kept as fallback; shows milestone summary.
    this.state = 'win';
    if (window.audioManager) window.audioManager.win();
    
    const screen = document.getElementById('screen-win');
    screen.classList.add('active');
    
    document.getElementById('win-title').textContent = this.milestone || 'VICTORY!';
    document.getElementById('win-next-btn').textContent = '\u{1F504}  PLAY AGAIN';
  }
  
  _triggerLose() {
    this.state = 'lose';
    if (window.audioManager) window.audioManager.lose();
    
    const screen = document.getElementById('screen-lose');
    screen.classList.add('active');
    
    const segDef = SEGMENT_DEFS[this.currentSegment] || SEGMENT_DEFS[0];
    document.getElementById('lose-level').textContent =
      `${this.milestone || ('Segment ' + segDef.id)}${this._formatCycleLabel()}`;
  }
  
  _updateScreenFlash() {
    const alpha = this.effects.screenFlashAlpha;
    const flashEl = document.getElementById('screen-flash');
    
    if (flashEl) {
      if (alpha > 0.01) {
        flashEl.style.opacity = alpha;
        // Convert color to proper 6-digit hex string
        const colorHex = Math.max(0, Math.min(0xffffff, Math.floor(this.effects.screenFlashColor)));
        flashEl.style.backgroundColor = '#' + colorHex.toString(16).padStart(6, '0');
      } else {
        flashEl.style.opacity = '0';
      }
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
