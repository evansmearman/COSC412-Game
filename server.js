import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid'; // To generate unique lobby codes

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const LOBBY_SIZE = process.env.LOBBY_SIZE || 2;

// Data structures for managing lobbies and players
let lobbies = {}; // { lobbyCode: { players: [], host: socketId } }
let players = {}; // { socketId: { name: string, position: {x, y, z}, role: null, lobbyCode: string } }

// Socket.io connection

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Handle lobby creation
    socket.on('createLobby', ({ playerName, lobbyCode }) => {
        if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
            socket.emit('error', 'Invalid player name.');
            return;
        }
        if (lobbies[lobbyCode]) {
            socket.emit('error', 'Lobby code already exists.');
            return;
        }

        lobbies[lobbyCode] = { players: [{ id: socket.id, name: playerName }], host: socket.id };
        players[socket.id] = {
            name: playerName,
            position: { x: 0, y: 0, z: 0 },
            role: null,
            lobbyCode,
        };
        socket.join(lobbyCode);
        socket.emit('lobbyCreated', { lobbyCode, players: lobbies[lobbyCode].players });
        console.log(`Lobby created: ${lobbyCode}`);
    });

    // Handle joining a lobby
    socket.on('joinLobby', ({ playerName, lobbyCode }) => {
        if (!lobbies[lobbyCode]) {
            socket.emit('error', 'Lobby not found.');
            return;
        }
        if (lobbies[lobbyCode].players.length >= LOBBY_SIZE) {
            socket.emit('error', 'Lobby is full.');
            return;
        }

        lobbies[lobbyCode].players.push({ id: socket.id, name: playerName });
        players[socket.id] = {
            name: playerName,
            position: { x: 0, y: 0, z: 0 },
            role: null,
            lobbyCode,
        };
        socket.join(lobbyCode);


        io.to(lobbyCode).emit('updateLobby', { players: lobbies[lobbyCode].players });
        console.log(lobbies[lobbyCode].players)

        socket.emit('lobbyJoined', { lobbyCode, players: lobbies[lobbyCode].players });

        console.log(`Player ${playerName} joined lobby: ${lobbyCode}`);
    });


    // Handle starting the game
    socket.on('startGame', ({ lobbyCode }) => {
        if (lobbies[lobbyCode]?.host === socket.id) {
            assignRoles(lobbyCode);
            const lobbyPlayers = lobbies[lobbyCode].players.map((player) => ({
                id: player.id,
                name: player.name,
                role: players[player.id].role,
            }));
            io.to(lobbyCode).emit('gameStart', { players: lobbyPlayers });
            console.log(`Game started in lobby: ${lobbyCode}`);
        } else {
            socket.emit('error', 'Only the host can start the game.');
        }
    });

    // Handle player movement
    socket.on('move', (data) => {
        const player = players[socket.id];
        if (player && isValidPosition(data.position)) {
            player.position = data.position;
            io.to(player.lobbyCode).emit('playerMoved', { id: socket.id, position: data.position });
        }
    });

    // Handle shooting
    socket.on('shoot', (data) => {
        const player = players[socket.id];
        if (player && isValidPosition(data.position) && isValidPosition(data.velocity)) {
            io.to(player.lobbyCode).emit('shoot', {
                id: socket.id,
                position: data.position,
                velocity: data.velocity,
            });
        }
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
        const player = players[socket.id];
        if (player && typeof data.message === 'string' && data.message.trim().length > 0) {
            const sanitizedMessage = sanitizeMessage(data.message);
            io.to(player.lobbyCode).emit('chatMessage', {
                id: socket.id,
                message: sanitizedMessage,
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        const player = players[socket.id];
        if (player) {
            const { lobbyCode } = player;
            const lobby = lobbies[lobbyCode];
            if (lobby) {
                lobby.players = lobby.players.filter((p) => p.id !== socket.id);
                if (lobby.host === socket.id && lobby.players.length > 0) {
                    lobby.host = lobby.players[0].id;
                    io.to(lobbyCode).emit('updateLobby', { players: lobby.players, newHost: lobby.host });
                    console.log(`New host for lobby ${lobbyCode}: ${lobby.host}`);
                } else if (lobby.players.length === 0) {
                    delete lobbies[lobbyCode];
                } else {
                    io.to(lobbyCode).emit('updateLobby', { players: lobby.players });
                }
            }
            delete players[socket.id];
        }
    });
});

// Assign roles to players in a lobby
function assignRoles(lobbyCode) {
    const roles = ['Human', 'Insect'];
    const lobby = lobbies[lobbyCode];
    lobby.players.forEach((player, index) => {
        const role = roles[index % roles.length];
        players[player.id].role = role;
        io.to(player.id).emit('assignRole', role);
        console.log(`Assigned role "${role}" to player: ${player.id}`);
    });
}
// Validate position object
function isValidPosition(position) {
    return (
        typeof position.x === 'number' &&
        typeof position.y === 'number' &&
        typeof position.z === 'number'
    );
}

// Sanitize chat messages to prevent XSS
function sanitizeMessage(message) {
    return message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Start the server
server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
