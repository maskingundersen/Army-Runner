// src/GateSystem.js — Manages gate pairs with modifiers

class GateSystem {
  constructor(threeScene, effectsMgr) {
    this.scene = threeScene;
    this.effects = effectsMgr;
    this.gates = [];
    
    // Temp objects
    this._tempCanvas = null;
    this._tempCtx = null;
  }
  
  /**
   * Create a gate pair at world Z position
   * @param {number} worldZ - Z position in world coordinates
   * @param {Object} leftData - { label, mod, good }
   * @param {Object} rightData - { label, mod, good }
   */
  createGate(worldZ, leftData, rightData) {
    const group = new THREE.Group();
    
    // Gate dimensions
    const gateWidth = 3.2;
    const gateHeight = 4.0;
    const pillarWidth = 0.4;
    const barHeight = 0.5;
    const gateSpacing = 1.0; // Gap between gates
    
    // Left gate
    const leftGateGroup = this._createSingleGate(
      leftData.good ? 0x00aa44 : 0xaa2200,
      leftData.label,
      leftData.good
    );
    leftGateGroup.position.x = -gateWidth / 2 - gateSpacing / 2;
    group.add(leftGateGroup);
    
    // Right gate
    const rightGateGroup = this._createSingleGate(
      rightData.good ? 0x00aa44 : 0xaa2200,
      rightData.label,
      rightData.good
    );
    rightGateGroup.position.x = gateWidth / 2 + gateSpacing / 2;
    group.add(rightGateGroup);
    
    // Center divider pillar
    const dividerGeo = new THREE.BoxGeometry(0.3, gateHeight, 0.3);
    const dividerMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.position.y = gateHeight / 2;
    divider.castShadow = true;
    group.add(divider);
    
    // Add to scene
    group.position.z = worldZ;
    this.scene.add(group);
    
    // Store gate data
    const gateData = {
      worldZ,
      group,
      leftGate: leftGateGroup,
      rightGate: rightGateGroup,
      left: leftData,
      right: rightData,
      passed: false,
      animationTime: 0
    };
    
    this.gates.push(gateData);
    
    return gateData;
  }
  
  /**
   * Create a single gate structure
   */
  _createSingleGate(color, labelText, isGood) {
    const group = new THREE.Group();
    
    const gateWidth = 3.0;
    const gateHeight = 4.0;
    const pillarWidth = 0.35;
    const barHeight = 0.4;
    const archDepth = 0.3;
    
    // Material
    const pillarMat = new THREE.MeshLambertMaterial({ color: color });
    const glowColor = isGood ? 0x44ff88 : 0xff4444;
    
    // Left pillar
    const pillarGeo = new THREE.BoxGeometry(pillarWidth, gateHeight, archDepth);
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-gateWidth / 2 + pillarWidth / 2, gateHeight / 2, 0);
    leftPillar.castShadow = true;
    group.add(leftPillar);
    
    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat.clone());
    rightPillar.position.set(gateWidth / 2 - pillarWidth / 2, gateHeight / 2, 0);
    rightPillar.castShadow = true;
    group.add(rightPillar);
    
    // Top bar
    const barGeo = new THREE.BoxGeometry(gateWidth, barHeight, archDepth);
    const topBar = new THREE.Mesh(barGeo, pillarMat.clone());
    topBar.position.set(0, gateHeight - barHeight / 2, 0);
    topBar.castShadow = true;
    group.add(topBar);
    
    // Glow plane (transparent colored backdrop)
    const glowGeo = new THREE.PlaneGeometry(gateWidth - pillarWidth * 2, gateHeight - barHeight);
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const glowPlane = new THREE.Mesh(glowGeo, glowMat);
    glowPlane.position.set(0, (gateHeight - barHeight) / 2, 0.01);
    group.add(glowPlane);
    
    // Text label using canvas texture sprite
    const textSprite = this._createTextSprite(labelText, isGood);
    textSprite.position.set(0, gateHeight / 2, 0.2);
    textSprite.scale.set(2.5, 1.2, 1);
    group.add(textSprite);
    
    // Store references for animation
    group.userData = {
      leftPillar,
      rightPillar,
      topBar,
      glowPlane,
      textSprite,
      isGood
    };
    
    return group;
  }
  
  /**
   * Create text sprite using canvas
   */
  _createTextSprite(text, isGood) {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = isGood ? 'rgba(0, 170, 68, 0.9)' : 'rgba(170, 34, 0, 0.9)';
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 16);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = isGood ? '#44ff88' : '#ff4444';
    ctx.lineWidth = 4;
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 16);
    ctx.stroke();
    
    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    return new THREE.Sprite(spriteMat);
  }
  
  /**
   * Update gates each frame
   * @param {number} cameraZ - Current camera Z scroll position
   */
  update(cameraZ) {
    for (const gate of this.gates) {
      // Convert world Z to visual Z
      // Gate worldZ is fixed, but visually we offset by cameraZ
      // When cameraZ = worldZ, gate is at Z=0 (army position)
      gate.group.position.z = gate.worldZ - cameraZ;
      
      // Animate passed gates
      if (gate.passed) {
        gate.animationTime += 0.016;
        
        // Fade out
        const fadeT = Math.min(gate.animationTime / 0.5, 1);
        gate.group.scale.set(1 + fadeT * 0.5, 1 + fadeT * 0.5, 1);
        
        // Reduce opacity of glow planes
        if (gate.leftGate.userData.glowPlane) {
          gate.leftGate.userData.glowPlane.material.opacity = 0.25 * (1 - fadeT);
        }
        if (gate.rightGate.userData.glowPlane) {
          gate.rightGate.userData.glowPlane.material.opacity = 0.25 * (1 - fadeT);
        }
      }
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
      
      // Check if gate is at army position (Z >= 0)
      const visualZ = gate.group.position.z;
      
      if (visualZ >= -0.5 && visualZ <= 1.5) {
        // Determine which side was hit based on armyX
        const side = armyX < 0 ? 'left' : 'right';
        
        return { gate, side };
      }
    }
    
    return null;
  }
  
  /**
   * Trigger visual effect when gate is passed
   * @param {Object} gate - Gate data
   * @param {string} side - 'left' or 'right'
   */
  triggerEffect(gate, side) {
    const chosen = side === 'left' ? gate.left : gate.right;
    const gateGroup = side === 'left' ? gate.leftGate : gate.rightGate;
    
    // Scale pulse animation
    const userData = gateGroup.userData;
    if (userData) {
      // Flash the glow plane
      if (userData.glowPlane) {
        userData.glowPlane.material.opacity = 0.8;
      }
    }
    
    // Particle burst
    const color = chosen.good ? 0x00ff88 : 0xff3300;
    const gateX = gate.group.position.x + gateGroup.position.x;
    const gateZ = gate.group.position.z;
    
    this.effects.gateEffect(gateX, 2, gateZ, color);
  }
  
  /**
   * Clear all gates
   */
  clear() {
    for (const gate of this.gates) {
      this.scene.remove(gate.group);
      
      // Dispose geometries and materials
      gate.group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      });
    }
    
    this.gates.length = 0;
  }
  
  /**
   * Remove gates that are far behind
   */
  cleanup(cameraZ) {
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const gate = this.gates[i];
      const visualZ = gate.group.position.z;
      
      // Remove gates far behind camera
      if (visualZ > 30) {
        this.scene.remove(gate.group);
        gate.group.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
          }
        });
        this.gates.splice(i, 1);
      }
    }
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
