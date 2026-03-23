// src/CameraController.js — Manages THREE.PerspectiveCamera for the game

class CameraController {
  constructor(camera) {
    this.camera = camera;
    
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
    
    // Camera position constants — close & low for high-intensity feel
    this.baseHeight = 9;
    this.baseDistance = 14;
    this.lookAtY = 0.5;
    this.lookAtZ = -12; // Look closer ahead so army fills bottom 50% of screen
    
    // Initialize camera position
    this._updateCameraPosition();
  }
  
  /**
   * Set target position and zoom based on army state
   * @param {number} armyX - X position of army center
   * @param {number} armyCount - Number of soldiers (affects zoom)
   */
  follow(armyX, armyCount) {
    this.targetX = armyX;
    // Zoom out as army grows: 1.0 at 0, up to 1.35 at 120+ soldiers (less zoom to keep intensity)
    this.targetZoom = 1.0 + Math.min(armyCount / 120, 1.0) * 0.35;
  }
  
  /**
   * Trigger camera shake
   * @param {number} intensity - Shake intensity (0-5 typical)
   */
  shake(intensity) {
    this.shakeDecay = Math.max(this.shakeDecay, intensity);
  }
  
  /**
   * Update camera each frame
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Smooth follow X position
    const followSpeed = 7;
    this.currentX += (this.targetX - this.currentX) * Math.min(1, dt * followSpeed);
    
    // Smooth zoom
    const zoomSpeed = 3;
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * zoomSpeed);
    
    // Update shake
    if (this.shakeDecay > 0) {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeDecay * 0.5;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeDecay * 0.3;
      this.shakeDecay -= dt * 8; // Decay shake over time
      if (this.shakeDecay < 0.01) {
        this.shakeDecay = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }
    
    // Apply camera position
    this._updateCameraPosition();
  }
  
  /**
   * Internal: set camera position and lookAt
   */
  _updateCameraPosition() {
    const x = this.currentX + this.shakeOffsetX;
    const y = this.baseHeight * this.zoom + this.shakeOffsetY;
    const z = this.baseDistance * this.zoom;
    
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.currentX, this.lookAtY, this.lookAtZ);
  }
  
  /**
   * Get current X position (for effects positioning)
   */
  get x() {
    return this.currentX;
  }
}
