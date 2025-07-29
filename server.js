const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Game state
let players = {};
let grid = generateGrid(10, 10);
let foundWords = new Set();
let scoreboard = {};

// Word list (for a real game, use a larger dictionary)
const wordList = new Set(['hello', 'world', 'javascript', 'websocket', 'game', 'synapse', 'player', 'grid', 'word', 'found']);

wss.on('connection', ws => {
    const playerId = `Player${Object.keys(players).length + 1}`;
    players[ws] = playerId;
    scoreboard[playerId] = 0;

    // Send initial game state to the new player
    ws.send(JSON.stringify({ type: 'grid', grid }));
    broadcastScoreboard();

    ws.on('message', message => {
        const data = JSON.parse(message);

        if (data.type === 'submitWord') {
            const { word } = data;
            if (isValidWord(word) && !foundWords.has(word)) {
                foundWords.add(word);
                scoreboard[players[ws]] += word.length;
                broadcastWordFound(word, players[ws]);
                broadcastScoreboard();
            } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid or already found word.' }));
            }
        }
    });

    ws.on('close', () => {
        delete players[ws];
        // We could remove the player from the scoreboard here, but for simplicity, we'll leave them.
    });
});

function generateGrid(rows, cols) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let grid = [];
    for (let i = 0; i < rows; i++) {
        grid[i] = [];
        for (let j = 0; j < cols; j++) {
            grid[i][j] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
    }
    return grid;
}

function isValidWord(word) {
    return wordList.has(word) && findWordInGrid(word.toUpperCase());
}

function findWordInGrid(word) {
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            if (grid[i][j] === word[0] && search(word, i, j)) {
                return true;
            }
        }
    }
    return false;
}

function search(word, row, col) {
    // This is a simplified search that only checks horizontally and vertically.
    // A full implementation would check all 8 directions.
    const directions = [[0, 1], [1, 0]]; // Right and Down

    for (const [dr, dc] of directions) {
        let r = row;
        let c = col;
        let found = true;
        for (let i = 0; i < word.length; i++) {
            if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] !== word[i]) {
                found = false;
                break;
            }
            r += dr;
            c += dc;
        }
        if (found) {
            return true;
        }
    }
    return false;
}

function broadcastWordFound(word, player) {
    const message = JSON.stringify({ type: 'wordFound', word, player });
    for (const client in players) {
        client.send(message);
    }
}

function broadcastScoreboard() {
    const message = JSON.stringify({ type: 'scoreboard', scoreboard });
    for (const client in players) {
        client.send(message);
    }
}

console.log('WebSocket server started on port 8080');
