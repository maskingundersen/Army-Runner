// src/systems/Pool.js — Generic object pool (critical for 60fps on iPhone)

class Pool {
  constructor(createFn, resetFn, maxSize) {
    this._create = createFn;
    this._reset  = resetFn;
    this._free   = [];
    this._active = [];
    this._max    = maxSize || 300;
  }

  /** Obtain an object from the pool (or create one) and call resetFn on it. */
  get(overrides) {
    let obj;
    if (this._free.length > 0) {
      obj = this._free.pop();
    } else if (this._active.length < this._max) {
      obj = this._create();
    } else {
      return null; // pool exhausted
    }
    this._reset(obj, overrides || {});
    this._active.push(obj);
    return obj;
  }

  /** Return an object to the pool. */
  release(obj) {
    const idx = this._active.indexOf(obj);
    if (idx !== -1) {
      this._active.splice(idx, 1);
      this._free.push(obj);
    }
  }

  /** Release all active objects at once. */
  releaseAll() {
    while (this._active.length > 0) {
      this._free.push(this._active.pop());
    }
  }

  /** Iterate over active objects. */
  forEach(fn) {
    // iterate a copy so removals inside fn are safe
    const snap = this._active.slice();
    snap.forEach(fn);
  }

  get size() { return this._active.length; }
}
