import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { io } from 'socket.io-client';
const socket = io();

// Create Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(140, 255, 115);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer( { antialias: true } );
			renderer.setPixelRatio( window.devicePixelRatio );
			renderer.setSize( window.innerWidth, window.innerHeight );
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.VSMShadowMap;
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
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
loadingMessage.style.color = 'black';
loadingMessage.style.fontSize = '24px';
loadingMessage.innerText = 'Waiting for other players...';
document.body.appendChild(loadingMessage);


// // Create chat container
// const chatContainer = document.createElement('div');
// chatContainer.style.position = 'absolute';
// chatContainer.style.bottom = '10px';
// chatContainer.style.left = '10px';
// chatContainer.style.width = '300px';
// chatContainer.style.height = '200px';
// chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
// chatContainer.style.border = '1px solid white';
// chatContainer.style.overflowY = 'scroll';
// chatContainer.style.padding = '10px';
// chatContainer.style.color = 'white';
// chatContainer.style.fontSize = '14px';
// chatContainer.style.display = 'flex';
// chatContainer.style.flexDirection = 'column';
// chatContainer.style.opacity = '0.3'; // Initially transparent
// chatContainer.style.transition = 'opacity 0.3s ease'; // Smooth transition for opacity
// document.body.appendChild(chatContainer);

// // Create chat input box
// const chatInput = document.createElement('input');
// chatInput.style.position = 'absolute';
// chatInput.style.bottom = '10px';
// chatInput.style.left = '10px';
// chatInput.style.width = '300px';
// chatInput.style.padding = '5px';
// chatInput.style.backgroundColor = 'white';
// chatInput.style.color = 'black';
// chatInput.style.border = '1px solid black';
// chatInput.style.opacity = '0.3'; // Initially transparent
// chatInput.style.transition = 'opacity 0.3s ease'; // Smooth transition for opacity
// chatInput.placeholder = 'Press Enter to chat...';
// document.body.appendChild(chatInput);


// Geometry and materials for player
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const playerMesh = new THREE.Mesh(geometry, material);
scene.background = new THREE.Color(0x87CEEB);
scene.add(playerMesh);


const loader = new GLTFLoader();
loader.load(
  'assets/untitled.glb', // Path to the GLB file
  (gltf) => {
    const glbScene = gltf.scene;
    glbScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(glbScene);
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  (error) => {
    console.error('An error happened while loading the .glb file:', error);
  }
);

// Load and replace the cube with the Fly model




// LIGHTS

const hemiLight = new THREE.HemisphereLight( 0x87CEEB, 0xffffff, 1 );
hemiLight.color.setHSL( 0.6, 1, 0.6 );
hemiLight.groundColor.setHSL( 0.0001, 1, 0.75 );
hemiLight.position.set( 0, 50, 0 );
scene.add( hemiLight );

const hemiLightHelper = new THREE.HemisphereLightHelper( hemiLight, 0 );
scene.add( hemiLightHelper );

//

const dirLight = new THREE.DirectionalLight( 0xffffff, 3 );
dirLight.color.setHSL( 0.1, 1, 0.95 );
dirLight.position.set( - 1, 1.75, 1 );
dirLight.position.multiplyScalar( 30 );
scene.add( dirLight );

dirLight.castShadow = true;

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;

const d = 500;

dirLight.shadow.camera.left = - d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = - d;

dirLight.shadow.camera.far = 3500;
dirLight.shadow.bias = - 0.0001;

const dirLightHelper = new THREE.DirectionalLightHelper( dirLight, 10 );
scene.add( dirLightHelper );


// Store other players
let otherPlayers = {};

const spawnHeight = 2; // Adjust as needed to set initial spawn height above ground
camera.position.set(0, spawnHeight, 0); // Place the camera at a height above ground
playerMesh.position.set(0, spawnHeight, 0); // Place the player mesh at the same height
playerMesh.castShadow = true; // Cast shadows
playerMesh.receiveShadow = true; // Receive shadows
playerMesh.add(camera); // Attach camera to player mesh


// Ground plane
// const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
// const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22, side: THREE.DoubleSide });

// const ground = new THREE.Mesh(groundGeometry, groundMaterial);
// ground.receiveShadow = true; // Receive shadows from lights

// ground.rotation.x = -Math.PI / 2;
// scene.add(ground);

// Define boundary dimensions
const boundary = { x: 124, y: 128.5, z: 138.6 };

// Function to restrict player within bounds
function keepPlayerWithinBounds() {
  const pos = playerMesh.position;
  
  // Define different boundaries for -x and +x
  const xMin = -150; // Boundary for -x
  const xMax = 175.9;  // Boundary for +x

  const zMin = -178.8
  const zMax = 179
  // Apply the boundaries
  pos.x = THREE.MathUtils.clamp(pos.x, xMin, xMax);
  pos.y = THREE.MathUtils.clamp(pos.y, 0, boundary.y);
  pos.z = THREE.MathUtils.clamp(pos.z, zMin, zMax);

}
function createVisibleBoundaries() {
  const boundarySize = boundary.x; // Match barrier size
  const boundaryHeight = boundary.y; // Match barrier height
  const boundaryZ = boundary.z

  // Material for the boundary lines
  const boundaryMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });

  // Create a box geometry for the boundary
  const boxGeometry = new THREE.BoxGeometry(boundarySize * 2, boundaryHeight * 2, boundaryZ * 2);
  const edges = new THREE.EdgesGeometry(boxGeometry);

  // Create line segments for the boundary
  const boundaryMesh = new THREE.LineSegments(edges, boundaryMaterial);
  boundaryMesh.position.set(0, boundaryHeight / 2, 0); // Center the boundary box
  scene.add(boundaryMesh);

  // Optional: Add semi-transparent walls for better visibility
  const wallMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
  });

  const walls = [
    { size: [boundarySize * 2, boundaryHeight * 2], position: [0, boundaryHeight / 2, -boundarySize] }, // Back
    { size: [boundarySize * 2, boundaryHeight * 2], position: [0, boundaryHeight / 2, boundarySize] }, // Front
    { size: [boundaryHeight * 2, boundaryHeight * 2], position: [-boundarySize, boundaryHeight / 2, 0], rotation: [0, Math.PI / 2, 0] }, // Left
    { size: [boundaryHeight * 2, boundaryHeight * 2], position: [boundarySize, boundaryHeight / 2, 0], rotation: [0, -Math.PI / 2, 0] }, // Right
  ];

  walls.forEach(({ size, position, rotation }) => {
    const [width, height] = size;
    const wallGeometry = new THREE.PlaneGeometry(width, height);
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

    wallMesh.position.set(...position);
    if (rotation) {
      wallMesh.rotation.set(...rotation);
    }

    scene.add(wallMesh);
  });
}

// Call the function to add visible boundaries
// createVisibleBoundaries();


// Obstacle setup with physics for Cannon.js
const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2);
const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
const obstacles = [];
const obstacleBodies = []; // Store the obstacle bodies for physics
const obstacleHealth = [];
const healthBars = [];

for (let i = 0; i < 0; i++) {
  // Create the visual obstacle mesh in Three.js
  const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle.position.set((Math.random() - 0.5) * 100, 1, (Math.random() - 0.5) * 100);
  obstacle.castShadow = true; // Cast shadows
  obstacle.receiveShadow = true; // Receive shadows
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
const playerSpeed = 1;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let yaw = 0, pitch = 0;
let isJumping = false;
let verticalSpeed = 0;
const gravity = -0.02;
const jumpHeight = 0.5;
const groundLevel = 1;
let isFlying = false;
let flyUp = false, flyDown = false;
const flyingSpeed = 1;

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
  const sphereRadius = 1.1;
  const sphereMass = 0.1;

  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 8, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);

  // Set the initial position of the sphere slightly in front of the player
  const startPosition = new THREE.Vector3();
  camera.getWorldPosition(startPosition);
  const forwardDirection = new THREE.Vector3();
  camera.getWorldDirection(forwardDirection);
  sphereMesh.position.copy(startPosition.add(forwardDirection.multiplyScalar(1.5)));
  console.log(playerMesh.position)
  // Cannon.js body for the sphere
  const sphereShape = new CANNON.Sphere(sphereRadius);
  const sphereBody = new CANNON.Body({ mass: sphereMass });
  sphereBody.addShape(sphereShape);
  sphereBody.position.set(
    sphereMesh.position.x,
    sphereMesh.position.y,
    sphereMesh.position.z
  );

  // Set the sphere's velocity in the direction the camera is facing
  const velocity = forwardDirection.multiplyScalar(150); // Adjust speed multiplier as needed
  sphereBody.velocity.set(velocity.x, velocity.y, velocity.z);

  // Set gravity to zero initially
  sphereBody.gravityScale = 0; // Custom property to control gravity activation later
  world.addBody(sphereBody);

// Initialize the Web Audio API context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Load the "bonk" sound effect
let vanishSoundBuffer;
fetch('assets/Bonk Sound Effect.mp3')
  .then(response => response.arrayBuffer())
  .then(data => audioContext.decodeAudioData(data))
  .then(buffer => vanishSoundBuffer = buffer)
  .catch(e => console.error('Error loading sound:', e));
  // Collision detection on projectile
  sphereBody.addEventListener('collide', (event) => {
    const collidedBody = event.body;

    if (obstacleBodies.includes(collidedBody) || collidedBody === groundBody) {
      // Activate gravity by setting the gravity scale to 1
      sphereBody.gravityScale = 1;

      // Reapply gravity to the body after collision
      sphereBody.force.set(0, -world.gravity.y * sphereBody.mass, 0);

      // Optional: Handle collision with obstacle to reduce its health
      if (obstacleBodies.includes(collidedBody)) {
        const obstacleIndex = obstacleBodies.indexOf(collidedBody);
        if (obstacleIndex > -1) {
          obstacleHealth[obstacleIndex] -= 20;

          const healthPercentage = Math.max(0, obstacleHealth[obstacleIndex] / 100);
          healthBars[obstacleIndex].scale.set(healthPercentage, 1, 1);
          healthBars[obstacleIndex].material.color.setHex(
            healthPercentage > 0.5 ? 0x00ff00 : (healthPercentage > 0.25 ? 0xffff00 : 0xff0000)
          );
          if (obstacleHealth[obstacleIndex] <= 0) {
            // Calculate distance between player and obstacle
            const playerPosition = playerMesh.position;
            const obstaclePosition = obstacles[obstacleIndex].position;
            const distance = playerPosition.distanceTo(obstaclePosition);
        
            // Create a sound source and gain node for controlling volume
            const source = audioContext.createBufferSource();
            source.buffer = vanishSoundBuffer;
        
            const gainNode = audioContext.createGain();
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
        
            // Set volume based on distance (farther distance = quieter)
            const maxDistance = 50; // Adjust this value based on the size of your scene
            gainNode.gain.value = Math.max(0, 1 - distance / maxDistance);
        
            // Play the sound
            source.start();
        
            // Remove the obstacle and other related entities
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
      }
      }

      // Remove the projectile upon collision
      scene.remove(sphereMesh);
      world.removeBody(sphereBody);
      projectiles = projectiles.filter(p => p.body !== sphereBody);
    }
  });

  scene.add(sphereMesh);
  projectiles.push({ mesh: sphereMesh, body: sphereBody });
  socket.emit('shoot', { position: sphereMesh.position, velocity: sphereBody.velocity });
}


// Function to create a particle effect at a collision position
function createParticleEffect(position) {
  const particleCount = 30;
  const particles = new THREE.Group();

  for (let i = 0; i < particleCount; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x8B0000 }); // Dark red color for blood
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    particle.position.copy(position);
    
    // Spread out horizontally with slight vertical variation for splatter effect
    particle.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 4, // Wider horizontal spread
      (Math.random() - 0.25) * 2, // Lower vertical spread
      (Math.random() - 0.5) * 4
    );

    particles.add(particle);
  }

  scene.add(particles);

  // Remove particles after some time
  setTimeout(() => {
    scene.remove(particles);
  }, 500);

  // Animate particles to give a splattering effect
  const animateParticles = () => {
    particles.children.forEach((particle) => {
      particle.position.add(particle.velocity);
      particle.material.opacity -= 0.03; // Fade out over time
    });

    // Check if any particles still have opacity left to continue animation
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

    if (projectile.mesh.position.length() > 1000) {
      scene.remove(projectile.mesh);
      world.removeBody(projectile.body);
      projectiles.splice(i, 1);
    }
  }
}


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
  
  keepPlayerWithinBounds();
  if (isFlying) {
    if (flyUp) playerMesh.position.y += flyingSpeed;
    if (flyDown) playerMesh.position.y -= flyingSpeed;

    // Prevent the insect from flying below the ground level
    playerMesh.position.y = Math.max(playerMesh.position.y, groundLevel);
  } else {
    // Handle gravity and jumping for non-flying players
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

  // Sync player position with server
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

// Make chat visible when input is focused
chatInput.addEventListener('focus', () => {
  chatContainer.style.opacity = '1';
  chatInput.style.opacity = '1';
});

// Make chat transparent when input loses focus
chatInput.addEventListener('blur', () => {
  if (chatInput.value.trim() === '') {
    chatContainer.style.opacity = '0.3';
    chatInput.style.opacity = '0.3';
  }
});

// Listen for 'Enter' to focus the input field
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && document.activeElement !== chatInput) {
    chatInput.focus();
  }
});

// Send chat message on 'Enter' and unfocus input field
chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && chatInput.value.trim() !== '') {
    const message = chatInput.value;
    socket.emit('chatMessage', { id: socket.id, message }); // Send the message to the server
    addChatMessage('Me', message); // Display your own message
    chatInput.value = ''; // Clear the input box
    chatInput.blur(); // Unfocus the input after sending
  }
});

// Function to add a message to the chat
function addChatMessage(sender, message) {
  const messageElement = document.createElement('div');
  messageElement.textContent = `${sender}: ${message}`;
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight; // Auto-scroll to the bottom
}

// Listen for incoming chat messages
socket.on('chatMessage', (data) => {
  addChatMessage(`Player ${data.id}`, data.message);
});

