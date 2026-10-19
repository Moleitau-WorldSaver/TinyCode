#!/usr/bin/env node
// Snake — a terminal snake game. No dependencies.
//
//   node snake.mjs                 play (arrow keys / WASD, p pause, q quit)
//   node snake.mjs --smoke         run a scripted game headlessly and exit 0
//
// The game state is a plain object so it can be driven from tests too.

import readline from "node:readline";
import { pathToFileURL } from "node:url";

/** Direction vectors, keyed by name. */
export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Direction names that are illegal as a reverse of `dir`. */
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

/**
 * Create a fresh game.
 * The snake starts horizontally near the middle facing right, with its head
 * at the front of the array.
 */
export function createGame({
  width = 20,
  height = 12,
  rng = Math.random,
  tickMs = 120,
} = {}) {
  const cy = Math.floor(height / 2);
  const cx = Math.floor(width / 2);
  const snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  const game = {
    width,
    height,
    snake,
    dir: "right",
    nextDir: "right",
    dead: false,
    score: 0,
    tickMs,
    rng,
    food: null,
  };
  game.food = spawnFood(game);
  return game;
}

const occupied = (game, x, y) => game.snake.some((s) => s.x === x && s.y === y);

/** Pick a random free cell for the food, or null when the board is full. */
export function spawnFood(game) {
  const free = [];
  for (let y = 0; y < game.height; y++) {
    for (let x = 0; x < game.width; x++) {
      if (!occupied(game, x, y)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(game.rng() * free.length)];
}

/**
 * Request a direction change. Reversing the current direction is ignored so
 * the snake can never run into its own neck.
 */
export function turn(game, dir) {
  if (!DIRS[dir]) return false;
  if (dir === OPPOSITE[game.dir]) return false;
  game.nextDir = dir;
  return true;
}

/**
 * Advance one tick. Applies the queued direction, moves the head, eats food,
 * grows, and detects collisions with walls or the body.
 * Returns the event for this tick: "move" | "eat" | "dead".
 */
export function tick(game) {
  if (game.dead) return "dead";
  game.dir = game.nextDir;
  const d = DIRS[game.dir];
  const head = game.snake[0];
  const nx = head.x + d.x;
  const ny = head.y + d.y;

  const hitsWall = nx < 0 || ny < 0 || nx >= game.width || ny >= game.height;
  // The tail cell frees up this tick unless we are about to grow.
  const eats = game.food && nx === game.food.x && ny === game.food.y;
  const body = eats ? game.snake : game.snake.slice(0, -1);
  const hitsBody = body.some((s) => s.x === nx && s.y === ny);

  if (hitsWall || hitsBody) {
    game.dead = true;
    return "dead";
  }

  game.snake.unshift({ x: nx, y: ny });
  if (eats) {
    game.score++;
    game.food = spawnFood(game);
    // Speed up slightly as the snake grows, floored at 50ms.
    game.tickMs = Math.max(50, game.tickMs - 3);
    return "eat";
  }
  game.snake.pop();
  return "move";
}

/** Render the board to an array of strings. */
export function render(game) {
  const lines = [];
  for (let y = 0; y < game.height; y++) {
    let line = "";
    for (let x = 0; x < game.width; x++) {
      const isHead = game.snake[0].x === x && game.snake[0].y === y;
      const isBody = !isHead && game.snake.some((s) => s.x === x && s.y === y);
      const isFood = game.food && game.food.x === x && game.food.y === y;
      if (isHead) line += "@";
      else if (isBody) line += "o";
      else if (isFood) line += "*";
      else line += " ";
    }
    lines.push(line);
  }
  const border = "+" + "-".repeat(game.width) + "+";
  return [border, ...lines.map((l) => "|" + l + "|"), border];
}

/** Compose the full screen text for a given game. */
export function frame(game, message = "") {
  const out = [];
  out.push(`  Snake — score: ${game.score}`);
  out.push("");
  for (const line of render(game)) out.push("  " + line);
  out.push("");
  out.push("  arrows/WASD move · p pause · r restart · q quit");
  if (message) out.push("  " + message);
  return out.join("\n");
}

// --- scripted run, used only by --smoke ---
function smoke() {
  // Turn-based verification with a fixed seed-ish rng (first free cell).
  let calls = 0;
  const game = createGame({ rng: () => (calls++ * 0.37) % 1 });
  let initialLen = game.snake.length;

  // Validate wall collision: steer up until we die.
  const wallGame = createGame({ width: 6, height: 6 });
  for (let i = 0; i < 10 && !wallGame.dead; i++) {
    if (i === 0) turn(wallGame, "up");
    tick(wallGame);
  }
  if (!wallGame.dead) {
    console.error("\nsmoke: FAIL — hitting the wall did not end the game");
    process.exit(1);
  }

  // Validate eating + growth: place food straight ahead of the head.
  const eatGame = createGame({ width: 10, height: 5 });
  initialLen = eatGame.snake.length;
  const head = eatGame.snake[0];
  eatGame.food = { x: head.x + 1, y: head.y };
  const ev = tick(eatGame);
  if (ev !== "eat" || eatGame.snake.length !== initialLen + 1 || eatGame.score !== 1) {
    console.error("\nsmoke: FAIL — eating did not grow the snake / update score");
    process.exit(1);
  }

  // Validate reverse is ignored.
  if (turn(eatGame, "left") !== false) {
    console.error("\nsmoke: FAIL — reverse direction was accepted");
    process.exit(1);
  }

  console.log(frame(game));
  console.log("\nsmoke: OK — wall death, eating, growth, and reverse-guard all pass");
}

// --- interactive play ---
function play() {
  let game = createGame();
  let paused = false;
  let timer = null;
  let message = "";

  const interactive = Boolean(process.stdin.isTTY);
  const draw = () => {
    // Only emit ANSI clears when attached to a terminal so piped output stays plain.
    if (interactive) process.stdout.write("\x1b[2J\x1b[H");
    else process.stdout.write("\n");
    process.stdout.write(frame(game, message) + "\n");
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (paused || game.dead) return;
    timer = setTimeout(() => {
      const ev = tick(game);
      if (ev === "dead") message = `💀 Game over — score ${game.score}. press r to restart, q to quit`;
      else message = "";
      draw();
      schedule();
    }, game.tickMs);
  };

  const quit = () => {
    if (timer) clearTimeout(timer);
    if (interactive) process.stdout.write("\x1b[?25h");
    process.stdout.write("\n");
    process.exit(0);
  };

  const handleMove = (dir) => {
    if (game.dead) return;
    turn(game, dir);
  };

  const handleChar = (ch) => {
    switch (ch) {
      case "q":
      case "Q":
      case "\u0003":
        return quit();
      case "w":
      case "W":
        return handleMove("up");
      case "s":
      case "S":
        return handleMove("down");
      case "a":
      case "A":
        return handleMove("left");
      case "d":
      case "D":
        return handleMove("right");
      case "p":
      case "P":
        if (game.dead) return;
        paused = !paused;
        message = paused ? "⏸ paused — p to resume" : "";
        draw();
        schedule();
        return;
      case "r":
      case "R":
        game = createGame();
        paused = false;
        message = "";
        draw();
        schedule();
        return;
    }
  };

  draw();
  schedule();

  if (!process.stdin.isTTY) {
    // Piped stdin: treat characters as keystrokes. Each non-control key applies
    // the move and then advances one tick, so a script can play deterministically.
    if (timer) clearTimeout(timer);
    timer = null;
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      for (const ch of chunk) {
        if (game.dead) break;
        const isControl = ch === "p" || ch === "P" || ch === "r" || ch === "R";
        handleChar(ch);
        if (game.dead || isControl || paused) continue;
        tick(game);
        if (game.dead) {
          message = `💀 Game over — score ${game.score}. press r to restart, q to quit`;
        }
        draw();
      }
      if (game.dead) quit();
    });
    process.stdin.on("end", () => quit());
    return;
  }

  try {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
  } catch (err) {
    console.error("snake: could not enter raw mode (not a TTY?)", err.message);
    process.exit(1);
  }
  process.stdin.resume();
  process.stdout.write("\x1b[?25l"); // hide cursor
  process.on("exit", () => process.stdout.write("\x1b[?25h"));
  process.stdin.on("keypress", (str, k) => {
    if (k && k.ctrl && k.name === "c") return quit();
    if (k && k.name === "up") return handleMove("up");
    if (k && k.name === "down") return handleMove("down");
    if (k && k.name === "left") return handleMove("left");
    if (k && k.name === "right") return handleMove("right");
    if (str) handleChar(str);
  });
}

// Only start a game when executed directly, so importing the module
// (from tests or scripts) is side-effect free.
const isEntry = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) {
  if (process.argv.includes("--smoke")) smoke();
  else play();
}
