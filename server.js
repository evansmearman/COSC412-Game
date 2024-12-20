import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectDB } from './public/db.js';
import { User } from './models/user.js'; // Add this line to import the User model
import path from 'path';
import { fileURLToPath } from 'url'; // Add this line to import fileURLToPath

const __filename = fileURLToPath(import.meta.url); // Add this line to get the filename
const __dirname = path.dirname(__filename); // Add this line to get the directory name

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.static('public'));
app.use(express.json()); // Fix missing parentheses
const LOBBY_SIZE = process.env.LOBBY_SIZE || 4;
connectDB();

// Serve the built files
app.use(express.static(path.join(__dirname, 'dist')));

// Data structures for managing lobbies and players
let lobbies = {}; // { lobbyCode: { players: [], host: socketId, gameStarted: false } }
let players = {}; // { socketId: { name: string, position: {x, y, z}, role: null, lobbyCode: string } }

app.post('/register', async (req, res) => {
    const { username, password, userColor } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Username already exists.' });
        }

        const user = new User({ username, password, userColor });
        await user.save();
        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(400).json({ message: 'Invalid username or password.' });
        }

        res.status(200).json({ message: 'Login successful.', color: user.userColor });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/updateStats', async (req, res) => {
    const { username, wins, shotsFired } = req.body;
  
    try {
      const player = await User.findOneAndUpdate(
        { username },
        {
          $inc: { wins: wins || 0, shotsFired: shotsFired || 0 },
        },
        { new: true }
      );
  
      if (player !== null) res.status(200).json({ message: 'Stats updated successfully.', player });
    } catch (error) {
      console.error('Error updating stats:', error);
      res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/updateColor', async(req, res) => {
    const { username, userColor } = req.body;

    try {
        const player = await User.findOneAndUpdate(
            { username },
            {
                userColor: userColor
            },
            { new: true }
        );

        if (player !== null) res.status(200).json({ message: 'Color updated successfully.', player });
    } catch (error) {
        console.error('Error updating color: ', error);
        res.status(500).json({ message: 'Server error.' });
    }
})
  
// Endpoint to fetch stats
app.get('/stats/:username', async (req, res) => {
    const { username } = req.params;
  
    try {
      const player = await User.findOne({ username });
      if (!player) {
        return res.status(404).json({ message: 'Player not found.' });
      }
  
      res.status(200).json(player);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ message: 'Server error.' });
    }
});

app.delete('/deleteAccount', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ message: 'Username is required.' });
    }

    try {
        const user = await User.findOneAndDelete({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ message: 'Account deleted successfully.' });
    } catch (error) {
        console.error('Error deleting account:', error.message);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    socket.on('updateStats', async (data) => {
        const { username, wins, shotsFired } = data;
    
        try {
          const player = await User.findOneAndUpdate(
            { username },
            {
              $inc: { wins: wins || 0, shotsFired: shotsFired || 0 },
            },
            { new: true }
          );
          if (player !== null) console.log(`Stats updated for player ${username}:`, player);
        } catch (error) {
          console.error('Error updating stats:', error);
        }
    });
    socket.on('updateColor', async (data) => {
        console.log(data);
        const { username, userColor } = data;

        try {
            if (userColor && userColor.trim() !== '') {
                const player = await User.findOneAndUpdate(
                    { username },
                    { userColor: userColor },
                    { new: true }
                );
                if (player !== null) console.log(`Color updated for player ${username}:`, player);
            }
        } catch (error) {
            console.error('Error updating color:', error);
        }
    });
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

        lobbies[lobbyCode] = {
            players: [{ id: socket.id, name: playerName }],
            host: socket.id,
            gameStarted: false,
            mapSelected: null,
        };
        players[socket.id] = {
            name: playerName,
            position: { x: 0, y: 0, z: 0 },
            role: null,
            lobbyCode,
        };
        socket.join(lobbyCode);
        io.to(lobbyCode).emit('updateLobby', {
            players: lobbies[lobbyCode].players,
            host: lobbies[lobbyCode].host,
        });
        socket.emit('lobbyCreated', { lobbyCode, players: lobbies[lobbyCode].players });

        console.log(`Lobby created: ${lobbyCode}`);
    });

    // Handle joining a lobby
    socket.on('joinLobby', ({ playerName, lobbyCode }) => {
        if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
            socket.emit('error', 'Invalid player name.');
            return;
        }
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

        io.to(lobbyCode).emit('lobbyUpdate', {
            players: lobbies[lobbyCode].players,
            host: lobbies[lobbyCode].host,
            lobbyCode: lobbyCode,
        });
        socket.emit('lobbyJoined', { lobbyCode, players: lobbies[lobbyCode].players });

        console.log(`Player ${playerName} joined lobby: ${lobbyCode}`);
    });

    // Handle starting the game
    socket.on('startGame', ({ lobbyCode }) => {
        const lobby = lobbies[lobbyCode];
        if (lobby && lobby.host === socket.id) {
            lobby.gameStarted = true;
            assignRoles(lobbyCode);

            const lobbyPlayers = lobby.players.map((player) => ({
                id: player.id,
                name: player.name,
                role: players[player.id].role,
            }));

            io.to(lobbyCode).emit('gameStart', {
                players: lobbyPlayers,
                map: lobby.selectedMap, // Include selected map in game start
            });
            console.log(`Game started in lobby: ${lobbyCode} with map "${lobby.selectedMap}"`);
        } else {
            socket.emit('error', 'Only the host can start the game.');
        }
    });

    socket.on('mapSelected', ({ lobbyCode, map }) => {
        const lobby = lobbies[lobbyCode];
    
        // Verify that the lobby exists
        if (!lobby) {
            socket.emit('error', 'Lobby does not exist.');
            return;
        }
    
        // Verify that the player is the host
        if (lobby.host !== socket.id) {
            socket.emit('error', 'Only the host can select the map.');
            return;
        }
    
        // Update the selected map for the lobby
        lobby.selectedMap = map;
    
        // Notify all players in the lobby about the selected map
        io.to(lobbyCode).emit('mapSelected', { map });
    
        console.log(`Map "${map}" selected for lobby "${lobbyCode}" by host ${socket.id}`);
    });
    // Handle player movement
    socket.on('move', (data) => {
        const player = players[socket.id];
        if (player && isValidPosition(data.position)) {
            // Check for collisions with the map
            if (!isCollidingWithMap(data.position)) {
                if (player.role === 'Insect' || data.position.y === 0) { // Ensure only 'Insect' can fly
                    player.position = data.position;
                    io.to(player.lobbyCode).emit('playerMoved', { id: socket.id, position: data.position });
                }
                if (player.role === 'Human' && data.position.y > 0) {
                    player.position = data.position;
                    io.to(player.lobbyCode).emit('playerMoved', { id: socket.id, position: data.position });
                }
            }
        }
    });
    
    // Handle shooting
    socket.on('shoot', (data) => {
        const player = players[socket.id];
        if (player && isValidPosition(data.position) && isValidPosition(data.velocity)) {
            // Ensure the y-velocity is set correctly
            data.velocity.y = Math.max(data.velocity.y, 0);
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

    // Handle game ending
    socket.on('endGame', ({ isWinner }) => {
        const lobbyCode = getPlayerLobby(socket.id);
        if (lobbyCode) {
            // Notify all players in the lobby
            lobbies[lobbyCode].players.forEach((player) => {
                const isPlayerWinner = player.id === socket.id && isWinner;
                io.to(player.id).emit('endGame', { isWinner: isPlayerWinner });
            });
    
            console.log(`Game ended for lobby: ${lobbyCode}`);
        } else {
            console.error(`Lobby not found for player: ${socket.id}`);
        }
    });
    // Handle returning to the lobby
    socket.on('returnToLobby', ({ lobbyCode }) => {
        console.log(`Returning players in lobby ${lobbyCode} to the lobby screen.`);
        resetLobbyState(lobbyCode);
        io.to(lobbyCode).emit('returnToLobby');
    });
    socket.on('backToTitle', ({lobbyCode}) =>{
        console.log("removing")
        delete lobbies[lobbyCode]
        
    })
    socket.on('leaveLobby', () => { // Fix leaveLobby event handler
        console.log(`Player disconnected: ${socket.id}`);
        const player = players[socket.id];
        if (player) {
            const lobbyCode = player.lobbyCode;
            const lobby = lobbies[lobbyCode];

            if (lobby) {
                lobby.players = lobby.players.filter((p) => p.id !== socket.id);

                if (lobby.host === socket.id) {
                    if (lobby.players.length > 0) {
                        lobby.host = lobby.players[0].id;
                    } else {
                        delete lobbies[lobbyCode];
                        console.log(`Lobby ${lobbyCode} deleted.`);
                    }
                }

                io.to(lobbyCode).emit('updateLobby', {
                    players: lobby.players,
                    host: lobby.host,
                });
            }

            delete players[socket.id];
        }
    });
    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        const player = players[socket.id];
        if (player) {
            const { lobbyCode } = player;
            const lobby = lobbies[lobbyCode];

            if (lobby) {
                lobby.players = lobby.players.filter((p) => p.id !== socket.id);

                if (lobby.host === socket.id) {
                    if (lobby.players.length > 0) {
                        lobby.host = lobby.players[0].id;
                    } else {
                        delete lobbies[lobbyCode];
                        console.log(`Lobby ${lobbyCode} deleted.`);
                    }
                }

                io.to(lobbyCode).emit('updateLobby', {
                    players: lobby.players,
                    host: lobby.host,
                });
            }

            delete players[socket.id];
        }
    });
    socket.on('reconnect', () => {
        const player = players[socket.id];
        if (player && lobbies[player.lobbyCode]) {
            socket.join(player.lobbyCode);
            console.log(`Player ${socket.id} rejoined lobby ${player.lobbyCode}`);
            io.to(player.lobbyCode).emit('updateLobby', {
                players: lobbies[player.lobbyCode].players,
                host: lobbies[player.lobbyCode].host,
            });
        }
    });
    
});

// Assign roles to players in a lobby
function assignRoles(lobbyCode) {
    const lobby = lobbies[lobbyCode];

    if (!lobby || !lobby.players || lobby.players.length === 0) {
        console.error(`Lobby "${lobbyCode}" does not exist or has no players.`);
        return;
    }

    // Randomly pick one player to be the "Human"
    const humanIndex = Math.floor(Math.random() * lobby.players.length);
    const humanPlayer = lobby.players[humanIndex];

    // Assign roles
    lobby.players.forEach((player) => {
        const role = player.id === humanPlayer.id ? 'Human' : 'Insect';
        players[player.id].role = role;
        io.to(player.id).emit('assignRole', role);
        console.log(`Assigned role "${role}" to player: ${player.id}`);
    });

    console.log(`Roles assigned for lobby "${lobbyCode}". Human: ${humanPlayer.id}`);
}


// Reset lobby state
function resetLobbyState(lobbyCode) {
    const lobby = lobbies[lobbyCode];
    if (lobby) {
        lobby.gameStarted = false;
        lobby.players.forEach((player) => {
            players[player.id].position = { x: 0, y: 0, z: 0 };
            players[player.id].role = null;
        });
        console.log(`Lobby ${lobbyCode} has been reset.`);
    }
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

function getPlayerLobby(playerId) {
    const player = players[playerId];
    return player ? player.lobbyCode : null;
}

function isCollidingWithMap(position) {
    // Implement collision detection logic with the map model
    // Return true if the position collides with the map, otherwise false
    // This is a placeholder function and should be implemented based on your map model
    return false;
}

// Start the server
server.listen(3000, () => {
    console.log('Server is running on port 3000');
});