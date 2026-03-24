// src/BarrelSystem.js — Weapon barrel spawning, updates, and activation

class BarrelSystem {
  constructor(game) {
    this.game = game;
    this.barrels = [];
  }

  spawnBarrel(worldZ) {
    const rewards = BARREL_REWARDS;
    const reward = rewards[Math.floor(Math.random() * rewards.length)];

    const geo = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 12);
    const barrelColor = reward.good ? 0x44aa44 : 0xaa4422;
    const mat = new THREE.MeshStandardMaterial({ color: barrelColor, roughness: 0.5, metalness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.6;
    mesh.castShadow = false;
    const xPos = (Math.random() - 0.5) * (ArmyManager.ROAD_HALF * 2 - 4);
    mesh.position.x = xPos;

    // Label sprite above barrel
    const labelSprite = this.createBarrelLabel(reward.label, reward.good);
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

    const scene = this.game.scene;
    scene.add(mesh);
    scene.add(labelSprite);
    scene.add(hpSprite);

    this.barrels.push({
      mesh, worldZ, xPos, reward,
      label: labelSprite, hpBar: hpSprite, hpCanvas,
      hp: 3, maxHp: 3, hitFlash: 0, baseColor: barrelColor
    });
  }

  createBarrelLabel(text, isGood) {
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

  updateBarrels(cameraZ) {
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      const barrel = this.barrels[i];
      const visualZ = barrel.worldZ - cameraZ;
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
        this.removeBarrel(i);
      }
    }
  }

  checkBarrelBulletHit(bx, by, bz) {
    const g = this.game;
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      const barrel = this.barrels[i];
      const visualZ = barrel.worldZ - g.cameraZ;
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
          this.activateBarrel(barrel);
          this.removeBarrel(i);
        }
        return true;
      }
    }
    return false;
  }

  activateBarrel(barrel) {
    const g = this.game;
    const reward = barrel.reward;
    g.effects.explode(barrel.xPos, 1.5, barrel.mesh.position.z, reward.good ? 0x44ff88 : 0xff4400, 20, 5);
    g.effects.screenFlash(reward.good ? 0x44ff88 : 0xff4400, 0.4);
    g.camCtrl.shake(0.4);

    if (reward.type === 'weapon') {
      g.currentWeapon = reward.id;
      g.hud.showCycleMessage(WEAPON_TYPES[reward.id].label);
    } else if (reward.type === 'soldiers') {
      g.soldierCount = Math.max(1, g.soldierCount + reward.count);
      g.soldierCount = Math.min(g.soldierCount, ARMY_HARD_CAP);
      g.armyMgr.setCount(g.soldierCount, g.armyX);
      g.hud.showCycleMessage(reward.label);
    } else if (reward.type === 'fireRate') {
      if (reward.penalty) {
        g.upgrades[reward.id] = Math.max(0, (g.upgrades[reward.id] || 0) - 1);
      } else {
        g.upgrades[reward.id] = (g.upgrades[reward.id] || 0) + 1;
      }
      g.hud.showCycleMessage(reward.label);
    } else if (reward.type === 'damage') {
      g.upgrades[reward.id] = (g.upgrades[reward.id] || 0) + 1;
      g.hud.showCycleMessage(reward.label);
    }

    if (window.audioManager) {
      if (reward.good) window.audioManager.gateGood();
      else window.audioManager.gateBad();
    }
    g.hud.updateHUD();
  }

  removeBarrel(index) {
    const barrel = this.barrels[index];
    const scene = this.game.scene;
    scene.remove(barrel.mesh);
    scene.remove(barrel.label);
    scene.remove(barrel.hpBar);
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
    this.barrels.splice(index, 1);
  }

  clearBarrels() {
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      this.removeBarrel(i);
    }
  }

  checkBarrelBulletHitsFromProjectiles() {
    if (this.barrels.length === 0) return;
    const bullets = this.game.projSys._bulletData;
    const activeList = this.game.projSys._bullets;
    for (let i = activeList.length - 1; i >= 0; i--) {
      const idx = activeList[i];
      const bullet = bullets[idx];
      if (!bullet.active) continue;
      if (this.checkBarrelBulletHit(bullet.x, bullet.y, bullet.z)) {
        this.game.projSys._deactivateBullet(i, idx);
      }
    }
  }
}