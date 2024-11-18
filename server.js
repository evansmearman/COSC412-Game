import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const LOBBY_SIZE = process.env.LOBBY_SIZE || 2;
let players = {};
let lobby = [];

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    try {
        lobby.push(socket.id);
        players[socket.id] = { position: { x: 0, y: 0, z: 0 }, role: null };
        socket.emit('currentPlayers', players);
        socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

        if (lobby.length === LOBBY_SIZE) {
            io.emit('lobbyFull');
            assignRoles();
        }

        socket.on('move', (data) => {
            if (players[socket.id] && isValidPosition(data.position)) {
                players[socket.id].position = data.position;
                socket.broadcast.emit('playerMoved', { id: socket.id, position: data.position });
            }
        });

        socket.on('shoot', (data) => {
            if (isValidPosition(data.position) && isValidPosition(data.velocity)) {
                socket.broadcast.emit('shoot', {
                    id: socket.id,
                    position: data.position,
                    velocity: data.velocity,
                });
            }
        });

        socket.on('chatMessage', (data) => {
            if (typeof data.message === 'string' && data.message.trim().length > 0) {
                const sanitizedMessage = sanitizeMessage(data.message);
                socket.broadcast.emit('chatMessage', { id: socket.id, message: sanitizedMessage });
            }
        });

        socket.on('disconnect', () => {
            console.log(`Player disconnected: ${socket.id}`);
            delete players[socket.id];
            lobby = lobby.filter((id) => id !== socket.id);
            io.emit('playerDisconnected', socket.id);

            if (lobby.length < LOBBY_SIZE) {
                console.log('Lobby is no longer full. Waiting for more players...');
            }
        });
    } catch (err) {
        console.error(`Error handling socket for ${socket.id}:`, err);
    }
});

function assignRoles() {
    const roles = ['Human', 'Insect'];
    lobby.forEach((playerId, index) => {
        const role = roles[index % roles.length];
        players[playerId].role = role;
        io.to(playerId).emit('assignRole', role);
    });
    startGame();
}

function startGame() {
    io.emit('startGame');
}

function isValidPosition(position) {
    return (
        typeof position.x === 'number' &&
        typeof position.y === 'number' &&
        typeof position.z === 'number'
    );
}

function sanitizeMessage(message) {
    return message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
