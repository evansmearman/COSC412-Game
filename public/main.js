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
			renderer.shadowMap.type = THREE.VSMShadowMap;
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




// Handle lobby creation
createLobbyButton.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    alert('Please enter your name.');
    return;
  }

  lobbyCode = nanoid(6).toUpperCase();
  socket.emit('createLobby', { playerName, lobbyCode });

  titleScreen.style.display = 'none';
  lobbyScreen.style.display = 'flex';

  lobbyCodeDisplay.textContent = lobbyCode;

  // Show "Start Game" button for host only
  startGameButton.style.display = 'block';
  createLobbyButton.style.display = 'none';
  joinLobbyButton.style.display = 'none';
});

joinLobbyButton.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  const code = lobbyCodeInput.value.trim().toUpperCase();

  if (!playerName || !code) {
    alert('Please enter your name and a lobby code.');
    return;
  }

  socket.emit('joinLobby', { playerName, lobbyCode: code });

  // Hide buttons after joining
  createLobbyButton.style.display = 'none';
  joinLobbyButton.style.display = 'none';
});

// Handle starting the game
startGameButton.addEventListener('click', () => {
  console.log("hit")
  socket.emit('startGame', { lobbyCode });
});

// Update lobby UI when a new player joins
socket.on('lobbyUpdate', (data) => {
  const { players, host } = data;

  // Update player list
  playerList.innerHTML = '';
  players.forEach((player) => {
    const listItem = document.createElement('li');
    listItem.textContent = player.name + (player.id === host ? ' (Host)' : '');
    playerList.appendChild(listItem);
  });

  // Show or hide the "Start Game" button
  if (socket.id === host) {
    startGameButton.style.display = 'block';
  } else {
    startGameButton.style.display = 'none';
  }

  // Hide lobby creation and joining buttons
  createLobbyButton.style.display = 'none';
  joinLobbyButton.style.display = 'none';

  console.log('Lobby updated:', players);
});

// Ensure lobbyScreen is selected correctly

// Transition to game when it starts
socket.on('gameStart', (data) => {
  const { players } = data;

  console.log("Game starting event received:", data);
  isGameStarted = true
  // Hide the lobby screen
  lobbyScreen.style.display = 'none';

  // Add all players to the game
  players.forEach((player) => {
    if (player.id !== socket.id) {
      addNewPlayer(player.id, { x: 0, y: 0, z: 0 });
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
    }
  });
});

// Remove disconnected players
socket.on('playerDisconnect', (id) => {
  if (players[id]) {
    scene.remove(players[id]);
    delete players[id];
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
groundBody.addShape(groundShape);
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);


const ceilingBody = new CANNON.Body({ mass: 0 }); // Static ground
const ceilingShape = new CANNON.Plane();
ceilingBody.addShape(ceilingShape);
ceilingBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(ceilingBody);

// Create a loading message


// Create chat container
const chatContainer = document.createElement('div');
chatContainer.style.position = 'absolute';
chatContainer.style.bottom = '10px';
chatContainer.style.left = '10px';
chatContainer.style.width = '300px';
chatContainer.style.height = '200px';
chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
chatContainer.style.border = '1px solid white';
chatContainer.style.overflowY = 'scroll';
chatContainer.style.padding = '10px';
chatContainer.style.color = 'white';
chatContainer.style.fontSize = '14px';
chatContainer.style.display = 'flex';
chatContainer.style.flexDirection = 'column';
chatContainer.style.opacity = '0.3'; // Initially transparent
chatContainer.style.transition = 'opacity 0.3s ease'; // Smooth transition for opacity
document.body.appendChild(chatContainer);

// Create chat input box
const chatInput = document.createElement('input');
chatInput.style.position = 'absolute';
chatInput.style.bottom = '10px';
chatInput.style.left = '10px';
chatInput.style.width = '300px';
chatInput.style.padding = '5px';
chatInput.style.backgroundColor = 'white';
chatInput.style.color = 'black';
chatInput.style.border = '1px solid black';
chatInput.style.opacity = '0.3'; // Initially transparent
chatInput.style.transition = 'opacity 0.3s ease'; // Smooth transition for opacity
chatInput.placeholder = 'Press Enter to chat...';
document.body.appendChild(chatInput);




// Geometry and materials for player
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const playerMesh = new THREE.Mesh(geometry, material);
scene.background = new THREE.Color(0x87CEEB);
scene.add(playerMesh);
function visualizeTrimesh(trimesh, scene) {
  const geometry = new THREE.BufferGeometry();

  // Convert the Cannon.js trimesh vertices and indices into a Three.js geometry
  const vertices = new Float32Array(trimesh.vertices);
  const indices = new Uint16Array(trimesh.indices);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  // Create a wireframe material
  const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), material);

  // Add to the scene
  scene.add(wireframe);

  return wireframe;
}
// Variable to control the Y offset of the bounding box
let boundingYOffset = 0; // Default offset is 0

// Function to load GLTF model and adjust based on bounding box
// Load the GLTF model and center the scene at y=0
const loader = new GLTFLoader();
loader.load(
  'assets/Apartment 2.glb', // Path to the GLB file
  (gltf) => {
    const glbScene = gltf.scene;

    // Scale the scene
    const scaleFactor = 500;
    glbScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
    glbScene.position.y = 50;

    // Compute bounding box
    const boundingBox = new THREE.Box3().setFromObject(glbScene);
    const sceneBottomY = boundingBox.min.y; // Bottom of the scene

    // Adjust the scene position to align its bottom at y=0

    // Traverse the scene for physics bodies
    glbScene.traverse((child) => {
      if (child.isMesh) {
        const geometry = child.geometry;

        if (geometry && geometry.attributes.position) {
          // Extract vertices and indices
          const vertices = Array.from(geometry.attributes.position.array);
          const indices = geometry.index ? Array.from(geometry.index.array) : undefined;

          // Scale vertices for Trimesh
          const scaledVertices = [];
          for (let i = 0; i < vertices.length; i += 3) {
            scaledVertices.push(
              vertices[i] * scaleFactor,
              vertices[i + 1] * scaleFactor,
              vertices[i + 2] * scaleFactor
            );
          }

          // Apply world transformation to vertices
          const position = new THREE.Vector3();
          const quaternion = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          position.y += 50;

          child.updateMatrixWorld(); // Ensure the world matrix is up to date
          child.matrixWorld.decompose(position, quaternion, scale);

          // Create the Trimesh
          const trimesh = new CANNON.Trimesh(scaledVertices, indices);

          // Create a physics body
          const body = new CANNON.Body({
            mass: 0, // Static object
            shape: trimesh,
          });

          // Position and rotate the body to match the object
          body.position.set(position.x, position.y, position.z);
          body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

          // Add the body to the physics world
          world.addBody(body);

          // Optional: Visualize the Trimesh
          // visualizeTrimesh(trimesh, scene);
        }
      }
    });

    // Add the GLTF scene to the Three.js scene
    scene.add(glbScene);

    // // Create a floor plane at y=0
    // const groundMesh = new THREE.Mesh(
    //   new THREE.PlaneGeometry(1000, 1000), // Large plane size
    //   new THREE.MeshStandardMaterial({ color: 0x808080 })
    // );
    // groundMesh.rotation.x = -Math.PI / 2; // Rotate to lie flat
    // groundMesh.position.y = 0;
    // groundMesh.receiveShadow = true;
    // groundMesh.visible = false;
    // scene.add(groundMesh);
    


    // const ceilingMesh = new THREE.Mesh(
    //   new THREE.PlaneGeometry(1000, 1000), // Large plane size
    //   new THREE.MeshStandardMaterial({ color: 0x808080 })
    // );
    // ceilingMesh.rotation.x = -Math.PI / 2; // Rotate to lie flat
    // ceilingMesh.position.y = 100;
    // ceilingMesh.receiveShadow = true;
    // ceilingMesh.visible = true;
    // scene.add(ceilingMesh);

    // // Update ground physics body
    // groundBody.position.set(0, 0, 0);
    // world.addBody(groundBody);
    
  },
  undefined,
  (error) => {
    console.error('An error occurred while loading the GLTF model:', error);
  }
);




// loader.load(
//   'assets/Pop Tarts.glb', // Path to the GLB file
//   (gltf) => {
//     gltf.scene.scale.set(25, 25, 25)
//     const glbScene = gltf.scene;
//     glbScene.traverse((child) => {
//       if (child.isMesh) {
//         child.castShadow = true;
//         child.receiveShadow = true;
//       }
//     });
//     scene.add(glbScene);
//   },
//   (xhr) => {
//     console.log((xhr.loaded / xhr.total * 100) + '% loaded');
//   },
//   (error) => {
//     console.error('An error happened while loading the .glb file:', error);
//   }
// );
// loader.load(
//   'assets/Frying Pan.glb', // Path to the GLB file
//   (gltf) => {
//     gltf.scene.scale.set(50, 50, 50)
//     const glbScene = gltf.scene;
//     glbScene.traverse((child) => {
//       if (child.isMesh) {
//         child.castShadow = true;
//         child.receiveShadow = true;
//       }
//     });
//     scene.add(glbScene);
//   },
//   (xhr) => {
//     console.log((xhr.loaded / xhr.total * 100) + '% loaded');
//   },
//   (error) => {
//     console.error('An error happened while loading the .glb file:', error);
//   }
// );
// loader.load(
//   'assets/Tea Kettle.glb', // Path to the GLB file
//   (gltf) => {
//     gltf.scene.scale.set(50, 50, 50)
//     const glbScene = gltf.scene;
//     glbScene.traverse((child) => {
//       if (child.isMesh) {
//         child.castShadow = true;
//         child.receiveShadow = true;
//       }
//     });
//     scene.add(glbScene);
//   },
//   (xhr) => {
//     console.log((xhr.loaded / xhr.total * 100) + '% loaded');
//   },
//   (error) => {
//     console.error('An error happened while loading the .glb file:', error);
//   }
// );
// loader.load(
//   'assets/Toaster.glb', // Path to the GLB file
//   (gltf) => {
//     gltf.scene.scale.set(50, 50, 50)
//     const glbScene = gltf.scene;
//     glbScene.traverse((child) => {
//       if (child.isMesh) {
//         child.castShadow = true;
//         child.receiveShadow = true;
//       }
//     });
//     scene.add(glbScene);
//   },
//   (xhr) => {
//     console.log((xhr.loaded / xhr.total * 100) + '% loaded');
//   },
//   (error) => {
//     console.error('An error happened while loading the .glb file:', error);
//   }
// );
// loader.load(
//   'assets/Kitchen Knives.glb', // Path to the GLB file
//   (gltf) => {
//     gltf.scene.scale.set(50, 50, 50)
//     const glbScene = gltf.scene;
//     glbScene.traverse((child) => {
//       if (child.isMesh) {
//         child.castShadow = true;
//         child.receiveShadow = true;
//       }
//     });
//     scene.add(glbScene);
//   },
//   (xhr) => {
//     console.log((xhr.loaded / xhr.total * 100) + '% loaded');
//   },
//   (error) => {
//     console.error('An error happened while loading the .glb file:', error);
//   }
// );




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

const spawnHeight = 0; // Adjust as needed to set initial spawn height above ground
camera.position.set(0, spawnHeight, 0); // Place the camera at a height above ground
playerMesh.position.set(0, spawnHeight, 0); // Place the player mesh at the same height
playerMesh.castShadow = true; // Cast shadows
playerMesh.receiveShadow = true; // Receive shadows
playerMesh.add(camera); // Attach camera to player mesh


const ceilingHeight = 0
const ceilingMesh = new THREE.PlaneGeometry(750, ) 

// Define boundary dimensions
const boundary = { x: 124, y: 128.5, z: 138.6 };

// Function to restrict player within bounds
function keepPlayerWithinBounds() {
  const pos = playerMesh.position;
  
  // Define different boundaries for -x and +x
  const xMin = -1000; // Boundary for -x
  const xMax = 1000;  // Boundary for +x

  const zMin = -1000
  const zMax = 1000
  // Apply the boundaries
  pos.x = THREE.MathUtils.clamp(pos.x, xMin, xMax);
  // pos.y = THREE.MathUtils.clamp(pos.y, 0, boundary.y);
  pos.z = THREE.MathUtils.clamp(pos.z, zMin, zMax);

}


// Obstacle setup with physics for Cannon.js
const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2);
const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
const obstacles = [];
const obstacleBodies = []; // Store the obstacle bodies for physics
const obstacleHealth = [];
const healthBars = [];

for (let i = 0; i < 1; i++) {
  // Create the visual obstacle mesh in Three.js
  const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle.position.set((Math.random() - 0.5) * 100, 0, (Math.random() - 0.5) * 100);
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
          console.log(obstacleBodies)
        if (obstacleBodies.length === 0) {
          endGame(); // Trigger game-end logic
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

  // Add the sphere to the scene and projectiles array
  // Remove the sphere after 10 seconds if it doesn't hit anything
  setTimeout(() => {
    if (projectiles.some((p) => p.body === sphereBody)) {
      scene.remove(sphereMesh);
      world.removeBody(sphereBody);
      projectiles = projectiles.filter((p) => p.body !== sphereBody);
    }
  }, 10000); // 10 seconds
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

function animate() {
  if (!isGameStarted) return; // Stop the game loop if the game has ended

  requestAnimationFrame(animate);

  try {
    world.step(1 / 60);

    // Debug to catch undefined body issues
    world.bodies.forEach((body, index) => {
      if (!body) {
        console.warn(`Undefined body found at index ${index}`);
      }
    });

  } catch (err) {
    console.error('Physics simulation error:', err);
  }

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
  sphereBody.velocity.set(data.velocity.x, data.velocity.y, data.velocity.z);

  // Add the sphere to the physics world and scene
  world.addBody(sphereBody);
  scene.add(sphereMesh);

  // Add to the projectiles array for updates
  projectiles.push({ mesh: sphereMesh, body: sphereBody });
});
function endGame() {
  console.log('Game over: All obstacles destroyed!');
  isGameStarted = false;

  // Display the game end screen
  const gameEndScreen = document.getElementById('gameEndScreen');
  gameEndScreen.classList.remove('hidden'); // Show the end screen
  gameEndScreen.classList.add('flex');

  // Set up return to lobby button
  const returnToLobbyButton = document.getElementById('returnToLobbyButton');
  returnToLobbyButton.addEventListener('click', () => {
    // Hide the end screen and show the lobby screen
    gameEndScreen.classList.remove('flex');
    gameEndScreen.classList.add('hidden');
    lobbyScreen.style.display = 'flex';

    // Notify the server to reset the game for all players
    socket.emit('returnToLobby', { lobbyCode });

    // Reset any game-specific variables here if needed
  });
}


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
if (chatInput && chatContainer) {
  chatInput.addEventListener('focus', () => {
    chatContainer.style.opacity = '1';
    chatInput.style.opacity = '1';
  });
}
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

