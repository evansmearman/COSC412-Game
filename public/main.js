const socket = io();

// Create Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(140, 255, 115);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cannon.js world setup
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Apply gravity

// Ground physics body for Cannon.js
const groundBody = new CANNON.Body({ mass: 0 }); // Static ground
const groundShape = new CANNON.Plane();
groundBody.addShape(groundShape);
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);

// Create a loading message
const loadingMessage = document.createElement('div');
loadingMessage.style.position = 'absolute';
loadingMessage.style.top = '50%';
loadingMessage.style.left = '50%';
loadingMessage.style.transform = 'translate(-50%, -50%)';
loadingMessage.style.color = 'white';
loadingMessage.style.fontSize = '24px';
loadingMessage.innerText = 'Waiting for other players...';
document.body.appendChild(loadingMessage);

// Geometry and materials for player
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const playerMesh = new THREE.Mesh(geometry, material);
scene.add(playerMesh);

// Store other players
let otherPlayers = {};

// Set camera position and first-person view
camera.position.set(0, 1.6, 0);
playerMesh.add(camera);

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Obstacles (no physics for simplicity)
const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2);
const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
const obstacles = [];
for (let i = 0; i < 5; i++) {
  const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle.position.set((Math.random() - 0.5) * 80, 1, (Math.random() - 0.5) * 80);
  scene.add(obstacle);
  obstacles.push(obstacle);
}

// Movement, control, and role variables
const playerSpeed = 0.1;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let yaw = 0, pitch = 0;
let isJumping = false;
let verticalSpeed = 0;
const gravity = -0.02;
const jumpHeight = 0.5;
const groundLevel = 1;
let isFlying = false;
let flyUp = false, flyDown = false;
const flyingSpeed = 0.1;

// Store projectiles
let projectiles = [];

// Mouse movement for looking around
let mouseLocked = false;
document.addEventListener('mousemove', (event) => {
  if (mouseLocked) {
    const sensitivity = 0.002;
    yaw -= event.movementX * sensitivity;
    pitch -= event.movementY * sensitivity;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    playerMesh.rotation.set(0, yaw, 0);
    camera.rotation.set(pitch, 0, 0);
  }
});

document.addEventListener('click', () => {
  if (!mouseLocked) {
    document.body.requestPointerLock();
    mouseLocked = true;
  }
});

window.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    case 'Space':
      if (!isJumping) {
        verticalSpeed = jumpHeight;
        isJumping = true;
      }
      break;
    case 'ShiftLeft': flyUp = true; break;
    case 'ControlLeft': flyDown = true; break;
    case 'Escape':
      if (mouseLocked) {
        document.exitPointerLock();
        mouseLocked = false;
        console.log("Game paused");
      }
      break;
  }
});

window.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
    case 'ShiftLeft': flyUp = false; break;
    case 'ControlLeft': flyDown = false; break;
  }
});

window.addEventListener('mousedown', (event) => {
  if (event.button === 0) shootSphere();
});

// Shoot a sphere with physics
function shootSphere() {
  const sphereRadius = 0.1;
  const sphereMass = 0.1;

  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 8, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);

  sphereMesh.position.copy(playerMesh.position);
  sphereMesh.position.y += 1.6;

  // Cannon.js body for the sphere
  const sphereShape = new CANNON.Sphere(sphereRadius);
  const sphereBody = new CANNON.Body({ mass: sphereMass });
  sphereBody.addShape(sphereShape);
  sphereBody.position.set(
    sphereMesh.position.x,
    sphereMesh.position.y,
    sphereMesh.position.z
  );

  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  sphereBody.velocity.set(direction.x * 10, direction.y * 10, direction.z * 10);

  scene.add(sphereMesh);
  world.addBody(sphereBody);
  projectiles.push({ mesh: sphereMesh, body: sphereBody });

  socket.emit('shoot', { position: sphereMesh.position, velocity: sphereBody.velocity });
}

// Update projectiles
function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    projectile.mesh.position.copy(projectile.body.position);
    projectile.mesh.quaternion.copy(projectile.body.quaternion);

    if (projectile.mesh.position.length() > 50) {
      scene.remove(projectile.mesh);
      world.removeBody(projectile.body);
      projectiles.splice(i, 1);
    }
  }
}

// Animate and update world
function animate() {
  requestAnimationFrame(animate);
  world.step(1 / 60);  // Update physics

  // Update projectiles
  updateProjectiles();

  // Existing player movement and game logic
  let direction = new THREE.Vector3();
  if (moveForward) direction.z -= playerSpeed;
  if (moveBackward) direction.z += playerSpeed;
  if (moveLeft) direction.x -= playerSpeed;
  if (moveRight) direction.x += playerSpeed;
  direction.applyQuaternion(playerMesh.quaternion);
  playerMesh.position.add(direction);

  if (isFlying) {
    if (flyUp) playerMesh.position.y += flyingSpeed;
    if (flyDown) playerMesh.position.y -= flyingSpeed;
  } else {
    if (isJumping) {
      verticalSpeed += gravity;
      playerMesh.position.y += verticalSpeed;
      if (playerMesh.position.y <= groundLevel) {
        playerMesh.position.y = groundLevel;
        isJumping = false;
        verticalSpeed = 0;
      }
    }
    playerMesh.position.y = Math.max(playerMesh.position.y, groundLevel);
  }

  socket.emit('move', { position: playerMesh.position, isFlying });
  renderer.render(scene, camera);
}

// Listen for networked shots
socket.on('shoot', (data) => {
  const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

  sphere.position.copy(data.position);
  scene.add(sphere);
  projectiles.push({ mesh: sphere, velocity: new THREE.Vector3(data.velocity.x, data.velocity.y, data.velocity.z) });
});


// Handle other players
socket.on('currentPlayers', (players) => {
  Object.keys(players).forEach((id) => {
    if (id !== socket.id) {
      const player = players[id];
      addNewPlayer(id, player.position);
    }
  });
});

socket.on('newPlayer', (data) => {
  addNewPlayer(data.id, data.player.position);
});

socket.on('playerMoved', (data) => {
  if (otherPlayers[data.id]) {
    otherPlayers[data.id].position.set(data.position.x, data.position.y, data.position.z);
  }
});

socket.on('playerDisconnected', (id) => {
  if (otherPlayers[id]) {
    scene.remove(otherPlayers[id]);
    delete otherPlayers[id];
  }
});

// Handle lobby events
socket.on('lobbyFull', () => {
  console.log('Lobby is full! Starting the game...');
  loadingMessage.innerText = 'Game starting...'; // Update loading message
  setTimeout(() => {
    loadingMessage.style.display = 'none'; // Hide the loading message
    animate(); // Start the animation loop
  }, 1000); // Optional delay before starting
});

// Assign roles to players
socket.on('assignRole', (role) => {
  isFlying = role === 'Insect';
  console.log(`Player assigned role: ${role}`);
});

const ambientLight = new THREE.AmbientLight(0x404040, 1.5); // Soft ambient light
scene.add(ambientLight);

const sunlight = new THREE.DirectionalLight(0xffffff, 1.2);
sunlight.position.set(10, 50, 10);
sunlight.castShadow = true;
sunlight.shadow.mapSize.width = 1024;
sunlight.shadow.mapSize.height = 1024;
sunlight.shadow.camera.near = 0.5;
sunlight.shadow.camera.far = 100;
scene.add(sunlight);

const spotlight = new THREE.SpotLight(0xffffff, 0.5);
spotlight.position.set(0, 10, 0);
spotlight.castShadow = true;
spotlight.angle = Math.PI / 4;
spotlight.penumbra = 0.2;
spotlight.decay = 2;
spotlight.distance = 50;
scene.add(spotlight);
// Enable shadows in the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Add a new player to the scene
function addNewPlayer(id, position) {
  const otherPlayerMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  otherPlayerMesh.position.set(position.x, position.y, position.z);
  scene.add(otherPlayerMesh);
  otherPlayers[id] = otherPlayerMesh;
}
