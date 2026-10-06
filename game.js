console.log('Initialisation du jeu...');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 30, 60);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
document.body.appendChild(renderer.domElement);

console.log('Renderer créé:', renderer.domElement);

// Lumières
const ambient = new THREE.HemisphereLight(0xffffff, 0x404040, 1.2);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(10, 15, 8);
dirLight.castShadow = true;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -5;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// Sol
const groundGeom = new THREE.PlaneGeometry(20, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.6 });
const ground = new THREE.Mesh(groundGeom, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
ground.receiveShadow = true;
scene.add(ground);

// Joueur
const playerGeom = new THREE.BoxGeometry(1.0, 1.5, 1.0);
const playerMat = new THREE.MeshStandardMaterial({ color: 0xff5d5d, roughness: 0.5 });
const player = new THREE.Mesh(playerGeom, playerMat);
player.position.set(0, 1.0, 5);
player.castShadow = true;
player.receiveShadow = true;
scene.add(player);

// Variables de jeu
const obstacles = [];
let score = 0;
let isGameOver = false;
let targetX = 0;
let playerX = 0;
let jumpVelocity = 0;
let isJumping = false;
let gameSpeed = 1.0;

const scoreEl = document.getElementById('score');
const gameOverPanel = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart');

function addObstacle() {
  const obstacleGeom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.7 });
  const obstacle = new THREE.Mesh(obstacleGeom, obstacleMat);
  
  const lane = [−8, -4, 0, 4, 8][Math.floor(Math.random() * 5)];
  obstacle.position.set(lane, 0.75, -35);
  obstacle.castShadow = true;
  obstacle.receiveShadow = true;
  
  scene.add(obstacle);
  obstacles.push({ mesh: obstacle, collected: false });
}

let spawnTimer = 0;
let lastTime = Date.now();

function resetGame() {
  isGameOver = false;
  score = 0;
  targetX = 0;
  playerX = 0;
  player.position.set(0, 1.0, 5);
  jumpVelocity = 0;
  isJumping = false;
  gameSpeed = 1.0;
  scoreEl.textContent = 'Score: 0';
  gameOverPanel.classList.add('hidden');
  
  for (const obs of obstacles) {
    scene.remove(obs.mesh);
  }
  obstacles.length = 0;
  
  spawnTimer = 0;
  lastTime = Date.now();
}

function jump() {
  if (isJumping || isGameOver) return;
  isJumping = true;
  jumpVelocity = 9;
}

function moveLeft() {
  if (isGameOver) return;
  targetX = Math.max(targetX - 4.5, -8);
}

function moveRight() {
  if (isGameOver) return;
  targetX = Math.min(targetX + 4.5, 8);
}

function moveCenter() {
  if (isGameOver) return;
  targetX = 0;
}

// Contrôles clavier
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') moveLeft();
  if (event.key === 'ArrowRight') moveRight();
  if (event.key === 'ArrowUp' || event.key === ' ') jump();
  if (event.key === 'ArrowDown') moveCenter();
});

// Boutons tactiles
const touchButtons = document.querySelectorAll('.control-btn');
touchButtons.forEach((btn) => {
  btn.addEventListener('pointerdown', () => {
    const action = btn.dataset.action;
    if (action === 'left') moveLeft();
    if (action === 'right') moveRight();
    if (action === 'jump') jump();
  });
});

// Gestes tactiles
let pointerStart = null;
window.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  pointerStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (!pointerStart || isGameOver) return;
  
  const touch = e.changedTouches[0];
  const dx = touch.clientX - pointerStart.x;
  const dy = touch.clientY - pointerStart.y;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 40) moveRight();
    else if (dx < -40) moveLeft();
  } else {
    if (dy < -40) jump();
  }
  
  pointerStart = null;
}, { passive: true });

restartBtn.addEventListener('click', () => {
  resetGame();
});

// Gestion des collisions
function checkCollisions() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    
    // Détection de collision
    const dx = Math.abs(obs.mesh.position.x - player.position.x);
    const dz = Math.abs(obs.mesh.position.z - player.position.z);
    const dy = Math.abs(obs.mesh.position.y - player.position.y);
    
    if (dx < 1.2 && dz < 1.5 && dy < 1.7) {
      isGameOver = true;
      finalScoreEl.textContent = 'Score: ' + score;
      gameOverPanel.classList.remove('hidden');
    }
  }
}

// Boucle de rendu
function animate() {
  requestAnimationFrame(animate);
  
  const now = Date.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  
  if (!isGameOver) {
    // Mouvement du joueur
    playerX += (targetX - playerX) * 0.15;
    player.position.x = playerX;
    
    // Saut
    if (isJumping) {
      jumpVelocity -= 20 * dt;
      player.position.y += jumpVelocity * dt;
      if (player.position.y <= 1.0) {
        player.position.y = 1.0;
        jumpVelocity = 0;
        isJumping = false;
      }
    }
    
    // Apparition d'obstacles
    spawnTimer += dt;
    if (spawnTimer > 0.8) {
      addObstacle();
      spawnTimer = 0;
    }
    
    // Mise à jour des obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.mesh.position.z += 14 * gameSpeed * dt;
      obs.mesh.rotation.x += 0.02;
      obs.mesh.rotation.y += 0.02;
      
      // Suppression
      if (obs.mesh.position.z > 10) {
        scene.remove(obs.mesh);
        obstacles.splice(i, 1);
        if (!obs.collected) {
          score += 1;
          gameSpeed = 1.0 + score * 0.02;
          scoreEl.textContent = 'Score: ' + score;
        }
      }
    }
    
    checkCollisions();
    
    // Caméra suit le joueur
    camera.position.x += (playerX * 0.5 - camera.position.x) * 0.1;
  }
  
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

resetGame();
const animId = animate();
console.log('Jeu lancé !');