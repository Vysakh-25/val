// DYNAMIC GLOBAL STATE REGISTRIES
const keysPressed = {};
let mouseLeftPressed = false;
let mouseRightPressed = false;

// INTER-FILE PROPERTY MOUNT CORES
window.keysPressed = keysPressed;

// RUNTIME INTERCEPT DELEGATOR HOOKS
window.addEventListener('keydown', (e) => {
  if (document.pointerLockElement !== document.body) return;
  const lowerKey = e.key.toLowerCase();
  keysPressed[lowerKey] = true;
  keysPressed[e.key] = true; // Safe check for spacing triggers
  
  // Intercept direct item slot hotkeys
  if (lowerKey === binds.weapon1) switchWeapon('vandal');
  if (lowerKey === binds.weapon2) switchWeapon('shorty');
  if (lowerKey === binds.weapon3) switchWeapon('operator');
  if (lowerKey === binds.weapon4) switchWeapon('knife');
  if (lowerKey === binds.reload) startReload();
  if (lowerKey === binds.smoke) castSmokeGrenadeAbility();
  if (lowerKey === binds.dash) triggerDashAbility();
});

window.addEventListener('keyup', (e) => {
  const lowerKey = e.key.toLowerCase();
  keysPressed[lowerKey] = false;
  keysPressed[e.key] = false;
});

window.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== document.body) return;
  if (e.button === 0) { mouseLeftPressed = true; handlePrimaryAttackTrigger(); }
  if (e.button === 2) { mouseRightPressed = true; toggleAimDownSightsOptics(); }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseLeftPressed = false;
  if (e.button === 2) mouseRightPressed = false;
});

// CRITICAL MOUSELOOK RADIAN CONTROLLER — MOUNTED TO GLOBAL SCOPE
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== document.body) return;
  
  // Calculate raw look modifications against movement vectors
  player.yaw -= e.movementX * 0.002;
  player.pitch -= e.movementY * 0.002;
  
  // Force pitch cap constraints to prevent structural map flipping
  player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, player.pitch));
  
  if (window.camera) {
    window.camera.rotation.order = "YXZ";
    window.camera.rotation.y = player.yaw;
    window.camera.rotation.x = player.pitch;
    window.camera.rotation.z = 0; // Fixes aeroplane rotation spin
  }
});