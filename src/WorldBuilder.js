// src/WorldBuilder.js — Environment construction and scrolling updates

const ENV_PALETTES = [
  { skyColor: 0x1a2a4a, groundColor: 0x3a6a2a, roadColor: 0x555566, fogNear: 30, fogFar: 100 },
  { skyColor: 0xf0d090, groundColor: 0xc4a55a, roadColor: 0x4a4035, fogNear: 38, fogFar: 115 },
  { skyColor: 0xd0e8f0, groundColor: 0xe8f0f0, roadColor: 0x5a6a70, fogNear: 26, fogFar: 90 },
  { skyColor: 0x6a3020, groundColor: 0x3a2a2a, roadColor: 0x2a1a1a, fogNear: 22, fogFar: 75 },
  { skyColor: 0x1a1a2a, groundColor: 0x2a2a3a, roadColor: 0x1a1a25, fogNear: 19, fogFar: 65 },
];

class WorldBuilder {
  constructor(scene) {
    this.scene = scene;
  }

  setupLights() {
    // Ambient light - warm soft fill
    const ambient = new THREE.AmbientLight(0xb0c8e0, 0.9);
    this.scene.add(ambient);

    // Directional moonlight - cool blue tone
    const sun = new THREE.DirectionalLight(0x9999cc, 0.7);
    sun.position.set(8, 20, 10);
    this.scene.add(sun);
    this.sun = sun;

    // Second dim warm DirectionalLight — torch glow on army from below-front
    const torchFill = new THREE.DirectionalLight(0x664422, 0.3);
    torchFill.position.set(0, -2, 8);
    this.scene.add(torchFill);

    // Hemisphere light for natural sky/ground color bleeding
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a6a2a, 0.4);
    this.scene.add(hemi);

    // Combat point light (glows during combat)
    this.combatLight = new THREE.PointLight(0xff8844, 0, 15);
    this.combatLight.position.set(0, 2, 0);
    this.scene.add(this.combatLight);

    // Sky dome
    this.setupSky();
  }

  setupSky() {
    // Gradient sky dome: dark navy at top → dark purple-blue at horizon
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d');
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#0a1020');
    skyGrad.addColorStop(1, '#1a1535');
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 2, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);

    const skyGeo = new THREE.SphereGeometry(500, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // Moon
    const moonGeo = new THREE.SphereGeometry(3, 8, 8);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xeeeedd,
      emissive: 0xeeeedd,
      emissiveIntensity: 0.6,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-80, 120, -300);
    this.scene.add(moon);

    // Stars
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 16;
    starCanvas.height = 16;
    const starCtx = starCanvas.getContext('2d');
    const starGrad = starCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    starGrad.addColorStop(0, 'rgba(255,255,255,1)');
    starGrad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
    starGrad.addColorStop(1, 'rgba(255,255,255,0)');
    starCtx.fillStyle = starGrad;
    starCtx.fillRect(0, 0, 16, 16);
    const starTex = new THREE.CanvasTexture(starCanvas);
    const starMat = new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false });

    for (let i = 0; i < 20; i++) {
      const star = new THREE.Sprite(starMat.clone());
      star.position.set(
        (Math.random() - 0.5) * 700,
        80 + Math.random() * 250,
        -100 - Math.random() * 350
      );
      const sz = 3 + Math.random() * 5;
      star.scale.set(sz, sz, 1);
      this.scene.add(star);
    }
  }

  buildRoad() {
    // Ground plane - rich medieval green
    const groundGeo = new THREE.PlaneGeometry(80, 400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.95, metalness: 0.0 });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.set(0, -0.02, -120);
    this.scene.add(this.groundMesh);

    // Ground texture variation patches
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.95, metalness: 0.0 });
    for (let i = 0; i < 12; i++) {
      const pw = 2 + Math.random() * 5;
      const pd = 3 + Math.random() * 6;
      const patchGeo = new THREE.BoxGeometry(pw, 0.005, pd);
      const patch = new THREE.Mesh(patchGeo, patchMat);
      const side = i % 2 === 0 ? -1 : 1;
      patch.position.set(
        side * (12 + Math.random() * 20),
        -0.01,
        -120 + Math.random() * 400
      );
      this.scene.add(patch);
    }

    // Parallax distant ground plane
    const parGeo = new THREE.PlaneGeometry(120, 600);
    const parMat = new THREE.MeshStandardMaterial({ color: 0x2e5a22, roughness: 0.95, metalness: 0.0 });
    this.parallaxGround = new THREE.Mesh(parGeo, parMat);
    this.parallaxGround.rotation.x = -Math.PI / 2;
    this.parallaxGround.position.set(0, -0.1, -180);
    this.scene.add(this.parallaxGround);
    this._parallaxBaseZ = -180;

    // Road strip - dark stone surface
    const roadGeo = new THREE.PlaneGeometry(20, 400);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.9, metalness: 0.05 });
    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.set(0, -0.01, -120);
    this.scene.add(this.roadMesh);

    // Subtle road crack lines (longitudinal) — 4 meshes merged to 1
    const crackMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.95, metalness: 0.0 });
    const crackOffsets = [-3.2, -0.8, 1.5, 4.1];
    const crackGeos = crackOffsets.map((xOff, i) => ({
      geometry: new THREE.BoxGeometry(0.08, 0.01, 3),
      position: new THREE.Vector3(xOff, 0.001, -120 + i * 70)
    }));
    const mergedCracks = this._mergeGeometries(crackGeos);
    this.scene.add(new THREE.Mesh(mergedCracks, crackMat));

    // Horizontal crack lines across road every ~8 units
    const hCrackGeo = new THREE.BoxGeometry(20, 0.02, 0.08);
    for (let i = 0; i < 50; i++) {
      const hCrack = new THREE.Mesh(hCrackGeo, crackMat);
      hCrack.position.set(0, 0.01, -320 + i * 8);
      this.scene.add(hCrack);
    }

    // Road tile variation: every 3rd tile (tile = 8 units), darken by ~10%
    const tileDarkMat = new THREE.MeshStandardMaterial({ color: 0x4a4a55, roughness: 0.92, metalness: 0.05 });
    const tileVarGeo = new THREE.BoxGeometry(20, 0.005, 8);
    for (let i = 0; i < 17; i++) {
      const tile = new THREE.Mesh(tileVarGeo, tileDarkMat);
      tile.position.set(0, 0.0, -320 + i * 24);
      this.scene.add(tile);
    }

    // Puddle reflective patches on road (1–2 per segment, ~30 total)
    const puddleMat = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 1.0, roughness: 0.1 });
    const puddleGeo = new THREE.CircleGeometry(0.6, 8);
    for (let i = 0; i < 30; i++) {
      const puddle = new THREE.Mesh(puddleGeo, puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(
        (Math.random() - 0.5) * 16,
        0.02,
        -320 + Math.random() * 400
      );
      this.scene.add(puddle);
    }

    // Stone tile dividing dashes (center line)
    const dashGeo = new THREE.BoxGeometry(0.3, 0.02, 0.8);
    const dashMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.85, metalness: 0.0 });
    this.dashMesh = new THREE.InstancedMesh(dashGeo, dashMat, 50);
    this.dashMesh.position.y = 0.01;
    this.scene.add(this.dashMesh);
    this.updateDashes(0);

    // Stone kerb road edges — 2 meshes merged to 1
    const edgeGeo = new THREE.BoxGeometry(0.3, 0.15, 400);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.85, metalness: 0.0 });
    const edgeGeos = [
      { geometry: edgeGeo, position: new THREE.Vector3(-9.8, 0.075, -120) },
      { geometry: edgeGeo, position: new THREE.Vector3(9.8, 0.075, -120) }
    ];
    const mergedEdges = this._mergeGeometries(edgeGeos);
    this.scene.add(new THREE.Mesh(mergedEdges, edgeMat));
  }

  updateDashes(cameraZ) {
    const spacing = 3.5;
    const m = new THREE.Matrix4();
    const numDashes = 50;

    for (let i = 0; i < numDashes; i++) {
      const baseZ = i * spacing;
      let z = -((baseZ - ((-cameraZ) % (spacing * numDashes))) % (spacing * numDashes));
      if (z > 10) z -= spacing * numDashes;

      m.makeTranslation(0, 0.01, z);
      this.dashMesh.setMatrixAt(i, m);
    }
    this.dashMesh.instanceMatrix.needsUpdate = true;
  }

  buildTrees() {
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.25, 1.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9, metalness: 0.0 });

    // Three foliage layers per tree
    const foliageGeos = [
      new THREE.ConeGeometry(1.0, 1.5, 8),
      new THREE.ConeGeometry(0.75, 1.2, 8),
      new THREE.ConeGeometry(0.5, 0.9, 8),
    ];
    const foliageMats = [
      new THREE.MeshStandardMaterial({ color: 0x2a5a20, roughness: 0.85, metalness: 0.0 }),
      new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.85, metalness: 0.0 }),
    ];

    const numTrees = 80;
    this.trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, numTrees);

    // One instanced mesh per foliage layer
    this.foliageLayers = [];
    for (let l = 0; l < foliageGeos.length; l++) {
      const mat = foliageMats[l % foliageMats.length];
      const im = new THREE.InstancedMesh(foliageGeos[l], mat, numTrees);
      this.foliageLayers.push(im);
    }

    // Y offsets for each foliage layer (above trunk top)
    this._foliageYOffsets = [1.8, 2.7, 3.4];

    const m = new THREE.Matrix4();
    const treeData = [];

    for (let i = 0; i < numTrees; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const baseX = side * (12 + Math.random() * 10);
      const baseZ = (i * 4) - 80 + (Math.random() - 0.5) * 2;
      const scale = 0.8 + Math.random() * 1.7; // range 0.8 – 2.5

      treeData.push({ x: baseX, z: baseZ, scale });

      m.makeTranslation(baseX, 0.75 * scale, baseZ);
      m.scale(new THREE.Vector3(scale, scale, scale));
      this.trunkMesh.setMatrixAt(i, m);

      for (let l = 0; l < this.foliageLayers.length; l++) {
        m.makeTranslation(baseX, this._foliageYOffsets[l] * scale, baseZ);
        m.scale(new THREE.Vector3(scale, scale, scale));
        this.foliageLayers[l].setMatrixAt(i, m);
      }
    }

    this.treeData = treeData;
    this.trunkMesh.instanceMatrix.needsUpdate = true;
    for (let l = 0; l < this.foliageLayers.length; l++) {
      this.foliageLayers[l].instanceMatrix.needsUpdate = true;
      this.scene.add(this.foliageLayers[l]);
    }

    this.scene.add(this.trunkMesh);

    // Keep legacy reference for any external code using foliageMesh
    this.foliageMesh = this.foliageLayers[0];
  }

  updateTrees(cameraZ) {
    const m = new THREE.Matrix4();
    const wrapDist = 320;

    for (let i = 0; i < this.treeData.length; i++) {
      const tree = this.treeData[i];
      let visualZ = tree.z - cameraZ;

      while (visualZ > 40) visualZ -= wrapDist;
      while (visualZ < -280) visualZ += wrapDist;

      const scale = tree.scale;

      m.makeTranslation(tree.x, 0.75 * scale, visualZ);
      m.scale(new THREE.Vector3(scale, scale, scale));
      this.trunkMesh.setMatrixAt(i, m);

      for (let l = 0; l < this.foliageLayers.length; l++) {
        m.makeTranslation(tree.x, this._foliageYOffsets[l] * scale, visualZ);
        m.scale(new THREE.Vector3(scale, scale, scale));
        this.foliageLayers[l].setMatrixAt(i, m);
      }
    }

    this.trunkMesh.instanceMatrix.needsUpdate = true;
    for (let l = 0; l < this.foliageLayers.length; l++) {
      this.foliageLayers[l].instanceMatrix.needsUpdate = true;
    }
  }

  buildTorches() {
    const torchSpacing = 30;
    const numTorches = 24;
    this.torchData = [];

    const stickGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9, metalness: 0.0 });
    const flameGeo = new THREE.SphereGeometry(0.15, 8, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

    this.torchStickMesh = new THREE.InstancedMesh(stickGeo, stickMat, numTorches);
    this.torchFlameMesh = new THREE.InstancedMesh(flameGeo, flameMat, numTorches);

    const m = new THREE.Matrix4();

    for (let i = 0; i < numTorches; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * 10.5;
      const z = (i * torchSpacing) - 160;

      this.torchData.push({ x: x, z: z });

      m.makeTranslation(x, 0.75, z);
      this.torchStickMesh.setMatrixAt(i, m);

      m.makeTranslation(x, 1.6, z);
      this.torchFlameMesh.setMatrixAt(i, m);
    }

    this.torchStickMesh.instanceMatrix.needsUpdate = true;
    this.torchFlameMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.torchStickMesh);
    this.scene.add(this.torchFlameMesh);

    // 2 shared PointLights that hop to nearest torch each frame (one per side)
    this._torchLightLeft = new THREE.PointLight(0xff6600, 1.5, 8);
    this._torchLightRight = new THREE.PointLight(0xff6600, 1.5, 8);
    this.scene.add(this._torchLightLeft);
    this.scene.add(this._torchLightRight);
  }

  updateTorches(cameraZ) {
    const m = new THREE.Matrix4();
    const wrapDist = this.torchData.length * 30;

    let bestLeftZ = Infinity, bestRightZ = Infinity;
    let bestLeftDist = Infinity, bestRightDist = Infinity;

    for (let i = 0; i < this.torchData.length; i++) {
      const t = this.torchData[i];
      let visualZ = t.z - cameraZ;

      while (visualZ > 40) visualZ -= wrapDist;
      while (visualZ < -wrapDist + 40) visualZ += wrapDist;

      m.makeTranslation(t.x, 0.75, visualZ);
      this.torchStickMesh.setMatrixAt(i, m);

      m.makeTranslation(t.x, 1.6, visualZ);
      this.torchFlameMesh.setMatrixAt(i, m);

      // Track nearest visible torch per side for shared PointLight
      const dist = Math.abs(visualZ);
      if (t.x < 0) {
        if (dist < bestLeftDist) { bestLeftDist = dist; bestLeftZ = visualZ; }
      } else {
        if (dist < bestRightDist) { bestRightDist = dist; bestRightZ = visualZ; }
      }
    }

    this.torchStickMesh.instanceMatrix.needsUpdate = true;
    this.torchFlameMesh.instanceMatrix.needsUpdate = true;

    // Move shared lights to nearest torch on each side
    this._torchLightLeft.position.set(-10.5, 1.8, bestLeftZ);
    this._torchLightRight.position.set(10.5, 1.8, bestRightZ);
  }

  buildMountains() {
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.9, metalness: 0.0 });
    const numMountains = 7;

    for (let i = 0; i < numMountains; i++) {
      const radius = 12 + Math.random() * 8;
      const height = 30 + Math.random() * 20;
      const geo = new THREE.ConeGeometry(radius, height, 4);
      const mountain = new THREE.Mesh(geo, mountainMat);

      // Semi-circle arrangement at Z = -300
      const angle = (Math.PI / (numMountains - 1)) * i;
      const spread = 120;
      mountain.position.set(
        Math.cos(angle) * spread - spread / 2 + (Math.random() - 0.5) * 10,
        height * 0.3,
        -300 + Math.sin(angle) * 30
      );
      mountain.rotation.y = Math.random() * Math.PI;
      this.scene.add(mountain);
    }
  }

  updateParallax(cameraZ) {
    // Distant ground scrolls at 60% of camera speed
    this.parallaxGround.position.z = this._parallaxBaseZ - cameraZ * 0.6;
  }

  applyEnvPalette(segmentCycle) {
    const palette = ENV_PALETTES[segmentCycle % ENV_PALETTES.length];
    if (this.skyDome) {
      // Tint the gradient texture with the palette sky color
      this.skyDome.material.color.setHex(palette.skyColor);
    }
    this.scene.background = new THREE.Color(palette.skyColor);
    this.scene.fog.color.set(palette.skyColor);
    this.scene.fog.near = palette.fogNear;
    this.scene.fog.far = palette.fogFar;
    this.groundMesh.material.color.setHex(palette.groundColor);
    this.roadMesh.material.color.setHex(palette.roadColor);
  }

  // ── Castle Wall Pool ──────────────────────────────────────────────────────

  _buildWallPool() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.95, metalness: 0.0 });
    const torchStickMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9, metalness: 0.0 });
    const skullMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.9, metalness: 0.0 });
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x663322, roughness: 0.9, metalness: 0.0 });

    // Shared geometries to avoid duplication
    const baseGeo = new THREE.BoxGeometry(4, 3, 0.8);
    const merGeo = new THREE.BoxGeometry(0.8, 1.0, 0.8);
    const skullGeo = new THREE.SphereGeometry(0.2, 5, 4);
    const shieldGeo = new THREE.BoxGeometry(0.6, 0.8, 0.08);
    const stickGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 5);
    const flameGeo = new THREE.SphereGeometry(0.12, 6, 4);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });

    const numWalls = 8;
    const spacing = 25;
    this._wallData = [];

    for (let i = 0; i < numWalls; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * 10;
      const baseZ = i * spacing - numWalls * spacing * 0.5;
      const hasTorch = (i % 2 === 0);

      const group = new THREE.Group();

      // Base wall
      const baseMesh = new THREE.Mesh(baseGeo, wallMat);
      baseMesh.position.set(0, 1.5, 0);
      group.add(baseMesh);

      // 3 merlons on top, evenly spaced along wall width
      for (let m = 0; m < 3; m++) {
        const mer = new THREE.Mesh(merGeo, wallMat);
        mer.position.set(-1.2 + m * 1.2, 3.5, 0);
        group.add(mer);
      }

      // Optional torch every other section
      if (hasTorch) {
        const stick = new THREE.Mesh(stickGeo, torchStickMat);
        stick.position.set(0, 4.4, 0.25);
        group.add(stick);

        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(0, 4.85, 0.25);
        group.add(flame);
        // No individual PointLight per wall torch — shared lights handle illumination
      }

      // Debris: 2–4 scattered objects near wall base
      const numDebris = 2 + Math.floor(Math.random() * 3);
      for (let d = 0; d < numDebris; d++) {
        if (Math.random() > 0.5) {
          // Skull
          const skull = new THREE.Mesh(skullGeo, skullMat);
          skull.scale.y = 0.8;
          skull.position.set(
            (Math.random() - 0.5) * 3,
            0.16,
            (Math.random() - 0.5) * 4
          );
          group.add(skull);
        } else {
          // Broken shield lying flat
          const shield = new THREE.Mesh(shieldGeo, shieldMat);
          shield.rotation.x = Math.PI / 2;
          shield.rotation.z = Math.random() * Math.PI * 2;
          shield.position.set(
            (Math.random() - 0.5) * 3,
            0.04,
            (Math.random() - 0.5) * 4
          );
          group.add(shield);
        }
      }

      group.position.set(x, 0, baseZ);
      this.scene.add(group);
      this._wallData.push({ group, x, baseZ });
    }

    this._wallWrapDist = numWalls * spacing;
  }

  _updateWalls(cameraZ) {
    const wrapDist = this._wallWrapDist;
    for (const wall of this._wallData) {
      let visualZ = wall.baseZ - cameraZ;
      while (visualZ > 15) visualZ -= wrapDist;
      while (visualZ < -(wrapDist - 15)) visualZ += wrapDist;
      wall.group.position.z = visualZ;
    }
  }

  // ── Hanging Banner Pool ───────────────────────────────────────────────────

  _buildBannerPool() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9, metalness: 0.0 });
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0xaa1111, roughness: 0.8, metalness: 0.0 });
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6);
    const bannerGeo = new THREE.BoxGeometry(1.2, 2.0, 0.05);

    const numBanners = 6;
    const spacing = 40;
    this._bannerData = [];

    for (let i = 0; i < numBanners; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * 10.5;
      const baseZ = i * spacing - numBanners * spacing * 0.5;
      const offset = (i / numBanners) * Math.PI * 2;

      const group = new THREE.Group();

      // Pole above banner
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(0, 4.25, 0);
      group.add(pole);

      // Banner cloth
      const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
      bannerMesh.position.set(0, 2.5, 0);
      group.add(bannerMesh);

      group.position.set(x, 0, baseZ);
      this.scene.add(group);
      this._bannerData.push({ group, x, baseZ, offset, bannerMesh });
    }

    this._bannerWrapDist = numBanners * spacing;
  }

  _updateBanners(time, cameraZ) {
    const wrapDist = this._bannerWrapDist;
    for (const b of this._bannerData) {
      let visualZ = b.baseZ - cameraZ;
      while (visualZ > 15) visualZ -= wrapDist;
      while (visualZ < -(wrapDist - 15)) visualZ += wrapDist;
      b.group.position.z = visualZ;
      // Subtle sway
      b.bannerMesh.rotation.z = Math.sin(time * 1.5 + b.offset) * 0.05;
    }
  }

  // ── Ground Fog Patches ────────────────────────────────────────────────────

  _buildFogPatches() {
    // Radial gradient canvas texture
    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = 128;
    fogCanvas.height = 128;
    const fogCtx = fogCanvas.getContext('2d');
    const fogGrad = fogCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    fogGrad.addColorStop(0, 'rgba(255,255,255,1)');
    fogGrad.addColorStop(1, 'rgba(255,255,255,0)');
    fogCtx.fillStyle = fogGrad;
    fogCtx.fillRect(0, 0, 128, 128);

    const fogTex = new THREE.CanvasTexture(fogCanvas);
    const fogMat = new THREE.SpriteMaterial({
      map: fogTex,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });

    const numFog = 12;
    const wrapDist = 200;
    this._fogData = [];

    for (let i = 0; i < numFog; i++) {
      const sprite = new THREE.Sprite(fogMat.clone());
      sprite.scale.set(8, 2, 1);
      const x = (Math.random() - 0.5) * 16;
      const baseZ = (i / numFog) * wrapDist - 100;
      const offset = (i / numFog) * Math.PI * 2;

      sprite.position.set(x, 0.3, baseZ);
      this.scene.add(sprite);
      this._fogData.push({ sprite, x, baseZ, offset });
    }

    this._fogWrapDist = wrapDist;
  }

  _updateFog(time, cameraZ) {
    const wrapDist = this._fogWrapDist;
    for (const fog of this._fogData) {
      let visualZ = fog.baseZ - cameraZ;
      while (visualZ > 15) visualZ -= wrapDist;
      while (visualZ < -(wrapDist - 15)) visualZ += wrapDist;
      fog.sprite.position.x = fog.x + Math.sin(time * 0.3 + fog.offset);
      fog.sprite.position.z = visualZ;
    }
  }

  /**
   * Merge multiple geometries (each with a position offset) into a single BufferGeometry.
   * Used to reduce draw calls for static geometry. THREE.BufferGeometryUtils is not
   * bundled in three.min.js, so this is a lightweight manual implementation.
   * @param {Array<{geometry: THREE.BufferGeometry, position: THREE.Vector3}>} entries
   * @returns {THREE.BufferGeometry}
   */
  _mergeGeometries(entries) {
    let totalVerts = 0;
    let totalIndices = 0;

    for (const e of entries) {
      const pos = e.geometry.getAttribute('position');
      totalVerts += pos.count;
      const idx = e.geometry.getIndex();
      totalIndices += idx ? idx.count : pos.count;
    }

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const indices = new Uint32Array(totalIndices);

    let vOff = 0, iOff = 0, vBase = 0;

    for (const e of entries) {
      const geo = e.geometry;
      const posAttr = geo.getAttribute('position');
      const normAttr = geo.getAttribute('normal');
      const uvAttr = geo.getAttribute('uv');
      const idxAttr = geo.getIndex();
      const count = posAttr.count;
      const px = e.position.x, py = e.position.y, pz = e.position.z;

      for (let i = 0; i < count; i++) {
        positions[(vOff + i) * 3]     = posAttr.getX(i) + px;
        positions[(vOff + i) * 3 + 1] = posAttr.getY(i) + py;
        positions[(vOff + i) * 3 + 2] = posAttr.getZ(i) + pz;
        if (normAttr) {
          normals[(vOff + i) * 3]     = normAttr.getX(i);
          normals[(vOff + i) * 3 + 1] = normAttr.getY(i);
          normals[(vOff + i) * 3 + 2] = normAttr.getZ(i);
        }
        if (uvAttr) {
          uvs[(vOff + i) * 2]     = uvAttr.getX(i);
          uvs[(vOff + i) * 2 + 1] = uvAttr.getY(i);
        }
      }

      if (idxAttr) {
        for (let i = 0; i < idxAttr.count; i++) {
          indices[iOff + i] = idxAttr.getX(i) + vBase;
        }
        iOff += idxAttr.count;
      } else {
        for (let i = 0; i < count; i++) {
          indices[iOff + i] = vBase + i;
        }
        iOff += count;
      }

      vBase += count;
      vOff += count;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    merged.setIndex(new THREE.BufferAttribute(indices, 1));
    return merged;
  }
}
