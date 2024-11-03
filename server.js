import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {};
let lobby = [];
const LOBBY_SIZE = 4; // Define the size of the lobby before starting the game

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Add new player to the lobby
    lobby.push(socket.id);
    players[socket.id] = {
        position: { x: 0, y: 0, z: 0 },
    };

    // Send the current players list to the newly connected player
    socket.emit('currentPlayers', players);

    // Broadcast new player to others
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Check if the lobby is full
    if (lobby.length === LOBBY_SIZE) {
        io.emit('lobbyFull'); // Notify players that the lobby is full
        startGame(); // Start the game
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
});

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
