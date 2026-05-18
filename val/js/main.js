// ═══ MASTER TIMERS AND CONTEXT BOOTSTRAPS ═══
let lastTime = performance.now();
let isGameActive = false;
let isMenuPaused = false;

// Global Scope Mounting Handles
let scene, camera, renderer;

function initGameMasterEngine() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c10);
  scene.fog = new THREE.FogExp2(0x0a0c10, 0.012);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  window.camera = camera; // Expose globally to share with physics and tracking vectors

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const mountedCanvas = document.querySelector('canvas:not(#scope-canvas)');
  if (mountedCanvas) mountedCanvas.remove();
  document.body.insertBefore(renderer.domElement, document.getElementById('ui-layer'));

  // Lights setup
  const ambient = new THREE.AmbientLight(0xffffff, 0.25); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 0.85); sun.position.set(30, 50, 20);
  sun.castShadow = true; sun.shadow.mapSize.width = 2048; sun.shadow.mapSize.height = 2048;
  scene.add(sun); scene.add(objectsGroup);

  // Initialize UI components
  buildStartControls();
  
  // Attach DOM Interaction Callback Targets
  document.getElementById('start-btn').addEventListener('click', () => bootMatchSession('attacker'));
  document.getElementById('start-btn-def').addEventListener('click', () => bootMatchSession('defender'));
  document.getElementById('result-restart').addEventListener('click', () => {
    document.getElementById('round-result').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
  });

  // Pause menu attachments
  document.getElementById('btn-resume').addEventListener('click', togglePauseMenuState);
  document.getElementById('btn-settings').addEventListener('click', openKbMenu);
  document.getElementById('btn-practice').addEventListener('click', () => {
    isPracticeMode = !isPracticeMode;
    document.getElementById('btn-practice').textContent = `PRACTICE MODE: ${isPracticeMode ? 'ON' : 'OFF'}`;
    togglePauseMenuState();
  });
  document.getElementById('btn-leave').addEventListener('click', () => location.reload());

  // Debug configurations
  const dbg = document.getElementById('ai-debug-btn');
  dbg.addEventListener('click', () => {
    aiDebugMode = !aiDebugMode; dbg.className = aiDebugMode ? 'active' : '';
    dbg.textContent = `AI DEBUG: ${aiDebugMode ? 'ON' : 'OFF'}`;
  });

  // Watch for ESC pause calls
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== document.body && isGameActive && !roundOver) {
      triggerPauseDisplay(true);
    }
  });

  window.addEventListener('resize', onResizeMatrixCorrection, false);
  requestAnimationFrame(masterRenderLoopTick);
}

function masterRenderLoopTick(now) {
  requestAnimationFrame(masterRenderLoopTick);
  let dt = (now - lastTime) / 1000; lastTime = now;
  if (dt > 0.1) dt = 0.1;

  if (isGameActive && !isMenuPaused) {
    updatePlayerMovementPhysics(dt);
    updateActiveBotsBehavior(dt);
  }
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function onResizeMatrixCorrection() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
}

function bootMatchSession(allocatedRole) {
  document.getElementById('start-screen').style.display = 'none';
  isGameActive = true; isMenuPaused = false; window.isGameActive = true;
  initMatch(allocatedRole); lastTime = performance.now();
}

function togglePauseMenuState() {
  if (!isGameActive || roundOver) return;
  if (isMenuPaused) {
    document.body.requestPointerLock(); triggerPauseDisplay(false);
  } else {
    document.exitPointerLock(); triggerPauseDisplay(true);
  }
}

function triggerPauseDisplay(shouldPause) {
  isMenuPaused = shouldPause;
  document.getElementById('pause-menu').style.display = shouldPause ? 'flex' : 'none';
  if (!shouldPause) lastTime = performance.now();
}

function updateAbilityHud() {}
function updateWeaponSlotKeys() {}

// Entry bootstrap launcher
window.addEventListener('DOMContentLoaded', initGameMasterEngine);