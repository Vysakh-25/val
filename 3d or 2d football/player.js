// player.js
// createPlayer and a better input -> velocity controller (target velocity + acceleration/brake)

export function createPlayer(initial){
  return Object.assign({
    x:0, y:0, z:120,
    vx:0, vy:0, vz:0,
    radius:9, color:'#fff'
  }, initial || {});
}

/*
 updatePlayerFromInput:
 - keys: keyboard map
 - dt: delta ms
Returns nothing (mutates player)
*/
export function updatePlayerFromInput(player, keys, dt){
  // tuned values you can tweak:
  const dtf = Math.max(1, dt) / 16; // normalize to ~60fps baseline
  const maxSpeed = 0.87;     // world units per frame baseline (higher -> faster top speed)
  const accel = 0.1;       // how fast we reach the target velocity
  const brake = 0.12;        // how fast we decelerate when input released
  const lateralScale = 0.7; // reduce sideways sensitivity

  // gather input
  let ix = 0, iz = 0;
  if (keys['arrowleft'] || keys['a']) ix -= 1;
  if (keys['arrowright'] || keys['d']) ix += 1;
  if (keys['arrowup'] || keys['w']) iz += 1;
  if (keys['arrowdown'] || keys['s']) iz -= 1;

  if (ix !== 0 || iz !== 0) {
    const len = Math.hypot(ix, iz) || 1;
    ix = ix / len;
    iz = iz / len;
    // reduce sideways input
    ix *= lateralScale;

    // target velocity in world coords
    const targetVX = ix * maxSpeed;
    const targetVZ = iz * maxSpeed;

    // smooth acceleration towards target
    player.vx += (targetVX - player.vx) * accel * dtf;
    player.vz += (targetVZ - player.vz) * accel * dtf;
  } else {
    // no input -> brake to stop (stronger than passive friction)
    player.vx += (0 - player.vx) * brake * dtf;
    player.vz += (0 - player.vz) * brake * dtf;
  }

  // clamp tiny velocities
  if (Math.abs(player.vx) < 0.001) player.vx = 0;
  if (Math.abs(player.vz) < 0.001) player.vz = 0;
}
