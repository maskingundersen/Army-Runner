// src/game.js — Three.js 3D Army Runner game

// Level definitions (5 levels with different settings)
const LEVEL_DEFS_3D = [
  {
    name: 'Field',
    skyColor: 0x7dd5f0,
    groundColor: 0x3a7a2a,
    roadColor: 0x333344,
    fogNear: 40,
    fogFar: 90,
    bossHp: 50,
    bossName: 'Field Commander',
    segments: [
      { type: 'gates', count: 3, badChance: 0.3 },
      { type: 'enemies', waves: [
        { count: 4, enemyType: 'zombie', hp: 3 },
        { count: 2, enemyType: 'fast', hp: 1 },
      ]},
      { type: 'gates', count: 2, badChance: 0.25 },
      { type: 'enemies', waves: [
        { count: 4, enemyType: 'zombie', hp: 3 },
        { count: 1, enemyType: 'tank', hp: 10 },
      ]},
      { type: 'gates', count: 3, badChance: 0.35 },
      { type: 'enemies', waves: [
        { count: 5, enemyType: 'zombie', hp: 3 },
        { count: 2, enemyType: 'exploding', hp: 2 },
      ]},
      { type: 'boss' },
    ],
  },
  {
    name: 'Desert',
    skyColor: 0xf0d090,
    groundColor: 0xc4a55a,
    roadColor: 0x4a4035,
    fogNear: 50,
    fogFar: 100,
    bossHp: 75,
    bossName: 'Desert Warlord',
    segments: [
      { type: 'gates', count: 2, badChance: 0.35 },
      { type: 'enemies', waves: [
        { count: 5, enemyType: 'zombie', hp: 4 },
        { count: 3, enemyType: 'fast', hp: 1 },
      ]},
      { type: 'gates', count: 3, badChance: 0.3 },
      { type: 'enemies', waves: [
        { count: 3, enemyType: 'tank', hp: 12 },
        { count: 4, enemyType: 'zombie', hp: 4 },
      ]},
      { type: 'gates', count: 2, badChance: 0.4 },
      { type: 'enemies', waves: [
        { count: 6, enemyType: 'fast', hp: 2 },
        { count: 3, enemyType: 'exploding', hp: 3 },
      ]},
      { type: 'boss' },
    ],
  },
  {
    name: 'Arctic',
    skyColor: 0xd0e8f0,
    groundColor: 0xe8f0f0,
    roadColor: 0x5a6a70,
    fogNear: 35,
    fogFar: 80,
    bossHp: 100,
    bossName: 'Frost General',
    segments: [
      { type: 'gates', count: 3, badChance: 0.35 },
      { type: 'enemies', waves: [
        { count: 6, enemyType: 'zombie', hp: 5 },
        { count: 4, enemyType: 'fast', hp: 2 },
      ]},
      { type: 'gates', count: 2, badChance: 0.35 },
      { type: 'enemies', waves: [
        { count: 4, enemyType: 'tank', hp: 15 },
        { count: 5, enemyType: 'zombie', hp: 5 },
      ]},
      { type: 'gates', count: 3, badChance: 0.4 },
      { type: 'enemies', waves: [
        { count: 8, enemyType: 'zombie', hp: 5 },
        { count: 4, enemyType: 'exploding', hp: 3 },
      ]},
      { type: 'boss' },
    ],
  },
  {
    name: 'Volcanic',
    skyColor: 0x6a3020,
    groundColor: 0x3a2a2a,
    roadColor: 0x2a1a1a,
    fogNear: 30,
    fogFar: 70,
    bossHp: 130,
    bossName: 'Lava Tyrant',
    segments: [
      { type: 'gates', count: 2, badChance: 0.4 },
      { type: 'enemies', waves: [
        { count: 8, enemyType: 'zombie', hp: 6 },
        { count: 5, enemyType: 'fast', hp: 3 },
      ]},
      { type: 'gates', count: 3, badChance: 0.35 },
      { type: 'enemies', waves: [
        { count: 5, enemyType: 'tank', hp: 18 },
        { count: 6, enemyType: 'zombie', hp: 6 },
      ]},
      { type: 'gates', count: 2, badChance: 0.45 },
      { type: 'enemies', waves: [
        { count: 10, enemyType: 'fast', hp: 3 },
        { count: 5, enemyType: 'exploding', hp: 4 },
      ]},
      { type: 'boss' },
    ],
  },
  {
    name: 'Final Fortress',
    skyColor: 0x1a1a2a,
    groundColor: 0x2a2a3a,
    roadColor: 0x1a1a25,
    fogNear: 25,
    fogFar: 60,
    bossHp: 200,
    bossName: 'Supreme Commander',
    segments: [
      { type: 'gates', count: 3, badChance: 0.4 },
      { type: 'enemies', waves: [
        { count: 10, enemyType: 'zombie', hp: 8 },
        { count: 6, enemyType: 'fast', hp: 4 },
      ]},
      { type: 'gates', count: 2, badChance: 0.4 },
      { type: 'enemies', waves: [
        { count: 6, enemyType: 'tank', hp: 25 },
        { count: 8, enemyType: 'zombie', hp: 8 },
      ]},
      { type: 'gates', count: 3, badChance: 0.45 },
      { type: 'enemies', waves: [
        { count: 12, enemyType: 'fast', hp: 4 },
        { count: 6, enemyType: 'exploding', hp: 5 },
        { count: 3, enemyType: 'tank', hp: 25 },
      ]},
      { type: 'boss' },
    ],
  },
];

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
    this.currentLevel = 1;
    this.soldierCount = 20;
    this.upgrades = {};
    this.cameraZ = 0;
    this.scrollSpeed = 14;
    this.armyX = 0;
    this.armyTargetX = 0;
    this.score = 0;
    this.coins = 0;
    this.shopMeta = UpgradeSystem.loadShopMeta ? UpgradeSystem.loadShopMeta() : {};
    
    // Segment tracking
    this.segmentIndex = 0;
    this.segments = [];
    this.inCombat = false;
    this.combatClear = false;
    this.nextSegmentDist = 50;
    this.levelDef = null;
    
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
      this.startGame(1);
    });
    
    // Win screen buttons
    document.getElementById('win-next-btn').addEventListener('click', () => {
      const screen = document.getElementById('screen-win');
      screen.classList.remove('active');
      const nextLevel = this.currentLevel >= 5 ? 1 : this.currentLevel + 1;
      this.startGame(nextLevel);
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
      this.startGame(this.currentLevel);
    });
    
    document.getElementById('lose-menu-btn').addEventListener('click', () => {
      document.getElementById('screen-lose').classList.remove('active');
      document.getElementById('screen-boot').classList.add('active');
      document.getElementById('hud').style.opacity = '0';
      this.state = 'boot';
    });
  }
  
  _updateHUD() {
    if (this.hudSoldierCount) this.hudSoldierCount.textContent = this.soldierCount;
    if (this.hudCoins) this.hudCoins.textContent = this.coins;
    if (this.hudLevel) this.hudLevel.textContent = `LEVEL ${this.currentLevel}`;
  }
  
  startGame(level) {
    level = level || 1;
    this.currentLevel = level;
    this.soldierCount = 20 + (this.shopMeta.startSoldiers || 0) * 5;
    this.upgrades = {};
    this.cameraZ = 0;
    this.armyX = 0;
    this.armyTargetX = 0;
    this.segmentIndex = 0;
    this.inCombat = false;
    this.coins = 0;
    
    // Load level definition
    const ld = LEVEL_DEFS_3D[(level - 1) % LEVEL_DEFS_3D.length];
    this.levelDef = ld;
    this.segments = ld.segments.slice();
    this.nextSegmentDist = 50;
    
    // Update scene colors
    this.scene.background = new THREE.Color(ld.skyColor);
    this.scene.fog.color.set(ld.skyColor);
    this.scene.fog.near = ld.fogNear || 40;
    this.scene.fog.far = ld.fogFar || 90;
    
    // Update ground/road colors
    this.groundMesh.material.color.setHex(ld.groundColor);
    this.roadMesh.material.color.setHex(ld.roadColor);
    
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
    this.armyMgr.update(dt, this.armyX, this.clock.elapsedTime);
    this.camCtrl.follow(this.armyX, this.soldierCount);
    
    // 4. Update road scrolling
    this._updateDashes();
    this._updateTrees();
    
    // 5. Ground/road are fixed in Three.js space (camera never moves in Z)
    
    // 6. Combat update
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
      this.projSys.checkHits(this.enemyMgr);
      
      // Check if combat wave is cleared
      if (this.enemyMgr.count === 0) {
        this.inCombat = false;
        this.combatLight.intensity = 0;
        this._triggerNextSegment();
      }
    }
    
    // 7. Update projectiles
    const stats = this._getStats();
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
    if (this.segmentIndex >= this.segments.length) {
      this._triggerWin();
      return;
    }
    
    const seg = this.segments[this.segmentIndex++];
    const spawnZ = this.cameraZ - 60; // Spawn 60 units ahead
    
    if (seg.type === 'gates') {
      this._spawnGates(seg, spawnZ);
      // Next segment triggers after player passes all gates (60 base + spacing per extra gate + buffer)
      this.nextSegmentDist = -this.cameraZ + 60 + (seg.count - 1) * 22 + 25;
    } else if (seg.type === 'enemies') {
      this._spawnEnemies(seg);
      this.inCombat = true;
      this.combatLight.intensity = 1.5;
    } else if (seg.type === 'boss') {
      this._spawnBoss();
    }
  }
  
  _spawnGates(seg, baseZ) {
    for (let i = 0; i < seg.count; i++) {
      const gateZ = baseZ - i * 22;
      const isBad = Math.random() < seg.badChance;
      
      // Pick mods
      const goodMods = UpgradeSystem.SOLDIER_GOOD_MODS;
      const badMods = UpgradeSystem.SOLDIER_BAD_MODS;
      
      const leftMod = isBad 
        ? badMods[Math.floor(Math.random() * badMods.length)]
        : goodMods[Math.floor(Math.random() * goodMods.length)];
      const rightMod = !isBad
        ? badMods[Math.floor(Math.random() * badMods.length)]
        : goodMods[Math.floor(Math.random() * goodMods.length)];
      
      this.gateSys.createGate(gateZ,
        { label: leftMod.label, mod: leftMod, good: !isBad },
        { label: rightMod.label, mod: rightMod, good: isBad }
      );
    }
  }
  
  _spawnEnemies(seg) {
    // Enemies always spawn 60 units ahead in Three.js space (army is at Z=0)
    this.enemyMgr.spawnWave(seg.waves, -60, this.armyX, 1.0);
  }
  
  _spawnBoss() {
    this.enemyMgr.spawnWave(
      [{ count: 1, enemyType: 'tank', hp: this.levelDef.bossHp }],
      -50,   // Fixed spawn position in Three.js space
      this.armyX, 
      1.5
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
    
    // Apply mod
    const prevCount = this.soldierCount;
    this.soldierCount = Math.max(1, chosen.mod.apply(this.soldierCount));
    
    // Visual effects
    const color = chosen.good ? 0x00ff88 : 0xff3300;
    this.gateSys.triggerEffect(gate, side);
    this.effects.gateEffect(this.armyX, 1, 0, color);
    this.effects.screenFlash(color, 0.5);
    this.camCtrl.shake(0.4);
    
    // Update army
    this.armyMgr.setCount(this.soldierCount, this.armyX);
    
    if (window.audioManager) {
      if (chosen.good) window.audioManager.gatGood();
      else window.audioManager.gateBad();
    }
    
    this._updateHUD();
  }
  
  _triggerWin() {
    this.state = 'win';
    if (window.audioManager) window.audioManager.win();
    
    const nextLevel = this.currentLevel >= 5 ? null : this.currentLevel + 1;
    
    const screen = document.getElementById('screen-win');
    screen.classList.add('active');
    
    document.getElementById('win-title').textContent = 
      nextLevel ? `LEVEL ${this.currentLevel} COMPLETE!` : 'YOU WON ALL LEVELS!';
    document.getElementById('win-next-btn').textContent = 
      nextLevel ? '▶  NEXT LEVEL' : '🔄  PLAY AGAIN';
  }
  
  _triggerLose() {
    this.state = 'lose';
    if (window.audioManager) window.audioManager.lose();
    
    const screen = document.getElementById('screen-lose');
    screen.classList.add('active');
    document.getElementById('lose-level').textContent = `Level ${this.currentLevel}`;
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
