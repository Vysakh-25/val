let lastTime = performance.now();
let isGameActive = false;
let isMenuPaused = false;

let scene, camera, renderer;
let activeListeningRow = null;
let tempBinds = {};

window.isGameActive = isGameActive;
window.isMenuPaused = isMenuPaused;

function initGameMasterEngine() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c10);
  scene.fog = new THREE.FogExp2(0x0a0c10, 0.012);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  window.camera = camera;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const oldCanvas = document.querySelector('canvas:not(#scope-canvas)');
  if (oldCanvas) oldCanvas.remove();
  document.body.insertBefore(renderer.domElement, document.getElementById('ui-layer'));

  const ambient = new THREE.AmbientLight(0xffffff, 0.25); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 0.85); sun.position.set(30, 50, 20);
  sun.castShadow = true; sun.shadow.mapSize.width = 2048; sun.shadow.mapSize.height = 2048;
  scene.add(sun);

  window.scene = scene;
  window.renderer = renderer;

  // Configuration Fallbacks for Keyboard Layouts
  window.binds = window.binds || {
    forward: 'w', backward: 's', left: 'a', right: 'd',
    jump: ' ', walk: 'shift', interact: 'f', reload: 'r',
    smoke: 'e', dash: 'q',
    weapon1: '1', weapon2: '2', weapon3: '3', weapon4: '4'
  };

  window.addEventListener('resize', onResizeMatrixCorrection);
  requestAnimationFrame(masterRenderLoopTick);
}

function masterRenderLoopTick(now) {
  requestAnimationFrame(masterRenderLoopTick);
  let dt = (now - lastTime) / 1000; lastTime = now;
  if (dt > 0.1) dt = 0.1;

  if (window.isGameActive && !window.isMenuPaused) {
    if (typeof updatePlayerMovementPhysics === 'function') updatePlayerMovementPhysics(dt);
    if (typeof updateActiveBotsBehavior === 'function') updateActiveBotsBehavior(dt);
  }
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function onResizeMatrixCorrection() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function bootMatchSession(allocatedRole) {
  document.getElementById('start-screen').style.display = 'none';
  window.isGameActive = true; window.isMenuPaused = false;
  if (typeof initMatch === 'function') initMatch(allocatedRole); 
  lastTime = performance.now();
}

function togglePauseMenuState() {
  if (!window.isGameActive || window.roundOver) return;
  if (window.isMenuPaused) {
    document.body.requestPointerLock(); triggerPauseDisplay(false);
  } else {
    document.exitPointerLock(); triggerPauseDisplay(true);
  }
}

function triggerPauseDisplay(shouldPause) {
  window.isMenuPaused = shouldPause;
  document.getElementById('pause-menu').style.display = shouldPause ? 'flex' : 'none';
}

// Global Level Event Listeners Initialization
document.getElementById('start-btn').addEventListener('click', () => { initGameMasterEngine(); bootMatchSession('attacker'); });
document.getElementById('start-btn-def').addEventListener('click', () => { initGameMasterEngine(); bootMatchSession('defender'); });
document.getElementById('btn-resume').addEventListener('click', () => togglePauseMenuState());
document.getElementById('result-restart').addEventListener('click', () => {
  document.getElementById('round-result').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') togglePauseMenuState();
});