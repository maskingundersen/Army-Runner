// src/HUDController.js — UI setup, HUD updates, and screen flash

class HUDController {
  constructor(game) {
    this.game = game;
  }

  setupUI() {
    const g = this.game;
    this.hudSoldierCount = document.getElementById('hud-soldier-count');
    this.hudLevel = document.getElementById('hud-level');

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
    if (this.hudSoldierCount) this.hudSoldierCount.textContent = g.soldierCount;
    if (this.hudLevel) {
      const segDef = g.segMgr.getSegDef(g.currentSegment) || SEGMENT_DEFS[0];
      this.hudLevel.textContent = segDef.id + '/9: ' + segDef.name + this.formatCycleLabel();
    }
    const milestoneEl = document.getElementById('hud-milestone');
    if (milestoneEl) {
      if (g.milestone) {
        milestoneEl.textContent = '\uD83C\uDFC6 ' + g.milestone;
        milestoneEl.style.display = '';
      } else {
        milestoneEl.style.display = 'none';
      }
    }
    // Best run display
    const bestEl = document.getElementById('hud-best');
    if (bestEl) {
      if (g.bestMilestone) {
        bestEl.textContent = '\u2B50 Best: ' + g.bestMilestone;
        bestEl.style.display = '';
      } else {
        bestEl.style.display = 'none';
      }
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

  showCycleMessage(text) {
    const g = this.game;
    g._cycleMsg.textContent = text;
    g._cycleMsg.style.transition = 'none';
    g._cycleMsg.style.opacity = '1';
    // Force reflow so the transition reset takes effect
    void g._cycleMsg.offsetWidth;
    setTimeout(() => {
      g._cycleMsg.style.transition = 'opacity 1.5s ease-out';
      g._cycleMsg.style.opacity = '0';
    }, 500);
  }
}
