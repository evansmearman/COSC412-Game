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

// Obstacle setup with physics for Cannon.js
const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2);
const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
const obstacles = [];
const obstacleBodies = []; // Store the obstacle bodies for physics
const obstacleHealth = [];
const healthBars = [];

for (let i = 0; i < 5; i++) {
  // Create the visual obstacle mesh in Three.js
  const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle.position.set((Math.random() - 0.5) * 80, 1, (Math.random() - 0.5) * 80);
  scene.add(obstacle);
  obstacles.push(obstacle);

  // Create the physics body for each obstacle in Cannon.js
  const obstacleShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1)); // Size matches Three.js obstacle
  const obstacleBody = new CANNON.Body({
    mass: 0, // Static obstacle
    position: new CANNON.Vec3(obstacle.position.x, obstacle.position.y, obstacle.position.z),
  });
  obstacleBody.addShape(obstacleShape);
  world.addBody(obstacleBody);
  obstacleBodies.push(obstacleBody);

  // Set initial health for each obstacle
  obstacleHealth[i] = 100; // Example health value

  // Create health bar for the obstacle
  const healthBarGeometry = new THREE.PlaneGeometry(1.5, 0.2); // Adjust size as needed
  const healthBarMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
  healthBar.position.set(obstacle.position.x, obstacle.position.y + 1.5, obstacle.position.z);
  healthBar.lookAt(camera.position); // Make it face the camera
  scene.add(healthBar);
  healthBars.push(healthBar);
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

function shootSphere() {
  const sphereRadius = 0.1;
  const sphereMass = 0.001;

  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 8, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);

  // Set the initial position of the sphere slightly in front of the player
  const startPosition = new THREE.Vector3();
  camera.getWorldPosition(startPosition);
  sphereMesh.position.copy(startPosition);

  // Cannon.js body for the sphere
  const sphereShape = new CANNON.Sphere(sphereRadius);
  const sphereBody = new CANNON.Body({ mass: sphereMass });
  sphereBody.addShape(sphereShape);
  sphereBody.position.set(
    sphereMesh.position.x,
    sphereMesh.position.y,
    sphereMesh.position.z
  );

  // Calculate the direction vector from the camera's orientation
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion).normalize();
  sphereBody.velocity.set(direction.x * 10, direction.y * 10, direction.z * 10);

  // Collision detection on projectile
  sphereBody.addEventListener('collide', (event) => {
    const collidedBody = event.body;

    if (obstacleBodies.includes(collidedBody)) {
      const obstacleIndex = obstacleBodies.indexOf(collidedBody);
      if (obstacleIndex > -1) {
        // Deduct health on hit
        obstacleHealth[obstacleIndex] -= 20; // Adjust damage value as needed

        // Update health bar size and color
        const healthPercentage = Math.max(0, obstacleHealth[obstacleIndex] / 100);
        healthBars[obstacleIndex].scale.set(healthPercentage, 1, 1);
        healthBars[obstacleIndex].material.color.setHex(
          healthPercentage > 0.5 ? 0x00ff00 : (healthPercentage > 0.25 ? 0xffff00 : 0xff0000)
        );

        if (obstacleHealth[obstacleIndex] <= 0) {
          // Remove obstacle when health is depleted
          scene.remove(obstacles[obstacleIndex]);
          scene.remove(healthBars[obstacleIndex]);
          world.removeBody(obstacleBodies[obstacleIndex]);
          obstacles.splice(obstacleIndex, 1);
          obstacleBodies.splice(obstacleIndex, 1);
          obstacleHealth.splice(obstacleIndex, 1);
          healthBars.splice(obstacleIndex, 1);

          // Optional: Create particle effect at the collision point
          createParticleEffect(sphereMesh.position);
        }

        // Remove the projectile
        scene.remove(sphereMesh);
        world.removeBody(sphereBody);
        projectiles = projectiles.filter(p => p.body !== sphereBody);
      }
    }
  });

  scene.add(sphereMesh);
  world.addBody(sphereBody);
  projectiles.push({ mesh: sphereMesh, body: sphereBody });
  socket.emit('shoot', { position: sphereMesh.position, velocity: sphereBody.velocity });
}

// Function to create a particle effect at a collision position
function createParticleEffect(position) {
  const particleCount = 30;
  const particles = new THREE.Group();

  for (let i = 0; i < particleCount; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    particle.position.copy(position);
    particle.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );

    particles.add(particle);
  }

  scene.add(particles);

  setTimeout(() => {
    scene.remove(particles);
  }, 500);

  const animateParticles = () => {
    particles.children.forEach((particle) => {
      particle.position.add(particle.velocity);
      particle.material.opacity -= 0.02;
    });

    if (particles.children.some(p => p.material.opacity > 0)) {
      requestAnimationFrame(animateParticles);
    } else {
      scene.remove(particles);
    }
  };
  animateParticles();
}

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

const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x555555, 0.5);
scene.add(hemisphereLight);

const sunlight = new THREE.DirectionalLight(0xffffff, 1.5);
sunlight.position.set(10, 50, 10);
sunlight.castShadow = true;
scene.add(sunlight);

const spotlight = new THREE.SpotLight(0xffffff, 1);
spotlight.position.set(0, 15, 0);
spotlight.castShadow = true;
scene.add(spotlight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function animate() {
  requestAnimationFrame(animate);
  world.step(1 / 60);

  updateProjectiles();

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

socket.on('shoot', (data) => {
  const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

  sphere.position.copy(data.position);
  scene.add(sphere);
  projectiles.push({ mesh: sphere, velocity: new THREE.Vector3(data.velocity.x, data.velocity.y, data.velocity.z) });
});

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

socket.on('lobbyFull', () => {
  console.log('Lobby is full! Starting the game...');
  loadingMessage.innerText = 'Game starting...';
  setTimeout(() => {
    loadingMessage.style.display = 'none';
    animate();
  }, 1000);
});

socket.on('assignRole', (role) => {
  isFlying = role === 'Insect';
  console.log(`Player assigned role: ${role}`);
});

function addNewPlayer(id, position) {
  const otherPlayerMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  otherPlayerMesh.position.set(position.x, position.y, position.z);
  scene.add(otherPlayerMesh);
  otherPlayers[id] = otherPlayerMesh;
}
