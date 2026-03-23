// src/systems/UpgradeSystem.js — Gate types, stackable upgrades, shop upgrades

// ── Gate definitions ──────────────────────────────────────────────────────────
// type: 'soldier' → modifies soldier count
// type: 'weapon'  → applies a weapon/ability upgrade (gold gate)
// type: 'stat'    → modifies a stat (fire rate, damage, etc.)

const SOLDIER_GOOD_MODS = [
  { label: '+3',   apply: (n) => n + 3  },
  { label: '+5',   apply: (n) => n + 5  },
  { label: '+8',   apply: (n) => n + 8  },
  { label: '+10',  apply: (n) => n + 10 },
  { label: '+12',  apply: (n) => n + 12 },
  { label: '×1.5', apply: (n) => Math.floor(n * 1.5) },
  { label: '×2',   apply: (n) => n * 2  },
];

const SOLDIER_BAD_MODS = [
  { label: '−10',  apply: (n) => Math.max(1, n - 10)              },
  { label: '−15',  apply: (n) => Math.max(1, n - 15)              },
  { label: '÷2',   apply: (n) => Math.max(1, Math.floor(n / 2))   },
];

// Gold weapon/ability gates — shown in gold arch
const WEAPON_GATES = [
  // Fire Modifiers
  { id: 'x2Bullets',    label: 'Double Shot',        color: '#ffd700', icon: '🔫' },
  { id: 'tripleShot',   label: 'Triple Shot',        color: '#ffcc00', icon: '🔱' },
  { id: 'sideCannons',  label: 'Side Cannons',       color: '#ffaa44', icon: '🗡️' },
  // Weapon Core Upgrades
  { id: 'betterGuns',   label: '+Fire Rate',         color: '#88ff44', icon: '⚡' },
  { id: 'damage25',     label: '+25% Damage',        color: '#ff6644', icon: '💢' },
  { id: 'bulletSpeed',  label: '+Bullet Speed',      color: '#66ccff', icon: '💨' },
  // Advanced Bullet Types
  { id: 'explosive',    label: 'Explosive Rounds',   color: '#ff8c00', icon: '💥' },
  { id: 'piercing',     label: 'Piercing Bullets',   color: '#88ff44', icon: '➡️' },
  { id: 'ricochet',     label: 'Ricochet',           color: '#aaddff', icon: '↩️' },
  // Active Abilities (cooldown-based)
  { id: 'grenade',      label: 'Grenade Throw',      color: '#ff4400', icon: '💣' },
  { id: 'airstrike',    label: 'Airstrike',          color: '#cc2200', icon: '✈️' },
  { id: 'shockwave',    label: 'Shockwave',          color: '#8844ff', icon: '🌊' },
  // Support Systems
  { id: 'homing',       label: 'Homing Bullets',     color: '#44ffcc', icon: '🎯' },
  { id: 'autoTurret',   label: 'Auto-turret',        color: '#aabb44', icon: '🤖' },
  // Defensive
  { id: 'armor',        label: '+Armor',             color: '#44aaff', icon: '🛡️' },
  { id: 'medic',        label: 'Medic Regen',        color: '#44ff88', icon: '❤️' },
  // Endgame
  { id: 'dragon',       label: 'Dragon Companion',   color: '#ff4400', icon: '🐉' },
];

// Between-run shop upgrades (persistent, bought with coins)
const SHOP_UPGRADES = [
  {
    id: 'startSoldiers',
    name: 'More Recruits',
    desc: '+5 starting soldiers',
    icon: '🪖',
    baseCost: 20,
    maxLevel: 10,
  },
  {
    id: 'baseDamage',
    name: 'Sharper Aim',
    desc: '+1 base bullet damage',
    icon: '🎯',
    baseCost: 30,
    maxLevel: 5,
  },
  {
    id: 'baseFireRate',
    name: 'Trigger Happy',
    desc: '−0.1s fire interval',
    icon: '⚡',
    baseCost: 40,
    maxLevel: 5,
  },
  {
    id: 'startUpgrade',
    name: 'Head Start',
    desc: 'Begin with Spread Shot',
    icon: '🌀',
    baseCost: 80,
    maxLevel: 1,
  },
];

// Maximum dragon companions allowed
const MAX_DRAGON_COUNT = 3;

// Weapon types — collected via barrels on the road
const WEAPON_TYPES = {
  handgun:  { name: 'Handgun',        fireInterval: 0.6, damage: 1,  bulletSpeed: 1.0, spread: 0,    bullets: 1, color: 0xaaaaaa, label: '🔫 Handgun' },
  assault:  { name: 'Assault Rifle',   fireInterval: 0.3, damage: 1,  bulletSpeed: 1.2, spread: 0.05, bullets: 1, color: 0x2a5a2a, label: '🔫 Assault' },
  shotgun:  { name: 'Shotgun',         fireInterval: 0.9, damage: 2,  bulletSpeed: 0.8, spread: 0.4,  bullets: 5, color: 0x8a5a2a, label: '💥 Shotgun' },
  minigun:  { name: 'Minigun',         fireInterval: 0.1, damage: 1,  bulletSpeed: 1.0, spread: 0.15, bullets: 1, color: 0x3a3a3a, label: '🔧 Minigun' },
  rocket:   { name: 'Rocket',          fireInterval: 1.5, damage: 8,  bulletSpeed: 0.6, spread: 0,    bullets: 1, color: 0x5a2a2a, label: '🚀 Rocket', explosive: true },
  sniper:   { name: 'Sniper',          fireInterval: 1.8, damage: 12, bulletSpeed: 2.0, spread: 0,    bullets: 1, color: 0x2a2a5a, label: '🎯 Sniper' },
};

const BARREL_REWARDS = [
  { type: 'weapon', id: 'assault',  label: 'ASSAULT RIFLE',  good: true },
  { type: 'weapon', id: 'shotgun',  label: 'SHOTGUN',        good: true },
  { type: 'weapon', id: 'minigun',  label: 'MINIGUN',        good: true },
  { type: 'weapon', id: 'rocket',   label: 'ROCKET',         good: true },
  { type: 'weapon', id: 'sniper',   label: 'SNIPER',         good: true },
  { type: 'soldiers', count: 5,     label: '+5 SOLDIERS',    good: true },
  { type: 'soldiers', count: 8,     label: '+8 SOLDIERS',    good: true },
  { type: 'soldiers', count: -5,    label: '-5 SOLDIERS',    good: false },
  { type: 'soldiers', count: -10,   label: '-10 SOLDIERS',   good: false },
  { type: 'fireRate', id: 'betterGuns', label: 'FIRE RATE UP', good: true },
  { type: 'fireRate', id: 'betterGuns', label: 'LOW FIRE RATE', good: false, penalty: true },
  { type: 'damage', id: 'damage25', label: '+25% DAMAGE',    good: true },
];

// ── UpgradeSystem class ───────────────────────────────────────────────────────

class UpgradeSystem {
  constructor(scene) {
    this._scene = scene;
  }

  /** Return the full WEAPON_GATES list. */
  static get WEAPON_GATES() { return WEAPON_GATES; }
  static get SHOP_UPGRADES() { return SHOP_UPGRADES; }
  static get SOLDIER_GOOD_MODS() { return SOLDIER_GOOD_MODS; }
  static get SOLDIER_BAD_MODS()  { return SOLDIER_BAD_MODS;  }
  static get MAX_DRAGON_COUNT()  { return MAX_DRAGON_COUNT;   }
  static get WEAPON_TYPES()      { return WEAPON_TYPES;       }
  static get BARREL_REWARDS()    { return BARREL_REWARDS;     }

  /**
   * Apply a weapon gate upgrade to the state object.
   * @param {string} id  upgrade id from WEAPON_GATES
   * @param {object} state  { upgrades, soldierCount, baseScrollSpeed, ... }
   */
  apply(id, state) {
    state.upgrades[id] = (state.upgrades[id] || 0) + 1;
    const count = state.upgrades[id];

    switch (id) {
      case 'spreadShot':
        // Each stack adds +1 extra bullet (max 6 total = 5 stacks)
        break;

      case 'explosive':
        // AOE splash on hit — stacks increase radius
        break;

      case 'homing':
        // Bullets track nearest enemy
        break;

      case 'ricochet':
        // Bullets bounce to next target after hit
        break;

      case 'x2Bullets':
        // Double shots per fire tick (up to 4× with 2 stacks)
        break;

      case 'tripleShot':
        // Fires 3 bullets per position in a triangle pattern
        break;

      case 'betterGuns':
        // Fire interval decreases
        break;

      case 'damage25':
        // +25% base damage per stack
        break;

      case 'bulletSpeed':
        // +30% bullet speed per stack
        break;

      case 'sideCannons':
        // Up to 2 side cannons
        break;

      case 'armor':
        // Soldiers take 2 hits instead of 1
        break;

      case 'medic':
        // Regen soldiers every few seconds
        break;

      case 'piercing':
        // Bullets pass through multiple enemies
        break;

      case 'grenade':
        // Cooldown-based grenade throw ability
        break;

      case 'airstrike':
        // Cooldown-based airstrike ability
        break;

      case 'shockwave':
        // Cooldown-based shockwave ability
        break;

      case 'autoTurret':
        // Auto-turret companion follows army and shoots
        break;

      case 'dragon':
        // Dragon companion (stackable, flies and attacks)
        break;
    }
  }

  /**
   * Calculate effective stats from base + upgrades.
   * Returns { damage, fireInterval, bulletCount, spreadAngles, hasHoming, hasExplosive,
   *           hasRicochet, hasSideCannons, armorHits, hasArmor, hasMedic }
   */
  getStats(upgrades, shopMeta, weaponType) {
    shopMeta = shopMeta || {};

    const dmgBonus    = (upgrades.damage25  || 0) * 0.25;
    const baseDmg     = 1 + (shopMeta.baseDamage || 0);
    let damage        = Math.ceil(baseDmg * (1 + dmgBonus));

    const baseInterval = Math.max(0.15, 0.7 - (shopMeta.baseFireRate || 0) * 0.1);
    const gunStacks    = upgrades.betterGuns || 0;
    let fireInterval   = Math.max(0.12, baseInterval / (1 + gunStacks * 0.5));

    // Bullet speed multiplier
    const bulletSpeedStacks = upgrades.bulletSpeed || 0;
    let bulletSpeedMult = 1 + bulletSpeedStacks * 0.3;

    // Bullet count per shot
    const spreadStacks = upgrades.spreadShot || 0;
    const x2Stacks     = upgrades.x2Bullets  || 0;
    const tripleStacks = upgrades.tripleShot || 0;
    const baseBullets  = 1 + spreadStacks;  // 1 → up to 6 with stacks
    let bulletCount    = baseBullets * (x2Stacks > 0 ? 2 : 1);
    // Triple shot: fire 3 bullets per position in a triangle pattern
    if (tripleStacks > 0) bulletCount *= 3;

    // Spread angles (in radians) for spread shot
    const spreadAngles = [];
    if (spreadStacks > 0) {
      const totalBullets = 1 + spreadStacks; // 2, 3, 4, 5, 6 …
      const maxAngle     = Math.min(0.5, spreadStacks * 0.18);
      for (let i = 0; i < totalBullets; i++) {
        const t = totalBullets === 1 ? 0 : (i / (totalBullets - 1) - 0.5) * 2;
        spreadAngles.push(t * maxAngle);
      }
    } else {
      spreadAngles.push(0); // straight shot
    }

    // Triple shot adds vertical spread angles
    const tripleAngles = [];
    if (tripleStacks > 0) {
      tripleAngles.push(-0.15, 0, 0.15);
    } else {
      tripleAngles.push(0);
    }

    // Dragon companion count (stackable)
    const dragonCount = Math.min(upgrades.dragon || 0, MAX_DRAGON_COUNT);

    // Compute explosive from upgrades first
    let hasExplosive = (upgrades.explosive || 0) > 0;
    let explosiveRadius = 4.0 + (upgrades.explosive || 0) * 1.5;

    // Apply weapon type overrides
    if (weaponType && WEAPON_TYPES[weaponType]) {
      const wt = WEAPON_TYPES[weaponType];
      damage = Math.ceil(damage * wt.damage);
      fireInterval = Math.max(0.05, wt.fireInterval);
      bulletSpeedMult *= wt.bulletSpeed;
      if (wt.explosive) {
        hasExplosive = true;
        explosiveRadius = Math.max(explosiveRadius, 5.0);
      }
      // Apply weapon spread only if no spread shot upgrade
      if (wt.bullets > 1 && spreadStacks === 0) {
        spreadAngles.length = 0;
        bulletCount = wt.bullets;
        for (let bi = 0; bi < wt.bullets; bi++) {
          const t = (bi / (wt.bullets - 1) - 0.5) * 2;
          spreadAngles.push(t * wt.spread);
        }
      }
    }

    return {
      damage,
      fireInterval,
      bulletCount,
      bulletSpeedMult,
      spreadAngles,
      tripleAngles,
      hasHoming:    (upgrades.homing    || 0) > 0,
      hasExplosive,
      explosiveRadius,
      hasRicochet:  (upgrades.ricochet  || 0) > 0,
      ricochetCount: upgrades.ricochet  || 0,
      hasSideCannons: (upgrades.sideCannons || 0) > 0,
      sideCannons:  Math.min(upgrades.sideCannons || 0, 2),
      armorHits:    (upgrades.armor || 0) > 0 ? 2 : 1,
      hasArmor:     (upgrades.armor || 0) > 0,
      hasMedic:     (upgrades.medic || 0) > 0,
      hasPiercing:  (upgrades.piercing || 0) > 0,
      pierceCount:  Math.min((upgrades.piercing || 0) + 1, 5),
      hasTripleShot: tripleStacks > 0,
      // Active abilities
      hasGrenade:   (upgrades.grenade  || 0) > 0,
      grenadeDamage: 8 + (upgrades.grenade || 0) * 4,
      grenadeRadius: 5.0 + (upgrades.grenade || 0) * 1.0,
      hasAirstrike: (upgrades.airstrike || 0) > 0,
      airstrikeDamage: 15 + (upgrades.airstrike || 0) * 5,
      hasShockwave: (upgrades.shockwave || 0) > 0,
      shockwaveDamage: 5 + (upgrades.shockwave || 0) * 3,
      shockwaveRadius: 8.0 + (upgrades.shockwave || 0) * 2.0,
      // Support systems
      hasAutoTurret: (upgrades.autoTurret || 0) > 0,
      autoTurretCount: Math.min(upgrades.autoTurret || 0, 2),
      // Endgame
      hasDragon: dragonCount > 0,
      dragonCount,
    };
  }

  /**
   * Load persistent shop meta-upgrades from localStorage.
   * @returns {object}
   */
  static loadShopMeta() {
    try {
      const raw = localStorage.getItem('armyrunner_shop');
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  }

  /**
   * Save persistent shop meta-upgrades to localStorage.
   */
  static saveShopMeta(meta) {
    try {
      localStorage.setItem('armyrunner_shop', JSON.stringify(meta));
    } catch (_) {}
  }
}
