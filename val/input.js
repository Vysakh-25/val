const keysPressed = {};
let mouseLeftPressed = false;
let mouseRightPressed = false;

window.keysPressed = keysPressed;

window.addEventListener('keydown', (e) => {
  if (document.pointerLockElement !== document.body) return;
  const lowerKey = e.key.toLowerCase();
  keysPressed[lowerKey] = true;
  keysPressed[e.key] = true;

  if (typeof switchWeapon === 'function') {
    if (lowerKey === window.binds.weapon1) switchWeapon('vandal');
    if (lowerKey === window.binds.weapon2) switchWeapon('shorty');
    if (lowerKey === window.binds.weapon3) switchWeapon('operator');
    if (lowerKey === window.binds.weapon4) switchWeapon('knife');
  }
  if (lowerKey === window.binds.reload && typeof startReload === 'function') startReload();
  if (lowerKey === window.binds.smoke && typeof castSmokeGrenadeAbility === 'function') castSmokeGrenadeAbility();
  if (lowerKey === window.binds.dash && typeof triggerDashAbility === 'function') triggerDashAbility();
});

window.addEventListener('keyup', (e) => {
  const lowerKey = e.key.toLowerCase();
  keysPressed[lowerKey] = false;
  keysPressed[e.key] = false;
});

window.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== document.body) return;
  if (e.button === 0) { mouseLeftPressed = true; if (typeof handlePrimaryAttackTrigger === 'function') handlePrimaryAttackTrigger(); }
  if (e.button === 2) { mouseRightPressed = true; if (typeof toggleAimDownSightsOptics === 'function') toggleAimDownSightsOptics(); }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseLeftPressed = false;
  if (e.button === 2) mouseRightPressed = false;
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== document.body || !window.player) return;

  window.player.yaw -= e.movementX * 0.002;
  window.player.pitch -= e.movementY * 0.002;
  window.player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, window.player.pitch));
});