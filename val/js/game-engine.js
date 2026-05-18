// ═══ GLOBAL SYSTEM STATES AND GEOMETRIES ═══
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
let roundOver = false;
let isPracticeMode = false;
let aiDebugMode = false;

// Spawning Vector Reference Constants
const ATK_SPAWN = new THREE.Vector3(0, 0, 45);
const DEF_SPAWN = new THREE.Vector3(0, 0, -45);

// Spike Objective Management Node
const spikeState = {
  placed: false, planted: false, defused: false,
  position: new THREE.Vector3(0, 0, 0),
  mesh: null, progress: 0, timer: 45,
  planterTeam: 'attacker', plantZoneRadius: 8
};

// ═══ ADVANCED AUDIO GENERATOR ENGINE ═══
class AudioSystem {
  constructor() { this.ctx = null; this.masterGain = null; this.lastHeartbeat = 0; }
  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }
  playProcedural(type, spatialPos = null) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    let vol = 1.0;
    if (spatialPos && window.camera) {
      const dist = window.camera.position.distanceTo(spatialPos);
      if (dist > 50) return;
      vol = Math.max(0, 1 - (dist / 50));
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.masterGain);

    if (type === 'vandal' || type === 'bot_vandal') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      gain.gain.setValueAtTime(vol * 0.7, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
      osc.start(t); osc.stop(t + 0.14); this.playNoise(0.08, 0.4 * vol, true);
    } else if (type === 'shorty') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(90, t);
      gain.gain.setValueAtTime(vol * 0.9, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
      osc.start(t); osc.stop(t + 0.18); this.playNoise(0.15, 0.9 * vol, false);
    } else if (type === 'operator') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);
      gain.gain.setValueAtTime(vol * 1.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
      osc.start(t); osc.stop(t + 0.28); this.playNoise(0.22, 1.0 * vol, true);
    } else if (type === 'reload') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(600, t);
      osc.frequency.setValueAtTime(300, t + 0.15);
      gain.gain.setValueAtTime(vol * 0.15, t); gain.gain.linearRampToValueAtTime(0, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
    } else if (type === 'footstep') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(60, t);
      gain.gain.setValueAtTime(vol * 0.12, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc.start(t); osc.stop(t + 0.08);
    } else if (type === 'jump') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.1);
      gain.gain.setValueAtTime(vol * 0.15, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.start(t); osc.stop(t + 0.12);
    } else if (type === 'landing') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(50, t);
      gain.gain.setValueAtTime(vol * 0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.start(t); osc.stop(t + 0.15);
    } else if (type === 'dash') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
      gain.gain.setValueAtTime(vol * 0.4, t); gain.gain.linearRampToValueAtTime(0, t + 0.18);
      osc.start(t); osc.stop(t + 0.18);
    } else if (type === 'smoke') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(150, t);
      gain.gain.setValueAtTime(vol * 0.3, t); gain.gain.linearRampToValueAtTime(0, t + 0.5);
      osc.start(t); osc.stop(t + 0.5); this.playNoise(0.5, vol * 0.2, false);
    } else if (type === 'spike_beep') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(2200, t);
      gain.gain.setValueAtTime(vol * 0.4, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc.start(t); osc.stop(t + 0.08);
    } else if (type === 'spike_plant') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(440, t);
      gain.gain.setValueAtTime(vol * 0.3, t); gain.gain.linearRampToValueAtTime(0, t + 0.4);
      osc.start(t); osc.stop(t + 0.4);
    } else if (type === 'spike_defuse') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(880, t);
      gain.gain.setValueAtTime(vol * 0.2, t); gain.gain.linearRampToValueAtTime(0, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
    }
  }
  playNoise(duration, volume, highpass = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter(); filter.type = highpass ? 'highpass' : 'lowpass';
    filter.frequency.setValueAtTime(highpass ? 1000 : 800, t);
    const gain = this.ctx.createGain(); gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
    noise.start(t); noise.stop(t + duration);
  }
}
const sfx = new AudioSystem();

// ═══ ENVIRONMENT GENERATION ═══
function createMapGeometry() {
  while (objectsGroup.children.length > 0) objectsGroup.remove(objectsGroup.children[0]);
  boxes.length = 0;

  const floorGeo = new THREE.PlaneGeometry(120, 120);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.8 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  objectsGroup.add(floor);

  // Borders
  createWall(0, 6, -60, 120, 12, 2, 0x151618); createWall(0, 6, 60, 120, 12, 2, 0x151618);
  createWall(-60, 6, 0, 2, 12, 120, 0x151618); createWall(60, 6, 0, 2, 12, 120, 0x151618);

  // Dynamic Pillar Blocks
  createWall(-18, 4, -18, 8, 8, 8, 0x33373e); createWall(18, 4, 18, 8, 8, 8, 0x33373e);
  createWall(-25, 5, 20, 10, 10, 10, 0x282b30); createWall(25, 5, -20, 10, 10, 10, 0x282b30);
  
  // Tactical Plant Site B Platform
  createWall(0, 1.5, 0, 16, 3, 16, 0x3a3f47);
}

function createWall(x, y, z, w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 });
  const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  objectsGroup.add(mesh);
  boxes.push(new THREE.Box3().setFromObject(mesh));
}

// ═══ CORE MOVEMENT AND PHYSICS RUNTIME ═══
function updatePlayerMovementPhysics(dt) {
  if (player.isGrounded) {
    player.velocity.x -= player.velocity.x * 11.0 * dt;
    player.velocity.z -= player.velocity.z * 11.0 * dt;
  } else {
    player.velocity.x -= player.velocity.x * 2.5 * dt;
    player.velocity.z -= player.velocity.z * 2.5 * dt;
    player.velocity.y -= 26.0 * dt; // Gravity
  }
  if (player.speedBoost > 0) player.speedBoost -= dt;

  const currentBinds = window.binds || DEFAULT_BINDS;
  const forwardVector = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
  const sideVector = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
  
  let baseAccel = player.isADS ? 70.0 : 160.0;
  if (player.speedBoost > 0) baseAccel *= 2.8;

  if (keysPressed[currentBinds.moveForward] || keysPressed['w']) player.velocity.addScaledVector(forwardVector, baseAccel * dt);
  if (keysPressed[currentBinds.moveBack] || keysPressed['s']) player.velocity.addScaledVector(forwardVector, -baseAccel * dt);
  if (keysPressed[currentBinds.moveLeft] || keysPressed['a']) player.velocity.addScaledVector(sideVector, -baseAccel * dt);
  if (keysPressed[currentBinds.moveRight] || keysPressed['d']) player.velocity.addScaledVector(sideVector, baseAccel * dt);

  if (keysPressed[currentBinds.jump] && player.isGrounded) {
    player.velocity.y = 9.2; player.isGrounded = false; sfx.playProcedural('jump');
  }

  // Set positions
  window.camera.position.x += player.velocity.x * dt;
  window.camera.position.z += player.velocity.z * dt;
  window.camera.position.y += player.velocity.y * dt;

  // Floor collision boundary
  if (window.camera.position.y < player.height) {
    if (!player.isGrounded && player.velocity.y < -2) sfx.playProcedural('landing');
    window.camera.position.y = player.height; player.velocity.y = 0; player.isGrounded = true;
  }

  // Wall boundaries collision processing
  const pBox = new THREE.Box3(
    new THREE.Vector3(window.camera.position.x - player.radius, window.camera.position.y - player.height, window.camera.position.z - player.radius),
    new THREE.Vector3(window.camera.position.x + player.radius, window.camera.position.y, window.camera.position.z + player.radius)
  );
  for (let i = 0; i < boxes.length; i++) {
    if (pBox.intersectsBox(boxes[i])) {
      window.camera.position.x -= player.velocity.x * dt;
      window.camera.position.z -= player.velocity.z * dt;
      player.velocity.x = 0; player.velocity.z = 0; break;
    }
  }

  // Play continuous procedural locomotion audio footsteps
  const currentSpeed = new THREE.Vector2(player.velocity.x, player.velocity.z).length();
  if (player.isGrounded && currentSpeed > 1.5) {
    const stepInterval = player.speedBoost > 0 ? 220 : (player.isADS ? 650 : 380);
    const now = performance.now();
    if (now - player.lastFootstep > stepInterval) {
      sfx.playProcedural('footstep'); player.lastFootstep = now;
    }
  }
  updateSpikeMatchRules(dt);
  updateActiveParticles(dt);
}

// ═══ COMBAT AND WEAPON MECHANICS ═══
function handlePrimaryAttackTrigger() {
  if (gameState.isReloading || roundOver || !isGameActive || isMenuPaused) return;
  const config = WEAPONS[gameState.currentWeapon];
  const now = performance.now();
  if (now - gameState.lastFireTime < (1000 / config.fireRate)) return;
  if (!config.isKnife && gameState.ammo <= 0) { startReload(); return; }

  gameState.lastFireTime = now;
  if (!config.isKnife) gameState.ammo--;
  updateHUD(); sfx.playProcedural(config.type, window.camera.position);

  // Dynamic spray recoil spread vectors
  let spread = player.isADS ? (config.sprayControl * 0.3) : config.sprayControl;
  if (!player.isGrounded) spread *= 3.0;

  const raycaster = new THREE.Raycaster();
  const centerCoord = new THREE.Vector2(
    (Math.random() - 0.5) * spread,
    (Math.random() - 0.5) * spread
  );
  raycaster.setFromCamera(centerCoord, window.camera);

  // Animate dynamic crosshair scale kickback expansion
  const ch = document.getElementById('crosshair-container');
  if (ch) {
    ch.style.transform = 'translate(-50%, -50%) scale(1.6)';
    setTimeout(() => { ch.style.transform = 'translate(-50%, -50%) scale(1)'; }, 70);
  }

  if (config.isKnife) {
    executeMeleeCheck(); return;
  }

  // Process raycasting standard hits
  const targetMeshes = [];
  enemies.forEach(e => { if (!e.isDead) { targetMeshes.push(e.head, e.body); } });
  boxes.forEach(b => {
    const m = objectsGroup.children.find(c => c.geometry && b.containsPoint(c.position));
    if (m) targetMeshes.push(m);
  });

  const hits = raycaster.intersectObjects(targetMeshes);
  if (hits.length > 0) {
    const firstHit = hits[0];
    let botHit = null;
    let isHead = false;
    
    enemies.forEach(e => {
      if (e.head === firstHit.object) { botHit = e; isHead = true; }
      if (e.body === firstHit.object) { botHit = e; isHead = false; }
    });

    if (botHit) {
      const dmg = isHead ? config.damageHead : config.damageBody;
      botHit.hp -= dmg; spawnImpactParticles(firstHit.point, 0xff3333);
      triggerCombatHitmarkers(isHead); createFloatingDamageNumbers(dmg, firstHit.point, isHead);
      if (botHit.hp <= 0 && !botHit.isDead) {
        botHit.isDead = true; objectsGroup.remove(botHit.group);
        displayKillfeedNotification("PLAYER", botHit.name);
        checkMatchVictoryConditions();
      }
    } else {
      spawnImpactParticles(firstHit.point, 0xaaaaaa);
    }
  }
}

function executeMeleeCheck() {
  const knifeRay = new THREE.Raycaster();
  knifeRay.setFromCamera(new THREE.Vector2(0,0), window.camera);
  const targetMeshes = [];
  enemies.forEach(e => { if (!e.isDead) targetMeshes.push(e.body); });
  const hits = knifeRay.intersectObjects(targetMeshes);
  if (hits.length > 0 && hits[0].distance < 3.2) {
    const e = enemies.find(bot => bot.body === hits[0].object);
    if (e) {
      e.hp -= WEAPONS.knife.damageBody; triggerCombatHitmarkers(false);
      if (e.hp <= 0 && !e.isDead) {
        e.isDead = true; objectsGroup.remove(e.group);
        displayKillfeedNotification("PLAYER", e.name); checkMatchVictoryConditions();
      }
    }
  }
}

function toggleAimDownSightsOptics() {
  if (gameState.isReloading || gameState.currentWeapon === 'knife') return;
  player.isADS = !player.isADS;
  const scope = document.getElementById('scope-overlay');
  const config = WEAPONS[gameState.currentWeapon];
  
  if (player.isADS) {
    window.camera.fov = config.zoomFov; window.camera.updateProjectionMatrix();
    if (gameState.currentWeapon === 'operator') scope.classList.add('visible');
  } else {
    stopADS();
  }
}

function stopADS() {
  player.isADS = false; window.camera.fov = 75; window.camera.updateProjectionMatrix();
  document.getElementById('scope-overlay').classList.remove('visible');
}

// ═══ BOT AI SYSTEMS ═══
function spawnBot(isAttackerMatch) {
  const botGroup = new THREE.Group();
  const bodyGeo = new THREE.CapsuleGeometry(0.5, 1.2, 4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: isAttackerMatch ? 0x2266ff : 0xff3344, roughness: 0.5 });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat); bodyMesh.position.y = 0.9;
  bodyMesh.castShadow = true; botGroup.add(bodyMesh);

  const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
  const headMesh = new THREE.Mesh(headGeo, headMat); headMesh.position.y = 1.65;
  headMesh.castShadow = true; botGroup.add(headMesh);

  // Target label debug lines
  const debugGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]);
  const debugMat = new THREE.LineBasicMaterial({ color: 0x00ffff, visible: false });
  const debugLine = new THREE.Line(debugGeo, debugMat); botGroup.add(debugLine);

  const names = ["Phoenix", "Jett", "Omen", "Sova", "Sage", "Cypher", "Reyna", "Brimstone"];
  const bName = names[Math.floor(Math.random() * names.length)] + ` [bot-${enemies.length+1}]`;

  const sX = (Math.random() - 0.5) * 60;
  const sZ = isAttackerMatch ? (Math.random() * -25 - 15) : (Math.random() * 25 + 15);
  botGroup.position.set(sX, 0, sZ); objectsGroup.add(botGroup);

  enemies.push({
    group: botGroup, head: headMesh, body: bodyMesh, name: bName, debugLine: debugLine,
    hp: 100, isDead: false, lastShotTime: 0, velocity: new THREE.Vector3()
  });
}

function updateActiveBotsBehavior(dt) {
  const now = performance.now();
  enemies.forEach(bot => {
    if (bot.isDead) return;
    bot.debugLine.material.visible = aiDebugMode;

    const targetPos = spikeState.planted ? spikeState.position : window.camera.position;
    const toTarget = new THREE.Vector3().subVectors(targetPos, bot.group.position);
    toTarget.y = 0; const distance = toTarget.length();

    if (distance > 5.0 && !isPracticeMode) {
      toTarget.normalize(); bot.group.position.addScaledVector(toTarget, 4.2 * dt);
      bot.group.lookAt(targetPos.x, bot.group.position.y, targetPos.z);
    }
    // Simulation line visibility tracking
    if (aiDebugMode) bot.debugLine.lookAt(window.camera.position);

    // Dynamic standard shooting interval profiles
    const shootThreshold = isPracticeMode ? 3000 : 1300;
    if (distance < 35.0 && (now - bot.lastShotTime > shootThreshold)) {
      bot.lastShotTime = now;
      sfx.playProcedural('bot_vandal', bot.group.position);
      if (Math.random() > (isPracticeMode ? 0.92 : 0.65)) {
        applyPlayerDamageFeedback();
      }
    }
  });
}

// ═══ OBJECTIVE RULES ENGINE ═══
function placeSpike() {
  if (spikeState.mesh) objectsGroup.remove(spikeState.mesh);
  const geo = new THREE.ConeGeometry(0.4, 1.2, 4);
  const mat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 });
  spikeState.mesh = new THREE.Mesh(geo, mat); spikeState.mesh.position.set(0, 0.6, 0);
  objectsGroup.add(spikeState.mesh);
  spikeState.planted = false; spikeState.progress = 0; spikeState.timer = 45;
}

function updateSpikeMatchRules(dt) {
  const currentBinds = window.binds || DEFAULT_BINDS;
  const pDist = window.camera.position.distanceTo(spikeState.mesh.position);
  const prompt = document.getElementById('interact-prompt');
  prompt.classList.remove('visible');

  if (roundOver) return;

  // Attacker plant rules logic
  if (playerRole === 'attacker' && !spikeState.planted) {
    const siteDist = window.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    if (siteDist < spikeState.plantZoneRadius) {
      document.getElementById('spike-carry').classList.add('visible');
      if (keysPressed[currentBinds.interact] || keysPressed['f']) {
        executeSpikeInteractionTick('plant', dt); return;
      }
    } else {
      document.getElementById('spike-carry').classList.remove('visible');
    }
  }
  // Defender defuse rules logic
  else if (playerRole === 'defender' && spikeState.planted && pDist < 3.5) {
    prompt.textContent = `HOLD [${formatKey(currentBinds.interact)}] TO DEFUSE SPIKE`;
    prompt.classList.add('visible');
    if (keysPressed[currentBinds.interact] || keysPressed['f']) {
      executeSpikeInteractionTick('defuse', dt); return;
    }
  }
  // Reset active UI overlays if action stopped
  document.getElementById('spike-bar-wrap').classList.remove('visible');
}

function executeSpikeInteractionTick(type, dt) {
  const wrap = document.getElementById('spike-bar-wrap');
  const fill = document.getElementById('spike-bar-fill');
  const label = document.getElementById('spike-bar-label');
  
  wrap.classList.add('visible');
  label.textContent = type === 'plant' ? "PLANTING SPIKE" : "DEFUSING SPIKE";
  
  spikeState.progress += dt;
  const targetDuration = type === 'plant' ? 4.0 : 7.0;
  fill.style.width = `${Math.min(100, (spikeState.progress / targetDuration) * 100)}%`;

  if (type === 'plant') sfx.playProcedural('spike_plant'); else sfx.playProcedural('spike_defuse');

  if (spikeState.progress >= targetDuration) {
    wrap.classList.remove('visible'); spikeState.progress = 0;
    if (type === 'plant') {
      spikeState.planted = true; spikeState.mesh.position.copy(window.camera.position).y = 0.6;
      spikeState.mesh.material.color.setHex(0xff3333);
      document.getElementById('spike-carry').classList.remove('visible');
      document.getElementById('spike-timer').classList.add('visible');
      displayKillfeedNotification("SYSTEM", "SPIKE HAS BEEN PLANTED");
      triggerSpikeCountdownLoop();
    } else {
      spikeState.defused = true; finalizeRoundMatchState(true, "Spike defused. Squad victorious.");
    }
  }
}

function triggerSpikeCountdownLoop() {
  if (!spikeState.planted || roundOver) return;
  sfx.playProcedural('spike_beep', spikeState.mesh.position);
  document.getElementById('spike-timer-val').textContent = spikeState.timer;

  if (spikeState.timer <= 0) {
    finalizeRoundMatchState(playerRole === 'attacker', playerRole === 'attacker' ? "Spike detonated." : "Spike detonated.");
    return;
  }
  spikeState.timer--;
  const speedFactor = spikeState.timer > 20 ? 1000 : (spikeState.timer > 10 ? 500 : 250);
  setTimeout(triggerSpikeCountdownLoop, speedFactor);
}

// ═══ ABILITY COOLDOWNS PIPELINE ═══
function castSmokeGrenadeAbility() {
  const now = performance.now();
  if (now - gameState.abilities.smoke.lastCast < gameState.abilities.smoke.duration + 8000) return;
  gameState.abilities.smoke.lastCast = now; sfx.playProcedural('smoke');

  const sGeo = new THREE.SphereGeometry(6, 16, 16);
  const sMat = new THREE.MeshStandardMaterial({ color: 0x4477aa, transparent: true, opacity: 0.85, depthWrite: false });
  const mesh = new THREE.Mesh(sGeo, sMat); mesh.position.copy(window.camera.position);
  objectsGroup.add(mesh); smokeSpheres.push({ mesh: mesh, spawnTime: now });

  const icon = document.getElementById('ab-smoke'); icon.classList.add('cooldown');
  setTimeout(() => icon.classList.remove('cooldown'), 12000);
  setTimeout(() => { objectsGroup.remove(mesh); }, gameState.abilities.smoke.duration);
}

function triggerDashAbility() {
  const now = performance.now();
  if (now - gameState.abilities.dash.lastCast < 7000) return;
  gameState.abilities.dash.lastCast = now; sfx.playProcedural('dash');

  player.speedBoost = 0.35;
  const fDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw).normalize();
  player.velocity.addScaledVector(fDir, 45);

  const icon = document.getElementById('ab-dash'); icon.classList.add('cooldown');
  setTimeout(() => icon.classList.remove('cooldown'), 7000);
}

// ═══ PARTICLE EFFECTS CORE ENGINE ═══
function spawnImpactParticles(pos, colorHex) {
  const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const mat = new THREE.MeshBasicMaterial({ color: colorHex });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(geo, mat); m.position.copy(pos);
    objectsGroup.add(m);
    particles.push({
      mesh: m, life: 0.4,
      v: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 5, (Math.random() - 0.5) * 4)
    });
  }
}

function updateActiveParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt;
    p.mesh.position.addScaledVector(p.v, dt); p.v.y -= 9.8 * dt; // Gravity fallout
    if (p.life <= 0) { objectsGroup.remove(p.mesh); particles.splice(i, 1); }
  }
}

// ═══ UI OVERLAYS FEEDBACK PIPELINE ═══
function applyPlayerDamageFeedback() {
  if (roundOver) return;
  gameState.hp -= Math.floor(Math.random() * 12) + 9; if (gameState.hp < 0) gameState.hp = 0;
  document.getElementById('hp-display').textContent = gameState.hp;

  const overlays = ['dmg-top', 'dmg-bottom', 'dmg-left', 'dmg-right'];
  const targetId = overlays[Math.floor(Math.random() * overlays.length)];
  const flash = document.getElementById(targetId);
  flash.classList.add('flash'); setTimeout(() => flash.classList.remove('flash'), 200);

  const screenOverlay = document.getElementById('suppression-overlay');
  screenOverlay.classList.add('active'); setTimeout(() => screenOverlay.classList.remove('active'), 120);

  if (gameState.hp <= 0) finalizeRoundMatchState(false, "Your squad was eliminated.");
}

function triggerCombatHitmarkers(isHeadshot) {
  const hm = document.getElementById('hitmarker'); hm.className = isHeadshot ? 'show headshot' : 'show';
  clearTimeout(window.hmTimeout);
  window.hmTimeout = setTimeout(() => hm.className = '', 180);
}

function createFloatingDamageNumbers(val, pos, isHead) {
  const div = document.createElement('div'); div.className = 'dmg-num';
  div.textContent = val; div.style.color = isHead ? '#ffdd00' : '#ffffff'; div.style.fontSize = isHead ? '1.5rem' : '1.1rem';
  
  // Project vectors back into standard browser layout matrices
  const proj = pos.clone().project(window.camera);
  div.style.left = `${(proj.x * .5 + .5) * window.innerWidth}px`;
  div.style.top  = `${(-proj.y * .5 + .5) * window.innerHeight}px`;
  document.body.appendChild(div); setTimeout(() => div.remove(), 800);
}

function displayKillfeedNotification(attacker, deadTarget) {
  const feed = document.getElementById('killfeed');
  const msg = document.createElement('div'); msg.className = 'kill-msg';
  msg.textContent = `${attacker.toUpperCase()} ➔ ${deadTarget.toUpperCase()}`;
  feed.appendChild(msg); setTimeout(() => msg.remove(), 2500);
}

function switchWeapon(wepKey) {
  if (gameState.isReloading || roundOver) return;
  gameState.currentWeapon = wepKey;
  const config = WEAPONS[wepKey];
  gameState.ammo = config.ammo; gameState.reserve = config.reserve;
  stopADS(); updateHUD();

  document.querySelectorAll('.weapon-slot').forEach(s => s.classList.remove('active'));
  const activeSlot = document.getElementById(`slot-${config.slot}`);
  if (activeSlot) activeSlot.classList.add('active');
}

function startReload() {
  const config = WEAPONS[gameState.currentWeapon];
  if (gameState.isReloading || gameState.ammo === config.ammo || config.isKnife || gameState.reserve <= 0) return;
  gameState.isReloading = true; sfx.playProcedural('reload');

  const wrap = document.getElementById('reload-bar-wrap');
  const fill = document.getElementById('reload-bar-fill');
  wrap.classList.add('visible'); fill.style.width = '0%';
  setTimeout(() => fill.style.width = '100%', 20);

  setTimeout(() => {
    gameState.isReloading = false; wrap.classList.remove('visible');
    const transfer = Math.min(config.ammo - gameState.ammo, gameState.reserve);
    gameState.ammo += transfer; gameState.reserve -= transfer; updateHUD();
  }, config.reloadTime);
}

function updateHUD() {
  document.getElementById('hp-display').textContent = gameState.hp;
  document.getElementById('ammo-display').textContent = gameState.ammo;
  document.getElementById('reserve-display').textContent = gameState.reserve;
}

function checkMatchVictoryConditions() {
  const allDead = enemies.every(e => e.isDead);
  if (allDead) {
    finalizeRoundMatchState(true, "All enemy threats dropped.");
  }
}

function finalizeRoundMatchState(isWin, message) {
  roundOver = true; window.isGameActive = false; document.exitPointerLock();
  const screen = document.getElementById('round-result');
  screen.className = isWin ? 'overlay-screen win' : 'overlay-screen lose';
  document.getElementById('result-title').textContent = isWin ? "ROUND WON" : "ROUND LOST";
  document.getElementById('result-sub').textContent = message;
  screen.style.display = 'flex';
}

function initMatch(role) {
  sfx.init(); playerRole = role; roundOver = false; gameState.hp = 100;
  switchWeapon('vandal');
  document.getElementById('role-badge').textContent = role.toUpperCase();
  document.getElementById('role-badge').className = role;
  document.getElementById('spike-carry').classList.toggle('visible', role === 'attacker');
  document.getElementById('spike-timer').classList.remove('visible');

  window.camera.position.copy(role === 'attacker' ? ATK_SPAWN : DEF_SPAWN);
  window.camera.rotation.set(0, role === 'attacker' ? 0 : Math.PI, 0);
  
  player.yaw = window.camera.rotation.y; player.pitch = window.camera.rotation.x;
  player.velocity.set(0, 0, 0); player.isGrounded = true; stopADS();

  enemies.forEach(e => { if (e.group) objectsGroup.remove(e.group); }); enemies.length = 0;
  for (let i = 0; i < 4; i++) spawnBot(role === 'attacker');

  placeSpike(); updateHUD(); document.body.requestPointerLock();
}