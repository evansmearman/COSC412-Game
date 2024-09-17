// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {};
let projectiles = {}; 

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Add new player to the game
  players[socket.id] = {
    position: { x: 0, y: 0, z: 0 },
  };

  // Send the current players list to the newly connected player
  socket.emit('currentPlayers', players);

  // Broadcast new player to others
  socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

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
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});