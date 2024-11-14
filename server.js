import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {};
let lobby = [];
const LOBBY_SIZE = 1; // Define the size of the lobby before starting the game

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Add new player to the lobby
    lobby.push(socket.id);
    players[socket.id] = {
        position: { x: 0, y: 0, z: 0 },
        role: null,  // Role will be assigned when the lobby is full
    };

    // Send the current players list to the newly connected player
    socket.emit('currentPlayers', players);

    // Broadcast new player to others
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Check if the lobby is full
    if (lobby.length === LOBBY_SIZE) {
        io.emit('lobbyFull'); // Notify players that the lobby is full
        assignRoles(); // Assign roles and start the game
    }

    // When player moves, update the position
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].position = data.position;
            // Broadcast updated position to other players
            socket.broadcast.emit('playerMoved', { id: socket.id, position: data.position });
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        lobby = lobby.filter(playerId => playerId !== socket.id); // Remove from lobby
        io.emit('playerDisconnected', socket.id);

        // Optionally handle lobby reset if necessary
        if (lobby.length < LOBBY_SIZE) {
            console.log('Lobby is no longer full. Waiting for more players...');
        }
    });
    socket.on('shoot', (data) => {
        // Broadcast the shoot event to all other players
        socket.broadcast.emit('shoot', {
            id: socket.id,
            position: data.position,
            velocity: data.velocity,
        });
    });
    
});


// Function to assign roles to players
function assignRoles() {
    console.log('Assigning roles to players...');
    let roleIndex = 0;
    const roles = ['Human', 'Insect']; // Define the available roles

    // Assign roles to players in the lobby
    lobby.forEach((playerId) => {
        const role = roles[roleIndex];
        players[playerId].role = role;
        io.to(playerId).emit('assignRole', role); // Send the role to the client
        roleIndex = (roleIndex + 1) % roles.length; // Alternate between roles
    });

    // Start the game
    startGame();
}

// Function to start the game
function startGame() {
    console.log('Starting the game...');
    io.emit('startGame'); // Notify all players to start the game
    // Additional game initialization logic can go here
}

// Start the server
server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
