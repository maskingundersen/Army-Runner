// src/WorldBuilder.js — Environment construction and scrolling updates

const ENV_PALETTES = [
  { skyColor: 0x7dd5f0, groundColor: 0x3a7a2a, roadColor: 0x333344, fogNear: 40, fogFar: 160 },
  { skyColor: 0xf0d090, groundColor: 0xc4a55a, roadColor: 0x4a4035, fogNear: 50, fogFar: 180 },
  { skyColor: 0xd0e8f0, groundColor: 0xe8f0f0, roadColor: 0x5a6a70, fogNear: 35, fogFar: 140 },
  { skyColor: 0x6a3020, groundColor: 0x3a2a2a, roadColor: 0x2a1a1a, fogNear: 30, fogFar: 120 },
  { skyColor: 0x1a1a2a, groundColor: 0x2a2a3a, roadColor: 0x1a1a25, fogNear: 25, fogFar: 100 },
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
  }

  buildRoad() {
    // Ground plane - extends far with better material
    const groundGeo = new THREE.PlaneGeometry(80, 400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.95, metalness: 0.0 });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.set(0, -0.02, -120);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Road strip (wider for formation gameplay) with asphalt-like material
    const roadGeo = new THREE.PlaneGeometry(20, 400);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.85, metalness: 0.05 });
    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.set(0, -0.01, -120);
    this.roadMesh.receiveShadow = true;
    this.scene.add(this.roadMesh);

    // Road dashes (white center line)
    const dashGeo = new THREE.BoxGeometry(0.12, 0.02, 1.2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.dashMesh = new THREE.InstancedMesh(dashGeo, dashMat, 50);
    this.dashMesh.position.y = 0.01;
    this.scene.add(this.dashMesh);
    this.updateDashes(0);

    // Road edge lines (yellow)
    const edgeGeo = new THREE.BoxGeometry(0.15, 0.02, 400);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
    const rightEdge = new THREE.Mesh(edgeGeo, edgeMat.clone());
    leftEdge.position.set(-9.8, 0.01, -120);
    rightEdge.position.set(9.8, 0.01, -120);
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
      // Wrap based on camera scroll
      let z = -((baseZ - ((-cameraZ) % (spacing * numDashes))) % (spacing * numDashes));
      if (z > 10) z -= spacing * numDashes;

      m.makeTranslation(0, 0.01, z);
      this.dashMesh.setMatrixAt(i, m);
    }
    this.dashMesh.instanceMatrix.needsUpdate = true;
  }

  buildTrees() {
    // Create tree geometry (low-poly tree with better materials)
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 1.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9, metalness: 0.0 });

    const foliageGeo = new THREE.ConeGeometry(0.8, 2, 8);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2a5a2a, roughness: 0.85, metalness: 0.0 });

    // Create instanced meshes for trees
    const numTrees = 80;
    this.trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, numTrees);
    this.foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, numTrees);

    this.trunkMesh.castShadow = true;
    this.foliageMesh.castShadow = true;

    // Position trees along road sides
    const m = new THREE.Matrix4();
    const treeData = [];

    for (let i = 0; i < numTrees; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const baseX = side * (12 + Math.random() * 10);
      const baseZ = (i * 4) - 80 + (Math.random() - 0.5) * 2;
      const scale = 0.8 + Math.random() * 0.6;

      treeData.push({ x: baseX, z: baseZ, scale });

      // Trunk
      m.makeTranslation(baseX, 0.75 * scale, baseZ);
      m.scale(new THREE.Vector3(scale, scale, scale));
      this.trunkMesh.setMatrixAt(i, m);

      // Foliage
      m.makeTranslation(baseX, 2.2 * scale, baseZ);
      m.scale(new THREE.Vector3(scale, scale, scale));
      this.foliageMesh.setMatrixAt(i, m);
    }

    this.treeData = treeData;
    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.foliageMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.trunkMesh);
    this.scene.add(this.foliageMesh);
  }

  updateTrees(cameraZ) {
    // Update tree positions based on scroll
    const m = new THREE.Matrix4();
    const wrapDist = 320;

    for (let i = 0; i < this.treeData.length; i++) {
      const tree = this.treeData[i];

      // Calculate visual Z position
      let visualZ = tree.z - cameraZ;

      // Wrap trees that go behind camera
      while (visualZ > 40) visualZ -= wrapDist;
      while (visualZ < -280) visualZ += wrapDist;

      const scale = tree.scale;

      // Trunk
      m.makeTranslation(tree.x, 0.75 * scale, visualZ);
      m.scale(new THREE.Vector3(scale, scale, scale));
      this.trunkMesh.setMatrixAt(i, m);

      // Foliage
      m.makeTranslation(tree.x, 2.2 * scale, visualZ);
      m.scale(new THREE.Vector3(scale, scale, scale));
      this.foliageMesh.setMatrixAt(i, m);
    }

    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.foliageMesh.instanceMatrix.needsUpdate = true;
  }

  applyEnvPalette(segmentCycle) {
    const palette = ENV_PALETTES[segmentCycle % ENV_PALETTES.length];
    this.scene.background = new THREE.Color(palette.skyColor);
    this.scene.fog.color.set(palette.skyColor);
    this.scene.fog.near = palette.fogNear;
    this.scene.fog.far = palette.fogFar;
    this.groundMesh.material.color.setHex(palette.groundColor);
    this.roadMesh.material.color.setHex(palette.roadColor);
  }
}
