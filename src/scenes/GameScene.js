// src/scenes/GameScene.js — Main gameplay scene (complete rewrite)

// ─── Constants ────────────────────────────────────────────────────────────────
const GW = 390;
const GH = 844;
const VP_X = GW / 2;          // road vanishing point X
const VP_Y = GH * 0.25;       // road vanishing point Y
const ARMY_Y = GH * 0.78;     // where army sits on screen (fixed)
const ROAD_TOP_W = 120;       // road width at vanishing point
const ROAD_BOT_W = 360;       // road width at army level
const MAX_VISUAL_SOLDIERS = 30;

// ─── Level Definitions ────────────────────────────────────────────────────────
const LEVEL_DEFS = [
  {
    name: 'Field', sceneryType: 'field', bossType: 'field_commander',
    bossHp: 50, bossName: 'Field Commander',
    skyColor: 0x87ceeb, grassColor: 0x2d7a27, roadColor: 0x333344,
    treeTypes: ['pine', 'dead'],
    segments: [
      { type: 'intro', length: 500 },
      { type: 'gates', count: 3, badChance: 0.3 },
      { type: 'enemies', waves: [{ count: 3, hp: 3, type: 'normal' }] },
      { type: 'gates', count: 3, badChance: 0.3 },
      { type: 'upgrade' },
      { type: 'enemies', waves: [{ count: 4, hp: 3, type: 'normal' }, { count: 2, hp: 8, type: 'heavy' }] },
      { type: 'gates', count: 3, badChance: 0.35 },
      { type: 'enemies', waves: [{ count: 5, hp: 3, type: 'normal' }] },
      { type: 'boss' },
    ],
  },
  {
    name: 'Forest', sceneryType: 'forest', bossType: 'forest_warlord',
    bossHp: 65, bossName: 'Forest Warlord',
    skyColor: 0x6ab04c, grassColor: 0x1a5c14, roadColor: 0x2a3020,
    treeTypes: ['pine', 'pine', 'dead'],
    segments: [
      { type: 'intro', length: 500 },
      { type: 'gates', count: 4, badChance: 0.33 },
      { type: 'enemies', waves: [{ count: 4, hp: 4, type: 'normal' }] },
      { type: 'gates', count: 3, badChance: 0.3 },
      { type: 'upgrade' },
      { type: 'enemies', waves: [{ count: 5, hp: 4, type: 'normal' }, { count: 3, hp: 10, type: 'heavy' }] },
      { type: 'gates', count: 3, badChance: 0.38 },
      { type: 'enemies', waves: [{ count: 6, hp: 4, type: 'normal' }] },
      { type: 'boss' },
    ],
  },
  {
    name: 'Desert', sceneryType: 'desert', bossType: 'desert_general',
    bossHp: 80, bossName: 'Desert General',
    skyColor: 0xf5c842, grassColor: 0xc8a84b, roadColor: 0x7a6a44,
    treeTypes: ['cactus', 'cactus', 'dead'],
    segments: [
      { type: 'intro', length: 500 },
      { type: 'gates', count: 4, badChance: 0.35 },
      { type: 'enemies', waves: [{ count: 5, hp: 4, type: 'normal' }] },
      { type: 'gates', count: 3, badChance: 0.32 },
      { type: 'upgrade' },
      { type: 'enemies', waves: [{ count: 5, hp: 5, type: 'normal' }, { count: 3, hp: 12, type: 'heavy' }] },
      { type: 'gates', count: 4, badChance: 0.4 },
      { type: 'enemies', waves: [{ count: 7, hp: 4, type: 'normal' }] },
      { type: 'boss' },
    ],
  },
  {
    name: 'Arctic', sceneryType: 'arctic', bossType: 'arctic_overlord',
    bossHp: 90, bossName: 'Arctic Overlord',
    skyColor: 0xb0d8f0, grassColor: 0xddeeff, roadColor: 0x445566,
    treeTypes: ['snow_pine', 'snow_pine', 'dead'],
    segments: [
      { type: 'intro', length: 500 },
      { type: 'gates', count: 4, badChance: 0.38 },
      { type: 'enemies', waves: [{ count: 5, hp: 5, type: 'normal' }] },
      { type: 'gates', count: 3, badChance: 0.35 },
      { type: 'upgrade' },
      { type: 'enemies', waves: [{ count: 6, hp: 5, type: 'normal' }, { count: 4, hp: 14, type: 'heavy' }] },
      { type: 'gates', count: 4, badChance: 0.42 },
      { type: 'enemies', waves: [{ count: 8, hp: 5, type: 'normal' }] },
      { type: 'boss' },
    ],
  },
  {
    name: 'Volcanic', sceneryType: 'volcanic', bossType: 'demon_lord',
    bossHp: 100, bossName: 'Demon Lord',
    skyColor: 0x8b0000, grassColor: 0x3a1a0a, roadColor: 0x221100,
    treeTypes: ['dead', 'dead', 'cactus'],
    segments: [
      { type: 'intro', length: 500 },
      { type: 'gates', count: 4, badChance: 0.4 },
      { type: 'enemies', waves: [{ count: 6, hp: 5, type: 'normal' }] },
      { type: 'gates', count: 4, badChance: 0.38 },
      { type: 'upgrade' },
      { type: 'enemies', waves: [{ count: 6, hp: 6, type: 'normal' }, { count: 4, hp: 16, type: 'heavy' }] },
      { type: 'gates', count: 4, badChance: 0.45 },
      { type: 'enemies', waves: [{ count: 9, hp: 5, type: 'normal' }] },
      { type: 'boss' },
    ],
  },
];

// ─── Gate modifier pools ───────────────────────────────────────────────────────
const GOOD_MODS = [
  { label: '+10', apply: (n) => n + 10 },
  { label: '+15', apply: (n) => n + 15 },
  { label: '+25', apply: (n) => n + 25 },
  { label: '×2',  apply: (n) => n * 2 },
  { label: '×3',  apply: (n) => n * 3 },
];
const BAD_MODS = [
  { label: '−10', apply: (n) => Math.max(1, n - 10) },
  { label: '−15', apply: (n) => Math.max(1, n - 15) },
  { label: '÷2',  apply: (n) => Math.max(1, Math.floor(n / 2)) },
];

// ─── Upgrade pool ─────────────────────────────────────────────────────────────
const UPGRADE_POOL = [
  { id: 'betterGuns', icon: '🔫', name: 'Better Guns', desc: 'Fire faster & hit harder' },
  { id: 'armor',      icon: '🛡️', name: 'Armor',       desc: 'Soldiers survive 2 hits' },
  { id: 'grenade',    icon: '💣', name: 'Grenades',    desc: 'Periodic AOE blast' },
  { id: 'medic',      icon: '❤️', name: 'Medic',       desc: 'Slowly recover soldiers' },
  { id: 'speed',      icon: '⚡', name: 'Speed Boost', desc: 'Move & scroll faster' },
];

// ─── GameScene ────────────────────────────────────────────────────────────────
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ── init ──────────────────────────────────────────────────────────────────
  init(data) {
    this.currentLevel = data.level || 1;
    this.soldierCount  = 20;
    this.upgrades      = {};
    this.phase         = 'running';

    // Endless loop state
    this.difficultyMult   = data.difficultyMult || 1;
    this.hasSeenAllLevels = data.hasSeenAllLevels || false;
    this.levelStartScrollY = 0;

    // Road/scroll state
    this.scrollY       = 0;
    this.scrollSpeed   = 200;
    this.baseScrollSpeed = 200;

    // Army movement
    this.armyX         = GW / 2;
    this.armyTargetX   = GW / 2;
    this.armyY         = ARMY_Y;
    this.isDragging    = false;
    this.dragStartX    = 0;

    // Walk animation
    this.legPhase      = 0;
    this.legTimer      = 0;

    // Shooting
    this.fireTimer     = 0;
    this.bullets       = [];

    // Enemies (screen-space)
    this.activeEnemies = [];

    // World content built later
    this.gateObjects   = [];
    this.enemyWaveTriggers = [];
    this.upgradeGateTrigger = null;
    this.bossTriggerY  = 0;
    this.totalRoadLength = 0;

    // Boss state
    this.bossHp        = 0;
    this.bossMaxHp     = 0;
    this.bossEnraged   = false;
    this.bossX         = VP_X;
    this.bossY         = VP_Y + 30;
    this.bossAttackTimer = 0;
    this.bossProjectiles = [];
    this.bossAttackInterval = 2.0;
    this.bossIntroDone = false;
    this.bossTriggerDone = false;

    // Scenery
    this.sceneryObjects = [];

    // Particles / effects
    this.particles     = [];
    this.coinParticles = [];
    this.muzzleFlashes = [];
    this.screenFlash   = 0;   // 0..1, fades out
    this.screenFlashColor = 0xff0000;
    this.comboCount    = 0;
    this.comboTimer    = 0;
    this.comboTexts    = [];

    // UI
    this.upgradePopup  = null;
    this.soldierCountBounce = 0;

    // Combat juice
    this.grenadeTimer  = 0;
    this.medicTimer    = 0;
    this.damageCooldown = 0;

    // Score
    this.score = 0;
    this._countLabel = null;
  }

  // ── create ────────────────────────────────────────────────────────────────
  create() {
    this.W = GW;
    this.H = GH;

    const lvlIdx = Math.min(this.currentLevel - 1, LEVEL_DEFS.length - 1);
    this.levelDef = LEVEL_DEFS[lvlIdx];

    // ---- Separate Graphics objects for layers ----
    this.roadGfx    = this.add.graphics().setDepth(0);
    this.sceneryGfx = this.add.graphics().setDepth(1);
    this.gateGfx    = this.add.graphics().setDepth(2);
    this.enemyGfx   = this.add.graphics().setDepth(4);
    this.bulletGfx  = this.add.graphics().setDepth(6);
    this.soldierGfx = this.add.graphics().setDepth(5);
    this.effectGfx  = this.add.graphics().setDepth(8);
    this.uiGfx      = this.add.graphics().setDepth(20);

    // ---- Gate text container (text over gate graphics) ----
    this.gateTextContainer = this.add.container(0, 0).setDepth(3);

    // ---- Effect text container (floating numbers etc) ----
    this.effectTextContainer = this.add.container(0, 0).setDepth(25);

    // ---- Build level content ----
    this.buildLevelContent();

    // ---- Scenery pool ----
    this.buildScenery();

    // ---- Touch input ----
    this.input.on('pointerdown', (ptr) => {
      const active = ['running', 'boss', 'bossIntro', 'levelTransition'];
      if (!active.includes(this.phase)) return;
      this.isDragging = true;
      this.dragStartX = ptr.x;
      if (window.audioManager) window.audioManager._init();
    });
    this.input.on('pointermove', (ptr) => {
      if (!this.isDragging) return;
      const active = ['running', 'boss', 'bossIntro', 'levelTransition'];
      if (!active.includes(this.phase)) return;
      const dx = ptr.x - this.dragStartX;
      this.dragStartX = ptr.x;
      const roadHalfW = this.getRoadWidthAtY(ARMY_Y) / 2;
      this.armyTargetX = Phaser.Math.Clamp(
        this.armyTargetX + dx,
        VP_X - roadHalfW + 28,
        VP_X + roadHalfW - 28
      );
    });
    this.input.on('pointerup', () => { this.isDragging = false; });

    // ---- Level title card ----
    this.showLevelTitle();

    // ---- Progress bar (right edge) ----
    this.progressBg = this.add.rectangle(GW - 14, GH / 2, 8, GH * 0.55, 0x333355).setDepth(20);
    this.progressFill = this.add.rectangle(GW - 14, GH * 0.775, 6, 0, 0x2ecc71).setDepth(21);

    // Notify UIScene
    this.notifyUI();
  }

  // ── buildLevelContent ─────────────────────────────────────────────────────
  buildLevelContent(startWorldY) {
    const segs = this.levelDef.segments;
    let worldY = startWorldY || 0;

    for (const seg of segs) {
      if (seg.type === 'intro') {
        worldY += seg.length;

      } else if (seg.type === 'gates') {
        for (let i = 0; i < seg.count; i++) {
          const gWorldY = worldY + 120 + i * 200;
          const isLeftGood = Math.random() > seg.badChance;
          const leftMod  = isLeftGood
            ? GOOD_MODS[Math.floor(Math.random() * GOOD_MODS.length)]
            : BAD_MODS [Math.floor(Math.random() * BAD_MODS.length)];
          const rightMod = !isLeftGood
            ? GOOD_MODS[Math.floor(Math.random() * GOOD_MODS.length)]
            : BAD_MODS [Math.floor(Math.random() * BAD_MODS.length)];

          this.gateObjects.push({
            worldY:   gWorldY,
            left:     { mod: leftMod,  good: isLeftGood  },
            right:    { mod: rightMod, good: !isLeftGood },
            passed:   false,
            isUpgrade: false,
            texts:    [],   // Phaser text objects stored here
          });
        }
        worldY += seg.count * 200 + 100;

      } else if (seg.type === 'enemies') {
        this.enemyWaveTriggers.push({
          worldY: worldY + 100,
          waves: seg.waves,
          triggered: false,
        });
        worldY += 500;

      } else if (seg.type === 'upgrade') {
        this.upgradeGateTrigger = { worldY: worldY + 100, triggered: false };
        // Also add an upgrade gate to gateObjects
        this.gateObjects.push({
          worldY:   worldY + 100,
          left:     { mod: null, good: true },
          right:    { mod: null, good: true },
          passed:   false,
          isUpgrade: true,
          texts:    [],
        });
        worldY += 300;

      } else if (seg.type === 'boss') {
        this.bossTriggerY = worldY;
        worldY += 400;
      }
    }

    this.totalRoadLength = worldY + 200;
  }

  // ── buildScenery ──────────────────────────────────────────────────────────
  buildScenery() {
    const types = this.levelDef.treeTypes || ['pine'];
    this.sceneryObjects = [];
    const count = 18;

    for (let i = 0; i < count; i++) {
      const side   = i % 2 === 0 ? 'left' : 'right';
      const screenY = VP_Y + (i / count) * (GH - VP_Y + 100);
      const size   = 0.45 + Math.random() * 0.4;
      const type   = types[Math.floor(Math.random() * types.length)];
      const xOff   = Phaser.Math.Between(15, 45); // distance from road edge

      this.sceneryObjects.push({ side, screenY, size, type, xOff });
    }
  }

  // ── Helper: road width at a given screenY ──────────────────────────────────
  getRoadWidthAtY(screenY) {
    const t = Phaser.Math.Clamp((screenY - VP_Y) / (ARMY_Y - VP_Y), 0, 1);
    return ROAD_TOP_W + (ROAD_BOT_W - ROAD_TOP_W) * t;
  }

  // ── Helper: world Y to screen Y ───────────────────────────────────────────
  // worldY = distance from level start (positive, increasing ahead)
  // elements at worldY < scrollY are behind us; worldY > scrollY are ahead
  worldToScreenY(worldY) {
    return ARMY_Y - (worldY - this.scrollY);
  }

  // ── showLevelTitle ────────────────────────────────────────────────────────
  showLevelTitle() {
    const card = this.add.text(GW / 2, GH * 0.42, `LEVEL ${this.currentLevel}\n${this.levelDef.name.toUpperCase()}`, {
      fontSize: '30px',
      fontStyle: 'bold',
      fill: '#ffd700',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.tweens.add({
      targets: card,
      alpha: 1,
      y: GH * 0.38,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: card,
          alpha: 0,
          delay: 1600,
          duration: 500,
          onComplete: () => card.destroy(),
        });
      },
    });
  }

  // ── update ────────────────────────────────────────────────────────────────
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05); // cap at 50ms

    // Timers & effects always running
    this.updateParticles(dt);
    this.updateCoinParticles(dt);
    this.updateMuzzleFlashes(dt);
    this.updateComboTimer(dt);
    if (this.screenFlash > 0) this.screenFlash = Math.max(0, this.screenFlash - dt * 3);
    this.soldierCountBounce = Math.max(0, this.soldierCountBounce - dt * 5);

    if (this.phase === 'running' || this.phase === 'levelTransition') {
      this.updateRunning(dt);
    } else if (this.phase === 'enemyWave') {
      // Legacy: never actually reached now (absorbed into 'running')
      this.updateRunning(dt);
    } else if (this.phase === 'bossIntro') {
      this.updateBossIntro(dt);
    } else if (this.phase === 'boss') {
      this.updateBoss(dt);
    }
    // upgradeSelect phase does nothing until card tapped

    this.drawAll();
  }

  // ── updateRunning ─────────────────────────────────────────────────────────
  updateRunning(dt) {
    // Scroll — road always moves forward
    this.scrollY += this.scrollSpeed * dt;

    // Army movement (smooth follow)
    this.armyX = Phaser.Math.Linear(this.armyX, this.armyTargetX, 0.16);

    // Leg animation
    this.legTimer += dt;
    if (this.legTimer >= 0.3) { this.legTimer = 0; this.legPhase = 1 - this.legPhase; }

    // Scenery scroll (0.7× road speed)
    const sceneScrollDt = this.scrollSpeed * 0.7 * dt;
    for (const obj of this.sceneryObjects) {
      obj.screenY += sceneScrollDt;
      if (obj.screenY > GH + 120) {
        obj.screenY = VP_Y - Phaser.Math.Between(0, 60);
        obj.size = 0.45 + Math.random() * 0.4;
        obj.xOff = Phaser.Math.Between(15, 45);
      }
    }

    // Check gate collisions
    for (const gate of this.gateObjects) {
      if (gate.passed) continue;
      const sy = this.worldToScreenY(gate.worldY);
      if (sy > ARMY_Y + 10 && sy < ARMY_Y + 60) {
        gate.passed = true;
        this.handleGateCollision(gate, sy);
      }
      // Clean up texts that are far off screen
      if (sy > GH + 200) {
        this.destroyGateTexts(gate);
      }
    }

    // Check enemy wave triggers
    for (const trigger of this.enemyWaveTriggers) {
      if (!trigger.triggered && this.scrollY >= trigger.worldY) {
        trigger.triggered = true;
        this.spawnEnemyWave(trigger.waves);
      }
    }

    // Check boss trigger
    if (!this.bossTriggerDone && this.scrollY >= this.bossTriggerY) {
      this.bossTriggerDone = true;
      this.startBossIntro();
    }

    // Inline enemy combat — road keeps moving while fighting
    if (this.activeEnemies.length > 0 || this.bullets.length > 0) {
      this.updateInlineEnemies(dt);
    }

    // Progress bar
    const startY = this.levelStartScrollY || 0;
    const prog = Math.min((this.scrollY - startY) / Math.max(1, this.totalRoadLength - startY), 1);
    const barMaxH = GH * 0.55;
    const barH = prog * barMaxH;
    this.progressFill.height = barH;
    this.progressFill.y = GH * 0.225 + GH * 0.55 - barH / 2;

    // Medic upgrade
    if (this.upgrades.medic) {
      this.medicTimer += dt;
      if (this.medicTimer >= 3) {
        this.medicTimer = 0;
        this.addSoldiers(2, false);
      }
    }

    // Grenade upgrade
    if (this.upgrades.grenade && this.activeEnemies.length > 0) {
      this.grenadeTimer += dt;
      if (this.grenadeTimer >= 5) {
        this.grenadeTimer = 0;
        this.throwGrenade();
      }
    }
  }

  // ── updateInlineEnemies ───────────────────────────────────────────────────
  // Handles enemy logic while the road keeps scrolling (never-stop design)
  updateInlineEnemies(dt) {
    // Leg animation for enemies
    this.activeEnemies.forEach(e => {
      if (!e.dead) {
        e.legTimer = (e.legTimer || 0) + dt;
        if (e.legTimer >= 0.3) { e.legTimer = 0; e.legPhase = 1 - e.legPhase; }
      }
    });

    // Move enemies downward
    for (const enemy of this.activeEnemies) {
      if (enemy.dead) {
        enemy.deathAnim += dt * 2;
        continue;
      }
      enemy.y += enemy.walkSpeed * dt;
      if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 8);

      // Reached army — damage soldiers
      if (enemy.y >= ARMY_Y - 55 && this.damageCooldown <= 0) {
        this.damageCooldown = 0.8;
        enemy.dead = true;
        enemy.deathAnim = 0;
        this.loseSoldiers(1);
        this.cameras.main.shake(200, 0.01);
        this.screenFlash = 0.6;
        this.screenFlashColor = 0xff0000;
      }
    }

    if (this.damageCooldown > 0) this.damageCooldown -= dt;

    // Auto-shoot at enemies
    this.updateShooting(dt);

    // Remove fully dead enemies
    this.activeEnemies = this.activeEnemies.filter(e => !(e.dead && e.deathAnim > 1));

    // Grenade upgrade (handled in updateRunning, skip here)

    // Army dead?
    if (this.soldierCount <= 0) this.endGame(false);
  }

  // ── handleGateCollision ───────────────────────────────────────────────────
  handleGateCollision(gate, sy) {
    if (gate.isUpgrade) {
      // Upgrade gate
      this.destroyGateTexts(gate);
      this.phase = 'upgradeSelect';
      this.scrollSpeed = 0;
      this.time.delayedCall(200, () => this.showUpgradePopup());
      if (window.audioManager) window.audioManager.upgrade();
      return;
    }

    const roadMid = VP_X;
    const hitLeft = this.armyX < roadMid;
    const side    = hitLeft ? gate.left : gate.right;
    const good    = side.good;

    this.applyGateMod(side.mod, good, gate, hitLeft);
    this.destroyGateTexts(gate);
    if (window.audioManager) {
      if (good) window.audioManager.gatGood();
      else      window.audioManager.gateBad();
    }
  }

  // ── applyGateMod ──────────────────────────────────────────────────────────
  applyGateMod(mod, good, gate, hitLeft) {
    const before = this.soldierCount;
    this.soldierCount = Math.max(1, Math.floor(mod.apply(this.soldierCount)));

    const diff = this.soldierCount - before;
    this.soldierCountBounce = 1;

    if (good) {
      this.spawnGainParticles(this.armyX, ARMY_Y);
      this.screenFlash = 0; // no red flash on good
    } else {
      this.screenFlash = 0.5;
      this.screenFlashColor = 0xff2222;
    }

    // Floating label
    const popColor = good ? '#2ecc71' : '#e74c3c';
    const pop = this.add.text(this.armyX, ARMY_Y - 50, mod.label, {
      fontSize: '28px', fontStyle: 'bold',
      fill: popColor, stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: pop, y: pop.y - 80, alpha: 0, duration: 900,
      ease: 'Power2', onComplete: () => pop.destroy(),
    });

    this.notifyUI(good ? 'good' : 'bad');
  }

  // ── destroyGateTexts ──────────────────────────────────────────────────────
  destroyGateTexts(gate) {
    if (gate.texts) {
      gate.texts.forEach(t => { if (t && t.active) t.destroy(); });
      gate.texts = [];
    }
    if (gate._textMap) {
      Object.values(gate._textMap).forEach(t => { if (t && t.active) t.destroy(); });
      gate._textMap = {};
    }
  }

  // ── spawnEnemyWave ────────────────────────────────────────────────────────
  spawnEnemyWave(waveDefs) {
    // Road keeps scrolling — enemies spawn inline while army runs
    // Build enemy list from all wave definitions, scaling HP by difficulty
    let allEnemies = [];
    for (const waveDef of waveDefs) {
      for (let i = 0; i < waveDef.count; i++) {
        const scaledHp = Math.ceil(waveDef.hp * this.difficultyMult);
        allEnemies.push({ hp: scaledHp, maxHp: scaledHp, type: waveDef.type });
      }
    }

    // Arrange enemies in rows at top of road area
    const cols = Math.min(allEnemies.length, 4);
    const rows = Math.ceil(allEnemies.length / cols);

    allEnemies.forEach((e, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const spread = Math.min(cols - 1, 3) * 38;
      const ex = cols === 1 ? VP_X : VP_X - spread / 2 + col * (spread / (cols - 1));
      const ey = VP_Y + 40 + row * 50;
      const eScale = 0.7 + (e.type === 'heavy' ? 0.25 : 0);

      this.activeEnemies.push({
        id: Math.random(),
        hp: e.hp, maxHp: e.maxHp,
        type: e.type,
        x: ex, y: ey,
        walkSpeed: e.type === 'heavy' ? 35 : 55,
        scale: eScale,
        legPhase: Math.round(Math.random()),
        legTimer: Math.random() * 0.3,
        hitFlash: 0,
        dead: false,
        deathAnim: 0,
      });
    });
  }

  // ── updateEnemyWave ─── (dead code — never called after refactor) ──────────
  // Enemy logic is now handled by updateInlineEnemies() called from
  // updateRunning(), so the road never stops scrolling. This method remains
  // as a no-op fallback for any external callers.
  updateEnemyWave(dt) {
    this.updateInlineEnemies(dt);
  }

  // ── updateShooting ────────────────────────────────────────────────────────
  updateShooting(dt) {
    const fireRate = this.upgrades.betterGuns ? 2 : 1;
    const interval = 0.8 / fireRate;
    this.fireTimer += dt;

    if (this.fireTimer >= interval) {
      this.fireTimer = 0;
      // Pick a live target
      const targets = this.phase === 'boss'
        ? [{ x: this.bossX, y: this.bossY + 30, isBoss: true }]
        : this.activeEnemies.filter(e => !e.dead);

      if (targets.length === 0) return;

      // Shoot from a few random soldier positions
      const shotsPerTick = Math.min(3, Math.ceil(this.soldierCount / 8));
      for (let s = 0; s < shotsPerTick; s++) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        const originX = this.armyX + Phaser.Math.Between(-30, 30);
        const originY = ARMY_Y - 10 + Phaser.Math.Between(-15, 0);
        const dx = target.x - originX;
        const dy = target.y - originY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const spd = 460;

        this.bullets.push({
          x: originX, y: originY,
          vx: (dx / len) * spd,
          vy: (dy / len) * spd,
          damage: this.upgrades.betterGuns ? 2 : 1,
          isBoss: !!target.isBoss,
          targetEnemy: target.isBoss ? null : target,
          dead: false,
        });

        // Muzzle flash at gun tip
        this.muzzleFlashes.push({
          x: originX + 12,
          y: originY - 4,
          life: 0.08,
          maxLife: 0.08,
        });
      }
      if (window.audioManager) window.audioManager.shoot();
    }

    // Move bullets
    for (const b of this.bullets) {
      if (b.dead) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Off screen
      if (b.x < 0 || b.x > GW || b.y < -20 || b.y > GH + 20) { b.dead = true; continue; }

      if (b.isBoss) {
        // Hit boss
        const dx = b.x - this.bossX;
        const dy = b.y - (this.bossY + 30);
        if (dx * dx + dy * dy < (40 * 1.5) * (40 * 1.5)) {
          b.dead = true;
          this.damageBoss(b.damage);
        }
      } else {
        // Hit enemy
        for (const enemy of this.activeEnemies) {
          if (enemy.dead) continue;
          const dx = b.x - enemy.x;
          const dy = b.y - enemy.y;
          const r  = 14 * enemy.scale;
          if (dx * dx + dy * dy < r * r) {
            b.dead = true;
            this.damageEnemy(enemy, b.damage);
            break;
          }
        }
      }
    }

    this.bullets = this.bullets.filter(b => !b.dead);
  }

  // ── damageEnemy ───────────────────────────────────────────────────────────
  damageEnemy(enemy, dmg) {
    enemy.hp -= dmg;
    enemy.hitFlash = 1;

    // Floating damage number
    const dmgTxt = this.add.text(
      enemy.x + Phaser.Math.Between(-12, 12),
      enemy.y - 20 * enemy.scale,
      `-${dmg}`,
      { fontSize: '13px', fontStyle: 'bold', fill: '#ff4444', stroke: '#000000', strokeThickness: 2 }
    ).setOrigin(0.5).setDepth(9);
    this.tweens.add({
      targets: dmgTxt,
      y: dmgTxt.y - 36,
      alpha: 0,
      duration: 650,
      ease: 'Power2',
      onComplete: () => dmgTxt.destroy(),
    });

    if (window.audioManager) window.audioManager.enemyHit();

    if (enemy.hp <= 0) {
      enemy.dead = true;
      enemy.deathAnim = 0;
      this.score += 10;
      this.spawnDeathParticles(enemy.x, enemy.y);
      this.spawnCoin(enemy.x, enemy.y - 15 * enemy.scale);
      if (window.audioManager) window.audioManager.enemyDeath();

      // Combo tracking
      this.comboCount++;
      this.comboTimer = 2;
      if (this.comboCount >= 3) {
        this.showComboText(this.comboCount);
        if (window.audioManager) window.audioManager.combo();
      }
    }
  }

  // ── throwGrenade ──────────────────────────────────────────────────────────
  throwGrenade() {
    const alive = this.activeEnemies.filter(e => !e.dead);
    if (alive.length === 0) return;

    // Pick center of mass of enemies
    let cx = 0, cy = 0;
    alive.forEach(e => { cx += e.x; cy += e.y; });
    cx /= alive.length; cy /= alive.length;

    // Damage all in radius
    const radius = 70;
    for (const enemy of alive) {
      const dx = enemy.x - cx, dy = enemy.y - cy;
      if (dx * dx + dy * dy < radius * radius) {
        this.damageEnemy(enemy, 5);
      }
    }

    // Explosion particles
    this.spawnExplosion(cx, cy);
  }

  // ── spawnExplosion ────────────────────────────────────────────────────────
  spawnExplosion(x, y) {
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const speed = Phaser.Math.Between(50, 160);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7, maxLife: 0.7,
        color: i % 2 === 0 ? 0xff6600 : 0xffcc00,
        size: Phaser.Math.Between(4, 10),
        dead: false,
      });
    }
  }

  // ── spawnDeathParticles ────────────────────────────────────────────────────
  spawnDeathParticles(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(30, 90);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5, maxLife: 0.5,
        color: 0xcc2222,
        size: Phaser.Math.Between(3, 7),
        dead: false,
      });
    }
  }

  // ── spawnGainParticles ────────────────────────────────────────────────────
  spawnGainParticles(x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = Phaser.Math.Between(40, 110);
      this.particles.push({
        x: x + Phaser.Math.Between(-20, 20),
        y: y - 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7, maxLife: 0.7,
        color: 0x2ecc71,
        size: Phaser.Math.Between(3, 8),
        dead: false,
      });
    }
  }

  // ── updateParticles ───────────────────────────────────────────────────────
  updateParticles(dt) {
    for (const p of this.particles) {
      if (p.dead) continue;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += 80 * dt; // slight gravity
      p.life -= dt;
      if (p.life <= 0) p.dead = true;
    }
    this.particles = this.particles.filter(p => !p.dead);
  }

  // ── spawnCoin ─────────────────────────────────────────────────────────────
  spawnCoin(x, y) {
    this.coinParticles.push({
      x, y,
      targetX: this.armyX + Phaser.Math.Between(-25, 25),
      targetY: ARMY_Y - 20,
      life: 0.55, maxLife: 0.55,
      dead: false,
    });
  }

  // ── updateCoinParticles ───────────────────────────────────────────────────
  updateCoinParticles(dt) {
    for (const coin of this.coinParticles) {
      if (coin.dead) continue;
      coin.life -= dt;
      const t = Phaser.Math.Clamp(1 - coin.life / coin.maxLife, 0, 1);
      coin.x = Phaser.Math.Linear(coin.x, coin.targetX, t * 0.12);
      coin.y = Phaser.Math.Linear(coin.y, coin.targetY, t * 0.12);
      if (coin.life <= 0) coin.dead = true;
    }
    this.coinParticles = this.coinParticles.filter(c => !c.dead);
  }

  // ── updateMuzzleFlashes ───────────────────────────────────────────────────
  updateMuzzleFlashes(dt) {
    for (const f of this.muzzleFlashes) {
      f.life -= dt;
    }
    this.muzzleFlashes = this.muzzleFlashes.filter(f => f.life > 0);
  }

  // ── updateComboTimer ──────────────────────────────────────────────────────
  updateComboTimer(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
  }

  // ── showComboText ─────────────────────────────────────────────────────────
  showComboText(count) {
    const txt = this.add.text(VP_X, GH * 0.5, `COMBO ×${count}!`, {
      fontSize: '28px', fontStyle: 'bold',
      fill: '#ffcc00', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({
      targets: txt,
      y: GH * 0.38, alpha: 0, scaleX: 1.3, scaleY: 1.3,
      duration: 1000, ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  // ── showUpgradePopup ──────────────────────────────────────────────────────
  showUpgradePopup() {
    const W = GW, H = GH;

    // Darken overlay
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(60);

    const container = this.add.container(0, 0).setDepth(61);

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a3a, 1);
    panel.fillRoundedRect(W * 0.05, H * 0.25, W * 0.9, H * 0.5, 20);
    panel.lineStyle(3, 0x4444aa, 1);
    panel.strokeRoundedRect(W * 0.05, H * 0.25, W * 0.9, H * 0.5, 20);
    container.add(panel);

    const titleTxt = this.add.text(W / 2, H * 0.29, '⚡ CHOOSE UPGRADE', {
      fontSize: '20px', fontStyle: 'bold', fill: '#ffd700', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    container.add(titleTxt);

    // Pick 3 random upgrades (no duplicates)
    const pool = UPGRADE_POOL.slice();
    Phaser.Utils.Array.Shuffle(pool);
    const picks = pool.slice(0, 3);

    const cardW = W * 0.25;
    const cardH = H * 0.28;
    const startX = W * 0.5 - cardW * 1.1;

    picks.forEach((upg, i) => {
      const cx = startX + i * (cardW + W * 0.04);
      const cy = H * 0.51;

      const cardGfx = this.add.graphics();
      const owned = this.upgrades[upg.id];
      const fillColor = owned ? 0x1a3a1a : 0x222244;
      cardGfx.fillStyle(fillColor, 1);
      cardGfx.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
      cardGfx.lineStyle(2, owned ? 0x2ecc71 : 0x4466cc, 1);
      cardGfx.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
      container.add(cardGfx);

      const iconTxt = this.add.text(cx, cy - cardH * 0.28, upg.icon, { fontSize: '28px' }).setOrigin(0.5);
      const nameTxt = this.add.text(cx, cy, upg.name, {
        fontSize: '13px', fontStyle: 'bold', fill: '#ffffff', wordWrap: { width: cardW - 8 }, align: 'center',
      }).setOrigin(0.5);
      const descTxt = this.add.text(cx, cy + cardH * 0.22, upg.desc, {
        fontSize: '10px', fill: '#aaaacc', wordWrap: { width: cardW - 8 }, align: 'center',
      }).setOrigin(0.5);

      if (owned) {
        const ownedTxt = this.add.text(cx, cy - cardH * 0.44, 'OWNED ✓', {
          fontSize: '9px', fill: '#2ecc71',
        }).setOrigin(0.5);
        container.add(ownedTxt);
      }

      container.add([iconTxt, nameTxt, descTxt]);

      // Hit zone
      const hit = this.add.rectangle(cx, cy, cardW, cardH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => {
        cardGfx.clear();
        cardGfx.fillStyle(0x334466, 1);
        cardGfx.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
        cardGfx.lineStyle(2, 0x66aaff, 1);
        cardGfx.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
      });
      hit.on('pointerout', () => {
        cardGfx.clear();
        cardGfx.fillStyle(owned ? 0x1a3a1a : 0x222244, 1);
        cardGfx.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
        cardGfx.lineStyle(2, owned ? 0x2ecc71 : 0x4466cc, 1);
        cardGfx.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
      });
      hit.on('pointerdown', () => {
        this.applyUpgrade(upg.id);
        overlay.destroy();
        container.destroy();
        hit.destroy();
        // Resume scrolling
        this.scrollSpeed = this.upgrades.speed ? this.baseScrollSpeed * 1.4 : this.baseScrollSpeed;
        this.phase = 'running';
        if (window.audioManager) window.audioManager.upgrade();
      });
      container.add(hit);
    });

    this.upgradePopup = { overlay, container };
  }

  // ── applyUpgrade ──────────────────────────────────────────────────────────
  applyUpgrade(id) {
    this.upgrades[id] = (this.upgrades[id] || 0) + 1;

    switch (id) {
      case 'speed':
        this.baseScrollSpeed = Math.min(this.baseScrollSpeed + 40, 340);
        break;
      case 'medic':
        this.addSoldiers(5, true);
        break;
    }

    // Show floating upgrade text
    const upg = UPGRADE_POOL.find(u => u.id === id);
    if (upg) {
      const txt = this.add.text(VP_X, GH * 0.45, `${upg.icon} ${upg.name}!`, {
        fontSize: '22px', fontStyle: 'bold',
        fill: '#ffd700', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(70);
      this.tweens.add({
        targets: txt, y: GH * 0.36, alpha: 0, duration: 1200,
        ease: 'Power2', onComplete: () => txt.destroy(),
      });
    }

    this.notifyUI('good');
  }

  // ── startBossIntro ────────────────────────────────────────────────────────
  startBossIntro() {
    this.phase = 'bossIntro';
    // Road keeps scrolling during boss intro — no scrollSpeed = 0!
    this.bossIntroTimer = 0;

    const ld = this.levelDef;
    this.bossHp    = Math.ceil(ld.bossHp * this.difficultyMult);
    this.bossMaxHp = this.bossHp;
    this.bossEnraged = false;

    // Boss roar + slow motion flash
    if (window.audioManager) window.audioManager.bossRoar();
    this.time.timeScale = 0.3;
    this.time.delayedCall(300, () => { this.time.timeScale = 1; });

    // Boss HP bar
    this.bossBg  = this.add.rectangle(VP_X, 40, GW * 0.85, 22, 0x330000).setDepth(22);
    this.bossFill = this.add.rectangle(VP_X, 40, GW * 0.85, 18, 0xcc2222).setDepth(23);
    this.bossLabel = this.add.text(VP_X, 40, ld.bossName.toUpperCase(), {
      fontSize: '11px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(24);

    // Intro title slides in from left
    const titleCard = this.add.text(VP_X, GH * 0.5, `⚔️ ${ld.bossName.toUpperCase()}!`, {
      fontSize: '26px', fontStyle: 'bold',
      fill: '#ff4444', stroke: '#000', strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setDepth(60).setX(-GW);

    this.tweens.add({
      targets: titleCard, x: VP_X, duration: 500, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: titleCard, alpha: 0, delay: 1200, duration: 500,
          onComplete: () => { titleCard.destroy(); this.bossIntroTimer = 99; },
        });
      },
    });

    this.cameras.main.shake(400, 0.015);
  }

  // ── updateBossIntro ───────────────────────────────────────────────────────
  updateBossIntro(dt) {
    // Road keeps scrolling during boss intro
    this.scrollY += this.scrollSpeed * dt;
    this.armyX = Phaser.Math.Linear(this.armyX, this.armyTargetX, 0.16);
    this.legTimer += dt;
    if (this.legTimer >= 0.3) { this.legTimer = 0; this.legPhase = 1 - this.legPhase; }
    const sdDt = this.scrollSpeed * 0.7 * dt;
    for (const obj of this.sceneryObjects) {
      obj.screenY += sdDt;
      if (obj.screenY > GH + 120) {
        obj.screenY = VP_Y - Phaser.Math.Between(0, 60);
        obj.size = 0.45 + Math.random() * 0.4;
        obj.xOff = Phaser.Math.Between(15, 45);
      }
    }

    this.bossIntroTimer += dt;
    if (this.bossIntroTimer >= 2.2) {
      this.phase = 'boss';
      this.bossAttackTimer = 2; // first attack after 2s
    }
  }

  // ── updateBoss ────────────────────────────────────────────────────────────
  updateBoss(dt) {
    // Road keeps scrolling during boss fight — army never stops!
    this.scrollY += this.scrollSpeed * dt;
    const sdDt = this.scrollSpeed * 0.7 * dt;
    for (const obj of this.sceneryObjects) {
      obj.screenY += sdDt;
      if (obj.screenY > GH + 120) {
        obj.screenY = VP_Y - Phaser.Math.Between(0, 60);
        obj.size = 0.45 + Math.random() * 0.4;
        obj.xOff = Phaser.Math.Between(15, 45);
      }
    }

    // Leg/walk timer
    this.legTimer += dt;
    if (this.legTimer >= 0.4) { this.legTimer = 0; this.legPhase = 1 - this.legPhase; }

    // Army can still move
    this.armyX = Phaser.Math.Linear(this.armyX, this.armyTargetX, 0.16);

    // Auto-shoot at boss
    this.updateShooting(dt);

    // Boss attacks
    this.bossAttackTimer -= dt;
    if (this.bossAttackTimer <= 0) {
      this.bossAttackTimer = this.bossEnraged ? 0.9 : 2.0;
      this.bossShoot();
    }

    // Move boss projectiles
    for (const p of this.bossProjectiles) {
      if (p.dead) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.y > GH + 20 || p.x < -20 || p.x > GW + 20) { p.dead = true; continue; }

      // Hit army
      const dx = p.x - this.armyX;
      const dy = p.y - ARMY_Y;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        p.dead = true;
        const dmg = this.bossEnraged ? 3 : 2;
        this.loseSoldiers(dmg); // armor reduction handled inside loseSoldiers
        this.cameras.main.shake(250, 0.012);
        this.screenFlash = 0.7;
        this.screenFlashColor = 0xff0000;
        if (window.audioManager) window.audioManager.bossAttack();
      }
    }
    this.bossProjectiles = this.bossProjectiles.filter(p => !p.dead);

    // Update boss HP bar
    if (this.bossFill) {
      const ratio = this.bossHp / this.bossMaxHp;
      const maxW = GW * 0.85;
      this.bossFill.width = maxW * ratio;
      this.bossFill.x = VP_X - (maxW - this.bossFill.width) / 2;
      this.bossFill.fillColor = this.bossEnraged ? 0xff4400 : 0xcc2222;
    }

    // Enrage at 50%
    if (!this.bossEnraged && this.bossHp <= this.bossMaxHp * 0.5) {
      this.bossEnraged = true;
      this.cameras.main.shake(400, 0.02);
      const enrageText = this.add.text(VP_X, GH * 0.44, '😡 ENRAGED!', {
        fontSize: '26px', fontStyle: 'bold', fill: '#ff2200', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(60);
      this.tweens.add({
        targets: enrageText, alpha: 0, y: GH * 0.35, duration: 1200,
        onComplete: () => enrageText.destroy(),
      });
    }

    // Army dead?
    if (this.soldierCount <= 0) this.endGame(false);
  }

  // ── bossShoot ─────────────────────────────────────────────────────────────
  bossShoot() {
    const count = this.bossEnraged ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / 2) + (i - (count - 1) / 2) * 0.3;
      const speed = 180 + Math.random() * 60;
      this.bossProjectiles.push({
        x: this.bossX + Phaser.Math.Between(-20, 20),
        y: this.bossY + 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        dead: false,
      });
    }
    if (window.audioManager) window.audioManager.bossAttack();
  }

  // ── damageBoss ────────────────────────────────────────────────────────────
  damageBoss(dmg) {
    this.bossHp = Math.max(0, this.bossHp - dmg);
    if (window.audioManager) window.audioManager.bossHit();

    if (this.bossHp <= 0) {
      this.bossDead();
    }
  }

  // ── destroyBossUI ─────────────────────────────────────────────────────────
  destroyBossUI() {
    if (this.bossBg)    { this.bossBg.destroy();    this.bossBg    = null; }
    if (this.bossFill)  { this.bossFill.destroy();  this.bossFill  = null; }
    if (this.bossLabel) { this.bossLabel.destroy();  this.bossLabel = null; }
  }

  // ── bossDead ──────────────────────────────────────────────────────────────
  bossDead() {
    this.phase = 'result';
    this.cameras.main.shake(600, 0.025);
    this.destroyBossUI();
    this.bossProjectiles = [];

    // Big explosion ring burst
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 120, () => {
        this.spawnExplosion(
          this.bossX + Phaser.Math.Between(-40, 40),
          this.bossY + Phaser.Math.Between(0, 60)
        );
      });
    }

    if (window.audioManager) window.audioManager.win();

    this.time.delayedCall(1500, () => {
      const nextLevel = this.currentLevel + 1;
      if (nextLevel > LEVEL_DEFS.length) {
        if (!this.hasSeenAllLevels) {
          // First time clearing all 5 levels — show win screen
          this.hasSeenAllLevels = true;
          this.scene.stop('UIScene');
          this.scene.start('WinScene', { level: this.currentLevel, allDone: true });
        } else {
          // Endless loop — increase difficulty and loop back
          this.transitionToNextLevel(1, this.difficultyMult + 0.4);
        }
      } else {
        // Inline transition to next level — no scene switch
        this.transitionToNextLevel(nextLevel, this.difficultyMult);
      }
    });
  }

  // ── transitionToNextLevel ─────────────────────────────────────────────────
  // Seamlessly continues to the next level without stopping the road.
  transitionToNextLevel(nextLevel, newDiffMult) {
    this.phase = 'levelTransition';
    this.currentLevel = nextLevel;
    this.difficultyMult = newDiffMult || 1;

    const lvlIdx = Math.min(this.currentLevel - 1, LEVEL_DEFS.length - 1);
    this.levelDef = LEVEL_DEFS[lvlIdx];

    // Clear old level state
    this.gateObjects       = [];
    this.enemyWaveTriggers = [];
    this.upgradeGateTrigger = null;
    this.bossTriggerDone   = false;
    this.activeEnemies     = [];
    this.bullets           = [];

    // Destroy old gate texts
    if (this.gateTextContainer) {
      this.gateTextContainer.removeAll(true);
    }

    // Remember where this new level starts (for progress bar)
    // 600px ahead ensures gates/enemies spawn far enough that the
    // title card transition completes before any interaction is required.
    this.levelStartScrollY = this.scrollY + 600;

    // Rebuild level content starting ahead of current position
    this.buildLevelContent(this.levelStartScrollY);

    // Refresh parallax scenery for new biome
    this.buildScenery();

    // Show "Level X — Theme" title card sliding in while road scrolls
    this.showLevelTitle();

    // Notify UI of new level
    this.time.delayedCall(100, () => this.notifyUI());

    // After brief card display, resume normal running
    this.time.delayedCall(2200, () => {
      if (this.phase === 'levelTransition') {
        this.phase = 'running';
      }
    });
  }

  // ── addSoldiers / loseSoldiers ─────────────────────────────────────────────
  addSoldiers(count, notify) {
    this.soldierCount = Math.min(999, this.soldierCount + count);
    this.soldierCountBounce = 1;
    if (notify !== false) this.notifyUI('good');
  }

  loseSoldiers(count) {
    const armored = this.upgrades.armor ? Math.ceil(count / 2) : count;
    this.soldierCount = Math.max(0, this.soldierCount - armored);
    this.soldierCountBounce = 1;
    this.notifyUI('bad');
    if (this.soldierCount <= 0) this.endGame(false);
  }

  // ── endGame ───────────────────────────────────────────────────────────────
  endGame(won) {
    if (this.phase === 'result' || this.phase === 'levelTransition') return;
    this.phase = 'result';
    this.destroyBossUI();
    if (!won && window.audioManager) window.audioManager.lose();
    this.time.delayedCall(700, () => {
      this.scene.stop('UIScene');
      if (won) {
        const nextLevel = this.currentLevel + 1;
        if (nextLevel > LEVEL_DEFS.length) {
          this.scene.start('WinScene', { level: this.currentLevel, allDone: true });
        } else {
          this.scene.start('WinScene', { level: this.currentLevel, nextLevel });
        }
      } else {
        this.scene.start('LoseScene', { level: this.currentLevel });
      }
    });
  }

  // ── notifyUI ──────────────────────────────────────────────────────────────
  notifyUI(flashType) {
    const ui = this.scene.get('UIScene');
    if (ui && ui.updateHUD) {
      ui.updateHUD(this.soldierCount, this.currentLevel, flashType, this.score);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DRAW FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════

  drawAll() {
    this.drawRoad();
    this.drawScenery();
    this.drawGates();
    this.drawEnemies();
    this.drawBullets();
    this.drawSoldierFormation();
    if (this.phase === 'boss' || this.phase === 'bossIntro') this.drawBossCharacter();
    // Boss projectiles are rendered inside drawBullets()
    this.drawParticles();
    this.drawCoins();
    this.drawMuzzleFlashes();
    this.drawScreenFlash();
  }

  // ── drawRoad ──────────────────────────────────────────────────────────────
  drawRoad() {
    const gfx = this.roadGfx;
    gfx.clear();

    const ld = this.levelDef;

    // Sky
    gfx.fillStyle(ld.skyColor, 1);
    gfx.fillRect(0, 0, GW, VP_Y);

    // Ground/grass
    gfx.fillStyle(ld.grassColor, 1);
    gfx.fillRect(0, VP_Y, GW, GH - VP_Y);

    // Road trapezoid
    gfx.fillStyle(ld.roadColor, 1);
    gfx.fillPoints([
      { x: VP_X - ROAD_TOP_W / 2, y: VP_Y },
      { x: VP_X + ROAD_TOP_W / 2, y: VP_Y },
      { x: VP_X + ROAD_BOT_W / 2, y: GH },
      { x: VP_X - ROAD_BOT_W / 2, y: GH },
    ], true);

    // Road shoulder stripes
    gfx.fillStyle(0x887766, 0.6);
    const shoulderW_top = 10, shoulderW_bot = 18;
    gfx.fillPoints([
      { x: VP_X - ROAD_TOP_W / 2 - shoulderW_top, y: VP_Y },
      { x: VP_X - ROAD_TOP_W / 2, y: VP_Y },
      { x: VP_X - ROAD_BOT_W / 2, y: GH },
      { x: VP_X - ROAD_BOT_W / 2 - shoulderW_bot, y: GH },
    ], true);
    gfx.fillPoints([
      { x: VP_X + ROAD_TOP_W / 2, y: VP_Y },
      { x: VP_X + ROAD_TOP_W / 2 + shoulderW_top, y: VP_Y },
      { x: VP_X + ROAD_BOT_W / 2 + shoulderW_bot, y: GH },
      { x: VP_X + ROAD_BOT_W / 2, y: GH },
    ], true);

    // Center line dashes (scrolling)
    const dashSpacing = 55;
    const dashOffset  = this.scrollY % dashSpacing;
    gfx.fillStyle(0xffffff, 0.3);
    for (let y = VP_Y + (dashOffset % dashSpacing); y < GH; y += dashSpacing) {
      const t = Phaser.Math.Clamp((y - VP_Y) / (GH - VP_Y), 0, 1);
      const dw = 3 + t * 4;
      const dh = 10 + t * 18;
      gfx.fillRect(VP_X - dw / 2, y, dw, dh);
    }

    // Horizon line
    gfx.lineStyle(2, 0xffffff, 0.12);
    gfx.strokeLineShape(new Phaser.Geom.Line(0, VP_Y, GW, VP_Y));
  }

  // ── drawScenery ───────────────────────────────────────────────────────────
  drawScenery() {
    const gfx = this.sceneryGfx;
    gfx.clear();

    for (const obj of this.sceneryObjects) {
      if (obj.screenY < VP_Y - 10 || obj.screenY > GH + 80) continue;
      const t = Phaser.Math.Clamp((obj.screenY - VP_Y) / (GH - VP_Y), 0, 1);
      const roadHalfW = (ROAD_TOP_W + (ROAD_BOT_W - ROAD_TOP_W) * t) / 2;
      const roadEdgeX = obj.side === 'left'
        ? VP_X - roadHalfW - obj.xOff * t * 1.5 - 5
        : VP_X + roadHalfW + obj.xOff * t * 1.5 + 5;
      const scaledSize = obj.size * (0.3 + t * 0.7);

      drawTree(gfx, roadEdgeX, obj.screenY, scaledSize, obj.type);
    }
  }

  // ── drawGates ─────────────────────────────────────────────────────────────
  drawGates() {
    const gfx = this.gateGfx;
    gfx.clear();

    for (const gate of this.gateObjects) {
      if (gate.passed) continue;
      const sy = this.worldToScreenY(gate.worldY);
      if (sy < VP_Y - 20 || sy > GH + 60) continue;

      const t = Phaser.Math.Clamp((sy - VP_Y) / (ARMY_Y - VP_Y), 0, 1);
      const roadW = ROAD_TOP_W + (ROAD_BOT_W - ROAD_TOP_W) * t;
      const roadLeft = VP_X - roadW / 2;
      const gateW = roadW / 2 - 6;
      const leftCX = roadLeft + gateW / 2 + 2;
      const rightCX = VP_X + gateW / 2 + 4;
      const gateH = 18 + t * 36;
      const pillarW = 5 + t * 8;
      const pillarH = 30 + t * 50;

      if (gate.isUpgrade) {
        // Golden upgrade gate (full width arch)
        this.drawGateArch(gfx, VP_X, sy, roadW - 8, gateH, pillarW, pillarH, 0xffd700, 0xffaa00, t);
        const midY = sy - gateH / 2 - pillarH / 2;
        this.updateOrCreateGateText(gate, 'upgrade', '⭐ UPGRADE ⭐', VP_X, midY,
          '#ffd700', '14px', t);
      } else {
        const leftGood  = gate.left.good;
        const rightGood = gate.right.good;
        const lColor = leftGood  ? 0x27ae60 : 0xe74c3c;
        const rColor = rightGood ? 0x27ae60 : 0xe74c3c;
        const lStroke = leftGood  ? 0x2ecc71 : 0xff6b6b;
        const rStroke = rightGood ? 0x2ecc71 : 0xff6b6b;

        this.drawGateArch(gfx, leftCX,  sy, gateW, gateH, pillarW, pillarH, lColor, lStroke, t);
        this.drawGateArch(gfx, rightCX, sy, gateW, gateH, pillarW, pillarH, rColor, rStroke, t);

        const textSize = Math.round(10 + t * 12) + 'px';
        const midY = sy - gateH / 2 - pillarH / 2;
        this.updateOrCreateGateText(gate, 'left',  gate.left.mod.label,  leftCX,  midY, leftGood  ? '#2ecc71' : '#ff6b6b', textSize, t);
        this.updateOrCreateGateText(gate, 'right', gate.right.mod.label, rightCX, midY, rightGood ? '#2ecc71' : '#ff6b6b', textSize, t);
      }
    }
  }

  drawGateArch(gfx, cx, sy, w, h, pillarW, pillarH, fillColor, strokeColor, t) {
    const alpha = Phaser.Math.Clamp(t * 2, 0, 0.85);
    // Cross beam
    gfx.fillStyle(fillColor, alpha);
    gfx.fillRect(cx - w / 2, sy - h, w, h);
    gfx.lineStyle(2, strokeColor, alpha);
    gfx.strokeRect(cx - w / 2, sy - h, w, h);

    // Left pillar
    gfx.fillStyle(strokeColor, alpha);
    gfx.fillRect(cx - w / 2, sy - h - pillarH, pillarW, pillarH);
    // Right pillar
    gfx.fillRect(cx + w / 2 - pillarW, sy - h - pillarH, pillarW, pillarH);
  }

  updateOrCreateGateText(gate, key, label, x, y, color, fontSize, t) {
    if (!gate._textMap) gate._textMap = {};
    let txt = gate._textMap[key];
    if (!txt || !txt.active) {
      txt = this.add.text(x, y, label, {
        fontSize, fontStyle: 'bold', fill: color, stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(3);
      this.gateTextContainer.add(txt);
      gate._textMap[key] = txt;
      if (!gate.texts) gate.texts = [];
      gate.texts.push(txt);
    } else {
      txt.x = x;
      txt.y = y;
      txt.setAlpha(Phaser.Math.Clamp(t * 2, 0, 1));
      txt.setStyle({ fontSize });
    }
  }

  // ── drawEnemies ───────────────────────────────────────────────────────────
  drawEnemies() {
    const gfx = this.enemyGfx;
    gfx.clear();

    for (const enemy of this.activeEnemies) {
      if (enemy.hitFlash > 0 && Math.floor(enemy.hitFlash * 8) % 2 === 0) {
        // Flash white
        gfx.fillStyle(0xffffff, 0.7);
        gfx.fillCircle(enemy.x, enemy.y - 10 * enemy.scale, 16 * enemy.scale);
      }

      const alpha = enemy.dead ? Math.max(0, 1 - enemy.deathAnim) : 1;
      const scaleMod = enemy.dead ? (1 - enemy.deathAnim * 0.5) : 1;

      gfx.setAlpha(alpha);
      drawEnemy(gfx, enemy.x, enemy.y, enemy.scale * scaleMod, enemy.legPhase, enemy.type);

      // HP bar
      if (!enemy.dead && enemy.hp < enemy.maxHp) {
        const barW = 28 * enemy.scale;
        const barH = 4 * enemy.scale;
        const barX = enemy.x - barW / 2;
        const barY = enemy.y - 38 * enemy.scale;
        gfx.fillStyle(0x550000, 1);
        gfx.fillRect(barX, barY, barW, barH);
        gfx.fillStyle(0x22cc22, 1);
        gfx.fillRect(barX, barY, barW * (enemy.hp / enemy.maxHp), barH);
      }

      gfx.setAlpha(1);
    }
  }

  // ── drawBullets ───────────────────────────────────────────────────────────
  drawBullets() {
    const gfx = this.bulletGfx;
    gfx.clear();

    for (const b of this.bullets) {
      if (b.dead) continue;
      gfx.fillStyle(0xffee44, 1);
      gfx.fillRect(b.x - 3, b.y - 5, 5, 10);
      // Trail
      gfx.fillStyle(0xff8800, 0.5);
      gfx.fillRect(b.x - 2, b.y, 3, 8);
    }

    // Boss projectiles
    for (const p of this.bossProjectiles) {
      if (p.dead) continue;
      gfx.fillStyle(0xff2200, 1);
      gfx.fillCircle(p.x, p.y, 7);
      gfx.fillStyle(0xff6600, 0.5);
      gfx.fillCircle(p.x, p.y, 10);
    }
  }

  // ── drawSoldierFormation ──────────────────────────────────────────────────
  drawSoldierFormation() {
    const gfx = this.soldierGfx;
    gfx.clear();

    const count = this.soldierCount;
    if (count <= 0) return;

    const visCount = Math.min(count, MAX_VISUAL_SOLDIERS);
    const cols = Math.ceil(Math.sqrt(visCount * 1.4));
    const spacing = 18;

    // Bounce effect on count change
    const bounce = 1 + this.soldierCountBounce * 0.15;

    let placed = 0;
    for (let row = 0; placed < visCount; row++) {
      for (let col = 0; col < cols && placed < visCount; col++) {
        const offsetX = (col - (cols - 1) / 2) * spacing;
        const offsetY = row * spacing * 0.8;
        const sx = this.armyX + offsetX;
        const sy = ARMY_Y + offsetY;

        // Row-based scaling (front row slightly bigger)
        const rowScale = (0.7 - row * 0.04) * bounce;
        const sc = Math.max(rowScale, 0.4);
        drawSoldier(gfx, sx, sy, sc, this.legPhase, this.upgrades);
        placed++;
      }
    }

    // Count label if > MAX_VISUAL_SOLDIERS
    if (count > MAX_VISUAL_SOLDIERS) {
      gfx.fillStyle(0x000000, 0.5);
      gfx.fillCircle(this.armyX, ARMY_Y - 30, 20);
      // Text drawn via this.add.text — handled in drawCountLabel
    }
    this.drawCountLabel(count);
  }

  drawCountLabel(count) {
    // We use a cached text object to avoid creating every frame
    if (!this._countLabel) {
      this._countLabel = this.add.text(0, 0, '', {
        fontSize: '13px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(7);
    }
    if (count > MAX_VISUAL_SOLDIERS) {
      this._countLabel.setText(`+${count - MAX_VISUAL_SOLDIERS}`);
      this._countLabel.setPosition(this.armyX, ARMY_Y - 30);
      this._countLabel.setVisible(true);
    } else {
      this._countLabel.setVisible(false);
    }
  }

  // ── drawBossCharacter ──────────────────────────────────────────────────────
  drawBossCharacter() {
    const gfx = this.enemyGfx; // reuse enemy layer
    drawBoss(gfx, this.bossX, this.bossY, 1, this.levelDef.bossType, this.bossEnraged);
  }

  // ── drawParticles ─────────────────────────────────────────────────────────
  drawParticles() {
    const gfx = this.effectGfx;
    gfx.clear();

    for (const p of this.particles) {
      if (p.dead) continue;
      const alpha = p.life / p.maxLife;
      gfx.fillStyle(p.color, alpha);
      const size = p.size * alpha;
      gfx.fillCircle(p.x, p.y, size);
    }
  }

  // ── drawCoins ─────────────────────────────────────────────────────────────
  drawCoins() {
    const gfx = this.effectGfx; // shares layer with particles (already cleared above)
    for (const coin of this.coinParticles) {
      if (coin.dead) continue;
      const alpha = coin.life / coin.maxLife;
      gfx.fillStyle(0xffd700, alpha);
      gfx.fillCircle(coin.x, coin.y, 4 * alpha + 1);
      gfx.fillStyle(0xffee88, alpha * 0.7);
      gfx.fillCircle(coin.x - 1, coin.y - 1, 2 * alpha);
    }
  }

  // ── drawMuzzleFlashes ─────────────────────────────────────────────────────
  drawMuzzleFlashes() {
    const gfx = this.effectGfx;
    for (const f of this.muzzleFlashes) {
      const alpha = f.life / f.maxLife;
      gfx.fillStyle(0xffffff, alpha);
      gfx.fillCircle(f.x, f.y, 5 * alpha);
      gfx.fillStyle(0xffff44, alpha * 0.8);
      gfx.fillCircle(f.x, f.y, 3 * alpha);
    }
  }

  // ── drawScreenFlash ───────────────────────────────────────────────────────
  drawScreenFlash() {
    const gfx = this.uiGfx;
    gfx.clear();

    if (this.screenFlash > 0) {
      gfx.fillStyle(this.screenFlashColor, this.screenFlash * 0.35);
      gfx.fillRect(0, 0, GW, GH);
      // Edge vignette
      gfx.fillStyle(this.screenFlashColor, this.screenFlash * 0.5);
      gfx.fillRect(0, 0, 18, GH);
      gfx.fillRect(GW - 18, 0, 18, GH);
      gfx.fillRect(0, 0, GW, 18);
      gfx.fillRect(0, GH - 18, GW, 18);
    }
  }
}
