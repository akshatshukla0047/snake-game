/**
 * ============================================================================
 * Neon Snake Arcade - Game Engine
 * Fully featured, responsive, arcade-style Snake Eating Game
 * ============================================================================
 */

(function () {
  'use strict';

  // --- Sound Effects System (Web Audio API - Zero dependencies) ---
  class SoundController {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      // Load preference if saved
      const savedMute = localStorage.getItem('snake_audio_muted');
      if (savedMute !== null) {
        this.enabled = savedMute !== 'true';
      }
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
      if (!this.enabled || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (err) {
        // Audio error caught safely
      }
    }

    eat() {
      if (!this.enabled) return;
      this.init();
      // Upbeat 2-step chirp
      this.playTone(540, 'sine', 0.08, 0.14);
      setTimeout(() => this.playTone(820, 'sine', 0.1, 0.16), 65);
    }

    bonus() {
      if (!this.enabled) return;
      this.init();
      // Arpeggio fanfare
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 'triangle', 0.1, 0.18), idx * 60);
      });
    }

    speedUp() {
      if (!this.enabled) return;
      this.init();
      this.playTone(587.33, 'triangle', 0.08, 0.12);
      setTimeout(() => this.playTone(880, 'sine', 0.14, 0.15), 80);
    }

    gameOver() {
      if (!this.enabled) return;
      this.init();
      // Retro crash descent
      this.playTone(330, 'sawtooth', 0.14, 0.22);
      setTimeout(() => this.playTone(220, 'sawtooth', 0.2, 0.25), 110);
      setTimeout(() => this.playTone(110, 'sawtooth', 0.45, 0.3), 290);
    }

    click() {
      if (!this.enabled) return;
      this.init();
      this.playTone(400, 'sine', 0.03, 0.05);
    }

    toggleMute() {
      this.enabled = !this.enabled;
      localStorage.setItem('snake_audio_muted', (!this.enabled).toString());
      return this.enabled;
    }
  }

  // --- Particle FX System ---
  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 1.2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.life = 1.0;
      this.decay = Math.random() * 0.045 + 0.03;
      this.color = color;
      this.size = Math.random() * 4 + 2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.95;
      this.vy *= 0.95;
      this.life -= this.decay;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- Main Snake Game Class ---
  class SnakeGame {
    constructor() {
      // Game States
      this.STATE = {
        READY: 'READY',
        PLAYING: 'PLAYING',
        PAUSED: 'PAUSED',
        GAME_OVER: 'GAME_OVER'
      };
      this.state = this.STATE.READY;

      // Canvas & Rendering
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.GRID_SIZE = 20; // 20x20 grid
      this.cellSize = 20; // Computed dynamically for resolution

      // UI Elements
      this.scoreEl = document.getElementById('score-val');
      this.highScoreEl = document.getElementById('high-score-val');
      this.speedEl = document.getElementById('speed-val');
      this.statusBadge = document.getElementById('game-status-badge');
      this.statusText = document.getElementById('game-status-text');

      // Overlays
      this.startOverlay = document.getElementById('start-overlay');
      this.pauseOverlay = document.getElementById('pause-overlay');
      this.gameOverOverlay = document.getElementById('gameover-overlay');
      this.finalScoreEl = document.getElementById('final-score-val');
      this.finalApplesEl = document.getElementById('final-apples-val');
      this.finalLengthEl = document.getElementById('final-length-val');
      this.newHighScoreAlert = document.getElementById('new-highscore-alert');

      // Buttons
      this.btnStart = document.getElementById('btn-start');
      this.btnPause = document.getElementById('btn-pause');
      this.btnResume = document.getElementById('btn-resume');
      this.btnRestart = document.getElementById('btn-restart');
      this.btnOverlayStart = document.getElementById('overlay-btn-start');
      this.btnOverlayResume = document.getElementById('overlay-btn-resume');
      this.btnOverlayRestartPause = document.getElementById('overlay-btn-restart-pause');
      this.btnOverlayRestartOver = document.getElementById('overlay-btn-restart-over');
      this.btnSound = document.getElementById('btn-sound');
      this.soundIcon = document.getElementById('sound-icon');
      this.soundText = document.getElementById('sound-text');
      this.difficultySelect = document.getElementById('difficulty-select');

      // D-Pad buttons
      this.dpadUp = document.getElementById('dpad-up');
      this.dpadDown = document.getElementById('dpad-down');
      this.dpadLeft = document.getElementById('dpad-left');
      this.dpadRight = document.getElementById('dpad-right');

      // Audio & VFX
      this.sound = new SoundController();
      this.particles = [];

      // Game Variables
      this.snake = [];
      this.direction = { x: 1, y: 0 };
      this.inputQueue = []; // Input buffer to prevent self-collision on rapid turns
      this.food = { x: 15, y: 10 };
      this.goldenFood = null;
      this.goldenTimer = null;
      this.goldenTimeLeft = 0;
      this.score = 0;
      this.applesEaten = 0;
      this.highScore = this.loadHighScore();
      this.highScoreAchievedInSession = false;

      // Speed Timing & Loop
      this.baseTickInterval = 110; // ms
      this.currentTickInterval = 110;
      this.speedLevel = 1;
      this.lastFrameTime = 0;
      this.accumulatedTime = 0;
      this.animationFrameId = null;

      // Bind methods
      this.loop = this.loop.bind(this);

      // Initialize
      this.init();
    }

    init() {
      this.setupCanvasResolution();
      window.addEventListener('resize', () => this.setupCanvasResolution());

      this.updateHighScoreDisplay();
      this.updateAudioButtonDisplay();
      this.bindEvents();
      this.resetGameData();
      this.setGameState(this.STATE.READY);

      // Start continuous animation loop for idle render & smooth particles
      this.lastFrameTime = performance.now();
      this.animationFrameId = requestAnimationFrame(this.loop);
    }

    setupCanvasResolution() {
      // Support crisp rendering
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const size = Math.floor(Math.min(rect.width || 400, 440));
      
      this.canvas.width = size * dpr;
      this.canvas.height = size * dpr;
      this.ctx.resetTransform?.();
      this.ctx.scale(dpr, dpr);
      this.displaySize = size;
      this.cellSize = size / this.GRID_SIZE;
    }

    loadHighScore() {
      try {
        const val = localStorage.getItem('snake_arcade_highscore');
        return val ? parseInt(val, 10) : 0;
      } catch (e) {
        return 0;
      }
    }

    saveHighScore(val) {
      try {
        localStorage.setItem('snake_arcade_highscore', val.toString());
      } catch (e) {
        // Fallback for restricted storage environments
      }
    }

    updateHighScoreDisplay() {
      this.highScoreEl.textContent = this.highScore;
    }

    updateAudioButtonDisplay() {
      if (this.sound.enabled) {
        this.soundIcon.textContent = '🔊';
        this.soundText.textContent = 'Sound';
      } else {
        this.soundIcon.textContent = '🔇';
        this.soundText.textContent = 'Muted';
      }
    }

    setGameState(newState) {
      this.state = newState;

      // Update badge
      this.statusBadge.className = 'status-badge';
      switch (newState) {
        case this.STATE.READY:
          this.statusBadge.classList.add('status-ready');
          this.statusText.textContent = 'Ready';
          this.startOverlay.classList.remove('hidden');
          this.pauseOverlay.classList.add('hidden');
          this.gameOverOverlay.classList.add('hidden');

          this.btnStart.disabled = false;
          this.btnPause.disabled = true;
          this.btnResume.disabled = true;
          this.btnRestart.disabled = false;
          break;

        case this.STATE.PLAYING:
          this.statusBadge.classList.add('status-playing');
          this.statusText.textContent = 'Playing';
          this.startOverlay.classList.add('hidden');
          this.pauseOverlay.classList.add('hidden');
          this.gameOverOverlay.classList.add('hidden');

          this.btnStart.disabled = true;
          this.btnPause.disabled = false;
          this.btnResume.disabled = true;
          this.btnRestart.disabled = false;
          break;

        case this.STATE.PAUSED:
          this.statusBadge.classList.add('status-paused');
          this.statusText.textContent = 'Paused';
          this.pauseOverlay.classList.remove('hidden');
          this.startOverlay.classList.add('hidden');
          this.gameOverOverlay.classList.add('hidden');

          this.btnStart.disabled = true;
          this.btnPause.disabled = true;
          this.btnResume.disabled = false;
          this.btnRestart.disabled = false;
          break;

        case this.STATE.GAME_OVER:
          this.statusBadge.classList.add('status-gameover');
          this.statusText.textContent = 'Game Over';
          this.finalScoreEl.textContent = this.score;
          this.finalApplesEl.textContent = this.applesEaten;
          this.finalLengthEl.textContent = this.snake.length;

          if (this.highScoreAchievedInSession) {
            this.newHighScoreAlert.classList.remove('hidden');
          } else {
            this.newHighScoreAlert.classList.add('hidden');
          }

          this.gameOverOverlay.classList.remove('hidden');
          this.startOverlay.classList.add('hidden');
          this.pauseOverlay.classList.add('hidden');

          this.btnStart.disabled = false;
          this.btnPause.disabled = true;
          this.btnResume.disabled = true;
          this.btnRestart.disabled = false;
          break;
      }
    }

    resetGameData() {
      // Clear timers
      if (this.goldenTimer) {
        clearTimeout(this.goldenTimer);
        this.goldenTimer = null;
      }
      this.goldenFood = null;
      this.goldenTimeLeft = 0;

      // Base speed from difficulty selector
      const diffVal = parseInt(this.difficultySelect.value, 10) || 110;
      this.baseTickInterval = diffVal;
      this.currentTickInterval = diffVal;
      this.speedLevel = 1;

      // Reset snake centered horizontally moving right
      this.snake = [
        { x: 6, y: 10 },
        { x: 5, y: 10 },
        { x: 4, y: 10 }
      ];
      this.direction = { x: 1, y: 0 };
      this.inputQueue = [];
      this.score = 0;
      this.applesEaten = 0;
      this.highScoreAchievedInSession = false;
      this.particles = [];
      this.accumulatedTime = 0;

      // Update UI
      this.scoreEl.textContent = '0';
      this.speedEl.textContent = '1.0x';

      // Spawn initial food
      this.spawnFood();
    }

    startGame() {
      this.sound.init();
      this.sound.click();
      this.resetGameData();
      this.setGameState(this.STATE.PLAYING);
      this.scheduleGoldenFood();
    }

    pauseGame() {
      if (this.state !== this.STATE.PLAYING) return;
      this.sound.click();
      this.setGameState(this.STATE.PAUSED);
    }

    resumeGame() {
      if (this.state !== this.STATE.PAUSED) return;
      this.sound.click();
      this.lastFrameTime = performance.now();
      this.accumulatedTime = 0;
      this.setGameState(this.STATE.PLAYING);
    }

    restartGame() {
      this.sound.click();
      this.startGame();
    }

    gameOver() {
      this.setGameState(this.STATE.GAME_OVER);
      this.sound.gameOver();
      // Shake canvas or spawn death burst
      if (this.snake.length > 0) {
        this.createExplosion(this.snake[0].x, this.snake[0].y, '#ff2a5f', 24);
      }
    }

    // --- Input & Direction Buffer ---
    queueDirection(dx, dy) {
      if (this.state === this.STATE.PAUSED) {
        // Unpause on directional key press if player desires
        this.resumeGame();
      }

      if (this.state !== this.STATE.PLAYING) return;

      // Compare against the last queued direction or current direction
      const lastDir = this.inputQueue.length > 0
        ? this.inputQueue[this.inputQueue.length - 1]
        : this.direction;

      // Prevent exact same direction or illegal 180° opposite direction
      const isOpposite = (dx + lastDir.x === 0 && dy + lastDir.y === 0);
      const isSame = (dx === lastDir.x && dy === lastDir.y);

      if (!isOpposite && !isSame) {
        // Limit queue size to avoid delayed input lag
        if (this.inputQueue.length < 2) {
          this.inputQueue.push({ x: dx, y: dy });
        }
      }
    }

    // --- Spawning Mechanics ---
    spawnFood() {
      let candidate;
      let collision;
      let attempts = 0;

      do {
        candidate = {
          x: Math.floor(Math.random() * this.GRID_SIZE),
          y: Math.floor(Math.random() * this.GRID_SIZE)
        };
        // Verify candidate never overlaps snake
        collision = this.snake.some(seg => seg.x === candidate.x && seg.y === candidate.y);
        attempts++;
      } while (collision && attempts < 500);

      this.food = candidate;
    }

    scheduleGoldenFood() {
      if (this.state !== this.STATE.PLAYING) return;
      // Spawn golden star every 12 to 20 seconds
      const delay = Math.random() * 8000 + 12000;
      this.goldenTimer = setTimeout(() => {
        if (this.state === this.STATE.PLAYING) {
          this.spawnGoldenFood();
        } else if (this.state === this.STATE.PAUSED) {
          // Retry later when resumed
          this.scheduleGoldenFood();
        }
      }, delay);
    }

    spawnGoldenFood() {
      let candidate;
      let collision;
      let attempts = 0;

      do {
        candidate = {
          x: Math.floor(Math.random() * this.GRID_SIZE),
          y: Math.floor(Math.random() * this.GRID_SIZE)
        };
        // Verify candidate never overlaps snake or normal food
        collision = this.snake.some(seg => seg.x === candidate.x && seg.y === candidate.y) ||
                    (this.food && this.food.x === candidate.x && this.food.y === candidate.y);
        attempts++;
      } while (collision && attempts < 500);

      this.goldenFood = candidate;
      this.goldenTimeLeft = 8.0; // 8 seconds countdown
    }

    createExplosion(gridX, gridY, color, count = 16) {
      const px = gridX * this.cellSize + this.cellSize / 2;
      const py = gridY * this.cellSize + this.cellSize / 2;
      for (let i = 0; i < count; i++) {
        this.particles.push(new Particle(px, py, color));
      }
    }

    // --- Dynamic Speed Scaling ---
    recalculateSpeed() {
      // Speed increases gradually every 10 points (every apple eaten)
      // E.g. Decrement interval by 2.5ms per 10 points down to a minimum of 40ms
      const speedDecrements = Math.floor(this.score / 10);
      const minInterval = 42;
      const calculatedInterval = Math.max(minInterval, this.baseTickInterval - speedDecrements * 2.5);
      
      const prevLevel = this.speedLevel;
      // Multiplier display: 1.0x, 1.1x, 1.2x, etc.
      const multiplier = (this.baseTickInterval / calculatedInterval).toFixed(1);
      this.speedEl.textContent = `${multiplier}x`;

      const newLevel = Math.floor((parseFloat(multiplier) - 1.0) * 5) + 1;
      if (newLevel > prevLevel) {
        this.speedLevel = newLevel;
        this.sound.speedUp();
      }

      this.currentTickInterval = calculatedInterval;
    }

    // --- Game Logic Update (Tick) ---
    tick() {
      // Apply buffered input
      if (this.inputQueue.length > 0) {
        this.direction = this.inputQueue.shift();
      }

      // Compute new head position
      const head = {
        x: this.snake[0].x + this.direction.x,
        y: this.snake[0].y + this.direction.y
      };

      // 1. Wall collision check
      if (head.x < 0 || head.x >= this.GRID_SIZE || head.y < 0 || head.y >= this.GRID_SIZE) {
        this.gameOver();
        return;
      }

      // 2. Self collision check (head collides with any existing body segment)
      if (this.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        this.gameOver();
        return;
      }

      // Prepend new head
      this.snake.unshift(head);

      // 3. Food collision check
      let hasEaten = false;

      // Regular Apple
      if (head.x === this.food.x && head.y === this.food.y) {
        this.score += 10;
        this.applesEaten++;
        this.scoreEl.textContent = this.score;
        this.sound.eat();
        this.createExplosion(this.food.x, this.food.y, '#ff2a5f', 16);
        this.spawnFood();
        this.recalculateSpeed();
        hasEaten = true;
      } 
      // Bonus Golden Food
      else if (this.goldenFood && head.x === this.goldenFood.x && head.y === this.goldenFood.y) {
        this.score += 50;
        this.scoreEl.textContent = this.score;
        this.sound.bonus();
        this.createExplosion(this.goldenFood.x, this.goldenFood.y, '#f59e0b', 25);
        this.goldenFood = null;
        this.recalculateSpeed();
        this.scheduleGoldenFood();
        hasEaten = true;
      }

      // If no food was eaten, remove tail segment (snake maintains length)
      if (!hasEaten) {
        this.snake.pop();
      }

      // Check High Score
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.highScoreAchievedInSession = true;
        this.updateHighScoreDisplay();
        this.saveHighScore(this.highScore);
      }
    }

    // --- Main Loop (Render + Fixed-Time-Step Updates) ---
    loop(currentTime) {
      const dt = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // Fixed-timestep tick when playing
      if (this.state === this.STATE.PLAYING) {
        this.accumulatedTime += Math.min(dt, 200); // Guard against tab freeze / huge spikes
        while (this.accumulatedTime >= this.currentTickInterval) {
          this.accumulatedTime -= this.currentTickInterval;
          this.tick();
          if (this.state !== this.STATE.PLAYING) break;
        }

        // Golden food countdown
        if (this.goldenFood) {
          this.goldenTimeLeft -= dt / 1000;
          if (this.goldenTimeLeft <= 0) {
            this.goldenFood = null;
            this.scheduleGoldenFood();
          }
        }
      }

      // Update particle physics continuously
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.update();
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // Draw frame
      this.draw();

      this.animationFrameId = requestAnimationFrame(this.loop);
    }

    // --- Canvas Rendering ---
    draw() {
      const width = this.displaySize;
      const height = this.displaySize;
      const cs = this.cellSize;

      // 1. Clear background
      this.ctx.fillStyle = '#030712';
      this.ctx.fillRect(0, 0, width, height);

      // 2. Draw subtle arcade grid
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      this.ctx.lineWidth = 1;
      for (let i = 0; i <= width; i += cs) {
        this.ctx.beginPath();
        this.ctx.moveTo(i, 0);
        this.ctx.lineTo(i, height);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(0, i);
        this.ctx.lineTo(width, i);
        this.ctx.stroke();
      }

      // 3. Draw Regular Glowing Red Apple
      if (this.food) {
        const fx = this.food.x * cs + cs / 2;
        const fy = this.food.y * cs + cs / 2;
        const radius = cs / 2 - 2;

        this.ctx.save();
        this.ctx.shadowColor = '#ff2a5f';
        this.ctx.shadowBlur = 14;
        this.ctx.fillStyle = '#ff2a5f';
        this.ctx.beginPath();
        this.ctx.arc(fx, fy, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner highlight
        this.ctx.fillStyle = '#ffa5ba';
        this.ctx.beginPath();
        this.ctx.arc(fx - radius * 0.3, fy - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // Apple Stem & Leaf
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#10b981';
        this.ctx.beginPath();
        this.ctx.ellipse(fx + 2, fy - radius - 1, 3, 2, Math.PI / 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      // 4. Draw Bonus Golden Star (if active)
      if (this.goldenFood) {
        const gx = this.goldenFood.x * cs + cs / 2;
        const gy = this.goldenFood.y * cs + cs / 2;
        const radius = cs / 2 - 1;
        const pulse = Math.sin(Date.now() / 100) * 2;

        this.ctx.save();
        this.ctx.shadowColor = '#f59e0b';
        this.ctx.shadowBlur = 18 + pulse;
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.beginPath();
        this.ctx.arc(gx, gy, radius + pulse, 0, Math.PI * 2);
        this.ctx.fill();

        // Star shimmer
        this.ctx.fillStyle = '#fffbeb';
        this.ctx.beginPath();
        this.ctx.arc(gx - 2, gy - 2, 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Countdown circular arc
        if (this.goldenTimeLeft > 0) {
          const ratio = Math.max(0, this.goldenTimeLeft / 8.0);
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(gx, gy, radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
          this.ctx.stroke();
        }
        this.ctx.restore();
      }

      // 5. Draw Snake
      this.snake.forEach((segment, index) => {
        const sx = segment.x * cs;
        const sy = segment.y * cs;
        const isHead = index === 0;

        this.ctx.save();
        if (isHead) {
          // Glowing Neon Head
          this.ctx.shadowColor = '#00ff88';
          this.ctx.shadowBlur = 16;
          this.ctx.fillStyle = '#00ff88';
          this.drawRoundedRect(sx + 1, sy + 1, cs - 2, cs - 2, 6);
          this.ctx.fill();

          // Snake Eyes facing current movement direction
          this.ctx.shadowBlur = 0;
          this.ctx.fillStyle = '#051b11';
          const eyeRadius = Math.max(2, cs * 0.12);
          let eye1, eye2;

          if (this.direction.x === 1) { // Moving Right
            eye1 = { x: sx + cs - 6, y: sy + 5 };
            eye2 = { x: sx + cs - 6, y: sy + cs - 6 };
          } else if (this.direction.x === -1) { // Moving Left
            eye1 = { x: sx + 6, y: sy + 5 };
            eye2 = { x: sx + 6, y: sy + cs - 6 };
          } else if (this.direction.y === 1) { // Moving Down
            eye1 = { x: sx + 5, y: sy + cs - 6 };
            eye2 = { x: sx + cs - 6, y: sy + cs - 6 };
          } else { // Moving Up
            eye1 = { x: sx + 5, y: sy + 6 };
            eye2 = { x: sx + cs - 6, y: sy + 6 };
          }

          this.ctx.beginPath();
          this.ctx.arc(eye1.x, eye1.y, eyeRadius, 0, Math.PI * 2);
          this.ctx.arc(eye2.x, eye2.y, eyeRadius, 0, Math.PI * 2);
          this.ctx.fill();

          // White catchlight
          this.ctx.fillStyle = '#ffffff';
          this.ctx.beginPath();
          this.ctx.arc(eye1.x - 0.5, eye1.y - 0.5, 1, 0, Math.PI * 2);
          this.ctx.arc(eye2.x - 0.5, eye2.y - 0.5, 1, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          // Neon Body with subtle gradient & taper
          const progress = index / this.snake.length;
          const alpha = 0.95 - progress * 0.35;
          this.ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
          this.drawRoundedRect(sx + 2, sy + 2, cs - 4, cs - 4, 4);
          this.ctx.fill();

          // Subtle inner glow center
          this.ctx.fillStyle = `rgba(52, 211, 153, ${alpha * 0.6})`;
          this.drawRoundedRect(sx + 4, sy + 4, cs - 8, cs - 8, 2);
          this.ctx.fill();
        }
        this.ctx.restore();
      });

      // 6. Draw Particles
      this.particles.forEach(p => p.draw(this.ctx));
    }

    drawRoundedRect(x, y, w, h, r) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + r, y);
      this.ctx.lineTo(x + w - r, y);
      this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      this.ctx.lineTo(x + w, y + h - r);
      this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.ctx.lineTo(x + r, y + h);
      this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      this.ctx.lineTo(x, y + r);
      this.ctx.quadraticCurveTo(x, y, x + r, y);
      this.ctx.closePath();
    }

    // --- Event Listeners ---
    bindEvents() {
      // 1. Keyboard Controls
      window.addEventListener('keydown', (e) => {
        this.sound.init();

        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            e.preventDefault();
            this.queueDirection(0, -1);
            this.highlightDpad(this.dpadUp);
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            e.preventDefault();
            this.queueDirection(0, 1);
            this.highlightDpad(this.dpadDown);
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            e.preventDefault();
            this.queueDirection(-1, 0);
            this.highlightDpad(this.dpadLeft);
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            e.preventDefault();
            this.queueDirection(1, 0);
            this.highlightDpad(this.dpadRight);
            break;
          case ' ':
          case 'p':
          case 'P':
            e.preventDefault();
            if (this.state === this.STATE.PLAYING) {
              this.pauseGame();
            } else if (this.state === this.STATE.PAUSED) {
              this.resumeGame();
            } else if (this.state === this.STATE.READY) {
              this.startGame();
            }
            break;
          case 'r':
          case 'R':
            e.preventDefault();
            this.restartGame();
            break;
        }
      });

      // 2. Control Buttons
      this.btnStart.addEventListener('click', () => this.startGame());
      this.btnPause.addEventListener('click', () => this.pauseGame());
      this.btnResume.addEventListener('click', () => this.resumeGame());
      this.btnRestart.addEventListener('click', () => this.restartGame());

      // Overlay Action Buttons
      this.btnOverlayStart.addEventListener('click', () => this.startGame());
      this.btnOverlayResume.addEventListener('click', () => this.resumeGame());
      this.btnOverlayRestartPause.addEventListener('click', () => this.restartGame());
      this.btnOverlayRestartOver.addEventListener('click', () => this.restartGame());

      // Sound Toggle Button
      this.btnSound.addEventListener('click', () => {
        this.sound.toggleMute();
        this.updateAudioButtonDisplay();
      });

      // Difficulty Selector
      this.difficultySelect.addEventListener('change', () => {
        const val = parseInt(this.difficultySelect.value, 10);
        this.baseTickInterval = val;
        this.recalculateSpeed();
      });

      // 3. Virtual D-Pad Touch / Click
      const handleDpadInput = (dx, dy, el) => {
        this.sound.init();
        this.queueDirection(dx, dy);
        this.highlightDpad(el);
      };

      this.dpadUp.addEventListener('click', () => handleDpadInput(0, -1, this.dpadUp));
      this.dpadDown.addEventListener('click', () => handleDpadInput(0, 1, this.dpadDown));
      this.dpadLeft.addEventListener('click', () => handleDpadInput(-1, 0, this.dpadLeft));
      this.dpadRight.addEventListener('click', () => handleDpadInput(1, 0, this.dpadRight));

      // 4. Touch Gestures & Swipe on Canvas
      let touchStartX = 0;
      let touchStartY = 0;

      this.canvas.addEventListener('touchstart', (e) => {
        this.sound.init();
        if (e.touches.length > 0) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      this.canvas.addEventListener('touchend', (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // Minimum swipe threshold: 24px
        if (Math.max(absX, absY) > 24) {
          if (absX > absY) {
            this.queueDirection(dx > 0 ? 1 : -1, 0);
          } else {
            this.queueDirection(0, dy > 0 ? 1 : -1);
          }
        }
      }, { passive: true });
    }

    highlightDpad(element) {
      if (!element) return;
      element.classList.add('pressed');
      setTimeout(() => element.classList.remove('pressed'), 120);
    }
  }

  // --- Initialize Game on DOM Ready ---
  document.addEventListener('DOMContentLoaded', () => {
    window.snakeGameInstance = new SnakeGame();
  });
})();
