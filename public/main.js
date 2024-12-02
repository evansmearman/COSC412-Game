import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { io } from 'socket.io-client';
import { nanoid } from 'nanoid';
const socket = io();



// Lobby and UI elements
const titleScreen = document.getElementById('titleScreen');
const lobbyScreen = document.querySelector('#lobbyScreen'); // Ensures proper selection
const playerNameInput = document.getElementById('playerNameInput');
const createLobbyButton = document.getElementById('createLobbyButton');
const joinLobbyButton = document.getElementById('joinLobbyButton');
const lobbyCodeInput = document.getElementById('lobbyCodeInput');
const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
const playerList = document.getElementById('playerList');
const startGameButton = document.getElementById('startGameButton');
const mapSelectionScreen = document.getElementById('mapSelectionScreen');
const backToLobbyButton = document.getElementById('backToLobbyButton');
const confirmMapButton = document.getElementById('confirmMapButton');
const leaveLobbyButton = document.getElementById('leaveLobbyButton');
const gameEndScreen = document.getElementById('gameEndScreen')
let selectedMap = '';
let finalMap = ''
// Game variables
let lobbyCode = '';

let playersInLobby = [];
let playerRole = '';

// Create Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(140, 255, 115);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer( { antialias: true } );
      renderer.setPixelRatio( window.devicePixelRatio );
      renderer.setSize( window.innerWidth, window.innerHeight );
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Cannon.js world setup
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Apply gravity

// Ammo.js physics setup


// Game setup variables
const players = {};
let isGameStarted = false;

// Movement, control, and role variables
let playerSpeed = 10;
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

const loginButton = document.getElementById('loginButton');
const signInScreen = document.getElementById('signInScreen');
loginButton.addEventListener('click', () => {
  titleScreen.classList.add('hidden');
  signInScreen.classList.remove('hidden');
});
const signUpUsername = document.getElementById('signUpUsername');
const signUpPassword = document.getElementById('signUpPassword');
const signUpButton = document.getElementById('signUpButton');

signUpButton.addEventListener('click', async () => {
  const username = signUpUsername.value.trim();
  const password = signUpPassword.value.trim();

  if (!username || !password) {
    alert('Please fill in all fields.');
    return;
  }

  try {
    // Send sign-up request to the server
    const response = await fetch('/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (response.ok) {
      alert('Sign-up successful! Please log in.');
      signUpScreen.classList.add('hidden');
      signInScreen.classList.remove('hidden');
    } else {
      alert(result.message || 'Sign-up failed.');
    }
  } catch (error) {
    console.error('Error during sign-up:', error);
    alert('An error occurred. Please try again.');
  }
});
// Transition to Sign-Up screen from Sign-In
const goToSignUp = document.getElementById('goToSignUp');
const signUpScreen = document.getElementById('signUpScreen');

goToSignUp.addEventListener('click', () => {
  signInScreen.classList.add('hidden');
  signUpScreen.classList.remove('hidden');
});

// Transition back to Sign-In from Sign-Up
const goToSignIn = document.getElementById('goToSignIn');
goToSignIn.addEventListener('click', () => {
  signUpScreen.classList.add('hidden');
  signInScreen.classList.remove('hidden');
});
// Handle lobby creation
createLobbyButton.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    alert('Please enter your name.');
    return;
  }

  // Generate a lobby code and send a request to the server
  lobbyCode = nanoid(6).toUpperCase();
  socket.emit('createLobby', { playerName, lobbyCode });

  // Switch to the map selection screen
  titleScreen.style.display = 'none';
  mapSelectionScreen.classList.remove('hidden');
  mapSelectionScreen.classList.add('flex');
});

// Handle back to lobby button
backToLobbyButton.addEventListener('click', () => {
  mapSelectionScreen.classList.add('hidden');
  titleScreen.style.display = 'flex';
  socket.emit('backToLobby', lobbyCode );
});

leaveLobbyButton.addEventListener('click', () =>{
  socket.emit('leaveLobby', lobbyCode )
  lobbyScreen.style.display = "none"
  titleScreen.style.display = "flex"
})


document.querySelectorAll('.map-option').forEach((mapOption) => {
  mapOption.addEventListener('click', () => {
    document.querySelectorAll('.map-option').forEach((option) => {
      option.classList.remove('border-4', 'border-green-500');
    });
    mapOption.classList.add('border-4', 'border-green-500');
    selectedMap = mapOption.dataset.map;

    // Enable confirm button
    confirmMapButton.disabled = false;

    // Display feedback
    console.log(`Selected map: ${selectedMap}`);
  });
});
joinLobbyButton.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  const code = lobbyCodeInput.value.trim().toUpperCase();

  if (!playerName || !code) {
    alert('Please enter your name and a lobby code.');
    return;
  }

  // Send a request to join the lobby
  socket.emit('joinLobby', { playerName, lobbyCode: code });

  // Switch to the lobby screen
  titleScreen.style.display = 'none';
  lobbyScreen.style.display = 'flex';
});


confirmMapButton.addEventListener('click', ()=>{
  socket.emit('mapSelected', { lobbyCode, map: selectedMap });   
  mapSelectionScreen.style.display = "none"
  lobbyScreen.style.display = "flex"
  lobbyCodeDisplay.textContent = lobbyCode;

  })
  socket.on('mapSelected',({map})=>{
    finalMap = map
    console.log("Map selection complete")
    console.log(map)
});



function loadMap(map) {
  return new Promise((resolve, reject) => {
    const path =
      map === "Map1"
        ? "assets/lowPolyKitchenWhole.glb"
        : map === "Map2"
        ? "assets/Apartment 2.glb"
        : null;

    if (!path) {
      reject(`Invalid map selected: ${map}`);
      return;
    }

    console.log(`Loading map: ${map} from path: ${path}`);

    const scaleFactor = map === "Map1" ? 1 : 500;
    const positionY = map === "Map1" ? 0 : 50;

    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => {
        const glbScene = gltf.scene;

        // Set scale and position
        glbScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
        glbScene.position.y = positionY;

        // Compute and log the bounding box
        const boundingBox = new THREE.Box3().setFromObject(glbScene);
        console.log("Bounding Box:", boundingBox.min, boundingBox.max);

        // Add bounding box helper for debugging
        const boxHelper = new THREE.Box3Helper(boundingBox, 0xff0000);
        scene.add(boxHelper);

        // Traverse the GLTF scene for physics bodies
        glbScene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const geometry = child.geometry;
            if (geometry && geometry.attributes.position) {
              // Extract vertices and indices for Trimesh
              const vertices = Array.from(geometry.attributes.position.array);
              const indices = geometry.index
                ? Array.from(geometry.index.array)
                : undefined;

              // Scale vertices for Trimesh
              const scaledVertices = vertices.map((v, i) =>
                i % 3 === 1 ? v * scaleFactor : v * scaleFactor
              );

              // Apply world transformation
              const position = new THREE.Vector3();
              const quaternion = new THREE.Quaternion();
              const scale = new THREE.Vector3();
              child.updateMatrixWorld();
              child.matrixWorld.decompose(position, quaternion, scale);

              // Create the Trimesh and physics body
              const trimesh = new CANNON.Trimesh(scaledVertices, indices);
              const body = new CANNON.Body({
                mass: 0, // Static object
                shape: trimesh,
              });

              // Position and rotate the body
              body.position.set(position.x, position.y, position.z);
              body.quaternion.set(
                quaternion.x,
                quaternion.y,
                quaternion.z,
                quaternion.w
              );

              // Add to the physics world
              world.addBody(body);

              // Optional visualization
              visualizeTrimesh(trimesh, scene, map);

              // keepPlayerWithinBounds = enforceBoundariesFromTrimesh(trimesh, playerMesh, playerBody);

            }
          }
        });

        // Add GLTF scene to Three.js scene
        scene.add(glbScene);
        console.log(`Map "${map}" loaded successfully.`);
        resolve(); // Resolve after the map is fully loaded
      },
      undefined, // Optional: progress callback
      (error) => {
        reject(error); // Reject on error
      }
    );
  });
}

// Handle starting the game
startGameButton.addEventListener('click', () => {
  console.log("hit")
  socket.emit('startGame', { lobbyCode });
});

// Update lobby UI when a new player joins
socket.on('lobbyUpdate', ({ players, host }) => {
  // Clear the existing player list
  playerList.innerHTML = '';

  // Add each player to the list
  players.forEach((player) => {
    const listItem = document.createElement('li');
    listItem.className = 'flex items-center justify-between bg-gray-700 p-3 rounded-md';
    listItem.innerHTML = `
      <span class="font-medium">${player.name}</span>
      <span class="text-sm ${player.id === host ? 'text-green-400' : 'text-yellow-400'}">
        ${player.id === host ? 'Host' : 'Player'}
      </span>
    `;
    playerList.appendChild(listItem);
  });

  // Show "Start Game" button for the host
  if (socket.id === host) {
    startGameButton.style.display = 'block';
  } else {
    startGameButton.style.display = 'none';
  }

  console.log('Lobby updated:', players);
});

// Ensure lobbyScreen is selected correctly

// Transition to game when it starts
const gameMusic = document.getElementById('gameMusic');

// Play music when the game starts
socket.on('gameStart', (data) => {
  const { players, map } = data;

  console.log("Game starting event received:", data);
  isGameStarted = true;
// Load the selected map
loadMap(map).then(() => {
console.log(`Map "${map}" loaded successfully.`);   

spawnPowerUps(5)
}) // Hide the lobby screen
  lobbyScreen.style.display = 'none';

  // Play background music
  gameMusic.play().catch((error) => {
    console.error("Error playing music:", error);
  });

  // Add all players to the game
  players.forEach((player) => {
    if (player.id !== socket.id) {
      addNewPlayer(player.id, player.role);
      console.log("HERE IT IS")
    }
    console.log(`Player ${player.name} loaded with role: ${player.role}`);
  });

  // Start the game loop
  animate();
});



// Additional Three.js and Cannon.js game setup (same as existing code)

// Synchronize player positions
socket.on('updatePlayerPositions', (data) => {
  data.forEach(({ id, position }) => {
    if (id !== socket.id) {
      if (!players[id]) {
        players[id] = createPlayerMesh();
        scene.add(players[id]);
      }
      players[id].position.set(position.x, position.y, position.z);
      console.log(`Player ${id} moved to position:`, position); // Debugging log
    }
  });
});

// Remove disconnected players
socket.on('playerDisconnect', (id) => {
  if (otherPlayers[id]) {
      scene.remove(otherPlayers[id]);
      delete otherPlayers[id];
  }
});

function createPlayerMesh() {
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
  return new THREE.Mesh(geometry, material);
}



// Ground physics body for Cannon.js
const groundBody = new CANNON.Body({ mass: 0 }); // Static ground
const groundShape = new CANNON.Plane();
console.log(groundShape)
groundBody.addShape(groundShape);
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
groundBody.position.set(0, -23, 0)
world.addBody(groundBody);


// Create chat container
const chatContainer = document.createElement('div');
chatContainer.style.position = 'fixed';
chatContainer.style.bottom = '80px'; // Offset from the input
chatContainer.style.left = '20px';
chatContainer.style.width = '320px';
chatContainer.style.height = '240px';
chatContainer.style.backgroundColor = 'rgba(20, 20, 20, 0.9)'; // Darker and less transparent
chatContainer.style.borderRadius = '12px'; // More rounded corners
chatContainer.style.border = '2px solid #444'; // Softer border color
chatContainer.style.overflowY = 'auto'; // Improved scrolling
chatContainer.style.padding = '15px';
chatContainer.style.color = '#f0f0f0'; // Softer white text
chatContainer.style.fontSize = '14px';
chatContainer.style.display = 'flex';
chatContainer.style.flexDirection = 'column';
chatContainer.style.gap = '10px'; // Add space between messages
chatContainer.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.6)'; // Subtle shadow
chatContainer.style.transition = 'opacity 0.3s ease, transform 0.3s ease'; // Smooth opacity and scale transitions
chatContainer.style.transform = 'scale(0.95)'; // Slightly smaller when idle
chatContainer.style.opacity = '0.3'; // Initially transparent

// Add hover effect for interactivity
chatContainer.addEventListener('mouseenter', () => {
chatContainer.style.opacity = '1';
chatContainer.style.transform = 'scale(1)';
});
chatContainer.addEventListener('mouseleave', () => {
chatContainer.style.opacity = '0.3';
chatContainer.style.transform = 'scale(0.95)';
});

document.body.appendChild(chatContainer);

// Create chat input box
const chatInput = document.createElement('input');
chatInput.style.position = 'fixed';
chatInput.style.bottom = '20px';
chatInput.style.left = '20px';
chatInput.style.width = '320px';
chatInput.style.height = '50px'; // Larger height for better usability
chatInput.style.padding = '10px';
chatInput.style.backgroundColor = '#222'; // Dark background
chatInput.style.color = '#f0f0f0'; // Softer white text
chatInput.style.border = '2px solid #444'; // Softer border color
chatInput.style.borderRadius = '12px'; // More rounded corners
chatInput.style.outline = 'none'; // Remove default outline
chatInput.style.fontSize = '16px';
chatInput.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.4)'; // Subtle shadow
chatInput.style.transition = 'opacity 0.3s ease, transform 0.3s ease'; // Smooth transitions
chatInput.style.transform = 'scale(0.95)'; // Slightly smaller when idle
chatInput.style.opacity = '0.3'; // Initially transparent
chatInput.placeholder = 'Type your message here...';
document.body.appendChild(chatInput);


// Geometry and materials for player
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
let playerMesh = new THREE.Mesh(geometry, material);
scene.background = new THREE.Color(0x87CEEB);
scene.add(playerMesh);


function visualizeTrimesh(trimesh, scene, map) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trimesh.vertices), 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(trimesh.indices), 1));

  const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), material);
  wireframe.visible = false
  scene.add(wireframe);

  // Add collision body to the physics world
  const wiremeshBody = new CANNON.Body({
      mass: 0, // Static object
      collisionFilterGroup: 0b10, // Group for static objects
      collisionFilterMask: 0b01, // Collides with players
  });
  wiremeshBody.addShape(new CANNON.Trimesh(trimesh.vertices, trimesh.indices));
  world.addBody(wiremeshBody);

  return wiremeshBody;
}


function updatePlayerPhysics() {
playerMesh.position.copy(playerBody.position);
playerMesh.quaternion.copy(playerBody.quaternion);
}


const loader = new GLTFLoader();



let powerUpMesh;
const powerUpPosition = new THREE.Vector3((Math.random() - 0.5) * 100, 3, (Math.random() - 0.5) * 100); // Random position

function createGlowEffect(position) {
  const glowGeometry = new THREE.SphereGeometry(3, 32, 32); // Larger than the power-up for the halo effect
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      viewVector: { type: "v3", value: camera.position },
      c: { type: "f", value: 0.5 },
      p: { type: "f", value: 2.0 },
      glowColor: { type: "c", value: new THREE.Color(0xffcc00) }, // Yellow glow
    },
    vertexShader: `
      uniform vec3 viewVector;
      uniform float c;
      uniform float p;
      varying float intensity;
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vNormel = normalize(normalMatrix * viewVector - modelViewMatrix * vec4(position, 1.0)).xyz;
        intensity = pow(c - dot(vNormal, vNormel), p);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying float intensity;
      void main() {
        gl_FragColor = vec4(glowColor, intensity);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
  });

  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  glowMesh.position.copy(position);
  glowMesh.scale.set(1.2, 1.2, 1.2); // Slightly larger than the power-up
  return glowMesh;
}
const spawnBoundaries = {
  xMin: -150, // Minimum x-coordinate
  xMax: 175.9, // Maximum x-coordinate
  yMin: 1, // Minimum y-coordinate (ground level)
  yMax: 10, // Maximum y-coordinate
  zMin: -178.8, // Minimum z-coordinate
  zMax: 179, // Maximum z-coordinate
};

// Create and add the glow around the power-up
const powerUps = []; // Array to store all power-up meshes and bodies

function spawnPowerUps(count) {
for (let i = 0; i < count; i++) {
  const position = new THREE.Vector3(
    THREE.MathUtils.randFloat(spawnBoundaries.xMin, spawnBoundaries.xMax),
    THREE.MathUtils.randFloat(spawnBoundaries.yMin, spawnBoundaries.yMax),
    THREE.MathUtils.randFloat(spawnBoundaries.zMin, spawnBoundaries.zMax)
  );

  loader.load(
    'assets/Pickup Thunder.glb', // Path to the power-up GLB model
    (gltf) => {
      const powerUpMesh = gltf.scene;
      powerUpMesh.scale.set(5, 5, 5);
      powerUpMesh.position.copy(position);
      scene.add(powerUpMesh);

      const powerUpShape = new CANNON.Sphere(10);
      const powerUpBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(position.x, position.y, position.z),
      });
      powerUpBody.addShape(powerUpShape);
      world.addBody(powerUpBody);

      const glowEffect = createGlowEffect(powerUpPosition);
      scene.add(glowEffect);

      // Store mesh and body in the array
      powerUps.push({ mesh: powerUpMesh, body: powerUpBody });
    },
    undefined,
    (error) => {
      console.error('Error loading power-up model:', error);
    }
  );
}
}


// Optional: Visualize the Cannon.js body for debugging
const visualizePhysicsBody = () => {
  const geometry = new THREE.SphereGeometry(10, 16, 16); // Match the shape's size
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
  const wireframe = new THREE.Mesh(geometry, material);
  wireframe.position.copy(powerUpPosition);
  scene.add(wireframe);
};

visualizePhysicsBody();


function checkPowerUpCollision() {
  powerUps.forEach((powerUp, index) => {
    if (!powerUp || !powerUp.mesh || !powerUp.body) return;

    // Adjust distance threshold to match power-up size
    const distance = playerMesh.position.distanceTo(powerUp.mesh.position);
    if (distance < 5) { // Adjust "5" based on power-up scale
      collectPowerUp(index);
    }
  });
}


function collectPowerUp(index) {
  const powerUp = powerUps[index];
  if (!powerUp) return;

  // Add a visual effect
  const effectGeometry = new THREE.SphereGeometry(5, 32, 32);
  const effectMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.7 });
  const effect = new THREE.Mesh(effectGeometry, effectMaterial);
  effect.position.copy(powerUp.mesh.position);
  scene.add(effect);

  setTimeout(() => {
    scene.remove(effect);
  }, 500); // Remove effect after 0.5 seconds

  // Remove power-up from scene and world
  scene.remove(powerUp.mesh);
  world.removeBody(powerUp.body);

  // Remove from array
  powerUps.splice(index, 1);

  // Boost player speed
  boostPlayerSpeed();

  console.log(`Power-up collected: index ${index}`);
}
function boostPlayerSpeed() {
  const originalSpeed = playerSpeed;
  playerSpeed = 20; // Boosted speed

  // Reset speed after 7 seconds
  setTimeout(() => {
    playerSpeed = originalSpeed;
  }, 7000);

  // Optional: Visual feedback for speed boost
  console.log('Speed boost activated!');
}
function animateGlowEffect(glowMesh) {
  const scale = 1 + 0.1 * Math.sin(Date.now() * 0.005); // Pulsating effect
  glowMesh.scale.set(scale, scale, scale);
}
// Renderer configuration for shadows
renderer.shadowMap.enabled = true; // Enable shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows for better quality

// Directional light with improved shadow configuration
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.color.setHSL(0.1, 1, 0.95);
dirLight.position.set(-1, 1.75, 1).multiplyScalar(30);
dirLight.castShadow = true;

// Configure shadow map settings for directional light
dirLight.shadow.mapSize.width = 2048; // Higher resolution shadow map
dirLight.shadow.mapSize.height = 2048;
const d = 10000; // Dimensions of shadow frustum
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.camera.near = 1; // Near plane for shadows
dirLight.shadow.camera.far = 1000; // Far plane for shadows
dirLight.shadow.bias = -0.0001; // Bias to reduce shadow acne
scene.add(dirLight);

const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 10);
scene.add(dirLightHelper);

// Hemisphere light for ambient lighting
const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0xffffff, 0.5);
hemiLight.color.setHSL(0.6, 1, 0.6);
hemiLight.groundColor.setHSL(0.0001, 1, 0.75);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

// Enable shadows on the player mesh
playerMesh.castShadow = true;
playerMesh.receiveShadow = true;

// Create a plane for the ground and enable shadows
const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2; // Rotate the ground to lie flat
groundMesh.position.y = -23;
groundMesh.receiveShadow = true; // Enable shadows
scene.add(groundMesh);

// Add shadows for obstacles



// Store other players
let otherPlayers = {};

const spawnHeight = 0; // Adjust as needed to set initial spawn height above ground
camera.position.set(0, spawnHeight+ 2, 0); // Place the camera at a height above ground
playerMesh.position.set(0, spawnHeight, 0); // Place the player mesh at the same height
playerMesh.castShadow = true; // Cast shadows
playerMesh.receiveShadow = true; // Receive shadows
playerMesh.add(camera); // Attach camera to player mesh



const playerRadius = 1; // Adjust to match the size of the player
const playerBody = new CANNON.Body({
mass: 5, // Dynamic object
shape: new CANNON.Sphere(playerRadius),
position: new CANNON.Vec3(0, spawnHeight + 1, 0),
collisionFilterGroup: 0b01, // Group for players
collisionFilterMask: 0b10,  // Collides with static objects
});
world.addBody(playerBody);

// Sync Three.js mesh with Cannon.js body

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

document.addEventListener('mousemove', (event) => {
  if (mouseLocked) {
      const sensitivity = 0.002;
      yaw -= event.movementX * sensitivity;
      pitch -= event.movementY * sensitivity;

      // Clamp pitch
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

      // Apply rotation to the camera and player body
      playerBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw); // Rotate player
      camera.rotation.x = pitch; // Rotate camera
  }
});
document.addEventListener('click', () => {
  if (isGameStarted && !mouseLocked) {
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
    case 'ControlLeft': flyDown = false; break;
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
  
    // Create the Three.js sphere mesh
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  
    // Set the initial position of the sphere slightly in front of the player
    const startPosition = new THREE.Vector3();
    camera.getWorldPosition(startPosition); // Get the camera's world position
    const forwardDirection = new THREE.Vector3();
    camera.getWorldDirection(forwardDirection); // Get the direction the camera is facing
    sphereMesh.position.copy(startPosition.add(forwardDirection.multiplyScalar(3))); // Offset position forward
  
    // Add the sphere mesh to the scene
    scene.add(sphereMesh);
  
    // Create the Cannon.js body for physics
    const sphereShape = new CANNON.Sphere(sphereRadius);
    const sphereBody = new CANNON.Body({
      mass: sphereMass,
      shape: sphereShape,
      position: new CANNON.Vec3(
        sphereMesh.position.x,
        sphereMesh.position.y,
        sphereMesh.position.z
      ),
      collisionFilterGroup: 0b10, // Projectiles group
      collisionFilterMask: 0b01 | 0b10, // Collides with players and obstacles
    });
  
    world.addBody(sphereBody);
  
    // Set the sphere's velocity in the direction the camera is facing
    const velocity = forwardDirection.multiplyScalar(150); // Adjust speed multiplier as needed
    sphereBody.velocity.set(velocity.x, velocity.y, velocity.z);
  
    // Store the projectile for updates
    projectiles.push({ mesh: sphereMesh, body: sphereBody });
  
    // Collision handling for spheres
    sphereBody.addEventListener('collide', (event) => {
      const collidedBody = event.body;
  
      // Check if it hit a player
      Object.values(otherPlayers).forEach((player) => {
        if (player.body === collidedBody) {
          const playerId = Object.keys(otherPlayers).find(
            (id) => otherPlayers[id].body === collidedBody
          );
  
          // Reduce health and update health bar
          player.health -= 20; // Decrease by 20 on each hit
          updateHealthBar(playerId);
  
          console.log(`Player ${playerId} hit! Health: ${player.health}`);
  
          // Create particle effect at the hit position
          createParticleEffect(player.mesh.position);
  
          // Remove the player if health reaches zero
          if (player.health <= 0) {
            removePlayer(playerId);
          }
        }
      });
  
      // Remove the sphere on collision
      removeProjectile(sphereMesh, sphereBody);
    });
    socket.emit('updateStats', { username: 'PlayerName', shotsFired: 1 });
    // socket.emit('shoot', { position: sphereMesh.position, velocity: sphereBody.velocity });  
    // Automatically remove the sphere after 10 seconds
    setTimeout(() => {
      removeProjectile(sphereMesh, sphereBody);
    }, 10000);
  }
// Function to remove a projectile and its hitbox
function removeProjectile(mesh, body, hitbox) {
  if (scene.children.includes(mesh)) {
    scene.remove(mesh);
  }
  if (scene.children.includes(hitbox)) {
    scene.remove(hitbox);
  }
  if (world.bodies.includes(body)) {
    world.removeBody(body);
  }

  // Remove from the projectiles array
  projectiles = projectiles.filter((p) => p.body !== body);
}

function updateHealthBar(playerId) {
  const player = otherPlayers[playerId];
  if (!player) return;

  const healthPercentage = Math.max(0, player.health / 100);

  // Update health bar and color
  const healthBar = healthBars[playerId];
  if (healthBar) {
    healthBar.scale.set(healthPercentage, 1, 1);
    healthBar.material.color.setHex(
      healthPercentage > 0.5 ? 0x00ff00 : healthPercentage > 0.25 ? 0xffff00 : 0xff0000
    );

    if (healthPercentage <= 0) {
      removePlayer(playerId);
    }
  }
}
// Function to remove a projectile

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

const playerHealth = {};
const healthBars = {};

function createHealthBar(playerMesh, initialHealth = 100) {
const barGeometry = new THREE.PlaneGeometry(1.5, 0.2); // Adjust size as needed
const barMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const healthBar = new THREE.Mesh(barGeometry, barMaterial);

// Position the health bar above the player
healthBar.position.set(0, 1.5, 0); // Adjust height above the player
playerMesh.add(healthBar); // Add as a child to player mesh

// Initialize player health
playerHealth[playerMesh.id] = initialHealth;
healthBars[playerMesh.id] = healthBar;
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];

    // Skip undefined or incomplete projectiles
    if (!projectile || !projectile.mesh || !projectile.body) {
      projectiles.splice(i, 1); // Remove invalid projectiles
      continue;
    }

    // Synchronize the Three.js mesh with the Cannon.js body
    projectile.mesh.position.copy(projectile.body.position);
    projectile.mesh.quaternion.copy(projectile.body.quaternion);

    // Remove projectiles that go out of bounds
    if (projectile.mesh.position.length() > 1000) {
      scene.remove(projectile.mesh);
      world.removeBody(projectile.body);
      projectiles.splice(i, 1);
    }
  }
}
playerBody.collisionResponse = true; // Enable collision response
playerBody.allowSleep = false; // Prevent the body from "sleeping"
playerBody.collisionFilterGroup = 0b01; // Group for players
playerBody.collisionFilterMask = 0b10; // Collides with static objects
playerBody.linearDamping = 0.1; // Dampen velocity to reduce jitter

// Enable CCD
playerBody.ccdMotionThreshold = 1; // Threshold for motion-based collision
playerBody.ccdSweptSphereRadius = playerRadius; // Swept radius to detect collisions

playerBody.angularDamping = 0.9; // High damping reduces rotation significantly

playerBody.fixedRotation = true;
playerBody.updateMassProperties();
function handlePlayerMovement() {
    const flySpeed = 5;
    // Reset horizontal velocity
    playerBody.velocity.x = 0;
    playerBody.velocity.z = 0;

    // Get the camera's forward and right direction vectors
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(camera.up, cameraDirection).normalize();

    // Compute movement based on input
    const moveDirection = new THREE.Vector3();

    if (moveForward) moveDirection.add(cameraDirection);
    if (moveBackward) moveDirection.add(cameraDirection.negate());
    if (moveLeft) moveDirection.add(cameraRight);
    if (moveRight) moveDirection.add(cameraRight.negate());

    // Normalize the movement direction vector (to prevent faster diagonal movement)
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.multiplyScalar(playerSpeed);
    }

    // Vertical movement (flying) only for insects
    if (playerRole === 'Insect') {
        if (flyUp) moveDirection.y += flySpeed;
        if (flyDown) moveDirection.y -= flySpeed;
    }

    // Check for collisions with the map
    const newPosition = new CANNON.Vec3().copy(playerBody.position).vadd(moveDirection);    if (!isCollidingWithMap(newPosition)) {
        // Apply movement direction to the playerBody
        playerBody.velocity.x = moveDirection.x;
        playerBody.velocity.y = moveDirection.y;
        playerBody.velocity.z = moveDirection.z;

        // Ensure movement stays horizontal (no vertical velocity changes) for non-flying players
        if (playerRole !== 'Insect') {
            playerBody.velocity.y = 0; // Keep the player grounded
        }
    }

    // Prevent rotation
    playerBody.angularVelocity.set(0, 0, 0); // Prevent angular motion
    // console.log(`Player moved to position:`, playerBody.position); // Debugging log
}

function isCollidingWithMap(position) {
    // Implement collision detection logic with the map model
    // Return true if the position collides with the map, otherwise false
    // This is a placeholder function and should be implemented based on your map model
    return false;
}

function animate() {
if (!isGameStarted) return; // Stop the animation loop if the game is not started

requestAnimationFrame(animate); // Request the next frame

try {
  // Step the physics world
  world.step(1 / 60); // Assuming a 60 FPS frame rate

  // Update all players
  Object.values(otherPlayers).forEach((player) => {
    if (player.updateHitbox) {
      player.updateHitbox();
    }
    if (player.mixer) {
      player.mixer.update(1 / 60);
    }
  });

  // Update the local player
  updatePlayerPhysics(); // Sync local player physics with the Three.js mesh
  handlePlayerMovement(); // Apply movement inputs to the local player
  keepPlayerWithinBounds(); // Ensure the player stays within the game boundaries

  // Update projectiles
  updateProjectiles(); // Sync projectile positions with physics and handle cleanup

  // Check power-up collisions
    // Safely check power-up collisions
    if (powerUps.length > 0) {
      checkPowerUpCollision();
    }  // Handle power-up interactions

  // Animate glow effects for power-ups
  powerUps.forEach((powerUp) => {
    if (powerUp.glowMesh) {
      animateGlowEffect(powerUp.glowMesh);
    }
  });

  // Synchronize player position with the server
  socket.emit('move', { position: playerMesh.position, isFlying });

  // Render the scene
  renderer.render(scene, camera);
} catch (err) {
  console.error('Error in animation loop:', err);
}
}



socket.on('shoot', (data) => {
  const sphereRadius = 1.1; // Ensure this matches the shootSphere function
  const sphereMass = 0.1;

  // Create the Three.js sphere mesh
  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 8, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereMesh.position.copy(data.position);

  // Create the Cannon.js sphere body
  const sphereShape = new CANNON.Sphere(sphereRadius);
  const sphereBody = new CANNON.Body({ mass: sphereMass });
  sphereBody.addShape(sphereShape);
  sphereBody.position.set(data.position.x, data.position.y, data.position.z);

  // Apply velocity from the data
  sphereBody.velocity.set(data.velocity.x, Math.max(data.velocity.y, 0), data.velocity.z); // Ensure y-velocity is set correctly

  // Add the sphere to the physics world and scene
  world.addBody(sphereBody);
  scene.add(sphereMesh);

  // Add to the projectiles array for updates
  projectiles.push({ mesh: sphereMesh, body: sphereBody });
  console.log(`Player ${data.id} shot from position:`, data.position, 'with velocity:', data.velocity); // Debugging log
});
function clearScene() {
  while (scene.children.length > 0) {
    const object = scene.children[0];
    scene.remove(object);

    // Dispose of geometry and materials to free memory
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => mat.dispose());
      } else {
        object.material.dispose();
      }
    }
  }
}

function clearPhysicsWorld() {
  world.bodies.forEach((body) => world.removeBody(body));
}
function endGame(isWinner) {
  console.log('Game over!');
  isGameStarted = false;

  // Pause the background music
  gameMusic.pause();
  gameMusic.currentTime = 0;

  // Determine the result based on the local player's role
  const playerWon = playerRole === 'Human' ? isWinner : !isWinner;

  // Emit the result to the server
  socket.emit('endGame', { isWinner: playerWon });
  if (isWinner) {
    socket.emit('updateStats', { username: 'PlayerName', wins: 1 });
  }

  // Show the result for the local player
  showEndGameScreen(playerWon);
}

socket.on('endGame', ({ isWinner }) => {
  console.log(`Game ended. You ${isWinner ? "won!" : "lost!"}`);
  isGameStarted = false;

  showEndGameScreen(isWinner);
});

function showEndGameScreen(isWinner) {
  // Get the end game screen elements
  const gameEndScreen = document.getElementById('gameEndScreen');
  const gameResultTitle = document.getElementById('gameResultTitle');
  const gameResultMessage = document.getElementById('gameResultMessage');

  // Update the result screen based on whether the player won or lost
  if (isWinner) {
    gameResultTitle.textContent = "🏆 Congratulations!";
    gameResultMessage.textContent = "You Won!";
    // Trigger confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  } else {
    gameResultTitle.textContent = "💔 Game Over";
    gameResultMessage.textContent = "You Lost!";
  }

  // Display the end game screen
  gameEndScreen.classList.remove('hidden');
  gameEndScreen.classList.add('flex');

  // Button Actions
  document.getElementById('returnToTitleButton').addEventListener('click', () => {
    gameEndScreen.classList.add('hidden');
    titleScreen.style.display = 'flex';
    resetGame();
  });

  document.getElementById('playAgainButton').addEventListener('click', () => {
    gameEndScreen.classList.add('hidden');
    lobbyScreen.style.display = 'flex';
    resetGame();
    socket.emit('playAgain', { lobbyCode });
  });
}

// Listen for the endGame event from the server
socket.on('endGame', ({ isWinner }) => {
  console.log(`Game ended. You ${isWinner ? "won!" : "lost!"}`);
  isGameStarted = false;

  // Show the end game screen with the result
  showEndGameScreen(isWinner);
});

function resetRenderer() {
  renderer.clear();
}  
function resetGame() {
  // Reset any game-specific variables here if needed
  otherPlayers = {};
  playersInLobby = [];
  playerRole = '';
  lobbyCode = '';

  // Clear projectiles and other objects
  projectiles.forEach(({ mesh, body }) => {
    if (scene.children.includes(mesh)) scene.remove(mesh);
    if (world.bodies.includes(body)) world.removeBody(body);
  });
  projectiles = [];

  // Optionally clear chat or other UI elements
  chatContainer.innerHTML = '';
}


socket.on('newPlayer', (data) => {
  addNewPlayer(data.id, { role: data.role });
  console.log(data);
});

socket.on('currentPlayers', (players) => {
  Object.keys(players).forEach((id) => {
      if (id !== socket.id) {
          addNewPlayer(id, { role: players[id].role });
      }
  });
});


// ...existing code...
socket.on('playerMoved', (data) => {
  const { id, position } = data;
  if (id !== socket.id && otherPlayers[id]) {
      console.log(position)
      otherPlayers[id].body.position.set(position.x, position.y, position.z);
      otherPlayers[id].mesh.position.set(position.x, position.y, position.z); // Sync Three.js mesh position
      console.log(`Player ${id} moved to position:`, position); // Debugging log

  }
});
// ...existing code...

socket.on('lobbyFull', () => {
  console.log('Lobby is full! Starting the game...');
  loadingMessage.innerText = 'Game starting...';
  setTimeout(() => {
    loadingMessage.style.display = 'none';
    animate();
  }, 1000);
});

// Create a role display element
const roleDisplay = document.createElement('div');
roleDisplay.style.position = 'fixed';
roleDisplay.style.top = '20px';
roleDisplay.style.left = '50%';
roleDisplay.style.transform = 'translateX(-50%)';
roleDisplay.style.padding = '10px 20px';
roleDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
roleDisplay.style.color = '#fff';
roleDisplay.style.fontSize = '24px';
roleDisplay.style.borderRadius = '8px';
roleDisplay.style.zIndex = '1000';
roleDisplay.style.display = 'none'; // Initially hidden
document.body.appendChild(roleDisplay);

// Function to show the role display
function showRoleDisplay(role) {
    roleDisplay.textContent = `You are a ${role}`;
    roleDisplay.style.display = 'block';
    setTimeout(() => {
        roleDisplay.style.display = 'none';
    }, 5000); // Hide after 5 seconds
}

socket.on('assignRole', (role) => {
  isFlying = role === 'Insect';
  const loader = new GLTFLoader();

  // Show the role display
  showRoleDisplay(role);

  if (role === 'Insect') {
      let flyMixer;
      loader.load(
          'assets/CharacterFly.glb', // Path to your fly model
          (gltf) => {
              const flyModel = gltf.scene;
              flyModel.scale.set(1, 1, 1); // Adjust based on your model
              flyModel.position.set(playerBody.position.x, playerBody.position.y, playerBody.position.z); // Align with physics body
              flyModel.rotation.y = Math.PI; // Rotate 180 degrees
              flyModel.traverse((child) => {
                  if (child.isMesh) {
                      child.castShadow = true;
                      child.receiveShadow = true;
                  }
              });

              // Replace old player mesh
              if (playerMesh.parent) {
                  scene.remove(playerMesh);
              }
              playerMesh = flyModel;
              scene.add(playerMesh);

              const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.2, 0.5)); // Adjust dimensions
              playerBody.addShape(shape);

              // Attach the camera to the insect model
              playerMesh.add(camera);
              camera.position.set(0, 2, 0); // Slightly above and forward of the insect's body
              camera.rotation.set(0, Math.PI/1, 0); // Reset camera rotation
              camera.rotation.order = "YXZ"; 

              if (gltf.animations && gltf.animations.length > 0) {
                  flyMixer = new THREE.AnimationMixer(flyModel);
                  const action = flyMixer.clipAction(gltf.animations[0]);
                  action.play();
              }
          },
          undefined,
          (error) => {
              console.error('Error loading fly model:', error);
          }
      );
  } else if (role === 'Human') {
      let humanMixer;
      loader.load(
          'assets/CharacterHuman.glb', // Path to your human model
          (gltf) => {
              const humanModel = gltf.scene;
              humanModel.scale.set(1, 1, 1); // Adjust based on your model
              humanModel.position.set(playerBody.position.x, playerBody.position.y, playerBody.position.z); // Align with physics body
              humanModel.rotation.set(0, 0, 0) // Default orientation
              humanModel.traverse((child) => {
                  if (child.isMesh) {
                      child.castShadow = true;
                      child.receiveShadow = true;
                  }
              });

              // Replace old player mesh
              if (playerMesh.parent) {
                  scene.remove(playerMesh);
              }
              playerMesh = humanModel;
              scene.add(playerMesh);

              const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5)); // Adjust dimensions for human
              playerBody.addShape(shape);

              // Attach the camera to the human model
              playerMesh.add(camera);
              camera.position.set(0, 75, 8); // Adjust camera position for human
              camera.rotation.set(0, Math.PI/1, 0); // Reset camera rotation

              if (gltf.animations && gltf.animations.length > 0) {
                  humanMixer = new THREE.AnimationMixer(humanModel);
                  const action = humanMixer.clipAction(gltf.animations[0]);
                  action.play();
              }
          },
          undefined,
          (error) => {
              console.error('Error loading human model:', error);
          }
      );
  }

  console.log(`Player assigned role: ${role}`);
});


function addNewPlayer(id, data) {
console.log(data, "Adding new player...");
const loader = new GLTFLoader();
loader.load(
  data === 'Insect' ? 'assets/CharacterFly.glb' : 'assets/CharacterHuman.glb',
  (gltf) => {
    const model = gltf.scene;
    model.scale.set(data === 'Insect' ? 2: 1, data === 'Insect' ? 2: 1, data === 'Insect' ? 2: 1); // Adjust scale based on your models
    model.position.set(0, 0, 0);

    scene.add(model);

    // Create the physics body
    const playerShape = new CANNON.Sphere(5); // Adjust size for hitbox
    const playerBody = new CANNON.Body({
      mass: 5, // Dynamic object
      shape: playerShape,
      position: new CANNON.Vec3(0, 1, 0),
      collisionFilterGroup: 0b01, // Player group
      collisionFilterMask: 0b10 | 0b01, // Collides with projectiles and other players
    });
    world.addBody(playerBody);
model.position.set(
playerBody.position.x,
playerBody.position.y,
playerBody.position.z
);
    // Handle animations if available
    let mixer = null;
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[1]); // Play the first animation
      action.play();
    }

    // Store the player with their animations, health, and role
    otherPlayers[id] = {
      mesh: model,
      body: playerBody,
      health: 100, // Initialize health
      role: data, // Role is 'Insect' or 'Human'
      mixer, // Store the animation mixer
    };

    // Add a health bar above the player
    createHealthBar(model);

    // Synchronize the Three.js model with the physics body
    const updateHitbox = () => {
      model.position.copy(playerBody.position);
      model.quaternion.copy(playerBody.quaternion);

      // Update animations if mixer is available
      if (mixer) {
        mixer.update(1 / 60); // Update at 60 FPS
      }
    };

    otherPlayers[id].updateHitbox = updateHitbox;

    console.log(`Added player ${id} as ${data}`);
  },
  undefined,
  (error) => console.error(`Error loading model for player ${id}:`, error)
);
}

function visualizePlayerHitbox(playerBody) {
// Create a wireframe box to represent the hitbox
const hitboxMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
const hitboxGeometry = new THREE.BoxGeometry(2, 2, 2); // Adjust size as needed
const hitboxMesh = new THREE.LineSegments(
  new THREE.EdgesGeometry(hitboxGeometry),
  hitboxMaterial
);

// Sync the position and rotation of the hitbox with the player's body
const updateHitbox = () => {
  hitboxMesh.position.copy(playerBody.position);
  hitboxMesh.quaternion.copy(playerBody.quaternion);
};

// Add the hitbox to the scene
scene.add(hitboxMesh);

return updateHitbox;
}
function removePlayer(playerId) {
const player = otherPlayers[playerId];
if (player) {
  scene.remove(player.mesh);
  delete otherPlayers[playerId];
  delete playerHealth[playerId];
  delete healthBars[playerId];

  console.log(`Player ${playerId} removed from game.`);
}

checkWinConditions();
}
function checkWinConditions() {
let insectsAlive = 0;
let humanAlive = false;

Object.values(otherPlayers).forEach((player) => {
  if (player.role === 'Insect' && player.health > 0) {
    insectsAlive++;
  } else if (player.role === 'Human' && player.health > 0) {
    humanAlive = true;
  }
});

if (!humanAlive) {
  // Insects win
  endGame(false); // Human loses
} else if (insectsAlive === 0) {
  // Human wins
  endGame(true); // Human wins
}
} 

// Make chat visible when input is focused
if (chatInput && chatContainer) {
  chatInput.addEventListener('focus', () => {
    chatContainer.style.opacity = '1';
    chatContainer.style.transform = 'scale(1)';
    chatInput.style.opacity = '1';
    chatInput.style.transform = 'scale(1)';
  });
}
// Focus and blur animations

chatInput.addEventListener('blur', () => {
if (chatInput.value.trim() === '') {
  chatContainer.style.opacity = '0.3';
  chatContainer.style.transform = 'scale(0.95)';
  chatInput.style.opacity = '0.3';
  chatInput.style.transform = 'scale(0.95)';
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


window.addEventListener( 'resize', onWindowResize );

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}
