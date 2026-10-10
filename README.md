# 🐍 Neon Snake Arcade

A modern, attractive arcade-style Snake Eating Game built using clean HTML5 Canvas, modern CSS3, and vanilla JavaScript with synthesized retro audio.

---

## ✨ Features

- **Arcade Visuals**: Cyberpunk dark background with an animated neon-green snake, glowing red apples, and sparkling golden bonus stars.
- **Dynamic Speed Progression**: As your score increases, the snake's speed accelerates gradually (+10 points per apple eaten), elevating the challenge.
- **Synthesized 8-Bit Audio**: Retro sound effects (eating, golden star bonus, speed milestone, game over crash, UI clicks) synthesized on-the-fly via the **Web Audio API** — zero external audio files required!
- **Anti-Suicide Input Queue**: Eliminates 180° accidental reversals caused by fast keystrokes (e.g., quickly pressing `Down` then `Left` while moving `Right`).
- **Persistent High Score**: Best scores are automatically saved to `localStorage`.
- **Multi-Platform Controls**:
  - **Desktop**: Arrow keys and `W`, `A`, `S`, `D`.
  - **Mobile / Tablet**: Responsive virtual D-Pad buttons and touch swipe gestures.
  - **Game Actions**: Start, Pause, Resume, and Restart buttons on both the interface and modal overlays.
- **Responsive Layout**: Designed for mobile phones, tablets, and desktop displays with Retina / High-DPI canvas support.

---

## 🎮 How to Play

### Controls
| Action | Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Move Up** | `W` or `↑` | Tap **▲** or Swipe Up |
| **Move Down** | `S` or `↓` | Tap **▼** or Swipe Down |
| **Move Left** | `A` or `←` | Tap **◀** or Swipe Left |
| **Move Right** | `D` or `→` | Tap **▶** or Swipe Right |
| **Pause / Resume** | `Space` or `P` | Tap **Pause** / **Resume** button |
| **Restart** | `R` | Tap **Restart** button |

### Scoring & Rules
- 🍎 **Glowing Red Apple**: +10 Points. Snake length increases by 1 segment, and speed increases slightly.
- ⭐ **Golden Star**: +50 Bonus Points. Appears periodically on a timer with a circular countdown ring.
- 💥 **Game Over**: Colliding with the game board borders (walls) or the snake's own body ends the game.

---

## 🚀 How to Run Locally

You can run the game directly in any web browser without needing to install any dependencies, build tools, or web servers:

1. Navigate to the project directory:
   ```
   C:\Users\udayi\.gemini\antigravity\scratch\snake-game
   ```
2. Double-click **`index.html`** or right-click and choose **Open With > Google Chrome / Microsoft Edge / Firefox**.
3. Alternatively, launch it via PowerShell:
   ```powershell
   Start-Process "C:\Users\udayi\.gemini\antigravity\scratch\snake-game\index.html"
   ```

---

## 📁 Project Structure

```
snake-game/
├── index.html     # Semantic HTML5 markup, scoreboard, and overlays
├── style.css      # Modern neon arcade stylesheet & responsive layout
├── game.js        # Game engine, input buffering, audio synth & canvas rendering
└── README.md      # Game documentation & local run guide
```
