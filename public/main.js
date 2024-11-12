const socket = io();

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

// Listen for the 'lobbyFull' event to indicate when the lobby is full
socket.on('lobbyFull', () => {
  loadingMessage.innerText = 'Lobby is full! Waiting for the host to start the game.';
  createStartGameButton();
});

// Show the start game button for the host
function createStartGameButton() {
  const startButton = document.createElement('button');
  startButton.innerText = 'Start Game';
  startButton.style.position = 'absolute';
  startButton.style.top = '70%';
  startButton.style.left = '50%';
  startButton.style.transform = 'translateX(-50%)';
  startButton.style.padding = '10px 20px';
  startButton.style.fontSize = '20px';

  document.body.appendChild(startButton);

  startButton.addEventListener('click', () => {
    socket.emit('startGame');
    startButton.style.display = 'none';
    loadingMessage.style.display = 'none';
    initializeGame();
  });
}

// Assign roles to players
socket.on('assignRole', (role) => {
  isFlying = role === 'Insect';
  console.log(`Player assigned role: ${role}`);
});

// Initialize Three.js scene and animation
function initializeGame() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Sky-blue background
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; // Enable shadows
  document.body.appendChild(renderer.domElement);

  // Geometry and materials for player
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const playerMesh = new THREE.Mesh(geometry, material);
  playerMesh.castShadow = true;
  scene.add(playerMesh);

  let otherPlayers = {};

  // Set camera position and first-person view
  camera.position.set(0, 1.6, 0);
  playerMesh.add(camera);

  // Add ground map (plane)
  const groundGeometry = new THREE.PlaneGeometry(100, 100);
  const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Add obstacles
  const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2);
  const obstacleMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });

  for (let i = 0; i < 5; i++) {
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacle.position.set((Math.random() - 0.5) * 80, 1, (Math.random() - 0.5) * 80);
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    scene.add(obstacle);
  }

  // Lighting
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

  // Movement and control variables
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

  let projectiles = [];

  let mouseLocked = false;
  window.addEventListener('mousedown', (event) => {
    if (event.button === 0) shootSphere();
  });

  function shootSphere() {
    const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

    sphere.position.copy(playerMesh.position);
    sphere.position.y += 1.6;

    const velocity = new THREE.Vector3(0, 0, -1);
    velocity.applyQuaternion(camera.quaternion);
    velocity.multiplyScalar(0.5);

    scene.add(sphere);
    projectiles.push({ mesh: sphere, velocity });

    socket.emit('shoot', { position: sphere.position, velocity: velocity });
  }

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
      case 'Space': if (!isJumping) { verticalSpeed = jumpHeight; isJumping = true; } break;
      case 'ShiftLeft': flyUp = true; break;
      case 'ControlLeft': flyDown = true; break;
      case 'Escape': if (mouseLocked) { document.exitPointerLock(); mouseLocked = false; } break;
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

  function animate() {
    requestAnimationFrame(animate);

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

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i];
      projectile.mesh.position.add(projectile.velocity);

      if (projectile.mesh.position.length() > 50) {
        scene.remove(projectile.mesh);
        projectiles.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
  }

  animate();
}

socket.on('gameStarted', () => {
  loadingMessage.style.display = 'none';
  initializeGame();
});
