// src/game.js — Phaser 3 game configuration

const GAME_WIDTH = 390;
const GAME_HEIGHT = 844;

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, GameScene, UIScene, UpgradeScene, WinScene, LoseScene],
};

const game = new Phaser.Game(config);
