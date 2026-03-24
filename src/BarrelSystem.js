// src/BarrelSystem.js — Wooden crate obstacles with hit-point numbers

class BarrelSystem {
  constructor(game) {
    this.game = game;
    this.barrels = [];
  }

  spawnBarrel(worldZ) {
    const rewards = BARREL_REWARDS;
    const reward = rewards[Math.floor(Math.random() * rewards.length)];

    // Random hit-point value displayed on the crate
    const hp = [12, 25, 50, 100][Math.floor(Math.random() * 4)];

    // Wooden brown crate
    const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.6;
    const xPos = (Math.random() - 0.5) * (ArmyManager.ROAD_HALF * 2 - 4);
    mesh.position.x = xPos;

    // Number sprite floating above the crate
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 256;
    numCanvas.height = 128;
    const numSprite = this._createNumberSprite(numCanvas, hp);
    numSprite.position.set(xPos, 2.2, 0);
    numSprite.scale.set(2.0, 1.0, 1);

    const scene = this.game.scene;
    scene.add(mesh);
    scene.add(numSprite);

    this.barrels.push({
      mesh, worldZ, xPos, reward,
      numSprite, numCanvas,
      hp, maxHp: hp, hitFlash: 0
    });
  }

  _createNumberSprite(canvas, number) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(String(number), canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(spriteMat);
  }

  _updateNumberSprite(barrel) {
    const ctx = barrel.numCanvas.getContext('2d');
    ctx.clearRect(0, 0, barrel.numCanvas.width, barrel.numCanvas.height);
    ctx.fillStyle = barrel.hp > barrel.maxHp * 0.3 ? '#ffffff' : '#ff4444';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(String(Math.max(0, barrel.hp)), barrel.numCanvas.width / 2, barrel.numCanvas.height / 2);
    barrel.numSprite.material.map.needsUpdate = true;
  }

  updateBarrels(cameraZ) {
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      const barrel = this.barrels[i];
      const visualZ = barrel.worldZ - cameraZ;
      barrel.mesh.position.z = visualZ;
      barrel.numSprite.position.z = visualZ;

      // Hit flash decay
      if (barrel.hitFlash > 0) {
        barrel.hitFlash -= 0.05;
        const flash = new THREE.Color(0x8B4513).lerp(new THREE.Color(0xffffff), Math.max(0, barrel.hitFlash));
        barrel.mesh.material.color.copy(flash);
      }

      if (visualZ > 30) {
        this._removeBarrel(i);
      }
    }
  }

  _checkHit(bx, by, bz, damage) {
    const g = this.game;
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      const barrel = this.barrels[i];
      const visualZ = barrel.worldZ - g.cameraZ;
      const dx = Math.abs(bx - barrel.xPos);
      const dz = Math.abs(bz - visualZ);

      if (dx < 1.0 && dz < 1.0 && by < 2.5) {
        barrel.hp -= damage;
        barrel.hitFlash = 1.0;
        this._updateNumberSprite(barrel);

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
    const g = this.game;
    const reward = barrel.reward;

    // Delegate shatter effect to effects manager
    g.effects.explode(barrel.xPos, 1.5, barrel.mesh.position.z, 0x8B4513, 20, 5);
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

  _removeBarrel(index) {
    const barrel = this.barrels[index];
    const scene = this.game.scene;
    scene.remove(barrel.mesh);
    scene.remove(barrel.numSprite);
    if (barrel.mesh.geometry) barrel.mesh.geometry.dispose();
    if (barrel.mesh.material) barrel.mesh.material.dispose();
    if (barrel.numSprite.material) {
      if (barrel.numSprite.material.map) barrel.numSprite.material.map.dispose();
      barrel.numSprite.material.dispose();
    }
    this.barrels.splice(index, 1);
  }

  clearBarrels() {
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      this._removeBarrel(i);
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
      if (this._checkHit(bullet.x, bullet.y, bullet.z, bullet.damage)) {
        this.game.projSys._deactivate(i, idx);
      }
    }
  }
}