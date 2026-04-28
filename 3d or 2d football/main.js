// main.js
import { createPlayer, updatePlayerFromInput } from './player.js';
import { createOpponent, ensureOpponentOnField } from './opponent.js';
import { createBall } from './ball.js';
import * as R from './render.js';
import * as P from './physics.js';
import * as AI from './ai.js';
import { dist2 } from './utils.js';

// If a previous game exists, stop it now to avoid duplicate / phantom players
if (window.__simpleFootballGame && window.__simpleFootballGame.stop) {
  try { window.__simpleFootballGame.stop(); } catch(e) { /* ignore */ }
  // small delay isn't necessary; stop removes canvas and RAF immediately
}

const field = { w:360, h:900, goalWidth:120, goalDepth:28 };
const state = { cx:0, cy:0 };
const { c, ctx } = R.createCanvasAndContext();
state.c = c; state.ctx = ctx;
R.resizeCanvas(c, state);
window.addEventListener('resize', ()=> R.resizeCanvas(c, state));

// create entities (only these three)
const player = createPlayer();
const opponent = createOpponent();
const ball = createBall();

// debug access
window.player = player;
window.opponent = opponent;
window.ball = ball;

console.log('main.js loaded — entities created', { player, opponent, ball });
// expose AI control to browser console
window.AI = AI;


const keys = {};
addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Escape') stop();
  if (e.key.toLowerCase() === 'r') resetPositions();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function resetPositions(){
  player.x = 0; player.z = 120; player.vx = player.vy = player.vz = 0;
  opponent.home.x = -30; opponent.home.z = Math.max(200, field.h*0.55);
  opponent.x = opponent.home.x; opponent.z = opponent.home.z; opponent.vx = opponent.vy = opponent.vz = 0; opponent.state='idle';
  ball.x = 14; ball.z = 300; ball.vx = ball.vy = ball.vz = ball.spin = 0; ball.y = 0;
}
resetPositions();

let lastTime = performance.now();
let running = true;
window.__simpleFootballGame = { stop };

function stop(){
  running = false;
  if (typeof loopId !== 'undefined') cancelAnimationFrame(loopId);
  removeEventListener('resize', ()=> R.resizeCanvas(c, state));
  const el = document.getElementById('__football_canvas'); if (el) el.remove();
  delete window.__simpleFootballGame;
  console.log('Game stopped and cleaned up');
}

// collisions (unchanged)
function collideBallPlayer(p, ball){
  const minDist = (p.radius + ball.radius) * 1.12;
  const dx = ball.x - p.x; const dz = ball.z - p.z; const d = Math.hypot(dx,dz) || 0.0001;
  if (dx*dx + dz*dz < minDist*minDist){
    const nx = dx/d, nz = dz/d;
    const power = 1.1 + Math.min(4, Math.hypot(p.vx, p.vz) * 14);
    ball.vx = nx * power + p.vx * 0.45;
    ball.vz = nz * power + p.vz * 0.45;
    ball.vy = 1.8 + Math.min(4, power * 0.25);
    const tangential = (-nz * p.vx + nx * p.vz);
    ball.spin = Math.max(-6, Math.min(6, ball.spin * 0.6 + tangential * 0.06));
    const push = (minDist - d) + 0.3;
    ball.x += nx * push; ball.z += nz * push;
  }
}

function collidePlayers(a,b){
  const nextA = { x: a.x + a.vx, z: a.z + a.vz };
  const nextB = { x: b.x + b.vx, z: b.z + b.vz };
  const dx = nextB.x - nextA.x, dz = nextB.z - nextA.z;
  const d2 = dx*dx + dz*dz; const minDist = (a.radius + b.radius);
  if (d2 < minDist*minDist){
    const d = Math.sqrt(d2) || 0.0001;
    const nx = dx/d, nz = dz/d;
    const vaN = a.vx*nx + a.vz*nz, vbN = b.vx*nx + b.vz*nz;
    if (vaN > vbN){
      const restitution = 0.64;
      const newVaN = (vaN * (1 - restitution) + vbN * restitution);
      const newVbN = (vbN * (1 - restitution) + vaN * restitution);
      a.vx += (newVaN - vaN) * nx; a.vz += (newVaN - vaN) * nz;
      b.vx += (newVbN - vbN) * nx; b.vz += (newVbN - vbN) * nz;
    } else {
      const overlap = (minDist - d) + 0.4;
      const pushA = overlap * 0.5, pushB = overlap * 0.5;
      a.x -= nx * pushA; a.z -= nz * pushA; b.x += nx * pushB; b.z += nz * pushB;
    }
    a.vx *= 0.995; a.vz *= 0.995; b.vx *= 0.995; b.vz *= 0.995;
  }
}

function checkGoal(){
  const gw = field.goalWidth/2;
  if (ball.z < 14 && Math.abs(ball.x) < gw){ console.log('goal them'); resetPositions(); }
  if (ball.z > field.h - 14 && Math.abs(ball.x) < gw){ console.log('goal me'); resetPositions(); }
  if (ball.x < -field.w/2) { ball.x = -field.w/2; ball.vx *= -0.28; }
  if (ball.x > field.w/2)  { ball.x = field.w/2;  ball.vx *= -0.28; }
  if (ball.z < 0) { ball.z = 0; ball.vz *= -0.28; }
  if (ball.z > field.h) { ball.z = field.h; ball.vz *= -0.28; }
}

let loopId;
function loop(now){
  if (!running) return;
  let dt = now - lastTime; if (dt > 40) dt = 40; lastTime = now;

  // --- INPUT & MOVEMENT ---
  updatePlayerFromInput(player, keys, dt);
  // move player using the velocity set by player module
  player.x += player.vx;
  player.z += player.vz;

  // keep player strictly inside field bounds (hard clamp)
  P.clampEntityToField(player, field);

  // --- AI and physics ---
  AI.updateOpponentAI(opponent, ball, player, dt, field);
  ensureOpponentOnField(opponent, field);

  // collisions
  collidePlayers(player, opponent);

  // ball physics
  P.integrateBall(ball, dt);

  // collisions with ball
  collideBallPlayer(player, ball);
  collideBallPlayer(opponent, ball);

  // apply friction for players (gentle)
  P.applyPlayerFriction(player); P.applyPlayerFriction(opponent);

  // ensure opponent clamp again (post collisions)
  P.clampEntityToField(opponent, field);

  checkGoal();

  // --- RENDER ---
  ctx.clearRect(0,0,c.width,c.height);
  R.drawField(ctx, R.project, field, state);

  // bound project
  const projBound = (p) => R.project(p, state);

  const list = [
    { o: opponent, z: opponent.z, draw: () => R.drawPlayer(ctx, projBound, opponent, 'OPP') },
    { o: ball,     z: ball.z,     draw: () => R.drawBall(ctx, projBound, ball) },
    { o: player,   z: player.z,   draw: () => R.drawPlayer(ctx, projBound, player, 'YOU') },
  ];
  list.sort((a,b) => a.z - b.z);
  list.forEach(x => x.draw());

  // HUD
  ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='14px monospace';
  ctx.fillText('Space kick, R reset, Esc stop', 12, 28);

  loopId = requestAnimationFrame(loop);
}

loopId = requestAnimationFrame(loop);
