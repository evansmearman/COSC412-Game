// main.js
const socket = io();

// Create Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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

// Movement and view control variables
const playerSpeed = 0.1;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let yaw = 0, pitch = 0; // For camera rotation

// Store projectiles (spheres)
let projectiles = [];

// Mouse movement handling for looking around
document.addEventListener('mousemove', (event) => {
  const sensitivity = 0.002;
  yaw -= event.movementX * sensitivity;
  pitch -= event.movementY * sensitivity;
  
  pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // Limit pitch
  playerMesh.rotation.set(0, yaw, 0); // Rotate player cube for yaw
  camera.rotation.set(pitch, 0, 0); // Adjust camera pitch
});

// Handle key presses for movement
window.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
  }
});

window.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
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

  // Move projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    projectile.mesh.position.add(projectile.velocity);

    // Remove projectile if it goes too far
    if (projectile.mesh.position.length() > 10) {
      scene.remove(projectile.mesh);
      projectiles.splice(i, 1);
    }
  }

  // Send movement data to the server
  socket.emit('move', { position: playerMesh.position });

  renderer.render(scene, camera);
}
animate();

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

// Add a new player to the scene
function addNewPlayer(id, position) {
  const otherPlayerMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  otherPlayerMesh.position.set(position.x, position.y, position.z);
  scene.add(otherPlayerMesh);
  otherPlayers[id] = otherPlayerMesh;
}