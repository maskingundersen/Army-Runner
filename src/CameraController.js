// src/CameraController.js — Fixed-angle top-down 3D perspective camera

class CameraController {
  constructor(camera) {
    this.camera = camera;

    // 65° FOV for clean top-down perspective
    this.camera.fov = 65;
    this.camera.updateProjectionMatrix();

    // Follow state
    this.targetX = 0;
    this.currentX = 0;

    // Camera position constants — above and behind the squad
    this.baseHeight = 12;
    this.baseDistance = 14;

    // Shake state
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this._time = 0;

    // Initialize camera position
    this._updateCameraPosition();
  }

  /**
   * Set target position based on army state
   * @param {number} armyX - X position of army center
   * @param {number} armyCount - Number of soldiers
   */
  follow(armyX, armyCount) {
    this.targetX = armyX;
  }

  /**
   * Trigger camera shake (±0.1 offset for 300ms)
   * @param {number} intensity - Shake intensity
   */
  shake(intensity) {
    this.shakeTimer = 0.3;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  /** @param {boolean} val — no-op, preserved for API compatibility */
  setInCombat(val) {}

  /** @param {boolean} val — no-op, preserved for API compatibility */
  setBossActive(val) {}

  /**
   * Update camera each frame
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    this._time += dt;

    // Smooth follow X position
    this.currentX += (this.targetX - this.currentX) * Math.min(1, dt * 4);

    // Organic sine-wave shake for 300ms
    if (this.shakeTimer > 0) {
      const t = this._time;
      const blend = this.shakeTimer / 0.3;
      const mag = 0.1 * this.shakeIntensity * blend;
      this.shakeOffsetX = (Math.sin(t * 47) * 0.5 + Math.sin(t * 83) * 0.3 + Math.sin(t * 131) * 0.2) * mag;
      this.shakeOffsetY = (Math.sin(t * 53) * 0.3 + Math.sin(t * 97) * 0.3 + Math.sin(t * 147) * 0.2) * mag;
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) {
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
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
    const x = this.currentX + this.shakeOffsetX;
    const y = this.baseHeight + this.shakeOffsetY;
    const z = this.baseDistance;

    this.camera.position.set(x, y, z);

    // Look down-forward at ~65° angle
    this.camera.lookAt(this.currentX, 0, z - 20);
  }

  /**
   * Get current X position (for effects positioning)
   */
  get x() {
    return this.currentX;
  }
}
