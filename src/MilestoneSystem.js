// src/MilestoneSystem.js — Milestone tracking and persistence

const MILESTONE_ORDER = [
  'Reached Ogre',
  'Defeated Ogre',
  'Reached Giant',
  'Defeated Giant',
  'Reached Fire Dragon',
  'Defeated Fire Dragon',
];

class MilestoneSystem {
  constructor(game) {
    this.game = game;
  }

  loadBestMilestone() {
    try {
      return localStorage.getItem('armyrunner_best') || '';
    } catch (_) { return ''; }
  }

  saveBestMilestone() {
    const g = this.game;
    // Compare milestone rankings
    const currentIdx = MILESTONE_ORDER.indexOf(g.milestone);
    const bestIdx = MILESTONE_ORDER.indexOf(g.bestMilestone);

    // Cycle milestones are always better than pre-defined ones
    const isCycleMilestone = g.milestone.startsWith('Cycle');
    const isBestCycle = g.bestMilestone.startsWith('Cycle');

    let newBest = false;
    if (isCycleMilestone && !isBestCycle) {
      newBest = true;
    } else if (isCycleMilestone && isBestCycle) {
      const curCycle = parseInt(g.milestone.replace('Cycle ', '')) || 0;
      const bestCycle = parseInt(g.bestMilestone.replace('Cycle ', '')) || 0;
      newBest = curCycle > bestCycle;
    } else if (!isCycleMilestone && !isBestCycle) {
      newBest = currentIdx > bestIdx;
    }

    if (newBest || !g.bestMilestone) {
      g.bestMilestone = g.milestone;
      try {
        localStorage.setItem('armyrunner_best', g.milestone);
      } catch (_) {}
    }
  }
}
