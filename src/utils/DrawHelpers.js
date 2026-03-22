// src/utils/DrawHelpers.js — Phaser Graphics drawing utilities (no image files)

/**
 * Draw a uniformed soldier at (x, y) with given scale.
 * @param {Phaser.GameObjects.Graphics} gfx
 * @param {number} x  center-bottom of soldier
 * @param {number} y
 * @param {number} scale  1 = normal size (~28px tall)
 * @param {number} legPhase  0 or 1 for walk animation
 * @param {object} upgrades  { armor, betterGuns, ... }
 */
function drawSoldier(gfx, x, y, scale, legPhase, upgrades) {
  upgrades = upgrades || {};
  const s = scale || 1;

  // Leg coordinates (two legs alternating angles)
  const legX1 = -4 * s, legX2 = 4 * s;
  const legTopY = 14 * s;
  const legBotY = 26 * s;
  const swing = 6 * s;

  const l1bx = legPhase === 0 ? legX1 - swing : legX1 + swing;
  const l2bx = legPhase === 0 ? legX2 + swing : legX2 - swing;
  const l1by = legBotY;
  const l2by = legBotY;

  // Legs (dark olive)
  gfx.lineStyle(3 * s, 0x3a4a1a, 1);
  gfx.beginPath();
  gfx.moveTo(x + legX1, y + legTopY);
  gfx.lineTo(x + l1bx, y + l1by);
  gfx.strokePath();

  gfx.beginPath();
  gfx.moveTo(x + legX2, y + legTopY);
  gfx.lineTo(x + l2bx, y + l2by);
  gfx.strokePath();

  // Boot dots
  gfx.fillStyle(0x1a1a0a, 1);
  gfx.fillRect(x + l1bx - 2 * s, y + l1by - 2 * s, 5 * s, 3 * s);
  gfx.fillRect(x + l2bx - 2 * s, y + l2by - 2 * s, 5 * s, 3 * s);

  // Torso (olive green)
  const torsoColor = upgrades.armor ? 0x6b8040 : 0x556b2f;
  gfx.fillStyle(torsoColor, 1);
  gfx.fillRect(x - 6 * s, y, 12 * s, 14 * s);

  // Armor outline
  if (upgrades.armor) {
    gfx.lineStyle(1.5 * s, 0xadc570, 1);
    gfx.strokeRect(x - 6 * s, y, 12 * s, 14 * s);
  }

  // Belt
  gfx.fillStyle(0x3a2a10, 1);
  gfx.fillRect(x - 6 * s, y + 10 * s, 12 * s, 2 * s);

  // Arms
  const armColor = 0x556b2f;
  gfx.lineStyle(3 * s, armColor, 1);
  // Left arm
  gfx.beginPath();
  gfx.moveTo(x - 6 * s, y + 3 * s);
  gfx.lineTo(x - 11 * s, y + 10 * s);
  gfx.strokePath();
  // Right arm (holds gun)
  gfx.beginPath();
  gfx.moveTo(x + 6 * s, y + 3 * s);
  gfx.lineTo(x + 11 * s, y + 10 * s);
  gfx.strokePath();

  // Gun (extends from right arm)
  const gunLen = upgrades.betterGuns ? 14 * s : 10 * s;
  const gunH = upgrades.betterGuns ? 3 * s : 2 * s;
  gfx.fillStyle(0x222222, 1);
  gfx.fillRect(x + 9 * s, y + 9 * s, gunLen, gunH);
  // Gun barrel highlight
  gfx.fillStyle(0x444444, 1);
  gfx.fillRect(x + 9 * s, y + 9 * s, gunLen, gunH * 0.5);

  // Head (skin tone)
  gfx.fillStyle(0xd4a574, 1);
  gfx.fillCircle(x, y - 6 * s, 6 * s);

  // Helmet (dark green dome)
  gfx.fillStyle(0x2d4a1a, 1);
  gfx.beginPath();
  gfx.arc(x, y - 7 * s, 7 * s, Math.PI, 0, false);
  gfx.closePath();
  gfx.fillPath();

  // Helmet rim
  gfx.fillStyle(0x3a5a22, 1);
  gfx.fillRect(x - 7.5 * s, y - 7 * s, 15 * s, 2 * s);
}

/**
 * Draw an enemy soldier at (x, y).
 * @param {Phaser.GameObjects.Graphics} gfx
 * @param {number} x  center-bottom
 * @param {number} y
 * @param {number} scale
 * @param {number} legPhase  0 or 1
 * @param {string} type  'normal' | 'heavy' | 'boss'
 */
function drawEnemy(gfx, x, y, scale, legPhase, type) {
  type = type || 'normal';
  const s = scale || 1;

  let bodyColor, helmetColor, skinColor;
  if (type === 'heavy') {
    bodyColor = 0x8b1a1a;
    helmetColor = 0x5a0a0a;
    skinColor = 0xc08060;
  } else if (type === 'boss') {
    bodyColor = 0x6b0000;
    helmetColor = 0x3a0000;
    skinColor = 0xb07050;
  } else {
    bodyColor = 0xcc2222;
    helmetColor = 0x881111;
    skinColor = 0xd4a574;
  }

  const legX1 = -4 * s, legX2 = 4 * s;
  const legTopY = 14 * s;
  const legBotY = 26 * s;
  const swing = 6 * s;

  const l1bx = legPhase === 0 ? legX1 - swing : legX1 + swing;
  const l2bx = legPhase === 0 ? legX2 + swing : legX2 - swing;

  // Legs
  gfx.lineStyle(3 * s, 0x550a0a, 1);
  gfx.beginPath();
  gfx.moveTo(x + legX1, y + legTopY);
  gfx.lineTo(x + l1bx, y + legBotY);
  gfx.strokePath();
  gfx.beginPath();
  gfx.moveTo(x + legX2, y + legTopY);
  gfx.lineTo(x + l2bx, y + legBotY);
  gfx.strokePath();

  // Boots
  gfx.fillStyle(0x1a0a0a, 1);
  gfx.fillRect(x + l1bx - 2 * s, y + legBotY - 2 * s, 5 * s, 3 * s);
  gfx.fillRect(x + l2bx - 2 * s, y + legBotY - 2 * s, 5 * s, 3 * s);

  // Torso
  gfx.fillStyle(bodyColor, 1);
  gfx.fillRect(x - 6 * s, y, 12 * s, 14 * s);

  // Heavy has armor plates
  if (type === 'heavy') {
    gfx.lineStyle(1.5 * s, 0xcc4444, 1);
    gfx.strokeRect(x - 6 * s, y, 12 * s, 14 * s);
    gfx.fillStyle(0xaa2222, 1);
    gfx.fillRect(x - 6 * s, y + 4 * s, 12 * s, 2 * s);
  }

  // Belt
  gfx.fillStyle(0x2a1010, 1);
  gfx.fillRect(x - 6 * s, y + 10 * s, 12 * s, 2 * s);

  // Arms
  gfx.lineStyle(3 * s, bodyColor, 1);
  gfx.beginPath();
  gfx.moveTo(x - 6 * s, y + 3 * s);
  gfx.lineTo(x - 11 * s, y + 10 * s);
  gfx.strokePath();
  gfx.beginPath();
  gfx.moveTo(x + 6 * s, y + 3 * s);
  gfx.lineTo(x + 11 * s, y + 10 * s);
  gfx.strokePath();

  // Enemy gun (pointing left toward player direction)
  gfx.fillStyle(0x333333, 1);
  gfx.fillRect(x - 19 * s, y + 9 * s, 10 * s, 2 * s);

  // Head
  gfx.fillStyle(skinColor, 1);
  gfx.fillCircle(x, y - 6 * s, 6 * s);

  // Angular spiky helmet
  gfx.fillStyle(helmetColor, 1);
  // Main dome
  gfx.beginPath();
  gfx.arc(x, y - 8 * s, 7 * s, Math.PI, 0, false);
  gfx.closePath();
  gfx.fillPath();
  // Spike on top
  gfx.beginPath();
  gfx.moveTo(x - 3 * s, y - 13 * s);
  gfx.lineTo(x, y - 20 * s);
  gfx.lineTo(x + 3 * s, y - 13 * s);
  gfx.closePath();
  gfx.fillPath();
  // Rim
  gfx.fillStyle(0xaa1111, 1);
  gfx.fillRect(x - 8 * s, y - 8 * s, 16 * s, 2 * s);
  // Visor strip
  gfx.fillStyle(0x220000, 1);
  gfx.fillRect(x - 5 * s, y - 8 * s, 10 * s, 3 * s);
}

/**
 * Draw a tree/scenery object.
 * @param {Phaser.GameObjects.Graphics} gfx
 * @param {number} x  center-bottom
 * @param {number} y
 * @param {number} size  scale factor (1 = normal)
 * @param {string} type  'pine' | 'palm' | 'cactus' | 'dead' | 'snow_pine'
 */
function drawTree(gfx, x, y, size, type) {
  size = size || 1;
  type = type || 'pine';

  if (type === 'pine' || type === 'snow_pine') {
    // Trunk
    gfx.fillStyle(0x5c3a1a, 1);
    gfx.fillRect(x - 4 * size, y - 18 * size, 8 * size, 18 * size);

    // Three tiers of foliage
    const leafColor = type === 'snow_pine' ? 0x3a6632 : 0x2d6b2d;
    const snowColor = 0xeef5ff;
    for (let tier = 0; tier < 3; tier++) {
      const tierW = (22 - tier * 4) * size;
      const tierH = (16 - tier * 2) * size;
      const tierY = y - 18 * size - tier * 12 * size;
      gfx.fillStyle(leafColor, 1);
      gfx.beginPath();
      gfx.moveTo(x, tierY - tierH);
      gfx.lineTo(x + tierW / 2, tierY);
      gfx.lineTo(x - tierW / 2, tierY);
      gfx.closePath();
      gfx.fillPath();
      if (type === 'snow_pine') {
        // Snow caps
        gfx.fillStyle(snowColor, 0.85);
        gfx.beginPath();
        gfx.moveTo(x, tierY - tierH);
        gfx.lineTo(x + tierW * 0.35, tierY - tierH * 0.45);
        gfx.lineTo(x - tierW * 0.35, tierY - tierH * 0.45);
        gfx.closePath();
        gfx.fillPath();
      }
    }

  } else if (type === 'palm') {
    // Curved trunk (approximate with lines)
    const trunkColor = 0x7a5c28;
    gfx.lineStyle(5 * size, trunkColor, 1);
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x + 4 * size, y - 20 * size);
    gfx.lineTo(x + 2 * size, y - 36 * size);
    gfx.strokePath();

    // Leaves (arcs emanating from top)
    gfx.lineStyle(3 * size, 0x2d8b2d, 1);
    const leafTip = { x: x + 2 * size, y: y - 36 * size };
    const leafAngles = [-80, -50, -20, 10, 40, -110, -140];
    for (const angle of leafAngles) {
      const rad = (angle * Math.PI) / 180;
      const leafLen = (18 + Math.abs(Math.sin(rad)) * 8) * size;
      gfx.beginPath();
      gfx.moveTo(leafTip.x, leafTip.y);
      gfx.lineTo(leafTip.x + Math.cos(rad) * leafLen, leafTip.y + Math.sin(rad) * leafLen);
      gfx.strokePath();
    }
    // Coconut cluster
    gfx.fillStyle(0x8b6914, 1);
    gfx.fillCircle(leafTip.x, leafTip.y + 2 * size, 3 * size);

  } else if (type === 'cactus') {
    const cactusColor = 0x3a7a2a;
    // Main body
    gfx.fillStyle(cactusColor, 1);
    gfx.fillRect(x - 5 * size, y - 40 * size, 10 * size, 40 * size);
    // Left arm
    gfx.fillRect(x - 16 * size, y - 30 * size, 11 * size, 6 * size);
    gfx.fillRect(x - 16 * size, y - 36 * size, 6 * size, 10 * size);
    // Right arm
    gfx.fillRect(x + 5 * size, y - 26 * size, 11 * size, 6 * size);
    gfx.fillRect(x + 10 * size, y - 34 * size, 6 * size, 14 * size);
    // Spine dots
    gfx.fillStyle(0xffffcc, 0.6);
    for (let i = 0; i < 5; i++) {
      gfx.fillCircle(x - 4 * size + i * 2 * size, y - 10 * size - i * 7 * size, 1 * size);
    }

  } else if (type === 'dead') {
    // Dead/bare tree
    gfx.lineStyle(4 * size, 0x4a3520, 1);
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x, y - 35 * size);
    gfx.strokePath();
    gfx.lineStyle(3 * size, 0x4a3520, 1);
    gfx.beginPath();
    gfx.moveTo(x, y - 22 * size);
    gfx.lineTo(x - 12 * size, y - 32 * size);
    gfx.strokePath();
    gfx.beginPath();
    gfx.moveTo(x, y - 26 * size);
    gfx.lineTo(x + 10 * size, y - 36 * size);
    gfx.strokePath();
    gfx.beginPath();
    gfx.moveTo(x, y - 15 * size);
    gfx.lineTo(x - 8 * size, y - 22 * size);
    gfx.strokePath();
  }
}

/**
 * Draw a boss character (large, themed).
 * @param {Phaser.GameObjects.Graphics} gfx
 * @param {number} x  center
 * @param {number} y  top of boss
 * @param {number} scale
 * @param {string} type  boss type from LEVEL_DEFS
 * @param {boolean} enraged  changes color/style
 */
function drawBoss(gfx, x, y, scale, type, enraged) {
  scale = scale || 1;
  const s = scale;
  const S = scale * 2.5; // boss is much bigger than soldier

  let bodyColor, accentColor, helmetColor, skinColor;

  switch (type) {
    case 'forest_warlord':
      bodyColor = enraged ? 0x3a6b1a : 0x2d5a14;
      accentColor = 0x8bc34a;
      helmetColor = 0x1a3a0a;
      skinColor = 0xb0925a;
      break;
    case 'desert_general':
      bodyColor = enraged ? 0xc8952a : 0xb8850a;
      accentColor = 0xf5c842;
      helmetColor = 0x7a5a00;
      skinColor = 0xd4a870;
      break;
    case 'arctic_overlord':
      bodyColor = enraged ? 0x6699cc : 0x4477aa;
      accentColor = 0xddeeff;
      helmetColor = 0x224466;
      skinColor = 0xe8e0d8;
      break;
    case 'demon_lord':
      bodyColor = enraged ? 0xcc0000 : 0x880000;
      accentColor = 0xff4400;
      helmetColor = 0x440000;
      skinColor = 0x882222;
      break;
    default: // field_commander
      bodyColor = enraged ? 0x4a6b22 : 0x364f18;
      accentColor = 0x8bc34a;
      helmetColor = 0x1e3010;
      skinColor = 0xc09060;
  }

  const bY = y; // top of boss area (we draw downward from here)

  // Legs
  gfx.lineStyle(7 * S, 0x333333, 1);
  gfx.beginPath();
  gfx.moveTo(x - 10 * S, bY + 40 * S);
  gfx.lineTo(x - 12 * S, bY + 60 * S);
  gfx.strokePath();
  gfx.beginPath();
  gfx.moveTo(x + 10 * S, bY + 40 * S);
  gfx.lineTo(x + 12 * S, bY + 60 * S);
  gfx.strokePath();

  // Boots
  gfx.fillStyle(0x111111, 1);
  gfx.fillRect(x - 16 * S, bY + 58 * S, 10 * S, 5 * S);
  gfx.fillRect(x + 7 * S, bY + 58 * S, 10 * S, 5 * S);

  // Torso (large)
  gfx.fillStyle(bodyColor, 1);
  gfx.fillRect(x - 18 * S, bY + 14 * S, 36 * S, 28 * S);

  // Shoulder pads
  gfx.fillStyle(accentColor, 1);
  gfx.fillRect(x - 24 * S, bY + 14 * S, 10 * S, 8 * S);
  gfx.fillRect(x + 14 * S, bY + 14 * S, 10 * S, 8 * S);

  // Chest stripe / medal
  gfx.fillStyle(accentColor, 0.8);
  gfx.fillRect(x - 3 * S, bY + 18 * S, 6 * S, 20 * S);
  gfx.fillCircle(x, bY + 22 * S, 4 * S);

  // Arms (thick)
  gfx.lineStyle(8 * S, bodyColor, 1);
  gfx.beginPath();
  gfx.moveTo(x - 18 * S, bY + 18 * S);
  gfx.lineTo(x - 28 * S, bY + 36 * S);
  gfx.strokePath();
  gfx.beginPath();
  gfx.moveTo(x + 18 * S, bY + 18 * S);
  gfx.lineTo(x + 28 * S, bY + 36 * S);
  gfx.strokePath();

  // Weapon (type-specific)
  if (type === 'demon_lord') {
    // Trident/staff
    gfx.lineStyle(3 * S, 0xff6600, 1);
    gfx.beginPath();
    gfx.moveTo(x + 28 * S, bY + 36 * S);
    gfx.lineTo(x + 28 * S, bY + 5 * S);
    gfx.strokePath();
    gfx.fillStyle(0xff6600, 1);
    gfx.beginPath();
    gfx.moveTo(x + 25 * S, bY + 5 * S);
    gfx.lineTo(x + 28 * S, bY - 4 * S);
    gfx.lineTo(x + 31 * S, bY + 5 * S);
    gfx.closePath();
    gfx.fillPath();
  } else {
    // Big gun/sword
    gfx.fillStyle(0x333333, 1);
    gfx.fillRect(x + 26 * S, bY + 30 * S, 20 * S, 5 * S);
    gfx.fillStyle(accentColor, 1);
    gfx.fillRect(x + 24 * S, bY + 28 * S, 5 * S, 9 * S);
  }

  // Head
  gfx.fillStyle(skinColor, 1);
  gfx.fillCircle(x, bY + 8 * S, 12 * S);

  // Boss helmet
  gfx.fillStyle(helmetColor, 1);
  gfx.beginPath();
  gfx.arc(x, bY + 6 * S, 13 * S, Math.PI, 0, false);
  gfx.closePath();
  gfx.fillPath();

  // Helmet decorations / horns for demon
  if (type === 'demon_lord') {
    gfx.fillStyle(0xff2200, 1);
    // Left horn
    gfx.beginPath();
    gfx.moveTo(x - 10 * S, bY - 2 * S);
    gfx.lineTo(x - 6 * S, bY - 16 * S);
    gfx.lineTo(x - 2 * S, bY - 2 * S);
    gfx.closePath();
    gfx.fillPath();
    // Right horn
    gfx.beginPath();
    gfx.moveTo(x + 2 * S, bY - 2 * S);
    gfx.lineTo(x + 6 * S, bY - 16 * S);
    gfx.lineTo(x + 10 * S, bY - 2 * S);
    gfx.closePath();
    gfx.fillPath();
  } else if (type === 'arctic_overlord') {
    // Ice spike crown
    gfx.fillStyle(0xaaddff, 0.8);
    for (let i = -2; i <= 2; i++) {
      gfx.beginPath();
      gfx.moveTo(x + i * 5 * S - 2 * S, bY - 4 * S);
      gfx.lineTo(x + i * 5 * S, bY - (12 + Math.abs(i) * 2) * S);
      gfx.lineTo(x + i * 5 * S + 2 * S, bY - 4 * S);
      gfx.closePath();
      gfx.fillPath();
    }
  } else {
    // Star / rank badge on helmet
    gfx.fillStyle(accentColor, 1);
    gfx.fillCircle(x, bY - 2 * S, 3 * S);
  }

  // Helmet rim
  gfx.fillStyle(accentColor, 0.6);
  gfx.fillRect(x - 14 * S, bY - 2 * S, 28 * S, 3 * S);

  // Eyes (glowing)
  const eyeColor = enraged ? 0xff2200 : 0xffcc00;
  gfx.fillStyle(eyeColor, 1);
  gfx.fillCircle(x - 4 * S, bY + 8 * S, 2 * S);
  gfx.fillCircle(x + 4 * S, bY + 8 * S, 2 * S);

  // Enraged aura
  if (enraged) {
    gfx.lineStyle(2 * S, 0xff0000, 0.4);
    gfx.strokeCircle(x, bY + 10 * S, 30 * S);
    gfx.lineStyle(2 * S, 0xff4400, 0.2);
    gfx.strokeCircle(x, bY + 10 * S, 38 * S);
  }
}
