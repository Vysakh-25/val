const objectsGroup = new THREE.Group();
const enemies = [];
const particles = [];
const boxes = [];
const smokeSpheres = [];

const player = {
  yaw: 0, pitch: 0,
  velocity: new THREE.Vector3(),
  isGrounded: true, isADS: false,
  radius: 0.8, height: 1.8,
  lastFootstep: 0, speedBoost: 0
};
window.player = player;

const gameState = {
  hp: 100, currentWeapon: 'vandal', ammo: 25, reserve: 75,
  isReloading: false, lastFireTime: 0,
  abilities: {
    smoke: { cooldown: 0, duration: 4000, lastCast: 0 },
    dash: { cooldown: 0, lastCast: 0 }
  }
};

let playerRole = 'attacker';
window.roundOver = false;
window.isPracticeMode = false;
window.aiDebugMode = false;

const ATK_SPAWN = new THREE.Vector3(0, 0, 45);
const DEF_SPAWN = new THREE.Vector3(0, 0, -45);

const spikeState = {
  placed: false, planted: false, defused: false,
  position: new THREE.Vector3(0, 0, 0),
  mesh: null, progress: 0, timer: 45,
  planterTeam: 'attacker', plantZoneRadius: 8
};

// ── VIEWMODEL ANIMATION STATE ──
let gunGroup = new THREE.Group();
let currentGunMesh = null;
let gunRecoilOffset = 0;
let gunRecoilRotation = 0;

class AudioSystem {
  constructor() { this.ctx = null; this.masterGain = null; }
  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if(!AudioContext) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }
  playTone(freq, type, duration, vol=1, detune=0) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if(detune) osc.detune.setValueAtTime(detune, this.ctx.currentTime);
    gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
    osc.connect(gainNode); gainNode.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + duration);
  }
}
const sfx = new AudioSystem();

function updateHUD() {
  document.getElementById('hp-display').textContent = Math.max(0, Math.ceil(gameState.hp));
  const wep = WEAPONS[gameState.currentWeapon];
  if (wep.type === 'knife') {
    document.getElementById('ammo-display').textContent = '—';
    document.getElementById('reserve-display').textContent = '—';
  } else {
    document.getElementById('ammo-display').textContent = gameState.ammo;
    document.getElementById('reserve-display').textContent = gameState.reserve;
  }
}

// ── EXTENDED WEAPON VISUAL GENERATOR ──
function buildWeaponMesh(wepKey) {
  if (currentGunMesh) gunGroup.remove(currentGunMesh);
  
  currentGunMesh = new THREE.Group();
  let mainMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.5 });
  let accentMat = new THREE.MeshStandardMaterial({ color: 0xff4655, roughness: 0.4 }); // Tactical Red Accent

  if (wepKey === 'vandal') {
    // Rifle body, barrel, and magazine
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.7), mainMat);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), mainMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.5);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.12), accentMat);
    mag.position.set(0, -0.15, -0.1);
    mag.rotation.x = 0.2;
    currentGunMesh.add(body, barrel, mag);

  } else if (wepKey === 'shorty') {
    // Dual side-by-side shot gun barrels
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.4), mainMat);
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.4), mainMat);
    b1.rotation.x = Math.PI / 2; b1.position.set(-0.03, 0.02, -0.3);
    const b2 = b1.clone(); b2.position.x = 0.03;
    currentGunMesh.add(body, b1, b2);

  } else if (wepKey === 'operator') {
    // Long heavy sniper rifle and massive visual scope mount
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.9), mainMat);
    const longBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1), mainMat);
    longBarrel.rotation.x = Math.PI / 2; longBarrel.position.set(0, 0.05, -0.9);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35), mainMat);
    scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.16, -0.1);
    currentGunMesh.add(body, longBarrel, scope);

  } else if (wepKey === 'knife') {
    // Melee blade configuration
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.25), mainMat);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.08, 0.35), accentMat);
    blade.position.set(0, 0.02, -0.25);
    currentGunMesh.add(handle, blade);
  }

  gunGroup.add(currentGunMesh);
}

function switchWeapon(wepKey) {
  if (gameState.isReloading) stopReload();
  gameState.currentWeapon = wepKey;
  const wep = WEAPONS[wepKey];
  if(wepKey !== 'operator') stopADS();
  
  document.querySelectorAll('.weapon-slot').forEach(s => s.classList.remove('active'));
  const slotId = 'slot-' + wep.slot;
  const el = document.getElementById(slotId);
  if(el) el.classList.add('active');
  
  buildWeaponMesh(wepKey);
  sfx.playTone(300, 'triangle', 0.12, 0.4);
  updateHUD();
}

function stopADS() {
  player.isADS = false;
  document.getElementById('scope-overlay').classList.remove('visible');
  if (window.camera) window.camera.fov = 75;
}

function stopReload() {
  gameState.isReloading = false;
  document.getElementById('reload-bar-wrap').classList.remove('visible');
}

function triggerRoundEnd(isWin, message) {
  window.roundOver = true;
  document.exitPointerLock();
  const screen = document.getElementById('round-result');
  screen.className = isWin ? 'overlay-screen win' : 'overlay-screen lose';
  document.getElementById('result-title').textContent = isWin ? "ROUND WON" : "ROUND LOST";
  document.getElementById('result-sub').textContent = message;
  screen.style.display = 'flex';
}

// ── ENVIRONMENT BUILDERS ──
function buildMapEnvironment() {
  if (!window.scene) return;
  
  window.scene.add(objectsGroup);
  // Re-append viewmodel container structure directly to main active scene framework
  window.scene.add(gunGroup);

  while(objectsGroup.children.length > 0){ 
    objectsGroup.remove(objectsGroup.children[0]); 
  }
  boxes.length = 0;

  const floorGeo = new THREE.PlaneGeometry(120, 120);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1f242c, roughness: 0.8 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  objectsGroup.add(floor);

  const boxData = [
    { size: [4, 5, 4], pos: [-6, 2.5, -5], color: 0x3a4454 },
    { size: [3, 3, 3], pos: [5, 1.5, 4], color: 0x4e5d6c },
    { size: [5, 4, 3], pos: [-12, 2, 8], color: 0x2e3540 },
    { size: [2, 6, 2], pos: [8, 3, -10], color: 0x5c6b73 }
  ];

  boxData.forEach(b => {
    const geo = new THREE.BoxGeometry(...b.size);
    const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...b.pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    objectsGroup.add(mesh);

    boxes.push({
      min: new THREE.Vector3(b.pos[0] - b.size[0]/2, 0, b.pos[2] - b.size[2]/2),
      max: new THREE.Vector3(b.pos[0] + b.size[0]/2, b.size[1], b.pos[2] + b.size[2]/2)
    });
  });

  const ringGeo = new THREE.RingGeometry(spikeState.plantZoneRadius - 0.1, spikeState.plantZoneRadius, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
  const zoneRing = new THREE.Mesh(ringGeo, ringMat);
  zoneRing.rotation.x = Math.PI / 2;
  zoneRing.position.set(0, 0.02, 0);
  objectsGroup.add(zoneRing);
}

function placeSpike() {
  if (spikeState.mesh && window.scene) window.scene.remove(spikeState.mesh);
  
  spikeState.planted = false;
  spikeState.defused = false;
  spikeState.progress = 0;
  spikeState.timer = 45;

  if (playerRole === 'defender') {
    spikeState.placed = true;
    spikeState.position.set(0, 0.5, 0);
    
    const geo = new THREE.ConeGeometry(0.4, 1.2, 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff4655, metalness: 0.8, roughness: 0.2 });
    spikeState.mesh = new THREE.Mesh(geo, mat);
    spikeState.mesh.position.copy(spikeState.position);
    window.scene.add(spikeState.mesh);
  } else {
    spikeState.placed = false;
  }
}

function spawnBot(isEnemyDefending) {
  if (!window.scene) return;

  const botGroup = new THREE.Group();
  
  const bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.8, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: isEnemyDefending ? 0x1155aa : 0xff4655 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.9;
  body.castShadow = true;
  botGroup.add(body);

  const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.8;
  head.castShadow = true;
  botGroup.add(head);

  const range = 30;
  botGroup.position.set(
    (Math.random() - 0.5) * range,
    0,
    isEnemyDefending ? (Math.random() * -20 - 10) : (Math.random() * 20 + 10)
  );

  window.scene.add(botGroup);

  enemies.push({
    group: botGroup,
    head: head,
    hp: 100,
    isDead: false,
    lastShotTime: 0,
    velocity: new THREE.Vector3()
  });
}

// ── CORE GAME PHYSICS ENGINE & VIEWMODEL TRACKING ──
function updatePlayerMovementPhysics(dt) {
  if (!window.camera) return;

  window.camera.rotation.order = 'YXZ';
  window.camera.rotation.y = player.yaw;
  window.camera.rotation.x = player.pitch;

  let speed = player.isADS ? 2.5 : 5.5;
  if (window.keysPressed && window.keysPressed[window.binds.walk]) speed *= 0.45;
  if (player.speedBoost > 0) { speed *= 2.5; player.speedBoost -= dt; }

  const moveVector = new THREE.Vector3();
  if (window.keysPressed[window.binds.forward]) moveVector.z -= 1;
  if (window.keysPressed[window.binds.backward]) moveVector.z += 1;
  if (window.keysPressed[window.binds.left]) moveVector.x -= 1;
  if (window.keysPressed[window.binds.right]) moveVector.x += 1;
  moveVector.normalize();

  const forwardTarget = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
  const sideTarget = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);

  const desiredVelocity = new THREE.Vector3()
    .addScaledVector(forwardTarget, -moveVector.z)
    .addScaledVector(sideTarget, moveVector.x)
    .setLength(speed);

  player.velocity.x = desiredVelocity.x;
  player.velocity.z = desiredVelocity.z;

  if (!player.isGrounded) {
    player.velocity.y -= 22 * dt; 
  } else if (window.keysPressed[window.binds.jump]) {
    player.velocity.y = 8;
    player.isGrounded = false;
    sfx.playTone(160, 'triangle', 0.15, 0.2);
  }

  const nextPos = window.camera.position.clone().addScaledVector(player.velocity, dt);
  
  nextPos.x = Math.max(-58, Math.min(58, nextPos.x));
  nextPos.z = Math.max(-58, Math.min(58, nextPos.z));

  boxes.forEach(box => {
    if (nextPos.x + player.radius > box.min.x && nextPos.x - player.radius < box.max.x &&
        nextPos.z + player.radius > box.min.z && nextPos.z - player.radius < box.max.z) {
      if (window.camera.position.y <= box.max.y) {
        if (window.camera.position.x - player.radius >= box.max.x || window.camera.position.x + player.radius <= box.min.x) {
          nextPos.x = window.camera.position.x;
        }
        if (window.camera.position.z - player.radius >= box.max.z || window.camera.position.z + player.radius <= box.min.z) {
          nextPos.z = window.camera.position.z;
        }
      }
    }
  });

  window.camera.position.copy(nextPos);

  if (window.camera.position.y <= player.height) {
    window.camera.position.y = player.height;
    player.velocity.y = 0;
    player.isGrounded = true;
  }

  // ── ANIMATE GUN VIEWMODEL ENGINE TICK ──
  if (gunGroup && currentGunMesh) {
    // Snap gun tracking coordinates directly to the player's camera position
    gunGroup.position.copy(window.camera.position);
    gunGroup.rotation.copy(window.camera.rotation);

    // Linear interpolation decay (Lerp) to return weapon smoothly to original hand idle point
    gunRecoilOffset = THREE.MathUtils.lerp(gunRecoilOffset, 0, 12 * dt);
    gunRecoilRotation = THREE.MathUtils.lerp(gunRecoilRotation, 0, 12 * dt);

    // Hide weapon from view completely if utilizing heavy Operator overlay sniper scopes
    if (player.isADS && gameState.currentWeapon === 'operator') {
      currentGunMesh.visible = false;
    } else {
      currentGunMesh.visible = true;
      
      // Calculate dynamic idle weapon sway using simple math waves
      let swayX = 0, swayY = 0;
      if (moveVector.lengthSq() > 0 && player.isGrounded) {
        const time = performance.now() * 0.006;
        swayX = Math.sin(time) * 0.015;
        swayY = Math.abs(Math.cos(time * 2)) * 0.015;
      }

      // Reposition viewmodel into traditional lower-right hand offset quadrant
      let targetX = player.isADS ? 0.0 : 0.22 + swayX;
      let targetY = player.isADS ? -0.08 : -0.22 + swayY;
      let targetZ = player.isADS ? -0.3 : -0.45 + gunRecoilOffset; // Kickback shifts backward along Z-axis

      currentGunMesh.position.set(targetX, targetY, targetZ);
      currentGunMesh.rotation.set(-gunRecoilRotation, 0, 0); // Tip barrel upwards slightly during weapon pop
    }
  }
}

function updateActiveBotsBehavior(dt) {
  enemies.forEach(bot => {
    if (bot.isDead) return;
    bot.group.rotation.y += 0.4 * dt;
  });
}

function initMatch(role) {
  sfx.init(); 
  playerRole = role; 
  window.roundOver = false; 
  gameState.hp = 100;
  
  buildMapEnvironment(); 
  switchWeapon('vandal');
  
  document.getElementById('role-badge').textContent = role.toUpperCase();
  document.getElementById('role-badge').className = role;
  document.getElementById('spike-carry').classList.toggle('visible', role === 'attacker');
  document.getElementById('spike-timer').classList.remove('visible');

  if (window.camera) {
    window.camera.position.copy(role === 'attacker' ? ATK_SPAWN : DEF_SPAWN);
    window.camera.rotation.set(0, role === 'attacker' ? 0 : Math.PI, 0);
    player.yaw = window.camera.rotation.y; 
    player.pitch = window.camera.rotation.x;
  }
  
  player.velocity.set(0, 0, 0); 
  player.isGrounded = true; 
  stopADS();

  enemies.forEach(e => { if (e.group) window.scene.remove(e.group); }); 
  enemies.length = 0;
  
  for (let i = 0; i < 4; i++) spawnBot(role === 'attacker');

  placeSpike();
  updateHUD();
  document.body.requestPointerLock();
}

// ── ABILITIES & ACTIONS FILLED FUNCTIONS ──
function castSmokeGrenadeAbility() {
  const now = performance.now();
  if (now - gameState.abilities.smoke.lastCast < gameState.abilities.smoke.duration) return;
  gameState.abilities.smoke.lastCast = now;

  sfx.playTone(220, 'sine', 0.4, 0.5);
  
  if (!window.scene || !window.camera) return;
  const geo = new THREE.SphereGeometry(6, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x334466,
    transparent: true,
    opacity: 0.85,
    roughness: 0.9,
    side: THREE.DoubleSide
  });
  
  const smokeMesh = new THREE.Mesh(geo, mat);
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(window.camera.quaternion);
  smokeMesh.position.copy(window.camera.position).addScaledVector(dir, 12);
  smokeMesh.position.y = Math.max(0, smokeMesh.position.y);
  
  window.scene.add(smokeMesh);
  smokeSpheres.push(smokeMesh);

  setTimeout(() => {
    window.scene.remove(smokeMesh);
    const index = smokeSpheres.indexOf(smokeMesh);
    if (index > -1) smokeSpheres.splice(index, 1);
  }, gameState.abilities.smoke.duration);
}

function triggerDashAbility() {
  if (gameState.abilities.dash.cooldown > 0) return;
  player.speedBoost = 0.3;
  sfx.playTone(800, 'sine', 0.2, 0.6, 200);
}

function startReload() {
  if (gameState.isReloading) return;
  const wep = WEAPONS[gameState.currentWeapon];
  if (gameState.ammo === wep.ammo || gameState.reserve <= 0) return;
  
  gameState.isReloading = true;
  const wrap = document.getElementById('reload-bar-wrap');
  wrap.classList.add('visible');
  const fill = document.getElementById('reload-bar-fill');
  fill.style.width = '0%';
  setTimeout(() => fill.style.width = '100%', 10);

  // Rotate gun downwards briefly to simulate physical reload action movement
  gunRecoilRotation = -0.4;

  setTimeout(() => {
    if (!gameState.isReloading) return;
    const needed = wep.ammo - gameState.ammo;
    const transfer = Math.min(needed, gameState.reserve);
    gameState.ammo += transfer;
    gameState.reserve -= transfer;
    stopReload();
    updateHUD();
  }, wep.reloadTime);
}

function handlePrimaryAttackTrigger() {
  if (window.roundOver || gameState.isReloading) return;
  const wep = WEAPONS[gameState.currentWeapon];
  const now = performance.now();
  if (now - gameState.lastFireTime < (1000 / wep.fireRate)) return;
  gameState.lastFireTime = now;

  if (wep.type !== 'knife' && gameState.ammo <= 0) {
    sfx.playTone(120, 'square', 0.05, 0.3);
    startReload();
    return;
  }

  if (wep.type !== 'knife') gameState.ammo--;
  updateHUD();

  // ── TRIGGER INTERPOLATION ANIMATION RECOIL VALUES ──
  if (wep.type === 'knife') {
    gunRecoilOffset = -0.15;  // Slash lunge punch forward movement
    gunRecoilRotation = 0.3;  
  } else {
    gunRecoilOffset = 0.08;   // Slide gun structure back towards face
    gunRecoilRotation = wep.type === 'operator' ? 0.25 : 0.12; 
  }

  if (wep.type === 'vandal') sfx.playTone(450, 'sawtooth', 0.08, 0.8, -100);
  else if (wep.type === 'shorty') sfx.playTone(180, 'sawtooth', 0.15, 1.0, -300);
  else if (wep.type === 'operator') sfx.playTone(600, 'sawtooth', 0.3, 1.2, -500);
  else sfx.playTone(150, 'triangle', 0.05, 0.5);

  if (wep.type !== 'knife') {
    player.pitch += (Math.random() * 0.01 + wep.sprayControl * 0.1);
  }

  if (!window.camera || !window.scene) return;
  const raycaster = new THREE.Raycaster();
  const centerCoord = new THREE.Vector2(0, 0);
  raycaster.setFromCamera(centerCoord, window.camera);

  const targetableMeshes = [];
  enemies.forEach(bot => {
    if (bot.isDead) return;
    bot.group.children.forEach(child => {
      child.userData.parentBot = bot;
      targetableMeshes.push(child);
    });
  });

  const intersects = raycaster.intersectObjects(targetableMeshes);
  if (intersects.length > 0) {
    const hitObj = intersects[0].object;
    const bot = hitObj.userData.parentBot;
    const isHeadshot = (hitObj.geometry.type === 'SphereGeometry');
    const baseDamage = isHeadshot ? wep.damageHead : wep.damageBody;

    if (bot && !bot.isDead) {
      bot.hp -= baseDamage;
      
      const hm = document.getElementById('hitmarker');
      hm.className = isHeadshot ? 'show headshot' : 'show';
      sfx.playTone(isHeadshot ? 1200 : 880, 'sine', 0.06, 0.6);
      setTimeout(() => hm.className = '', 140);

      if (bot.hp <= 0) {
        bot.isDead = true;
        window.scene.remove(bot.group);
        sfx.playTone(600, 'sine', 0.25, 0.4);
        
        const feed = document.getElementById('killfeed');
        const msg = document.createElement('div');
        msg.className = 'kill-msg';
        msg.textContent = `PLAYER ➔ BOT (${isHeadshot ? '🔴 HEADSHOT' : 'BODY'})`;
        feed.appendChild(msg);
        setTimeout(() => msg.remove(), 2500);

        if (enemies.every(e => e.isDead)) {
          triggerRoundEnd(true, "All hostile entities eliminated successfully.");
        }
      }
    }
  }
}

function toggleAimDownSightsOptics() {
  const wep = WEAPONS[gameState.currentWeapon];
  if (wep.type === 'knife' || wep.type === 'shorty') return;

  player.isADS = !player.isADS;
  const scopeOverlay = document.getElementById('scope-overlay');
  
  if (player.isADS) {
    if (window.camera) window.camera.fov = wep.zoomFov;
    if (wep.type === 'operator') scopeOverlay.classList.add('visible');
    sfx.playTone(550, 'sine', 0.04, 0.3);
  } else {
    stopADS();
    sfx.playTone(400, 'sine', 0.04, 0.3);
  }
  if (window.camera) window.camera.updateProjectionMatrix();
}

// Export cleanly to global window space
window.initMatch = initMatch;
window.gameState = gameState;
window.updateHUD = updateHUD;
window.switchWeapon = switchWeapon;
window.stopADS = stopADS;
window.updatePlayerMovementPhysics = updatePlayerMovementPhysics;
window.updateActiveBotsBehavior = updateActiveBotsBehavior;
window.startReload = startReload;
window.triggerDashAbility = triggerDashAbility;
window.castSmokeGrenadeAbility = castSmokeGrenadeAbility;
window.handlePrimaryAttackTrigger = handlePrimaryAttackTrigger;
window.toggleAimDownSightsOptics = toggleAimDownSightsOptics;