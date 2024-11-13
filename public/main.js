const socket = io();

// Create Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(140, 255, 115);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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
camera.position.set(0, 1.6, 0); // Set camera height to player's head level
playerMesh.add(camera); // Attach the camera to the player's cube

// Add ground map (plane)
const groundGeometry = new THREE.PlaneGeometry(100, 100); // 100x100 units plane
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22, side: THREE.DoubleSide }); // Green ground
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
scene.add(ground);

// Add some obstacles to the map (example: boxes)
const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2); // Box size 2x2x2
const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown obstacles

// Add some obstacles at various positions
const obstacles = [];
for (let i = 0; i < 5; i++) {
  const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle.position.set(
    (Math.random() - 0.5) * 80, // Random x position
    1,                           // Height to rest on the ground
    (Math.random() - 0.5) * 80   // Random z position
  );
  scene.add(obstacle);
  obstacles.push(obstacle);
}

// Movement and view control variables
const playerSpeed = 0.1;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let yaw = 0, pitch = 0; // For camera rotation
let isJumping = false;
let verticalSpeed = 0;  // For handling jump and gravity
const gravity = -0.02;  // Gravity strength
const jumpHeight = 0.5; // How high the player can jump
const groundLevel = 1;  // The height at which the player stands

// Flying and movement control variables
let isFlying = false;
let flyUp = false, flyDown = false;
const flyingSpeed = 0.1; // Speed of flying

// Store projectiles (spheres)
let projectiles = [];

// Mouse movement handling for looking around
let mouseLocked = false;

document.addEventListener('mousemove', (event) => {
  if (mouseLocked) {
    const sensitivity = 0.002;
    yaw -= event.movementX * sensitivity;
    pitch -= event.movementY * sensitivity;

    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // Limit pitch
    playerMesh.rotation.set(0, yaw, 0); // Rotate player cube for yaw
    camera.rotation.set(pitch, 0, 0); // Adjust camera pitch
  }
});

// Lock the mouse pointer when the player clicks the screen
document.addEventListener('click', () => {
  if (!mouseLocked) {
    document.body.requestPointerLock();
    mouseLocked = true;
  }
});

// Handle key presses for movement
window.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    case 'Space':
      if (!isJumping) {
        verticalSpeed = jumpHeight; // Apply upward velocity
        isJumping = true;
      }
      break;
    case 'ShiftLeft':
      flyUp = true; // Start flying upwards
      break;
    case 'ControlLeft':
      flyDown = true; // Start flying downwards
      break;
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
    case 'ShiftLeft': 
      flyUp = false; // Stop flying upwards
      break;
    case 'ControlLeft': 
      flyDown = false; // Stop flying downwards
      break;
  }
});

// Handle left mouse click to shoot a sphere
window.addEventListener('mousedown', (event) => {
  if (event.button === 0) { // Left click
    shootSphere();
  }
});

// Shoot a sphere in the direction the player is facing
function shootSphere() {
  const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

  // Set the sphere's initial position at the player's camera
  sphere.position.copy(playerMesh.position);
  sphere.position.y += 1.6; // Adjust to camera height
  
  // Set velocity in the direction the camera is facing
  const velocity = new THREE.Vector3(0, 0, -1);
  velocity.applyQuaternion(camera.quaternion); // Move in the camera's direction
  velocity.multiplyScalar(0.5); // Adjust the speed of the projectile

  scene.add(sphere);
  projectiles.push({ mesh: sphere, velocity });
}

// Animate and move player and projectiles
function animate() {
  requestAnimationFrame(animate);
  
  let direction = new THREE.Vector3();
  if (moveForward) direction.z -= playerSpeed;
  if (moveBackward) direction.z += playerSpeed;
  if (moveLeft) direction.x -= playerSpeed;
  if (moveRight) direction.x += playerSpeed;

  // Convert movement relative to player's direction
  direction.applyQuaternion(playerMesh.quaternion);
  playerMesh.position.add(direction);

  // Insect flying logic
  if (isFlying) {
    if (flyUp) {
      playerMesh.position.y += flyingSpeed; // Fly upwards
    }
    if (flyDown) {
      playerMesh.position.y -= flyingSpeed; // Fly downwards
    }
  } else {
    // Apply gravity and jump if Human
    if (isJumping) {
      verticalSpeed += gravity;  // Apply gravity
      playerMesh.position.y += verticalSpeed;  // Update player height

      if (playerMesh.position.y <= groundLevel) {  // Stop falling at ground level
        playerMesh.position.y = groundLevel;
        isJumping = false;
        verticalSpeed = 0;  // Reset vertical speed after landing
      }
    }

    // Ensure the player stays above the ground (no gravity in this simple example)
    playerMesh.position.y = Math.max(playerMesh.position.y, groundLevel); // Keep player at ground level
  }

  // Move projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    projectile.mesh.position.add(projectile.velocity);

    // Remove projectile if it goes too far
    if (projectile.mesh.position.length() > 50) {
      scene.remove(projectile.mesh);
      projectiles.splice(i, 1);
    }
  }

  // Emit movement data
  socket.emit('move', { position: playerMesh.position, isFlying });

  renderer.render(scene, camera);
}

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
