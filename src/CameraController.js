// src/CameraController.js — Cinematic TotalBattle-style camera

class CameraController {
  constructor(camera) {
    this.camera = camera;

    // Wider FOV (72°) for TotalBattle-style dramatic perspective
    this.camera.fov = 72;
    this.camera.updateProjectionMatrix();

    // Follow state
    this.targetX = 0;
    this.currentX = 0;

    // Zoom state (based on army size)
    this.zoom = 1.0;
    this.targetZoom = 1.0;

    // Shake state
    this.shakeDecay = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this._time = 0; // accumulated time for organic shake

    // Camera position constants — lower and closer for cinematic feel
    this.baseHeight = 8;
    this.baseDistance = 14;
    this.lookAtY = 0.5;
    this.lookAtZ = -12;

    // Dynamic height based on soldier count
    this.soldierCount = 0;
    this._dynamicHeightOffset = 0;

    // Combat tilt state
    this._inCombat = false;
    this._combatTiltFactor = 0; // 0 = no tilt, 1 = full tilt

    // Boss zoom-out state
    this._bossActive = false;
    this._bossBlend = 0; // 0 = normal, 1 = full boss zoom

    // Initialize camera position
    this._updateCameraPosition();
  }

  /**
   * Set target position and zoom based on army state
   * @param {number} armyX - X position of army center
   * @param {number} armyCount - Number of soldiers (affects zoom and dynamic height)
   */
  follow(armyX, armyCount) {
    this.targetX = armyX;
    this.soldierCount = armyCount || 0;
    // Zoom out as army grows: 1.0 at 0, up to 1.35 at 120+ soldiers
    this.targetZoom = 1.0 + Math.min(this.soldierCount / 120, 1.0) * 0.35;
  }

  /**
   * Trigger camera shake
   * @param {number} intensity - Shake intensity (0-5 typical)
   */
  shake(intensity) {
    this.shakeDecay = Math.max(this.shakeDecay, intensity);
  }

  /** @param {boolean} val */
  setInCombat(val) {
    this._inCombat = !!val;
  }

  /** @param {boolean} val */
  setBossActive(val) {
    this._bossActive = !!val;
  }

  /**
   * Update camera each frame
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    this._time += dt;

    // Smooth follow X position (slower smoothing: dt * 4)
    this.currentX += (this.targetX - this.currentX) * Math.min(1, dt * 4);

    // Smooth zoom
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 3);

    // Dynamic height offset based on soldier count
    let targetHeightOffset = 0;
    if (this.soldierCount > 30) {
      targetHeightOffset = Math.min((this.soldierCount - 30) * 0.05, 3);
    } else if (this.soldierCount < 10) {
      targetHeightOffset = -1; // dip for tension
    }
    this._dynamicHeightOffset += (targetHeightOffset - this._dynamicHeightOffset) * Math.min(1, dt * 3);

    // Combat tilt transition
    const combatTarget = this._inCombat ? 1 : 0;
    this._combatTiltFactor += (combatTarget - this._combatTiltFactor) * Math.min(1, dt * 4);

    // Boss zoom blend transition
    const bossTarget = this._bossActive ? 1 : 0;
    this._bossBlend += (bossTarget - this._bossBlend) * Math.min(1, dt * 2);

    // Organic directional shake using summed sine waves
    if (this.shakeDecay > 0) {
      const t = this._time;
      this.shakeOffsetX = (Math.sin(t * 47) * 0.5 + Math.sin(t * 83) * 0.3 + Math.sin(t * 131) * 0.2) * this.shakeDecay;
      this.shakeOffsetY = (Math.sin(t * 53) * 0.3 + Math.sin(t * 97) * 0.3 + Math.sin(t * 147) * 0.2) * this.shakeDecay;
      this.shakeDecay -= dt * 8;
      if (this.shakeDecay < 0.01) {
        this.shakeDecay = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }

    this._updateCameraPosition();
  }

  /**
   * Internal: set camera position and lookAt
   */
  _updateCameraPosition() {
    // Boss zoom-out: interpolate baseDistance (14→22) and baseHeight (8→14)
    const height = (this.baseHeight + (14 - this.baseHeight) * this._bossBlend) + this._dynamicHeightOffset;
    const distance = this.baseDistance + (22 - this.baseDistance) * this._bossBlend;

    const x = this.currentX + this.shakeOffsetX;
    const y = height * this.zoom + this.shakeOffsetY;
    const z = distance * this.zoom;

    this.camera.position.set(x, y, z);

    // Combat tilt: shift lookAt forward by up to -3 on Z
    const lookZ = this.lookAtZ + this._combatTiltFactor * -3;
    this.camera.lookAt(this.currentX, this.lookAtY, lookZ);
  }

  /**
   * Get current X position (for effects positioning)
   */
  get x() {
    return this.currentX;
  }
}
