# Army Runner 🎮

A mobile-first army runner game inspired by "gate mechanic" mobile ads — built with **Phaser 3** and playable directly in Safari on iPhone. No downloads or installs needed!

---

## 🎮 What Is It?
You command an army that marches forward automatically. Gates appear on the road — each with a modifier:
- 🟢 **Green gates** are good (`+20`, `x2`, `x3` soldiers…)
- 🔴 **Red gates** are bad (`-10`, `x0.5`…)

Steer your army through the right gates, grow your forces, then battle the enemy at the end of each level!

---

## 📱 How to Play
| Action | Control |
|--------|---------|
| Steer left/right | Swipe / drag on the screen |
| Pick a gate | Move your army into one side of the gate pair |
| Win a level | Defeat all enemies at the end |
| Retry | Tap "Retry Level" on the Game Over screen |

### Tips
- **Green gates** grow your army — try to chain multipliers (`x2`, `x3`)!
- **Red gates** shrink your army — avoid them especially near the battle
- You always need **more soldiers than enemies** to win the battle

---

## 🏆 Levels
| Level | Gates | Enemies | Bad Gate Chance |
|-------|-------|---------|----------------|
| 1 | 4 | 15 | 30% |
| 2 | 5 | 25 | 35% |
| 3 | 6 | 35 | 40% |
| 4 | 7 | 50 | 45% |
| 5 | 8 | 70 | 50% |

---

## 🚀 How to Enable GitHub Pages (host for free)
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch** → choose `main` → `/ (root)`
4. Click **Save**
5. After a minute, GitHub will give you a URL like `https://yourusername.github.io/Army-Runner/`

---

## 📲 How to Open on iPhone
1. Enable GitHub Pages (see above)
2. Open **Safari** on your iPhone
3. Navigate to your GitHub Pages URL
4. **Optional:** Tap the Share button → "Add to Home Screen" to install it like an app!

---

## 🛠 File Structure
```
/
├── index.html              # Main entry point, loads Phaser 3 via CDN
├── src/
│   ├── game.js             # Phaser game config
│   └── scenes/
│       ├── BootScene.js    # Title / start screen
│       ├── GameScene.js    # Main gameplay (army, gates, battle)
│       ├── UIScene.js      # HUD overlay (soldier count)
│       ├── WinScene.js     # Level complete screen
│       └── LoseScene.js    # Game over screen
└── README.md
```

---

## 🧰 Tech Stack
- [Phaser 3](https://phaser.io/) — loaded via CDN (no build step needed)
- Pure HTML/CSS/JS — works in any modern browser
- Deployable via GitHub Pages with zero configuration
