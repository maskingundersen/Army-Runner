// src/scenes/GameScene.js — Main gameplay scene

// ─── Constants ────────────────────────────────────────────────────────────────
const GW          = 390;
const GH          = 844;
const VP_X        = GW / 2;
const VP_Y        = GH * 0.25;
const ARMY_Y      = GH * 0.78;
const ROAD_TOP_W  = 120;
const ROAD_BOT_W  = 360;
const MAX_VISUAL_SOLDIERS = 30;

// ─── Level Definitions ────────────────────────────────────────────────────────
const LEVEL_DEFS = [
  {
    name: 'Field', sceneryType: 'field', bossType: 'field_commander',
    bossHp: 50, bossName: 'Field Commander',
    skyColor: 0x87ceeb, grassColor: 0x2d7a27, roadColor: 0x333344,
    treeTypes: ['pine', 'dead'],
    segments: [
      { type: 'intro',   length: 500 },
      { type: 'gates',   count: 3, badChance: 0.30 },
      { type: 'enemies', waves: [
        { count: 3, enemyType: 'normal', hp: 3 },
        { count: 2, enemyType: 'fast',   hp: 1 },
      ]},
      { type: 'gates',   count: 2, badChance: 0.25 },
      { type: 'enemies', waves: [
        { count: 4, enemyType: 'normal', hp: 3 },
        { count: 1, enemyType: 'tank',   hp: 10 },
      ]},
      { type: 'gates',   count: 3, badChance: 0.35 },
      { type: 'enemies', waves: [
        { count: 5, enemyType: 'normal', hp: 3 },
        { count: 2, enemyType: 'ranged', hp: 4 },
      ]},
      { type: 'boss' },
    ],
  },
  {
    name: 'Forest', sceneryType: 'forest', bossType: 'forest_warlord',
    bossHp: 65, bossName: 'Forest Warlord',
    skyColor: 0x6ab04c, grassColor: 0x1a5c14, roadColor: 0x2a3020,
    treeTypes: ['pine', 'pine', 'dead'],
    segments: [
      { type: 'intro',   length: 500 },
      { type: 'gates',   count: 3, badChance: 0.30 },
      { type: 'enemies', waves: [
        { count: 4, enemyType: 'normal', hp: 4 },
        { count: 3, enemyType: 'fast',   hp: 1 },
      ]},
      { type: 'gates',   count: 2, badChance: 0.28 },
      { type: 'enemies', waves: [
        { count: 5, enemyType: 'normal', hp: 4 },
        { count: 2, enemyType: 'tank',   hp: 12 },
      ]},
      { type: 'gates',   count: 3, badChance: 0.38 },
      { type: 'enemies', waves: [
        { count: 5, enemyType: 'normal', hp: 4 },
        { count: 2, enemyType: 'ranged', hp: 5 },
        { count: 1, enemyType: 'miniboss', hp: 20 },
      ]},
      { type: 'boss' },
    ],
  },
  {
    name: 'Desert', sceneryType: 'desert', bossType: 'desert_general',
    bossHp: 80, bossName: 'Desert General',
    skyColor: 0xf5c842, grassColor: 0xc8a84b, roadColor: 0x7a6a44,
    treeTypes: ['cactus', 'cactus', 'dead'],
    segments: [
      { type: 'intro',   length: 500 },
      { type: 'gates',   count: 4, badChance: 0.33 },
      { type: 'enemies', waves: [
        { count: 5, enemyType: 'normal', hp: 4 },
        { count: 4, enemyType: 'fast',   hp: 1 },
        { count: 1, enemyType: 'tank',   hp: 12 },
      ]},
      { type: 'gates',   count: 3, badChance: 0.32 },
      { type: 'enemies', waves: [
        { count: 4, enemyType: 'normal', hp: 5 },
        { count: 3, enemyType: 'ranged', hp: 5 },
        { count: 2, enemyType: 'tank',   hp: 12 },
      ]},
      { type: 'gates',   count: 4, badChance: 0.40 },
      { type: 'enemies', waves: [
        { count: 6, enemyType: 'normal', hp: 4 },
        { count: 2, enemyType: 'ranged', hp: 5 },
        { count: 1, enemyType: 'miniboss', hp: 25 },
      ]},
      { type: 'boss' },
    ],
  },
  {
    name: 'Arctic', sceneryType: 'arctic', bossType: 'arctic_overlord',
    bossHp: 90, bossName: 'Arctic Overlord',
    skyColor: 0xb0d8f0, grassColor: 0xddeeff, roadColor: 0x445566,
    treeTypes: ['snow_pine', 'snow_pine', 'dead'],
    segments: [
      { type: 'intro',   length: 500 },
      { type: 'gates',   count: 4, badChance: 0.35 },
      { type: 'enemies', waves: [
        { count: 5, enemyType: 'normal', hp: 5 },
        { count: 4, enemyType: 'fast',   hp: 2 },
        { count: 2, enemyType: 'ranged', hp: 5 },
      ]},
      { type: 'gates',   count: 3, badChance: 0.33 },
      { type: 'enemies', waves: [
        { count: 4, enemyType: 'normal', hp: 5 },
        { count: 3, enemyType: 'tank',   hp: 14 },
        { count: 2, enemyType: 'ranged', hp: 5 },
      ]},
      { type: 'gates',   count: 4, badChance: 0.42 },
      { type: 'enemies', waves: [
        { count: 6, enemyType: 'normal', hp: 5 },
        { count: 3, enemyType: 'ranged', hp: 5 },
        { count: 1, enemyType: 'miniboss', hp: 30 },
      ]},
      { type: 'boss' },
    ],
  },
  {
    name: 'Volcanic', sceneryType: 'volcanic', bossType: 'demon_lord',
    bossHp: 100, bossName: 'Demon Lord',
    skyColor: 0x8b0000, grassColor: 0x3a1a0a, roadColor: 0x221100,
    treeTypes: ['dead', 'dead', 'cactus'],
    segments: [
      { type: 'intro',   length: 500 },
      { type: 'gates',   count: 4, badChance: 0.38 },
      { type: 'enemies', waves: [
        { count: 6, enemyType: 'normal', hp: 5 },
        { count: 5, enemyType: 'fast',   hp: 2 },
        { count: 2, enemyType: 'ranged', hp: 6 },
      ]},
      { type: 'gates',   count: 4, badChance: 0.36 },
      { type: 'enemies', waves: [
        { count: 5, enemyType: 'normal', hp: 6 },
        { count: 3, enemyType: 'tank',   hp: 16 },
        { count: 3, enemyType: 'ranged', hp: 6 },
      ]},
      { type: 'gates',   count: 4, badChance: 0.45 },
      { type: 'enemies', waves: [
        { count: 7, enemyType: 'normal', hp: 5 },
        { count: 3, enemyType: 'ranged', hp: 6 },
        { count: 1, enemyType: 'miniboss', hp: 35 },
      ]},
      { type: 'boss' },
    ],
  },
];

// ─── GameScene ────────────────────────────────────────────────────────────────
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.currentLevel     = data.level          || 1;
    this.soldierCount     = 20;
    this.upgrades         = {};
    this.phase            = 'running';
    this.difficultyMult   = data.difficultyMult || 1;
    this.hasSeenAllLevels = data.hasSeenAllLevels || false;
    this.levelStartScrollY = 0;
    this.scrollY          = 0;
    this.scrollSpeed      = 200;
    this.baseScrollSpeed  = 200;
    this.armyX            = GW / 2;
    this.armyTargetX      = GW / 2;
    this.armyY            = ARMY_Y;
    this.isDragging       = false;
    this.dragStartX       = 0;
    this.legPhase         = 0;
    this.legTimer         = 0;
    this.gateObjects      = [];
    this.enemyWaveTriggers = [];
    this.bossTriggerY     = 0;
    this.bossTriggerDone  = false;
    this.totalRoadLength  = 0;
    this.bossIntroTimer   = 0;
    this._bossHPBg        = null;
    this._bossHPFill      = null;
    this._bossHPLabel     = null;
    this.sceneryObjects   = [];
    this.particles        = [];
    this.screenFlash      = 0;
    this.screenFlashColor = 0xff0000;
    this.comboCount       = 0;
    this.comboTimer       = 0;
    this.soldierCountBounce = 0;
    this.grenadeTimer     = 0;
    this.medicTimer       = 0;
    this.damageCooldown   = 0;
    this.score            = 0;
    this._countLabel      = null;
    this.shopMeta         = UpgradeSystem.loadShopMeta();
    const startSoldiers   = (this.shopMeta.startSoldiers || 0) * 5;
    this.soldierCount    += startSoldiers;
    if (this.shopMeta.startUpgrade) {
      this.upgrades.spreadShot = 1;
    }
  }

  create() {
    this.W = GW;
    this.H = GH;
    const lvlIdx   = Math.min(this.currentLevel - 1, LEVEL_DEFS.length - 1);
    this.levelDef  = LEVEL_DEFS[lvlIdx];
    this.coinSys    = new CoinSystem(this);
    this.upgradeSys = new UpgradeSystem(this);
    this.enemyMgr   = new EnemyManager(this);
    this.shootSys   = new ShootingSystem(this);
    this.bossMgr    = new BossManager(this);
    this.roadGfx    = this.add.graphics().setDepth(0);
    this.sceneryGfx = this.add.graphics().setDepth(1);
    this.gateGfx    = this.add.graphics().setDepth(2);
    this.enemyGfx   = this.add.graphics().setDepth(4);
    this.bulletGfx  = this.add.graphics().setDepth(6);
    this.soldierGfx = this.add.graphics().setDepth(5);
    this.effectGfx  = this.add.graphics().setDepth(8);
    this.uiGfx      = this.add.graphics().setDepth(20);
    this.gateTextContainer  = this.add.container(0, 0).setDepth(3);
    this.effectTextContainer = this.add.container(0, 0).setDepth(25);
    this.buildLevelContent();
    this.buildScenery();
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
    this.showLevelTitle();
    this.progressBg   = this.add.rectangle(GW - 14, GH / 2, 8, GH * 0.55, 0x333355).setDepth(20);
    this.progressFill = this.add.rectangle(GW - 14, GH * 0.775, 6, 0, 0x2ecc71).setDepth(21);
    this.notifyUI();
  }

  buildLevelContent(startWorldY) {
    const segs   = this.levelDef.segments;
    let worldY   = startWorldY || 0;
    const weaponGates = UpgradeSystem.WEAPON_GATES;
    for (const seg of segs) {
      if (seg.type === 'intro') {
        worldY += seg.length;
      } else if (seg.type === 'gates') {
        for (let i = 0; i < seg.count; i++) {
          const gWorldY = worldY + 120 + i * 200;
          const isGold  = Math.random() < 0.30;
          if (isGold) {
            const wg = weaponGates[Math.floor(Math.random() * weaponGates.length)];
            this.gateObjects.push({
              worldY: gWorldY,
              left:   { weapon: wg,  good: true },
              right:  { weapon: null, good: true },
              passed: false, isWeapon: true, texts: [],
            });
          } else {
            const isLeftGood = Math.random() > seg.badChance;
            const goodMods   = UpgradeSystem.SOLDIER_GOOD_MODS;
            const badMods    = UpgradeSystem.SOLDIER_BAD_MODS;
            const leftMod    = isLeftGood
              ? goodMods[Math.floor(Math.random() * goodMods.length)]
              : badMods[Math.floor(Math.random() * badMods.length)];
            const rightMod   = !isLeftGood
              ? goodMods[Math.floor(Math.random() * goodMods.length)]
              : badMods[Math.floor(Math.random() * badMods.length)];
            this.gateObjects.push({
              worldY: gWorldY,
              left:   { mod: leftMod,  good: isLeftGood  },
              right:  { mod: rightMod, good: !isLeftGood },
              passed: false, isWeapon: false, texts: [],
            });
          }
        }
        worldY += seg.count * 200 + 100;
      } else if (seg.type === 'enemies') {
        this.enemyWaveTriggers.push({ worldY: worldY + 100, waves: seg.waves, triggered: false });
        worldY += 500;
      } else if (seg.type === 'boss') {
        this.bossTriggerY = worldY;
        worldY += 400;
      }
    }
    this.totalRoadLength = worldY + 200;
  }

  buildScenery() {
    const types = this.levelDef.treeTypes || ['pine'];
    this.sceneryObjects = [];
    for (let i = 0; i < 18; i++) {
      this.sceneryObjects.push({
        side:    i % 2 === 0 ? 'left' : 'right',
        screenY: VP_Y + (i / 18) * (GH - VP_Y + 100),
        size:    0.45 + Math.random() * 0.4,
        type:    types[Math.floor(Math.random() * types.length)],
        xOff:    Phaser.Math.Between(15, 45),
      });
    }
  }

  getRoadWidthAtY(screenY) {
    const t = Phaser.Math.Clamp((screenY - VP_Y) / (ARMY_Y - VP_Y), 0, 1);
    return ROAD_TOP_W + (ROAD_BOT_W - ROAD_TOP_W) * t;
  }

  worldToScreenY(worldY) {
    return ARMY_Y - (worldY - this.scrollY);
  }

  showLevelTitle() {
    const card = this.add.text(GW / 2, GH * 0.42,
      'LEVEL ' + this.currentLevel + '\n' + this.levelDef.name.toUpperCase(), {
        fontSize: '30px', fontStyle: 'bold',
        fill: '#ffd700', stroke: '#000', strokeThickness: 5, align: 'center',
      }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({
      targets: card, alpha: 1, y: GH * 0.38, duration: 400, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: card, alpha: 0, delay: 1600, duration: 500,
          onComplete: () => card.destroy(),
        });
      },
    });
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.coinSys.update(dt);
    this.updateParticles(dt);
    this.updateComboTimer(dt);
    if (this.screenFlash > 0) this.screenFlash = Math.max(0, this.screenFlash - dt * 3);
    this.soldierCountBounce = Math.max(0, this.soldierCountBounce - dt * 5);
    if (this.phase === 'running' || this.phase === 'levelTransition') {
      this.updateRunning(dt);
    } else if (this.phase === 'bossIntro') {
      this.updateBossIntro(dt);
    } else if (this.phase === 'boss') {
      this.updateBoss(dt);
    }
    this.drawAll();
  }

  updateRunning(dt) {
    this.scrollY += this.scrollSpeed * dt;
    this.armyX = Phaser.Math.Linear(this.armyX, this.armyTargetX, 0.16);
    this.legTimer += dt;
    if (this.legTimer >= 0.3) { this.legTimer = 0; this.legPhase = 1 - this.legPhase; }
    const sdDt = this.scrollSpeed * 0.7 * dt;
    for (const obj of this.sceneryObjects) {
      obj.screenY += sdDt;
      if (obj.screenY > GH + 120) {
        obj.screenY = VP_Y - Phaser.Math.Between(0, 60);
        obj.size    = 0.45 + Math.random() * 0.4;
        obj.xOff    = Phaser.Math.Between(15, 45);
      }
    }
    for (const gate of this.gateObjects) {
      if (gate.passed) continue;
      const sy = this.worldToScreenY(gate.worldY);
      if (sy > ARMY_Y + 10 && sy < ARMY_Y + 60) {
        gate.passed = true;
        this.handleGateCollision(gate, sy);
      }
      if (sy > GH + 200) this.destroyGateTexts(gate);
    }
    for (const trigger of this.enemyWaveTriggers) {
      if (!trigger.triggered && this.scrollY >= trigger.worldY) {
        trigger.triggered = true;
        this.enemyMgr.spawnWave(trigger.waves, this.difficultyMult);
      }
    }
    if (!this.bossTriggerDone && this.scrollY >= this.bossTriggerY) {
      this.bossTriggerDone = true;
      this.startBossIntro();
    }
    const stats = this.upgradeSys.getStats(this.upgrades, this.shopMeta);
    if (this.enemyMgr.enemies.length > 0 || this.shootSys.bullets.length > 0) {
      this.updateCombat(dt, stats);
    }
    const startY  = this.levelStartScrollY || 0;
    const prog    = Math.min((this.scrollY - startY) / Math.max(1, this.totalRoadLength - startY), 1);
    const barMaxH = GH * 0.55;
    const barH    = prog * barMaxH;
    this.progressFill.height = barH;
    this.progressFill.y      = GH * 0.225 + GH * 0.55 - barH / 2;
    if (this.upgrades.medic) {
      this.medicTimer += dt;
      if (this.medicTimer >= 3) { this.medicTimer = 0; this.addSoldiers(2, false); }
    }
    if (this.upgrades.grenade) {
      const alive = this.enemyMgr.enemies.filter(e => !e.dead);
      if (alive.length > 0) {
        this.grenadeTimer += dt;
        if (this.grenadeTimer >= 5) { this.grenadeTimer = 0; this.throwGrenade(); }
      }
    }
  }

  updateCombat(dt, stats) {
    this.shootSys.update(dt, { x: this.armyX, y: ARMY_Y }, this.soldierCount, this.enemyMgr.enemies, false, null, stats);
    for (const b of this.shootSys.bullets) {
      if (b.dead) continue;
      const hitEnemy = this.enemyMgr.checkBulletHit(b.x, b.y);
      if (hitEnemy) {
        b.dead = true;
        const died = this.enemyMgr.damageEnemy(hitEnemy, b.damage);
        this.showDamageNumber(hitEnemy.x, hitEnemy.y - 20 * hitEnemy.scale, b.damage);
        if (died) {
          this.score += 10;
          this.spawnDeathParticles(hitEnemy.x, hitEnemy.y);
          this.coinSys.spawnCoin(hitEnemy.x, hitEnemy.y - 15);
          if (window.audioManager) window.audioManager.enemyDeath();
          this.comboCount++;
          this.comboTimer = 2;
          if (this.comboCount >= 3) {
            this.showComboText(this.comboCount);
            if (window.audioManager) window.audioManager.combo();
          }
        } else {
          if (window.audioManager) window.audioManager.enemyHit();
        }
        if (b.explodes) this.handleExplosive(hitEnemy.x, hitEnemy.y, b.explodeRadius, b.damage, stats);
        if (b.type === 'ricochet' && b.ricochets > 0) this.handleRicochet(b, hitEnemy, stats);
      }
    }
    const result   = this.enemyMgr.update(dt, this.armyX, ARMY_Y);
    const projHits = this.enemyMgr.checkProjectileHit(this.armyX, ARMY_Y, 42);
    if (projHits > 0 && this.damageCooldown <= 0) {
      this.damageCooldown = 0.5;
      this.loseSoldiers(projHits);
      this.cameras.main.shake(200, 0.01);
      this.screenFlash = 0.5; this.screenFlashColor = 0xff0000;
    }
    if (result.soldierLosses > 0 && this.damageCooldown <= 0) {
      this.damageCooldown = 0.8;
      this.loseSoldiers(result.soldierLosses);
      this.cameras.main.shake(250, 0.013);
      this.screenFlash = 0.6; this.screenFlashColor = 0xff0000;
    }
    if (this.damageCooldown > 0) this.damageCooldown -= dt;
    if (this.soldierCount <= 0) this.endGame(false);
  }

  handleExplosive(cx, cy, radius, damage, stats) {
    this.spawnExplosion(cx, cy);
    this.cameras.main.shake(180, 0.008);
    this.enemyMgr.applyAOE(cx, cy, radius, damage, (enemy, dmg) => {
      const died = this.enemyMgr.damageEnemy(enemy, dmg);
      this.showDamageNumber(enemy.x, enemy.y - 20 * enemy.scale, dmg);
      if (died) {
        this.score += 10;
        this.coinSys.spawnCoin(enemy.x, enemy.y - 15);
        if (window.audioManager) window.audioManager.enemyDeath();
      }
    });
  }

  handleRicochet(bullet, hitEnemy, stats) {
    const next = this.enemyMgr.findNearest(hitEnemy.x, hitEnemy.y, hitEnemy);
    if (!next) return;
    const dx  = next.x - hitEnemy.x;
    const dy  = next.y - hitEnemy.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    bullet.dead     = false;
    bullet.x        = hitEnemy.x;
    bullet.y        = hitEnemy.y;
    bullet.vx       = (dx / len) * 460;
    bullet.vy       = (dy / len) * 460;
    bullet.ricochets--;
  }

  handleGateCollision(gate, sy) {
    if (gate.isWeapon) {
      const hitLeft = this.armyX < VP_X;
      const wg      = hitLeft ? gate.left.weapon : gate.right.weapon;
      if (wg) this.applyWeaponGate(wg);
      this.destroyGateTexts(gate);
      if (window.audioManager) window.audioManager.gatGood();
      return;
    }
    const hitLeft = this.armyX < VP_X;
    const side    = hitLeft ? gate.left : gate.right;
    this.applyGateMod(side.mod, side.good, gate, hitLeft);
    this.destroyGateTexts(gate);
    if (window.audioManager) {
      if (side.good) window.audioManager.gatGood();
      else           window.audioManager.gateBad();
    }
  }

  applyWeaponGate(wg) {
    this.upgradeSys.apply(wg.id, { upgrades: this.upgrades });
    this.soldierCountBounce = 1;
    this.spawnGainParticles(this.armyX, ARMY_Y);
    this.screenFlash      = 0.2;
    this.screenFlashColor = 0xffd700;
    const pop = this.add.text(this.armyX, ARMY_Y - 50, wg.icon + ' ' + wg.label + '!', {
      fontSize: '22px', fontStyle: 'bold', fill: wg.color || '#ffd700',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: pop, y: pop.y - 85, alpha: 0, duration: 1000,
      ease: 'Power2', onComplete: () => pop.destroy(),
    });
    if (window.audioManager) window.audioManager.upgrade();
    this.notifyUI('good');
  }

  applyGateMod(mod, good, gate, hitLeft) {
    this.soldierCount = Math.max(1, Math.floor(mod.apply(this.soldierCount)));
    this.soldierCountBounce = 1;
    if (good) { this.spawnGainParticles(this.armyX, ARMY_Y); }
    else      { this.screenFlash = 0.5; this.screenFlashColor = 0xff2222; }
    const pop = this.add.text(this.armyX, ARMY_Y - 50, mod.label, {
      fontSize: '28px', fontStyle: 'bold',
      fill: good ? '#2ecc71' : '#e74c3c', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: pop, y: pop.y - 80, alpha: 0, duration: 900,
      ease: 'Power2', onComplete: () => pop.destroy(),
    });
    this.notifyUI(good ? 'good' : 'bad');
  }

  destroyGateTexts(gate) {
    if (gate.texts) { gate.texts.forEach(t => { if (t && t.active) t.destroy(); }); gate.texts = []; }
    if (gate._textMap) { Object.values(gate._textMap).forEach(t => { if (t && t.active) t.destroy(); }); gate._textMap = {}; }
  }

  throwGrenade() {
    const alive = this.enemyMgr.enemies.filter(e => !e.dead);
    if (alive.length === 0) return;
    let cx = 0, cy = 0;
    alive.forEach(e => { cx += e.x; cy += e.y; });
    cx /= alive.length; cy /= alive.length;
    const stats = this.upgradeSys.getStats(this.upgrades, this.shopMeta);
    this.handleExplosive(cx, cy, 70, 5, stats);
  }

  startBossIntro() {
    this.phase = 'bossIntro';
    this.bossIntroTimer = 0;
    this.bossMgr.start(this.levelDef, this.difficultyMult, VP_X, VP_Y + 30);
    if (window.audioManager) window.audioManager.bossRoar();
    this.time.timeScale = 0.3;
    this.time.delayedCall(300, () => { this.time.timeScale = 1; });
    this._bossHPBg    = this.add.rectangle(VP_X, 42, GW * 0.85, 22, 0x330000).setDepth(22);
    this._bossHPFill  = this.add.rectangle(VP_X, 42, GW * 0.85, 18, 0xcc2222).setDepth(23);
    this._bossHPLabel = this.add.text(VP_X, 42, this.levelDef.bossName.toUpperCase(), {
      fontSize: '11px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(24);
    const titleCard = this.add.text(VP_X, GH * 0.5, String.fromCodePoint(0x2694) + '\uFE0F ' + this.levelDef.bossName.toUpperCase() + '!', {
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

  updateBossIntro(dt) {
    this.scrollY += this.scrollSpeed * dt;
    this.armyX = Phaser.Math.Linear(this.armyX, this.armyTargetX, 0.16);
    this.legTimer += dt;
    if (this.legTimer >= 0.3) { this.legTimer = 0; this.legPhase = 1 - this.legPhase; }
    const sdDt = this.scrollSpeed * 0.7 * dt;
    for (const obj of this.sceneryObjects) {
      obj.screenY += sdDt;
      if (obj.screenY > GH + 120) {
        obj.screenY = VP_Y - Phaser.Math.Between(0, 60);
        obj.size    = 0.45 + Math.random() * 0.4;
        obj.xOff    = Phaser.Math.Between(15, 45);
      }
    }
    this.bossIntroTimer += dt;
    if (this.bossIntroTimer >= 2.2) this.phase = 'boss';
  }

  updateBoss(dt) {
    this.scrollY += this.scrollSpeed * dt;
    const sdDt = this.scrollSpeed * 0.7 * dt;
    for (const obj of this.sceneryObjects) {
      obj.screenY += sdDt;
      if (obj.screenY > GH + 120) {
        obj.screenY = VP_Y - Phaser.Math.Between(0, 60);
        obj.size    = 0.45 + Math.random() * 0.4;
        obj.xOff    = Phaser.Math.Between(15, 45);
      }
    }
    this.legTimer += dt;
    if (this.legTimer >= 0.4) { this.legTimer = 0; this.legPhase = 1 - this.legPhase; }
    this.armyX = Phaser.Math.Linear(this.armyX, this.armyTargetX, 0.16);
    const stats = this.upgradeSys.getStats(this.upgrades, this.shopMeta);
    this.shootSys.update(dt, { x: this.armyX, y: ARMY_Y }, this.soldierCount, [], true, { x: this.bossMgr.x, y: this.bossMgr.y + 30 }, stats);
    for (const b of this.shootSys.bullets) {
      if (b.dead || !b.isBoss) continue;
      if (this.bossMgr.checkBulletHit(b.x, b.y)) {
        b.dead = true;
        const died = this.bossMgr.damage(b.damage);
        if (window.audioManager) window.audioManager.bossHit();
        this.cameras.main.shake(90, 0.006);
        if (died) { this.bossDead(); return; }
      }
    }
    const bossResult = this.bossMgr.update(dt, this.armyX, ARMY_Y);
    const rawDmg     = bossResult & 0xffff;
    const enragedNow = (bossResult & 0x10000) !== 0;
    if (rawDmg > 0 && this.damageCooldown <= 0) {
      this.damageCooldown = 0.6;
      this.loseSoldiers(rawDmg);
      this.cameras.main.shake(250, 0.012);
      this.screenFlash = 0.7; this.screenFlashColor = 0xff0000;
    }
    if (this.damageCooldown > 0) this.damageCooldown -= dt;
    if (enragedNow) {
      this.cameras.main.shake(400, 0.02);
      const et = this.add.text(VP_X, GH * 0.44, '\uD83D\uDE21 ENRAGED!', {
        fontSize: '26px', fontStyle: 'bold', fill: '#ff2200', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(60);
      this.tweens.add({ targets: et, alpha: 0, y: GH * 0.35, duration: 1200, onComplete: () => et.destroy() });
    }
    if (this._bossHPFill) {
      const ratio = this.bossMgr.hp / this.bossMgr.maxHp;
      const maxW  = GW * 0.85;
      this._bossHPFill.width = maxW * ratio;
      this._bossHPFill.x     = VP_X - (maxW - this._bossHPFill.width) / 2;
      this._bossHPFill.fillColor = this.bossMgr.enraged ? 0xff4400 : 0xcc2222;
    }
    if (this.soldierCount <= 0) this.endGame(false);
  }

  bossDead() {
    this.phase = 'result';
    this.cameras.main.shake(600, 0.025);
    this._destroyBossHP();
    this.bossMgr.end();
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 120, () => {
        this.spawnExplosion(this.bossMgr.x + Phaser.Math.Between(-40, 40), this.bossMgr.y + Phaser.Math.Between(0, 60));
      });
    }
    if (window.audioManager) window.audioManager.win();
    this.time.delayedCall(1500, () => {
      const nextLevel = this.currentLevel + 1;
      if (nextLevel > LEVEL_DEFS.length) {
        if (!this.hasSeenAllLevels) {
          this.hasSeenAllLevels = true;
          this._goToUpgradeScene(true, 1, this.difficultyMult + 0.4, true);
        } else {
          this.transitionToNextLevel(1, this.difficultyMult + 0.4);
        }
      } else {
        this.transitionToNextLevel(nextLevel, this.difficultyMult);
      }
    });
  }

  _destroyBossHP() {
    if (this._bossHPBg)    { this._bossHPBg.destroy();    this._bossHPBg    = null; }
    if (this._bossHPFill)  { this._bossHPFill.destroy();  this._bossHPFill  = null; }
    if (this._bossHPLabel) { this._bossHPLabel.destroy();  this._bossHPLabel = null; }
  }

  transitionToNextLevel(nextLevel, newDiffMult) {
    this.phase          = 'levelTransition';
    this.currentLevel   = nextLevel;
    this.difficultyMult = newDiffMult || 1;
    const lvlIdx = Math.min(this.currentLevel - 1, LEVEL_DEFS.length - 1);
    this.levelDef = LEVEL_DEFS[lvlIdx];
    this.gateObjects        = [];
    this.enemyWaveTriggers  = [];
    this.bossTriggerDone    = false;
    this.enemyMgr.clear();
    this.shootSys.clear();
    if (this.gateTextContainer) this.gateTextContainer.removeAll(true);
    this.levelStartScrollY = this.scrollY + 600;
    this.buildLevelContent(this.levelStartScrollY);
    this.buildScenery();
    this.showLevelTitle();
    this.time.delayedCall(100, () => this.notifyUI());
    this.time.delayedCall(2200, () => { if (this.phase === 'levelTransition') this.phase = 'running'; });
  }

  endGame(won) {
    if (this.phase === 'result' || this.phase === 'levelTransition') return;
    this.phase = 'result';
    this._destroyBossHP();
    if (!won && window.audioManager) window.audioManager.lose();
    this.time.delayedCall(700, () => {
      this._goToUpgradeScene(won, won ? this.currentLevel + 1 : this.currentLevel, this.difficultyMult, false);
    });
  }

  _goToUpgradeScene(won, nextLevel, diffMult, allDone) {
    this.scene.stop('UIScene');
    this.scene.start('UpgradeScene', {
      level:          this.currentLevel,
      runCoins:       this.coinSys.runCoins,
      won:            won,
      nextLevel:      nextLevel,
      difficultyMult: diffMult,
      allDone:        allDone || false,
    });
  }

  addSoldiers(count, notify) {
    this.soldierCount = Math.min(999, this.soldierCount + count);
    this.soldierCountBounce = 1;
    if (notify !== false) this.notifyUI('good');
  }

  loseSoldiers(count) {
    const stats   = this.upgradeSys.getStats(this.upgrades, this.shopMeta);
    const reduced = stats.hasArmor ? Math.max(1, Math.ceil(count / 2)) : count;
    this.soldierCount = Math.max(0, this.soldierCount - reduced);
    this.soldierCountBounce = 1;
    this.notifyUI('bad');
    if (this.soldierCount <= 0) this.endGame(false);
  }

  notifyUI(flashType) {
    const ui = this.scene.get('UIScene');
    if (ui && ui.updateHUD) {
      ui.updateHUD(this.soldierCount, this.currentLevel, flashType, this.score, this.coinSys.totalCoins);
    }
  }

  spawnExplosion(x, y) {
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const speed = Phaser.Math.Between(50, 160);
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.7, maxLife: 0.7, color: i % 2 === 0 ? 0xff6600 : 0xffcc00,
        size: Phaser.Math.Between(4, 10), dead: false });
    }
  }

  spawnDeathParticles(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(30, 90);
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.5, maxLife: 0.5, color: 0xcc2222, size: Phaser.Math.Between(3, 7), dead: false });
    }
  }

  spawnGainParticles(x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = Phaser.Math.Between(40, 110);
      this.particles.push({ x: x + Phaser.Math.Between(-20, 20), y: y - 10,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.7, maxLife: 0.7, color: 0x2ecc71, size: Phaser.Math.Between(3, 8), dead: false });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      if (p.dead) continue;
      p.x  += p.vx * dt; p.y  += p.vy * dt; p.vy += 80 * dt; p.life -= dt;
      if (p.life <= 0) p.dead = true;
    }
    this.particles = this.particles.filter(p => !p.dead);
  }

  updateComboTimer(dt) {
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.comboCount = 0; }
  }

  showDamageNumber(x, y, dmg) {
    const txt = this.add.text(x + Phaser.Math.Between(-12, 12), y, '-' + dmg,
      { fontSize: '13px', fontStyle: 'bold', fill: '#ff4444', stroke: '#000', strokeThickness: 2 }
    ).setOrigin(0.5).setDepth(9);
    this.tweens.add({ targets: txt, y: txt.y - 36, alpha: 0, duration: 650, ease: 'Power2', onComplete: () => txt.destroy() });
  }

  showComboText(count) {
    const labels = ['COMBO!', 'NICE!', 'MASSACRE!', 'UNSTOPPABLE!', 'GODLIKE!'];
    const label  = count >= 10 ? labels[4] : count >= 7 ? labels[3] : count >= 5 ? labels[2] : count >= 4 ? labels[1] : labels[0];
    const txt = this.add.text(VP_X, GH * 0.5, label + ' x' + count,
      { fontSize: '28px', fontStyle: 'bold', fill: '#ffcc00', stroke: '#000', strokeThickness: 4 }
    ).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: txt, y: GH * 0.38, alpha: 0, scaleX: 1.3, scaleY: 1.3, duration: 1000, ease: 'Power2', onComplete: () => txt.destroy() });
  }

  drawAll() {
    this.drawRoad();
    this.drawScenery();
    this.drawGates();
    this.enemyGfx.clear();
    this.enemyMgr.draw(this.enemyGfx);
    if (this.phase === 'boss' || this.phase === 'bossIntro') this.bossMgr.draw(this.enemyGfx);
    this.bulletGfx.clear();
    this.shootSys.draw(this.bulletGfx);
    this.drawSoldierFormation();
    this.drawParticlesAndCoins();
    this.drawScreenFlash();
  }

  drawRoad() {
    const gfx = this.roadGfx;
    gfx.clear();
    const ld = this.levelDef;
    gfx.fillStyle(ld.skyColor, 1);
    gfx.fillRect(0, 0, GW, VP_Y);
    gfx.fillStyle(ld.grassColor, 1);
    gfx.fillRect(0, VP_Y, GW, GH - VP_Y);
    gfx.fillStyle(ld.roadColor, 1);
    gfx.fillPoints([
      { x: VP_X - ROAD_TOP_W / 2, y: VP_Y }, { x: VP_X + ROAD_TOP_W / 2, y: VP_Y },
      { x: VP_X + ROAD_BOT_W / 2, y: GH   }, { x: VP_X - ROAD_BOT_W / 2, y: GH   },
    ], true);
    gfx.fillStyle(0x887766, 0.6);
    const st = 10, sb = 18;
    gfx.fillPoints([
      { x: VP_X - ROAD_TOP_W / 2 - st, y: VP_Y }, { x: VP_X - ROAD_TOP_W / 2, y: VP_Y },
      { x: VP_X - ROAD_BOT_W / 2, y: GH }, { x: VP_X - ROAD_BOT_W / 2 - sb, y: GH },
    ], true);
    gfx.fillPoints([
      { x: VP_X + ROAD_TOP_W / 2, y: VP_Y }, { x: VP_X + ROAD_TOP_W / 2 + st, y: VP_Y },
      { x: VP_X + ROAD_BOT_W / 2 + sb, y: GH }, { x: VP_X + ROAD_BOT_W / 2, y: GH },
    ], true);
    const dashSpacing = 55;
    const dashOffset  = this.scrollY % dashSpacing;
    gfx.fillStyle(0xffffff, 0.3);
    for (let y = VP_Y + (dashOffset % dashSpacing); y < GH; y += dashSpacing) {
      const t  = Phaser.Math.Clamp((y - VP_Y) / (GH - VP_Y), 0, 1);
      gfx.fillRect(VP_X - (3 + t * 4) / 2, y, 3 + t * 4, 10 + t * 18);
    }
    gfx.lineStyle(2, 0xffffff, 0.12);
    gfx.strokeLineShape(new Phaser.Geom.Line(0, VP_Y, GW, VP_Y));
  }

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
      drawTree(gfx, roadEdgeX, obj.screenY, obj.size * (0.3 + t * 0.7), obj.type);
    }
  }

  drawGates() {
    const gfx = this.gateGfx;
    gfx.clear();
    for (const gate of this.gateObjects) {
      if (gate.passed) continue;
      const sy = this.worldToScreenY(gate.worldY);
      if (sy < VP_Y - 20 || sy > GH + 60) continue;
      const t       = Phaser.Math.Clamp((sy - VP_Y) / (ARMY_Y - VP_Y), 0, 1);
      const roadW   = ROAD_TOP_W + (ROAD_BOT_W - ROAD_TOP_W) * t;
      const gateW   = roadW / 2 - 6;
      const leftCX  = VP_X - roadW / 2 + gateW / 2 + 2;
      const rightCX = VP_X + gateW / 2 + 4;
      const gateH   = 18 + t * 36;
      const pillarW = 5 + t * 8;
      const pillarH = 30 + t * 50;
      const midY    = sy - gateH / 2 - pillarH / 2;
      const textSz  = Math.round(10 + t * 12) + 'px';
      if (gate.isWeapon) {
        const wg = gate.left.weapon;
        if (wg) {
          this.drawGateArch(gfx, leftCX, sy, gateW, gateH, pillarW, pillarH, 0xc8860a, 0xffd700, t);
          this.updateOrCreateGateText(gate, 'left', wg.icon, leftCX, midY - 8, '#ffd700', textSz, t);
          this.updateOrCreateGateText(gate, 'leftlabel', wg.label, leftCX, midY + 12, '#ffdd88', Math.round(8 + t * 6) + 'px', t);
        }
        this.drawGateArch(gfx, rightCX, sy, gateW, gateH, pillarW, pillarH, 0x114466, 0x336699, t);
        this.updateOrCreateGateText(gate, 'right', 'SKIP', rightCX, midY, '#557799', textSz, t);
      } else {
        const lColor  = gate.left.good  ? 0x27ae60 : 0xe74c3c;
        const rColor  = gate.right.good ? 0x27ae60 : 0xe74c3c;
        const lStroke = gate.left.good  ? 0x2ecc71 : 0xff6b6b;
        const rStroke = gate.right.good ? 0x2ecc71 : 0xff6b6b;
        this.drawGateArch(gfx, leftCX,  sy, gateW, gateH, pillarW, pillarH, lColor, lStroke, t);
        this.drawGateArch(gfx, rightCX, sy, gateW, gateH, pillarW, pillarH, rColor, rStroke, t);
        this.updateOrCreateGateText(gate, 'left',  gate.left.mod.label,  leftCX,  midY, gate.left.good  ? '#2ecc71' : '#ff6b6b', textSz, t);
        this.updateOrCreateGateText(gate, 'right', gate.right.mod.label, rightCX, midY, gate.right.good ? '#2ecc71' : '#ff6b6b', textSz, t);
      }
    }
  }

  drawGateArch(gfx, cx, sy, w, h, pillarW, pillarH, fillColor, strokeColor, t) {
    const alpha = Phaser.Math.Clamp(t * 2, 0, 0.85);
    gfx.fillStyle(fillColor, alpha);
    gfx.fillRect(cx - w / 2, sy - h, w, h);
    gfx.lineStyle(2, strokeColor, alpha);
    gfx.strokeRect(cx - w / 2, sy - h, w, h);
    gfx.fillStyle(strokeColor, alpha);
    gfx.fillRect(cx - w / 2, sy - h - pillarH, pillarW, pillarH);
    gfx.fillRect(cx + w / 2 - pillarW, sy - h - pillarH, pillarW, pillarH);
  }

  updateOrCreateGateText(gate, key, label, x, y, color, fontSize, t) {
    if (!gate._textMap) gate._textMap = {};
    let txt = gate._textMap[key];
    if (!txt || !txt.active) {
      txt = this.add.text(x, y, label, { fontSize, fontStyle: 'bold', fill: color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(3);
      this.gateTextContainer.add(txt);
      gate._textMap[key] = txt;
      if (!gate.texts) gate.texts = [];
      gate.texts.push(txt);
    } else {
      txt.x = x; txt.y = y;
      txt.setAlpha(Phaser.Math.Clamp(t * 2, 0, 1));
      txt.setStyle({ fontSize });
    }
  }

  drawSoldierFormation() {
    const gfx = this.soldierGfx;
    gfx.clear();
    const count = this.soldierCount;
    if (count <= 0) return;
    const visCount = Math.min(count, MAX_VISUAL_SOLDIERS);
    const cols     = Math.ceil(Math.sqrt(visCount * 1.4));
    const bounce   = 1 + this.soldierCountBounce * 0.15;
    let placed = 0;
    for (let row = 0; placed < visCount; row++) {
      for (let col = 0; col < cols && placed < visCount; col++) {
        const sx = this.armyX + (col - (cols - 1) / 2) * 18;
        const sy = ARMY_Y + row * 18 * 0.8;
        const sc = Math.max((0.7 - row * 0.04) * bounce, 0.4);
        drawSoldier(gfx, sx, sy, sc, this.legPhase, this.upgrades);
        placed++;
      }
    }
    this.drawCountLabel(count);
  }

  drawCountLabel(count) {
    if (!this._countLabel) {
      this._countLabel = this.add.text(0, 0, '', { fontSize: '13px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(7);
    }
    if (count > MAX_VISUAL_SOLDIERS) {
      this._countLabel.setText('+' + (count - MAX_VISUAL_SOLDIERS));
      this._countLabel.setPosition(this.armyX, ARMY_Y - 30);
      this._countLabel.setVisible(true);
    } else {
      this._countLabel.setVisible(false);
    }
  }

  drawParticlesAndCoins() {
    const gfx = this.effectGfx;
    gfx.clear();
    for (const p of this.particles) {
      if (p.dead) continue;
      const alpha = p.life / p.maxLife;
      gfx.fillStyle(p.color, alpha);
      gfx.fillCircle(p.x, p.y, p.size * alpha);
    }
    this.coinSys.draw(gfx);
  }

  drawScreenFlash() {
    const gfx = this.uiGfx;
    gfx.clear();
    if (this.screenFlash > 0) {
      gfx.fillStyle(this.screenFlashColor, this.screenFlash * 0.35);
      gfx.fillRect(0, 0, GW, GH);
      gfx.fillStyle(this.screenFlashColor, this.screenFlash * 0.5);
      gfx.fillRect(0, 0, 18, GH); gfx.fillRect(GW - 18, 0, 18, GH);
      gfx.fillRect(0, 0, GW, 18); gfx.fillRect(0, GH - 18, GW, 18);
    }
  }
}
