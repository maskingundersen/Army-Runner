// src/HUDController.js — UI setup, HUD updates, and screen flash

class HUDController {
  constructor(game) {
    this.game = game;
    this._lastCount = null;
  }

  setupUI() {
    const g = this.game;
    this.hudSoldierCount = document.getElementById('hud-soldier-count');
    this.hudEnemyCount = document.getElementById('hud-enemy-count');
    this.hudLevel = document.getElementById('hud-level');
    this.hudArmyCount = document.getElementById('hud-army-count');

    // Show best milestone on boot screen
    const bootBest = document.getElementById('boot-best');
    if (bootBest && g.bestMilestone) {
      bootBest.textContent = '\u2B50 Best Run: ' + g.bestMilestone;
      bootBest.style.display = '';
    }

    // Boot screen play button
    document.getElementById('boot-play-btn').addEventListener('click', () => {
      g.startGame();
    });

    // Exit button — return to boot screen
    document.getElementById('hud-exit-btn').addEventListener('click', () => {
      document.getElementById('hud').style.opacity = '0';
      document.getElementById('screen-boot').classList.add('active');
      this.updateBootBest();
      g.state = 'boot';
    });

    // Win screen buttons
    document.getElementById('win-next-btn').addEventListener('click', () => {
      document.getElementById('screen-win').classList.remove('active');
      g.startGame();
    });

    document.getElementById('win-menu-btn').addEventListener('click', () => {
      document.getElementById('screen-win').classList.remove('active');
      document.getElementById('screen-boot').classList.add('active');
      document.getElementById('hud').style.opacity = '0';
      this.updateBootBest();
      g.state = 'boot';
    });

    // Lose screen buttons
    document.getElementById('lose-retry-btn').addEventListener('click', () => {
      document.getElementById('screen-lose').classList.remove('active');
      g.startGame();
    });

    document.getElementById('lose-menu-btn').addEventListener('click', () => {
      document.getElementById('screen-lose').classList.remove('active');
      document.getElementById('screen-boot').classList.add('active');
      document.getElementById('hud').style.opacity = '0';
      this.updateBootBest();
      g.state = 'boot';
    });
  }

  updateBootBest() {
    const bootBest = document.getElementById('boot-best');
    if (bootBest && this.game.bestMilestone) {
      bootBest.textContent = '\u2B50 Best Run: ' + this.game.bestMilestone;
      bootBest.style.display = '';
    }
  }

  formatCycleLabel() {
    return this.game.segmentCycle > 0 ? ' C' + (this.game.segmentCycle + 1) : '';
  }

  updateHUD() {
    const g = this.game;

    // Soldier count (bottom center)
    if (this.hudSoldierCount) this.hudSoldierCount.textContent = g.soldierCount;

    // Enemy countdown (shield, top center)
    if (this.hudEnemyCount) {
      this.hudEnemyCount.textContent = g.enemyMgr ? g.enemyMgr.count : 0;
    }

    // Hidden level label (kept for compatibility)
    if (this.hudLevel) {
      const segDef = g.segMgr.getSegDef(g.currentSegment) || SEGMENT_DEFS[0];
      this.hudLevel.textContent = segDef.id + '/9: ' + segDef.name + this.formatCycleLabel();
    }

    // Hidden milestone (kept for compatibility)
    const milestoneEl = document.getElementById('hud-milestone');
    if (milestoneEl) {
      if (g.milestone) {
        milestoneEl.textContent = '\uD83C\uDFC6 ' + g.milestone;
        milestoneEl.style.display = '';
      } else {
        milestoneEl.style.display = 'none';
      }
    }

    // Hidden best run (kept for compatibility)
    const bestEl = document.getElementById('hud-best');
    if (bestEl) {
      if (g.bestMilestone) {
        bestEl.textContent = '\u2B50 Best: ' + g.bestMilestone;
        bestEl.style.display = '';
      } else {
        bestEl.style.display = 'none';
      }
    }

    // Pop animation on count change
    if (this.hudArmyCount && g.soldierCount !== this._lastCount) {
      this.hudArmyCount.classList.remove('count-pop');
      void this.hudArmyCount.offsetWidth;
      this.hudArmyCount.classList.add('count-pop');
      this._lastCount = g.soldierCount;
    }
  }

  updateScreenFlash() {
    const alpha = this.game.effects.screenFlashAlpha;
    const flashEl = document.getElementById('screen-flash');

    if (flashEl) {
      if (alpha > 0.01) {
        flashEl.style.opacity = alpha;
        const colorHex = Math.max(0, Math.min(0xffffff, Math.floor(this.game.effects.screenFlashColor)));
        flashEl.style.backgroundColor = '#' + colorHex.toString(16).padStart(6, '0');
      } else {
        flashEl.style.opacity = '0';
      }
    }
  }

  showBossBar(bossName) {
    const bar = document.getElementById('hud-boss-bar');
    if (bar) {
      document.getElementById('boss-name').textContent = bossName.toUpperCase();
      document.getElementById('boss-bar-fill').style.width = '100%';
      bar.style.display = '';
    }
  }

  hideBossBar() {
    const bar = document.getElementById('hud-boss-bar');
    if (bar) bar.style.display = 'none';
  }

  updateBossBar(ratio) {
    const fill = document.getElementById('boss-bar-fill');
    if (fill) fill.style.width = (ratio * 100) + '%';
  }

  setCombatVignette(active) {
    const el = document.getElementById('screen-combat-vignette');
    if (el) el.style.opacity = active ? '1' : '0';
  }

  showCycleMessage(text) {
    const g = this.game;
    g._cycleMsg.textContent = text;
    g._cycleMsg.style.transition = 'none';
    g._cycleMsg.style.opacity = '1';
    void g._cycleMsg.offsetWidth;
    setTimeout(() => {
      g._cycleMsg.style.transition = 'opacity 1.5s ease-out';
      g._cycleMsg.style.opacity = '0';
    }, 500);
  }

  updateGateArrow(nearestGateDistance, gateIsPositive) {
    const el = document.getElementById('gate-arrow');
    if (!el) return;
    if (nearestGateDistance <= 40) {
      el.style.display = '';
      el.style.color = gateIsPositive ? '#00ff44' : '#ff2222';
    } else {
      el.style.display = 'none';
    }
  }
}
