// src/SegmentManager.js — Segment definitions, sequencing, and spawning

const ENEMY_COUNT_SCALE_PER_CYCLE = 0.7;

const BOSS_HP = { ogre: 280, giant: 600, fireDragon: 850 };

const IDENTITY_MOD = { apply: (n) => n };

const MAP_LAYOUTS = [
  { name: 'Standard',  segmentOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  { name: 'Rush',      segmentOrder: [0, 2, 4, 3, 6, 5, 7, 1, 8] },
  { name: 'Gauntlet',  segmentOrder: [0, 1, 4, 2, 7, 3, 5, 6, 8] },
  { name: 'Endurance', segmentOrder: [0, 1, 2, 5, 3, 6, 4, 7, 8] },
  { name: 'Chaos',     segmentOrder: [2, 0, 3, 1, 6, 4, 5, 8, 7] },
];

const SEGMENT_DEFS = [
  {
    id: 1,
    name: 'Intro',
    safeReward: { type: 'soldiers', count: 3, label: '+3' },
    riskReward: { type: 'soldiers', count: 10, label: '+10' },
    enemies: [
      { count: 12, enemyType: 'zombie', hp: 10 },
      { count: 8, enemyType: 'fast', hp: 4 },
      { count: 4, enemyType: 'zombie', hp: 10, xOffset: -4 },
    ],
    boss: null,
    duration: 40,
    riskNarrow: false,
  },
  {
    id: 2,
    name: 'First Decision',
    safeReward: { type: 'soldiers', count: -3, label: '-3 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 3) } },
    riskReward: { type: 'soldiers', count: 12, label: '+12' },
    enemies: [
      { count: 14, enemyType: 'zombie', hp: 10 },
      { count: 8, enemyType: 'fast', hp: 4 },
      { count: 4, enemyType: 'zombie', hp: 10, xOffset: 4 },
    ],
    boss: null,
    duration: 40,
    riskNarrow: true,
  },
  {
    id: 3,
    name: 'Pressure Intro',
    safeReward: { type: 'soldiers', count: -5, label: '-5 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 5) } },
    riskReward: { type: 'soldiers', count: 10, label: '+10' },
    enemies: [
      { count: 14, enemyType: 'zombie', hp: 12, xOffset: 0 },
      { count: 8, enemyType: 'fast', hp: 6, xOffset: -3 },
      { count: 5, enemyType: 'exploding', hp: 6 },
    ],
    boss: null,
    duration: 45,
    riskNarrow: true,
  },
  {
    id: 4,
    name: 'Skill Check',
    safeReward: { type: 'soldiers', count: -5, label: '-5 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 5) } },
    riskReward: { type: 'soldiers', count: 15, label: '+15' },
    enemies: [
      { count: 12, enemyType: 'zombie', hp: 15 },
      { count: 8, enemyType: 'exploding', hp: 6 },
      { count: 6, enemyType: 'fast', hp: 6, xOffset: 3 },
      { count: 3, enemyType: 'tank', hp: 40 },
    ],
    boss: null,
    duration: 45,
    riskNarrow: true,
  },
  {
    id: 5,
    name: 'Mini Boss',
    safeReward: { type: 'soldiers', count: 5, label: '+5 \u{1F6E1}\uFE0F' },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [],
    boss: 'ogre',
    duration: 50,
    riskNarrow: false,
  },
  {
    id: 6,
    name: 'Build Defining',
    safeReward: { type: 'soldiers', count: -5, label: '-5 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 5) } },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [
      { count: 16, enemyType: 'zombie', hp: 15, xOffset: 0 },
      { count: 10, enemyType: 'fast', hp: 6, xOffset: -3 },
      { count: 5, enemyType: 'tank', hp: 40, xOffset: 2 },
      { count: 4, enemyType: 'exploding', hp: 9 },
      { count: 3, enemyType: 'shield', hp: 32 },
    ],
    boss: null,
    duration: 55,
    riskNarrow: true,
  },
  {
    id: 7,
    name: 'Heavy Assault',
    safeReward: { type: 'soldiers', count: -8, label: '-8 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 8) } },
    riskReward: { type: 'soldiers', count: 15, label: '+15' },
    enemies: [
      { count: 20, enemyType: 'fast', hp: 10, xOffset: -2 },
      { count: 10, enemyType: 'exploding', hp: 9, xOffset: 2 },
      { count: 5, enemyType: 'tank', hp: 48 },
      { count: 4, enemyType: 'charger', hp: 15, xOffset: -3 },
      { count: 4, enemyType: 'zombie', hp: 15, xOffset: 5 },
    ],
    boss: null,
    duration: 55,
    riskNarrow: true,
  },
  {
    id: 8,
    name: 'Titan Gate',
    safeReward: { type: 'soldiers', count: 5, label: '+5' },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [],
    boss: 'giant',
    duration: 55,
    riskNarrow: false,
  },
  {
    id: 9,
    name: 'Dragon\'s Lair',
    safeReward: { type: 'soldiers', count: 8, label: '+8' },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [],
    boss: 'fireDragon',
    duration: 50,
    riskNarrow: false,
  },
];

const EXTRA_SEGMENTS = [
  {
    id: 10, name: 'Narrow Corridor',
    safeReward: { type: 'soldiers', count: -3, label: '-3 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 3) } },
    riskReward: { type: 'soldiers', count: 15, label: '+15' },
    enemies: [
      { count: 16, enemyType: 'fast', hp: 6, xOffset: 0 },
      { count: 5, enemyType: 'tank', hp: 40 },
    ],
    boss: null, duration: 45, riskNarrow: true,
  },
  {
    id: 11, name: 'Heavy Swarm',
    safeReward: { type: 'soldiers', count: -8, label: '-8 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 8) } },
    riskReward: { type: 'soldiers', count: 12, label: '+12' },
    enemies: [
      { count: 25, enemyType: 'zombie', hp: 10, xOffset: 0 },
      { count: 10, enemyType: 'fast', hp: 6, xOffset: -4 },
      { count: 10, enemyType: 'fast', hp: 6, xOffset: 4 },
    ],
    boss: null, duration: 50, riskNarrow: false,
  },
  {
    id: 12, name: 'Elite Ambush',
    safeReward: { type: 'soldiers', count: 5, label: '+5' },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [
      { count: 8, enemyType: 'tank', hp: 50, xOffset: -3 },
      { count: 8, enemyType: 'tank', hp: 50, xOffset: 3 },
      { count: 6, enemyType: 'exploding', hp: 9 },
    ],
    boss: null, duration: 55, riskNarrow: true,
  },
  {
    id: 13, name: 'Mixed Assault',
    safeReward: { type: 'soldiers', count: -12, label: '-12 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 12) } },
    riskReward: { type: 'soldiers', count: 15, label: '+15' },
    enemies: [
      { count: 14, enemyType: 'zombie', hp: 15 },
      { count: 8, enemyType: 'fast', hp: 10, xOffset: -4 },
      { count: 5, enemyType: 'exploding', hp: 9, xOffset: 3 },
      { count: 4, enemyType: 'tank', hp: 40 },
    ],
    boss: null, duration: 55, riskNarrow: false,
  },
  {
    id: 14, name: 'Obstacle Maze',
    safeReward: { type: 'soldiers', count: -5, label: '-5 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 5) } },
    riskReward: { type: 'soldiers', count: 18, label: '+18' },
    enemies: [
      { count: 18, enemyType: 'zombie', hp: 12, xOffset: 0 },
      { count: 8, enemyType: 'exploding', hp: 9, xOffset: 2 },
    ],
    boss: null, duration: 45, riskNarrow: true,
  },
  {
    id: 15, name: 'Boss Rush',
    safeReward: { type: 'soldiers', count: 8, label: '+8' },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [
      { count: 6, enemyType: 'tank', hp: 60, xOffset: 0 },
      { count: 10, enemyType: 'zombie', hp: 18 },
      { count: 8, enemyType: 'fast', hp: 10, xOffset: -3 },
    ],
    boss: null, duration: 55, riskNarrow: false,
  },
  {
    id: 16, name: 'Shield Wall',
    safeReward: { type: 'soldiers', count: -3, label: '-3 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 3) } },
    riskReward: { type: 'soldiers', count: 15, label: '+15' },
    enemies: [
      { count: 10, enemyType: 'shield', hp: 32, xOffset: 0 },
      { count: 5, enemyType: 'tank', hp: 50, xOffset: -3 },
      { count: 8, enemyType: 'zombie', hp: 15, xOffset: 3 },
    ],
    boss: null, duration: 50, riskNarrow: true,
  },
  {
    id: 17, name: 'Speed Blitz',
    safeReward: { type: 'soldiers', count: -10, label: '-10 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 10) } },
    riskReward: { type: 'soldiers', count: 15, label: '+15' },
    enemies: [
      { count: 25, enemyType: 'fast', hp: 6, xOffset: 0 },
      { count: 12, enemyType: 'fast', hp: 10, xOffset: -4 },
      { count: 6, enemyType: 'charger', hp: 18, xOffset: 3 },
    ],
    boss: null, duration: 45, riskNarrow: false,
  },
  {
    id: 18, name: 'Splitter Swarm',
    safeReward: { type: 'soldiers', count: 5, label: '+5' },
    riskReward: { type: 'soldiers', count: 18, label: '+18' },
    enemies: [
      { count: 10, enemyType: 'splitter', hp: 18, xOffset: 0 },
      { count: 8, enemyType: 'zombie', hp: 12, xOffset: -3 },
      { count: 6, enemyType: 'fast', hp: 6, xOffset: 3 },
    ],
    boss: null, duration: 50, riskNarrow: false,
  },
  {
    id: 19, name: 'Charger Rush',
    safeReward: { type: 'soldiers', count: -3, label: '-3 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 3) } },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [
      { count: 12, enemyType: 'charger', hp: 18, xOffset: 0 },
      { count: 8, enemyType: 'charger', hp: 24, xOffset: -3 },
      { count: 5, enemyType: 'tank', hp: 40, xOffset: 3 },
    ],
    boss: null, duration: 45, riskNarrow: true,
  },
  {
    id: 20, name: 'Explosive Gauntlet',
    safeReward: { type: 'soldiers', count: -10, label: '-10 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 10) } },
    riskReward: { type: 'soldiers', count: 12, label: '+12' },
    enemies: [
      { count: 15, enemyType: 'exploding', hp: 9, xOffset: 0 },
      { count: 10, enemyType: 'exploding', hp: 12, xOffset: -3 },
      { count: 5, enemyType: 'tank', hp: 50, xOffset: 3 },
    ],
    boss: null, duration: 55, riskNarrow: false,
  },
  {
    id: 21, name: 'Ranged Siege',
    safeReward: { type: 'soldiers', count: 5, label: '+5' },
    riskReward: { type: 'soldiers', count: 18, label: '+18' },
    enemies: [
      { count: 10, enemyType: 'ranged', hp: 16, xOffset: 0 },
      { count: 8, enemyType: 'shield', hp: 32, xOffset: -4 },
      { count: 6, enemyType: 'zombie', hp: 18, xOffset: 4 },
    ],
    boss: null, duration: 50, riskNarrow: true,
  },
  {
    id: 22, name: 'Jump Maze',
    safeReward: { type: 'soldiers', count: -3, label: '-3 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 3) } },
    riskReward: { type: 'soldiers', count: 12, label: '+12' },
    enemies: [
      { count: 18, enemyType: 'jumping', hp: 10, xOffset: 0 },
      { count: 10, enemyType: 'fast', hp: 6, xOffset: -3 },
      { count: 6, enemyType: 'zombie', hp: 15, xOffset: 3 },
    ],
    boss: null, duration: 45, riskNarrow: false,
  },
  {
    id: 23, name: 'Resource Zone',
    safeReward: { type: 'soldiers', count: 8, label: '+8' },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [
      { count: 8, enemyType: 'zombie', hp: 10, xOffset: 0 },
      { count: 4, enemyType: 'fast', hp: 4, xOffset: -3 },
    ],
    boss: null, duration: 35, riskNarrow: false,
  },
  {
    id: 24, name: 'Mini-Boss Gauntlet',
    safeReward: { type: 'soldiers', count: -5, label: '-5 ☠️', bad: true, mod: { apply: (n) => Math.max(1, n - 5) } },
    riskReward: { type: 'soldiers', count: 20, label: '+20' },
    enemies: [
      { count: 3, enemyType: 'tank', hp: 80, xOffset: 0 },
      { count: 10, enemyType: 'zombie', hp: 18, xOffset: -3 },
      { count: 8, enemyType: 'fast', hp: 10, xOffset: 3 },
      { count: 5, enemyType: 'charger', hp: 24, xOffset: 0 },
    ],
    boss: null, duration: 55, riskNarrow: true,
  },
];

class SegmentManager {
  constructor(game) {
    this.game = game;
  }

  getSegDef(idx) {
    if (idx < SEGMENT_DEFS.length) return SEGMENT_DEFS[idx];
    return EXTRA_SEGMENTS[idx - SEGMENT_DEFS.length] || SEGMENT_DEFS[0];
  }

  buildInternalSegments() {
    const g = this.game;
    g.internalSegments = [];

    let segOrder;
    if (g.segmentCycle === 0) {
      const layout = MAP_LAYOUTS[g.mapLayout || 0] || MAP_LAYOUTS[0];
      segOrder = layout.segmentOrder;
    } else {
      const allSegs = [];
      for (let i = 0; i < SEGMENT_DEFS.length; i++) allSegs.push(i);
      for (let i = 0; i < EXTRA_SEGMENTS.length; i++) allSegs.push(SEGMENT_DEFS.length + i);
      // Fisher-Yates shuffle
      for (let i = allSegs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = allSegs[i]; allSegs[i] = allSegs[j]; allSegs[j] = tmp;
      }
      segOrder = allSegs.slice(0, 9);
      const hasBoss = segOrder.some(idx => {
        const d = this.getSegDef(idx);
        return d && d.boss;
      });
      if (!hasBoss) segOrder[segOrder.length - 1] = 4;
    }

    for (const segIdx of segOrder) {
      const def = this.getSegDef(segIdx);
      if (!def) continue;
      if (def.boss) {
        g.internalSegments.push({ type: 'boss', defIdx: segIdx });
        g.internalSegments.push({ type: 'gates', defIdx: segIdx });
      } else {
        g.internalSegments.push({ type: 'gates', defIdx: segIdx });
        g.internalSegments.push({ type: 'enemies', defIdx: segIdx });
      }
    }
  }

  triggerNextSegment() {
    const g = this.game;
    if (g.internalSegIdx >= g.internalSegments.length) {
      this.startNewCycle();
      return;
    }

    const seg = g.internalSegments[g.internalSegIdx++];
    const def = this.getSegDef(seg.defIdx);
    g.currentSegment = seg.defIdx;
    const spawnZ = g.cameraZ - 120;

    if (seg.type === 'gates') {
      this.spawnSegmentGates(def, spawnZ);
      g.nextSegmentDist = -g.cameraZ + 120 + 20;
    } else if (seg.type === 'enemies') {
      this.spawnEnemies(def);
      g.inCombat = true;
      g.world.combatLight.intensity = 1.5;
    } else if (seg.type === 'boss') {
      this.spawnBoss(def);
    }

    g.hud.updateHUD();
  }

  spawnSegmentGates(def, baseZ) {
    const g = this.game;
    // Left = SAFE gate
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
        mod: risk.mod || { apply: (n) => n + risk.count },
        good: true,
        reward: risk,
      };
    }

    g.gateSys.createGate(baseZ, leftConfig, rightConfig);

    // Spawn path obstacles (walls/barriers) before the gate
    g._spawnPathObstacles(baseZ, !!def.riskNarrow);

    // Spawn weapon barrels in the approach zone
    g.barrelSys.spawnBarrel(baseZ + 30);
    if (Math.random() < 0.6) {
      g.barrelSys.spawnBarrel(baseZ + 55);
    }
    if (Math.random() < 0.35) {
      g.barrelSys.spawnBarrel(baseZ + 80);
    }
  }

  spawnEnemies(def) {
    const g = this.game;
    const countMult = 1 + g.segmentCycle * ENEMY_COUNT_SCALE_PER_CYCLE;
    const segmentProgress = Math.min(1, g.internalSegIdx / Math.max(g.internalSegments.length, 1));
    const hpScale = 1 + segmentProgress * 2.0;
    const scaledEnemies = def.enemies.map(e => ({
      ...e,
      count: Math.ceil(e.count * countMult),
      hp: Math.ceil((e.hp || 1) * hpScale),
      xOffset: e.xOffset || 0,
    }));
    g.enemyMgr.spawnWave(scaledEnemies, -80, g.armyX, g.difficultyMult);
  }

  spawnBoss(def) {
    const g = this.game;
    const bossType = def.boss;
    if (!BOSS_HP[bossType]) {
      console.warn(`Unknown boss type "${bossType}", using default HP 100`);
    }
    const baseHp = BOSS_HP[bossType] || 100;

    g.currentBoss = bossType;
    if (bossType === 'ogre') g.milestone = 'Reached Ogre';
    else if (bossType === 'giant') g.milestone = 'Reached Giant';
    else if (bossType === 'fireDragon') g.milestone = 'Reached Fire Dragon';

    g.enemyMgr.spawnWave(
      [{ count: 1, enemyType: bossType, hp: baseHp }],
      -80,
      g.armyX,
      g.difficultyMult
    );
    g.inCombat = true;
    g.world.combatLight.intensity = 2.0;
    g.camCtrl.shake(0.5);

    if (window.audioManager) window.audioManager.bossRoar();
  }

  startNewCycle() {
    const g = this.game;
    g.segmentCycle++;
    g.difficultyMult += 0.3;
    g.milestone = 'Cycle ' + (g.segmentCycle + 1);
    g.milestoneSys.saveBestMilestone();

    g.scrollSpeed = Math.min(MAX_SCROLL_SPEED, BASE_SCROLL_SPEED + g.segmentCycle * SCROLL_SPEED_PER_CYCLE);

    g.effects.screenFlash(0x44aaff, 0.8);
    g.camCtrl.shake(1.0);
    g.hud.showCycleMessage('CYCLE ' + (g.segmentCycle + 1));

    g.world.applyEnvPalette(g.segmentCycle);

    g.currentSegment = 0;
    this.buildInternalSegments();
    g.internalSegIdx = 0;
    g.nextSegmentDist = -g.cameraZ + 60;
    g.hud.updateHUD();
  }

  isBossNearby() {
    const g = this.game;
    for (let i = g.internalSegIdx; i < Math.min(g.internalSegIdx + 3, g.internalSegments.length); i++) {
      if (g.internalSegments[i] && g.internalSegments[i].type === 'boss') return true;
    }
    return !!g.currentBoss;
  }
}
