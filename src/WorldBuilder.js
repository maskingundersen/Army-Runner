// src/WorldBuilder.js — Lava / Beach environment construction and scrolling

const ENV_PALETTES = [
  { skyColor: 0x1a0a0a, groundColor: 0x333333, fogNear: 30, fogFar: 120 }, // Lava
  { skyColor: 0x87CEEB, groundColor: 0xC2B280, fogNear: 40, fogFar: 150 }, // Beach
];

class WorldBuilder {
  constructor(scene) {
    this.scene = scene;
    this._currentPalette = 0;
  }

  // ── Lighting ──────────────────────────────────────────────────────────────

  setupLights() {
    const ambient = new THREE.AmbientLight(0xffa060, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffcc88, 0.7);
    sun.position.set(8, 20, 10);
    this.scene.add(sun);
    this.sun = sun;

    const hemisphereLight = new THREE.HemisphereLight(0xff6633, 0x333333, 0.3);
    this.scene.add(hemisphereLight);
    this._hemi = hemisphereLight;

    // Combat point light (referenced by game.js)
    this.combatLight = new THREE.PointLight(0xff8844, 0, 15);
    this.combatLight.position.set(0, 2, 0);
    this.scene.add(this.combatLight);
  }

  // ── Road / Path with Lava or Water flanks ─────────────────────────────────

  buildRoad() {
    const SEG_LEN = 40;
    const NUM_SEGS = 6;
    const PATH_W = 6;
    const FLANK_W = 20;

    this._segLen = SEG_LEN;
    this._numSegs = NUM_SEGS;
    this._segments = [];

    // Materials — lava (default level 1)
    this._pathMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a, roughness: 0.9, metalness: 0.05,
    });
    this._flankMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 0.8,
      roughness: 0.4, metalness: 0.1,
    });
    // Edge strip material (dark rock border between path and lava)
    this._edgeMat = new THREE.MeshStandardMaterial({
      color: 0x222222, roughness: 0.95, metalness: 0.0,
    });

    // Shared geometries
    const pathGeo = new THREE.BoxGeometry(PATH_W, 0.15, SEG_LEN);
    const flankGeo = new THREE.PlaneGeometry(FLANK_W, SEG_LEN);
    const edgeGeo = new THREE.BoxGeometry(0.35, 0.22, SEG_LEN);

    for (let i = 0; i < NUM_SEGS; i++) {
      const group = new THREE.Group();
      const z = -i * SEG_LEN;

      // Central stone path
      const path = new THREE.Mesh(pathGeo, this._pathMat);
      path.position.y = 0.075;
      group.add(path);

      // Jagged edge strips (slightly wider boxes with irregular vertices)
      const edgeL = new THREE.Mesh(edgeGeo, this._edgeMat);
      edgeL.position.set(-(PATH_W / 2) - 0.15, 0.1, 0);
      group.add(edgeL);
      const edgeR = new THREE.Mesh(edgeGeo, this._edgeMat);
      edgeR.position.set((PATH_W / 2) + 0.15, 0.1, 0);
      group.add(edgeR);

      // Jitter edge vertices for irregular look
      this._jitterEdge(edgeL.geometry);
      this._jitterEdge(edgeR.geometry);

      // Left lava/water flank
      const flankL = new THREE.Mesh(flankGeo, this._flankMat);
      flankL.rotation.x = -Math.PI / 2;
      flankL.position.set(-(PATH_W / 2) - FLANK_W / 2 - 0.3, -0.02, 0);
      group.add(flankL);

      // Right lava/water flank
      const flankR = new THREE.Mesh(flankGeo, this._flankMat);
      flankR.rotation.x = -Math.PI / 2;
      flankR.position.set((PATH_W / 2) + FLANK_W / 2 + 0.3, -0.02, 0);
      group.add(flankR);

      group.position.z = z;
      this.scene.add(group);
      this._segments.push({ group, baseZ: z });
    }

    // Stone crack dashes on path (center line)
    const dashGeo = new THREE.BoxGeometry(0.25, 0.02, 0.6);
    const dashMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.85 });
    this.dashMesh = new THREE.InstancedMesh(dashGeo, dashMat, 50);
    this.dashMesh.position.y = 0.16;
    this.scene.add(this.dashMesh);
    this.updateDashes(0);

    // Store references for palette switching
    this.groundMesh = { material: this._pathMat };
    this.roadMesh = { material: this._pathMat };
  }

  _jitterEdge(geometry) {
    const pos = geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.25);
      pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.15);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  updateDashes(cameraZ) {
    const spacing = 3.5;
    const m = new THREE.Matrix4();
    const numDashes = 50;
    const totalSpan = spacing * numDashes;

    for (let i = 0; i < numDashes; i++) {
      const baseZ = i * spacing;
      let z = -((baseZ - ((-cameraZ) % totalSpan)) % totalSpan);
      if (z > 10) z -= totalSpan;
      m.makeTranslation(0, 0, z);
      this.dashMesh.setMatrixAt(i, m);
    }
    this.dashMesh.instanceMatrix.needsUpdate = true;

    // Reposition road segments for infinite scrolling
    const segLen = this._segLen;
    const totalLen = this._numSegs * segLen;
    for (const seg of this._segments) {
      let z = seg.baseZ - cameraZ;
      while (z > segLen) z -= totalLen;
      while (z < -(totalLen - segLen)) z += totalLen;
      seg.group.position.z = z;
    }
  }

  // ── Stub methods (called by game.js) ──────────────────────────────────────

  buildTrees() { /* no trees in lava/beach levels */ }
  buildTorches() { /* no torches needed */ }
  buildMountains() { /* no mountains */ }
  _buildWallPool() { /* no walls */ }
  _buildBannerPool() { /* no banners */ }
  _buildFogPatches() { /* no fog patches */ }
  updateTrees(_cameraZ) {}
  updateTorches(_cameraZ) {}
  updateParallax(_cameraZ) {}
  _updateWalls(_cameraZ) {}
  _updateBanners(_time, _cameraZ) {}
  _updateFog(_time, _cameraZ) {}

  // ── Palette switching ─────────────────────────────────────────────────────

  applyEnvPalette(segmentCycle) {
    const idx = segmentCycle % ENV_PALETTES.length;
    const palette = ENV_PALETTES[idx];
    this._currentPalette = idx;

    this.scene.background = new THREE.Color(palette.skyColor);
    this.scene.fog.color.set(palette.skyColor);
    this.scene.fog.near = palette.fogNear;
    this.scene.fog.far = palette.fogFar;

    if (this._hemi) {
      this._hemi.groundColor.setHex(palette.groundColor);
    }

    if (idx === 0) {
      // Lava palette
      this._pathMat.color.setHex(0x3a3a3a);
      this._flankMat.color.setHex(0xff4400);
      this._flankMat.emissive.setHex(0xff4400);
      this._flankMat.emissiveIntensity = 0.8;
      this._edgeMat.color.setHex(0x222222);
    } else {
      // Beach palette
      this._pathMat.color.setHex(0x999999);
      this._flankMat.color.setHex(0x00CED1);
      this._flankMat.emissive.setHex(0x00CED1);
      this._flankMat.emissiveIntensity = 0.3;
      this._edgeMat.color.setHex(0xC2B280);
    }
  }
}
