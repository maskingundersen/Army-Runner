// src/GateSystem.js — Manages gate pairs as transparent neon panes

class GateSystem {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.gates = [];
  }

  spawnGate(worldZ, leftData, rightData) {
    const group = new THREE.Group();

    // Left pane — blue, additive effect
    const leftPane = this._createPane(leftData.label, 0x0044FF, true);
    leftPane.position.x = -1.6;
    group.add(leftPane);

    // Right pane — red, subtractive/multiplier
    const rightPane = this._createPane(rightData.label, 0xFF2200, false);
    rightPane.position.x = 1.6;
    group.add(rightPane);

    // Thin center divider
    const divGeo = new THREE.BoxGeometry(0.15, 3, 0.15);
    const divMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const divider = new THREE.Mesh(divGeo, divMat);
    divider.position.y = 1.5;
    group.add(divider);

    group.position.z = worldZ;
    this.scene.add(group);

    const gate = {
      group,
      left: { good: leftData.good, label: leftData.label, reward: leftData.reward || null, mod: leftData.mod },
      right: { good: rightData.good, label: rightData.label, reward: rightData.reward || null, mod: rightData.mod },
      passed: false,
      worldZ
    };

    this.gates.push(gate);
    return gate;
  }

  // Keep legacy name as alias so existing callers don't break
  createGate(worldZ, leftData, rightData) {
    return this.spawnGate(worldZ, leftData, rightData);
  }

  _createPane(labelText, color, isLeft) {
    const paneGroup = new THREE.Group();

    // Transparent neon-colored pane
    const geo = new THREE.BoxGeometry(3, 3, 0.1);
    const mat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      emissive: color,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide
    });
    const pane = new THREE.Mesh(geo, mat);
    pane.position.y = 1.5;
    paneGroup.add(pane);

    // Bold text label via canvas texture sprite
    const sprite = this._createTextSprite(labelText, isLeft);
    sprite.position.set(0, 1.5, 0.1);
    sprite.scale.set(2.8, 1.4, 1);
    paneGroup.add(sprite);

    paneGroup.userData = { pane, mat };
    return paneGroup;
  }

  _createTextSprite(text, isLeft) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 96px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = isLeft ? 'rgba(0,68,255,0.8)' : 'rgba(255,34,0,0.8)';
    ctx.shadowBlur = 12;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(spriteMat);
  }

  update(cameraZ) {
    for (const gate of this.gates) {
      gate.group.position.z = gate.worldZ - cameraZ;
    }
  }

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

  triggerEffect(gate, side) {
    const chosen = side === 'left' ? gate.left : gate.right;
    const color = chosen.good ? 0x00ff44 : 0xff2222;
    const gateZ = gate.group.position.z;
    const gateX = side === 'left' ? -1.6 : 1.6;

    this.effects.explode(gateX, 1.5, gateZ, color, 30, 4);
    this.effects.cameraShake(0.5);
    this.effects.screenFlash(color);
  }

  cleanup(cameraZ) {
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const gate = this.gates[i];
      if (gate.group.position.z > 30) {
        this.scene.remove(gate.group);
        this._disposeGroup(gate.group);
        this.gates.splice(i, 1);
      }
    }
  }

  clear() {
    for (const gate of this.gates) {
      this.scene.remove(gate.group);
      this._disposeGroup(gate.group);
    }
    this.gates.length = 0;
  }

  _disposeGroup(group) {
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });
  }
}
