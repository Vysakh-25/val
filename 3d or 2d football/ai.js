// ai.js
// Stateful opponent AI with enable/disable toggle.

import { clamp } from './utils.js';

let _enabled = false; // IMPORTANT: default disabled so you can tune player movement

export function isEnabled(){ return _enabled; }
export function setEnabled(v){
  _enabled = !!v;
  // expose for console convenience
  console.log('AI enabled =', _enabled);
}

// AI behaviour for opponent; relies on simple perception and state machine
export function updateOpponentAI(opponent, ball, player, dt, field){
  if (!_enabled) {
    // keep opponent at home position, zero velocity, idle state
    opponent.vx = 0; opponent.vz = 0;
    opponent.x = clamp(opponent.x, opponent.home.x - 0.5, opponent.home.x + 0.5);
    opponent.z = clamp(opponent.z, opponent.home.z - 0.5, opponent.home.z + 0.5);
    opponent.state = 'idle';
    return;
  }

  if (opponent.cooldown > 0) opponent.cooldown -= dt;
  const dx = ball.x - opponent.x, dz = ball.z - opponent.z;
  const dist = Math.hypot(dx,dz);
  const now = performance.now();
  const hasBall = dist < (opponent.radius + ball.radius + 2);

  if (opponent.state === 'idle'){
    if (dist < 260 && opponent.cooldown <= 0 && Math.random() < 0.98){
      opponent.state = 'chase'; opponent.lastStateChange = now;
    } else {
      const dxh = opponent.home.x - opponent.x, dzh = opponent.home.z - opponent.z;
      opponent.vx += dxh * 0.0006 * dt; opponent.vz += dzh * 0.0006 * dt;
    }
  } else if (opponent.state === 'chase'){
    const jitter = (Math.random()-0.5) * 0.9;
    const playerBetween = isPlayerBlocking(opponent, ball, player);
    const slowdown = playerBetween ? 0.33 : 1.0;
    const predictFactor = clamp(dist / 900, 0, 0.28);
    const targetX = ball.x + ball.vx * predictFactor + jitter * 4;
    const targetZ = ball.z + ball.vz * predictFactor;
    const ddx = targetX - opponent.x, ddz = targetZ - opponent.z;
    const speedBase = clamp(0.018 + dist/1400, 0.02, 0.14) * dt;
    opponent.vx = ddx * speedBase * slowdown; opponent.vz = ddz * speedBase * slowdown;
    opponent.x += opponent.vx; opponent.z += opponent.vz;
    if (now - opponent.lastStateChange > 2600 && Math.random() < 0.12){
      opponent.state = 'return'; opponent.lastStateChange = now;
    }
    if (hasBall){
      attemptKick(opponent, ball, dist);
      opponent.cooldown = 700 + Math.random() * 700;
      opponent.state = 'return'; opponent.lastStateChange = now;
    }
  } else if (opponent.state === 'return'){
    const dxh = opponent.home.x - opponent.x, dzh = opponent.home.z - opponent.z;
    opponent.vx = dxh * 0.0016 * dt;
    opponent.vz = dzh * 0.0016 * dt;
    opponent.x += opponent.vx; opponent.z += opponent.vz;
    if (Math.hypot(dxh, dzh) < 8 || Math.random() < 0.02){
      opponent.state = 'idle'; opponent.lastStateChange = now;
    }
  }

  opponent.x = clamp(opponent.x, -field.w/2 + opponent.radius, field.w/2 - opponent.radius);
  opponent.z = clamp(opponent.z, 20, field.h - 20);
}

function isPlayerBlocking(op, b, pl){
  const ax=op.x, az=op.z, bx=b.x, bz=b.z, px=pl.x, pz=pl.z;
  const dx=bx-ax, dz=bz-az, len2=dx*dx+dz*dz;
  if (len2 < 1) return false;
  const t = ((px-ax)*dx + (pz-az)*dz) / len2;
  if (t < 0 || t > 1) return false;
  const projx = ax + dx * t, projz = az + dz * t;
  const dist = Math.hypot(px - projx, pz - projz);
  return dist < 18;
}

function attemptKick(op, ball, dist){
  if (Math.random() < 0.85){
    const goalDir = { x: 0 - op.x, z: (900 - 14) - op.z };
    const gmag = Math.hypot(goalDir.x, goalDir.z) || 1;
    const kickPow = 2.0 + Math.hypot(op.vx, op.vz) * 6;
    const spread = (Math.random()-0.5) * 0.35 * (1 - Math.min(1, dist/200));
    ball.vx = ((goalDir.x/gmag) + spread) * kickPow;
    ball.vz = (goalDir.z/gmag) * kickPow;
    ball.vy = 2.0 + Math.min(4, kickPow * 0.18);
    ball.spin = (Math.random()-0.5) * 4;
  } else {
    ball.vx += (Math.random()-0.5) * 0.8;
    ball.vz += (Math.random()-0.5) * 0.8;
    ball.vy = 1.2;
  }
}
