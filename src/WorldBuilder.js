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

    // Directional sun light - stronger with better shadows
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
    sun.position.set(8, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
    this.sun = sun;

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
    const skyGeo = new THREE.SphereGeometry(500, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x1a2a4a, side: THREE.BackSide });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);
  }

  buildRoad() {
    // Ground plane - rich medieval green
    const groundGeo = new THREE.PlaneGeometry(80, 400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.95, metalness: 0.0 });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.set(0, -0.02, -120);
    this.groundMesh.receiveShadow = true;
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
      patch.receiveShadow = true;
      this.scene.add(patch);
    }

    // Parallax distant ground plane
    const parGeo = new THREE.PlaneGeometry(120, 600);
    const parMat = new THREE.MeshStandardMaterial({ color: 0x2e5a22, roughness: 0.95, metalness: 0.0 });
    this.parallaxGround = new THREE.Mesh(parGeo, parMat);
    this.parallaxGround.rotation.x = -Math.PI / 2;
    this.parallaxGround.position.set(0, -0.1, -180);
    this.parallaxGround.receiveShadow = true;
    this.scene.add(this.parallaxGround);
    this._parallaxBaseZ = -180;

    // Road strip - dark stone surface
    const roadGeo = new THREE.PlaneGeometry(20, 400);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.9, metalness: 0.05 });
    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.set(0, -0.01, -120);
    this.roadMesh.receiveShadow = true;
    this.scene.add(this.roadMesh);

    // Subtle road crack lines
    const crackMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.95, metalness: 0.0 });
    const crackOffsets = [-3.2, -0.8, 1.5, 4.1];
    for (let i = 0; i < crackOffsets.length; i++) {
      const crackGeo = new THREE.BoxGeometry(0.08, 0.01, 3);
      const crack = new THREE.Mesh(crackGeo, crackMat);
      crack.position.set(crackOffsets[i], 0.001, -120 + i * 70);
      this.scene.add(crack);
    }

    // Stone tile dividing dashes (center line)
    const dashGeo = new THREE.BoxGeometry(0.3, 0.02, 0.8);
    const dashMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.85, metalness: 0.0 });
    this.dashMesh = new THREE.InstancedMesh(dashGeo, dashMat, 50);
    this.dashMesh.position.y = 0.01;
    this.scene.add(this.dashMesh);
    this.updateDashes(0);

    // Stone kerb road edges
    const edgeGeo = new THREE.BoxGeometry(0.3, 0.15, 400);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.85, metalness: 0.0 });
    const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
    const rightEdge = new THREE.Mesh(edgeGeo, edgeMat.clone());
    leftEdge.position.set(-9.8, 0.075, -120);
    rightEdge.position.set(9.8, 0.075, -120);
    this.scene.add(leftEdge, rightEdge);
    this.leftEdge = leftEdge;
    this.rightEdge = rightEdge;
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
    this.trunkMesh.castShadow = true;

    // One instanced mesh per foliage layer
    this.foliageLayers = [];
    for (let l = 0; l < foliageGeos.length; l++) {
      const mat = foliageMats[l % foliageMats.length];
      const im = new THREE.InstancedMesh(foliageGeos[l], mat, numTrees);
      im.castShadow = true;
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

    this.torchLights = [];
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

      const light = new THREE.PointLight(0xff6600, 1.5, 8);
      light.position.set(x, 1.8, z);
      this.scene.add(light);
      this.torchLights.push(light);
    }

    this.torchStickMesh.instanceMatrix.needsUpdate = true;
    this.torchFlameMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.torchStickMesh);
    this.scene.add(this.torchFlameMesh);
  }

  updateTorches(cameraZ) {
    const m = new THREE.Matrix4();
    const wrapDist = this.torchData.length * 30;

    for (let i = 0; i < this.torchData.length; i++) {
      const t = this.torchData[i];
      let visualZ = t.z - cameraZ;

      while (visualZ > 40) visualZ -= wrapDist;
      while (visualZ < -wrapDist + 40) visualZ += wrapDist;

      m.makeTranslation(t.x, 0.75, visualZ);
      this.torchStickMesh.setMatrixAt(i, m);

      m.makeTranslation(t.x, 1.6, visualZ);
      this.torchFlameMesh.setMatrixAt(i, m);

      this.torchLights[i].position.set(t.x, 1.8, visualZ);
    }

    this.torchStickMesh.instanceMatrix.needsUpdate = true;
    this.torchFlameMesh.instanceMatrix.needsUpdate = true;
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
      this.skyDome.material.color.setHex(palette.skyColor);
    }
    this.scene.background = new THREE.Color(palette.skyColor);
    this.scene.fog.color.set(palette.skyColor);
    this.scene.fog.near = palette.fogNear;
    this.scene.fog.far = palette.fogFar;
    this.groundMesh.material.color.setHex(palette.groundColor);
    this.roadMesh.material.color.setHex(palette.roadColor);
  }
}
