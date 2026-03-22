// src/scenes/GameScene.js — Main gameplay scene

// Level definitions: { gates: number of gate pairs, enemies: enemy count, badChance: 0-1 }
const LEVELS = [
  { gates: 4, enemies: 15, badChance: 0.3 },
  { gates: 5, enemies: 25, badChance: 0.35 },
  { gates: 6, enemies: 35, badChance: 0.4 },
  { gates: 7, enemies: 50, badChance: 0.45 },
  { gates: 8, enemies: 70, badChance: 0.5 },
];

const ROAD_WIDTH = 260;
const LANE_LEFT = 0.5 - 0.25;   // fraction of road: left lane center
const LANE_RIGHT = 0.5 + 0.25;  // fraction of road: right lane center

// Gate modifier pool: [label, effect fn]
const GOOD_MODS = [
  { label: '+10', apply: (n) => n + 10 },
  { label: '+20', apply: (n) => n + 20 },
  { label: '+30', apply: (n) => n + 30 },
  { label: 'x2',  apply: (n) => n * 2 },
  { label: 'x3',  apply: (n) => n * 3 },
];
const BAD_MODS = [
  { label: '-10', apply: (n) => Math.max(1, n - 10) },
  { label: '-20', apply: (n) => Math.max(1, n - 20) },
  { label: 'x0.5', apply: (n) => Math.max(1, Math.floor(n * 0.5)) },
  { label: 'x0.25', apply: (n) => Math.max(1, Math.floor(n * 0.25)) },
];

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.currentLevel = data.level || 1;
    this.soldierCount = 20;
    this.phase = 'running'; // 'running' | 'battle' | 'result'
    this.gatesPassed = 0;
    this.scrollSpeed = 200; // px/s road scroll speed
    this.armyX = 0;         // set in create
    this.isDragging = false;
    this.dragStartX = 0;
    this.armyTargetX = 0;
    this.pendingAnim = null;
    this.gateObjects = [];
    this.enemyObjects = [];
    this.soldierCircles = [];
    this.battleTimer = 0;
    this.battleInterval = 0.35; // seconds per combat tick
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W;
    this.H = H;

    const levelDef = LEVELS[Math.min(this.currentLevel - 1, LEVELS.length - 1)];
    this.levelDef = levelDef;

    // ---- Road background ----
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e);
    this.roadBg = this.add.rectangle(W / 2, H / 2, ROAD_WIDTH, H, 0x2d2d44);

    // Road scroll lines
    this.laneLines = [];
    for (let i = 0; i < 14; i++) {
      const line = this.add.rectangle(W / 2, i * 70, 6, 36, 0xffffff).setAlpha(0.25);
      this.laneLines.push(line);
    }
    this.laneLineOffset = 0;

    // ---- Level label ----
    const lvlLabel = this.add.text(W / 2, H * 0.12, `LEVEL ${this.currentLevel}`, {
      fontSize: '22px',
      fontStyle: 'bold',
      fill: '#ffd700',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({
      targets: lvlLabel,
      alpha: 0,
      duration: 400,
      delay: 1800,
    });

    // ---- Army position ----
    this.armyX = W / 2;
    this.armyTargetX = W / 2;
    this.armyY = H * 0.78;

    // ---- Create gate objects in world space ----
    // Gates are spaced out above the army start, revealed as the road scrolls
    this.totalRoadLength = levelDef.gates * 180 + 300; // world units
    this.scrollY = 0; // how many px we've scrolled (world units)

    this.buildGates(levelDef);

    // ---- Enemy base (appears at the end) ----
    this.enemyBaseWorldY = -(this.totalRoadLength + 200);
    this.enemyBaseContainer = null; // created when battle starts

    // ---- Soldier visuals ----
    this.soldierGroup = this.add.container(this.armyX, this.armyY).setDepth(5);
    this.updateSoldierVisuals();

    // ---- Progress bar ----
    this.progressBarBg = this.add.rectangle(W - 18, H / 2, 10, H * 0.6, 0x444466).setDepth(10);
    this.progressBar = this.add.rectangle(W - 18, H / 2 + H * 0.3, 8, 0, 0x2ecc71).setDepth(11);

    // ---- Touch / drag input ----
    this.input.on('pointerdown', (ptr) => {
      if (this.phase !== 'running') return;
      this.isDragging = true;
      this.dragStartX = ptr.x;
    });

    this.input.on('pointermove', (ptr) => {
      if (!this.isDragging || this.phase !== 'running') return;
      const dx = ptr.x - this.dragStartX;
      this.dragStartX = ptr.x;
      this.armyTargetX = Phaser.Math.Clamp(
        this.armyTargetX + dx,
        W / 2 - ROAD_WIDTH / 2 + 30,
        W / 2 + ROAD_WIDTH / 2 - 30,
      );
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    // ---- Notify UIScene of initial count ----
    this.notifyUI();
  }

  buildGates(levelDef) {
    const W = this.W;
    // Gates placed at fixed world-Y positions (negative = ahead of army)
    // World Y = 0 is army position; negative = further ahead (scrolls into view from top)
    for (let i = 0; i < levelDef.gates; i++) {
      const worldY = -(220 + i * 180);
      const isLeftGood = Math.random() > levelDef.badChance;
      const leftMod = isLeftGood
        ? GOOD_MODS[Math.floor(Math.random() * GOOD_MODS.length)]
        : BAD_MODS[Math.floor(Math.random() * BAD_MODS.length)];
      const rightMod = !isLeftGood
        ? GOOD_MODS[Math.floor(Math.random() * GOOD_MODS.length)]
        : BAD_MODS[Math.floor(Math.random() * BAD_MODS.length)];

      // Make sure there's always at least one good gate
      const finalLeft = leftMod;
      const finalRight = rightMod;

      const gate = {
        worldY,
        left: { mod: finalLeft, good: isLeftGood },
        right: { mod: finalRight, good: !isLeftGood },
        passed: false,
        // Screen objects created when gate enters view
        leftRect: null,
        rightRect: null,
        leftText: null,
        rightText: null,
      };
      this.gateObjects.push(gate);
    }
  }

  worldToScreenY(worldY) {
    // army is at armyY on screen, worldY=0 is army's world position
    // scrollY = how far we've moved forward (positive)
    return this.armyY + worldY + this.scrollY;
  }

  update(time, delta) {
    const dt = delta / 1000;

    if (this.phase === 'running') {
      this.updateRunning(dt);
    } else if (this.phase === 'battle') {
      this.updateBattle(dt);
    }
  }

  updateRunning(dt) {
    const W = this.W;
    const H = this.H;

    // Scroll the road
    this.scrollY += this.scrollSpeed * dt;

    // Animate lane lines (scroll down to create movement illusion)
    this.laneLineOffset = (this.laneLineOffset + this.scrollSpeed * dt) % (H + 70);
    this.laneLines.forEach((line, i) => {
      line.y = (i * 70 + this.laneLineOffset) % (H + 70);
    });

    // Smoothly move army toward target
    this.armyX = Phaser.Math.Linear(this.armyX, this.armyTargetX, 0.18);
    this.soldierGroup.x = this.armyX;
    this.soldierGroup.y = this.armyY;

    // Update gates
    this.gateObjects.forEach((gate) => {
      const screenY = this.worldToScreenY(gate.worldY);

      // Create visuals when gate enters view
      if (!gate.leftRect && screenY < H + 100 && screenY > -200) {
        this.createGateVisuals(gate, screenY);
      }

      // Update positions
      if (gate.leftRect) {
        const sy = this.worldToScreenY(gate.worldY);
        gate.leftRect.y = sy;
        gate.rightRect.y = sy;
        gate.leftText.y = sy;
        gate.rightText.y = sy;
        gate.leftPole1.y = sy - 45;
        gate.leftPole2.y = sy - 45;
        gate.rightPole1.y = sy - 45;
        gate.rightPole2.y = sy - 45;
      }

      // Check collision with army
      if (!gate.passed && gate.leftRect) {
        const sy = this.worldToScreenY(gate.worldY);
        if (Math.abs(sy - this.armyY) < 50) {
          gate.passed = true;
          // Determine which side army is on
          const roadLeft = W / 2 - ROAD_WIDTH / 2;
          const roadMid = W / 2;
          const hitLeft = this.armyX < roadMid;
          const mod = hitLeft ? gate.left.mod : gate.right.mod;
          const good = hitLeft ? gate.left.good : gate.right.good;
          this.applyGateMod(mod, good, gate, hitLeft);
        }
      }

      // Destroy visuals when far below screen
      if (gate.leftRect && this.worldToScreenY(gate.worldY) > H + 150) {
        this.destroyGateVisuals(gate);
      }
    });

    // Progress bar
    const progress = Math.min(this.scrollY / this.totalRoadLength, 1);
    const barMaxH = H * 0.6;
    const barH = progress * barMaxH;
    this.progressBar.height = barH;
    this.progressBar.y = H / 2 + H * 0.3 - barH;

    // Check if we've scrolled past all gates → start battle
    if (this.scrollY >= this.totalRoadLength && this.phase === 'running') {
      this.startBattle();
    }
  }

  createGateVisuals(gate, screenY) {
    const W = this.W;
    const gateW = (ROAD_WIDTH - 20) / 2;
    const gateH = 54;
    const leftX = W / 2 - ROAD_WIDTH / 2 + gateW / 2 + 4;
    const rightX = W / 2 + 6 + gateW / 2;

    const leftColor = gate.left.good ? 0x27ae60 : 0xe74c3c;
    const rightColor = gate.right.good ? 0x27ae60 : 0xe74c3c;
    const leftBorder = gate.left.good ? 0x2ecc71 : 0xff6b6b;
    const rightBorder = gate.right.good ? 0x2ecc71 : 0xff6b6b;

    // Gate arch rectangles
    gate.leftRect = this.add.rectangle(leftX, screenY, gateW, gateH, leftColor, 0.7)
      .setStrokeStyle(3, leftBorder).setDepth(2);
    gate.rightRect = this.add.rectangle(rightX, screenY, gateW, gateH, rightColor, 0.7)
      .setStrokeStyle(3, rightBorder).setDepth(2);

    // Gate poles (vertical lines)
    gate.leftPole1 = this.add.rectangle(leftX - gateW / 2 + 3, screenY - 45, 5, 90, leftBorder).setDepth(2);
    gate.leftPole2 = this.add.rectangle(leftX + gateW / 2 - 3, screenY - 45, 5, 90, leftBorder).setDepth(2);
    gate.rightPole1 = this.add.rectangle(rightX - gateW / 2 + 3, screenY - 45, 5, 90, rightBorder).setDepth(2);
    gate.rightPole2 = this.add.rectangle(rightX + gateW / 2 - 3, screenY - 45, 5, 90, rightBorder).setDepth(2);

    // Modifier labels
    gate.leftText = this.add.text(leftX, screenY, gate.left.mod.label, {
      fontSize: '20px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3);

    gate.rightText = this.add.text(rightX, screenY, gate.right.mod.label, {
      fontSize: '20px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3);
  }

  destroyGateVisuals(gate) {
    [gate.leftRect, gate.rightRect, gate.leftText, gate.rightText,
      gate.leftPole1, gate.leftPole2, gate.rightPole1, gate.rightPole2].forEach(o => {
      if (o) o.destroy();
    });
    gate.leftRect = null;
  }

  applyGateMod(mod, good, gate, hitLeft) {
    const before = this.soldierCount;
    this.soldierCount = mod.apply(this.soldierCount);
    this.soldierCount = Math.max(1, Math.floor(this.soldierCount));

    this.updateSoldierVisuals();
    this.notifyUI(good ? 'good' : 'bad');

    // Flash the chosen gate
    const rect = hitLeft ? gate.leftRect : gate.rightRect;
    if (rect) {
      this.tweens.add({
        targets: rect,
        alpha: 1,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 120,
        yoyo: true,
      });
    }

    // Float number pop
    const popColor = good ? '#2ecc71' : '#e74c3c';
    const popLabel = mod.label;
    const pop = this.add.text(this.armyX, this.armyY - 40, popLabel, {
      fontSize: '26px',
      fontStyle: 'bold',
      fill: popColor,
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: pop,
      y: pop.y - 70,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => pop.destroy(),
    });
  }

  updateSoldierVisuals() {
    // Rebuild soldier circles inside the group
    this.soldierGroup.removeAll(true);

    const count = this.soldierCount;
    const displayCount = Math.min(count, 60); // cap visual circles
    const radius = 7;
    const spacing = 16;

    // Arrange in a roughly circular cluster
    const cols = Math.ceil(Math.sqrt(displayCount * 1.5));
    let placed = 0;
    for (let row = 0; placed < displayCount; row++) {
      for (let col = 0; col < cols && placed < displayCount; col++) {
        const offsetX = (col - cols / 2 + 0.5) * spacing + Phaser.Math.Between(-2, 2);
        const offsetY = (row - 1.5) * spacing * 0.75 + Phaser.Math.Between(-2, 2);
        const colors = [0x3498db, 0x2980b9, 0x5dade2, 0x85c1e9];
        const c = this.add.circle(offsetX, offsetY, radius, colors[placed % colors.length]);
        // Helmet dot
        const h = this.add.circle(offsetX, offsetY - radius + 2, radius * 0.4, 0x1a5276);
        this.soldierGroup.add(c);
        this.soldierGroup.add(h);
        placed++;
      }
    }
    this.soldierGroup.setDepth(5);
  }

  startBattle() {
    this.phase = 'battle';
    this.scrollSpeed = 0;
    this.battleTimer = 0;

    const W = this.W;
    const H = this.H;

    // Build enemy visuals
    const enemyCount = this.levelDef.enemies;
    this.enemyCount = enemyCount;
    this.enemyGroup = this.add.container(W / 2, H * 0.2).setDepth(4);
    this.buildEnemyVisuals(enemyCount);

    // Camera shake
    this.cameras.main.shake(400, 0.012);

    // Battle label
    const battleText = this.add.text(W / 2, H / 2, '⚔️  BATTLE!', {
      fontSize: '38px',
      fontStyle: 'bold',
      fill: '#ff4444',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: battleText,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 900,
      ease: 'Power2',
      onComplete: () => battleText.destroy(),
    });

    // Notify UI
    this.notifyUI();
  }

  buildEnemyVisuals(count) {
    this.enemyGroup.removeAll(true);
    const displayCount = Math.min(count, 60);
    const cols = Math.ceil(Math.sqrt(displayCount * 1.5));
    let placed = 0;
    for (let row = 0; placed < displayCount; row++) {
      for (let col = 0; col < cols && placed < displayCount; col++) {
        const offsetX = (col - cols / 2 + 0.5) * 16 + Phaser.Math.Between(-2, 2);
        const offsetY = (row - 1.5) * 12 + Phaser.Math.Between(-2, 2);
        const c = this.add.circle(offsetX, offsetY, 7, 0xe74c3c);
        const h = this.add.circle(offsetX, offsetY - 5, 3, 0x922b21);
        this.enemyGroup.add(c);
        this.enemyGroup.add(h);
        placed++;
      }
    }
  }

  updateBattle(dt) {
    const W = this.W;
    const H = this.H;

    this.battleTimer += dt;

    // March armies toward each other
    const armyTargetY = H * 0.55;
    const enemyTargetY = H * 0.35;

    this.soldierGroup.y = Phaser.Math.Linear(this.soldierGroup.y, armyTargetY, 0.04);
    this.enemyGroup.y = Phaser.Math.Linear(this.enemyGroup.y, enemyTargetY, 0.04);

    // Combat ticks
    if (this.battleTimer >= this.battleInterval) {
      this.battleTimer = 0;

      if (this.soldierCount > 0 && this.enemyCount > 0) {
        // Each side loses one
        this.soldierCount = Math.max(0, this.soldierCount - 1);
        this.enemyCount = Math.max(0, this.enemyCount - 1);

        this.updateSoldierVisuals();
        this.soldierGroup.y = Phaser.Math.Linear(this.soldierGroup.y, armyTargetY, 0.04);
        this.buildEnemyVisuals(this.enemyCount);
        this.enemyGroup.y = Phaser.Math.Linear(this.enemyGroup.y, enemyTargetY, 0.04);

        this.notifyUI();

        // Shake on combat
        this.cameras.main.shake(60, 0.005);
      } else {
        // Battle over
        this.endBattle();
      }
    }
  }

  endBattle() {
    this.phase = 'result';

    if (this.soldierCount > 0) {
      // WIN
      this.time.delayedCall(600, () => {
        const nextLevel = this.currentLevel + 1;
        if (nextLevel > LEVELS.length) {
          this.scene.stop('UIScene');
          this.scene.start('WinScene', { level: this.currentLevel, allDone: true });
        } else {
          this.scene.stop('UIScene');
          this.scene.start('WinScene', { level: this.currentLevel, nextLevel });
        }
      });
    } else {
      // LOSE
      this.time.delayedCall(600, () => {
        this.scene.stop('UIScene');
        this.scene.start('LoseScene', { level: this.currentLevel });
      });
    }
  }

  notifyUI(flashType) {
    const uiScene = this.scene.get('UIScene');
    if (uiScene && uiScene.updateCount) {
      uiScene.updateCount(this.soldierCount, this.currentLevel, flashType);
    }
  }
}
