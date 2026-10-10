"""
Retro Neon Snake Game in Python
Built with Python's standard library (tkinter). No pip install needed!
Run with: python snake.py
"""

import tkinter as tk
import random

# Game constants
GRID_WIDTH = 25
GRID_HEIGHT = 25
CELL_SIZE = 22
WIDTH = GRID_WIDTH * CELL_SIZE
HEIGHT = GRID_HEIGHT * CELL_SIZE
INITIAL_SPEED = 100  # milliseconds per step

# Colors
COLOR_BG = "#0b0f19"
COLOR_GRID = "#131c2e"
COLOR_SNAKE_HEAD = "#34d399"
COLOR_SNAKE_BODY = "#059669"
COLOR_FOOD = "#ef4444"
COLOR_BONUS_FOOD = "#f59e0b"
COLOR_TEXT = "#f3f4f6"
COLOR_MUTED = "#9ca3af"


class SnakeGame:
    def __init__(self, root):
        self.root = root
        self.root.title("🐍 Neon Snake Game")
        self.root.resizable(False, False)
        self.root.configure(bg=COLOR_BG)

        # Header Frame (Scores)
        self.header_frame = tk.Frame(root, bg=COLOR_BG, padx=16, pady=10)
        self.header_frame.pack(fill=tk.X)

        self.score_label = tk.Label(
            self.header_frame,
            text="Score: 0",
            font=("Segoe UI", 13, "bold"),
            fg=COLOR_TEXT,
            bg=COLOR_BG,
        )
        self.score_label.pack(side=tk.LEFT)

        self.high_score_label = tk.Label(
            self.header_frame,
            text="Best: 0",
            font=("Segoe UI", 13, "bold"),
            fg=COLOR_BONUS_FOOD,
            bg=COLOR_BG,
        )
        self.high_score_label.pack(side=tk.RIGHT)

        # Canvas for Game
        self.canvas = tk.Canvas(
            root,
            width=WIDTH,
            height=HEIGHT,
            bg=COLOR_BG,
            highlightthickness=2,
            highlightbackground="#1f2937",
        )
        self.canvas.pack(padx=16, pady=4)

        # Bottom Instructions
        self.info_label = tk.Label(
            root,
            text="Controls: Arrow Keys / WASD | Space: Pause | R: Restart",
            font=("Segoe UI", 9),
            fg=COLOR_MUTED,
            bg=COLOR_BG,
            pady=8,
        )
        self.info_label.pack()

        # Keybindings
        self.root.bind("<Key>", self.handle_keypress)

        # Game state
        self.high_score = 0
        self.score = 0
        self.snake = []
        self.direction = "Right"
        self.next_direction = "Right"
        self.food = None
        self.bonus_food = None
        self.bonus_timer = 0
        self.game_running = False
        self.paused = False
        self.after_id = None

        self.start_game()

    def start_game(self):
        if self.after_id:
            self.root.after_cancel(self.after_id)

        self.score = 0
        self.score_label.config(text=f"Score: {self.score}")
        self.direction = "Right"
        self.next_direction = "Right"
        self.game_running = True
        self.paused = False

        # Initialize snake in center
        start_x = GRID_WIDTH // 4
        start_y = GRID_HEIGHT // 2
        self.snake = [
            (start_x, start_y),
            (start_x - 1, start_y),
            (start_x - 2, start_y),
        ]

        self.bonus_food = None
        self.bonus_timer = 0
        self.spawn_food()
        self.render()
        self.tick()

    def spawn_food(self):
        empty_cells = [
            (x, y)
            for x in range(GRID_WIDTH)
            for y in range(GRID_HEIGHT)
            if (x, y) not in self.snake and (x, y) != self.bonus_food
        ]
        if empty_cells:
            self.food = random.choice(empty_cells)

    def spawn_bonus_food(self):
        empty_cells = [
            (x, y)
            for x in range(GRID_WIDTH)
            for y in range(GRID_HEIGHT)
            if (x, y) not in self.snake and (x, y) != self.food
        ]
        if empty_cells:
            self.bonus_food = random.choice(empty_cells)
            self.bonus_timer = 50  # steps before disappearing

    def handle_keypress(self, event):
        key = event.keysym.lower()

        # Pause toggle
        if key in ("space", "p"):
            self.toggle_pause()
            return

        # Restart
        if key == "r":
            self.start_game()
            return

        if not self.game_running or self.paused:
            return

        opposites = {
            "Up": "Down",
            "Down": "Up",
            "Left": "Right",
            "Right": "Left",
        }

        key_map = {
            "up": "Up",
            "w": "Up",
            "down": "Down",
            "s": "Down",
            "left": "Left",
            "a": "Left",
            "right": "Right",
            "d": "Right",
        }

        if key in key_map:
            new_dir = key_map[key]
            if new_dir != opposites.get(self.direction):
                self.next_direction = new_dir

    def toggle_pause(self):
        if not self.game_running:
            return
        self.paused = not self.paused
        if self.paused:
            self.canvas.create_text(
                WIDTH // 2,
                HEIGHT // 2,
                text="PAUSED",
                font=("Segoe UI", 24, "bold"),
                fill="#38bdf8",
                tag="overlay",
            )
        else:
            self.canvas.delete("overlay")
            self.tick()

    def tick(self):
        if not self.game_running or self.paused:
            return

        self.direction = self.next_direction
        head_x, head_y = self.snake[0]

        if self.direction == "Up":
            new_head = (head_x, head_y - 1)
        elif self.direction == "Down":
            new_head = (head_x, head_y + 1)
        elif self.direction == "Left":
            new_head = (head_x - 1, head_y)
        else:  # Right
            new_head = (head_x + 1, head_y)

        # Check collision with walls
        nx, ny = new_head
        if nx < 0 or nx >= GRID_WIDTH or ny < 0 or ny >= GRID_HEIGHT:
            self.game_over()
            return

        # Check collision with self
        if new_head in self.snake:
            self.game_over()
            return

        self.snake.insert(0, new_head)

        # Check collision with food
        if new_head == self.food:
            self.score += 10
            self.score_label.config(text=f"Score: {self.score}")
            self.spawn_food()

            # Random chance to spawn bonus star
            if not self.bonus_food and random.random() < 0.25:
                self.spawn_bonus_food()
        elif new_head == self.bonus_food:
            self.score += 50
            self.score_label.config(text=f"Score: {self.score}")
            self.bonus_food = None
        else:
            self.snake.pop()

        # Handle bonus decay
        if self.bonus_food:
            self.bonus_timer -= 1
            if self.bonus_timer <= 0:
                self.bonus_food = None

        self.render()

        # Speed slightly scales with score
        speed = max(45, INITIAL_SPEED - (self.score // 40) * 5)
        self.after_id = self.root.after(speed, self.tick)

    def render(self):
        self.canvas.delete("all")

        # Background grid
        for i in range(GRID_WIDTH):
            for j in range(GRID_HEIGHT):
                if (i + j) % 2 == 0:
                    x0, y0 = i * CELL_SIZE, j * CELL_SIZE
                    self.canvas.create_rectangle(
                        x0, y0, x0 + CELL_SIZE, y0 + CELL_SIZE,
                        fill=COLOR_GRID, outline="",
                    )

        # Draw Normal Food (Apple)
        if self.food:
            fx, fy = self.food
            x0, y0 = fx * CELL_SIZE + 2, fy * CELL_SIZE + 2
            x1, y1 = (fx + 1) * CELL_SIZE - 2, (fy + 1) * CELL_SIZE - 2
            self.canvas.create_oval(x0, y0, x1, y1, fill=COLOR_FOOD, outline="")

        # Draw Bonus Food
        if self.bonus_food:
            bx, by = self.bonus_food
            x0, y0 = bx * CELL_SIZE + 2, by * CELL_SIZE + 2
            x1, y1 = (bx + 1) * CELL_SIZE - 2, (by + 1) * CELL_SIZE - 2
            self.canvas.create_oval(x0, y0, x1, y1, fill=COLOR_BONUS_FOOD, outline="")

        # Draw Snake
        for idx, (sx, sy) in enumerate(self.snake):
            x0, y0 = sx * CELL_SIZE + 1, sy * CELL_SIZE + 1
            x1, y1 = (sx + 1) * CELL_SIZE - 1, (sy + 1) * CELL_SIZE - 1
            color = COLOR_SNAKE_HEAD if idx == 0 else COLOR_SNAKE_BODY
            self.canvas.create_rectangle(x0, y0, x1, y1, fill=color, outline="")

            # Eyes on Head
            if idx == 0:
                eye_r = 2
                cx = (x0 + x1) / 2
                cy = (y0 + y1) / 2
                self.canvas.create_oval(cx - 3, cy - 3, cx - 1, cy - 1, fill="#0f172a", outline="")
                self.canvas.create_oval(cx + 1, cy - 3, cx + 3, cy - 1, fill="#0f172a", outline="")

    def game_over(self):
        self.game_running = False
        if self.score > self.high_score:
            self.high_score = self.score
            self.high_score_label.config(text=f"Best: {self.high_score}")

        self.canvas.create_rectangle(
            20, HEIGHT // 2 - 50, WIDTH - 20, HEIGHT // 2 + 50,
            fill="#111827", outline="#ef4444", width=2
        )
        self.canvas.create_text(
            WIDTH // 2, HEIGHT // 2 - 20,
            text="GAME OVER",
            font=("Segoe UI", 18, "bold"),
            fill="#ef4444"
        )
        self.canvas.create_text(
            WIDTH // 2, HEIGHT // 2 + 15,
            text=f"Final Score: {self.score}  |  Press 'R' to Restart",
            font=("Segoe UI", 11),
            fill=COLOR_TEXT
        )


if __name__ == "__main__":
    app_root = tk.Tk()
    game = SnakeGame(app_root)
    app_root.mainloop()
