// physics operations: integrate ball, player friction, simple collisions utilities
import { clamp } from './utils.js';

export const PHYS = {
  friction: 0.985,
  ballFriction: 0.993,
  gravity: 0.35,
};

export function integrateBall(ball, dt){
  const air = 1 - (0.0006 * dt);
  ball.vx *= air;
  ball.vz *= air;
  ball.vx += ball.spin * 0.0006 * dt;
  ball.x += ball.vx;
  ball.z += ball.vz;
  ball.y += ball.vy;
  ball.vy -= PHYS.gravity * (dt/16);
  if (ball.y < 0){
    ball.y = 0;
    if (Math.abs(ball.vy) > 1.0){
      ball.vy *= -0.28;
      ball.vx *= 0.86; ball.vz *= 0.86;
    } else {
      ball.vy = 0;
      ball.vx *= 0.995; ball.vz *= 0.995;
    }
  }
  if (Math.abs(ball.vx) < 0.01) ball.vx = 0;
  if (Math.abs(ball.vz) < 0.01) ball.vz = 0;
}

export function applyPlayerFriction(p){
  p.vx *= PHYS.friction;
  p.vz *= PHYS.friction;
}

export function clampEntityToField(e, field){
  e.x = clamp(e.x, -field.w/2 + e.radius, field.w/2 - e.radius);
  e.z = clamp(e.z, 20, field.h - 20);
}
