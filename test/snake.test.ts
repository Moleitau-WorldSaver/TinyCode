import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, tick, turn, render, spawnFood, frame } from "../snake.mjs";

test("a new snake has length 3 and faces right", () => {
  const g = createGame();
  assert.equal(g.snake.length, 3);
  assert.equal(g.dir, "right");
  assert.ok(g.food, "food should be placed");
});

test("moving right keeps length and shifts the head", () => {
  const g = createGame({ width: 10, height: 5 });
  const head = { ...g.snake[0] };
  g.food = { x: 0, y: 0 };
  assert.equal(tick(g), "move");
  assert.deepEqual(g.snake[0], { x: head.x + 1, y: head.y });
  assert.equal(g.snake.length, 3);
});

test("eating food grows the snake and raises the score", () => {
  const g = createGame({ width: 10, height: 5 });
  const h = g.snake[0];
  g.food = { x: h.x + 1, y: h.y };
  assert.equal(tick(g), "eat");
  assert.equal(g.snake.length, 4);
  assert.equal(g.score, 1);
  assert.notDeepEqual(g.food, { x: h.x + 1, y: h.y }, "new food is spawned");
});

test("reversing direction is ignored", () => {
  const g = createGame();
  assert.equal(turn(g, "left"), false);
  assert.equal(g.nextDir, "right");
  assert.equal(turn(g, "up"), true);
  assert.equal(g.nextDir, "up");
});

test("hitting a wall ends the game", () => {
  const g = createGame({ width: 4, height: 4 });
  turn(g, "up");
  tick(g); // up
  tick(g); // up
  assert.equal(tick(g), "dead");
  assert.equal(g.dead, true);
});

test("biting the body ends the game", () => {
  const g = createGame({ width: 10, height: 10 });
  // Head at (5,5) turns right into (6,5), which is the body s 5th segment.
  g.snake = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 6, y: 5 },
    { x: 6, y: 6 },
  ];
  g.dir = "up";
  g.nextDir = "right";
  assert.equal(tick(g), "dead");
  assert.equal(g.dead, true);
});

test("following your own tail is legal when it moves away", () => {
  const g = createGame({ width: 10, height: 10 });
  // Head at (5,5) turns right into (6,5); the tail there vacates this tick.
  g.snake = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 6, y: 5 },
  ];
  g.dir = "up";
  g.nextDir = "right";
  assert.equal(tick(g), "move");
  assert.deepEqual(g.snake[0], { x: 6, y: 5 });
});

test("render draws border, head, body, and food", () => {
  const g = createGame({ width: 8, height: 4 });
  const h = g.snake[0];
  g.food = { x: h.x + 2, y: h.y };
  const art = render(g).join("\n");
  assert.match(art, /^\+-{8}\+$/m);
  assert.match(art, /@/);
  assert.match(art, /o/);
  assert.match(art, /\*/);
  assert.equal(render(g).length, 4 + 2);
});

test("frame shows the score and controls", () => {
  const g = createGame();
  const text = frame(g);
  assert.match(text, /score: 0/);
  assert.match(text, /arrows\/WASD move/);
});

test("spawnFood returns null only when the board is full", () => {
  const g = createGame({ width: 2, height: 2 });
  g.snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ];
  g.food = null;
  assert.deepEqual(spawnFood(g), { x: 0, y: 1 });
  g.snake.push({ x: 0, y: 1 });
  assert.equal(spawnFood(g), null);
});
