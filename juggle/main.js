// main.js — clean rebuild

import { Player } from './player.js';
import { Ball } from './ball.js';
import { setMessage, drawHUD } from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// --- GAME OBJECTS ---
const player = new Player(W / 2, H - 160);
const initFoot = player.getKickFoot();
const ball = new Ball(initFoot.x, initFoot.y - 10, 26);

// load PNG ball if available
ball.img = new Image();
ball.img.src = "ball.png";

// --- STATE ---
let started = false;
let running = true;
let gameOver = false;

let score = 0;
let combo = 0;
let bestCombo = 0;
let lastHitTime = 0;

let particles = [];

// --- PARTICLES ---
function spawnParticles(x, y, n, red = false) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 1.2) * -3,
      life: 35 + Math.random() * 25,
      col: red ? '#ff5555' : '#ffe08a',
    });
  }
}

// --- CONTACT LISTENER (actual ball impulse moment) ---
player.addContactListener((footPos, footVel) => {
  if (gameOver) return;

  // distance check avoids impossible hits
  const d = Math.hypot(ball.x - footPos.x, ball.y - footPos.y);
  if (d > 110) return;

  // apply the FORCE to the ball on contact
  ball.applyContactImpulse(footPos, footVel);

  // scoring
  score++;
  combo++;
  if (combo > bestCombo) bestCombo = combo;

  lastHitTime = performance.now();
  spawnParticles(ball.x, ball.y, 10);

  setMessage(`Score: ${score}   Combo: x${combo}`);
});

// --- INPUT ---
function attemptKick() {
  if (gameOver) return;

  if (!started) {
    started = true;
    setMessage("Score: 0");
    const hint = document.querySelector(".hint");
    if (hint) hint.classList.add("hidden");
    return;
  }

  const foot = player.getKickFoot();
  const dist = Math.hypot(ball.x - foot.x, ball.y - foot.y);

  // allow kick only if ball is within reachable foot radius
  if (dist < 55 && Math.abs(ball.vy) < 14) {
    player.kick();
  } else {
    // miss
    combo = 0;
    spawnParticles(ball.x, ball.y, 6, true);
    setMessage(`Miss — Score: ${score}`);
    ball.vy += 5;
    ball.vx += (Math.random() - 0.5) * 2;
  }
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    attemptKick();
  }
  if (e.code === "KeyR") resetGame();
});

canvas.addEventListener("pointerdown", attemptKick);

// --- UPDATE ---
function update() {
  if (!running || gameOver) return;

  const foot = player.getKickFoot();
  ball.update(player.x, H - 40, foot);

  // check out-of-bounds
  if (ball.y > H + 200 || ball.x < -200 || ball.x > W + 200) {
    gameOver = true;
    running = false;
    setMessage(`Game Over — Score: ${score}`);
  }

  // combo decay
  if (started && performance.now() - lastHitTime > 1800 && combo > 0) {
    combo = 0;
    setMessage(`Combo dropped — Score: ${score}`);
  }

  // particles
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.vy += 0.12;
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// --- DRAW ---
function draw() {
  ctx.clearRect(0, 0, W, H);

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#8ec5ff");
  sky.addColorStop(1, "#d7ecff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // field
  const fh = 200;
  ctx.fillStyle = "#34a84b";
  ctx.fillRect(0, H - fh, W, fh);

  ctx.fillStyle = "#ffffff40";
  ctx.fillRect(0, H - fh - 3, W, 3);

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, H - fh + 50, W, 3);
  ctx.fillRect(0, H - fh + 100, W, 3);

  // draw
  player.draw(ctx);
  ball.draw(ctx);

  // particles
  for (const p of particles) {
    ctx.globalAlpha = p.life / 60;
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawHUD(ctx, W, score, combo, bestCombo);

  // instructions / game over overlay
  if (!started && !gameOver) {
    ctx.fillStyle = "#333";
    ctx.font = "14px Inter";
    ctx.textAlign = "center";
    ctx.fillText("Tap or Press Space to Start", W / 2, H - 10);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#fff";
    ctx.font = "28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Try Again", W / 2, H / 2 - 10);
    ctx.font = "18px Arial";
    ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 20);
    ctx.font = "14px Arial";
    ctx.fillText("Press R or Tap to Restart", W / 2, H / 2 + 55);
  }
}

// --- GAME LOOP ---
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// --- RESET ---
function resetGame() {
  gameOver = false;
  running = true;
  started = false;

  score = 0;
  combo = 0;

  const f = player.getKickFoot();
  ball.x = f.x;
  ball.y = f.y - 10;
  ball.vx = 0;
  ball.vy = 0;

  const hint = document.querySelector(".hint");
  if (hint) hint.classList.remove("hidden");

  setMessage("Tap to Start");
}

resetGame();
loop();
