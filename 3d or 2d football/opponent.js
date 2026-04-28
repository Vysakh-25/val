// opponent entity with simple state machine
import { clamp } from './utils.js';

export function createOpponent(initial){
  return Object.assign({
    x:-30,y:0,z:520,vx:0,vy:0,vz:0,radius:9,color:'#222',
    state:'idle', home:{x:-30,z:520}, lastStateChange:0, cooldown:0
  }, initial || {});
}

export function ensureOpponentOnField(opponent, field){
  opponent.x = clamp(opponent.x, -field.w/2 + opponent.radius, field.w/2 - opponent.radius);
  opponent.z = clamp(opponent.z, 20, field.h - 20);
}
