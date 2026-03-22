// src/systems/UpgradeSystem.js — Gate types, stackable upgrades, shop upgrades

// ── Gate definitions ──────────────────────────────────────────────────────────
// type: 'soldier' → modifies soldier count
// type: 'weapon'  → applies a weapon/ability upgrade (gold gate)
// type: 'stat'    → modifies a stat (fire rate, damage, etc.)

const SOLDIER_GOOD_MODS = [
  { label: '+10',  apply: (n) => n + 10 },
  { label: '+15',  apply: (n) => n + 15 },
  { label: '+25',  apply: (n) => n + 25 },
  { label: '×2',   apply: (n) => n * 2  },
  { label: '×3',   apply: (n) => n * 3  },
];

const SOLDIER_BAD_MODS = [
  { label: '−10',  apply: (n) => Math.max(1, n - 10)              },
  { label: '−15',  apply: (n) => Math.max(1, n - 15)              },
  { label: '÷2',   apply: (n) => Math.max(1, Math.floor(n / 2))   },
];

// Gold weapon/ability gates — shown in gold arch
const WEAPON_GATES = [
  { id: 'spreadShot',   label: 'Spread Shot',       color: '#ffd700', icon: '🌀' },
  { id: 'explosive',    label: 'Explosive Rounds',  color: '#ff8c00', icon: '💥' },
  { id: 'homing',       label: 'Homing Bullets',    color: '#44ffcc', icon: '🎯' },
  { id: 'ricochet',     label: 'Ricochet',          color: '#aaddff', icon: '↩️' },
  { id: 'x2Bullets',   label: '×2 Bullets',         color: '#ffd700', icon: '🔫' },
  { id: 'betterGuns',  label: '+Fire Rate',          color: '#88ff44', icon: '⚡' },
  { id: 'damage25',    label: '+25% Damage',         color: '#ff6644', icon: '💢' },
  { id: 'sideCannons', label: 'Side Cannons',        color: '#ffaa44', icon: '🗡️'  },
  { id: 'armor',       label: '+Armor',              color: '#44aaff', icon: '🛡️' },
  { id: 'medic',       label: 'Medic Regen',         color: '#44ff88', icon: '❤️' },
  { id: 'piercing',   label: 'Piercing Bullets',    color: '#88ff44', icon: '➡️' },
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

      case 'betterGuns':
        // Fire interval decreases
        break;

      case 'damage25':
        // +25% base damage per stack
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
    }
  }

  /**
   * Calculate effective stats from base + upgrades.
   * Returns { damage, fireInterval, bulletCount, spreadAngles, hasHoming, hasExplosive,
   *           hasRicochet, hasSideCannons, armorHits, hasArmor, hasMedic }
   */
  getStats(upgrades, shopMeta) {
    shopMeta = shopMeta || {};

    const dmgBonus    = (upgrades.damage25  || 0) * 0.25;
    const baseDmg     = 1 + (shopMeta.baseDamage || 0);
    const damage      = Math.ceil(baseDmg * (1 + dmgBonus));

    const baseInterval = Math.max(0.15, 0.8 - (shopMeta.baseFireRate || 0) * 0.1);
    const gunStacks    = upgrades.betterGuns || 0;
    const fireInterval = Math.max(0.12, baseInterval / (1 + gunStacks * 0.5));

    // Bullet count per shot
    const spreadStacks = upgrades.spreadShot || 0;
    const x2Stacks     = upgrades.x2Bullets  || 0;
    const baseBullets  = 1 + spreadStacks;  // 1 → up to 6 with stacks
    const bulletCount  = baseBullets * (x2Stacks > 0 ? 2 : 1);

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

    return {
      damage,
      fireInterval,
      bulletCount,
      spreadAngles,
      hasHoming:    (upgrades.homing    || 0) > 0,
      hasExplosive: (upgrades.explosive || 0) > 0,
      explosiveRadius: 4.0 + (upgrades.explosive || 0) * 1.5,
      hasRicochet:  (upgrades.ricochet  || 0) > 0,
      ricochetCount: upgrades.ricochet  || 0,
      hasSideCannons: (upgrades.sideCannons || 0) > 0,
      sideCannons:  Math.min(upgrades.sideCannons || 0, 2),
      armorHits:    (upgrades.armor || 0) > 0 ? 2 : 1,
      hasArmor:     (upgrades.armor || 0) > 0,
      hasMedic:     (upgrades.medic || 0) > 0,
      hasPiercing:  (upgrades.piercing || 0) > 0,
      pierceCount:  Math.min((upgrades.piercing || 0) + 1, 5),
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
