// src/GateSystem.js — Manages gate pairs with dramatic glowing arch gates

class GateSystem {
  constructor(threeScene, effectsMgr) {
    this.scene = threeScene;
    this.effects = effectsMgr;
    this.gates = [];
  }

  /**
   * Create a gate pair at world Z position
   * @param {number} worldZ - Z position in world coordinates
   * @param {Object} leftData - { label, mod, good }
   * @param {Object} rightData - { label, mod, good }
   */
  createGate(worldZ, leftData, rightData) {
    const group = new THREE.Group();

    const gateWidth = 8.0;
    const gateSpacing = 1.5;

    // Left gate
    const leftGateGroup = this._createSingleGate(leftData.label, leftData.good);
    leftGateGroup.position.x = -gateWidth / 2 - gateSpacing / 2;
    group.add(leftGateGroup);

    // Right gate
    const rightGateGroup = this._createSingleGate(rightData.label, rightData.good);
    rightGateGroup.position.x = gateWidth / 2 + gateSpacing / 2;
    group.add(rightGateGroup);

    // Center divider pillar
    const dividerGeo = new THREE.BoxGeometry(0.3, 8, 0.3);
    const dividerMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.3 });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.position.y = 4;
    group.add(divider);

    // 1 shared PointLight per gate pair (not 2), positioned at center
    const pairLightColor = leftData.good ? 0x00ff44 : 0xff2222;
    const pairLight = new THREE.PointLight(pairLightColor, 1.2, 16);
    pairLight.position.set(0, 4, 0);
    pairLight.castShadow = false;
    group.add(pairLight);

    group.position.z = worldZ;
    this.scene.add(group);

    const gateData = {
      worldZ,
      group,
      leftGate: leftGateGroup,
      rightGate: rightGateGroup,
      left: leftData,
      right: rightData,
      passed: false,
      animationTime: 0,
      triggerTime: -1,
      pairLight
    };

    this.gates.push(gateData);
    return gateData;
  }

  /**
   * Create a single dramatic arch gate
   */
  _createSingleGate(labelText, isGood) {
    const group = new THREE.Group();

    const gateWidth = 8;
    const pillarHeight = 8;
    const emissiveColor = isGood ? 0x00ff44 : 0xff2222;
    const baseColor = isGood ? 0x005511 : 0x551111;

    // Shared emissive material for pillars and crossbar
    const archMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.4
    });

    // Left pillar — cylinder
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.4, pillarHeight, 12);
    const leftPillar = new THREE.Mesh(pillarGeo, archMat.clone());
    leftPillar.position.set(-gateWidth / 2, pillarHeight / 2, 0);
    group.add(leftPillar);

    // Right pillar — cylinder
    const rightPillar = new THREE.Mesh(pillarGeo, archMat.clone());
    rightPillar.position.set(gateWidth / 2, pillarHeight / 2, 0);
    group.add(rightPillar);

    // Crossbar on top
    const crossbarGeo = new THREE.BoxGeometry(gateWidth, 0.6, 0.6);
    const crossbar = new THREE.Mesh(crossbarGeo, archMat.clone());
    crossbar.position.set(0, pillarHeight, 0);
    group.add(crossbar);

    // Simulated bloom — glow halo meshes at 102% scale
    const glowMat = new THREE.MeshBasicMaterial({ color: emissiveColor, transparent: true, opacity: 0.12 });
    const leftGlow = new THREE.Mesh(pillarGeo, glowMat);
    leftGlow.position.copy(leftPillar.position);
    leftGlow.scale.set(1.02, 1.02, 1.02);
    group.add(leftGlow);

    const rightGlow = new THREE.Mesh(pillarGeo, glowMat.clone());
    rightGlow.position.copy(rightPillar.position);
    rightGlow.scale.set(1.02, 1.02, 1.02);
    group.add(rightGlow);

    const crossGlow = new THREE.Mesh(crossbarGeo, glowMat.clone());
    crossGlow.position.copy(crossbar.position);
    crossGlow.scale.set(1.02, 1.02, 1.02);
    group.add(crossGlow);

    // Collect emissive material refs for pulse animation
    const emissiveMaterials = [
      leftPillar.material,
      rightPillar.material,
      crossbar.material
    ];

    // Label billboard sprite
    const textSprite = this._createTextSprite(labelText, isGood);
    textSprite.position.set(0, pillarHeight + 0.8, 0);
    textSprite.scale.set(4, 1.5, 1);
    group.add(textSprite);

    // Store references for animation
    group.userData = {
      leftPillar,
      rightPillar,
      crossbar,
      emissiveMaterials,
      textSprite,
      isGood
    };

    return group;
  }

  /**
   * Create text sprite using canvas
   */
  _createTextSprite(text, isGood) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    // Colored glow background
    ctx.fillStyle = isGood ? 'rgba(0, 200, 60, 0.85)' : 'rgba(200, 30, 20, 0.85)';
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 24);
      ctx.fill();
    } else {
      ctx.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
    }

    // Bright border
    ctx.strokeStyle = isGood ? '#44ff88' : '#ff4444';
    ctx.lineWidth = 6;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 24);
      ctx.stroke();
    } else {
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    }

    // White text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });

    return new THREE.Sprite(spriteMat);
  }

  /**
   * Update gates each frame — positioning, pulse animation, and post-trigger effects
   * @param {number} cameraZ - Current camera Z scroll position
   */
  update(cameraZ) {
    const time = performance.now() / 1000;

    for (const gate of this.gates) {
      gate.group.position.z = gate.worldZ - cameraZ;

      // Emissive pulse on all visible gates
      const pulse = Math.sin(time * 4) * 0.3 + 0.7;
      this._applyPulse(gate.leftGate, pulse);
      this._applyPulse(gate.rightGate, pulse);

      // Post-trigger animation (pillar scale + light recovery over 0.5s)
      if (gate.triggerTime > 0) {
        const elapsed = time - gate.triggerTime;
        if (elapsed < 0.5) {
          const t = elapsed / 0.5;
          const scale = 1.3 - 0.3 * t; // 1.3 → 1.0
          const lightInt = 8 - 6.8 * t;   // 8 → 1.2
          this._applyTriggerAnim(gate.leftGate, scale);
          this._applyTriggerAnim(gate.rightGate, scale);
          if (gate.pairLight) gate.pairLight.intensity = lightInt;
        } else {
          // Snap back to defaults
          this._applyTriggerAnim(gate.leftGate, 1.0);
          this._applyTriggerAnim(gate.rightGate, 1.0);
          if (gate.pairLight) gate.pairLight.intensity = 1.2;
          gate.triggerTime = -1;
        }
      }

      // Animate passed gates (fade out)
      if (gate.passed) {
        gate.animationTime += 0.016;
        const fadeT = Math.min(gate.animationTime / 0.5, 1);
        gate.group.scale.set(1 + fadeT * 0.5, 1 + fadeT * 0.5, 1);
      }
    }
  }

  /** Apply emissive pulse to a single gate group */
  _applyPulse(gateGroup, intensity) {
    const mats = gateGroup.userData.emissiveMaterials;
    if (mats) {
      for (let i = 0; i < mats.length; i++) {
        mats[i].emissiveIntensity = intensity;
      }
    }
  }

  /** Apply post-trigger scale animation */
  _applyTriggerAnim(gateGroup, scale) {
    const ud = gateGroup.userData;
    if (ud.leftPillar) {
      ud.leftPillar.scale.x = scale;
      ud.leftPillar.scale.z = scale;
    }
    if (ud.rightPillar) {
      ud.rightPillar.scale.x = scale;
      ud.rightPillar.scale.z = scale;
    }
  }

  /**
   * Check if army has collided with any gate
   * @param {number} armyX - Army X position
   * @returns {Object|null} { gate, side } or null
   */
  checkCollision(armyX) {
    for (const gate of this.gates) {
      if (gate.passed) continue;

      const visualZ = gate.group.position.z;

      if (visualZ >= -0.5 && visualZ <= 1.5) {
        const side = armyX < 0 ? 'left' : 'right';
        return { gate, side };
      }
    }

    return null;
  }

  /**
   * Trigger dramatic visual effect when gate is passed
   * @param {Object} gate - Gate data
   * @param {string} side - 'left' or 'right'
   */
  triggerEffect(gate, side) {
    const chosen = side === 'left' ? gate.left : gate.right;
    const gateGroup = side === 'left' ? gate.leftGate : gate.rightGate;
    const color = chosen.good ? 0x00ff44 : 0xff2222;

    // Burst of 40 particles
    const gateX = gate.group.position.x + gateGroup.position.x;
    const gateZ = gate.group.position.z;
    this.effects.explode(gateX, 4, gateZ, color, 40);

    // Pillar scale burst
    const ud = gateGroup.userData;
    if (ud.leftPillar) {
      ud.leftPillar.scale.x *= 1.3;
      ud.leftPillar.scale.z *= 1.3;
    }
    if (ud.rightPillar) {
      ud.rightPillar.scale.x *= 1.3;
      ud.rightPillar.scale.z *= 1.3;
    }

    // PointLight intensity spike (pair-level light)
    if (gate.pairLight) {
      gate.pairLight.intensity = 8;
    }

    // Camera shake
    this.effects.cameraShake(0.5);

    // Screen flash in gate color
    this.effects.screenFlash(color);

    // Start post-trigger recovery animation
    gate.triggerTime = performance.now() / 1000;
  }

  /**
   * Clear all gates — dispose geometries, materials, lights, textures
   */
  clear() {
    for (const gate of this.gates) {
      this.scene.remove(gate.group);
      this._disposeGroup(gate.group);
    }
    this.gates.length = 0;
  }

  /**
   * Remove gates that are far behind — dispose lights too
   */
  cleanup(cameraZ) {
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const gate = this.gates[i];
      const visualZ = gate.group.position.z;

      if (visualZ > 30) {
        this.scene.remove(gate.group);
        this._disposeGroup(gate.group);
        this.gates.splice(i, 1);
      }
    }
  }

  /** Recursively dispose all geometries, materials, textures, and lights */
  _disposeGroup(group) {
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        if (obj.material.emissiveMap) obj.material.emissiveMap.dispose();
        obj.material.dispose();
      }
      // PointLight cleanup — remove from parent handled by scene.remove
      if (obj.isLight) {
        if (obj.shadow && obj.shadow.map) obj.shadow.map.dispose();
      }
    });
  }
}

// Polyfill for roundRect if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}
