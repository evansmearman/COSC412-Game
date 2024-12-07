import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { io } from 'socket.io-client';
import { nanoid } from 'nanoid';
const socket = io(); // Ensure this connects to the correct server

const titleScreen = document.getElementById('titleScreen');
titleScreen.style.background = '#808080'; // Light green background
const lobbyScreen = document.querySelector('#lobbyScreen');
lobbyScreen.style.background = '#808080'; // Light green background
const playerNameInput = document.getElementById('playerNameInput');
const createLobbyButton = document.getElementById('createLobbyButton');
const joinLobbyButton = document.getElementById('joinLobbyButton');
const lobbyCodeInput = document.getElementById('lobbyCodeInput');
const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
const playerList = document.getElementById('playerList');
const startGameButton = document.getElementById('startGameButton');
const mapSelectionScreen = document.getElementById('mapSelectionScreen');
mapSelectionScreen.style.background = '#808080'; // Light green background
const backToLobbyButton = document.getElementById('backToLobbyButton');
const confirmMapButton = document.getElementById('confirmMapButton');
const leaveLobbyButton = document.getElementById('leaveLobbyButton');
const gameEndScreen = document.getElementById('gameEndScreen');
gameEndScreen.style.background = '#808080'; // Light green background
let selectedMap = '';
let finalMap = '';
let lobbyCode = '';
let playersInLobby = [];
let playerRole = '';
let playerName = ''; // Add this line to store the player's name

const scene = new THREE.Scene();
scene.background = new THREE.Color(140, 255, 115);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

document.body.style.overflow = 'hidden';

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Set gravity
world.broadphase = new CANNON.NaiveBroadphase();
world.broadphase.useBoundingBoxes = true;
world.solver.iterations = 10; // Physics solver iterations


const players = {};
let isGameStarted = false;
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
let projectiles = [];
let mouseLocked = false;

const loginButton = document.getElementById('loginButton');
const signInScreen = document.getElementById('signInScreen');
signInScreen.style.background = '#90EE90'; // Light green background
loginButton.addEventListener('click', () => {
  titleScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    titleScreen.classList.add('hidden');
    signInScreen.classList.remove('hidden', 'opacity-0');
    signInScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
  }, 500);
});
const signUpEmail = document.getElementById('signUpEmail'); // Fix element ID
const signUpPassword = document.getElementById('signUpPassword');
const signUpButton = document.getElementById('signUpButton');

signUpButton.addEventListener('click', async () => {
  if (!signUpEmail || !signUpPassword) { // Fix element ID
    alert('Sign-up elements not found.');
    return;
  }
  const email = signUpEmail.value.trim(); // Fix variable name
  const password = signUpPassword.value.trim();

  if (!email || !password) { // Fix variable name
    alert('Please fill in all fields.');
    return;
  }

  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: email, password }), // Fix variable name
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

const goToSignUp = document.getElementById('goToSignUp');
const signUpScreen = document.getElementById('signUpScreen');
signUpScreen.style.background = '#90EE90'; // Light green background

goToSignUp.addEventListener('click', () => {
  signInScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    signInScreen.classList.add('hidden');
    signUpScreen.classList.remove('hidden', 'opacity-0');
    signUpScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
  }, 500);
});

const goToSignIn = document.getElementById('goToSignIn');
goToSignIn.addEventListener('click', () => {
  signUpScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    signUpScreen.classList.add('hidden');
    signInScreen.classList.remove('hidden', 'opacity-0');
    signInScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
  }, 500);
});

const signInEmail = document.getElementById('signInEmail');
const signInPassword = document.getElementById('signInPassword');
const signInButton = document.getElementById('signInButton');

const deleteAccountButton = document.createElement('button');
deleteAccountButton.textContent = 'Delete Account';
deleteAccountButton.style.position = 'fixed';
deleteAccountButton.style.bottom = '20px';
deleteAccountButton.style.right = '20px';
deleteAccountButton.style.padding = '10px 20px';
deleteAccountButton.style.backgroundColor = '#ff0000';
deleteAccountButton.style.color = '#fff';
deleteAccountButton.style.border = 'none';
deleteAccountButton.style.borderRadius = '5px';
deleteAccountButton.style.cursor = 'pointer';
deleteAccountButton.style.display = 'none'; // Hide initially
document.body.appendChild(deleteAccountButton);

deleteAccountButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        try {
            const response = await fetch('/deleteAccount', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: playerName }),
            });

            const result = await response.json();

            if (response.ok) {
                alert('Account deleted successfully.');
                // Redirect to sign-in screen or perform other necessary actions
                signInScreen.classList.remove('hidden');
                titleScreen.classList.add('hidden');
                deleteAccountButton.style.display = 'none';
            } else {
                alert(result.message || 'Failed to delete account.');
            }
        } catch (error) {
            console.error('Error deleting account:', error.message);
            alert('An error occurred. Please try again.');
        }
    }
});

signInButton.addEventListener('click', async () => {
  if (!signInEmail || !signInPassword) {
    alert('Sign-in elements not found.');
    return;
  }
  const email = signInEmail.value.trim();
  const password = signInPassword.value.trim();

  if (!email || !password) {
    alert('Please fill in all fields.');
    return;
  }

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: email, password }),
    });

    const result = await response.json();

    if (response.ok) {
      alert('Login successful!');
      playerName = email; // Set the player's name to their username
      // document.getElementById('playerNameDisplay').textContent = `Welcome, ${playerName}`; // Display the player's name
      signInScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
      setTimeout(() => {
        signInScreen.classList.add('hidden');
        titleScreen.classList.remove('hidden', 'opacity-0');
        titleScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
        playerNameInput.value = `Hello, ${playerName}`; // Set the welcome message in the name input
        deleteAccountButton.style.display = 'block'; // Show delete account button
      }, 500);
    } else {
      alert(result.message || 'Login failed.');
    }
  } catch (error) {
    console.error('Error during login:', error);
    alert('An error occurred. Please try again.');
  }
});

const returnToTitleFromSignIn = document.getElementById('returnToTitleFromSignIn');
const returnToTitleFromSignUp = document.getElementById('returnToTitleFromSignUp');

returnToTitleFromSignIn.addEventListener('click', () => {
  signInScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    signInScreen.classList.add('hidden');
    titleScreen.classList.remove('hidden', 'opacity-0');
    titleScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
  }, 500);
});

returnToTitleFromSignUp.addEventListener('click', () => {
  signUpScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    signUpScreen.classList.add('hidden');
    titleScreen.classList.remove('hidden', 'opacity-0');
    titleScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
  }, 500);
});

createLobbyButton.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    alert('Please enter your name.');
    return;
  }

  lobbyCode = nanoid(6).toUpperCase();
  socket.emit('createLobby', { playerName, lobbyCode });

  titleScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    titleScreen.classList.add('hidden');
    mapSelectionScreen.classList.remove('hidden', 'opacity-0');
    mapSelectionScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
  }, 500);
});

backToLobbyButton.addEventListener('click', () => {
  mapSelectionScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    mapSelectionScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden', 'opacity-0');
    lobbyScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
  }, 500);
  socket.emit('backToLobby', lobbyCode);
});

leaveLobbyButton.addEventListener('click', () => {
  lobbyScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    lobbyScreen.classList.add('hidden');
    titleScreen.classList.remove('hidden', 'opacity-0');
    titleScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
  }, 500);
  socket.emit('leaveLobby', lobbyCode);
});

document.querySelectorAll('.map-option').forEach((mapOption) => {
  mapOption.addEventListener('click', () => {
    document.querySelectorAll('.map-option').forEach((option) => {
      option.classList.remove('border-4', 'border-green-500');
    });
    mapOption.classList.add('border-4', 'border-green-500');
    selectedMap = mapOption.dataset.map;
    confirmMapButton.disabled = false;
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

  socket.emit('joinLobby', { playerName, lobbyCode: code });

  titleScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    titleScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden', 'opacity-0');
    lobbyScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
  }, 500);
});

confirmMapButton.addEventListener('click', () => {
  socket.emit('mapSelected', { lobbyCode, map: selectedMap });
  mapSelectionScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    mapSelectionScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden', 'opacity-0');
    lobbyScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
    lobbyCodeDisplay.textContent = lobbyCode;
  }, 500);
});
socket.on('mapSelected', ({ map }) => {
  finalMap = map;
  console.log("Map selection complete");
  console.log(map);
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

        glbScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
        glbScene.position.y = positionY;

        const boundingBox = new THREE.Box3().setFromObject(glbScene);
        console.log("Bounding Box:", boundingBox.min, boundingBox.max);

        const boxHelper = new THREE.Box3Helper(boundingBox, 0xff0000);
        scene.add(boxHelper);

        glbScene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const geometry = child.geometry;
            if (geometry && geometry.attributes.position) {
              const vertices = Array.from(geometry.attributes.position.array);
              const indices = geometry.index
                ? Array.from(geometry.index.array)
                : undefined;

              const scaledVertices = vertices.map((v, i) =>
                i % 3 === 1 ? v * scaleFactor : v * scaleFactor
              );

              const position = new THREE.Vector3();
              const quaternion = new THREE.Quaternion();
              const scale = new THREE.Vector3();
              child.updateMatrixWorld();
              child.matrixWorld.decompose(position, quaternion, scale);

              const trimesh = new CANNON.Trimesh(scaledVertices, indices);
              const body = new CANNON.Body({
                mass: 0,
                shape: trimesh,
              });

              body.position.set(position.x, position.y, position.z);
              body.quaternion.set(
                quaternion.x,
                quaternion.y,
                quaternion.z,
                quaternion.w
              );

              world.addBody(body);

              visualizeTrimesh(trimesh, scene, map);
            }
          }
        });

        scene.add(glbScene);
        console.log(`Map "${map}" loaded successfully.`);
        resolve();
      },
      undefined,
      (error) => {
        reject(error);
      }
    );
  });
}

startGameButton.addEventListener('click', () => {
  console.log("hit")
  socket.emit('startGame', { lobbyCode });
});

socket.on('lobbyUpdate', ({ players, host }) => {
  playerList.innerHTML = '';

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

  if (socket.id === host) {
    startGameButton.style.display = 'block';
  } else {
    startGameButton.style.display = 'none';
  }

  console.log('Lobby updated:', players);
});

const gameMusic = document.getElementById('gameMusic');
gameMusic.volume = 0.1;

socket.on('gameStart', (data) => {
  const { players, map } = data;

  console.log("Game starting event received:", data);
  isGameStarted = true;
loadMap(map).then(() => {
console.log(`Map "${map}" loaded successfully.`);   

spawnPowerUps(5)
})
  lobbyScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    lobbyScreen.classList.add('hidden');
  }, 500);

  gameMusic.play().catch((error) => {
    console.error("Error playing music:", error);
  });

  players.forEach((player) => {
    if (player.id !== socket.id) {
      addNewPlayer(player.id, player.role);
      console.log("HERE IT IS")
    }
    console.log(`Player ${player.name} loaded with role: ${player.role}`);
  });

  chatContainer.style.display = 'flex'; // Show chat container when the game starts
  chatInput.style.display = 'block'; // Show chat input when the game starts
  chatInput.disabled = false; // Enable chat input when the game starts

  animate();
});

socket.on('updatePlayerPositions', (data) => {
  data.forEach(({ id, position }) => {
    if (id !== socket.id) {
      if (!players[id]) {
        players[id] = createPlayerMesh();
        scene.add(players[id]);
      }
      players[id].position.set(position.x, players[id].position.y, position.z); // Only update x and z coordinates
      console.log(`Player ${id} moved to position:`, position);
    }
  });
});

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

const groundBody = new CANNON.Body({ mass: 0 });
const groundShape = new CANNON.Plane();
console.log(groundShape)
groundBody.addShape(groundShape);
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
groundBody.position.set(0, -23, 0)
world.addBody(groundBody);

const chatContainer = document.createElement('div');
chatContainer.style.position = 'fixed';
chatContainer.style.bottom = '80px';
chatContainer.style.left = '20px';
chatContainer.style.width = '320px';
chatContainer.style.height = '240px';
chatContainer.style.backgroundColor = 'rgba(20, 20, 20, 0.9)';
chatContainer.style.borderRadius = '12px';
chatContainer.style.border = '2px solid #444';
chatContainer.style.overflowY = 'auto';
chatContainer.style.padding = '15px';
chatContainer.style.color = '#f0f0f0';
chatContainer.style.fontSize = '14px';
chatContainer.style.display = 'flex';
chatContainer.style.flexDirection = 'column';
chatContainer.style.gap = '10px';
chatContainer.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.6)';
chatContainer.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
chatContainer.style.transform = 'scale(0.95)';
chatContainer.style.opacity = '0.3';
chatContainer.style.display = 'none'; // Hide chat container initially

chatContainer.addEventListener('mouseenter', () => {
chatContainer.style.opacity = '1';
chatContainer.style.transform = 'scale(1)';
});
chatContainer.addEventListener('mouseleave', () => {
chatContainer.style.opacity = '0.3';
chatContainer.style.transform = 'scale(0.95)';
});

document.body.appendChild(chatContainer);

const chatInput = document.createElement('input');
chatInput.style.position = 'fixed';
chatInput.style.bottom = '20px';
chatInput.style.left = '20px';
chatInput.style.width = '320px';
chatInput.style.height = '50px';
chatInput.style.padding = '10px';
chatInput.style.backgroundColor = '#222';
chatInput.style.color = '#f0f0f0';
chatInput.style.border = '2px solid #444';
chatInput.style.borderRadius = '12px';
chatInput.style.outline = 'none';
chatInput.style.fontSize = '16px';
chatInput.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.4)';
chatInput.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
chatInput.style.transform = 'scale(0.95)';
chatInput.style.opacity = '0.3';
chatInput.placeholder = 'Type your message here...';
chatInput.disabled = true; // Disable chat input initially
chatInput.style.display = 'none'; // Hide chat input initially
document.body.appendChild(chatInput);

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

  const wiremeshBody = new CANNON.Body({
      mass: 0,
      collisionFilterGroup: 0b10,
      collisionFilterMask: 0b01,
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
const powerUpPosition = new THREE.Vector3((Math.random() - 0.5) * 100, 3, (Math.random() - 0.5) * 100);

function createGlowEffect(position) {
  const glowGeometry = new THREE.SphereGeometry(3, 32, 32);
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      viewVector: { type: "v3", value: camera.position },
      c: { type: "f", value: 0.5 },
      p: { type: "f", value: 2.0 },
      glowColor: { type: "c", value: new THREE.Color(0xffcc00) },
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
  glowMesh.scale.set(1.2, 1.2, 1.2);
  return glowMesh;
}
const spawnBoundaries = {
  xMin: -150,
  xMax: 175.9,
  yMin: 1,
  yMax: 10,
  zMin: -178.8,
  zMax: 179,
};

const powerUps = [];

function spawnPowerUps(count) {
for (let i = 0; i < count; i++) {
  const position = new THREE.Vector3(
    THREE.MathUtils.randFloat(spawnBoundaries.xMin, spawnBoundaries.xMax),
    THREE.MathUtils.randFloat(spawnBoundaries.yMin, spawnBoundaries.yMax),
    THREE.MathUtils.randFloat(spawnBoundaries.zMin, spawnBoundaries.zMax)
  );

  loader.load(
    'assets/Pickup Thunder.glb',
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

      powerUps.push({ mesh: powerUpMesh, body: powerUpBody });
    },
    undefined,
    (error) => {
      console.error('Error loading power-up model:', error);
    }
  );
}
}

const visualizePhysicsBody = () => {
  const geometry = new THREE.SphereGeometry(10, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
  const wireframe = new THREE.Mesh(geometry, material);
  wireframe.position.copy(powerUpPosition);
  scene.add(wireframe);
};

// visualizePhysicsBody();

function checkPowerUpCollision() {
  powerUps.forEach((powerUp, index) => {
    if (!powerUp || !powerUp.mesh || !powerUp.body) return;

    const distance = playerMesh.position.distanceTo(powerUp.mesh.position);
    if (distance < 5) {
      collectPowerUp(index);
    }
  });
}

function collectPowerUp(index) {
  const powerUp = powerUps[index];
  if (!powerUp) return;

  const effectGeometry = new THREE.SphereGeometry(5, 32, 32);
  const effectMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.7 });
  const effect = new THREE.Mesh(effectGeometry, effectMaterial);
  effect.position.copy(powerUp.mesh.position);
  scene.add(effect);

  setTimeout(() => {
    scene.remove(effect);
  }, 500);

  scene.remove(powerUp.mesh);
  world.removeBody(powerUp.body);

  powerUps.splice(index, 1);

  boostPlayerSpeed();

  console.log(`Power-up collected: index ${index}`);
}
function boostPlayerSpeed() {
  const originalSpeed = playerSpeed;
  playerSpeed = 20;

  setTimeout(() => {
    playerSpeed = originalSpeed;
  }, 7000);

  console.log('Speed boost activated!');
}
function animateGlowEffect(glowMesh) {
  const scale = 1 + 0.1 * Math.sin(Date.now() * 0.005);
  glowMesh.scale.set(scale, scale, scale);
}
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.color.setHSL(0.1, 1, 0.95);
dirLight.position.set(-1, 1.75, 1).multiplyScalar(30);
dirLight.castShadow = true;

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
const d = 10000;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 1000;
dirLight.shadow.bias = -0.0001;
scene.add(dirLight);

const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 10);
scene.add(dirLightHelper);

const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0xffffff, 0.5);
hemiLight.color.setHSL(0.6, 1, 0.6);
hemiLight.groundColor.setHSL(0.0001, 1, 0.75);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

playerMesh.castShadow = true;
playerMesh.receiveShadow = true;

const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -23;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

let otherPlayers = {};

const spawnHeight = 0;
camera.position.set(0, spawnHeight+ 2, 0);
playerMesh.position.set(0, spawnHeight, 0);
playerMesh.castShadow = true;
playerMesh.receiveShadow = true;
playerMesh.add(camera);

const playerRadius = 1;
const playerBody = new CANNON.Body({
    mass: 5,
    shape: new CANNON.Sphere(playerRadius),
    position: new CANNON.Vec3(0, spawnHeight + 1, 0),
    collisionFilterGroup: 0b01,
    collisionFilterMask: 0b10,
});
world.addBody(playerBody);

const boundary = { x: 124, y: 128.5, z: 138.6 };

function keepPlayerWithinBounds() {
  const pos = playerMesh.position;
  
  const xMin = -150;
  const xMax = 175.9;

  const zMin = -178.8
  const zMax = 179
  pos.x = THREE.MathUtils.clamp(pos.x, xMin, xMax);
  pos.y = THREE.MathUtils.clamp(pos.y, 0, boundary.y);
  pos.z = THREE.MathUtils.clamp(pos.z, zMin, zMax);

}

document.addEventListener('mousemove', (event) => {
  if (mouseLocked) {
      const sensitivity = 0.002;
      yaw -= event.movementX * sensitivity;
      pitch -= event.movementY * sensitivity;

      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

      playerBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
      camera.rotation.x = pitch;
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
  if (event.button === 0 && isGameStarted) shootSphere();
});

function shootSphere() {
    const sphereRadius = 1.1;
    const sphereMass = 0.1;
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  
    const startPosition = new THREE.Vector3();
    camera.getWorldPosition(startPosition);
    const forwardDirection = new THREE.Vector3();
    camera.getWorldDirection(forwardDirection);
    sphereMesh.position.copy(startPosition.add(forwardDirection.multiplyScalar(3)));
  
    scene.add(sphereMesh);
  
    const sphereShape = new CANNON.Sphere(sphereRadius);
    const sphereBody = new CANNON.Body({
        mass: sphereMass,
        shape: sphereShape,
        position: new CANNON.Vec3(
            sphereMesh.position.x,
            sphereMesh.position.y,
            sphereMesh.position.z
        ),
        collisionFilterGroup: 0b10,
        collisionFilterMask: 0b01 | 0b10,
    });
  
    world.addBody(sphereBody);
  
    const velocity = forwardDirection.multiplyScalar(150);
    sphereBody.velocity.set(velocity.x, velocity.y, velocity.z);
  
    projectiles.push({ mesh: sphereMesh, body: sphereBody });
  
    sphereBody.addEventListener('collide', (event) => {
      const collidedBody = event.body;
  
      Object.values(otherPlayers).forEach((player) => {
        if (player.body === collidedBody) {
          const playerId = Object.keys(otherPlayers).find(
            (id) => otherPlayers[id].body === collidedBody
          );
  
          player.health -= 20;
          updateHealthBar(playerId);
  
          console.log(`Player ${playerId} hit! Health: ${player.health}`);
  
          createParticleEffect(player.mesh.position);
  
          if (player.health <= 0) {
            removePlayer(playerId);
          }
        }
      });
  
      removeProjectile(sphereMesh, sphereBody);
    });
    socket.emit('updateStats', { username: 'PlayerName', shotsFired: 1 });
    setTimeout(() => {
      removeProjectile(sphereMesh, sphereBody);
    }, 10000);
  }

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

  projectiles = projectiles.filter((p) => p.body !== body);
}

function updateHealthBar(playerId) {
  const player = otherPlayers[playerId];
  if (!player) return;

  const healthPercentage = Math.max(0, player.health / 100);

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

function createParticleEffect(position) {
  const particleCount = 30;
  const particles = new THREE.Group();

  for (let i = 0; i < particleCount; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x8B0000 });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    particle.position.copy(position);
    
    particle.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.25) * 2,
      (Math.random() - 0.5) * 4
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
      particle.material.opacity -= 0.03;
    });

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
const barGeometry = new THREE.PlaneGeometry(1.5, 0.2);
const barMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const healthBar = new THREE.Mesh(barGeometry, barMaterial);

healthBar.position.set(0, 1.5, 0);
playerMesh.add(healthBar);

playerHealth[playerMesh.id] = initialHealth;
healthBars[playerMesh.id] = healthBar;
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];

    if (!projectile || !projectile.mesh || !projectile.body) {
      projectiles.splice(i, 1);
      continue;
    }

    projectile.mesh.position.copy(projectile.body.position);
    projectile.mesh.quaternion.copy(projectile.body.quaternion);

    if (projectile.mesh.position.length() > 1000) {
      scene.remove(projectile.mesh);
      world.removeBody(projectile.body);
      projectiles.splice(i, 1);
    }
  }
}
playerBody.collisionResponse = true;
playerBody.allowSleep = false;
playerBody.collisionFilterGroup = 0b01;
playerBody.collisionFilterMask = 0b10;
playerBody.linearDamping = 0.1;

playerBody.ccdMotionThreshold = 1;
playerBody.ccdSweptSphereRadius = playerRadius;

playerBody.angularDamping = 0.9;

playerBody.fixedRotation = true;
playerBody.updateMassProperties();
function handlePlayerMovement() {
    const flySpeed = 20; // Increased fly speed
    playerBody.velocity.x = 0;
    playerBody.velocity.z = 0;

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(camera.up, cameraDirection).normalize();

    const moveDirection = new THREE.Vector3();

    if (moveForward) moveDirection.add(cameraDirection);
    if (moveBackward) moveDirection.add(cameraDirection.negate());
    if (moveLeft) moveDirection.add(cameraRight);
    if (moveRight) moveDirection.add(cameraRight.negate());

    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.multiplyScalar(playerSpeed);
    }

    if (playerRole === 'Insect') {
        if (flyUp) moveDirection.y += flySpeed;
        if (flyDown) moveDirection.y -= flySpeed;
        moveDirection.multiplyScalar(2); // Double the speed for flies
    }

    const newPosition = new CANNON.Vec3().copy(playerBody.position).vadd(moveDirection);
    if (!isCollidingWithMap(newPosition)) {
        playerBody.velocity.x = moveDirection.x;
        playerBody.velocity.y = moveDirection.y;
        playerBody.velocity.z = moveDirection.z;

        if (playerRole !== 'Insect') {
            playerBody.velocity.y = 0;
        }
    }

    playerBody.angularVelocity.set(0, 0, 0);
}

function isCollidingWithMap(position) {
    return false;
}

let isWindowFocused = true;

window.addEventListener('blur', () => {
  isWindowFocused = false;
});

window.addEventListener('focus', () => {
  isWindowFocused = true;
});

function animate() {
if (!isGameStarted) return;

requestAnimationFrame(animate);

if (!isWindowFocused) return;

try {
  world.step(1 / 60);

  Object.values(otherPlayers).forEach((player) => {
    if (player.updateHitbox) {
      player.updateHitbox();
    }
    if (player.mixer) {
      player.mixer.update(1 / 60);
    }
  });

  updatePlayerPhysics();
  handlePlayerMovement();
  keepPlayerWithinBounds();

  updateProjectiles();

  if (powerUps.length > 0) {
    checkPowerUpCollision();
  }

  powerUps.forEach((powerUp) => {
    if (powerUp.glowMesh) {
      animateGlowEffect(powerUp.glowMesh);
    }
  });

  socket.emit('move', { position: playerMesh.position, isFlying });

  renderer.render(scene, camera);
} catch (err) {
  console.error('Error in animation loop:', err);
}
}

socket.on('shoot', (data) => {
  const sphereRadius = 1.1;
  const sphereMass = 0.1;

  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 8, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereMesh.position.copy(data.position);

  const sphereShape = new CANNON.Sphere(sphereRadius);
  const sphereBody = new CANNON.Body({ mass: sphereMass });
  sphereBody.addShape(sphereShape);
  sphereBody.position.set(data.position.x, data.position.y, data.position.z);

  sphereBody.velocity.set(data.velocity.x, Math.max(data.velocity.y, 0), data.velocity.z);

  world.addBody(sphereBody);
  scene.add(sphereMesh);

  projectiles.push({ mesh: sphereMesh, body: sphereBody });
  console.log(`Player ${data.id} shot from position:`, data.position, 'with velocity:', data.velocity);
});
function clearScene() {
  while (scene.children.length > 0) {
    const object = scene.children[0];
    scene.remove(object);

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
  gameMusic.pause();
  gameMusic.currentTime = 0;

  const playerWon = playerRole === 'Human' ? isWinner : !isWinner;

  socket.emit('endGame', { isWinner: playerWon });
  if (isWinner) {
    socket.emit('updateStats', { username: 'PlayerName', wins: 1 });
  }

  showEndGameScreen(playerWon);
}

socket.on('endGame', ({ isWinner }) => {
  console.log(`Game ended. You ${isWinner ? "won!" : "lost!"}`);
  isGameStarted = false;

  showEndGameScreen(isWinner);
});

function showEndGameScreen(isWinner) {
  const gameEndScreen = document.getElementById('gameEndScreen');
  const gameResultTitle = document.getElementById('gameResultTitle');
  const gameResultMessage = document.getElementById('gameResultMessage');

  if (isWinner) {
    gameResultTitle.textContent = "🏆 Congratulations!";
    gameResultMessage.textContent = "You Won!";
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 }
    });
  } else {
    gameResultTitle.textContent = "💔 Game Over";
    gameResultMessage.textContent = "You Lost!";
  }

  gameEndScreen.classList.remove('hidden', 'opacity-0');
  gameEndScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');

  document.getElementById('returnToTitleButton').addEventListener('click', () => {
    gameEndScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => {
      gameEndScreen.classList.add('hidden');
      titleScreen.classList.remove('hidden', 'opacity-0');
      titleScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
      resetGame();
    }, 500);
  });

  document.getElementById('playAgainButton').addEventListener('click', () => {
    gameEndScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => {
      gameEndScreen.classList.add('hidden');
      lobbyScreen.classList.remove('hidden', 'opacity-0');
      lobbyScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
      resetGame();
      socket.emit('playAgain', { lobbyCode });
    }, 500);
  });
}

socket.on('endGame', ({ isWinner }) => {
  console.log(`Game ended. You ${isWinner ? "won!" : "lost!"}`);
  isGameStarted = false;

  showEndGameScreen(isWinner);
});

function resetRenderer() {
  renderer.clear();
}  
function resetGame() {
  otherPlayers = {};
  playersInLobby = [];
  playerRole = '';
  lobbyCode = '';

  projectiles.forEach(({ mesh, body }) => {
    if (scene.children.includes(mesh)) scene.remove(mesh);
    if (world.bodies.includes(body)) world.removeBody(body);
  });
  projectiles = [];

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

socket.on('playerMoved', (data) => {
  const { id, position } = data;
  if (id !== socket.id && otherPlayers[id]) {
      console.log(position)
      otherPlayers[id].body.position.set(position.x, position.y, position.z);
      otherPlayers[id].mesh.position.set(position.x, position.y, position.z);
      console.log(`Player ${id} moved to position:`, position);

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
roleDisplay.style.display = 'none';
document.body.appendChild(roleDisplay);

function showRoleDisplay(role) {
    roleDisplay.textContent = `You are a ${role}`;
    roleDisplay.style.display = 'block';
    setTimeout(() => {
        roleDisplay.style.display = 'none';
    }, 5000);
}

socket.on('assignRole', (role) => {
  isFlying = role === 'Insect';
  const loader = new GLTFLoader();

  showRoleDisplay(role);

  if (role === 'Insect') {
      let flyMixer;
      loader.load(
          'assets/CharacterFly.glb',
          (gltf) => {
              const flyModel = gltf.scene;
              flyModel.scale.set(1, 1, 1);
              flyModel.position.set(playerBody.position.x, playerBody.position.y, playerBody.position.z);
              flyModel.rotation.y = Math.PI;
              flyModel.traverse((child) => {
                  if (child.isMesh) {
                      child.castShadow = true;
                      child.receiveShadow = true;
                  }
              });

              if (playerMesh.parent) {
                  scene.remove(playerMesh);
              }
              playerMesh = flyModel;
              scene.add(playerMesh);

              const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.2, 0.5));
              playerBody.addShape(shape);

              playerMesh.add(camera);
              camera.position.set(0, 2, 0);
              camera.rotation.set(0, Math.PI/1, 0);
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
          'assets/CharacterHuman.glb',
          (gltf) => {
              const humanModel = gltf.scene;
              humanModel.scale.set(1, 1, 1);
              humanModel.position.set(playerBody.position.x, playerBody.position.y, playerBody.position.z);
              humanModel.rotation.set(0, 0, 0)
              humanModel.traverse((child) => {
                  if (child.isMesh) {
                      child.castShadow = true;
                      child.receiveShadow = true;
                  }
              });

              if (playerMesh.parent) {
                  scene.remove(playerMesh);
              }
              playerMesh = humanModel;
              scene.add(playerMesh);

              const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
              playerBody.addShape(shape);

              playerMesh.add(camera);
              camera.position.set(0, 75, 8);
              camera.rotation.set(0, Math.PI/1, 0);

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
    model.scale.set(data === 'Insect' ? 2: 1, data === 'Insect' ? 2: 1, data === 'Insect' ? 2: 1);
    model.position.set(0, 0, 0);

    scene.add(model);

    const playerShape = new CANNON.Sphere(5);
    const playerBody = new CANNON.Body({
        mass: 5,
        shape: playerShape,
        position: new CANNON.Vec3(0, 1, 0),
        collisionFilterGroup: 0b01,
        collisionFilterMask: 0b10 | 0b01,
    });
    world.addBody(playerBody);
model.position.set(
playerBody.position.x,
playerBody.position.y,
playerBody.position.z
    );

    let mixer = null;
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[1]);
      action.play();
    }

    otherPlayers[id] = {
      mesh: model,
      body: playerBody,
      health: 100,
      role: data,
      mixer,
    };

    createHealthBar(model);

    const updateHitbox = () => {
      model.position.copy(playerBody.position);
      model.quaternion.copy(playerBody.quaternion);

      if (mixer) {
        mixer.update(1 / 60);
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
const hitboxMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
const hitboxGeometry = new THREE.BoxGeometry(2, 2, 2);
const hitboxMesh = new THREE.LineSegments(
  new THREE.EdgesGeometry(hitboxGeometry),
  hitboxMaterial
);

const updateHitbox = () => {
  hitboxMesh.position.copy(playerBody.position);
  hitboxMesh.quaternion.copy(playerBody.quaternion);
};

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
  endGame(false);
} else if (insectsAlive === 0) {
  endGame(true);
}
} 

if (chatInput && chatContainer) {
  chatInput.addEventListener('focus', () => {
    chatContainer.style.opacity = '1';
    chatContainer.style.transform = 'scale(1)';
    chatInput.style.opacity = '1';
    chatInput.style.transform = 'scale(1)';
  });
}

chatInput.addEventListener('blur', () => {
if (chatInput.value.trim() === '') {
  chatContainer.style.opacity = '0.3';
  chatContainer.style.transform = 'scale(0.95)';
  chatInput.style.opacity = '0.3';
  chatInput.style.transform = 'scale(0.95)';
}
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && document.activeElement !== chatInput) {
    chatInput.focus();
  }
});

chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && chatInput.value.trim() !== '') {
    const message = chatInput.value;
    socket.emit('chatMessage', { id: socket.id, message });
    addChatMessage('Me', message);
    chatInput.value = '';
    chatInput.blur();
  }
});

function addChatMessage(sender, message) {
  const messageElement = document.createElement('div');
  messageElement.textContent = `${sender}: ${message}`;
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

  socket.on('chatMessage', (data) => {
      addChatMessage(`Player ${data.id}`, data.message);
  });

window.addEventListener( 'resize', onWindowResize );

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}


const buttonClickSound = new Audio('assets/click.mp3');
const buttonHoverSound = new Audio('assets/click.mp3');

function addButtonSoundEffects(button) {
  button.addEventListener('click', () => {
    buttonClickSound.currentTime = 0; // Reset playback position
    buttonClickSound.play();
  });
  button.addEventListener('mouseover', () => {
    buttonHoverSound.currentTime = 0; // Reset playback position
    buttonHoverSound.play();
  });
}

// Apply sound effects to all buttons
document.querySelectorAll('button').forEach(addButtonSoundEffects);

const settingsScreen = document.getElementById('settingsScreen');
const volumeSlider = document.getElementById('volumeSlider');
const colorPicker = document.getElementById('colorPicker');
const applySettingsButton = document.getElementById('applySettingsButton');
const openSettingsButton = document.getElementById('openSettingsButton');
const closeSettingsButton = document.getElementById('closeSettingsButton');

openSettingsButton.addEventListener('click', () => {
  titleScreen.classList.add('hidden');
  settingsScreen.style.background = '#808080'; // Gray background
  settingsScreen.classList.remove('hidden', 'opacity-0');
  settingsScreen.classList.add('flex', 'opacity-100', 'transition-opacity', 'duration-500');
});

closeSettingsButton.addEventListener('click', () => {
  settingsScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
  setTimeout(() => {
    settingsScreen.classList.add('hidden');
    titleScreen.classList.remove('hidden');
  }, 500);
});

applySettingsButton.addEventListener('click', () => {
  const volume = volumeSlider.value;
  const color = colorPicker.value;

  gameMusic.volume = volume;
  document.body.style.backgroundColor = color;

  titleScreen.style.background = color;
  lobbyScreen.style.background = color;
  mapSelectionScreen.style.background = color;
  gameEndScreen.style.background = color;
  signInScreen.style.background = color;
  signUpScreen.style.background = color;

  settingsScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');

  settingsScreen.classList.add('hidden');
  titleScreen.classList.remove('hidden');

  setTimeout(() => {
    settingsScreen.classList.add('hidden');
  }, 500);
});
