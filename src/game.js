// src/game.js — Three.js 3D Army Runner game (9-segment endless loop)

// Base game constants
const BASE_SCROLL_SPEED = 15;
const MAX_SCROLL_SPEED = 20;
const SCROLL_SPEED_PER_CYCLE = 0.8;
const ENEMY_COUNT_SCALE_PER_CYCLE = 0.5;
const OBSTACLE_CLEANUP_THRESHOLD = 50;

// Army size control
const ARMY_SOFT_CAP = 40;
const ARMY_HARD_CAP = 100;

// Milestone rankings (ascending order of difficulty)
const MILESTONE_ORDER = [
  'Reached Ogre',
  'Defeated Ogre',
  'Reached Giant',
  'Defeated Giant',
  'Reached Fire Dragon',
  'Defeated Fire Dragon',
];

// 9 segment definitions with fixed SAFE/RISK rewards
// ~100+ unique reward opportunities across cycles via stacking upgrades
// Builds: "Bullet Storm" (fire rate + double/triple + spread),
//         "Heavy Impact" (explosive + damage + bullet speed),
//         "Swarm Army"   (soldier count + medic + armor),
//         "Support Commander" (drone + turret + dragon + homing)
const SEGMENT_DEFS = [
  {
    id: 1,
    name: 'Intro',
    safeReward: { type: 'soldiers', count: 2, label: '+2' },
    riskReward: { type: 'soldiers', count: 6, label: '+6' },
    enemies: [
      { count: 8, enemyType: 'zombie', hp: 3 },
      { count: 5, enemyType: 'fast', hp: 1 },
      { count: 2, enemyType: 'zombie', hp: 3, xOffset: -4 },
    ],
    boss: null,
    duration: 50,
    riskNarrow: false,
  },
  {
    id: 2,
    name: 'First Decision',
    safeReward: { type: 'soldiers', count: 5, label: '+5' },
    riskReward: { type: 'soldiers', count: 12, label: '+12' },
    enemies: [
      { count: 10, enemyType: 'zombie', hp: 3 },
      { count: 6, enemyType: 'fast', hp: 1 },
      { count: 3, enemyType: 'zombie', hp: 3, xOffset: 4 },
    ],
    boss: null,
    duration: 50,
    riskNarrow: true,
  },
  {
    id: 3,
    name: 'Pressure Intro',
    safeReward: { type: 'soldiers', count: -5, label: '-5 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 5) } },
    riskReward: { type: 'soldiers', count: 8, label: '+8' },
    enemies: [
      { count: 10, enemyType: 'zombie', hp: 4, xOffset: 0 },
      { count: 6, enemyType: 'fast', hp: 2, xOffset: -3 },
      { count: 3, enemyType: 'exploding', hp: 2 },
    ],
    boss: null,
    duration: 60,
    riskNarrow: true,
  },
  {
    id: 4,
    name: 'Skill Check',
    safeReward: { type: 'soldiers', count: -8, label: '-8 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 8) } },
    riskReward: { type: 'soldiers', count: 10, label: '+10' },
    enemies: [
      { count: 8, enemyType: 'zombie', hp: 5 },
      { count: 6, enemyType: 'exploding', hp: 2 },
      { count: 4, enemyType: 'fast', hp: 2, xOffset: 3 },
      { count: 2, enemyType: 'tank', hp: 10 },
    ],
    boss: null,
    duration: 60,
    riskNarrow: true,
  },
  {
    id: 5,
    name: 'Mini Boss',
    safeReward: { type: 'soldiers', count: 8, label: '+8 \u{1F6E1}\uFE0F' },
    riskReward: { type: 'soldiers', count: 15, label: '+15' },
    enemies: [],
    boss: 'ogre',
    duration: 60,
    riskNarrow: false,
  },
  {
    id: 6,
    name: 'Build Defining',
    safeReward: { type: 'soldiers', count: 0, label: '\u00D71.5', mod: { apply: (n) => Math.floor(n * 1.5) } },
    riskReward: { type: 'soldiers', count: 0, label: '\u00D72', mod: { apply: (n) => Math.min(ARMY_HARD_CAP, n * 2) } },
    enemies: [
      { count: 12, enemyType: 'zombie', hp: 5, xOffset: 0 },
      { count: 8, enemyType: 'fast', hp: 2, xOffset: -3 },
      { count: 4, enemyType: 'tank', hp: 10, xOffset: 2 },
      { count: 3, enemyType: 'exploding', hp: 3 },
      { count: 2, enemyType: 'shield', hp: 8 },
    ],
    boss: null,
    duration: 80,
    riskNarrow: true,
  },
  {
    id: 7,
    name: 'Heavy Assault',
    safeReward: { type: 'soldiers', count: 0, label: '÷2 ☠️', bad: true, mod: { apply: (n) => Math.max(1, Math.floor(n / 2)) } },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [
      { count: 16, enemyType: 'fast', hp: 3, xOffset: -2 },
      { count: 8, enemyType: 'exploding', hp: 3, xOffset: 2 },
      { count: 4, enemyType: 'tank', hp: 12 },
      { count: 3, enemyType: 'charger', hp: 5, xOffset: -3 },
      { count: 3, enemyType: 'zombie', hp: 5, xOffset: 5 },
    ],
    boss: null,
    duration: 80,
    riskNarrow: true,
  },
  {
    id: 8,
    name: 'Titan Gate',
    safeReward: { type: 'soldiers', count: 6, label: '+6' },
    riskReward: { type: 'soldiers', count: 18, label: '+18' },
    enemies: [],
    boss: 'giant',
    duration: 70,
    riskNarrow: false,
  },
  {
    id: 9,
    name: 'Dragon\'s Lair',
    safeReward: { type: 'soldiers', count: 15, label: '+15' },
    riskReward: { type: 'soldiers', count: 25, label: '+25' },
    enemies: [],
    boss: 'fireDragon',
    duration: 60,
    riskNarrow: false,
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
const BOSS_HP = { ogre: 120, giant: 250, fireDragon: 350 };

// Shared identity modifier for upgrade gates (no soldier count change)
const IDENTITY_MOD = { apply: (n) => n };

// Map layout variations — different segment orderings for variety (#5)
const MAP_LAYOUTS = [
  { name: 'Standard',  segmentOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  { name: 'Rush',      segmentOrder: [0, 2, 4, 3, 6, 5, 7, 1, 8] },
  { name: 'Gauntlet',  segmentOrder: [0, 1, 4, 2, 7, 3, 5, 6, 8] },
  { name: 'Endurance', segmentOrder: [0, 1, 2, 5, 3, 6, 4, 7, 8] },
  { name: 'Chaos',     segmentOrder: [2, 0, 3, 1, 6, 4, 5, 8, 7] },
];

// Extra segments for variety in cycle 2+ (#8)
const EXTRA_SEGMENTS = [
  {
    id: 10, name: 'Narrow Corridor',
    safeReward: { type: 'soldiers', count: 5, label: '+5' },
    riskReward: { type: 'soldiers', count: 10, label: '+10' },
    enemies: [
      { count: 12, enemyType: 'fast', hp: 2, xOffset: 0 },
      { count: 4, enemyType: 'tank', hp: 12 },
    ],
    boss: null, duration: 60, riskNarrow: true,
  },
  {
    id: 11, name: 'Heavy Swarm',
    safeReward: { type: 'soldiers', count: -3, label: '-3 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 3) } },
    riskReward: { type: 'soldiers', count: 8, label: '+8' },
    enemies: [
      { count: 20, enemyType: 'zombie', hp: 3, xOffset: 0 },
      { count: 8, enemyType: 'fast', hp: 2, xOffset: -4 },
      { count: 8, enemyType: 'fast', hp: 2, xOffset: 4 },
    ],
    boss: null, duration: 70, riskNarrow: false,
  },
  {
    id: 12, name: 'Elite Ambush',
    safeReward: { type: 'soldiers', count: 8, label: '+8' },
    riskReward: { type: 'soldiers', count: 12, label: '+12' },
    enemies: [
      { count: 6, enemyType: 'tank', hp: 15, xOffset: -3 },
      { count: 6, enemyType: 'tank', hp: 15, xOffset: 3 },
      { count: 4, enemyType: 'exploding', hp: 3 },
    ],
    boss: null, duration: 80, riskNarrow: true,
  },
  {
    id: 13, name: 'Mixed Assault',
    safeReward: { type: 'soldiers', count: 0, label: '÷2 ☠️', bad: true, mod: { apply: (n) => Math.max(1, Math.floor(n / 2)) } },
    riskReward: { type: 'soldiers', count: 0, label: '×1.5', mod: { apply: (n) => Math.floor(n * 1.5) } },
    enemies: [
      { count: 10, enemyType: 'zombie', hp: 5 },
      { count: 6, enemyType: 'fast', hp: 3, xOffset: -4 },
      { count: 4, enemyType: 'exploding', hp: 3, xOffset: 3 },
      { count: 3, enemyType: 'tank', hp: 12 },
    ],
    boss: null, duration: 80, riskNarrow: false,
  },
  {
    id: 14, name: 'Obstacle Maze',
    safeReward: { type: 'soldiers', count: 10, label: '+10' },
    riskReward: { type: 'soldiers', count: 15, label: '+15' },
    enemies: [
      { count: 15, enemyType: 'zombie', hp: 4, xOffset: 0 },
      { count: 5, enemyType: 'exploding', hp: 3, xOffset: 2 },
    ],
    boss: null, duration: 60, riskNarrow: true,
  },
  {
    id: 15, name: 'Boss Rush',
    safeReward: { type: 'soldiers', count: 15, label: '+15' },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [
      { count: 4, enemyType: 'tank', hp: 20, xOffset: 0 },
      { count: 8, enemyType: 'zombie', hp: 6 },
      { count: 6, enemyType: 'fast', hp: 3, xOffset: -3 },
    ],
    boss: null, duration: 80, riskNarrow: false,
  },
  {
    id: 16, name: 'Shield Wall',
    safeReward: { type: 'soldiers', count: 5, label: '+5' },
    riskReward: { type: 'soldiers', count: 12, label: '+12' },
    enemies: [
      { count: 8, enemyType: 'shield', hp: 10, xOffset: 0 },
      { count: 4, enemyType: 'tank', hp: 15, xOffset: -3 },
      { count: 6, enemyType: 'zombie', hp: 5, xOffset: 3 },
    ],
    boss: null, duration: 70, riskNarrow: true,
  },
  {
    id: 17, name: 'Speed Blitz',
    safeReward: { type: 'soldiers', count: -3, label: '-3 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 3) } },
    riskReward: { type: 'soldiers', count: 10, label: '+10' },
    enemies: [
      { count: 20, enemyType: 'fast', hp: 2, xOffset: 0 },
      { count: 10, enemyType: 'fast', hp: 3, xOffset: -4 },
      { count: 5, enemyType: 'charger', hp: 6, xOffset: 3 },
    ],
    boss: null, duration: 60, riskNarrow: false,
  },
  {
    id: 18, name: 'Splitter Swarm',
    safeReward: { type: 'soldiers', count: 8, label: '+8' },
    riskReward: { type: 'soldiers', count: 15, label: '+15' },
    enemies: [
      { count: 8, enemyType: 'splitter', hp: 6, xOffset: 0 },
      { count: 6, enemyType: 'zombie', hp: 4, xOffset: -3 },
      { count: 4, enemyType: 'fast', hp: 2, xOffset: 3 },
    ],
    boss: null, duration: 70, riskNarrow: false,
  },
  {
    id: 19, name: 'Charger Rush',
    safeReward: { type: 'soldiers', count: 5, label: '+5' },
    riskReward: { type: 'soldiers', count: 0, label: '×1.5', mod: { apply: (n) => Math.floor(n * 1.5) } },
    enemies: [
      { count: 10, enemyType: 'charger', hp: 6, xOffset: 0 },
      { count: 6, enemyType: 'charger', hp: 8, xOffset: -3 },
      { count: 4, enemyType: 'tank', hp: 12, xOffset: 3 },
    ],
    boss: null, duration: 60, riskNarrow: true,
  },
  {
    id: 20, name: 'Explosive Gauntlet',
    safeReward: { type: 'soldiers', count: -5, label: '-5 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 5) } },
    riskReward: { type: 'soldiers', count: 12, label: '+12' },
    enemies: [
      { count: 12, enemyType: 'exploding', hp: 3, xOffset: 0 },
      { count: 8, enemyType: 'exploding', hp: 4, xOffset: -3 },
      { count: 4, enemyType: 'tank', hp: 15, xOffset: 3 },
    ],
    boss: null, duration: 80, riskNarrow: false,
  },
  {
    id: 21, name: 'Ranged Siege',
    safeReward: { type: 'soldiers', count: 10, label: '+10' },
    riskReward: { type: 'soldiers', count: 18, label: '+18' },
    enemies: [
      { count: 8, enemyType: 'ranged', hp: 5, xOffset: 0 },
      { count: 6, enemyType: 'shield', hp: 10, xOffset: -4 },
      { count: 4, enemyType: 'zombie', hp: 6, xOffset: 4 },
    ],
    boss: null, duration: 70, riskNarrow: true,
  },
  {
    id: 22, name: 'Jump Maze',
    safeReward: { type: 'soldiers', count: 3, label: '+3' },
    riskReward: { type: 'soldiers', count: 8, label: '+8' },
    enemies: [
      { count: 15, enemyType: 'jumping', hp: 3, xOffset: 0 },
      { count: 8, enemyType: 'fast', hp: 2, xOffset: -3 },
      { count: 5, enemyType: 'zombie', hp: 5, xOffset: 3 },
    ],
    boss: null, duration: 60, riskNarrow: false,
  },
  {
    id: 23, name: 'Resource Zone',
    safeReward: { type: 'soldiers', count: 15, label: '+15' },
    riskReward: { type: 'soldiers', count: 0, label: '×2', mod: { apply: (n) => Math.min(ARMY_HARD_CAP, n * 2) } },
    enemies: [
      { count: 4, enemyType: 'zombie', hp: 3, xOffset: 0 },
      { count: 2, enemyType: 'fast', hp: 1, xOffset: -3 },
    ],
    boss: null, duration: 40, riskNarrow: false,
  },
  {
    id: 24, name: 'Mini-Boss Gauntlet',
    safeReward: { type: 'soldiers', count: 10, label: '+10' },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [
      { count: 2, enemyType: 'tank', hp: 25, xOffset: 0 },
      { count: 8, enemyType: 'zombie', hp: 6, xOffset: -3 },
      { count: 6, enemyType: 'fast', hp: 3, xOffset: 3 },
      { count: 4, enemyType: 'charger', hp: 8, xOffset: 0 },
    ],
    boss: null, duration: 80, riskNarrow: true,
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
    this.currentSegment = 0;        // 0-8 index into SEGMENT_DEFS
    this.segmentCycle = 0;          // Which loop iteration (0=first, 1=second, ...)
    this.difficultyMult = 1.0;      // HP multiplier, +0.4 per cycle
    this.milestone = '';            // Best milestone reached this run
    this.bestMilestone = this._loadBestMilestone(); // Best milestone ever
    this.currentBoss = null;        // Boss type currently being fought
    this.internalSegments = [];     // Flat sequence of gate/enemy/boss sub-steps
    this.internalSegIdx = 0;        // Current position in internalSegments
    this.inCombat = false;
    this.nextSegmentDist = 50;
    
    // Active ability cooldown timers
    this._grenadeCooldown = 0;
    this._airstrikeCooldown = 0;
    this._shockwaveCooldown = 0;
    this._medicTimer = 0;
    
    // Path obstacle tracking
    this._pathObstacles = [];
    
    // Input state
    this.isDragging = false;
    this.dragStartX = 0;
    this._setupInput();
    
    // UI references
    this._setupUI();
    
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
    
    // Road strip (wider for formation gameplay)
    const roadGeo = new THREE.PlaneGeometry(20, 400);
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
    leftEdge.position.set(-9.8, 0.01, -120);
    rightEdge.position.set(9.8, 0.01, -120);
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
      const baseX = side * (12 + Math.random() * 10);
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
      this.armyTargetX = Math.max(-8.5, Math.min(8.5, this.armyTargetX + dx));
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
    this.hudLevel = document.getElementById('hud-level');
    
    // Show best milestone on boot screen
    const bootBest = document.getElementById('boot-best');
    if (bootBest && this.bestMilestone) {
      bootBest.textContent = '⭐ Best Run: ' + this.bestMilestone;
      bootBest.style.display = '';
    }
    
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
      this._updateBootBest();
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
      this._updateBootBest();
      this.state = 'boot';
    });
  }
  
  _updateBootBest() {
    const bootBest = document.getElementById('boot-best');
    if (bootBest && this.bestMilestone) {
      bootBest.textContent = '⭐ Best Run: ' + this.bestMilestone;
      bootBest.style.display = '';
    }
  }
  
  _formatCycleLabel() {
    return this.segmentCycle > 0 ? ` C${this.segmentCycle + 1}` : '';
  }
  
  _updateHUD() {
    if (this.hudSoldierCount) this.hudSoldierCount.textContent = this.soldierCount;
    if (this.hudLevel) {
      const segDef = this._getSegDef(this.currentSegment) || SEGMENT_DEFS[0];
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
    // Best run display
    const bestEl = document.getElementById('hud-best');
    if (bestEl) {
      if (this.bestMilestone) {
        bestEl.textContent = '⭐ Best: ' + this.bestMilestone;
        bestEl.style.display = '';
      } else {
        bestEl.style.display = 'none';
      }
    }
  }
  
  startGame() {
    this.soldierCount = 3;
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
    
    // Weapon system (#4)
    this.currentWeapon = 'handgun';
    this._barrels = [];
    
    // Map layout (#5)
    this.mapLayout = Math.floor(Math.random() * MAP_LAYOUTS.length);
    
    // Reset active ability cooldowns
    this._grenadeCooldown = 0;
    this._airstrikeCooldown = 0;
    this._shockwaveCooldown = 0;
    this._medicTimer = 0;
    
    // Companion attack timers (#7)
    this._dragonAttackTimer = 0;
    this._turretAttackTimer = 0;
    this._droneAttackTimer = 0;
    
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
    this._clearPathObstacles();
    this._clearBarrels();
    
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
    
    let segOrder;
    if (this.segmentCycle === 0) {
      // First cycle: use the selected map layout
      const layout = MAP_LAYOUTS[this.mapLayout || 0] || MAP_LAYOUTS[0];
      segOrder = layout.segmentOrder;
    } else {
      // Later cycles: mix base + extra segments, shuffled
      const allSegs = [];
      for (let i = 0; i < SEGMENT_DEFS.length; i++) allSegs.push(i);
      for (let i = 0; i < EXTRA_SEGMENTS.length; i++) allSegs.push(SEGMENT_DEFS.length + i);
      // Fisher-Yates shuffle
      for (let i = allSegs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = allSegs[i]; allSegs[i] = allSegs[j]; allSegs[j] = tmp;
      }
      // Take 9 segments, ensure at least one boss
      segOrder = allSegs.slice(0, 9);
      const hasBoss = segOrder.some(idx => {
        const d = this._getSegDef(idx);
        return d && d.boss;
      });
      if (!hasBoss) segOrder[segOrder.length - 1] = 4; // Force ogre boss (SEGMENT_DEFS index 4)
    }
    
    for (const segIdx of segOrder) {
      const def = this._getSegDef(segIdx);
      if (!def) continue;
      if (def.boss) {
        this.internalSegments.push({ type: 'boss', defIdx: segIdx });
        this.internalSegments.push({ type: 'gates', defIdx: segIdx });
      } else {
        this.internalSegments.push({ type: 'gates', defIdx: segIdx });
        this.internalSegments.push({ type: 'enemies', defIdx: segIdx });
      }
    }
  }
  
  _getSegDef(idx) {
    if (idx < SEGMENT_DEFS.length) return SEGMENT_DEFS[idx];
    return EXTRA_SEGMENTS[idx - SEGMENT_DEFS.length] || SEGMENT_DEFS[0];
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
    this._saveBestMilestone();
    
    // Increase scroll speed slightly each cycle for more pressure
    this.scrollSpeed = Math.min(MAX_SCROLL_SPEED, BASE_SCROLL_SPEED + this.segmentCycle * SCROLL_SPEED_PER_CYCLE);
    
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
    this._cycleMsg.textContent = text;
    this._cycleMsg.style.transition = 'none';
    this._cycleMsg.style.opacity = '1';
    // Force reflow so the transition reset takes effect
    void this._cycleMsg.offsetWidth;
    setTimeout(() => {
      this._cycleMsg.style.transition = 'opacity 1.5s ease-out';
      this._cycleMsg.style.opacity = '0';
    }, 500);
  }
  
  // ── Path obstacles (walls/barriers between SAFE and RISK paths) ──
  
  _spawnPathObstacles(worldZ, riskNarrow) {
    // Center divider wall: forces player to commit to left (SAFE) or right (RISK)
    const wallHeight = 3.0;
    const wallLength = 35;
    const wallGeo = new THREE.BoxGeometry(0.6, wallHeight, wallLength);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    
    const wall = new THREE.Mesh(wallGeo, wallMat);
    // Store local offset from base worldZ; actual position set during _updatePathObstacles
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this._pathObstacles.push({ mesh: wall, worldZ: worldZ, localY: wallHeight / 2, localZ: wallLength / 2 - 10, localX: 0 });
    
    // Rocky barrier pieces along divider (visual variety)
    const rockGeo = new THREE.BoxGeometry(0.8, 1.2, 1.5);
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
    for (let i = 0; i < 4; i++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const lz = 5 + i * 4.5 + (Math.random() - 0.5) * 1.5;
      const lx = (Math.random() - 0.5) * 0.4;
      rock.rotation.y = Math.random() * 0.5;
      rock.castShadow = true;
      this.scene.add(rock);
      this._pathObstacles.push({ mesh: rock, worldZ: worldZ, localY: 0.6, localZ: lz, localX: lx });
    }
    
    // If risk path is narrow, add barriers on the right side
    if (riskNarrow) {
      const barrierGeo = new THREE.BoxGeometry(0.5, 2.0, 2.0);
      const barrierMat = new THREE.MeshLambertMaterial({ color: 0x884422 });
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
      // Position = worldZ offset by camera scroll, plus local Z offset
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
      // Remove obstacles that are far behind camera  
      if (obs.mesh.position.z > OBSTACLE_CLEANUP_THRESHOLD) {
        this.scene.remove(obs.mesh);
        if (obs.mesh.geometry) obs.mesh.geometry.dispose();
        if (obs.mesh.material) obs.mesh.material.dispose();
        this._pathObstacles.splice(i, 1);
      }
    }
  }
  
  // ── Hard collision lock (#1) ──
  
  _clampArmyToPath() {
    for (const obs of this._pathObstacles) {
      if (obs.localX !== 0) continue; // Only center divider walls
      const visualZ = obs.mesh.position.z;
      if (visualZ > -5 && visualZ < 25) {
        const wallHalfW = 0.7; // wall half width + buffer
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
  
  // ── Barrel weapon system (#4) ──
  
  _spawnBarrel(worldZ) {
    const rewards = BARREL_REWARDS;
    const reward = rewards[Math.floor(Math.random() * rewards.length)];
    
    const geo = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 12);
    const barrelColor = reward.good ? 0x44aa44 : 0xaa4422;
    const mat = new THREE.MeshLambertMaterial({ color: barrelColor });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.6;
    mesh.castShadow = true;
    const xPos = (Math.random() - 0.5) * (ArmyManager.ROAD_HALF * 2 - 4);
    mesh.position.x = xPos;
    
    // Label sprite above barrel
    const labelSprite = this._createBarrelLabel(reward.label, reward.good);
    labelSprite.position.set(xPos, 2.5, 0);
    labelSprite.scale.set(2.5, 1.0, 1);
    
    // HP bar sprite
    const hpCanvas = document.createElement('canvas');
    hpCanvas.width = 64;
    hpCanvas.height = 8;
    const hpCtx = hpCanvas.getContext('2d');
    hpCtx.fillStyle = '#222';
    hpCtx.fillRect(0, 0, 64, 8);
    hpCtx.fillStyle = '#44ff44';
    hpCtx.fillRect(1, 1, 62, 6);
    const hpTexture = new THREE.CanvasTexture(hpCanvas);
    const hpSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: hpTexture, transparent: true }));
    hpSprite.position.set(xPos, 2.0, 0);
    hpSprite.scale.set(1.5, 0.2, 1);
    
    this.scene.add(mesh);
    this.scene.add(labelSprite);
    this.scene.add(hpSprite);
    
    this._barrels.push({
      mesh, worldZ, xPos, reward,
      label: labelSprite, hpBar: hpSprite, hpCanvas,
      hp: 3, maxHp: 3, hitFlash: 0, baseColor: barrelColor
    });
  }
  
  _createBarrelLabel(text, isGood) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = isGood ? 'rgba(0, 140, 60, 0.9)' : 'rgba(170, 40, 0, 0.9)';
    ctx.fillRect(4, 4, canvas.width - 8, canvas.height - 8);
    ctx.strokeStyle = isGood ? '#44ff88' : '#ff4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 3;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(spriteMat);
  }
  
  _updateBarrels() {
    for (let i = this._barrels.length - 1; i >= 0; i--) {
      const barrel = this._barrels[i];
      const visualZ = barrel.worldZ - this.cameraZ;
      barrel.mesh.position.z = visualZ;
      barrel.label.position.z = visualZ;
      barrel.hpBar.position.z = visualZ;
      
      // Hit flash decay
      if (barrel.hitFlash > 0) {
        barrel.hitFlash -= 0.05;
        const flashColor = new THREE.Color(barrel.baseColor).lerp(new THREE.Color(0xffffff), Math.max(0, barrel.hitFlash));
        barrel.mesh.material.color.copy(flashColor);
      }
      
      // Cleanup barrels far behind camera
      if (visualZ > 30) {
        this._removeBarrel(i);
      }
    }
  }
  
  _checkBarrelBulletHit(bx, by, bz) {
    for (let i = this._barrels.length - 1; i >= 0; i--) {
      const barrel = this._barrels[i];
      const visualZ = barrel.worldZ - this.cameraZ;
      const dx = Math.abs(bx - barrel.xPos);
      const dz = Math.abs(bz - visualZ);
      
      if (dx < 1.0 && dz < 1.0 && by < 2.0) {
        barrel.hp--;
        barrel.hitFlash = 1.0;
        
        // Update HP bar
        const ratio = Math.max(0, barrel.hp / barrel.maxHp);
        const ctx = barrel.hpCanvas.getContext('2d');
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, 64, 8);
        ctx.fillStyle = ratio > 0.5 ? '#44ff44' : '#ff4444';
        ctx.fillRect(1, 1, Math.max(0, 62 * ratio), 6);
        barrel.hpBar.material.map.needsUpdate = true;
        
        if (barrel.hp <= 0) {
          this._activateBarrel(barrel);
          this._removeBarrel(i);
        }
        return true;
      }
    }
    return false;
  }
  
  _activateBarrel(barrel) {
    const reward = barrel.reward;
    this.effects.explode(barrel.xPos, 1.5, barrel.mesh.position.z, reward.good ? 0x44ff88 : 0xff4400, 20, 5);
    this.effects.screenFlash(reward.good ? 0x44ff88 : 0xff4400, 0.4);
    this.camCtrl.shake(0.4);
    
    if (reward.type === 'weapon') {
      this.currentWeapon = reward.id;
      this._showCycleMessage(WEAPON_TYPES[reward.id].label);
    } else if (reward.type === 'soldiers') {
      this.soldierCount = Math.max(1, this.soldierCount + reward.count);
      this.soldierCount = Math.min(this.soldierCount, ARMY_HARD_CAP);
      this.armyMgr.setCount(this.soldierCount, this.armyX);
      this._showCycleMessage(reward.label);
    } else if (reward.type === 'fireRate') {
      if (reward.penalty) {
        this.upgrades.betterGuns = Math.max(0, (this.upgrades.betterGuns || 0) - 1);
      } else {
        this.upgrades[reward.id] = (this.upgrades[reward.id] || 0) + 1;
      }
      this._showCycleMessage(reward.label);
    } else if (reward.type === 'damage') {
      this.upgrades[reward.id] = (this.upgrades[reward.id] || 0) + 1;
      this._showCycleMessage(reward.label);
    }
    
    if (window.audioManager) {
      if (reward.good) window.audioManager.gatGood();
      else window.audioManager.gateBad();
    }
    this._updateHUD();
  }
  
  _removeBarrel(index) {
    const barrel = this._barrels[index];
    this.scene.remove(barrel.mesh);
    this.scene.remove(barrel.label);
    this.scene.remove(barrel.hpBar);
    if (barrel.mesh.geometry) barrel.mesh.geometry.dispose();
    if (barrel.mesh.material) barrel.mesh.material.dispose();
    if (barrel.label.material) {
      if (barrel.label.material.map) barrel.label.material.map.dispose();
      barrel.label.material.dispose();
    }
    if (barrel.hpBar.material) {
      if (barrel.hpBar.material.map) barrel.hpBar.material.map.dispose();
      barrel.hpBar.material.dispose();
    }
    this._barrels.splice(index, 1);
  }
  
  _clearBarrels() {
    for (let i = this._barrels.length - 1; i >= 0; i--) {
      this._removeBarrel(i);
    }
  }
  
  _checkBarrelBulletHitsFromProjectiles() {
    if (this._barrels.length === 0) return;
    const bullets = this.projSys._bulletData;
    const activeList = this.projSys._bullets;
    for (let i = activeList.length - 1; i >= 0; i--) {
      const idx = activeList[i];
      const bullet = bullets[idx];
      if (!bullet.active) continue;
      if (this._checkBarrelBulletHit(bullet.x, bullet.y, bullet.z)) {
        // Bullet hit a barrel - deactivate it
        this.projSys._deactivateBullet(i, idx);
      }
    }
  }
  
  // ── Milestone persistence ──
  
  _loadBestMilestone() {
    try {
      return localStorage.getItem('armyrunner_best') || '';
    } catch (_) { return ''; }
  }
  
  _saveBestMilestone() {
    // Compare milestone rankings
    const currentIdx = MILESTONE_ORDER.indexOf(this.milestone);
    const bestIdx = MILESTONE_ORDER.indexOf(this.bestMilestone);
    
    // Cycle milestones are always better than pre-defined ones
    const isCycleMilestone = this.milestone.startsWith('Cycle');
    const isBestCycle = this.bestMilestone.startsWith('Cycle');
    
    let newBest = false;
    if (isCycleMilestone && !isBestCycle) {
      newBest = true;
    } else if (isCycleMilestone && isBestCycle) {
      const curCycle = parseInt(this.milestone.replace('Cycle ', '')) || 0;
      const bestCycle = parseInt(this.bestMilestone.replace('Cycle ', '')) || 0;
      newBest = curCycle > bestCycle;
    } else if (!isCycleMilestone && !isBestCycle) {
      newBest = currentIdx > bestIdx;
    }
    
    if (newBest || !this.bestMilestone) {
      this.bestMilestone = this.milestone;
      try {
        localStorage.setItem('armyrunner_best', this.milestone);
      } catch (_) {}
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
    this._updateScreenFlash();
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }
  
  _update(dt) {
    // 1. Scroll world ALWAYS (cameraZ decreases = move forward) — never stop
    this.cameraZ -= this.scrollSpeed * dt;
    
    // 2. Steer army
    this.armyX += (this.armyTargetX - this.armyX) * Math.min(1, dt * 8);
    
    // 2b. Hard collision lock — prevent crossing center wall (#1)
    this._clampArmyToPath();
    
    // 3. Update army formation
    this.armyMgr.update(dt, this.armyX, this.clock.elapsedTime, this.upgrades);
    // Update weapon visual
    this.armyMgr.setWeaponType(this.currentWeapon);
    this.camCtrl.follow(this.armyX, this.soldierCount);
    
    // 4. Update road scrolling
    this._updateDashes();
    this._updateTrees();
    this._updatePathObstacles();
    
    // 4b. Obstacle collision — soldiers must not clip through walls/barriers
    this.armyMgr.applyObstacleCollision(this._pathObstacles);
    
    // 4c. Update weapon barrels (#4)
    this._updateBarrels();
    
    // 5. Ground/road are fixed in Three.js space (camera never moves in Z)
    
    // 6. Compute stats (needed for combat and projectile updates)
    const stats = this._getStats();
    
    // 7. Enemy update — ALWAYS update enemies while they exist (continuous movement)
    if (this.enemyMgr.enemies.length > 0) {
      const { soldierLosses, killedEnemies } = this.enemyMgr.update(dt, this.armyX);
      
      // Handle soldier losses — larger armies take more damage (#6)
      if (soldierLosses > 0) {
        const armySizeMultiplier = 1 + Math.max(0, (this.soldierCount - ARMY_SOFT_CAP) / ARMY_SOFT_CAP);
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
        this._updateHUD();
      }
      
      // Bullet collision checks
      this.projSys.checkHits(this.enemyMgr, stats);
      
      // Check barrel bullet hits
      this._checkBarrelBulletHitsFromProjectiles();
      
      // Active abilities during combat
      this._updateAbilities(dt, stats);
      
      // Check if combat wave is cleared
      if (this.inCombat && this.enemyMgr.count === 0) {
        this.inCombat = false;
        this.combatLight.intensity = 0;
        
        // Track boss defeat milestones
        if (this.currentBoss) {
          if (this.currentBoss === 'ogre') this.milestone = 'Defeated Ogre';
          else if (this.currentBoss === 'giant') this.milestone = 'Defeated Giant';
          else if (this.currentBoss === 'fireDragon') this.milestone = 'Defeated Fire Dragon';
          this.currentBoss = null;
        }
        
        this._triggerNextSegment();
      }
    }
    
    // 7b. Medic regen (works outside combat too, only below soft cap) (#6, #10)
    if (stats.hasMedic) {
      this._medicTimer += dt;
      if (this._medicTimer >= 8.0) {
        this._medicTimer = 0;
        if (this.soldierCount < ARMY_SOFT_CAP) {
          this.soldierCount = Math.min(ARMY_SOFT_CAP, this.soldierCount + 1);
          this.armyMgr.setCount(this.soldierCount, this.armyX);
          this.effects.gateEffect(this.armyX, 0.5, 0, 0x44ff88);
          this._updateHUD();
        }
      }
    }
    
    // 8. Update projectiles
    this.projSys.update(dt, this.armyX, 0, this.soldierCount, 
      this.enemyMgr.enemies, this.upgrades, stats, null, this.armyMgr);
    
    // 8b. Check barrel bullet hits (also outside combat so barrels can be shot anytime)
    if (this.enemyMgr.enemies.length === 0) {
      this._checkBarrelBulletHitsFromProjectiles();
    }
    
    // 8c. Update gates and check collisions
    this.gateSys.update(this.cameraZ);
    const gateHit = this.gateSys.checkCollision(this.armyX);
    if (gateHit) {
      this._onGateHit(gateHit);
    }
    
    // 9. Clean up old gates and obstacles
    this.gateSys.cleanup(this.cameraZ);
    this._cleanupPathObstacles();
    
    // 10. Trigger next segment when distance reached (only when not in active combat)
    if (-this.cameraZ > this.nextSegmentDist && !this.inCombat) {
      this._triggerNextSegment();
    }
    
    // Update combat light position
    this.combatLight.position.x = this.armyX;
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
    
    // Grenade: AOE damage on cooldown
    if (stats.hasGrenade) {
      this._grenadeCooldown -= dt;
      if (this._grenadeCooldown <= 0) {
        this._grenadeCooldown = 4.0; // 4 second cooldown
        // Target middle enemy in the wave (approximate center of mass)
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
    
    // Airstrike: massive damage line across the field
    if (stats.hasAirstrike) {
      this._airstrikeCooldown -= dt;
      if (this._airstrikeCooldown <= 0) {
        this._airstrikeCooldown = 8.0; // 8 second cooldown
        // Damage all enemies in a wide horizontal stripe
        this.effects.screenFlash(0xcc2200, 0.4);
        this.camCtrl.shake(1.0);
        for (const e of aliveEnemies) {
          this.enemyMgr.damageEnemy(e, stats.airstrikeDamage);
          this.effects.explode(e.worldX, 2, e.worldZ, 0xff6600, 5, 3);
        }
        if (window.audioManager) window.audioManager.bossRoar();
      }
    }
    
    // Shockwave: knockback-style AOE centered on army
    if (stats.hasShockwave) {
      this._shockwaveCooldown -= dt;
      if (this._shockwaveCooldown <= 0) {
        this._shockwaveCooldown = 6.0; // 6 second cooldown
        this.effects.gateEffect(this.armyX, 0.5, 0, 0x8844ff);
        this.effects.screenFlash(0x8844ff, 0.3);
        this.camCtrl.shake(0.8);
        for (const e of aliveEnemies) {
          const dx = e.worldX - this.armyX;
          const dz = e.worldZ;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < stats.shockwaveRadius) {
            this.enemyMgr.damageEnemy(e, stats.shockwaveDamage);
            // Push enemies back
            if (dist > 0.5) {
              e.worldZ -= (stats.shockwaveRadius - dist) * 0.5;
              e.group.position.z = e.worldZ;
            }
          }
        }
        if (window.audioManager) window.audioManager.shoot();
      }
    }
    
    // ── Companion damage (#7) ──
    
    // Dragon companion attack
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
    
    // Auto-turret attack
    if (stats.hasAutoTurret) {
      this._turretAttackTimer += dt;
      if (this._turretAttackTimer >= 1.0) {
        this._turretAttackTimer = 0;
        const turretDamage = 3;
        for (let t = 0; t < stats.autoTurretCount && t < aliveEnemies.length; t++) {
          const target = aliveEnemies[t]; // Target different enemies like dragons
          this.enemyMgr.damageEnemy(target, turretDamage);
          this.effects.explode(target.worldX, 1, target.worldZ, 0xaabb44, 5, 2);
        }
      }
    }
    
    // Drone attack (sideCannons)
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
  
  _triggerNextSegment() {
    if (this.internalSegIdx >= this.internalSegments.length) {
      this._startNewCycle();
      return;
    }
    
    const seg = this.internalSegments[this.internalSegIdx++];
    const def = this._getSegDef(seg.defIdx);
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
    // Left = SAFE gate (negative rewards use bad flag) (#3)
    const safe = def.safeReward;
    const isNegativeSafe = !!safe.bad;
    const leftConfig = {
      label: safe.label,
      mod: safe.mod || { apply: (n) => n + safe.count },
      good: !isNegativeSafe,
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
    
    // Spawn path obstacles (walls/barriers) before the gate
    this._spawnPathObstacles(baseZ, !!def.riskNarrow);
    
    // Spawn weapon barrels in the approach zone
    if (Math.random() < 0.5) {
      this._spawnBarrel(baseZ + 15);
    }
    if (Math.random() < 0.25) {
      this._spawnBarrel(baseZ + 25);
    }
  }
  
  _spawnEnemies(def) {
    // Scale enemy count by cycle (more enemies in later cycles)
    const countMult = 1 + this.segmentCycle * ENEMY_COUNT_SCALE_PER_CYCLE;
    // Within-segment HP scaling (#2) — use internalSegIdx for consistent progression
    const segmentProgress = Math.min(1, this.internalSegIdx / Math.max(this.internalSegments.length, 1));
    const hpScale = 1 + segmentProgress * 0.8;
    const scaledEnemies = def.enemies.map(e => ({
      ...e,
      count: Math.ceil(e.count * countMult),
      hp: Math.ceil((e.hp || 1) * hpScale),
      xOffset: e.xOffset || 0,
    }));
    this.enemyMgr.spawnWave(scaledEnemies, -60, this.armyX, this.difficultyMult);
  }
  
  _spawnBoss(def) {
    const bossType = def.boss;
    if (!BOSS_HP[bossType]) {
      console.warn(`Unknown boss type "${bossType}", using default HP 100`);
    }
    const baseHp = BOSS_HP[bossType] || 100;
    
    this.currentBoss = bossType;
    if (bossType === 'ogre') this.milestone = 'Reached Ogre';
    else if (bossType === 'giant') this.milestone = 'Reached Giant';
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
      
      // Check for bonus reward (e.g. segment 6 gives both drone + piercing)
      const segDef = this._getSegDef(this.currentSegment);
      if (segDef && segDef.riskBonus && side === 'right') {
        const bonus = segDef.riskBonus;
        this.upgrades[bonus.id] = (this.upgrades[bonus.id] || 0) + 1;
      }
    } else {
      // Soldier modifier with army size control (#6)
      let newCount = Math.max(1, chosen.mod.apply(this.soldierCount));
      if (newCount > ARMY_SOFT_CAP) {
        const excess = newCount - ARMY_SOFT_CAP;
        newCount = ARMY_SOFT_CAP + Math.floor(excess * 0.5);
      }
      newCount = Math.min(newCount, ARMY_HARD_CAP);
      this.soldierCount = newCount;
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
    this._saveBestMilestone();
    if (window.audioManager) window.audioManager.win();
    
    const screen = document.getElementById('screen-win');
    screen.classList.add('active');
    
    document.getElementById('win-title').textContent = this.milestone || 'VICTORY!';
    document.getElementById('win-next-btn').textContent = '\u{1F504}  PLAY AGAIN';
  }
  
  _triggerLose() {
    this.state = 'lose';
    if (window.audioManager) window.audioManager.lose();
    
    // Save best milestone
    this._saveBestMilestone();
    
    const screen = document.getElementById('screen-lose');
    screen.classList.add('active');
    
    const segDef = this._getSegDef(this.currentSegment) || SEGMENT_DEFS[0];
    document.getElementById('lose-level').textContent =
      `${this.milestone || ('Segment ' + segDef.id)}${this._formatCycleLabel()}`;
    
    // Show best run on lose screen
    const bestEl = document.getElementById('lose-best');
    if (bestEl && this.bestMilestone) {
      bestEl.textContent = '⭐ Best Run: ' + this.bestMilestone;
      bestEl.style.display = '';
    }
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
